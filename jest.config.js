const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./"
});

const customJestConfig = {
  testEnvironment: "jest-environment-jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  watchman: false,
  // Playwright specs live in e2e/ and run with `npm run test:e2e`.
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/", "<rootDir>/out/", "<rootDir>/e2e/"],
  modulePathIgnorePatterns: ["<rootDir>/out/", "<rootDir>/.next/"]
};

module.exports = createJestConfig(customJestConfig);
