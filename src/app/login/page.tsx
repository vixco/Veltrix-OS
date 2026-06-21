"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { ClaudeLogo } from "@/components/claude-logo";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp, continueAsGuest, user, initialized } = useAuthStore();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initialized && user && !user.guest) router.replace("/");
  }, [user, initialized, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        if (!name.trim()) {
          setError("Please enter your name.");
          setBusy(false);
          return;
        }
        await signUp(email, password, name.trim());
      }
      router.replace("/");
    } catch (err: any) {
      const msg = err?.response?.message || err?.message || "Something went wrong.";
      setError(typeof msg === "string" ? msg : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleGuest = () => {
    continueAsGuest();
    router.replace("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <ClaudeLogo className="h-12 w-12 text-accent mb-4 animate-bounce-in" />
          <h1 className="text-2xl font-semibold text-foreground animate-slide-up">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-fg mt-1.5 animate-slide-up" style={{ animationDelay: "0.06s" }}>
            {mode === "login"
              ? "Sign in to sync across devices"
              : "Join Veltrix OS to get started"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 animate-slide-up" style={{ animationDelay: "0.12s" }}>
          {mode === "signup" && (
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-fg">Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-fg/60" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full h-11 pl-10 pr-3 rounded-lg bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted-fg/60 transition-colors focus:border-border-hover focus:bg-surface-3 focus:outline-none"
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-muted-fg">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-fg/60" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-11 pl-10 pr-3 rounded-lg bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted-fg/60 transition-colors focus:border-border-hover focus:bg-surface-3 focus:outline-none"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-muted-fg">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-fg/60" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full h-11 pl-10 pr-10 rounded-lg bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted-fg/60 transition-colors focus:border-border-hover focus:bg-surface-3 focus:outline-none"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-fg/60 hover:text-foreground transition-all active:scale-90"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-[13px] text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={busy}
            className="w-full bg-accent text-accent-fg hover:bg-accent-hover"
          >
            {busy ? (
              <span className="flex items-center gap-2">
                <span className="spinner-ring" />
                Please wait...
              </span>
            ) : mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6 animate-fade-in" style={{ animationDelay: "0.18s" }}>
          <div className="h-px flex-1 bg-border" />
          <span className="text-[11px] text-muted-fg/60 uppercase tracking-wide">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Continue as guest */}
        <button
          onClick={handleGuest}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-lg border border-border text-sm font-medium text-muted-fg hover:text-foreground hover:bg-surface-2 hover:border-border-hover transition-all duration-150 active:scale-[0.98] animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          Continue without an account
          <ArrowRight className="h-4 w-4" />
        </button>

        {/* Toggle mode */}
        <p className="text-center text-[13px] text-muted-fg mt-6 animate-fade-in" style={{ animationDelay: "0.24s" }}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
            }}
            className="text-accent hover:text-accent-hover font-medium transition-colors"
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
