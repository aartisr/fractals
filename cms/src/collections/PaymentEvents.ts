import type { CollectionConfig } from 'payload'

export const PaymentEvents: CollectionConfig = {
  slug: 'payment-events',
  admin: {
    useAsTitle: 'event_type',
    defaultColumns: ['event_type', 'event_source', 'processed', 'createdAt'],
    group: 'Payments & Subscriptions',
  },
  access: {
    read: () => true, // Admin only in production
  },
  fields: [
    // Event details
    {
      name: 'event_type',
      label: 'Event Type',
      type: 'text',
      required: true,
      admin: {
        description: 'e.g., subscription.create, charge.success',
      },
    },
    {
      name: 'event_source',
      label: 'Event Source',
      type: 'select',
      required: true,
      options: [
        { label: 'Paystack', value: 'paystack' },
        { label: 'System', value: 'system' },
        { label: 'Admin', value: 'admin' },
      ],
      defaultValue: 'paystack',
    },
    // Related entities
    {
      name: 'user',
      label: 'User ID',
      type: 'text',
      admin: {
        description: 'Related user ID (if applicable)',
      },
    },
    {
      name: 'subscription',
      label: 'Subscription',
      type: 'relationship',
      relationTo: 'user-subscriptions',
      admin: {
        description: 'Related subscription (if applicable)',
      },
    },
    {
      name: 'superchat',
      label: 'Superchat',
      type: 'relationship',
      relationTo: 'superchat-messages',
      admin: {
        description: 'Related superchat (if applicable)',
      },
    },
    // Paystack data
    {
      name: 'paystack_event',
      label: 'Paystack Event Name',
      type: 'text',
      admin: {
        description: 'Original event name from Paystack webhook',
      },
    },
    {
      name: 'paystack_payload',
      label: 'Paystack Payload',
      type: 'json',
      admin: {
        description: 'Full webhook payload from Paystack',
      },
    },
    // Processing
    {
      name: 'processed',
      label: 'Processed',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Has this event been processed',
        position: 'sidebar',
      },
    },
    {
      name: 'processed_at',
      label: 'Processed At',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        condition: (data) => data.processed,
      },
    },
    {
      name: 'error_message',
      label: 'Error Message',
      type: 'textarea',
      admin: {
        description: 'Error message if processing failed',
        condition: (data) => !data.processed,
      },
    },
  ],
}
