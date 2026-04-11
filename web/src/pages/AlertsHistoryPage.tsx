import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../lib/apiClient'

interface AlertRecord {
  id: number
  created_at: string
  total_employees: number
  responded_count: number
}

interface AlertResponse {
  employee_id: number
  last_name: string
  first_name: string
  middle_name: string | null
  responded_at: string | null
}

interface Meta { page: number; page_size: number; total: number }

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function AlertsHistoryPage() {
  const [records, setRecords] = useState<AlertRecord[]>([])
  const [meta, setMeta] = useState<Meta>({ page: 1, page_size: 20, total: 0 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<AlertResponse[] | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const fetchHistory = useCallback((p: number) => {
    setLoading(true)
    setLoadError(null)
    apiClient.get<{ data: AlertRecord[]; meta: Meta }>('/alerts', { params: { page: p, page_size: 20 } })
      .then((r) => { setRecords(r.data.data); setMeta(r.data.meta) })
      .catch(() => setLoadError('Ошибка загрузки истории тревог'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchHistory(page) }, [fetchHistory, page])

  function toggleDetail(id: number) {
    if (selectedId === id) { setSelectedId(null); setDetail(null); return }
    setSelectedId(id)
    setDetail(null)
    setDetailError(null)
    setDetailLoading(true)
    apiClient.get<{ data: AlertResponse[] }>(`/alerts/${id}/responses`)
      .then((r) => setDetail(r.data.data))
      .catch(() => setDetailError('Ошибка загрузки деталей'))
      .finally(() => setDetailLoading(false))
  }

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.page_size))

  return (
    <div style={pageStyle}>
      <div style={headerRowStyle}>
        <h1 style={titleStyle}>История тревог</h1>
        <div style={navLinksStyle}>
          <Link to="/alerts" style={navLinkStyle}>Тревога</Link>
          <Link to="/raskhod" style={navLinkStyle}>Расход</Link>
          <Link to="/raskhod/history" style={navLinkStyle}>История расходов</Link>
        </div>
      </div>

      {loadError && <div style={errorBannerStyle}>{loadError}</div>}

      {loading ? (
        <p style={{ color: '#64748b' }}>Загрузка...</p>
      ) : records.length === 0 ? (
        <p style={{ color: '#64748b' }}>Тревог пока не было</p>
      ) : (
        <>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
            Нажмите на строку для просмотра откликов
          </p>
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Дата и время</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec, idx) => {
                  const isSelected = selectedId === rec.id
                  return (
                    <React.Fragment key={rec.id}>
                      <tr
                        onClick={() => toggleDetail(rec.id)}
                        style={{
                          ...(idx % 2 === 0 ? rowEvenStyle : rowOddStyle),
                          cursor: 'pointer',
                          ...(isSelected ? selectedRowStyle : {}),
                        }}
                      >
                        <td style={tdStyle}>{formatDateTime(rec.created_at)}</td>
                      </tr>

                      {isSelected && (
                        <tr>
                          <td colSpan={1} style={detailCellStyle}>
                            {detailLoading && <p style={{ color: '#64748b', margin: 0 }}>Загрузка...</p>}
                            {detailError && <div style={errorBannerStyle}>{detailError}</div>}
                            {detail && (
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', marginBottom: 10 }}>
                                  Тревога от {formatDateTime(rec.created_at)}
                                </div>
                                <table style={{ ...tableStyle, fontSize: 13 }}>
                                  <thead>
                                    <tr>
                                      <th style={{ ...thStyle, fontSize: 12 }}>№</th>
                                      <th style={{ ...thStyle, textAlign: 'left', fontSize: 12 }}>ФИО</th>
                                      <th style={{ ...thStyle, fontSize: 12 }}>Статус</th>
                                      <th style={{ ...thStyle, fontSize: 12 }}>Время ответа</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {detail.map((resp, i) => (
                                      <tr key={resp.employee_id} style={i % 2 === 0 ? rowEvenStyle : rowOddStyle}>
                                        <td style={{ ...tdCenterStyle, fontSize: 13 }}>{i + 1}</td>
                                        <td style={{ ...tdStyle, fontSize: 13 }}>
                                          {[resp.last_name, resp.first_name, resp.middle_name].filter(Boolean).join(' ')}
                                        </td>
                                        <td style={{ ...tdCenterStyle, fontSize: 13 }}>
                                          {resp.responded_at !== null ? (
                                            <span style={statusOk}>Принял</span>
                                          ) : (
                                            <span style={statusNo}>Не ответил</span>
                                          )}
                                        </td>
                                        <td style={{ ...tdCenterStyle, fontSize: 13 }}>
                                          {formatTime(resp.responded_at)}
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

          {totalPages > 1 && (
            <div style={paginationStyle}>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={page === 1 ? disabledPageBtnStyle : pageBtnStyle}>
                ← Назад
              </button>
              <span style={{ fontSize: 14, color: '#374151' }}>Страница {page} из {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={page === totalPages ? disabledPageBtnStyle : pageBtnStyle}>
                Вперёд →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = { maxWidth: 900, margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' }
const headerRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }
const titleStyle: React.CSSProperties = { margin: 0, fontSize: 22, color: '#1e293b' }
const navLinksStyle: React.CSSProperties = { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }
const navLinkStyle: React.CSSProperties = { color: '#2563eb', textDecoration: 'none', fontSize: 14, fontWeight: 500, padding: '6px 12px', borderRadius: 4, border: '1px solid #2563eb' }

const errorBannerStyle: React.CSSProperties = { background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', borderRadius: 4, padding: '8px 12px', marginBottom: 12, fontSize: 14 }

const tableWrapStyle: React.CSSProperties = { overflowX: 'auto', marginBottom: 16 }
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 14 }
const thStyle: React.CSSProperties = { background: '#f1f5f9', padding: '8px 12px', borderBottom: '2px solid #e2e8f0', fontWeight: 600, color: '#374151', textAlign: 'center', whiteSpace: 'nowrap' }
const tdStyle: React.CSSProperties = { padding: '9px 12px', borderBottom: '1px solid #e2e8f0', color: '#1e293b', textAlign: 'left' }
const tdCenterStyle: React.CSSProperties = { ...tdStyle, textAlign: 'center' }
const rowEvenStyle: React.CSSProperties = { background: '#fff' }
const rowOddStyle: React.CSSProperties = { background: '#f8fafc' }
const selectedRowStyle: React.CSSProperties = { background: '#eff6ff' }

const detailCellStyle: React.CSSProperties = { padding: '12px 16px', background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }

const statusOk: React.CSSProperties = { display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500, background: '#dcfce7', color: '#15803d' }
const statusNo: React.CSSProperties = { display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500, background: '#fee2e2', color: '#b91c1c' }

const paginationStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }
const pageBtnStyle: React.CSSProperties = { background: '#f1f5f9', color: '#374151', border: '1px solid #cbd5e1', borderRadius: 4, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }
const disabledPageBtnStyle: React.CSSProperties = { ...pageBtnStyle, color: '#94a3b8', cursor: 'not-allowed' }
