import defaultTheme from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
  ],
  theme: {
    extend: {
      boxShadow: {
        '3xl': '0 35px 60px -15px rgba(0, 0, 0, 0.3)',
      },
      fontFamily: {
        sans: ["Oswald", ...defaultTheme.fontFamily.sans],
        serif: ["Pretendard", ...defaultTheme.fontFamily.serif],
      },
      animation: {
        expand: 'expand 1s ease-in-out',
      },
      keyframes: {
        expand: {
          '0%': { 
            'max-width': '28rem',
            'transform': 'scale(.7)' 
          },
          '100%': {
            'max-width': '100%',
            'transform': 'scale(1)'
          },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
