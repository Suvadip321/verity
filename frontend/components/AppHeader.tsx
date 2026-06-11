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
    <header className="sticky top-0 z-[70] border-b border-white/[0.04] bg-[#080810]/70 backdrop-blur-2xl px-6 py-4 flex items-center justify-between">
      <Link href="/dashboard" className="text-2xl font-sans font-bold bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent tracking-tighter hover:opacity-80 transition-all">
        Verity
      </Link>

      <div className="flex items-center gap-6">
        {email && (
          <div className="flex items-center gap-4">
            <span className="text-[13px] text-white/40 hidden sm:inline-block font-medium">{email}</span>
            <div className="h-8 w-8 rounded-full bg-[#0f0f1a] flex items-center justify-center text-white text-[11px] font-medium outline outline-2 outline-[#3b6ef5] outline-offset-2 border-none">
              {initial}
            </div>
          </div>
        )}
        <Button variant="outline" size="sm" onClick={handleLogout} className="border-[0.5px] border-white/[0.1] bg-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all rounded-[6px] px-[12px] py-[5px] text-xs font-medium ml-2 h-auto shadow-none">
          Logout
        </Button>
      </div>
    </header>
  )
}
