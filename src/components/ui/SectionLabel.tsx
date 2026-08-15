interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionLabel({ children, className }: SectionLabelProps) {
  const classes = [
    "text-sm font-semibold uppercase tracking-wider text-zinc-400",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <h2 className={classes}>{children}</h2>;
}
