import {isAdmin} from '../security';
import {telegramConfigured,notifyRegistration,sendTelegram} from '../../../lib/notifications';
import {whatsappState,notifyAdminWhatsapp,sendAdminWhatsapp,confirmRegistrationWhatsapp} from '../../../lib/whatsapp';
export async function GET(req:Request){if(!await isAdmin(req))return new Response(null,{status:401});return Response.json({telegram:telegramConfigured(),whatsapp:await whatsappState()},{headers:{'Cache-Control':'no-store'}})}
export async function POST(req:Request){if(!await isAdmin(req)||req.headers.get('origin')!==new URL(req.url).origin)return new Response(null,{status:403});try{const body=await req.json() as {id?:string,channel?:string};const origin=new URL(req.url).origin;let result:string;
 if(body.channel==='confirmation'){if(!body.id||!(await whatsappState()).confirmation)return Response.json({error:'واتساب التلقائي غير مفعّل بعد'},{status:409});result=await confirmRegistrationWhatsapp(body.id);}
 else if(body.channel==='whatsapp'){if(!(await whatsappState()).admin)return Response.json({error:'واتساب المنظّم غير مربوط بعد'},{status:409});result=body.id?await notifyAdminWhatsapp(body.id,origin):(await sendAdminWhatsapp(origin)).status;}
 else{if(!telegramConfigured())return Response.json({error:'تيليجرام غير مربوط بعد'},{status:409});result=body.id?await notifyRegistration(body.id,origin):await sendTelegram('اختبار إشعارات إيصالات لمّة العيد.',origin);}
 return Response.json({result},{status:['sent','accepted','skipped'].includes(result)?200:502});
 }catch{return Response.json({error:'تعذر إرسال الإشعار. التسجيل محفوظ ويمكن مراجعته.'},{status:500})}}
