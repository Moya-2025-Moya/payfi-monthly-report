import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { TopBar } from '@/components/layout/TopBar'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { DepthProvider } from '@/components/depth/DepthProvider'
import { FocusLensProvider } from '@/components/focus/FocusLensProvider'
import { ConsoleProvider } from '@/components/console/ConsoleProvider'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'StablePulse',
  description: 'Stablecoin industry atomic knowledge engine',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            const t = localStorage.getItem('stablepulse-theme');
            if (t === 'dark') document.documentElement.classList.add('dark');
          } catch(e) {}
        `}} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <DepthProvider>
            <FocusLensProvider>
              <ConsoleProvider>
                <TopBar />
                <main className="pt-[calc(var(--topbar-h)+12px)] px-4 pb-12 md:px-8 mx-auto max-w-[1200px]">
                  {children}
                </main>
              </ConsoleProvider>
            </FocusLensProvider>
          </DepthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
