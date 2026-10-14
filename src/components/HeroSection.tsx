import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";

export default function HeroSection() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const reduced = useReducedMotion();
  return <section id="lourex-hero" className="living-hero" aria-labelledby="lourex-hero-title">
    <div className="living-hero-grid">
      <motion.div className="living-copy" initial={reduced ? false : {opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{duration:reduced?0:.8}}>
        <p className="lrx-kicker">INTERNATIONAL TRADING & RESOURCES</p>
        <h1 id="lourex-hero-title">{ar ? <>نُحرّك الفرص.<br/><em>نصلُك بالمصدر.</em></> : <>Opportunity,<br/><em>in motion.</em></>}</h1>
        <div className="living-identity" dir="ltr">LOUREX <span>— THE LIVING TRADE</span></div>
        <p className="living-description">{ar ? "من احتياجك إلى مصادر التوريد. نربط المنتجات والأطراف والتفاصيل في رحلة تجارية واحدة واضحة." : "From your business needs to sourcing possibilities. Products, people and commercial details, connected in one clear journey."}</p>
        <div className="living-actions"><Link className="living-primary" to="/request">{ar?"ابدأ طلب شراء":"Start your sourcing request"}<ArrowUpRight aria-hidden="true" className="rtl:-scale-x-100" size={18}/></Link><Link className="living-secondary" to="/products">{ar?"استكشف المنتجات":"Explore products"}<ArrowUpRight aria-hidden="true" className="rtl:-scale-x-100" size={18}/></Link></div>
      </motion.div>
      <motion.div className="living-scene" initial={reduced?false:{opacity:0,scale:.94}} animate={{opacity:1,scale:1}} transition={{duration:reduced?0:1.1}}>
        <svg className="living-paths" viewBox="0 0 600 600" aria-hidden="true"><defs><linearGradient id="living-flow"><stop stopColor="#9a3025"/><stop offset=".5" stopColor="#dba34b"/><stop offset="1" stopColor="#355878"/></linearGradient></defs><g fill="none" stroke="url(#living-flow)"><path d="M20 160L300 40L580 160L580 440L300 570L20 440Z" opacity=".3"/><motion.path d="M0 420L145 350L300 300L460 230L600 170" strokeWidth="2" initial={reduced?false:{pathLength:0}} animate={{pathLength:1}} transition={{duration:reduced?0:2}}/><path d="M0 170L140 240L300 300L465 365L600 430" opacity=".5"/><path d="M300 0V600" opacity=".15"/></g></svg>
        <img src="/brand/lourex-official.jpeg" alt={ar?"شعار LOUREX الرسمي بالأحمر والأزرق والذهبي":"Official LOUREX red, blue and gold geometric logo"} width="1290" height="1240" fetchPriority="high" decoding="async" className="living-logo"/>
        <div className="living-node living-node-buyer"><span>01 / {ar?"الاحتياج":"THE BRIEF"}</span><strong>{ar?"عميل. فكرة. منتج.":"Buyer. Idea. Product."}</strong></div>
        <div className="living-node living-node-source"><span>02 / {ar?"المصدر":"THE SOURCE"}</span><strong>{ar?"الفرصة تبدأ بالاتصال.":"Opportunity connects."}</strong></div>
        <p className="living-scene-caption">{ar?"الاحتياج ← الاتصال ← الفرصة":"NEEDS → CONNECTION → OPPORTUNITY"}</p>
      </motion.div>
    </div>
    <div className="living-hero-bottom"><span>{ar?"تجارة تتحرك مع طموحك":"TRADE THAT MOVES WITH YOUR AMBITION"}</span><a href="#explore">{ar?"رحلة LOUREX":"THE LOUREX JOURNEY"}<ArrowDown size={15} aria-hidden="true"/></a></div>
  </section>;
}
