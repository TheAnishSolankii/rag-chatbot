import { useState } from 'react'
import { FileText, ChevronDown, ChevronUp, BookOpen } from 'lucide-react'
import clsx from 'clsx'

function ScoreBar({ score }) {
  const pct = Math.round(score * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-base-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-text-muted text-xs font-mono w-8 text-right">{pct}%</span>
    </div>
  )
}

function CitationCard({ citation, index }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-base-50 hover:border-accent-500/40 transition-colors">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 px-3 py-2.5 text-left"
      >
        {/* Badge */}
        <span className="badge bg-accent-500/15 text-accent-300 border border-accent-500/25 flex-shrink-0 mt-0.5">
          [{index + 1}]
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-text-primary text-xs font-medium truncate max-w-[180px]">
              {citation.filename}
            </span>
            <span className="badge bg-surface text-text-muted border border-border">
              <BookOpen className="w-2.5 h-2.5" />
              p.{citation.page}
            </span>
          </div>
          <ScoreBar score={citation.relevance_score} />
        </div>

        {expanded
          ? <ChevronUp  className="w-3.5 h-3.5 text-text-muted flex-shrink-0 mt-0.5" />
          : <ChevronDown className="w-3.5 h-3.5 text-text-muted flex-shrink-0 mt-0.5" />
        }
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-border animate-fade-in">
          <p className="text-text-secondary text-xs leading-relaxed mt-2 font-mono bg-base rounded p-2 border border-border line-clamp-6">
            {citation.chunk_text}
          </p>
        </div>
      )}
    </div>
  )
}

export default function SourceCitations({ sources }) {
  const [open, setOpen] = useState(false)

  if (!sources || sources.length === 0) return null

  return (
    <div className="mt-3 animate-fade-in">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-text-muted hover:text-accent-300 transition-colors mb-2"
      >
        <FileText className="w-3.5 h-3.5" />
        <span>{sources.length} source{sources.length > 1 ? 's' : ''} cited</span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {open && (
        <div className="space-y-1.5 animate-slide-up">
          {sources.map((src, i) => (
            <CitationCard key={`${src.doc_id}-${src.page}-${i}`} citation={src} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
