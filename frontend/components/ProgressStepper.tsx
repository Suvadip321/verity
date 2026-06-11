'use client'

import React from 'react'
const STEPS = [
  { key: 'pending', label: 'Waiting to Start' },
  { key: 'planning', label: 'Generating Research Questions' },
  { key: 'searching', label: 'Searching the Web' },
  { key: 'evaluating_sources', label: 'Evaluating Sources' },
  { key: 'extracting', label: 'Reading Webpages' },
  { key: 'summarizing', label: 'Summarising Content' },
  { key: 'checking_sufficiency', label: 'Checking Information Coverage' },
  { key: 'embedding', label: 'Building Knowledge Base' },
  { key: 'generating_report', label: 'Writing Report' },
  { key: 'completed', label: 'Done' },
]

interface ProgressStepperProps {
  currentStep: string | null;
  status: string;
}

export function ProgressStepper({ currentStep, status }: ProgressStepperProps) {
  // Find index of current step. If currentStep is null, we assume we are at the beginning or completed.
  const currentIndex = currentStep 
    ? STEPS.findIndex(s => s.key === currentStep)
    : status === 'completed' ? STEPS.length : 0

  const progressPercentage = Math.min(100, Math.max(0, (currentIndex / (STEPS.length - 1)) * 100));

  return (
    <div className="flex justify-center w-full my-8">
      <div className="inline-flex items-center gap-4 px-5 py-2.5 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-full shadow-lg">
        
        {/* Status Icon */}
        <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
           {status === 'completed' ? (
             <svg className="w-4 h-4 text-emerald-500 animate-in zoom-in duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
             </svg>
           ) : status === 'failed' ? (
             <svg className="w-4 h-4 text-red-500 animate-in zoom-in duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
             </svg>
           ) : (
             <div className="w-3.5 h-3.5 border-[2px] border-white/20 border-t-white/90 rounded-full animate-spin" />
           )}
        </div>

        {/* Dynamic Text Area */}
        <div className="h-5 relative w-64 flex items-center overflow-hidden">
          {STEPS.map((step, idx) => {
            const isActive = idx === currentIndex && status !== 'completed' && status !== 'failed';
            const isDone = status === 'completed' && idx === STEPS.length - 1;
            const isFailed = status === 'failed' && idx === currentIndex;
            
            if (!isActive && !isDone && !isFailed) return null;

            return (
              <span 
                key={step.key}
                className="absolute inset-0 flex items-center text-[13px] font-sans font-medium text-white/80 tracking-wide animate-in slide-in-from-bottom-2 fade-in duration-500 whitespace-nowrap"
              >
                {status === 'completed' ? 'Research Complete' : status === 'failed' ? 'Research Failed' : step.label + '...'}
              </span>
            )
          })}
        </div>

        {/* Mini Progress Bar */}
        <div className="pl-4 border-l border-white/10 flex items-center">
          <div className="w-16 h-1 bg-white/[0.05] rounded-full overflow-hidden">
            <div 
              className="h-full bg-white/40 transition-all duration-1000 ease-out rounded-full"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

      </div>
    </div>
  )
}
