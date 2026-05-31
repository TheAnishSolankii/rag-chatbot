/**
 * useChatExport — exports the current conversation to Markdown or JSON file.
 *
 * Usage:
 *   const { exportMarkdown, exportJSON } = useChatExport(messages)
 *   <button onClick={exportMarkdown}>Download .md</button>
 */
import { useCallback } from 'react'

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function formatTimestamp(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: 'medium', timeStyle: 'short',
  })
}

export function useChatExport(messages) {
  // ── Markdown export ─────────────────────────────────────────────────────────
  const exportMarkdown = useCallback(() => {
    if (!messages.length) return

    const now      = new Date().toISOString().split('T')[0]
    const filename = `rag-chat-${now}.md`

    const lines = [
      '# RAG Chatbot — Conversation Export',
      `> Exported on ${formatTimestamp(new Date())}`,
      `> Messages: ${messages.length}`,
      '',
      '---',
      '',
    ]

    messages.forEach((msg) => {
      const role  = msg.role === 'user' ? '## 🧑 You' : '## 🤖 Assistant'
      const time  = msg.ts ? `*${formatTimestamp(msg.ts)}*` : ''
      lines.push(role, time, '', msg.content, '')

      if (msg.sources?.length) {
        lines.push('**Sources:**', '')
        msg.sources.forEach((src, i) => {
          lines.push(
            `${i + 1}. **${src.filename}** — Page ${src.page} ` +
            `(relevance: ${Math.round(src.relevance_score * 100)}%)`,
            `   > ${src.chunk_text.slice(0, 200)}…`,
            '',
          )
        })
      }

      lines.push('---', '')
    })

    downloadBlob(lines.join('\n'), filename, 'text/markdown;charset=utf-8')
  }, [messages])

  // ── JSON export ─────────────────────────────────────────────────────────────
  const exportJSON = useCallback(() => {
    if (!messages.length) return

    const now      = new Date().toISOString().split('T')[0]
    const filename = `rag-chat-${now}.json`

    const payload = {
      exported_at: new Date().toISOString(),
      message_count: messages.length,
      messages: messages.map((m) => ({
        role:      m.role,
        content:   m.content,
        timestamp: m.ts,
        sources:   m.sources ?? [],
      })),
    }

    downloadBlob(JSON.stringify(payload, null, 2), filename, 'application/json')
  }, [messages])

  return { exportMarkdown, exportJSON, hasMessages: messages.length > 0 }
}
