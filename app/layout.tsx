import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'daylist — Make room for what matters',
  description: 'A calm, private to-do list for gathering your thoughts, finding focus, and finishing the day feeling good.',
  applicationName: 'daylist',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f7f3' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1e1b' },
  ],
  width: 'device-width',
  initialScale: 1,
}

// Runs before first paint so the saved (or system) theme is applied without a flash.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'&&t!=='system')t='system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})()`

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
