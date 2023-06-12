module.exports = {
  "*.{ts,tsx,js,jsx,vue,json,scss,css}": ["npm run lint:fix", () => "npm run test"],
  "*.scss": ["npm run lint:styles"],
};
