# Comprehensive Payment & Subscription Testing Guide

## Overview

This document describes the comprehensive test suite for the payment and subscription system, covering unit tests, integration tests, and performance tests.

## Test Structure

```
cms/tests/
├── unit/
│   └── subscription-auth.unit.spec.ts        # Auth utilities tests
├── int/
│   ├── subscriptions.int.spec.ts              # Endpoint integration tests
│   └── payment.int.spec.ts                    # Paystack integration tests
├── perf/
│   └── subscriptions.perf.spec.ts             # Performance & load tests
└── utils/
    └── test-helpers.ts                        # Mocks & utilities
```

## Running Tests

### All Tests
```bash
npm run test
```

### Unit Tests Only
```bash
npm run test -- tests/unit/
```

### Integration Tests Only
```bash
npm run test -- tests/int/
```

### Performance Tests Only
```bash
npm run test -- tests/perf/
```

### Single Test File
```bash
npm run test -- tests/int/subscriptions.int.spec.ts
```

### Watch Mode
```bash
npm run test -- --watch
```

### Coverage Report
```bash
npm run test -- --coverage
```

## Test Categories

### 1. Unit Tests (`tests/unit/subscription-auth.unit.spec.ts`)

**Purpose:** Test individual auth utility functions in isolation

**Coverage:**
- `requireAuthenticatedUser()` - User authentication validation
- `requireSubscriptionOwnership()` - Ownership verification
- `getUserActiveSubscription()` - Active subscription retrieval
- `validatePaystackCode()` - Code validation
- `handleAuthError()` - Error response handling
- `authErrors` - Error definitions

**Running:**
```bash
npm run test -- tests/unit/subscription-auth.unit.spec.ts
```

**Key Tests:**
- ✅ Rejects unauthenticated requests (401)
- ✅ Rejects incomplete user data (400)
- ✅ Enforces subscription ownership (403)
- ✅ Validates required codes exist
- ✅ Converts errors to HTTP responses

### 2. Integration Tests

#### Subscription Endpoints (`tests/int/subscriptions.int.spec.ts`)

**Tests All Endpoints:**
- `POST /api/subscriptions/create` - Initiate subscription
- `POST /api/subscriptions/verify` - Verify payment
- `GET /api/subscriptions/current` - Get active subscription
- `POST /api/subscriptions/cancel` - Cancel subscription

**Key Test Scenarios:**
```
CREATE:
✅ Requires authentication (401)
✅ Validates plan exists (404)
✅ Prevents duplicate active subscriptions (400)
✅ Returns Paystack URL and access code
✅ Logs payment event

VERIFY:
✅ Requires authentication (401)
✅ Validates with Paystack API
✅ Creates subscription on success
✅ Handles Paystack errors

CURRENT:
✅ Returns null if no active subscription
✅ Returns subscription with plan details
✅ Syncs status from Paystack
✅ Updates local state if changed

CANCEL:
✅ Enforces user ownership (403)
✅ Calls Paystack disable API
✅ Updates status to cancelled
✅ Creates cancellation event
✅ Returns updated subscription
```

#### Payment Processing (`tests/int/payment.int.spec.ts`)

**Tests Paystack Integration:**
- Transaction initialization
- Transaction verification
- Subscription creation from payment
- Webhook processing
- Recurring charges
- Error handling & recovery
- Security validations
- Audit trail

**Running:**
```bash
npm run test -- tests/int/payment.int.spec.ts
```

### 3. Performance Tests (`tests/perf/subscriptions.perf.spec.ts`)

**Performance Benchmarks:**

```
RESPONSE TIMES:
├─ Create subscription: < 500ms
├─ Get current subscription: < 100ms
├─ Cancel subscription: < 600ms
├─ Verify transaction: < 1000ms
└─ Authenticate user: < 50ms

THROUGHPUT:
├─ Process 100 subscriptions/second
├─ Handle 10 concurrent fetches
├─ Handle 5 concurrent creations
└─ Handle webhook bursts (50 simultaneous)

SCALABILITY:
├─ 10,000 subscriptions in database
├─ Pagination support
├─ Plan caching
└─ Connection pooling

MEMORY:
├─ No leaks on repeated operations
├─ Efficient bulk operations
└─ Proper cleanup
```

**Running Performance Tests:**
```bash
npm run test -- tests/perf/subscriptions.perf.spec.ts --reporter=verbose
```

## Test Utilities & Mocks

### Mock Objects (`tests/utils/test-helpers.ts`)

**Available Mocks:**

```typescript
// Users
mockUsers.validUser          // Complete user with id & email
mockUsers.anotherUser        // Different user
mockUsers.noEmail            // Missing email
mockUsers.noId               // Missing id

// Plans
mockPlans.gold               // Active gold plan
mockPlans.silver             // Active silver plan
mockPlans.bronze             // Inactive bronze plan
mockPlans.yearly             // Yearly gold plan

// Subscriptions
mockSubscriptions.active     // Active subscription
mockSubscriptions.nonRenewing // Non-renewing status
mockSubscriptions.cancelled  // Cancelled subscription
mockSubscriptions.expired    // Expired subscription

// Paystack Responses
mockPaystackResponses.initializeSuccess
mockPaystackResponses.verifySuccess
mockPaystackResponses.verifyFailed
mockPaystackResponses.getSubscriptionSuccess
mockPaystackResponses.disableSubscriptionSuccess
mockPaystackResponses.error
```

### Helper Functions

```typescript
// Request Builder
createMockRequest({ user, body, query, headers })

// Payload API Mock
createMockPayload()

// Fetch Mocks
mockPaystackFetch(response)
mockFetchError()

// Data Generators
generateSubscription(overrides)
generatePaymentEvent(overrides)

// Assertion Helpers
expectValidSubscription(sub)
expectValidPaymentEvent(event)
expectPaystackResponse(response)

// Performance Measurement
new PerformanceTimer()
  .start()
  // ... operation ...
  .expectFasterThan(500)
```

## Example Test Usage

### Unit Test Example
```typescript
import { describe, it, expect } from 'vitest'
import { requireAuthenticatedUser } from '@/utils/subscription-auth'

describe('Authentication', () => {
  it('should reject unauthenticated requests', async () => {
    const mockReq = createMockRequest({ user: null })
    
    try {
      await requireAuthenticatedUser(mockReq)
      expect.fail('Should throw')
    } catch (error: any) {
      expect(error.status).toBe(401)
    }
  })
})
```

### Integration Test Example
```typescript
import { mockSubscriptions, generatePaymentEvent } from '@/tests/utils/test-helpers'

describe('Subscription Cancellation', () => {
  it('should cancel active subscription', async () => {
    const event = generatePaymentEvent({
      event_type: 'subscription.cancelled',
      subscription: mockSubscriptions.active.id,
    })
    
    expectValidPaymentEvent(event)
    expect(event.event_type).toBe('subscription.cancelled')
  })
})
```

### Performance Test Example
```typescript
import { PerformanceTimer } from '@/tests/utils/test-helpers'

describe('Subscription Fetch Performance', () => {
  it('should fetch subscription in < 100ms', async () => {
    const timer = new PerformanceTimer()
    timer.start()
    
    // ... perform fetch ...
    
    expect(timer.expectFasterThan(100)).toBe(true)
  })
})
```

## Test Coverage Goals

### Target Coverage by Module
```
subscription-auth.ts:        95%+ coverage
subscription endpoints:       90%+ coverage
payment processing:           90%+ coverage
error handling:               95%+ coverage
database operations:          85%+ coverage
```

### Running Coverage Report
```bash
npm run test -- --coverage

# View HTML report
open coverage/index.html
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run Tests
  run: npm run test
  
- name: Run Integration Tests
  run: npm run test -- tests/int/
  
- name: Check Coverage
  run: npm run test -- --coverage
  
- name: Performance Tests
  run: npm run test -- tests/perf/ --reporter=verbose
```

## Common Testing Scenarios

### Testing Authentication Failures
```typescript
const mockReq = createMockRequest({ user: null })
// or
const mockReq = createMockRequest({ 
  user: { id: '123', email: null } 
})
```

### Testing Database Operations
```typescript
const mockPayload = createMockPayload()
mockPayload.findByID.mockResolvedValue(mockSubscriptions.active)
```

### Testing Paystack Integration
```typescript
global.fetch = mockPaystackFetch(
  mockPaystackResponses.initializeSuccess
)
```

### Testing Concurrency
```typescript
const promises = Array(10)
  .fill(null)
  .map(() => performOperation())

await Promise.all(promises)
```

## Debugging Tests

### Run Single Test
```bash
npm run test -- --testNamePattern="should authenticate user"
```

### Run Tests in Debug Mode
```bash
node --inspect-brk ./node_modules/.bin/vitest
```

### View Detailed Output
```bash
npm run test -- --reporter=verbose
```

## Test Maintenance

### Before Merging PRs
1. ✅ All unit tests pass
2. ✅ All integration tests pass
3. ✅ Coverage maintained or improved
4. ✅ Performance tests pass
5. ✅ No linting errors

### Continuous Monitoring
- Run tests on every commit
- Track coverage trends
- Monitor performance regressions
- Alert on test failures

## Extending Tests

### Adding New Auth Check
1. Add test case to `unit/subscription-auth.unit.spec.ts`
2. Update `subscription-auth.ts` utility
3. Add integration test to relevant endpoint test
4. Update this documentation

### Adding New Endpoint
1. Create endpoint file
2. Add unit tests for auth logic
3. Add integration test for endpoint
4. Add performance test if needed
5. Update error handling tests

### Adding New Paystack Integration
1. Add test case to `int/payment.int.spec.ts`
2. Mock Paystack response in `test-helpers.ts`
3. Test error scenarios
4. Test security aspects
5. Add performance test if applicable

## Resources

- **Vitest Documentation:** https://vitest.dev
- **Payload CMS Testing:** https://payloadcms.com/docs/testing
- **Paystack API Reference:** https://paystack.com/docs/api
- **Testing Library:** https://testing-library.com

## Notes

- All tests should be deterministic and not depend on external services
- Use mocks and fixtures to isolate functionality
- Performance thresholds are targets, not hard limits
- Update tests when adding new features
- Keep test data realistic but safe
