import { defineMessages } from '../../core/i18n';

export const diagramMessages = defineMessages({
  en: {
    heading: 'Diagram',
    node: 'Node',
    edge: 'Line',
    group: 'Group',
    untitled: 'Untitled',
    nodes: 'Nodes',
    edges: 'Lines',
    invalid: 'This diagram cannot be drawn:',
    missingId: (kind: string) => `A ${kind.toLowerCase()} has no id.`,
    duplicateId: (id: string) => `The id "${id}" is used more than once.`,
    unknownEnd: (id: string, end: string) => `Line "${id}" points at "${end}", which is not a node here.`,
    badValue: (id: string, attribute: string, value: string) =>
      `"${id}" has ${attribute}="${value}", which is not allowed.`,
    missingCell: (id: string) => `Node "${id}" needs col and row in a grid layout.`,
    nestedGroup: (id: string) => `Group "${id}" sits inside another group; groups cannot nest.`,
    sendFailed: 'Could not send. Place this inside a dpk-view-* element.',
  },
  ja: {
    heading: '図',
    node: 'ノード',
    edge: '線',
    group: 'グループ',
    untitled: '無題',
    nodes: 'ノード',
    edges: '線',
    invalid: 'この図は描画できません:',
    missingId: (kind: string) => `id のない${kind}があります。`,
    duplicateId: (id: string) => `id "${id}" が複数回使われています。`,
    unknownEnd: (id: string, end: string) => `線 "${id}" の端 "${end}" はこの図のノードではありません。`,
    badValue: (id: string, attribute: string, value: string) => `"${id}" の ${attribute}="${value}" は使えない値です。`,
    missingCell: (id: string) => `grid レイアウトではノード "${id}" に col と row が必要です。`,
    nestedGroup: (id: string) => `グループ "${id}" が別のグループの中にあります。グループは入れ子にできません。`,
    sendFailed: '送信できませんでした（dpk-view-* 要素の中に置いてください）。',
  },
});

export type DiagramMessages = ReturnType<typeof diagramMessages>;
