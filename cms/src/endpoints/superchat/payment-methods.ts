import type { PayloadHandler } from 'payload'
import { requireAuthenticatedUser, handleAuthError } from '@/utils/subscription-auth'

/**
 * GET /api/superchat/payment-methods
 * Get user's saved payment methods
 *
 * Returns:
 * - paymentMethods: array of payment method objects
 */
export const getPaymentMethods: PayloadHandler = async (req) => {
  try {
    const user = await requireAuthenticatedUser(req)
    const { payload } = req

    const paymentMethods = await payload.find({
      collection: 'user-payment-methods',
      where: {
        and: [
          {
            user: {
              equals: String(user.id),
            },
          },
          {
            is_active: {
              equals: true,
            },
          },
        ],
      },
      sort: '-is_default', // Default payment method first
    })

    // Transform to match frontend expectations
    const transformedMethods = paymentMethods.docs.map(pm => ({
      id: pm.id,
      authorization_code: pm.authorization_code,
      card_brand: pm.card_type || pm.brand || 'card',
      card_last4: pm.last4,
      card_exp_month: pm.exp_month,
      card_exp_year: pm.exp_year,
      bank: pm.bank,
      is_default: pm.is_default,
      is_active: pm.is_active,
    }))

    return Response.json({
      paymentMethods: transformedMethods,
    }, { status: 200 })
  } catch (error) {
    console.error('Error getting payment methods:', error)
    return handleAuthError(error) || Response.json({
      error: 'Failed to get payment methods',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

/**
 * POST /api/superchat/payment-methods/set-default
 * Set a payment method as default
 *
 * Request body:
 * - paymentMethodId: ID of the payment method to set as default
 *
 * Returns:
 * - success: boolean
 * - paymentMethod: updated payment method object
 */
export const setDefaultPaymentMethod: PayloadHandler = async (req) => {
  try {
    const user = await requireAuthenticatedUser(req)
    const { payload } = req
    const body = req.json ? await req.json() : {}
    const { paymentMethodId } = body

    if (!paymentMethodId) {
      return Response.json({ error: 'paymentMethodId is required' }, { status: 400 })
    }

    const paymentMethod = await payload.findByID({
      collection: 'user-payment-methods',
      id: paymentMethodId,
    })

    // Verify ownership
    if (paymentMethod.user !== String(user.id)) {
      return Response.json({ error: 'Not authorized to modify this payment method' }, { status: 403 })
    }

    // Update payment method (hook will handle unsetting other defaults)
    const updatedPaymentMethod = await payload.update({
      collection: 'user-payment-methods',
      id: paymentMethodId,
      data: {
        is_default: true,
      },
    })

    return Response.json({
      success: true,
      paymentMethod: updatedPaymentMethod,
    }, { status: 200 })
  } catch (error) {
    console.error('Error setting default payment method:', error)
    return handleAuthError(error) || Response.json({
      error: 'Failed to set default payment method',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

/**
 * DELETE /api/superchat/payment-methods/:id
 * Delete (deactivate) a payment method
 *
 * Returns:
 * - success: boolean
 */
export const deletePaymentMethod: PayloadHandler = async (req) => {
  try {
    const user = await requireAuthenticatedUser(req)
    const { payload } = req
    // Extract ID from URL path
    const url = new URL(req.url || '', 'http://localhost')
    const pathParts = url.pathname.split('/')
    const id = pathParts[pathParts.length - 1]

    if (!id) {
      return Response.json({ error: 'Payment method ID is required' }, { status: 400 })
    }

    const paymentMethod = await payload.findByID({
      collection: 'user-payment-methods',
      id: id,
    })

    // Verify ownership
    if (paymentMethod.user !== String(user.id)) {
      return Response.json({ error: 'Not authorized to delete this payment method' }, { status: 403 })
    }

    // Deactivate instead of deleting for audit purposes
    await payload.update({
      collection: 'user-payment-methods',
      id: id,
      data: {
        is_active: false,
        is_default: false,
      },
    })

    return Response.json({
      success: true,
    }, { status: 200 })
  } catch (error) {
    console.error('Error deleting payment method:', error)
    return handleAuthError(error) || Response.json({
      error: 'Failed to delete payment method',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
