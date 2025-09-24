/**
 * BFF層がCore層と連携するためのインターフェース定義
 * Core層の統一インターフェースを再エクスポート
 */

import type {
  HealthServiceInterface,
  LoggerInterface as CoreLoggerInterface,
} from '@template/core';

// Core層のインターフェースを再エクスポート
export type {
  HealthServiceInterface,
  LoggerInterface as CoreLoggerInterface,
} from '@template/core';

/**
 * Core層のヘルスチェックサービスインターフェース
 * @deprecated 統一インターフェースHealthServiceInterfaceを使用してください
 */
export interface CoreHealthServiceInterface extends HealthServiceInterface {}

/**
 * ロガーインターフェース
 * Core層の統一インターフェースを使用
 */
export interface LoggerInterface extends CoreLoggerInterface {}
