/** @type {import('prettier').Config} */
module.exports = {
  endOfLine: "lf",
  semi: false,
  singleQuote: false,
  tabWidth: 2,
  trailingComma: "es5",
  bracketSpacing: true,
  tailwindStylesheet: "./src/App.css",
  importOrder: ["<BUILTIN_MODULES>", "<THIRD_PARTY_MODULES>", "", "^[./]"],
  importOrderParserPlugins: ["jsx", "decorators-legacy"],
  plugins: [
    "@ianvs/prettier-plugin-sort-imports",
    "prettier-plugin-tailwindcss",
  ],
}
