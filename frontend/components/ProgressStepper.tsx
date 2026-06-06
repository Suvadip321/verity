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

  return (
    <div className="flex flex-col space-y-6 max-w-xl mx-auto my-12 p-8 bg-[#050505] border border-white/[0.08] rounded-2xl shadow-2xl relative overflow-hidden">
      <h3 className="text-xl font-semibold text-zinc-100 mb-4 relative z-10">Research Progress</h3>
      
      <div className="space-y-6 relative z-10 flex flex-col">
        {STEPS.map((step, idx) => {
          const isLast = idx === STEPS.length - 1
          const isPast = status === 'completed' || (currentIndex > idx)
          const isCurrent = status !== 'completed' && status !== 'failed' && currentIndex === idx
          const isFuture = status !== 'completed' && currentIndex < idx
          
          return (
            <div key={step.key} className={`relative flex items-center gap-5 transition-all duration-500 ${isFuture ? 'opacity-40' : 'opacity-100'}`}>
              
              {/* Vertical line connecting to next step */}
              {!isLast && (
                <div className={`absolute left-[15px] top-8 w-[2px] h-6 -z-10 ${isPast && status !== 'failed' ? 'bg-emerald-500/30' : 'bg-white/[0.06]'}`}></div>
              )}
              
              {/* Icon Container */}
              <div className="relative flex-shrink-0 w-8 h-8 flex items-center justify-center bg-[#050505] rounded-full z-10">
                {isPast && (
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                
                {isCurrent && (
                  <div className="relative flex items-center justify-center w-8 h-8">
                    <div className="absolute inset-0 rounded-full border-2 border-zinc-700"></div>
                    <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  </div>
                )}
                
                {(status === 'failed' && currentIndex === idx) && (
                  <div className="w-8 h-8 rounded-full bg-red-950 border border-red-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  </div>
                )}
                
                {isFuture && (
                  <div className="w-8 h-8 rounded-full bg-[#050505] border-2 border-white/[0.06] flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white/[0.06]"></div>
                  </div>
                )}
              </div>
              
              {/* Text */}
              <div className="flex-1">
                <span className={`text-base font-medium transition-colors duration-300 ${isCurrent ? 'text-blue-400' : isPast ? 'text-zinc-200' : 'text-zinc-500'}`}>
                  {step.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
