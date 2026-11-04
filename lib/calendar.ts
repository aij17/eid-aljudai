// Uses the same Intl Umm al-Qura calendar as aij17/ramadan-countdown.
export const DAY=86400000;
export const MAKKAH_OFFSET=3*60*60*1000;
const hijri=new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura',{year:'numeric',month:'numeric',day:'numeric',timeZone:'UTC'});
export function hijriToGregorian(year:number,month:number,day:number){
 let lo=Math.floor(Date.UTC(622,0,1)/DAY),hi=Math.floor(Date.UTC(2100,0,1)/DAY);
 const wanted=year*10000+month*100+day;
 while(lo<hi){const mid=Math.floor((lo+hi)/2);const parts=hijri.formatToParts(new Date(mid*DAY));const n=(type:string)=>Number(parts.find(p=>p.type===type)?.value);const value=n('year')*10000+n('month')*100+n('day');if(value<wanted)lo=mid+1;else hi=mid;}
 return new Date(lo*DAY);
}
export const EVENTS=[{key:'ramadan',label:'على رمضان',hijri:'1 رمضان 1448',date:hijriToGregorian(1448,9,1),icon:'☾'},{key:'eid',label:'على عيد الفطر',hijri:'1 شوال 1448',date:hijriToGregorian(1448,10,1),icon:'✦'},{key:'gathering',label:'على لمّتنا · رابع العيد',hijri:'4 شوال 1448',date:hijriToGregorian(1448,10,4),icon:'♡'}];
export function remainingDays(date:Date,now:number){return Math.max(0,Math.floor((date.getTime()-MAKKAH_OFFSET-now)/DAY));}
export function eventPhase(date:Date,now:number){const diff=Math.floor(date.getTime()/DAY)-Math.floor((now+MAKKAH_OFFSET)/DAY);return diff>0?'upcoming':diff===0?'today':'past'}
export function gregorianLabel(date:Date){return new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(date)}
export const gatheringDateLabel=gregorianLabel(EVENTS[2].date);
