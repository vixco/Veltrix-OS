"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Dialog({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in transition-opacity"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-lg rounded-2xl bg-surface border border-border shadow-2xl animate-pop-in",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="px-6 pt-6 pb-4">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-muted-fg">{description}</p>
      )}
    </div>
  );
}

export function DialogBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("px-6 pb-4", className)}>{children}</div>;
}

export function DialogFooter({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-2">
      {children}
    </div>
  );
}
