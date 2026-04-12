# Implementation Plan: Система учёта личного состава

## Overview

Реализация трёхзвенного приложения: Backend (Node.js/Express/TypeScript + PostgreSQL), Web App (React SPA, Vite), Android App (Kotlin). Задачи выстроены инкрементально — каждый шаг опирается на предыдущий.

## Tasks

- [x] 1. Инициализация проекта и схема базы данных
  - Создать монорепозиторий с директориями `backend/`, `web/`, `android/`
  - Инициализировать `backend/` как Node.js/Express проект с TypeScript
  - Написать SQL-миграции: `001_init.sql` (таблицы `roles`, `users`, `user_statuses`, `positions`, `ranks`, `units`, `employees`, `audit_log`, `raskhod`, `raskhod_entries`, `alerts`, `alert_responses`), `002_seed.sql` (начальные данные), `003_refresh_tokens.sql`, `004_users_unit_status.sql` (`unit_id`, `user_status_id` в `users`, ON DELETE SET NULL для `employees.user_id`)
  - Настроить подключение к PostgreSQL через переменные окружения
  - _Requirements: 1.1–1.12_

- [x] 2. Аутентификация и авторизация (Backend)
  - [x] 2.1 Реализовать `POST /api/auth/login`
    - Проверка логина/пароля, bcrypt (cost ≥ 10), возврат JWT access + refresh токенов + роли
    - Запись `date_time_in` в `audit_log`
    - Определение `unit_id` через `COALESCE(employees.unit_id, users.unit_id)`
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 2.7_

  - [x] 2.2 Реализовать `POST /api/auth/refresh` и `POST /api/auth/logout`
    - Refresh: валидация refresh-токена из таблицы `refresh_tokens`, rotation (старый удаляется)
    - Logout: запись `date_time_out` в `audit_log`, удаление refresh-токена
    - _Requirements: 2.4, 2.6_

  - [x] 2.3 Реализовать JWT middleware для защищённых маршрутов
    - Проверка access-токена, извлечение `sub`, `role`, `unit_id`
    - HTTP 401 при отсутствии/невалидном токене, HTTP 403 при недостаточных правах
    - _Requirements: 7.4, 7.5_

- [x] 3. Административные CRUD-эндпоинты (Backend)
  - [x] 3.1 Реализовать CRUD для `users`
    - `GET/POST /api/users`, `GET/PUT/DELETE /api/users/:id`
    - HTTP 409 при дублировании `login`
    - Поддержка ФИО (создание/обновление связанного `employees` в транзакции)
    - Постраничный вывод (`page`, `page_size`)
    - _Requirements: 3.3, 3.5, 3.7_

  - [x] 3.2 Реализовать CRUD для `employees`
    - `GET/POST /api/employees`, `GET/PUT/DELETE /api/employees/:id`
    - Фильтрация по `?unit_id=X`, постраничный вывод
    - Возврат связанных данных (`user_login`, `user_role_id`, `position_name`, `rank_name`, `unit_name`)
    - _Requirements: 3.1, 3.7, 3.9_

  - [x] 3.3 Реализовать CRUD для справочников `positions`, `ranks`, `units`, `user_statuses`
    - HTTP 409 при попытке удалить запись с активными ссылками
    - _Requirements: 3.4, 3.6_

  - [x] 3.4 Реализовать `GET /api/roles` — список ролей (только чтение)

  - [x] 3.5 Реализовать `GET /api/audit-log` — журнал входов/выходов с информацией о пользователе
    - _Requirements: 3.8_

- [x] 4. Профиль и данные подразделения (Backend)
  - [x] 4.1 Реализовать `GET /api/employees/me` — профиль текущего сотрудника
  - [x] 4.2 Реализовать `GET /api/employees/unit` — список сотрудников подразделения командира
  - [x] 4.3 Реализовать `GET /api/employees/statuses` — список статусов
  - [x] 4.4 Реализовать `PUT /api/employees/me/fcm-token` — обновление FCM-токена
  - _Requirements: 6.7, 6.6_

- [x] 5. Расход личного состава (Backend)
  - [x] 5.1 Реализовать `POST /api/raskhod` — создание расхода
    - Сохранение в `raskhod` + `raskhod_entries`, HTTP 409 при дублировании
    - _Requirements: 4.5, 4.6_

  - [x] 5.2 Реализовать `GET /api/raskhod` и `GET /api/raskhod/:id` — история и детали
    - _Requirements: 4.7_

  - [x] 5.3 Реализовать `PUT /api/raskhod/:id` — редактирование записей расхода
    - _Requirements: 4.8_

  - [x] 5.4 Реализовать `DELETE /api/raskhod/:id` — удаление расхода
    - Удаление `raskhod_entries` + `raskhod` в транзакции
    - _Requirements: 4.10_

  - [x] 5.5 Реализовать `GET /api/raskhod/:id/download` — генерация DOCX-документа
    - _Requirements: 4.9_

- [x] 6. Тревога (Backend + FCM)
  - [x] 6.1 Реализовать `POST /api/alerts` — объявление тревоги + отправка FCM push
    - _Requirements: 5.2, 5.3, 5.4_

  - [x] 6.2 Реализовать `POST /api/alerts/:id/respond` — подтверждение от сотрудника
    - _Requirements: 6.3, 6.4_

  - [x] 6.3 Реализовать `GET /api/alerts/:id/responses` — список откликов
    - _Requirements: 5.5, 5.6_

  - [x] 6.4 Реализовать `GET /api/alerts` — история тревог подразделения с пагинацией
    - _Requirements: 5.8_

- [x] 7. Web App — базовая структура и аутентификация (React)
  - Инициализировать React SPA (Vite + TypeScript)
  - Настроить React Router с маршрутами для всех страниц
  - Реализовать страницу `/login`, `AuthContext`, axios-интерцептор для refresh
  - Реализовать защищённые маршруты `PrivateRoute` с проверкой роли
  - _Requirements: 2.1, 2.3, 2.4, 7.4, 7.5_

- [x] 8. Web App — административная панель (React)
  - [x] 8.1 Реализовать навигацию и layout (`AdminPage` с боковым меню)
    - Разделы: Личный состав, Учётные записи, Должности, Звания, Подразделения, Статусы, Журнал входов
    - _Requirements: 3.1, 8.3_

  - [x] 8.2 Реализовать `RosterPage` — единая страница управления личным составом
    - Двухшаговый интерфейс: выбор подразделения → список сотрудников
    - Добавление, редактирование, удаление сотрудников с привязкой/созданием учётных записей
    - Поиск по ФИО, динамическая загрузка ролей
    - _Requirements: 3.1, 3.2, 3.9, 3.10_

  - [x] 8.3 Реализовать `UsersPage` — прямое управление учётными записями
    - Включая возможность создания admin-аккаунтов
    - _Requirements: 3.3_

  - [x] 8.4 Реализовать CRUD-таблицы для каждого справочника
    - `PositionsPage`, `RanksPage`, `UnitsPage`, `UserStatusesPage`
    - _Requirements: 3.4, 3.5, 3.6, 3.7_

  - [x] 8.5 Реализовать `AuditLogPage` — журнал входов
    - _Requirements: 3.8_

- [x] 9. Web App — расход личного состава (React)
  - [x] 9.1 Реализовать `RaskhodPage` — форма расхода
    - Чипы-кнопки для выбора статуса (по умолчанию «налицо»), командир исключён из списка
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 9.2 Реализовать `RaskhodHistoryPage` — история расходов
    - Двухколоночный интерфейс с группировкой по месяцам, поиском по дате, фильтром по времени
    - Просмотр деталей, редактирование статусов, скачивание DOCX, удаление
    - _Requirements: 4.7, 4.8, 4.9, 4.10_

- [x] 10. Web App — панель тревоги (React)
  - [x] 10.1 Реализовать `AlertsPage` — объявление тревоги
    - Кнопка «Объявить тревогу», live-таблица откликов (polling 10 сек), активная тревога в localStorage
    - Командир исключён из списка откликов
    - _Requirements: 5.1, 5.2, 5.5, 5.6, 5.7_

  - [x] 10.2 Реализовать `AlertsHistoryPage` — история тревог
    - Двухпанельный интерфейс: список тревог слева, детали откликов справа
    - Поиск по дате, фильтр по полноте отклика, поиск по ФИО в деталях
    - _Requirements: 5.8_

- [x] 11. Web App — навигация (React)
  - Реализовать `CommanderNav` — единая навигационная панель для всех страниц командира
  - Подсветка активного раздела через `NavLink`
  - _Requirements: 8.1, 8.2_

- [x] 12. Android App — базовая структура и аутентификация (Kotlin)
  - Создать Android-проект (Kotlin, minSdk 26)
  - Зависимости: Retrofit, OkHttp, Moshi, Firebase Messaging, Room, WorkManager
  - `LoginActivity`: форма логина, вызов `POST /api/auth/login`, сохранение токенов в SharedPreferences
  - `AuthHeaderInterceptor` + `RefreshTokenAuthenticator` (OkHttp): автоматическое обновление JWT
  - _Requirements: 2.1, 2.3, 2.4_

- [x] 13. Android App — главный экран и профиль (Kotlin)
  - `HomeActivity`: отображение профиля сотрудника (ФИО, звание, должность, подразделение)
  - Загрузка данных через `GET /api/employees/me`
  - Кнопка выхода
  - _Requirements: 6.7_

- [x] 14. Android App — FCM и получение тревоги (Kotlin)
  - [x] 14.1 Реализовать `MyFirebaseMessagingService`
    - Приём FCM data payload (`type=alert`, `alert_id=<id>`)
    - Запуск `AlarmPlayerService` (foreground service, системный alarm tone)
    - Открытие `AlertActivity` (полноэкранная)
    - _Requirements: 6.1, 6.2_

  - [x] 14.2 Реализовать `AlertActivity`
    - Кнопка «Принял» → вызов `POST /api/alerts/:id/respond`
    - _Requirements: 6.2, 6.3_

  - [x] 14.3 Реализовать offline-очередь (Room + WorkManager)
    - `AppDatabase`, `QueuedAlertResponse`, `QueuedAlertResponseDao`, `AlertResponseQueue`
    - `AlertSyncWorker` + `AlertSyncScheduler` для отправки при восстановлении сети
    - _Requirements: 6.5_

  - [x] 14.4 Реализовать регистрацию FCM-токена при входе
    - `PUT /api/employees/me/fcm-token` после успешного логина
    - _Requirements: 6.6_

- [ ] 15. Валидация входящих данных (Backend)
  - Добавить middleware валидации для всех POST/PUT эндпоинтов
  - Возврат HTTP 400 с описанием ошибки при некорректном формате
  - _Requirements: 7.6_

- [ ] 16. Тестирование
  - Unit-тесты для auth-модуля
  - Unit-тесты для admin-эндпоинтов
  - Unit-тесты для расхода и тревоги
  - Интеграционные тесты для ключевых сценариев
  - E2E тесты Web App (Playwright)

## Notes

- Backend: Node.js/Express + TypeScript + PostgreSQL
- Web App: React + TypeScript (Vite)
- Android App: Kotlin, Firebase Messaging, Room, WorkManager, Retrofit, OkHttp, Moshi
- Миграции БД: `001_init.sql`, `002_seed.sql`, `003_refresh_tokens.sql`, `004_users_unit_status.sql`
- Генерация DOCX на сервере через библиотеку `docx`
- Firebase Admin SDK для серверной отправки FCM
