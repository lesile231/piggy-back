type BadgeVariant = "success" | "info" | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: "bg-green-100 text-green-800",
  info: "bg-blue-100 text-blue-800",
  neutral: "bg-zinc-100 text-zinc-600",
};

export function Badge({ variant = "neutral", children, className }: BadgeProps) {
  const classes = [
    "inline-block rounded px-2 py-0.5 text-xs font-medium",
    variantClasses[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <span className={classes}>{children}</span>;
}
