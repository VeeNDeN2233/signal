import React from 'react'

export interface Column<T> {
  key: keyof T | string
  label: string
  render?: (row: T) => React.ReactNode
}

interface CrudTableProps<T extends { id: number }> {
  columns: Column<T>[]
  rows: T[]
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onAdd: () => void
  onEdit: (row: T) => void
  onDelete: (row: T) => void
}

export function CrudTable<T extends { id: number }>({
  columns,
  rows,
  page,
  pageSize,
  total,
  onPageChange,
  onAdd,
  onEdit,
  onDelete,
}: CrudTableProps<T>) {
  const totalPages = Math.ceil(total / pageSize) || 1

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <button onClick={onAdd} style={btnStyle('#2563eb')}>
          + Добавить
        </button>
      </div>

      <table style={tableStyle}>
        <thead>
          <tr style={{ background: '#f1f5f9' }}>
            {columns.map((col) => (
              <th key={String(col.key)} style={thStyle}>
                {col.label}
              </th>
            ))}
            <th style={thStyle}>Действия</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1} style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8' }}>
                Нет данных
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                {columns.map((col) => (
                  <td key={String(col.key)} style={tdStyle}>
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key as string] ?? '')}
                  </td>
                ))}
                <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                  <button onClick={() => onEdit(row)} style={btnStyle('#0891b2')}>
                    Редактировать
                  </button>{' '}
                  <button onClick={() => onDelete(row)} style={btnStyle('#dc2626')}>
                    Удалить
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          style={btnStyle('#64748b')}
        >
          ← Назад
        </button>
        <span style={{ fontSize: 14, color: '#475569' }}>
          Страница {page} из {totalPages} (всего: {total})
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          style={btnStyle('#64748b')}
        >
          Вперёд →
        </button>
      </div>
    </div>
  )
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 14,
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  fontWeight: 600,
  color: '#374151',
  borderBottom: '2px solid #e2e8f0',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  color: '#1e293b',
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg,
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: 13,
  }
}
