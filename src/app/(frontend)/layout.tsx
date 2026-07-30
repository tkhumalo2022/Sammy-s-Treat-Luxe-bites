import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

import { BUSINESS_DETAILS, SITE_URL } from '@/lib/business'

import '../globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Sammy’s Sweets | Luxe Bites Dessert Cups',
    template: '%s | Sammy’s Sweets',
  },
  description:
    'Order luxury dessert cups from Sammy’s Sweets | Luxe Bites for birthdays, celebrations and events. View flavours, prices and build an order online.',
  keywords: [
    'Sammy’s Sweets',
    'Luxe Bites',
    'dessert cups',
    'desserts for events',
    'party desserts',
    'South Africa desserts',
  ],
  alternates: { canonical: '/' },
  verification: { google: '8tmgG-Ej1r4JTD890Kosdi5XOP7l2_XHEX6fDOTzxo4' },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: { icon: '/images/logo.jpeg', apple: '/images/logo.png' },
  openGraph: {
    type: 'website',
    siteName: BUSINESS_DETAILS.name,
    title: 'Sammy’s Sweets | Luxe Bites Dessert Cups',
    description:
      'Luxury dessert cups with premium flavours and elegant presentation for birthdays, celebrations and events.',
    url: '/',
    images: [
      {
        url: '/images/main-picture.jpeg',
        width: 1131,
        height: 1600,
        alt: 'A selection of Luxe Bites dessert cups',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sammy’s Sweets | Luxe Bites Dessert Cups',
    description: 'Premium dessert cups for birthdays, celebrations and events.',
    images: ['/images/main-picture.jpeg'],
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#170a22',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
