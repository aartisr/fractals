# Payment & Subscription Testing Checklist

## Pre-Testing Setup

- [ ] PostgreSQL running: `docker ps | grep ntv-postgres`
- [ ] CMS running: `npm run dev` (port 3000)
- [ ] Environment variables set (PAYSTACK_SECRET_KEY, etc.)
- [ ] Dependencies installed: `npm install`
- [ ] Database migrations applied

## Unit Tests - Subscription Auth

### Authentication (`requireAuthenticatedUser`)
- [ ] Returns user if authenticated with valid data
- [ ] Throws 401 if user is null
- [ ] Throws 400 if user missing ID
- [ ] Throws 400 if user missing email
- [ ] Validates user.id is defined
- [ ] Validates user.email is defined

### Subscription Ownership (`requireSubscriptionOwnership`)
- [ ] Throws 404 if subscription not found
- [ ] Throws 403 if user doesn't own subscription
- [ ] Returns subscription if user is owner
- [ ] Verifies ownership check is enforced
- [ ] Handles database errors gracefully

### Active Subscription (`getUserActiveSubscription`)
- [ ] Throws 404 if no active subscription found
- [ ] Returns first active subscription
- [ ] Returns only 'active' or 'non-renewing' status
- [ ] Includes plan details (depth: 2)
- [ ] Sorts by creation date correctly
- [ ] Handles no results gracefully

### Validation (`validatePaystackCode`)
- [ ] Throws error if code is missing
- [ ] Throws error if code is empty string
- [ ] Throws error if code is null/undefined
- [ ] Passes if code exists
- [ ] Proper error status (400)

### Error Handling (`handleAuthError`)
- [ ] Returns correct status codes
- [ ] Returns error message in response
- [ ] Handles custom auth errors
- [ ] Handles unexpected errors
- [ ] Returns 500 for unknown errors

## Integration Tests - Subscription Endpoints

### POST /api/subscriptions/create

#### Validation
- [ ] Returns 401 if user not authenticated
- [ ] Returns 400 if planId missing
- [ ] Returns 404 if plan not found
- [ ] Returns 404 if plan is inactive
- [ ] Returns 400 if user has active subscription
- [ ] Returns 400 if planId is invalid type

#### Success Cases
- [ ] Returns 200 with success flag
- [ ] Returns Paystack authorization_url
- [ ] Returns access_code
- [ ] Returns reference number
- [ ] Authorization URL contains paystack.com
- [ ] Creates payment event in database
- [ ] Includes user metadata in Paystack request
- [ ] Includes plan metadata in Paystack request

#### Paystack Integration
- [ ] Uses correct Paystack endpoint
- [ ] Uses Bearer token authentication
- [ ] Sends correct amount in cents
- [ ] Includes user email
- [ ] Includes plan information in metadata
- [ ] Handles Paystack errors gracefully
- [ ] Doesn't create subscription on failed init

### POST /api/subscriptions/verify

#### Validation
- [ ] Returns 401 if user not authenticated
- [ ] Returns 400 if reference missing
- [ ] Returns 400 if reference is invalid

#### Paystack Verification
- [ ] Calls Paystack verify endpoint
- [ ] Uses correct reference format
- [ ] Handles Paystack timeout
- [ ] Handles Paystack errors
- [ ] Returns error if payment failed

#### Subscription Creation
- [ ] Creates subscription on successful payment
- [ ] Sets correct user ID
- [ ] Sets correct plan ID
- [ ] Sets status to 'active'
- [ ] Sets paystack_subscription_code
- [ ] Sets current_period_start date
- [ ] Sets next_payment_date
- [ ] Creates payment event
- [ ] Returns subscription data in response

### GET /api/subscriptions/current

#### Authentication
- [ ] Returns 401 if user not authenticated

#### No Subscription
- [ ] Returns 200 with null subscription if none exists
- [ ] Doesn't return error, just null

#### Active Subscription
- [ ] Returns user's active subscription
- [ ] Includes plan details
- [ ] Includes plan name
- [ ] Includes plan features
- [ ] Includes payment method info
- [ ] Includes next payment date
- [ ] Has correct depth (includes relationships)

#### Paystack Sync
- [ ] Syncs status from Paystack if code exists
- [ ] Updates local status if changed
- [ ] Updates next_payment_date from Paystack
- [ ] Doesn't fail if Paystack unavailable
- [ ] Logs Paystack sync errors
- [ ] Continues to return subscription even if sync fails

### POST /api/subscriptions/cancel

#### Validation
- [ ] Returns 401 if user not authenticated
- [ ] Returns 404 if subscription not found (by ID)
- [ ] Returns 403 if user doesn't own subscription
- [ ] Returns 404 if no active subscription (no ID provided)
- [ ] Returns 400 if subscription missing Paystack code

#### Paystack Integration
- [ ] Calls Paystack disable endpoint
- [ ] Uses correct subscription code
- [ ] Uses correct email token
- [ ] Handles Paystack errors
- [ ] Doesn't update local if Paystack fails
- [ ] Returns error details to user

#### Local Update
- [ ] Updates status to 'cancelled'
- [ ] Sets cancelled_at timestamp
- [ ] Uses current date/time
- [ ] Creates cancellation event
- [ ] Includes user ID in event
- [ ] Includes subscription ID in event
- [ ] Returns updated subscription

#### Response
- [ ] Returns 200 with success flag
- [ ] Returns updated subscription object
- [ ] Status shows 'cancelled'
- [ ] cancelled_at is set

## Integration Tests - Payment Processing

### Paystack Transaction Initialization
- [ ] Uses correct endpoint (transaction/initialize)
- [ ] Uses Bearer token authentication
- [ ] Includes email address
- [ ] Includes amount in cents
- [ ] Includes metadata with user_id
- [ ] Includes metadata with plan_id
- [ ] Includes callback URL

### Transaction Verification
- [ ] Uses correct endpoint (transaction/verify/{ref})
- [ ] Extracts metadata from response
- [ ] Validates transaction status
- [ ] Handles 'success' status
- [ ] Handles 'failed' status
- [ ] Handles 'pending' status

### Recurring Charges
- [ ] Creates recurring charge on subscription plan
- [ ] Uses subscription code
- [ ] Uses email token
- [ ] Retries failed charges
- [ ] Updates next_payment_date after charge
- [ ] Logs charge attempts

### Webhook Processing
- [ ] Handles subscription.create webhook
- [ ] Handles charge.success webhook
- [ ] Handles charge.failed webhook
- [ ] Handles subscription.disable webhook
- [ ] Verifies webhook signature
- [ ] Processes idempotently (no duplicates)
- [ ] Logs webhook receipt

### Error Handling
- [ ] Handles timeout gracefully (1000ms limit)
- [ ] Retries transient failures
- [ ] Uses exponential backoff
- [ ] Doesn't create duplicates on retry
- [ ] Logs errors without exposing to user
- [ ] Alerts admin on suspicious patterns

### Security
- [ ] Validates API key is loaded
- [ ] Uses HTTPS for all Paystack communication
- [ ] Doesn't log sensitive data
- [ ] Validates webhook signatures
- [ ] Doesn't expose auth tokens in logs
- [ ] Rate limits payment endpoints

## Performance Tests

### Response Times
- [ ] Create subscription: < 500ms
- [ ] Get current subscription: < 100ms
- [ ] Cancel subscription: < 600ms
- [ ] Verify transaction: < 1000ms
- [ ] Authenticate user: < 50ms

### Concurrent Operations
- [ ] 10 simultaneous fetches: < 200ms total
- [ ] 5 concurrent creations: < 500ms total
- [ ] Mixed 10 operations: < 500ms total

### Throughput
- [ ] Process 100 subscriptions/second
- [ ] Handle webhook burst (50 simultaneous): < 2000ms

### Scalability
- [ ] Handle 10,000 subscriptions efficiently
- [ ] Pagination doesn't degrade with dataset size
- [ ] Plan cache hits faster than fresh queries
- [ ] Query indexes working correctly

### Memory
- [ ] No leaks on repeated operations
- [ ] Large subscription lists handled efficiently
- [ ] Memory increase < 10MB on 100 operations
- [ ] Proper cleanup after operations

## Authorization Tests

### All Endpoints
- [ ] Apply auth checks to create
- [ ] Apply auth checks to verify
- [ ] Apply auth checks to current
- [ ] Apply auth checks to cancel
- [ ] Reject requests without token
- [ ] Validate user ID from auth.kailasa.ai
- [ ] Validate user email from auth.kailasa.ai

### Ownership Enforcement
- [ ] Can't cancel others' subscriptions
- [ ] Can't view others' subscriptions
- [ ] Can't verify others' payments

## Error Response Tests

### Format Consistency
- [ ] All errors have 'error' field
- [ ] All errors have status code
- [ ] Error messages are descriptive
- [ ] Error messages don't expose internals
- [ ] Proper HTTP status codes used

### Common Scenarios
- [ ] 401 - Not authenticated
- [ ] 400 - Invalid input
- [ ] 403 - Not authorized
- [ ] 404 - Not found
- [ ] 500 - Server error

## Database Tests

### Data Integrity
- [ ] Subscriptions linked to correct users
- [ ] Subscriptions linked to correct plans
- [ ] Payment events created correctly
- [ ] Timestamps are accurate
- [ ] Status values are valid

### Concurrent Access
- [ ] No race conditions on creation
- [ ] No race conditions on updates
- [ ] Proper locking/transactions
- [ ] Consistent final state

## Mock User Testing

### Mock Auth (dev mode)
- [ ] Works with USE_MOCK_AUTH=true
- [ ] Uses mock user data
- [ ] Doesn't call auth.kailasa.ai
- [ ] Returns consistent user ID
- [ ] Returns consistent email

### Real Auth (production mode)
- [ ] Works with actual auth.kailasa.ai
- [ ] Validates session token
- [ ] Retrieves real user data
- [ ] Handles auth service errors
- [ ] Falls back gracefully if needed

## Manual Testing Checklist

### Create Subscription Flow
- [ ] User can see plan options
- [ ] Clicking subscribe redirects to Paystack
- [ ] Payment page loads correctly
- [ ] Test card: 4084 0343 1234 5010, exp: 01/25, CVV: 123
- [ ] After payment, redirected to callback
- [ ] Subscription appears in database
- [ ] Subscription status is 'active'
- [ ] Payment event created

### View Current Subscription
- [ ] Can view current subscription
- [ ] Shows plan name
- [ ] Shows plan features
- [ ] Shows next payment date
- [ ] Shows payment method (last 4 digits)

### Cancel Subscription
- [ ] Can cancel active subscription
- [ ] Confirms cancellation
- [ ] Disables on Paystack
- [ ] Status updates to 'cancelled'
- [ ] cancelled_at is set
- [ ] Can't use cancelled subscription

### Error Scenarios
- [ ] Insufficient funds error shown
- [ ] Invalid card rejected
- [ ] Timeout handled gracefully
- [ ] Paystack down handled gracefully
- [ ] Invalid data rejected

## Cleanup

- [ ] Remove test data from database
- [ ] Clear test logs
- [ ] Reset mock data
- [ ] Stop running services

## Sign-off

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All performance tests meet targets
- [ ] Coverage requirements met
- [ ] Manual testing complete
- [ ] Code review approved
- [ ] Ready for deployment

---

**Test Date:** _______________  
**Tester:** _______________  
**Status:** [ ] Pass [ ] Fail  
**Notes:** _______________________________________________
