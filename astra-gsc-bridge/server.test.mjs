import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {once} from 'node:events';
const port=await new Promise((resolve,reject)=>{
  const s=createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});
});
const child=spawn(process.execPath,['server.mjs'],{
  cwd:new URL('.',import.meta.url).pathname,
  env:{...process.env,PORT:String(port),PUBLIC_ORIGIN:'http://127.0.0.1:'+port,
    GOOGLE_CLIENT_ID:'',GOOGLE_CLIENT_SECRET:'',GOOGLE_ACCESS_TOKEN:'',GOOGLE_REFRESH_TOKEN:'',
    ASTRA_BRIDGE_MASTER_KEY:'',ASTRA_RECONCILE_INTERVAL_MS:''},
  stdio:['ignore','pipe','pipe']
});
let stopped=false;
const base='http://127.0.0.1:'+port;
await new Promise((resolve,reject)=>{
 const t=setTimeout(()=>reject(new Error('NO_SERVER_START')),6000);
 child.once('exit',code=>{if(!stopped){clearTimeout(t);reject(new Error('SERVER_EXIT_'+code))}});
 child.stdout.on('data',buf=>{if(String(buf).includes('listening')){clearTimeout(t);resolve();}});
});
test('health explicitly reports missing Google OAuth and native CTR route',async()=>{
 const r=await fetch(base+'/health'),j=await r.json();
 assert.equal(r.status,200);
 assert.equal(j.oauthClientConfigured,false);
 assert.equal(j.googleAuthorized,false);
 assert.equal(j.ctrEndpoint,'read-only-native-v1');
});
test('native CTR route is authentication protected',async()=>{
 const r=await fetch(base+'/ctr?site=FreeHotels.info'),j=await r.json();
 assert.equal(r.status,401);assert.equal(j.error,'unauthorized');
});
test('OAuth start fails closed with no client credentials',async()=>{
 const r=await fetch(base+'/start'),j=await r.json();
 assert.equal(r.status,503);assert.equal(j.error,'google_oauth_client_not_configured');
});
test('read-only CTR endpoint rejects POST without credentials',async()=>{
 const r=await fetch(base+'/ctr?site=FreeHotels.info',{method:'POST'});
 assert.equal(r.status,401);
});
test.after(()=>{stopped=true;child.kill('SIGTERM')});
