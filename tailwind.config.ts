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
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
