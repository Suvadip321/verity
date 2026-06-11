'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { AxiosError } from 'axios'
import { createPortal } from 'react-dom'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'

export function NewResearchDialog({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim()) return

    setLoading(true)
    // Show full screen overlay instantly and keep dialog open to avoid closing animation
    setIsNavigating(true)

    try {
      const createRes = await api.post('/sessions', { topic })
      const sessionId = createRes.data.id

      // Await the background run trigger so we can catch initialization errors
      await api.post(`/sessions/${sessionId}/run`)

      toast.success('Research started successfully!')
      
      router.push(`/sessions/${sessionId}`)
    } catch (error: unknown) {
      console.error(error)
      // Reopen dialog if creation failed so user doesn't lose their input
      setIsNavigating(false)
      setOpen(true)
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.detail || 'Failed to start research')
      } else {
        toast.error('Failed to start research')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {isNavigating && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] bg-[#0d0d12]/80 backdrop-blur-3xl flex flex-col items-center justify-center">
          <div className="flex flex-col items-center justify-center animate-in slide-in-from-bottom-4 fade-in duration-700 ease-out">
            <div className="relative flex items-center justify-center mb-5">
              <div className="w-10 h-10 border-[3px] border-white/10 border-t-white rounded-full animate-spin relative z-10" />
            </div>
            <h2 className="text-[15px] font-sans font-medium text-white/70 tracking-wide">Preparing session...</h2>
          </div>
        </div>,
        document.body
      )}
      <Dialog open={open || isNavigating} onOpenChange={(isOpen) => {
      if (isNavigating) return;
      setOpen(isOpen);
      if (!isOpen) {
        setTimeout(() => setTopic(''), 200);
      }
    }}>
      <DialogTrigger asChild>
        {children ? children : (
          <Button className="w-[220px] shrink-0 h-11 bg-white/[0.03] text-white hover:bg-white/[0.06] hover:border-white/[0.2] hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] font-medium px-6 rounded-[8px] transition-all duration-300 border border-white/[0.08] relative overflow-hidden group">
            <Plus className="w-4 h-4 mr-2 flex-shrink-0 relative z-10" />
            <span className="truncate relative z-10">New Research</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px] p-0 bg-[#0d0d12] border border-white/[0.08] shadow-[0_0_100px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden gap-0 outline-none">
        <DialogTitle className="sr-only">Start New Research</DialogTitle>
        <form onSubmit={handleSubmit} className="flex flex-col w-full m-0 p-0 relative">
          <textarea
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (topic.trim() && !loading) handleSubmit(e);
              }
            }}
            placeholder="What would you like to research?"
            className="w-full bg-transparent border-none text-white placeholder:text-white/20 focus:ring-0 focus-visible:ring-0 focus:outline-none resize-none px-6 pt-7 pb-16 text-[18px] font-sans font-medium leading-relaxed pr-12"
            rows={3}
            autoFocus
            autoComplete="off"
            spellCheck="false"
          />
          
          {/* Ultra-sleek submit button */}
          <div className="absolute bottom-4 right-4">
            <button 
              type="submit" 
              disabled={loading || isNavigating || !topic.trim()} 
              className={`flex items-center justify-center h-8 w-8 rounded-full transition-all duration-300 ${
                topic.trim() 
                  ? 'bg-white text-black hover:scale-105' 
                  : 'bg-white/[0.05] text-white/20 cursor-not-allowed'
              }`}
            >
              {loading || isNavigating ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-[2px] border-black/20 border-t-black"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}
