import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { PrivateRoute } from './components/PrivateRoute'
import { LoginPage } from './pages/LoginPage'
import { AdminPage } from './pages/AdminPage'
import { RaskhodPage } from './pages/RaskhodPage'
import { RaskhodHistoryPage } from './pages/RaskhodHistoryPage'
import { AlertsPage } from './pages/AlertsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { UsersPage } from './pages/admin/UsersPage'
import { EmployeesPage } from './pages/admin/EmployeesPage'
import { PositionsPage } from './pages/admin/PositionsPage'
import { RanksPage } from './pages/admin/RanksPage'
import { UnitsPage } from './pages/admin/UnitsPage'
import { UserStatusesPage } from './pages/admin/UserStatusesPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <PrivateRoute role="admin">
                <AdminPage />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/admin/users" replace />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="positions" element={<PositionsPage />} />
            <Route path="ranks" element={<RanksPage />} />
            <Route path="units" element={<UnitsPage />} />
            <Route path="user-statuses" element={<UserStatusesPage />} />
          </Route>

          {/* Commander routes */}
          <Route
            path="/raskhod"
            element={
              <PrivateRoute role="commander">
                <RaskhodPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/raskhod/history"
            element={
              <PrivateRoute role="commander">
                <RaskhodHistoryPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <PrivateRoute role="commander">
                <AlertsPage />
              </PrivateRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
