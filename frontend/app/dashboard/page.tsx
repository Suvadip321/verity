'use client'

import { useEffect, useState, useRef } from 'react'
import { api } from '@/lib/api'
import { Session } from '@/types'
import { NewResearchDialog } from '@/components/NewResearchDialog'
import { AppLayout } from '@/components/AppLayout'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const STATUS_CONFIG = {
  completed: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.2)', label: 'Completed', glassBg: 'bg-white/[0.02]', hoverBg: 'hover:bg-white/[0.03]', glassBorder: 'border-white/[0.04]', hoverBorder: 'hover:border-white/[0.08]', hoverShadow: 'hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]' },
  in_progress: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.2)', label: 'In Progress', glassBg: 'bg-white/[0.02]', hoverBg: 'hover:bg-white/[0.03]', glassBorder: 'border-white/[0.04]', hoverBorder: 'hover:border-white/[0.08]', hoverShadow: 'hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]' },
  failed: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.2)', label: 'Failed', glassBg: 'bg-white/[0.02]', hoverBg: 'hover:bg-white/[0.03]', glassBorder: 'border-white/[0.04]', hoverBorder: 'hover:border-white/[0.08]', hoverShadow: 'hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]' },
  default: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.2)', label: 'New', glassBg: 'bg-white/[0.02]', hoverBg: 'hover:bg-white/[0.03]', glassBorder: 'border-white/[0.04]', hoverBorder: 'hover:border-white/[0.08]', hoverShadow: 'hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]' }
}

function getStatusConfig(status: string) {
  if (status === 'completed') return STATUS_CONFIG.completed;
  if (status === 'failed') return STATUS_CONFIG.failed;
  if (status === 'pending') return STATUS_CONFIG.default;
  return STATUS_CONFIG.in_progress;
}

function SessionCard({ session, index = 0, onDelete, onRename }: { session: Session, index?: number, onDelete: (id: number) => void, onRename: (id: number, newTopic: string) => void }) {
  const config = getStatusConfig(session.status);
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameTopic, setRenameTopic] = useState(session.topic);
  const [timeLeft, setTimeLeft] = useState(5);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isCommitting = useRef(false);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isRenaming]);

  const commitRename = () => {
    if (isCommitting.current) return;
    isCommitting.current = true;
    setIsRenaming(false);
    if (renameTopic.trim() && renameTopic.trim() !== session.topic) {
      onRename(session.id, renameTopic.trim());
    } else {
      setRenameTopic(session.topic);
    }
    setTimeout(() => { isCommitting.current = false; }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      commitRename();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setIsRenaming(false);
      setRenameTopic(session.topic);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (deleteMode) {
      setTimeLeft(5);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setDeleteMode(false);
            return 5;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [deleteMode]);

  const confirmDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (timerRef.current) clearInterval(timerRef.current);
    setDeleteMode(false);
    onDelete(session.id);
  };

  const circumference = 14 * Math.PI;
  const strokeDashoffset = circumference - (timeLeft / 5) * circumference;

  if (deleteMode) {
    return (
      <div className="bg-[#0f0f1a] border border-white/[0.08] rounded-xl min-h-[150px] flex flex-col justify-center items-center relative transition-all shadow-lg p-4">
        <p className="text-white text-[14px] font-medium mb-4">Delete this session?</p>
        <div className="flex gap-3 items-center">
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteMode(false); }} className="text-white/60 hover:text-white text-[13px] font-medium px-3 py-1.5 transition-colors">
            Cancel
          </button>
          <button onClick={confirmDelete} className="bg-red-500/10 text-red-500 hover:bg-red-500/20 text-[13px] font-medium px-4 py-1.5 rounded-md flex items-center gap-2 transition-colors relative">
            <span>Delete</span>
            <div className="relative w-4 h-4 flex items-center justify-center">
              <svg className="w-4 h-4 transform -rotate-90 absolute">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" fill="none" className="text-red-500/20" />
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" fill="none" className="text-red-500 transition-all duration-1000 ease-linear" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} />
              </svg>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={() => router.push(`/sessions/${session.id}`)}
      className={`block cursor-pointer relative group ${config.glassBg} ${config.hoverBg} backdrop-blur-md border ${config.glassBorder} ${config.hoverBorder} rounded-xl min-h-[150px] transition-all duration-[300ms] ease-out hover:-translate-y-1 overflow-visible flex flex-col ${config.hoverShadow} animate-fade-up opacity-0`}
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'forwards' }}
    >

      <div className="pt-[20px] px-[20px] pb-[16px] flex flex-col flex-1 h-full relative z-10 gap-y-4 justify-between">
        <div className="flex justify-between items-start">
          {isRenaming ? (
            <input
              ref={inputRef}
              type="text"
              value={renameTopic}
              onChange={(e) => setRenameTopic(e.target.value)}
              onBlur={commitRename}
              onKeyDown={handleKeyDown}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              className="w-full bg-black/20 border border-white/[0.1] text-white text-[15px] font-sans font-medium rounded-[6px] px-2 py-1 outline-none focus:border-white/[0.3] focus:bg-black/40 transition-all pr-6 mr-6 -ml-2 -mt-1 shadow-inner"
            />
          ) : (
            <h3 className="text-white text-[15px] font-sans font-medium line-clamp-2 pr-6">{session.topic}</h3>
          )}
          
          <div ref={menuRef} className="absolute right-4 top-4">
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(!menuOpen); }}
              className={`p-1 text-white transition-opacity duration-[180ms] ease-out ${menuOpen ? 'opacity-100' : 'opacity-30 group-hover:opacity-100'}`}
              aria-label="Session options"
              aria-expanded={menuOpen}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            </button>
            
            {menuOpen && (
              <div className="absolute right-0 top-6 mt-1 w-36 bg-[#16161f] border border-white/[0.1] rounded-[8px] shadow-xl overflow-hidden z-20 py-1" onClick={(e) => e.stopPropagation()}>
                <button onClick={(e) => { e.preventDefault(); router.push(`/sessions/${session.id}`); }} className="w-full flex items-center px-3 h-[32px] text-[13px] text-white/80 hover:bg-white/[0.05] transition-colors text-left">
                  Open
                </button>
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRenameTopic(session.topic); setIsRenaming(true); setMenuOpen(false); }} className="w-full flex items-center px-3 h-[32px] text-[13px] text-white/80 hover:bg-white/[0.05] transition-colors text-left">
                  Rename
                </button>
                <div className="h-[1px] bg-white/[0.05] my-1" />
                <button 
                  onClick={(e) => { e.preventDefault(); setDeleteMode(true); setMenuOpen(false); }} 
                  className="w-full flex items-center justify-between px-3 h-[32px] text-[13px] text-[#ef4444] hover:bg-white/[0.05] transition-colors text-left font-medium"
                >
                  Delete
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex items-center">
          <span className="inline-flex items-center text-[11px] font-medium" style={{ backgroundColor: config.bg, border: `1px solid ${config.border}`, color: config.color, padding: '3px 10px', borderRadius: '20px' }}>
            {config.label}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center text-[11px] text-zinc-400 font-medium">
            <svg className="w-3 h-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          
          <svg className="w-4 h-4 text-white/30 opacity-0 group-hover:opacity-100 transition-all duration-[180ms] ease-out transform -translate-x-2 group-hover:translate-x-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </div>
      </div>
    </div>
  );
}



export default function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQueryState, setSearchQuery] = useState('')
  const prevSessionsRef = useRef<Session[]>([])
  const deletingIdsRef = useRef<Set<number>>(new Set())
  const renamingSessionsRef = useRef<Map<number, string>>(new Map())

  useEffect(() => {
    // Find sessions that just transitioned to completed or failed
    const newlyFinished = sessions.filter(session => {
      if (session.status !== 'completed' && session.status !== 'failed') return false;
      const prevSession = prevSessionsRef.current.find(s => s.id === session.id);
      return prevSession && prevSession.status !== 'completed' && prevSession.status !== 'failed';
    });

    newlyFinished.forEach(session => {
      if (session.status === 'completed') {
        toast.success(`Research completed: ${session.topic}`);
      } else if (session.status === 'failed') {
        toast.error(`Research failed: ${session.topic}`);
      }
    });

    prevSessionsRef.current = sessions;
  }, [sessions]);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/sessions')
      const activeSessions = res.data.filter((s: Session) => !deletingIdsRef.current.has(Number(s.id)))
      const mergedSessions = activeSessions.map((s: Session) => {
        if (renamingSessionsRef.current.has(Number(s.id))) {
          return { ...s, topic: renamingSessionsRef.current.get(Number(s.id)) };
        }
        return s;
      });
      setSessions(mergedSessions)
    } catch (error) {
      console.error('Failed to load sessions', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  // Smart Polling: Only poll the server if there is an active session
  useEffect(() => {
    const hasInProgress = sessions.some(s => s.status !== 'completed' && s.status !== 'failed');
    if (!hasInProgress) return;

    const interval = setInterval(() => {
      fetchSessions();
    }, 5000);

    return () => clearInterval(interval);
  }, [sessions]);

  const handleDeleteSession = (id: number) => {
    const sessionToDelete = sessions.find(s => s.id === id);
    if (!sessionToDelete) return;

    deletingIdsRef.current.add(id);

    // Optimistic removal and immediate popup
    setSessions(prev => prev.filter(s => s.id !== id));

    let isUndone = false;

    // Immediate toast with Undo action
    toast.success('Session deleted', {
      action: {
        label: 'Undo',
        onClick: () => {
          isUndone = true;
          deletingIdsRef.current.delete(id);
          // Revert optimistic update instantly
          setSessions(prev => [sessionToDelete, ...prev].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        }
      },
      duration: 5000,
      position: 'bottom-right'
    });

    // Wait 5 seconds, if not undone, securely execute API call
    setTimeout(async () => {
      if (!isUndone) {
        try {
          await api.delete(`/sessions/${id}`);
          deletingIdsRef.current.delete(id);
        } catch (error) {
          console.error('Failed to delete session', error);
          toast.error('Failed to delete session on server');
          deletingIdsRef.current.delete(id);
          // Revert optimistic if server fails
          setSessions(prev => [sessionToDelete, ...prev].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        }
      }
    }, 5000);
  };

  const handleRenameSession = async (id: number, newTopic: string) => {
    const sessionToRename = sessions.find(s => s.id === id);
    if (!sessionToRename || sessionToRename.topic === newTopic) return;

    const previousTopic = sessionToRename.topic;
    renamingSessionsRef.current.set(id, newTopic);

    // Optimistic UI update and immediate popup
    setSessions(prev => prev.map(s => s.id === id ? { ...s, topic: newTopic } : s));
    toast.success('Session renamed');

    try {
      await api.patch(`/sessions/${id}`, { topic: newTopic });
    } catch (error) {
      console.error('Failed to rename session', error);
      toast.error('Failed to rename session on server');
      // Revert optimistic if server fails
      setSessions(prev => prev.map(s => s.id === id ? { ...s, topic: previousTopic } : s));
    } finally {
      renamingSessionsRef.current.delete(id);
    }
  };

  const filteredSessions = sessions.filter(session => 
    (session.topic || '').toLowerCase().includes((searchQueryState || '').toLowerCase())
  );

  return (
    <AppLayout>
      <div className="flex-1 w-full max-w-[1200px] mx-auto px-6 pt-[18px] pb-6 md:px-10 md:pt-[18px] md:pb-10 flex flex-col min-h-full">
        
        {/* Top Header Row */}
        <div className="flex flex-col mb-6 pb-[18px] border-b border-white/[0.06]">
          {/* Top Row: Title & Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h1 className="text-[28px] font-sans font-semibold text-white tracking-tight flex items-center gap-3">
              Research Sessions
            </h1>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-[220px] shrink-0 group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-white/40 group-focus-within:text-white/80 transition-colors duration-[150ms] ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQueryState}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 bg-[#0f0f1a] border border-white/[0.05] text-white text-[13px] rounded-[8px] pl-10 pr-4 focus:outline-none focus:border-white/[0.15] focus:shadow-[0_0_0_2px_rgba(255,255,255,0.03)] focus:bg-[#16161f] focus:placeholder-white/20 transition-all duration-[150ms] ease-out placeholder:text-white/30 hover:border-white/[0.1]"
                />
              </div>
              <div className="w-full sm:w-auto">
                <NewResearchDialog />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-2xl h-[160px] p-[22px] animate-pulse flex flex-col justify-between relative overflow-hidden">
                <div className="h-4 bg-white/[0.04] rounded w-2/3"></div>
                <div className="h-6 bg-white/[0.04] rounded-full w-24 mt-4"></div>
                <div className="h-3 bg-white/[0.03] rounded w-24 mt-auto"></div>
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 border border-white/[0.04] rounded-2xl bg-white/[0.01] relative overflow-hidden group transition-all duration-700 hover:border-white/[0.08] hover:bg-white/[0.02] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.03),transparent_50%)] transition-opacity duration-700 opacity-50 group-hover:opacity-100"></div>
            <div className="w-14 h-14 rounded-full bg-white/[0.02] flex items-center justify-center mb-5 relative z-10 border border-white/[0.06] shadow-[0_0_20px_rgba(255,255,255,0.02)] group-hover:scale-110 group-hover:bg-indigo-500/[0.08] group-hover:border-indigo-500/30 group-hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] transition-all duration-500">
              <svg className="w-6 h-6 text-white/50 group-hover:text-indigo-400 transition-colors duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-white text-[15px] font-medium mb-2 relative z-10">Start your first investigation</p>
            <p className="text-zinc-400 text-[13.5px] mb-8 relative z-10">Your research sessions will appear here.</p>
            <div className="relative z-10">
              <NewResearchDialog />
            </div>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex items-center justify-center py-16 border border-white/[0.05] rounded-xl bg-[#0f0f1a]">
            <p className="text-zinc-400 text-[13px]">No sessions match your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSessions.map((session, i) => (
              <SessionCard key={session.id} session={session} index={i} onDelete={handleDeleteSession} onRename={handleRenameSession} />
            ))}
          </div>
        )}

        {/* Empty Lower Half Fix */}
        <div className="mt-auto pt-16 pb-8 flex flex-col items-center">
          <div className="w-full border-t border-white/[0.04] mb-8" />
          <p className="text-[13px] text-zinc-500 text-center font-medium max-w-sm">
            Click any session to view the full research report.
          </p>
        </div>

      </div>
    </AppLayout>
  )
}
