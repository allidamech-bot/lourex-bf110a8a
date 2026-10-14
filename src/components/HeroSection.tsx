import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUpRight, Pause, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import TradeField from "@/components/home/TradeField";
import "./home/living-hero.css";

export default function HeroSection() {
  const { lang } = useI18n();
  const ar = lang === "ar", reduced = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const visible = useInView(heroRef, { margin: "80px" });
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    update(); document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  const still = paused || reduced || !visible || hidden;
  const enter = { initial: reduced ? false as const : { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: reduced ? 0 : .85 } };
  return (
    <section ref={heroRef} id="lourex-hero" className="lrx-living-hero" data-motion={still ? "paused" : "running"} data-reduced-motion={reduced ? "true" : "false"} aria-labelledby="lourex-hero-title">
      {!reduced && <TradeField />}
      <div className="lrx-living-scrim" aria-hidden="true" />
      <div className="lrx-living-mast" dir="ltr"><span>LOUREX / THE LIVING TRADE</span><span className="lrx-mineral-key"><i/><i/><i/></span></div>
      <div className="lrx-living-stage">
        <motion.div className="lrx-living-copy" {...enter}>
          <p className="lrx-living-eyebrow">INTERNATIONAL TRADING & RESOURCES</p>
          <h1 id="lourex-hero-title">{ar ? <>تجارتك،<br/><span>متصلة<br className="lrx-mobile-break"/> بالعالم.</span></> : <>Trade.<br/><span>Connected<br/>by possibility.</span></>}</h1>
          <p className="lrx-living-lead">{ar ? "كل التفاصيل، في اتصال واحد." : "Every detail. One connection."}</p>
          <p className="lrx-living-description">{ar ? "من المنتج الذي تحتاجه، إلى مصادره ومواصفاته وتفاصيله التجارية. هنا تبدأ رحلة توريدك مع LOUREX." : "From the product you need to its sources, specifications and commercial details. Your sourcing journey starts with LOUREX."}</p>
          <div className="lrx-living-actions">
            <Link to="/request" className="lrx-primary">{ar ? "ابدأ طلب توريد" : "Start a sourcing request"}<ArrowUpRight size={18} aria-hidden="true" className="rtl:-scale-x-100"/></Link>
            <Link to="/products" className="lrx-text-link">{ar ? "اكتشف المنتجات" : "Explore products"}<ArrowUpRight size={17} aria-hidden="true" className="rtl:-scale-x-100"/></Link>
          </div>
        </motion.div>
        <motion.div className="lrx-living-visual" initial={reduced?false:{opacity:0,scale:.88,rotate:-6}} animate={{opacity:1,scale:1,rotate:0}} transition={{duration:reduced?0:1.3,ease:[.22,1,.36,1]}}>
          <span className="lrx-visual-coordinate" dir="ltr">THE ART OF CONNECTION</span>
          <div className="lrx-emblem-mount"><img src="/lourex-official.jpeg" alt={ar ? "شعار LOUREX الرسمي الأحمر والأزرق والذهبي" : "Official LOUREX red, blue and gold geometric emblem"} width="1290" height="1240" fetchPriority="high"/></div>
          <div className="lrx-trade-message lrx-trade-message--brief"><b>01</b><span>{ar ? "احتياجك التجاري" : "YOUR BRIEF"}</span><i/></div>
          <div className="lrx-trade-message lrx-trade-message--source"><b>02</b><span>{ar ? "المصدر والمواصفات" : "SOURCE & SPECIFICATION"}</span><i/></div>
          <div className="lrx-visual-axis" aria-hidden="true"/>
        </motion.div>
      </div>
      <div className="lrx-living-foot">
        <a href="#explore"><ArrowDown size={15} aria-hidden="true"/>{ar ? "اكتشف رحلة تجارتك" : "Explore the trade journey"}</a>
        <span className="lrx-living-sequence">{ar ? "الاحتياج" : "THE BRIEF"}<i/>{ar ? "الاتصال" : "THE CONNECTION"}<i/>{ar ? "الفرصة" : "THE OPPORTUNITY"}</span>
        {!reduced && <button type="button" onClick={()=>setPaused(value=>!value)} aria-pressed={paused} className="lrx-motion-toggle">{paused?<Play size={13} aria-hidden="true"/>:<Pause size={13} aria-hidden="true"/>}{ar ? paused ? "تشغيل الحركة" : "إيقاف الحركة" : paused ? "Play motion" : "Pause motion"}</button>}
      </div>
    </section>
  );
}
