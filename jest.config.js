module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-navigation|@react-native|@react-native-async-storage|@react-native-community|@react-navigation/.*|react-native-linear-gradient|react-native-toast-message|react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|react-native-svg|lucide-react-native)/)',
  ],
  moduleNameMapper: {
    'react-native-tts': '<rootDir>/__mocks__/react-native-tts.js',
    'react-native-linear-gradient': '<rootDir>/__mocks__/react-native-linear-gradient.js',
    'react-native-sound': '<rootDir>/__mocks__/react-native-sound.js',
    'react-native-fs': '<rootDir>/__mocks__/react-native-fs.js',
    'base64-js': '<rootDir>/__mocks__/base64-js.js',
    'react-native-device-info': '<rootDir>/__mocks__/react-native-device-info.js',
  },
  testPathIgnorePatterns: ['/__tests__/App.test.tsx', '/node_modules/'],
};
