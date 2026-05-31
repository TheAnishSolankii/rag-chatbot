import { useState, useCallback } from 'react'
import { documentsApi } from '../services/api'

export function useDocuments() {
  const [documents, setDocuments] = useState([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await documentsApi.list()
      setDocuments(data.documents || [])
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load documents.')
    } finally {
      setLoading(false)
    }
  }, [])

  const uploadDocument = useCallback(async (file, onProgress) => {
    try {
      const doc = await documentsApi.upload(file, onProgress)
      setDocuments((prev) => [...prev, doc])
      return { success: true, doc }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Upload failed.'
      return { success: false, error: msg }
    }
  }, [])

  const deleteDocument = useCallback(async (docId) => {
    try {
      await documentsApi.delete(docId)
      setDocuments((prev) => prev.filter((d) => d.doc_id !== docId))
      return { success: true }
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || 'Delete failed.' }
    }
  }, [])

  return { documents, loading, error, fetchDocuments, uploadDocument, deleteDocument }
}
