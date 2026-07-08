/**
 * Jest mock for @react-native-async-storage/async-storage
 * Provides the minimal API used in the app: getItem, setItem, removeItem.
 */

let memory = {};

module.exports = {
  __esModule: true,
  default: {
    getItem: jest.fn((key) => Promise.resolve(memory[key] ?? null)),
    setItem: jest.fn((key, value) => {
      memory[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key) => {
      delete memory[key];
      return Promise.resolve();
    }),
    // Optional: clear all for test isolation
    clear: jest.fn(() => {
      memory = {};
      return Promise.resolve();
    }),
  },
};
