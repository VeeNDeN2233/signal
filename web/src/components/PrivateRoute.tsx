import { Navigate } from 'react-router-dom';
import type { Role } from '../types/auth';
import { useAuth } from '../context/AuthContext';
interface PrivateRouteProps {
    children: React.ReactNode;
    role?: Role;
}
export function PrivateRoute({ children, role }: PrivateRouteProps) {
    const { isAuthenticated, role: userRole } = useAuth();
    if (!isAuthenticated) {
        return <Navigate to="/login" replace/>;
    }
    if (role && userRole !== role) {
        return <Navigate to="/login" replace/>;
    }
    return <>{children}</>;
}
