import type { Metadata, Viewport } from 'next';
import './globals.css';
import './academic.css';
import PageLanguage from '../components/page-language';
export const viewport: Viewport = {width:'device-width',initialScale:1,viewportFit:'cover',themeColor:[{media:'(prefers-color-scheme: light)',color:'#f6f5f1'},{media:'(prefers-color-scheme: dark)',color:'#1f1f1c'}]};
export const metadata: Metadata = {title:'Wortgarten · Dein Wortgarten',description:'Deutsche Wörter entdecken, behalten, wachsen lassen.',manifest:'/manifest.webmanifest',appleWebApp:{capable:true,title:'Wortgarten',statusBarStyle:'default'},icons:{apple:'/apple-touch-icon.png',icon:'/icon-192.png'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="de" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:"try{if(localStorage.getItem('wortgarten-palette')==='rose')document.documentElement.dataset.palette='rose'}catch(e){}var d=document.documentElement,l='de';try{if(localStorage.getItem('wortgarten-card-language')==='tr')l='tr'}catch(e){}d.lang=l;if(l==='de'){d.classList.add('i18n-pending');setTimeout(function(){d.classList.remove('i18n-pending')},1500)}"}}/></head><body><a className="skip-link" href="#main-content">İçeriğe geç</a>{children}<PageLanguage/></body></html>}
