// storage-adapter-import-placeholder
import { postgresAdapter } from '@payloadcms/db-postgres'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import { Users } from './collections/Users'
import { Categories } from './collections/Categories'
import { Videos } from './collections/Videos'
import { LiveStreams } from './collections/LiveStreams'
import { LiveChat } from './collections/LiveChat'
import { ECitizen } from './collections/ECitizen'
import { Transcripts } from './collections/Transcripts'
import { TranscriptSegments } from './collections/TranscriptSegments'
import { LiveStreamViews } from './collections/LiveStreamViews'
import { VideoViews } from './collections/VideoViews'
import { AudioChunks } from './collections/AudioChunks'
import { LegalPages } from './collections/LegalPages'

// Paystack-based payment collections
import { SubscriptionPlans } from './collections/SubscriptionPlans'
import { UserSubscriptions } from './collections/UserSubscriptions'
import { SubscriptionTransactions } from './collections/SubscriptionTransactions'
import { UserPaymentMethods } from './collections/UserPaymentMethods'
import { SuperchatMessages } from './collections/SuperchatMessages'
import { SuperchatTiers } from './collections/SuperchatTiers'
import { PaymentEvents } from './collections/PaymentEvents'

// Payment endpoints
import { createSubscription } from './endpoints/subscriptions/create'
import { cancelSubscription } from './endpoints/subscriptions/cancel'
import { getCurrentSubscription } from './endpoints/subscriptions/current'
import { verifySubscription } from './endpoints/subscriptions/verify'
import { subscriptionWebhook } from './endpoints/subscriptions/webhook'
import { setupPayment } from './endpoints/superchat/setup-payment'
import { verifySetup } from './endpoints/superchat/verify-setup'
import { sendSuperchat } from './endpoints/superchat/send'
import {
  getPaymentMethods,
  setDefaultPaymentMethod,
  deletePaymentMethod,
} from './endpoints/superchat/payment-methods'
import { getStreamSuperchats, toggleSuperchatVisibility } from './endpoints/superchat/stream-superchats'
import { getSuperchatTiers } from './endpoints/superchat/tiers'
import { paystackWebhook } from './endpoints/webhooks/paystack'
import { getContentAnalytics } from './endpoints/analytics-content'
import { getOverallAnalytics } from './endpoints/analytics-overall'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      views: {
        Dashboard: {
          Component: '/components/dashboard/ViewerAnalytics#default',
        },
      },
    },
  },
  serverURL: process.env.SERVER_URL || 'http://localhost:3000',
  custom: {
    mediaBaseUrl: process.env.MEDIA_BASE_URL || 'cdn.url',
  },
  collections: [
    Users,
    ECitizen,
    Categories,
    Videos,
    LiveStreams,
    LiveChat,
    LegalPages,
    LiveStreamViews,
    VideoViews,
    Transcripts,
    TranscriptSegments,
    AudioChunks,
    // Paystack-based payment collections
    SubscriptionPlans,
    UserSubscriptions,
    SubscriptionTransactions,
    UserPaymentMethods,
    SuperchatMessages,
    SuperchatTiers,
    PaymentEvents,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
  }),
  plugins: [
    payloadCloudPlugin(),
    // storage-adapter-placeholder
  ],
  endpoints: [
    // Subscription endpoints
    {
      path: '/subscriptions/create',
      method: 'post',
      handler: createSubscription,
    },
    {
      path: '/subscriptions/cancel',
      method: 'post',
      handler: cancelSubscription,
    },
    {
      path: '/subscriptions/current',
      method: 'get',
      handler: getCurrentSubscription,
    },
    {
      path: '/subscriptions/verify',
      method: 'post',
      handler: verifySubscription,
    },
    {
      path: '/subscriptions/webhook',
      method: 'post',
      handler: subscriptionWebhook,
    },
    // Superchat endpoints
    {
      path: '/superchat/setup-payment',
      method: 'post',
      handler: setupPayment,
    },
    {
      path: '/superchat/verify-setup',
      method: 'get',
      handler: verifySetup,
    },
    {
      path: '/superchat/send',
      method: 'post',
      handler: sendSuperchat,
    },
    {
      path: '/superchat/payment-methods',
      method: 'get',
      handler: getPaymentMethods,
    },
    {
      path: '/superchat/payment-methods/set-default',
      method: 'post',
      handler: setDefaultPaymentMethod,
    },
    {
      path: '/superchat/payment-methods/:id',
      method: 'delete',
      handler: deletePaymentMethod,
    },
    {
      path: '/superchat/stream/:streamId',
      method: 'get',
      handler: getStreamSuperchats,
    },
    {
      path: '/superchat/:id/visibility',
      method: 'patch',
      handler: toggleSuperchatVisibility,
    },
    {
      path: '/superchat/tiers',
      method: 'get',
      handler: getSuperchatTiers,
    },
    // Webhook
    {
      path: '/webhooks/paystack',
      method: 'post',
      handler: paystackWebhook,
    },
    // Analytics endpoints
    {
      path: '/analytics/content-stats',
      method: 'get',
      handler: getContentAnalytics,
    },
    {
      path: '/analytics/viewer-stats',
      method: 'get',
      handler: getOverallAnalytics,
    },
  ],
})
