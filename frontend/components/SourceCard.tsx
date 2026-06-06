import { Source } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function SourceCard({ source }: { source: Source }) {
  // Extract domain from URL for cleaner display
  let domain = source.source_url
  try {
    domain = new URL(source.source_url).hostname.replace('www.', '')
  } catch {
    // Keep original if parsing fails
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all duration-300 flex flex-col h-full hover:shadow-md hover:-translate-y-1">
      <CardHeader className="pb-3 flex-none">
        <div className="flex items-center gap-2 mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          {domain}
        </div>
        <CardTitle className="text-base font-semibold leading-snug line-clamp-2">
          <a href={source.source_url} target="_blank" rel="noopener noreferrer" className="text-zinc-200 hover:text-blue-400 transition-colors">
            {source.title || source.source_url}
          </a>
        </CardTitle>
      </CardHeader>
      <CardContent className="mt-auto pt-2">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={`bg-zinc-950 border-zinc-800 ${source.relevance_score >= 4 ? 'text-emerald-400' : 'text-zinc-400'}`}>
            Relevance: {source.relevance_score}/5
          </Badge>
          <Badge variant="outline" className={`bg-zinc-950 border-zinc-800 ${source.credibility_score >= 4 ? 'text-emerald-400' : 'text-zinc-400'}`}>
            Credibility: {source.credibility_score}/5
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
