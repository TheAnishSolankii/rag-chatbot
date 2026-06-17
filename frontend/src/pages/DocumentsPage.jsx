import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, RefreshCw, Database, Layers, Search, X } from 'lucide-react'
import { useDocuments } from "../hooks/useDocuments"
import { useToast } from '../../context/ToastContext'
import { useDebounce } from '../../hooks/utils'
import FileUploader from '../../components/Documents/FileUploader'
import DocumentList from '../../components/Documents/DocumentList'
import { StatCard } from '../../components/UI/Primitives'

export default function DocumentsPage() {
  const toast = useToast()
  const { documents, loading, error, fetchDocuments, uploadDocument, deleteDocument } = useDocuments()
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 250)

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  const filtered = debouncedQuery.trim()
    ? documents.filter((d) => d.filename.toLowerCase().includes(debouncedQuery.toLowerCase()))
    : documents

  const totalPages  = documents.reduce((s, d) => s + d.page_count, 0)
  const totalChunks = documents.reduce((s, d) => s + d.chunk_count, 0)

  const handleUpload = async (file, onProgress) => {
    const result = await uploadDocument(file, onProgress)
    if (result.success) toast.success(`"${file.name}" indexed successfully.`)
    else                toast.error(result.error || 'Upload failed.')
    return result
  }

  const handleDelete = async (docId) => {
    const doc = documents.find((d) => d.doc_id === docId)
    const result = await deleteDocument(docId)
    if (result.success) toast.success(`"${doc?.filename}" removed.`)
    else                toast.error(result.error || 'Delete failed.')
    return result
  }

  return (
    <div className="h-full overflow-y-auto bg-base">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Documents</h1>
            <p className="text-text-muted text-sm mt-0.5">Upload PDFs to index them for AI search</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchDocuments} disabled={loading} className="btn-ghost text-sm">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            {documents.length > 0 && (
              <Link to="/chat" className="btn-primary text-sm">
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Chat</span>
              </Link>
            )}
          </div>
        </div>

        {documents.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Documents" value={documents.length} icon={Database} />
            <StatCard label="Ready" value={documents.filter(d => d.status === 'ready').length} icon={MessageSquare} />
            <StatCard label="Chunks" value={totalChunks.toLocaleString()} icon={Layers} />
            <StatCard label="Pages" value={totalPages.toLocaleString()} icon={Database} />
          </div>
        )}

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-widest">Upload</h2>
          <FileUploader onUpload={handleUpload} />
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-widest flex-shrink-0">
              Indexed documents
            </h2>
            {documents.length > 0 && (
              <div className="relative flex-1 max-w-xs ml-auto">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                <input type="text" placeholder="Filter by filename…" value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="input pl-8 pr-8 py-1.5 text-xs h-8" />
                {query && (
                  <button onClick={() => setQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
          {debouncedQuery && (
            <p className="text-text-muted text-xs">
              {filtered.length} of {documents.length} match
            </p>
          )}
          <DocumentList documents={filtered} loading={loading} error={error} onDelete={handleDelete} />
        </section>
      </div>
    </div>
  )
}
