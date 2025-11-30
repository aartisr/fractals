import type { PayloadHandler } from 'payload'

/**
 * GET /api/superchat/tiers
 * Get all active superchat tiers
 *
 * Returns:
 * - tiers: array of tier configuration objects
 */
export const getSuperchatTiers: PayloadHandler = async (req) => {
  const { payload } = req

  try {
    const tiers = await payload.find({
      collection: 'superchat-tiers',
      where: {
        is_active: {
          equals: true,
        },
      },
      sort: 'min_amount', // Sort by amount ascending
    })

    return Response.json({
      tiers: tiers.docs,
    })
  } catch (error: any) {
    console.error('Error getting superchat tiers:', error)
    return Response.json(
      {
        error: 'Failed to get superchat tiers',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
