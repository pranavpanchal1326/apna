// src/lib/schemas/__tests__/list.schema.test.ts
import {
  SharedListSchema,
  SharedListCreateSchema,
  SharedListItemSchema,
  SharedListItemCreateSchema,
} from '../list.schema'

const validList = {
  id: 'list_1',
  groupId: 'grp_1',
  type: 'packing' as const,
  title: 'Packing',
  createdBy: 'uid_a',
  createdAt: {},
  updatedAt: {},
}

const validItem = {
  id: 'item_1',
  listId: 'list_1',
  groupId: 'grp_1',
  text: 'Sunscreen',
  createdBy: 'uid_a',
  createdAt: {},
  updatedAt: {},
}

describe('SharedListSchema', () => {
  it('accepts a valid list and applies defaults', () => {
    const parsed = SharedListSchema.parse(validList)
    expect(parsed.archived).toBe(false)
    expect(parsed.itemCount).toBe(0)
    expect(parsed.checkedCount).toBe(0)
  })

  it('rejects an unknown list type', () => {
    expect(SharedListSchema.safeParse({ ...validList, type: 'wishlist' }).success).toBe(false)
  })

  it('rejects an empty or over-long title', () => {
    expect(SharedListSchema.safeParse({ ...validList, title: '' }).success).toBe(false)
    expect(SharedListSchema.safeParse({ ...validList, title: 'x'.repeat(81) }).success).toBe(false)
  })

  it('rejects negative counts', () => {
    expect(SharedListSchema.safeParse({ ...validList, itemCount: -1 }).success).toBe(false)
  })
})

describe('SharedListCreateSchema', () => {
  it('strips server-managed fields', () => {
    const res = SharedListCreateSchema.safeParse({
      groupId: 'grp_1', type: 'grocery', title: 'Groceries', createdBy: 'uid_a',
    })
    expect(res.success).toBe(true)
  })
})

describe('SharedListItemSchema', () => {
  it('accepts a valid item and defaults checked/order', () => {
    const parsed = SharedListItemSchema.parse(validItem)
    expect(parsed.checked).toBe(false)
    expect(parsed.order).toBe(0)
  })

  it('rejects empty text and over-long text', () => {
    expect(SharedListItemSchema.safeParse({ ...validItem, text: '' }).success).toBe(false)
    expect(SharedListItemSchema.safeParse({ ...validItem, text: 'x'.repeat(201) }).success).toBe(false)
  })

  it('validates the optional deadline date format', () => {
    expect(SharedListItemSchema.safeParse({ ...validItem, deadlineDate: '2026-02-01' }).success).toBe(true)
    expect(SharedListItemSchema.safeParse({ ...validItem, deadlineDate: 'soon' }).success).toBe(false)
  })
})

describe('SharedListItemCreateSchema', () => {
  it('accepts a minimal new item', () => {
    const res = SharedListItemCreateSchema.safeParse({
      listId: 'list_1', groupId: 'grp_1', text: 'Water', createdBy: 'uid_a',
    })
    expect(res.success).toBe(true)
  })
})
