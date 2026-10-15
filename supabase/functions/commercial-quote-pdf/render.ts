import { PDFDocument, rgb } from "npm:pdf-lib@1.17.1";
import * as fontkit from "npm:fontkit@2.0.4";
import { drawArabicText } from "npm:naqqash@0.2.0/pdf-lib";
import { shapeArabicText } from "npm:naqqash@0.2.0";

const arabic = /[\u0600-\u06ff\u0750-\u077f]/;
const fontUrl = "https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/Amiri-Regular.ttf";
let fontBytes: Uint8Array | undefined;
async function loadFont(): Promise<Uint8Array> {
  if (fontBytes) return fontBytes;
  const result = await fetch(fontUrl, { signal: AbortSignal.timeout(7500) });
  if (!result.ok) throw new Error("Arabic font is temporarily unavailable");
  const bytes = new Uint8Array(await result.arrayBuffer());
  if (bytes.byteLength < 50000 || bytes.byteLength > 2000000) throw new Error("Invalid PDF font resource");
  fontBytes = bytes;
  return bytes;
}

export type Quote = {
  quote_number: string; currency: string; payment_terms: string; delivery_terms: string;
  incoterm: string; lead_time: string; validity_days: number; shipping_cost: number;
  discount_amount: number; issued_at: string;
};
export type Line = {
  line_number: number; product_name: string; quantity: number; unit: string;
  unit_price: number; specifications: string;
};

export async function renderPdf(q: Quote, lines: Line[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const face = await doc.embedFont(await loadFont(), { subset: false });
  const width = 595.28, height = 841.89, margin = 42;
  const navy = rgb(.075,.18,.31), gold = rgb(.76,.53,.22), ink = rgb(.12,.16,.22);
  let page = doc.addPage([width,height]);
  let y = height - 40;
  const format = (n: number) =>
    new Intl.NumberFormat("en-US", { style:"currency", currency:q.currency, maximumFractionDigits:2 }).format(n);
  const prepared = (txt: string) => arabic.test(txt) ? shapeArabicText(txt) : txt;
  const lineWidth = (txt: string, size: number) => face.widthOfTextAtSize(prepared(txt),size);
  const draw = (txt: string, x: number, row: number, size=10, opts?:{bold?:boolean; right?:boolean; color?:typeof ink}) => {
    const value = String(txt ?? "").split("").filter(character => character.charCodeAt(0) >= 32).join("").slice(0,2100);
    const color = opts?.color || ink;
    if (!value) return;
    if (arabic.test(value)) {
      drawArabicText(page,value,opts?.right ? x : x+lineWidth(value,size),row,{
        font:face,size,align:"right",color
      });
    } else {
      page.drawText(value,{x: opts?.right ? x-lineWidth(value,size) : x,y:row,size,font:face,color});
    }
  };
  const wrap = (value:string,maxWidth:number,size:number):string[] => {
    const segments = String(value ?? "").replace(/\r/g,"").split("\n");
    const result:string[]=[];
    for(const section of segments) {
      let current="";
      for(const token of section.split(/\s+/).filter(Boolean)){
        if(lineWidth(token,size)>maxWidth) {
          if(current){result.push(current);current="";}
          let bit="";
          for(const char of Array.from(token)){
            if(bit && lineWidth(bit+char,size)>maxWidth){result.push(bit);bit=char;}else bit+=char;
          }
          current=bit;
          continue;
        }
        const attempt=current ? current+" "+token : token;
        if(current && lineWidth(attempt,size)>maxWidth){result.push(current);current=token;}else current=attempt;
      }
      if(current)result.push(current);
    }
    return result.length ? result : ["-"];
  };
  const header = () => {
    page.drawRectangle({x:0,y:height-12,width,height:12,color:navy});
    page.drawRectangle({x:0,y:height-17,width,height:5,color:gold});
    draw("LOUREX",margin,height-67,27,{color:navy});
    draw("International Trading & Resources",margin,height-85,11,{color:gold});
    draw("OFFICIAL COMMERCIAL QUOTATION",margin,height-111,14,{color:navy});
    draw("عرض سعر تجاري رسمي",width-margin,height-111,13,{right:true,color:navy});
    draw(q.quote_number,margin,height-137,11);
    const stamp=new Date(q.issued_at);
    if(!Number.isNaN(stamp.getTime()))draw(stamp.toISOString().slice(0,10),width-margin,height-137,10,{right:true});
    draw("www.lou-rex.com  |  lourrex@proton.me",margin,height-155,9);
    page.drawLine({start:{x:margin,y:height-169},end:{x:width-margin,y:height-169},thickness:1.5,color:gold});
    y=height-194;
  };
  const next = () => { page=doc.addPage([width,height]);header(); };
  const space = (needed:number) => { if(y-needed<73)next(); };
  const paragraph = (title:string,text:string) => {
    const rows = wrap(text,width-2*margin,10);
    space(28+rows.length*15);
    draw(title,margin,y,11,{color:navy});y-=21;
    for(const t of rows){draw(t,margin,y,10);y-=15;}
    y-=12;
  };
  header();
  draw("#",margin,y,10,{color:navy});
  draw("PRODUCT / SPECIFICATIONS",margin+22,y,10,{color:navy});
  draw("QTY",width-155,y,10,{color:navy});
  draw("TOTAL",width-margin,y,10,{right:true,color:navy});
  y-=20;
  let subtotal=0;
  for(const line of lines) {
    if(!Number.isFinite(Number(line.quantity)) || !Number.isFinite(Number(line.unit_price)) ||
      line.quantity<=0 || Number(line.unit_price)<0) throw new Error("Invalid issued line price");
    const product=wrap(line.product_name,305,11);
    const specs=line.specifications ? wrap(line.specifications,305,9) : [];
    const h=12+product.length*17+specs.length*14+9;
    if(h>450) throw new Error("Quotation line exceeds supported PDF length");
    space(h);
    draw(String(line.line_number),margin,y,10);
    product.forEach((row,i)=>draw(row,margin+22,y-i*17,11));
    specs.forEach((row,i)=>draw(row,margin+22,y-product.length*17-i*14,9));
    draw(String(line.quantity)+" "+(line.unit||""),width-155,y,9);
    const amount=line.quantity*Number(line.unit_price);
    subtotal+=amount;
    draw(format(amount),width-margin,y,10,{right:true});
    y-=h;
    page.drawLine({start:{x:margin,y:y+3},end:{x:width-margin,y:y+3},color:rgb(.85,.87,.90),thickness:.5});
  }
  const total= Math.round((subtotal+Number(q.shipping_cost)-Number(q.discount_amount))*100)/100;
  if(!Number.isFinite(total) || total<0) throw new Error("Invalid quotation total");
  space(95);
  y-=6;
  draw("Subtotal",margin,y,11);
  draw(format(subtotal),width-margin,y,11,{right:true});y-=18;
  draw("Shipping",margin,y,11);
  draw(format(Number(q.shipping_cost)),width-margin,y,11,{right:true});y-=18;
  draw("Discount",margin,y,11);
  draw(format(Number(q.discount_amount)),width-margin,y,11,{right:true});y-=22;
  draw("GRAND TOTAL",margin,y,13,{color:navy});
  draw(format(total),width-margin,y,13,{right:true,color:navy});y-=37;
  paragraph("Payment terms / شروط الدفع",q.payment_terms);
  paragraph("Delivery terms / شروط التسليم",q.delivery_terms);
  paragraph("Incoterm",q.incoterm||"-");
  paragraph("Lead time / مدة التوريد",q.lead_time||"-");
  paragraph("Validity / صلاحية العرض",String(q.validity_days)+" days");
  paragraph("NOTICE / ملاحظة",
    "Quotation acceptance does not constitute payment. قبول العرض لا يعد إثباتاً للدفع.");
  for(const pg of doc.getPages()){
    pg.drawLine({start:{x:margin,y:48},end:{x:width-margin,y:48},color:gold,thickness:.7});
    // Text drawn here needs a reference to the target page, not the mutable current page.
    pg.drawText("LOUREX  |  www.lou-rex.com  |  +90 539 241 1642",{
      x:margin,y:32,font:face,size:9,color:navy,
    });
  }
  return doc.save({ useObjectStreams:false });
}

