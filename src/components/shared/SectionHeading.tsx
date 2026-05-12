interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
}

export const SectionHeading = ({ eyebrow, title, description }: SectionHeadingProps) => (
  <div className="max-w-3xl space-y-3 rtl:text-right">
    {eyebrow ? (
      <p className="whitespace-normal break-words text-xs font-semibold uppercase tracking-[0.24em] text-primary/80 rtl:tracking-normal">
        {eyebrow}
      </p>
    ) : null}
    <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground md:text-4xl">{title}</h2>
    {description ? <p className="text-base leading-7 text-muted-foreground">{description}</p> : null}
  </div>
);
