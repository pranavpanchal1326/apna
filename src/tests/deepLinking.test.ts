import { parseDeepLink, buildDeepLink } from '@/lib/navigation/deepLinks'

describe('Deep Link Parser', () => {
  test('budget deep link parsed correctly', () => {
    const result = parseDeepLink('apna://budget?groupId=abc123')
    expect(result).not.toBeNull()
    expect(result!.screen).toBe('Budget')
    expect(result!.params.groupId).toBe('abc123')
  })

  test('map deep link parsed correctly', () => {
    const result = parseDeepLink('apna://map?groupId=abc123')
    expect(result).not.toBeNull()
    expect(result!.screen).toBe('Map')
    expect(result!.params.groupId).toBe('abc123')
  })

  test('join group link parsed correctly', () => {
    const result = parseDeepLink('https://apna.app/join/APNA26')
    expect(result).not.toBeNull()
    expect(result!.screen).toBe('JoinGroup')
    expect(result!.params.code).toBe('APNA26')
  })

  test('memory deep link parsed correctly', () => {
    const result = parseDeepLink('apna://memory?groupId=abc123&memoryId=m1')
    expect(result).not.toBeNull()
    expect(result!.screen).toBe('MemoryDetail')
    expect(result!.params.memoryId).toBe('m1')
  })

  test('invalid link returns null', () => {
    expect(parseDeepLink('apna://unknown')).toBeNull()
  })

  test('buildDeepLink produces correct URL', () => {
    const url = buildDeepLink('budget', { groupId: 'abc123' })
    expect(url).toBe('apna://budget?groupId=abc123')
  })
})
