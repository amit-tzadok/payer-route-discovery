import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Payer Route Discovery — Ruma Care',
  description: 'Look up how to submit prior authorizations by payer and drug',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect for Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-sans bg-ruma-bg text-ruma-text antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
