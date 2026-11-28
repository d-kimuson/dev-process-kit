import { defineMessages } from '../../core/i18n';

const JA_EVENT: Record<string, string> = { start: '開始', intermediate: '中間', end: '終了' };
const JA_TRIGGER: Record<string, string> = { none: '', message: 'メッセージ', timer: 'タイマー', error: 'エラー' };
const JA_TASK: Record<string, string> = {
  none: '通常',
  user: 'ユーザー',
  service: 'サービス',
  manual: '手作業',
  send: '送信',
  receive: '受信',
  script: 'スクリプト',
};
const JA_GATEWAY: Record<string, string> = {
  exclusive: '排他',
  parallel: '並列',
  inclusive: '包含',
  eventBased: 'イベントベース',
};
const JA_FLOW: Record<string, string> = {
  sequence: 'シーケンスフロー',
  message: 'メッセージフロー',
  association: '関連',
};

export const bpmnMessages = defineMessages({
  en: {
    heading: 'Business process',
    node: 'Element',
    edge: 'Flow',
    empty: 'No matching elements.',
    eventKind: (event: string, trigger: string) =>
      trigger === 'none' ? `${event} event` : `${trigger} ${event} event`,
    taskKind: (task: string) => (task === 'none' ? 'task' : `${task} task`),
    subprocessKind: () => 'subprocess',
    gatewayKind: (gateway: string) => `${gateway} gateway`,
    dataObjectKind: () => 'data object',
    annotationKind: () => 'annotation',
    flowKind: (kind: string) => `${kind} flow`,
    flowLabel: (kind: string, from: string, to: string, label: string | null) =>
      `${kind} flow from ${from} to ${to}${label === null || label === '' ? '' : `: ${label}`}`,
    poolLabel: (name: string) => `Pool: ${name}`,
    laneLabel: (pool: string, lane: string) => `${pool} / ${lane}`,
  },
  ja: {
    heading: '業務プロセス',
    node: '要素',
    edge: 'フロー',
    empty: '該当する要素はありません。',
    eventKind: (event: string, trigger: string) => {
      const triggerName = JA_TRIGGER[trigger] ?? '';
      return `${triggerName === '' ? '' : `${triggerName} `}${JA_EVENT[event] ?? event}イベント`;
    },
    taskKind: (task: string) => `${JA_TASK[task] ?? task}タスク`,
    subprocessKind: () => 'サブプロセス',
    gatewayKind: (gateway: string) => `${JA_GATEWAY[gateway] ?? gateway}ゲートウェイ`,
    dataObjectKind: () => 'データオブジェクト',
    annotationKind: () => '注釈',
    flowKind: (kind: string) => JA_FLOW[kind] ?? kind,
    flowLabel: (kind: string, from: string, to: string, label: string | null) =>
      `${from} から ${to} への${JA_FLOW[kind] ?? kind}${label === null || label === '' ? '' : `（${label}）`}`,
    poolLabel: (name: string) => `プール: ${name}`,
    laneLabel: (pool: string, lane: string) => `${pool} / ${lane}`,
  },
});

export type BpmnMessages = ReturnType<typeof bpmnMessages>;
