import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Ticketify palette (matches your designs)
        brand: {
          pink: "#EC4899",
          pinkSoft: "#FCE7F1",
          navy: "#1E2A4A",
          dark: "#15213C",
        },
      },
    },
  },
  plugins: [],
};

export default config;
