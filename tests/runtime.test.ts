import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRuntime, SOCKET_ID, PID } from "../src/runtime";
import { createProfile, serializeProfiles, parseImport } from "../src/shared/model";

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
