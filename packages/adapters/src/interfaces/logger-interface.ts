/**
 * ロガーインターフェース
 */

export interface LogContext {
  traceId?: string;
  userId?: string;
  requestId?: string;
  [key: string]: unknown;
}

export interface LoggerInterface {
  trace(obj: LogContext | string, msg?: string): void;
  debug(obj: LogContext | string, msg?: string): void;
  info(obj: LogContext | string, msg?: string): void;
  warn(obj: LogContext | string, msg?: string): void;
  error(obj: LogContext | string, msg?: string): void;
  fatal(obj: LogContext | string, msg?: string): void;

  child(bindings: LogContext): LoggerInterface;
  withTraceId(traceId: string): LoggerInterface;
}
