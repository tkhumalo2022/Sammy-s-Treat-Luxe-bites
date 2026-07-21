import config from '@payload-config'
import { RootPage, generatePageMetadata } from '@payloadcms/next/views'

import { importMap } from '../importMap.js'

export const generateMetadata = ({ params, searchParams }: any) =>
  generatePageMetadata({ config, params, searchParams })

export default function Page({ params, searchParams }: any) {
  return RootPage({ config, params, searchParams, importMap })
}
