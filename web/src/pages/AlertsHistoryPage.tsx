import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { CommanderNav } from '../components/CommanderNav'
import { commanderPageBody } from '../layout/commanderLayout'
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

function formatMonthYear(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', { month: 'long', year: 'numeric' })
}

export function AlertsHistoryPage() {
  const [records, setRecords] = useState<AlertRecord[]>([])
  const [meta, setMeta] = useState<Meta>({ page: 1, page_size: 200, total: 0 })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [coverageFilter, setCoverageFilter] = useState<'all' | 'full' | 'partial'>('all')
  const [detailSearch, setDetailSearch] = useState('')

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<AlertResponse[] | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const fetchHistory = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    apiClient.get<{ data: AlertRecord[]; meta: Meta }>('/alerts', { params: { page: 1, page_size: 200 } })
      .then((r) => { setRecords(r.data.data); setMeta(r.data.meta) })
      .catch(() => setLoadError('Ошибка загрузки истории тревог'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchHistory() }, [fetchHistory])

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

  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      if (coverageFilter === 'full' && rec.total_employees !== rec.responded_count) return false
      if (coverageFilter === 'partial' && rec.total_employees === rec.responded_count) return false
      if (!search.trim()) return true
      const q = search.trim().toLowerCase()
      const text = `${formatDateTime(rec.created_at)} ${rec.created_at}`.toLowerCase()
      return text.includes(q)
    })
  }, [records, search, coverageFilter])

  const groupedRecords = useMemo(() => {
    const map = new Map<string, AlertRecord[]>()
    for (const rec of filteredRecords) {
      const key = rec.created_at.slice(0, 7)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(rec)
    }
    return Array.from(map.entries()).map(([key, items]) => ({ key, items }))
  }, [filteredRecords])

  const filteredDetail = useMemo(() => {
    if (!detail) return []
    if (!detailSearch.trim()) return detail
    const q = detailSearch.trim().toLowerCase()
    return detail.filter((resp) =>
      [resp.last_name, resp.first_name, resp.middle_name].filter(Boolean).join(' ').toLowerCase().includes(q)
    )
  }, [detail, detailSearch])

  const respondedCount = detail?.filter((x) => x.responded_at !== null).length ?? 0
  const totalCount = detail?.length ?? 0

  return (
    <>
      <CommanderNav title="История тревог" />
      <div style={pageStyle}>
      <div style={filtersRowStyle}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по дате/времени..."
          style={searchInputStyle}
        />
        <div style={chipsRowStyle}>
          <button onClick={() => setCoverageFilter('all')} style={coverageFilter === 'all' ? chipActive : chipDefault}>Все</button>
          <button onClick={() => setCoverageFilter('full')} style={coverageFilter === 'full' ? chipActive : chipDefault}>Полный отклик</button>
          <button onClick={() => setCoverageFilter('partial')} style={coverageFilter === 'partial' ? chipActive : chipDefault}>Есть неответившие</button>
        </div>
      </div>

      <div style={layoutStyle}>
        <div style={leftPaneStyle}>
          {loadError && <div style={errorBannerStyle}>{loadError}</div>}
          {loading ? (
            <p style={{ color: '#64748b' }}>Загрузка...</p>
          ) : filteredRecords.length === 0 ? (
            <p style={{ color: '#64748b' }}>Записей не найдено</p>
          ) : (
            groupedRecords.map((group) => (
              <div key={group.key} style={{ marginBottom: 12 }}>
                <div style={monthHeaderStyle}>{formatMonthYear(group.items[0].created_at)}</div>
                {group.items.map((rec) => {
                  const isSelected = selectedId === rec.id
                  return (
                    <button
                      key={rec.id}
                      onClick={() => toggleDetail(rec.id)}
                      style={isSelected ? recordBtnActive : recordBtn}
                    >
                      {formatDateTime(rec.created_at)}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <div style={rightPaneStyle}>
          {!selectedId && <div style={emptyCardStyle}>Выберите запись тревоги слева</div>}
          {selectedId && (
            <div style={detailCardStyle}>
              {detailLoading && <p style={{ color: '#64748b' }}>Загрузка...</p>}
              {detailError && <div style={errorBannerStyle}>{detailError}</div>}
              {detail && (
                <>
                  <div style={detailHeaderStyle}>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>Отклики по тревоге</div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>
                      Приняли: {respondedCount} / {totalCount}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={detailSearch}
                    onChange={(e) => setDetailSearch(e.target.value)}
                    placeholder="Поиск сотрудника по ФИО..."
                    style={{ ...searchInputStyle, marginBottom: 10 }}
                  />
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
                      {filteredDetail.map((resp, i) => (
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
                          <td style={{ ...tdCenterStyle, fontSize: 13 }}>{formatTime(resp.responded_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8' }}>
        Загружено записей: {records.length} из {meta.total}
      </div>
      </div>
    </>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = { ...commanderPageBody }
const errorBannerStyle: React.CSSProperties = { background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', borderRadius: 4, padding: '8px 12px', marginBottom: 12, fontSize: 14 }

const filtersRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  alignItems: 'center',
  flexWrap: 'wrap',
  marginBottom: 14,
}
const searchInputStyle: React.CSSProperties = {
  width: 280,
  maxWidth: '100%',
  padding: '8px 10px',
  border: '1px solid #cbd5e1',
  borderRadius: 4,
  fontSize: 14,
}
const chipsRowStyle: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap' }
const chipDefault: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  borderRadius: 16,
  padding: '5px 10px',
  fontSize: 12,
  background: '#fff',
  color: '#475569',
  cursor: 'pointer',
}
const chipActive: React.CSSProperties = { ...chipDefault, border: '1px solid #2563eb', color: '#1d4ed8', background: '#eff6ff' }

const layoutStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '330px 1fr',
  gap: 14,
  alignItems: 'start',
}
const leftPaneStyle: React.CSSProperties = {
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  background: '#fff',
  padding: 10,
  maxHeight: '70vh',
  overflow: 'auto',
}
const rightPaneStyle: React.CSSProperties = {
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  background: '#fff',
  padding: 14,
  minHeight: 320,
}
const monthHeaderStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: 'uppercase',
  color: '#94a3b8',
  letterSpacing: '0.06em',
  fontWeight: 700,
  marginBottom: 6,
  paddingLeft: 4,
}
const recordBtn: React.CSSProperties = {
  width: '100%',
  textAlign: 'left',
  border: '1px solid #e2e8f0',
  background: '#fff',
  padding: '8px 10px',
  borderRadius: 6,
  cursor: 'pointer',
  marginBottom: 6,
  color: '#1e293b',
  fontSize: 14,
}
const recordBtnActive: React.CSSProperties = {
  ...recordBtn,
  border: '1px solid #2563eb',
  background: '#eff6ff',
}
const emptyCardStyle: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: 14,
  minHeight: 240,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
const detailCardStyle: React.CSSProperties = {}
const detailHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 10,
}

const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 14 }
const thStyle: React.CSSProperties = { background: '#f1f5f9', padding: '8px 12px', borderBottom: '2px solid #e2e8f0', fontWeight: 600, color: '#374151', textAlign: 'center', whiteSpace: 'nowrap' }
const tdStyle: React.CSSProperties = { padding: '9px 12px', borderBottom: '1px solid #e2e8f0', color: '#1e293b', textAlign: 'left' }
const tdCenterStyle: React.CSSProperties = { ...tdStyle, textAlign: 'center' }
const rowEvenStyle: React.CSSProperties = { background: '#fff' }
const rowOddStyle: React.CSSProperties = { background: '#f8fafc' }

const statusOk: React.CSSProperties = { display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500, background: '#dcfce7', color: '#15803d' }
const statusNo: React.CSSProperties = { display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500, background: '#fee2e2', color: '#b91c1c' }
