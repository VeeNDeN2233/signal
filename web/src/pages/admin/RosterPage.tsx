import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../lib/apiClient';
import { Modal } from '../../components/admin/Modal';
interface Unit {
    id: number;
    name: string;
}
interface NamedItem {
    id: number;
    name: string;
}
interface Role {
    id: number;
    name: string;
}
interface Employee {
    id: number;
    last_name: string;
    first_name: string;
    middle_name: string | null;
    rank_id: number | null;
    rank_name: string | null;
    position_id: number | null;
    position_name: string | null;
    unit_id: number;
    user_id: number | null;
    user_login: string | null;
    user_role_id: number | null;
    phone_number: string | null;
}
interface FormState {
    last_name: string;
    first_name: string;
    middle_name: string;
    rank_id: string;
    position_id: string;
    phone_number: string;
    account_mode: '' | 'new' | 'link';
    login: string;
    password: string;
    role_id: string;
    link_user_id: string;
}
const ROLE_LABELS: Record<string, string> = {
    user: 'Сотрудник (Android)',
    commander: 'Руководитель (сайт)',
    admin: 'Администратор',
};
export function RosterPage() {
    const [units, setUnits] = useState<Unit[]>([]);
    const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loadingEmps, setLoadingEmps] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [ranks, setRanks] = useState<NamedItem[]>([]);
    const [positions, setPositions] = useState<NamedItem[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [freeUsers, setFreeUsers] = useState<{
        id: number;
        login: string;
    }[]>([]);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Employee | null>(null);
    const [form, setForm] = useState<FormState>(makeEmptyForm(''));
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    function makeEmptyForm(defaultRoleId: string): FormState {
        return {
            last_name: '', first_name: '', middle_name: '',
            rank_id: '', position_id: '', phone_number: '',
            account_mode: '', login: '', password: '',
            role_id: defaultRoleId,
            link_user_id: '',
        };
    }
    useEffect(() => {
        const p = { page: 1, page_size: 200 };
        apiClient.get<{
            data: Unit[];
        }>('/units', { params: p }).then((r) => setUnits(r.data.data)).catch(() => { });
        apiClient.get<{
            data: NamedItem[];
        }>('/ranks', { params: p }).then((r) => setRanks(r.data.data)).catch(() => { });
        apiClient.get<{
            data: NamedItem[];
        }>('/positions', { params: p }).then((r) => setPositions(r.data.data)).catch(() => { });
        apiClient.get<{
            data: Role[];
        }>('/roles').then((r) => {
            const filtered = r.data.data.filter((role) => role.name !== 'admin');
            setRoles(filtered);
        }).catch(() => { });
    }, []);
    const fetchEmployees = useCallback((unitId: number) => {
        setLoadingEmps(true);
        setLoadError(null);
        apiClient.get<{
            data: Employee[];
        }>('/employees', { params: { unit_id: unitId, page: 1, page_size: 200 } })
            .then((r) => setEmployees(r.data.data))
            .catch(() => setLoadError('Ошибка загрузки списка'))
            .finally(() => setLoadingEmps(false));
    }, []);
    function handleUnitChange(id: number) {
        setSelectedUnitId(id);
        setEmployees([]);
        setSearch('');
        fetchEmployees(id);
    }
    async function loadFreeUsers(currentEmpId?: number) {
        try {
            const r = await apiClient.get<{
                data: {
                    id: number;
                    login: string;
                    last_name: string | null;
                }[];
            }>('/users', { params: { page: 1, page_size: 200 } });
            const linkedIds = new Set(employees.filter((e) => e.user_id && e.id !== currentEmpId).map((e) => e.user_id));
            setFreeUsers(r.data.data.filter((u) => !linkedIds.has(u.id)));
        }
        catch {
            setFreeUsers([]);
        }
    }
    function getDefaultRoleId(): string {
        const userRole = roles.find((r) => r.name === 'user');
        return userRole ? String(userRole.id) : (roles[0] ? String(roles[0].id) : '');
    }
    function openAdd() {
        setEditing(null);
        setForm(makeEmptyForm(getDefaultRoleId()));
        setFormError(null);
        loadFreeUsers();
        setModalOpen(true);
    }
    function openEdit(emp: Employee) {
        setEditing(emp);
        setForm({
            last_name: emp.last_name,
            first_name: emp.first_name,
            middle_name: emp.middle_name ?? '',
            rank_id: emp.rank_id ? String(emp.rank_id) : '',
            position_id: emp.position_id ? String(emp.position_id) : '',
            phone_number: emp.phone_number ?? '',
            account_mode: '',
            login: emp.user_login ?? '',
            password: '',
            role_id: emp.user_role_id ? String(emp.user_role_id) : getDefaultRoleId(),
            link_user_id: '',
        });
        setFormError(null);
        loadFreeUsers(emp.id);
        setModalOpen(true);
    }
    async function handleDelete(emp: Employee) {
        if (!confirm(`Удалить сотрудника «${emp.last_name} ${emp.first_name}»?`))
            return;
        try {
            await apiClient.delete(`/employees/${emp.id}`);
            setEmployees((prev) => prev.filter((e) => e.id !== emp.id));
        }
        catch (err: unknown) {
            const e = err as {
                response?: {
                    data?: {
                        error?: string;
                    };
                };
            };
            alert(e.response?.data?.error ?? 'Ошибка при удалении');
        }
    }
    function setField(field: keyof FormState, value: string) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.last_name.trim()) {
            setFormError('Фамилия обязательна');
            return;
        }
        if (!form.first_name.trim()) {
            setFormError('Имя обязательно');
            return;
        }
        const needsNewAccount = form.account_mode === 'new';
        if (needsNewAccount) {
            if (!form.login.trim()) {
                setFormError('Логин обязателен');
                return;
            }
            if (!form.password.trim()) {
                setFormError('Пароль обязателен');
                return;
            }
        }
        setSubmitting(true);
        setFormError(null);
        try {
            if (editing) {
                await apiClient.put(`/employees/${editing.id}`, {
                    last_name: form.last_name.trim(),
                    first_name: form.first_name.trim(),
                    middle_name: form.middle_name.trim() || null,
                    rank_id: form.rank_id ? Number(form.rank_id) : null,
                    position_id: form.position_id ? Number(form.position_id) : null,
                    phone_number: form.phone_number.trim() || null,
                });
                if (editing.user_id) {
                    if (form.password.trim()) {
                        await apiClient.put(`/users/${editing.user_id}`, { password: form.password });
                    }
                }
                else {
                    if (form.account_mode === 'new') {
                        const userRes = await apiClient.post<{
                            data: {
                                id: number;
                            };
                        }>('/users', {
                            login: form.login.trim(),
                            password: form.password,
                            role_id: Number(form.role_id),
                            unit_id: selectedUnitId,
                        });
                        await apiClient.put(`/employees/${editing.id}`, { user_id: userRes.data.data.id });
                    }
                    else if (form.account_mode === 'link' && form.link_user_id) {
                        const linkedUserId = Number(form.link_user_id);
                        await apiClient.put(`/employees/${editing.id}`, { user_id: linkedUserId });
                        await apiClient.put(`/users/${linkedUserId}`, { unit_id: selectedUnitId });
                    }
                }
            }
            else {
                let userId: number | null = null;
                if (form.account_mode === 'new') {
                    const userRes = await apiClient.post<{
                        data: {
                            id: number;
                        };
                    }>('/users', {
                        login: form.login.trim(),
                        password: form.password,
                        role_id: Number(form.role_id),
                        unit_id: selectedUnitId,
                    });
                    userId = userRes.data.data.id;
                }
                else if (form.account_mode === 'link' && form.link_user_id) {
                    userId = Number(form.link_user_id);
                    await apiClient.put(`/users/${userId}`, { unit_id: selectedUnitId });
                }
                await apiClient.post('/employees', {
                    last_name: form.last_name.trim(),
                    first_name: form.first_name.trim(),
                    middle_name: form.middle_name.trim() || null,
                    rank_id: form.rank_id ? Number(form.rank_id) : null,
                    position_id: form.position_id ? Number(form.position_id) : null,
                    phone_number: form.phone_number.trim() || null,
                    unit_id: selectedUnitId,
                    user_id: userId,
                });
            }
            setModalOpen(false);
            if (selectedUnitId)
                fetchEmployees(selectedUnitId);
        }
        catch (err: unknown) {
            const ex = err as {
                response?: {
                    data?: {
                        error?: string;
                    };
                };
            };
            setFormError(ex.response?.data?.error ?? 'Ошибка при сохранении');
        }
        finally {
            setSubmitting(false);
        }
    }
    const selectedUnit = units.find((u) => u.id === selectedUnitId);
    const filteredEmployees = employees.filter((emp) => {
        if (!search.trim())
            return true;
        const q = search.toLowerCase();
        return [emp.last_name, emp.first_name, emp.middle_name].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
    function roleName(roleId: number | null): string {
        if (!roleId)
            return '—';
        const r = roles.find((x) => x.id === roleId);
        return r ? (ROLE_LABELS[r.name] ?? r.name) : String(roleId);
    }
    return (<div>
      <h2 style={titleStyle}>Личный состав</h2>

      
      <div style={unitSelectorCard}>
        <label style={unitSelectorLabel}>Выберите подразделение</label>
        <div style={unitButtonsRow}>
          {units.map((u) => (<button key={u.id} onClick={() => handleUnitChange(u.id)} style={selectedUnitId === u.id ? unitBtnActive : unitBtnInactive}>
              {u.name}
            </button>))}
          {units.length === 0 && (<span style={{ color: '#94a3b8', fontSize: 14 }}>
              Нет подразделений. Сначала добавьте их в разделе «Подразделения».
            </span>)}
        </div>
      </div>

      
      {selectedUnitId && (<div style={rosterCard}>
          <div style={rosterHeader}>
            <div>
              <span style={rosterTitle}>{selectedUnit?.name}</span>
              <span style={rosterCount}>
                {loadingEmps ? '' : ` — ${employees.length} чел.`}
              </span>
            </div>
            <button onClick={openAdd} style={addBtnStyle}>+ Добавить сотрудника</button>
          </div>

          {loadError && <div style={errorBannerStyle}>{loadError}</div>}

          {!loadingEmps && employees.length > 0 && (<div style={{ marginBottom: 12 }}>
              <input type="text" placeholder="Поиск по ФИО..." value={search} onChange={(e) => setSearch(e.target.value)} style={searchInputStyle}/>
            </div>)}

          {loadingEmps ? (<p style={{ color: '#64748b' }}>Загрузка...</p>) : employees.length === 0 ? (<p style={{ color: '#94a3b8', textAlign: 'center', padding: '24px 0' }}>
              В этом подразделении нет сотрудников
            </p>) : filteredEmployees.length === 0 ? (<p style={{ color: '#94a3b8', textAlign: 'center', padding: '16px 0' }}>
              Сотрудники не найдены
            </p>) : (<table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>№</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>ФИО</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Звание</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Должность</th>
                  <th style={thStyle}>Аккаунт</th>
                  <th style={thStyle}>Роль</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp, idx) => (<tr key={emp.id} style={idx % 2 === 0 ? rowEven : rowOdd}>
                    <td style={tdCenter}>{idx + 1}</td>
                    <td style={td}>
                      <strong>{emp.last_name}</strong> {emp.first_name}
                      {emp.middle_name && ` ${emp.middle_name}`}
                    </td>
                    <td style={td}>{emp.rank_name ?? '—'}</td>
                    <td style={td}>{emp.position_name ?? '—'}</td>
                    <td style={tdCenter}>
                      {emp.user_login ? (<span style={accountBadge}>{emp.user_login}</span>) : (<span style={noAccountBadge}>нет</span>)}
                    </td>
                    <td style={tdCenter}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        {roleName(emp.user_role_id)}
                      </span>
                    </td>
                    <td style={tdCenter}>
                      <button onClick={() => openEdit(emp)} style={editBtn} title="Редактировать">✏</button>
                      <button onClick={() => handleDelete(emp)} style={deleteBtn} title="Удалить">✕</button>
                    </td>
                  </tr>))}
              </tbody>
            </table>)}
        </div>)}

      
      {modalOpen && (<Modal title={editing ? `${editing.last_name} ${editing.first_name}` : 'Новый сотрудник'} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit}>
            {formError && <div style={errorBannerStyle}>{formError}</div>}

            <SectionLabel>Личные данные</SectionLabel>

            <Field label="Фамилия *">
              <input style={inputStyle} value={form.last_name} onChange={(e) => setField('last_name', e.target.value)} autoFocus placeholder="Иванов"/>
            </Field>
            <Field label="Имя *">
              <input style={inputStyle} value={form.first_name} onChange={(e) => setField('first_name', e.target.value)} placeholder="Иван"/>
            </Field>
            <Field label="Отчество">
              <input style={inputStyle} value={form.middle_name} onChange={(e) => setField('middle_name', e.target.value)} placeholder="Иванович"/>
            </Field>

            <SectionLabel>Должность и звание</SectionLabel>

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
            <Field label="Телефон">
              <input style={inputStyle} value={form.phone_number} onChange={(e) => setField('phone_number', e.target.value)} placeholder="+7..."/>
            </Field>

            <SectionLabel>Учётная запись</SectionLabel>

            {editing?.user_login ? (<>
                <div style={accountInfoRow}>
                  <span style={accountBadge}>{editing.user_login}</span>
                  <span style={{ color: '#64748b', fontSize: 13, marginLeft: 8 }}>
                    {roleName(editing.user_role_id)}
                  </span>
                </div>
                <Field label="Новый пароль (оставьте пустым, чтобы не менять)">
                  <input style={inputStyle} type="password" value={form.password} onChange={(e) => setField('password', e.target.value)}/>
                </Field>
              </>) : (<>
                <Field label="Действие">
                  <select style={inputStyle} value={form.account_mode} onChange={(e) => setField('account_mode', e.target.value)}>
                    <option value="">— без учётной записи —</option>
                    <option value="new">Создать новую учётную запись</option>
                    <option value="link">Привязать существующую</option>
                  </select>
                </Field>

                {form.account_mode === 'new' && (<>
                    <Field label="Роль">
                      <select style={inputStyle} value={form.role_id} onChange={(e) => setField('role_id', e.target.value)}>
                        {roles.map((r) => (<option key={r.id} value={r.id}>{ROLE_LABELS[r.name] ?? r.name}</option>))}
                      </select>
                    </Field>
                    <Field label="Логин *">
                      <input style={inputStyle} value={form.login} onChange={(e) => setField('login', e.target.value)}/>
                    </Field>
                    <Field label="Пароль *">
                      <input style={inputStyle} type="password" value={form.password} onChange={(e) => setField('password', e.target.value)}/>
                    </Field>
                  </>)}

                {form.account_mode === 'link' && (<Field label="Существующий пользователь">
                    <select style={inputStyle} value={form.link_user_id} onChange={(e) => setField('link_user_id', e.target.value)}>
                      <option value="">— выберите —</option>
                      {freeUsers.map((u) => <option key={u.id} value={u.id}>{u.login}</option>)}
                    </select>
                    {freeUsers.length === 0 && (<p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
                        Нет свободных пользователей без привязанного сотрудника
                      </p>)}
                  </Field>)}
              </>)}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button type="button" onClick={() => setModalOpen(false)} style={cancelBtnStyle}>Отмена</button>
              <button type="submit" disabled={submitting} style={submitBtnStyle}>
                {submitting ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </form>
        </Modal>)}
    </div>);
}
function Field({ label, children }: {
    label: string;
    children: React.ReactNode;
}) {
    return (<div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>);
}
function SectionLabel({ children }: {
    children: React.ReactNode;
}) {
    return <div style={sectionLabelStyle}>{children}</div>;
}
const titleStyle: React.CSSProperties = { marginTop: 0, marginBottom: 20, fontSize: 20, color: '#1e293b' };
const unitSelectorCard: React.CSSProperties = {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
    padding: '16px 20px', marginBottom: 20,
};
const unitSelectorLabel: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
};
const unitButtonsRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8 };
const unitBtnBase: React.CSSProperties = {
    padding: '8px 18px', borderRadius: 6, fontSize: 14, fontWeight: 500,
    cursor: 'pointer', border: '1.5px solid transparent', transition: 'all 0.15s',
};
const unitBtnInactive: React.CSSProperties = { ...unitBtnBase, background: '#f1f5f9', border: '1.5px solid #cbd5e1', color: '#374151' };
const unitBtnActive: React.CSSProperties = { ...unitBtnBase, background: '#2563eb', border: '1.5px solid #2563eb', color: '#fff' };
const rosterCard: React.CSSProperties = {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px',
};
const rosterHeader: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
};
const rosterTitle: React.CSSProperties = { fontSize: 16, fontWeight: 700, color: '#1e293b' };
const rosterCount: React.CSSProperties = { fontSize: 14, color: '#64748b' };
const addBtnStyle: React.CSSProperties = {
    background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4,
    padding: '8px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 500,
};
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 14 };
const thStyle: React.CSSProperties = {
    background: '#f1f5f9', padding: '8px 12px', borderBottom: '2px solid #e2e8f0',
    fontWeight: 600, color: '#374151', textAlign: 'center', whiteSpace: 'nowrap',
};
const td: React.CSSProperties = { padding: '9px 12px', borderBottom: '1px solid #f1f5f9', color: '#1e293b', textAlign: 'left' };
const tdCenter: React.CSSProperties = { ...td, textAlign: 'center' };
const rowEven: React.CSSProperties = { background: '#fff' };
const rowOdd: React.CSSProperties = { background: '#fafafa' };
const accountBadge: React.CSSProperties = {
    display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 12,
    fontWeight: 500, background: '#dbeafe', color: '#1d4ed8',
};
const noAccountBadge: React.CSSProperties = {
    display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 12,
    fontWeight: 500, background: '#f1f5f9', color: '#94a3b8',
};
const accountInfoRow: React.CSSProperties = { display: 'flex', alignItems: 'center', marginBottom: 10 };
const editBtn: React.CSSProperties = {
    background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 15,
    color: '#2563eb', padding: '2px 6px', marginRight: 2,
};
const deleteBtn: React.CSSProperties = {
    background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14,
    color: '#dc2626', padding: '2px 6px',
};
const errorBannerStyle: React.CSSProperties = {
    background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c',
    borderRadius: 4, padding: '8px 12px', marginBottom: 12, fontSize: 14,
};
const sectionLabelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase',
    letterSpacing: '0.08em', marginBottom: 10, marginTop: 6,
    borderBottom: '1px solid #e2e8f0', paddingBottom: 4,
};
const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: '#374151',
};
const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1',
    borderRadius: 4, fontSize: 14, boxSizing: 'border-box',
};
const searchInputStyle: React.CSSProperties = {
    padding: '7px 12px', border: '1px solid #cbd5e1', borderRadius: 4,
    fontSize: 14, width: '100%', maxWidth: 320, boxSizing: 'border-box',
};
const cancelBtnStyle: React.CSSProperties = {
    background: '#f1f5f9', color: '#374151', border: '1px solid #cbd5e1',
    borderRadius: 4, padding: '7px 16px', cursor: 'pointer', fontSize: 14,
};
const submitBtnStyle: React.CSSProperties = {
    background: '#2563eb', color: '#fff', border: 'none',
    borderRadius: 4, padding: '7px 16px', cursor: 'pointer', fontSize: 14,
};
