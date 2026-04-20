import { Map, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import BentoCard from "@/components/BentoCard";
import { MapboxTokenSetting } from "@/components/admin/MapboxTokenSetting";
import { useI18n } from "@/lib/i18n";

interface SiteSetting {
  id: string;
  key: string;
  value: string;
}

interface Props {
  settings: SiteSetting[];
  onSettingUpdate: (id: string, value: string) => Promise<void>;
  defaultSubTab?: "logistics" | "security" | "general";
}

export const AdminSettings = ({ settings, onSettingUpdate, defaultSubTab = "security" }: Props) => {
  const { t } = useI18n();

  return (
    <div className="max-w-2xl">
      <Tabs defaultValue={defaultSubTab} className="w-full">
        <TabsList className="bg-secondary/50 border border-border mb-6">
          <TabsTrigger value="logistics" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Map className="w-4 h-4" />
            Logistics
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ShieldCheck className="w-4 h-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <SlidersHorizontal className="w-4 h-4" />
            General
          </TabsTrigger>
        </TabsList>

        {/* Logistics Tab */}
        <TabsContent value="logistics" className="space-y-6">
          <BentoCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Map className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold">Mapbox Token</h3>
                <p className="text-xs text-muted-foreground">{t("map.adminHint")}</p>
              </div>
            </div>
            <MapboxTokenSetting />
          </BentoCard>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <BentoCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold">Authentication Security</h3>
                <p className="text-xs text-muted-foreground">Mandatory OTP verification is enforced for all users on login</p>
              </div>
            </div>
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
              <p className="text-sm text-emerald-400 font-medium">✓ Email OTP 2FA is active</p>
              <p className="text-xs text-muted-foreground mt-1">All users must verify a one-time code sent to their email after password login.</p>
            </div>
          </BentoCard>
        </TabsContent>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <BentoCard>
            <h3 className="font-serif text-lg font-semibold mb-4">{t("admin.homepageStats")}</h3>
            <div className="space-y-4">
              {settings.map((setting) => (
                <div key={setting.id} className="flex items-center gap-4">
                  <label className="text-sm text-muted-foreground w-32 capitalize">
                    {setting.key.replace("stat_", "").replace("mapbox_", "Mapbox ")}
                  </label>
                  <Input
                    defaultValue={setting.value}
                    className="bg-secondary border-border flex-1"
                    onBlur={(e) => {
                      if (e.target.value !== setting.value) onSettingUpdate(setting.id, e.target.value);
                    }}
                  />
                </div>
              ))}
              {settings.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No settings configured yet.</p>
              )}
            </div>
          </BentoCard>
        </TabsContent>
      </Tabs>
    </div>
  );
};
