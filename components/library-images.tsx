'use client';
import {visualSourceLink} from '../lib/visual-source-link';
import {createContext,useContext,useEffect,useId,useState,type ReactNode} from 'react';
import {Eye,EyeOff,X} from 'lucide-react';
import ModalShell from './modal-shell';

export const LIBRARY_IMAGES_KEY='wortgarten-library-images-v1';
export function readLibraryImageVisibility(storage:Pick<Storage,'getItem'>):boolean{
 try{return storage.getItem(LIBRARY_IMAGES_KEY)!=='hidden';}catch{return true;}
}
export function saveLibraryImageVisibility(storage:Pick<Storage,'setItem'>,visible:boolean):void{
 try{storage.setItem(LIBRARY_IMAGES_KEY,visible?'visible':'hidden');}catch{/* The toggle still works for this visit when browser storage is unavailable. */}
}
export type LibraryPhoto={url:string;source:string;title:string;author:string;license:string;licenseUrl:string;kind?:'photo'|'illustration'|'image';archive?:string;attribution?:string;explanationTR?:string};
type Preview={photo:LibraryPhoto;word:string};
type ImageContext={visible:boolean;toggle:()=>void;open:(preview:Preview)=>void};
const Context=createContext<ImageContext|null>(null);
function isCommonsSource(source?:string){if(typeof source!=='string'||!source)return false;try{return /^https?:\/\/commons\.wikimedia\.org(?:\/|$)/i.test(source.trim());}catch{return false;}}
/** The same label in German, for German word cards. */
export function libraryImageKindDE(photo:LibraryPhoto):string{
 if(photo.kind==='illustration')return photo.archive==='wortgarten'?'Lernskizze · Wortgarten':photo.archive==='openmoji'?'Illustration · OpenMoji':photo.archive==='twemoji'?'Illustration · Twemoji':'Illustration';
 return photo.kind==='photo'?'Foto':isCommonsSource(photo.source)?'Wikimedia-Bild':'Bild';
}
export function libraryImageKind(photo:LibraryPhoto):string{
 if(photo.kind==='illustration')return photo.archive==='wortgarten'?'Eğitsel çizim · Wortgarten':photo.archive==='openmoji'?'Çizim · OpenMoji':photo.archive==='twemoji'?'Çizim · Twemoji':'Çizim';
 return photo.kind==='photo'?'Fotoğraf':isCommonsSource(photo.source)?'Wikimedia görseli':'Görsel';
}
export default function LibraryImages({children}:{children:ReactNode}){
 const [visible,setVisible]=useState(true),[preview,setPreview]=useState<Preview|null>(null);
 const headingId=useId();
 useEffect(()=>{const read=()=>{try{setVisible(readLibraryImageVisibility(localStorage));}catch{/* Default remains visible. */}};read();const refresh=(event:StorageEvent)=>{if(event.key===LIBRARY_IMAGES_KEY||event.key===null)read();};window.addEventListener('storage',refresh);return()=>window.removeEventListener('storage',refresh);},[]);
 const toggle=()=>setVisible(previous=>{const next=!previous;try{saveLibraryImageVisibility(localStorage,next);}catch{/* Session preference remains usable. */}return next;});
 const safeSource=preview?.photo.source?visualSourceLink(preview.photo.source):'';
 const safeLicense=preview?.photo.licenseUrl?visualSourceLink(preview.photo.licenseUrl):'';
 return <Context.Provider value={{visible,toggle,open:setPreview}}>{children}{preview&&<ModalShell labelledBy={headingId} onClose={()=>setPreview(null)}><div className="library-image-preview"><header><h2 id={headingId}>{preview.word} · görsel</h2><button type="button" className="icon-btn" aria-label="Görseli kapat" onClick={()=>setPreview(null)}><X size={22}/></button></header><PreviewImage key={preview.photo.url} photo={preview.photo} word={preview.word}/><p className="micro"><b>{libraryImageKind(preview.photo)}</b></p>{preview.photo.explanationTR&&<p>{preview.photo.explanationTR}</p>}<p className="micro">{preview.photo.attribution||preview.photo.author}</p><nav aria-label="Görsel kaynakları">{safeSource&&<a href={safeSource} target="_blank" rel="noopener noreferrer">Kaynak</a>}{safeLicense&&<a href={safeLicense} target="_blank" rel="noopener noreferrer">Lisans: {preview.photo.license}</a>}</nav></div></ModalShell>}</Context.Provider>;
}
function PreviewImage({photo,word}:Preview){const [failed,setFailed]=useState(false);return failed?<p role="status">Görsel yüklenemedi. Bağlantını kontrol edip yeniden açabilirsin.</p>:<img className="library-image-large" src={photo.url} alt={photo.title||word+' için seçilen görsel'} data-kind={photo.kind} width={720} height={480} onError={()=>setFailed(true)}/>;}
export function LibraryImagesToggle(){const context=useContext(Context);if(!context)return null;return <button type="button" className="secondary library-images-toggle" aria-pressed={context.visible} onClick={context.toggle}>{context.visible?<EyeOff size={17}/>:<Eye size={17}/>}Görselleri {context.visible?'gizle':'göster'}</button>;}
export function LibraryImage({photo,word}:{photo?:LibraryPhoto;word:string}){const context=useContext(Context);if(!context?.visible||!photo)return null;return <Thumbnail key={photo.url} photo={photo} word={word} open={context.open}/>;}
function Thumbnail({photo,word,open}:Preview&{open:(preview:Preview)=>void}){
 const [failed,setFailed]=useState(false);
 return <button type="button" className="library-image-button" aria-label={word+' görselini büyüt'} disabled={failed} onClick={event=>{event.stopPropagation();open({photo,word});}}>{failed?<span role="status">Görsel yüklenemedi</span>:<img src={photo.url} alt={word+' için seçilen görsel'} width={72} height={64} loading="lazy" decoding="async" data-kind={photo.kind} onError={()=>setFailed(true)}/>}<small>{photo.kind==='illustration'?'Çizim':'Görsel'}</small></button>;
}
