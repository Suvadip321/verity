export interface Session {
  id: number;
  user_id: string;
  topic: string;
  status: 'pending' | 'planning' | 'searching' | 'evaluating_sources' | 'extracting' | 'summarizing' | 'checking_sufficiency' | 'embedding' | 'generating_report' | 'completed' | 'failed';
  current_step: string | null;
  report_markdown: string | null;
  error_message: string | null;
  created_at: string;
}

export interface Question {
  id: number;
  session_id: number;
  question: string;
}

export interface Source {
  id: number;
  session_id: number;
  title: string;
  source_url: string;
  relevance_score: number;
  credibility_score: number;
  usefulness_score: number;
  summary: string | null;
}

export interface ChatMessage {
  id: number;
  session_id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}
