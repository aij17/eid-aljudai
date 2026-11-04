import {privateFiles} from '../../../lib/file-storage';
import {env} from "cloudflare:workers";
import {isAdmin} from "../security";
import {notifyRegistration} from "../../../lib/notifications";
import {confirmRegistrationWhatsapp} from "../../../lib/whatsapp";
import {saudiLocalPhone} from '../../../lib/saudi-phone';
import {normalizedGuestName} from '../../../lib/guests';
import {nameReservations,conflictingName} from '../../../lib/attendee-names';
const prices:Record<string,number>={married:300,university:200,school:100,child:0};
export async function POST(req:Request){
 if(req.headers.get("origin")!==new URL(req.url).origin)return Response.json({error:"طلب غير مسموح"},{status:403});
 if(Number(req.headers.get("content-length")||0)>6*1024*1024)return Response.json({error:"الملف كبير جدًا"},{status:413});
 try{const f=await req.formData();const contact=String(f.get("contact")||"").trim();const phone=saudiLocalPhone(String(f.get("phone")||""));const guests=JSON.parse(String(f.get("guests")||"[]"));const file=f.get("receipt");
 if(!contact||contact.length>100||!/^05[0-9]{8}$/.test(phone)||!Array.isArray(guests)||guests.length<1||guests.length>30||guests.some(g=>!g.name?.trim()||g.name.length>100||!Object.hasOwn(prices,g.category))||!(file instanceof File)||!file.size||file.size>5*1024*1024||!["image/jpeg","image/png","application/pdf"].includes(file.type))return Response.json({error:"تأكدي من الأسماء ورقم الجوال وإيصال PDF أو صورة بحجم أقصى ٥ ميجابايت"},{status:400});
 if(guests.some(g=>!normalizedGuestName(g.name)))return Response.json({error:'اكتبي أسماء حضور صحيحة قبل إرسال التسجيل'},{status:400});
 if(normalizedGuestName(guests[0].name)!==normalizedGuestName(contact))return Response.json({error:'صاحبة التسجيل تُضاف ضمن الحضور؛ تأكدي أن الاسم الأول هو اسم صاحبة التسجيل'},{status:400});
 if(new Set(guests.map(g=>normalizedGuestName(g.name))).size!==guests.length)return Response.json({error:'لا يمكن تسجيل الاسم نفسه مرتين ضمن الحضور'},{status:409});
 if(guests[0].category==='child')return Response.json({error:'اختاري فئة صاحبة التسجيل أولًا؛ الأطفال يضافون كمرافقين'},{status:400});
 if(guests.some(g=>g.phone&&!saudiLocalPhone(String(g.phone))))return Response.json({error:'يوجد رقم جوال غير صحيح ضمن الحضور'},{status:400});
 const conflict=await conflictingName(guests);if(conflict)return Response.json({error:`الاسم «${conflict}» مسجّل بالفعل. راجعي التسجيل الموجود بدل تكراره.`},{status:409});
 const bytes=new Uint8Array(await file.arrayBuffer());const valid=file.type==='application/pdf'?String.fromCharCode(...bytes.slice(0,5))==='%PDF-':file.type==='image/png'?bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71:bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(!valid)return Response.json({error:"صيغة الإيصال غير صحيحة"},{status:400});
 const id=crypto.randomUUID(),key=`receipts/${id}`;const total=guests.reduce((s,g)=>s+prices[g.category],0);
 await privateFiles().put(key,bytes,{httpMetadata:{contentType:file.type}});
 try{await env.DB!.batch([env.DB!.prepare("INSERT INTO registrations (id,contact,phone,guests,total,receipt,mime,status,attendance,created,contact_consent) VALUES (?,?,?,?,?,?,?,'pending','[]',?,?)").bind(id,contact,phone,JSON.stringify(guests.map(g=>({name:g.name.trim(),category:g.category,...(g.phone?{phone:saudiLocalPhone(String(g.phone))}:{})}))),total,key,file.type,new Date().toISOString(),f.get('contactConsent')==='yes'?1:0),...nameReservations(id,guests)])}catch(e){await privateFiles().delete(key);if(/UNIQUE/i.test(String(e)))return Response.json({error:'أحد الأسماء مسجّل بالفعل. حدّثي الصفحة وراجعي التسجيل الموجود.'},{status:409});throw e}
 try{await notifyRegistration(id,new URL(req.url).origin,true)}catch{console.error(JSON.stringify({event:'registration_notification_failed',id}))}
 return Response.json({id,total},{status:201});
 }catch{return Response.json({error:"تعذر حفظ التسجيل، حاولي مرة أخرى"},{status:500})}}
export async function GET(req:Request){if(!await isAdmin(req))return new Response(null,{status:401});const rows=await env.DB!.prepare("SELECT * FROM registrations ORDER BY created DESC").all();return Response.json(rows.results,{headers:{"Cache-Control":"no-store"}})}
export async function PATCH(req:Request){
 if(!await isAdmin(req)||req.headers.get('origin')!==new URL(req.url).origin)return new Response(null,{status:403});
 try{const b=await req.json() as {id:string,status?:string,attendance?:number[],action?:string,note?:string};
 const row=await env.DB!.prepare('SELECT * FROM registrations WHERE id=?').bind(b.id).first<{status:string,lifecycle:string,total:number,guests:string,refund_status:string}>();if(!row)return Response.json({error:'التسجيل غير موجود'},{status:404});
 if(b.action==='cancel'){if(row.lifecycle==='cancelled')return Response.json({ok:true});await env.DB!.batch([env.DB!.prepare("UPDATE registrations SET lifecycle='cancelled',attendance='[]',refund_status=?,refund_amount=? WHERE id=?").bind(row.status==='approved'&&row.total>0?'pending':'not_due',row.status==='approved'?row.total:0,b.id),env.DB!.prepare('DELETE FROM attendee_names WHERE registration_id=?').bind(b.id)]);}
 else if(b.action==='restore'){if(row.lifecycle!=='cancelled'||row.refund_status==='refunded')return Response.json({error:'لا يمكن استعادة تسجيل أُعيد مبلغه'},{status:409});const conflict=await conflictingName(JSON.parse(row.guests),b.id);if(conflict)return Response.json({error:'تعذر التراجع؛ أحد الأسماء أصبح مسجّلًا في حجز آخر'},{status:409});await env.DB!.batch([env.DB!.prepare("UPDATE registrations SET lifecycle='active',refund_status='not_due',refund_amount=0,archived_at=NULL WHERE id=?").bind(b.id),...nameReservations(b.id,JSON.parse(row.guests))]);}
 else if(b.action==='refund'){if(row.lifecycle!=='cancelled'||row.refund_status!=='pending'||typeof b.note!=='string'||!b.note.trim()||b.note.length>500)return Response.json({error:'ألغ التسجيل وأدخل مرجع إعادة المبلغ أولًا'},{status:400});await env.DB!.prepare("UPDATE registrations SET refund_status='refunded',refund_note=?,refunded_at=? WHERE id=? AND refund_status='pending'").bind(b.note.trim(),new Date().toISOString(),b.id).run();}
 else if(b.action==='archive'){if(row.lifecycle!=='cancelled'||row.refund_status==='pending')return Response.json({error:'أكمل الإلغاء وتوثيق إعادة المبلغ قبل إزالة التسجيل من القائمة'},{status:400});await env.DB!.prepare('UPDATE registrations SET archived_at=? WHERE id=?').bind(new Date().toISOString(),b.id).run();}
 else if(b.action==='unarchive'){await env.DB!.prepare('UPDATE registrations SET archived_at=NULL WHERE id=?').bind(b.id).run();}
 else if(row.lifecycle!=='active')return Response.json({error:'التسجيل ملغى ولا يمكن اعتماد الدفع أو تسجيل حضور له'},{status:409});
 else if(b.status&&['pending','approved','correction'].includes(b.status)){await env.DB!.prepare('UPDATE registrations SET status=? WHERE id=?').bind(b.status,b.id).run();if(b.status==='approved'){try{await confirmRegistrationWhatsapp(b.id)}catch{console.error(JSON.stringify({event:'confirmation_notification_failed',id:b.id}))}}}
 else if(Array.isArray(b.attendance)&&b.attendance.every(n=>Number.isInteger(n)&&n>=0&&n<JSON.parse(row.guests).length)){await env.DB!.prepare('UPDATE registrations SET attendance=? WHERE id=?').bind(JSON.stringify([...new Set(b.attendance)]),b.id).run();}
 else return Response.json({error:'طلب غير صحيح'},{status:400});
 return Response.json({ok:true});
 }catch{return Response.json({error:'تعذر حفظ التعديل'},{status:500})}
}
