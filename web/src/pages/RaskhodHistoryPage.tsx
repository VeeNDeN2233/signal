import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../lib/apiClient'

interface RaskhodRecord {
  id: number
  raskhod_date: string
  raskhod_time: string
  entries_count?: number
}

interface RaskhodEntry {
  employee_id: number
  last_name: string
  first_name: string
  middle_name?: string | null
  status_id: number
  status_name: string
}

interface RaskhodDetail {
  id: number
  raskhod_date: string
  raskhod_time: string
  entries: RaskhodEntry[]
}

interface Meta {
  page: number
  page_size: number
  total: number
}

function formatDate(dateStr: string): string {
  // dateStr: "YYYY-MM-DD"
  const [y, m, d] = dateStr.split('-')
  return `${d}.${m}.${y}`
}

export function RaskhodHistoryPage() {
  const [records, setRecords] = useState<RaskhodRecord[]>([])
  const [meta, setMeta] = useState<Meta>({ page: 1, page_size: 20, total: 0 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<RaskhodDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const fetchHistory = useCallback((p: number) => {
    setLoading(true)
    setLoadError(null)
    apiClient
      .get<{ data: RaskhodRecord[]; meta: Meta }>('/raskhod', {
        params: { page: p, page_size: 20 },
      })
      .then((res) => {
        setRecords(res.data.data)
        setMeta(res.data.meta)
      })
      .catch(() => setLoadError('Ошибка загрузки истории'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchHistory(page)
  }, [fetchHistory, page])

  function handleRowClick(id: number) {
    if (selectedId === id) {
      // Закрыть детали при повторном клике
      setSelectedId(null)
      setDetail(null)
      return
    }
    setSelectedId(id)
    setDetail(null)
    setDetailError(null)
    setDetailLoading(true)
    apiClient
      .get<{ data: RaskhodDetail }>(`/raskhod/${id}`)
      .then((res) => setDetail(res.data.data))
      .catch(() => setDetailError('Ошибка загрузки деталей'))
      .finally(() => setDetailLoading(false))
  }

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.page_size))

  return (
    <div style={pageStyle}>
      <div style={headerRowStyle}>
        <h1 style={titleStyle}>История расходов</h1>
        <Link to="/raskhod" style={backLinkStyle}>← Новый расход</Link>
      </div>

      {loadError && <div style={errorBannerStyle}>{loadError}</div>}

      {loading ? (
        <p style={{ color: '#64748b' }}>Загрузка...</p>
      ) : records.length === 0 ? (
        <p style={{ color: '#64748b' }}>Расходов пока нет</p>
      ) : (
        <>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
            Нажмите на строку для просмотра деталей
          </p>
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Дата</th>
                  <th style={thStyle}>Время</th>
                  <th style={thStyle}>Сотрудников</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec, idx) => {
                  const isSelected = selectedId === rec.id
                  return (
                    <React.Fragment key={rec.id}>
                      <tr
                        onClick={() => handleRowClick(rec.id)}
                        style={{
                          ...(idx % 2 === 0 ? rowEvenStyle : rowOddStyle),
                          cursor: 'pointer',
                          ...(isSelected ? selectedRowStyle : {}),
                        }}
                      >
                        <td style={tdStyle}>{formatDate(rec.raskhod_date)}</td>
                        <td style={tdStyle}>{rec.raskhod_time}</td>
                        <td style={tdStyle}>{rec.entries_count ?? '—'}</td>
                      </tr>
                      {isSelected && (
                        <tr>
                          <td colSpan={3} style={detailCellStyle}>
                            {detailLoading && (
                              <p style={{ color: '#64748b', margin: 0 }}>Загрузка деталей...</p>
                            )}
                            {detailError && (
                              <div style={errorBannerStyle}>{detailError}</div>
                            )}
                            {detail && (
                              <div>
                                <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
                                  Расход от {formatDate(detail.raskhod_date)} {detail.raskhod_time}
                                </div>
                                <table style={{ ...tableStyle, fontSize: 13 }}>
                                  <thead>
                                    <tr>
                                      <th style={{ ...thStyle, fontSize: 12 }}>№</th>
                                      <th style={{ ...thStyle, textAlign: 'left', fontSize: 12 }}>ФИО</th>
                                      <th style={{ ...thStyle, textAlign: 'left', fontSize: 12 }}>Статус</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {detail.entries.map((entry, i) => (
                                      <tr key={entry.employee_id} style={i % 2 === 0 ? rowEvenStyle : rowOddStyle}>
                                        <td style={{ ...tdCenterStyle, fontSize: 13 }}>{i + 1}</td>
                                        <td style={{ ...tdStyle, fontSize: 13 }}>
                                          {[entry.last_name, entry.first_name, entry.middle_name].filter(Boolean).join(' ')}
                                        </td>
                                        <td style={{ ...tdStyle, fontSize: 13 }}>
                                          <span style={statusBadgeStyle(entry.status_name)}>
                                            {entry.status_name}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Пагинация */}
          {totalPages > 1 && (
            <div style={paginationStyle}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={page === 1 ? disabledPageBtnStyle : pageBtnStyle}
              >
                ← Назад
              </button>
              <span style={{ fontSize: 14, color: '#374151' }}>
                Страница {page} из {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={page === totalPages ? disabledPageBtnStyle : pageBtnStyle}
              >
                Вперёд →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function statusBadgeStyle(statusName: string): React.CSSProperties {
  const colors: Record<string, { bg: string; color: string }> = {
    'налицо': { bg: '#dcfce7', color: '#15803d' },
    'болен': { bg: '#fef9c3', color: '#854d0e' },
    'наряд': { bg: '#dbeafe', color: '#1d4ed8' },
    'командировка': { bg: '#ede9fe', color: '#6d28d9' },
    'отпуск': { bg: '#fce7f3', color: '#9d174d' },
    'незаконно отсутствует': { bg: '#fee2e2', color: '#b91c1c' },
  }
  const c = colors[statusName] ?? { bg: '#f1f5f9', color: '#374151' }
  return {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 500,
    background: c.bg,
    color: c.color,
  }
}

// Styles
const pageStyle: React.CSSProperties = {
  maxWidth: 800,
  margin: '0 auto',
  padding: '24px 16px',
  fontFamily: 'system-ui, sans-serif',
}

const headerRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 24,
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
  color: '#1e293b',
}

const backLinkStyle: React.CSSProperties = {
  color: '#2563eb',
  textDecoration: 'none',
  fontSize: 14,
}

const tableWrapStyle: React.CSSProperties = {
  overflowX: 'auto',
  marginBottom: 16,
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 14,
}

const thStyle: React.CSSProperties = {
  background: '#f1f5f9',
  padding: '8px 12px',
  borderBottom: '2px solid #e2e8f0',
  fontWeight: 600,
  color: '#374151',
  textAlign: 'center',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid #e2e8f0',
  color: '#1e293b',
  textAlign: 'center',
}

const tdCenterStyle: React.CSSProperties = {
  ...tdStyle,
  color: '#64748b',
  width: 40,
}

const rowEvenStyle: React.CSSProperties = { background: '#fff' }
const rowOddStyle: React.CSSProperties = { background: '#f8fafc' }
const selectedRowStyle: React.CSSProperties = { background: '#eff6ff' }

const detailCellStyle: React.CSSProperties = {
  padding: '12px 16px',
  background: '#f8fafc',
  borderBottom: '2px solid #e2e8f0',
}

const errorBannerStyle: React.CSSProperties = {
  background: '#fef2f2',
  border: '1px solid #fca5a5',
  color: '#b91c1c',
  borderRadius: 4,
  padding: '8px 12px',
  marginBottom: 12,
  fontSize: 14,
}

const paginationStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginTop: 8,
}

const pageBtnStyle: React.CSSProperties = {
  background: '#f1f5f9',
  color: '#374151',
  border: '1px solid #cbd5e1',
  borderRadius: 4,
  padding: '6px 14px',
  cursor: 'pointer',
  fontSize: 13,
}

const disabledPageBtnStyle: React.CSSProperties = {
  ...pageBtnStyle,
  color: '#94a3b8',
  cursor: 'not-allowed',
}
