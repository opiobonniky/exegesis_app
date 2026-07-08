const mockInstance = {
  play: jest.fn(),
  pause: jest.fn(),
  stop: jest.fn(),
  release: jest.fn(),
  currentTime: 0,
  duration: 0,
  numberOfChannels: 1,
  volume: 1,
  setVolume: jest.fn(),
  setNumberOfLoops: jest.fn(),
};
const SoundConstructor = jest.fn(() => mockInstance);
SoundConstructor.setCategory = jest.fn();
module.exports = { __esModule: true, default: SoundConstructor };
