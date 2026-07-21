import config from '@payload-config'
import '@payloadcms/next/css'
import { RootLayout } from '@payloadcms/next/layouts'
import type { Metadata } from 'next'
import type { ServerFunctionClient } from 'payload'
import React from 'react'

import { isPayloadConfigured } from '@/lib/payload-runtime'

import { importMap } from './admin/importMap.js'

export const metadata: Metadata = {
  title: 'Luxe Bites Administration',
  robots: { index: false, follow: false, nocache: true },
}

const serverFunction: ServerFunctionClient = async (args) => {
  'use server'
  const { handleServerFunctions } = await import('@payloadcms/next/layouts')
  return handleServerFunctions({ ...args, config, importMap })
}

export default function Layout({ children }: { children: React.ReactNode }) {
  if (!isPayloadConfigured) {
    return (
      <html lang="en">
        <body style={{ margin: 0, background: '#12081d', color: '#fffafc', fontFamily: 'system-ui, sans-serif' }}>
          {children}
        </body>
      </html>
    )
  }

  return RootLayout({ children, config, importMap, serverFunction })
}
