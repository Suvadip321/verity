'use client'

import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { Source } from '@/types'

export function ReportViewer({ markdown, sources = [] }: { markdown: string, sources?: Source[] }) {
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

  // Strip bold tags from headings to prevent breaking the h1/h2 styling
  cleanMarkdown = cleanMarkdown.replace(/^(#+)\s+\*\*(.*?)\*\*\s*$/gm, '$1 $2')

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanMarkdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const renderWithLineBreaks = (children: React.ReactNode) => {
    return React.Children.map(children, (child) => {
      if (typeof child === 'string') {
        const parts = child.split(/<br\s*\/?>/gi);
        return parts.map((part, i) => (
          <React.Fragment key={i}>
            {part}
            {i !== parts.length - 1 && <br className="my-2 block content-['']" />}
          </React.Fragment>
        ));
      }
      return child;
    });
  };

  return (
    <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] shadow-[0_0_40px_rgba(0,0,0,0.3)] rounded-2xl p-6 md:p-10 relative overflow-hidden group">
      {/* Glossy gradient accent */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-50"></div>
      
      {/* Premium Copy Button */}
      <button 
        onClick={handleCopy}
        className="absolute top-4 right-4 md:top-6 md:right-6 flex items-center justify-center min-w-[36px] h-[36px] px-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.08] text-white/40 hover:text-white border border-white/[0.05] hover:border-white/[0.15] transition-all z-10 backdrop-blur-md"
      >
        {copied ? (
          <svg className="w-4 h-4 text-white animate-in zoom-in duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth={2}></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"></path>
          </svg>
        )}
      </button>

      <article className="max-w-none prose prose-invert 
        prose-headings:font-serif prose-headings:tracking-tight prose-headings:text-zinc-100
        prose-h1:text-4xl prose-h1:mb-8 prose-h1:font-bold prose-h1:text-zinc-100
        prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:text-zinc-200 prose-h2:border-b prose-h2:border-zinc-800/80 prose-h2:pb-4
        prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-h3:text-zinc-300
        prose-p:text-zinc-400 prose-p:text-base prose-p:md:text-lg prose-p:leading-relaxed prose-p:mb-6
        prose-strong:text-zinc-200 prose-strong:font-semibold
        prose-ul:text-zinc-400 prose-ul:my-6 prose-ul:space-y-2
        prose-ol:text-zinc-400 prose-ol:my-6 prose-ol:space-y-2
        prose-li:marker:text-blue-500
        prose-blockquote:border-l-4 prose-blockquote:border-blue-500/50 prose-blockquote:bg-blue-500/5 prose-blockquote:pl-6 prose-blockquote:py-2 prose-blockquote:text-zinc-300 prose-blockquote:italic
        prose-hr:border-zinc-800/80 prose-hr:my-10"
      >
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({node, ...props}) => <h1 className="text-4xl font-bold mb-8 text-zinc-100" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-2xl font-bold mt-12 mb-6 text-zinc-200 border-b border-zinc-800/80 pb-4" {...props} />,
            h3: ({node, ...props}) => <h3 className="text-xl font-semibold mt-8 mb-4 text-zinc-300" {...props} />,
            p: ({node, children, ...props}) => <p className="text-zinc-400 text-base md:text-lg leading-relaxed mb-6 whitespace-pre-wrap" {...props}>{renderWithLineBreaks(children)}</p>,
            ul: ({node, ...props}) => <ul className="list-disc pl-6 my-6 space-y-2 text-zinc-400 marker:text-blue-500" {...props} />,
            ol: ({node, ...props}) => <ol className="list-decimal pl-6 my-6 space-y-2 text-zinc-400 marker:text-blue-500" {...props} />,
            li: ({node, children, ...props}) => <li className="pl-2" {...props}>{renderWithLineBreaks(children)}</li>,
            a: ({node, href, children, ...props}) => (
              <a href={href} className="text-blue-400 hover:text-blue-300 underline underline-offset-4 decoration-blue-500/30 hover:decoration-blue-400 transition-all" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
            ),
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
            td: ({node, children, ...props}) => <td className="border-b border-zinc-800/50 p-4 text-zinc-400 text-sm bg-zinc-900/30" {...props}>{renderWithLineBreaks(children)}</td>,
            strong: ({node, ...props}) => <strong className="font-semibold text-zinc-200" {...props} />,
          }}
        >
          {cleanMarkdown}
        </ReactMarkdown>
      </article>
    </div>
  )
}
