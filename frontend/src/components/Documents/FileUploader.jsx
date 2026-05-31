import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react'
import clsx from 'clsx'

const MAX_MB = 50

function UploadItem({ file, progress, status, error, onRemove }) {
  const sizeMB = (file.size / 1024 / 1024).toFixed(2)

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-base-50 border border-border animate-slide-up">
      <div className={clsx(
        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
        status === 'done'    ? 'bg-success/15 border border-success/30' :
        status === 'error'   ? 'bg-error/15 border border-error/30' :
                               'bg-accent-500/15 border border-accent-500/30',
      )}>
        {status === 'uploading' && <Loader2 className="w-4 h-4 text-accent-400 animate-spin" />}
        {status === 'done'      && <CheckCircle className="w-4 h-4 text-success" />}
        {status === 'error'     && <AlertCircle className="w-4 h-4 text-error" />}
        {status === 'pending'   && <FileText className="w-4 h-4 text-accent-400" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-text-primary text-xs font-medium truncate">{file.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-text-muted text-xs">{sizeMB} MB</span>
          {status === 'uploading' && (
            <>
              <div className="flex-1 h-1 bg-base-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-text-muted text-xs w-8 text-right">{progress}%</span>
            </>
          )}
          {status === 'done'  && <span className="text-success text-xs">Indexed ✓</span>}
          {status === 'error' && <span className="text-error text-xs truncate">{error}</span>}
        </div>
      </div>

      {status !== 'uploading' && (
        <button onClick={onRemove} className="text-text-muted hover:text-text-primary transition-colors flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

export default function FileUploader({ onUpload }) {
  const [queue, setQueue] = useState([])  // { id, file, progress, status, error }

  const processFile = useCallback(async (file) => {
    const id = `${file.name}-${Date.now()}`
    setQueue((q) => [...q, { id, file, progress: 0, status: 'uploading', error: null }])

    const result = await onUpload(file, (pct) => {
      setQueue((q) => q.map((item) => item.id === id ? { ...item, progress: pct } : item))
    })

    setQueue((q) => q.map((item) =>
      item.id === id
        ? { ...item, status: result.success ? 'done' : 'error', error: result.error || null, progress: 100 }
        : item,
    ))
  }, [onUpload])

  const onDrop = useCallback((accepted, rejected) => {
    rejected.forEach(({ file, errors }) => {
      const id = `${file.name}-${Date.now()}`
      const msg = errors[0]?.message || 'File rejected'
      setQueue((q) => [...q, { id, file, progress: 0, status: 'error', error: msg }])
    })
    accepted.forEach(processFile)
  }, [processFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept:   { 'application/pdf': ['.pdf'] },
    maxSize:  MAX_MB * 1024 * 1024,
    multiple: true,
  })

  const removeItem = (id) => setQueue((q) => q.filter((item) => item.id !== id))

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={clsx(
          'relative border-2 border-dashed rounded-xl px-6 py-10 text-center cursor-pointer transition-all duration-200',
          isDragActive
            ? 'border-accent-400 bg-accent-500/10 shadow-glow'
            : 'border-border hover:border-accent-500/60 hover:bg-accent-500/5',
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-3 pointer-events-none">
          <div className={clsx(
            'w-12 h-12 rounded-xl flex items-center justify-center transition-all',
            isDragActive
              ? 'bg-accent-500/20 border border-accent-500/40 shadow-glow'
              : 'bg-surface border border-border',
          )}>
            <Upload className={clsx('w-5 h-5 transition-colors', isDragActive ? 'text-accent-400' : 'text-text-muted')} />
          </div>

          <div>
            <p className="text-text-primary text-sm font-medium">
              {isDragActive ? 'Drop your PDFs here' : 'Drag & drop PDFs here'}
            </p>
            <p className="text-text-muted text-xs mt-1">
              or <span className="text-accent-300 underline">browse files</span> — PDF only, up to {MAX_MB} MB each
            </p>
          </div>
        </div>
      </div>

      {/* Upload queue */}
      {queue.length > 0 && (
        <div className="space-y-2">
          {queue.map((item) => (
            <UploadItem
              key={item.id}
              file={item.file}
              progress={item.progress}
              status={item.status}
              error={item.error}
              onRemove={() => removeItem(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
