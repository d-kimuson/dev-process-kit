// Stress data for `dpk-board-architecture-map`, rendered by ../architecture-map.html
// and measured by dev/qa/architecture-map-geometry.ts. Each fixture leans on what
// makes a hand-placed map hard to draw: links across several boundaries, a
// two-way pair, many links leaving one card side, long labels and descriptions,
// and services outside every boundary.

const service = (id, name, x, y, extra = {}) => ({ id, name, position: { x, y }, ...extra });
const link = (from, to, label) => ({ id: `${from}-${to}`, from, to, ...(label === undefined ? {} : { label }) });

export const fixtures = {
  stress: {
    boundaries: [
      { id: 'edge', label: 'Client & Edge' },
      { id: 'api', label: 'API ゲートウェイと認証・認可レイヤー' },
      { id: 'core', label: 'Core domain' },
      { id: 'data', label: 'Data stores' },
      { id: 'external', label: 'External services', kind: 'external' },
    ],
    services: [
      service('web', 'Web ストアフロント', 0, 0, {
        boundary: 'edge',
        description: '購入者がブラウザで使う画面。カート、注文、配送状況の確認までを 1 つの SPA で提供する。',
        tags: ['frontend'],
      }),
      service('mobile', 'Mobile app', 0, 200, { boundary: 'edge', description: 'iOS / Android。', tags: ['frontend'] }),
      service('cdn', 'CDN', 0, 400, { boundary: 'edge', symbol: 'CDN', tags: ['frontend'] }),
      service('gateway', 'API Gateway', 300, 200, {
        boundary: 'api',
        description: '認証、レート制限、ルーティング。',
        tags: ['backend'],
      }),
      service('auth', 'Auth', 300, 400, { boundary: 'api', description: 'トークンの発行と検証。', tags: ['backend'] }),
      service('orders', 'Order service', 600, 0, {
        boundary: 'core',
        description: '注文の受付と状態遷移。冪等性キーで二重注文を防ぐ。',
        tags: ['backend'],
      }),
      service('catalog', 'Catalog', 900, 0, { boundary: 'core', description: '商品と在庫表示。', tags: ['backend'] }),
      service('inventory', 'Inventory reservation and allocation service', 600, 200, {
        boundary: 'core',
        description: 'Reserves stock for an order and releases it when the payment fails or the reservation times out.',
        tags: ['backend'],
      }),
      service('pricing', '価格計算', 900, 200, { boundary: 'core', tags: ['backend'] }),
      service('bus', 'Event bus', 600, 420, {
        description: 'ドメインイベントの配送。',
        symbol: 'EVT',
        tags: ['async'],
      }),
      service('worker', '通知ワーカー', 900, 420, { description: 'イベントを購読して通知を送る。', tags: ['async'] }),
      service('db', 'Orders DB', 600, 640, {
        boundary: 'data',
        symbol: 'DB',
        description: 'PostgreSQL。',
        tags: ['data'],
      }),
      service('cache', 'Cache', 900, 640, {
        boundary: 'data',
        description: 'Redis。セッションと価格。',
        tags: ['data'],
      }),
      service('search', 'Search index', 1200, 640, { boundary: 'data', tags: ['data'] }),
      service('payment', 'Payment provider', 1200, 0, {
        boundary: 'external',
        description: '外部の決済代行。',
        tags: ['external'],
      }),
      service('mail', 'メール配信', 1200, 200, { boundary: 'external', tags: ['external'] }),
      service('sms', 'SMS', 1200, 400, { boundary: 'external', description: '配送通知。', tags: ['external'] }),
      service('admin', '運用バックオフィス', 0, 640, {
        description: '運用担当者が注文を検索し、返金や再送を行う。',
        tags: ['frontend'],
      }),
    ],
    links: [
      link('web', 'gateway', 'HTTPS'),
      link('mobile', 'gateway'),
      link('web', 'cdn', '静的アセット'),
      link('cdn', 'gateway'),
      link('gateway', 'auth', 'トークン検証'),
      link('auth', 'gateway', 'claims'),
      link('gateway', 'orders', 'POST /orders'),
      link('gateway', 'catalog'),
      link('gateway', 'inventory'),
      link('gateway', 'pricing', '見積もり'),
      link('gateway', 'bus'),
      link('orders', 'inventory', '在庫引当'),
      link('orders', 'catalog'),
      link('orders', 'pricing'),
      link('orders', 'payment', '決済要求（3D セキュア付きオーソリ）'),
      link('payment', 'orders', '決済結果 webhook'),
      link('orders', 'bus', 'OrderPlaced'),
      link('bus', 'worker'),
      link('worker', 'mail', '注文確認メール'),
      link('worker', 'sms'),
      link('worker', 'search', 'index 更新'),
      link('orders', 'db'),
      link('inventory', 'db', '引当レコード'),
      link('pricing', 'cache'),
      link('catalog', 'search'),
      link('auth', 'cache', 'セッション'),
      link('admin', 'gateway'),
      link('admin', 'db', '監査ログ参照'),
    ],
  },
};
