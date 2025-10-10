module.exports = {
  root: true,
  extends: ['@olympus/config/eslint-preset', 'plugin:storybook/recommended'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
};
