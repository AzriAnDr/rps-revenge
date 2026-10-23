import test from "node:test";
import assert from "node:assert/strict";
import { createMobileSync } from "../src/lanMobile";
import { createRuntime } from "../src/runtime";
import { createProfile } from "../src/shared/model";
import { open, seal } from "../src/shared/lanCrypto";
import { synchronizeProfiles } from "../src/shared/lanSyncClient";
const key="a1".repeat(32), prefix="b2".repeat(16);
test("AEAD authenticates payload, nonce and pairing key; no WebCrypto needed",()=>{
    const nonce="c3".repeat(24), value={name:"Элтан 🐾"};const encrypted=seal(value,key,nonce);
    assert.deepEqual(open(encrypted,key),value);
    assert.throws(()=>open({...encrypted,nonce:"d4".repeat(24)},key));
    assert.throws(()=>open(encrypted,"ff".repeat(32)));
    assert.throws(()=>open({...encrypted,box:encrypted.box.slice(0,-2)+"00"},key));
});
test("sync refuses stale local replacement while a network write is in flight",async()=>{
    const p=createProfile();let local=[p];
    const result=await synchronizeProfiles({read:async()=>({revision:0,profiles:[]}),write:async(_revision,profiles)=>{local=[{...p,name:"New local edit"}];return {ok:true,document:{revision:1,profiles}};}},[],()=>local,(next,expected)=>{if(JSON.stringify(local)!==JSON.stringify(expected))return false;local=next;return true;});
    assert.equal(result,null);assert.equal(local[0].name,"New local edit");
});
test("mobile exchanges only encrypted profiles, persists baseline, and never publishes activity",async()=>{
    const events:any[]=[];const api:any={plugin:{storage:{}},metro:{common:{FluxDispatcher:{dispatch:(e:any)=>events.push(e),subscribe(){},unsubscribe(){}}},findByProps:(name:string)=>name==="getCurrentUser"?{getCurrentUser:()=>({id:"owner"})}:{SET_ACTIVITY:true}}};
    const runtime=createRuntime(api);runtime.start();const remote=createProfile("PC");let document={revision:1,profiles:[remote]};let nonceNumber=0;let currentNonce="";
    const requests:string[]=[];
    const fetcher:any=async(url:string,options:any)=>{
        if(url.endsWith("/challenge")){currentNonce=(++nonceNumber).toString(16).padStart(48,"0");return {ok:true,json:async()=>({nonce:currentNonce,prefix})};}
        requests.push(options.body);const request=open(JSON.parse(options.body),key);assert.equal(request.ownerId,"owner");
        if(request.op==="write"){assert.equal(request.expectedRevision,document.revision);document={revision:document.revision+1,profiles:request.profiles};}
        return {ok:true,text:async()=>JSON.stringify(seal({requestNonce:currentNonce,ok:true,document},key,"ee".repeat(24)))};
    };
    const sync=createMobileSync(api,runtime.controller,fetcher);
    try {await sync.connect(`rpslan1:192.168.1.2:38474:${key}:${prefix}`);await new Promise(r=>setTimeout(r,30));
        assert.ok(runtime.controller.getSnapshot().profiles.some(p=>p.id===remote.id));assert.equal(events.length,0);
        assert.ok(requests.every(body=>!body.includes('"profiles"')&&!body.includes(key)));assert.ok(api.plugin.storage.lanLink.base.length);
    }finally{sync.stop();runtime.stop();}
});
