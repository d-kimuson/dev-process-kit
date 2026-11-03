/**
 * The demo's host for a sample page: `serveDraftSync` over this server, with
 * either the bundled `polling` or a live channel (server-sent events), and a
 * small bar to switch between them and to take this tab offline.
 *
 * `server.ts` puts `startDemoSync(<reader>)` at the top of every sample, so the
 * host listens before the sample's views ask for one.
 */
import { polling, serveDraftSync } from '/dist/sync.js';

const OFFLINE_KEY = 'dpk-sync-demo:offline';
const TRANSPORT_KEY = 'dpk-sync-demo:transport';

/** This tab's pretend network: offline, every request fails before it leaves. */
const createNetwork = () => {
  const listeners = new Set();
  let offline = sessionStorage.getItem(OFFLINE_KEY) === '1';
  return {
    get offline() {
      return offline;
    },
    set(next) {
      offline = next;
      sessionStorage.setItem(OFFLINE_KEY, next ? '1' : '0');
      for (const listener of listeners) listener();
      // `serveDraftSync` retries at once when the browser says it is back.
      if (!next) window.dispatchEvent(new Event('online'));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

const draftUrl = ({ storageKey, template }) =>
  `/api/drafts/${encodeURIComponent(storageKey)}/${encodeURIComponent(template)}`;

/** A 4xx the server will never take, as `serveDraftSync` reads it; anything else is retried. */
const request = async (net, url, init) => {
  if (net.offline) throw new Error('offline (demo)');
  const response = await fetch(url, init);
  if (response.ok) return response.json();
  const body = await response.json().catch(() => ({}));
  const reason = body.error ?? `HTTP ${response.status}`;
  if (response.status >= 400 && response.status < 500) throw { retryable: false, reason };
  throw new Error(reason);
};

const pushInit = (ops, cursor) => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(cursor === undefined ? { ops } : { ops, after: cursor }),
});

const pollingTransport = (net, url) =>
  polling({
    intervalMs: 1500,
    pull: (cursor) => request(net, cursor === undefined ? url : `${url}?after=${encodeURIComponent(cursor)}`),
    push: (ops, cursor) => request(net, url, pushInit(ops, cursor)),
  });

/**
 * A live channel: updates come over an `EventSource`, so a push answers
 * nothing. Offline closes the stream; back online, it resumes from the last
 * cursor it received.
 */
const sseTransport = (net, url) => ({
  listen(_cursor, onUpdate, onError) {
    let cursor;
    let source = null;
    const open = () => {
      if (source !== null || net.offline) return;
      source = new EventSource(
        cursor === undefined ? `${url}/events` : `${url}/events?after=${encodeURIComponent(cursor)}`,
      );
      source.onmessage = (event) => {
        const update = JSON.parse(event.data);
        cursor = update.cursor;
        onUpdate(update);
      };
      // The browser reconnects by itself, with Last-Event-ID.
      source.onerror = (error) => onError(error);
    };
    const close = () => {
      source?.close();
      source = null;
    };
    const stop = net.subscribe(() => {
      if (!net.offline) return open();
      close();
      onError(new Error('offline (demo)'));
    });
    if (net.offline) queueMicrotask(() => onError(new Error('offline (demo)')));
    open();
    return () => {
      stop();
      close();
    };
  },
  push: async (ops, cursor) => {
    await request(net, url, pushInit(ops, cursor));
  },
});

const mountBar = (self, mode, net) => {
  const bar = document.createElement('div');
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'sync demo');
  bar.style.cssText = [
    'position:fixed',
    'left:12px',
    'bottom:12px',
    'z-index:2147483647',
    'display:flex',
    'gap:8px',
    'align-items:center',
    'padding:6px 10px',
    'border-radius:999px',
    'background:rgba(31,35,40,.92)',
    'color:#fff',
    'font:12px/1.4 system-ui,sans-serif',
    'box-shadow:0 2px 8px rgba(0,0,0,.25)',
  ].join(';');
  const button = (label, onClick) => {
    const element = document.createElement('button');
    element.type = 'button';
    element.textContent = label;
    element.style.cssText =
      'font:inherit;color:inherit;background:rgba(255,255,255,.14);border:0;border-radius:999px;padding:2px 8px;cursor:pointer';
    element.addEventListener('click', onClick);
    return element;
  };
  const link = (label, href) => {
    const element = document.createElement('a');
    element.textContent = label;
    element.href = href;
    element.target = href === '/log' ? '_blank' : '_self';
    element.style.cssText = 'color:#9cd0ff';
    return element;
  };
  const name = document.createElement('strong');
  name.textContent = self.name;
  const network = button('', () => net.set(!net.offline));
  const drawNetwork = () => {
    network.textContent = net.offline ? '● オフライン（戻す）' : '● オンライン';
    network.style.color = net.offline ? '#ffb4a8' : '#7ee2a8';
  };
  net.subscribe(drawNetwork);
  drawNetwork();
  const transport = button(mode === 'sse' ? 'SSE' : 'polling', () => {
    localStorage.setItem(TRANSPORT_KEY, mode === 'sse' ? 'polling' : 'sse');
    location.reload();
  });
  transport.title = '通信方式を切り替えて再読み込みします';
  bar.append(name, network, transport, link('ログ', '/log'), link('一覧', '/'));
  document.body.append(bar);
};

/** Shares every draft of the page as `self`. */
export const startDemoSync = (self) => {
  const mode = localStorage.getItem(TRANSPORT_KEY) === 'sse' ? 'sse' : 'polling';
  const net = createNetwork();
  serveDraftSync({
    self,
    transport: (context) =>
      mode === 'sse' ? sseTransport(net, draftUrl(context)) : pollingTransport(net, draftUrl(context)),
  });
  if (document.body === null) document.addEventListener('DOMContentLoaded', () => mountBar(self, mode, net));
  else mountBar(self, mode, net);
};
