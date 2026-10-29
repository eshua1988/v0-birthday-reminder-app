import js from "@eslint/js"
import tseslint from "typescript-eslint"

export default tseslint.config(
  {
    ignores: [".next/**", "node_modules/**", "public/**", "scripts/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-empty": "off",
      "no-useless-assignment": "off",
      "prefer-const": "off",
    },
  },
)
