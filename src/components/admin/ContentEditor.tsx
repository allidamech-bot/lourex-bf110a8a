import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileEdit, Save } from "lucide-react";

const EDITABLE_PAGES = [
  { key: "page_about", label: "About LOUREX" },
  { key: "page_why", label: "Why LOUREX" },
  { key: "page_privacy", label: "Privacy Policy" },
  { key: "page_terms", label: "Terms of Service" },
];

export const ContentEditor = () => {
  const { t } = useI18n();
  const [contents, setContents] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [activeKey, setActiveKey] = useState(EDITABLE_PAGES[0].key);

  useEffect(() => {
    const fetchContent = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", EDITABLE_PAGES.map((p) => p.key));

      const map: Record<string, string> = {};
      data?.forEach((d) => { map[d.key] = d.value; });
      setContents(map);
    };
    fetchContent();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const page of EDITABLE_PAGES) {
        const value = contents[page.key] || "";
        const { data: existing } = await supabase
          .from("site_settings")
          .select("id")
          .eq("key", page.key)
          .maybeSingle();

        if (existing) {
          await supabase.from("site_settings").update({ value }).eq("key", page.key);
        } else {
          await supabase.from("site_settings").insert({ key: page.key, value });
        }
      }
      toast.success(t("admin.contentSaved"));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <FileEdit className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{t("admin.contentEditor")}</h3>
          <p className="text-xs text-muted-foreground">{t("admin.contentEditorDesc")}</p>
        </div>
      </div>

      {/* Page tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2">
        {EDITABLE_PAGES.map((page) => (
          <button
            key={page.key}
            onClick={() => setActiveKey(page.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeKey === page.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {page.label}
          </button>
        ))}
      </div>

      <textarea
        value={contents[activeKey] || ""}
        onChange={(e) => setContents({ ...contents, [activeKey]: e.target.value })}
        className="w-full h-80 rounded-xl border border-border bg-secondary/30 p-4 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
        placeholder={`Enter content for ${EDITABLE_PAGES.find((p) => p.key === activeKey)?.label}...`}
      />

      <Button variant="gold" onClick={handleSave} disabled={saving}>
        <Save className="w-4 h-4 me-2" />
        {saving ? "Saving..." : t("fiscal.saveAll")}
      </Button>
    </div>
  );
};
