'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'

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
  const prevStatusRef = useRef<string | null>(null)
  const isRenamingRef = useRef(false)
  const isCommittingRef = useRef(false)
  const isCancelledRef = useRef(false)
  const fetchingSourcesRef = useRef(false)

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



    // Fallback: Poll every 2 seconds to guarantee updates if WebSockets fail
    let pollInterval: NodeJS.Timeout
    
    const startPolling = () => {
      pollInterval = setInterval(async () => {
        try {
          const res = await api.get(`/sessions/${id}`)
          setSession(prev => {
            if (isRenamingRef.current && prev) {
              return { ...res.data, topic: prev.topic };
            }
            return res.data;
          })
          if (res.data.status === 'completed' || res.data.status === 'failed') {
            clearInterval(pollInterval)
          }
        } catch (error: any) {
          // Suppress 401 errors during background polling (happens briefly when token auto-refreshes)
          if (error?.response?.status !== 401) {
            console.warn('Background polling error (transient):', error?.message || 'Network error')
          }
        }
      }, 5000)
    }

    startPolling()

    return () => {
      clearInterval(pollInterval)
    }
  }, [id, router])

  // Fetch sources when session completes
  useEffect(() => {
    if (session?.status === 'completed' && sources.length === 0 && !fetchingSourcesRef.current) {
      const fetchSources = async () => {
        fetchingSourcesRef.current = true
        try {
          const res = await api.get(`/sessions/${id}/sources`)
          setSources(res.data)
        } catch (error) {
          console.error('Failed to fetch sources:', error)
          fetchingSourcesRef.current = false
        }
      }
      fetchSources()
    }
  }, [session?.status, id, sources.length])

  // Only show completion toast if the session transitioned to completed while viewing the page
  useEffect(() => {
    if (!session) return;
    
    if (prevStatusRef.current && prevStatusRef.current !== 'completed' && session.status === 'completed') {
      toast.success('Research completed successfully!');
    } else if (prevStatusRef.current && prevStatusRef.current !== 'failed' && session.status === 'failed') {
      toast.error('Research workflow failed');
    }
    
    prevStatusRef.current = session.status;
  }, [session?.status]);

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
    isCancelledRef.current = false;
    setTopicInput(session?.topic || '')
    setIsEditingTopic(true)
  }

  const handleRenameSession = async () => {
    if (isCancelledRef.current) return;
    if (isCommittingRef.current) return;

    if (!topicInput.trim() || topicInput.trim() === session?.topic) {
      setIsEditingTopic(false)
      return
    }

    isCommittingRef.current = true;
    isRenamingRef.current = true;
    const previousTopic = session?.topic
    const newTopic = topicInput.trim()

    // Optimistic Update and immediate popup
    setSession(prev => prev ? { ...prev, topic: newTopic } : null)
    setIsEditingTopic(false)
    toast.success('Session renamed successfully')

    try {
      await api.patch(`/sessions/${id}`, { topic: newTopic })
    } catch (error) {
      console.error('Failed to rename session:', error)
      setSession(prev => prev ? { ...prev, topic: previousTopic! } : null)
      toast.error('Failed to rename session')
    } finally {
      isRenamingRef.current = false;
      setTimeout(() => { isCommittingRef.current = false; }, 150);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex-1 w-full flex items-center justify-center min-h-[60vh]">
          <svg className="w-4 h-4 text-zinc-500 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
        </div>
      </AppLayout>
    )
  }
  if (!session) return null

  return (
    <AppLayout>
      <div className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-8 pt-4 pb-8 flex flex-col relative">
        
        {/* Sticky Floating Back Button (for long reports) */}
        <Link 
          href="/dashboard" 
          className="fixed top-[90px] left-4 lg:left-8 z-50 flex items-center justify-center w-10 h-10 rounded-full bg-[#0d0d12]/80 backdrop-blur-md border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.05] hover:border-white/[0.15] transition-all shadow-lg group"
        >
          <svg className="w-4 h-4 transform group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>

        {/* Animated Content Wrapper */}
        <div className="flex-1 flex flex-col w-full animate-in fade-in duration-700 slide-in-from-bottom-4">
        {/* Clean Inline Title */}
        <div className="mb-4 border-b border-white/[0.04] pb-4">
          
          <div className="mb-1.5 pl-0.5">
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em]">Research Session</span>
          </div>
          
          <div className="flex items-center min-h-[36px]">
            {isEditingTopic ? (
              <input
                type="text"
                autoFocus
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSession()
                  if (e.key === 'Escape') {
                    isCancelledRef.current = true;
                    setIsEditingTopic(false);
                  }
                }}
                onBlur={handleRenameSession}
                className="w-full bg-transparent border-none text-white/90 px-0 py-0 text-2xl md:text-3xl font-semibold tracking-tight focus:outline-none focus:ring-0 rounded-none selection:bg-white/20 placeholder:text-white/20 leading-none m-0 focus:text-white"
                placeholder="Name this session..."
              />
            ) : (
              <div 
                className="flex items-center gap-4 group/title cursor-text w-full" 
                onClick={handleEditClick}
              >
                <h1 className="text-2xl md:text-3xl font-semibold text-white/90 tracking-tight leading-none group-hover/title:opacity-70 transition-opacity duration-200">
                  {session.topic}
                </h1>
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

        {session.status !== 'completed' && session.status !== 'failed' && (
          <div className="mb-10">
            <ProgressStepper currentStep={session.current_step} status={session.status} />
          </div>
        )}

        {session.status === 'completed' && session.report_markdown && (
          <div className="space-y-8">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.04]">
               <div className="flex items-center gap-3">
                 <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                   </svg>
                 </div>
                 <div>
                   <h2 className="text-sm font-semibold text-white/90 tracking-tight leading-none mb-1">Research Complete</h2>
                   <p className="text-xs text-white/40 leading-none">Report successfully generated</p>
                 </div>
               </div>
               
               <Button onClick={handleExport} className="bg-white text-black hover:bg-white/90 border-0 h-8 px-4 text-xs font-medium rounded-md flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                 <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                 </svg>
                 Export Report
               </Button>
             </div>

             <div className="mt-6">
               <ReportViewer markdown={session.report_markdown} sources={sources} />
             </div>
             
             {sources.length > 0 && (
               <div className="mt-16">
                  <div className="mb-6 mt-12 flex items-center justify-between pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.02] border border-white/[0.05] text-white/50">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-sans font-semibold text-zinc-100 tracking-tight">
                        Sources Cited <span className="text-white/30 text-sm font-normal ml-2">({sources.length})</span>
                      </h3>
                    </div>
                    <button 
                      onClick={() => setIsSourcesCollapsed(!isSourcesCollapsed)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.02] hover:bg-white/[0.06] text-white/50 hover:text-white border border-white/[0.04] transition-all"
                    >
                      <span className="text-xs font-medium uppercase tracking-wider">{isSourcesCollapsed ? 'Show' : 'Hide'}</span>
                      <svg 
                        className={`w-3.5 h-3.5 transition-transform duration-300 ${isSourcesCollapsed ? '' : 'rotate-180'}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
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
              <div className="mt-6">
                 <div className="mb-8 mt-4 flex items-center gap-3">
                   <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.02] border border-white/[0.05] text-white/50">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                     </svg>
                   </div>
                   <h3 className="text-xl font-sans font-semibold text-zinc-100 tracking-tight">
                     Ask Follow-up Questions
                   </h3>
                 </div>
                <ChatInterface sessionId={id as string} />
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </AppLayout>
  )
}
