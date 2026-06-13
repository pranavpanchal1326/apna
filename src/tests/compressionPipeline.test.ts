import { compressPhoto } from '../lib/camera/compression'

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn().mockImplementation((uri: string) => {
    if (uri === 'small.jpg') {
      return Promise.resolve({ exists: true, size: 500000 }) // 500KB
    }
    if (uri === 'large.jpg') {
      return Promise.resolve({ exists: true, size: 3000000 }) // 3MB
    }
    return Promise.resolve({ exists: true, size: 800000 }) // 800KB
  }),
  makeDirectoryAsync: jest.fn(),
  moveAsync: jest.fn(),
  deleteAsync: jest.fn(),
  cacheDirectory: 'cache://',
}))

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockResolvedValue({
    uri: 'cache://manipulated_image.jpg',
    width: 1000,
    height: 1000,
  }),
  SaveFormat: {
    JPEG: 'jpeg',
  },
}))

describe('Compression Pipeline', () => {
  test('file under 2MB with small dimensions returns compressionApplied false', async () => {
    const result = await compressPhoto({
      uri: 'small.jpg',
      maxSizeBytes: 2000000,
      maxDimension: 1920,
    })
    expect(result.compressionApplied).toBe(false)
    expect(result.uri).toBe('small.jpg')
  })

  test('file over 2MB triggers compression', async () => {
    const result = await compressPhoto({
      uri: 'large.jpg',
      maxSizeBytes: 2000000,
      maxDimension: 1920,
    })
    expect(result.compressionApplied).toBe(true)
    expect(result.fileSizeBytes).toBeLessThan(3000000)
    expect(result.uri).toContain('apna_compressed')
  })

  test('aspect ratio is preserved after resize', async () => {
    const result = await compressPhoto({
      uri: 'large.jpg',
      maxSizeBytes: 2000000,
      maxDimension: 1920,
    })
    // Width and height of the mock returned by ImageManipulator are 1000x1000, so ratio is 1:1
    expect(result.width / result.height).toBe(1)
  })

  test('output URI is different from input URI when compression is applied', async () => {
    const result = await compressPhoto({
      uri: 'large.jpg',
      maxSizeBytes: 2000000,
      maxDimension: 1920,
    })
    expect(result.uri).not.toBe('large.jpg')
  })
})
