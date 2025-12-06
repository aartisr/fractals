import { CollectionConfig } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

export const LegalPages: CollectionConfig = {
  slug: 'legal-pages',
  labels: {
    singular: 'Legal Page',
    plural: 'Legal Pages',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'updatedAt'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Used for the `/legal/{slug}` URL.',
      },
    },
    {
      name: 'summary',
      type: 'textarea',
      required: false,
      admin: {
        description: 'Short description to use in listings or meta description fallback.',
      },
    },
    {
      name: 'body',
      type: 'richText',
      required: true,
      editor: lexicalEditor(),
      admin: {
        description: 'Main page content rendered on the website.',
      },
    },
    {
      name: 'metaTitle',
      type: 'text',
      admin: {
        description: 'Optional value for the page title meta tag.',
      },
    },
    {
      name: 'metaDescription',
      type: 'textarea',
      admin: {
        description: 'Optional description for the meta description tag.',
      },
    },
  ],
}
