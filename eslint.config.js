import typescriptEslint from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import astroEslintParser from "astro-eslint-parser";
import eslintPluginAstro from "eslint-plugin-astro";
import jsoncPlugin from "eslint-plugin-jsonc";
import jsxA11y from "eslint-plugin-jsx-a11y";
import ymlPlugin from "eslint-plugin-yml";
import * as jsoncParser from "jsonc-eslint-parser";
import * as yamlParser from "yaml-eslint-parser";

export default [
  // Base ESLint recommended rules
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      // Basic ESLint rules
      "no-unused-vars": [
        "warn",
        {
          args: "none",
          varsIgnorePattern: "^(_|editable)",
        },
      ],
      "no-console": "off",
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "prefer-template": "error",
      "template-curly-spacing": "error",
      "padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: ["const", "let", "var"], next: "*" },
        { blankLine: "any", prev: ["const", "let", "var"], next: ["const", "let", "var"] },
      ],
    },
  },

  // TypeScript files
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": typescriptEslint,
    },
    rules: {
      ...typescriptEslint.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "none",
          varsIgnorePattern: "^(_|editable)",
        },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      // Removed rules that require type information for now
    },
  },

  // JSX/TSX files
  {
    files: ["**/*.jsx", "**/*.tsx"],
    plugins: {
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...jsxA11y.configs.recommended.rules,
    },
  },

  // Astro files
  {
    files: ["**/*.astro"],
    plugins: {
      astro: eslintPluginAstro,
      "@typescript-eslint": typescriptEslint,
    },
    languageOptions: {
      parser: astroEslintParser,
      parserOptions: {
        parser: typescriptParser,
        project: "./tsconfig.json",
        extraFileExtensions: [".astro"],
      },
    },
    rules: {
      ...eslintPluginAstro.configs.recommended.rules,
      // Astro-specific rules
      "astro/no-conflict-set-directives": "error",
      "astro/no-unused-define-vars-in-style": "error",
      "astro/no-unused-css-selector": "off",
      "astro/prefer-class-list-directive": "warn",
      "astro/prefer-split-class-list": "warn",
      "astro/sort-attributes": "off",

      // Accessibility rules for .astro templates. jsx-a11y (configured above)
      // only inspects .jsx/.tsx, so before this the component library — which is
      // almost entirely .astro — was not a11y-linted at all.
      "astro/jsx-a11y/alt-text": "error",
      "astro/jsx-a11y/anchor-has-content": "error",
      "astro/jsx-a11y/anchor-is-valid": "error",
      "astro/jsx-a11y/aria-activedescendant-has-tabindex": "error",
      "astro/jsx-a11y/aria-props": "error",
      "astro/jsx-a11y/aria-proptypes": "error",
      "astro/jsx-a11y/aria-role": "error",
      "astro/jsx-a11y/aria-unsupported-elements": "error",
      "astro/jsx-a11y/autocomplete-valid": "error",
      "astro/jsx-a11y/click-events-have-key-events": "error",
      "astro/jsx-a11y/heading-has-content": "error",
      "astro/jsx-a11y/html-has-lang": "error",
      "astro/jsx-a11y/iframe-has-title": "error",
      "astro/jsx-a11y/img-redundant-alt": "error",
      "astro/jsx-a11y/interactive-supports-focus": "error",
      "astro/jsx-a11y/label-has-associated-control": "error",
      "astro/jsx-a11y/lang": "error",
      "astro/jsx-a11y/mouse-events-have-key-events": "error",
      "astro/jsx-a11y/no-access-key": "error",
      "astro/jsx-a11y/no-aria-hidden-on-focusable": "error",
      "astro/jsx-a11y/no-autofocus": "error",
      "astro/jsx-a11y/no-distracting-elements": "error",
      "astro/jsx-a11y/no-interactive-element-to-noninteractive-role": "error",
      "astro/jsx-a11y/no-noninteractive-element-interactions": "error",
      "astro/jsx-a11y/no-redundant-roles": "error",
      "astro/jsx-a11y/no-static-element-interactions": "error",
      "astro/jsx-a11y/role-has-required-aria-props": "error",
      "astro/jsx-a11y/role-supports-aria-props": "error",
      "astro/jsx-a11y/scope": "error",
      "astro/jsx-a11y/tabindex-no-positive": "error",

      // Promoted to error now that the nav triggers are real <button> elements
      // rather than <label role="button" tabindex="0">. These two are what would
      // catch that pattern coming back, so they are the whole point of the rework.
      "astro/jsx-a11y/no-noninteractive-element-to-interactive-role": "error",
      "astro/jsx-a11y/no-noninteractive-tabindex": "error",

      // Still warn. control-has-associated-label fires on the visually hidden
      // checkbox/radio inputs that hold disclosure state — they are an
      // implementation detail, not controls a user reaches. media-has-caption
      // needs caption files for the video component, which is content, not code.
      "astro/jsx-a11y/control-has-associated-label": "warn",
      "astro/jsx-a11y/media-has-caption": "warn",

      // Off: conflicts with deliberate defensive roles, notably role="list" on
      // the list component, which is required or Safari/VoiceOver drops list
      // semantics when list-style: none is applied.
      "astro/jsx-a11y/prefer-tag-over-role": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "none",
          varsIgnorePattern: "^(_|editable)",
        },
      ],
    },
  },

  // JSON files
  {
    files: ["**/*.json", "**/*.jsonc"],
    languageOptions: {
      parser: jsoncParser,
    },
    plugins: {
      jsonc: jsoncPlugin,
    },
    rules: {
      "jsonc/quotes": ["error", "double"],
      "jsonc/comma-dangle": ["error", "never"],
    },
  },

  // Enforce the order of keys in config YAML files
  {
    files: ["**/*.config.yml", "**/*.config.yaml"],
    languageOptions: {
      parser: yamlParser,
    },
    plugins: {
      yml: ymlPlugin,
    },
    rules: {
      ...ymlPlugin.configs.recommended.rules,
      "yml/sort-keys": [
        "error",
        {
          pathPattern: "^$",
          order: ["spec", "blueprint", "preview", "_inputs"],
        },
        {
          pathPattern: "^_inputs\\..*$",
          order: ["type", "label", "comment", "hidden", "options"],
        },
        {
          pathPattern: "^_inputs\\..*\\.options$",
          order: [
            "values",
            "structures",
            "preview",
            "paths",
            "resize_style",
            "expandable",
            "image_size_attributes",
            "prevent_resize_existing_files",
            "disable_upload_file",
            "disable_direct_input",
            "disable_upload_file_in_file_browser",
            "required",
            "required_message",
            "min_items",
            "min_items_message",
            "max_items",
            "max_items_message",
            "unique_on",
            "unique_on_message",
          ], // Common preview options keys
        },
        {
          pathPattern: "^_inputs\\..*\\.options.preview$",
          order: ["icon", "text", "subtext", "image", "gallery"], // Preview options keys
        },
        {
          pathPattern: "^_inputs\\..*\\.options.preview.gallery$",
          order: ["text", "icon", "icon_color", "icon_background_color", "image", "fit"], // Gallery preview options keys
        },
      ],
      "yml/quotes": ["error", { prefer: "double", avoidEscape: false }],
      "yml/no-empty-document": "off",
      "yml/no-empty-mapping-value": "off",
      "yml/no-empty-sequence-entry": "off",
    },
  },

  // Global ignores
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      ".astro/**",
      "**/*.min.js",
      "packages/*/dist/**",
      "**/.astro/**",
      "**/content.d.ts",
      "**/types.d.ts",
    ],
  },
];
