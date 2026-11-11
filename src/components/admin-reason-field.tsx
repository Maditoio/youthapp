"use client";

/** Reason input that blocks Enter so the form only submits via an explicit status button. */
export function AdminReasonField({
  placeholder,
  className,
}: {
  placeholder: string;
  className?: string;
}) {
  return (
    <input
      name="reason"
      required
      placeholder={placeholder}
      className={className}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.preventDefault();
      }}
    />
  );
}
