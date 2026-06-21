"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { ClaudeLogo } from "./claude-logo";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, initialized, init } = useAuthStore();

  useEffect(() => {
    if (!initialized) init();
  }, [initialized, init]);

  useEffect(() => {
    if (initialized && !user) {
      router.replace("/login");
    }
  }, [user, initialized, router]);

  if (!initialized || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <ClaudeLogo className="h-10 w-10 text-accent animate-pulse" />
      </div>
    );
  }

  return <>{children}</>;
}
