'use client';
import {useEffect,useRef,useState} from 'react';
import {Bell,BellOff,Check,Send} from 'lucide-react';
import {matchesPushKey} from '../lib/push-subscription-key';
type Props={nextDue:number|null};
type Config={token:string;hour:number;timezone:string;enabled:boolean;serverKey?:string};
const KEY='wortgarten-push-v1';
async function api(path:string,data:unknown){const r=await fetch('/api/push/'+path,{method:'POST',keepalive:true,headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),body:JSON.stringify(data)});const d=await r.json();if(!r.ok)throw Object.assign(Error(d.error||'İşlem tamamlanamadı.'),{status:r.status});return d}
export default function PushSettings({nextDue}:Props){
 const [config,setConfig]=useState<Config|null>(null),[supported,setSupported]=useState(false),[installed,setInstalled]=useState(true),[serverReady,setServerReady]=useState(false),[publicKey,setPublicKey]=useState(''),[hour,setHour]=useState(19),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[permission,setPermission]=useState('default');const latestDue=useRef(nextDue);latestDue.current=nextDue;const synced=useRef('');
 const [subscriptionMissing,setSubscriptionMissing]=useState(false);
 const [reconnected,setReconnected]=useState(0);
 const settingsQueue=useRef(Promise.resolve());
 const needsRenew=!!(config?.enabled&&(subscriptionMissing||(publicKey&&config.serverKey!==publicKey)));
 useEffect(()=>{const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);const home=window.matchMedia('(display-mode: standalone)').matches||(navigator as any).standalone;setInstalled(!isIOS||home);setSupported('serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window);if('Notification'in window)setPermission(Notification.permission);
 try{const raw=localStorage.getItem(KEY);if(raw){const saved=JSON.parse(raw);if(/^[a-f0-9]{64}$/.test(saved.token)){setConfig(saved);setHour(saved.hour)}}}catch{}
 try{const preference=JSON.parse(localStorage.getItem('wortgarten-reminder-preference-v1')||'null');if(Number.isInteger(preference?.hour)&&preference.hour>=0&&preference.hour<=23)setHour(preference.hour);}catch{}
 if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js',{scope:'/'}).then(r=>r.update()).catch(()=>setMessage('Arka plan servisi yüklenemedi. Sayfayı yeniden aç.'));
 const controller=new AbortController();
 let refreshing=false;
 const refresh=async()=>{
  if(refreshing)return;
  refreshing=true;
  try{
   const response=await fetch('/api/push/config',{signal:controller.signal});
   const data=await response.json();
   if(!response.ok)throw Error('Bildirim ayarları okunamadı.');
   if(controller.signal.aborted)return;
   setServerReady(data.ready===true&&data.cryptoReady!==false);
   setPublicKey(typeof data.publicKey==='string'?data.publicKey:'');
   setReconnected(value=>value+1);
  }catch{if(!controller.signal.aborted)setServerReady(false);}
  finally{refreshing=false;}
 };
 const online=()=>{synced.current='';void refresh();};
 window.addEventListener('online',online);void refresh();
 return()=>{controller.abort();window.removeEventListener('online',online);};
 },[]);
 function updateSettings(data:unknown){
  const request=settingsQueue.current.then(()=>api('settings',data));
  settingsQueue.current=request.then(()=>{},()=>{});
  return request;
 }
 useEffect(()=>{
  if(!config?.enabled||!serverReady||needsRenew||busy)return;
  const state=JSON.stringify([config.token,config.hour,config.timezone,nextDue]);
  if(synced.current===state)return;
  synced.current=state;
  void updateSettings({...config,nextDue}).catch((error:unknown)=>{
   if(synced.current!==state)return;
   synced.current='';
   const status=error instanceof Error?(error as Error&{status?:number}).status:undefined;
   if(status===404||status===410)setSubscriptionMissing(true);
   else setMessage('Tekrar zamanları eşitlenemedi. Bağlantı geri geldiğinde tekrar denenecek.');
  });
 },[config,nextDue,serverReady,needsRenew,busy,reconnected]);
 function persist(c:Config){try{localStorage.setItem(KEY,JSON.stringify(c));localStorage.setItem('wortgarten-reminder-preference-v1',JSON.stringify({hour:c.hour,timezone:c.timezone}));}catch{}setConfig(c)}
 async function enable(){if(!supported||!installed||!serverReady||!publicKey)return;setBusy(true);setMessage('');try{
 // Called directly from the tap handler, before any awaited service-worker work.
 const granted=await Notification.requestPermission();setPermission(granted);if(granted!=='granted')throw Error('İzin verilmedi. iPhone Ayarlar → Bildirimler bölümünden Wortgarten iznini kontrol edebilirsin.');
 const registration=await navigator.serviceWorker.ready;const bytes=Uint8Array.from(atob(publicKey.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-publicKey.length%4)%4)),c=>c.charCodeAt(0));let subscription=await registration.pushManager.getSubscription();
 if(subscription){const matches=matchesPushKey(subscription.options?.applicationServerKey,bytes);
  if(!config?.token||matches===false||(matches===null&&needsRenew)){
   if(!await subscription.unsubscribe())throw Error('Eski bildirim bağlantısı kapatılamadı. Yeniden dene.');
   subscription=null;
  }
 }
 subscription??=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
 const newToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32))).map(n=>n.toString(16).padStart(2,'0')).join('');
 let token=config?.token||newToken();let c:Config={token,hour,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/Berlin',enabled:true,serverKey:publicKey};
 try{await updateSettings({...c,subscription:subscription.toJSON(),nextDue:latestDue.current});}catch(err){if((err as {status?:number}|null)?.status!==409)throw err;await subscription.unsubscribe();subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});token=newToken();c={...c,token};await updateSettings({...c,subscription:subscription.toJSON(),nextDue:latestDue.current});}
 synced.current=JSON.stringify([c.token,c.hour,c.timezone,latestDue.current]);persist(c);setSubscriptionMissing(false);setMessage('Hatırlatmalar etkin. Aşağıdan test bildirimi gönderebilirsin.');
 }catch(e){setMessage(e instanceof Error?e.message:'Bildirimler etkinleştirilemedi.')}finally{setBusy(false)}}
 async function disable(){if(!config)return;setBusy(true);try{await updateSettings({token:config.token,enabled:false});persist({...config,enabled:false});setSubscriptionMissing(false);const registration=await navigator.serviceWorker.getRegistration();await(await registration?.pushManager.getSubscription())?.unsubscribe();setMessage('Bu cihazdaki günlük hatırlatmalar kapatıldı.')}catch(e){setMessage(e instanceof Error?e.message:'Kapatılamadı; yeniden dene.')}finally{setBusy(false)}}
 async function saveHour(){if(!config?.enabled)return;setBusy(true);try{const c={...config,hour,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||config.timezone};await updateSettings({...c,nextDue:latestDue.current});synced.current=JSON.stringify([c.token,c.hour,c.timezone,latestDue.current]);persist(c);setMessage('Hatırlatma saatin güncellendi.')}catch(e){const s=(e as {status?:number}|null)?.status;if(s===404||s===410)setSubscriptionMissing(true);setMessage(e instanceof Error?e.message:'Saat kaydedilemedi.')}finally{setBusy(false)}}
 async function test(){if(!config?.enabled)return;setBusy(true);try{await api('test',{token:config.token});setMessage('Push servisi test bildirimini kabul etti. iPhone Bildirim Merkezi ve Odak ayarlarını kontrol et.')}catch(e){const s=(e as {status?:number}|null)?.status;if(s===404||s===410)setSubscriptionMissing(true);setMessage(e instanceof Error?e.message:'Test gönderilemedi.')}finally{setBusy(false)}}
 return <section className="push-panel"><div className="push-heading"><span className="push-icon"><Bell size={21}/></span><div><h2>Hatırlatmalar</h2><p>Uygulama kapalıyken de, tekrar zamanı geldiyse günde bir bildirim.</p></div>{config?.enabled&&!needsRenew&&permission==='granted'&&<span className="push-active"><Check size={13}/> İzin açık</span>}</div><div className="push-controls"><label>Hatırlatma saati<select aria-label="Günlük hatırlatma saati" value={hour} onChange={e=>setHour(Number(e.target.value))}>{Array.from({length:24},(_,h)=><option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>)}</select></label>{needsRenew?<><button className="primary" onClick={enable} disabled={busy||!supported||!installed||!serverReady}>Bildirimleri yeniden bağla</button><button className="text-button" onClick={disable} disabled={busy}>Kapat</button></>:config?.enabled?<><button className="secondary" onClick={saveHour} disabled={busy||hour===config.hour}>Saati kaydet</button><button className="primary" onClick={test} disabled={busy}><Send size={15}/> Test bildirimi</button><button className="text-button" onClick={disable} disabled={busy}><BellOff size={15}/> Kapat</button></>:<button className="primary" onClick={enable} disabled={busy||!supported||!installed||!serverReady}>{busy?'Hazırlanıyor…':<><Bell size={16}/> Bildirimleri aç</>}</button>}</div>{needsRenew&&<p className="push-message">{subscriptionMissing?'Bu cihazın bildirim kaydı sona ermiş. Bildirimleri yeniden bağla.':'Bildirim anahtarı değişti. Bu cihazı bir kez yeniden bağla.'}</p>}{!installed&&<p className="push-message">iPhone’da önce Safari → Paylaş → Ana Ekrana Ekle. Sonra ana ekran simgesinden açıp bu düğmeye dokun. Önceden eklediğin simge tarayıcıda açılıyorsa verilerini yedekledikten sonra yeniden ekle.</p>}{!supported&&<p className="push-message">Bu ortam Web Push desteklemiyor. iPhone’da iOS 16.4 veya üzeri ve ana ekrandan açılan web uygulaması gerekir.</p>}{supported&&!serverReady&&<p className="push-message">Bildirim sunucusu henüz hazır değil veya bağlantı kurulamadı. Yeniden açıp dene.</p>}{message&&<p className="push-message" role="status">{message}</p>}<p className="micro">Saat dilimi: {config?.timezone||'cihazının yerel saati'}. Gönderim yaklaşık saat başlarında kontrol edilir; kesin dakika garantisi yoktur. Sunucuya kelimelerin değil, yalnız tekrar zamanın ve bu cihazın push aboneliği gider. Bildirimleri kapatınca abonelik silinir; 120 gün açılmayan cihazlar otomatik kaldırılır.</p></section>
}
