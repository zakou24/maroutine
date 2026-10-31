import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    rules: {
      // ADR 0003 : core reste du TypeScript pur, seul Zod est autorisé.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^(?!zod$|\\.{1,2}/)",
              message: "packages/core n'importe que zod (ADR 0003).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/**/*.test.ts"],
    rules: { "no-restricted-imports": "off" },
  },
);
