import chalk from 'chalk';
type LogLevelLabel = 'debug' | 'info' | 'silent';
type LogLevel = 2 | 1 | 0;
const LOG_LEVEL: Record<LogLevelLabel, LogLevel> = {
  debug: 2,
  info: 1,
  silent: 0,
};

export class Logger {
  private logLevel: LogLevel;
  constructor(logLevelLabel: LogLevelLabel) {
    this.logLevel = LOG_LEVEL[logLevelLabel];
  }
  debug(message: string) {
    if (this.logLevel >= LOG_LEVEL['debug']) {
      // eslint-disable-next-line no-console
      console.log('[debug]' + ' ' + message);
    }
  }
  info(message: string) {
    if (this.logLevel >= LOG_LEVEL['info']) {
      // eslint-disable-next-line no-console
      console.log(chalk.blue('[info]') + ' ' + message);
    }
  }
  error(message: string) {
    // eslint-disable-next-line no-console
    console.error(chalk.red('[error]') + ' ' + message);
  }
}
