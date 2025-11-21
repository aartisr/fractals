import { redirect } from 'next/navigation'

export default async function HomePage() {
  const origin = process.env.ORIGIN || 'http://localhost:3000'
  redirect(origin)
}
