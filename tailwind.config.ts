import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Hiragino Sans",
          "Hiragino Kaku Gothic ProN",
          "游ゴシック",
          "Yu Gothic",
          "Meiryo",
          "メイリオ",
          "sans-serif"
        ]
      },
      colors: {
        brand: {
          50: "#fffbf7",
          100: "#ffedd5",
          500: "#ea580c",
          600: "#c2410c",
          700: "#9a3412"
        }
      }
    }
  },
  plugins: []
};

export default config;

