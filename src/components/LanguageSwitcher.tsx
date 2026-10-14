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
          aria-pressed={lang === l.code}
          aria-label={l.code === "ar" ? "العربية" : "English"}
          className={`min-h-9 min-w-9 rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
            lang === l.code
              ? "bg-gold text-[#15120d]"
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
