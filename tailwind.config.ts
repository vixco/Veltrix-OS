import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--bg))",
        "bg-sidebar": "rgb(var(--bg-sidebar))",
        foreground: "rgb(var(--fg))",
        surface: "rgb(var(--surface))",
        "surface-2": "rgb(var(--surface-2))",
        "surface-3": "rgb(var(--surface-3))",
        border: "rgb(var(--border))",
        "border-hover": "rgb(var(--border-hover))",
        muted: "rgb(var(--muted))",
        "muted-fg": "rgb(var(--muted-fg))",
        primary: "rgb(var(--primary))",
        "primary-fg": "rgb(var(--primary-fg))",
        accent: "rgb(var(--accent))",
        "accent-hover": "rgb(var(--accent-hover))",
        "accent-fg": "rgb(var(--accent-fg))",
        "accent-soft": "rgb(var(--accent-soft))",
        destructive: "rgb(var(--destructive))",
        success: "rgb(var(--success))",
        warning: "rgb(var(--warning))",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", "1rem"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "slide-up": "slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-right": "slide-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        shimmer: "shimmer 2s linear infinite",
        "scale-in": "scale-in 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
        "pop-in": "pop-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "bounce-in": "bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "slide-down": "slide-down 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "spin-smooth": "spin-smooth 0.8s linear infinite",
        "stagger-in": "stagger-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
        "expand-height": "expand-height 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-right": {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95) translateY(4px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.8)" },
          "60%": { opacity: "1", transform: "scale(1.03)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "bounce-in": {
          "0%": { opacity: "0", transform: "scale(0.3) translateY(20px)" },
          "50%": { opacity: "1", transform: "scale(1.05) translateY(-4px)" },
          "70%": { transform: "scale(0.98) translateY(2px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "spin-smooth": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "stagger-in": {
          from: { opacity: "0", transform: "translateY(10px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "expand-height": {
          from: { maxHeight: "0", opacity: "0" },
          to: { maxHeight: "500px", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
