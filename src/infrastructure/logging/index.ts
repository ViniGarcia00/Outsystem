import { ConsoleLogger, type Logger } from "./logger";

export type { Logger, LogLevel } from "./logger";
export { ConsoleLogger } from "./logger";

/** Logger padrão da aplicação (nível mais verboso fora de produção). */
export const logger: Logger = new ConsoleLogger(
  process.env.NODE_ENV === "production" ? "info" : "debug",
);
