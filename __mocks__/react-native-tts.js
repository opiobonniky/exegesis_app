module.exports = {
  __esModule: true,
  default: {
    addEventListener: jest.fn(),
    removeAllListeners: jest.fn(),
    setDefaultLanguage: jest.fn().mockResolvedValue(undefined),
    setDefaultRate: jest.fn().mockResolvedValue(undefined),
    setDefaultPitch: jest.fn().mockResolvedValue(undefined),
    setDefaultVoice: jest.fn().mockResolvedValue(undefined),
    voices: jest.fn().mockResolvedValue([]),
    speak: jest.fn().mockResolvedValue('test-utterance-id'),
    stop: jest.fn().mockResolvedValue(undefined),
  },
};
