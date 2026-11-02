export type DeliveryResult={status:'disabled'|'accepted'|'failed'|'unknown',providerId?:string};
export type TwilioConfig={accountSid:string,authToken:string,from:string,templateSid:string};
export async function sendTwilioTemplate(config:TwilioConfig,to:string,variables:Record<string,string>,send:typeof fetch=fetch):Promise<DeliveryResult>{
 if(!/^AC[a-fA-F0-9]{32}$/.test(config.accountSid)||!/^HX[a-fA-F0-9]{32}$/.test(config.templateSid)||!/^whatsapp:\+[1-9]\d{7,14}$/.test(config.from)||!/^\+[1-9]\d{7,14}$/.test(to)||!config.authToken)return {status:'disabled'};
 const body=new URLSearchParams({From:config.from,To:'whatsapp:'+to,ContentSid:config.templateSid,ContentVariables:JSON.stringify(variables)});
 try{const response=await send(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,{method:'POST',headers:{Authorization:'Basic '+btoa(config.accountSid+':'+config.authToken),'Content-Type':'application/x-www-form-urlencoded'},body,signal:AbortSignal.timeout(8000)});
 if(!response.ok)return {status:response.status>=500?'unknown':'failed'};
 const result=await response.json() as {sid?:string};return result.sid?{status:'accepted',providerId:result.sid}:{status:'unknown'};
 }catch{return {status:'unknown'}}
}
export async function sendCallMeBot(phone:string,apiKey:string,text:string,send:typeof fetch=fetch):Promise<DeliveryResult>{
 if(!/^\+?[1-9]\d{7,14}$/.test(phone)||!apiKey)return {status:'disabled'};
 const url=new URL('https://api.callmebot.com/whatsapp.php');url.searchParams.set('phone',phone);url.searchParams.set('apikey',apiKey);url.searchParams.set('text',text);
 try{const response=await send(url,{signal:AbortSignal.timeout(8000)});if(!response.ok)return {status:response.status>=500?'unknown':'failed'};const text=(await response.text()).slice(0,10000);if(/message\s+(?:was\s+)?(?:added|queued|sent)|message\s+(?:was\s+)?successfully\s+sent/i.test(text))return {status:'accepted'};if(/error|invalid|not activated|not allowed/i.test(text))return {status:'failed'};return {status:'unknown'};}catch{return {status:'unknown'}}
}
