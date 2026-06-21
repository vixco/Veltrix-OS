"use client";

import * as React from "react";
import { useNotificationStore } from "@/lib/notifications";
import { useChatStore } from "@/lib/store";
import { CheckCircle2, X } from "lucide-react";
import { timeAgo } from "@/lib/utils";

export function NotificationToasts() {
  const toasts = useNotificationStore((s) => s.toasts);
  const dismiss = useNotificationStore((s) => s.dismiss);
  const setActive = useChatStore((s) => s.setActive);

  return (
    <div className="fixed bottom-4 right-4 z-[120] flex flex-col gap-2 w-[320px] pointer-events-none">
      {toasts.map((t) => {
        const secs = t.startedAt ? Math.max(0, Math.round((t.createdAt - t.startedAt) / 1000)) : null;
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 p-3 rounded-xl bg-surface border border-border shadow-xl animate-slide-up"
          >
            <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
            <button
              className="flex-1 text-left min-w-0"
              onClick={() => {
                if (t.conversationId) setActive(t.conversationId);
                dismiss(t.id);
              }}
            >
              <p className="text-[13px] font-medium text-foreground truncate">{t.title}</p>
              {t.body && <p className="text-[12px] text-muted-fg line-clamp-2 mt-0.5">{t.body}</p>}
              {secs != null && (
                <p className="text-[11px] text-muted-fg/70 mt-0.5">Completed in {secs}s</p>
              )}
            </button>
            <button
              onClick={() => dismiss(t.id)}
              className="p-1 rounded text-muted-fg hover:text-foreground hover:bg-surface-2 transition-colors"
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
