import type { CollectionConfig } from 'payload'

export const ECitizen: CollectionConfig = {
  slug: 'ecitizen',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'displayName', 'createdAt'],
    description: 'Registered e-citizens allowed to participate in live chat',
  },
  fields: [
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'firstName',
      label: 'First Name',
      type: 'text',
    },
    {
      name: 'lastName',
      label: 'Last Name',
      type: 'text',
    },
    {
      name: 'displayName',
      label: 'Display Name',
      type: 'text',
    },
  ],
  timestamps: true,
}
