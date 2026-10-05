#!/usr/bin/env node
/** Long-label regression against the built bundle on the separate sample origin.
 * AGENT_BROWSER_SESSION and AGENT_BROWSER_PROFILE must identify an isolated browser.
 * Usage: node dev/qa/er-long-names.ts <sample-url>
 */
import { execFileSync } from 'node:child_process';

const base = process.argv[2];
const session = process.env['AGENT_BROWSER_SESSION'];
const profile = process.env['AGENT_BROWSER_PROFILE'];
if (!base || !session || !profile) throw new Error('Provide sample URL and isolated browser session/profile');
const ab = (...args: string[]) =>
  execFileSync('pnpm', ['exec', 'agent-browser', '--session', session, '--profile', profile, ...args], {
    encoding: 'utf8',
  }).trim();

const probe = `(() => {
  const el = document.querySelector('dpk-component-er-diagram');
  const root = el.shadowRoot;
  const cards = [...root.querySelectorAll('.er-table')];
  const errors = [];
  const close = (a,b) => Math.abs(a-b) < 1.5;
  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    const placed = el.layout.nodes.find(n => n.id === card.dataset.erTable);
    const scale = rect.width / placed.width;
    if (!close(rect.height / scale, placed.height)) errors.push('card height');
    for (const label of card.querySelectorAll('.er-name,.er-label,.er-field-name,.er-field-type,.er-change')) {
      if (label.scrollWidth > label.clientWidth + 1 || label.scrollHeight > label.clientHeight + 1) errors.push('label overflow');
      const range = document.createRange(); range.selectNodeContents(label);
      for (const r of range.getClientRects()) {
        if (r.left < rect.left - 1 || r.right > rect.right + 1 || r.bottom > rect.bottom + 1) errors.push('clipped text');
      }
    }
    const rows = [...card.querySelectorAll('.er-field')];
    for (let i=1;i<rows.length;i++) {
      if (rows[i-1].getBoundingClientRect().bottom > rows[i].getBoundingClientRect().top + 1) errors.push('row overlap');
    }
    for (const edge of el.visible.edges) {
      const source = edge.from === placed.id;
      if (!source && edge.to !== placed.id) continue;
      const node = el.visible.nodes.find(n=>n.id===placed.id);
      const index = node.fields.findIndex(f=>f.id === (source ? edge.sourceField : edge.targetField));
      const row = rows[index].getBoundingClientRect();
      const route = el.layout.routes.find(r=>r.id===edge.id);
      const point = source ? route.points[0] : route.points.at(-1);
      if (!close(point.y - placed.y, (row.top + row.height/2 - rect.top)/scale)) errors.push('row anchor');
      if (!close(point.x, placed.x + (source ? placed.width : 0))) errors.push('side anchor');
    }
  }
  for (let i=0;i<cards.length;i++) for(let j=i+1;j<cards.length;j++) {
    const a=cards[i].getBoundingClientRect(), b=cards[j].getBoundingClientRect();
    if(a.left<b.right && a.right>b.left && a.top<b.bottom && a.bottom>b.top) errors.push('card collision');
  }
  if(cards.length!==2 || root.querySelectorAll('.er-field').length!==6 || el.layout.routes.length!==2) errors.push('missing fixture');
  if(errors.length) throw new Error(errors.join(', '));
  return 'PASS full labels, six rows, two anchored relationships, no card collisions';
})()`;

try {
  ab('open', `${base}/er-long-names.html`);
  for (const width of [1440, 760, 390]) {
    ab('set', 'viewport', String(width), '1000');
    // Let resize/layout observers settle, rather than relying on the navigation event alone.
    ab('eval', 'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    console.log(`${width}px: ${ab('eval', probe)}`);
  }
  ab('eval', `document.querySelector('dpk-component-er-diagram').shadowRoot.querySelector('.er-head').click()`);
  console.log(
    ab(
      'eval',
      `(() => { const el=document.querySelector('dpk-component-er-diagram'); if(el.selection?.kind!=='node') throw new Error('selection'); return 'PASS selection'; })()`,
    ),
  );
  const before = ab(
    'eval',
    `document.querySelector('dpk-component-er-diagram').shadowRoot.querySelector('.diagram-world').style.transform`,
  );
  ab('mouse', 'move', '80', '780');
  ab('mouse', 'down');
  ab('mouse', 'move', '30', '780');
  ab('eval', 'new Promise(resolve => requestAnimationFrame(resolve))');
  ab('mouse', 'up');
  const after = ab(
    'eval',
    `document.querySelector('dpk-component-er-diagram').shadowRoot.querySelector('.diagram-world').style.transform`,
  );
  if (before === after) throw new Error('pan did not change viewport: ' + before + ' -> ' + after);
  console.log('PASS pointer pan');
  ab(
    'eval',
    `document.querySelector('dpk-component-er-diagram').shadowRoot.querySelector('[aria-label="拡大"]').click()`,
  );
  const zoomed = ab(
    'eval',
    `document.querySelector('dpk-component-er-diagram').shadowRoot.querySelector('.diagram-world').style.transform`,
  );
  if (zoomed === after) throw new Error('zoom did not change viewport');
  console.log('PASS zoom');
  console.log(ab('eval', probe));
  const errors = ab('errors');
  if (errors !== '') throw new Error(errors);
} finally {
  ab('close');
}
