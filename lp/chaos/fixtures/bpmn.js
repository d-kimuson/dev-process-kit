/**
 * BPMN inputs for `chaos/bpmn.html`, measured by `dev/qa/bpmn-probe.ts`.
 *
 * `stress`: three pools, five lanes, 30 nodes. It carries a parallel split and
 * join, two backward sequence flows (a review loop and a replenishment loop),
 * a message between non-adjacent pools (warehouse to customer, across the
 * sales pool), long labels, every task/gateway kind and artifacts in each
 * lane.
 */
const task = (id, lane, name, kind = 'none', extra = {}) => ({ id, kind: 'task', task: kind, lane, name, ...extra });
const gateway = (id, lane, name, kind = 'exclusive') => ({ id, kind: 'gateway', gateway: kind, lane, name });
const event = (id, lane, type, trigger = 'none', name) => ({
  id,
  kind: 'event',
  event: type,
  trigger,
  lane,
  ...(name === undefined ? {} : { name }),
});
const annotation = (id, lane, text) => ({ id, kind: 'annotation', lane, text });
const dataObject = (id, lane, name) => ({ id, kind: 'dataObject', lane, name });
const sequence = (id, from, to, extra = {}) => ({ id, from, to, ...extra });
const message = (id, from, to, name) => ({ id, kind: 'message', from, to, name });
const association = (id, from, to) => ({ id, kind: 'association', from, to });

const stress = {
  pools: [
    { id: 'customer', name: '顧客' },
    {
      id: 'sales',
      name: '販売管理',
      lanes: [
        { id: 's-order', name: '受注' },
        { id: 's-credit', name: '与信' },
      ],
    },
    {
      id: 'logistics',
      name: '物流',
      lanes: [
        { id: 'l-stock', name: '在庫' },
        { id: 'l-ship', name: '出荷' },
      ],
    },
  ],
  nodes: [
    event('s-start', 's-order', 'start', 'message', '注文を受信'),
    task('review', 's-order', '注文内容を確認', 'user'),
    task('clarify', 's-order', '不足情報を照会', 'manual'),
    task('change', 's-order', '注文内容の変更を反映し、再見積もりを行う', 'user'),
    task('confirm', 's-order', '注文を確定して顧客と倉庫へ連絡する', 'send'),
    task('decline', 's-order', '与信結果を理由に注文をお断りする', 'send'),
    event('s-done', 's-order', 'end', 'none', '受注確定'),
    event('cancelled', 's-order', 'end', 'none', '受注取消'),
    annotation('order-note', 's-order', '与信結果は通常 1 分以内に返る。'),
    dataObject('order-data', 's-order', '注文データ'),
    task('credit-check', 's-credit', '与信を照会', 'service'),
    task('credit-retry', 's-credit', '与信照会を再試行する（最大 3 回、指数バックオフ）', 'service'),
    gateway('credit-gw', 's-credit', '与信OK?'),
    annotation('credit-note', 's-credit', '与信枠を超える場合は分割払いを提案する。'),
    dataObject('credit-data', 's-credit', '与信結果'),
    event('l-start', 'l-ship', 'start', 'message', '出荷依頼を受信'),
    task('reserve', 'l-stock', '在庫を引き当て', 'service'),
    gateway('stock-gw', 'l-stock', '在庫あり?'),
    task('shortage', 'l-stock', '欠品を検知して補充を依頼する', 'manual'),
    task('replenish', 'l-stock', '入荷を登録', 'service'),
    annotation('stock-note', 'l-stock', '在庫は 5 分ごとに同期。引当は 15 分で解放される。'),
    dataObject('stock-data', 'l-stock', '在庫スナップショット'),
    task('pick', 'l-ship', '商品をピッキング', 'user'),
    gateway('pack-split', 'l-ship', '梱包と送り状を並行', 'parallel'),
    task('pack', 'l-ship', '梱包する', 'manual'),
    task('label', 'l-ship', '送り状を発行', 'service'),
    gateway('pack-join', 'l-ship', '梱包完了', 'parallel'),
    task('ship', 'l-ship', '出荷する', 'service'),
    event('l-done', 'l-ship', 'end', 'none', '出荷完了'),
    annotation('ship-note', 'l-ship', '割れ物は緩衝材を追加する。'),
  ],
  flows: [
    message('m-order', 'customer', 's-start', '注文'),
    message('m-confirm', 'confirm', 'customer', '注文確認'),
    message('m-handover', 'confirm', 'l-start', '出荷依頼'),
    message('m-shortage', 'shortage', 'customer', '欠品連絡'),
    sequence('f-start', 's-start', 'review'),
    sequence('f-clarify', 'review', 'clarify'),
    sequence('f-change', 'clarify', 'change'),
    sequence('f-back', 'change', 'review', { name: '顧客の回答が届いた' }),
    sequence('f-credit', 'review', 'credit-check'),
    sequence('f-retry', 'credit-check', 'credit-retry'),
    sequence('f-decision', 'credit-retry', 'credit-gw'),
    sequence('f-confirm', 'credit-gw', 'confirm', { condition: '与信OK：与信枠に余裕がある' }),
    sequence('f-decline', 'credit-gw', 'decline', { default: true, name: '与信NG：枠不足または延滞あり' }),
    sequence('f-done', 'confirm', 's-done'),
    sequence('f-cancelled', 'decline', 'cancelled'),
    sequence('f-request', 'l-start', 'reserve'),
    sequence('f-stock', 'reserve', 'stock-gw'),
    sequence('f-pick', 'stock-gw', 'pick', { condition: '在庫あり' }),
    sequence('f-shortage', 'stock-gw', 'shortage', { default: true, name: '在庫なし：入荷待ち' }),
    sequence('f-replenish', 'shortage', 'replenish'),
    sequence('f-replenished', 'replenish', 'reserve', { name: '入荷後に再引当' }),
    sequence('f-pack', 'pick', 'pack-split'),
    sequence('f-packing', 'pack-split', 'pack'),
    sequence('f-label', 'pack-split', 'label'),
    sequence('f-packed', 'pack', 'pack-join'),
    sequence('f-labelled', 'label', 'pack-join'),
    sequence('f-ship', 'pack-join', 'ship'),
    sequence('f-shipped', 'ship', 'l-done'),
    association('a-order', 'order-data', 'review'),
    association('a-credit', 'credit-note', 'credit-check'),
    association('a-credit-data', 'credit-data', 'credit-gw'),
    association('a-stock', 'stock-note', 'reserve'),
    association('a-stock-data', 'stock-data', 'stock-gw'),
    association('a-ship', 'ship-note', 'pack'),
  ],
};

const fixtures = {
  stress: {
    description:
      'Three pools, five lanes and 30 nodes: a parallel split/join, two backward flows, a message between non-adjacent pools, long labels and every node kind.',
    lang: 'ja',
    attributes: { style: '--diagram-height: 1140px' },
    base: stress,
  },
};

export default fixtures;
