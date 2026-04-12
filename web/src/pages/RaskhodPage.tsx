import React, { useState, useEffect } from 'react'
import { CommanderNav } from '../components/CommanderNav'
import { commanderPageBody } from '../layout/commanderLayout'
import apiClient from '../lib/apiClient'

interface Employee {
  id: number
  last_name: string
  first_name: string
  middle_name: string | null
}

interface UserStatus {
  id: number
  name: string
}

interface EntryState {
  employee_id: number
  status_id: number
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function RaskhodPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [statuses, setStatuses] = useState<UserStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [date, setDate] = useState<string>(todayStr())
  const [time, setTime] = useState<'09:00' | '21:00'>('09:00')
  const [entries, setEntries] = useState<EntryState[]>([])
  const [searchQuery, setSearchQuery] = useState<string>('') // Поиск по ФИО

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  useEffect(() => {
    setLoading(true)
    setLoadError(null)
    Promise.all([
      apiClient.get<{ data: Employee[] }>('/employees/unit'),
      apiClient.get<{ data: UserStatus[] }>('/employees/statuses'),
    ])
      .then(([empRes, statusRes]) => {
        const emps = empRes.data.data
        const sts = statusRes.data.data
        setEmployees(emps)
        setStatuses(sts)
        // По умолчанию первый статус («налицо») для каждого сотрудника
        if (sts.length > 0) {
          setEntries(emps.map((e) => ({ employee_id: e.id, status_id: sts[0].id })))
        }
      })
      .catch(() => setLoadError('Ошибка загрузки данных'))
      .finally(() => setLoading(false))
  }, [])

  function setEntryStatus(employeeId: number, statusId: number) {
    setEntries((prev) =>
      prev.map((e) => (e.employee_id === employeeId ? { ...e, status_id: statusId } : e))
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(false)

    try {
      await apiClient.post('/raskhod', {
        raskhod_date: date,
        raskhod_time: time,
        entries,
      })
      setSubmitSuccess(true)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: string } } }
      if (axiosErr.response?.status === 409) {
        setSubmitError('Расход на данную дату и время уже существует')
      } else {
        setSubmitError(axiosErr.response?.data?.error ?? 'Ошибка при отправке')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function fullName(emp: Employee) {
    return [emp.last_name, emp.first_name, emp.middle_name].filter(Boolean).join(' ')
  }

  // Фильтрация сотрудников по поисковому запросу
  const filteredEmployees = employees.filter((emp) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    const name = fullName(emp).toLowerCase()
    return name.includes(query)
  })

  return (
    <>
      <CommanderNav title="Расход" />
      <div style={pageStyle}>
      {loadError && <div style={errorBannerStyle}>{loadError}</div>}

      {loading ? (
        <p style={{ color: '#64748b' }}>Загрузка...</p>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Дата и время */}
          <div style={controlsRowStyle}>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Дата</label>
              <input
                type="date"
                value={date}
                onChange={(e) => { setDate(e.target.value); setSubmitSuccess(false); setSubmitError(null) }}
                style={inputStyle}
              />
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Время</label>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', paddingTop: 6 }}>
                {(['09:00', '21:00'] as const).map((t) => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                    <input
                      type="radio"
                      name="raskhod_time"
                      value={t}
                      checked={time === t}
                      onChange={() => { setTime(t); setSubmitSuccess(false); setSubmitError(null) }}
                    />
                    {t}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Таблица сотрудников */}
          {employees.length === 0 ? (
            <p style={{ color: '#64748b' }}>Нет сотрудников в подразделении</p>
          ) : (
            <>
              {/* Поле поиска */}
              <div style={{ marginBottom: 12 }}>
                <input
                  type="text"
                  placeholder="Поиск по ФИО..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ ...inputStyle, width: '100%', maxWidth: 400 }}
                />
              </div>

              {filteredEmployees.length === 0 ? (
                <p style={{ color: '#64748b' }}>Сотрудники не найдены</p>
              ) : (
                <div style={tableWrapStyle}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>№</th>
                        <th style={{ ...thStyle, textAlign: 'left' }}>ФИО</th>
                        <th style={{ ...thStyle, textAlign: 'left' }}>Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.map((emp, idx) => {
                        const entry = entries.find((en) => en.employee_id === emp.id)
                        const selectedId = entry?.status_id
                        return (
                          <tr key={emp.id} style={idx % 2 === 0 ? rowEvenStyle : rowOddStyle}>
                            <td style={tdCenterStyle}>{idx + 1}</td>
                            <td style={tdStyle}>{fullName(emp)}</td>
                            <td style={{ ...tdStyle, paddingTop: 6, paddingBottom: 6 }}>
                              <div style={statusChipsRow}>
                                {statuses.map((s) => {
                                  const active = selectedId === s.id
                                  const isPresent = s.name.toLowerCase().includes('налицо')
                                  return (
                                    <button
                                      key={s.id}
                                      type="button"
                                      onClick={() => setEntryStatus(emp.id, s.id)}
                                      style={active
                                        ? (isPresent ? chipActiveGreen : chipActiveRed)
                                        : chipInactive}
                                    >
                                      {s.name}
                                    </button>
                                  )
                                })}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Сообщения */}
          {submitError && <div style={errorBannerStyle}>{submitError}</div>}
          {submitSuccess && <div style={successBannerStyle}>Расход успешно отправлен</div>}

          <div style={{ marginTop: 16 }}>
            <button
              type="submit"
              disabled={submitting || employees.length === 0}
              style={submitting || employees.length === 0 ? disabledBtnStyle : submitBtnStyle}
            >
              {submitting ? 'Отправка...' : 'Отправить'}
            </button>
          </div>
        </form>
      )}
      </div>
    </>
  )
}

// Styles
const pageStyle: React.CSSProperties = {
  ...commanderPageBody,
  maxWidth: 800,
}

const controlsRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 24,
  marginBottom: 20,
  flexWrap: 'wrap',
}

const fieldGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: '#374151',
  marginBottom: 4,
}

const inputStyle: React.CSSProperties = {
  padding: '7px 10px',
  border: '1px solid #cbd5e1',
  borderRadius: 4,
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
}

const tdCenterStyle: React.CSSProperties = {
  ...tdStyle,
  textAlign: 'center',
  color: '#64748b',
  width: 40,
}

const rowEvenStyle: React.CSSProperties = { background: '#fff' }
const rowOddStyle: React.CSSProperties = { background: '#f8fafc' }

const statusChipsRow: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
}

const chipBase: React.CSSProperties = {
  padding: '4px 11px',
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  border: '1.5px solid transparent',
  transition: 'all 0.15s',
  whiteSpace: 'nowrap',
}

const chipInactive: React.CSSProperties = {
  ...chipBase,
  background: '#f1f5f9',
  border: '1.5px solid #cbd5e1',
  color: '#475569',
}

const chipActiveGreen: React.CSSProperties = {
  ...chipBase,
  background: '#dcfce7',
  border: '1.5px solid #16a34a',
  color: '#15803d',
}

const chipActiveRed: React.CSSProperties = {
  ...chipBase,
  background: '#fef2f2',
  border: '1.5px solid #dc2626',
  color: '#b91c1c',
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

const successBannerStyle: React.CSSProperties = {
  background: '#f0fdf4',
  border: '1px solid #86efac',
  color: '#15803d',
  borderRadius: 4,
  padding: '8px 12px',
  marginBottom: 12,
  fontSize: 14,
}

const submitBtnStyle: React.CSSProperties = {
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  padding: '9px 24px',
  cursor: 'pointer',
  fontSize: 15,
  fontWeight: 500,
}

const disabledBtnStyle: React.CSSProperties = {
  ...submitBtnStyle,
  background: '#94a3b8',
  cursor: 'not-allowed',
}
