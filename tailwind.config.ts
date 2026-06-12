import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#FAFAF7",
        ink: "#16201B",
        muted: "#5C6B63",
        line: "#E5E8E2",
        pine: { 950: "#0B1F17", 900: "#10291E", 800: "#14402C", 700: "#166442", 600: "#0E7C4A", 500: "#119D5D", 100: "#E3F4EA", 50: "#F1FAF4" },
        amber50: "#FFF8E9",
        danger: "#B3402A"
      },
      boxShadow: {
        card: "0 1px 2px rgba(22,32,27,0.04), 0 4px 16px rgba(22,32,27,0.05)",
        pop: "0 8px 30px rgba(11,31,23,0.16)"
      },
      borderRadius: { xl2: "14px" }
    },
  },
  plugins: [],
};
export default config;
