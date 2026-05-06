import React, { useState, useEffect, useRef } from 'react';
import { CommanderNav } from '../components/CommanderNav';
import { commanderPageBody } from '../layout/commanderLayout';
import apiClient from '../lib/apiClient';
interface AlertResponse {
    employee_id: number;
    last_name: string;
    first_name: string;
    middle_name: string | null;
    responded_at: string | null;
}
interface Alert {
    id: number;
    created_by_user_id: number;
    unit_id: number;
    created_at: string;
}
const STORAGE_KEY = 'active_alert_id';
export function AlertsPage() {
    const [alertId, setAlertId] = useState<number | null>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? Number(saved) : null;
    });
    const [responses, setResponses] = useState<AlertResponse[]>([]);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const pollingIntervalRef = useRef<number | null>(null);
    const fetchResponses = async (id: number) => {
        try {
            const res = await apiClient.get<{
                data: AlertResponse[];
            }>(`/alerts/${id}/responses`);
            setResponses(res.data.data);
            setError(null);
        }
        catch (err: unknown) {
            if ((err as {
                response?: {
                    status?: number;
                };
            })?.response?.status === 404) {
                localStorage.removeItem(STORAGE_KEY);
                setAlertId(null);
                setResponses([]);
            }
            else {
                setError('Ошибка загрузки откликов');
            }
        }
    };
    useEffect(() => {
        if (alertId !== null) {
            fetchResponses(alertId);
            pollingIntervalRef.current = window.setInterval(() => {
                fetchResponses(alertId);
            }, 10000);
        }
        return () => {
            if (pollingIntervalRef.current !== null) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        };
    }, [alertId]);
    const handleCreateAlert = async () => {
        setCreating(true);
        setError(null);
        try {
            const res = await apiClient.post<{
                data: Alert;
            }>('/alerts');
            const newAlert = res.data.data;
            localStorage.setItem(STORAGE_KEY, String(newAlert.id));
            setAlertId(newAlert.id);
        }
        catch (err) {
            console.error('Ошибка создания тревоги:', err);
            setError('Ошибка при объявлении тревоги');
        }
        finally {
            setCreating(false);
        }
    };
    const handleEndAlert = () => {
        localStorage.removeItem(STORAGE_KEY);
        setAlertId(null);
        setResponses([]);
        setError(null);
    };
    const fullName = (emp: AlertResponse) => {
        return [emp.last_name, emp.first_name, emp.middle_name].filter(Boolean).join(' ');
    };
    const formatTime = (timestamp: string | null) => {
        if (!timestamp)
            return '—';
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    const respondedCount = responses.filter(r => r.responded_at !== null).length;
    const notRespondedCount = responses.filter(r => r.responded_at === null).length;
    return (<>
      <CommanderNav title="Тревога"/>
      <div style={pageStyle}>
      {error && <div style={errorBannerStyle}>{error}</div>}

      {alertId === null ? (<div>
          <p style={{ color: '#64748b', marginBottom: 16 }}>
            Нажмите кнопку для объявления тревоги. Все сотрудники подразделения получат push-уведомление.
          </p>
          <button onClick={handleCreateAlert} disabled={creating} style={creating ? disabledBtnStyle : alertBtnStyle}>
            {creating ? 'Объявление...' : 'Объявить тревогу'}
          </button>
        </div>) : (<div>
          <div style={statsRowStyle}>
            <div style={statBoxStyle}>
              <div style={statLabelStyle}>Принял</div>
              <div style={statValueStyle}>{respondedCount}</div>
            </div>
            <div style={statBoxStyle}>
              <div style={statLabelStyle}>Не ответил</div>
              <div style={statValueStyle}>{notRespondedCount}</div>
            </div>
            <div style={statBoxStyle}>
              <div style={statLabelStyle}>Всего</div>
              <div style={statValueStyle}>{responses.length}</div>
            </div>
          </div>

          {responses.length === 0 ? (<p style={{ color: '#64748b' }}>Нет сотрудников в подразделении</p>) : (<div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>№</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>ФИО</th>
                    <th style={thStyle}>Статус</th>
                    <th style={thStyle}>Время ответа</th>
                  </tr>
                </thead>
                <tbody>
                  {responses.map((resp, idx) => (<tr key={resp.employee_id} style={idx % 2 === 0 ? rowEvenStyle : rowOddStyle}>
                      <td style={tdCenterStyle}>{idx + 1}</td>
                      <td style={tdStyle}>{fullName(resp)}</td>
                      <td style={tdCenterStyle}>
                        {resp.responded_at !== null ? (<span style={statusBadgeResponded}>Принял</span>) : (<span style={statusBadgeNotResponded}>Не ответил</span>)}
                      </td>
                      <td style={tdCenterStyle}>{formatTime(resp.responded_at)}</td>
                    </tr>))}
                </tbody>
              </table>
            </div>)}

          <div style={{ marginTop: 16 }}>
            <button onClick={handleEndAlert} style={endBtnStyle}>
              Завершить
            </button>
          </div>

          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 12 }}>
            Обновление каждые 10 секунд
          </p>
        </div>)}
      </div>
    </>);
}
const pageStyle: React.CSSProperties = {
    ...commanderPageBody,
    maxWidth: 900,
};
const errorBannerStyle: React.CSSProperties = {
    background: '#fef2f2',
    border: '1px solid #fca5a5',
    color: '#b91c1c',
    borderRadius: 4,
    padding: '8px 12px',
    marginBottom: 12,
    fontSize: 14,
};
const alertBtnStyle: React.CSSProperties = {
    background: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '12px 32px',
    cursor: 'pointer',
    fontSize: 16,
    fontWeight: 600,
};
const disabledBtnStyle: React.CSSProperties = {
    background: '#94a3b8',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '12px 32px',
    cursor: 'not-allowed',
    fontSize: 16,
    fontWeight: 600,
};
const endBtnStyle: React.CSSProperties = {
    background: '#64748b',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '9px 24px',
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 500,
};
const statsRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: 16,
    marginBottom: 20,
    flexWrap: 'wrap',
};
const statBoxStyle: React.CSSProperties = {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    padding: '12px 20px',
    minWidth: 120,
};
const statLabelStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: 500,
};
const statValueStyle: React.CSSProperties = {
    fontSize: 24,
    color: '#1e293b',
    fontWeight: 600,
};
const tableWrapStyle: React.CSSProperties = {
    overflowX: 'auto',
    marginBottom: 16,
};
const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 14,
};
const thStyle: React.CSSProperties = {
    background: '#f1f5f9',
    padding: '8px 12px',
    borderBottom: '2px solid #e2e8f0',
    fontWeight: 600,
    color: '#374151',
    textAlign: 'center',
    whiteSpace: 'nowrap',
};
const tdStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderBottom: '1px solid #e2e8f0',
    color: '#1e293b',
};
const tdCenterStyle: React.CSSProperties = {
    ...tdStyle,
    textAlign: 'center',
};
const rowEvenStyle: React.CSSProperties = { background: '#fff' };
const rowOddStyle: React.CSSProperties = { background: '#f8fafc' };
const statusBadgeResponded: React.CSSProperties = {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 500,
    background: '#dcfce7',
    color: '#15803d',
};
const statusBadgeNotResponded: React.CSSProperties = {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 500,
    background: '#fee2e2',
    color: '#b91c1c',
};
