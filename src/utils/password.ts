import {
    createHash,
    randomBytes,
    scrypt as scryptCallback,
    timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;

    return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(
    password: string,
    passwordHash: string,
): Promise<boolean> {
    const [salt, storedHash] = passwordHash.split(':');

    if (!salt || !storedHash) {
        return false;
    }

    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    const storedBuffer = Buffer.from(storedHash, 'hex');

    if (storedBuffer.length !== derivedKey.length) {
        return false;
    }

    return timingSafeEqual(storedBuffer, derivedKey);
}

export function generateOpaqueToken(bytes = 32): string {
    return randomBytes(bytes).toString('hex');
}

export function hashOpaqueToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}
