import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "node_modules/**"]),
  {
    rules: {
      // Existing code parses untyped external JSON in many places; track it as debt, don't block CI.
      "@typescript-eslint/no-explicit-any": "warn",
      // Pages hydrate from localStorage/IndexedDB in effects on purpose (no SSR access to device storage).
      "react-hooks/set-state-in-effect": "warn",
      // React Compiler rules added in eslint-config-next 16; existing components predate them.
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
    },
  },
  {
    // Tests are plain Node scripts that evaluate esbuild bundles, not Next.js modules.
    files: ["tests/**/*.mjs"],
    rules: { "@next/next/no-assign-module-variable": "off" },
  },
]);

export default eslintConfig;
