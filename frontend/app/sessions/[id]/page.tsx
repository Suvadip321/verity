'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { Session, Source } from '@/types'
import { ProgressStepper } from '@/components/ProgressStepper'
import { ReportViewer } from '@/components/ReportViewer'
import { SourceCard } from '@/components/SourceCard'
import { ChatInterface } from '@/components/ChatInterface'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AppLayout } from '@/components/AppLayout'

export default function SessionPage() {
  const params = useParams()
  const id = params?.id
  const [session, setSession] = useState<Session | null>(null)
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditingTopic, setIsEditingTopic] = useState(false)
  const [topicInput, setTopicInput] = useState('')
  const [isSourcesCollapsed, setIsSourcesCollapsed] = useState(true)
  const router = useRouter()

  // Fetch session and realtime logic
  useEffect(() => {
    if (!id) return

    const fetchSession = async () => {
      try {
        const res = await api.get(`/sessions/${id}`)
        setSession(res.data)
      } catch (error) {
        console.error('Failed to load session:', error)
        toast.error('Could not load session details')
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchSession()

    // Initialize Supabase Realtime subscription
    const supabase = createClient()
    const channel = supabase
      .channel(`session-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'research_sessions',
          filter: `id=eq.${id}`
        },
        (payload) => {
          console.log('Live update:', payload.new)
          setSession((prev) => prev ? { ...prev, ...(payload.new as any) } : null)
        }
      )
      .subscribe()

    // Fallback: Poll every 2 seconds to guarantee updates if WebSockets fail
    let pollInterval: NodeJS.Timeout
    
    const startPolling = () => {
      pollInterval = setInterval(async () => {
        try {
          const res = await api.get(`/sessions/${id}`)
          setSession(res.data)
          if (res.data.status === 'completed' || res.data.status === 'failed') {
            clearInterval(pollInterval)
          }
        } catch (error: any) {
          // Suppress 401 errors during background polling (happens briefly when token auto-refreshes)
          if (error?.response?.status !== 401) {
            console.error('Polling error:', error)
          }
        }
      }, 5000)
    }

    startPolling()

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [id, router])

  // Fetch sources when session completes
  useEffect(() => {
    if (session?.status === 'completed' && sources.length === 0) {
      const fetchSources = async () => {
        try {
          const res = await api.get(`/sessions/${id}/sources`)
          setSources(res.data)
        } catch (error) {
          console.error('Failed to fetch sources:', error)
        }
      }
      fetchSources()
      toast.success('Research completed successfully!')
    } else if (session?.status === 'failed') {
      toast.error('Research workflow failed')
    }
  }, [session?.status, id, sources.length])

  const handleExport = () => {
    if (!session?.report_markdown) return
    const blob = new Blob([session.report_markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const safeTopic = session.topic.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    a.download = `verity_research_${safeTopic}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Report downloaded successfully')
  }

  const handleEditClick = () => {
    setTopicInput(session?.topic || '')
    setIsEditingTopic(true)
  }

  const handleRenameSession = async () => {
    if (!topicInput.trim() || topicInput.trim() === session?.topic) {
      setIsEditingTopic(false)
      return
    }

    const previousTopic = session?.topic
    const newTopic = topicInput.trim()

    // Optimistic Update
    setSession(prev => prev ? { ...prev, topic: newTopic } : null)
    setIsEditingTopic(false)

    try {
      await api.patch(`/sessions/${id}`, { topic: newTopic })
      toast.success('Session renamed successfully')
    } catch (error) {
      console.error('Failed to rename session:', error)
      setSession(prev => prev ? { ...prev, topic: previousTopic! } : null)
      toast.error('Failed to rename session')
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex-1 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            <div className="text-center mt-12 animate-pulse text-zinc-500">
              Initializing AI Agent...
            </div>
          </div>
      </AppLayout>
    )
  }
  if (!session) return null

  return (
    <AppLayout>
      <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto p-4 md:p-8">
        {/* Single Floating Top-Left Back Button */}
        <Link 
          href="/dashboard" 
          className="fixed top-[90px] left-4 lg:left-8 z-50 bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 shadow-xl rounded-full px-4 py-2.5 flex items-center gap-2 transition-all font-medium text-sm group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="hidden sm:inline">Dashboard</span>
        </Link>

        {/* Enhanced Title Section */}
        <div className="mb-12 mt-4 lg:ml-8 border-b border-zinc-800/80 pb-8">
          <div className="flex items-center gap-3 mb-3 pl-1">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em]">Research Topic</span>
          </div>
          
          <div className="flex items-center min-h-[48px]">
            {isEditingTopic ? (
              <input
                type="text"
                autoFocus
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSession()
                  if (e.key === 'Escape') setIsEditingTopic(false)
                }}
                onBlur={handleRenameSession}
                className="flex-1 max-w-3xl bg-zinc-950 border border-blue-600 text-zinc-100 px-4 py-2 rounded-lg text-3xl md:text-4xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-inner"
              />
            ) : (
              <div 
                className="flex items-center gap-4 group/title cursor-text w-full" 
                onClick={handleEditClick} 
                title="Click to rename session"
              >
                <h1 className="text-3xl md:text-4xl font-bold text-zinc-100 tracking-tight leading-tight">
                  {session.topic}
                </h1>
                <button 
                  className="opacity-0 group-hover/title:opacity-100 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all p-2 rounded-md border border-transparent hover:border-blue-500/30 flex-shrink-0"
                  aria-label="Rename Session"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {session.status === 'failed' && (
          <div className="bg-red-950 border border-red-900 rounded-md p-6 mb-8 text-red-400">
            <h3 className="text-base font-semibold flex items-center gap-2 mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Workflow Halted
            </h3>
            <p className="text-base opacity-90 ml-8">{session.error_message || 'An unknown error occurred during the research workflow.'}</p>
          </div>
        )}

        <div className="mb-10">
          <ProgressStepper currentStep={session.current_step} status={session.status} />
        </div>

        {session.status === 'completed' && session.report_markdown && (
          <div className="space-y-8">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
               <h2 className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
                 <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 shadow-inner border border-emerald-500/20">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                   </svg>
                 </div>
                 <div>
                   <h2 className="text-2xl font-bold text-zinc-100">Research Concluded</h2>
                   <p className="text-zinc-500 text-sm">The agent has successfully generated this report.</p>
                 </div>
               </h2>
               
               <Button onClick={handleExport} variant="outline" className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 transition-colors shadow-none text-zinc-100">
                 <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                 </svg>
                 Export
               </Button>
             </div>

             <div className="bg-zinc-900 border border-zinc-800 rounded-md p-6">
               <ReportViewer markdown={session.report_markdown} />
             </div>
             
             {sources.length > 0 && (
               <div className="mt-16">
                  <div className="mb-6 mt-12 flex justify-between items-end">
                   <div>
                     <div className="flex items-center gap-3 mb-2 pl-1">
                       <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                       <span className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em]">References</span>
                     </div>
                     <h3 className="text-2xl font-serif font-bold text-zinc-100 tracking-tight leading-tight pl-1">
                       Sources Cited
                     </h3>
                   </div>
                   <Button 
                     variant="ghost" 
                     size="sm" 
                     onClick={() => setIsSourcesCollapsed(!isSourcesCollapsed)}
                     className="text-zinc-400 hover:text-zinc-200 mb-1"
                   >
                     {isSourcesCollapsed ? (
                       <>Show</>
                     ) : (
                       <>Hide</>
                     )}
                   </Button>
                 </div>
                 {!isSourcesCollapsed && (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                     {sources.map(source => (
                       <SourceCard key={source.id} source={source} />
                     ))}
                   </div>
                 )}
               </div>
             )}

             {session.status === 'completed' && (
              <div className="mt-8 pt-8 border-t border-zinc-800">
                 <div className="mb-6 pl-1">
                   <div className="flex items-center gap-3 mb-2">
                     <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                     <span className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em]">Interactive Chat</span>
                   </div>
                   <h3 className="text-2xl font-serif font-bold text-zinc-100 tracking-tight leading-tight">
                     Ask Follow-up Questions
                   </h3>
                 </div>
                <ChatInterface sessionId={id as string} />
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
