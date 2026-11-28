import { defineMessages } from '../i18n';

export const panelMessages = defineMessages({
  en: {
    panel: 'Panel',
    sections: 'Panel sections',
    detail: 'Detail',
    nothingSelected: 'No element is selected',
    tabWithBadge: (label: string, badge: string) => `${label}, ${badge}`,
    tabUnread: (label: string) => `${label}, updated`,
    openPanel: 'Open panel',
    closePanel: 'Close panel',
    togglePanelHint: 'Panel (Ctrl+Alt+B / ⌘⌥B)',
    maximizePanel: 'Maximize panel',
    restorePanel: 'Restore panel',
    expandSheet: 'Expand panel',
    shrinkSheet: 'Shrink panel',
    resizePanel: 'Resize panel',
    resizePanelHint: 'Drag to resize. Double-click to reset',
    commentOnDetail: 'Comment on this element',
    notes: 'Notes',
  },
  ja: {
    panel: 'パネル',
    sections: 'パネルの区画',
    detail: '詳細',
    nothingSelected: '選択されている要素はない',
    tabWithBadge: (label: string, badge: string) => `${label}、${badge}`,
    tabUnread: (label: string) => `${label}、更新あり`,
    openPanel: 'パネルを開く',
    closePanel: 'パネルを閉じる',
    togglePanelHint: 'パネル (Ctrl+Alt+B / ⌘⌥B)',
    maximizePanel: 'パネルを最大化',
    restorePanel: 'パネルを元のサイズに戻す',
    expandSheet: 'パネルを広げる',
    shrinkSheet: 'パネルを縮める',
    resizePanel: 'パネルの幅を変更',
    resizePanelHint: 'ドラッグで幅を変更。ダブルクリックで元に戻す',
    commentOnDetail: 'この要素にコメント',
    notes: 'メモ',
  },
});

export type PanelMessages = ReturnType<typeof panelMessages>;
