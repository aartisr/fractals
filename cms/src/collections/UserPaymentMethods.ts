import type { CollectionConfig } from 'payload'

export const UserPaymentMethods: CollectionConfig = {
  slug: 'user-payment-methods',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'card_type', 'last4', 'is_default', 'is_active'],
    group: 'Payments & Subscriptions',
  },
  access: {
    read: ({ req: { user } }) => {
      // Users can only see their own payment methods
      if (user) {
        return {
          user: {
            equals: user.id,
          },
        }
      }
      return false
    },
  },
  fields: [
    {
      name: 'user',
      label: 'User ID',
      type: 'text',
      required: true,
      admin: {
        description: 'User ID from auth.kailasa.ai',
      },
    },
    // Paystack authorization (REUSABLE)
    {
      name: 'authorization_code',
      label: 'Authorization Code',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'AUTH_xxx from Paystack - used for charging superchat',
      },
    },
    // Card details
    {
      name: 'last4',
      label: 'Last 4 Digits',
      type: 'text',
      required: true,
    },
    {
      name: 'exp_month',
      label: 'Expiry Month',
      type: 'text',
      admin: {
        description: 'MM format',
      },
    },
    {
      name: 'exp_year',
      label: 'Expiry Year',
      type: 'text',
      admin: {
        description: 'YYYY format',
      },
    },
    {
      name: 'card_type',
      label: 'Card Type',
      type: 'text',
      admin: {
        description: 'e.g., visa, mastercard',
      },
    },
    {
      name: 'bank',
      label: 'Bank',
      type: 'text',
      admin: {
        description: 'Issuing bank',
      },
    },
    {
      name: 'brand',
      label: 'Brand',
      type: 'text',
      admin: {
        description: 'Card brand',
      },
    },
    // Status
    {
      name: 'is_default',
      label: 'Default Payment Method',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Use this card for superchat by default',
      },
    },
    {
      name: 'is_active',
      label: 'Active',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Can this payment method be used',
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        // If setting this as default, unset all other defaults for this user
        if (data.is_default && data.user) {
          if (operation === 'create' || operation === 'update') {
            await req.payload.update({
              collection: 'user-payment-methods',
              where: {
                user: {
                  equals: data.user,
                },
                is_default: {
                  equals: true,
                },
              },
              data: {
                is_default: false,
              },
            })
          }
        }
        return data
      },
    ],
  },
}
