import React, { useState, useEffect } from 'react'
import { CrudTable } from '../../components/admin/CrudTable'
import { Modal } from '../../components/admin/Modal'
import { useCrud } from '../../components/admin/useCrud'
import apiClient from '../../lib/apiClient'

interface User {
  id: number
  login: string
  role_id: number
  unit_id: number | null
  user_status_id: number | null
}

interface Role {
  id: number
  name: string
}

interface Unit {
  id: number
  name: string
}

interface UserStatus {
  id: number
  name: string
}

interface FormState {
  login: string
  password: string
  role_id: string
  unit_id: string
  user_status_id: string
}

const emptyForm: FormState = {
  login: '',
  password: '',
  role_id: '',
  unit_id: '',
  user_status_id: '',
}

export function UsersPage() {
  const { rows, meta, page, loading, error, fetchPage, create, update, remove } =
    useCrud<User>('/users')

  const [roles, setRoles] = useState<Role[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [statuses, setStatuses] = useState<UserStatus[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    apiClient.get<{ data: Role[] }>('/roles').then((r) => setRoles(r.data.data)).catch(() => {
      // roles endpoint may not exist; fallback to hardcoded
      setRoles([
        { id: 1, name: 'user' },
        { id: 2, name: 'admin' },
        { id: 3, name: 'commander' },
      ])
    })
    apiClient.get<{ data: Unit[] }>('/units', { params: { page: 1, page_size: 100 } })
      .then((r) => setUnits(r.data.data))
      .catch(() => {})
    apiClient.get<{ data: UserStatus[] }>('/user-statuses', { params: { page: 1, page_size: 100 } })
      .then((r) => setStatuses(r.data.data))
      .catch(() => {})
  }, [])

  function roleName(id: number) {
    return roles.find((r) => r.id === id)?.name ?? String(id)
  }
  function unitName(id: number | null) {
    if (!id) return '—'
    return units.find((u) => u.id === id)?.name ?? String(id)
  }
  function statusName(id: number | null) {
    if (!id) return '—'
    return statuses.find((s) => s.id === id)?.name ?? String(id)
  }

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(row: User) {
    setEditing(row)
    setForm({
      login: row.login,
      password: '',
      role_id: String(row.role_id),
      unit_id: row.unit_id ? String(row.unit_id) : '',
      user_status_id: row.user_status_id ? String(row.user_status_id) : '',
    })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleDelete(row: User) {
    if (!confirm(`Удалить пользователя «${row.login}»?`)) return
    const err = await remove(row.id)
    if (err) alert(err)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.login.trim()) { setFormError('Логин обязателен'); return }
    if (!editing && !form.password.trim()) { setFormError('Пароль обязателен при создании'); return }
    if (!form.role_id) { setFormError('Выберите роль'); return }

    setSubmitting(true)
    setFormError(null)

    const body: Record<string, unknown> = {
      login: form.login.trim(),
      role_id: Number(form.role_id),
      unit_id: form.unit_id ? Number(form.unit_id) : null,
      user_status_id: form.user_status_id ? Number(form.user_status_id) : null,
    }
    if (!editing || form.password.trim()) {
      body.password = form.password
    }

    const err = editing ? await update(editing.id, body) : await create(body)
    setSubmitting(false)
    if (err) {
      setFormError(err)
    } else {
      setModalOpen(false)
    }
  }

  function setField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: 20, fontSize: 20, color: '#1e293b' }}>Пользователи</h2>

      {error && <div style={errorBannerStyle}>{error}</div>}

      {loading ? (
        <p style={{ color: '#64748b' }}>Загрузка...</p>
      ) : (
        <CrudTable<User>
          columns={[
            { key: 'id', label: 'ID' },
            { key: 'login', label: 'Логин' },
            { key: 'role_id', label: 'Роль', render: (r) => roleName(r.role_id) },
            { key: 'unit_id', label: 'Подразделение', render: (r) => unitName(r.unit_id) },
            { key: 'user_status_id', label: 'Статус', render: (r) => statusName(r.user_status_id) },
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
          title={editing ? `Редактировать: ${editing.login}` : 'Добавить пользователя'}
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={handleSubmit}>
            {formError && <div style={errorBannerStyle}>{formError}</div>}

            <Field label="Логин">
              <input style={inputStyle} value={form.login} onChange={(e) => setField('login', e.target.value)} autoFocus />
            </Field>

            <Field label={editing ? 'Новый пароль (оставьте пустым, чтобы не менять)' : 'Пароль'}>
              <input style={inputStyle} type="password" value={form.password} onChange={(e) => setField('password', e.target.value)} />
            </Field>

            <Field label="Роль">
              <select style={inputStyle} value={form.role_id} onChange={(e) => setField('role_id', e.target.value)}>
                <option value="">— выберите —</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Подразделение">
              <select style={inputStyle} value={form.unit_id} onChange={(e) => setField('unit_id', e.target.value)}>
                <option value="">— не указано —</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Статус">
              <select style={inputStyle} value={form.user_status_id} onChange={(e) => setField('user_status_id', e.target.value)}>
                <option value="">— не указано —</option>
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>

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
