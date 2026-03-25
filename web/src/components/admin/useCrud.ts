import { useState, useCallback, useEffect } from 'react'
import apiClient from '../../lib/apiClient'
import axios from 'axios'

interface Meta {
  page: number
  page_size: number
  total: number
}

interface ApiListResponse<T> {
  data: T[]
  meta: Meta
}

export function useCrud<T extends { id: number }>(endpoint: string, pageSize = 20) {
  const [rows, setRows] = useState<T[]>([])
  const [meta, setMeta] = useState<Meta>({ page: 1, page_size: pageSize, total: 0 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPage = useCallback(
    async (p: number) => {
      setLoading(true)
      setError(null)
      try {
        const res = await apiClient.get<ApiListResponse<T>>(endpoint, {
          params: { page: p, page_size: pageSize },
        })
        setRows(res.data.data)
        setMeta(res.data.meta)
        setPage(p)
      } catch (e) {
        setError(extractError(e))
      } finally {
        setLoading(false)
      }
    },
    [endpoint, pageSize]
  )

  useEffect(() => {
    fetchPage(1)
  }, [fetchPage])

  const create = useCallback(
    async (body: Partial<T>): Promise<string | null> => {
      try {
        await apiClient.post(endpoint, body)
        await fetchPage(page)
        return null
      } catch (e) {
        return extractError(e)
      }
    },
    [endpoint, fetchPage, page]
  )

  const update = useCallback(
    async (id: number, body: Partial<T>): Promise<string | null> => {
      try {
        await apiClient.put(`${endpoint}/${id}`, body)
        await fetchPage(page)
        return null
      } catch (e) {
        return extractError(e)
      }
    },
    [endpoint, fetchPage, page]
  )

  const remove = useCallback(
    async (id: number): Promise<string | null> => {
      try {
        await apiClient.delete(`${endpoint}/${id}`)
        await fetchPage(page)
        return null
      } catch (e) {
        return extractError(e)
      }
    },
    [endpoint, fetchPage, page]
  )

  return { rows, meta, page, loading, error, fetchPage, create, update, remove }
}

function extractError(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const msg = e.response?.data?.message || e.response?.data?.error
    if (msg) return String(msg)
    if (e.response?.status === 409) return 'Конфликт: запись уже существует или используется.'
    if (e.response?.status === 400) return 'Некорректные данные запроса.'
    return `Ошибка сервера (${e.response?.status ?? 'нет ответа'})`
  }
  return 'Неизвестная ошибка'
}
