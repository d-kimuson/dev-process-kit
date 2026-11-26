/**
 * State diagram inputs for `chaos/state-diagram.html`, measured by
 * `dev/qa/state-diagram-probe.ts`.
 *
 * `stress`: 15 states without positions (automatic layout) with three self
 * transitions (two on one state), a mutual pair, transitions back to earlier
 * states, a fan-out of five, a fan-in of five and long labels.
 */
const state = (id, name, code, kind) => ({ id, name, code, ...(kind === undefined ? {} : { kind }) });
const move = (id, from, to, title, kind, tags = ['正常系']) => ({
  id,
  from,
  to,
  title,
  tags,
  ...(kind === undefined ? {} : { kind }),
});

export const fixtures = {
  stress: {
    states: [
      state('draft', '下書き', 'draft', 'initial'),
      state('submitted', '申請済み', 'submitted'),
      state('screening', '一次審査中', 'screening'),
      state('info', '追加情報待ち', 'awaiting_information'),
      state('review', '本審査中', 'under_review'),
      state('approved', '承認済み', 'approved'),
      state('contract', '契約手続き中', 'contracting'),
      state('active', '利用中', 'active'),
      state('suspended', '一時停止', 'suspended'),
      state('renewal', 'Renewal negotiation in progress', 'renewal_negotiation'),
      state('rejected', '否認', 'rejected', 'terminal'),
      state('withdrawn', '取り下げ', 'withdrawn', 'terminal'),
      state('refunding', '返金処理中', 'refund_pending', 'compensation'),
      state('closed', '解約済み', 'closed', 'terminal'),
      state('expired', '期限切れ', 'expired', 'terminal'),
    ],
    transitions: [
      move('submit', 'draft', 'submitted', '申請する'),
      move('autosave', 'draft', 'draft', '自動保存'),
      move('accept', 'submitted', 'screening', '受付'),
      move('ask', 'screening', 'info', '不備を照会'),
      move('answer', 'info', 'screening', '回答を受領'),
      move('remind', 'info', 'info', 'リマインド送信'),
      move('escalate', 'screening', 'review', '一次審査を通過'),
      move('approve', 'review', 'approved', '承認'),
      move('send-back', 'review', 'screening', '差し戻し', 'exception', ['例外系']),
      move('sign', 'approved', 'contract', '契約書を送付'),
      move('activate', 'contract', 'active', '締結・利用開始'),
      move('heartbeat', 'active', 'active', '利用状況を記録'),
      move('bill', 'active', 'active', '月次請求'),
      move('suspend', 'active', 'suspended', '支払い遅延を検知', 'exception', ['例外系']),
      move('resume', 'suspended', 'active', '入金を確認'),
      move('renew', 'active', 'renewal', 'Renewal window opens (60 days before the term ends)'),
      move('renewed', 'renewal', 'active', '更新合意'),
      move('reject-1', 'screening', 'rejected', '形式要件を満たさない', 'exception', ['例外系']),
      move('reject-2', 'review', 'rejected', '否決', 'exception', ['例外系']),
      move('withdraw-1', 'submitted', 'withdrawn', '申請者が取り下げ', 'exception', ['例外系']),
      move('withdraw-2', 'info', 'withdrawn', '回答期限を超過したため取り下げ扱い', 'exception', ['例外系']),
      move('withdraw-3', 'approved', 'withdrawn', '辞退', 'exception', ['例外系']),
      move('cancel', 'contract', 'refunding', '契約前キャンセル', 'exception', ['例外系']),
      move('terminate', 'suspended', 'refunding', '強制解約', 'exception', ['例外系']),
      move('refund', 'refunding', 'closed', '返金完了'),
      move('close', 'active', 'closed', '解約'),
      move('lapse', 'renewal', 'expired', '合意に至らず満了', 'exception', ['例外系']),
      move('reapply', 'renewal', 'review', '条件変更のため再審査'),
    ],
  },
};
