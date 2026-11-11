"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { Suspense } from "react";
import { Modal, type ModalProps } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

type SearchParamModalProps = Omit<ModalProps, "open" | "onClose"> & {
  /** Query key that controls visibility (default `modal`). */
  param?: string;
  /** Value that opens this modal (default `new`). */
  value?: string;
  /** Extra query keys cleared when closing (e.g. `error`). */
  clearKeys?: string[];
};

function useClearSearchParams(keys: string[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return React.useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    for (const key of keys) next.delete(key);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [keys, pathname, router, searchParams]);
}

function SearchParamModalInner({
  param = "modal",
  value = "new",
  clearKeys = ["error"],
  children,
  ...modalProps
}: SearchParamModalProps) {
  const searchParams = useSearchParams();
  const open = searchParams.get(param) === value;
  const onClose = useClearSearchParams([param, ...clearKeys]);

  return (
    <Modal open={open} onClose={onClose} {...modalProps}>
      {children}
    </Modal>
  );
}

/**
 * Opens when `?{param}={value}` is present. Closing strips that param (and
 * optional extras) via client navigation so shareable deep-links still work.
 *
 * Pass serializable props only (strings, ReactNode children already rendered
 * on the server). Do not pass render props or title callbacks.
 */
export function SearchParamModal(props: SearchParamModalProps) {
  return (
    <Suspense fallback={null}>
      <SearchParamModalInner {...props} />
    </Suspense>
  );
}

type SearchParamValueModalProps = Omit<ModalProps, "open" | "onClose"> & {
  param: string;
  clearKeys?: string[];
};

function SearchParamValueModalInner({
  param,
  clearKeys = ["error"],
  children,
  ...modalProps
}: SearchParamValueModalProps) {
  const searchParams = useSearchParams();
  const value = searchParams.get(param);
  const onClose = useClearSearchParams([param, ...clearKeys]);

  if (!value) return null;

  return (
    <Modal open onClose={onClose} {...modalProps}>
      {children}
    </Modal>
  );
}

/**
 * Opens when a named param is present with any non-empty value (e.g. `?edit=id`).
 * Resolve the param value on the server and pass already-rendered children + a
 * static title — never pass function children or title callbacks.
 */
export function SearchParamValueModal(props: SearchParamValueModalProps) {
  return (
    <Suspense fallback={null}>
      <SearchParamValueModalInner {...props} />
    </Suspense>
  );
}

export function ModalOpenLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} scroll={false} className={cn(className)}>
      {children}
    </Link>
  );
}
