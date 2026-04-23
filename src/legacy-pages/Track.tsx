import { useState } from "react";
import Navbar from "@/components/Navbar";
import ShipmentTracker from "@/components/ShipmentTracker";
import { TrackingMap } from "@/components/TrackingMap";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { useI18n } from "@/lib/i18n";
import { List, Map } from "lucide-react";

const Track = () => {
  const { t } = useI18n();
  const [view, setView] = useState<"tracker" | "map">("tracker");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-4">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <button
              onClick={() => setView("tracker")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                view === "tracker"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              }`}
            >
              <List className="w-4 h-4" />
              {t("track.button")}
            </button>
            <button
              onClick={() => setView("map")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                view === "map"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              }`}
            >
              <Map className="w-4 h-4" />
              {t("map.title")}
            </button>
          </div>
        </div>
      </div>

      {view === "tracker" ? (
        <ShipmentTracker />
      ) : (
        <div className="container mx-auto px-4 md:px-8 pb-8">
          <TrackingMap />
        </div>
      )}

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Track;
