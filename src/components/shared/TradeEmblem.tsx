/** An illustrative sourcing connection, never a supplier map or operational data. */
export function TradeEmblem({ lang, compact = false }: { lang: string; compact?: boolean }) {
  const ar = lang === "ar";
  return (
    <figure className={`lrx-trade-emblem ${compact ? "lrx-trade-emblem-compact" : ""}`} aria-label={ar ? "هوية LOUREX: حلقة الوصل بين الطلب ومصادر التوريد" : "LOUREX: connecting your brief with sourcing"}>
      <svg viewBox="0 0 600 440" fill="none" aria-hidden="true">
        <path d="M300 28 540 162v126L300 418 60 288V162Z" stroke="currentColor" opacity=".2" />
        <path d="m60 162 240 126 240-126M300 28v390M60 288l240-126 240 126" stroke="currentColor" opacity=".12" />
        <path className="lrx-emblem-route" d="M30 220h110l160-92 160 92h110M140 220l160 92 160-92" stroke="currentColor" strokeWidth="1.5" />
        <path d="m300 65 140 80v160l-140 80-140-80V145Z" stroke="currentColor" opacity=".4" />
        <circle cx="30" cy="220" r="5" fill="#b84630" /><circle cx="570" cy="220" r="5" fill="#477193" />
      </svg>
      <img src="/lourex-official.jpeg" alt="" width="260" height="250" loading={compact ? "eager" : "lazy"} />
      <figcaption><span>{ar ? "طلبك" : "YOUR BRIEF"}</span><span>{ar ? "مصادر التوريد" : "SOURCING"}</span></figcaption>
      <p>THE LIVING TRADE</p>
    </figure>
  );
}
