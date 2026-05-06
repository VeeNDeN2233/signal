import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { LoginPage } from './pages/LoginPage';
import { AdminPage } from './pages/AdminPage';
import { RaskhodPage } from './pages/RaskhodPage';
import { RaskhodHistoryPage } from './pages/RaskhodHistoryPage';
import { AlertsPage } from './pages/AlertsPage';
import { AlertsHistoryPage } from './pages/AlertsHistoryPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { UsersPage } from './pages/admin/UsersPage';
import { EmployeesPage } from './pages/admin/EmployeesPage';
import { RosterPage } from './pages/admin/RosterPage';
import { AuditLogPage } from './pages/admin/AuditLogPage';
import { PositionsPage } from './pages/admin/PositionsPage';
import { RanksPage } from './pages/admin/RanksPage';
import { UnitsPage } from './pages/admin/UnitsPage';
import { UserStatusesPage } from './pages/admin/UserStatusesPage';
export default function App() {
    return (<AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />}/>

          
          <Route path="/admin" element={<PrivateRoute role="admin">
                <AdminPage />
              </PrivateRoute>}>
            <Route index element={<Navigate to="/admin/roster" replace/>}/>
            <Route path="users" element={<UsersPage />}/>
            <Route path="employees" element={<EmployeesPage />}/>
            <Route path="roster" element={<RosterPage />}/>
            <Route path="audit-log" element={<AuditLogPage />}/>
            <Route path="positions" element={<PositionsPage />}/>
            <Route path="ranks" element={<RanksPage />}/>
            <Route path="units" element={<UnitsPage />}/>
            <Route path="user-statuses" element={<UserStatusesPage />}/>
          </Route>

          
          <Route path="/raskhod" element={<PrivateRoute role="commander">
                <RaskhodPage />
              </PrivateRoute>}/>
          <Route path="/raskhod/history" element={<PrivateRoute role="commander">
                <RaskhodHistoryPage />
              </PrivateRoute>}/>
          <Route path="/alerts" element={<PrivateRoute role="commander">
                <AlertsPage />
              </PrivateRoute>}/>
          <Route path="/alerts/history" element={<PrivateRoute role="commander">
                <AlertsHistoryPage />
              </PrivateRoute>}/>

          
          <Route path="/" element={<Navigate to="/login" replace/>}/>
          <Route path="*" element={<NotFoundPage />}/>
        </Routes>
      </BrowserRouter>
    </AuthProvider>);
}
