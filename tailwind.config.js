/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: { 0: "#0a0a0a", 1: "#111111", 2: "#1a1a1a", 3: "#222222", 4: "#2a2a2a" },
        accent: "#e2e2e2",
        muted: "#666666",
        dim: "#444444",
      },
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};
