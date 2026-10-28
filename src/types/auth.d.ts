import 'next-auth';
declare module 'next-auth' {
  interface Session {
    emailVerifiedAt?: number;
    sessionVersion?: number;
  }
}
