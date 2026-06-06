'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function AppHeader() {
  const [email, setEmail] = useState<string | null>(null)
  // Memoize the client so it is not recreated on every render.
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setEmail(user.email || 'User')
      }
    }
    getUser()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initial = email ? email.charAt(0).toUpperCase() : 'U'

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-black/40 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
      <Link href="/dashboard" className="text-2xl font-serif font-bold bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent tracking-tight flex items-center gap-2 hover:opacity-80 transition-opacity">
        <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22L2 7l5-5h10l5 5-10 15z" />
          <path d="M2 7h20" />
          <path d="M7 2l5 20 5-20" />
        </svg>
        Verity
      </Link>

      <div className="flex items-center gap-4">
        {email && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400 hidden sm:inline-block font-medium">{email}</span>
            <div className="h-9 w-9 rounded-full bg-blue-900/20 flex items-center justify-center text-blue-400 text-sm font-bold border border-blue-500/20 shadow-inner">
              {initial}
            </div>
          </div>
        )}
        <Button variant="outline" size="sm" onClick={handleLogout} className="border-white/[0.08] bg-transparent text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-all rounded-lg px-4 shadow-none ml-2">
          Logout
        </Button>
      </div>
    </header>
  )
}
