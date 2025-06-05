import colors from 'colors';

class Logger {
  constructor() {
    this.startTime = Date.now();
  }

  info(message) {
    console.log(colors.blue('ℹ'), message);
  }

  success(message) {
    console.log(colors.green('✅'), message);
  }

  warning(message) {
    console.log(colors.yellow('⚠️'), message);
  }

  error(message) {
    console.log(colors.red('❌'), message);
  }

  debug(message) {
    if (process.env.DEBUG) {
      console.log(colors.gray('🔍'), message);
    }
  }

  progress(current, total, item = '') {
    const percentage = Math.round((current / total) * 100);
    const bar = '█'.repeat(Math.round(percentage / 5)) + '░'.repeat(20 - Math.round(percentage / 5));
    process.stdout.write(`\r${colors.cyan(`[${bar}]`)} ${percentage}% ${item}`);
    if (current === total) {
      console.log(); // New line when complete
    }
  }

  timeElapsed() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    return `${elapsed.toFixed(2)}s`;
  }

  summary(stats) {
    console.log(colors.cyan('\n📊 Generation Summary:'));
    console.log(`Total assets: ${colors.white.bold(stats.total)}`);
    console.log(`iOS icons: ${colors.white.bold(stats.ios || 0)}`);
    console.log(`Android icons: ${colors.white.bold(stats.android || 0)}`);
    console.log(`Web assets: ${colors.white.bold(stats.web || 0)}`);
    console.log(`Time elapsed: ${colors.white.bold(this.timeElapsed())}`);
  }
}

export const logger = new Logger(); 