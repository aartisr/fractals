import { redirect } from 'next/navigation'

export default async function HomePage() {
  // Redirect to the Payload admin panel
  redirect('/admin')
}
