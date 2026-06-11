'use client'

import { AppHeader } from './AppHeader'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen w-full bg-background font-sans text-foreground">
      <AppHeader />
      <main className="flex-1 overflow-y-auto custom-scrollbar flex flex-col relative">
        <div className="flex-1 flex flex-col min-h-full relative z-10">
          {children}
        </div>
      </main>
    </div>
  )
}
