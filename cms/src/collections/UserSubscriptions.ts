import type { CollectionConfig } from 'payload'

export const UserSubscriptions: CollectionConfig = {
  slug: 'user-subscriptions',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'plan', 'status', 'next_payment_date'],
    group: 'Payments & Subscriptions',
    preview: async (data: Record<string, unknown>) => {
      const planName = (data.plan as Record<string, unknown>)?.name || 'Unknown Plan'
      return `${data.user} - ${planName}`
    },
  },
  access: {
    read: ({ req: { user } }) => {
      // Users can only see their own subscriptions
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
    {
      name: 'plan',
      label: 'Subscription Plan',
      type: 'relationship',
      relationTo: 'subscription-plans',
      required: true,
      admin: {
        position: 'sidebar',
        description: 'Click to view plan details and features',
        allowCreate: false,
      },
    },
    // Paystack details
    {
      name: 'paystack_subscription_code',
      label: 'Paystack Subscription Code',
      type: 'text',
      unique: true,
      admin: {
        description: 'SUB_xxx from Paystack',
      },
    },
    {
      name: 'paystack_customer_code',
      label: 'Paystack Customer Code',
      type: 'text',
      admin: {
        description: 'CUS_xxx from Paystack',
      },
    },
    {
      name: 'paystack_authorization_code',
      label: 'Paystack Authorization Code',
      type: 'text',
      admin: {
        description: 'AUTH_xxx from Paystack',
      },
    },
    {
      name: 'paystack_email_token',
      label: 'Paystack Email Token',
      type: 'text',
      admin: {
        description: 'Email token for generating management links',
      },
    },
    // Status
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Non-Renewing', value: 'non-renewing' },
        { label: 'Expired', value: 'expired' },
      ],
      defaultValue: 'active',
      admin: {
        position: 'sidebar',
      },
    },
    // Billing periods
    {
      name: 'current_period_start',
      label: 'Current Period Start',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'current_period_end',
      label: 'Current Period End',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'next_payment_date',
      label: 'Next Payment Date',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: 'When the next automatic charge will occur',
      },
    },
    {
      name: 'cancelled_at',
      label: 'Cancelled At',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        condition: (data) => data.status === 'cancelled',
      },
    },
    // Payment method details
    {
      name: 'last4',
      label: 'Card Last 4 Digits',
      type: 'text',
      admin: {
        description: 'Last 4 digits of payment card',
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
      name: 'card_bank',
      label: 'Card Bank',
      type: 'text',
      admin: {
        description: 'Issuing bank',
      },
    },
  ],
}
