export interface User {
    id: string;
    username: string;
    email: string;
    passwordHash: string;
    role: 'USER' | 'ADMIN';
    isActive: boolean;
}
