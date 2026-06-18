jest.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({ data: { path: 'test-avatar.png' }, error: null })),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://example.com/avatars/test-avatar.png' } })),
      })),
    },
  },
}))

import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/upload-avatar'

describe('POST /api/upload-avatar', () => {
  it('returns 405 for GET requests', async () => {
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(405)
  })
})
