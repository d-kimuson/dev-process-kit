#!/usr/bin/env node
/**
 * A local sync server to try sharing a draft among browsers.
 *
 * Usage:
 *   pnpm build            # or `pnpm dev:build` to rebuild on change
 *   pnpm demo:sync        # http://localhost:4321 (PORT / HOST to change)
 *
 * It serves the landing samples (`lp/`) with `serveDraftSync` put in front of
 * them, the bundle from `dist/`, and the protocol's server side over HTTP:
 * a pull and a push per draft for `polling`, and a server-sent event stream
 * for a live-channel transport. Drafts live in memory until it stops.
 * Who the reader is comes from a cookie the start page sets, never from the
 * request body. A dev tool: not part of the package.
 */
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as v from 'valibot';

import { DraftHub, type DemoAuthor, type DraftLog } from './hub.ts';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const REPO = join(HERE, '..', '..');
const LP = join(REPO, 'lp');
const DIST = join(REPO, 'dist');
const PORT = Number(process.env['PORT'] ?? 4321);
const HOST = process.env['HOST'] ?? '127.0.0.1';
const USER_COOKIE = 'dpk-demo-user';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.map': 'application/json',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
};

const opSchema = v.variant('kind', [
  v.object({ kind: v.literal('append'), action: v.looseObject({ id: v.pipe(v.string(), v.minLength(1)) }) }),
  v.object({ kind: v.literal('remove'), id: v.string() }),
  v.object({ kind: v.literal('clear'), upTo: v.string() }),
]);
const pushSchema = v.object({ ops: v.array(opSchema), after: v.optional(v.string()) });

const hub = new DraftHub();

/** Open event streams, each with the cursor it last sent. */
type Stream = { readonly log: DraftLog; cursor: string | undefined; readonly response: ServerResponse };
const streams = new Set<Stream>();

const sendStream = (stream: Stream): void => {
  if (stream.cursor === stream.log.cursor) return;
  const update = stream.log.answer(stream.cursor);
  stream.cursor = update.cursor;
  stream.response.write(`id: ${update.cursor}\ndata: ${JSON.stringify(update)}\n\n`);
};

const broadcast = (log: DraftLog): void => {
  for (const stream of streams) if (stream.log === log) sendStream(stream);
};

// --- identity -------------------------------------------------------------

const readUser = (request: IncomingMessage): DemoAuthor | null => {
  const raw = (request.headers.cookie ?? '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${USER_COOKIE}=`))
    ?.slice(USER_COOKIE.length + 1);
  if (raw === undefined) return null;
  const name = decodeURIComponent(raw).trim();
  return name === '' ? null : { id: name.toLowerCase(), name };
};

// --- responses ------------------------------------------------------------

const send = (response: ServerResponse, status: number, body: string, type = 'text/plain; charset=utf-8'): void => {
  response.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  response.end(body);
};
const sendJson = (response: ServerResponse, status: number, body: unknown): void =>
  send(response, status, JSON.stringify(body), 'application/json');
const redirect = (response: ServerResponse, location: string, headers: Record<string, string> = {}): void => {
  response.writeHead(303, { location, ...headers });
  response.end();
};

const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/** A file under `root`, or `null` for a path that leaves it or names nothing. */
const fileUnder = (root: string, path: string): string | null => {
  const file = normalize(join(root, decodeURIComponent(path)));
  if (file !== root && !file.startsWith(root + sep)) return null;
  return existsSync(file) && statSync(file).isFile() ? file : null;
};

const serveFile = (response: ServerResponse, file: string): void => {
  response.writeHead(200, {
    'content-type': MIME[extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(response);
};

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const readBody = (request: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk: string) => (body += chunk));
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });

// --- pages ----------------------------------------------------------------

const samples = (): { file: string; title: string }[] =>
  readdirSync(LP)
    .filter((file) => file.endsWith('.html') && file !== 'index.html')
    .map((file) => {
      const title = /<title>([^<]*)<\/title>/.exec(readFileSync(join(LP, file), 'utf8'))?.[1] ?? file;
      return { file, title: title.replace(/\s*\|\s*dev-process-kit\s*$/, '') };
    })
    .sort((a, b) => a.title.localeCompare(b.title));

const layout = (title: string, body: string): string => `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  body { font: 15px/1.6 system-ui, sans-serif; max-width: 52rem; margin: 2rem auto; padding: 0 1rem; color: #1f2328; }
  h1 { font-size: 1.4rem; } a { color: #0969da; } code { background: #f6f8fa; padding: 0 .3em; border-radius: 4px; }
  ul.samples { columns: 2; padding-left: 1.2rem; } ul.samples li { break-inside: avoid; }
  .muted { color: #59636e; font-size: .9em; } button, input { font: inherit; padding: .3em .7em; }
  table { border-collapse: collapse; width: 100%; font-size: .85em; } td, th { border-bottom: 1px solid #d1d9e0; padding: .2em .5em; text-align: left; vertical-align: top; }
  .op-append { color: #1a7f37; } .op-remove { color: #cf222e; } .op-clear { color: #9a6700; font-weight: 600; }
</style></head><body>${body}</body></html>`;

const loginPage = (next: string): string =>
  layout(
    'dev-process-kit sync demo',
    `<h1>dev-process-kit sync demo</h1>
<p>名前を入れると、その名前でドラフトを共有します。同じ名前は同じ人として扱われます。</p>
<form method="post" action="/login">
  <input type="hidden" name="next" value="${escapeHtml(next)}">
  <input name="name" placeholder="Alice" required autofocus> <button>はじめる</button>
</form>
<p class="muted">別の人として試すには、別のブラウザかシークレットウィンドウを使うか、<code>localhost</code> と <code>127.0.0.1</code> のように別のオリジンで開きます。</p>`,
  );

const indexPage = (user: DemoAuthor): string =>
  layout(
    'dev-process-kit sync demo',
    `<h1>dev-process-kit sync demo</h1>
<p><strong>${escapeHtml(user.name)}</strong> として参加中 · <a href="/logout">別の名前にする</a> · <a href="/log" target="_blank">サーバーのログ</a>
· <button form="reset">全ドラフトを消す</button></p>
<form id="reset" method="post" action="/reset" onsubmit="return confirm('サーバーの全ドラフトを消しますか?')"></form>
<p class="muted">サンプルを開くと、ページ左下にデモ用のバーが出ます。そこから通信方式（polling / SSE）の切り替えと、このタブだけのオフライン化ができます。</p>
<ul class="samples">${samples()
      .map(({ file, title }) => `<li><a href="/${file}">${escapeHtml(title)}</a></li>`)
      .join('')}</ul>`,
  );

const logPage = (): string =>
  layout(
    'sync demo — server log',
    `<h1>サーバーのログ</h1><p class="muted">1 秒ごとに更新します。cursor は <code>&lt;epoch&gt;-&lt;position&gt;</code> です。</p><div id="logs"></div>
<script type="module">
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => '&#' + c.charCodeAt(0) + ';');
  const describe = (op) => op.kind === 'append'
    ? esc(op.action.type) + ' ' + esc(JSON.stringify(op.action.payload ?? {})).slice(0, 160) + ' <span class="muted">' + esc(op.action.id) + '</span>'
    : op.kind === 'remove' ? esc(op.id) : 'upTo ' + esc(op.upTo);
  const render = (state) => {
    document.getElementById('logs').innerHTML = state.logs.length === 0 ? '<p>まだ何もありません。</p>' : state.logs.map((log) =>
      '<h2>' + esc(log.key) + '</h2><p class="muted">cursor ' + esc(log.cursor) + ' · 見えている action ' + log.actions + ' 件</p>' +
      '<table><tr><th>#</th><th>時刻</th><th>誰が</th><th>op</th><th>内容</th></tr>' +
      log.entries.map((e, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(e.at.slice(11, 19)) + '</td><td>' + esc(e.by.name) +
        '</td><td class="op-' + e.op.kind + '">' + e.op.kind + '</td><td>' + describe(e.op) + '</td></tr>').join('') + '</table>').join('');
  };
  const tick = async () => { try { render(await (await fetch('/api/state')).json()); } finally { setTimeout(tick, 1000); } };
  tick();
</script>`,
  );

/** A sample with the demo's host put before its own scripts, so the host listens before the views ask. */
const samplePage = (file: string, user: DemoAuthor): string => {
  const html = readFileSync(file, 'utf8');
  const self = JSON.stringify(user).replace(/</g, '\\u003c');
  const host = `<script type="module">import { startDemoSync } from '/demo/client.js'; startDemoSync(${self});</script>`;
  return html.replace(/<head>/i, `<head>\n    ${host}`);
};

/** The samples' `kit.js`, pointed at this server's `dist/`. */
const KIT_SHIM = `export const loadKit = (entries) => Promise.all(entries.map((entry) => import('/dist/' + entry)));\n`;

// --- the protocol ---------------------------------------------------------

const draftRoute = /^\/api\/drafts\/([^/]+)\/([^/]+)(\/events)?$/;

const handleDraft = async (
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  match: RegExpExecArray,
): Promise<void> => {
  const user = readUser(request);
  if (user === null) return sendJson(response, 401, { error: 'sign in on the start page first' });
  const log = hub.log(decodeURIComponent(match[1] ?? ''), decodeURIComponent(match[2] ?? ''));
  const after = url.searchParams.get('after') ?? undefined;

  if (match[3] !== undefined) {
    // A live channel: every update after the cursor, as it happens. A reconnect resumes from Last-Event-ID.
    const lastId = request.headers['last-event-id'];
    response.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-store',
      connection: 'keep-alive',
    });
    const stream: Stream = { log, cursor: typeof lastId === 'string' ? lastId : after, response };
    streams.add(stream);
    // A snapshot first, unless the reader stands where the log is.
    if (stream.cursor === undefined || stream.cursor !== log.cursor) {
      const update = log.answer(stream.cursor);
      stream.cursor = update.cursor;
      response.write(`id: ${update.cursor}\ndata: ${JSON.stringify(update)}\n\n`);
    }
    const keepAlive = setInterval(() => response.write(': keep-alive\n\n'), 15_000);
    request.on('close', () => {
      clearInterval(keepAlive);
      streams.delete(stream);
    });
    return;
  }

  if (request.method === 'GET') return sendJson(response, 200, log.answer(after));
  if (request.method !== 'POST') return sendJson(response, 405, { error: 'GET or POST' });
  const parsed = v.safeParse(pushSchema, parseJson(await readBody(request)));
  // 422 is for good: the demo's transport turns it into `{ retryable: false }`.
  if (!parsed.success) return sendJson(response, 422, { error: parsed.issues[0]?.message ?? 'bad push' });
  const changed = log.apply(user, parsed.output.ops);
  console.log(`${user.name} → ${match[1]} / ${match[2]}: ${parsed.output.ops.map((op) => op.kind).join(', ')}`);
  if (changed) broadcast(log);
  sendJson(response, 200, log.answer(parsed.output.after));
};

const state = () => ({
  logs: [...hub.logs].map(([key, log]) => ({
    key,
    cursor: log.cursor,
    actions: log.actions.length,
    entries: log.entries,
  })),
});

// --- routing --------------------------------------------------------------

const route = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
  const url = new URL(request.url ?? '/', 'http://demo');
  const path = url.pathname;
  const user = readUser(request);

  const draft = draftRoute.exec(path);
  if (draft !== null) return handleDraft(request, response, url, draft);

  if (path === '/login' && request.method === 'POST') {
    const form = new URLSearchParams(await readBody(request));
    const name = (form.get('name') ?? '').trim().slice(0, 40);
    const next = form.get('next') ?? '/';
    return redirect(response, next.startsWith('/') && !next.startsWith('//') ? next : '/', {
      'set-cookie': `${USER_COOKIE}=${encodeURIComponent(name)}; Path=/; SameSite=Lax; HttpOnly`,
    });
  }
  if (path === '/logout') {
    return redirect(response, '/', { 'set-cookie': `${USER_COOKIE}=; Path=/; Max-Age=0` });
  }
  if (path === '/reset' && request.method === 'POST') {
    hub.reset();
    for (const stream of streams) stream.response.end();
    streams.clear();
    console.log('reset: every draft is gone');
    return redirect(response, '/');
  }
  if (path === '/api/state') return sendJson(response, 200, state());
  if (path === '/log') return send(response, 200, logPage(), MIME['.html']);
  if (path === '/kit.js') return send(response, 200, KIT_SHIM, MIME['.js']);
  if (path === '/demo/client.js') return serveFile(response, join(HERE, 'client.js'));
  if (path.startsWith('/dist/')) {
    const file = fileUnder(DIST, path.slice('/dist/'.length));
    return file === null ? send(response, 404, 'not found — run `pnpm build` first?') : serveFile(response, file);
  }

  if (path === '/') return send(response, 200, user === null ? loginPage('/') : indexPage(user), MIME['.html']);
  const file = fileUnder(LP, path.slice(1));
  if (file === null) return send(response, 404, 'not found');
  if (extname(file) !== '.html') return serveFile(response, file);
  if (user === null) return send(response, 200, loginPage(path), MIME['.html']);
  return send(response, 200, samplePage(file, user), MIME['.html']);
};

if (!existsSync(join(DIST, 'sync.js'))) {
  console.warn('dist/sync.js is missing: run `pnpm build` (or `pnpm dev:build` to rebuild on change).');
}

createServer((request, response) => {
  route(request, response).catch((error: unknown) => {
    console.error(error);
    if (!response.headersSent) sendJson(response, 500, { error: String(error) });
  });
}).listen(PORT, HOST, () => {
  console.log(`sync demo: http://localhost:${PORT}  (another reader: http://127.0.0.1:${PORT} or another browser)`);
  console.log(`server log: http://localhost:${PORT}/log`);
});
