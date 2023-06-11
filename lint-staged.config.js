module.exports = {
  "*.{ts,tsx,js,jsx,vue,json,scss,css}": ["npm run lint", () => "npm run test"],
  "*.scss": ["npm run lint:styles"],
};
