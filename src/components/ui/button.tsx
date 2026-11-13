import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Spinner, type SpinnerTone } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition-[transform,background-color,box-shadow,opacity,color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-px active:scale-[0.975] disabled:pointer-events-none disabled:not-aria-busy:opacity-50 aria-busy:cursor-progress",
  {
    variants: {
      variant: {
        primary: "bg-violet text-white shadow-[0_10px_22px_rgba(29,22,51,0.16)] hover:bg-violet-deep",
        secondary: "border border-border bg-surface text-ink hover:bg-surface-muted",
        copper: "bg-pink text-white hover:opacity-90",
        ink: "bg-ink text-white hover:opacity-90",
        ghost: "text-ink hover:bg-surface-muted",
        link: "text-violet-ink hover:translate-y-0 hover:text-violet hover:underline",
        danger: "text-danger hover:translate-y-0 hover:underline",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-11 px-5",
        lg: "h-12 px-6 text-base",
        inline: "h-auto p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;

const onBrandVariants: ReadonlySet<ButtonVariant> = new Set(["primary", "copper", "ink"]);

export function spinnerToneFor(variant: ButtonVariant | null | undefined): SpinnerTone {
  return onBrandVariants.has(variant ?? "primary") ? "onBrand" : "brand";
}

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    /** Shows a spinner, sets `aria-busy` and disables the button while an action runs. */
    loading?: boolean;
    /** Screen-reader text announced alongside the visible label while loading. */
    loadingLabel?: string;
  };

export function Button({
  className,
  variant,
  size,
  type = "button",
  loading = false,
  loadingLabel,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner tone={spinnerToneFor(variant)} /> : null}
      {children}
      {loading && loadingLabel ? <span className="sr-only">{loadingLabel}</span> : null}
    </button>
  );
}

export { buttonVariants };
