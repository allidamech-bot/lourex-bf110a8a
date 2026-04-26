import { type Lang, useI18n } from "@/lib/i18n";

const langs: { code: Lang; label: string }[] = [
  { code: "ar", label: "AR" },
  { code: "en", label: "EN" },
];

const LanguageSwitcher = () => {
  const { lang, setLang } = useI18n();

  return (
    <div className="flex shrink-0 items-center gap-1 rounded-full border border-border/80 bg-secondary p-0.5">
      {langs.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
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
