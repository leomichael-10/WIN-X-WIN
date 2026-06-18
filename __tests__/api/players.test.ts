import { createMocks } from 'node-mocks-http'

jest.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({
          data: [
            { id: '1', name: 'Alice', money: 300, avatar_url: null, created_at: '', updated_at: '' },
            { id: '2', name: 'Bob', money: 100, avatar_url: null, created_at: '', updated_at: '' },
          ],
          error: null,
        })),
      })),
    })),
    rpc: jest.fn(() => Promise.resolve({
      data: [{ id: '1', name: 'Alice', money: 350, avatar_url: null, created_at: '', updated_at: '' }],
      error: null,
    })),
  },
}))

import handler from '@/pages/api/players'

describe('GET /api/players', () => {
  it('returns players sorted by money', async () => {
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data[0].name).toBe('Alice')
    expect(data[0].money).toBe(300)
  })
})

describe('POST /api/players', () => {
  it('upserts player and returns updated player', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { name: 'Alice', moneyChange: 50 },
    })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.name).toBe('Alice')
  })

  it('returns 400 when name is missing', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { moneyChange: 50 },
    })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(400)
  })

  it('returns 400 when moneyChange is a string', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { name: 'Alice', moneyChange: 'fifty' },
    })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(400)
  })
})
