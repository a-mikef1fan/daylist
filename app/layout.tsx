import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import { BackgroundProvider } from '@/components/background-provider'
import { ColorModeProvider } from '@/components/color-mode-provider'
import { CustomThemeProvider } from '@/components/custom-theme-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { COLOR_MODE_INIT_SCRIPT } from '@/lib/color-mode'
import { CUSTOM_THEME_INIT_SCRIPT } from '@/lib/custom-theme/css'
import { BACKGROUND_INIT_SCRIPT } from '@/lib/backgrounds'
import { THEME_INIT_SCRIPT } from '@/lib/themes'
import './globals.css'

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })
const fraunces = Fraunces({ subsets: ['latin'], display: 'swap', variable: '--font-fraunces' })

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
    { media: '(prefers-color-scheme: dark)', color: '#101512' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: COLOR_MODE_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: BACKGROUND_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: CUSTOM_THEME_INIT_SCRIPT }} />
      </head>
      <body className="antialiased">
        <ColorModeProvider>
          <ThemeProvider>
            <BackgroundProvider>
              <CustomThemeProvider>{children}</CustomThemeProvider>
            </BackgroundProvider>
          </ThemeProvider>
        </ColorModeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
