import type { WbColor, WbItemKind, WbShape } from './model';

import { defineMessages } from '../../core/i18n';

const KIND_LABEL_EN: Record<WbItemKind, string> = {
  sticky: 'Sticky note',
  text: 'Text',
  shape: 'Shape',
  frame: 'Frame',
};
const KIND_LABEL_JA: Record<WbItemKind, string> = {
  sticky: '付箋',
  text: 'テキスト',
  shape: '図形',
  frame: 'フレーム',
};

/** The noun an English sentence uses for a kind ("Moved the text box"). */
const KIND_NOUN_EN: Record<WbItemKind, string> = {
  sticky: 'sticky note',
  text: 'text box',
  shape: 'shape',
  frame: 'frame',
};

const SHAPE_LABEL_EN: Record<WbShape, string> = { rect: 'Rectangle', ellipse: 'Ellipse' };
const SHAPE_LABEL_JA: Record<WbShape, string> = { rect: '四角形', ellipse: '楕円' };

const COLOR_LABEL_EN: Record<WbColor, string> = {
  yellow: 'Yellow',
  orange: 'Orange',
  pink: 'Pink',
  purple: 'Purple',
  blue: 'Blue',
  green: 'Green',
  gray: 'Gray',
};
const COLOR_LABEL_JA: Record<WbColor, string> = {
  yellow: '黄',
  orange: 'オレンジ',
  pink: 'ピンク',
  purple: '紫',
  blue: '青',
  green: '緑',
  gray: 'グレー',
};

export const whiteboardMessages = defineMessages({
  en: {
    kindLabel: (kind: WbItemKind) => KIND_LABEL_EN[kind],
    shapeLabel: (shape: WbShape) => SHAPE_LABEL_EN[shape],
    colorLabel: (color: WbColor) => COLOR_LABEL_EN[color],
    connector: 'Connector',
    board: 'Board',
    wholeBoard: 'Whole board',

    // ---------------------------------------------------------- canvas
    canvasLabel: 'Whiteboard canvas',
    emptyHint: 'Double-click anywhere to add a sticky note, or pick something from the toolbar.',
    connectingHint: 'Click the item to connect to. Esc cancels.',
    toolsLabel: 'Add to the board',
    addSticky: 'Sticky note',
    addText: 'Text',
    addRect: 'Rectangle',
    addEllipse: 'Ellipse',
    addFrame: 'Frame',
    newFrameTitle: 'New frame',
    textPlaceholder: 'Type something',

    // ------------------------------------------------- selection toolbar
    selectionLabel: 'Selected item',
    editText: 'Edit text',
    renameFrame: 'Rename frame',
    connect: 'Connect to another item',
    comment: 'Comment',
    delete: 'Delete',
    colorLabelPrefix: 'Color',
    labelField: 'Connector label',
    labelPlaceholder: 'Add a label',
    resizeHandle: 'Resize',
    connectHandle: 'Drag to connect',
    commentCount: (count: number) => `${count} comment${count === 1 ? '' : 's'}`,

    // ------------------------------------------------------------ zoom
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    zoomFit: 'Fit the board',
    zoomReset: 'Reset to 100%',

    // --------------------------------------------------------- sidebar
    framesHeading: 'Frames',
    framesHint: 'Pick a frame to bring it into view.',
    memberCount: (count: number) => `${count} item${count === 1 ? '' : 's'}`,

    // --------------------------------------------------- action titles
    addedTitle: (kind: WbItemKind) => `Added a ${KIND_NOUN_EN[kind]}`,
    textEditedTitle: (kind: WbItemKind) =>
      kind === 'frame' ? 'Renamed the frame' : `Edited the ${KIND_NOUN_EN[kind]}`,
    movedTitle: (kind: WbItemKind) => `Moved the ${KIND_NOUN_EN[kind]}`,
    resizedTitle: (kind: WbItemKind) => `Resized the ${KIND_NOUN_EN[kind]}`,
    recoloredTitle: (kind: WbItemKind) => `Changed the color of the ${KIND_NOUN_EN[kind]}`,
    deletedTitle: (kind: WbItemKind) => `Deleted the ${KIND_NOUN_EN[kind]}`,
    connectedTitle: 'Connected two items',
    relabeledTitle: 'Relabeled the connector',
    disconnectedTitle: 'Removed the connector',

    // ------------------------------------------------- action summaries
    arrowTo: (after: string) => `→ “${after}”`,
    arrowFrom: (before: string, after: string) => `“${before}” → “${after}”`,
    plain: (from: string, to: string) => `${from} → ${to}`,
    added: (text: string) => `+ “${text}”`,
    deleted: (text: string) => `− “${text}”`,
    inFrame: (title: string) => `in frame “${title}”`,
    intoFrame: (title: string) => `into frame “${title}”`,
    outOfFrame: (title: string) => `out of frame “${title}”`,
    betweenFrames: (from: string, to: string) => `frame “${from}” → frame “${to}”`,
    position: (x: number, y: number) => `(${x}, ${y})`,
    size: (w: number, h: number) => `${w}×${h}`,
    connection: (from: string, to: string) => `“${from}” → “${to}”`,
    labeled: (label: string) => `labeled “${label}”`,
    empty: '(empty)',
    noLabel: '(no label)',
  },
  ja: {
    kindLabel: (kind: WbItemKind) => KIND_LABEL_JA[kind],
    shapeLabel: (shape: WbShape) => SHAPE_LABEL_JA[shape],
    colorLabel: (color: WbColor) => COLOR_LABEL_JA[color],
    connector: 'コネクタ',
    board: 'ボード',
    wholeBoard: 'ボード全体',

    canvasLabel: 'ホワイトボード',
    emptyHint: 'ダブルクリックで付箋を置くか、ツールバーから追加します。',
    connectingHint: 'つなぐ先をクリックしてください。Esc で取り消します。',
    toolsLabel: 'ボードに追加',
    addSticky: '付箋',
    addText: 'テキスト',
    addRect: '四角形',
    addEllipse: '楕円',
    addFrame: 'フレーム',
    newFrameTitle: '新しいフレーム',
    textPlaceholder: '入力してください',

    selectionLabel: '選択中の要素',
    editText: 'テキストを編集',
    renameFrame: 'フレーム名を変更',
    connect: '別の要素とつなぐ',
    comment: 'コメント',
    delete: '削除',
    colorLabelPrefix: '色',
    labelField: 'コネクタのラベル',
    labelPlaceholder: 'ラベルを追加',
    resizeHandle: 'サイズを変更',
    connectHandle: 'ドラッグしてつなぐ',
    commentCount: (count: number) => `コメント ${count} 件`,

    zoomIn: '拡大',
    zoomOut: '縮小',
    zoomFit: 'ボード全体を表示',
    zoomReset: '100% に戻す',

    framesHeading: 'フレーム',
    framesHint: 'フレームを選ぶとそこへ移動します。',
    memberCount: (count: number) => `${count} 件`,

    addedTitle: (kind: WbItemKind) => `${KIND_LABEL_JA[kind]}を追加`,
    textEditedTitle: (kind: WbItemKind) =>
      kind === 'frame' ? 'フレーム名を変更' : `${KIND_LABEL_JA[kind]}のテキストを変更`,
    movedTitle: (kind: WbItemKind) => `${KIND_LABEL_JA[kind]}を移動`,
    resizedTitle: (kind: WbItemKind) => `${KIND_LABEL_JA[kind]}のサイズを変更`,
    recoloredTitle: (kind: WbItemKind) => `${KIND_LABEL_JA[kind]}の色を変更`,
    deletedTitle: (kind: WbItemKind) => `${KIND_LABEL_JA[kind]}を削除`,
    connectedTitle: '要素をつないだ',
    relabeledTitle: 'コネクタのラベルを変更',
    disconnectedTitle: 'コネクタを削除',

    arrowTo: (after: string) => `→ 「${after}」`,
    arrowFrom: (before: string, after: string) => `「${before}」→「${after}」`,
    plain: (from: string, to: string) => `${from} → ${to}`,
    added: (text: string) => `+ 「${text}」`,
    deleted: (text: string) => `− 「${text}」`,
    inFrame: (title: string) => `フレーム「${title}」内`,
    intoFrame: (title: string) => `フレーム「${title}」へ`,
    outOfFrame: (title: string) => `フレーム「${title}」の外へ`,
    betweenFrames: (from: string, to: string) => `フレーム「${from}」→「${to}」`,
    position: (x: number, y: number) => `(${x}, ${y})`,
    size: (w: number, h: number) => `${w}×${h}`,
    connection: (from: string, to: string) => `「${from}」→「${to}」`,
    labeled: (label: string) => `ラベル「${label}」`,
    empty: '（空）',
    noLabel: '（ラベルなし）',
  },
});

export type WhiteboardMessages = ReturnType<typeof whiteboardMessages>;
