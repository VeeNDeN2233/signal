import React, { useState } from 'react'
import { CrudTable } from './CrudTable'
import { Modal } from './Modal'
import { useCrud } from './useCrud'

interface NamedItem {
  id: number
  name: string
}

interface SimpleRefPageProps {
  title: string
  endpoint: string
}

export function SimpleRefPage({ title, endpoint }: SimpleRefPageProps) {
  const { rows, meta, page, loading, error, fetchPage, create, update, remove } =
    useCrud<NamedItem>(endpoint)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<NamedItem | null>(null)
  const [formName, setFormName] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function openAdd() {
    setEditing(null)
    setFormName('')
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(row: NamedItem) {
    setEditing(row)
    setFormName(row.name)
    setFormError(null)
    setModalOpen(true)
  }

  async function handleDelete(row: NamedItem) {
    if (!confirm(`Удалить «${row.name}»?`)) return
    const err = await remove(row.id)
    if (err) alert(err)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formName.trim()) {
      setFormError('Название не может быть пустым')
      return
    }
    setSubmitting(true)
    setFormError(null)
    const err = editing
      ? await update(editing.id, { name: formName.trim() })
      : await create({ name: formName.trim() })
    setSubmitting(false)
    if (err) {
      setFormError(err)
    } else {
      setModalOpen(false)
    }
  }

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: 20, fontSize: 20, color: '#1e293b' }}>{title}</h2>

      {error && (
        <div style={errorBannerStyle}>{error}</div>
      )}

      {loading ? (
        <p style={{ color: '#64748b' }}>Загрузка...</p>
      ) : (
        <CrudTable<NamedItem>
          columns={[
            { key: 'id', label: 'ID' },
            { key: 'name', label: 'Название' },
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
          title={editing ? `Редактировать: ${editing.name}` : `Добавить — ${title}`}
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={handleSubmit}>
            {formError && <div style={errorBannerStyle}>{formError}</div>}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Название</label>
              <input
                style={inputStyle}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setModalOpen(false)} style={cancelBtnStyle}>
                Отмена
              </button>
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
