"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv = __importStar(require("dotenv"));
const db_1 = require("./db");
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/admin/users"));
const employees_1 = __importDefault(require("./routes/admin/employees"));
const referencesRouter = __importStar(require("./routes/admin/references"));
const auth_2 = require("./middleware/auth");
const auditLog_1 = __importDefault(require("./routes/admin/auditLog"));
const raskhod_1 = __importDefault(require("./routes/raskhod"));
const alerts_1 = __importDefault(require("./routes/alerts"));
const employees_me_1 = __importDefault(require("./routes/employees-me"));
// Загружаем переменные окружения
dotenv.config();
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '3000', 10);
// Middleware для парсинга JSON
app.use(express_1.default.json());
// Базовый маршрут для проверки работоспособности
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', message: 'Сервер работает' });
});
// Маршруты аутентификации
app.use('/api/auth', auth_1.default);
// Маршруты сотрудников (для user и commander) — должны быть до admin /api/employees
app.use('/api/employees', auth_2.authenticate, employees_me_1.default);
// Административные маршруты (только admin)
app.use('/api/users', auth_2.authenticate, (0, auth_2.requireRole)('admin'), users_1.default);
app.use('/api/employees', auth_2.authenticate, (0, auth_2.requireRole)('admin'), employees_1.default);
app.use('/api/positions', auth_2.authenticate, (0, auth_2.requireRole)('admin'), referencesRouter.positions);
app.use('/api/ranks', auth_2.authenticate, (0, auth_2.requireRole)('admin'), referencesRouter.ranks);
app.use('/api/units', auth_2.authenticate, (0, auth_2.requireRole)('admin'), referencesRouter.units);
app.use('/api/user-statuses', auth_2.authenticate, (0, auth_2.requireRole)('admin'), referencesRouter.userStatuses);
app.use('/api/roles', auth_2.authenticate, (0, auth_2.requireRole)('admin'), referencesRouter.roles);
app.use('/api/audit-log', auth_2.authenticate, (0, auth_2.requireRole)('admin'), auditLog_1.default);
// Маршруты расхода личного состава (только commander)
app.use('/api/raskhod', auth_2.authenticate, (0, auth_2.requireRole)('commander'), raskhod_1.default);
// Маршруты тревоги (роли проверяются на уровне каждого маршрута)
app.use('/api/alerts', auth_2.authenticate, alerts_1.default);
// Запуск сервера
async function start() {
    try {
        // Проверяем подключение к БД перед запуском
        await (0, db_1.checkConnection)();
        app.listen(PORT, () => {
            console.log(`Сервер запущен на порту ${PORT}`);
        });
    }
    catch (error) {
        console.error('Ошибка при запуске сервера:', error);
        process.exit(1);
    }
}
start();
exports.default = app;
