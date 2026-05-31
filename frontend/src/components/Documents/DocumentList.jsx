import { useState } from 'react'
import { FileText, Trash2, Calendar, Hash, Layers, AlertCircle, Loader2, BookOpen } from 'lucide-react'
import clsx from 'clsx'

function formatBytes(bytes) {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function StatusBadge({ status }) {
  const styles = {
    ready:      'bg-success/15 text-success border-success/25',
    processing: 'bg-warning/15 text-warning border-warning/25',
    error:      'bg-error/15 text-error border-error/25',
  }
  return (
    <span className={clsx('badge border', styles[status] || styles.error)}>
      {status === 'processing' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
      {status}
    </span>
  )
}

function DeleteConfirmModal({ filename, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative card p-6 max-w-sm w-full space-y-4 animate-slide-up shadow-card-hover">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-error/15 border border-error/25 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-error" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">Delete document?</h3>
            <p className="text-text-secondary text-sm mt-1">
              <span className="text-text-primary font-medium">{filename}</span> and all its
              indexed embeddings will be permanently removed.
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="btn-ghost text-sm" disabled={loading}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-error hover:bg-error/80 text-white text-sm font-medium transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function DocumentCard({ doc, onDelete }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting,    setDeleting]    = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete(doc.doc_id)
    setDeleting(false)
    setConfirmOpen(false)
  }

  return (
    <>
      <div className="card p-4 hover:border-accent-500/30 transition-all duration-200 group animate-fade-in">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-accent-400" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-text-primary text-sm font-medium truncate" title={doc.filename}>
                {doc.filename}
              </p>
              <StatusBadge status={doc.status} />
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
              <span className="flex items-center gap-1 text-text-muted text-xs">
                <BookOpen className="w-3 h-3" />
                {doc.page_count} page{doc.page_count !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1 text-text-muted text-xs">
                <Layers className="w-3 h-3" />
                {doc.chunk_count} chunks
              </span>
              <span className="flex items-center gap-1 text-text-muted text-xs">
                <Hash className="w-3 h-3" />
                {formatBytes(doc.size_bytes)}
              </span>
              <span className="flex items-center gap-1 text-text-muted text-xs">
                <Calendar className="w-3 h-3" />
                {formatDate(doc.upload_time)}
              </span>
            </div>
          </div>

          {/* Delete button */}
          <button
            onClick={() => setConfirmOpen(true)}
            className="opacity-0 group-hover:opacity-100 btn-danger p-1.5 flex-shrink-0 transition-all"
            title="Delete document"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {confirmOpen && (
        <DeleteConfirmModal
          filename={doc.filename}
          onConfirm={handleDelete}
          onCancel={() => setConfirmOpen(false)}
          loading={deleting}
        />
      )}
    </>
  )
}

function SkeletonCard() {
  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <div className="skeleton w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-3 w-1/2 rounded" />
        </div>
      </div>
    </div>
  )
}

export default function DocumentList({ documents, loading, error, onDelete }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-xl bg-error/10 border border-error/20 text-error text-sm">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>{error}</span>
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center">
          <FileText className="w-7 h-7 text-text-muted" />
        </div>
        <div>
          <p className="text-text-secondary font-medium">No documents yet</p>
          <p className="text-text-muted text-sm mt-1">Upload your first PDF to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <DocumentCard key={doc.doc_id} doc={doc} onDelete={onDelete} />
      ))}
    </div>
  )
}
