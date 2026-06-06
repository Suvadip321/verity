'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function ReportViewer({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(false)
  if (!markdown) return null

  // Strip LLM markdown codeblock wrappers if they exist
  let cleanMarkdown = markdown.trim()
  if (cleanMarkdown.startsWith('```markdown')) {
    cleanMarkdown = cleanMarkdown.replace(/^```markdown\n*/, '')
    cleanMarkdown = cleanMarkdown.replace(/\n*```$/, '')
  } else if (cleanMarkdown.startsWith('```')) {
    cleanMarkdown = cleanMarkdown.replace(/^```\n*/, '')
    cleanMarkdown = cleanMarkdown.replace(/\n*```$/, '')
  }
  
  const handleCopy = () => {
    navigator.clipboard.writeText(cleanMarkdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 md:p-10 shadow-lg mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative group">
      
      {/* Copy Button */}
      <button 
        onClick={handleCopy}
        className={`absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-all text-xs font-medium shadow-sm z-10 ${
          copied 
            ? 'border-zinc-600 bg-zinc-700 text-white opacity-100' 
            : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 hover:border-zinc-600 opacity-0 group-hover:opacity-100'
        }`}
        title="Copy raw markdown"
      >
        {copied ? (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Copied
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy Report
          </>
        )}
      </button>

      <article className="max-w-none break-words">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({node, ...props}) => <h1 className="text-3xl md:text-4xl font-extrabold text-zinc-100 mt-2 mb-6 tracking-tight leading-tight" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-2xl md:text-3xl font-bold text-zinc-200 mt-10 mb-4 border-b border-zinc-800 pb-3" {...props} />,
            h3: ({node, ...props}) => <h3 className="text-xl md:text-2xl font-semibold text-zinc-300 mt-8 mb-4" {...props} />,
            p: ({node, ...props}) => <p className="text-zinc-400 text-base md:text-lg leading-relaxed mb-6" {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc list-outside ml-6 mb-6 text-zinc-400 space-y-2 text-base md:text-lg" {...props} />,
            ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-6 mb-6 text-zinc-400 space-y-2 text-base md:text-lg" {...props} />,
            li: ({node, ...props}) => <li className="pl-2" {...props} />,
            a: ({node, ...props}) => <a className="text-blue-400 hover:text-blue-300 underline underline-offset-4 decoration-blue-500/30 hover:decoration-blue-400 transition-all" target="_blank" rel="noopener noreferrer" {...props} />,
            blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-zinc-700 pl-6 italic text-zinc-500 mb-6 bg-zinc-900/40 py-4 pr-4 rounded-r-lg" {...props} />,
            code: ({node, className, children, ...props}: any) => {
              const match = /language-(\w+)/.exec(className || '')
              const isInline = !match && !className
              return isInline ? (
                <code className="bg-zinc-950 text-zinc-300 px-1.5 py-0.5 rounded text-sm font-mono border border-zinc-800" {...props}>
                  {children}
                </code>
              ) : (
                <pre className="bg-zinc-950 p-5 rounded-xl overflow-x-auto mb-6 border border-zinc-800 shadow-inner">
                  <code className="text-sm font-mono text-zinc-300" {...props}>
                    {children}
                  </code>
                </pre>
              )
            },
            table: ({node, ...props}) => <div className="overflow-x-auto mb-8 rounded-lg border border-zinc-800"><table className="w-full text-left border-collapse" {...props} /></div>,
            th: ({node, ...props}) => <th className="border-b border-zinc-700 bg-zinc-800/50 p-4 text-zinc-200 font-semibold text-sm" {...props} />,
            td: ({node, ...props}) => <td className="border-b border-zinc-800/50 p-4 text-zinc-400 text-sm bg-zinc-900/30" {...props} />,
            strong: ({node, ...props}) => <strong className="font-semibold text-zinc-200" {...props} />,
          }}
        >
          {cleanMarkdown}
        </ReactMarkdown>
      </article>
    </div>
  )
}
