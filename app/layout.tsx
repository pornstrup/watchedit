import type { Metadata } from 'next'
import './globals.css'
import BottomNav from './components/BottomNav'

export const metadata: Metadata = {
  title: 'WatchedIt',
  description: 'Hold styr på hvad I ser – sammen',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="da">
      <body style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
        {children}
        <BottomNav />
      </body>
    </html>
  )
}