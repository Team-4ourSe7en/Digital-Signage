module.exports = {
    testEnvironment: "jsdom",
    testMatch: ["**/*.test.js"],
    collectCoverageFrom: ["weather.js", "sign.js"],
    coverageDirectory: "coverage",
    passWithNoTests: true,
};
