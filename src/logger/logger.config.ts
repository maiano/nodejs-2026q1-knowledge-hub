import { Params } from 'nestjs-pino';
import { join } from 'path';

const isProduction = process.env.NODE_ENV === 'production';
const maxFileSizeKb = parseInt(process.env.LOG_MAX_FILE_SIZE ?? '1024');
const nestToPinoLevel: Record<string, string> = {
  log: 'info',
  debug: 'debug',
  warn: 'warn',
  error: 'error',
  verbose: 'trace',
};
const logLevel = nestToPinoLevel[process.env.LOG_LEVEL ?? 'log'] ?? 'info';

const SENSITIVE_FIELDS = ['password', 'accessToken', 'refreshToken', 'token'];

export const pinoConfig: Params = {
  pinoHttp: {
    level: logLevel,

    serializers: {
      req(req) {
        const body = req.raw?.body ? sanitize(req.raw.body) : undefined;
        return {
          method: req.method,
          url: req.url,
          query: req.query,
          body,
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },

    transport: isProduction
      ? {
          targets: [
            {
              target: 'pino-roll',
              options: {
                file: join(process.cwd(), 'logs', 'app.log'),
                frequency: 'daily',
                size: `${maxFileSizeKb}k`,

                dateFormat: "yyyy-MM-dd'T'HH-mm-ss",
              },
              level: logLevel,
            },
            {
              target: 'pino/file',
              options: { destination: 1 },
              level: logLevel,
            },
          ],
        }
      : {
          targets: [
            {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
              },
              level: logLevel,
            },
            {
              target: 'pino-roll',
              options: {
                file: join(process.cwd(), 'logs', 'app.log'),
                size: `${maxFileSizeKb}k`,
                dateFormat: "yyyy-MM-dd'T'HH-mm-ss",
              },
              level: logLevel,
            },
          ],
        },
  },
};

export function sanitize(obj: Record<string, any>): Record<string, any> {
  if (!obj || typeof obj !== 'object') return obj;

  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      if (SENSITIVE_FIELDS.includes(key)) return [key, '[REDACTED]'];
      if (typeof value === 'object') return [key, sanitize(value)];
      return [key, value];
    }),
  );
}
