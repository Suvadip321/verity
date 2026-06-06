'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Session } from '@/types'
import { NewResearchDialog } from '@/components/NewResearchDialog'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { toast } from 'sonner'
import { AppLayout } from '@/components/AppLayout'

export default function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await api.get('/sessions')
        setSessions(res.data)
      } catch (error) {
        console.error('Failed to load sessions', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchSessions()
  }, [])

  const handleDeleteSession = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    if (!window.confirm('Are you sure you want to delete this research session?')) return;

    // 1. Save backup in case of network failure
    const backup = [...sessions];
    
    // 2. Optimistically remove from UI instantly
    setSessions(prev => prev.filter(s => s.id !== id));

    try {
      // 3. Perform network request in background
      await api.delete(`/sessions/${id}`);
      toast.success('Session deleted successfully');
    } catch (error) {
      console.error('Failed to delete session', error);
      // 4. Revert UI if network request failed
      setSessions(backup);
      toast.error('Failed to delete session');
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    completed: 'bg-emerald-950 text-emerald-400 border-emerald-800',
    failed: 'bg-red-950 text-red-400 border-red-800',
    default: 'bg-blue-950 text-blue-400 border-blue-800'
  }

  const STATUS_LABELS: Record<string, string> = {
    completed: 'Completed',
    failed: 'Failed',
    default: 'In Progress'
  }

  const filteredSessions = sessions.filter(session => 
    session.topic.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <AppLayout>
      <div className="flex-1 w-full p-6 md:p-10">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100">Research Sessions</h1>
            <p className="text-zinc-500 text-sm mt-1">Manage your autonomous investigations.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-full md:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#050505] border border-white/[0.08] text-white text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all"
              />
            </div>
            <NewResearchDialog />
          </div>
        </div>

        {/* Main Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="bg-[#050505] border-white/[0.08] rounded-2xl shadow-none h-40">
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-3/4 bg-white/[0.05]" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-1/4 bg-white/[0.05]" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border border-dashed border-white/[0.1] rounded-2xl bg-[#050505]">
            <svg className="w-8 h-8 text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-zinc-500 text-sm">No research sessions found.</p>
            <div className="mt-4"><NewResearchDialog /></div>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex items-center justify-center h-32 border border-white/[0.1] rounded-2xl bg-[#050505]">
            <p className="text-zinc-600 text-sm">No sessions match your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredSessions.map(session => (
              <Link key={session.id} href={`/sessions/${session.id}`} className="block group">
                <Card className="bg-[#050505] border border-white/[0.08] hover:border-blue-500/50 transition-all duration-300 rounded-2xl shadow-none h-full flex flex-col hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(30,58,138,0.2)]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium text-zinc-100 line-clamp-2 leading-snug">
                      {session.topic}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <Badge variant="outline" className={`rounded-sm font-medium text-xs px-2 py-0.5 border ${STATUS_COLORS[session.status] || STATUS_COLORS.default}`}>
                      {STATUS_LABELS[session.status] || STATUS_LABELS.default}
                    </Badge>
                  </CardContent>
                  <CardFooter className="pt-3 border-t border-zinc-800 mt-2 flex justify-between items-center">
                    <p className="text-xs text-zinc-500">
                      {new Date(session.created_at).toLocaleDateString('en-US', { 
                        month: 'short', day: 'numeric', year: 'numeric' 
                      })}
                    </p>
                    <button 
                      onClick={(e) => handleDeleteSession(e, session.id)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-opacity p-1"
                      title="Delete Session"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}

      </div>
    </AppLayout>
  )
}
