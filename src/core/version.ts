/** Build-time injected by vite/vitest `define`. */
declare const __ARTIFACT_FRAMEWORK_VERSION__: string;

export const FRAMEWORK_VERSION: string =
  typeof __ARTIFACT_FRAMEWORK_VERSION__ === 'string' ? __ARTIFACT_FRAMEWORK_VERSION__ : '0.0.0-dev';
