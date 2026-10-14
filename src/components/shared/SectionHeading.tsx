interface SectionHeadingProps {
  as?: "h1" | "h2";
  eyebrow?: string;
  title: string;
  description?: string;
}

export const SectionHeading = ({ eyebrow, title, description, as: Heading = "h2" }: SectionHeadingProps) => (
  <div className="max-w-3xl space-y-4 rtl:text-right">
    {eyebrow ? (
      <p className="whitespace-normal break-words text-xs font-bold uppercase tracking-[0.12em] text-primary rtl:tracking-normal">
        {eyebrow}
      </p>
    ) : null}
    <Heading className="text-[clamp(2.1rem,4vw,3.4rem)] font-extrabold leading-tight tracking-tight text-heading">{title}</Heading>
    {description ? <p className="max-w-[45rem] text-[15px] leading-8 text-muted-foreground sm:text-base">{description}</p> : null}
  </div>
);
