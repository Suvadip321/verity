'use client'

import { AppHeader } from './AppHeader'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen w-full bg-black font-sans text-zinc-100">
      <AppHeader />
      <main className="flex-1 overflow-y-auto custom-scrollbar flex flex-col relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/20 via-black to-black pointer-events-none" />
        <div className="flex-1 flex flex-col min-h-full relative z-10">
          {children}
        </div>
      </main>
    </div>
  )
}
