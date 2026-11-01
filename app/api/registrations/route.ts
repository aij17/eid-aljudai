import {env} from "cloudflare:workers";
import {isAdmin} from "../security";
const prices:Record<string,number>={married:300,university:200,school:100};
export async function POST(req:Request){
 if(req.headers.get("origin")!==new URL(req.url).origin)return Response.json({error:"طلب غير مسموح"},{status:403});
 if(Number(req.headers.get("content-length")||0)>6*1024*1024)return Response.json({error:"الملف كبير جدًا"},{status:413});
 try{const f=await req.formData();const contact=String(f.get("contact")||"").trim();const phone=String(f.get("phone")||"").trim();const guests=JSON.parse(String(f.get("guests")||"[]"));const file=f.get("receipt");
 if(!contact||contact.length>100||!/^05[0-9]{8}$/.test(phone)||!Array.isArray(guests)||guests.length<1||guests.length>30||guests.some(g=>!g.name?.trim()||g.name.length>100||!prices[g.category])||!(file instanceof File)||!file.size||file.size>5*1024*1024||!["image/jpeg","image/png","application/pdf"].includes(file.type))return Response.json({error:"تأكدي من الأسماء ورقم الجوال وإيصال PDF أو صورة بحجم أقصى ٥ ميجابايت"},{status:400});
 const bytes=new Uint8Array(await file.arrayBuffer());const valid=file.type==='application/pdf'?String.fromCharCode(...bytes.slice(0,5))==='%PDF-':file.type==='image/png'?bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71:bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(!valid)return Response.json({error:"صيغة الإيصال غير صحيحة"},{status:400});
 const id=crypto.randomUUID(),key=`receipts/${id}`;const total=guests.reduce((s,g)=>s+prices[g.category],0);
 await env.BUCKET!.put(key,bytes,{httpMetadata:{contentType:file.type}});
 try{await env.DB!.prepare("INSERT INTO registrations (id,contact,phone,guests,total,receipt,mime,status,attendance,created) VALUES (?,?,?,?,?,?,?,'pending','[]',?)").bind(id,contact,phone,JSON.stringify(guests.map(g=>({name:g.name.trim(),category:g.category}))),total,key,file.type,new Date().toISOString()).run()}catch(e){await env.BUCKET!.delete(key);throw e}
 return Response.json({id,total},{status:201});
 }catch{return Response.json({error:"تعذر حفظ التسجيل، حاولي مرة أخرى"},{status:500})}}
export async function GET(req:Request){if(!await isAdmin(req))return new Response(null,{status:401});const rows=await env.DB!.prepare("SELECT * FROM registrations ORDER BY created DESC").all();return Response.json(rows.results,{headers:{"Cache-Control":"no-store"}})}
export async function PATCH(req:Request){if(!await isAdmin(req)||req.headers.get('origin')!==new URL(req.url).origin)return new Response(null,{status:403});const b=await req.json() as {id:string,status?:string,attendance?:number[]};if(b.status&&['pending','approved','correction'].includes(b.status)){await env.DB!.prepare("UPDATE registrations SET status=? WHERE id=?").bind(b.status,b.id).run()}else if(Array.isArray(b.attendance)&&b.attendance.every((n:unknown)=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<30)){await env.DB!.prepare("UPDATE registrations SET attendance=? WHERE id=?").bind(JSON.stringify([...new Set(b.attendance)]),b.id).run()}else return new Response(null,{status:400});return Response.json({ok:true})}