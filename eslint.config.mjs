import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [
      ".next/**",
      ".vercel/**",
      "supabase/.temp/**",
      "node_modules/**",
      "out/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
