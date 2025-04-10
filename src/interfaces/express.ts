import 'express-session';

declare module 'express-session' {
    interface SessionData {
        captcha?: string;
        userId?: number;
        email?: string;
    }
}