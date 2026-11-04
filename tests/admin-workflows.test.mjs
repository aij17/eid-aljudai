import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.EID_TEST_BASE_URL||'http://127.0.0.1:5199';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Tests must run against a local preview');
const key=fs.readFileSync('.dev.vars','utf8').split('\n').find(x=>x.startsWith('ADMIN_KEY='))?.slice(10).trim();
const origin={Origin:base};
let r=await fetch(base+'/api/settings');assert.equal(r.status,401);
r=await fetch(base+'/api/login',{method:'POST',headers:{...origin,'Content-Type':'application/json'},body:JSON.stringify({key})});assert.equal(r.status,200);const cookie=r.headers.get('set-cookie').split(';')[0];const headers={...origin,Cookie:cookie,'Content-Type':'application/json'};
const json=async(path,method,body)=>fetch(base+path,{method,headers,body:JSON.stringify(body)});
r=await fetch(base+'/api/settings',{headers});assert.equal(r.status,200);const before=await r.json();
const settings={...before,provider:'manual',receivePhone:'٠٥٠٠٠٠٠٠٠٠',sendPhone:'',authToken:'settings-test-secret',autoConfirm:false};
r=await json('/api/settings','PUT',settings);assert.equal(r.status,200);let state=await r.json();assert.equal(state.receivePhone,'+966500000000');assert.equal(state.authToken,'');assert.equal(state.hasAuthToken,true);assert.ok(!JSON.stringify(state).includes('settings-test-secret'));
r=await json('/api/settings','PUT',{...settings,authToken:''});assert.equal(r.status,200);assert.equal((await r.json()).hasAuthToken,true);
r=await json('/api/settings','PUT',{...settings,provider:'twilio',autoConfirm:true});assert.equal(r.status,400);
r=await fetch(base+'/api/settings',{method:'PUT',headers:{...headers,Origin:'https://wrong.example'},body:JSON.stringify(settings)});assert.equal(r.status,403);
async function create(){const form=new FormData();form.set('contact','اختبار محلي — إلغاء واسترداد');form.set('phone','0500000000');form.set('guests',JSON.stringify([{name:'متزوجة',category:'married'},...Array.from({length:3},(_,i)=>({name:'جامعية '+i,category:'university'})),...Array.from({length:4},(_,i)=>({name:'مدرسة '+i,category:'school'})),{name:'طفل ١',category:'child'},{name:'طفل ٢',category:'child'}]));form.set('contactConsent','yes');form.set('receipt',new File(['%PDF-1.4\nlocal test only'], 'test.pdf',{type:'application/pdf'}));const response=await fetch(base+'/api/registrations',{method:'POST',headers:origin,body:form});assert.equal(response.status,201);const saved=await response.json();assert.equal(saved.total,1300);return saved.id;}
async function patch(id,body,status=200){const response=await json('/api/registrations','PATCH',{id,...body});assert.equal(response.status,status)}
async function read(id){const response=await fetch(base+'/api/registrations',{headers});return (await response.json()).find(x=>x.id===id)}
const id=await create();await patch(id,{status:'approved'});await patch(id,{attendance:[0,9]});await patch(id,{attendance:[99]},400);await patch(id,{action:'cancel'});state=await read(id);assert.equal(state.lifecycle,'cancelled');assert.equal(state.refund_status,'pending');assert.equal(state.refund_amount,1300);assert.equal(state.attendance,'[]');await patch(id,{action:'archive'},400);await patch(id,{status:'approved'},409);await patch(id,{action:'restore'});assert.equal((await read(id)).lifecycle,'active');await patch(id,{action:'cancel'});await patch(id,{action:'refund'},400);await patch(id,{action:'refund',note:'مرجع تجريبي للاسترداد المحلي'});state=await read(id);assert.equal(state.refund_status,'refunded');assert.ok(state.refunded_at);await patch(id,{action:'restore'},409);await patch(id,{action:'archive'});assert.ok((await read(id)).archived_at);await patch(id,{action:'unarchive'});assert.equal((await read(id)).archived_at,null);
r=await fetch(base+'/api/receipt?id='+id,{headers});assert.equal(r.status,200);
const unpaid=await create();await patch(unpaid,{action:'cancel'});assert.equal((await read(unpaid)).refund_status,'not_due');await patch(unpaid,{action:'archive'});
r=await json('/api/settings','PUT',{...before,authToken:'',callmebotKey:'',clear_authToken:true,clear_callmebotKey:true,autoConfirm:false});assert.equal(r.status,200);
console.log('PASS: protected encrypted settings, masked/preserved secrets, CSRF, family price, attendance, paid/unpaid cancellation, refund record, reversible removal, retained receipt');
