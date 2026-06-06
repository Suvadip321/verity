'use client'

import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { ChatMessage } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function ChatInterface({ sessionId }: { sessionId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await api.get(`/sessions/${sessionId}/messages`)
        setMessages(res.data)
      } catch (error) {
        console.error('Failed to load chat history:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchMessages()
  }, [sessionId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [messages, sending])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || sending) return

    const userMsg = input.trim()
    setInput('')
    setSending(true)

    // Optimistic UI update — use a negative random int so it can never
    // collide with a real server-assigned positive integer ID.
    const tempId = -Math.floor(Math.random() * 1_000_000)
    setMessages(prev => [...prev, {
      id: tempId,
      session_id: Number(sessionId),
      role: 'user',
      content: userMsg,
      created_at: new Date().toISOString()
    }])

    try {
      const res = await api.post(`/sessions/${sessionId}/chat`, { question: userMsg })
      setMessages(prev => [...prev, {
        id: tempId - 1,
        session_id: Number(sessionId),
        role: 'assistant',
        content: res.data.answer,
        created_at: new Date().toISOString()
      }])
    } catch (error) {
      console.error('Chat failed:', error)
      setMessages(prev => [...prev, {
        id: tempId - 2,
        session_id: Number(sessionId),
        role: 'assistant',
        content: 'Sorry, I encountered an error communicating with the agent.',
        created_at: new Date().toISOString()
      }])
    } finally {
      setSending(false)
    }
  }

  const handleClearChat = async () => {
    const backup = [...messages];
    setMessages([])
    try {
      await api.delete(`/sessions/${sessionId}/chat`)
      toast.success('Chat memory cleared')
    } catch (error) {
      setMessages(backup)
      toast.error('Failed to clear chat')
    }
  }

  if (loading) return null

  return (
    <div className="relative bg-[#050505] border border-white/[0.06] rounded-2xl flex flex-col shadow-2xl overflow-hidden mt-16 h-[600px] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
      {/* Slim Toolbar */}
      {messages.length > 0 && (
        <div className="bg-white/[0.02] px-4 py-2 border-b border-white/[0.06] flex justify-end items-center">
          <Button 
            onClick={handleClearChat} 
            variant="ghost" 
            size="sm"
            className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 h-7 px-2.5 text-xs transition-colors"
            title="Clear Chat History"
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear
          </Button>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-6" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4 border border-zinc-700 shadow-inner">
              <svg className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-zinc-300 mb-2">Ask a follow-up question!</h4>
            <p className="text-zinc-500 text-base max-w-sm">
              I have thoroughly read all the sources listed above. I can summarize specific points, extract data, or explain complex concepts in more detail.
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`relative max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-3.5 pb-8 shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] rounded-br-none' 
                  : 'bg-white/[0.03] text-zinc-300 rounded-bl-none border border-white/[0.08] shadow-[0_0_20px_rgba(255,255,255,0.01)]'
              }`}>
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap text-sm md:text-base leading-relaxed">{msg.content}</p>
                ) : (
                  <div className="text-sm md:text-base leading-relaxed max-w-none break-words">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-outside ml-5 mb-3 space-y-1" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-5 mb-3 space-y-1" {...props} />,
                        li: ({node, ...props}) => <li className="pl-1" {...props} />,
                        a: ({node, ...props}) => <a className="text-blue-400 hover:text-blue-300 underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold text-zinc-100" {...props} />,
                        code: ({node, className, children, ...props}: any) => {
                          const match = /language-(\w+)/.exec(className || '')
                          const isInline = !match && !className
                          return isInline ? (
                            <code className="bg-zinc-950 text-zinc-300 px-1.5 py-0.5 rounded text-sm font-mono border border-zinc-800" {...props}>
                              {children}
                            </code>
                          ) : (
                            <pre className="bg-zinc-950 p-3 rounded-lg overflow-x-auto mb-3 border border-zinc-800 shadow-inner">
                              <code className="text-sm font-mono text-zinc-300" {...props}>
                                {children}
                              </code>
                            </pre>
                          )
                        },
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
                
                {/* Inline Copy Button */}
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(msg.content);
                    setCopiedId(msg.id);
                    setTimeout(() => setCopiedId(null), 2000);
                  }}
                  className={`absolute bottom-2 right-3 flex items-center gap-1 text-[11px] font-medium transition-all ${
                    copiedId === msg.id 
                      ? 'text-white' 
                      : `opacity-0 group-hover:opacity-100 ${msg.role === 'user' ? 'text-blue-200 hover:text-white' : 'text-zinc-500 hover:text-zinc-300'}`
                  }`}
                  title="Copy message"
                >
                  {copiedId === msg.id ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-white/[0.03] border border-white/[0.08] text-zinc-300 rounded-2xl rounded-bl-none px-5 py-4 flex gap-1.5 items-center shadow-sm">
              <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce"></div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-4 md:p-5 bg-[#050505] border-t border-white/[0.06]">
        <div className="relative flex items-center">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Can you summarize the second source?" 
            className="w-full bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500 focus-visible:shadow-[0_0_15px_rgba(59,130,246,0.3)] py-6 pr-12 text-base rounded-xl transition-all"
            disabled={sending}
            autoComplete="off"
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={sending || !input.trim()} 
            className="absolute right-1.5 w-9 h-9 bg-blue-900 hover:bg-blue-800 text-white transition-all shadow-[0_0_15px_rgba(30,58,138,0.4)] border border-blue-700/50 rounded-lg"
          >
            <svg className="w-4 h-4 translate-x-[-1px] translate-y-[1px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </Button>
        </div>
      </form>
    </div>
  )
}
