'use client'

import React, { useState, useEffect, useRef } from 'react'
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
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let ignore = false;
    const fetchMessages = async () => {
      try {
        const res = await api.get(`/sessions/${sessionId}/messages`)
        if (!ignore) setMessages(res.data)
      } catch (error) {
        if (!ignore) console.error('Failed to load chat history:', error)
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    fetchMessages()
    return () => { ignore = true; }
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
      // Restore input so user doesn't lose their message
      setInput(userMsg)
      setMessages(prev => {
        return [...prev, {
          id: tempId - 2,
          session_id: Number(sessionId),
          role: 'assistant',
          content: 'Sorry, I encountered an error communicating with the agent.',
          created_at: new Date().toISOString()
        }]
      })
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

  const renderWithLineBreaks = (children: React.ReactNode) => {
    return React.Children.map(children, (child) => {
      if (typeof child === 'string') {
        const parts = child.split(/<br\s*\/?>/gi);
        return parts.map((part, i) => (
          <React.Fragment key={i}>
            {part}
            {i !== parts.length - 1 && <br className="my-1 block content-['']" />}
          </React.Fragment>
        ));
      }
      return child;
    });
  };

  if (loading) return null

  return (
    <div className="relative bg-gradient-to-b from-[#0a0a0c] to-[#050505] border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_40px_rgba(0,0,0,0.5)] rounded-2xl flex flex-col overflow-hidden mt-0 h-[calc(100vh-160px)] min-h-[500px] max-h-[800px] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
      {/* Slim Toolbar */}
      {messages.length > 0 && (
        <div className="bg-white/[0.02] px-4 py-2 border-b border-white/[0.06] flex justify-end items-center">
          <Button 
            onClick={handleClearChat} 
            variant="ghost" 
            size="sm"
            className="text-zinc-400 hover:text-red-400 hover:bg-red-500/10 h-7 px-2.5 text-xs transition-colors"
            title="Clear Chat History"
            aria-label="Clear Chat History"
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
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center mb-6 border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.15)]">
              <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-zinc-100 mb-2 tracking-tight">Ask a follow-up question</h4>
            <p className="text-zinc-400 text-base max-w-sm leading-relaxed">
              I have thoroughly read all the sources listed above. I can summarize specific points, extract data, or explain complex concepts in more detail.
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex group relative ${msg.role === 'user' ? 'justify-end' : 'flex-col w-full'}`}>
              <div className={`relative ${
                msg.role === 'user' 
                  ? 'max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-4 bg-gradient-to-br from-[#13131f] to-[#0c0c14] border border-indigo-500/10 text-zinc-100 shadow-[0_4px_20px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] rounded-br-sm' 
                  : 'w-full py-4 text-zinc-300'
              }`}>
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap text-sm md:text-base leading-relaxed">{msg.content}</p>
                ) : (
                  <div className="text-sm md:text-base leading-relaxed w-full break-words prose-invert prose-p:mb-4">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({node, children, ...props}) => <p className="mb-4 last:mb-0 whitespace-pre-wrap" {...props}>{renderWithLineBreaks(children)}</p>,
                        ul: ({node, ...props}) => <ul className="list-disc list-outside ml-5 mb-4 space-y-1.5" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-5 mb-4 space-y-1.5" {...props} />,
                        li: ({node, children, ...props}) => <li className="pl-1" {...props}>{renderWithLineBreaks(children)}</li>,
                        a: ({node, ...props}) => <a className="text-blue-400 hover:text-blue-300 underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold text-zinc-100" {...props} />,
                        table: ({node, ...props}) => <div className="overflow-x-auto mb-4 rounded-lg border border-zinc-800"><table className="w-full text-left border-collapse" {...props} /></div>,
                        th: ({node, ...props}) => <th className="border-b border-zinc-700 bg-zinc-800/50 p-3 text-zinc-200 font-semibold text-sm" {...props} />,
                        td: ({node, children, ...props}) => <td className="border-b border-zinc-800/50 p-3 text-zinc-400 text-sm bg-zinc-900/30" {...props}>{renderWithLineBreaks(children)}</td>,
                        code: ({node, className, children, ...props}: any) => {
                          const match = /language-(\w+)/.exec(className || '')
                          const isInline = !match && !className
                          return isInline ? (
                            <code className="bg-zinc-950 text-zinc-300 px-1.5 py-0.5 rounded text-sm font-mono border border-zinc-800" {...props}>
                              {children}
                            </code>
                          ) : (
                            <pre className="bg-zinc-950 p-4 rounded-lg overflow-x-auto mb-4 border border-zinc-800 shadow-inner w-full">
                              <code className="text-sm font-mono text-zinc-300" {...props}>
                                {children}
                              </code>
                            </pre>
                          )
                        },
                      }}
                    >
                      {(msg.content || '')
                        .replace(/\[?\s*\[[\d,\s]+\]\([^)]+\)\s*\]?(?:\s*,\s*)?/g, '')
                        .replace(/\[[\d,\s]+\](?:\s*,\s*)?/g, '')
                        .replace(/(?:,\s*)+(?=\.)/g, '')
                        .replace(/\s+\./g, '.')}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {sending && (
          <div className="flex justify-start w-full">
            <div className="py-4 flex gap-2 items-center">
              <div className="w-1.5 h-1.5 bg-indigo-400/60 rounded-full animate-pulse"></div>
              <div className="w-1.5 h-1.5 bg-indigo-400/60 rounded-full animate-pulse [animation-delay:150ms]"></div>
              <div className="w-1.5 h-1.5 bg-indigo-400/60 rounded-full animate-pulse [animation-delay:300ms]"></div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-4 md:p-6 bg-gradient-to-t from-[#050505] to-transparent border-t border-white/[0.02] relative z-10">
        <div className="relative flex items-center group/input">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full bg-[#0a0a0c]/80 backdrop-blur-2xl border-white/[0.05] text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/30 focus-visible:shadow-[0_0_30px_rgba(99,102,241,0.08)] hover:border-white/[0.1] py-6 pr-14 pl-5 text-base rounded-2xl transition-all duration-300"
            disabled={sending}
            autoComplete="off"
            aria-label="Chat input"
          />
          <Button 
            type="submit" 
            size="icon"
            aria-label="Send message"
            disabled={sending || !input.trim()} 
            className={`absolute right-2 w-10 h-10 transition-all rounded-xl border-0 shadow-none ${
              input.trim() && !sending
                ? 'bg-white/[0.05] text-white hover:bg-white/[0.1]' 
                : 'bg-transparent text-zinc-500'
            }`}
          >
            <svg className="w-4 h-4 translate-x-[-1px] translate-y-[1px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </Button>
        </div>
      </form>
    </div>
  )
}
