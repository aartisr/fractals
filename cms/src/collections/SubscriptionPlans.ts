import type { CollectionConfig } from 'payload'

export const SubscriptionPlans: CollectionConfig = {
  slug: 'subscription-plans',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'interval', 'amount', 'is_active'],
    group: 'Payments & Subscriptions',
  },
  access: {
    read: () => true, // Public - users need to see plans
  },
  fields: [
    {
      name: 'name',
      label: 'Plan Name',
      type: 'text',
      required: true,
      admin: {
        description: 'e.g., "Premium Monthly", "Premium Yearly"',
      },
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Brief description of what this plan includes',
      },
    },
    {
      name: 'interval',
      label: 'Billing Interval',
      type: 'select',
      required: true,
      options: [
        { label: 'Monthly', value: 'monthly' },
        { label: 'Yearly', value: 'yearly' },
      ],
      defaultValue: 'monthly',
    },
    {
      name: 'amount',
      label: 'Amount (in cents)',
      type: 'number',
      required: true,
      admin: {
        description: 'Amount in cents (e.g., 999 = $9.99)',
      },
    },
    {
      name: 'currency',
      label: 'Currency',
      type: 'text',
      defaultValue: 'USD',
      required: true,
    },
    {
      name: 'paystack_plan_code',
      label: 'Paystack Plan Code',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Plan code from Paystack (e.g., PLN_xxx)',
      },
    },
    {
      name: 'features',
      label: 'Features',
      type: 'array',
      fields: [
        {
          name: 'feature',
          type: 'text',
          required: true,
        },
      ],
      admin: {
        description: 'List of features included in this plan',
      },
    },
    {
      name: 'is_active',
      label: 'Active',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Only active plans are shown to users',
      },
    },
    {
      name: 'display_order',
      label: 'Display Order',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Order in which plans are displayed (lower = first)',
      },
    },
  ],
}
