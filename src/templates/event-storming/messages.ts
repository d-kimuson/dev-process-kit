import type { NoteType } from './model';

import { defineMessages } from '../../core/i18n';

const noteTypeLabelsEn: Record<NoteType, string> = {
  actor: 'Actor',
  command: 'Command',
  aggregate: 'Aggregate',
  event: 'Domain Event',
  policy: 'Policy',
  readmodel: 'Read Model',
  external: 'External System',
  hotspot: 'Hotspot',
};

const noteTypeLabelsJa: Record<NoteType, string> = {
  actor: 'アクター',
  command: 'コマンド',
  aggregate: '集約',
  event: 'イベント',
  policy: 'ポリシー',
  readmodel: 'リードモデル',
  external: '外部システム',
  hotspot: 'ホットスポット',
};

export const eventStormingMessages = defineMessages({
  en: {
    // ---------------------------------------------------------- action log
    renameElementTitle: 'Rename element',
    updateDescriptionTitle: 'Update element description',
    changeTypeTitle: 'Change element type',
    changeContextTitle: 'Change the element’s context',
    moveTitle: 'Change timeline position',
    addElementTitle: 'Add element',
    deleteElementTitle: 'Delete element',
    linkTitle: 'Link elements',
    renameLinkTitle: 'Change link label',
    unlinkTitle: 'Remove link',
    addContextTitle: 'Add bounded context',
    renameContextTitle: 'Rename bounded context',
    deleteContextTitle: 'Delete bounded context',
    renamed: (before: string, after: string) => `"${before}" → "${after}"`,
    noContext: 'No context',
    moveToFront: '→ To the front',
    moveAfter: (after: string) => `→ Right after "${after}"`,

    // ----------------------------------------------------------- targets
    elementLabel: (name: string) => `Element · ${name}`,
    contextLabel: (name: string) => `Bounded context · ${name}`,
    linkLabel: (from: string, to: string) => `Link · ${from}→${to}`,
    linkGroup: 'Link',
    pageLabel: (title: string) => `Page · ${title}`,
    elementGroup: 'Element',
    contextGroup: 'Bounded context',

    // ---------------------------------------------------------- note types
    noteTypeLabel: (type: NoteType) => noteTypeLabelsEn[type],
    addTypeLabel: (type: NoteType) => `+ ${noteTypeLabelsEn[type]}`,
    addHotspot: '+ Hotspot',
    pinHotspotTitle: 'Pin a hotspot on this note',
    deleteNote: 'Delete',
    noteNameLabel: 'Note name',

    // ----------------------------------------------------------- chrome
    newContextTitle: 'New bounded context',
    contextNamePlaceholder: 'Context name',
    cancel: 'Cancel',
    create: 'Create',
    save: 'Save',
    appendMenuNext: 'Note to add next',
    appendMenuAfter: (name: string) => `Continue after “${name}”`,

    emptyTitle: 'No notes yet',
    emptyBody: 'Start Event Storming by placing domain events on the timeline.',
    addFirstEvent: '+ First event',

    portAriaLabel: 'Add what comes next (pick a type, or drag to connect to another slice)',
    portTitle: 'Click: pick a note to continue / Drag: connect to another slice',
    renameContextHint: 'Click to rename',
    dissolveContextAria: (name: string) => `Dissolve bounded context "${name}"`,
    dissolveContextTitle: 'Dissolve the bounded context (notes stay)',

    noteCount: (n: number) => `${n} notes`,
    sliceCount: (n: number) => `${n} slices`,
    contextCount: (n: number) => `${n} bounded contexts`,
    hudHint: 'Wheel: pan · Pinch: zoom · Drag background: select area',

    zoomOut: 'Zoom out',
    zoomReset: 'Reset to 100%',
    zoomIn: 'Zoom in',
    zoomFit: 'Fit to view',

    selectedLinks: (n: number) => `${n} links selected`,
    deleteLinks: 'Delete links',
    deleteHint: 'Delete works too',
    clearSelection: 'Clear selection',
    selectedSlices: (n: number) => `${n} slices selected`,
    groupIntoContext: 'Group into a bounded context',
    addToExistingAria: 'Add to an existing bounded context',
    addToExistingOption: 'Add to existing…',
    removeFromContext: 'Remove from context',
    deleteButton: 'Delete',
  },
  ja: {
    // ---------------------------------------------------------- action log
    renameElementTitle: '要素名を変更',
    updateDescriptionTitle: '要素の説明を更新',
    changeTypeTitle: '要素の種別を変更',
    changeContextTitle: '所属コンテキストを変更',
    moveTitle: 'タイムライン位置を変更',
    addElementTitle: '要素を追加',
    deleteElementTitle: '要素を削除',
    linkTitle: '要素を連結',
    renameLinkTitle: 'リンク名を変更',
    unlinkTitle: 'リンクを削除',
    addContextTitle: 'コンテキストを追加',
    renameContextTitle: 'コンテキスト名を変更',
    deleteContextTitle: 'コンテキストを削除',
    renamed: (before: string, after: string) => `"${before}" → "${after}"`,
    noContext: '未所属',
    moveToFront: '→ 先頭へ',
    moveAfter: (after: string) => `→ "${after}" の直後へ`,

    // ----------------------------------------------------------- targets
    elementLabel: (name: string) => `要素 · ${name}`,
    contextLabel: (name: string) => `コンテキスト · ${name}`,
    linkLabel: (from: string, to: string) => `リンク · ${from}→${to}`,
    linkGroup: 'リンク',
    pageLabel: (title: string) => `ページ · ${title}`,
    elementGroup: '要素',
    contextGroup: 'コンテキスト',

    // ---------------------------------------------------------- note types
    noteTypeLabel: (type: NoteType) => noteTypeLabelsJa[type],
    addTypeLabel: (type: NoteType) => `+ ${noteTypeLabelsJa[type]}`,
    addHotspot: '+ ホットスポット',
    pinHotspotTitle: 'この付箋にホットスポットを立てる',
    deleteNote: '削除',
    noteNameLabel: '付箋名',

    // ----------------------------------------------------------- chrome
    newContextTitle: '新しい境界づけられたコンテキスト',
    contextNamePlaceholder: 'コンテキスト名',
    cancel: 'キャンセル',
    create: '作成',
    save: '保存',
    appendMenuNext: '続きに追加する付箋',
    appendMenuAfter: (name: string) => `「${name}」の続きに追加`,

    emptyTitle: '付箋がまだありません',
    emptyBody: 'イベントストーミングを開始しましょう。ドメインイベントを時系列に貼るところから始めます。',
    addFirstEvent: '+ 最初のイベント',

    portAriaLabel: '続きを追加（種類を選んで追加 / ドラッグで他のスライスへ接続）',
    portTitle: 'クリック: 続きの付箋を選んで追加 / ドラッグ: 他のスライスへ接続',
    renameContextHint: 'クリックして名前を変更',
    dissolveContextAria: (name: string) => `コンテキスト「${name}」を解体`,
    dissolveContextTitle: 'コンテキストを解体（付箋は残ります）',

    noteCount: (n: number) => `${n} 付箋`,
    sliceCount: (n: number) => `${n} スライス`,
    contextCount: (n: number) => `${n} コンテキスト`,
    hudHint: 'ホイール: 移動 · ピンチ: ズーム · 背景ドラッグ: 範囲選択',

    zoomOut: '縮小',
    zoomReset: '100% に戻す',
    zoomIn: '拡大',
    zoomFit: '全体を表示',

    selectedLinks: (n: number) => `${n} 本のリンクを選択中`,
    deleteLinks: 'リンクを削除',
    deleteHint: 'Delete でも削除できます',
    clearSelection: '選択解除',
    selectedSlices: (n: number) => `${n} スライスを選択中`,
    groupIntoContext: 'コンテキストにまとめる',
    addToExistingAria: '既存コンテキストへ追加',
    addToExistingOption: '既存へ追加…',
    removeFromContext: 'コンテキスト解除',
    deleteButton: '削除',
  },
});

export type EventStormingMessages = ReturnType<typeof eventStormingMessages>;
