import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";

export default function HeroSection() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const reduced = useReducedMotion();
  return (
    <section id="lourex-hero" className="lrx-hero" aria-labelledby="lourex-hero-title">
      <div className="lrx-hero-grid" aria-hidden="true" />
      <div className="lrx-hero-copy">
        <motion.p initial={reduced ? false : {opacity:0,y:12}} animate={{opacity:1,y:0}} className="lrx-kicker">INTERNATIONAL TRADING & RESOURCES</motion.p>
        <motion.h1 id="lourex-hero-title" initial={reduced ? false : {opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{duration:reduced?0:.8}}>
          {ar ? <>تجارتك،<br/><span>متصلة بالعالم.</span></> : <>Trade.<br/><span>Connected.</span></>}
        </motion.h1>
        <p className="lrx-hero-manifesto" dir="ltr">LOUREX — THE LIVING TRADE.</p>
        <p className="lrx-hero-description">{ar ? "من احتياجك إلى مصادر التوريد. نربط المنتجات والأطراف والتفاصيل، لتأخذ تجارتك خطوتها التالية." : "From your brief to sourcing possibilities. We connect products, people and details to move your next opportunity forward."}</p>
        <div className="lrx-hero-actions">
          <Link to="/request" className="lrx-primary">{ar?"ابدأ طلب توريد":"Start your sourcing request"}<ArrowUpRight size={18} aria-hidden="true" className="rtl:-scale-x-100"/></Link>
          <Link to="/products" className="lrx-text-link">{ar?"اكتشف المنتجات":"Explore the catalog"}<ArrowUpRight size={17} aria-hidden="true" className="rtl:-scale-x-100"/></Link>
        </div>
      </div>
      <motion.div className="lrx-brand-scene" initial={reduced?false:{opacity:0,scale:.94}} animate={{opacity:1,scale:1}} transition={{duration:reduced?0:1.1}}>
        <div className="lrx-scene-coordinate" dir="ltr">THE ART OF CONNECTION / LOUREX</div>
        <svg viewBox="0 0 640 640" className="lrx-flow" aria-hidden="true">
          <path className="lrx-flow-red" d="M0 160 140 160 320 320 500 480 640 480"/>
          <path className="lrx-flow-blue" d="M640 160 500 160 320 320 140 480 0 480"/>
          <path className="lrx-flow-gold" d="M320 0V150L140 480 320 590 500 480 320 150"/>
          <path className="lrx-facet" d="M320 40 565 180V460L320 600 75 460V180Z M75 180 320 320 565 180 M320 320V600 M75 460 320 320 565 460"/>
        </svg>
        <img src="/lourex-official.jpeg" alt={ar?"شعار LOUREX الرسمي بأسطحه الهندسية الحمراء والزرقاء والذهبية":"Official LOUREX red, blue and gold geometric emblem"} width="1290" height="1240" fetchPriority="high" className="lrx-official-emblem"/>
        <div className="lrx-scene-label lrx-scene-label--buyer"><i/>{ar?"احتياجك التجاري":"YOUR BUSINESS BRIEF"}</div>
        <div className="lrx-scene-label lrx-scene-label--source"><i/>{ar?"مصادر التوريد":"SOURCING POSSIBILITIES"}</div>
        <div className="lrx-scene-caption">{ar?"الاحتياج. الاتصال. الفرصة.":"THE BRIEF. THE CONNECTION. THE OPPORTUNITY."}</div>
      </motion.div>
      <div className="lrx-hero-foot"><a href="#explore">{ar?"اكتشف رحلة تجارتك":"Explore the trade journey"}<ArrowDown size={16}/></a><span dir="ltr">RED / BLUE / GOLD — ONE CONNECTION.</span></div>
    </section>
  );
}
