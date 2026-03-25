import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div style={{ textAlign: 'center', padding: '60px' }}>
      <h1>404</h1>
      <p>Страница не найдена</p>
      <Link to="/login">На страницу входа</Link>
    </div>
  )
}
