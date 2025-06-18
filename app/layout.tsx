import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'v0 App',
  description: 'Created with v0',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {/* Favicon for light mode */}
        <link rel="icon" href="/images/scan-ladder-black-logo.png" media="(prefers-color-scheme: light)" />
        {/* Favicon for dark mode */}
        <link rel="icon" href="/images/scan-ladder-white-logo.png" media="(prefers-color-scheme: dark)" />
      </head>
      <body>{children}</body>
    </html>
  )
}
