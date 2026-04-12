import React, { useState, useEffect, useCallback } from 'react'
import apiClient from '../../lib/apiClient'

interface EventEntry {
  event_id: number
  event_type: string
  event_time: string
  actor_login: string
  actor_role: string
  unit_name: string | null
  detail: string | null
}

interface Meta { page: number; page_size: number; total: number }

type FilterType = 'all' | 'auth' | 'alerts' | 'raskhod'

const EVENT_LABELS: Record<string, string> = {
  login: 'Вход в систему',
  logout: 'Выход из системы',
  alert_declared: 'Объявление тревоги',
  alert_response: 'Отклик на тревогу',
  raskhod_created: 'Создание расхода',
}

const ROLE_LABELS: Record<string, string> = {
  user: 'Сотрудник',
  commander: 'Руководитель',
  admin: 'Администратор',
}

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Все события' },
  { value: 'auth', label: 'Входы / Выходы' },
  { value: 'alerts', label: 'Тревоги' },
  { value: 'raskhod', label: 'Расход' },
]

function formatDT(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export function AuditLogPage() {
  const [entries, setEntries] = useState<EventEntry[]>([])
  const [meta, setMeta] = useState<Meta>({ page: 1, page_size: 50, total: 0 })
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<FilterType>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPage = useCallback((p: number, f: FilterType) => {
    setLoading(true)
    setError(null)
    apiClient.get<{ data: EventEntry[]; meta: Meta }>('/audit-log', {
      params: { page: p, page_size: 50, filter: f },
    })
      .then((r) => { setEntries(r.data.data); setMeta(r.data.meta) })
      .catch(() => setError('Ошибка загрузки журнала'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchPage(page, filter) }, [fetchPage, page, filter])

  function handleFilterChange(f: FilterType) {
    setFilter(f)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.page_size))

  return (
    <div>
      <h2 style={titleStyle}>Журнал событий</h2>

      <div style={toolbarStyle}>
        <div style={filterGroupStyle}>
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleFilterChange(opt.value)}
              style={filter === opt.value ? filterBtnActiveStyle : filterBtnStyle}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span style={totalLabelStyle}>
          Записей: {meta.total}
        </span>
      </div>

      {error && <div style={errorBannerStyle}>{error}</div>}

      {loading ? (
        <p style={{ color: '#64748b' }}>Загрузка...</p>
      ) : entries.length === 0 ? (
        <p style={{ color: '#64748b' }}>Событий не найдено</p>
      ) : (
        <>
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Дата и время</th>
                  <th style={thStyle}>Событие</th>
                  <th style={thStyle}>Пользователь</th>
                  <th style={thStyle}>Роль</th>
                  <th style={thStyle}>Подразделение</th>
                  <th style={thStyle}>Подробности</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, idx) => (
                  <tr key={`${e.event_type}-${e.event_id}`} style={idx % 2 === 0 ? rowEvenStyle : rowOddStyle}>
                    <td style={tdStyle}>{formatDT(e.event_time)}</td>
                    <td style={tdStyle}>
                      <span style={eventBadgeStyle(e.event_type)}>
                        {EVENT_LABELS[e.event_type] ?? e.event_type}
                      </span>
                    </td>
                    <td style={tdStyle}><strong>{e.actor_login}</strong></td>
                    <td style={tdCenterStyle}>
                      <span style={roleBadgeStyle(e.actor_role)}>
                        {ROLE_LABELS[e.actor_role] ?? e.actor_role}
                      </span>
                    </td>
                    <td style={tdStyle}>{e.unit_name ?? '—'}</td>
                    <td style={tdStyle}>{e.detail ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={paginationStyle}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={page === 1 ? disabledBtnStyle : pageBtnStyle}
              >
                Назад
              </button>
              <span style={{ fontSize: 14, color: '#374151' }}>Стр. {page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={page === totalPages ? disabledBtnStyle : pageBtnStyle}
              >
                Вперёд
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function eventBadgeStyle(type: string): React.CSSProperties {
  const map: Record<string, { bg: string; color: string }> = {
    login:            { bg: '#dcfce7', color: '#166534' },
    logout:           { bg: '#f1f5f9', color: '#475569' },
    alert_declared:   { bg: '#fee2e2', color: '#991b1b' },
    alert_response:   { bg: '#fef3c7', color: '#92400e' },
    raskhod_created:  { bg: '#dbeafe', color: '#1e40af' },
  }
  const c = map[type] ?? { bg: '#f1f5f9', color: '#374151' }
  return {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    background: c.bg,
    color: c.color,
    whiteSpace: 'nowrap',
  }
}

function roleBadgeStyle(role: string): React.CSSProperties {
  const colors: Record<string, { bg: string; color: string }> = {
    admin:     { bg: '#fef3c7', color: '#92400e' },
    commander: { bg: '#dbeafe', color: '#1d4ed8' },
    user:      { bg: '#f0fdf4', color: '#15803d' },
  }
  const c = colors[role] ?? { bg: '#f1f5f9', color: '#374151' }
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

const titleStyle: React.CSSProperties = { marginTop: 0, marginBottom: 12, fontSize: 20, color: '#1e293b' }

const toolbarStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  marginBottom: 16, flexWrap: 'wrap', gap: 12,
}

const filterGroupStyle: React.CSSProperties = {
  display: 'flex', gap: 4, flexWrap: 'wrap',
}

const filterBtnStyle: React.CSSProperties = {
  background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0',
  borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 500,
}

const filterBtnActiveStyle: React.CSSProperties = {
  ...filterBtnStyle,
  background: '#1e293b', color: '#fff', borderColor: '#1e293b',
}

const totalLabelStyle: React.CSSProperties = {
  fontSize: 13, color: '#64748b',
}

const errorBannerStyle: React.CSSProperties = {
  background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c',
  borderRadius: 4, padding: '8px 12px', marginBottom: 12, fontSize: 14,
}

const tableWrapStyle: React.CSSProperties = { overflowX: 'auto', marginBottom: 16 }
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 14 }

const thStyle: React.CSSProperties = {
  background: '#f1f5f9', padding: '8px 12px', borderBottom: '2px solid #e2e8f0',
  fontWeight: 600, color: '#374151', textAlign: 'left', whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '8px 12px', borderBottom: '1px solid #f1f5f9', color: '#1e293b', textAlign: 'left',
}

const tdCenterStyle: React.CSSProperties = { ...tdStyle, textAlign: 'center' }
const rowEvenStyle: React.CSSProperties = { background: '#fff' }
const rowOddStyle: React.CSSProperties = { background: '#fafafa' }

const paginationStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12 }

const pageBtnStyle: React.CSSProperties = {
  background: '#f1f5f9', color: '#374151', border: '1px solid #cbd5e1',
  borderRadius: 4, padding: '6px 14px', cursor: 'pointer', fontSize: 13,
}

const disabledBtnStyle: React.CSSProperties = {
  ...pageBtnStyle, color: '#94a3b8', cursor: 'not-allowed',
}
