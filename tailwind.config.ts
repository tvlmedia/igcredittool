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
          950: "#030405",
          900: "#070809",
          800: "#101111",
          700: "#191817"
        },
        iron: {
          600: "#b86e24",
          500: "#e6842e",
          400: "#f2b35d",
          300: "#f8d79a"
        },
        volt: {
          500: "#77f2d5",
          400: "#9af8e5"
        }
      },
      boxShadow: {
        glow: "0 18px 54px rgba(230, 132, 46, 0.22)",
        panel: "0 24px 70px rgba(0, 0, 0, 0.46)"
      }
    }
  },
  plugins: []
};

export default config;
