import tseslint from "typescript-eslint"
import nextConfig from "eslint-config-next"
import prettier from "eslint-config-prettier"

/** @type {import("eslint").Linter.Config[]} */
export default tseslint.config(
    { ignores: [".next/**", "node_modules/**"] },
    ...nextConfig,
    ...tseslint.configs.recommended,
    prettier,
    {
        rules: {
            "@next/next/no-img-element": "off",
            "react/no-unescaped-entities": "off",
            // Intentional: sync refs in render body for stable GSAP callbacks
            "react-hooks/refs": "off",
            // Intentional: setState-in-effect is used throughout for initialising state from props/localStorage
            "react-hooks/set-state-in-effect": "off",
            // Use TS-aware rule instead of base no-unused-vars
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
            ],
            // Allow explicit any where needed (gradual adoption)
            "@typescript-eslint/no-explicit-any": "warn",
        },
    }
)
