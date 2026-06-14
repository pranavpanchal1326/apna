// src/tests/deeplinkResolver.test.ts
import { resolveRoute } from '../navigation/deeplink/resolver'
import type { DeepLinkResult } from '../navigation/deeplink/parser'

describe('Deep Link Resolver', () => {
  test('resolves group invite when code is present', () => {
    const parsed: DeepLinkResult = {
      type: 'group_invite',
      screen: 'JoinGroup',
      params: { code: 'GOA26A' },
      raw_url: 'apna://join?code=GOA26A',
      parsed_at: Date.now()
    }
    expect(resolveRoute(parsed)).toEqual({
      type: 'group_invite',
      screen: 'JoinGroup',
      params: { code: 'GOA26A' }
    })
  })

  test('fails group invite resolution when code is missing', () => {
    const parsed: DeepLinkResult = {
      type: 'group_invite',
      screen: 'JoinGroup',
      params: {},
      raw_url: 'apna://join',
      parsed_at: Date.now()
    }
    expect(resolveRoute(parsed)).toBeNull()
  })

  test('resolves group direct when groupId is present', () => {
    const parsed: DeepLinkResult = {
      type: 'group_direct',
      screen: 'GroupHome',
      params: { groupId: 'g1' },
      raw_url: 'apna://group/g1',
      parsed_at: Date.now()
    }
    expect(resolveRoute(parsed)).not.toBeNull()
    expect(resolveRoute(parsed)!.params.groupId).toBe('g1')
  })

  test('fails group direct when groupId is missing', () => {
    const parsed: DeepLinkResult = {
      type: 'group_direct',
      screen: 'GroupHome',
      params: {},
      raw_url: 'apna://group/',
      parsed_at: Date.now()
    }
    expect(resolveRoute(parsed)).toBeNull()
  })

  test('resolves expense when groupId and expenseId are present', () => {
    const parsed: DeepLinkResult = {
      type: 'expense',
      screen: 'ExpenseDetail',
      params: { groupId: 'g1', expenseId: 'e1' },
      raw_url: 'apna://group/g1/expense/e1',
      parsed_at: Date.now()
    }
    expect(resolveRoute(parsed)).not.toBeNull()
  })

  test('fails expense when groupId or expenseId is missing', () => {
    const parsed1: DeepLinkResult = {
      type: 'expense',
      screen: 'ExpenseDetail',
      params: { groupId: 'g1' },
      raw_url: 'apna://group/g1/expense/',
      parsed_at: Date.now()
    }
    expect(resolveRoute(parsed1)).toBeNull()

    const parsed2: DeepLinkResult = {
      type: 'expense',
      screen: 'ExpenseDetail',
      params: { expenseId: 'e1' },
      raw_url: 'apna://group//expense/e1',
      parsed_at: Date.now()
    }
    expect(resolveRoute(parsed2)).toBeNull()
  })

  test('resolves memory detail when groupId and memoryId are present', () => {
    const parsed: DeepLinkResult = {
      type: 'memory_detail',
      screen: 'MemoryDetail',
      params: { groupId: 'g1', memoryId: 'm1' },
      raw_url: 'apna://memories/g1/detail/m1',
      parsed_at: Date.now()
    }
    expect(resolveRoute(parsed)).not.toBeNull()
  })

  test('fails memory detail when memoryId is missing', () => {
    const parsed: DeepLinkResult = {
      type: 'memory_detail',
      screen: 'MemoryDetail',
      params: { groupId: 'g1' },
      raw_url: 'apna://memories/g1/detail/',
      parsed_at: Date.now()
    }
    expect(resolveRoute(parsed)).toBeNull()
  })
})
