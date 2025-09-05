import winston from 'winston';
import 'winston-daily-rotate-file';

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

const logLevels = {
  levels: {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    http: 4,
    debug: 5,
  },
  colors: {
    fatal: 'red',
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
  },
};

// Custom format for console output
const consoleFormat: winston.Logform.Format = combine(
  timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  errors({ stack: true }),
  colorize({ all: true, colors: logLevels.colors }),
  printf(({ timestamp, level, message, stack, ...meta }) => {
    // Add meta data if present (currently request data from the middleware)
    const metaStr: string = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    // Error stack if present (used for error handling)
    const stackStr: string = stack ? `\n${stack}` : '';

    return `${timestamp} [${level}]: ${message}${stackStr}${metaStr}`;
  }),
);

// Output for log files, no need for coloring
const fileFormat: winston.Logform.Format = combine(
  timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  errors({ stack: true }),
  json(),
);

// Base options for the file transports, used for error and combined logs
const baseFileTransportOptions = {
  dirname: 'logs',
  // Keep for 14 days
  maxFiles: '14d',
  maxSize: '20m',
  // Files will look like `combined-2023-10-05.log`
  datePattern: 'YYYY-MM-DD',
};

const allTransports = [
  new winston.transports.Console({
    format: consoleFormat,
  }),
  new winston.transports.DailyRotateFile({
    ...baseFileTransportOptions,
    filename: 'combined-%DATE%.log',
    level: 'http',
    format: fileFormat,
  }),
  new winston.transports.DailyRotateFile({
    ...baseFileTransportOptions,
    filename: 'errors-%DATE%.log',
    level: 'error',
    format: fileFormat,
  }),
];

/**
 * Returns the transports (console or log files) to use based on the given mode.
 *
 * @param {string | undefined} mode The mode to select transports for. Comes from environment variables and can therefore be undefined.
 * @returns {winston.transport[]} The transports to use.
 */
function getTransports(
  mode: 'development' | 'production' | string | undefined,
): winston.transport[] {
  if (mode === 'development') {
    return allTransports.filter(t => t instanceof winston.transports.Console);
  } else if (mode === 'production') {
    return allTransports.filter(t => t instanceof winston.transports.DailyRotateFile);
  }

  return allTransports;
}

const logger = winston.createLogger({
  levels: logLevels.levels,
  level: process.env.LOG_LEVEL || 'debug',
  transports: getTransports(process.env.NODE_ENV),
}) as winston.Logger & {
  fatal: winston.LeveledLogMethod;
};

export default logger;
