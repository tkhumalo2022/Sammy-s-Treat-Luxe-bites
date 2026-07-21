import config from '@payload-config'
import '@payloadcms/next/css'
import { RootLayout } from '@payloadcms/next/layouts'
import type { ServerFunctionClient } from 'payload'
import React from 'react'

import { importMap } from './admin/importMap.js'

const serverFunction: ServerFunctionClient = async (args) => {
  'use server'
  const { handleServerFunctions } = await import('@payloadcms/next/layouts')
  return handleServerFunctions({ ...args, config, importMap })
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return RootLayout({ children, config, importMap, serverFunction })
}
