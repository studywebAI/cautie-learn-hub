import type { Config } from "tailwindcss";

const { fontFamily } = require("tailwindcss/defaultTheme");

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "!./app/node_modules/**/*",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Helvetica Neue", "Helvetica", "Arial", ...fontFamily.sans],
        body: ["Plus Jakarta Sans", "Helvetica Neue", "Helvetica", "Arial", ...fontFamily.sans],
        headline: ["Plus Jakarta Sans", "Helvetica Neue", "Helvetica", "Arial", ...fontFamily.sans],
        dyslexia: ["var(--font-atkinson-hyperlegible)", ...fontFamily.sans],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        scan: {
          "0%": { transform: "translateY(-10%)" },
          "50%": { transform: "translateY(calc(100% + 10%))" },
          "100%": { transform: "translateY(-10%)" },
        },
        "nudge-left": {
          "0%, 100%": { transform: "translateX(0)" },
          "40%": { transform: "translateX(-5px)" },
          "70%": { transform: "translateX(-1.5px)" },
        },
        "nudge-right": {
          "0%, 100%": { transform: "translateX(0)" },
          "40%": { transform: "translateX(5px)" },
          "70%": { transform: "translateX(1.5px)" },
        },
        "bulb-glow": {
          "0%, 100%": {
            transform: "scale(1) rotate(0deg)",
            filter: "drop-shadow(0 0 0 hsl(var(--foreground) / 0))",
          },
          "35%": {
            transform: "scale(1.22) rotate(-10deg)",
            filter: "drop-shadow(0 0 5px hsl(var(--foreground) / 0.35))",
          },
          "65%": {
            transform: "scale(1.06) rotate(5deg)",
            filter: "drop-shadow(0 0 2px hsl(var(--foreground) / 0.2))",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        scan: "scan 3s ease-in-out infinite",
        "nudge-left": "nudge-left 0.5s ease-out",
        "nudge-right": "nudge-right 0.5s ease-out",
        "bulb-glow": "bulb-glow 0.7s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
