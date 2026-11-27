import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { conversionKind, measurementPath, measurementSource, safeMeasurementLocation } from "@/lib/searchMeasurement";

const id=String(import.meta.env.VITE_GA4_MEASUREMENT_ID||"").trim();
const configured=/^G-[A-Z0-9]{6,20}$/.test(id)&&import.meta.env.VITE_SEARCH_ANALYTICS_ENABLED==="true";
const consentKey="lourex-search-analytics-v1";
type Choice="accepted"|"rejected"|null;
type AnalyticsWindow=Window & {lourexSearchLayer?: IArguments[]};
const win=()=>window as AnalyticsWindow;
let installed=false;
function command(..._args:unknown[]) {
  const w=win();
  // Google tag expects the gtag arguments object, not arbitrary arrays.
  (w.lourexSearchLayer??=[]).push(arguments);
}
function disable(disabled:boolean) {
  (window as unknown as Record<string,unknown>)["ga-disable-"+id]=disabled;
}
function install(pageLocation:string) {
  if(installed)return;
  installed=true;
  command("consent","default",{analytics_storage:"denied",ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied"});
  command("consent","update",{analytics_storage:"granted"});
  command("js",new Date());
  command("config",id,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,allow_ad_user_data:false,allow_ad_personalization:false,page_location:pageLocation,page_referrer:""});
  const script=document.createElement("script");
  script.async=true;
  script.src="https://www.googletagmanager.com/gtag/js?id="+encodeURIComponent(id)+"&l=lourexSearchLayer";
  script.referrerPolicy="no-referrer";
  document.head.appendChild(script);
}
function loadChoice():Choice{
  try{const value=localStorage.getItem(consentKey);return value==="accepted"||value==="rejected"?value:null;}catch{return null;}
}
export default function SearchMeasurement(){
  const location=useLocation();
  const {lang}=useI18n();
  const ar=lang==="ar";
  const [choice,setChoice]=useState<Choice>(loadChoice);
  const [settings,setSettings]=useState(false);
  const [source,setSource]=useState(()=>measurementSource(window.location.search,document.referrer));
  const path=measurementPath(location.pathname);
  useEffect(()=>{
    if(!configured)return;
    const incoming=measurementSource(location.search,"");
    if(incoming!=="unattributed")setSource(incoming);
  },[location.search]);
  useEffect(()=>{
    if(!configured)return;
    const url=safeMeasurementLocation(location.pathname,source);
    if(choice!=="accepted"||!url){
      disable(true);
      if(installed)command("consent","update",{analytics_storage:"denied"});
      return;
    }
    disable(false);
    install(url);
    command("consent","update",{analytics_storage:"granted"});
    command("set",{page_location:url,page_referrer:"",page_title:path});
    command("event","page_view",{send_to:id,page_location:url,page_referrer:"",page_title:path,traffic_source:source});
    const listener=(e:Event)=>{
      const kind=conversionKind((e as CustomEvent<{event?:unknown}>).detail?.event);
      if(kind)command("event","generate_lead",{send_to:id,lead_type:kind,traffic_source:source,page_location:url,page_title:path});
    };
    window.addEventListener("lourex:analytics",listener);
    return ()=>{window.removeEventListener("lourex:analytics",listener);disable(true);};
  },[choice,location.pathname,path,source]);
  if(!configured||!path)return null;
  function choose(value:Choice){
    try{if(value)localStorage.setItem(consentKey,value);else localStorage.removeItem(consentKey);}catch{/* consent stays in memory */}
    if(value!=="accepted"){disable(true);if(installed)command("consent","update",{analytics_storage:"denied"});}
    setChoice(value);setSettings(false);
  }
  return <aside dir={ar?"rtl":"ltr"} className="fixed bottom-3 start-3 z-[70] max-w-[calc(100vw-1.5rem)]" aria-label={ar?"خصوصية القياس":"Measurement privacy"}>
    {choice===null||settings?<div className="max-w-sm rounded-xl border border-border bg-card text-card-foreground p-4 shadow-lg">
      <p className="text-sm">{ar?"نستخدم قياسًا اختياريًا لفهم زيارات البحث وطلبات التوريد. لا يتم تشغيل Google Analytics قبل موافقتك.":"Optional analytics help us understand search visits and sourcing inquiries. Google Analytics is not loaded before consent."} <a href="/privacy" className="underline">{ar?"الخصوصية":"Privacy"}</a></p>
      <div className="mt-3 flex gap-2 flex-wrap"><button type="button" className="rounded-lg border border-border px-3 py-2 text-sm" onClick={()=>choose("accepted")}>{ar?"السماح":"Allow"}</button><button type="button" className="rounded-lg border border-border px-3 py-2 text-sm" onClick={()=>choose("rejected")}>{ar?"الرفض":"Decline"}</button></div>
    </div>:<button type="button" className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-card-foreground" onClick={()=>setSettings(true)}>{ar?"إعدادات الخصوصية":"Privacy settings"}</button>}
  </aside>;
}
