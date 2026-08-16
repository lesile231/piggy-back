import { forwardRef } from "react";
import Link from "next/link";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  href?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[#0077B6] text-white hover:bg-[#005F92]",
  secondary:
    "border border-zinc-200 hover:bg-zinc-50",
  ghost: "text-[#0077B6] hover:underline",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1 text-xs",
  md: "px-4 py-2 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", asChild, href, className, children, ...props },
    ref,
  ) {
    const base = "inline-flex items-center justify-center rounded-lg font-medium transition-colors";
    const classes = [base, variantClasses[variant], sizeClasses[size], className]
      .filter(Boolean)
      .join(" ");

    if (asChild && href) {
      return (
        <Link href={href} className={classes}>
          {children}
        </Link>
      );
    }

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  },
);
