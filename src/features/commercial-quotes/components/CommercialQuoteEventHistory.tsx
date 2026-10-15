import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
type Event = { id: string; action: string; note: string; created_at: string };
export function CommercialQuoteEventHistory({ quoteId, status, lang }: {
  quoteId: string; status: string; lang: "ar" | "en";
}) {
  const ar=lang==="ar";
  const [entries,setEntries]=useState<Event[]>([]);
  const [error,setError]=useState("");
  useEffect(()=>{
    let active=true;
    setEntries([]);setError("");
    if(status==="draft")return;
    void (async ()=>{
      const { data, error }=await supabase.from("commercial_quote_events")
        .select("id,action,note,created_at").eq("quote_id",quoteId).order("created_at",{ascending:false});
      if(!active)return;
      if(error)setError(ar?"تعذر تحميل سجل الإجراءات.":"Unable to load quotation history.");
      else setEntries((data||[]) as Event[]);
    })();
    return ()=>{active=false};
  },[quoteId,status,ar]);
  if(status==="draft")return null;
  return <section className="rounded-2xl border border-primary/20 bg-background/70 p-4">
    <h4 className="flex items-center gap-2 font-semibold"><Clock3 className="h-4 w-4 text-primary"/>
      {ar?"سجل الإجراءات التجارية":"Quotation activity history"}
    </h4>
    {error&&<p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
    {entries.length===0&&!error&&<p className="mt-2 text-xs text-muted-foreground">{ar?"لا توجد أحداث مسجلة بعد.":"No activity entries yet."}</p>}
    <ol className="mt-3 space-y-3">
      {entries.map(e=><li key={e.id} className="rounded-xl border border-border/60 bg-card/60 p-3 text-sm">
        <div className="flex flex-wrap justify-between gap-2">
          <strong>{e.action}</strong><time className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString(ar?"ar":"en")}</time>
        </div>
        {e.note&&<p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{e.note}</p>}
      </li>)}
    </ol>
  </section>;
}
