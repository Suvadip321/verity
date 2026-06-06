'use client'

import { AppHeader } from './AppHeader'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen w-full bg-zinc-950 font-sans text-zinc-100">
      <AppHeader />
      <main className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
        <div className="flex-1 flex flex-col min-h-full">
          {children}
        </div>
      </main>
    </div>
  )
}
