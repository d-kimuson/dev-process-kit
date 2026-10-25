// Extracted from sample/er-long-names.html, <dpk-board-er-diagram id="long-schema">. Do not hand-edit; keep in sync if the sample changes.

export const erLongNamesFixtureBefore = {
  tables: [
    {
      id: 'InternationalCustomerAccountRegistrationHistory',
      name: '海外法人顧客の契約登録と請求先情報を管理する履歴テーブル',
      fields: [
        {
          id: 'GloballyUniqueCustomerAccountRegistrationIdentifier',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: '海外法人顧客の正式名称および請求書送付先の部署名',
          type: 'varchar(128)',
          description: '法人の正式商号を優先し、略称は使わない',
        },
        {
          id: 'CustomerAccountNotificationDeliveryConfiguration',
          type: 'varchar(64)',
          nullable: true,
        },
      ],
      constraints: [
        {
          kind: 'check',
          expression: "海外法人顧客の正式名称および請求書送付先の部署名 <> ''",
        },
        {
          kind: 'unique',
          columns: [
            '海外法人顧客の正式名称および請求書送付先の部署名',
            'CustomerAccountNotificationDeliveryConfiguration',
          ],
        },
      ],
    },
    {
      id: '海外法人顧客契約に関連する月次請求明細管理テーブル',
      name: 'InternationalMonthlyInvoiceLineItemProcessingHistory',
      fields: [
        {
          id: 'InvoiceLineItemProcessingHistoryIdentifier',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: '請求先顧客契約登録履歴を参照するための一意識別子',
          type: 'uuid',
          key: 'FK',
          ref: 'InternationalCustomerAccountRegistrationHistory.GloballyUniqueCustomerAccountRegistrationIdentifier',
        },
        {
          id: 'MonthlyInvoiceNotificationConfigurationReference',
          type: 'text',
          ref: 'InternationalCustomerAccountRegistrationHistory.CustomerAccountNotificationDeliveryConfiguration',
        },
      ],
      constraints: [
        {
          kind: 'exclude',
          using: 'gist',
          elements: ['請求先顧客契約登録履歴を参照するための一意識別子 WITH ='],
        },
      ],
    },
  ],
} as const;

export const erLongNamesFixtureAfter = {
  tables: [
    {
      id: 'InternationalCustomerAccountRegistrationHistory',
      name: '海外法人顧客の契約登録と請求先情報を管理する履歴テーブル',
      fields: [
        {
          id: 'GloballyUniqueCustomerAccountRegistrationIdentifier',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: '海外法人顧客の正式名称および請求書送付先の部署名',
          type: 'varchar(256)',
          description: '法人の正式商号を優先し、略称は使わない',
        },
        {
          id: 'CustomerAccountNotificationDeliveryConfiguration',
          type: 'jsonb',
          nullable: true,
        },
      ],
      constraints: [
        {
          kind: 'check',
          expression: "海外法人顧客の正式名称および請求書送付先の部署名 <> ''",
        },
        {
          kind: 'unique',
          columns: [
            '海外法人顧客の正式名称および請求書送付先の部署名',
            'CustomerAccountNotificationDeliveryConfiguration',
          ],
        },
      ],
    },
    {
      id: '海外法人顧客契約に関連する月次請求明細管理テーブル',
      name: 'InternationalMonthlyInvoiceLineItemProcessingHistory',
      fields: [
        {
          id: 'InvoiceLineItemProcessingHistoryIdentifier',
          type: 'uuid',
          key: 'PK',
        },
        {
          id: '請求先顧客契約登録履歴を参照するための一意識別子',
          type: 'uuid',
          key: 'FK',
          ref: 'InternationalCustomerAccountRegistrationHistory.GloballyUniqueCustomerAccountRegistrationIdentifier',
        },
        {
          id: 'MonthlyInvoiceNotificationConfigurationReference',
          type: 'text',
          ref: 'InternationalCustomerAccountRegistrationHistory.CustomerAccountNotificationDeliveryConfiguration',
        },
      ],
      constraints: [
        {
          kind: 'exclude',
          using: 'gist',
          elements: ['請求先顧客契約登録履歴を参照するための一意識別子 WITH ='],
        },
      ],
    },
  ],
} as const;
