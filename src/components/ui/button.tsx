import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition-[transform,background-color,box-shadow,opacity,color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-px active:scale-[0.975] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-violet text-white shadow-[0_10px_24px_rgba(109,77,255,0.35)] hover:bg-violet-deep",
        secondary: "border border-border bg-surface text-ink hover:bg-lilac",
        copper: "bg-pink text-white hover:opacity-90",
        ghost: "text-ink hover:bg-lilac",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-11 px-5",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
