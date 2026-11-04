'use client';
import {useEffect,useState} from 'react';
export default function BankQr(){const [available,setAvailable]=useState(false);useEffect(()=>{fetch('/api/bank-qr',{method:'HEAD'}).then(r=>setAvailable(r.ok)).catch(()=>{})},[]);if(!available)return null;return <section className="qr-card"><h4>رمز الحساب البنكي</h4><img src="/api/bank-qr" alt="صورة رمز الحساب البنكي وبيانات التحويل" loading="lazy"/><small>يمكنك حفظ الصورة واستخدامها للتحويل.</small><a href="/api/bank-qr?download=1" download>↓ تحميل صورة الباركود</a></section>}
