import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
export function validPassword(password: string) {
  return password.length >= 12 && password.length <= 128;
}
export async function hashPassword(password: string) {
  if (!validPassword(password)) throw new Error('Use 12–128 characters.');
  const salt = randomBytes(32).toString('hex');
  const hash = await derive(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${hash.toString('hex')}`;
}
export async function verifyPassword(password: string, stored: string) {
  if (!validPassword(password)) return false;
  const [algorithm, salt, hash] = stored.split(':');
  if (algorithm !== 'scrypt' || !/^[a-f0-9]{64}$/.test(salt ?? '') || !/^[a-f0-9]{128}$/.test(hash ?? '')) return false;
  const actual = await derive(password, salt, 64) as Buffer;
  return timingSafeEqual(actual, Buffer.from(hash, 'hex'));
}
