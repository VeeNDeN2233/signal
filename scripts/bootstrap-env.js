/**
 * Создаёт корневой .env из env.example со случайными JWT_ACCESS_SECRET / JWT_REFRESH_SECRET.
 * Запуск из корня репозитория: node scripts/bootstrap-env.js
 */
const fs = require('fs')
const crypto = require('crypto')
const path = require('path')

const root = path.join(__dirname, '..')
const envPath = path.join(root, '.env')
const examplePath = path.join(root, 'env.example')

if (fs.existsSync(envPath)) {
  console.log('.env уже существует — не перезаписываем.')
  process.exit(0)
}

if (!fs.existsSync(examplePath)) {
  console.error('Не найден env.example в корне репозитория.')
  process.exit(1)
}

let text = fs.readFileSync(examplePath, 'utf8')
const access = crypto.randomBytes(32).toString('hex')
const refresh = crypto.randomBytes(32).toString('hex')

text = text.replace(/^JWT_ACCESS_SECRET=.*$/m, `JWT_ACCESS_SECRET=${access}`)
text = text.replace(/^JWT_REFRESH_SECRET=.*$/m, `JWT_REFRESH_SECRET=${refresh}`)

fs.writeFileSync(envPath, text, 'utf8')
console.log('Создан файл .env со случайными JWT_ACCESS_SECRET и JWT_REFRESH_SECRET.')
console.log('Дальше: docker compose up --build')
