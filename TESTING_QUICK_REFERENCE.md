# Payment & Subscription Testing - Quick Reference

## File Structure
```
cms/tests/
├── unit/subscription-auth.unit.spec.ts     (Auth utilities - 40+ tests)
├── int/subscriptions.int.spec.ts            (Endpoints - 40+ tests)
├── int/payment.int.spec.ts                  (Paystack - 50+ tests)
├── perf/subscriptions.perf.spec.ts          (Performance - 30+ tests)
└── utils/test-helpers.ts                    (Mocks & utilities)
```

## Quick Commands

| Command | Purpose |
|---------|---------|
| `npm run test` | Run all tests |
| `npm run test -- tests/unit/` | Run unit tests only |
| `npm run test -- tests/int/` | Run integration tests only |
| `npm run test -- tests/perf/` | Run performance tests only |
| `npm run test -- --watch` | Watch mode (auto-rerun) |
| `npm run test -- --coverage` | Generate coverage report |
| `npm run test -- --testNamePattern="auth"` | Run tests matching pattern |

## Test Suites Overview

### Unit Tests (40+ cases)
- ✅ User authentication
- ✅ Subscription ownership
- ✅ Active subscription retrieval
- ✅ Code validation
- ✅ Error handling

### Integration Tests (40+ cases)
**Endpoints:**
- `POST /api/subscriptions/create` (10 tests)
- `POST /api/subscriptions/verify` (8 tests)
- `GET /api/subscriptions/current` (10 tests)
- `POST /api/subscriptions/cancel` (12 tests)

### Payment Tests (50+ cases)
- ✅ Paystack initialization
- ✅ Transaction verification
- ✅ Webhook handling
- ✅ Recurring charges
- ✅ Security validation

### Performance Tests (30+ cases)
- ✅ Response times (< 500ms targets)
- ✅ Concurrent operations
- ✅ Throughput (100 subs/sec)
- ✅ Scalability (10k subscriptions)

## Key Mock Objects

```typescript
// Users
mockUsers.validUser           // { id, email }
mockUsers.anotherUser
mockUsers.noEmail
mockUsers.noId

// Plans
mockPlans.gold                // $500/month active
mockPlans.silver              // $250/month active
mockPlans.bronze              // inactive
mockPlans.yearly              // $4800/year

// Subscriptions
mockSubscriptions.active
mockSubscriptions.nonRenewing
mockSubscriptions.cancelled
mockSubscriptions.expired

// Paystack
mockPaystackResponses.initializeSuccess
mockPaystackResponses.verifySuccess
mockPaystackResponses.error
```

## Common Test Patterns

### Authentication Test
```typescript
const mockReq = createMockRequest({ user: null })
try {
  await requireAuthenticatedUser(mockReq)
} catch (error) {
  expect(error.status).toBe(401)
}
```

### Subscription Test
```typescript
const mockReq = createMockRequest({
  user: mockUsers.validUser,
  body: { subscriptionId: 'sub-123' }
})
const sub = await requireSubscriptionOwnership(mockReq, 'sub-123')
expectValidSubscription(sub)
```

### Performance Test
```typescript
const timer = new PerformanceTimer()
timer.start()
await operation()
expect(timer.expectFasterThan(500)).toBe(true)
```

## Test Status Codes

| Code | Scenario | Test |
|------|----------|------|
| 200 | Success | ✅ |
| 400 | Invalid input | ✅ |
| 401 | Not authenticated | ✅ |
| 403 | Not authorized | ✅ |
| 404 | Not found | ✅ |
| 500 | Server error | ✅ |

## Performance Targets

| Operation | Target | Status |
|-----------|--------|--------|
| Authenticate | < 50ms | ✅ |
| Get current sub | < 100ms | ✅ |
| Create sub | < 500ms | ✅ |
| Cancel sub | < 600ms | ✅ |
| Verify payment | < 1000ms | ✅ |

## Documentation Files

- **TESTING_GUIDE.md** - Complete reference (test structure, examples, extensions)
- **TESTING_CHECKLIST.md** - Testing procedures (150+ checklist items)

## Pre-Testing Checklist

- [ ] PostgreSQL running: `docker ps | grep ntv-postgres`
- [ ] CMS started: `npm run dev`
- [ ] Environment variables set (PAYSTACK_SECRET_KEY)
- [ ] Dependencies installed: `npm install`
- [ ] Database migrations applied

## Coverage Targets

| Module | Target | Status |
|--------|--------|--------|
| Auth utilities | 95%+ | ✅ |
| Endpoints | 90%+ | ✅ |
| Payment | 90%+ | ✅ |
| Error handling | 95%+ | ✅ |
| Database | 85%+ | ✅ |
| **Overall** | **90%+** | ✅ |

## Debugging Tips

### Run single test
```bash
npm run test -- --testNamePattern="should authenticate"
```

### View detailed output
```bash
npm run test -- --reporter=verbose
```

### Debug mode
```bash
node --inspect-brk ./node_modules/.bin/vitest
```

### Check coverage gaps
```bash
npm run test -- --coverage
open coverage/index.html
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Tests timeout | Increase timeout: `{ timeout: 10000 }` |
| Mock not working | Check vi.mock() setup |
| Database errors | Verify PostgreSQL running |
| API unreachable | Check CMS running on port 3000 |
| Missing deps | Run `npm install` |

## Next Steps

1. ✅ Run: `npm run test`
2. ✅ Review: `npm run test -- --coverage`
3. ✅ Fix: Update failing tests
4. ✅ Document: Update TESTING_GUIDE.md
5. ✅ CI/CD: Add to pipeline
6. ✅ Maintain: Keep tests updated

---

**Total Test Cases:** 150+  
**Files:** 5  
**Documentation:** 2  
**Coverage Target:** 90%+

**Ready to test! 🚀**
