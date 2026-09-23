/** Build-time injected by vite/vitest `define`. */
declare const __DPK_VERSION__: string;

export const FRAMEWORK_VERSION: string = typeof __DPK_VERSION__ === 'string' ? __DPK_VERSION__ : '0.0.0-dev';
