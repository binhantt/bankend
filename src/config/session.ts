import session from 'express-session';
import { Application } from 'express';

export const sessionsever = (app: Application) => {
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: true,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 15,
      httpOnly: true,
      sameSite: 'lax'
    }
  }));
};
