import type { Metadata, Viewport } from 'next'
import './globals.css'
import BottomNav from './components/BottomNav'

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'Flimr',
  description: 'Hold styr på hvad I ser – sammen',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Flimr',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="da">
      <head>
  <link rel="apple-touch-icon" href="/icons/icon-512.png" />
  <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <script defer src="https://stats.flimr.dk/script.js" data-website-id="7f26cb76-4efd-4463-8379-a8f5cf4acf87"></script>
  <script dangerouslySetInnerHTML={{ __html: `window.op=window.op||function(){var n=[];return new Proxy(function(){arguments.length&&n.push([].slice.call(arguments))},{get:function(t,r){return"q"===r?n:function(){n.push([r].concat([].slice.call(arguments)))}},has:function(t,r){return"q"===r}})}();window.op('init',{apiUrl:'https://opapi.flimr.dk',clientId:'5004f2a4-d4a0-4882-aa55-02d8fc0592b5',trackScreenViews:true,trackOutgoingLinks:true,trackAttributes:true});` }} />
  <script src="https://openpanel.dev/op1.js" defer async></script>
</head>
      <body style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
        {children}
        <BottomNav />
      </body>
    </html>
  )
}