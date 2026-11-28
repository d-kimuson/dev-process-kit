import { defineMessages } from '../i18n';

export const panelMessages = defineMessages({
  en: {
    panel: 'Panel',
    sections: 'Panel sections',
    detail: 'Detail',
    nothingSelected: 'No element is selected',
    tabWithBadge: (label: string, badge: string) => `${label}, ${badge}`,
    tabUnread: (label: string) => `${label}, updated`,
    closePanel: 'Close panel',
    maximizePanel: 'Maximize panel',
    restorePanel: 'Restore panel',
    expandSheet: 'Expand panel',
    shrinkSheet: 'Shrink panel',
    resizePanel: 'Resize panel',
    resizePanelHint: 'Drag to resize. Double-click to reset',
    commentOnDetail: 'Comment on this element',
    backToSection: (label: string) => `Back to ${label}`,
    notes: 'Notes',
    moreSections: 'More sections',
  },
  ja: {
    panel: 'パネル',
    sections: 'パネルの区画',
    detail: '詳細',
    nothingSelected: '選択されている要素はない',
    tabWithBadge: (label: string, badge: string) => `${label}、${badge}`,
    tabUnread: (label: string) => `${label}、更新あり`,
    closePanel: 'パネルを閉じる',
    maximizePanel: 'パネルを最大化',
    restorePanel: 'パネルを元のサイズに戻す',
    expandSheet: 'パネルを広げる',
    shrinkSheet: 'パネルを縮める',
    resizePanel: 'パネルの幅を変更',
    resizePanelHint: 'ドラッグで幅を変更。ダブルクリックで元に戻す',
    commentOnDetail: 'この要素にコメント',
    backToSection: (label: string) => `${label} に戻る`,
    notes: 'メモ',
    moreSections: 'ほかの区画',
  },
});

export type PanelMessages = ReturnType<typeof panelMessages>;
