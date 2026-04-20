import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { MapPin, AlertTriangle } from "lucide-react";

// Predefined route coordinates for shipment stages
const STAGE_COORDINATES: Record<string, { lat: number; lng: number; label: string }> = {
  factory: { lat: 41.0082, lng: 28.9784, label: "Istanbul, Turkey" },
  warehouse: { lat: 40.9769, lng: 29.1007, label: "Tuzla Warehouse" },
  shipping: { lat: 30.0444, lng: 32.5, label: "Suez Canal" },
  customs: { lat: 21.4858, lng: 39.1925, label: "Jeddah Port" },
  delivered: { lat: 24.7136, lng: 46.6753, label: "Riyadh, KSA" },
};

interface ShipmentMarker {
  id: string;
  tracking_id: string;
  status: string;
  client_name: string;
  destination: string;
  lat: number;
  lng: number;
}

export const TrackingMap = () => {
  const { t } = useI18n();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [shipments, setShipments] = useState<ShipmentMarker[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      // Get Mapbox token from site_settings
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "mapbox_token")
        .maybeSingle();

      if (data?.value) {
        setMapboxToken(data.value);
      } else {
        setError(t("map.noToken"));
      }

      // Get shipments
      const { data: shipmentData } = await supabase
        .from("shipments")
        .select("id, tracking_id, status, client_name, destination")
        .neq("status", "delivered");

      if (shipmentData) {
        const markers = shipmentData.map((s) => {
          const coords = STAGE_COORDINATES[s.status] || STAGE_COORDINATES.factory;
          return { ...s, lat: coords.lat, lng: coords.lng };
        });
        setShipments(markers);
      }
      setLoading(false);
    };
    init();
  }, [t]);

  useEffect(() => {
    if (!mapboxToken || !mapContainer.current || mapRef.current) return;

    const initMap = async () => {
      const mapboxgl = await import("mapbox-gl");
      await import("mapbox-gl/dist/mapbox-gl.css");

      (mapboxgl as any).accessToken = mapboxToken;

      const map = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [35, 30],
        zoom: 3,
        attributionControl: false,
      });

      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      map.on("load", () => {
        // Add shipment markers
        shipments.forEach((s) => {
          const statusColors: Record<string, string> = {
            factory: "#3B82F6",
            warehouse: "#EAB308",
            shipping: "#A855F7",
            customs: "#F97316",
          };

          const el = document.createElement("div");
          el.className = "shipment-marker";
          el.style.cssText = `
            width: 32px; height: 32px; border-radius: 50%;
            background: ${statusColors[s.status] || "#C5A059"};
            border: 3px solid rgba(255,255,255,0.9);
            cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex; align-items: center; justify-content: center;
            font-size: 12px; color: white; font-weight: bold;
          `;
          el.innerHTML = "📦";

          const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="padding: 8px; font-family: system-ui;">
              <strong style="color: #C5A059;">${s.tracking_id}</strong><br/>
              <span style="font-size: 12px; color: #666;">${s.client_name}</span><br/>
              <span style="font-size: 11px; color: #999;">→ ${s.destination}</span><br/>
              <span style="font-size: 11px; background: ${statusColors[s.status] || "#C5A059"}; color: white; padding: 2px 8px; border-radius: 12px; display: inline-block; margin-top: 4px;">${s.status}</span>
            </div>
          `);

          new mapboxgl.Marker(el)
            .setLngLat([s.lng, s.lat])
            .setPopup(popup)
            .addTo(map);
        });

        // Draw shipping route line
        const routeCoords = Object.values(STAGE_COORDINATES).map((c) => [c.lng, c.lat]);
        map.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: routeCoords },
          },
        });

        map.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#C5A059",
            "line-width": 2,
            "line-dasharray": [2, 4],
            "line-opacity": 0.6,
          },
        });
      });

      mapRef.current = map;
    };

    initMap();

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [mapboxToken, shipments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !mapboxToken) {
    // Render a sleek dark fallback radar
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{t("map.title")}</h3>
            <p className="text-xs text-muted-foreground">{t("map.noToken")}</p>
          </div>
        </div>
        <div className="relative w-full h-[400px] md:h-[500px] rounded-xl overflow-hidden border border-border bg-[hsl(0_0%_6%)]">
          {/* Decorative dark map placeholder */}
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: `radial-gradient(circle at 40% 45%, hsl(40 52% 48% / 0.15) 0%, transparent 60%),
              radial-gradient(circle at 70% 60%, hsl(40 52% 48% / 0.08) 0%, transparent 50%)`,
          }} />
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: `linear-gradient(hsl(0 0% 50%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 50%) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }} />
          {/* Route markers */}
          {Object.entries(STAGE_COORDINATES).map(([key, val], i) => {
            const colors: Record<string, string> = {
              factory: "hsl(217 91% 60%)", warehouse: "hsl(48 96% 53%)",
              shipping: "hsl(271 91% 65%)", customs: "hsl(25 95% 53%)",
              delivered: "hsl(40 52% 48%)",
            };
            // Position markers roughly across the container
            const positions = [
              { left: '15%', top: '25%' },
              { left: '22%', top: '32%' },
              { left: '45%', top: '55%' },
              { left: '60%', top: '58%' },
              { left: '72%', top: '52%' },
            ];
            return (
              <div key={key} className="absolute flex flex-col items-center gap-1" style={positions[i]}>
                <div
                  className="w-3 h-3 rounded-full animate-pulse shadow-lg"
                  style={{ backgroundColor: colors[key], boxShadow: `0 0 12px ${colors[key]}` }}
                />
                <span className="text-[9px] text-muted-foreground/60 whitespace-nowrap">{val.label}</span>
              </div>
            );
          })}
          {/* Dashed route line (SVG) */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M 15 25 Q 30 40 45 55 Q 55 58 60 58 Q 68 55 72 52" fill="none"
              stroke="hsl(40 52% 48%)" strokeWidth="0.3" strokeDasharray="1.5 1" opacity="0.5" />
          </svg>
          {/* Center message */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="glass-card rounded-xl px-6 py-4 text-center max-w-xs">
              <AlertTriangle className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground mb-1">Logistics Radar</p>
              <p className="text-xs text-muted-foreground">
                Add your Mapbox token in Admin Settings → Logistics to activate live tracking.
              </p>
            </div>
          </div>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs">
          {Object.entries(STAGE_COORDINATES).filter(([k]) => k !== "delivered").map(([key, val]) => {
            const colors: Record<string, string> = {
              factory: "bg-blue-500", warehouse: "bg-yellow-500",
              shipping: "bg-purple-500", customs: "bg-orange-500",
            };
            return (
              <div key={key} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${colors[key]}`} />
                <span className="text-muted-foreground capitalize">{key} — {val.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <MapPin className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{t("map.title")}</h3>
          <p className="text-xs text-muted-foreground">
            {shipments.length} {t("map.activeShipments")}
          </p>
        </div>
      </div>

      <div
        ref={mapContainer}
        className="w-full h-[400px] md:h-[500px] rounded-xl overflow-hidden border border-border"
      />

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(STAGE_COORDINATES).filter(([k]) => k !== "delivered").map(([key, val]) => {
          const colors: Record<string, string> = {
            factory: "bg-blue-500", warehouse: "bg-yellow-500",
            shipping: "bg-purple-500", customs: "bg-orange-500",
          };
          return (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${colors[key]}`} />
              <span className="text-muted-foreground capitalize">{key} — {val.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
