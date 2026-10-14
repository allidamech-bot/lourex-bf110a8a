/** Original LOUREX geometry: commercial briefs travel through three mineral planes. */
export default function TradeField() {
  const routes = [
    { d: "M-90 190H185L450 450 715 710H990", tone: "red" },
    { d: "M990 190H715L450 450 185 710H-90", tone: "blue" },
    { d: "M450-80V135L185 710 450 865 715 710 450 135", tone: "gold" },
    { d: "M-70 425H140L450 245 760 425H970", tone: "gold" },
    { d: "M-70 835 225 835 675 65 970 65", tone: "blue" },
  ];
  return (
    <div className="lrx-trade-field" aria-hidden="true">
      <div className="lrx-field-halo lrx-field-halo--red" />
      <div className="lrx-field-halo lrx-field-halo--blue" />
      <div className="lrx-field-grain" />
      <svg viewBox="0 0 900 900" preserveAspectRatio="xMidYMid slice" focusable="false">
        <defs>
          <linearGradient id="lrx-plane-red" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#a93024" stopOpacity=".6"/><stop offset="1" stopColor="#a93024" stopOpacity="0"/></linearGradient>
          <linearGradient id="lrx-plane-blue" x1="1" y1="0" x2="0" y2="1"><stop stopColor="#345777" stopOpacity=".7"/><stop offset="1" stopColor="#345777" stopOpacity="0"/></linearGradient>
          <linearGradient id="lrx-plane-gold" x1="0" y1="1" x2="1" y2="0"><stop stopColor="#d6ad6c" stopOpacity=".5"/><stop offset="1" stopColor="#d6ad6c" stopOpacity="0"/></linearGradient>
        </defs>
        <g className="lrx-field-planes">
          <path d="M450 90 450 450 140 630 140 270Z" fill="url(#lrx-plane-red)"/>
          <path d="M450 90 760 270 760 630 450 450Z" fill="url(#lrx-plane-blue)"/>
          <path d="M140 630 450 450 760 630 450 810Z" fill="url(#lrx-plane-gold)"/>
          <path d="M450 90 760 270V630L450 810 140 630V270Z M140 270 450 450 760 270 M450 450V810 M140 630 450 450 760 630 M295 180 295 360 140 450 M605 180 605 360 760 450 M295 720 450 630 605 720" fill="none" stroke="#d6ad6c" strokeOpacity=".21"/>
        </g>
        {routes.map((route, index) => <g key={route.d} className={`lrx-field-route lrx-field-route--${route.tone}`}>
          <path d={route.d} className="lrx-field-wire"/>
          <path d={route.d} pathLength="1" className="lrx-field-packet" style={{animationDelay:`${-index * 2.3}s`,animationDuration:`${10+index*2}s`}}/>
        </g>)}
        <g className="lrx-field-nodes" fill="#d6ad6c">
          {[[185,190],[715,190],[185,710],[715,710],[450,135],[450,450],[450,810]].map(([x,y],i)=><g key={`${x}-${y}`}>
            <path d={`M${x} ${y-5}l5 5-5 5-5-5Z`}/>
            <circle className="lrx-field-node-ring" cx={x} cy={y} r="15" style={{animationDelay:`${-i*.8}s`}}/>
          </g>)}
        </g>
      </svg>
    </div>
  );
}
