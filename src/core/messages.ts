import { defineMessages, type Locale } from './i18n';

/** Each language named in itself, so a reader finds their own whatever the page shows. */
export const LANGUAGE_NAMES: Readonly<Record<Locale, string>> = { en: 'English', ja: '日本語' };

/** Text the core shell renders around every template. */
export const coreMessages = defineMessages({
  en: {
    review: 'Review',
    reviewToggle: 'Review / comments',
    useLightTheme: 'Switch to light theme',
    useDarkTheme: 'Switch to dark theme',
    language: 'Language',
    baseDataError: 'Could not read the base data (showing an empty page)',
    handoffTooLarge: 'The review is too long to send. Copy it and paste it instead',
    handoffConsent: 'Commenting needs your permission. Allow it, then send again',
    handoffForbidden: 'This page cannot send to Claude. Copy the review and paste it instead',
    handoffClaudeUnavailable: 'Could not reach the Claude session. Copy the review and paste it instead',
    handoffRateLimited: 'Too many sends in a row. Wait a moment, then send again',
    handoffStorage: 'Could not save the review. Copy it and paste it instead',
    handoffError: 'Could not send. Copy the review and paste it instead',
    handoffLabel: 'Hand the review to the agent',
    handoffSend: 'Send to Claude',
    handoffSending: 'Sending…',
    handoffSent: 'Sent to Claude ✓',
    handoffCopy: 'Copy changes & comments',
    handoffCopyTitle: 'Copy the review to paste it to the agent',
    handoffCopied: 'Copied ✓',
    handoffCopyFailed: 'Could not copy',
  },
  ja: {
    review: 'レビュー',
    reviewToggle: 'レビュー / コメント',
    useLightTheme: 'ライトテーマにする',
    useDarkTheme: 'ダークテーマにする',
    language: '言語',
    baseDataError: 'base data を読み込めませんでした（空のページとして表示中）',
    handoffTooLarge: 'Review が長すぎて送れません。コピーして渡してください',
    handoffConsent: 'コメントの許可が必要です。許可してからもう一度送ってください',
    handoffForbidden: 'このページからは送れません。コピーして渡してください',
    handoffClaudeUnavailable: 'Claude のセッションに届きませんでした。コピーして渡してください',
    handoffRateLimited: '送信が続いています。少し待ってから送ってください',
    handoffStorage: 'Review を保存できませんでした。コピーして渡してください',
    handoffError: '送れませんでした。コピーして渡してください',
    handoffLabel: 'Review を Agent に渡す',
    handoffSend: 'Claude に送る',
    handoffSending: '送信中…',
    handoffSent: 'Claude に送りました ✓',
    handoffCopy: '変更・コメントをコピー',
    handoffCopyTitle: 'Review をコピーして Agent に貼り付ける',
    handoffCopied: 'コピーしました ✓',
    handoffCopyFailed: 'コピーできませんでした',
  },
});
