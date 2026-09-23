import{Z as it,l as nt,$ as U,a0 as S,a1 as h,a2 as ot,a3 as dt,a4 as V,a5 as E,a6 as g,a7 as j,a8 as u,a9 as T,aa as k,ab as $,ac as Y,ad as lt,ae as ce,af as pe,ag as ue,ah as ee,s as ct,t as pt}from"./shared-BK58el9_.js";import{c as K}from"./shared-DPcZakya.js";const ut='script[type="application/json"]',he=(r,e)=>{const t=r.querySelector(ut);if(!t)return null;const a=t.textContent??"";if(a.trim()==="")return{ok:!1,error:"JSON block is empty"};try{return{ok:!0,value:e(JSON.parse(a))}}catch(i){return{ok:!1,error:i instanceof Error?i.message:String(i)}}},ht=(r,e,t)=>{const a=he(r,e);if(a)return t(a),()=>{};const i=new MutationObserver(()=>{const s=he(r,e);s&&(i.disconnect(),t(s))});return i.observe(r,{childList:!0,subtree:!0}),()=>i.disconnect()},fe={nodeSpacing:34,layerSpacing:84,padding:28,sweeps:4,coordinatePasses:6},W=r=>{const e=[...r].sort((a,i)=>a-i);if(e.length===0)return 0;const t=Math.floor(e.length/2);return e.length%2===1?e[t]??0:((e[t-1]??0)+(e[t]??0))/2},ft=(r,e)=>{const t=new Map;for(const n of r)t.set(n.id,[]);for(const n of e)t.get(n.from)?.push(n);const a=new Map,i=new Set,s=n=>{a.set(n,"open");for(const o of t.get(n)??[]){const d=a.get(o.to)??"new";d==="open"?i.add(o.id):d==="new"&&s(o.to)}a.set(n,"done")};for(const n of r)(a.get(n.id)??"new")==="new"&&s(n.id);return{reversed:i,forward:e.filter(n=>!i.has(n.id))}},gt=(r,e)=>{const t=new Map,a=new Map;for(const o of r)t.set(o.id,[]),a.set(o.id,[]);for(const o of e)a.get(o.from)?.push(o),t.get(o.to)?.push(o);const i=new Map(r.map(o=>[o.id,0])),s=new Map(r.map(o=>[o.id,(t.get(o.id)??[]).length])),n=r.filter(o=>(s.get(o.id)??0)===0).map(o=>o.id);for(const o of n)for(const d of a.get(o)??[]){const c=i.get(d.to)??0;i.set(d.to,Math.max(c,(i.get(o)??0)+1));const m=(s.get(d.to)??0)-1;s.set(d.to,m),m===0&&n.push(d.to)}return i},mt=(r,e,t,a)=>{const i=[...r.keys()].sort((s,n)=>s-n);for(let s=0;s<a;s++){const n=s%2===0;for(const o of n?i:[...i].reverse()){const d=r.get(o)??[],c=new Map(d.map((l,x)=>[l,x])),m=l=>{const x=c.get(l);return x===void 0?null:x},y=d.map(l=>{const x=(e.get(l)??[]).filter(b=>(t.get(b)??o)===o+(n?-1:1)).map(m).filter(b=>b!==null);return{id:l,want:x.length>0?W(x):c.get(l)??0}});y.sort((l,x)=>l.want-x.want||(c.get(l.id)??0)-(c.get(x.id)??0)),r.set(o,y.map(l=>l.id))}}},ge=(r,e,t,a)=>{const i=r.map((n,o)=>({id:n,want:t.get(n)??o*100,index:o}));i.sort((n,o)=>n.want-o.want||n.index-o.index);let s=0;for(const n of i){const o=e.get(n.id);o&&(o.y=s,s+=o.spec.height+a)}return{height:Math.max(0,s-a)}},bt=(r,e,t,a,i)=>{const s=[...r.keys()].sort((c,m)=>c-m),n=new Map;for(const c of s)n.set(c,ge(r.get(c)??[],e,new Map,i.nodeSpacing).height);const o=Math.max(0,...n.values());for(const c of s){const m=(o-(n.get(c)??0))/2;for(const y of r.get(c)??[]){const l=e.get(y);l&&(l.y+=m)}}const d=(c,m)=>{const y=(t.get(c)??[]).filter(l=>a.get(l)===m).flatMap(l=>{const x=e.get(l);return x?[x.y+x.spec.height/2]:[]});return y.length>0?W(y):null};for(let c=0;c<i.coordinatePasses;c++){const m=c%2===0;for(const y of m?s:[...s].reverse()){const l=r.get(y)??[],x=new Map;for(const M of l){const z=d(M,y+(m?-1:1)),D=e.get(M);D!==void 0&&x.set(M,z===null?D.y+D.spec.height/2:z)}const b=l.map(M=>e.get(M)?.y??0);ge(l,e,x,i.nodeSpacing);const f=l.map(M=>e.get(M)?.y??0),w=W(b)-W(f);for(const M of l){const z=e.get(M);z&&(z.y+=w)}}}},me=(r,e,t)=>{const a=e===void 0?void 0:r.spec.ports?.[e];return a?{x:r.x+a.x,y:r.y+a.y}:t==="out"?{x:r.x+r.spec.width,y:r.y+r.spec.height/2}:{x:r.x,y:r.y+r.spec.height/2}},be=(r,e,t)=>{let a=0;const i=[];for(const s of r){const n=t.byId.get(s.from),o=t.byId.get(s.to);if(!n||!o)continue;const d=me(n,s.fromPort,"out"),c=me(o,s.toPort,"in");if(s.from===s.to){const b=n.x+n.spec.width,f=n.y+n.spec.height,w=Math.max(t.padding/2,f+18);i.push({id:s.id,points:[d,{x:b+20,y:d.y},{x:b+20,y:w},{x:n.x-20,y:w},{x:n.x-20,y:c.y},c]});continue}if(!e.has(s.id)&&(n.layer<o.layer||n.layer===o.layer&&c.x>d.x+12)){if(Math.abs(d.y-c.y)<.5){i.push({id:s.id,points:[d,c]});continue}const b=n.layer<o.layer?Math.max(d.x+14,o.x-Math.max(12,t.layerSpacing/2)):(d.x+c.x)/2;i.push({id:s.id,points:[d,{x:b,y:d.y},{x:b,y:c.y},c]});continue}const m=s.fromPort===void 0?{x:n.x+n.spec.width/2,y:n.y+n.spec.height}:d,y=s.toPort===void 0?{x:o.x+o.spec.width/2,y:o.y+o.spec.height}:c,l=Math.max(m.y,y.y)+18+a*14;a+=1;const x=[d,m,{x:m.x,y:l},{x:y.x,y:l},y,c].filter((b,f,w)=>f===0||b.x!==w[f-1]?.x||b.y!==w[f-1]?.y);i.push({id:s.id,points:x})}return i},xe=(r,e,t)=>{const a=e.flatMap(l=>[...l.points]),i=[...r.map(l=>l.x),...r.map(l=>l.x+l.spec.width),...a.map(l=>l.x)],s=[...r.map(l=>l.y),...r.map(l=>l.y+l.spec.height),...a.map(l=>l.y)],n=Math.min(0,...i),o=Math.min(0,...s),d=Math.max(0,...i),c=Math.max(0,...s),m=t-n,y=t-o;return{width:d-n+t*2,height:c-o+t*2,nodes:r.map(l=>({id:l.spec.id,x:l.x+m,y:l.y+y,width:l.spec.width,height:l.spec.height,layer:l.layer,order:l.order})),routes:e.map(l=>({id:l.id,points:l.points.map(x=>({x:x.x+m,y:x.y+y}))}))}},ve=(r,e)=>{const t=new Map(r.map(a=>[a.id,[]]));for(const a of e)a.from!==a.to&&(t.get(a.from)?.push(a.to),t.get(a.to)?.push(a.from));return t},we=(r,e,t,a)=>r.map(i=>({spec:i,layer:e.get(i.id)??0,order:t.get(i.id)??0,...a(i)})),xt=(r,e)=>{const t=new Map;for(const a of r){const i=e.get(a.id)??0,s=t.get(i);s?s.push(a.id):t.set(i,[a.id])}return t},vt=(r,e,t={})=>{const a={...fe,...t};if(r.length===0)return{width:0,height:0,nodes:[],routes:[]};const i=new Set(r.map(f=>f.id)),s=e.filter(f=>i.has(f.from)&&i.has(f.to)),{forward:n,reversed:o}=ft(r,s),d=gt(r,n),c=xt(r,d);mt(c,ve(r,s),d,a.sweeps);const m=new Map;for(const f of c.values())f.forEach((w,M)=>m.set(w,M));const y=we(r,d,m,()=>({x:0,y:0})),l=new Map(y.map(f=>[f.spec.id,f]));bt(c,l,ve(r,s),d,a);const x=[...c.keys()].sort((f,w)=>f-w);let b=0;for(const f of x){const w=Math.max(...(c.get(f)??[]).map(M=>l.get(M)?.spec.width??0));for(const M of c.get(f)??[]){const z=l.get(M);z&&(z.x=b)}b+=w+a.layerSpacing}return xe(y,be(s,o,{byId:l,layerSpacing:a.layerSpacing,padding:a.padding}),a.padding)},wt=(r,e,t={})=>{const a={...fe,...t};if(r.length===0)return{width:0,height:0,nodes:[],routes:[]};const i=new Set(r.map(d=>d.id)),s=e.filter(d=>i.has(d.from)&&i.has(d.to)),n=we(r,new Map,new Map,d=>d.position??{x:0,y:0}),o=new Map(n.map(d=>[d.spec.id,d]));return xe(n,be(s,new Set,{byId:o,layerSpacing:a.layerSpacing,padding:a.padding}),a.padding)},yt={active:[],match:"single"},J=(r,e)=>e.active.length===0?!0:e.match==="all"?e.active.every(t=>r.includes(t)):e.active.some(t=>r.includes(t)),kt=(r,e)=>r.active.includes(e)?{...r,active:r.active.filter(t=>t!==e)}:r.match==="single"?{...r,active:[e]}:{...r,active:[...r.active,e]},$t=(r,e)=>({match:e,active:e==="single"&&r.active.length>1?r.active.slice(-1):r.active}),qt=r=>({...r,active:[]}),Mt=r=>{const e=new Map;for(const t of r)for(const a of new Set(t))e.set(a,(e.get(a)??0)+1);return[...e].map(([t,a])=>({tag:t,count:a}))},F={nodes:new Map,edges:new Set},P=(r,e,t,a)=>{const i=new Map,s=new Set,n=[{id:e,depth:0}],o=new Set([e]);for(const d of n)if(!(!a&&d.depth>=1))for(const c of r){const m=t==="outgoing"?c.from:c.to,y=t==="outgoing"?c.to:c.from;m===d.id&&(s.add(c.id),!o.has(y)&&(o.add(y),i.set(y,d.depth+1),n.push({id:y,depth:d.depth+1})))}return{nodes:i,edges:s}},St=(r,e)=>{const t=new Map(r.map(s=>[s,P(e,s,"outgoing",!0).nodes])),a=new Set,i=[];for(const s of r){if(a.has(s))continue;const n=r.filter(o=>o===s||t.get(s)?.has(o)===!0&&t.get(o)?.has(s)===!0);for(const o of n)a.add(o);(n.length>1||e.some(o=>o.from===s&&o.to===s))&&i.push(n)}return i},te=r=>new Map(r.flatMap((e,t)=>e.map(a=>[a,t]))),ye=(r,e)=>e.get(r.from)===e.get(r.to)&&e.has(r.from),ke=(r,e,t,a)=>{const i=e!==null&&e.kind===t&&e.id===r,s=t==="node"?a.nodes.has(r):a.edges.has(r),n=t==="node"?a.nodes.get(r)??null:null;return{selected:i,related:s&&!i,dimmed:e!==null&&!i&&!s,depth:n}},ae=(...r)=>r.filter(e=>typeof e=="string"&&e!=="").join(" "),zt=r=>{const e=r[0]??{x:0,y:0},t=r.at(-1)??e;if(r.length<=2)return{x:(e.x+t.x)/2,y:(e.y+t.y)/2};if(r.length===4){const s=r[1]??e,n=r[2]??t;return{x:s.x,y:(s.y+n.y)/2}}const a=r[2]??e,i=r[3]??t;return{x:(a.x+i.x)/2,y:a.y}},Et=(r,e)=>Mt(r).map(t=>({tag:t.tag,count:t.count,selected:e.active.includes(t.tag)})),Ct=(r,e,t)=>`${r} ${t.node} \xB7 ${e} ${t.edge}`,C=(r,e)=>({label:r,text:e}),H=(r,e)=>({label:r,links:e}),I=[it,nt,U`
    :host {
      display: block;
      container-type: inline-size;
    }

    .diagram {
      display: flex;
      flex-direction: column;
      /* The sizing knob: the shell may be resized vertically, and the canvas
         takes whatever is left of it. */
      height: var(--diagram-height, 560px);
      min-height: 260px;
      border: 1px solid var(--af-rule);
      border-radius: var(--af-radius-lg);
      background: var(--af-paper-raised);
      overflow: hidden;
      resize: vertical;
    }

    .diagram-toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      min-height: 42px;
      padding: 7px 12px;
      border-bottom: 1px solid var(--af-rule);
      background: linear-gradient(180deg, var(--af-paper-raised), var(--af-paper));
      flex-shrink: 0;
    }

    .diagram-title {
      font-size: 12.5px;
      font-weight: 620;
      letter-spacing: -0.01em;
    }

    .diagram-subject {
      font-size: 10px;
      color: var(--af-ink-faint);
      padding-left: 10px;
      border-left: 1px solid var(--af-rule-strong);
    }

    .diagram-toolbar-actions {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-left: auto;
      flex-wrap: wrap;
    }

    .diagram-stats {
      font-family: var(--af-mono);
      font-size: 10px;
      color: var(--af-ink-faint);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .diagram-tags {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
      padding: 6px 12px;
      border-bottom: 1px solid var(--af-rule);
      background: var(--af-paper);
      flex-shrink: 0;
    }

    .diagram-match {
      display: flex;
      gap: 1px;
      padding: 2px;
      margin-right: 5px;
      border: 1px solid var(--af-rule-strong);
      border-radius: var(--af-radius-xs);
    }

    .diagram-match button {
      border: 0;
      border-radius: 3px;
      padding: 3px 6px;
      background: transparent;
      color: var(--af-ink-faint);
      font-size: 9.5px;
      cursor: pointer;
    }

    .diagram-match button[aria-pressed='true'] {
      background: var(--af-blue-soft);
      color: var(--af-blue);
      font-weight: 650;
    }

    .af-tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 8px;
      border: 1px solid transparent;
      border-radius: var(--af-radius-xs);
      background: var(--af-paper-inset);
      color: var(--af-ink-soft);
      font-size: 10.5px;
      cursor: pointer;
    }

    .af-tag:hover {
      background: var(--af-paper-sunken);
      color: var(--af-ink);
    }

    .af-tag[aria-pressed='true'] {
      border-color: color-mix(in srgb, var(--af-blue) 40%, transparent);
      background: var(--af-blue-soft);
      color: var(--af-blue);
      font-weight: 600;
    }

    .af-tag-count {
      font-family: var(--af-mono);
      font-size: 9px;
      opacity: 0.7;
      font-variant-numeric: tabular-nums;
    }

    .af-tag-clear {
      border: 0;
      background: none;
      padding: 4px 6px;
      color: var(--af-ink-faint);
      font-size: 10px;
      cursor: pointer;
    }

    .diagram-canvas {
      position: relative;
      flex: 1;
      min-height: 220px;
      overflow: hidden;
      touch-action: none;
      cursor: grab;
      background-color: var(--af-paper-raised);
      background-image: radial-gradient(var(--af-rule-strong) 0.7px, transparent 0.7px);
      background-size: 22px 22px;
    }

    .diagram-canvas:focus-visible {
      outline: none;
      box-shadow: inset var(--af-focus);
    }

    .diagram-canvas.is-panning {
      cursor: grabbing;
    }

    .diagram-world {
      position: absolute;
      inset: 0 auto auto 0;
      transform-origin: 0 0;
    }

    .diagram-edges {
      position: absolute;
      inset: 0;
      overflow: visible;
      pointer-events: none;
    }

    .diagram-zoom {
      position: absolute;
      right: 12px;
      bottom: 12px;
      display: flex;
      overflow: hidden;
      border: 1px solid var(--af-rule-strong);
      border-radius: var(--af-radius-sm);
      background: var(--af-paper-raised);
      box-shadow: var(--af-shadow-sm);
    }

    .diagram-zoom button {
      border: 0;
      border-radius: 0;
      padding: 6px 9px;
      background: transparent;
      font-size: 10.5px;
      cursor: pointer;
    }

    .diagram-zoom button:hover {
      background: var(--af-paper-sunken);
    }

    .diagram-legend {
      position: absolute;
      left: 12px;
      bottom: 14px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      max-width: calc(100% - 150px);
      padding: 3px 6px;
      border-radius: var(--af-radius-xs);
      background: color-mix(in srgb, var(--af-paper-raised) 88%, transparent);
      font-size: 9.5px;
      color: var(--af-ink-faint);
    }

    .diagram-legend span {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    .diagram-legend i {
      width: 16px;
      border-top: 1.6px solid var(--af-rule-strong);
    }

    .diagram-empty,
    .diagram-notice {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      margin: 0;
      font-size: 12px;
      color: var(--af-ink-faint);
      text-align: center;
      pointer-events: none;
    }

    .diagram-notice {
      pointer-events: auto;
      padding: 12px 16px;
      border: 1px solid var(--af-rule-strong);
      border-radius: var(--af-radius);
      background: var(--af-paper-raised);
      box-shadow: var(--af-shadow-sm);
      color: var(--af-ink-soft);
    }

    .diagram-notice p {
      margin: 0 0 9px;
    }

    .diagram-details {
      position: relative;
      border-top: 1px solid var(--af-rule);
      padding: 12px 38px 13px 14px;
      background: var(--af-paper-raised);
      max-height: 190px;
      overflow: auto;
      flex-shrink: 0;
    }

    .diagram-details-body {
      display: flex;
      align-items: flex-start;
      gap: 22px;
      flex-wrap: wrap;
    }

    .diagram-detail-heading {
      flex: 0 0 180px;
    }

    .diagram-detail-eyebrow {
      font-family: var(--af-mono);
      font-size: 9px;
      letter-spacing: 0.06em;
      color: var(--af-ink-faint);
    }

    .diagram-detail-heading h2 {
      font-size: 13px;
      margin-top: 5px;
    }

    .diagram-detail-field {
      flex: 1;
      min-width: 150px;
      max-width: 460px;
      margin: 0;
    }

    .diagram-detail-field dt {
      font-size: 10px;
      color: var(--af-ink-faint);
      margin-bottom: 5px;
    }

    .diagram-detail-field dd {
      margin: 0;
      font-size: 11.5px;
      line-height: 1.75;
      color: var(--af-ink-soft);
    }

    .diagram-detail-links {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }

    .diagram-detail-links button {
      max-width: 190px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 10.5px;
      padding: 4px 8px;
      background: var(--af-paper-sunken);
    }

    .diagram-details-close {
      position: absolute;
      top: 9px;
      right: 10px;
      border: 0;
      background: none;
      padding: 2px 7px;
      color: var(--af-ink-faint);
      font-size: 15px;
      cursor: pointer;
    }

    .diagram-details-close:hover {
      color: var(--af-ink);
    }

    /* Element state, shared by every diagram so highlighting reads the same. */
    .d-node {
      position: absolute;
      cursor: pointer;
      transition:
        opacity 150ms ease,
        border-color 150ms ease,
        box-shadow 150ms ease;
    }

    .d-node.is-dimmed,
    .d-edge.is-dimmed {
      opacity: 0.26;
    }

    .d-edge {
      outline: none;
      cursor: pointer;
    }

    .d-edge-hit {
      fill: none;
      stroke: transparent;
      stroke-width: 16;
      pointer-events: stroke;
      cursor: pointer;
    }

    .d-edge-path {
      fill: none;
      stroke: var(--af-rule-strong);
      stroke-width: 1.5;
      stroke-linejoin: round;
    }

    .d-edge.is-selected .d-edge-path,
    .d-edge:focus-visible .d-edge-path {
      stroke: var(--af-ink);
      stroke-width: 2.4;
    }

    .d-edge:focus-visible .d-edge-hit {
      stroke: var(--af-blue-soft);
    }

    .d-edge-label {
      font-size: 9.5px;
      fill: var(--af-ink-faint);
      paint-order: stroke;
      stroke: var(--af-paper-raised);
      stroke-width: 5px;
      stroke-linejoin: round;
    }

    .d-edge-label.is-dimmed {
      opacity: 0.3;
    }

    @media (max-width: 700px) {
      .diagram-subject {
        display: none;
      }

      .diagram-detail-heading {
        flex-basis: 100%;
      }

      .diagram-details {
        max-height: 180px;
      }
    }
  `],N=r=>r.map((e,t)=>`${t===0?"M":"L"}${e.x} ${e.y}`).join(" "),$e=r=>h`
  <defs>
    ${r.map(e=>h`
        <marker
          id=${e.id}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path
            class="diagram-arrow"
            d=${e.open===!0?"M1 1 L9 5 L1 9":"M1 1 L9 5 L1 9 Z"}
            fill=${e.open===!0||e.color===void 0?S:e.color}
            stroke=${e.color??S}
            stroke-width="1.3"
          ></path>
        </marker>
      `)}
  </defs>
`,Lt=(r,e,t)=>h`
  <div class="diagram-tags" role="group" aria-label="タグの絞り込み">
    <div class="diagram-match" role="group" aria-label="タグの一致条件">
      ${[["single","Single"],["all","AND"],["any","OR"]].map(([a,i])=>h`
          <button
            type="button"
            data-match=${a}
            aria-pressed=${e===a?"true":"false"}
            @click=${()=>t({kind:"match",match:a})}
          >
            ${i}
          </button>
        `)}
    </div>
    ${ot(r,a=>a.tag,a=>h`
        <button
          type="button"
          class="af-tag"
          data-tag=${a.tag}
          aria-pressed=${a.selected?"true":"false"}
          @click=${()=>t({kind:"tag",tag:a.tag})}
        >
          ${a.tag}<span class="af-tag-count">${a.count}</span>
        </button>
      `)}
    ${r.some(a=>a.selected)?h`<button type="button" class="af-tag-clear" @click=${()=>t({kind:"clear-tags"})}>解除</button>`:S}
  </div>
`,jt=r=>h`
  <div class="diagram-zoom">
    <button
      type="button"
      aria-label="縮小"
      @click=${e=>{e.stopPropagation(),r?.({kind:"zoom",factor:1/1.1})}}
    >
      −
    </button>
    <button
      type="button"
      class="diagram-zoom-value"
      title="全体を表示"
      aria-label="全体を表示"
      @click=${()=>r?.({kind:"fit"})}
    >
      100%
    </button>
    <button
      type="button"
      aria-label="拡大"
      @click=${e=>{e.stopPropagation(),r?.({kind:"zoom",factor:1.1})}}
    >
      ＋
    </button>
  </div>
`,Dt=r=>h`
  <dl class="diagram-detail-field">
    <dt>${r.label}</dt>
    <dd>
      ${"text"in r?r.text:h`<span class="diagram-detail-links">
              ${r.links.length===0?h`<span>なし</span>`:r.links.map(e=>h`<button type="button" @click=${()=>e.select()}>${e.label}</button>`)}
            </span>`}
    </dd>
  </dl>
`,Ot=(r,e)=>h`
  <section class="diagram-details" aria-label="選択した要素の詳細" ?hidden=${r===null}>
    ${r===null?S:h`
            <div class="diagram-details-body">
              <div class="diagram-detail-heading">
                <span class="diagram-detail-eyebrow">${r.eyebrow}</span>
                <h2>${r.title}</h2>
              </div>
              ${r.fields.map(t=>Dt(t))}
            </div>
            <button
              type="button"
              class="diagram-details-close"
              aria-label="詳細を閉じる"
              @click=${()=>e({kind:"select",selection:null})}
            >
              ×
            </button>
          `}
  </section>
`,se=.08,Ft=1.8,Pt=r=>{if(r.length===0)return{x:0,y:0,width:0,height:0};const e=Math.min(...r.map(s=>s.x)),t=Math.min(...r.map(s=>s.y)),a=Math.max(...r.map(s=>s.x+s.width))-e,i=Math.max(...r.map(s=>s.y+s.height))-t;return{x:e-a*.1,y:t-i*.1,width:a*1.2,height:i*1.2}},At=(r,e,t,a)=>{if(e.width===0||e.height===0)return{...r,x:0,y:0};const i=(s,n,o,d)=>{const c=o*r.scale;return c<=d?(d-c)/2-n*r.scale:Math.min(-n*r.scale,Math.max(d-(n+o)*r.scale,s))};return{...r,x:i(r.x,e.x,e.width,t),y:i(r.y,e.y,e.height,a)}},qe='button,[role="button"],a,input,textarea,select',Tt=r=>{const{canvas:e,world:t,onClearSelection:a,onView:i}=r;let s={x:0,y:0,width:0,height:0},n={x:0,y:0,scale:1};const o=()=>({width:e.clientWidth||1e3,height:e.clientHeight||560}),d=()=>{const{width:p,height:v}=o();n=At(n,s,p,v),t.style.transform=`translate(${n.x}px, ${n.y}px) scale(${n.scale})`,i?.(n)},c=()=>{const{width:p,height:v}=o(),q=s.width/1.2||1,L=s.height/1.2||1;n={...n,scale:K(Math.min((p-24)/q,(v-40)/L),se,1)},n={...n,x:(p-s.width*n.scale)/2-s.x*n.scale,y:(v-s.height*n.scale)/2-s.y*n.scale},d()},m=()=>{const{width:p}=o(),v=s.width/1.2||1,q=K((p-24)/v,se,1);n={scale:q,x:(p-s.width*q)/2-s.x*q,y:16},d()},y=()=>{n={scale:1,x:16-s.x,y:16-s.y},d()},l=(p,v=o().width/2,q=o().height/2)=>{const L=n.scale,O=K(L*p,se,Ft);O!==L&&(n={scale:O,x:v-(v-n.x)*O/L,y:q-(q-n.y)*O/L},d())},x=p=>{if(p.target instanceof Element&&p.target.closest(".diagram-zoom"))return;p.preventDefault();const v=p.deltaMode===1?16:p.deltaMode===2?o().height:1;if(p.ctrlKey||p.metaKey){const q=e.getBoundingClientRect();l(Math.exp(-K(p.deltaY*v,-60,60)*.0012),p.clientX-q.left,p.clientY-q.top);return}n={...n,x:n.x-p.deltaX*v,y:n.y-p.deltaY*v},d()},b=new Map;let f=null,w=!1;const M=()=>{const p=[...b.values()],v=p[0];if(!v)return null;const q=p[1];return q?{x:(v.x+q.x)/2,y:(v.y+q.y)/2,distance:Math.hypot(q.x-v.x,q.y-v.y)}:{...v,distance:0}},z=p=>{b.size===0&&(w=!1);const v=(p.target instanceof Element?p.target:null)?.closest(qe)??null;p.button!==0||p.pointerType!=="touch"&&v!==null||(b.set(p.pointerId,{x:p.clientX,y:p.clientY}),f=M(),v===null&&e.setPointerCapture(p.pointerId))},D=p=>{if(!b.has(p.pointerId)||f===null)return;b.set(p.pointerId,{x:p.clientX,y:p.clientY});const v=M();if(v===null)return;const q=v.x-f.x,L=v.y-f.y;if((Math.abs(q)+Math.abs(L)>1||Math.abs(v.distance-f.distance)>1)&&(w=!0),v.distance>0&&f.distance>0){const O=e.getBoundingClientRect();l(Math.pow(v.distance/f.distance,.45),f.x-O.left,f.y-O.top)}n={...n,x:n.x+q,y:n.y+L},d(),f=v,e.classList.toggle("is-panning",w)},A=p=>{b.delete(p.pointerId),f=M(),!(b.size>0)&&(e.classList.remove("is-panning"),p.type==="pointercancel"&&(w=!1))},B=p=>{if(w){p.preventDefault(),p.stopPropagation(),w=!1;return}A(p)},ne=p=>{if(w){p.preventDefault(),p.stopPropagation(),w=!1;return}const v=p.target instanceof Element?p.target:null;v===null||v.closest(qe)!==null||a()},oe=p=>{if(p.target!==e)return;const v=30;if(p.key==="+"||p.key==="=")l(1.1);else if(p.key==="-")l(1/1.1);else if(p.key==="0")c();else if(p.key==="Escape")a();else if(p.key==="ArrowLeft"||p.key==="ArrowRight"||p.key==="ArrowUp"||p.key==="ArrowDown")n={...n,x:n.x+(p.key==="ArrowLeft"?v:p.key==="ArrowRight"?-v:0),y:n.y+(p.key==="ArrowUp"?v:p.key==="ArrowDown"?-v:0)},d();else return;p.preventDefault()},de=p=>{const v=p.target instanceof HTMLElement?p.target:null;if(v===null||!t.contains(v))return;const q=v.getBoundingClientRect(),L=e.getBoundingClientRect();let O=0,X=0;q.left<L.left+12?O=L.left+12-q.left:q.right>L.right-12&&(O=L.right-12-q.right),q.top<L.top+12?X=L.top+12-q.top:q.bottom>L.bottom-40&&(X=L.bottom-40-q.bottom),!(O===0&&X===0)&&(n={...n,x:n.x+O,y:n.y+X},d())};e.addEventListener("wheel",x,{passive:!1}),e.addEventListener("pointerdown",z),e.addEventListener("pointermove",D),e.addEventListener("pointerup",B),e.addEventListener("pointercancel",A),e.addEventListener("lostpointercapture",A),e.addEventListener("click",ne,!0),e.addEventListener("keydown",oe),e.addEventListener("focusin",de);const le=typeof ResizeObserver>"u"?null:new ResizeObserver(()=>d());return le?.observe(e),{setContent(p){s=Pt(p.width===0&&p.height===0?[]:[p]),t.style.width=`${p.width}px`,t.style.height=`${p.height}px`,d()},apply:d,fit:c,fitWidth:m,reset:y,zoom:l,view:()=>({...n}),destroy(){le?.disconnect(),e.removeEventListener("wheel",x),e.removeEventListener("pointerdown",z),e.removeEventListener("pointermove",D),e.removeEventListener("pointerup",B),e.removeEventListener("pointercancel",A),e.removeEventListener("lostpointercapture",A),e.removeEventListener("click",ne,!0),e.removeEventListener("keydown",oe),e.removeEventListener("focusin",de)}}};class Me extends dt{static{this.styles=I}static{this.properties={data:{attribute:!1},heading:{type:String},subject:{type:String}}}#e=null;#s=null;#t=yt;#a=null;#r=null;#i=null;#n=null;#o=-1;constructor(){super(),this.data=null,this.heading=null,this.subject=null}connectedCallback(){super.connectedCallback(),this.#n=ht(this,e=>this.parseData(e),e=>{e.ok?this.#l(e.value):this.#p(e.error)})}disconnectedCallback(){super.disconnectedCallback(),this.#n?.(),this.#n=null,this.#r?.destroy(),this.#r=null,this.#i=null}willUpdate(e){e.has("data")&&this.data!==null&&this.#l(this.data)}updated(){this.#i=this.renderRoot.querySelector(".diagram-zoom-value");const e=this.renderRoot.querySelector(".diagram-canvas"),t=this.renderRoot.querySelector(".diagram-world");if(!e||!t)return;this.#r??=Tt({canvas:e,world:t,onClearSelection:()=>this.#d(null),onView:s=>{this.#i&&(this.#i.textContent=`${Math.round(s.scale*100)}%`),this.dispatchEvent(new CustomEvent("artifact-diagram-view",{detail:{view:s},bubbles:!0,composed:!0})),this.onViewChange(s)}});const a=this.contentSize();if(a===null){this.#r.apply();return}this.#r.setContent({x:0,y:0,width:a.width,height:a.height});const i=this.layoutVersion();i!==this.#o&&(this.#o=i,this.initialView())}get selection(){return this.#a}select(e){this.#d(e)}get tagFilter(){return this.#t}set tagFilter(e){this.#t=e,this.requestUpdate()}get dataError(){return this.#s}resetView(){this.fitViewport()}layoutVersion(){return 0}fitViewport(){this.viewport?.fit()}initialView(){this.viewport?.reset()}questionsOf(e){const t=e.questions?.trim();return t===void 0||t===""?S:t}onViewChange(e){}statsText(){return""}tagItems(){return[]}isEmpty(){return this.contentSize()===null}shellClass(){return""}defaultHeading(){return""}defaultSubject(){return""}emptyMessage(){return"\u8A72\u5F53\u3059\u308B\u8981\u7D20\u306F\u3042\u308A\u307E\u305B\u3093\u3002"}renderToolbarActions(){return S}renderLegend(){return S}renderAboveCanvas(){return S}get viewport(){return this.#r}items(){return this.#e??this.emptyData()}elementClass(e,...t){return ae(...t,e.selected&&"is-selected",e.related&&"is-related",e.dimmed&&"is-dimmed")}#l(e){this.#s=null,this.#e=e,this.#a!==null&&(this.hasSelection(this.#a)||(this.#a=null)),this.requestUpdate()}#p(e){this.#s=e,this.#e=null,console.error("[dev-process-kit] invalid diagram data:",e),this.requestUpdate()}hasSelection(e){return!0}#d(e){(e===null?this.#a===null:this.#a!==null&&this.#a.kind===e.kind&&this.#a.id===e.id)||(this.#a=e,this.dispatchEvent(new CustomEvent("artifact-diagram-select",{detail:{selection:e},bubbles:!0,composed:!0})),this.requestUpdate())}#c=e=>{switch(e.kind){case"tag":this.#t=kt(this.#t,e.tag),this.requestUpdate();return;case"match":this.#t=$t(this.#t,e.match),this.requestUpdate();return;case"clear-tags":this.#t=qt(this.#t),this.requestUpdate();return;case"select":this.#d(e.selection);return;case"zoom":this.#r?.zoom(e.factor);return;case"fit":this.fitViewport();return;default:return}};refreshContent(){}render(){this.refreshContent();const e=Et(this.tagItems(),this.#t);return h`
      <div class=${ae("diagram",this.shellClass())}>
        <div class="diagram-toolbar">
          <span class="diagram-title">${this.heading??this.defaultHeading()}</span>
          ${(this.subject??this.defaultSubject())===""?S:h`<span class="diagram-subject">${this.subject??this.defaultSubject()}</span>`}
          <div class="diagram-toolbar-actions">
            ${this.renderToolbarActions()}
            <span class="diagram-stats">${this.statsText()}</span>
          </div>
        </div>
        ${Lt(e,this.#t.match,this.#c)} ${this.renderAboveCanvas()}
        <div
          class="diagram-canvas"
          tabindex="0"
          aria-label="図。矢印キーでパン、プラス・マイナスでズーム、0で全体表示。"
        >
          <div class="diagram-world">${this.renderCanvas()}</div>
          ${this.isEmpty()?h`<p class="diagram-empty">${this.emptyMessage()}</p>`:S}
          ${this.#s===null?S:h`<p class="diagram-notice" role="alert">
                  図のデータを読み込めませんでした。<br />${this.#s}
                </p>`}
          ${this.renderLegend()} ${jt(this.#c)}
        </div>
        ${Ot(this.detailsFor(this.#a),this.#c)}
      </div>
    `}}class Z extends Me{#e=null;#s="";#t=0;#a=F;get visible(){const e=this.filtered();return{nodes:e.nodes,edges:e.edges}}get layout(){return this.#e}get layoutMode(){return"layered"}get tagDimension(){return"node"}layoutOptions(){return{}}matchesFilter(e){return!0}layoutSignature(){return""}statsLabels(){return{node:"\u8981\u7D20",edge:"\u95A2\u9023"}}statsText(){const e=this.filtered();return Ct(e.nodes.length,e.edges.length,this.statsLabels())}tagItems(){const e=this.items();return(this.tagDimension==="edge"?e.edges:e.nodes).map(t=>t.tags)}contentSize(){const e=this.#e;return e===null||e.nodes.length===0?null:{width:e.width,height:e.height}}layoutVersion(){return this.#t}hasSelection(e){const t=this.items();return e.kind==="node"?t.nodes.some(a=>a.id===e.id):t.edges.some(a=>a.id===e.id)}placedNode(e){return this.#e?.nodes.find(t=>t.id===e)}routeOf(e){return this.#e?.routes.find(t=>t.id===e)?.points??[]}nodeState(e){return ke(e,this.selection,"node",this.#a)}edgeState(e){return ke(e,this.selection,"edge",this.#a)}renderEdges(e,t){const a=this.#e?.width??0,i=this.#e?.height??0;return h`<svg class="diagram-edges" width=${a} height=${i}>
      ${$e(t)}${e}
    </svg>`}filtered(){const e=this.items();if(this.tagDimension==="edge"){const i=e.edges.filter(n=>J(n.tags,this.tagFilter)&&this.matchesFilter(n)),s=new Set(i.flatMap(n=>[n.from,n.to]));return{...e,edges:i,nodes:e.nodes.filter(n=>s.has(n.id))}}const t=e.nodes.filter(i=>J(i.tags,this.tagFilter)&&this.matchesFilter(i)),a=new Set(t.map(i=>i.id));return{...e,nodes:t,edges:e.edges.filter(i=>a.has(i.from)&&a.has(i.to))}}refreshContent(){const e=this.filtered(),t=[this.layoutMode,e.nodes.map(a=>`${a.id}:${a.width}x${a.height}`).join(","),e.edges.map(a=>`${a.id}:${a.from}>${a.to}`).join(","),this.layoutSignature()].join("|");t!==this.#s&&(this.#s=t,this.#t+=1,this.#e=this.computePlacement(e)),this.#a=this.relations(this.selection,e)}computePlacement(e){const t=e.nodes.map(s=>({id:s.id,width:s.width,height:s.height,...s.ports===void 0?{}:{ports:s.ports},...s.position===void 0?{}:{position:s.position}})),a=e.edges.map(s=>({id:s.id,from:s.from,to:s.to,...s.fromPort===void 0?{}:{fromPort:s.fromPort},...s.toPort===void 0?{}:{toPort:s.toPort}})),i=this.layoutOptions();return this.layoutMode==="fixed"?wt(t,a,i):vt(t,a,i)}}const Rt=E({x:Y(),y:Y()}),Ut=E({id:k(u(),$(1)),name:k(u(),$(1)),code:g(u()),kind:g(T(["normal","initial","terminal","compensation"]),"normal"),description:g(u()),position:g(Rt),questions:g(u())}),Vt=E({id:k(u(),$(1)),from:k(u(),$(1)),to:k(u(),$(1)),title:k(u(),$(1)),kind:g(T(["normal","exception"]),"normal"),tags:g(j(u()),[]),guard:g(u()),effect:g(u()),questions:g(u())}),Se={width:178,height:86},It=()=>({nodes:[],edges:[]}),Ht=E({states:j(Ut),transitions:g(j(Vt),[])}),ze=r=>{const e=V(Ht,r),t=new Set;for(const s of e.states){if(t.has(s.id))throw new Error(`duplicate state id: ${s.id}`);t.add(s.id)}const a=new Set,i=e.transitions.map(s=>{if(a.has(s.id))throw new Error(`duplicate transition id: ${s.id}`);if(a.add(s.id),!t.has(s.from))throw new Error(`unknown transition source: ${s.from}`);if(!t.has(s.to))throw new Error(`unknown transition target: ${s.to}`);return{id:s.id,from:s.from,to:s.to,title:s.title,kind:s.kind,tags:s.tags,guard:s.guard??null,effect:s.effect??null,...s.questions===void 0?{}:{questions:s.questions}}});return{nodes:e.states.map(s=>({id:s.id,name:s.name,code:s.code??null,kind:s.kind,description:s.description??null,width:Se.width,height:Se.height,tags:[],...s.position===void 0?{}:{position:s.position},...s.questions===void 0?{}:{questions:s.questions}})),edges:i}},Nt=r=>r.length>0&&r.every(e=>e.position!==void 0),Bt=U`
  .state-node {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
    padding: 0 15px;
    border: 1px solid var(--af-rule-strong);
    border-radius: var(--af-radius);
    background: var(--af-paper-raised);
    box-shadow: var(--af-shadow-xs);
    text-align: left;
    overflow: hidden;
  }

  .state-node:hover {
    border-color: var(--af-blue);
  }

  .state-node.is-initial {
    border-left-width: 3px;
  }

  .state-node.is-terminal {
    border: 3px double var(--af-rule-strong);
  }

  .state-node.is-compensation {
    border-color: color-mix(in srgb, var(--af-amber) 50%, transparent);
    background: var(--af-amber-soft);
  }

  .state-node.is-selected {
    border-color: var(--af-blue);
    box-shadow: 0 0 0 3px var(--af-blue-soft);
  }

  .state-node.is-related {
    border-color: color-mix(in srgb, var(--af-green) 60%, transparent);
  }

  .state-code {
    font-family: var(--af-mono);
    font-size: 9px;
    letter-spacing: 0.02em;
    color: var(--af-ink-faint);
  }

  .state-name {
    font-size: 13.5px;
    font-weight: 640;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .state-label {
    position: absolute;
    transform: translate(-50%, -50%);
    max-width: 190px;
    padding: 3px 7px;
    border: 1px solid transparent;
    border-radius: var(--af-radius-xs);
    background: var(--af-paper-raised);
    color: var(--af-ink-soft);
    font-size: 10px;
    line-height: 1.5;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
  }

  .state-label:hover {
    border-color: color-mix(in srgb, var(--af-blue) 40%, transparent);
    color: var(--af-blue);
  }

  .state-label.is-selected {
    border-color: color-mix(in srgb, var(--af-blue) 55%, transparent);
    background: var(--af-blue-soft);
    color: var(--af-blue);
    font-weight: 600;
  }

  .state-label.is-dimmed {
    opacity: 0.35;
  }

  .state-edge.is-exception .d-edge-path {
    stroke: color-mix(in srgb, var(--af-amber) 65%, var(--af-rule-strong));
    stroke-dasharray: 5 4;
  }

  .state-edge.is-related .d-edge-path {
    stroke: var(--af-green);
  }

  .state-edge.is-selected .d-edge-path {
    stroke: var(--af-blue);
  }

  .state-initial-mark {
    fill: var(--af-ink-faint);
    stroke: var(--af-ink-faint);
  }

  .state-initial-mark.is-dimmed {
    opacity: 0.26;
  }

  #state-arrow .diagram-arrow {
    fill: var(--af-ink-faint);
    stroke: var(--af-ink-faint);
  }

  #state-arrow-active .diagram-arrow {
    fill: var(--af-blue);
    stroke: var(--af-blue);
  }

  #state-arrow-exception .diagram-arrow {
    fill: var(--af-amber);
    stroke: var(--af-amber);
  }
`,Xt=[{id:"state-arrow"},{id:"state-arrow-active"},{id:"state-arrow-exception"}];class Ee extends Z{static{this.styles=[I,Bt]}parseData(e){return ze(e)}emptyData(){return It()}defaultHeading(){return"State machine"}statsLabels(){return{node:"\u72B6\u614B",edge:"\u9077\u79FB"}}emptyMessage(){return"\u8A72\u5F53\u3059\u308B\u9077\u79FB\u306F\u3042\u308A\u307E\u305B\u3093\u3002"}get tagDimension(){return"edge"}get layoutMode(){return Nt(this.filtered().nodes)?"fixed":"layered"}layoutOptions(){return this.layoutMode==="fixed"?{padding:44}:{nodeSpacing:40,layerSpacing:110,padding:44}}relations(e,t){if(e===null||e.kind!=="node")return F;const a=P(t.edges,e.id,"outgoing",!1),i=P(t.edges,e.id,"incoming",!1);return{nodes:new Map([...a.nodes,...i.nodes]),edges:new Set([...a.edges,...i.edges])}}detailsFor(e){if(e===null)return null;const t=this.filtered();if(e.kind==="edge"){const s=t.edges.find(n=>n.id===e.id);return s?{eyebrow:`${this.#e(s.from)} \u2192 ${this.#e(s.to)}`,title:s.title,fields:[...s.guard===null?[]:[C("\u9077\u79FB\u6761\u4EF6",s.guard)],...s.effect===null?[]:[C("\u526F\u4F5C\u7528",s.effect)],C("\u30BF\u30B0",s.tags.join(" / ")||"\u306A\u3057")]}:null}const a=t.nodes.find(s=>s.id===e.id);if(!a)return null;const i=s=>s.map(n=>({label:`${this.#e(n.from)} \u2192 ${this.#e(n.to)} \xB7 ${n.title}`,select:()=>this.select({kind:"edge",id:n.id})}));return{eyebrow:`STATE \xB7 ${a.code??a.id}`,title:a.name,fields:[...a.description===null?[]:[C("\u3053\u306E\u72B6\u614B",a.description)],H("\u5165\u3063\u3066\u304F\u308B\u9077\u79FB",i(t.edges.filter(s=>s.to===a.id))),H("\u51FA\u3066\u3044\u304F\u9077\u79FB",i(t.edges.filter(s=>s.from===a.id)))]}}renderCanvas(){const e=this.visible.nodes,t=e.filter(a=>a.kind==="initial").map(a=>this.#s(a));return h`
      ${this.renderEdges([...t,...this.visible.edges.map(a=>this.#t(a))],Xt)}
      ${e.map(a=>this.#a(a))} ${this.visible.edges.map(a=>this.#r(a))}
    `}#e(e){return this.filtered().nodes.find(t=>t.id===e)?.name??e}#s(e){const t=this.placedNode(e.id);if(!t)return S;const a=t.y+t.height/2,i=this.nodeState(e.id);return h`
      <g class=${ae("state-initial-mark",i.dimmed&&"is-dimmed")}>
        <circle cx=${t.x-22} cy=${a} r="5"></circle>
        <path
          d=${N([{x:t.x-17,y:a},{x:t.x-1,y:a}])}
          stroke-width="1.6"
        ></path>
      </g>
    `}#t(e){const t=this.edgeState(e.id),a=this.routeOf(e.id),i=N(a),s=t.selected||t.related?"state-arrow-active":e.kind==="exception"?"state-arrow-exception":"state-arrow",n=()=>this.select({kind:"edge",id:e.id});return h`
      <g
        class=${this.elementClass(t,"d-edge","state-edge",e.kind==="exception"&&"is-exception")}
        data-transition=${e.id}
      >
        <title>${e.guard??e.title}</title>
        <path class="d-edge-path" d=${i} marker-end=${`url(#${s})`}></path>
        <path
          class="d-edge-hit"
          d=${i}
          role="button"
          tabindex="0"
          aria-label=${`${this.#e(e.from)} \u304B\u3089 ${this.#e(e.to)} \u3078\u306E ${e.title}`}
          @click=${n}
          @keydown=${o=>{o.key!=="Enter"&&o.key!==" "||(o.preventDefault(),n())}}
        ></path>
      </g>
    `}#a(e){const t=this.placedNode(e.id);if(!t)return S;const a=this.nodeState(e.id);return h`
      <button
        type="button"
        class=${this.elementClass(a,"d-node","state-node",`is-${e.kind}`)}
        data-state=${e.id}
        data-grill-questions=${this.questionsOf(e)}
        style="left:${t.x}px; top:${t.y}px; width:${e.width}px; height:${e.height}px"
        aria-pressed=${a.selected?"true":"false"}
        title=${e.description??e.name}
        @click=${()=>this.select({kind:"node",id:e.id})}
      >
        <span class="state-name">${e.name}</span>
        ${e.code===null?S:h`<span class="state-code">${e.code}</span>`}
      </button>
    `}#r(e){const t=this.edgeState(e.id),a=zt(this.routeOf(e.id));return h`
      <button
        type="button"
        class=${this.elementClass(t,"state-label")}
        data-transition-label=${e.id}
        data-grill-questions=${this.questionsOf(e)}
        style="left:${a.x}px; top:${a.y}px"
        title=${e.guard??e.title}
        @click=${()=>this.select({kind:"edge",id:e.id})}
      >
        ${e.title}
      </button>
    `}}const Ce="artifact-state-diagram",Le=(r=Ce)=>{customElements.get(r)||customElements.define(r,Ee)},Yt=E({kind:pe("message"),id:k(u(),$(1)),from:k(u(),$(1)),to:k(u(),$(1)),title:k(u(),$(1)),style:g(T(["request","response","async"]),"request"),tags:g(j(u()),[]),guard:g(u()),detail:g(u()),questions:g(u())}),Kt=E({label:k(u(),$(1)),items:j(ce())}),Wt=E({kind:pe("fragment"),id:k(u(),$(1)),operator:T(["alt","opt","loop","par"]),title:k(u(),$(1)),collapsed:g(ue(),!1),branches:k(j(Kt),$(1))}),Jt=lt("kind",[Yt,Wt]),Zt=E({id:k(u(),$(1)),name:k(u(),$(1)),role:g(u()),symbol:g(u()),kind:g(T(["internal","external"]),"internal"),description:g(u()),questions:g(u())}),Qt=E({participants:k(j(Zt),$(1)),items:g(j(ce()),[])}),je=240,re=(r,e,t)=>{if(r.has(e))throw new Error(`duplicate ${t} id: ${e}`);r.add(e)},De=(r,e,t)=>r.map(a=>{const i=V(Jt,a);if(i.kind==="message"){if(re(t,i.id,"message"),!e.has(i.from))throw new Error(`unknown sender: ${i.from}`);if(!e.has(i.to))throw new Error(`unknown receiver: ${i.to}`);return{kind:"message",id:i.id,from:i.from,to:i.to,title:i.title,style:i.style,tags:i.tags,guard:i.guard??null,detail:i.detail??null,questions:i.questions??null}}return re(t,i.id,"fragment"),{kind:"fragment",id:i.id,operator:i.operator,title:i.title,collapsed:i.collapsed,branches:i.branches.map(s=>({label:s.label,items:De(s.items,e,t)}))}}),Oe=r=>{const e=V(Qt,r),t=new Set;for(const a of e.participants)re(t,a.id,"participant");return{participants:e.participants.map(a=>({id:a.id,name:a.name,role:a.role??null,symbol:a.symbol??null,external:a.kind==="external",description:a.description??null,questions:a.questions??null})),items:De(e.items,t,new Set)}},_t=()=>({participants:[],items:[]}),Fe=(r,e)=>{for(const t of r)if(t.kind==="message")e.push(t);else for(const a of t.branches)Fe(a.items,e)},R=r=>{const e=[];return Fe(r,e),e},Gt=r=>new Map(R(r.items).map((e,t)=>[e.id,String(t+1).padStart(2,"0")])),ea=r=>R(r).length,Pe=(r,e)=>{const t=[];for(const a of r){if(a.kind==="message"){e(a)&&t.push(a);continue}const i=a.branches.map(s=>({label:s.label,items:Pe(s.items,e)})).filter(s=>s.items.length>0);i.length>0&&t.push({...a,branches:i})}return t},ta=64,aa=86,sa=31,ra=32,ia=40,na=(r,e)=>{const t=Pe(r.items,e),a=new Set;for(const b of R(t))a.add(b.from),a.add(b.to);const i=r.participants.filter(b=>a.has(b.id)),s=new Map(i.map((b,f)=>[b.id,120+f*je])),n=Math.max(360,i.length*je),o=[],d=[],c=[],m=[],y=[];let l=25;const x=(b,f)=>{for(const w of b){if(w.kind==="message"){o.push({message:w,y:l+29,depth:f}),l+=w.from===w.to?aa:ta;continue}const M=22+f*13,z=l,D=n-44-f*26;l+=sa,w.collapsed?(y.push({fragment:w,x:M,y:l+6}),l+=ia):w.branches.forEach((A,B)=>{B>0&&(m.push({x:M,y:l,width:D}),l+=8),c.push({label:A.label,x:M+12,y:l}),l+=ra,x(A.items,f+1),l+=8}),d.push({fragment:w,x:M,y:z,width:D,height:l-z,count:ea([w])}),l+=14}};return x(t,0),{width:n,height:l+24,participants:i,rows:o,frames:d,branches:c,dividers:m,folds:y,x:s}},oa=U`
  .sequence .diagram-canvas {
    background-image: none;
  }

  .sequence-rail {
    position: relative;
    height: 62px;
    flex-shrink: 0;
    overflow: hidden;
    border-bottom: 1px solid var(--af-rule);
    background: var(--af-paper);
  }

  .sequence-rail-world {
    position: absolute;
    top: 0;
    left: 0;
    height: 62px;
    transform-origin: 0 0;
  }

  .sequence-participant {
    position: absolute;
    top: 9px;
    width: 190px;
    height: 44px;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 6px 10px;
    border: 1px solid var(--af-rule-strong);
    border-radius: var(--af-radius-sm);
    background: var(--af-paper-raised);
    box-shadow: var(--af-shadow-xs);
    text-align: left;
    cursor: pointer;
  }

  .sequence-participant.is-external {
    border-style: dashed;
  }

  .sequence-participant[aria-pressed='true'] {
    border-color: var(--af-blue);
    box-shadow: 0 0 0 3px var(--af-blue-soft);
  }

  .sequence-participant.is-related {
    border-color: color-mix(in srgb, var(--af-green) 60%, transparent);
  }

  .sequence-symbol {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: var(--af-radius-xs);
    background: var(--af-paper-inset);
    color: var(--af-ink-faint);
    font-family: var(--af-mono);
    font-size: 9.5px;
  }

  .sequence-participant.is-external .sequence-symbol {
    background: var(--af-amber-soft);
    color: var(--af-amber);
  }

  .sequence-name {
    display: block;
    font-size: 11.5px;
    font-weight: 640;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sequence-role {
    display: block;
    margin-top: 2px;
    font-size: 9px;
    color: var(--af-ink-faint);
  }

  .sequence-lifeline {
    stroke: var(--af-rule-strong);
    stroke-width: 1;
    stroke-dasharray: 4 6;
  }

  .sequence-divider {
    stroke: var(--af-rule-strong);
    stroke-dasharray: 4 4;
  }

  .sequence-message {
    fill: none;
    stroke: var(--af-ink-faint);
    stroke-width: 1.5;
    stroke-linejoin: round;
  }

  .sequence-message.is-response {
    stroke-dasharray: 5 4;
  }

  .sequence-message.is-async {
    stroke: var(--af-blue);
  }

  .sequence-message-row.is-related .sequence-message {
    stroke: var(--af-green);
    stroke-width: 2;
  }

  .sequence-message-row.is-selected .sequence-message {
    stroke: var(--af-ink);
    stroke-width: 2.4;
  }

  .sequence-message-row.is-dimmed,
  .sequence-label.is-dimmed {
    opacity: 0.24;
  }

  .sequence-frame {
    position: absolute;
    border: 1px solid var(--af-rule-strong);
    border-radius: var(--af-radius-xs);
    background: color-mix(in srgb, var(--af-blue-soft) 50%, transparent);
    pointer-events: none;
  }

  .sequence-frame-header {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 5px 9px;
    border: 1px solid var(--af-rule-strong);
    border-bottom: 0;
    border-radius: var(--af-radius-xs) var(--af-radius-xs) 0 0;
    background: var(--af-paper-sunken);
    color: var(--af-ink-soft);
    font-size: 10px;
    text-align: left;
    cursor: pointer;
  }

  .sequence-frame-header:hover {
    background: var(--af-paper-inset);
    color: var(--af-ink);
  }

  .sequence-operator {
    min-width: 26px;
    font-family: var(--af-mono);
    font-weight: 700;
    color: var(--af-blue);
  }

  .sequence-frame-count {
    margin-left: auto;
    font-family: var(--af-mono);
    font-size: 9px;
    color: var(--af-ink-faint);
  }

  .sequence-branch {
    position: absolute;
    font-size: 9.5px;
    color: var(--af-ink-faint);
  }

  .sequence-fold {
    position: absolute;
    font-size: 10px;
    color: var(--af-ink-faint);
  }

  .sequence-label {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 6px;
    max-height: 27px;
    padding: 3px 5px;
    border: 1px solid transparent;
    border-radius: var(--af-radius-xs);
    background: var(--af-paper-raised);
    color: var(--af-ink-soft);
    font-size: 10px;
    text-align: left;
    cursor: pointer;
  }

  .sequence-label:hover {
    border-color: color-mix(in srgb, var(--af-blue) 40%, transparent);
    color: var(--af-blue);
  }

  .sequence-label.is-selected {
    border-color: color-mix(in srgb, var(--af-blue) 55%, transparent);
    background: var(--af-blue-soft);
    color: var(--af-blue);
  }

  .sequence-number {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 19px;
    height: 17px;
    border: 1px solid var(--af-rule-strong);
    border-radius: 3px;
    font-family: var(--af-mono);
    font-size: 8px;
    font-variant-numeric: tabular-nums;
    color: var(--af-ink-faint);
  }

  .sequence-text {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  #seq-request .diagram-arrow,
  #seq-response .diagram-arrow {
    fill: var(--af-ink-faint);
    stroke: var(--af-ink-faint);
  }

  #seq-async .diagram-arrow {
    stroke: var(--af-blue);
  }

  #seq-related .diagram-arrow {
    fill: var(--af-green);
    stroke: var(--af-green);
  }

  #seq-selected .diagram-arrow {
    fill: var(--af-ink);
    stroke: var(--af-ink);
  }
`,da=[{id:"seq-request"},{id:"seq-response"},{id:"seq-async"},{id:"seq-related"},{id:"seq-selected"}],la={request:"\u51E6\u7406 / \u4FDD\u8A3C",response:"\u5FDC\u7B54 / \u4FDD\u8A3C",async:"\u975E\u540C\u671F\u51E6\u7406 / \u4FDD\u8A3C"};class Ae extends Me{static{this.styles=[I,oa]}#e=null;#s=new Map;#t=new Map;#a=new Set;#r=new Set;#i="";#n=0;parseData(e){return this.#t.clear(),Oe(e)}emptyData(){return _t()}defaultHeading(){return"Sequence"}shellClass(){return"sequence"}emptyMessage(){return"\u8A72\u5F53\u3059\u308B\u30E1\u30C3\u30BB\u30FC\u30B8\u306F\u3042\u308A\u307E\u305B\u3093\u3002"}fitViewport(){this.viewport?.fitWidth()}onViewChange(e){const t=this.renderRoot.querySelector(".sequence-rail-world");t&&(t.style.transform=`translateX(${e.x}px) scale(${e.scale})`)}hasSelection(e){const t=this.items();return e.kind==="participant"?t.participants.some(a=>a.id===e.id):R(t.items).some(a=>a.id===e.id)}tagItems(){return R(this.items().items).map(e=>e.tags)}statsText(){const e=this.#e,t=R(this.items().items).length;return e===null?"":`${e.rows.length} / ${t} \u30E1\u30C3\u30BB\u30FC\u30B8`}contentSize(){const e=this.#e;return e===null||e.rows.length===0?null:{width:e.width,height:e.height}}isEmpty(){return this.contentSize()===null}layoutVersion(){return this.#n}detailsFor(e){const t=this.#e;if(e===null||t===null)return null;const a=this.items().participants;if(e.kind==="participant"){const n=a.find(c=>c.id===e.id);if(!n)return null;const o=t.rows.filter(c=>c.message.from===n.id).length,d=t.rows.filter(c=>c.message.to===n.id).length;return{eyebrow:`PARTICIPANT \xB7 ${n.role??"\u5F79\u5272\u672A\u8A2D\u5B9A"}`,title:n.name,fields:[...n.description===null?[]:[C("\u8CAC\u52D9",n.description)],C("\u8868\u793A\u4E2D\u306E\u901A\u4FE1",`\u9001\u4FE1 ${o} / \u53D7\u4FE1 ${d}`)]}}const i=t.rows.find(n=>n.message.id===e.id);if(!i)return null;const s=n=>a.find(o=>o.id===n)?.name??n;return{eyebrow:`${this.#s.get(i.message.id)??""} \xB7 ${s(i.message.from)} \u2192 ${s(i.message.to)}`,title:i.message.title,fields:[...i.message.guard===null?[]:[C("\u5B9F\u884C\u6761\u4EF6",i.message.guard)],...i.message.detail===null?[]:[C(la[i.message.style],i.message.detail)],C("\u30BF\u30B0",i.message.tags.join(" / ")||"\u306A\u3057")]}}refreshContent(){const e=this.#o(),t=this.tagFilter,a=[t.match,[...t.active].join(","),[...this.#t].map(([n,o])=>`${n}:${o}`).join(","),R(e.items).map(n=>n.id).join(",")].join("|");a!==this.#i&&(this.#i=a,this.#n+=1,this.#s=Gt(this.items()),this.#e=na(e,n=>J(n.tags,t))),this.#a=new Set,this.#r=new Set;const i=this.selection,s=this.#e;if(i!==null&&s!==null)if(i.kind==="message"){const n=s.rows.find(o=>o.message.id===i.id);this.#a.add(i.id),n&&(this.#r.add(n.message.from),this.#r.add(n.message.to))}else for(const n of s.rows)n.message.from!==i.id&&n.message.to!==i.id||this.#a.add(n.message.id)}#o(){const e=this.items(),t=a=>a.map(i=>i.kind==="message"?i:{...i,collapsed:this.#t.get(i.id)??i.collapsed,branches:i.branches.map(s=>({label:s.label,items:t(s.items)}))});return{participants:e.participants,items:t(e.items)}}#l(e){return this.#e?.frames.find(t=>t.fragment.id===e.id)?.fragment.collapsed??e.collapsed}#p(e){this.#t.set(e.id,!this.#l(e)),this.requestUpdate()}#d(e){const t=this.selection?.kind==="message"&&this.selection.id===e,a=!t&&this.#a.has(e);return{selected:t,related:a,dimmed:this.selection!==null&&!t&&!a,depth:null}}#c(e){const t=this.selection?.kind==="participant"&&this.selection.id===e,a=!t&&this.#r.has(e);return{selected:t,related:a,dimmed:this.selection!==null&&!t&&!a,depth:null}}renderAboveCanvas(){const e=this.#e;return e===null?S:h`
      <div class="sequence-rail" role="group" aria-label="参加者">
        <div class="sequence-rail-world">
          ${e.participants.map(t=>this.#u(t,e))}
        </div>
      </div>
    `}#u(e,t){const a=t.x.get(e.id)??0,i=this.#c(e.id);return h`
      <button
        type="button"
        class=${this.elementClass(i,"sequence-participant",e.external&&"is-external")}
        data-participant=${e.id}
        data-grill-questions=${this.questionsOf(e)}
        style="left:${a-95}px"
        aria-pressed=${i.selected?"true":"false"}
        title=${e.description??e.name}
        @click=${()=>this.select({kind:"participant",id:e.id})}
      >
        <span class="sequence-symbol" aria-hidden="true">${e.symbol??e.name.slice(0,2)}</span>
        <span>
          <span class="sequence-name">${e.name}</span>
          ${e.role===null?S:h`<span class="sequence-role">${e.role}</span>`}
        </span>
      </button>
    `}renderCanvas(){const e=this.#e;return e===null?h``:h`
      ${this.#h(e)}
      ${e.frames.map(t=>h`<div
          class="sequence-frame"
          style="left:${t.x}px; top:${t.y}px; width:${t.width}px; height:${t.height}px"
        ></div>`)}
      ${e.frames.map(t=>this.#f(t.fragment,t.x,t.y,t.width,t.count))}
      ${e.branches.map(t=>h`<span class="sequence-branch" style="left:${t.x}px; top:${t.y}px"
          >[${t.label}]</span
        >`)}
      ${e.folds.map(t=>h`<span class="sequence-fold" style="left:${t.x}px; top:${t.y}px"
          >${t.fragment.branches.map(a=>`[${a.label}]`).join(" / ")}</span
        >`)}
      ${e.rows.map(t=>this.#g(t.y,t.message,e))}
    `}#h(e){const t=e.participants.map(s=>ee`<path
          class="sequence-lifeline"
          d=${`M${e.x.get(s.id)??0} 0 V${e.height}`}
        ></path>`),a=e.dividers.map(s=>ee`<path class="sequence-divider" d=${`M${s.x} ${s.y} h${s.width}`}></path>`),i=e.rows.map(s=>{const n=e.x.get(s.message.from)??0,o=e.x.get(s.message.to)??0,d=n===o?`M${n} ${s.y} h42 v25 H${n}`:`M${n} ${s.y} H${o}`,c=this.#d(s.message.id),m=c.selected?"seq-selected":c.related?"seq-related":s.message.style==="async"?"seq-async":s.message.style==="response"?"seq-response":"seq-request",y=()=>this.select({kind:"message",id:s.message.id});return ee`
        <g
          class=${this.elementClass(c,"sequence-message-row","d-edge",`is-${s.message.style}`)}
          data-message=${s.message.id}
        >
          <title>${s.message.guard??s.message.title}</title>
          <path class="d-edge-hit" d=${d} role="button" tabindex="0"
            aria-label=${`${s.message.title}\u3002\u8A73\u7D30\u3092\u8868\u793A`}
            @click=${y}
            @keydown=${l=>{l.key!=="Enter"&&l.key!==" "||(l.preventDefault(),y())}}></path>
          <path class="sequence-message is-${s.message.style}" d=${d} marker-end=${`url(#${m})`}></path>
        </g>
      `});return h`<svg class="diagram-edges" width=${e.width} height=${e.height}>
      ${$e(da)} ${t} ${a} ${i}
    </svg>`}#f(e,t,a,i,s){const n=this.#l(e);return h`
      <button
        type="button"
        class="sequence-frame-header"
        data-fragment=${e.id}
        style="left:${t}px; top:${a}px; width:${i}px"
        aria-expanded=${n?"false":"true"}
        aria-label=${`${e.operator} \xB7 ${e.title}\u3092${n?"\u5C55\u958B":"\u6298\u308A\u305F\u305F\u3080"}`}
        @click=${()=>this.#p(e)}
      >
        <span aria-hidden="true">${n?"\u25B8":"\u25BE"}</span>
        <span class="sequence-operator">${e.operator}</span>
        <span class="sequence-text">${e.title}</span>
        <span class="sequence-frame-count">${s} メッセージ</span>
      </button>
    `}#g(e,t,a){const i=a.x.get(t.from)??0,s=a.x.get(t.to)??0,n=i===s,o=this.#d(t.id),d=n?i+12:Math.min(i,s)+14,c=n?175:Math.abs(s-i)-28;return h`
      <button
        type="button"
        class=${this.elementClass(o,"sequence-label")}
        data-message-label=${t.id}
        data-grill-questions=${this.questionsOf(t)}
        style="left:${d}px; top:${e-28}px; width:${c}px"
        title=${t.guard??t.title}
        @click=${()=>this.select({kind:"message",id:t.id})}
      >
        <span class="sequence-number">${this.#s.get(t.id)??""}</span>
        <span class="sequence-text">${t.title}</span>
      </button>
    `}}const Te="artifact-sequence-diagram",Re=(r=Te)=>{customElements.get(r)||customElements.define(r,Ae)},Ue={width:176,height:84},ca=E({id:k(u(),$(1)),name:k(u(),$(1)),path:g(u()),layer:g(u()),tags:g(j(u()),[]),description:g(u()),questions:g(u())}),pa=E({id:k(u(),$(1)),from:k(u(),$(1)),to:k(u(),$(1)),contract:g(u()),description:g(u()),questions:g(u())}),ua=E({modules:j(ca),dependencies:g(j(pa),[])}),ha=()=>({nodes:[],edges:[]}),fa=r=>{const e=V(ua,r),t=new Set;for(const s of e.modules){if(t.has(s.id))throw new Error(`duplicate module id: ${s.id}`);t.add(s.id)}const a=new Set,i=e.dependencies.map(s=>{if(a.has(s.id))throw new Error(`duplicate dependency id: ${s.id}`);if(a.add(s.id),!t.has(s.from))throw new Error(`unknown dependency source: ${s.from}`);if(!t.has(s.to))throw new Error(`unknown dependency target: ${s.to}`);return{id:s.id,from:s.from,to:s.to,tags:[],contract:s.contract??null,description:s.description??null}});return{nodes:e.modules.map(s=>({id:s.id,name:s.name,path:s.path??null,layer:s.layer??null,description:s.description??null,tags:s.tags,width:Ue.width,height:Ue.height,...s.questions===void 0?{}:{questions:s.questions}})),edges:i}},ga=U`
  .dep-direction {
    display: flex;
    gap: 1px;
    padding: 2px;
    border: 1px solid var(--af-rule-strong);
    border-radius: var(--af-radius-xs);
  }

  .dep-direction button {
    border: 0;
    border-radius: 3px;
    padding: 3px 7px;
    background: transparent;
    color: var(--af-ink-faint);
    font-size: 9.5px;
    cursor: pointer;
  }

  .dep-direction button[aria-pressed='true'] {
    background: var(--af-blue-soft);
    color: var(--af-blue);
    font-weight: 650;
  }

  .dep-toggle {
    min-height: 26px;
    padding: 0 8px;
    font-size: 10.5px;
  }

  .dep-toggle[aria-pressed='true'] {
    border-color: color-mix(in srgb, var(--af-blue) 40%, transparent);
    background: var(--af-blue-soft);
    color: var(--af-blue);
  }

  .dep-module {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 11px 12px;
    border: 1px solid var(--af-rule-strong);
    border-radius: var(--af-radius-sm);
    background: var(--af-paper-raised);
    box-shadow: var(--af-shadow-xs);
    text-align: left;
    overflow: hidden;
  }

  .dep-module:hover {
    border-color: var(--af-blue);
  }

  .dep-module.is-cyclic:not(.is-selected) {
    border-color: color-mix(in srgb, var(--af-amber) 55%, transparent);
  }

  .dep-module.is-selected {
    border-color: var(--af-blue);
    background: var(--af-blue-soft);
    box-shadow: 0 0 0 3px var(--af-blue-soft);
  }

  .dep-module.is-related {
    border-color: color-mix(in srgb, var(--af-green) 55%, transparent);
    background: var(--af-green-soft);
  }

  .dep-module.is-dependency {
    border-color: color-mix(in srgb, #6e9b61 60%, transparent);
    background: color-mix(in srgb, #6e9b61 8%, transparent);
  }

  .dep-module.is-dependent {
    border-color: color-mix(in srgb, #729aaa 60%, transparent);
    background: color-mix(in srgb, #729aaa 8%, transparent);
  }

  .dep-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    min-height: 14px;
  }

  .dep-layer {
    font-size: 9px;
    color: var(--af-ink-faint);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dep-cycle-badge {
    flex-shrink: 0;
    padding: 1px 4px;
    border-radius: 3px;
    background: var(--af-amber-soft);
    color: var(--af-amber);
    font-size: 8.5px;
  }

  .dep-name {
    font-size: 13px;
    font-weight: 640;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dep-path {
    font-family: var(--af-mono);
    font-size: 9px;
    color: var(--af-ink-faint);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dep-edge .d-edge-path {
    stroke: var(--af-rule-strong);
    stroke-width: 1.4;
  }

  .dep-edge.is-related .d-edge-path {
    stroke: var(--af-green);
    stroke-width: 2;
  }

  .dep-edge.is-selected .d-edge-path {
    stroke: var(--af-blue);
    stroke-width: 2.6;
  }

  .dep-edge:focus-visible .d-edge-path {
    stroke: var(--af-blue);
  }

  .diagram-legend .dep-swatch-outgoing {
    border-color: #6e9b61;
  }

  .diagram-legend .dep-swatch-incoming {
    border-color: #729aaa;
  }

  .diagram-legend .dep-swatch-cycle {
    border-color: var(--af-amber);
  }

  #dep-neutral .diagram-arrow {
    fill: var(--af-rule-strong);
    stroke: var(--af-rule-strong);
  }

  #dep-outgoing .diagram-arrow {
    fill: #6e9b61;
    stroke: #6e9b61;
  }

  #dep-incoming .diagram-arrow {
    fill: #729aaa;
    stroke: #729aaa;
  }

  #dep-cycle .diagram-arrow {
    fill: var(--af-amber);
    stroke: var(--af-amber);
  }

  #dep-selected .diagram-arrow {
    fill: var(--af-blue);
    stroke: var(--af-blue);
  }
`,ma=[{id:"dep-neutral"},{id:"dep-outgoing"},{id:"dep-incoming"},{id:"dep-cycle"},{id:"dep-selected"}];class Ve extends Z{static{this.styles=[I,ga]}#e="both";#s=!1;#t=!1;#a=[];#r=F;#i=F;parseData(e){return fa(e)}emptyData(){return ha()}defaultHeading(){return"Dependencies"}statsLabels(){return{node:"\u30E2\u30B8\u30E5\u30FC\u30EB",edge:"\u4F9D\u5B58"}}emptyMessage(){return this.#t?"\u8A72\u5F53\u3059\u308B\u5FAA\u74B0\u4F9D\u5B58\u306F\u3042\u308A\u307E\u305B\u3093\u3002":"\u8A72\u5F53\u3059\u308B\u30E2\u30B8\u30E5\u30FC\u30EB\u306F\u3042\u308A\u307E\u305B\u3093\u3002"}layoutOptions(){return{nodeSpacing:40,layerSpacing:96,padding:32}}relations(e,t){return e===null||e.kind!=="node"?F:{nodes:new Map([...this.#r.nodes,...this.#i.nodes]),edges:new Set([...this.#r.edges,...this.#i.edges])}}refreshContent(){const e=this.items(),t=this.tagFilter,a=e.nodes.filter(o=>J(o.tags,t)),i=new Set(a.map(o=>o.id)),s=e.edges.filter(o=>i.has(o.from)&&i.has(o.to));this.#a=St(a.map(o=>o.id),s);const n=this.selection;this.#r=n!==null&&n.kind==="node"&&this.#e!=="incoming"?P(s,n.id,"outgoing",this.#s):F,this.#i=n!==null&&n.kind==="node"&&this.#e!=="outgoing"?P(s,n.id,"incoming",this.#s):F,super.refreshContent()}matchesFilter(e){return this.#t?te(this.#a).has(e.id):!0}filtered(){const e=super.filtered();if(!this.#t)return e;const t=te(this.#a),a=e.edges.filter(s=>ye(s,t)),i=new Set(a.flatMap(s=>[s.from,s.to]));return{nodes:e.nodes.filter(s=>i.has(s.id)),edges:a}}detailsFor(e){const t=this.filtered();if(e===null)return null;if(e.kind==="edge"){const s=t.edges.find(o=>o.id===e.id);if(!s)return null;const n=o=>t.nodes.find(d=>d.id===o)?.name??o;return{eyebrow:`${n(s.from)} \u2192 ${n(s.to)}`,title:s.contract??"\u4F9D\u5B58",fields:[...s.description===null?[]:[C("\u53C2\u7167\u3059\u308B\u7406\u7531",s.description)],C("\u53C2\u7167\u5143",t.nodes.find(o=>o.id===s.from)?.path??s.from),C("\u53C2\u7167\u5148",t.nodes.find(o=>o.id===s.to)?.path??s.to)]}}const a=t.nodes.find(s=>s.id===e.id);if(!a)return null;const i=s=>[...s.nodes].map(([n,o])=>({label:`${t.nodes.find(d=>d.id===n)?.name??n}${o>1?` \xB7 ${o}\u6BB5`:""}`,select:()=>{this.select({kind:"node",id:n}),this.renderRoot.querySelector(`[data-module="${n}"]`)?.focus({preventScroll:!0})}}));return{eyebrow:a.path??a.id,title:a.name,fields:[...a.description===null?[]:[C("\u8CAC\u52D9",a.description)],H(`\u4F9D\u5B58\u5148\uFF08${this.#s?"\u9593\u63A5\u3092\u542B\u3080":"\u76F4\u63A5"}\uFF09`,i(this.#r)),H("\u4F9D\u5B58\u5143\uFF08\u5909\u66F4\u306E\u5F71\u97FF\u5019\u88DC\uFF09",i(this.#i))]}}renderToolbarActions(){const e=this.#a.length;return h`
      <div class="dep-direction" role="group" aria-label="選択したモジュールから追う方向">
        ${[["outgoing","\u4F9D\u5B58\u5148"],["incoming","\u4F9D\u5B58\u5143"],["both","\u4E21\u65B9"]].map(([t,a])=>h`
            <button
              type="button"
              data-direction=${t}
              aria-pressed=${this.#e===t?"true":"false"}
              @click=${()=>this.#n(t)}
            >
              ${a}
            </button>
          `)}
      </div>
      <button
        type="button"
        class="af-btn af-btn--ghost dep-toggle"
        data-toggle="transitive"
        aria-pressed=${this.#s?"true":"false"}
        @click=${()=>{this.#s=!this.#s,this.requestUpdate()}}
      >
        間接も含む
      </button>
      <button
        type="button"
        class="af-btn af-btn--ghost dep-toggle"
        data-toggle="cycles"
        aria-pressed=${this.#t?"true":"false"}
        aria-label=${`\u5FAA\u74B0\u4F9D\u5B58 ${e} \u30B0\u30EB\u30FC\u30D7\u3060\u3051\u8868\u793A`}
        ?disabled=${!this.#t&&e===0}
        @click=${()=>{this.#t=!this.#t,this.requestUpdate()}}
      >
        循環 ${e}
      </button>
    `}renderLegend(){return h`<div class="diagram-legend">
      <span><i class="dep-swatch-outgoing"></i>依存先</span>
      <span><i class="dep-swatch-incoming"></i>依存元</span>
      <span><i class="dep-swatch-cycle"></i>循環</span>
    </div>`}#n(e){this.#e=e,this.requestUpdate()}#o(e,t){const a=this.selection;return a!==null&&a.kind==="edge"&&a.id===e.id?"dep-selected":ye(e,t)?"dep-cycle":this.#r.edges.has(e.id)?"dep-outgoing":this.#i.edges.has(e.id)?"dep-incoming":"dep-neutral"}renderCanvas(){const e=this.visible,t=te(this.#a),a=e.edges.map(s=>{const n=this.edgeState(s.id),o=N(this.routeOf(s.id)),d=()=>this.select({kind:"edge",id:s.id});return h`
        <g class=${this.elementClass(n,"d-edge","dep-edge")} data-dependency=${s.id}>
          <title>${s.contract??s.description??s.id}</title>
          <path class="d-edge-path" d=${o} marker-end=${`url(#${this.#o(s,t)})`}></path>
          <path
            class="d-edge-hit"
            d=${o}
            role="button"
            tabindex="0"
            aria-label=${`${e.nodes.find(c=>c.id===s.from)?.name??s.from} \u304C ${e.nodes.find(c=>c.id===s.to)?.name??s.to} \u306B\u4F9D\u5B58`}
            @click=${d}
            @keydown=${c=>{c.key!=="Enter"&&c.key!==" "||(c.preventDefault(),d())}}
          ></path>
        </g>
      `}),i=e.nodes.map(s=>{const n=this.placedNode(s.id);if(!n)return S;const o=this.nodeState(s.id),d=t.has(s.id),c=this.#r.nodes.has(s.id),m=this.#i.nodes.has(s.id);return h`
        <button
          type="button"
          class=${this.elementClass(o,"d-node","dep-module",d&&"is-cyclic",c&&"is-dependency",m&&"is-dependent")}
          data-module=${s.id}
          data-grill-questions=${this.questionsOf(s)}
          style="left:${n.x}px; top:${n.y}px; width:${s.width}px; height:${s.height}px"
          aria-pressed=${o.selected?"true":"false"}
          aria-label=${`${s.name}${d?"\u30FB\u5FAA\u74B0\u4F9D\u5B58\u3042\u308A":""}`}
          title=${s.path??s.name}
          @click=${()=>this.select({kind:"node",id:s.id})}
        >
          <span class="dep-head">
            <span class="dep-layer">${s.layer??""}</span>
            ${d?h`<span class="dep-cycle-badge">循環</span>`:S}
          </span>
          <span class="dep-name">${s.name}</span>
          <span class="dep-path">${s.path??""}</span>
        </button>
      `});return h`${this.renderEdges(a,ma)}${i}`}}const Ie="artifact-dependency-graph",He=(r=Ie)=>{customElements.get(r)||customElements.define(r,Ve)},Ne=276,ie=74,ba=28,xa=44,va=E({id:k(u(),$(1)),type:k(u(),$(1)),key:g(T(["PK","FK","UQ"])),ref:g(u()),nullable:g(ue(),!1),questions:g(u())}),wa=E({id:k(u(),$(1)),name:k(u(),$(1)),tags:g(j(u()),[]),fields:j(va),questions:g(u())}),Be=E({tables:j(wa)}),ya=E({before:g(Be),after:Be}),ka=()=>({nodes:[],edges:[]}),Xe=r=>({id:r.id,type:r.type,key:r.key??null,ref:r.ref??null,nullable:r.nullable,questions:r.questions??null}),Ye=(r,e)=>r.type===e.type&&r.key===e.key&&r.ref===e.ref&&r.nullable===e.nullable,Q=r=>r.status==="changed"?xa:ba,Ke=r=>ie+r.reduce((e,t)=>e+Q(t),0),We=(r,e)=>{let t=ie;for(const a of r){if(a.id===e)return t+Q(a)/2;t+=Q(a)}return ie/2},Je=r=>r.flatMap(e=>e.fields.flatMap(t=>{if(t.ref===void 0)return[];const[a,i]=t.ref.split(".");if(a===void 0||i===void 0)throw new Error(`invalid ref "${t.ref}" on ${e.id}.${t.id}; expected table.field`);return[{id:`${a}:${i}>${e.id}:${t.id}`,from:a,to:e.id,sourceField:i,targetField:t.id}]})),$a=(r,e)=>[...new Set([...r,...e].map(t=>t.id))].flatMap(t=>{const a=r.find(d=>d.id===t),i=e.find(d=>d.id===t),s=i??a;if(!s)return[];const n=Xe(s);if(!a)return[{...n,status:"added",before:null}];if(!i)return[{...n,status:"removed",before:null}];const o=Xe(a);return[{...n,status:Ye(o,n)?"same":"changed",before:Ye(o,n)?null:o}]}),qa=r=>{const e=V(ya,r),t=e.before?.tables??e.after.tables,a=e.after.tables,i=[...new Set([...t,...a].map(l=>l.id))],s=new Map;for(const l of[...t,...a])s.set(l.id,l.tags);const n=i.flatMap(l=>{const x=t.find(z=>z.id===l),b=a.find(z=>z.id===l),f=b??x;if(!f)return[];const w=$a(x?.fields??[],b?.fields??[]),M=x?b?w.some(z=>z.status!=="same")?"changed":"same":"removed":"added";return[{id:l,name:f.name,status:M,fields:w,tags:s.get(l)??[],width:Ne,height:Ke(w),...f.questions===void 0?{}:{questions:f.questions}}]}),o=new Map(n.map(l=>[l.id,l])),d=Je(t),c=Je(a),m=[...new Set([...d,...c].map(l=>l.id))].flatMap(l=>{const x=d.find(D=>D.id===l),b=c.find(D=>D.id===l),f=b??x;if(!f)return[];const w=o.get(f.from),M=o.get(f.to);if(!w||!M)return[];const z=x?b?"same":"removed":"added";return[{id:l,from:f.from,to:f.to,sourceField:f.sourceField,targetField:f.targetField,status:z,tags:[],fromPort:`${l}:out`,toPort:`${l}:in`}]}),y=l=>{const x={},b={};for(const f of m)f.from===l.id&&(x[`${f.id}:out`]={x:Ne,y:We(l.fields,f.sourceField)}),f.to===l.id&&(b[`${f.id}:in`]={x:0,y:We(l.fields,f.targetField)});return{out:x,in:b}};return{nodes:n.map(l=>{const x=y(l);return{...l,ports:{...x.out,...x.in}}}),edges:m}},Ma=U`
  .er-search {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .er-search .af-input {
    width: 150px;
    min-height: 26px;
    font-size: 11px;
  }

  .er-table {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--af-rule-strong);
    border-radius: var(--af-radius-sm);
    background: var(--af-paper-raised);
    box-shadow: var(--af-shadow-xs);
    overflow: hidden;
    cursor: default;
  }

  .er-table.is-added {
    border-color: color-mix(in srgb, var(--af-green) 55%, transparent);
  }

  .er-table.is-removed {
    border-color: color-mix(in srgb, var(--af-accent) 55%, transparent);
  }

  .er-table.is-changed {
    border-color: color-mix(in srgb, var(--af-amber) 55%, transparent);
  }

  .er-table.is-selected {
    border-color: var(--af-blue);
    box-shadow: 0 0 0 3px var(--af-blue-soft);
  }

  .er-table.is-related {
    border-color: color-mix(in srgb, var(--af-green) 50%, transparent);
  }

  .er-head {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    grid-template-areas:
      'mark name status'
      'mark label status';
    align-items: center;
    gap: 1px 8px;
    width: 100%;
    min-height: 42px;
    padding: 7px 11px;
    border: 0;
    border-bottom: 1px solid var(--af-rule);
    border-radius: 0;
    background: var(--af-paper);
    text-align: left;
    cursor: pointer;
  }

  .er-head:hover {
    background: var(--af-paper-sunken);
  }

  .er-mark {
    grid-area: mark;
    display: grid;
    place-items: center;
    width: 16px;
    height: 16px;
    border-radius: 3px;
    font-family: var(--af-mono);
    font-size: 10px;
  }

  .er-table.is-added .er-mark {
    background: var(--af-green-soft);
    color: var(--af-green);
  }

  .er-table.is-removed .er-mark {
    background: var(--af-accent-soft);
    color: var(--af-accent);
  }

  .er-table.is-changed .er-mark {
    background: var(--af-amber-soft);
    color: var(--af-amber);
  }

  .er-name {
    grid-area: name;
    font-family: var(--af-mono);
    font-size: 12px;
    font-weight: 640;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .er-label {
    grid-area: label;
    font-size: 9.5px;
    color: var(--af-ink-faint);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .er-status {
    grid-area: status;
    font-size: 8.5px;
    text-align: right;
  }

  .er-fields {
    display: flex;
    flex-direction: column;
  }

  .er-field {
    display: grid;
    grid-template-columns: 14px 26px minmax(0, 1fr) auto;
    align-items: center;
    gap: 6px;
    padding: 0 10px;
    border-bottom: 1px solid var(--af-rule);
    font-size: 10.5px;
  }

  .er-field:last-child {
    border-bottom: 0;
  }

  .er-field.is-added {
    background: color-mix(in srgb, var(--af-green) 7%, transparent);
  }

  .er-field.is-removed {
    background: color-mix(in srgb, var(--af-accent) 7%, transparent);
    text-decoration: line-through;
    color: var(--af-ink-faint);
  }

  .er-field.is-changed {
    background: color-mix(in srgb, var(--af-amber) 7%, transparent);
  }

  .er-field.is-match {
    box-shadow: inset 2px 0 0 var(--af-blue);
  }

  .er-field-mark {
    font-family: var(--af-mono);
    font-size: 10px;
    text-align: center;
  }

  .er-field.is-added .er-field-mark {
    color: var(--af-green);
  }

  .er-field.is-removed .er-field-mark {
    color: var(--af-accent);
  }

  .er-field.is-changed .er-field-mark {
    color: var(--af-amber);
  }

  .er-key {
    display: grid;
    place-items: center;
    border-radius: 3px;
    background: var(--af-paper-inset);
    font-family: var(--af-mono);
    font-size: 8.5px;
    color: var(--af-ink-faint);
  }

  .er-key[data-empty='true'] {
    background: transparent;
  }

  .er-field-name {
    font-family: var(--af-mono);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .er-field-type {
    font-size: 9.5px;
    color: var(--af-ink-faint);
    white-space: nowrap;
  }

  .er-change {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-size: 9px;
    line-height: 1.6;
    white-space: nowrap;
    text-align: right;
  }

  .er-change del {
    color: var(--af-accent);
    text-decoration: line-through;
  }

  .er-change ins {
    color: var(--af-green);
    text-decoration: none;
  }

  .er-edge .d-edge-path {
    stroke-width: 1.5;
  }

  .er-edge.is-added .d-edge-path {
    stroke: var(--af-green);
  }

  .er-edge.is-removed .d-edge-path {
    stroke: var(--af-accent);
    stroke-dasharray: 5 4;
  }

  .er-edge.is-selected .d-edge-path {
    stroke: var(--af-blue);
    stroke-width: 2.6;
  }

  .er-cardinality {
    font-family: var(--af-mono);
    font-size: 10px;
    fill: var(--af-ink-faint);
    paint-order: stroke;
    stroke: var(--af-paper-raised);
    stroke-width: 4px;
  }

  .er-cardinality.is-added {
    fill: var(--af-green);
  }

  .er-cardinality.is-removed {
    fill: var(--af-accent);
  }

  .diagram-legend .er-swatch-added {
    border-color: var(--af-green);
  }

  .diagram-legend .er-swatch-removed {
    border-color: var(--af-accent);
  }

  .diagram-legend .er-swatch-changed {
    border-color: var(--af-amber);
  }

  #er-neutral .diagram-arrow {
    fill: var(--af-rule-strong);
    stroke: var(--af-rule-strong);
  }

  #er-added .diagram-arrow {
    fill: var(--af-green);
    stroke: var(--af-green);
  }

  #er-removed .diagram-arrow {
    fill: var(--af-accent);
    stroke: var(--af-accent);
  }

  #er-selected .diagram-arrow {
    fill: var(--af-blue);
    stroke: var(--af-blue);
  }
`,Sa=[{id:"er-neutral"},{id:"er-added"},{id:"er-removed"},{id:"er-selected"}],_={same:"\u5909\u66F4\u306A\u3057",added:"\u8FFD\u52A0",removed:"\u524A\u9664",changed:"\u5909\u66F4"},Ze={same:"",added:"+",removed:"\u2212",changed:"~"};class Qe extends Z{static{this.styles=[I,Ma]}#e="";parseData(e){return qa(e)}emptyData(){return ka()}defaultHeading(){return"ERD"}statsLabels(){return{node:"\u30C6\u30FC\u30D6\u30EB",edge:"\u95A2\u9023"}}emptyMessage(){return"\u8A72\u5F53\u3059\u308B\u30C6\u30FC\u30D6\u30EB\u306F\u3042\u308A\u307E\u305B\u3093\u3002"}layoutOptions(){return{nodeSpacing:38,layerSpacing:96,padding:32}}matchesFilter(e){return this.#e===""?!0:[e.id,e.name,...e.fields.map(t=>t.id)].some(t=>t.toLowerCase().includes(this.#e))}relations(e,t){if(e===null||e.kind!=="node")return F;const a=P(t.edges,e.id,"outgoing",!1),i=P(t.edges,e.id,"incoming",!1);return{nodes:new Map([...a.nodes,...i.nodes]),edges:new Set([...a.edges,...i.edges])}}detailsFor(e){const t=this.filtered();if(e===null)return null;if(e.kind==="edge"){const n=t.edges.find(o=>o.id===e.id);return n?{eyebrow:`${n.from}.${n.sourceField} \u2192 ${n.to}.${n.targetField}`,title:"1 \u2192 N",fields:[C("\u72B6\u614B",_[n.status])]}:null}const a=t.nodes.find(n=>n.id===e.id);if(!a)return null;const i=n=>a.fields.filter(o=>o.status===n).length,s=a.fields.filter(n=>n.status==="changed"&&n.before!==null).map(n=>`${n.id}: ${n.type} \u2192 ${n.type===n.before?.type?"\u540C\u4E00\u578B":n.type}`);return{eyebrow:`${a.id} \xB7 ${_[a.status]}`,title:a.name,fields:[C("\u30D5\u30A3\u30FC\u30EB\u30C9",`\u8A08 ${a.fields.length} \xB7 \u8FFD\u52A0 ${i("added")} / \u524A\u9664 ${i("removed")} / \u5909\u66F4 ${i("changed")}`),...s.length===0?[]:[C("\u5909\u66F4\u70B9",s.join(" / "))],C("\u30BF\u30B0",a.tags.join(" / ")||"\u306A\u3057")]}}renderToolbarActions(){return h`
      <label class="er-search">
        <span class="af-label">検索</span>
        <input
          class="af-input"
          type="search"
          placeholder="table / field"
          .value=${this.#e}
          @input=${e=>{const t=e.currentTarget;t instanceof HTMLInputElement&&(this.#e=t.value.trim().toLowerCase(),this.requestUpdate())}}
        />
      </label>
    `}renderLegend(){return h`<div class="diagram-legend">
      <span><i class="er-swatch-added"></i>追加</span>
      <span><i class="er-swatch-removed"></i>削除</span>
      <span><i class="er-swatch-changed"></i>変更</span>
    </div>`}#s(e){const t=this.selection;return t!==null&&t.kind==="edge"?"er-selected":e==="added"?"er-added":e==="removed"?"er-removed":"er-neutral"}renderCanvas(){const e=this.visible,t=e.edges.map(a=>{const i=this.edgeState(a.id),s=this.routeOf(a.id),n=N(s),o=()=>this.select({kind:"edge",id:a.id});return h`
        <g class=${this.elementClass(i,"d-edge","er-edge",`is-${a.status}`)} data-relation=${a.id}>
          <title>${`${a.from}.${a.sourceField} \u2192 ${a.to}.${a.targetField}`}</title>
          <path class="d-edge-path" d=${n} marker-end=${`url(#${this.#s(a.status)})`}></path>
          <path
            class="d-edge-hit"
            d=${n}
            role="button"
            tabindex="0"
            aria-label=${`${a.from} \u3068 ${a.to} \u306E\u95A2\u9023`}
            @click=${o}
            @keydown=${d=>{d.key!=="Enter"&&d.key!==" "||(d.preventDefault(),o())}}
          ></path>
          ${s.length>0?this.#t(s,a.status):S}
        </g>
      `});return h`${this.renderEdges(t,Sa)}${e.nodes.map(a=>this.#a(a))}`}#t(e,t){const a=e[0],i=e.at(-1);return!a||!i?h``:h`
      <text class="er-cardinality is-${t}" x=${a.x+9} y=${a.y-5}>1</text>
      <text class="er-cardinality is-${t}" x=${i.x-13} y=${i.y-5}>N</text>
    `}#a(e){const t=this.placedNode(e.id);if(!t)return S;const a=this.nodeState(e.id);return h`
      <div
        class=${this.elementClass(a,"d-node","er-table",`is-${e.status}`)}
        data-er-table=${e.id}
        data-grill-questions=${this.questionsOf(e)}
        style="left:${t.x}px; top:${t.y}px; width:${e.width}px; height:${Ke(e.fields)}px"
      >
        <button
          type="button"
          class="er-head"
          data-table=${e.id}
          aria-pressed=${a.selected?"true":"false"}
          title=${`${e.id} / ${e.name}`}
          @click=${()=>this.select({kind:"node",id:e.id})}
        >
          ${e.status==="same"?S:h`<span class="er-mark" aria-hidden="true">${Ze[e.status]}</span>`}
          <span class="er-name">${e.id}</span>
          <span class="er-label">${e.name}</span>
          <span class="af-label er-status">${_[e.status]}</span>
        </button>
        <div class="er-fields">${e.fields.map(i=>this.#r(i))}</div>
      </div>
    `}#r(e){const t=i=>[i.type,i.key??"\u2014",i.ref??null,i.nullable?"null\u53EF":null].filter(Boolean).join(" \xB7 "),a=this.#e!==""&&e.id.toLowerCase().includes(this.#e);return h`
      <div
        class="er-field is-${e.status} ${a?"is-match":""}"
        style="height:${Q(e)}px"
        data-grill-questions=${this.questionsOf(e)}
        title=${[_[e.status],e.id,t(e)].filter(Boolean).join(" / ")}
      >
        <span class="er-field-mark" aria-hidden="true">${Ze[e.status]}</span>
        <span class="er-key" data-empty=${e.key===null?"true":"false"}>${e.key??"\xB7"}</span>
        <span class="er-field-name">${e.id}</span>
        ${e.status==="changed"&&e.before!==null?h`<span class="er-change">
                <del>− ${t(e.before)}</del>
                <ins>+ ${t(e)}</ins>
              </span>`:h`<span class="er-field-type">${t(e)}</span>`}
      </div>
    `}}const _e="artifact-er-diagram",Ge=(r=_e)=>{customElements.get(r)||customElements.define(r,Qe)},et={width:220,height:158},G=26,za=E({src:k(u(),$(1)),alt:k(u(),$(1)),license:g(u())}),Ea=E({id:k(u(),$(1)),name:k(u(),$(1)),description:g(u()),boundary:g(u()),symbol:g(u()),tags:g(j(u()),[]),artwork:g(za),position:E({x:Y(),y:Y()}),questions:g(u())}),Ca=E({id:k(u(),$(1)),label:k(u(),$(1)),kind:g(T(["internal","external"]),"internal")}),La=E({id:k(u(),$(1)),from:k(u(),$(1)),to:k(u(),$(1)),label:g(u())}),ja=E({boundaries:g(j(Ca),[]),services:j(Ea),links:g(j(La),[])}),Da=()=>({nodes:[],edges:[],boundaries:[]}),Oa=r=>{const e=V(ja,r),t=new Set;for(const o of e.boundaries){if(t.has(o.id))throw new Error(`duplicate boundary id: ${o.id}`);t.add(o.id)}const a=new Set,i=e.services.map(o=>{if(a.has(o.id))throw new Error(`duplicate service id: ${o.id}`);if(a.add(o.id),o.boundary!==void 0&&!t.has(o.boundary))throw new Error(`unknown boundary: ${o.boundary}`);return{id:o.id,name:o.name,description:o.description??null,boundary:o.boundary??null,symbol:o.symbol??null,artwork:o.artwork?{src:o.artwork.src,alt:o.artwork.alt,license:o.artwork.license??null}:null,tags:o.tags,width:et.width,height:et.height,position:o.position,...o.questions===void 0?{}:{questions:o.questions}}}),s=new Set,n=e.links.map(o=>{if(s.has(o.id))throw new Error(`duplicate link id: ${o.id}`);if(s.add(o.id),!a.has(o.from))throw new Error(`unknown link source: ${o.from}`);if(!a.has(o.to))throw new Error(`unknown link target: ${o.to}`);return{id:o.id,from:o.from,to:o.to,label:o.label??null,tags:[]}});return{nodes:i,edges:n,boundaries:e.boundaries.map(o=>({id:o.id,label:o.label,kind:o.kind}))}},Fa=(r,e)=>e.flatMap(t=>{const a=r.filter(d=>d.boundary===t.id);if(a.length===0)return[];const i=Math.min(...a.map(d=>d.position?.x??0))-G,s=Math.min(...a.map(d=>d.position?.y??0))-G*1.6,n=Math.max(...a.map(d=>(d.position?.x??0)+d.width)),o=Math.max(...a.map(d=>(d.position?.y??0)+d.height));return[{boundary:t,x:i,y:s,width:n-i+G,height:o-s+G}]}),Pa=U`
  .arch-toggle {
    min-height: 26px;
    padding: 0 9px;
    font-size: 10.5px;
  }

  .arch-toggle[aria-pressed='true'] {
    border-color: color-mix(in srgb, var(--af-blue) 40%, transparent);
    background: var(--af-blue-soft);
    color: var(--af-blue);
  }

  .arch-boundary {
    position: absolute;
    border: 1px dashed var(--af-rule-strong);
    border-radius: var(--af-radius-lg);
    background: color-mix(in srgb, var(--af-blue) 3%, transparent);
    pointer-events: none;
  }

  .arch-boundary.is-external {
    border-color: color-mix(in srgb, var(--af-amber) 45%, transparent);
    background: color-mix(in srgb, var(--af-amber) 4%, transparent);
  }

  .arch-boundary span {
    position: absolute;
    top: 9px;
    left: 14px;
    font-family: var(--af-mono);
    font-size: 9px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--af-ink-faint);
  }

  .arch-service {
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr);
    gap: 10px;
    align-items: start;
    padding: 14px 13px;
    border: 1px solid var(--af-rule-strong);
    border-radius: var(--af-radius-sm);
    background: var(--af-paper-raised);
    box-shadow: var(--af-shadow-xs);
    text-align: left;
    overflow: hidden;
  }

  .arch-service:hover {
    border-color: var(--af-blue);
  }

  .arch-service.is-selected {
    border-color: var(--af-blue);
    box-shadow: 0 0 0 3px var(--af-blue-soft);
  }

  .arch-service.is-related {
    border-color: color-mix(in srgb, var(--af-green) 55%, transparent);
    background: var(--af-green-soft);
  }

  .arch-artwork {
    width: 38px;
    height: 38px;
    object-fit: contain;
  }

  .arch-symbol {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: var(--af-radius-xs);
    background: var(--af-paper-inset);
    color: var(--af-ink-faint);
    font-family: var(--af-mono);
    font-size: 12px;
  }

  .arch-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .arch-name {
    font-size: 13px;
    font-weight: 640;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .arch-description {
    font-size: 10px;
    line-height: 1.6;
    color: var(--af-ink-faint);
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .arch-link .d-edge-path {
    stroke: var(--af-rule-strong);
    stroke-width: 1.5;
  }

  .arch-link.is-related .d-edge-path {
    stroke: var(--af-green);
    stroke-width: 2;
  }

  .arch-link.is-selected .d-edge-path {
    stroke: var(--af-blue);
    stroke-width: 2.4;
  }

  .arch-link-label {
    font-size: 9.5px;
    fill: var(--af-ink-faint);
    paint-order: stroke;
    stroke: var(--af-paper-raised);
    stroke-width: 5px;
    stroke-linejoin: round;
  }

  #arch-neutral .diagram-arrow {
    fill: var(--af-rule-strong);
    stroke: var(--af-rule-strong);
  }

  #arch-selected .diagram-arrow {
    fill: var(--af-blue);
    stroke: var(--af-blue);
  }
`,Aa=[{id:"arch-neutral"},{id:"arch-selected"}];class tt extends Z{static{this.styles=[I,Pa]}#e=!0;parseData(e){return Oa(e)}emptyData(){return Da()}defaultHeading(){return"Architecture"}statsLabels(){return{node:"\u30B5\u30FC\u30D3\u30B9",edge:"\u63A5\u7D9A"}}emptyMessage(){return"\u8A72\u5F53\u3059\u308B\u30B5\u30FC\u30D3\u30B9\u306F\u3042\u308A\u307E\u305B\u3093\u3002"}get layoutMode(){return"fixed"}layoutOptions(){return{padding:40}}isEmpty(){return this.visible.nodes.length===0}contentSize(){const e=super.contentSize();if(e===null)return null;const t=this.#s();return t.length===0?e:{width:Math.max(e.width,...t.map(a=>a.x+a.width)),height:Math.max(e.height,...t.map(a=>a.y+a.height))}}relations(e,t){if(e===null||e.kind!=="node")return F;const a=P(t.edges,e.id,"outgoing",!1),i=P(t.edges,e.id,"incoming",!1);return{nodes:new Map([...a.nodes,...i.nodes]),edges:new Set([...a.edges,...i.edges])}}detailsFor(e){const t=this.filtered(),a=this.items().boundaries;if(e===null)return null;if(e.kind==="edge"){const d=t.edges.find(m=>m.id===e.id);if(!d)return null;const c=m=>t.nodes.find(y=>y.id===m)?.name??m;return{eyebrow:`${c(d.from)} \u2192 ${c(d.to)}`,title:d.label??"\u63A5\u7D9A",fields:[C("\u63A5\u7D9A\u5143",d.from),C("\u63A5\u7D9A\u5148",d.to)]}}const i=t.nodes.find(d=>d.id===e.id);if(!i)return null;const s=a.find(d=>d.id===i.boundary),n=i.artwork?.license??null,o=t.edges.filter(d=>d.from===i.id||d.to===i.id).map(d=>{const c=d.from===i.id?d.to:d.from;return{label:`${d.from===i.id?"\u2192":"\u2190"} ${t.nodes.find(m=>m.id===c)?.name??c}`,select:()=>this.select({kind:"node",id:c})}});return{eyebrow:s?.label??"\u5883\u754C\u306A\u3057",title:i.name,fields:[...i.description===null?[]:[C("\u8CAC\u52D9",i.description)],H("\u95A2\u4FC2",o),C("\u30BF\u30B0",i.tags.join(" / ")||"\u306A\u3057"),...n===null?[]:[C("\u30A2\u30A4\u30B3\u30F3\u51FA\u5178",n)]]}}renderToolbarActions(){return h`
      <button
        type="button"
        class="af-btn af-btn--ghost arch-toggle"
        data-toggle="boundaries"
        aria-pressed=${this.#e?"true":"false"}
        @click=${()=>{this.#e=!this.#e,this.requestUpdate()}}
      >
        境界
      </button>
    `}#s(){const e=this.visible.nodes.flatMap(t=>{const a=this.placedNode(t.id);return a?[{...t,position:{x:a.x,y:a.y}}]:[]});return Fa(e,this.items().boundaries)}renderCanvas(){const e=this.visible,t=e.edges.map(a=>{const i=this.edgeState(a.id),s=N(this.routeOf(a.id)),n=()=>this.select({kind:"edge",id:a.id});return h`
        <g class=${this.elementClass(i,"d-edge","arch-link")} data-link=${a.id}>
          <title>${a.label??a.id}</title>
          <path
            class="d-edge-path"
            d=${s}
            marker-end=${`url(#${i.selected?"arch-selected":"arch-neutral"})`}
          ></path>
          <path
            class="d-edge-hit"
            d=${s}
            role="button"
            tabindex="0"
            aria-label=${`${e.nodes.find(o=>o.id===a.from)?.name??a.from} \u304B\u3089 ${e.nodes.find(o=>o.id===a.to)?.name??a.to} \u3078\u306E\u63A5\u7D9A`}
            @click=${n}
            @keydown=${o=>{o.key!=="Enter"&&o.key!==" "||(o.preventDefault(),n())}}
          ></path>
          ${a.label===null||this.routeOf(a.id).length===0?S:this.#t(a.label,this.routeOf(a.id))}
        </g>
      `});return h`
      ${this.#e?this.#s().map(a=>h`<div
                class=${`arch-boundary ${a.boundary.kind==="external"?"is-external":""}`}
                data-boundary=${a.boundary.id}
                style="left:${a.x}px; top:${a.y}px; width:${a.width}px; height:${a.height}px"
              >
                <span>${a.boundary.label}</span>
              </div>`):S}
      ${this.renderEdges(t,Aa)} ${e.nodes.map(a=>this.#a(a))}
    `}#t(e,t){const a=t[Math.floor(t.length/2)]??t[0];return a?h`<text class="arch-link-label" x=${a.x} y=${a.y-6}>${e}</text>`:h``}#a(e){const t=this.placedNode(e.id);if(!t)return S;const a=this.nodeState(e.id);return h`
      <button
        type="button"
        class=${this.elementClass(a,"d-node","arch-service")}
        data-service=${e.id}
        data-grill-questions=${this.questionsOf(e)}
        style="left:${t.x}px; top:${t.y}px; width:${e.width}px; height:${e.height}px"
        aria-pressed=${a.selected?"true":"false"}
        title=${e.description??e.name}
        @click=${()=>this.select({kind:"node",id:e.id})}
      >
        ${e.artwork===null?h`<span class="arch-symbol" aria-hidden="true">${e.symbol??e.name.slice(0,2)}</span>`:h`<img class="arch-artwork" src=${e.artwork.src} alt=${e.artwork.alt} />`}
        <span class="arch-body">
          <span class="arch-name">${e.name}</span>
          ${e.description===null?S:h`<span class="arch-description">${e.description}</span>`}
        </span>
      </button>
    `}}const at="artifact-architecture-map",st=(r=at)=>{customElements.get(r)||customElements.define(r,tt)},rt=()=>{Le(),Re(),He(),Ge(),st()},Ta=()=>{ct(),pt(),rt()};export{at as A,Ie as D,_e as E,Te as S,tt as a,Ve as b,Qe as c,Ae as d,Ee as e,Ce as f,st as g,He as h,Ge as i,Re as j,Le as k,ze as l,rt as m,Oe as p,Ta as r};
