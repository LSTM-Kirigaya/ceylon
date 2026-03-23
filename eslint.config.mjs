import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Custom ignores
    "cli/dist/**",
    "scripts/**",
    "tests/**",
    "playwright.config.ts",
    "**/*.spec.ts",
    "**/*.test.ts",
  ]),
  {
    rules: {
      // Allow 'any' type in catch blocks and error handling
      "@typescript-eslint/no-explicit-any": "off",
      // Allow require() imports for compatibility
      "@typescript-eslint/no-require-imports": "off",
      // Disable setState in effect rule (common pattern for hydration)
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
