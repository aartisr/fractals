import type { PayloadHandler } from 'payload'
import { requireAuth } from './auth'

/**
 * User authorization error response
 */
export interface AuthError {
  status: number
  message: string
}

/**
 * Subscription ownership error response
 */
export const authErrors = {
  unauthorized: {
    status: 401,
    message: 'Unauthorized - Please log in',
  },
  missingUserData: {
    status: 400,
    message: 'Invalid user data - missing ID or email',
  },
  subscriptionNotFound: {
    status: 404,
    message: 'Subscription not found',
  },
  notSubscriptionOwner: {
    status: 403,
    message: 'Not authorized to access this subscription',
  },
  noActiveSubscription: {
    status: 404,
    message: 'No active subscription found',
  },
  invalidPaystackCode: {
    status: 400,
    message: 'Invalid subscription: missing Paystack subscription code',
  },
}

/**
 * Require authentication - ensures user is logged in
 * Throws if user is not authenticated
 */
export async function requireAuthenticatedUser(req: any) {
  const user = await requireAuth(req)

  if (!user) {
    throw {
      status: authErrors.unauthorized.status,
      message: authErrors.unauthorized.message,
    }
  }

  // Validate user has required fields
  if (!user.id || !user.email) {
    throw {
      status: authErrors.missingUserData.status,
      message: authErrors.missingUserData.message,
    }
  }

  return user
}

/**
 * Require subscription ownership - ensures user owns the subscription
 * Returns the subscription if authorized
 */
export async function requireSubscriptionOwnership(
  req: any,
  subscriptionId: string
) {
  const user = await requireAuthenticatedUser(req)
  const { payload } = req

  try {
    const subscription = await payload.findByID({
      collection: 'user-subscriptions',
      id: subscriptionId,
    })

    if (!subscription) {
      throw {
        status: authErrors.subscriptionNotFound.status,
        message: authErrors.subscriptionNotFound.message,
      }
    }

    // Verify ownership
    if (subscription.user !== String(user.id)) {
      throw {
        status: authErrors.notSubscriptionOwner.status,
        message: authErrors.notSubscriptionOwner.message,
      }
    }

    return subscription
  } catch (error: any) {
    // If it's one of our custom errors, re-throw it
    if (error.status) {
      throw error
    }
    // Otherwise, it's a database/system error
    throw {
      status: 500,
      message: 'Failed to fetch subscription',
    }
  }
}

/**
 * Get user's active subscription
 * Returns the subscription if found, throws if none exists
 */
export async function getUserActiveSubscription(req: any) {
  const user = await requireAuthenticatedUser(req)
  const { payload } = req

  try {
    const subscriptions = await payload.find({
      collection: 'user-subscriptions',
      where: {
        and: [
          {
            user: {
              equals: String(user.id),
            },
          },
          {
            status: {
              in: ['active', 'non-renewing'],
            },
          },
        ],
      },
      limit: 1,
      depth: 2,
    })

    if (subscriptions.docs.length === 0) {
      throw {
        status: authErrors.noActiveSubscription.status,
        message: authErrors.noActiveSubscription.message,
      }
    }

    return subscriptions.docs[0]
  } catch (error: any) {
    if (error.status) {
      throw error
    }
    throw {
      status: 500,
      message: 'Failed to fetch subscriptions',
    }
  }
}

/**
 * Validate Paystack subscription code exists
 */
export function validatePaystackCode(subscription: any): void {
  if (!subscription.paystack_subscription_code) {
    throw {
      status: authErrors.invalidPaystackCode.status,
      message: authErrors.invalidPaystackCode.message,
    }
  }
}

/**
 * Error handler for async endpoints
 * Converts auth errors to proper Response objects
 */
export function handleAuthError(error: any) {
  if (error.status && error.message) {
    return Response.json({ error: error.message }, { status: error.status })
  }
  console.error('Unexpected error:', error)
  return Response.json(
    { error: 'An unexpected error occurred' },
    { status: 500 }
  )
}
