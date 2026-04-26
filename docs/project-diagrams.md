# Диаграммы и схемы проекта diplom_signal (Mermaid)

## Важно для Kroki.io (иначе Error 400 / No diagram type detected)

В поле ввода Kroki должна попасть **только** строка с типом диаграммы: первая значащая строка — `graph TB`, `flowchart TB`, `sequenceDiagram`, `erDiagram` и т.д.

**Нельзя** вставлять:

- строку `` ```mermaid``
- закрывающие `` ``` ``
- весь блок Markdown целиком

Если Kroki пишет **`No diagram type detected`** и в тексте ошибки видно начало вроде `` `mermaid flowchart`` — вы всё ещё вставили **ограждение** или склеили слово `mermaid` с `flowchart`/`graph`. Допустимое начало вставки: **`graph TB`**, **`sequenceDiagram`**, **`erDiagram`** (первая строка кода диаграммы).

**Как копировать из этого файла:** откройте блок под заголовком раздела, выделите текст **от первой строки внутри блока** (`graph…` / `sequenceDiagram` / `erDiagram`) **до строки перед** закрывающими `` ``` `` (**три кавычки в конце не копируйте**). Вставьте в Kroki только это.

Один запрос Kroki = **одна** диаграмма. POST: `https://kroki.io/mermaid/svg`, тело — UTF-8 plain text **без** Markdown-ограждений.

**PowerShell** (сохраните **одну** скопированную диаграмму в файл, например `docs/_kroki-input.mmd`):

```powershell
$body = Get-Content .\docs\_kroki-input.mmd -Raw -Encoding UTF8
Invoke-WebRequest -Uri "https://kroki.io/mermaid/svg" -Method Post -Body $body `
  -ContentType "text/plain; charset=utf-8" -OutFile .\docs\diagram.svg -UseBasicParsing
```

PNG: в URI замените `/mermaid/svg` на `/mermaid/png`.

**Локально:** `npx --yes @mermaid-js/mermaid-cli -i docs/_kroki-input.mmd -o docs/diagram.svg`

Текстовое описание полей БД без Mermaid: [`database-schema.md`](database-schema.md).

---

## 1. Архитектура системы (клиенты, nginx, API, БД, FCM)

```mermaid
graph TB
  subgraph clients
    web[Веб-клиент React SPA]
    andr[Android-клиент]
  end
  subgraph edge
    ngx[nginx статика и прокси /api]
  end
  subgraph api
    mw[JWT и роли admin commander user]
    auth["/api/auth"]
    emp["/api/employees me unit и админ-кадры"]
    adm["Админ users справочники audit-log"]
    ras["/api/raskhod commander"]
    alr["/api/alerts"]
  end
  db[("PostgreSQL")]
  fcm[Firebase Cloud Messaging опционально]
  web -->|HTTPS| ngx
  ngx -->|JSON /api| mw
  mw --> auth
  mw --> emp
  mw --> adm
  mw --> ras
  mw --> alr
  auth --> db
  emp --> db
  adm --> db
  ras --> db
  alr --> db
  alr -->|push при тревоге| fcm
  fcm -->|уведомления| andr
```

---

## 2. Группы HTTP-маршрутов и хранилище

Соответствует `backend/src/index.ts`.

```mermaid
graph TB
  subgraph auth_r
    A["/api/auth"]
  end
  subgraph emp_r
    E1["GET /me user commander"]
    E2["GET /unit commander"]
    E3["админский CRUD admin"]
  end
  subgraph adm_r
    U["/api/users"]
    P["/api/positions ranks units user-statuses roles"]
    L["/api/audit-log"]
  end
  subgraph cmd_r
    R["/api/raskhod"]
  end
  subgraph alr_r
    Z["тревоги и при необходимости FCM"]
  end
  PGSTORE[("PostgreSQL")]
  A --> PGSTORE
  E1 --> PGSTORE
  E2 --> PGSTORE
  E3 --> PGSTORE
  U --> PGSTORE
  P --> PGSTORE
  L --> PGSTORE
  R --> PGSTORE
  Z --> PGSTORE
```

---

## 3. Поток объявления тревоги и push

```mermaid
sequenceDiagram
  actor K as Командир
  participant SPA as Веб SPA
  participant NGX as nginx
  participant API as Express /api/alerts
  participant DB as PostgreSQL
  participant FCM as Firebase FCM
  participant M as Мобильные устройства
  K->>SPA: действие в интерфейсе тревоги
  SPA->>NGX: HTTPS Bearer JWT
  NGX->>API: прокси /api
  API->>DB: фиксация тревоги
  opt если задан Firebase
    API->>FCM: отправка push
    FCM-->>M: уведомление
  end
  API-->>SPA: JSON-ответ
  SPA-->>K: результат в UI
```

---

## 4. Диплом: логико-функциональная архитектура (уровни L1–L5)

Синтаксис совместим со старым Mermaid: `graph`, `subgraph` без заголовка в скобках, только `-->`.

```mermaid
%% diploma-full
graph TB
  subgraph L1
    U1[Веб-клиент]
    U2[Мобильный клиент Android]
  end
  subgraph L2
    PRX[nginx прокси и статика]
  end
  subgraph L3
    APP[Node.js Express]
    A1[Аутентификация и сеансы]
    A2[Учёт состава и справочники]
    A3[Расход личного состава]
    A4[Тревоги и отклики]
    A5[Журнал администратора]
    APP --> A1
    APP --> A2
    APP --> A3
    APP --> A4
    APP --> A5
  end
  subgraph L4
    PG[PostgreSQL]
  end
  subgraph L5
    FCM[Firebase Cloud Messaging]
  end
  U1 --> PRX
  PRX --> APP
  A1 --> PG
  A2 --> PG
  A3 --> PG
  A4 --> PG
  A5 --> PG
  A4 --> FCM
  FCM --> U2
```

Подпись к рисунку: **L1** пользователи, **L2** представление, **L3** прикладная логика, **L4** данные, **L5** внешний сервис.

---

## 5. Диплом: краткие подписи (та же топология)

```mermaid
%% diploma-short
graph TB
  subgraph L1d
    U1d[Веб-клиент]
    U2d[Android]
  end
  subgraph L2d
    PRXd[nginx]
  end
  subgraph L3d
    APPd[Express]
    A1d[Аутентификация]
    A2d[Состав и справочники]
    A3d[Расход]
    A4d[Тревоги]
    A5d[Аудит]
    APPd --> A1d
    APPd --> A2d
    APPd --> A3d
    APPd --> A4d
    APPd --> A5d
  end
  subgraph L4d
    PGd[PostgreSQL]
  end
  subgraph L5d
    FCMd[FCM]
  end
  U1d --> PRXd
  PRXd --> APPd
  A1d --> PGd
  A2d --> PGd
  A3d --> PGd
  A4d --> PGd
  A5d --> PGd
  A4d --> FCMd
  FCMd --> U2d
```

---

## 6. Диплом: композиция компонентов

```mermaid
%% diploma-lr
graph LR
  C1[Клиент React]
  C2[Сервер Express]
  C3[PostgreSQL]
  C4[FCM опционально]
  C1 --> C2
  C2 --> C3
  C2 --> C4
```

---

## 7. Схема связей сущностей БД (ER)

Упрощённо; типы и поля см. `database-schema.md`.

```mermaid
erDiagram
  roles ||--o{ users : role_id
  units ||--o{ users : unit_id
  users ||--o| employees : user_id
  positions ||--o{ employees : position_id
  ranks ||--o{ employees : rank_id
  units ||--|{ employees : unit_id
  users ||--o{ audit_log : user_id
  users ||--o{ raskhod : created_by
  units ||--o{ raskhod : unit_id
  raskhod ||--|{ raskhod_entries : raskhod_id
  employees ||--|{ raskhod_entries : employee_id
  user_statuses ||--|{ raskhod_entries : status_id
  users ||--o{ alerts : created_by
  units ||--o{ alerts : unit_id
  alerts ||--|{ alert_responses : alert_id
  employees ||--|{ alert_responses : employee_id
  users ||--o{ refresh_tokens : user_id
```

---

## Подписи к рисункам (примеры)

- **Рисунок N** — Архитектура программного средства учёта личного состава.
- **Рисунок N+1** — Группы маршрутов API и СУБД.
- **Рисунок N+2** — Диаграмма последовательности: объявление тревоги и доставка уведомлений.
