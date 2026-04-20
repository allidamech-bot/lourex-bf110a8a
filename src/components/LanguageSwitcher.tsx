import { useI18n, Lang } from "@/lib/i18n";

const langs: { code: Lang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "ar", label: "AR" },
  { code: "tr", label: "TR" },
];

const LanguageSwitcher = () => {
  const { lang, setLang } = useI18n();

  return (
    <div className="flex items-center gap-1 rounded-full border border-border/50 bg-secondary/50 p-0.5">
      {langs.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
            lang === l.code
              ? "bg-gold text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
