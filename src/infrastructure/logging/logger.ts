/**
 * Abstração de logging da aplicação.
 *
 * Depender da interface `Logger` (e não de `console`) permite trocar a
 * implementação futuramente (arquivo em LOG_PATH, serviço externo, etc.)
 * sem alterar os consumidores — Dependency Inversion (SOLID).
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/**
 * Implementação padrão baseada em `console`, com nível mínimo configurável.
 * Em produção, o nível padrão é `info`; em desenvolvimento, `debug`.
 */
export class ConsoleLogger implements Logger {
  constructor(private readonly minLevel: LogLevel = "debug") {}

  private write(level: LogLevel, message: string, meta?: unknown): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.minLevel]) {
      return;
    }
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    const sink = console[level === "debug" ? "log" : level];
    if (meta !== undefined) {
      sink(line, meta);
    } else {
      sink(line);
    }
  }

  debug(message: string, meta?: unknown): void {
    this.write("debug", message, meta);
  }
  info(message: string, meta?: unknown): void {
    this.write("info", message, meta);
  }
  warn(message: string, meta?: unknown): void {
    this.write("warn", message, meta);
  }
  error(message: string, meta?: unknown): void {
    this.write("error", message, meta);
  }
}
