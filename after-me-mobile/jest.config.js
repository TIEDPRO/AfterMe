const jestExpoPreset = require('jest-expo/jest-preset');

const babelJestKey = Object.keys(jestExpoPreset.transform ?? {}).find(
  (k) => k.includes('[jt]sx'),
);
const babelJestEntry = babelJestKey ? jestExpoPreset.transform[babelJestKey] : undefined;

/** @type {import('jest').Config} */
module.exports = {
  ...jestExpoPreset,
  // Single worker avoids occasional SIGSEGV in Jest workers with native crypto paths.
  maxWorkers: 1,
  ...(babelJestEntry
    ? {
        transform: {
          ...jestExpoPreset.transform,
          [babelJestKey]: [
            babelJestEntry[0],
            {
              ...(babelJestEntry[1] ?? {}),
              plugins: [
                ...((babelJestEntry[1] ?? {}).plugins ?? []),
                '@babel/plugin-transform-modules-commonjs',
                '@babel/plugin-transform-dynamic-import',
              ],
            },
          ],
        },
      }
    : {}),
  setupFiles: [
    '<rootDir>/src/__tests__/setup-globals.ts',
    ...(jestExpoPreset.setupFiles ?? []),
    '<rootDir>/src/__tests__/setup.ts',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|react-native-svg|react-native-quick-crypto|react-native-qrcode-svg|react-native-view-shot|react-native-nitro-modules|@ungap)',
  ],
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts', '<rootDir>/src/__tests__/**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'src/core/**/*.ts',
    'src/services/**/*.ts',
    'src/db/**/*.ts',
    'src/context/**/*.tsx',
    '!src/**/*.d.ts',
  ],
};
