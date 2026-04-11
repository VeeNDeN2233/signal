import React, { useState, useEffect, useCallback } from 'react'
import apiClient from '../../lib/apiClient'

interface LogEntry {
  id: number
  user_id: number
  login: string
  role: string
  date_time_in: string
  date_time_out: string | null
}

interface Meta { page: number; page_size: number; total: number }

const ROLE_LABELS: Record<string, string> = {
  user: 'Сотрудник',
  commander: 'Руководитель',
  admin: 'Администратор',
}

function formatDT(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function duration(inIso: string, outIso: string | null): string {
  if (!outIso) return '—'
  const ms = new Date(outIso).getTime() - new Date(inIso).getTime()
  if (ms < 0) return '—'
  const sec = Math.floor(ms / 1000)
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m === 0) return `${s}с`
  const h = Math.floor(m / 60)
  const rm = m % 60
  if (h === 0) return `${m}м ${s}с`
  return `${h}ч ${rm}м`
}

export function AuditLogPage() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [meta, setMeta] = useState<Meta>({ page: 1, page_size: 50, total: 0 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPage = useCallback((p: number) => {
    setLoading(true)
    setError(null)
    apiClient.get<{ data: LogEntry[]; meta: Meta }>('/audit-log', { params: { page: p, page_size: 50 } })
      .then((r) => { setEntries(r.data.data); setMeta(r.data.meta) })
      .catch(() => setError('Ошибка загрузки журнала'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchPage(page) }, [fetchPage, page])

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.page_size))

  return (
    <div>
      <h2 style={titleStyle}>Журнал входов</h2>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
        Всего записей: {meta.total}
      </p>

      {error && <div style={errorBannerStyle}>{error}</div>}

      {loading ? (
        <p style={{ color: '#64748b' }}>Загрузка...</p>
      ) : entries.length === 0 ? (
        <p style={{ color: '#64748b' }}>Записей пока нет</p>
      ) : (
        <>
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Пользователь</th>
                  <th style={thStyle}>Роль</th>
                  <th style={thStyle}>Вход</th>
                  <th style={thStyle}>Выход</th>
                  <th style={thStyle}>Сессия</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, idx) => (
                  <tr key={e.id} style={idx % 2 === 0 ? rowEvenStyle : rowOddStyle}>
                    <td style={tdStyle}>
                      <strong>{e.login}</strong>
                    </td>
                    <td style={tdCenterStyle}>
                      <span style={roleBadgeStyle(e.role)}>
                        {ROLE_LABELS[e.role] ?? e.role}
                      </span>
                    </td>
                    <td style={tdStyle}>{formatDT(e.date_time_in)}</td>
                    <td style={tdStyle}>
                      {e.date_time_out ? formatDT(e.date_time_out) : (
                        <span style={{ color: '#16a34a', fontSize: 12, fontWeight: 500 }}>● онлайн</span>
                      )}
                    </td>
                    <td style={tdCenterStyle}>{duration(e.date_time_in, e.date_time_out)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={paginationStyle}>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={page === 1 ? disabledBtnStyle : pageBtnStyle}>
                ← Назад
              </button>
              <span style={{ fontSize: 14, color: '#374151' }}>Стр. {page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={page === totalPages ? disabledBtnStyle : pageBtnStyle}>
                Вперёд →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function roleBadgeStyle(role: string): React.CSSProperties {
  const colors: Record<string, { bg: string; color: string }> = {
    admin: { bg: '#fef3c7', color: '#92400e' },
    commander: { bg: '#dbeafe', color: '#1d4ed8' },
    user: { bg: '#f0fdf4', color: '#15803d' },
  }
  const c = colors[role] ?? { bg: '#f1f5f9', color: '#374151' }
  return { display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500, background: c.bg, color: c.color }
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const titleStyle: React.CSSProperties = { marginTop: 0, marginBottom: 4, fontSize: 20, color: '#1e293b' }
const errorBannerStyle: React.CSSProperties = { background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', borderRadius: 4, padding: '8px 12px', marginBottom: 12, fontSize: 14 }
const tableWrapStyle: React.CSSProperties = { overflowX: 'auto', marginBottom: 16 }
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 14 }
const thStyle: React.CSSProperties = { background: '#f1f5f9', padding: '8px 12px', borderBottom: '2px solid #e2e8f0', fontWeight: 600, color: '#374151', textAlign: 'center', whiteSpace: 'nowrap' }
const tdStyle: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid #f1f5f9', color: '#1e293b', textAlign: 'left' }
const tdCenterStyle: React.CSSProperties = { ...tdStyle, textAlign: 'center' }
const rowEvenStyle: React.CSSProperties = { background: '#fff' }
const rowOddStyle: React.CSSProperties = { background: '#fafafa' }
const paginationStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12 }
const pageBtnStyle: React.CSSProperties = { background: '#f1f5f9', color: '#374151', border: '1px solid #cbd5e1', borderRadius: 4, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }
const disabledBtnStyle: React.CSSProperties = { ...pageBtnStyle, color: '#94a3b8', cursor: 'not-allowed' }
