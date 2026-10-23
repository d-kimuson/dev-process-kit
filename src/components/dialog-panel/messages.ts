import { defineMessages } from '../../core/i18n';

export const panelMessages = defineMessages({
  en: {
    maximize: 'Maximize',
    restore: 'Restore size',
    controls: 'View controls',
    zoomOut: 'Zoom out',
    fit: 'Fit to view',
    zoomIn: 'Zoom in',
    canvas: 'Canvas. Arrow keys pan, plus and minus zoom, 0 fits the view.',
    resize: 'Resize the panel',
    resizeHint: 'Drag or use the up and down arrows to resize. Double-click restores the height.',
  },
  ja: {
    maximize: '最大化',
    restore: '元のサイズに戻す',
    controls: '表示の操作',
    zoomOut: '縮小',
    fit: '全体を表示',
    zoomIn: '拡大',
    canvas: 'キャンバス。矢印キーでパン、プラス・マイナスでズーム、0で全体表示。',
    resize: 'パネルの高さを変える',
    resizeHint: 'ドラッグ、または上下の矢印キーで高さを変える。ダブルクリックで元の高さに戻す。',
  },
});

export type PanelMessages = ReturnType<typeof panelMessages>;
