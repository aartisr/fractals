import type { CollectionConfig } from 'payload'

export const SuperchatTiers: CollectionConfig = {
  slug: 'superchat-tiers',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'min_amount', 'color', 'pin_duration'],
    group: 'Payments & Subscriptions',
    description: 'Configure superchat tier levels and their visual styling',
  },
  access: {
    read: () => true, // Public - needed for frontend to display tiers
  },
  fields: [
    {
      name: 'name',
      label: 'Tier Name',
      type: 'text',
      required: true,
      admin: {
        description: 'e.g., "Blue", "Gold", "Red"',
      },
    },
    {
      name: 'tier_id',
      label: 'Tier ID',
      type: 'select',
      required: true,
      unique: true,
      options: [
        { label: 'Blue', value: 'blue' },
        { label: 'Gold', value: 'gold' },
        { label: 'Orange', value: 'orange' },
        { label: 'Pink', value: 'pink' },
        { label: 'Red', value: 'red' },
      ],
      admin: {
        description: 'Unique identifier for this tier',
      },
    },
    {
      name: 'min_amount',
      label: 'Minimum Amount (in cents)',
      type: 'number',
      required: true,
      admin: {
        description: 'Minimum amount in cents for this tier (e.g., 1000 = $10.00)',
      },
    },
    {
      name: 'color',
      label: 'Highlight Color',
      type: 'text',
      required: true,
      admin: {
        description: 'Hex color code for this tier (e.g., #2196F3)',
      },
    },
    {
      name: 'pin_duration',
      label: 'Pin Duration (seconds)',
      type: 'number',
      required: true,
      defaultValue: 30,
      admin: {
        description: 'How long to pin messages of this tier (in seconds)',
      },
    },
    {
      name: 'is_active',
      label: 'Active',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Whether this tier is currently active',
      },
    },
    {
      name: 'display_order',
      label: 'Display Order',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Order for displaying tiers (lower = first)',
      },
    },
  ],
}
