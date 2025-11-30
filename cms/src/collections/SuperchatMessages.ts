import type { CollectionConfig } from 'payload'

export const SuperchatMessages: CollectionConfig = {
  slug: 'superchat-messages',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'stream', 'amount', 'tier', 'status', 'createdAt'],
    group: 'Payments & Subscriptions',
  },
  access: {
    read: () => true, // Public - superchats are shown in live chat
  },
  fields: [
    // User & stream
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
      name: 'stream',
      label: 'Live Stream',
      type: 'relationship',
      relationTo: 'live-streams',
      required: true,
    },
    // Message
    {
      name: 'message',
      label: 'Message',
      type: 'textarea',
      required: true,
      maxLength: 500,
      admin: {
        description: 'Superchat message (max 500 characters)',
      },
    },
    {
      name: 'amount',
      label: 'Amount (cents)',
      type: 'number',
      required: true,
      admin: {
        description: 'Amount in cents (variable amount)',
      },
    },
    {
      name: 'currency',
      label: 'Currency',
      type: 'text',
      defaultValue: 'USD',
      required: true,
    },
    // Display styling (auto-calculated based on amount)
    {
      name: 'highlight_color',
      label: 'Highlight Color',
      type: 'text',
      admin: {
        description: 'Auto-calculated hex color based on amount',
      },
    },
    {
      name: 'pin_duration_seconds',
      label: 'Pin Duration (seconds)',
      type: 'number',
      admin: {
        description: 'How long to pin the message',
      },
    },
    {
      name: 'tier',
      label: 'Tier',
      type: 'select',
      options: [
        { label: 'Blue (<$10)', value: 'blue' },
        { label: 'Gold ($10+)', value: 'gold' },
        { label: 'Orange ($20+)', value: 'orange' },
        { label: 'Pink ($50+)', value: 'pink' },
        { label: 'Red ($100+)', value: 'red' },
      ],
      admin: {
        description: 'Auto-calculated tier based on amount',
        position: 'sidebar',
      },
    },
    // Payment details
    {
      name: 'transaction_reference',
      label: 'Transaction Reference',
      type: 'text',
      unique: true,
    },
    {
      name: 'paystack_authorization_code',
      label: 'Paystack Authorization Code',
      type: 'text',
      admin: {
        description: 'AUTH_xxx used for this charge',
      },
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Success', value: 'success' },
        { label: 'Failed', value: 'failed' },
        { label: 'Refunded', value: 'refunded' },
      ],
      defaultValue: 'pending',
      admin: {
        position: 'sidebar',
      },
    },
    // Visibility
    {
      name: 'is_visible',
      label: 'Visible',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Show this superchat in the chat',
      },
    },
    {
      name: 'is_pinned',
      label: 'Pinned',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Currently pinned at top of chat',
      },
    },
    {
      name: 'pinned_until',
      label: 'Pinned Until',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: 'Auto-calculated: when to unpin',
        condition: (data) => data.is_pinned,
      },
    },
  ],
}
