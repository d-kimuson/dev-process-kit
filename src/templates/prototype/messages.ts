import { defineMessages } from '../../core/i18n';

export const prototypeMessages = defineMessages({
  en: {
    // -------------------------------------------------------- action titles
    renameActivity: 'Rename Activity',
    updateActivityDescription: 'Update Activity description',
    renameStory: 'Rename UserStory',
    updateStoryDescription: 'Update UserStory description',
    renameStep: 'Rename Step',
    updateStepDescription: 'Update Step description',
    changePreviewKind: 'Change Preview kind',
    changePreviewViewport: 'Change Preview viewport',
    changePreviewLabel: 'Change Preview label',
    moveStory: 'Move UserStory',
    moveStep: 'Move Step',
    deleteTitle: 'Delete',
    reorderTitle: (kind: string) => `Reorder ${kind}`,
    addTitle: (kind: string) => `Add ${kind}`,

    // ------------------------------------------------- action summary bodies
    toFront: '→ To the front',
    afterName: (name: string) => `→ Right after "${name}"`,
    unknownTarget: '(unknown target)',

    // ----------------------------------------------------------- target labels
    activityGroup: 'Activity',
    storyGroup: 'UserStory',
    stepGroup: 'Step',
    previewGroup: 'Preview',
    pageGroup: 'Page',
    targetLabel: (group: string, name: string) => `${group} · ${name}`,
    targetMissing: (group: string, id: string) => `${group} · ${id} (missing)`,

    // ------------------------------------------------------------- sidebar nav
    noActivityBefore: 'There are no Activities yet. Add ',
    noActivityAfter: ' to the base JSON, or ask the agent.',
    deleteStepAria: 'Delete step',
    addStepButton: '+ Step',
    stepNameLabel: 'Step name',
    descriptionLabel: 'Description',
    descriptionPlaceholder: 'What happens in this Step (click to edit)',
    newStepName: 'New step',

    // ----------------------------------------------------------------- stage
    noStepBefore: 'There are no Steps yet. A Prototype has the meaning structure ',
    noStepAfter:
      ' — one Step is one screen / one experience state. Add a Step to the base JSON, and a Preview will appear here.',
    noPreviewMetadata: 'No preview metadata — ask the agent to add it.',
    pageActor: (actor: string) => `Used by ${actor}`,
  },
  ja: {
    renameActivity: 'Activity 名を変更',
    updateActivityDescription: 'Activity の説明を更新',
    renameStory: 'UserStory 名を変更',
    updateStoryDescription: 'UserStory の説明を更新',
    renameStep: 'Step 名を変更',
    updateStepDescription: 'Step の説明を更新',
    changePreviewKind: 'Preview の種別を変更',
    changePreviewViewport: 'Preview のビューポートを変更',
    changePreviewLabel: 'Preview のラベルを変更',
    moveStory: 'UserStory を移動',
    moveStep: 'Step を移動',
    deleteTitle: '削除',
    reorderTitle: (kind: string) => `${kind} の順序を変更`,
    addTitle: (kind: string) => `${kind} を追加`,

    toFront: '→ 先頭へ',
    afterName: (name: string) => `→ "${name}" の直後へ`,
    unknownTarget: '(unknown target)',

    activityGroup: 'Activity',
    storyGroup: 'UserStory',
    stepGroup: 'Step',
    previewGroup: 'Preview',
    pageGroup: 'Page',
    targetLabel: (group: string, name: string) => `${group} · ${name}`,
    targetMissing: (group: string, id: string) => `${group} · ${id} (missing)`,

    noActivityBefore: 'Activity がまだありません。base JSON の ',
    noActivityAfter: ' を追加するか、Agent に依頼してください。',
    deleteStepAria: 'ステップを削除',
    addStepButton: '+ Step',
    stepNameLabel: 'Step 名',
    descriptionLabel: '説明',
    descriptionPlaceholder: 'この Step で何が起きるか（クリックして編集）',
    newStepName: '新しいステップ',

    noStepBefore: 'Step がまだありません。Prototype は ',
    noStepAfter:
      ' の意味構造を持ち、1 Step = 1 画面 / 1 体験状態です。base JSON に Step を追加すると、ここに Preview が現れます。',
    noPreviewMetadata: 'preview metadata がありません — 追加は Agent に依頼してください',
    pageActor: (actor: string) => `利用者: ${actor}`,
  },
});

export type PrototypeMessages = ReturnType<typeof prototypeMessages>;
