import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: {
    useAPIKey: true,
  },
  fields: [
    // Email added by default
    {
      name: 'role',
      label: 'Role',
      type: 'select',
      required: true,
      defaultValue: 'user',
      saveToJWT: true, // Save role to JWT for access control
      options: [
        { label: 'User', value: 'user' },
        { label: 'Moderator', value: 'moderator' },
        { label: 'Admin', value: 'admin' },
      ],
      admin: {
        description: 'User role for access control',
      },
    },
  ],
}
