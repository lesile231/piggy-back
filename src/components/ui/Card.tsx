interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  const classes = [
    "overflow-hidden rounded-xl border border-[rgba(0,119,182,0.12)] bg-white transition-shadow hover:shadow-md",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
}
