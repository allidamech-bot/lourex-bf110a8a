import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, MapPin, CheckCircle, ExternalLink } from "lucide-react";

export const MapboxTokenSetting = () => {
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchToken = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "mapbox_token")
        .maybeSingle();
      if (data?.value) {
        setToken(data.value);
        setSaved(true);
      }
    };
    fetchToken();
  }, []);

  const handleSave = async () => {
    if (!token.trim()) {
      toast.error("Please enter a valid Mapbox token");
      return;
    }
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("site_settings")
        .select("id")
        .eq("key", "mapbox_token")
        .maybeSingle();

      if (existing) {
        await supabase.from("site_settings").update({ value: token.trim() }).eq("key", "mapbox_token");
      } else {
        await supabase.from("site_settings").insert({ key: "mapbox_token", value: token.trim() });
      }
      toast.success("Mapbox token saved successfully!");
      setSaved(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <MapPin className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-foreground">Mapbox Access Token</h4>
          <p className="text-xs text-muted-foreground">
            Required for the Live Logistics Radar map
          </p>
        </div>
        {saved && token && (
          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        )}
      </div>

      <div className="flex gap-2">
        <Input
          value={token}
          onChange={(e) => { setToken(e.target.value); setSaved(false); }}
          placeholder="pk.eyJ1Ijoi..."
          className="bg-secondary border-border flex-1 font-mono text-xs h-10"
          type="password"
        />
        <Button
          variant="gold"
          size="sm"
          onClick={handleSave}
          disabled={saving || !token.trim()}
          className="h-10 px-4 gap-1.5"
        >
          <Save className="w-4 h-4" />
          {saving ? "..." : "Save"}
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Get your token from{" "}
        <a
          href="https://account.mapbox.com/access-tokens/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-0.5"
        >
          mapbox.com <ExternalLink className="w-2.5 h-2.5" />
        </a>
        {" "}— use a public token starting with <code className="text-[10px] bg-secondary px-1 py-0.5 rounded">pk.</code>
      </p>
    </div>
  );
};
