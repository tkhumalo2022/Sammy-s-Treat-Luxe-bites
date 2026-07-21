import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig, type Access, type FieldAccess } from 'payload'
import sharp from 'sharp'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const isAdmin: Access = ({ req: { user } }) => user?.role === 'admin'
const isAdminField: FieldAccess = ({ req: { user } }) => user?.role === 'admin'
const isStaff: Access = ({ req: { user } }) => Boolean(user)

export default buildConfig({
  admin: {
    user: 'users',
    meta: {
      titleSuffix: ' | Sam’s Luxe Bites',
    },
  },
  editor: lexicalEditor(),
  collections: [
    {
      slug: 'users',
      auth: true,
      admin: { useAsTitle: 'name', group: 'Administration' },
      access: {
        create: isAdmin,
        delete: isAdmin,
        read: isStaff,
        update: ({ req: { user }, id }) => user?.role === 'admin' || user?.id === id,
      },
      fields: [
        { name: 'name', type: 'text', required: true },
        {
          name: 'role',
          type: 'select',
          required: true,
          defaultValue: 'manager',
          options: [
            { label: 'Administrator', value: 'admin' },
            { label: 'Manager', value: 'manager' },
          ],
          access: { update: isAdminField },
        },
      ],
    },
    {
      slug: 'media',
      upload: { staticDir: path.resolve(dirname, 'public/media') },
      admin: { group: 'Website' },
      access: { read: () => true, create: isStaff, update: isStaff, delete: isAdmin },
      fields: [{ name: 'alt', type: 'text', required: true }],
    },
    {
      slug: 'products',
      admin: { useAsTitle: 'name', defaultColumns: ['name', 'price', 'available'], group: 'Business' },
      access: { read: () => true, create: isStaff, update: isStaff, delete: isAdmin },
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'slug', type: 'text', required: true, unique: true, index: true },
        { name: 'description', type: 'textarea' },
        { name: 'price', type: 'number', required: true, min: 0 },
        { name: 'image', type: 'upload', relationTo: 'media' },
        { name: 'available', type: 'checkbox', defaultValue: true },
        { name: 'featured', type: 'checkbox', defaultValue: false },
        { name: 'sortOrder', type: 'number', defaultValue: 0 },
      ],
    },
    {
      slug: 'orders',
      admin: {
        useAsTitle: 'reference',
        defaultColumns: ['reference', 'customerName', 'status', 'eventDate', 'createdAt'],
        group: 'Business',
      },
      access: { read: isStaff, create: isStaff, update: isStaff, delete: isAdmin },
      fields: [
        { name: 'reference', type: 'text', required: true, unique: true, index: true },
        { name: 'customerName', type: 'text', required: true },
        { name: 'phone', type: 'text', required: true },
        { name: 'email', type: 'email' },
        { name: 'orderDetails', type: 'textarea', required: true },
        {
          name: 'items',
          type: 'array',
          fields: [
            { name: 'product', type: 'relationship', relationTo: 'products', required: true },
            { name: 'quantity', type: 'number', required: true, min: 1 },
            { name: 'unitPrice', type: 'number', required: true, min: 0 },
          ],
        },
        { name: 'fulfilment', type: 'select', required: true, options: ['collection', 'delivery'] },
        { name: 'address', type: 'textarea' },
        { name: 'eventDate', type: 'date' },
        { name: 'notes', type: 'textarea' },
        { name: 'total', type: 'number', min: 0, defaultValue: 0 },
        {
          name: 'source',
          type: 'select',
          required: true,
          defaultValue: 'website',
          options: ['website', 'chat', 'admin'],
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          defaultValue: 'new',
          options: ['new', 'confirmed', 'deposit-paid', 'preparing', 'ready', 'completed', 'cancelled'],
        },
      ],
    },
  ],
  globals: [
    {
      slug: 'site-settings',
      admin: { group: 'Website' },
      access: { read: () => true, update: isStaff },
      fields: [
        { name: 'businessName', type: 'text', defaultValue: 'Sammy’s Sweets | Luxe Bites', required: true },
        { name: 'tagline', type: 'text', defaultValue: 'Premium flavours. Elegant presentation. Perfect for events.' },
        { name: 'whatsappNumber', type: 'text', defaultValue: '27832656484' },
        { name: 'minimumOrder', type: 'number', defaultValue: 10 },
        { name: 'depositPercentage', type: 'number', defaultValue: 50 },
        { name: 'deliveryFee', type: 'number', defaultValue: 100 },
        { name: 'chatbotEnabled', type: 'checkbox', defaultValue: true },
      ],
    },
  ],
  secret: process.env.PAYLOAD_SECRET || '',
  db: postgresAdapter({
    schemaName: 'luxe_bites',
    pool: { connectionString: process.env.DATABASE_URL || '' },
  }),
  sharp,
  typescript: { outputFile: path.resolve(dirname, 'src/payload-types.ts') },
})