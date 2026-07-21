import config from '@payload-config'
import { RootPage, generatePageMetadata } from '@payloadcms/next/views'
import Link from 'next/link'

import { isPayloadConfigured } from '@/lib/payload-runtime'

import { importMap } from '../importMap.js'

type AdminPageProps = {
  params: Promise<{ segments: string[] }>
  searchParams: Promise<Record<string, string | string[]>>
}

export const generateMetadata = ({ params, searchParams }: AdminPageProps) => {
  if (!isPayloadConfigured) {
    return {
      title: 'Luxe Bites Administration',
      robots: { index: false, follow: false },
    }
  }

  return generatePageMetadata({ config, params, searchParams })
}

export default function Page({ params, searchParams }: AdminPageProps) {
  if (!isPayloadConfigured) {
    return (
      <main style={{ maxWidth: 680, margin: '0 auto', padding: '14vh 24px' }}>
        <p style={{ color: '#f1a7ce', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Luxe Bites administration
        </p>
        <h1 style={{ marginBottom: 12, fontSize: 'clamp(2rem, 6vw, 3.5rem)' }}>Dashboard setup is still required.</h1>
        <p style={{ maxWidth: 560, color: '#d6cadb', lineHeight: 1.7 }}>
          The storefront, AI assistant, and WhatsApp ordering remain available. Configure the database and dashboard secret in Vercel, then redeploy to activate administration.
        </p>
        <Link href="/" style={{ display: 'inline-block', marginTop: 24, color: '#f1a7ce', fontWeight: 700 }}>
          Return to the website
        </Link>
      </main>
    )
  }

  return RootPage({ config, params, searchParams, importMap })
}
