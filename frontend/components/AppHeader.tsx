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
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950 px-6 py-4 flex items-center justify-between">
      <Link href="/dashboard" className="text-2xl font-bold text-zinc-100 hover:text-white transition-colors tracking-tight flex items-center gap-2">
        <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22L2 7l5-5h10l5 5-10 15z" />
          <path d="M2 7h20" />
          <path d="M7 2l5 20 5-20" />
        </svg>
        Verity
      </Link>

      <div className="flex items-center gap-4">
        {email && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-zinc-800 flex items-center justify-center text-zinc-300 text-sm font-medium border border-zinc-700">
              {initial}
            </div>
            <span className="text-sm text-zinc-400 hidden sm:inline-block">{email}</span>
          </div>
        )}
        <Button variant="outline" size="sm" onClick={handleLogout} className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors rounded-md px-4 shadow-none">
          Logout
        </Button>
      </div>
    </header>
  )
}
