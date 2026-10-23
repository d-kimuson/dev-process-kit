// Extracted from sample/er-complex.html, <dpk-er-diagram id="complex-schema">. Do not hand-edit; keep in sync if the sample changes.

export const erComplexFixtureBefore = {
  tables: [
    {
      id: 'legacy_api_tokens',
      name: '旧APIトークン（廃止予定、api_keys に移行）',
      boundedContext: 'Identity',
      aggregate: 'Access',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'user_id',
          type: 'uuid',
          key: 'FK',
          ref: 'users.id',
        },
        {
          id: 'token_hash',
          type: 'varchar(255)',
        },
      ],
    },
    {
      id: 'users',
      name: 'users',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'email',
          type: 'varchar(255)',
          key: 'UQ',
        },
        {
          id: 'name',
          type: 'varchar(80)',
        },
        {
          id: 'manager_id',
          type: 'uuid',
          key: 'FK',
          ref: 'users.id',
          nullable: true,
        },
      ],
    },
    {
      id: 'roles',
      name: 'roles',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'name',
          type: 'varchar(60)',
          key: 'UQ',
        },
      ],
    },
    {
      id: 'user_roles',
      name: 'user_roles',
      fields: [
        {
          id: 'user_id',
          type: 'uuid',
          key: 'FK',
          ref: 'users.id',
        },
        {
          id: 'role_id',
          type: 'uuid',
          key: 'FK',
          ref: 'roles.id',
        },
      ],
    },
    {
      id: 'permissions',
      name: 'permissions',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'role_id',
          type: 'uuid',
          key: 'FK',
          ref: 'roles.id',
        },
        {
          id: 'action',
          type: 'varchar(60)',
        },
      ],
    },
    {
      id: 'profiles',
      name: 'profiles',
      fields: [
        {
          id: 'user_id',
          type: 'uuid',
          key: ['PK', 'FK'],
          ref: 'users.id',
        },
        {
          id: 'display_name',
          type: 'varchar(120)',
        },
        {
          id: 'avatar_url',
          type: 'varchar(255)',
          nullable: true,
        },
      ],
    },
    {
      id: 'addresses',
      name: 'addresses',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'user_id',
          type: 'uuid',
          key: 'FK',
          ref: 'users.id',
        },
        {
          id: 'line1',
          type: 'varchar(160)',
        },
        {
          id: 'city',
          type: 'varchar(80)',
        },
      ],
    },
    {
      id: 'sessions',
      name: 'sessions',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'user_id',
          type: 'uuid',
          key: 'FK',
          ref: 'users.id',
        },
        {
          id: 'expires_at',
          type: 'timestamptz',
        },
      ],
    },
    {
      id: 'api_keys',
      name: 'api_keys',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'user_id',
          type: 'uuid',
          key: 'FK',
          ref: 'users.id',
        },
        {
          id: 'secret_hash',
          type: 'varchar(255)',
        },
      ],
    },
    {
      id: 'categories',
      name: 'categories',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'name',
          type: 'varchar(120)',
        },
        {
          id: 'parent_category_id',
          type: 'uuid',
          key: 'FK',
          ref: 'categories.id',
          nullable: true,
        },
      ],
    },
    {
      id: 'products',
      name: 'products',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'name',
          type: 'varchar(160)',
        },
        {
          id: 'category_id',
          type: 'uuid',
          key: 'FK',
          ref: 'categories.id',
        },
        {
          id: 'parent_product_id',
          type: 'uuid',
          key: 'FK',
          ref: 'products.id',
          nullable: true,
        },
      ],
    },
    {
      id: 'product_variants',
      name: 'product_variants',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'product_id',
          type: 'uuid',
          key: 'FK',
          ref: 'products.id',
        },
        {
          id: 'sku',
          type: 'varchar(60)',
          key: 'UQ',
        },
      ],
    },
    {
      id: 'product_images',
      name: 'product_images',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'product_id',
          type: 'uuid',
          key: 'FK',
          ref: 'products.id',
        },
        {
          id: 'url',
          type: 'varchar(255)',
        },
      ],
    },
    {
      id: 'product_attributes',
      name: 'product_attributes',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'product_id',
          type: 'uuid',
          key: 'FK',
          ref: 'products.id',
        },
        {
          id: 'key',
          type: 'varchar(60)',
        },
        {
          id: 'value',
          type: 'varchar(160)',
        },
      ],
    },
    {
      id: 'warehouses',
      name: 'warehouses',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'name',
          type: 'varchar(120)',
        },
      ],
    },
    {
      id: 'inventory_items',
      name: 'inventory_items',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'variant_id',
          type: 'uuid',
          key: 'FK',
          ref: 'product_variants.id',
        },
        {
          id: 'warehouse_id',
          type: 'uuid',
          key: 'FK',
          ref: 'warehouses.id',
        },
        {
          id: 'quantity',
          type: 'integer',
        },
      ],
    },
    {
      id: 'price_lists',
      name: 'price_lists',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'name',
          type: 'varchar(120)',
        },
      ],
    },
    {
      id: 'prices',
      name: 'prices',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'variant_id',
          type: 'uuid',
          key: 'FK',
          ref: 'product_variants.id',
        },
        {
          id: 'price_list_id',
          type: 'uuid',
          key: 'FK',
          ref: 'price_lists.id',
        },
        {
          id: 'amount',
          type: 'integer',
        },
      ],
    },
    {
      id: 'suppliers',
      name: 'suppliers',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'name',
          type: 'varchar(120)',
        },
      ],
    },
    {
      id: 'carts',
      name: 'carts',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'user_id',
          type: 'uuid',
          key: 'FK',
          ref: 'users.id',
          nullable: true,
        },
        {
          id: 'status',
          type: 'varchar(30)',
        },
      ],
    },
    {
      id: 'cart_items',
      name: 'cart_items',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'cart_id',
          type: 'uuid',
          key: 'FK',
          ref: 'carts.id',
        },
        {
          id: 'variant_id',
          type: 'uuid',
          key: 'FK',
          ref: 'product_variants.id',
        },
        {
          id: 'quantity',
          type: 'integer',
        },
      ],
    },
    {
      id: 'orders',
      name: 'orders',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'user_id',
          type: 'uuid',
          key: 'FK',
          ref: 'users.id',
        },
        {
          id: 'cart_id',
          type: 'uuid',
          key: 'FK',
          ref: 'carts.id',
          nullable: true,
        },
        {
          id: 'parent_order_id',
          type: 'uuid',
          key: 'FK',
          ref: 'orders.id',
          nullable: true,
        },
        {
          id: 'status',
          type: 'varchar(20)',
        },
      ],
    },
    {
      id: 'order_items',
      name: 'order_items',
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
        {
          id: 'variant_id',
          type: 'uuid',
          key: 'FK',
          ref: 'product_variants.id',
        },
        {
          id: 'quantity',
          type: 'integer',
        },
        {
          id: 'unit_price',
          type: 'integer',
        },
      ],
    },
    {
      id: 'order_status_history',
      name: 'order_status_history',
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
        {
          id: 'status',
          type: 'varchar(30)',
        },
        {
          id: 'changed_at',
          type: 'timestamptz',
        },
      ],
    },
    {
      id: 'shipments',
      name: 'shipments',
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
        {
          id: 'warehouse_id',
          type: 'uuid',
          key: 'FK',
          ref: 'warehouses.id',
        },
        {
          id: 'tracking_number',
          type: 'varchar(60)',
          nullable: true,
        },
      ],
    },
    {
      id: 'shipment_items',
      name: 'shipment_items',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'shipment_id',
          type: 'uuid',
          key: 'FK',
          ref: 'shipments.id',
        },
        {
          id: 'order_item_id',
          type: 'uuid',
          key: 'FK',
          ref: 'order_items.id',
        },
      ],
    },
    {
      id: 'returns',
      name: 'returns',
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
        {
          id: 'reason',
          type: 'varchar(160)',
        },
      ],
    },
    {
      id: 'invoices',
      name: 'invoices',
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
        {
          id: 'user_id',
          type: 'uuid',
          key: 'FK',
          ref: 'users.id',
        },
        {
          id: 'status',
          type: 'varchar(30)',
        },
      ],
    },
    {
      id: 'invoice_lines',
      name: 'invoice_lines',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'invoice_id',
          type: 'uuid',
          key: 'FK',
          ref: 'invoices.id',
        },
        {
          id: 'order_item_id',
          type: 'uuid',
          key: 'FK',
          ref: 'order_items.id',
        },
        {
          id: 'amount',
          type: 'integer',
        },
      ],
    },
    {
      id: 'credit_notes',
      name: 'credit_notes',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'invoice_id',
          type: 'uuid',
          key: ['UQ', 'FK'],
          ref: 'invoices.id',
        },
        {
          id: 'amount',
          type: 'integer',
        },
      ],
    },
    {
      id: 'payment_methods',
      name: 'payment_methods',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'user_id',
          type: 'uuid',
          key: 'FK',
          ref: 'users.id',
        },
        {
          id: 'brand',
          type: 'varchar(30)',
        },
        {
          id: 'last_four',
          type: 'varchar(4)',
        },
      ],
    },
    {
      id: 'payments',
      name: 'payments',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'invoice_id',
          type: 'uuid',
          key: 'FK',
          ref: 'invoices.id',
        },
        {
          id: 'payment_method_id',
          type: 'uuid',
          key: 'FK',
          ref: 'payment_methods.id',
        },
        {
          id: 'parent_payment_id',
          type: 'uuid',
          key: 'FK',
          ref: 'payments.id',
          nullable: true,
        },
        {
          id: 'amount',
          type: 'integer',
        },
      ],
    },
    {
      id: 'refunds',
      name: 'refunds',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'payment_id',
          type: 'uuid',
          key: 'FK',
          ref: 'payments.id',
        },
        {
          id: 'amount',
          type: 'integer',
        },
        {
          id: 'reason',
          type: 'varchar(160)',
        },
      ],
    },
    {
      id: 'tax_rates',
      name: 'tax_rates',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'region',
          type: 'varchar(60)',
        },
        {
          id: 'rate',
          type: 'numeric(5,4)',
        },
      ],
    },
    {
      id: 'invoice_taxes',
      name: 'invoice_taxes',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'invoice_id',
          type: 'uuid',
          key: 'FK',
          ref: 'invoices.id',
        },
        {
          id: 'tax_rate_id',
          type: 'uuid',
          key: 'FK',
          ref: 'tax_rates.id',
        },
        {
          id: 'amount',
          type: 'integer',
        },
        {
          id: 'tax_jurisdiction_determination_source',
          type: 'varchar(60)',
          nullable: true,
        },
      ],
    },
  ],
} as const;

export const erComplexFixtureAfter = {
  tables: [
    {
      id: 'users',
      name: 'ユーザーアカウント',
      boundedContext: 'Identity',
      aggregate: 'Account',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'email',
          type: 'varchar(255)',
          key: 'UQ',
          description: 'Unique login email address',
        },
        {
          id: 'name',
          type: 'varchar(120)',
        },
        {
          id: 'manager_id',
          type: 'uuid',
          key: 'FK',
          ref: 'users.id',
          nullable: true,
          description: '直属の上長ユーザー（自己参照、null は役員などトップ）',
        },
        {
          id: 'primary_address_id',
          type: 'uuid',
          key: ['UQ', 'FK'],
          ref: 'addresses.id',
          nullable: true,
          description: 'Default shipping address (optional)',
        },
      ],
    },
    {
      id: 'roles',
      name: 'ロール（RBAC）',
      boundedContext: 'Identity',
      aggregate: 'Account',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'name',
          type: 'varchar(60)',
          key: 'UQ',
          description: '一意なロール名',
        },
      ],
    },
    {
      id: 'user_roles',
      name: 'ユーザーとロールの関連（多対多）',
      boundedContext: 'Identity',
      aggregate: 'Account',
      fields: [
        {
          id: 'user_id',
          type: 'uuid',
          key: 'FK',
          ref: 'users.id',
          description: 'ユーザーへの外部キー',
        },
        {
          id: 'role_id',
          type: 'uuid',
          key: 'FK',
          ref: 'roles.id',
          description: 'ロールへの外部キー',
        },
      ],
      constraints: [
        {
          kind: 'primary-key',
          columns: ['user_id', 'role_id'],
        },
      ],
    },
    {
      id: 'permissions',
      name: 'ロール別の操作権限',
      boundedContext: 'Identity',
      aggregate: 'Account',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'role_id',
          type: 'uuid',
          key: 'FK',
          ref: 'roles.id',
        },
        {
          id: 'action',
          type: 'varchar(60)',
          description: 'Permission action key, e.g. orders:refund',
        },
      ],
    },
    {
      id: 'profiles',
      name: '公開プロフィール',
      boundedContext: 'Identity',
      aggregate: 'Profile',
      fields: [
        {
          id: 'user_id',
          type: 'uuid',
          key: ['PK', 'FK'],
          ref: 'users.id',
          cardinality: '1:1',
        },
        {
          id: 'display_name',
          type: 'varchar(120)',
          description: '表示名（公開プロフィール上の名前）',
        },
        {
          id: 'avatar_url',
          type: 'varchar(255)',
          nullable: true,
          description: 'Public avatar image URL',
        },
      ],
    },
    {
      id: 'addresses',
      name: '配送先住所',
      boundedContext: 'Identity',
      aggregate: 'Profile',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'user_id',
          type: 'uuid',
          key: 'FK',
          ref: 'users.id',
        },
        {
          id: 'line1',
          type: 'varchar(160)',
          description: '番地までの住所',
        },
        {
          id: 'city',
          type: 'varchar(80)',
        },
      ],
    },
    {
      id: 'sessions',
      name: 'ログインセッション',
      boundedContext: 'Identity',
      aggregate: 'Access',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'user_id',
          type: 'uuid',
          key: 'FK',
          ref: 'users.id',
        },
        {
          id: 'expires_at',
          type: 'timestamptz',
        },
      ],
    },
    {
      id: 'api_keys',
      name: 'APIキー',
      boundedContext: 'Identity',
      aggregate: 'Access',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'user_id',
          type: 'uuid',
          key: 'FK',
          ref: 'users.id',
        },
        {
          id: 'secret_hash',
          type: 'varchar(255)',
          description: 'Argon2 hash of the API secret; never stored in plaintext',
        },
      ],
    },
    {
      id: 'categories',
      name: '商品カテゴリ（自己参照の階層）',
      boundedContext: 'Catalog',
      aggregate: 'Taxonomy',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'name',
          type: 'varchar(120)',
        },
        {
          id: 'parent_category_id',
          type: 'uuid',
          key: 'FK',
          ref: 'categories.id',
          nullable: true,
        },
      ],
    },
    {
      id: 'tags',
      name: 'タグ',
      boundedContext: 'Catalog',
      aggregate: 'Taxonomy',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'name',
          type: 'varchar(60)',
          key: 'UQ',
          description: 'Tag label, unique',
        },
      ],
    },
    {
      id: 'product_tags',
      name: '商品とタグの関連（多対多）',
      boundedContext: 'Catalog',
      aggregate: 'Taxonomy',
      fields: [
        {
          id: 'product_id',
          type: 'uuid',
          key: 'FK',
          ref: 'products.id',
        },
        {
          id: 'tag_id',
          type: 'uuid',
          key: 'FK',
          ref: 'tags.id',
        },
      ],
      constraints: [
        {
          kind: 'primary-key',
          columns: ['product_id', 'tag_id'],
        },
      ],
    },
    {
      id: 'products',
      name: '商品',
      boundedContext: 'Catalog',
      aggregate: 'Product',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'name',
          type: 'varchar(160)',
          description: '表示用の商品名',
        },
        {
          id: 'category_id',
          type: 'uuid',
          key: 'FK',
          ref: 'categories.id',
        },
        {
          id: 'parent_product_id',
          type: 'uuid',
          key: 'FK',
          ref: 'products.id',
          nullable: true,
        },
      ],
    },
    {
      id: 'product_variants',
      name: '商品バリエーション（SKU）',
      boundedContext: 'Catalog',
      aggregate: 'Product',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'product_id',
          type: 'uuid',
          key: 'FK',
          ref: 'products.id',
        },
        {
          id: 'sku',
          type: 'varchar(60)',
          key: 'UQ',
          description: 'Stock keeping unit, unique across all variants',
        },
      ],
    },
    {
      id: 'product_images',
      name: '商品画像',
      boundedContext: 'Catalog',
      aggregate: 'Product',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'product_id',
          type: 'uuid',
          key: 'FK',
          ref: 'products.id',
        },
        {
          id: 'url',
          type: 'varchar(255)',
        },
      ],
    },
    {
      id: 'product_attributes',
      name: '商品属性（キー・バリュー）',
      boundedContext: 'Catalog',
      aggregate: 'Product',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'product_id',
          type: 'uuid',
          key: 'FK',
          ref: 'products.id',
        },
        {
          id: 'key',
          type: 'varchar(60)',
        },
        {
          id: 'value',
          type: 'varchar(160)',
        },
      ],
    },
    {
      id: 'warehouses',
      name: '倉庫',
      boundedContext: 'Catalog',
      aggregate: 'Inventory',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'name',
          type: 'varchar(120)',
        },
      ],
    },
    {
      id: 'inventory_items',
      name: '倉庫別の在庫数',
      boundedContext: 'Catalog',
      aggregate: 'Inventory',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'variant_id',
          type: 'uuid',
          key: 'FK',
          ref: 'product_variants.id',
        },
        {
          id: 'warehouse_id',
          type: 'uuid',
          key: 'FK',
          ref: 'warehouses.id',
        },
        {
          id: 'quantity',
          type: 'integer',
          description: '現在庫数（引当前）',
        },
      ],
      constraints: [
        {
          kind: 'unique',
          columns: ['variant_id', 'warehouse_id'],
        },
      ],
    },
    {
      id: 'price_lists',
      name: '価格表',
      boundedContext: 'Catalog',
      aggregate: 'Pricing',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'name',
          type: 'varchar(120)',
        },
      ],
    },
    {
      id: 'prices',
      name: 'バリエーション別の価格',
      boundedContext: 'Catalog',
      aggregate: 'Pricing',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'variant_id',
          type: 'uuid',
          key: 'FK',
          ref: 'product_variants.id',
        },
        {
          id: 'price_list_id',
          type: 'uuid',
          key: 'FK',
          ref: 'price_lists.id',
        },
        {
          id: 'amount',
          type: 'integer',
          description: '価格（最小通貨単位、税抜）',
        },
      ],
      constraints: [
        {
          kind: 'unique',
          columns: ['variant_id', 'price_list_id'],
        },
        {
          kind: 'check',
          expression: 'amount >= 0',
        },
      ],
    },
    {
      id: 'suppliers',
      name: '仕入先',
      boundedContext: 'Catalog',
      aggregate: 'Pricing',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'name',
          type: 'varchar(120)',
        },
      ],
    },
    {
      id: 'carts',
      name: 'カート',
      boundedContext: 'Ordering',
      aggregate: 'Cart',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'user_id',
          type: 'uuid',
          key: 'FK',
          ref: 'users.id',
        },
        {
          id: 'status',
          type: 'varchar(30)',
          description: 'active | ordered | abandoned',
        },
      ],
    },
    {
      id: 'cart_items',
      name: 'カート明細',
      boundedContext: 'Ordering',
      aggregate: 'Cart',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'cart_id',
          type: 'uuid',
          key: 'FK',
          ref: 'carts.id',
        },
        {
          id: 'variant_id',
          type: 'uuid',
          key: 'FK',
          ref: 'product_variants.id',
        },
        {
          id: 'quantity',
          type: 'integer',
        },
      ],
    },
    {
      id: 'orders',
      name: '注文（自己参照で分割注文に対応）',
      boundedContext: 'Ordering',
      aggregate: 'Order',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'user_id',
          type: 'uuid',
          key: 'FK',
          ref: 'users.id',
        },
        {
          id: 'cart_id',
          type: 'uuid',
          key: 'FK',
          ref: 'carts.id',
          nullable: true,
        },
        {
          id: 'parent_order_id',
          type: 'uuid',
          key: 'FK',
          ref: 'orders.id',
          nullable: true,
          cardinality: '0..1:1..N',
          description: '分割元の注文（自己参照、null は分割されていない注文）',
        },
        {
          id: 'status',
          type: 'varchar(30)',
          description: 'pending | paid | fulfilled | cancelled',
        },
      ],
      constraints: [
        {
          kind: 'check',
          expression: "status IN ('pending','paid','fulfilled','cancelled')",
        },
      ],
    },
    {
      id: 'order_items',
      name: '注文明細',
      boundedContext: 'Ordering',
      aggregate: 'Order',
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
        },
        {
          id: 'variant_id',
          type: 'uuid',
          key: 'FK',
          ref: 'product_variants.id',
        },
        {
          id: 'quantity',
          type: 'integer',
        },
        {
          id: 'unit_price',
          type: 'integer',
          description: '発注時点の単価スナップショット（price の変更に追従しない）',
        },
      ],
    },
    {
      id: 'order_status_history',
      name: '注文ステータス履歴',
      boundedContext: 'Ordering',
      aggregate: 'Order',
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
        {
          id: 'status',
          type: 'varchar(30)',
        },
        {
          id: 'changed_at',
          type: 'timestamptz',
        },
      ],
    },
    {
      id: 'shipments',
      name: '出荷',
      boundedContext: 'Ordering',
      aggregate: 'Shipment',
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
        {
          id: 'warehouse_id',
          type: 'varchar(120)',
          description: '出荷時点の倉庫名のスナップショット（履歴のため非正規化、warehouses への参照は廃止）',
        },
        {
          id: 'tracking_number',
          type: 'varchar(60)',
          nullable: true,
        },
      ],
    },
    {
      id: 'shipment_items',
      name: '出荷明細',
      boundedContext: 'Ordering',
      aggregate: 'Shipment',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'shipment_id',
          type: 'uuid',
          key: 'FK',
          ref: 'shipments.id',
        },
        {
          id: 'order_item_id',
          type: 'uuid',
          key: 'FK',
          ref: 'order_items.id',
        },
      ],
      constraints: [
        {
          kind: 'unique',
          columns: ['shipment_id', 'order_item_id'],
        },
      ],
    },
    {
      id: 'returns',
      name: '返品',
      boundedContext: 'Ordering',
      aggregate: 'Return',
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
        {
          id: 'reason',
          type: 'varchar(160)',
        },
      ],
    },
    {
      id: 'pickup_slot_reservations',
      name: '店舗受け取り予約枠（期間の重複を排他制約で防止）',
      boundedContext: 'Ordering',
      aggregate: 'Fulfillment',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'warehouse_id',
          type: 'uuid',
          key: 'FK',
          ref: 'warehouses.id',
        },
        {
          id: 'order_id',
          type: 'uuid',
          key: 'FK',
          ref: 'orders.id',
          nullable: true,
        },
        {
          id: 'starts_at',
          type: 'timestamptz',
          description: '受け取り予約枠の開始時刻',
        },
        {
          id: 'ends_at',
          type: 'timestamptz',
          description: '受け取り予約枠の終了時刻（同一倉庫で重複不可）',
        },
      ],
      constraints: [
        {
          kind: 'exclude',
          using: 'gist',
          elements: ['warehouse_id WITH =', 'tstzrange(starts_at, ends_at) WITH &&'],
        },
      ],
    },
    {
      id: 'dock_reservations',
      name: '搬入搬出バース予約（期間の重複を排他制約で防止）',
      boundedContext: 'Ordering',
      aggregate: 'Fulfillment',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'warehouse_id',
          type: 'uuid',
          key: 'FK',
          ref: 'warehouses.id',
        },
        {
          id: 'shipment_id',
          type: 'uuid',
          key: 'FK',
          ref: 'shipments.id',
          nullable: true,
        },
        {
          id: 'starts_at',
          type: 'timestamptz',
          description: '搬入搬出バースの予約開始時刻',
        },
        {
          id: 'ends_at',
          type: 'timestamptz',
          description: '予約終了時刻（同一倉庫・同一バースで重複不可）',
        },
      ],
      constraints: [
        {
          kind: 'exclude',
          using: 'gist',
          elements: ['warehouse_id WITH =', 'tstzrange(starts_at, ends_at) WITH &&'],
        },
      ],
    },
    {
      id: 'invoices',
      name: '請求書',
      boundedContext: 'Billing',
      aggregate: 'Invoice',
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
        {
          id: 'user_id',
          type: 'uuid',
          key: 'FK',
          ref: 'users.id',
        },
        {
          id: 'status',
          type: 'varchar(30)',
          description: 'draft | issued | paid | void',
        },
      ],
      constraints: [
        {
          kind: 'check',
          expression: "status IN ('draft','issued','paid','void')",
        },
      ],
    },
    {
      id: 'invoice_lines',
      name: '請求明細',
      boundedContext: 'Billing',
      aggregate: 'Invoice',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'invoice_id',
          type: 'uuid',
          key: 'FK',
          ref: 'invoices.id',
        },
        {
          id: 'order_item_id',
          type: 'uuid',
          key: 'FK',
          ref: 'order_items.id',
        },
        {
          id: 'amount',
          type: 'integer',
          description: '明細金額（税抜、最小通貨単位）',
        },
        {
          id: 'tax_rate_id',
          type: 'uuid',
          key: 'FK',
          ref: 'tax_rates.id',
          nullable: true,
          description: '適用する税率（任意、未設定は非課税）',
        },
      ],
      constraints: [
        {
          kind: 'check',
          expression: 'amount >= 0',
        },
      ],
    },
    {
      id: 'credit_notes',
      name: 'クレジットノート（返金的な控除）',
      boundedContext: 'Billing',
      aggregate: 'Invoice',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'invoice_id',
          type: 'uuid',
          key: ['UQ', 'FK'],
          ref: 'invoices.id',
        },
        {
          id: 'amount',
          type: 'integer',
          description: '控除金額（最小通貨単位）',
        },
      ],
    },
    {
      id: 'payment_methods',
      name: '支払い方法',
      boundedContext: 'Billing',
      aggregate: 'Payment',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'user_id',
          type: 'uuid',
          key: 'FK',
          ref: 'users.id',
        },
        {
          id: 'brand',
          type: 'varchar(30)',
          description: 'visa / mastercard / amex など',
        },
      ],
    },
    {
      id: 'payments',
      name: '決済（自己参照で再決済に対応）',
      boundedContext: 'Billing',
      aggregate: 'Payment',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'invoice_id',
          type: 'uuid',
          key: 'FK',
          ref: 'invoices.id',
        },
        {
          id: 'payment_method_id',
          type: 'uuid',
          key: 'FK',
          ref: 'payment_methods.id',
        },
        {
          id: 'parent_payment_id',
          type: 'uuid',
          key: 'FK',
          ref: 'payments.id',
          nullable: true,
          description: '再試行元の決済（自己参照、null は初回の決済）',
        },
        {
          id: 'amount',
          type: 'integer',
          description: '決済金額（最小通貨単位）',
        },
      ],
      constraints: [
        {
          kind: 'check',
          expression: 'amount > 0',
        },
      ],
    },
    {
      id: 'refunds',
      name: '返金',
      boundedContext: 'Billing',
      aggregate: 'Payment',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'payment_id',
          type: 'uuid',
          key: 'FK',
          ref: 'payments.id',
        },
        {
          id: 'amount',
          type: 'integer',
        },
        {
          id: 'reason',
          type: 'varchar(160)',
          description: 'Free-text reason the refund was issued',
        },
      ],
      constraints: [
        {
          kind: 'check',
          expression: 'amount > 0',
        },
      ],
    },
    {
      id: 'tax_rates',
      name: '税率',
      boundedContext: 'Billing',
      aggregate: 'Tax',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'region',
          type: 'varchar(60)',
        },
        {
          id: 'rate',
          type: 'numeric(5,4)',
        },
      ],
    },
    {
      id: 'invoice_taxes',
      name: '請求書別の税額',
      boundedContext: 'Billing',
      aggregate: 'Tax',
      fields: [
        {
          id: 'id',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: 'invoice_id',
          type: 'uuid',
          key: 'FK',
          ref: 'invoices.id',
        },
        {
          id: 'tax_rate_id',
          type: 'uuid',
          key: 'FK',
          ref: 'tax_rates.id',
        },
        {
          id: 'amount',
          type: 'integer',
        },
        {
          id: 'tax_jurisdiction_determination_source',
          type: 'varchar(60)',
          nullable: true,
          description: '税率の適用根拠（法域の判定ソース）',
        },
      ],
    },
  ],
} as const;
