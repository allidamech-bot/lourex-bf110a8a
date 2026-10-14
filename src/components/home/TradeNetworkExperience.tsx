import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Boxes, Handshake, MapPin, Route, Ship, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";

type Node = {
  id: "source" | "coordinate" | "deliver";
  code: string;
  icon: LucideIcon;
  label: string;
  title: string;
  description: string;
  action: string;
  href: string;
};

/** Illustrative experience only: all data and links are static UI, not shipment location or live telemetry. */
export default function TradeNetworkExperience() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const reduceMotion = useReducedMotion();
  const [selected, setSelected] = useState<Node["id"]>("coordinate");

  const nodes: Node[] = [
    {
      id: "source",
      code: "01",
      icon: Boxes,
      label: ar ? "المصدر" : "ORIGIN",
      title: ar ? "تبدأ من احتياجك" : "It begins with your brief",
      description: ar ? "نستقبل متطلبات المنتج والكميات وننسّق البحث عن مصدر مناسب." : "Share product requirements and quantities so sourcing can begin with a clear brief.",
      action: ar ? "استكشف المنتجات" : "Explore products",
      href: "/products",
    },
    {
      id: "coordinate",
      code: "02",
      icon: Handshake,
      label: ar ? "التنسيق" : "COORDINATION",
      title: ar ? "التفاصيل في مسار واحد" : "Every detail, connected",
      description: ar ? "نجمع خطوات التواصل والمتطلبات والمتابعة في تجربة تجارية أكثر وضوحًا." : "Commercial requirements, supplier coordination and follow-up belong in one connected process.",
      action: ar ? "تعرّف على الشركة" : "Discover LOUREX",
      href: "/about",
    },
    {
      id: "deliver",
      code: "03",
      icon: Ship,
      label: ar ? "الوجهة" : "DESTINATION",
      title: ar ? "رؤية أفضل حتى التسليم" : "Visibility through delivery",
      description: ar ? "تابع مراحل الشحنة المتاحة عبر خدمة التتبع الفعلية في الموقع." : "Follow available shipment milestones through the site's real tracking service.",
      action: ar ? "تتبّع شحنة" : "Track a shipment",
      href: "/track",
    },
  ];

  const active = nodes.find((node) => node.id === selected)!;
  const ActiveIcon = active.icon;

  return (
    <section
      id="network"
      aria-labelledby="network-heading"
      className="relative overflow-hidden bg-[#EDF5F2] py-20 dark:bg-[#0E1818] sm:py-28 lg:py-32"
    >
      <div className="mx-auto max-w-[1500px] px-5 sm:px-8 lg:px-10 xl:px-14">
        <div className="mb-10 grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-16">
          <div>
            <div className="flex items-center gap-3 text-[11px] font-extrabold uppercase tracking-[0.15em] text-primary rtl:tracking-normal">
              <span className="h-px w-9 bg-primary/50" aria-hidden="true" />
              {ar ? "تجربة لوريكس" : "THE LOUREX CONNECTION"}
            </div>
            <h2 id="network-heading" className="mt-6 max-w-[18ch] text-[clamp(2.3rem,4.6vw,4.6rem)] font-extrabold leading-[1.14] tracking-[-0.04em] text-heading rtl:tracking-normal">
              {ar ? <>من نقطة البداية إلى <span className="text-primary">خطوة أبعد.</span></> : <>Where trade finds its <span className="text-primary">next connection.</span></>}
            </h2>
          </div>
          <p className="max-w-md text-[15px] leading-8 text-muted-foreground lg:ms-auto">
            {ar
              ? "كل عملية تجارية هي سلسلة من القرارات والتفاصيل. نحن نساعدك على وصل هذه الخطوات بصورة واضحة."
              : "Behind every trade is a sequence of decisions. We connect the details from the first brief to delivery follow-up."}
          </p>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-[#204B47] bg-[#071D1C] text-[#F5FFFC] shadow-[0_38px_95px_-55px_rgba(7,45,42,0.85)] dark:border-[#2D5750]">
          <div className="grid min-w-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
            <div className="relative isolate min-h-[340px] overflow-hidden border-b border-white/10 sm:min-h-[450px] lg:min-h-[530px] lg:border-b-0 lg:border-e">
              <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden="true">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_52%_43%,rgba(54,211,192,0.18),transparent_51%)]" />
                <div className="absolute -start-[35%] -top-[80%] h-[150%] w-[150%] rounded-full border border-[#61C7B9]/10" />
                <div className="absolute -start-[12%] -top-[59%] h-[112%] w-[112%] rounded-full border border-[#61C7B9]/10" />
              </div>

              <div className="absolute start-6 top-6 z-10 flex items-center gap-2.5 sm:start-9 sm:top-9">
                <span className="h-2 w-2 rounded-full bg-[#6CE5D3]" aria-hidden="true" />
                <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#B6E6DE] rtl:tracking-normal">
                  LOUREX / TRADE NETWORK
                </span>
              </div>
              <div className="pointer-events-none absolute inset-x-0 top-[8%] flex h-[85%] items-center justify-center" aria-hidden="true">
                <svg viewBox="0 0 760 450" className="h-full w-full max-w-[760px]" fill="none">
                  <defs>
                    <radialGradient id="lourex-network-globe" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#24796F" stopOpacity="0.38" />
                      <stop offset="100%" stopColor="#071D1C" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  <ellipse cx="375" cy="227" rx="252" ry="183" fill="url(#lourex-network-globe)" />
                  <ellipse cx="375" cy="227" rx="225" ry="162" stroke="#7AD8C9" strokeOpacity="0.14" strokeWidth="1.2" />
                  <ellipse cx="375" cy="227" rx="160" ry="162" stroke="#7AD8C9" strokeOpacity="0.12" strokeWidth="1.2" />
                  <ellipse cx="375" cy="227" rx="73" ry="162" stroke="#7AD8C9" strokeOpacity="0.12" strokeWidth="1.2" />
                  <path d="M150 227H600 M169 166Q375 213 581 166 M169 288Q375 241 581 288" stroke="#7AD8C9" strokeOpacity="0.13" strokeWidth="1.2" />
                  <path d="M105 332C184 316 230 122 374 211S548 314 651 102" stroke="#6CE5D3" strokeOpacity="0.3" strokeWidth="1.6" strokeDasharray="4 8" strokeLinecap="round" />
                  <motion.path
                    d="M105 332C184 316 230 122 374 211S548 314 651 102"
                    stroke="#6CE5D3"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={reduceMotion ? false : { pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: reduceMotion ? 0 : 2, ease: "easeInOut" }}
                  />
                  <motion.circle
                    cx="374" cy="211" r="17" stroke="#77E6D6" strokeOpacity="0.4" strokeWidth="1"
                    animate={reduceMotion ? undefined : { r: [17, 25, 17], opacity: [0.9, 0.38, 0.9] }}
                    transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
                  />
                  {[{ x: 105, y: 332 }, { x: 374, y: 211 }, { x: 651, y: 102 }].map((node, index) => (
                    <g key={index}>
                      <circle cx={node.x} cy={node.y} r="11" fill="#061D1B" stroke={selected === nodes[index].id ? "#F0C15D" : "#80EADA"} strokeWidth="2" />
                      <circle cx={node.x} cy={node.y} r="4.2" fill={selected === nodes[index].id ? "#F0C15D" : "#80EADA"} />
                    </g>
                  ))}
                </svg>
              </div>
              <div className="absolute inset-x-5 bottom-6 z-10 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-5 sm:inset-x-9">
                <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#A3CFC8]">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {ar ? "تصور لمسار العمل" : "ILLUSTRATIVE TRADE FLOW"}
                </span>
                <span className="text-[10px] font-bold tabular-nums tracking-[0.12em] text-[#8DD8CC]">01 — 03</span>
              </div>
            </div>

            <div className="relative flex min-w-0 flex-col justify-between p-6 sm:p-9 lg:p-11">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#94DACA] rtl:tracking-normal">
                    {ar ? "اختر مرحلة" : "EXPLORE THE CONNECTION"}
                  </span>
                  <Route className="h-5 w-5 text-[#82E2D5]" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <div role="group" aria-label={ar ? "مراحل التنسيق التجاري" : "Trade coordination stages"} className="mt-7 flex gap-2">
                  {nodes.map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      aria-pressed={selected === node.id}
                      onClick={() => setSelected(node.id)}
                      className={"flex min-h-11 min-w-0 flex-1 flex-col justify-between gap-2 rounded-xl border px-3 py-3 text-start transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8EEADB] " + (
                        selected === node.id
                          ? "border-[#74E4D3] bg-[#205047] text-white shadow-[0_10px_30px_-18px_rgba(116,228,211,0.5)]"
                          : "border-white/15 bg-white/[0.04] text-[#A2CAC4] hover:border-[#74E4D3]/50 hover:bg-white/10"
                      )}
                    >
                      <span className="text-[11px] font-bold tabular-nums">{node.code}</span>
                      <span className="text-[11px] font-bold leading-4 sm:text-xs">{node.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-[255px] pt-8 sm:pt-10" aria-live="polite">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={selected}
                    initial={reduceMotion ? false : { opacity: 0, y: 13 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
                    transition={{ duration: reduceMotion ? 0 : 0.28 }}
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#74E4D3]/25 bg-[#74E4D3]/10 text-[#8BECDC]">
                      <ActiveIcon className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
                    </span>
                    <h3 className="mt-5 text-[clamp(1.55rem,2.7vw,2.35rem)] font-extrabold leading-tight text-white">{active.title}</h3>
                    <p className="mt-4 max-w-[27rem] text-sm leading-8 text-[#B8D2CD]">{active.description}</p>
                    <Link to={active.href} className="group mt-6 inline-flex min-h-11 items-center gap-2.5 border-b border-[#74E4D3]/50 text-sm font-bold text-[#8BECDC] hover:border-[#8BECDC]">
                      {active.action}
                      <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 rtl:-scale-x-100" aria-hidden="true" />
                    </Link>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
