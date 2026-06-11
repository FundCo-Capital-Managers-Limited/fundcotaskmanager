export default {
    testEnvironment: 'jsdom',
    setupFiles: ['<rootDir>/jest.env.js', '<rootDir>/jest.polyfills.js'],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testMatch: ['**/__tests__/**/*.test.jsx'],
    coverageDirectory: 'coverage',
    transform: {
        '^.+\\.(js|jsx|mjs)$': 'babel-jest'
    },
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.jsx?$': '$1'
    },
    transformIgnorePatterns: [
        '/node_modules/(?!msw|axios)/'
    ],
    extensionsToTreatAsEsm: ['.jsx'],
    coverageProvider: 'v8',
    coverageReporters: ['json', 'lcov', 'text', 'clover'],
    coveragePathIgnorePatterns: ['/node_modules/', '/__tests__/']
};