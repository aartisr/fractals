import type { CollectionConfig } from 'payload'

export const SubscriptionTransactions: CollectionConfig = {
  slug: 'subscription-transactions',
  admin: {
    useAsTitle: 'transaction_reference',
    defaultColumns: ['subscription', 'user', 'amount', 'status', 'createdAt'],
    group: 'Payments & Subscriptions',
  },
  access: {
    read: ({ req: { user } }) => {
      // Users can only see their own transactions
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
      name: 'subscription',
      label: 'Subscription',
      type: 'relationship',
      relationTo: 'user-subscriptions',
      required: true,
    },
    {
      name: 'user',
      label: 'User ID',
      type: 'text',
      required: true,
      admin: {
        description: 'User ID from auth.kailasa.ai',
      },
    },
    // Transaction details
    {
      name: 'transaction_reference',
      label: 'Transaction Reference',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Unique reference from Paystack',
      },
    },
    {
      name: 'amount',
      label: 'Amount (cents)',
      type: 'number',
      required: true,
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { label: 'Success', value: 'success' },
        { label: 'Failed', value: 'failed' },
        { label: 'Pending', value: 'pending' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    // Paystack response
    {
      name: 'paystack_transaction_id',
      label: 'Paystack Transaction ID',
      type: 'number',
    },
    {
      name: 'paystack_response',
      label: 'Paystack Response',
      type: 'json',
      admin: {
        description: 'Full webhook data from Paystack',
      },
    },
    {
      name: 'gateway_response',
      label: 'Gateway Response',
      type: 'text',
      admin: {
        description: 'Response message from payment gateway',
      },
    },
    // Fees
    {
      name: 'fees',
      label: 'Fees (cents)',
      type: 'number',
      admin: {
        description: 'Transaction fees charged by Paystack',
      },
    },
    {
      name: 'net_amount',
      label: 'Net Amount (cents)',
      type: 'number',
      admin: {
        description: 'Amount after fees',
      },
    },
  ],
}
