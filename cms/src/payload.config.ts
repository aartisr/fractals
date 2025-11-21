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
import { AudioChunks } from './collections/AudioChunks'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  serverURL: process.env.SERVER_URL || 'http://localhost:3000',
  custom: {
    mediaBaseUrl: process.env.MEDIA_BASE_URL || 'cdn.url',
  },
  collections: [Users, ECitizen, Categories, Videos, LiveStreams, LiveChat, LiveStreamViews, Transcripts, TranscriptSegments, AudioChunks],
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
})
