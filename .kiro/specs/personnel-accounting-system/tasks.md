# Implementation Plan: Система учёта личного состава

## Overview

Реализация трёхзвенного приложения: Backend (Node.js/Express + PostgreSQL), Web App (React SPA), Android App (Kotlin). Задачи выстроены инкрементально — каждый шаг опирается на предыдущий и завершается интеграцией компонентов.

## Tasks

- [x] 1. Инициализация проекта и схема базы данных
  - Создать монорепозиторий с директориями `backend/`, `web/`, `android/`
  - Инициализировать `backend/` как Node.js/Express проект с TypeScript
  - Написать SQL-миграцию: таблицы `roles`, `users`, `user_statuses`, `positions`, `ranks`, `units`, `employees`, `audit_log`, `raskhod`, `raskhod_entries`, `alerts`, `alert_responses`
  - Добавить seed-данные для таблицы `roles` (user, admin, commander) и `user_statuses`
  - Настроить подключение к PostgreSQL через переменные окружения
  - _Requirements: 1.1–1.11_

- [x] 2. Аутентификация и авторизация (Backend)
  - [x] 2.1 Реализовать `POST /api/auth/login`
    - Проверка логина/пароля, bcrypt (cost ≥ 10), возврат JWT access + refresh токенов
    - Запись `date_time_in` в `audit_log`
    - _Requirements: 2.1, 2.2, 2.5, 2.6_

  - [x] 2.2 Реализовать `POST /api/auth/refresh` и `POST /api/auth/logout`
    - Refresh: валидация refresh-токена из БД, выдача новой пары
    - Logout: запись `date_time_out` в `audit_log`, инвалидация refresh-токена
    - _Requirements: 2.4, 2.6_

  - [x] 2.3 Реализовать JWT middleware для защищённых маршрутов
    - Проверка access-токена, извлечение `sub`, `role`, `unit_id`
    - Возврат HTTP 401 при отсутствии/невалидном токене
    - Возврат HTTP 403 при недостаточных правах
    - _Requirements: 7.4, 7.5_

  - [ ]* 2.4 Написать unit-тесты для auth-модуля
    - Тест: корректный логин → JWT пара
    - Тест: неверный пароль → HTTP 401
    - Тест: истёкший access-токен → HTTP 401
    - Тест: refresh с валидным токеном → новая пара
    - _Requirements: 2.1, 2.2, 2.4_

- [x] 3. Checkpoint — убедиться, что аутентификация работает
  - Все тесты проходят, ask the user if questions arise.

- [x] 4. Административные CRUD-эндпоинты (Backend)
  - [x] 4.1 Реализовать CRUD для `users`
    - `GET/POST /api/users`, `GET/PUT/DELETE /api/users/:id`
    - HTTP 409 при дублировании `login`
    - Постраничный вывод (`page`, `page_size`)
    - _Requirements: 3.1, 3.2, 3.4_

  - [x] 4.2 Реализовать CRUD для `employees`
    - `GET/POST /api/employees`, `GET/PUT/DELETE /api/employees/:id`
    - Постраничный вывод
    - _Requirements: 3.1, 3.4_

  - [x] 4.3 Реализовать CRUD для справочников `positions`, `ranks`, `units`, `user_statuses`
    - HTTP 409 при попытке удалить запись с активными ссылками
    - _Requirements: 3.1, 3.3, 3.4_

  - [ ]* 4.4 Написать unit-тесты для admin-эндпоинтов
    - Тест: создание пользователя с дублирующимся login → HTTP 409
    - Тест: удаление должности с привязанными сотрудниками → HTTP 409
    - Тест: постраничный список → корректные `meta.page`, `meta.total`
    - _Requirements: 3.2, 3.3, 3.4_

- [-] 5. Расход личного состава (Backend)
  - [-] 5.1 Реализовать `POST /api/raskhod`
    - Сохранение в `raskhod` + `raskhod_entries`
    - HTTP 409 при дублировании (дата + время + подразделение)
    - HTTP 201 при успехе
    - _Requirements: 4.5, 4.6_

  - [~] 5.2 Реализовать `GET /api/raskhod` и `GET /api/raskhod/:id`
    - История расходов подразделения commander'а
    - Детали расхода с записями по сотрудникам
    - _Requirements: 4.7_

  - [ ]* 5.3 Написать unit-тесты для расхода
    - Тест: повторная отправка на ту же дату/время → HTTP 409
    - Тест: успешное создание → HTTP 201, записи в БД
    - _Requirements: 4.5, 4.6_

- [ ] 6. Тревога (Backend + FCM)
  - [ ] 6.1 Реализовать `POST /api/alerts`
    - Создание записи в `alerts`, HTTP 201
    - Отправка FCM push-уведомлений всем сотрудникам подразделения (fcm_token) через FCM HTTP v1 API
    - Логирование ошибок доставки без прерывания отправки остальным
    - _Requirements: 5.2, 5.3, 5.4_

  - [ ] 6.2 Реализовать `POST /api/alerts/:id/respond`
    - Создание записи в `alert_responses`, HTTP 201
    - Доступ только для роли «user»
    - _Requirements: 6.4, 7.3_

  - [ ] 6.3 Реализовать `GET /api/alerts/:id/responses`
    - Список откликов с `responded_at` для commander'а
    - _Requirements: 5.5, 5.6_

  - [ ] 6.4 Реализовать `PUT /api/employees/me/fcm-token`
    - Обновление `fcm_token` в таблице `employees`
    - _Requirements: 6.6_

  - [ ]* 6.5 Написать unit-тесты для тревоги
    - Тест: создание тревоги → запись в `alerts`, вызов FCM
    - Тест: подтверждение от employee → запись в `alert_responses`
    - Тест: повторное подтверждение → HTTP 409 (UNIQUE constraint)
    - _Requirements: 5.2, 5.3, 6.4_

- [ ] 7. Checkpoint — убедиться, что все backend-тесты проходят
  - Все тесты проходят, ask the user if questions arise.

- [ ] 8. Web App — базовая структура и аутентификация (React)
  - Инициализировать React SPA (Vite + TypeScript)
  - Настроить React Router: `/login`, `/admin/*`, `/raskhod`, `/raskhod/history`, `/alerts`
  - Реализовать страницу `/login`: форма логина, вызов `POST /api/auth/login`, сохранение токенов
  - Реализовать axios-интерцептор для автоматического обновления access-токена через refresh
  - Реализовать защищённые маршруты (PrivateRoute) с проверкой роли
  - _Requirements: 2.1, 2.3, 2.4, 7.4, 7.5_

- [ ] 9. Web App — административная панель (React)
  - [ ] 9.1 Реализовать навигацию и layout для роли admin
    - Боковое меню с разделами: Пользователи, Сотрудники, Должности, Звания, Подразделения, Статусы
    - _Requirements: 3.5_

  - [ ] 9.2 Реализовать CRUD-таблицы для каждого справочника
    - Таблица с постраничной навигацией, кнопки «Добавить», «Редактировать», «Удалить»
    - Модальные формы создания/редактирования
    - Отображение ошибок HTTP 409 пользователю
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 10. Web App — расход личного состава (React)
  - Реализовать страницу `/raskhod`: форма со списком сотрудников подразделения
  - Статус «налицо» по умолчанию для каждого сотрудника
  - Выпадающий список статусов, мгновенное обновление без перезагрузки
  - Выбор времени (09:00 / 21:00) и даты
  - Кнопка «Отправить», обработка HTTP 409 (дубликат)
  - Страница `/raskhod/history` с историей и просмотром деталей
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [ ] 11. Web App — панель тревоги (React)
  - Реализовать страницу `/alerts` с кнопкой «Тревога»
  - После нажатия — таблица сотрудников с колонками «Принял» / «Не ответил» и временем ответа
  - Polling каждые 10 секунд (`GET /api/alerts/:id/responses`) для обновления статусов
  - _Requirements: 5.1, 5.2, 5.5, 5.6_

- [ ] 12. Checkpoint — проверить Web App end-to-end через автотесты
  - Все тесты проходят, ask the user if questions arise.

- [ ] 13. Android App — базовая структура и аутентификация (Kotlin)
  - Создать Android-проект (Kotlin, минимальный SDK совместимый с FCM)
  - Добавить зависимости: Retrofit, OkHttp, Firebase Messaging, Room, WorkManager
  - Реализовать `LoginActivity`: форма логина, вызов `POST /api/auth/login`, сохранение токенов в SharedPreferences/EncryptedSharedPreferences
  - Реализовать автоматическое обновление access-токена через OkHttp Interceptor
  - _Requirements: 2.1, 2.3, 2.4_

- [ ] 14. Android App — FCM и получение тревоги (Kotlin)
  - [ ] 14.1 Реализовать `FCMService` (extends `FirebaseMessagingService`)
    - Приём push-уведомления о тревоге
    - Воспроизведение звукового сигнала (будильник)
    - Отображение уведомления с кнопкой «Принял»
    - _Requirements: 6.1, 6.2_

  - [ ] 14.2 Реализовать `AlertNotificationActivity`
    - Кнопка «Принял» → вызов `POST /api/alerts/:id/respond`
    - _Requirements: 6.3_

  - [ ] 14.3 Реализовать `OfflineQueue` (Room + WorkManager)
    - Сохранение ответа локально при отсутствии сети
    - WorkManager-задача для отправки при восстановлении соединения
    - _Requirements: 6.5_

  - [ ] 14.4 Реализовать регистрацию FCM-токена при входе
    - Получение токена через `FirebaseMessaging.getInstance().token`
    - Вызов `PUT /api/employees/me/fcm-token` после успешного логина
    - _Requirements: 6.6_

  - [ ]* 14.5 Написать unit-тесты для OfflineQueue
    - Тест: ответ сохраняется в Room при отсутствии сети
    - Тест: WorkManager отправляет ответ при восстановлении сети
    - _Requirements: 6.5_

- [ ] 15. Валидация входящих данных (Backend)
  - Добавить middleware валидации (zod или joi) для всех POST/PUT эндпоинтов
  - Возврат HTTP 400 с описанием ошибки при некорректном формате
  - _Requirements: 7.6_

- [ ]* 16. Написать интеграционные тесты для ключевых сценариев
  - Тест: полный цикл расхода (login → создание расхода → проверка в БД)
  - Тест: полный цикл тревоги (login → POST /api/alerts → POST /api/alerts/:id/respond → GET responses)
  - Тест: разграничение доступа (commander не может обратиться к admin-эндпоинтам → HTTP 403)
  - _Requirements: 4.5, 5.2, 6.4, 7.1, 7.2, 7.3_

- [ ] 17. Final checkpoint — все тесты проходят
  - Все тесты проходят, ask the user if questions arise.

## Notes

- Задачи с `*` опциональны и могут быть пропущены для ускорения MVP
- Каждая задача ссылается на конкретные требования для трассируемости
- Checkpoints обеспечивают инкрементальную валидацию
- Backend реализуется на Node.js/Express + TypeScript + PostgreSQL
- Web App — React + TypeScript (Vite)
- Android App — Kotlin, Firebase Messaging, Room, WorkManager
