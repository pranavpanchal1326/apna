// src/tests/deeplinkErrors.test.ts
import { DeepLinkError, handleDeepLinkError } from '../navigation/deeplink/errors'

describe('Deep Link Error Handling', () => {
  test('returns correct messages for custom DeepLinkErrors', () => {
    const err1 = new DeepLinkError('expired_invite')
    expect(handleDeepLinkError(err1).message).toBe('This invite code has expired.')

    const err2 = new DeepLinkError('group_not_found')
    expect(handleDeepLinkError(err2).message).toBe('This group is no longer available.')

    const err3 = new DeepLinkError('content_deleted')
    expect(handleDeepLinkError(err3).message).toBe('This content is no longer available.')

    const err4 = new DeepLinkError('offline')
    expect(handleDeepLinkError(err4).message).toBe("You're offline. Please connect to the internet to view this content.")
  })

  test('normalizes database offline/unavailable errors', () => {
    const sysErr = { code: 'unavailable', message: 'Failed to connect' }
    const res = handleDeepLinkError(sysErr)
    expect(res.type).toBe('offline')
    expect(res.message).toBe("You're offline. Please connect to the internet to view this content.")
  })

  test('normalizes other arbitrary errors to invalid_link', () => {
    const err = new Error('Unknown error')
    const res = handleDeepLinkError(err)
    expect(res.type).toBe('invalid_link')
    expect(res.message).toBe("We couldn't find that page.")
  })
})
