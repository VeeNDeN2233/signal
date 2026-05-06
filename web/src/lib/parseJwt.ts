import type { JwtPayload } from '../types/auth';
export function parseJwt(token: string): JwtPayload | null {
    try {
        const base64 = token.split('.')[1];
        const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(json) as JwtPayload;
    }
    catch {
        return null;
    }
}
