// Extracted from sample/diagrams.html, <dpk-er-diagram id="order-schema">. Do not hand-edit; keep in sync if the sample changes.

export const orderSchemaFixtureBefore = {
  tables: [
    {
      id: 'customers',
      name: '顧客',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'email',
          type: 'varchar',
          key: 'UQ',
        },
      ],
    },
    {
      id: 'orders',
      name: '注文',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'customer_id',
          type: 'uuid',
          key: 'FK',
          ref: 'customers.id',
        },
        {
          id: 'status',
          type: 'varchar',
        },
        {
          id: 'total_amount',
          type: 'integer',
        },
      ],
    },
    {
      id: 'products',
      name: '商品',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'sku',
          type: 'varchar',
          key: 'UQ',
        },
      ],
    },
    {
      id: 'payment_attempts',
      name: '決済試行',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'order_id',
          type: 'uuid',
          key: 'FK',
          ref: 'orders.id',
        },
      ],
    },
  ],
} as const;

export const orderSchemaFixtureAfter = {
  tables: [
    {
      id: 'customers',
      name: '顧客',
      boundedContext: '顧客',
      aggregate: '顧客',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'email',
          type: 'varchar',
          key: 'UQ',
        },
      ],
    },
    {
      id: 'orders',
      name: '注文',
      tags: ['今回の設計'],
      boundedContext: '受注',
      aggregate: '注文',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'customer_id',
          type: 'uuid',
          key: 'FK',
          ref: 'customers.id',
          label: '発注する',
        },
        {
          id: 'status',
          type: 'order_status',
        },
        {
          id: 'total_amount',
          type: 'bigint',
        },
        {
          id: 'currency',
          type: 'char(3)',
          nullable: true,
        },
      ],
    },
    {
      id: 'products',
      name: '商品',
      boundedContext: '商品',
      pattern: 'immutable',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'sku',
          type: 'varchar',
          key: 'UQ',
        },
      ],
    },
    {
      id: 'inventory_reservations',
      name: '在庫予約',
      tags: ['今回の設計'],
      aggregate: '注文',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'order_id',
          type: 'uuid',
          key: 'FK',
          ref: 'orders.id',
          cardinality: '1:1..N',
          label: '確保する',
        },
        {
          id: 'product_id',
          type: 'uuid',
          key: 'FK',
          ref: 'products.id',
        },
        {
          id: 'expires_at',
          type: 'timestamptz',
        },
      ],
    },
    {
      id: 'customer_profiles',
      name: '顧客プロフィール',
      tags: ['今回の設計'],
      aggregate: '顧客',
      pattern: 'cti',
      fields: [
        {
          id: 'customer_id',
          type: 'uuid',
          key: ['PK', 'FK'],
          ref: 'customers.id',
        },
        {
          id: 'display_name',
          type: 'varchar',
        },
        {
          id: 'referrer_id',
          type: 'uuid',
          key: 'FK',
          ref: 'customers.id',
          nullable: true,
        },
      ],
    },
  ],
} as const;
