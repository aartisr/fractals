import { redirect } from 'next/navigation'

export default async function HomePage() {
  // Use the public Payload URL; default to localhost only if unset
  const origin = process.env.SERVER_URL || 'http://localhost:3000'
  redirect(origin)
}
