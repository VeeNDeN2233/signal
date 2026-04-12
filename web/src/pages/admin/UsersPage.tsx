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
  last_name: string | null
  first_name: string | null
  middle_name: string | null
}

interface Role {
  id: number
  name: string
}

interface Unit {
  id: number
  name: string
}

interface FormState {
  login: string
  password: string
  role_id: string
  unit_id: string
  last_name: string
  first_name: string
  middle_name: string
}

const emptyForm: FormState = {
  login: '',
  password: '',
  role_id: '',
  unit_id: '',
  last_name: '',
  first_name: '',
  middle_name: '',
}

export function UsersPage() {
  const { rows, meta, page, loading, error, fetchPage, create, update, remove } =
    useCrud<User>('/users')

  const [roles, setRoles] = useState<Role[]>([])
  const [units, setUnits] = useState<Unit[]>([])

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
  }, [])

  function roleName(id: number) {
    return roles.find((r) => r.id === id)?.name ?? String(id)
  }
  function unitName(id: number | null) {
    if (!id) return '—'
    return units.find((u) => u.id === id)?.name ?? String(id)
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
      last_name: row.last_name ?? '',
      first_name: row.first_name ?? '',
      middle_name: row.middle_name ?? '',
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
      last_name: form.last_name.trim() || null,
      first_name: form.first_name.trim() || null,
      middle_name: form.middle_name.trim() || null,
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
            {
              key: 'last_name', label: 'ФИО',
              render: (r) => [r.last_name, r.first_name, r.middle_name].filter(Boolean).join(' ') || '—'
            },
            { key: 'role_id', label: 'Роль', render: (r) => roleName(r.role_id) },
            { key: 'unit_id', label: 'Подразделение', render: (r) => unitName(r.unit_id) },
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

            <div style={sectionLabelStyle}>Учётная запись</div>

            <Field label="Логин *">
              <input style={inputStyle} value={form.login} onChange={(e) => setField('login', e.target.value)} autoFocus />
            </Field>

            <Field label={editing ? 'Новый пароль (оставьте пустым, чтобы не менять)' : 'Пароль *'}>
              <input style={inputStyle} type="password" value={form.password} onChange={(e) => setField('password', e.target.value)} />
            </Field>

            <div style={sectionLabelStyle}>ФИО сотрудника</div>

            <Field label="Фамилия">
              <input style={inputStyle} value={form.last_name} onChange={(e) => setField('last_name', e.target.value)} placeholder="Иванов" />
            </Field>
            <Field label="Имя">
              <input style={inputStyle} value={form.first_name} onChange={(e) => setField('first_name', e.target.value)} placeholder="Иван" />
            </Field>
            <Field label="Отчество">
              <input style={inputStyle} value={form.middle_name} onChange={(e) => setField('middle_name', e.target.value)} placeholder="Иванович" />
            </Field>

            <div style={sectionLabelStyle}>Роль и подразделение</div>

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

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 10,
  marginTop: 4,
  borderBottom: '1px solid #e2e8f0',
  paddingBottom: 4,
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
