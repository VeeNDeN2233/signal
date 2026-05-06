const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'signal_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});
const COURSES = ['1 курс', '2 курс', '3 курс', '4 курс', '5 курс'];
const KURSANTS_PER_COURSE = 30;
const LAST_NAMES = [
    'Иванов', 'Петров', 'Сидоров', 'Кузнецов', 'Смирнов', 'Попов', 'Васильев', 'Соколов',
    'Михайлов', 'Новиков', 'Фёдоров', 'Морозов', 'Волков', 'Алексеев', 'Лебедев', 'Семёнов',
    'Егоров', 'Павлов', 'Козлов', 'Степанов', 'Николаев', 'Орлов', 'Андреев', 'Макаров',
    'Никитин', 'Захаров', 'Зайцев', 'Соловьёв', 'Борисов', 'Яковлев', 'Григорьев', 'Романов',
    'Воробьёв', 'Сергеев', 'Кузьмин', 'Фролов', 'Александров', 'Дмитриев', 'Королёв', 'Гусев',
    'Киселёв', 'Ильин', 'Максимов', 'Поляков', 'Сорокин', 'Виноградов', 'Ковалёв', 'Белов',
    'Медведев', 'Антонов', 'Тарасов', 'Жуков', 'Баранов', 'Филиппов', 'Комаров', 'Давыдов',
    'Беляев', 'Герасимов', 'Богданов', 'Осипов', 'Матвеев', 'Титов', 'Марков', 'Миронов',
    'Крылов', 'Куликов', 'Карпов', 'Власов', 'Мельников', 'Денисов', 'Гаврилов', 'Тихонов',
    'Казаков', 'Афанасьев', 'Данилов', 'Савельев', 'Тимофеев', 'Фомин', 'Чернов', 'Абрамов',
    'Мартынов', 'Ефимов', 'Федотов', 'Щербаков', 'Назаров', 'Калинин', 'Исаев', 'Чернышёв',
    'Быков', 'Маслов', 'Родионов', 'Коновалов', 'Лазарев', 'Воронов', 'Климов', 'Филатов',
    'Пономарёв', 'Голубев', 'Кудрявцев', 'Прохоров', 'Наумов', 'Потапов', 'Журавлёв', 'Овчинников',
];
const FIRST_NAMES = [
    'Александр', 'Дмитрий', 'Максим', 'Сергей', 'Андрей', 'Алексей', 'Артём', 'Илья',
    'Кирилл', 'Михаил', 'Никита', 'Матвей', 'Роман', 'Егор', 'Арсений', 'Иван',
    'Денис', 'Евгений', 'Даниил', 'Тимофей', 'Владислав', 'Игорь', 'Владимир', 'Павел',
    'Руслан', 'Марк', 'Константин', 'Тимур', 'Олег', 'Станислав',
];
const MIDDLE_NAMES = [
    'Александрович', 'Дмитриевич', 'Максимович', 'Сергеевич', 'Андреевич', 'Алексеевич',
    'Артёмович', 'Ильич', 'Кириллович', 'Михайлович', 'Никитич', 'Романович', 'Егорович',
    'Иванович', 'Денисович', 'Евгеньевич', 'Даниилович', 'Владиславович', 'Игоревич',
    'Владимирович', 'Павлович', 'Русланович', 'Олегович', 'Константинович', 'Тимурович',
];
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function genPhone() {
    return `+7${900 + Math.floor(Math.random() * 100)}${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`;
}
function transliterate(str) {
    const map = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z',
        'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
        'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh',
        'щ': 'sch', 'ы': 'y', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    };
    return str.toLowerCase().split('').map(c => {
        if (map[c])
            return map[c];
        if (c.charCodeAt(0) === 0x44a || c.charCodeAt(0) === 0x44c)
            return '';
        if (/[a-z0-9]/.test(c))
            return c;
        return '';
    }).join('');
}
async function run() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const ids = {
            roleUser: null,
            roleCommander: null,
            posKursant: null,
            posKomVzvod: null,
            posNachKursa: null,
            rankRyadovoy: null,
            rankSerzhant: null,
            rankCommanderPool: [],
            rankKomVzvodPool: [],
        };
        async function getIdByName(table, name) {
            const res = await client.query(`SELECT id FROM ${table} WHERE name = $1`, [name]);
            if (!res.rows[0])
                throw new Error(`Не найдено в справочнике ${table}: ${name}`);
            return res.rows[0].id;
        }
        ids.roleUser = await getIdByName('roles', 'user');
        ids.roleCommander = await getIdByName('roles', 'commander');
        ids.posKursant = await getIdByName('positions', 'Курсант');
        ids.posKomVzvod = await getIdByName('positions', 'Командир взвода');
        ids.posNachKursa = await getIdByName('positions', 'Начальник курса');
        ids.rankRyadovoy = await getIdByName('ranks', 'Рядовой полиции');
        ids.rankSerzhant = await getIdByName('ranks', 'Сержант полиции');
        ids.rankCommanderPool = [
            await getIdByName('ranks', 'Майор полиции'),
            await getIdByName('ranks', 'Подполковник полиции'),
            await getIdByName('ranks', 'Полковник полиции'),
        ];
        ids.rankKomVzvodPool = [
            await getIdByName('ranks', 'Лейтенант полиции'),
            await getIdByName('ranks', 'Старший лейтенант полиции'),
            await getIdByName('ranks', 'Капитан полиции'),
        ];
        const oldUnits = await client.query('SELECT id FROM units');
        const oldUnitIds = oldUnits.rows.map(r => r.id);
        if (oldUnitIds.length > 0) {
            const ph = oldUnitIds.map((_, i) => `$${i + 1}`).join(',');
            await client.query(`DELETE FROM raskhod_entries WHERE raskhod_id IN (SELECT id FROM raskhod WHERE unit_id IN (${ph}))`, oldUnitIds);
            await client.query(`DELETE FROM raskhod WHERE unit_id IN (${ph})`, oldUnitIds);
            await client.query(`DELETE FROM alert_responses WHERE alert_id IN (SELECT id FROM alerts WHERE unit_id IN (${ph}))`, oldUnitIds);
            await client.query(`DELETE FROM alerts WHERE unit_id IN (${ph})`, oldUnitIds);
            const oldEmps = await client.query(`SELECT id, user_id FROM employees WHERE unit_id IN (${ph})`, oldUnitIds);
            const oldUserIds = oldEmps.rows.filter(e => e.user_id).map(e => e.user_id);
            if (oldUserIds.length > 0) {
                const uph = oldUserIds.map((_, i) => `$${i + 1}`).join(',');
                await client.query(`DELETE FROM audit_log WHERE user_id IN (${uph})`, oldUserIds);
                await client.query(`DELETE FROM refresh_tokens WHERE user_id IN (${uph})`, oldUserIds);
            }
            await client.query(`DELETE FROM employees WHERE unit_id IN (${ph})`, oldUnitIds);
            if (oldUserIds.length > 0) {
                const uph = oldUserIds.map((_, i) => `$${i + 1}`).join(',');
                await client.query(`DELETE FROM users WHERE id IN (${uph})`, oldUserIds);
            }
            await client.query(`DELETE FROM units WHERE id IN (${ph})`, oldUnitIds);
            console.log(`Удалено ${oldUnitIds.length} старых подразделений.`);
        }
        const usedLogins = new Set();
        (await client.query('SELECT login FROM users')).rows.forEach(r => usedLogins.add(r.login));
        function makeLogin(lastName) {
            let login = transliterate(lastName);
            while (usedLogins.has(login))
                login += String(Math.floor(Math.random() * 100));
            usedLogins.add(login);
            return login;
        }
        async function createPerson(roleId, positionId, rankId, unitId) {
            const last = pick(LAST_NAMES);
            const first = pick(FIRST_NAMES);
            const middle = pick(MIDDLE_NAMES);
            const login = makeLogin(last);
            const hash = await bcrypt.hash(login, 10);
            const userRes = await client.query('INSERT INTO users (login, password_hash, role_id, unit_id) VALUES ($1, $2, $3, $4) RETURNING id', [login, hash, roleId, unitId]);
            await client.query(`INSERT INTO employees (user_id, last_name, first_name, middle_name, position_id, rank_id, unit_id, phone_number)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [userRes.rows[0].id, last, first, middle, positionId, rankId, unitId, genPhone()]);
            return { login, fio: `${last} ${first} ${middle}` };
        }
        let total = 0;
        for (const courseName of COURSES) {
            const unitRes = await client.query('INSERT INTO units (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id', [courseName]);
            const unitId = unitRes.rows[0].id;
            const nk = await createPerson(ids.roleCommander, ids.posNachKursa, pick(ids.rankCommanderPool), unitId);
            console.log(`${courseName}: Начальник курса — ${nk.fio} (логин: ${nk.login})`);
            total++;
            const kv = await createPerson(ids.roleCommander, ids.posKomVzvod, pick(ids.rankKomVzvodPool), unitId);
            console.log(`${courseName}: Командир взвода — ${kv.fio} (логин: ${kv.login})`);
            total++;
            for (let i = 0; i < KURSANTS_PER_COURSE; i++) {
                const rank = Math.random() < 0.95 ? ids.rankRyadovoy : ids.rankSerzhant;
                await createPerson(ids.roleUser, ids.posKursant, rank, unitId);
                total++;
            }
            console.log(`${courseName}: ${KURSANTS_PER_COURSE} курсантов добавлено`);
        }
        await client.query('COMMIT');
        console.log(`\nГотово! Создано ${total} записей (5 начальников + 5 командиров взвода + 150 курсантов).`);
        console.log('Пароль каждого = его логин.');
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('Ошибка:', err);
    }
    finally {
        client.release();
        await pool.end();
    }
}
run();
