import {env} from 'cloudflare:workers';
import {gatheringDateLabel} from './calendar';
import {sendTwilioTemplate,sendCallMeBot,type TwilioConfig,type DeliveryResult} from './whatsapp-api';
type WhatsAppEnv=typeof env & {WHATSAPP_ADMIN_PROVIDER?:string,WHATSAPP_ADMIN_PHONE?:string,CALLMEBOT_API_KEY?:string,TWILIO_ACCOUNT_SID?:string,TWILIO_AUTH_TOKEN?:string,TWILIO_WHATSAPP_FROM?:string,TWILIO_ADMIN_TEMPLATE_SID?:string,TWILIO_CONFIRM_TEMPLATE_SID?:string,WHATSAPP_AUTO_CONFIRM?:string};
function config(template:string|undefined):TwilioConfig{const e=env as WhatsAppEnv;return {accountSid:e.TWILIO_ACCOUNT_SID||'',authToken:e.TWILIO_AUTH_TOKEN||'',from:e.TWILIO_WHATSAPP_FROM||'',templateSid:template||''}}
function twilioReady(template:string|undefined){const c=config(template);return /^AC[a-fA-F0-9]{32}$/.test(c.accountSid)&&Boolean(c.authToken)&&/^whatsapp:\+[1-9]\d{7,14}$/.test(c.from)&&/^HX[a-fA-F0-9]{32}$/.test(c.templateSid)}
export function whatsappState(){const e=env as WhatsAppEnv;const adminPhone=/^\+[1-9]\d{7,14}$/.test(e.WHATSAPP_ADMIN_PHONE||'');const admin=e.WHATSAPP_ADMIN_PROVIDER==='callmebot'?adminPhone&&Boolean(e.CALLMEBOT_API_KEY):e.WHATSAPP_ADMIN_PROVIDER==='twilio'?adminPhone&&twilioReady(e.TWILIO_ADMIN_TEMPLATE_SID):false;return {admin,provider:e.WHATSAPP_ADMIN_PROVIDER==='callmebot'?'CallMeBot':'WhatsApp Business',confirmation:twilioReady(e.TWILIO_CONFIRM_TEMPLATE_SID)&&e.WHATSAPP_AUTO_CONFIRM==='true'};}
export async function sendAdminWhatsapp(origin:string):Promise<DeliveryResult>{const e=env as WhatsAppEnv;if(!whatsappState().admin)return {status:'disabled'};
 // Keep personal and receipt details inside the protected dashboard.
 const message=`إيصال جديد بانتظار المراجعة في عيد أبناء إبراهيم علي الجديعي.\nافتح لوحة الإدارة لمراجعة التسجيل واعتماد التحويل:\n${origin}/admin`;
 return e.WHATSAPP_ADMIN_PROVIDER==='callmebot'?sendCallMeBot(e.WHATSAPP_ADMIN_PHONE!,e.CALLMEBOT_API_KEY!,message):sendTwilioTemplate(config(e.TWILIO_ADMIN_TEMPLATE_SID),e.WHATSAPP_ADMIN_PHONE!,{'1':origin+'/admin'});
}
export async function notifyAdminWhatsapp(id:string,origin:string){if(!whatsappState().admin)return 'disabled';const claimed=await env.DB!.prepare("UPDATE registrations SET admin_whatsapp_notice='sending' WHERE id=? AND admin_whatsapp_notice IN ('disabled','failed') RETURNING id").bind(id).first();if(!claimed)return 'skipped';const result=await sendAdminWhatsapp(origin);await env.DB!.prepare('UPDATE registrations SET admin_whatsapp_notice=? WHERE id=?').bind(result.status,id).run();return result.status;}
export async function confirmRegistrationWhatsapp(id:string){if(!whatsappState().confirmation)return 'disabled';
 const row=await env.DB!.prepare("SELECT contact,phone,total,guests FROM registrations WHERE id=? AND status='approved' AND contact_consent=1").bind(id).first<{contact:string,phone:string,total:number,guests:string}>();if(!row)return 'disabled';
 const claimed=await env.DB!.prepare("UPDATE registrations SET confirmation_notice='sending' WHERE id=? AND status='approved' AND contact_consent=1 AND confirmation_notice IN ('disabled','failed') RETURNING id").bind(id).first();if(!claimed)return 'skipped';
 const e=env as WhatsAppEnv;const result=await sendTwilioTemplate(config(e.TWILIO_CONFIRM_TEMPLATE_SID),'+966'+row.phone.slice(1),{'1':row.contact,'2':String(row.total),'3':String(JSON.parse(row.guests).length),'4':gatheringDateLabel});
 await env.DB!.prepare('UPDATE registrations SET confirmation_notice=?,confirmation_provider_id=? WHERE id=?').bind(result.status,result.providerId||null,id).run();return result.status;
}
