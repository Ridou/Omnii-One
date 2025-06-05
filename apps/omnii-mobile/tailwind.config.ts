import type { Config } from "tailwindcss";
import baseConfig from "@acme/tailwind-config/native";

export default {
  ...baseConfig,
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
} satisfies Config; 