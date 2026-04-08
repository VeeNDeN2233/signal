import React, { useState, useEffect } from 'react'
import { CrudTable } from '../../components/admin/CrudTable'
import { Modal } from '../../components/admin/Modal'
import { useCrud } from '../../components/admin/useCrud'
import apiClient from '../../lib/apiClient'

interface Employee {
  id: number
  last_name: string
  first_name: string
  middle_name: string | null
  position_id: number | null
  rank_id: number | null
  unit_id: number
  user_id: number | null
}

interface NamedItem { id: number; name: string }
interface UserItem { id: number; login: string }

interface FormState {
  last_name: string
  first_name: string
  middle_name: string
  position_id: string
  rank_id: string
  unit_id: string
  user_type: '' | 'user' | 'commander' // Новое поле: тип сотрудника
  login: string // Логин для новой учётной записи
  password: string // Пароль для новой учётной записи
}

const emptyForm: FormState = {
  last_name: '',
  first_name: '',
  middle_name: '',
  position_id: '',
  rank_id: '',
  unit_id: '',
  user_type: '',
  login: '',
  password: '',
}

export function EmployeesPage() {
  const { rows, meta, page, loading, error, fetchPage, create, update, remove } =
    useCrud<Employee>('/employees')

  const [positions, setPositions] = useState<NamedItem[]>([])
  const [ranks, setRanks] = useState<NamedItem[]>([])
  const [units, setUnits] = useState<NamedItem[]>([])
  const [users, setUsers] = useState<UserItem[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const params = { page: 1, page_size: 200 }
    apiClient.get<{ data: NamedItem[] }>('/positions', { params }).then((r) => setPositions(r.data.data)).catch(() => {})
    apiClient.get<{ data: NamedItem[] }>('/ranks', { params }).then((r) => setRanks(r.data.data)).catch(() => {})
    apiClient.get<{ data: NamedItem[] }>('/units', { params }).then((r) => setUnits(r.data.data)).catch(() => {})
    apiClient.get<{ data: UserItem[] }>('/users', { params }).then((r) => setUsers(r.data.data)).catch(() => {})
  }, [])

  function getName(list: NamedItem[], id: number | null) {
    if (!id) return '—'
    return list.find((x) => x.id === id)?.name ?? String(id)
  }

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(row: Employee) {
    setEditing(row)
    setForm({
      last_name: row.last_name,
      first_name: row.first_name,
      middle_name: row.middle_name ?? '',
      position_id: row.position_id ? String(row.position_id) : '',
      rank_id: row.rank_id ? String(row.rank_id) : '',
      unit_id: String(row.unit_id),
      user_type: '', // При редактировании не показываем создание учётной записи
      login: '',
      password: '',
    })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleDelete(row: Employee) {
    if (!confirm(`Удалить сотрудника «${row.last_name} ${row.first_name}»?`)) return
    const err = await remove(row.id)
    if (err) alert(err)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.last_name.trim()) { setFormError('Фамилия обязательна'); return }
    if (!form.first_name.trim()) { setFormError('Имя обязательно'); return }
    if (!form.unit_id) { setFormError('Подразделение обязательно'); return }

    // Валидация для создания учётной записи
    if (!editing && form.user_type) {
      if (!form.login.trim()) { setFormError('Логин обязателен'); return }
      if (!form.password.trim()) { setFormError('Пароль обязателен'); return }
    }

    setSubmitting(true)
    setFormError(null)

    try {
      // Если нужно создать учётную запись, сначала создаём user
      let userId: number | null = null
      if (!editing && form.user_type) {
        const roleId = form.user_type === 'commander' ? 3 : 1 // commander=3, user=1
        const userRes = await apiClient.post<{ data: { id: number } }>('/users', {
          login: form.login.trim(),
          password: form.password,
          role_id: roleId,
        })
        userId = userRes.data.data.id
      }

      // Создаём/обновляем сотрудника
      const body: Record<string, unknown> = {
        last_name: form.last_name.trim(),
        first_name: form.first_name.trim(),
        middle_name: form.middle_name.trim() || null,
        position_id: form.position_id ? Number(form.position_id) : null,
        rank_id: form.rank_id ? Number(form.rank_id) : null,
        unit_id: Number(form.unit_id),
        user_id: userId,
      }

      const err = editing ? await update(editing.id, body) : await create(body)
      setSubmitting(false)
      if (err) {
        setFormError(err)
      } else {
        setModalOpen(false)
      }
    } catch (err: unknown) {
      setSubmitting(false)
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setFormError(axiosErr.response?.data?.error ?? 'Ошибка при сохранении')
    }
  }

  function setField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: 20, fontSize: 20, color: '#1e293b' }}>Сотрудники</h2>

      {error && <div style={errorBannerStyle}>{error}</div>}

      {loading ? (
        <p style={{ color: '#64748b' }}>Загрузка...</p>
      ) : (
        <CrudTable<Employee>
          columns={[
            { key: 'id', label: 'ID' },
            { key: 'last_name', label: 'Фамилия' },
            { key: 'first_name', label: 'Имя' },
            { key: 'middle_name', label: 'Отчество', render: (r) => r.middle_name ?? '—' },
            { key: 'rank_id', label: 'Звание', render: (r) => getName(ranks, r.rank_id) },
            { key: 'position_id', label: 'Должность', render: (r) => getName(positions, r.position_id) },
            { key: 'unit_id', label: 'Подразделение', render: (r) => getName(units, r.unit_id) },
          ]}
          rows={rows}
          page={page}
          pageSize={meta.page_size}
          total={meta.total}
          onPageChange={fetchPage}
          onAdd={openAdd}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}

      {modalOpen && (
        <Modal
          title={editing ? `Редактировать сотрудника` : 'Добавить сотрудника'}
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={handleSubmit}>
            {formError && <div style={errorBannerStyle}>{formError}</div>}

            <Field label="Фамилия *">
              <input style={inputStyle} value={form.last_name} onChange={(e) => setField('last_name', e.target.value)} autoFocus />
            </Field>
            <Field label="Имя *">
              <input style={inputStyle} value={form.first_name} onChange={(e) => setField('first_name', e.target.value)} />
            </Field>
            <Field label="Отчество">
              <input style={inputStyle} value={form.middle_name} onChange={(e) => setField('middle_name', e.target.value)} />
            </Field>

            <Field label="Подразделение *">
              <select style={inputStyle} value={form.unit_id} onChange={(e) => setField('unit_id', e.target.value)}>
                <option value="">— выберите —</option>
                {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Field>

            <Field label="Звание">
              <select style={inputStyle} value={form.rank_id} onChange={(e) => setField('rank_id', e.target.value)}>
                <option value="">— не указано —</option>
                {ranks.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>

            <Field label="Должность">
              <select style={inputStyle} value={form.position_id} onChange={(e) => setField('position_id', e.target.value)}>
                <option value="">— не указано —</option>
                {positions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>

            {!editing && (
              <>
                <Field label="Тип сотрудника">
                  <select style={inputStyle} value={form.user_type} onChange={(e) => setField('user_type', e.target.value)}>
                    <option value="">— без учётной записи —</option>
                    <option value="user">Сотрудник (вход через Android)</option>
                    <option value="commander">Руководитель (вход через сайт)</option>
                  </select>
                </Field>

                {form.user_type && (
                  <>
                    <Field label="Логин *">
                      <input style={inputStyle} value={form.login} onChange={(e) => setField('login', e.target.value)} />
                    </Field>
                    <Field label="Пароль *">
                      <input style={inputStyle} type="password" value={form.password} onChange={(e) => setField('password', e.target.value)} />
                    </Field>
                  </>
                )}
              </>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button type="button" onClick={() => setModalOpen(false)} style={cancelBtnStyle}>Отмена</button>
              <button type="submit" disabled={submitting} style={submitBtnStyle}>
                {submitting ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
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

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 4,
  fontSize: 13,
  fontWeight: 500,
  color: '#374151',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #cbd5e1',
  borderRadius: 4,
  fontSize: 14,
  boxSizing: 'border-box',
}

const cancelBtnStyle: React.CSSProperties = {
  background: '#f1f5f9',
  color: '#374151',
  border: '1px solid #cbd5e1',
  borderRadius: 4,
  padding: '7px 16px',
  cursor: 'pointer',
  fontSize: 14,
}

const submitBtnStyle: React.CSSProperties = {
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  padding: '7px 16px',
  cursor: 'pointer',
  fontSize: 14,
}
