import type { Metadata, Viewport } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata: Metadata = {
  title: 'ReplyHub - Never Miss a Customer Again | AI Phone Answering',
  description: 'AI-powered phone answering & appointment booking for US small businesses. Answer every call 24/7. Save $3,000/month. 14-day free trial.',
  keywords: 'ai receptionist, phone answering service, appointment booking, small business phone system, virtual receptionist',
  authors: [{ name: 'ReplyHub' }],
  creator: 'ReplyHub',
  publisher: 'ReplyHub',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://arkka.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'ReplyHub - Never Miss a Customer Again',
    description: 'Answer every call 24/7 with AI. Save $3,000/month.',
    siteName: 'ReplyHub',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'ReplyHub - AI Phone Answering Service',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReplyHub - Never Miss a Customer Again',
    description: 'Answer every call 24/7 with AI. Save $3,000/month.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        </head>
        <body>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
