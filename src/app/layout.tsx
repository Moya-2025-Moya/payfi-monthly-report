import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { TopBar } from '@/components/layout/TopBar'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
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
        {/* Prevent dark flash — default to light */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            const t = localStorage.getItem('stablepulse-theme');
            if (t === 'dark') document.documentElement.classList.add('dark');
          } catch(e) {}
        `}} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <TopBar />
          <div className="flex min-h-screen pt-[var(--topbar-h)]">
            <Sidebar />
            <main className="flex-1 md:ml-[var(--sidebar-w)] p-4 pb-16 md:p-8 md:pb-8 max-w-[1200px]">
              {children}
            </main>
          </div>
          <MobileNav />
        </ThemeProvider>
      </body>
    </html>
  )
}
