import { describe, expect, it } from 'vitest';

import { usmMessages } from './messages';
import { parseUsmBase, type UserStory } from './model';
import { storyIdTitle, storyInfoMarkdown } from './story-copy';

const m = usmMessages('en');

// story-9 ← story-12 ← story-15, with every kind of metadata story-12 can carry.
const raw = {
  features: ['estimates', 'assignees'],
  activities: [{ id: 'account', name: '認証', steps: [{ id: 'login', name: 'ログイン' }] }],
  milestones: [{ id: 'v1', name: 'v1.0' }],
  statuses: [
    { id: 'todo', name: 'Todo' },
    { id: 'doing', name: '進行中' },
    { id: 'done', name: 'Done' },
  ],
  labels: [
    { id: 'frontend', name: 'frontend' },
    { id: 'auth', name: 'auth' },
  ],
  members: [{ id: 'kaito', name: 'Kaito' }],
  estimates: [{ id: 'm', name: 'M', points: 3 }],
  stories: [
    { id: 's9', number: 9, name: '登録できる', activityId: 'account', stepId: 'login' },
    {
      id: 's12',
      number: 12,
      name: 'ログインできる',
      activityId: 'account',
      stepId: 'login',
      milestoneId: 'v1',
      statusId: 'doing',
      labelIds: ['frontend', 'auth'],
      estimateId: 'm',
      assigneeId: 'kaito',
      blockedBy: ['s9'],
      description: 'メールでログインする。\n\n二要素認証は v2 で。',
      links: [{ url: 'https://design.example.com/login', label: 'Design' }],
    },
    { id: 's15', number: 15, name: 'パスワードを直せる', activityId: 'account', stepId: 'login', blockedBy: ['s12'] },
  ],
};

const state = parseUsmBase(raw);
const story = (id: string): UserStory => {
  const found = state.stories.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`no story ${id}`);
  return found;
};

describe('storyIdTitle', () => {
  it('names a story the way people do: its key and its title', () => {
    expect(storyIdTitle(story('s12'))).toBe('STORY-12 ログインできる');
  });
});

describe('storyInfoMarkdown', () => {
  it('writes the card as Markdown: key and title, every piece of metadata, then the description', () => {
    expect(storyInfoMarkdown(m, state, story('s12'))).toBe(
      [
        '### STORY-12 ログインできる',
        '',
        '- Status: 進行中',
        '- Step: 認証 › ログイン (v1.0)',
        '- Estimate: M (3)',
        '- Assignee: Kaito',
        '- Labels: frontend, auth',
        '- Blocks: STORY-15',
        '- Waits on: STORY-9',
        '- Links: [Design](https://design.example.com/login)',
        '',
        'メールでログインする。',
        '',
        '二要素認証は v2 で。',
        '',
      ].join('\n'),
    );
  });

  it('leaves out the fields a story has no value for', () => {
    const bare = parseUsmBase({
      activities: [{ id: 'a', name: 'A', steps: [{ id: 's', name: 'S' }] }],
      stories: [{ id: 'u', name: 'U', activityId: 'a', stepId: 's' }],
    });
    expect(storyInfoMarkdown(m, bare, bare.stories[0]!)).toBe('### STORY-1 U\n\n- Step: A › S\n');
  });

  it('leaves out the milestone a story has none of and links a URL with no label as itself', () => {
    const loose = parseUsmBase({
      activities: [{ id: 'a', name: 'A', steps: [{ id: 's', name: 'S' }] }],
      stories: [
        {
          id: 'u',
          name: 'U',
          activityId: 'a',
          stepId: 's',
          links: [{ url: 'https://example.com/spec' }],
        },
      ],
    });
    expect(storyInfoMarkdown(m, loose, loose.stories[0]!)).toBe(
      ['### STORY-1 U', '', '- Step: A › S', '- Links: [https://example.com/spec](https://example.com/spec)', ''].join(
        '\n',
      ),
    );
  });

  it('ends with a single newline and leaves no trailing whitespace behind', () => {
    const messy = parseUsmBase({
      activities: [{ id: 'a', name: 'A', steps: [{ id: 's', name: 'S' }] }],
      stories: [{ id: 'u', name: 'U', activityId: 'a', stepId: 's', description: 'line one   \nline two\n\n\n' }],
    });
    const markdown = storyInfoMarkdown(m, messy, messy.stories[0]!);
    expect(markdown).toBe('### STORY-1 U\n\n- Step: A › S\n\nline one\nline two\n');
    expect(markdown).not.toMatch(/[ \t]$/m);
  });

  it('names the fields in the reader’s language', () => {
    const ja = usmMessages('ja');
    expect(storyInfoMarkdown(ja, state, story('s12'))).toBe(
      [
        '### STORY-12 ログインできる',
        '',
        '- ステータス: 進行中',
        '- ステップ: 認証 › ログイン (v1.0)',
        '- 見積もり: M (3)',
        '- 担当者: Kaito',
        '- ラベル: frontend, auth',
        '- ブロック: STORY-15',
        '- 依存先: STORY-9',
        '- リンク: [Design](https://design.example.com/login)',
        '',
        'メールでログインする。',
        '',
        '二要素認証は v2 で。',
        '',
      ].join('\n'),
    );
  });
});
