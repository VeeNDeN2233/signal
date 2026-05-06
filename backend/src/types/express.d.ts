import 'express';
declare module 'express' {
    interface Request {
        user?: {
            id: number;
            role: string;
            unit_id: number | null;
        };
    }
}
