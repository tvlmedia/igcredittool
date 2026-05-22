import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        carbon: {
          950: "#060708",
          900: "#0b0d10",
          800: "#11151a",
          700: "#1b2028"
        },
        iron: {
          500: "#e1b45f",
          400: "#f4cf86",
          300: "#f8e0a7"
        },
        volt: {
          500: "#77f2d5",
          400: "#9af8e5"
        }
      },
      boxShadow: {
        glow: "0 24px 80px rgba(225, 180, 95, 0.14)",
        panel: "0 18px 60px rgba(0, 0, 0, 0.38)"
      }
    }
  },
  plugins: []
};

export default config;
