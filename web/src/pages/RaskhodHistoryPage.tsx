import React, { useState, useEffect, useCallback } from 'react'
import { CommanderNav } from '../components/CommanderNav'
import { commanderPageBody } from '../layout/commanderLayout'
import apiClient from '../lib/apiClient'

interface RaskhodRecord {
  id: number
  raskhod_date: string
  raskhod_time: string
  entries_count: number
}

interface RaskhodEntry {
  employee_id: number
  last_name: string
  first_name: string
  middle_name?: string | null
  status_id: number
  status_name: string
}

interface UserStatus {
  id: number
  name: string
}

interface RaskhodDetail {
  id: number
  raskhod_date: string
  raskhod_time: string
  unit_name?: string
  entries: RaskhodEntry[]
}

interface Meta {
  page: number
  page_size: number
  total: number
}

function extractYmd(dateStr: string): { y: string; m: string; d: string } {
  // Поддержка обоих форматов: "YYYY-MM-DD" и ISO "YYYY-MM-DDTHH:mm:ss.sssZ"
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) return { y: match[1], m: match[2], d: match[3] }
  return { y: '0000', m: '00', d: '00' }
}

function formatDate(dateStr: string): string {
  const { y, m, d } = extractYmd(dateStr)
  return `${d}.${m}.${y}`
}

function formatMonthYear(dateStr: string): string {
  const { y, m } = extractYmd(dateStr)
  const monthNames = [
    '', 'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
    'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
  ]
  return `${monthNames[Number(m)] ?? 'месяц'} ${y}`
}

const DOW = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
function dayOfWeek(dateStr: string): string {
  const { y, m, d } = extractYmd(dateStr)
  const dt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)))
  return DOW[dt.getUTCDay()]
}

function buildRecordName(dateStr: string, timeStr: string): string {
  return `Расход личного состава на ${formatDate(dateStr)} ${timeStr}`
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  'налицо':                { bg: '#dcfce7', color: '#15803d' },
  'болен':                 { bg: '#fef9c3', color: '#854d0e' },
  'наряд':                 { bg: '#dbeafe', color: '#1d4ed8' },
  'командировка':          { bg: '#ede9fe', color: '#6d28d9' },
  'отпуск':                { bg: '#fce7f3', color: '#9d174d' },
  'незаконно отсутствует': { bg: '#fee2e2', color: '#b91c1c' },
}

function statusBadge(name: string): React.CSSProperties {
  const c = STATUS_COLORS[name.toLowerCase()] ?? { bg: '#f1f5f9', color: '#374151' }
  return {
    display: 'inline-block', padding: '3px 10px', borderRadius: 20,
    fontSize: 12, fontWeight: 500, background: c.bg, color: c.color, whiteSpace: 'nowrap',
  }
}

// Группируем записи по месяцу
function groupByMonth(records: RaskhodRecord[]): { monthKey: string; items: RaskhodRecord[] }[] {
  const map = new Map<string, RaskhodRecord[]>()
  for (const r of records) {
    const key = r.raskhod_date.slice(0, 7) // YYYY-MM
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }
  return Array.from(map.entries()).map(([monthKey, items]) => ({ monthKey, items }))
}

export function RaskhodHistoryPage() {
  const [allRecords, setAllRecords] = useState<RaskhodRecord[]>([])
  const [, setMeta] = useState<Meta>({ page: 1, page_size: 200, total: 0 })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Фильтры
  const [searchDate, setSearchDate] = useState('')
  const [filterTime, setFilterTime] = useState<'all' | '09:00' | '21:00'>('all')

  const [statuses, setStatuses] = useState<UserStatus[]>([])
  const [selected, setSelected] = useState<RaskhodRecord | null>(null)
  const [detail, setDetail] = useState<RaskhodDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const [editMode, setEditMode] = useState(false)
  const [editEntries, setEditEntries] = useState<{ employee_id: number; status_id: number }[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    apiClient.get<{ data: UserStatus[] }>('/employees/statuses').then((r) => setStatuses(r.data.data)).catch(() => {})
  }, [])

  const fetchAll = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    // Загружаем все записи (до 200) — фильтрация на фронте
    apiClient.get<{ data: RaskhodRecord[]; meta: Meta }>('/raskhod', { params: { page: 1, page_size: 200 } })
      .then((r) => { setAllRecords(r.data.data); setMeta(r.data.meta) })
      .catch(() => setLoadError('Ошибка загрузки истории'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Применяем фильтры
  const filtered = allRecords.filter((r) => {
    if (filterTime !== 'all' && r.raskhod_time.slice(0, 5) !== filterTime) return false
    if (searchDate.trim()) {
      // Поиск: принимаем часть даты в формате DD, MM, YYYY или DD.MM или DD.MM.YYYY
      const q = searchDate.trim().toLowerCase()
      const formatted = formatDate(r.raskhod_date) // dd.mm.yyyy
      const iso = r.raskhod_date                   // yyyy-mm-dd
      if (!formatted.includes(q) && !iso.includes(q)) return false
    }
    return true
  })

  const grouped = groupByMonth(filtered)

  function selectRecord(rec: RaskhodRecord) {
    if (selected?.id === rec.id) return
    setSelected(rec)
    setDetail(null)
    setDetailError(null)
    setEditMode(false)
    setSaveSuccess(false)
    setSaveError(null)
    setDetailLoading(true)
    apiClient.get<{ data: RaskhodDetail }>(`/raskhod/${rec.id}`)
      .then((r) => setDetail(r.data.data))
      .catch(() => setDetailError('Ошибка загрузки деталей'))
      .finally(() => setDetailLoading(false))
  }

  function startEdit() {
    if (!detail) return
    setEditEntries(detail.entries.map((e) => ({ employee_id: e.employee_id, status_id: e.status_id })))
    setEditMode(true); setSaveError(null); setSaveSuccess(false)
  }

  function setEditStatus(empId: number, statusId: number) {
    setEditEntries((prev) => prev.map((e) => e.employee_id === empId ? { ...e, status_id: statusId } : e))
  }

  async function saveEdit() {
    if (!detail) return
    setSaving(true); setSaveError(null); setSaveSuccess(false)
    try {
      await apiClient.put(`/raskhod/${detail.id}`, { entries: editEntries })
      const r = await apiClient.get<{ data: RaskhodDetail }>(`/raskhod/${detail.id}`)
      setDetail(r.data.data)
      setEditMode(false)
      setSaveSuccess(true)
      fetchAll()
    } catch { setSaveError('Ошибка при сохранении') }
    finally { setSaving(false) }
  }

  async function downloadDocx() {
    if (!selected) return
    setDownloading(true)
    try {
      const r = await apiClient.get(`/raskhod/${selected.id}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(r.data as Blob)
      const a = document.createElement('a')
      a.href = url
      const cd = (r.headers['content-disposition'] as string) ?? ''
      const match = cd.match(/filename\*=UTF-8''(.+)/)
      a.download = match ? decodeURIComponent(match[1]) : `raskhod_${selected.id}.docx`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch { alert('Ошибка при скачивании файла') }
    finally { setDownloading(false) }
  }

  async function deleteRecord() {
    if (!selected) return
    const ok = confirm(
      `Удалить расход от ${formatDate(selected.raskhod_date)} ${selected.raskhod_time}? Действие необратимо.`
    )
    if (!ok) return

    setDeleting(true)
    try {
      await apiClient.delete(`/raskhod/${selected.id}`)
      setAllRecords((prev) => prev.filter((r) => r.id !== selected.id))
      setSelected(null)
      setDetail(null)
      setEditMode(false)
      setSaveError(null)
      setSaveSuccess(false)
      fetchAll()
    } catch {
      alert('Ошибка при удалении расхода')
    } finally {
      setDeleting(false)
    }
  }

  // Сводка по статусам
  const statusSummary: { name: string; count: number }[] = []
  if (detail) {
    const map = new Map<string, number>()
    for (const e of detail.entries) map.set(e.status_name, (map.get(e.status_name) ?? 0) + 1)
    map.forEach((count, name) => statusSummary.push({ name, count }))
    statusSummary.sort((a, b) => b.count - a.count)
  }

  return (
    <>
      <CommanderNav title="История расходов" />
      <div style={pageStyle}>
      {/* Фильтры */}
      <div style={filtersRowStyle}>
        <div style={filterGroupStyle}>
          <label style={filterLabelStyle}>Поиск по дате</label>
          <input
            type="text"
            placeholder="например: 15.04 или 2025"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            style={filterInputStyle}
          />
        </div>
        <div style={filterGroupStyle}>
          <label style={filterLabelStyle}>Время расхода</label>
          <div style={radioRowStyle}>
            {(['all', '09:00', '21:00'] as const).map((v) => (
              <label key={v} style={radioLabelStyle}>
                <input type="radio" name="timeFilter" value={v} checked={filterTime === v} onChange={() => setFilterTime(v)} />
                {v === 'all' ? 'Все' : v === '09:00' ? '09:00 (утренний)' : '21:00 (вечерний)'}
              </label>
            ))}
          </div>
        </div>
        <div style={filterStatsStyle}>
          Найдено: <strong>{filtered.length}</strong> из {allRecords.length}
          {(searchDate || filterTime !== 'all') && (
            <button onClick={() => { setSearchDate(''); setFilterTime('all') }} style={clearBtnStyle}>
              Сбросить
            </button>
          )}
        </div>
      </div>

      <div style={layoutStyle}>
        {/* ── Левая колонка: список ─────────────────────────────────────────── */}
        <div style={listColumnStyle}>
          {loadError && <div style={errorBannerStyle}>{loadError}</div>}
          {loading ? (
            <p style={{ color: '#64748b', padding: '12px 0' }}>Загрузка...</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: '#94a3b8', padding: '12px 0', fontSize: 14 }}>
              {allRecords.length === 0 ? 'Расходов пока нет' : 'Нет записей по фильтру'}
            </p>
          ) : (
            <div style={listStyle}>
              {grouped.map(({ monthKey, items }) => (
                <div key={monthKey}>
                  <div style={monthHeaderStyle}>
                    {formatMonthYear(monthKey + '-01')}
                  </div>
                  {items.map((rec) => {
                    const isActive = selected?.id === rec.id
                    return (
                      <div
                        key={rec.id}
                        onClick={() => selectRecord(rec)}
                        style={isActive ? listItemActiveStyle : listItemStyle}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: isActive ? '#fff' : '#1e293b' }}>
                            {formatDate(rec.raskhod_date)}
                            <span style={{ fontWeight: 400, fontSize: 12, color: isActive ? '#bfdbfe' : '#94a3b8', marginLeft: 5 }}>
                              {dayOfWeek(rec.raskhod_date)}
                            </span>
                          </span>
                          <span style={timeTagStyle(rec.raskhod_time, isActive)}>
                            {rec.raskhod_time}
                          </span>
                        </div>
                        <div style={{ marginTop: 3, fontSize: 12, color: isActive ? '#bfdbfe' : '#64748b' }}>
                          {buildRecordName(rec.raskhod_date, rec.raskhod_time)} &bull; {rec.entries_count} чел.
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Правая колонка: детали ────────────────────────────────────────── */}
        <div style={detailColumnStyle}>
          {!selected && (
            <div style={emptyDetailStyle}>
              <div style={{ fontSize: 32, marginBottom: 10, color: '#cbd5e1' }}>&#9776;</div>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>
                Выберите запись из списка
              </p>
            </div>
          )}

          {selected && (
            <div style={detailCardStyle}>
              {/* Заголовок */}
              <div style={detailTopStyle}>
                <div>
                  <div style={detailTitleStyle}>{buildRecordName(selected.raskhod_date, selected.raskhod_time)}</div>
                  <div style={detailSubtitleStyle}>
                    {formatDate(selected.raskhod_date)}, {selected.raskhod_time}
                    {detail?.unit_name && <> &mdash; {detail.unit_name}</>}
                  </div>
                </div>
                <div style={detailActionsStyle}>
                  {!editMode ? (
                    <>
                      <button
                        onClick={downloadDocx}
                        disabled={!detail || downloading}
                        style={!detail || downloading ? disabledBtnStyle : downloadBtnStyle}
                      >
                        {downloading ? 'Формирование...' : 'Скачать DOCX'}
                      </button>
                      <button
                        onClick={startEdit}
                        disabled={!detail}
                        style={!detail ? disabledBtnStyle : editBtnStyle}
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={deleteRecord}
                        disabled={!detail || deleting}
                        style={!detail || deleting ? disabledBtnStyle : deleteBtnStyle}
                      >
                        {deleting ? 'Удаление...' : 'Удалить'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={saveEdit} disabled={saving} style={saving ? disabledBtnStyle : saveBtnStyle}>
                        {saving ? 'Сохранение...' : 'Сохранить'}
                      </button>
                      <button onClick={() => { setEditMode(false); setSaveError(null) }} style={cancelBtnStyle}>
                        Отмена
                      </button>
                    </>
                  )}
                </div>
              </div>

              {saveError && <div style={{ ...errorBannerStyle, marginBottom: 12 }}>{saveError}</div>}
              {saveSuccess && <div style={successBannerStyle}>Изменения сохранены</div>}

              {/* Сводка по статусам */}
              {!editMode && statusSummary.length > 0 && (
                <div style={summaryRowStyle}>
                  <span style={{ fontSize: 12, color: '#94a3b8', marginRight: 8, alignSelf: 'center' }}>Итого:</span>
                  {statusSummary.map(({ name, count }) => (
                    <span key={name} style={summaryChipStyle(name)}>
                      {name} — {count}
                    </span>
                  ))}
                </div>
              )}

              {detailLoading && <p style={{ color: '#64748b' }}>Загрузка данных...</p>}
              {detailError && <div style={errorBannerStyle}>{detailError}</div>}

              {detail && (
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>№</th>
                      <th style={{ ...thStyle, textAlign: 'left' }}>ФИО</th>
                      <th style={{ ...thStyle, textAlign: 'left' }}>Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.entries.map((entry, i) => {
                      const editEntry = editEntries.find((e) => e.employee_id === entry.employee_id)
                      const selectedStatusId = editEntry?.status_id ?? entry.status_id
                      return (
                        <tr key={entry.employee_id} style={i % 2 === 0 ? rowEvenStyle : rowOddStyle}>
                          <td style={tdNumStyle}>{i + 1}</td>
                          <td style={tdStyle}>
                            {[entry.last_name, entry.first_name, entry.middle_name].filter(Boolean).join(' ')}
                          </td>
                          <td style={{ ...tdStyle, paddingTop: 6, paddingBottom: 6 }}>
                            {editMode ? (
                              <div style={chipsRowStyle}>
                                {statuses.map((s) => {
                                  const active = selectedStatusId === s.id
                                  const isPresent = s.name.toLowerCase() === 'налицо'
                                  return (
                                    <button
                                      key={s.id}
                                      type="button"
                                      onClick={() => setEditStatus(entry.employee_id, s.id)}
                                      style={active ? (isPresent ? chipGreen : chipRed) : chipGray}
                                    >
                                      {s.name}
                                    </button>
                                  )
                                })}
                              </div>
                            ) : (
                              <span style={statusBadge(entry.status_name)}>{entry.status_name}</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  )
}

function timeTagStyle(time: string, active: boolean): React.CSSProperties {
  if (active) return { fontSize: 11, fontWeight: 600, color: '#bfdbfe' }
  return { fontSize: 12, fontWeight: 600, color: time === '09:00' ? '#92400e' : '#3730a3' }
}

function summaryChipStyle(name: string): React.CSSProperties {
  const c = STATUS_COLORS[name.toLowerCase()] ?? { bg: '#f1f5f9', color: '#374151' }
  return {
    display: 'inline-block', padding: '3px 10px', borderRadius: 20,
    fontSize: 12, fontWeight: 500, background: c.bg, color: c.color,
  }
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  ...commanderPageBody,
}
const filtersRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap',
  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
  padding: '14px 20px', marginBottom: 16,
}
const filterGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }
const filterLabelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }
const filterInputStyle: React.CSSProperties = { padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 14, width: 200, boxSizing: 'border-box' as const }
const radioRowStyle: React.CSSProperties = { display: 'flex', gap: 16, alignItems: 'center' }
const radioLabelStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, cursor: 'pointer' }
const filterStatsStyle: React.CSSProperties = { fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 10 }
const clearBtnStyle: React.CSSProperties = {
  background: 'transparent', border: '1px solid #cbd5e1', borderRadius: 4,
  padding: '3px 10px', fontSize: 12, color: '#64748b', cursor: 'pointer',
}

const layoutStyle: React.CSSProperties = { display: 'flex', gap: 16, alignItems: 'flex-start' }

// Левая колонка
const listColumnStyle: React.CSSProperties = { width: 270, flexShrink: 0 }
const listStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2 }

const monthHeaderStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase',
  letterSpacing: '0.08em', padding: '12px 4px 4px',
}

const listItemBase: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 6, cursor: 'pointer',
  border: '1px solid transparent', transition: 'background 0.1s',
}
const listItemStyle: React.CSSProperties = {
  ...listItemBase, background: '#fff', border: '1px solid #e2e8f0',
}
const listItemActiveStyle: React.CSSProperties = {
  ...listItemBase, background: '#1e3a8a', border: '1px solid #1e3a8a',
}

// Правая колонка
const detailColumnStyle: React.CSSProperties = { flex: 1, minWidth: 0 }

const emptyDetailStyle: React.CSSProperties = {
  background: '#f8fafc', border: '2px dashed #e2e8f0', borderRadius: 8,
  padding: '80px 24px', textAlign: 'center',
}
const detailCardStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '20px 24px',
}
const detailTopStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
  flexWrap: 'wrap', gap: 12, marginBottom: 14,
  paddingBottom: 14, borderBottom: '1px solid #f1f5f9',
}
const detailTitleStyle: React.CSSProperties = { fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 4 }
const detailSubtitleStyle: React.CSSProperties = { fontSize: 13, color: '#64748b' }
const detailActionsStyle: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }

const summaryRowStyle: React.CSSProperties = {
  display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
  marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid #f1f5f9',
}

const errorBannerStyle: React.CSSProperties = {
  background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c',
  borderRadius: 4, padding: '8px 12px', fontSize: 14, marginBottom: 8,
}
const successBannerStyle: React.CSSProperties = {
  background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d',
  borderRadius: 4, padding: '8px 12px', fontSize: 14, marginBottom: 12,
}

const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 14 }
const thStyle: React.CSSProperties = {
  background: '#f8fafc', padding: '9px 12px', borderBottom: '2px solid #e2e8f0',
  fontWeight: 600, color: '#374151', textAlign: 'center', whiteSpace: 'nowrap',
}
const tdStyle: React.CSSProperties = {
  padding: '9px 12px', borderBottom: '1px solid #f1f5f9', color: '#1e293b', textAlign: 'left',
}
const tdNumStyle: React.CSSProperties = { ...tdStyle, textAlign: 'center', color: '#94a3b8', width: 40 }
const rowEvenStyle: React.CSSProperties = { background: '#fff' }
const rowOddStyle: React.CSSProperties = { background: '#f8fafc' }

const btnBase: React.CSSProperties = {
  border: 'none', borderRadius: 4, padding: '7px 14px',
  cursor: 'pointer', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' as const,
}
const downloadBtnStyle: React.CSSProperties = { ...btnBase, background: '#1e40af', color: '#fff' }
const editBtnStyle: React.CSSProperties = { ...btnBase, background: '#f1f5f9', color: '#374151', border: '1px solid #cbd5e1' }
const deleteBtnStyle: React.CSSProperties = { ...btnBase, background: '#dc2626', color: '#fff' }
const saveBtnStyle: React.CSSProperties = { ...btnBase, background: '#15803d', color: '#fff' }
const cancelBtnStyle: React.CSSProperties = { ...btnBase, background: '#f1f5f9', color: '#374151', border: '1px solid #cbd5e1' }
const disabledBtnStyle: React.CSSProperties = { ...btnBase, background: '#e2e8f0', color: '#94a3b8', cursor: 'not-allowed' as const }

const chipsRowStyle: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 5 }
const chipBase: React.CSSProperties = {
  padding: '3px 10px', borderRadius: 4, fontSize: 12, fontWeight: 500,
  cursor: 'pointer', border: '1.5px solid transparent',
}
const chipGray: React.CSSProperties = { ...chipBase, background: '#f1f5f9', border: '1.5px solid #cbd5e1', color: '#475569' }
const chipGreen: React.CSSProperties = { ...chipBase, background: '#dcfce7', border: '1.5px solid #16a34a', color: '#15803d' }
const chipRed: React.CSSProperties = { ...chipBase, background: '#fef2f2', border: '1.5px solid #dc2626', color: '#b91c1c' }
