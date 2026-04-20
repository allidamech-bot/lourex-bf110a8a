import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import LogisticsProcess from "@/components/LogisticsProcess";
import CoreFeatures from "@/components/CoreFeatures";
import WhyTurkeySection from "@/components/WhyTurkeySection";
import TrustSection from "@/components/TrustSection";
import WhyLourexSafe from "@/components/WhyLourexSafe";
import SuppliersPreview from "@/components/SuppliersPreview";
import Testimonials from "@/components/Testimonials";
import FAQSection from "@/components/FAQSection";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <LogisticsProcess />
      <CoreFeatures />
      <WhyTurkeySection />
      <TrustSection />
      <WhyLourexSafe />
      <SuppliersPreview />
      <Testimonials />
      <FAQSection />
      <FinalCTA />
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Index;
