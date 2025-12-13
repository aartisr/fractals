import { vi, expect } from 'vitest'

/**
 * Test Utilities and Mocks for Subscription/Payment Testing
 */

// Mock Users
export const mockUsers = {
  validUser: {
    id: 'test-user-123',
    email: 'test@example.com',
  },
  anotherUser: {
    id: 'other-user-456',
    email: 'other@example.com',
  },
  noEmail: {
    id: 'no-email-789',
  },
  noId: {
    email: 'no-id@example.com',
  },
}

// Mock Plans
export const mockPlans = {
  gold: {
    id: 1,
    name: 'Gold Membership',
    description: 'Premium access to all content',
    amount: 50000, // 500 USD in cents
    currency: 'USD',
    interval: 'monthly',
    paystack_plan_code: 'PLN_gold_test',
    is_active: true,
    features: ['Feature 1', 'Feature 2', 'Feature 3'],
  },
  silver: {
    id: 2,
    name: 'Silver Membership',
    description: 'Standard access',
    amount: 25000, // 250 USD in cents
    currency: 'USD',
    interval: 'monthly',
    paystack_plan_code: 'PLN_silver_test',
    is_active: true,
    features: ['Feature 1', 'Feature 2'],
  },
  bronze: {
    id: 3,
    name: 'Bronze Membership',
    amount: 10000,
    currency: 'USD',
    interval: 'monthly',
    paystack_plan_code: 'PLN_bronze_test',
    is_active: false, // Inactive
    features: ['Feature 1'],
  },
  yearly: {
    id: 4,
    name: 'Gold Yearly',
    amount: 480000, // 4800 USD in cents
    currency: 'USD',
    interval: 'yearly',
    paystack_plan_code: 'PLN_gold_yearly_test',
    is_active: true,
  },
}

// Mock Subscriptions
export const mockSubscriptions = {
  active: {
    id: 'sub-active-123',
    user: mockUsers.validUser.id,
    plan: mockPlans.gold.id,
    status: 'active',
    paystack_subscription_code: 'SUB_active_123',
    paystack_customer_code: 'CUS_123',
    paystack_authorization_code: 'AUTH_123',
    paystack_email_token: 'token_active_123',
    current_period_start: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    current_period_end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    next_payment_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    last4: '4081',
    card_type: 'visa',
    card_bank: 'Test Bank',
  },
  nonRenewing: {
    id: 'sub-nonrenew-456',
    user: mockUsers.validUser.id,
    plan: mockPlans.silver.id,
    status: 'non-renewing',
    paystack_subscription_code: 'SUB_nonrenew_456',
    paystack_email_token: 'token_nonrenew_456',
  },
  cancelled: {
    id: 'sub-cancelled-789',
    user: mockUsers.validUser.id,
    plan: mockPlans.bronze.id,
    status: 'cancelled',
    paystack_subscription_code: 'SUB_cancelled_789',
    cancelled_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  expired: {
    id: 'sub-expired-000',
    user: mockUsers.validUser.id,
    plan: mockPlans.gold.id,
    status: 'expired',
    next_payment_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
}

// Mock Paystack Responses
export const mockPaystackResponses = {
  initializeSuccess: {
    status: true,
    message: 'Authorization URL created',
    data: {
      authorization_url: 'https://checkout.paystack.com/test_access_code',
      access_code: 'test_access_code',
      reference: 'ref_test_123',
    },
  },
  verifySuccess: {
    status: true,
    message: 'Verification successful',
    data: {
      reference: 'ref_test_123',
      amount: 50000,
      status: 'success',
      paid_at: new Date().toISOString(),
      customer: {
        customer_code: 'CUS_123',
        email: mockUsers.validUser.email,
      },
      metadata: {
        user_id: mockUsers.validUser.id,
        plan_id: mockPlans.gold.id,
        plan_name: mockPlans.gold.name,
      },
    },
  },
  verifyFailed: {
    status: true,
    message: 'Verification successful',
    data: {
      reference: 'ref_test_failed',
      amount: 50000,
      status: 'failed',
    },
  },
  getSubscriptionSuccess: {
    status: true,
    message: 'Subscription retrieved',
    data: {
      subscription_code: 'SUB_active_123',
      customer_code: 'CUS_123',
      plan_code: 'PLN_gold_test',
      status: 'active',
      next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },
  disableSubscriptionSuccess: {
    status: true,
    message: 'Subscription disabled',
    data: {
      subscription_code: 'SUB_active_123',
      status: 'cancelled',
    },
  },
  error: {
    status: false,
    message: 'Invalid request',
  },
}

// Mock Payment Events
export const mockPaymentEvents = {
  subscriptionCreated: {
    id: 'evt-1',
    event_type: 'subscription.created',
    event_source: 'paystack',
    user: mockUsers.validUser.id,
    subscription: mockSubscriptions.active.id,
    paystack_payload: mockPaystackResponses.verifySuccess.data,
    processed: true,
    processed_at: new Date().toISOString(),
  },
  chargeFailed: {
    id: 'evt-2',
    event_type: 'charge.failed',
    event_source: 'webhook',
    user: mockUsers.validUser.id,
    subscription: mockSubscriptions.active.id,
    paystack_payload: {
      reference: 'ref_failed',
      status: 'failed',
      gateway_response: 'Insufficient funds',
    },
    processed: true,
  },
}

// Mock Request Builder
export function createMockRequest(options: {
  user?: Record<string, unknown>
  body?: Record<string, unknown>
  query?: Record<string, unknown>
  headers?: Record<string, unknown>
} = {}) {
  return {
    user: options.user || mockUsers.validUser,
    body: options.body || {},
    query: options.query || {},
    headers: options.headers || {
      'x-api-key': process.env.PAYSTACK_SECRET_KEY,
    },
    json: vi.fn().mockResolvedValue(options.body || {}),
    payload: createMockPayload(),
  }
}

// Mock Payload API
export function createMockPayload() {
  return {
    find: vi.fn().mockResolvedValue({ docs: [] }),
    findByID: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: 'new-id' }),
    update: vi.fn().mockResolvedValue({ id: 'updated-id' }),
    delete: vi.fn().mockResolvedValue({}),
  }
}

// Mock Fetch for Paystack API
export function mockPaystackFetch(response: Record<string, unknown>) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue(response),
  })
}

// Mock Fetch Error
export function mockFetchError() {
  return vi.fn().mockRejectedValue(new Error('Network error'))
}

// Test Data Generators
export function generateSubscription(overrides: Record<string, unknown> = {}) {
  return {
    id: `sub-${Math.random().toString(36).slice(2, 11)}`,
    user: mockUsers.validUser.id,
    plan: mockPlans.gold.id,
    status: 'active',
    paystack_subscription_code: `SUB_${Math.random().toString(36).slice(2, 11).toUpperCase()}`,
    paystack_email_token: `token_${Math.random().toString(36).slice(2, 11)}`,
    current_period_start: new Date().toISOString(),
    next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  }
}

export function generatePaymentEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: `evt-${Math.random().toString(36).slice(2, 11)}`,
    event_type: 'subscription.created',
    event_source: 'paystack',
    user: mockUsers.validUser.id,
    subscription: mockSubscriptions.active.id,
    processed: true,
    processed_at: new Date().toISOString(),
    ...overrides,
  }
}

// Assertion Helpers
export function expectValidSubscription(sub: Record<string, unknown>) {
  expect(sub).toHaveProperty('id')
  expect(sub).toHaveProperty('user')
  expect(sub).toHaveProperty('plan')
  expect(sub).toHaveProperty('status')
  expect(['active', 'non-renewing', 'cancelled', 'expired']).toContain(sub.status)
}

export function expectValidPaymentEvent(event: Record<string, unknown>) {
  expect(event).toHaveProperty('id')
  expect(event).toHaveProperty('event_type')
  expect(event).toHaveProperty('user')
  expect(event).toHaveProperty('processed_at')
}

export function expectPaystackResponse(response: Record<string, unknown>) {
  expect(response).toHaveProperty('status')
  expect(response).toHaveProperty('message')
  if (response.status) {
    expect(response).toHaveProperty('data')
  }
}

// Time Utilities for Testing
export const timeHelpers = {
  now: () => new Date(),
  inDays: (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000),
  daysAgo: (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000),
  toISOString: (date: Date) => date.toISOString(),
}

// Performance Measurement
export class PerformanceTimer {
  private startTime: number = 0

  start() {
    this.startTime = performance.now()
  }

  end(): number {
    return performance.now() - this.startTime
  }

  expectFasterThan(ms: number): boolean {
    const duration = this.end()
    return duration < ms
  }
}
