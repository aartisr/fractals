import React from 'react'
import './styles.css'

export const metadata = {
  description: 'Please visit Nithyananda TV for entertainment, entrainment, and enlightenment!',
  title: 'KAILASA\'s Nithyananda TV',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
