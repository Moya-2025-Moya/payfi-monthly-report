import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { TopBar } from '@/components/layout/TopBar'
import { MobileNav } from '@/components/layout/MobileNav'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { DepthProvider } from '@/components/depth/DepthProvider'
import { FocusLensProvider } from '@/components/focus/FocusLensProvider'
import { ConsoleProvider } from '@/components/console/ConsoleProvider'
import { ConsoleModal } from '@/components/console/ConsoleModal'
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
                <main className="pt-[var(--topbar-h)] px-4 pb-16 md:px-8 md:pb-8 mx-auto max-w-[1200px]">
                  {children}
                </main>
                <MobileNav />
                <ConsoleModal />
              </ConsoleProvider>
            </FocusLensProvider>
          </DepthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
