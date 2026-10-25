import { defineMessages } from '../../core/i18n';

export const lineChartMessages = defineMessages({
  en: {
    aria: 'Line chart',
    empty: 'No data to plot',
    invalid: (error: string) => `Invalid chart data: ${error}`,
  },
  ja: {
    aria: '折れ線グラフ',
    empty: '表示するデータがありません',
    invalid: (error: string) => `グラフのデータが不正です: ${error}`,
  },
});

export type LineChartMessages = ReturnType<typeof lineChartMessages>;
