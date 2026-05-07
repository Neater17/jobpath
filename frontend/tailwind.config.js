/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "deep-bg": "#010C34",
        "navy-bg": "#071854",
        "card-bg": "#0B2998",
        "primary-blue": "#1952D7",
        "accent-blue": "#254FA3",
        "muted-blue-gray": "#374571",
        "soft-navy": "#4A5274",
        "light-muted-blue": "#5F678F",
        "light-accent-blue": "#6695E3",
        "light-text": "#E8EDF8",
        "soft-lavender-blue": "#A1A6DB",
        "muted-gray-blue": "#9298AC",
      },
    },
  },
  plugins: [],
};
