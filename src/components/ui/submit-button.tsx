"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

type FormStatus = ReturnType<typeof useFormStatus>;

/**
 * Several submit buttons can share one form (votes, update/remove pairs).
 * Every button is disabled while the form is pending; only the one that
 * submitted shows the spinner.
 */
function isSubmitter(status: FormStatus, props: Pick<ButtonProps, "formAction" | "name" | "value">): boolean {
  if (!status.pending) return false;
  if (typeof props.formAction === "function" && typeof status.action === "function") {
    return status.action === props.formAction;
  }
  if (props.name && props.value !== undefined && status.data) {
    return status.data.get(props.name) === String(props.value);
  }
  return true;
}

/** Form submit button: spinner + disabled while the parent `<form action>` runs. */
export function SubmitButton({ disabled, ...props }: Omit<ButtonProps, "type" | "loading">) {
  const status = useFormStatus();
  return (
    <Button
      type="submit"
      {...props}
      loading={isSubmitter(status, props)}
      disabled={disabled || status.pending}
    />
  );
}
