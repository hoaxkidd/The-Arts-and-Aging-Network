import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/static-components": "off",
      "react-hooks/exhaustive_deps": "off",
      "react-hooks/purity": "off",
      "react/no-unescaped-entities": "off",
      "jsx-a11y/role-supports-aria-props": "off",
    },
  },
]);

export default eslintConfig;
