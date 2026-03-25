import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
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

  return (
    <div style={pageStyle}>
      <div style={headerRowStyle}>
        <h1 style={titleStyle}>Расход личного состава</h1>
        <Link to="/raskhod/history" style={historyLinkStyle}>История расходов →</Link>
      </div>

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
                  {employees.map((emp, idx) => {
                    const entry = entries.find((en) => en.employee_id === emp.id)
                    return (
                      <tr key={emp.id} style={idx % 2 === 0 ? rowEvenStyle : rowOddStyle}>
                        <td style={tdCenterStyle}>{idx + 1}</td>
                        <td style={tdStyle}>{fullName(emp)}</td>
                        <td style={tdStyle}>
                          <select
                            value={entry?.status_id ?? ''}
                            onChange={(ev) => setEntryStatus(emp.id, Number(ev.target.value))}
                            style={selectStyle}
                          >
                            {statuses.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
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
  )
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

const historyLinkStyle: React.CSSProperties = {
  color: '#2563eb',
  textDecoration: 'none',
  fontSize: 14,
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

const selectStyle: React.CSSProperties = {
  padding: '5px 8px',
  border: '1px solid #cbd5e1',
  borderRadius: 4,
  fontSize: 14,
  background: '#fff',
  minWidth: 180,
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
