'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { AxiosError } from 'axios'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'

export function NewResearchDialog() {
  const [open, setOpen] = useState(false)
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim()) return

    setLoading(true)
    try {
      const createRes = await api.post('/sessions', { topic })
      const sessionId = createRes.data.id

      await api.post(`/sessions/${sessionId}/run`)

      toast.success('Research started successfully!')
      
      // Do not close the dialog here. Keep the "Starting..." spinner visible 
      // until the Next.js router completely finishes navigating to the new page.
      router.push(`/sessions/${sessionId}`)
    } catch (error: unknown) {
      console.error(error)
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-900 text-white hover:bg-blue-800 font-semibold px-6 shadow-[0_0_15px_rgba(30,58,138,0.4)] border border-blue-700/50 rounded-lg transition-all">
          <Plus className="w-4 h-4 mr-2" />
          New Research
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-zinc-900 border-zinc-800 text-zinc-100 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Start New Deep Dive</DialogTitle>
          <DialogDescription className="text-zinc-400 mt-2">
            Enter a topic or a specific question. Verity will autonomously search the web, evaluate sources, and compile a comprehensive report for you.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-4">
          <div className="grid gap-4 py-4">
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Impact of Quantum Computing on RSA Encryption"
              className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500 focus-visible:shadow-[0_0_15px_rgba(59,130,246,0.3)] py-6 text-base rounded-xl transition-all"
              autoFocus
              autoComplete="off"
            />
          </div>
          <DialogFooter className="mt-4">
            <Button 
              type="submit" 
              disabled={loading || !topic.trim()} 
              className="bg-blue-900 text-white hover:bg-blue-800 font-semibold w-full sm:w-auto px-8 transition-all rounded-lg shadow-[0_0_15px_rgba(30,58,138,0.4)] border border-blue-700/50"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Starting...
                </div>
              ) : 'Start Research'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
