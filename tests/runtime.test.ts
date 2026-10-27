import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRuntime, SOCKET_ID, PID } from "../src/runtime";
import { createProfile, serializeProfiles, parseImport } from "../src/shared/model";
import { diagnosticReport } from "../src/diagnostics";

function setup() {
    const events:any[] = [], listeners = new Map<string,()=>void>();
    let userId:string|null="user-a", supported=true;
    const api:any = {
        plugin:{storage:{}}, logger:{error(){}},
        metro:{common:{React:{}, ReactNative:{}, FluxDispatcher:{
            dispatch(e:any){events.push(e);}, subscribe(e:string,f:()=>void){listeners.set(e,f);}, unsubscribe(e:string){listeners.delete(e);}
        }},findByProps(p:string){
            if(p==="SET_ACTIVITY") return supported?{SET_ACTIVITY:()=>{}}:undefined;
            if(p==="getCurrentUser") return {getCurrentUser:()=>userId?{id:userId}:null};
            if(p==="fetchAssetIds") return {fetchAssetIds:async(app:string,assets:string[])=>assets.map(a=>"mp:"+a)};
        }}
    };
    return {api,events,listeners,setUser:(id:string|null)=>{userId=id;},unsupported:()=>{supported=false;}};
}
const tick=()=>new Promise(r=>setTimeout(r,10));
test("silent activity rejection is detected without erasing saved profiles",async()=>{
    const s=setup(); s.api.metro.findByStoreName=()=>({getActivities:()=>[]});
    const r=createRuntime(s.api);r.start();await r.controller.applyProfile(createProfile());
    await new Promise(resolve=>setTimeout(resolve,1050));
    assert.equal(r.controller.getSnapshot().phase,"error");
    assert.match(r.controller.getSnapshot().message,/локальный список/);
    assert.equal(JSON.parse(diagnosticReport()).presence,"local-missing");
    assert.ok(s.api.plugin.storage.studioData.lastApplied);r.stop();
});
test("local activity verification detects accepted cards without claiming server confirmation",async()=>{
    const s=setup();s.api.metro.findByStoreName=()=>({getActivities:()=>s.events.map(e=>e.activity).filter(Boolean)});
    const r=createRuntime(s.api);r.start();await r.controller.applyProfile(createProfile());
    await new Promise(resolve=>setTimeout(resolve,1050));
    assert.equal(JSON.parse(diagnosticReport()).presence,"local-confirmed");
    assert.equal(r.controller.getSnapshot().phase,"active");r.stop();
});
test("foreground restoration obeys toggle and cannot resurrect a disabled card",async()=>{
    const s=setup();let change:(state:string)=>void=()=>{};let removed=false;
    s.api.metro.common.ReactNative.AppState={addEventListener:(_event:string,cb:any)=>{change=cb;return {remove(){removed=true;}};}};
    const r=createRuntime(s.api);r.start();await r.controller.applyProfile(createProfile());
    change("active");await tick();assert.equal(s.events.length,1);
    r.controller.setRestoreOnStart(true);change("active");await tick();assert.equal(s.events.length,2);
    r.controller.disable();const count=s.events.length;change("active");await tick();assert.equal(s.events.length,count);
    r.stop();assert.equal(removed,true);
});
test("mobile send and clear share identity; button URLs and images survive",async()=>{
    const s=setup(), r=createRuntime(s.api); r.start();
    const p=createProfile(); p.buttons=[{label:"🐾 Eltan",url:"https://example.com"}]; p.largeImage="https://example.com/a.png";
    await r.controller.applyProfile(p);
    assert.equal(s.events[0].socketId,SOCKET_ID); assert.equal(s.events[0].pid,PID);
    assert.deepEqual(s.events[0].activity.metadata.button_urls,["https://example.com"]);
    assert.equal(s.events[0].activity.assets.large_image,"mp:"+p.largeImage);
    r.stop(); assert.equal(s.events.at(-1).socketId,SOCKET_ID); assert.equal(s.events.at(-1).activity,null); assert.equal(s.listeners.size,0);
});
test("reconnect republishes only current owner's activity",async()=>{
    const s=setup(),r=createRuntime(s.api);r.start();await r.controller.applyProfile(createProfile());
    s.listeners.get("CONNECTION_OPEN")!();await tick();assert.equal(s.events.length,2);
    s.setUser("user-b");s.listeners.get("CONNECTION_OPEN")!();await tick();
    assert.equal(s.events.at(-1).activity,null);assert.equal(r.controller.getSnapshot().activeProfile,null);r.stop();
});
test("logout cannot be swallowed by a reconnect event",async()=>{
    const s=setup(),r=createRuntime(s.api);r.start();await r.controller.applyProfile(createProfile());
    s.listeners.get("LOGOUT")!();s.listeners.get("CONNECTION_OPEN")!();await tick();
    assert.equal(r.controller.getSnapshot().activeProfile,null);assert.equal(s.events.at(-1).activity,null);r.stop();
});
test("unsupported mobile API is visible and never reports a successful apply",async()=>{
    const s=setup();s.unsupported();const r=createRuntime(s.api);r.start();
    await assert.rejects(r.controller.applyProfile(createProfile()),/API активности/);
    assert.equal(r.controller.getSnapshot().phase,"error");assert.equal(s.events.length,0);r.stop();
});
test("Hermes without Web Crypto and TextEncoder can create and exchange profiles",()=>{
    const crypto=Object.getOwnPropertyDescriptor(globalThis,"crypto"), encoder=globalThis.TextEncoder;
    try {
        Object.defineProperty(globalThis,"crypto",{value:undefined,configurable:true});(globalThis as any).TextEncoder=undefined;
        const p=createProfile("Элтан 🐾"), imported=parseImport(serializeProfiles([p]));
        assert.equal(imported[0].label,p.label);assert.notEqual(imported[0].id,p.id);
    } finally {if(crypto)Object.defineProperty(globalThis,"crypto",crypto);(globalThis as any).TextEncoder=encoder;}
});
test("distributed expression loads through the real Classic loader shape",()=>{
    const s=setup();const js=readFileSync("dist/index.js","utf8");
    const plugin=new Function("vendetta",`return ${js}`)(s.api);
    assert.equal(typeof plugin.settings,"function");plugin.onLoad();plugin.onUnload();assert.equal(s.listeners.size,0);
});
