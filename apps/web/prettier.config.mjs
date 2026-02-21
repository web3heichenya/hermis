/** @type {import("prettier").Config} */
const config = {
  printWidth: 100,
  tabWidth: 2,
  singleQuote: false,
  trailingComma: "es5",
  semi: true,
  plugins: ["prettier-plugin-tailwindcss"],
};

export default config;
