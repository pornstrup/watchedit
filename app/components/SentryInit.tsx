'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function SentryInit() {
  useEffect(() => {
    Sentry.init({
      dsn: 'https://62de2dc48d7e78c0ae9d7905ab7e0b37@o4511141760335872.ingest.de.sentry.io/4511141763088464',
      tracesSampleRate: 0.1,
    })
  }, [])
  return null
}
