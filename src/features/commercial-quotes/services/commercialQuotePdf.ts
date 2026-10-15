import type { CommercialQuoteDraft } from "@/features/commercial-quotes/services/commercialQuoteDraftService";
import type { CustomerQuotation } from "@/features/commercial-quotes/services/commercialQuoteLifecycleService";

/**
 * Dependency-free A4 PDF export. Browser canvas shapes Arabic and renders UTF-8
 * correctly before each page is embedded as a JPEG XObject in a real PDF.
 * This complements (not replaces) the accessible HTML Print/Save as PDF path.
 * Never upload or email a caller-supplied PDF: email attachments must be rendered
 * server-side from an authenticated authoritative quotation snapshot.
 */
type Quote = CommercialQuoteDraft | CustomerQuotation;
const WIDTH = 1240, HEIGHT = 1754, BOTTOM = 1550;
const navy = "#15365c", gold = "#c28b3c", ink = "#172235", muted = "#5b687b";
const formatMoney = (n: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
const label = (ar: boolean, a: string, e: string) => ar ? a : e;
type Sheet = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; y: number };

function wrapLines(ctx: CanvasRenderingContext2D, raw: string, width: number): string[] {
  const output: string[] = [];
  const paragraphs = String(raw || "").split(/\r?\n/);
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/u).filter(Boolean);
    if (!words.length) { output.push(""); continue; }
    let current = "";
    for (const word of words) {
      const candidate = current ? current + " " + word : word;
      if (current && ctx.measureText(candidate).width > width) {
        output.push(current); current = word;
      } else current = candidate;
      // Extremely long product codes should never extend past the page.
      if (ctx.measureText(current).width > width) {
        let segment = "";
        for (const ch of Array.from(current)) {
          if (segment && ctx.measureText(segment + ch).width > width) {
            output.push(segment); segment = ch;
          } else segment += ch;
        }
        current = segment;
      }
    }
    output.push(current);
  }
  return output;
}

function newSheet(quote: Quote, ar: boolean): Sheet {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH; canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser does not support quotation PDF export");
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = navy; ctx.fillRect(0, 0, WIDTH, 16);
  ctx.fillStyle = gold; ctx.fillRect(0, 16, WIDTH, 7);
  ctx.textBaseline = "alphabetic";
  ctx.direction = "ltr"; ctx.textAlign = "left";
  ctx.fillStyle = navy; ctx.font = "bold 62px system-ui, sans-serif";
  ctx.fillText("LOUREX", 75, 124);
  ctx.fillStyle = gold; ctx.font = "bold 19px system-ui, sans-serif";
  ctx.fillText("INTERNATIONAL TRADING & RESOURCES", 78, 162);
  ctx.fillStyle = muted; ctx.font = "23px system-ui, sans-serif";
  ctx.fillText("www.lou-rex.com  |  lourrex@proton.me", 78, 218);
  ctx.fillText("+90 539 241 1642  |  CR 62800  |  Homs, Syria", 78, 251);
  ctx.fillStyle = navy; ctx.font = "bold 27px system-ui, sans-serif";
  ctx.direction = ar ? "rtl" : "ltr"; ctx.textAlign = "right";
  ctx.fillText(label(ar, "عرض سعر تجاري", "COMMERCIAL QUOTATION"), WIDTH-78, 130);
  ctx.direction = "ltr"; ctx.textAlign = "right";
  ctx.font = "bold 22px system-ui, sans-serif";
  ctx.fillText(quote.number, WIDTH-78, 175);
  const revision = "versionNo" in quote ? quote.versionNo : 1;
  ctx.fillStyle = muted; ctx.font = "20px system-ui, sans-serif";
  ctx.fillText("Version " + revision, WIDTH-78, 209);
  const issued = quote.issuedAt || quote.approvedAt;
  if (issued) ctx.fillText(new Date(issued).toLocaleDateString("en-GB"), WIDTH-78, 239);
  ctx.strokeStyle = "#d4dae4"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(75, 282); ctx.lineTo(WIDTH-75, 282); ctx.stroke();
  return {canvas,ctx,y:315};
}

function drawTableHeader(page: Sheet, ar: boolean): void {
  const {ctx} = page, y = page.y;
  ctx.fillStyle = navy; ctx.fillRect(75,y,WIDTH-150,58);
  ctx.fillStyle = "#fff"; ctx.font = "bold 19px system-ui, sans-serif";
  ctx.direction = ar ? "rtl" : "ltr";
  ctx.textAlign = "left"; ctx.fillText("#",90,y+37);
  ctx.textAlign = ar ? "right" : "left";
  ctx.fillText(label(ar,"الصنف والمواصفات","Product / specifications"),ar?660:150,y+37);
  ctx.direction="ltr"; ctx.textAlign="right";
  ctx.fillText(label(ar,"الكمية","Qty"),837,y+37);
  ctx.fillText(label(ar,"الوحدة","Unit"),956,y+37);
  ctx.fillText(label(ar,"المبلغ","Amount"),1150,y+37);
  page.y += 68;
}

function drawRow(page: Sheet, quote: Quote, item: Quote["items"][number], ar: boolean): void {
  const {ctx} = page;
  ctx.font = "bold 22px system-ui, sans-serif";
  const names = wrapLines(ctx,item.name,490);
  ctx.font = "19px system-ui, sans-serif";
  const specs = item.specifications ? wrapLines(ctx,item.specifications,490) : [];
  const rowHeight = Math.max(90, 18 + names.length*32 + specs.length*28 + 18);
  const y = page.y;
  if (Math.floor(y/2)%2===0) {ctx.fillStyle="#f5f7fb";ctx.fillRect(75,y,WIDTH-150,rowHeight);}
  ctx.strokeStyle = "#e1e6ee";ctx.beginPath();ctx.moveTo(75,y+rowHeight);ctx.lineTo(WIDTH-75,y+rowHeight);ctx.stroke();
  ctx.textAlign="left";ctx.direction="ltr";ctx.fillStyle=ink;ctx.font="21px system-ui, sans-serif";
  ctx.fillText(String(item.lineNumber),90,y+32);
  ctx.textAlign=ar?"right":"left";ctx.direction=ar?"rtl":"ltr";
  ctx.font="bold 22px system-ui, sans-serif";
  const productX=ar?660:150;
  names.forEach((line,i)=>ctx.fillText(line,productX,y+32+i*32));
  ctx.fillStyle=muted;ctx.font="19px system-ui, sans-serif";
  specs.forEach((line,i)=>ctx.fillText(line,productX,y+32+names.length*32+i*28));
  ctx.fillStyle=ink;ctx.direction="ltr";ctx.textAlign="right";ctx.font="20px system-ui, sans-serif";
  ctx.fillText(String(item.quantity),837,y+32);
  ctx.fillText(item.unit||"-",956,y+32);
  ctx.fillText(item.unitPrice===null?"-":formatMoney(item.quantity*Number(item.unitPrice),quote.currency),1150,y+32);
  page.y+=rowHeight;
}

function writeParagraph(page:Sheet, title:string,value:string,ar:boolean):void {
  const {ctx}=page;
  ctx.fillStyle=navy;ctx.font="bold 22px system-ui, sans-serif";
  ctx.direction=ar?"rtl":"ltr";ctx.textAlign=ar?"right":"left";
  const x=ar?WIDTH-90:90;
  ctx.fillText(title,x,page.y);
  page.y+=34;
  ctx.fillStyle=ink;ctx.font="22px system-ui, sans-serif";
  for(const line of wrapLines(ctx,value||"-",WIDTH-195)){
    ctx.fillText(line,x,page.y);page.y+=34;
  }
  page.y+=20;
}
function toPdf(canvases:HTMLCanvasElement[]):Blob {
  const encoder=new TextEncoder(), chunks:Uint8Array[]=[];
  let size=0;
  const write=(chunk:string|Uint8Array)=>{
    const bytes=typeof chunk==="string"?encoder.encode(chunk):chunk;
    chunks.push(bytes);size+=bytes.length;
  };
  const offsets:number[]=[0];
  const begin=(id:number)=>{offsets[id]=size;write(id+" 0 obj\n");};
  const end=()=>write("\nendobj\n");
  write("%PDF-1.4\n%LOUREX\n");
  begin(1);write("<< /Type /Catalog /Pages 2 0 R >>");end();
  begin(2);write("<< /Type /Pages /Count "+canvases.length+" /Kids [ "+
    canvases.map((_,i)=>(3+i*3)+" 0 R").join(" ")+" ] >>");end();
  for(let i=0;i<canvases.length;i++){
    const pageId=3+3*i,imageId=pageId+1,streamId=pageId+2;
    const raw=atob(canvases[i].toDataURL("image/jpeg",.92).split(",")[1]);
    const jpeg=Uint8Array.from(raw,c=>c.charCodeAt(0));
    begin(pageId);
    write("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89]"+
      " /Resources << /XObject << /Im0 "+imageId+" 0 R >> >> /Contents "+streamId+" 0 R >>");end();
    begin(imageId);
    write("<< /Type /XObject /Subtype /Image /Width "+WIDTH+" /Height "+HEIGHT+
      " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length "+jpeg.length+" >>\nstream\n");
    write(jpeg);write("\nendstream");end();
    const stream="q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ\n";
    begin(streamId);write("<< /Length "+encoder.encode(stream).length+" >>\nstream\n"+stream+"endstream");end();
  }
  const xref=size;
  const count=3+canvases.length*3;
  write("xref\n0 "+count+"\n0000000000 65535 f \n");
  for(let id=1;id<count;id++)write(String(offsets[id]).padStart(10,"0")+" 00000 n \n");
  write("trailer\n<< /Size "+count+" /Root 1 0 R >>\nstartxref\n"+xref+"\n%%EOF\n");
  return new Blob(chunks as BlobPart[],{type:"application/pdf"});
}

export async function downloadCommercialQuotePdf(quote:Quote,lang:"ar"|"en"):Promise<void>{
  if (quote.status==="draft") throw new Error("Save pricing before generating the official PDF");
  // Keep the export inside the user's click activation, especially on iOS Safari.
  if (!quote.items.length || quote.items.some(item => item.unitPrice === null || !Number.isFinite(Number(item.unitPrice)) || !Number.isFinite(item.quantity))) throw new Error("Quotation pricing is incomplete");
  if (![quote.shippingCost, quote.discountAmount].every(Number.isFinite)) throw new Error("Quotation totals are invalid");
  const ar=lang==="ar";
  const sheets:Sheet[]=[newSheet(quote,ar)];
  let page=sheets[0];
  const next=()=>{page=newSheet(quote,ar);sheets.push(page);};
  drawTableHeader(page,ar);
  for(const item of quote.items){
    // Reserve enough for up to a paragraph of description; retry on a fresh sheet when needed.
    const ctx=page.ctx;
    ctx.font="bold 22px system-ui, sans-serif";
    const nameLines=wrapLines(ctx,item.name,490).length;
    ctx.font="19px system-ui, sans-serif";
    const specLines=item.specifications?wrapLines(ctx,item.specifications,490).length:0;
    const height=Math.max(90,18+nameLines*32+specLines*28+18);
    if(page.y+height>BOTTOM){next();drawTableHeader(page,ar);}
    drawRow(page,quote,item,ar);
  }
  let subtotal=0;
  for (const item of quote.items) subtotal+=item.quantity*Number(item.unitPrice??0);
  const total=subtotal+quote.shippingCost-quote.discountAmount;
  const totals=[
    [label(ar,"المجموع الفرعي","Subtotal"),formatMoney(subtotal,quote.currency)],
    [label(ar,"الشحن","Shipping"),formatMoney(quote.shippingCost,quote.currency)],
    [label(ar,"الخصم","Discount"),formatMoney(quote.discountAmount,quote.currency)],
    [label(ar,"الإجمالي النهائي","Grand total"),formatMoney(total,quote.currency)],
  ];
  if(page.y+300>BOTTOM)next();
  page.y+=34;
  for(const [name,amount] of totals){
    const {ctx}=page;ctx.direction=ar?"rtl":"ltr";ctx.textAlign=ar?"right":"left";
    ctx.font="bold 23px system-ui, sans-serif";ctx.fillStyle=navy;
    ctx.fillText(name,ar?WIDTH-90:90,page.y);
    ctx.direction="ltr";ctx.textAlign="right";
    ctx.fillText(amount,WIDTH-90,page.y);page.y+=52;
  }
  const clauses=[
    [label(ar,"شروط الدفع","Payment terms"),quote.paymentTerms],
    [label(ar,"شروط التسليم","Delivery terms"),quote.deliveryTerms],
    ["Incoterm",quote.incoterm],
    [label(ar,"مدة التوريد","Lead time"),quote.leadTime],
    [label(ar,"صلاحية العرض","Validity"),quote.validityDays+" "+label(ar,"يوم","days")],
  ];
  for(const [heading,value] of clauses){
    page.ctx.font="22px system-ui, sans-serif";
    const lines=wrapLines(page.ctx,value||"-",WIDTH-195).length;
    if(page.y+34+34*lines+20>BOTTOM)next();
    writeParagraph(page,heading,value,ar);
  }
  const disclaimer=label(ar,
    "هذا عرض سعر تجاري صادر عن LOUREX. قبول العرض لا يعد إثباتاً للدفع.",
    "This is an official LOUREX commercial quotation. Acceptance does not constitute proof of payment.");
  if(page.y+100>BOTTOM)next();
  writeParagraph(page,"LOUREX",disclaimer,ar);
  for(let i=0;i<sheets.length;i++){
    const c=sheets[i].ctx;
    c.strokeStyle="#d4dae4";c.beginPath();c.moveTo(75,1665);c.lineTo(WIDTH-75,1665);c.stroke();
    c.fillStyle=muted;c.font="18px system-ui, sans-serif";
    c.direction="ltr";c.textAlign="left";
    c.fillText("LOUREX TRADING  |  www.lou-rex.com",78,1701);
    c.textAlign="right";c.fillText("Page "+(i+1)+" / "+sheets.length,WIDTH-78,1701);
  }
  const blob=toPdf(sheets.map(s=>s.canvas));
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=quote.number.replace(/[^A-Za-z0-9_-]/g,"_")+".pdf";
  document.body.appendChild(a);a.click();a.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),5000);
}
