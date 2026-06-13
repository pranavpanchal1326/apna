import { compressPhoto } from '@/lib/camera/compression'

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn().mockImplementation((uri: string) => {
    if (uri === 'file://photo.jpg' || uri === 'file://original.jpg' || uri === 'file://huge.jpg') {
      return Promise.resolve({ size: 5_000_000, exists: true }) // 5MB
    }
    if (uri === 'file://photo_small.jpg') {
      return Promise.resolve({ size: 1_000_000, exists: true }) // 1MB
    }
    return Promise.resolve({ size: 1_500_000, exists: true }) // 1.5MB after compression
  }),
  makeDirectoryAsync: jest.fn(),
  moveAsync: jest.fn(),
  deleteAsync: jest.fn(),
  cacheDirectory: 'file://cache/',
}))

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockImplementation((uri: string, actions: any) => {
    return Promise.resolve({
      uri: 'file://cache/compressed.jpg',
      width: 1920,
      height: 1080
    })
  }),
  SaveFormat: { JPEG: 'jpeg' },
}))

describe('Photo Compression', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('file under 2MB with small dimensions — not compressed', async () => {
    const FileSystem = require('expo-file-system/legacy')
    // We pass photo_small.jpg which returns 1MB
    const result = await compressPhoto({ uri: 'file://photo_small.jpg', maxSizeBytes: 2_000_000, maxDimension: 1920 })
    expect(result.compressionApplied).toBe(false)
  })

  test('file over 2MB — compression applied', async () => {
    const result = await compressPhoto({ uri: 'file://photo.jpg' })
    expect(result.compressionApplied).toBe(true)
  })

  test('output URI differs from input URI', async () => {
    const result = await compressPhoto({ uri: 'file://original.jpg' })
    expect(result.uri).not.toBe('file://original.jpg')
  })

  test('compression quality never goes below 0.5', async () => {
    const Manipulator = require('expo-image-manipulator')
    // Run compressPhoto which runs progressivepasses
    await compressPhoto({ uri: 'file://huge.jpg' })
    const calls = Manipulator.manipulateAsync.mock.calls
    // Ignore the first call which is empty manipulation to get dimensions
    const compressionCalls = calls.filter((call: any[]) => call[2]?.compress !== undefined)
    compressionCalls.forEach((call: any[]) => {
      const options = call[2] as { compress: number }
      expect(options.compress).toBeGreaterThanOrEqual(0.5)
    })
  })
})
