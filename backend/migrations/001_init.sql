



CREATE TABLE IF NOT EXISTS roles (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);


CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    login         VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id       INTEGER NOT NULL REFERENCES roles(id)
);


CREATE TABLE IF NOT EXISTS user_statuses (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE

);


CREATE TABLE IF NOT EXISTS positions (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE
);


CREATE TABLE IF NOT EXISTS ranks (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE
);


CREATE TABLE IF NOT EXISTS units (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE
);


CREATE TABLE IF NOT EXISTS employees (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER REFERENCES users(id),
    last_name    VARCHAR(100) NOT NULL,
    first_name   VARCHAR(100) NOT NULL,
    middle_name  VARCHAR(100),
    position_id  INTEGER REFERENCES positions(id),
    rank_id      INTEGER REFERENCES ranks(id),
    birth_date   DATE,
    unit_id      INTEGER NOT NULL REFERENCES units(id),
    phone_number VARCHAR(20),
    fcm_token    VARCHAR(255)
);


CREATE TABLE IF NOT EXISTS audit_log (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id),
    date_time_in  TIMESTAMPTZ NOT NULL,
    date_time_out TIMESTAMPTZ
);


CREATE TABLE IF NOT EXISTS raskhod (
    id                 SERIAL PRIMARY KEY,
    raskhod_time       TIME NOT NULL,
    raskhod_date       DATE NOT NULL,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id),
    unit_id            INTEGER NOT NULL REFERENCES units(id),
    UNIQUE (raskhod_date, raskhod_time, unit_id)
);


CREATE TABLE IF NOT EXISTS raskhod_entries (
    id          SERIAL PRIMARY KEY,
    raskhod_id  INTEGER NOT NULL REFERENCES raskhod(id),
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    status_id   INTEGER NOT NULL REFERENCES user_statuses(id)
);


CREATE TABLE IF NOT EXISTS alerts (
    id                 SERIAL PRIMARY KEY,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unit_id            INTEGER NOT NULL REFERENCES units(id)
);


CREATE TABLE IF NOT EXISTS alert_responses (
    id           SERIAL PRIMARY KEY,
    alert_id     INTEGER NOT NULL REFERENCES alerts(id),
    employee_id  INTEGER NOT NULL REFERENCES employees(id),
    responded_at TIMESTAMPTZ NOT NULL,
    UNIQUE (alert_id, employee_id)
);
