import type { UserRole } from '../generated/prisma/enums.ts';

export type AuthUser = {
    id: string;
    role: UserRole;
};

declare module 'express' {
    interface Request {
        authUser?: AuthUser;
    }
}
