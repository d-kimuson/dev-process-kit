import{Z as Vt,l as Nt,$ as Yt,a0 as N,a1 as w,a2 as u,a3 as se,a4 as U,a5 as Bt,D as Wt,a6 as Kt,a7 as Xt,a8 as Y,a9 as z,aa as g,ab as L,ac as p,ad as F,ae as k,af as $,ag as _,ah as Jt,ai as ye,aj as we,ak as oe,al as de,am as le,an as _t,ao as ke,n as $e,ap as Zt,aq as Qt,ar as Gt,s as ea,t as ta}from"./shared-BpZBcqrz.js";import{i as aa}from"./shared-C8Czv-C2.js";import{P as ia,p as ra,r as na}from"./shared-C1mDZfwx.js";import{c as te}from"./shared-DPcZakya.js";const sa='script[type="application/json"]',qe=(r,e)=>{const t=r.querySelector(sa);if(!t)return null;const a=t.textContent??"";if(a.trim()==="")return{ok:!1,error:"JSON block is empty"};try{return{ok:!0,value:e(JSON.parse(a))}}catch(n){return{ok:!1,error:n instanceof Error?n.message:String(n)}}},oa=(r,e,t)=>{const a=qe(r,e);if(a)return t(a),()=>{};const n=new MutationObserver(()=>{const i=qe(r,e);i&&(n.disconnect(),t(i))});return n.observe(r,{childList:!0,subtree:!0}),()=>n.disconnect()},Me={nodeSpacing:34,layerSpacing:84,padding:28,sweeps:4,coordinatePasses:6},ae=r=>{const e=[...r].sort((a,n)=>a-n);if(e.length===0)return 0;const t=Math.floor(e.length/2);return e.length%2===1?e[t]??0:((e[t-1]??0)+(e[t]??0))/2},da=(r,e)=>{const t=new Map;for(const s of r)t.set(s.id,[]);for(const s of e)t.get(s.from)?.push(s);const a=new Map,n=new Set,i=s=>{a.set(s,"open");for(const o of t.get(s)??[]){const d=a.get(o.to)??"new";d==="open"?n.add(o.id):d==="new"&&i(o.to)}a.set(s,"done")};for(const s of r)(a.get(s.id)??"new")==="new"&&i(s.id);return{reversed:n,forward:e.filter(s=>!n.has(s.id))}},la=(r,e)=>{const t=new Map,a=new Map;for(const o of r)t.set(o.id,[]),a.set(o.id,[]);for(const o of e)a.get(o.from)?.push(o),t.get(o.to)?.push(o);const n=new Map(r.map(o=>[o.id,0])),i=new Map(r.map(o=>[o.id,(t.get(o.id)??[]).length])),s=r.filter(o=>(i.get(o.id)??0)===0).map(o=>o.id);for(const o of s)for(const d of a.get(o)??[]){const l=n.get(d.to)??0;n.set(d.to,Math.max(l,(n.get(o)??0)+1));const f=(i.get(d.to)??0)-1;i.set(d.to,f),f===0&&s.push(d.to)}return n},ca=(r,e,t,a)=>{const n=[...r.keys()].sort((i,s)=>i-s);for(let i=0;i<a;i++){const s=i%2===0;for(const o of s?n:[...n].reverse()){const d=r.get(o)??[],l=new Map(d.map((c,v)=>[c,v])),f=c=>{const v=l.get(c);return v===void 0?null:v},m=d.map(c=>{const v=(e.get(c)??[]).filter(q=>(t.get(q)??o)===o+(s?-1:1)).map(f).filter(q=>q!==null);return{id:c,want:v.length>0?ae(v):l.get(c)??0}});m.sort((c,v)=>c.want-v.want||(l.get(c.id)??0)-(l.get(v.id)??0)),r.set(o,m.map(c=>c.id))}}},Se=(r,e,t,a)=>{const n=r.map((s,o)=>({id:s,want:t.get(s)??o*100,index:o}));n.sort((s,o)=>s.want-o.want||s.index-o.index);let i=0;for(const s of n){const o=e.get(s.id);o&&(o.y=i,i+=o.spec.height+a)}return{height:Math.max(0,i-a)}},pa=(r,e,t,a,n)=>{const i=[...r.keys()].sort((l,f)=>l-f),s=new Map;for(const l of i)s.set(l,Se(r.get(l)??[],e,new Map,n.nodeSpacing).height);const o=Math.max(0,...s.values());for(const l of i){const f=(o-(s.get(l)??0))/2;for(const m of r.get(l)??[]){const c=e.get(m);c&&(c.y+=f)}}const d=(l,f)=>{const m=(t.get(l)??[]).filter(c=>a.get(c)===f).flatMap(c=>{const v=e.get(c);return v?[v.y+v.spec.height/2]:[]});return m.length>0?ae(m):null};for(let l=0;l<n.coordinatePasses;l++){const f=l%2===0;for(const m of f?i:[...i].reverse()){const c=r.get(m)??[],v=new Map;for(const S of c){const C=d(S,m+(f?-1:1)),j=e.get(S);j!==void 0&&v.set(S,C===null?j.y+j.spec.height/2:C)}const q=c.map(S=>e.get(S)?.y??0);Se(c,e,v,n.nodeSpacing);const b=c.map(S=>e.get(S)?.y??0),M=ae(q)-ae(b);for(const S of c){const C=e.get(S);C&&(C.y+=M)}}}},Ee=(r,e,t)=>{const a=e===void 0?void 0:r.spec.ports?.[e];return a?{x:r.x+a.x,y:r.y+a.y}:t==="out"?{x:r.x+r.spec.width,y:r.y+r.spec.height/2}:{x:r.x,y:r.y+r.spec.height/2}},ze=(r,e,t)=>{let a=0;const n=[];for(const i of r){const s=t.byId.get(i.from),o=t.byId.get(i.to);if(!s||!o)continue;const d=Ee(s,i.fromPort,"out"),l=Ee(o,i.toPort,"in");if(i.from===i.to){const q=s.x+s.spec.width,b=s.y+s.spec.height,M=Math.max(t.padding/2,b+18);n.push({id:i.id,points:[d,{x:q+20,y:d.y},{x:q+20,y:M},{x:s.x-20,y:M},{x:s.x-20,y:l.y},l]});continue}if(!e.has(i.id)&&(s.layer<o.layer||s.layer===o.layer&&l.x>d.x+12)){if(Math.abs(d.y-l.y)<.5){n.push({id:i.id,points:[d,l]});continue}const q=s.layer<o.layer?Math.max(d.x+14,o.x-Math.max(12,t.layerSpacing/2)):(d.x+l.x)/2;n.push({id:i.id,points:[d,{x:q,y:d.y},{x:q,y:l.y},l]});continue}const f=i.fromPort===void 0?{x:s.x+s.spec.width/2,y:s.y+s.spec.height}:d,m=i.toPort===void 0?{x:o.x+o.spec.width/2,y:o.y+o.spec.height}:l,c=Math.max(f.y,m.y)+18+a*14;a+=1;const v=[d,f,{x:f.x,y:c},{x:m.x,y:c},m,l].filter((q,b,M)=>b===0||q.x!==M[b-1]?.x||q.y!==M[b-1]?.y);n.push({id:i.id,points:v})}return n},Ce=(r,e,t)=>{const a=e.flatMap(c=>[...c.points]),n=[...r.map(c=>c.x),...r.map(c=>c.x+c.spec.width),...a.map(c=>c.x)],i=[...r.map(c=>c.y),...r.map(c=>c.y+c.spec.height),...a.map(c=>c.y)],s=Math.min(0,...n),o=Math.min(0,...i),d=Math.max(0,...n),l=Math.max(0,...i),f=t-s,m=t-o;return{width:d-s+t*2,height:l-o+t*2,nodes:r.map(c=>({id:c.spec.id,x:c.x+f,y:c.y+m,width:c.spec.width,height:c.spec.height,layer:c.layer,order:c.order})),routes:e.map(c=>({id:c.id,points:c.points.map(v=>({x:v.x+f,y:v.y+m}))}))}},Te=(r,e)=>{const t=new Map(r.map(a=>[a.id,[]]));for(const a of e)a.from!==a.to&&(t.get(a.from)?.push(a.to),t.get(a.to)?.push(a.from));return t},De=(r,e,t,a)=>r.map(n=>({spec:n,layer:e.get(n.id)??0,order:t.get(n.id)??0,...a(n)})),ha=(r,e)=>{const t=new Map;for(const a of r){const n=e.get(a.id)??0,i=t.get(n);i?i.push(a.id):t.set(n,[a.id])}return t},ua=(r,e,t={})=>{const a={...Me,...t};if(r.length===0)return{width:0,height:0,nodes:[],routes:[]};const n=new Set(r.map(b=>b.id)),i=e.filter(b=>n.has(b.from)&&n.has(b.to)),{forward:s,reversed:o}=da(r,i),d=la(r,s),l=ha(r,d);ca(l,Te(r,i),d,a.sweeps);const f=new Map;for(const b of l.values())b.forEach((M,S)=>f.set(M,S));const m=De(r,d,f,()=>({x:0,y:0})),c=new Map(m.map(b=>[b.spec.id,b]));pa(l,c,Te(r,i),d,a);const v=[...l.keys()].sort((b,M)=>b-M);let q=0;for(const b of v){const M=Math.max(...(l.get(b)??[]).map(S=>c.get(S)?.spec.width??0));for(const S of l.get(b)??[]){const C=c.get(S);C&&(C.x=q)}q+=M+a.layerSpacing}return Ce(m,ze(i,o,{byId:c,layerSpacing:a.layerSpacing,padding:a.padding}),a.padding)},fa=(r,e,t={})=>{const a={...Me,...t};if(r.length===0)return{width:0,height:0,nodes:[],routes:[]};const n=new Set(r.map(d=>d.id)),i=e.filter(d=>n.has(d.from)&&n.has(d.to)),s=De(r,new Map,new Map,d=>d.position??{x:0,y:0}),o=new Map(s.map(d=>[d.spec.id,d]));return Ce(s,ze(i,new Set,{byId:o,layerSpacing:a.layerSpacing,padding:a.padding}),a.padding)},ma={active:[],match:"single"},X=(r,e)=>e.active.length===0?!0:e.match==="all"?e.active.every(t=>r.includes(t)):e.active.some(t=>r.includes(t)),ga=(r,e)=>r.active.includes(e)?{...r,active:r.active.filter(t=>t!==e)}:r.match==="single"?{...r,active:[e]}:{...r,active:[...r.active,e]},ba=(r,e)=>({match:e,active:e==="single"&&r.active.length>1?r.active.slice(-1):r.active}),xa=r=>({...r,active:[]}),va=r=>{const e=new Map;for(const t of r)for(const a of new Set(t))e.set(a,(e.get(a)??0)+1);return[...e].map(([t,a])=>({tag:t,count:a}))},H={nodes:new Map,edges:new Set},I=(r,e,t,a)=>{const n=new Map,i=new Set,s=[{id:e,depth:0}],o=new Set([e]);for(const d of s)if(!(!a&&d.depth>=1))for(const l of r){const f=t==="outgoing"?l.from:l.to,m=t==="outgoing"?l.to:l.from;f===d.id&&(i.add(l.id),!o.has(m)&&(o.add(m),n.set(m,d.depth+1),s.push({id:m,depth:d.depth+1})))}return{nodes:n,edges:i}},ya=(r,e)=>{const t=new Map(r.map(i=>[i,I(e,i,"outgoing",!0).nodes])),a=new Set,n=[];for(const i of r){if(a.has(i))continue;const s=r.filter(o=>o===i||t.get(i)?.has(o)===!0&&t.get(o)?.has(i)===!0);for(const o of s)a.add(o);(s.length>1||e.some(o=>o.from===i&&o.to===i))&&n.push(s)}return n},ce=r=>new Map(r.flatMap((e,t)=>e.map(a=>[a,t]))),Le=(r,e)=>e.get(r.from)===e.get(r.to)&&e.has(r.from),Ae=r=>{try{return r.split("/").map(e=>decodeURIComponent(e))}catch{return null}},je=(r,e,t,a)=>{const n=e!==null&&e.kind===t&&e.id===r,i=t==="node"?a.nodes.has(r):a.edges.has(r),s=t==="node"?a.nodes.get(r)??null:null;return{selected:n,related:i&&!n,dimmed:e!==null&&!n&&!i,depth:s}},J=(...r)=>r.filter(e=>typeof e=="string"&&e!=="").join(" "),wa=r=>{const e=r[0]??{x:0,y:0},t=r.at(-1)??e;if(r.length<=2)return{x:(e.x+t.x)/2,y:(e.y+t.y)/2};if(r.length===4){const i=r[1]??e,s=r[2]??t;return{x:i.x,y:(i.y+s.y)/2}}const a=r[2]??e,n=r[3]??t;return{x:(a.x+n.x)/2,y:a.y}},ka=(r,e)=>va(r).map(t=>({tag:t.tag,count:t.count,selected:e.active.includes(t.tag)})),$a=(r,e,t)=>`${r} ${t.node} \xB7 ${e} ${t.edge}`,B=[Vt,Nt,Yt,N`
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

    /*
     * Maximized: the shell covers the viewport. It is also a manual popover in
     * the top layer, so the UA popover box (fit-content, margin, border,
     * padding) is reset here. A vertical resize leaves an inline height behind,
     * which only !important overrides.
     */
    .diagram.is-maximized {
      position: fixed;
      inset: 0;
      z-index: 2147483000;
      width: auto !important;
      height: auto !important;
      max-width: none;
      max-height: none;
      margin: 0;
      padding: 0;
      border: 0;
      border-radius: 0;
      color: var(--af-ink);
      resize: none;
    }

    .diagram-maximize {
      flex-shrink: 0;
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

    /*
     * Contextual comments: an icon per element, revealed while the element that
     * contains it (or the element just before it) is hovered, focused or
     * selected, and always on touch devices. It opens the composer beside it.
     */
    .diagram-comment-trigger {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      padding: 5px;
      border: 1px solid var(--af-rule-strong);
      border-radius: var(--af-radius-sm);
      background: var(--af-paper-raised);
      color: var(--af-ink-soft);
      box-shadow: var(--af-shadow-xs);
      cursor: pointer;
      opacity: 0;
      pointer-events: none;
      transition: opacity 120ms ease;
    }

    .diagram-comment-trigger.is-placed {
      position: absolute;
      z-index: 2;
    }

    .diagram-comment-trigger svg {
      width: 16px;
      height: 16px;
    }

    .diagram-edge-comment {
      overflow: visible;
    }

    .diagram-edge-comment .diagram-comment-trigger {
      margin: 2px;
    }

    :is(.d-node, .d-edge):is(:hover, :focus-within, .is-selected) .diagram-comment-trigger,
    :is(:hover, :focus-visible, .is-selected) + .diagram-comment-trigger,
    .diagram-comment-trigger:is(:hover, :focus-visible, [aria-expanded='true']) {
      opacity: 1;
      pointer-events: auto;
    }

    .diagram-comment-trigger:hover,
    .diagram-comment-trigger:focus-visible {
      color: var(--af-accent);
      border-color: var(--af-accent);
    }

    @media (hover: none) {
      .diagram-comment-trigger {
        opacity: 1;
        pointer-events: auto;
      }
    }

    .comment-target {
      font-size: 12px;
      overflow-wrap: anywhere;
    }

    .comment-error {
      margin: 0;
      font-size: 11px;
      color: var(--af-accent);
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
    }
  `],Z=r=>r.map((e,t)=>`${t===0?"M":"L"}${e.x} ${e.y}`).join(" "),Re=r=>U`
  <defs>
    ${r.map(e=>U`
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
            fill=${e.open===!0||e.color===void 0?w:e.color}
            stroke=${e.color??w}
            stroke-width="1.3"
          ></path>
        </marker>
      `)}
  </defs>
`,qa=(r,e,t)=>u`
  <div class="diagram-tags" role="group" aria-label="タグの絞り込み">
    <div class="diagram-match" role="group" aria-label="タグの一致条件">
      ${[["single","Single"],["all","AND"],["any","OR"]].map(([a,n])=>u`
          <button
            type="button"
            data-match=${a}
            aria-pressed=${e===a?"true":"false"}
            @click=${()=>t({kind:"match",match:a})}
          >
            ${n}
          </button>
        `)}
    </div>
    ${se(r,a=>a.tag,a=>u`
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
    ${r.some(a=>a.selected)?u`<button type="button" class="af-tag-clear" @click=${()=>t({kind:"clear-tags"})}>解除</button>`:w}
  </div>
`,Ma=r=>u`
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
`,pe=.08,Sa=1.8,Ea=r=>{if(r.length===0)return{x:0,y:0,width:0,height:0};const e=Math.min(...r.map(i=>i.x)),t=Math.min(...r.map(i=>i.y)),a=Math.max(...r.map(i=>i.x+i.width))-e,n=Math.max(...r.map(i=>i.y+i.height))-t;return{x:e-a*.1,y:t-n*.1,width:a*1.2,height:n*1.2}},he=(r,e)=>r+e/12,ue=16,Ue=(r,e,t,a,n="center")=>{if(e.width===0||e.height===0)return{...r,x:0,y:0};const i=(s,o,d,l)=>{const f=d*r.scale;return f<=l?n==="start"?ue-he(o,d)*r.scale:(l-f)/2-o*r.scale:Math.min(-o*r.scale,Math.max(l-(o+d)*r.scale,s))};return{...r,x:i(r.x,e.x,e.width,t),y:i(r.y,e.y,e.height,a)}},za=(r,e,t,a,n,i,s="center")=>{const o=Ue({...r,x:r.x-n,y:r.y-i},e,t,a,s);return Math.abs(i)>Math.abs(n)&&o.y===r.y?null:o},Ie='button,[role="button"],a,input,textarea,select',Ca=r=>{const{canvas:e,world:t,onClearSelection:a,onView:n,align:i="center"}=r;let s={x:0,y:0,width:0,height:0},o={x:0,y:0,scale:1};const d=()=>({width:e.clientWidth||1e3,height:e.clientHeight||560}),l=()=>{const{width:h,height:y}=d();o=Ue(o,s,h,y,i),t.style.transform=`translate(${o.x}px, ${o.y}px) scale(${o.scale})`,n?.(o)},f=()=>{const{width:h,height:y}=d(),E=s.width/1.2||1,D=s.height/1.2||1;o={...o,scale:te(Math.min((h-24)/E,(y-40)/D),pe,1)},o={...o,x:(h-s.width*o.scale)/2-s.x*o.scale,y:(y-s.height*o.scale)/2-s.y*o.scale},l()},m=()=>{const{width:h}=d(),y=s.width/1.2||1,E=te((h-24)/y,pe,1);o={scale:E,x:(h-s.width*E)/2-s.x*E,y:16},l()},c=()=>{o={scale:1,x:ue-he(s.x,s.width),y:ue-he(s.y,s.height)},l()},v=(h,y=d().width/2,E=d().height/2)=>{const D=o.scale,R=te(D*h,pe,Sa);R!==D&&(o={scale:R,x:y-(y-o.x)*R/D,y:E-(E-o.y)*R/D},l())},q=h=>{if(h.target instanceof Element&&h.target.closest(".diagram-zoom"))return;const y=h.deltaMode===1?16:h.deltaMode===2?d().height:1;if(h.ctrlKey||h.metaKey){h.preventDefault();const K=e.getBoundingClientRect();v(Math.exp(-te(h.deltaY*y,-60,60)*.0012),h.clientX-K.left,h.clientY-K.top);return}const{width:E,height:D}=d(),R=za(o,s,E,D,h.deltaX*y,h.deltaY*y,i);R!==null&&(h.preventDefault(),o=R,l())},b=new Map;let M=null,S=!1;const C=()=>{const h=[...b.values()],y=h[0];if(!y)return null;const E=h[1];return E?{x:(y.x+E.x)/2,y:(y.y+E.y)/2,distance:Math.hypot(E.x-y.x,E.y-y.y)}:{...y,distance:0}},j=h=>{b.size===0&&(S=!1);const y=(h.target instanceof Element?h.target:null)?.closest(Ie)??null;h.button!==0||h.pointerType!=="touch"&&y!==null||(b.set(h.pointerId,{x:h.clientX,y:h.clientY}),M=C(),y===null&&e.setPointerCapture(h.pointerId))},V=h=>{if(!b.has(h.pointerId)||M===null)return;b.set(h.pointerId,{x:h.clientX,y:h.clientY});const y=C();if(y===null)return;const E=y.x-M.x,D=y.y-M.y;if((Math.abs(E)+Math.abs(D)>1||Math.abs(y.distance-M.distance)>1)&&(S=!0),y.distance>0&&M.distance>0){const R=e.getBoundingClientRect();v(Math.pow(y.distance/M.distance,.45),M.x-R.left,M.y-R.top)}o={...o,x:o.x+E,y:o.y+D},l(),M=y,e.classList.toggle("is-panning",S)},O=h=>{b.delete(h.pointerId),M=C(),!(b.size>0)&&(e.classList.remove("is-panning"),h.type==="pointercancel"&&(S=!1))},ee=h=>{S&&(h.preventDefault(),h.stopPropagation()),O(h)},x=h=>{if(S){h.preventDefault(),h.stopPropagation(),S=!1;return}const y=h.target instanceof Element?h.target:null;y===null||y.closest(Ie)!==null||a()},T=h=>{if(h.target!==e)return;const y=30;if(h.key==="+"||h.key==="=")v(1.1);else if(h.key==="-")v(1/1.1);else if(h.key==="0")f();else if(h.key==="Escape")a();else if(h.key==="ArrowLeft"||h.key==="ArrowRight"||h.key==="ArrowUp"||h.key==="ArrowDown")o={...o,x:o.x+(h.key==="ArrowLeft"?y:h.key==="ArrowRight"?-y:0),y:o.y+(h.key==="ArrowUp"?y:h.key==="ArrowDown"?-y:0)},l();else return;h.preventDefault()},A=h=>{const y=h.target instanceof HTMLElement?h.target:null;if(y===null||!t.contains(y))return;const E=y.getBoundingClientRect(),D=e.getBoundingClientRect();let R=0,K=0;E.left<D.left+12?R=D.left+12-E.left:E.right>D.right-12&&(R=D.right-12-E.right),E.top<D.top+12?K=D.top+12-E.top:E.bottom>D.bottom-40&&(K=D.bottom-40-E.bottom),!(R===0&&K===0)&&(o={...o,x:o.x+R,y:o.y+K},l())};e.addEventListener("wheel",q,{passive:!1}),e.addEventListener("pointerdown",j),e.addEventListener("pointermove",V),e.addEventListener("pointerup",ee),e.addEventListener("pointercancel",O),e.addEventListener("lostpointercapture",O),e.addEventListener("click",x,!0),e.addEventListener("keydown",T),e.addEventListener("focusin",A);const P=typeof ResizeObserver>"u"?null:new ResizeObserver(()=>l());return P?.observe(e),{setContent(h){s=Ea(h.width===0&&h.height===0?[]:[h]),t.style.width=`${h.width}px`,t.style.height=`${h.height}px`,l()},apply:l,fit:f,fitWidth:m,reset:c,zoom:v,view:()=>({...o}),destroy(){P?.disconnect(),e.removeEventListener("wheel",q),e.removeEventListener("pointerdown",j),e.removeEventListener("pointermove",V),e.removeEventListener("pointerup",ee),e.removeEventListener("pointercancel",O),e.removeEventListener("lostpointercapture",O),e.removeEventListener("click",x,!0),e.removeEventListener("keydown",T),e.removeEventListener("focusin",A)}}};class fe extends Bt{static{this.styles=B}static{this.properties={data:{attribute:!1},id:{type:String,reflect:!0},heading:{type:String},subject:{type:String}}}#e=null;#a=null;#i=[];#t=[];#r=null;#n=ma;#s=null;#o=null;#l=null;#c=null;#u=-1;#p="";#d=null;#b=null;#h=new Map;#f=null;#m=new Map;#g=null;#v=new ia(this);constructor(){super(),this.id=this.getAttribute("id")??"",this.data=null,this.heading=null,this.subject=null}connectedCallback(){super.connectedCallback(),this.#p="",this.requestUpdate(),this.#c=oa(this,e=>this.parseData(e),e=>{e.ok?this.#q(e.value):this.#L(e.error)})}disconnectedCallback(){super.disconnectedCallback(),this.#c?.(),this.#c=null,this.#o?.destroy(),this.#o=null,this.#l=null}willUpdate(e){e.has("data")&&this.data!==null&&this.#q(this.data)}updated(){this.#w(),this.#y(),this.#E(),this.#z()}#y(){const e=this.renderRoot.querySelector(".diagram");if(!(this.#g===null||!e||typeof e.showPopover!="function")&&!e.matches(":popover-open"))try{e.showPopover()}catch{}}#w(){const e=JSON.stringify([this.commentTargets,this.#t]);e!==this.#p&&(this.#p=e,this.dispatchEvent(new CustomEvent("artifact-comment-targets-change",{bubbles:!0,composed:!0})))}#E(){this.#l=this.renderRoot.querySelector(".diagram-zoom-value");const e=this.renderRoot.querySelector(".diagram-canvas"),t=this.renderRoot.querySelector(".diagram-world");if(!e||!t)return;this.#o??=Ca({canvas:e,world:t,align:this.viewAlign(),onClearSelection:()=>this.#x(null),onView:i=>{this.#l&&(this.#l.textContent=`${Math.round(i.scale*100)}%`),this.dispatchEvent(new CustomEvent("artifact-diagram-view",{detail:{view:i},bubbles:!0,composed:!0})),this.onViewChange(i)}});const a=this.contentSize();if(a===null){this.#o.apply();return}this.#o.setContent({x:0,y:0,width:a.width,height:a.height});const n=this.layoutVersion();n!==this.#u&&(this.#u=n,this.initialView())}#z(){const e=this.#b!==this.#d;this.#b=this.#d;const t=this.renderRoot.querySelector(".comment-pop"),a=this.#M();!t||!a||(this.#v.open(t,a,{width:300,height:280},{placement:"right-start",trackTransform:!0}),e&&t.querySelector("textarea")?.focus({preventScroll:!0}))}get commentTargets(){if(!this.id||this.#r!==null)return[];const e=`${this.subject??this.heading??this.defaultHeading()} \xB7 ${this.id}`;return this.commentItems().map(t=>({...t,group:e}))}commentItems(){return[]}commentRef(e,...t){return`element:${[this.id,e,...t].map(a=>encodeURIComponent(a)).join("/")}`}requestElementComment(e,...t){const a=this.commentRef(e,...t);this.commentTargets.some(n=>n.value===a)&&this.dispatchEvent(new CustomEvent("artifact-comment-request",{detail:{target:a},bubbles:!0,composed:!0}))}get elementActions(){return this.#i}set elementActions(e){this.#i=e,this.#k()}get elementActionResults(){return this.#t}reduceElementActions(e,t){return{data:e,results:t.map(a=>({id:a.id,title:a.type,stale:"unsupported-action-type"}))}}dispatchElementAction(e,t,a){const n=new CustomEvent("artifact-element-action",{detail:{type:e,target:this.commentRef(...t),payload:a},bubbles:!0,composed:!0,cancelable:!0});return this.dispatchEvent(n),n.defaultPrevented}get selection(){return this.#s}select(e){this.#x(e)}get tagFilter(){return this.#n}set tagFilter(e){this.#n=e,this.requestUpdate()}get dataError(){return this.#r}resetView(){this.fitViewport()}#$(e){if(e===(this.#g!==null))return;const t=this.renderRoot.querySelector(".diagram");this.#g=e?{height:t?.offsetHeight??0}:null,this.#d=null,this.requestUpdate()}#C={handleEvent:e=>e.preventDefault(),passive:!1};#T={handleEvent:e=>{e.key!=="Escape"||this.#s!==null||(e.preventDefault(),this.#$(!1))},capture:!0};renderSelection(){const e=this.#d,t=e===null?void 0:this.#m.get(e);if(e===null||t===void 0)return w;const a=ra(this.#h.get(e)??"",[],{label:t,...this.#f===e?{error:"\u9001\u4FE1\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"}:{}});return u`${aa(e,na(a,n=>this.#D(e,n)))}`}renderCommentTrigger(e,t,a){if(!this.id)return w;const n=this.commentRef(e.kind,e.id);return this.#m.set(n,t),u`<button
      type="button"
      class=${J("diagram-comment-trigger",a&&"is-placed")}
      style=${a?`left:${a.x}px; top:${a.y}px`:w}
      data-comment-kind=${e.kind}
      data-comment-id=${e.id}
      aria-label=${`${t}\u306B\u30B3\u30E1\u30F3\u30C8`}
      title=${`${t}\u306B\u30B3\u30E1\u30F3\u30C8`}
      aria-haspopup="dialog"
      aria-expanded=${this.#d===n?"true":"false"}
      @click=${()=>{this.#x(e),this.#d=n,this.requestUpdate()}}
    >
      ${Wt()}
    </button>`}renderEdgeCommentTrigger(e,t,a){const n=Math.floor((a.length-1)/2),i=a[n],s=a[n+1]??i;return!this.id||!i||!s?w:U`<foreignObject
      class="diagram-edge-comment"
      x=${(i.x+s.x)/2-16}
      y=${(i.y+s.y)/2-16}
      width="32"
      height="32"
    >${this.renderCommentTrigger(e,t)}</foreignObject>`}layoutVersion(){return 0}fitViewport(){this.viewport?.fit()}initialView(){this.viewport?.reset()}viewAlign(){return"center"}questionsOf(e){const t=e.questions?.trim();return t===void 0||t===""?w:t}onViewChange(e){}statsText(){return""}tagItems(){return[]}isEmpty(){return this.contentSize()===null}shellClass(){return""}defaultHeading(){return""}defaultSubject(){return""}emptyMessage(){return"\u8A72\u5F53\u3059\u308B\u8981\u7D20\u306F\u3042\u308A\u307E\u305B\u3093\u3002"}renderToolbarActions(){return w}renderLegend(){return w}renderAboveCanvas(){return w}get viewport(){return this.#o}items(){return this.#a??this.emptyData()}authoredItems(){return this.#e??this.emptyData()}elementClass(e,...t){return J(...t,e.selected&&"is-selected",e.related&&"is-related",e.dimmed&&"is-dimmed")}#q(e){this.#r=null,this.#e=e,this.#k()}#k(){if(this.#e===null){this.#t=this.#i.map(t=>({id:t.id,title:t.type,stale:"target-missing"})),this.requestUpdate();return}const e=this.reduceElementActions(this.#e,this.#i);this.#a=e.data,this.#t=e.results,this.#s!==null&&(this.hasSelection(this.#s)||(this.#s=null,this.#d=null)),this.requestUpdate()}#M(){const e=this.#s;return e?[...this.renderRoot.querySelectorAll("[data-comment-kind]")].find(t=>t.dataset.commentKind===e.kind&&t.dataset.commentId===e.id)??null:null}#D(e,t){if(t.kind==="input"){this.#h=new Map(this.#h).set(e,t.body),this.#f=null,this.requestUpdate();return}if(t.kind==="comment"){if(this.dispatchEvent(new CustomEvent("artifact-comment-submit",{detail:{target:e,body:t.body},bubbles:!0,composed:!0,cancelable:!0}))){this.#f=e,this.requestUpdate();return}const n=new Map(this.#h);n.delete(e),this.#h=n}this.#f=null;const a=this.#M();this.#x(null),a?.focus({preventScroll:!0})}#L(e){this.#r=e,this.#e=null,this.#a=null,this.#k(),console.error("[dev-process-kit] invalid diagram data:",e),this.requestUpdate()}hasSelection(e){return!0}#x(e){(e===null?this.#s===null:this.#s!==null&&this.#s.kind===e.kind&&this.#s.id===e.id)||(this.#s=e,this.#d=null,this.dispatchEvent(new CustomEvent("artifact-diagram-select",{detail:{selection:e},bubbles:!0,composed:!0})),this.requestUpdate())}#S=e=>{switch(e.kind){case"tag":this.#n=ga(this.#n,e.tag),this.requestUpdate();return;case"match":this.#n=ba(this.#n,e.match),this.requestUpdate();return;case"clear-tags":this.#n=xa(this.#n),this.requestUpdate();return;case"select":this.#x(e.selection);return;case"zoom":this.#o?.zoom(e.factor);return;case"fit":this.fitViewport();return;default:return}};refreshContent(){}render(){this.#m=new Map,this.refreshContent();const e=ka(this.tagItems(),this.#n),t=this.#g,a=t===null?"\u6700\u5927\u5316":"\u5143\u306E\u30B5\u30A4\u30BA\u306B\u623B\u3059";return u`
      ${t===null?w:u`<div class="diagram-placeholder" style="height:${t.height}px"></div>`}
      <div
        class=${J("diagram",this.shellClass(),t!==null&&"is-maximized")}
        popover=${t===null?w:"manual"}
        @wheel=${t===null?w:this.#C}
        @keydown=${t===null?w:this.#T}
      >
        <div class="diagram-toolbar">
          <span class="diagram-title">${this.heading??this.defaultHeading()}</span>
          ${(this.subject??this.defaultSubject())===""?w:u`<span class="diagram-subject">${this.subject??this.defaultSubject()}</span>`}
          <div class="diagram-toolbar-actions">
            ${this.renderToolbarActions()}
            <span class="diagram-stats">${this.statsText()}</span>
            <button
              type="button"
              class="af-icon-btn diagram-maximize"
              aria-label=${a}
              title=${a}
              aria-pressed=${t===null?"false":"true"}
              @click=${()=>this.#$(t===null)}
            >
              ${t===null?Kt():Xt()}
            </button>
          </div>
        </div>
        ${qa(e,this.#n.match,this.#S)} ${this.renderAboveCanvas()}
        <div
          class="diagram-canvas"
          tabindex="0"
          aria-label="図。矢印キーでパン、プラス・マイナスでズーム、0で全体表示。"
        >
          <div class="diagram-world">${this.renderCanvas()}</div>
          ${this.isEmpty()?u`<p class="diagram-empty">${this.emptyMessage()}</p>`:w}
          ${this.#r===null?w:u`<p class="diagram-notice" role="alert">
                  図のデータを読み込めませんでした。<br />${this.#r}
                </p>`}
          ${this.renderLegend()} ${Ma(this.#S)}
        </div>
        ${this.renderSelection()}
      </div>
    `}}class Q extends fe{#e=null;#a="";#i=0;#t=H;commentItems(){const e=this.items();return[...e.nodes.map(t=>({value:this.commentRef("node",t.id),label:t.id})),...e.edges.map(t=>({value:this.commentRef("edge",t.id),label:`${t.from} \u2192 ${t.to} (${t.id})`}))]}get visible(){const e=this.filtered();return{nodes:e.nodes,edges:e.edges}}get layout(){return this.#e}get layoutMode(){return"layered"}get tagDimension(){return"node"}layoutOptions(){return{}}matchesFilter(e){return!0}layoutSignature(){return""}statsLabels(){return{node:"\u8981\u7D20",edge:"\u95A2\u9023"}}statsText(){const e=this.filtered();return $a(e.nodes.length,e.edges.length,this.statsLabels())}tagItems(){const e=this.items();return(this.tagDimension==="edge"?e.edges:e.nodes).map(t=>t.tags)}contentSize(){const e=this.#e;return e===null||e.nodes.length===0?null:{width:e.width,height:e.height}}layoutVersion(){return this.#i}hasSelection(e){const t=this.items();return e.kind==="node"?t.nodes.some(a=>a.id===e.id):t.edges.some(a=>a.id===e.id)}placedNode(e){return this.#e?.nodes.find(t=>t.id===e)}routeOf(e){return this.#e?.routes.find(t=>t.id===e)?.points??[]}nodeState(e){return je(e,this.selection,"node",this.#t)}edgeState(e){return je(e,this.selection,"edge",this.#t)}renderEdges(e,t){const a=this.#e?.width??0,n=this.#e?.height??0;return u`<svg class="diagram-edges" width=${a} height=${n}>
      ${Re(t)}${e}
    </svg>`}filtered(){const e=this.items();if(this.tagDimension==="edge"){const n=e.edges.filter(s=>X(s.tags,this.tagFilter)&&this.matchesFilter(s)),i=new Set(n.flatMap(s=>[s.from,s.to]));return{...e,edges:n,nodes:e.nodes.filter(s=>i.has(s.id))}}const t=e.nodes.filter(n=>X(n.tags,this.tagFilter)&&this.matchesFilter(n)),a=new Set(t.map(n=>n.id));return{...e,nodes:t,edges:e.edges.filter(n=>a.has(n.from)&&a.has(n.to))}}refreshContent(){const e=this.filtered(),t=[this.layoutMode,e.nodes.map(a=>`${a.id}:${a.width}x${a.height}`).join(","),e.edges.map(a=>`${a.id}:${a.from}>${a.to}`).join(","),this.layoutSignature()].join("|");t!==this.#a&&(this.#a=t,this.#i+=1,this.#e=this.computePlacement(e)),this.#t=this.relations(this.selection,e)}computePlacement(e){const t=e.nodes.map(i=>({id:i.id,width:i.width,height:i.height,...i.ports===void 0?{}:{ports:i.ports},...i.position===void 0?{}:{position:i.position}})),a=e.edges.map(i=>({id:i.id,from:i.from,to:i.to,...i.fromPort===void 0?{}:{fromPort:i.fromPort},...i.toPort===void 0?{}:{toPort:i.toPort}})),n=this.layoutOptions();return this.layoutMode==="fixed"?fa(t,a,n):ua(t,a,n)}}const Ta=z({x:_(),y:_()}),Da=z({id:k(p(),$(1)),name:k(p(),$(1)),code:g(p()),kind:g(F(["normal","initial","terminal","compensation"]),"normal"),description:g(p()),position:g(Ta),questions:g(p())}),La=z({id:k(p(),$(1)),from:k(p(),$(1)),to:k(p(),$(1)),title:k(p(),$(1)),kind:g(F(["normal","exception"]),"normal"),tags:g(L(p()),[]),guard:g(p()),effect:g(p()),questions:g(p())}),Oe={width:178,height:86},Aa=()=>({nodes:[],edges:[]}),ja=z({states:L(Da),transitions:g(L(La),[])}),Pe=r=>{const e=Y(ja,r),t=new Set;for(const i of e.states){if(t.has(i.id))throw new Error(`duplicate state id: ${i.id}`);t.add(i.id)}const a=new Set,n=e.transitions.map(i=>{if(a.has(i.id))throw new Error(`duplicate transition id: ${i.id}`);if(a.add(i.id),!t.has(i.from))throw new Error(`unknown transition source: ${i.from}`);if(!t.has(i.to))throw new Error(`unknown transition target: ${i.to}`);return{id:i.id,from:i.from,to:i.to,title:i.title,kind:i.kind,tags:i.tags,guard:i.guard??null,effect:i.effect??null,...i.questions===void 0?{}:{questions:i.questions}}});return{nodes:e.states.map(i=>({id:i.id,name:i.name,code:i.code??null,kind:i.kind,description:i.description??null,width:Oe.width,height:Oe.height,tags:[],...i.position===void 0?{}:{position:i.position},...i.questions===void 0?{}:{questions:i.questions}})),edges:n}},Ra=r=>r.length>0&&r.every(e=>e.position!==void 0),Ua=N`
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

  /* The slot centres a label on its route and carries the label's comment icon beside it. */
  .state-label-slot {
    position: absolute;
    transform: translate(-50%, -50%);
    display: flex;
  }

  /* Overlaps the label by a hair so the pointer never crosses a gap that would hide it. */
  .state-label-slot > .diagram-comment-trigger {
    position: absolute;
    left: calc(100% - 2px);
    top: 50%;
    transform: translateY(-50%);
  }

  .state-label {
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
`,Ia=[{id:"state-arrow"},{id:"state-arrow-active"},{id:"state-arrow-exception"}];class Fe extends Q{static{this.styles=[B,Ua]}parseData(e){return Pe(e)}emptyData(){return Aa()}defaultHeading(){return"State machine"}statsLabels(){return{node:"\u72B6\u614B",edge:"\u9077\u79FB"}}emptyMessage(){return"\u8A72\u5F53\u3059\u308B\u9077\u79FB\u306F\u3042\u308A\u307E\u305B\u3093\u3002"}get tagDimension(){return"edge"}get layoutMode(){return Ra(this.filtered().nodes)?"fixed":"layered"}layoutOptions(){return this.layoutMode==="fixed"?{padding:44}:{nodeSpacing:40,layerSpacing:110,padding:44}}relations(e,t){if(e===null||e.kind!=="node")return H;const a=I(t.edges,e.id,"outgoing",!1),n=I(t.edges,e.id,"incoming",!1);return{nodes:new Map([...a.nodes,...n.nodes]),edges:new Set([...a.edges,...n.edges])}}renderCanvas(){const e=this.visible.nodes,t=e.filter(a=>a.kind==="initial").map(a=>this.#i(a));return u`
      ${this.renderEdges([...t,...this.visible.edges.map(a=>this.#t(a))],Ia)}
      ${e.map(a=>this.#r(a))} ${this.visible.edges.map(a=>this.#n(a))}
    `}#e(e){return this.filtered().nodes.find(t=>t.id===e)?.name??e}#a(e){return[e.guard,e.effect].filter(t=>t!==null).join(`
`)||e.title}#i(e){const t=this.placedNode(e.id);if(!t)return w;const a=t.y+t.height/2,n=this.nodeState(e.id);return U`
      <g class=${J("state-initial-mark",n.dimmed&&"is-dimmed")}>
        <circle cx=${t.x-22} cy=${a} r="5"></circle>
        <path
          d=${Z([{x:t.x-17,y:a},{x:t.x-1,y:a}])}
          stroke-width="1.6"
        ></path>
      </g>
    `}#t(e){const t=this.edgeState(e.id),a=this.routeOf(e.id),n=Z(a),i=t.selected||t.related?"state-arrow-active":e.kind==="exception"?"state-arrow-exception":"state-arrow",s=()=>this.select({kind:"edge",id:e.id});return U`
      <g
        class=${this.elementClass(t,"d-edge","state-edge",e.kind==="exception"&&"is-exception")}
        data-transition=${e.id}
      >
        <title>${this.#a(e)}</title>
        <path class="d-edge-path" d=${n} marker-end=${`url(#${i})`}></path>
        <path
          class="d-edge-hit"
          d=${n}
          role="button"
          tabindex="0"
          aria-label=${`${this.#e(e.from)} \u304B\u3089 ${this.#e(e.to)} \u3078\u306E ${e.title}`}
          @click=${s}
          @keydown=${o=>{o.key!=="Enter"&&o.key!==" "||(o.preventDefault(),s())}}
        ></path>
      </g>
    `}#r(e){const t=this.placedNode(e.id);if(!t)return w;const a=this.nodeState(e.id);return u`
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
        ${e.code===null?w:u`<span class="state-code">${e.code}</span>`}
      </button>
      ${this.renderCommentTrigger({kind:"node",id:e.id},e.name,{x:t.x+e.width-20,y:t.y-14})}
    `}#n(e){const t=this.edgeState(e.id),a=wa(this.routeOf(e.id));return u`
      <span class="state-label-slot" style="left:${a.x}px; top:${a.y}px">
        <button
          type="button"
          class=${this.elementClass(t,"state-label")}
          data-transition-label=${e.id}
          data-grill-questions=${this.questionsOf(e)}
          title=${this.#a(e)}
          @click=${()=>this.select({kind:"edge",id:e.id})}
        >
          ${e.title}
        </button>
        ${this.renderCommentTrigger({kind:"edge",id:e.id},`${this.#e(e.from)} \u2192 ${this.#e(e.to)} \xB7 ${e.title}`)}
      </span>
    `}}const He="artifact-state-diagram",Ve=(r=He)=>{customElements.get(r)||customElements.define(r,Fe)},Oa=z({kind:we("message"),id:k(p(),$(1)),from:k(p(),$(1)),to:k(p(),$(1)),title:k(p(),$(1)),style:g(F(["request","response","async"]),"request"),tags:g(L(p()),[]),guard:g(p()),detail:g(p()),questions:g(p())}),Pa=z({label:k(p(),$(1)),items:L(ye())}),Fa=z({kind:we("fragment"),id:k(p(),$(1)),operator:F(["alt","opt","loop","par"]),title:k(p(),$(1)),collapsed:g(oe(),!1),branches:k(L(Pa),$(1))}),Ha=Jt("kind",[Oa,Fa]),Va=z({id:k(p(),$(1)),name:k(p(),$(1)),role:g(p()),symbol:g(p()),kind:g(F(["internal","external"]),"internal"),description:g(p()),questions:g(p())}),Na=z({participants:k(L(Va),$(1)),items:g(L(ye()),[])}),Ne=240,me=(r,e,t)=>{if(r.has(e))throw new Error(`duplicate ${t} id: ${e}`);r.add(e)},Ye=(r,e,t)=>r.map(a=>{const n=Y(Ha,a);if(n.kind==="message"){if(me(t,n.id,"message"),!e.has(n.from))throw new Error(`unknown sender: ${n.from}`);if(!e.has(n.to))throw new Error(`unknown receiver: ${n.to}`);return{kind:"message",id:n.id,from:n.from,to:n.to,title:n.title,style:n.style,tags:n.tags,guard:n.guard??null,detail:n.detail??null,questions:n.questions??null}}return me(t,n.id,"fragment"),{kind:"fragment",id:n.id,operator:n.operator,title:n.title,collapsed:n.collapsed,branches:n.branches.map(i=>({label:i.label,items:Ye(i.items,e,t)}))}}),Be=r=>{const e=Y(Na,r),t=new Set;for(const a of e.participants)me(t,a.id,"participant");return{participants:e.participants.map(a=>({id:a.id,name:a.name,role:a.role??null,symbol:a.symbol??null,external:a.kind==="external",description:a.description??null,questions:a.questions??null})),items:Ye(e.items,t,new Set)}},Ya=()=>({participants:[],items:[]}),We=(r,e)=>{for(const t of r)if(t.kind==="message")e.push(t);else for(const a of t.branches)We(a.items,e)},W=r=>{const e=[];return We(r,e),e},Ba=r=>new Map(W(r.items).map((e,t)=>[e.id,String(t+1).padStart(2,"0")])),Wa=r=>W(r).length,Ke=(r,e)=>{const t=[];for(const a of r){if(a.kind==="message"){e(a)&&t.push(a);continue}const n=a.branches.map(i=>({label:i.label,items:Ke(i.items,e)})).filter(i=>i.items.length>0);n.length>0&&t.push({...a,branches:n})}return t},Ka=64,Xa=86,Ja=31,_a=32,Za=40,Qa=(r,e)=>{const t=Ke(r.items,e),a=new Set;for(const q of W(t))a.add(q.from),a.add(q.to);const n=r.participants.filter(q=>a.has(q.id)),i=new Map(n.map((q,b)=>[q.id,120+b*Ne])),s=Math.max(360,n.length*Ne),o=[],d=[],l=[],f=[],m=[];let c=25;const v=(q,b)=>{for(const M of q){if(M.kind==="message"){o.push({message:M,y:c+29,depth:b}),c+=M.from===M.to?Xa:Ka;continue}const S=22+b*13,C=c,j=s-44-b*26;c+=Ja,M.collapsed?(m.push({fragment:M,x:S,y:c+6}),c+=Za):M.branches.forEach((V,O)=>{O>0&&(f.push({x:S,y:c,width:j}),c+=8),l.push({label:V.label,x:S+12,y:c}),c+=_a,v(V.items,b+1),c+=8}),d.push({fragment:M,x:S,y:C,width:j,height:c-C,count:Wa([M])}),c+=14}};return v(t,0),{width:s,height:c+24,participants:n,rows:o,frames:d,branches:l,dividers:f,folds:m,x:i}},Ga=N`
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
`,ei=[{id:"seq-request"},{id:"seq-response"},{id:"seq-async"},{id:"seq-related"},{id:"seq-selected"}],ti={request:"\u51E6\u7406 / \u4FDD\u8A3C",response:"\u5FDC\u7B54 / \u4FDD\u8A3C",async:"\u975E\u540C\u671F\u51E6\u7406 / \u4FDD\u8A3C"};class Xe extends fe{static{this.styles=[B,Ga]}#e=null;#a=new Map;#i=new Map;#t=new Set;#r=new Set;#n="";#s=0;commentItems(){const e=this.items();return[...e.participants.map(t=>({value:this.commentRef("participant",t.id),label:t.name})),...W(e.items).map(t=>({value:this.commentRef("message",t.id),label:t.title}))]}parseData(e){return this.#i.clear(),Be(e)}emptyData(){return Ya()}defaultHeading(){return"Sequence"}shellClass(){return"sequence"}emptyMessage(){return"\u8A72\u5F53\u3059\u308B\u30E1\u30C3\u30BB\u30FC\u30B8\u306F\u3042\u308A\u307E\u305B\u3093\u3002"}fitViewport(){this.viewport?.fitWidth()}onViewChange(e){const t=this.renderRoot.querySelector(".sequence-rail-world");t&&(t.style.transform=`translateX(${e.x}px) scale(${e.scale})`)}hasSelection(e){const t=this.items();return e.kind==="participant"?t.participants.some(a=>a.id===e.id):W(t.items).some(a=>a.id===e.id)}tagItems(){return W(this.items().items).map(e=>e.tags)}statsText(){const e=this.#e,t=W(this.items().items).length;return e===null?"":`${e.rows.length} / ${t} \u30E1\u30C3\u30BB\u30FC\u30B8`}contentSize(){const e=this.#e;return e===null||e.rows.length===0?null:{width:e.width,height:e.height}}isEmpty(){return this.contentSize()===null}layoutVersion(){return this.#s}refreshContent(){const e=this.#l(),t=this.tagFilter,a=[t.match,[...t.active].join(","),[...this.#i].map(([s,o])=>`${s}:${o}`).join(","),W(e.items).map(s=>s.id).join(",")].join("|");a!==this.#n&&(this.#n=a,this.#s+=1,this.#a=Ba(this.items()),this.#e=Qa(e,s=>X(s.tags,t))),this.#t=new Set,this.#r=new Set;const n=this.selection,i=this.#e;if(n!==null&&i!==null)if(n.kind==="message"){const s=i.rows.find(o=>o.message.id===n.id);this.#t.add(n.id),s&&(this.#r.add(s.message.from),this.#r.add(s.message.to))}else for(const s of i.rows)s.message.from!==n.id&&s.message.to!==n.id||this.#t.add(s.message.id)}#o(e){const t=e.detail===null?null:`${ti[e.style]}: ${e.detail}`;return[e.guard,t].filter(a=>a!==null).join(`
`)||e.title}#l(){const e=this.items(),t=a=>a.map(n=>n.kind==="message"?n:{...n,collapsed:this.#i.get(n.id)??n.collapsed,branches:n.branches.map(i=>({label:i.label,items:t(i.items)}))});return{participants:e.participants,items:t(e.items)}}#c(e){return this.#e?.frames.find(t=>t.fragment.id===e.id)?.fragment.collapsed??e.collapsed}#u(e){this.#i.set(e.id,!this.#c(e)),this.requestUpdate()}#p(e){const t=this.selection?.kind==="message"&&this.selection.id===e,a=!t&&this.#t.has(e);return{selected:t,related:a,dimmed:this.selection!==null&&!t&&!a,depth:null}}#d(e){const t=this.selection?.kind==="participant"&&this.selection.id===e,a=!t&&this.#r.has(e);return{selected:t,related:a,dimmed:this.selection!==null&&!t&&!a,depth:null}}renderAboveCanvas(){const e=this.#e;return e===null?w:u`
      <div class="sequence-rail" role="group" aria-label="参加者">
        <div class="sequence-rail-world">
          ${e.participants.map(t=>this.#b(t,e))}
        </div>
      </div>
    `}#b(e,t){const a=t.x.get(e.id)??0,n=this.#d(e.id);return u`
      <button
        type="button"
        class=${this.elementClass(n,"sequence-participant",e.external&&"is-external")}
        data-participant=${e.id}
        data-grill-questions=${this.questionsOf(e)}
        style="left:${a-95}px"
        aria-pressed=${n.selected?"true":"false"}
        title=${e.description??e.name}
        @click=${()=>this.select({kind:"participant",id:e.id})}
      >
        <span class="sequence-symbol" aria-hidden="true">${e.symbol??e.name.slice(0,2)}</span>
        <span>
          <span class="sequence-name">${e.name}</span>
          ${e.role===null?w:u`<span class="sequence-role">${e.role}</span>`}
        </span>
      </button>
      ${this.renderCommentTrigger({kind:"participant",id:e.id},e.name,{x:a+95-34,y:17})}
    `}renderCanvas(){const e=this.#e;return e===null?u``:u`
      ${this.#h(e)}
      ${e.frames.map(t=>u`<div
          class="sequence-frame"
          style="left:${t.x}px; top:${t.y}px; width:${t.width}px; height:${t.height}px"
        ></div>`)}
      ${e.frames.map(t=>this.#f(t.fragment,t.x,t.y,t.width,t.count))}
      ${e.branches.map(t=>u`<span class="sequence-branch" style="left:${t.x}px; top:${t.y}px"
          >[${t.label}]</span
        >`)}
      ${e.folds.map(t=>u`<span class="sequence-fold" style="left:${t.x}px; top:${t.y}px"
          >${t.fragment.branches.map(a=>`[${a.label}]`).join(" / ")}</span
        >`)}
      ${e.rows.map(t=>this.#m(t.y,t.message,e))}
    `}#h(e){const t=e.participants.map(i=>U`<path
          class="sequence-lifeline"
          d=${`M${e.x.get(i.id)??0} 0 V${e.height}`}
        ></path>`),a=e.dividers.map(i=>U`<path class="sequence-divider" d=${`M${i.x} ${i.y} h${i.width}`}></path>`),n=e.rows.map(i=>{const s=e.x.get(i.message.from)??0,o=e.x.get(i.message.to)??0,d=s===o?`M${s} ${i.y} h42 v25 H${s}`:`M${s} ${i.y} H${o}`,l=this.#p(i.message.id),f=l.selected?"seq-selected":l.related?"seq-related":i.message.style==="async"?"seq-async":i.message.style==="response"?"seq-response":"seq-request",m=()=>this.select({kind:"message",id:i.message.id});return U`
        <g
          class=${this.elementClass(l,"sequence-message-row","d-edge",`is-${i.message.style}`)}
          data-message=${i.message.id}
        >
          <title>${this.#o(i.message)}</title>
          <path class="d-edge-hit" d=${d} role="button" tabindex="0"
            aria-label=${`${i.message.title}\u3092\u9078\u629E`}
            @click=${m}
            @keydown=${c=>{c.key!=="Enter"&&c.key!==" "||(c.preventDefault(),m())}}></path>
          <path class="sequence-message is-${i.message.style}" d=${d} marker-end=${`url(#${f})`}></path>
        </g>
      `});return u`<svg class="diagram-edges" width=${e.width} height=${e.height}>
      ${Re(ei)} ${t} ${a} ${n}
    </svg>`}#f(e,t,a,n,i){const s=this.#c(e);return u`
      <button
        type="button"
        class="sequence-frame-header"
        data-fragment=${e.id}
        style="left:${t}px; top:${a}px; width:${n}px"
        aria-expanded=${s?"false":"true"}
        aria-label=${`${e.operator} \xB7 ${e.title}\u3092${s?"\u5C55\u958B":"\u6298\u308A\u305F\u305F\u3080"}`}
        @click=${()=>this.#u(e)}
      >
        <span aria-hidden="true">${s?"\u25B8":"\u25BE"}</span>
        <span class="sequence-operator">${e.operator}</span>
        <span class="sequence-text">${e.title}</span>
        <span class="sequence-frame-count">${i} メッセージ</span>
      </button>
    `}#m(e,t,a){const n=a.x.get(t.from)??0,i=a.x.get(t.to)??0,s=n===i,o=this.#p(t.id),d=s?n+12:Math.min(n,i)+14,l=s?175:Math.abs(i-n)-28;return u`
      <button
        type="button"
        class=${this.elementClass(o,"sequence-label")}
        data-message-label=${t.id}
        data-grill-questions=${this.questionsOf(t)}
        style="left:${d}px; top:${e-28}px; width:${l}px"
        title=${this.#o(t)}
        @click=${()=>this.select({kind:"message",id:t.id})}
      >
        <span class="sequence-number">${this.#a.get(t.id)??""}</span>
        <span class="sequence-text">${t.title}</span>
      </button>
      ${this.renderCommentTrigger({kind:"message",id:t.id},`${this.#a.get(t.id)??""} ${t.title}`.trim(),{x:d+l-30,y:e-31})}
    `}}const Je="artifact-sequence-diagram",_e=(r=Je)=>{customElements.get(r)||customElements.define(r,Xe)},Ze={width:176,height:84},ai=z({id:k(p(),$(1)),name:k(p(),$(1)),path:g(p()),layer:g(p()),tags:g(L(p()),[]),description:g(p()),questions:g(p())}),ii=z({id:k(p(),$(1)),from:k(p(),$(1)),to:k(p(),$(1)),contract:g(p()),description:g(p()),questions:g(p())}),ri=z({modules:L(ai),dependencies:g(L(ii),[])}),ni=()=>({nodes:[],edges:[]}),si=r=>{const e=Y(ri,r),t=new Set;for(const i of e.modules){if(t.has(i.id))throw new Error(`duplicate module id: ${i.id}`);t.add(i.id)}const a=new Set,n=e.dependencies.map(i=>{if(a.has(i.id))throw new Error(`duplicate dependency id: ${i.id}`);if(a.add(i.id),!t.has(i.from))throw new Error(`unknown dependency source: ${i.from}`);if(!t.has(i.to))throw new Error(`unknown dependency target: ${i.to}`);return{id:i.id,from:i.from,to:i.to,tags:[],contract:i.contract??null,description:i.description??null}});return{nodes:e.modules.map(i=>({id:i.id,name:i.name,path:i.path??null,layer:i.layer??null,description:i.description??null,tags:i.tags,width:Ze.width,height:Ze.height,...i.questions===void 0?{}:{questions:i.questions}})),edges:n}},oi=N`
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
`,di=[{id:"dep-neutral"},{id:"dep-outgoing"},{id:"dep-incoming"},{id:"dep-cycle"},{id:"dep-selected"}];class Qe extends Q{static{this.styles=[B,oi]}#e="both";#a=!1;#i=!1;#t=[];#r=H;#n=H;parseData(e){return si(e)}emptyData(){return ni()}defaultHeading(){return"Dependencies"}statsLabels(){return{node:"\u30E2\u30B8\u30E5\u30FC\u30EB",edge:"\u4F9D\u5B58"}}emptyMessage(){return this.#i?"\u8A72\u5F53\u3059\u308B\u5FAA\u74B0\u4F9D\u5B58\u306F\u3042\u308A\u307E\u305B\u3093\u3002":"\u8A72\u5F53\u3059\u308B\u30E2\u30B8\u30E5\u30FC\u30EB\u306F\u3042\u308A\u307E\u305B\u3093\u3002"}layoutOptions(){return{nodeSpacing:40,layerSpacing:96,padding:32}}relations(e,t){return e===null||e.kind!=="node"?H:{nodes:new Map([...this.#r.nodes,...this.#n.nodes]),edges:new Set([...this.#r.edges,...this.#n.edges])}}refreshContent(){const e=this.items(),t=this.tagFilter,a=e.nodes.filter(o=>X(o.tags,t)),n=new Set(a.map(o=>o.id)),i=e.edges.filter(o=>n.has(o.from)&&n.has(o.to));this.#t=ya(a.map(o=>o.id),i);const s=this.selection;this.#r=s!==null&&s.kind==="node"&&this.#e!=="incoming"?I(i,s.id,"outgoing",this.#a):H,this.#n=s!==null&&s.kind==="node"&&this.#e!=="outgoing"?I(i,s.id,"incoming",this.#a):H,super.refreshContent()}matchesFilter(e){return this.#i?ce(this.#t).has(e.id):!0}filtered(){const e=super.filtered();if(!this.#i)return e;const t=ce(this.#t),a=e.edges.filter(i=>Le(i,t)),n=new Set(a.flatMap(i=>[i.from,i.to]));return{nodes:e.nodes.filter(i=>n.has(i.id)),edges:a}}renderToolbarActions(){const e=this.#t.length;return u`
      <div class="dep-direction" role="group" aria-label="選択したモジュールから追う方向">
        ${[["outgoing","\u4F9D\u5B58\u5148"],["incoming","\u4F9D\u5B58\u5143"],["both","\u4E21\u65B9"]].map(([t,a])=>u`
            <button
              type="button"
              data-direction=${t}
              aria-pressed=${this.#e===t?"true":"false"}
              @click=${()=>this.#s(t)}
            >
              ${a}
            </button>
          `)}
      </div>
      <button
        type="button"
        class="af-btn af-btn--ghost dep-toggle"
        data-toggle="transitive"
        aria-pressed=${this.#a?"true":"false"}
        @click=${()=>{this.#a=!this.#a,this.requestUpdate()}}
      >
        間接も含む
      </button>
      <button
        type="button"
        class="af-btn af-btn--ghost dep-toggle"
        data-toggle="cycles"
        aria-pressed=${this.#i?"true":"false"}
        aria-label=${`\u5FAA\u74B0\u4F9D\u5B58 ${e} \u30B0\u30EB\u30FC\u30D7\u3060\u3051\u8868\u793A`}
        ?disabled=${!this.#i&&e===0}
        @click=${()=>{this.#i=!this.#i,this.requestUpdate()}}
      >
        循環 ${e}
      </button>
    `}renderLegend(){return u`<div class="diagram-legend">
      <span><i class="dep-swatch-outgoing"></i>依存先</span>
      <span><i class="dep-swatch-incoming"></i>依存元</span>
      <span><i class="dep-swatch-cycle"></i>循環</span>
    </div>`}#s(e){this.#e=e,this.requestUpdate()}#o(e,t){const a=this.selection;return a!==null&&a.kind==="edge"&&a.id===e.id?"dep-selected":Le(e,t)?"dep-cycle":this.#r.edges.has(e.id)?"dep-outgoing":this.#n.edges.has(e.id)?"dep-incoming":"dep-neutral"}renderCanvas(){const e=this.visible,t=ce(this.#t),a=s=>e.nodes.find(o=>o.id===s)?.name??s,n=e.edges.map(s=>{const o=this.edgeState(s.id),d=this.routeOf(s.id),l=Z(d),f=()=>this.select({kind:"edge",id:s.id});return U`
        <g class=${this.elementClass(o,"d-edge","dep-edge")} data-dependency=${s.id}>
          <title>${[s.contract,s.description].filter(m=>m!==null).join(`
`)||s.id}</title>
          <path class="d-edge-path" d=${l} marker-end=${`url(#${this.#o(s,t)})`}></path>
          <path
            class="d-edge-hit"
            d=${l}
            role="button"
            tabindex="0"
            aria-label=${`${a(s.from)} \u304C ${a(s.to)} \u306B\u4F9D\u5B58`}
            @click=${f}
            @keydown=${m=>{m.key!=="Enter"&&m.key!==" "||(m.preventDefault(),f())}}
          ></path>
          ${this.renderEdgeCommentTrigger({kind:"edge",id:s.id},`${a(s.from)} \u2192 ${a(s.to)}`,d)}
        </g>
      `}),i=e.nodes.map(s=>{const o=this.placedNode(s.id);if(!o)return w;const d=this.nodeState(s.id),l=t.has(s.id),f=this.#r.nodes.has(s.id),m=this.#n.nodes.has(s.id);return u`
        <button
          type="button"
          class=${this.elementClass(d,"d-node","dep-module",l&&"is-cyclic",f&&"is-dependency",m&&"is-dependent")}
          data-module=${s.id}
          data-grill-questions=${this.questionsOf(s)}
          style="left:${o.x}px; top:${o.y}px; width:${s.width}px; height:${s.height}px"
          aria-pressed=${d.selected?"true":"false"}
          aria-label=${`${s.name}${l?"\u30FB\u5FAA\u74B0\u4F9D\u5B58\u3042\u308A":""}`}
          title=${[s.path??s.name,s.description].filter(c=>c!==null).join(`
`)}
          @click=${()=>this.select({kind:"node",id:s.id})}
        >
          <span class="dep-head">
            <span class="dep-layer">${s.layer??""}</span>
            ${l?u`<span class="dep-cycle-badge">循環</span>`:w}
          </span>
          <span class="dep-name">${s.name}</span>
          <span class="dep-path">${s.path??""}</span>
        </button>
        ${this.renderCommentTrigger({kind:"node",id:s.id},s.name,{x:o.x+s.width-20,y:o.y-14})}
      `});return u`${this.renderEdges(n,di)}${i}`}}const Ge="artifact-dependency-graph",et=(r=Ge)=>{customElements.get(r)||customElements.define(r,Qe)},tt=276,ge=74,li=28,ci=44,pi=z({id:k(p(),$(1)),type:k(p(),$(1)),key:g(F(["PK","FK","UQ"])),ref:g(p()),nullable:g(oe(),!1),questions:g(p())}),hi=z({id:k(p(),$(1)),name:k(p(),$(1)),tags:g(L(p()),[]),fields:L(pi),questions:g(p())}),at=z({tables:L(hi)}),ui=z({before:g(at),after:at}),fi=()=>({nodes:[],edges:[]}),it=r=>({id:r.id,type:r.type,key:r.key??null,ref:r.ref??null,nullable:r.nullable,questions:r.questions??null}),rt=(r,e)=>r.type===e.type&&r.key===e.key&&r.ref===e.ref&&r.nullable===e.nullable,ie=r=>r.status==="changed"?ci:li,nt=r=>ge+r.reduce((e,t)=>e+ie(t),0),st=(r,e)=>{let t=ge;for(const a of r){if(a.id===e)return t+ie(a)/2;t+=ie(a)}return ge/2},ot=r=>r.flatMap(e=>e.fields.flatMap(t=>{if(t.ref===void 0)return[];const[a,n]=t.ref.split(".");if(a===void 0||n===void 0)throw new Error(`invalid ref "${t.ref}" on ${e.id}.${t.id}; expected table.field`);return[{id:`${a}:${n}>${e.id}:${t.id}`,from:a,to:e.id,sourceField:n,targetField:t.id}]})),mi=(r,e)=>[...new Set([...r,...e].map(t=>t.id))].flatMap(t=>{const a=r.find(d=>d.id===t),n=e.find(d=>d.id===t),i=n??a;if(!i)return[];const s=it(i);if(!a)return[{...s,status:"added",before:null}];if(!n)return[{...s,status:"removed",before:null}];const o=it(a);return[{...s,status:rt(o,s)?"same":"changed",before:rt(o,s)?null:o}]}),gi=r=>{const e=Y(ui,r),t=e.before?.tables??e.after.tables,a=e.after.tables,n=[...new Set([...t,...a].map(c=>c.id))],i=new Map;for(const c of[...t,...a])i.set(c.id,c.tags);const s=n.flatMap(c=>{const v=t.find(C=>C.id===c),q=a.find(C=>C.id===c),b=q??v;if(!b)return[];const M=mi(v?.fields??[],q?.fields??[]),S=v?q?M.some(C=>C.status!=="same")?"changed":"same":"removed":"added";return[{id:c,name:b.name,status:S,fields:M,tags:i.get(c)??[],width:tt,height:nt(M),...b.questions===void 0?{}:{questions:b.questions}}]}),o=new Map(s.map(c=>[c.id,c])),d=ot(t),l=ot(a),f=[...new Set([...d,...l].map(c=>c.id))].flatMap(c=>{const v=d.find(j=>j.id===c),q=l.find(j=>j.id===c),b=q??v;if(!b)return[];const M=o.get(b.from),S=o.get(b.to);if(!M||!S)return[];const C=v?q?"same":"removed":"added";return[{id:c,from:b.from,to:b.to,sourceField:b.sourceField,targetField:b.targetField,status:C,tags:[],fromPort:`${c}:out`,toPort:`${c}:in`}]}),m=c=>{const v={},q={};for(const b of f)b.from===c.id&&(v[`${b.id}:out`]={x:tt,y:st(c.fields,b.sourceField)}),b.to===c.id&&(q[`${b.id}:in`]={x:0,y:st(c.fields,b.targetField)});return{out:v,in:q}};return{nodes:s.map(c=>{const v=m(c);return{...c,ports:{...v.out,...v.in}}}),edges:f}},bi=N`
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

  .er-table:has(> .diagram-comment-trigger) .er-head {
    padding-right: 46px;
  }

  .er-table > .diagram-comment-trigger {
    position: absolute;
    top: 8px;
    right: 8px;
  }

  .er-table:hover,
  .er-table:focus-within,
  .er-edge:hover,
  .er-edge:focus-within {
    opacity: 1;
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
`,xi=[{id:"er-neutral"},{id:"er-added"},{id:"er-removed"},{id:"er-selected"}],dt={same:"\u5909\u66F4\u306A\u3057",added:"\u8FFD\u52A0",removed:"\u524A\u9664",changed:"\u5909\u66F4"},lt={same:"",added:"+",removed:"\u2212",changed:"~"};class ct extends Q{static{this.styles=[B,bi]}#e="";parseData(e){return gi(e)}emptyData(){return fi()}defaultHeading(){return"ERD"}statsLabels(){return{node:"\u30C6\u30FC\u30D6\u30EB",edge:"\u95A2\u9023"}}emptyMessage(){return"\u8A72\u5F53\u3059\u308B\u30C6\u30FC\u30D6\u30EB\u306F\u3042\u308A\u307E\u305B\u3093\u3002"}layoutOptions(){return{nodeSpacing:38,layerSpacing:96,padding:32}}matchesFilter(e){return this.#e===""?!0:[e.id,e.name,...e.fields.map(t=>t.id)].some(t=>t.toLowerCase().includes(this.#e))}relations(e,t){if(e===null||e.kind!=="node")return H;const a=I(t.edges,e.id,"outgoing",!1),n=I(t.edges,e.id,"incoming",!1);return{nodes:new Map([...a.nodes,...n.nodes]),edges:new Set([...a.edges,...n.edges])}}renderToolbarActions(){return u`
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
    `}renderLegend(){return u`<div class="diagram-legend">
      <span><i class="er-swatch-added"></i>追加</span>
      <span><i class="er-swatch-removed"></i>削除</span>
      <span><i class="er-swatch-changed"></i>変更</span>
    </div>`}#a(e){const t=this.selection;return t!==null&&t.kind==="edge"?"er-selected":e==="added"?"er-added":e==="removed"?"er-removed":"er-neutral"}renderCanvas(){const e=this.visible,t=e.edges.map(a=>{const n=this.edgeState(a.id),i=this.routeOf(a.id),s=Z(i),o=()=>this.select({kind:"edge",id:a.id});return U`
        <g class=${this.elementClass(n,"d-edge","er-edge",`is-${a.status}`)} data-relation=${a.id}>
          <title>${`${a.from}.${a.sourceField} \u2192 ${a.to}.${a.targetField}`}</title>
          <path class="d-edge-path" d=${s} marker-end=${`url(#${this.#a(a.status)})`}></path>
          <path
            class="d-edge-hit"
            d=${s}
            role="button"
            tabindex="0"
            aria-label=${`${a.from} \u3068 ${a.to} \u306E\u95A2\u9023`}
            @click=${o}
            @keydown=${d=>{d.key!=="Enter"&&d.key!==" "||(d.preventDefault(),o())}}
          ></path>
          ${i.length>0?this.#i(i,a.status):w}
          ${this.renderEdgeCommentTrigger({kind:"edge",id:a.id},`${a.from}.${a.sourceField} \u2192 ${a.to}.${a.targetField}`,i)}
        </g>
      `});return u`${this.renderEdges(t,xi)}${e.nodes.map(a=>this.#t(a))}`}#i(e,t){const a=e[0],n=e.at(-1);return!a||!n?u``:U`
      <text class="er-cardinality is-${t}" x=${a.x+9} y=${a.y-5}>1</text>
      <text class="er-cardinality is-${t}" x=${n.x-13} y=${n.y-5}>N</text>
    `}#t(e){const t=this.placedNode(e.id);if(!t)return w;const a=this.nodeState(e.id);return u`
      <div
        class=${this.elementClass(a,"d-node","er-table",`is-${e.status}`)}
        data-er-table=${e.id}
        data-grill-questions=${this.questionsOf(e)}
        style="left:${t.x}px; top:${t.y}px; width:${e.width}px; height:${nt(e.fields)}px"
      >
        <button
          type="button"
          class="er-head"
          data-table=${e.id}
          aria-pressed=${a.selected?"true":"false"}
          title=${`${e.id} / ${e.name}`}
          @click=${()=>this.select({kind:"node",id:e.id})}
        >
          ${e.status==="same"?w:u`<span class="er-mark" aria-hidden="true">${lt[e.status]}</span>`}
          <span class="er-name">${e.id}</span>
          <span class="er-label">${e.name}</span>
          <span class="af-label er-status">${dt[e.status]}</span>
        </button>
        ${this.renderCommentTrigger({kind:"node",id:e.id},`${e.id} \xB7 ${e.name}`)}
        <div class="er-fields">${e.fields.map(n=>this.#r(n))}</div>
      </div>
    `}#r(e){const t=n=>[n.type,n.key??"\u2014",n.ref??null,n.nullable?"null\u53EF":null].filter(Boolean).join(" \xB7 "),a=this.#e!==""&&e.id.toLowerCase().includes(this.#e);return u`
      <div
        class="er-field is-${e.status} ${a?"is-match":""}"
        style="height:${ie(e)}px"
        data-grill-questions=${this.questionsOf(e)}
        title=${[dt[e.status],e.id,t(e)].filter(Boolean).join(" / ")}
      >
        <span class="er-field-mark" aria-hidden="true">${lt[e.status]}</span>
        <span class="er-key" data-empty=${e.key===null?"true":"false"}>${e.key??"\xB7"}</span>
        <span class="er-field-name">${e.id}</span>
        ${e.status==="changed"&&e.before!==null?u`<span class="er-change">
                <del>− ${t(e.before)}</del>
                <ins>+ ${t(e)}</ins>
              </span>`:u`<span class="er-field-type">${t(e)}</span>`}
      </div>
    `}}const pt="artifact-er-diagram",ht=(r=pt)=>{customElements.get(r)||customElements.define(r,ct)},ut={width:220,height:112},re=26,vi=z({src:k(p(),$(1)),alt:k(p(),$(1)),license:g(p())}),yi=z({id:k(p(),$(1)),name:k(p(),$(1)),description:g(p()),boundary:g(p()),symbol:g(p()),tags:g(L(p()),[]),artwork:g(vi),position:z({x:_(),y:_()}),questions:g(p())}),wi=z({id:k(p(),$(1)),label:k(p(),$(1)),kind:g(F(["internal","external"]),"internal")}),ki=z({id:k(p(),$(1)),from:k(p(),$(1)),to:k(p(),$(1)),label:g(p())}),$i=z({boundaries:g(L(wi),[]),services:L(yi),links:g(L(ki),[])}),qi=()=>({nodes:[],edges:[],boundaries:[]}),Mi=r=>{const e=Y($i,r),t=new Set;for(const o of e.boundaries){if(t.has(o.id))throw new Error(`duplicate boundary id: ${o.id}`);t.add(o.id)}const a=new Set,n=e.services.map(o=>{if(a.has(o.id))throw new Error(`duplicate service id: ${o.id}`);if(a.add(o.id),o.boundary!==void 0&&!t.has(o.boundary))throw new Error(`unknown boundary: ${o.boundary}`);return{id:o.id,name:o.name,description:o.description??null,boundary:o.boundary??null,symbol:o.symbol??null,artwork:o.artwork?{src:o.artwork.src,alt:o.artwork.alt,license:o.artwork.license??null}:null,tags:o.tags,width:ut.width,height:ut.height,position:o.position,...o.questions===void 0?{}:{questions:o.questions}}}),i=new Set,s=e.links.map(o=>{if(i.has(o.id))throw new Error(`duplicate link id: ${o.id}`);if(i.add(o.id),!a.has(o.from))throw new Error(`unknown link source: ${o.from}`);if(!a.has(o.to))throw new Error(`unknown link target: ${o.to}`);return{id:o.id,from:o.from,to:o.to,label:o.label??null,tags:[]}});return{nodes:n,edges:s,boundaries:e.boundaries.map(o=>({id:o.id,label:o.label,kind:o.kind}))}},be={left:re,top:re*1.6,right:re,bottom:re},Si={left:0,top:0,right:0,bottom:0},Ei=12,ft=r=>({left:Math.min(...r.map(e=>e.position?.x??0)),top:Math.min(...r.map(e=>e.position?.y??0)),right:Math.max(...r.map(e=>(e.position?.x??0)+e.width)),bottom:Math.max(...r.map(e=>(e.position?.y??0)+e.height))}),zi=(r,e,t,a)=>{const n=r.left-e.left<t.right+a.right&&t.left-a.left<r.right+e.right,i=r.top-e.top<t.bottom+a.bottom&&t.top-a.top<r.bottom+e.bottom;if(!n||!i)return e;const s=Math.max(t.left-r.right,r.left-t.right),o=Math.max(t.top-r.bottom,r.top-t.bottom);if(s<0&&o<0)return e;const d=(l,f,m)=>l===0?0:Math.max(0,m-Ei)*l/(l+f);return s>=o?t.left>=r.right?{...e,right:Math.min(e.right,d(e.right,a.left,s))}:{...e,left:Math.min(e.left,d(e.left,a.right,s))}:t.top>=r.bottom?{...e,bottom:Math.min(e.bottom,d(e.bottom,a.top,o))}:{...e,top:Math.min(e.top,d(e.top,a.bottom,o))}},Ci=(r,e)=>{const t=e.flatMap(n=>{const i=r.filter(s=>s.boundary===n.id);return i.length===0?[]:[{boundary:n,bounds:ft(i)}]}),a=[...t.map(n=>({id:n.boundary.id,bounds:n.bounds,padding:be})),...r.filter(n=>n.boundary===null||!t.some(i=>i.boundary.id===n.boundary)).map(n=>({id:null,bounds:ft([n]),padding:Si}))];return t.map(({boundary:n,bounds:i})=>{const s=a.filter(l=>l.id!==n.id).map(l=>zi(i,be,l.bounds,l.padding)).reduce((l,f)=>({left:Math.min(l.left,f.left),top:Math.min(l.top,f.top),right:Math.min(l.right,f.right),bottom:Math.min(l.bottom,f.bottom)}),be),o=i.left-s.left,d=i.top-s.top;return{boundary:n,x:o,y:d,width:i.right+s.right-o,height:i.bottom+s.bottom-d}})},Ti=(r,e)=>{const t=i=>i.y+i.height/2,a=i=>i.x+i.width/2,n=(i,s,o)=>{if(o?i.y===s.y:i.x===s.x)return[i,s];if(o){const l=(i.x+s.x)/2;return[i,{x:l,y:i.y},{x:l,y:s.y},s]}const d=(i.y+s.y)/2;return[i,{x:i.x,y:d},{x:s.x,y:d},s]};return e.x>=r.x+r.width?n({x:r.x+r.width,y:t(r)},{x:e.x,y:t(e)},!0):r.x>=e.x+e.width?n({x:r.x,y:t(r)},{x:e.x+e.width,y:t(e)},!0):e.y>=r.y+r.height?n({x:a(r),y:r.y+r.height},{x:a(e),y:e.y},!1):r.y>=e.y+e.height?n({x:a(r),y:r.y},{x:a(e),y:e.y+e.height},!1):null},Di=(r,e)=>{const t=new Map(r.nodes.map(n=>[n.id,n])),a=r.routes.map(n=>{const i=e.find(l=>l.id===n.id),s=i?t.get(i.from):void 0,o=i?t.get(i.to):void 0,d=s&&o&&s!==o?Ti(s,o):null;return d===null?n:{id:n.id,points:d}});return{...r,routes:a}},Li=N`
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
`,Ai=[{id:"arch-neutral"},{id:"arch-selected"}];class mt extends Q{static{this.styles=[B,Li]}#e=!0;parseData(e){return Mi(e)}emptyData(){return qi()}defaultHeading(){return"Architecture"}statsLabels(){return{node:"\u30B5\u30FC\u30D3\u30B9",edge:"\u63A5\u7D9A"}}emptyMessage(){return"\u8A72\u5F53\u3059\u308B\u30B5\u30FC\u30D3\u30B9\u306F\u3042\u308A\u307E\u305B\u3093\u3002"}get layoutMode(){return"fixed"}layoutOptions(){return{padding:40}}computePlacement(e){return Di(super.computePlacement(e),e.edges)}isEmpty(){return this.visible.nodes.length===0}contentSize(){const e=super.contentSize();if(e===null)return null;const t=this.#a();return t.length===0?e:{width:Math.max(e.width,...t.map(a=>a.x+a.width)),height:Math.max(e.height,...t.map(a=>a.y+a.height))}}relations(e,t){if(e===null||e.kind!=="node")return H;const a=I(t.edges,e.id,"outgoing",!1),n=I(t.edges,e.id,"incoming",!1);return{nodes:new Map([...a.nodes,...n.nodes]),edges:new Set([...a.edges,...n.edges])}}renderToolbarActions(){return u`
      <button
        type="button"
        class="af-btn af-btn--ghost arch-toggle"
        data-toggle="boundaries"
        aria-pressed=${this.#e?"true":"false"}
        @click=${()=>{this.#e=!this.#e,this.requestUpdate()}}
      >
        境界
      </button>
    `}#a(){const e=this.visible.nodes.flatMap(t=>{const a=this.placedNode(t.id);return a?[{...t,position:{x:a.x,y:a.y}}]:[]});return Ci(e,this.items().boundaries)}renderCanvas(){const e=this.visible,t=n=>e.nodes.find(i=>i.id===n)?.name??n,a=e.edges.map(n=>{const i=this.edgeState(n.id),s=this.routeOf(n.id),o=Z(s),d=()=>this.select({kind:"edge",id:n.id});return U`
        <g class=${this.elementClass(i,"d-edge","arch-link")} data-link=${n.id}>
          <title>${n.label??n.id}</title>
          <path
            class="d-edge-path"
            d=${o}
            marker-end=${`url(#${i.selected?"arch-selected":"arch-neutral"})`}
          ></path>
          <path
            class="d-edge-hit"
            d=${o}
            role="button"
            tabindex="0"
            aria-label=${`${t(n.from)} \u304B\u3089 ${t(n.to)} \u3078\u306E\u63A5\u7D9A`}
            @click=${d}
            @keydown=${l=>{l.key!=="Enter"&&l.key!==" "||(l.preventDefault(),d())}}
          ></path>
          ${n.label===null||s.length===0?w:this.#i(n.label,s)}
          ${this.renderEdgeCommentTrigger({kind:"edge",id:n.id},`${t(n.from)} \u2192 ${t(n.to)}${n.label===null?"":` \xB7 ${n.label}`}`,s)}
        </g>
      `});return u`
      ${this.#e?this.#a().map(n=>u`<div
                class=${`arch-boundary ${n.boundary.kind==="external"?"is-external":""}`}
                data-boundary=${n.boundary.id}
                style="left:${n.x}px; top:${n.y}px; width:${n.width}px; height:${n.height}px"
              >
                <span>${n.boundary.label}</span>
              </div>`):w}
      ${this.renderEdges(a,Ai)} ${e.nodes.map(n=>this.#t(n))}
    `}#i(e,t){const a=t[Math.floor(t.length/2)]??t[0];return a?U`<text class="arch-link-label" x=${a.x} y=${a.y-6}>${e}</text>`:u``}#t(e){const t=this.placedNode(e.id);if(!t)return w;const a=this.nodeState(e.id);return u`
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
        ${e.artwork===null?u`<span class="arch-symbol" aria-hidden="true">${e.symbol??e.name.slice(0,2)}</span>`:u`<img
                class="arch-artwork"
                src=${e.artwork.src}
                alt=${e.artwork.alt}
                title=${e.artwork.license===null?w:`\u30A2\u30A4\u30B3\u30F3\u51FA\u5178: ${e.artwork.license}`}
              />`}
        <span class="arch-body">
          <span class="arch-name">${e.name}</span>
          ${e.description===null?w:u`<span class="arch-description">${e.description}</span>`}
        </span>
      </button>
      ${this.renderCommentTrigger({kind:"node",id:e.id},e.name,{x:t.x+e.width-20,y:t.y-14})}
    `}}const gt="artifact-architecture-map",bt=(r=gt)=>{customElements.get(r)||customElements.define(r,mt)},xt=[72,52,40],vt=[0,22,10,8],ji=r=>xt[Math.min(r,xt.length-1)]??40,yt=r=>vt[Math.min(r,vt.length-1)]??8,Ri=(r,e={})=>{const t=e.padding??40,a=r.nodes.find(x=>x.parent===null);if(a===void 0)return{width:0,height:0,nodes:[],routes:[]};const n=new Map(r.nodes.map(x=>[x.id,x])),i=x=>x.children.flatMap(T=>{const A=n.get(T);return A===void 0?[]:[A]}),s=new Map,o=x=>x.reduce((T,A,P)=>T+d(A)+(P===0?0:yt(A.depth)),0),d=x=>{const T=s.get(x.id);if(T!==void 0)return T;const A=Math.max(x.height,o(i(x)));return s.set(x.id,A),A},l=[],f=(x,T,A)=>{if(T.length===0)return;const P=ji(x.node.depth);let h=x.y+x.node.height/2-o(T)/2;for(const y of T){const E=d(y),D={x:A==="right"?x.x+x.node.width+P:x.x-P-y.width,y:h+E/2-y.height/2,node:y};l.push(D),f(D,i(y),A),h+=E+yt(y.depth)}},m={x:-a.width/2,y:-a.height/2,node:a};l.push(m);const c=i(a);f(m,c.filter(x=>x.side!=="left"),"right"),f(m,c.filter(x=>x.side==="left"),"left");const v=Math.min(...l.map(x=>x.x)),q=Math.min(...l.map(x=>x.y)),b=Math.max(...l.map(x=>x.x+x.node.width)),M=Math.max(...l.map(x=>x.y+x.node.height)),S=t-v,C=t-q,j=new Map,V=l.map(x=>{const T=j.get(x.node.depth)??0;return j.set(x.node.depth,T+1),{id:x.node.id,x:x.x+S,y:x.y+C,width:x.node.width,height:x.node.height,layer:x.node.depth,order:T}}),O=new Map(V.map(x=>[x.id,x])),ee=r.edges.flatMap(x=>{const T=O.get(x.from),A=O.get(x.to),P=n.get(x.to);if(T===void 0||A===void 0||P===void 0)return[];const h=P.side==="left",y={x:h?T.x:T.x+T.width,y:T.y+T.height/2},E={x:h?A.x+A.width:A.x,y:A.y+A.height/2};return[{id:x.id,points:[y,E]}]});return{width:b-v+t*2,height:M-q+t*2,nodes:V,routes:ee}},Ui=r=>{const e=r[0],t=r.at(-1);if(e===void 0||t===void 0)return"";const a=(t.x-e.x)/2;return`M${e.x} ${e.y} C${e.x+a} ${e.y} ${t.x-a} ${t.y} ${t.x} ${t.y}`},wt=_t(()=>z({id:k(p(),$(1)),label:k(p(),$(1)),description:g(p()),tags:g(L(p())),questions:g(p()),collapsed:g(oe()),side:g(F(["left","right"])),children:g(L(wt))})),Ii=z({root:wt}),kt=()=>({root:null,nodes:[],edges:[]}),$t=[{fontSize:16,padding:22,height:48,min:120,max:280},{fontSize:13.5,padding:15,height:34,min:80,max:240},{fontSize:12.5,padding:12,height:28,min:56,max:220}],Oi=r=>$t[Math.min(r,$t.length-1)]??{fontSize:12.5,padding:12,height:28,min:56,max:220},Pi=(r,e)=>{let t=0;for(const a of r)t+=(a.codePointAt(0)??0)>=11904?e:e*.62;return t},Fi=(r,e)=>{const t=Oi(e),a=Math.ceil(Pi(r,t.fontSize)+t.padding*2+4);return{width:Math.min(t.max,Math.max(t.min,a)),height:t.height}},xe=r=>r.children===void 0||r.children.length===0?1:r.children.reduce((e,t)=>e+xe(t),0),qt=r=>{const e={left:0,right:0};for(const t of r)t.side!==void 0&&(e[t.side]+=xe(t));return r.map(t=>{if(t.side!==void 0)return t.side;const a=e.right<=e.left?"right":"left";return e[a]+=xe(t),a})},Mt=r=>St(Y(Ii,r).root),St=(r,e=new Set)=>{const t=[],a=[],n=new Set,i=(s,o,d,l,f)=>{if(n.has(s.id))throw new Error(`duplicate topic id: ${s.id}`);if(n.add(s.id),s.side!==void 0&&d!==1)throw new Error(`side is only allowed on a main topic (a child of the root): ${s.id}`);const m=s.children??[];t.push({id:s.id,label:s.label,description:s.description??null,parent:o,depth:d,branch:l,side:f,children:m.map(v=>v.id),collapsed:s.collapsed??!1,added:e.has(s.id),tags:s.tags??[],...Fi(s.label,d),...s.questions===void 0?{}:{questions:s.questions}}),o!==null&&a.push({id:s.id,from:o,to:s.id,tags:[]});const c=d===0?qt(m):[];m.forEach((v,q)=>i(v,s.id,d+1,d===0?q:l,d===0?c[q]??"right":f))};return i(r,null,0,-1,null),{root:r,nodes:t,edges:a}},Et="ADD_TOPIC",Hi=le({id:k(p(),$(1)),label:k(p(),ke(),$(1))}),Vi=r=>{const e=Ae(r);return e?.length===3&&e[1]==="node"?e[2]??null:null},zt=(r,e,t)=>r.id===e?{...r,children:[...r.children??[],t]}:r.children===void 0?r:{...r,children:r.children.map(a=>zt(a,e,t))},Ni=r=>{if(r.children===void 0)return r;const e=qt(r.children);return{...r,children:r.children.map((t,a)=>({...t,side:e[a]??"right"}))}},Yi=(r,e)=>{const t="\u30C8\u30D4\u30C3\u30AF\u3092\u8FFD\u52A0",a=new Map(r.nodes.map(o=>[o.id,o.label])),n=new Set,i=[];let s=r.root===null?null:Ni(r.root);for(const o of e){if(o.type!==Et){i.push({id:o.id,title:o.type,stale:"unsupported-action-type"});continue}const d=Vi(o.target.id),l=d===null?void 0:a.get(d),f=de(Hi,o.payload);if(s===null||d===null||l===void 0){i.push({id:o.id,title:t,stale:"target-missing"});continue}if(!f.success||a.has(f.output.id)){i.push({id:o.id,title:t,stale:"constraint-violated"});continue}const{id:m,label:c}=f.output;s=zt(s,d,{id:m,label:c}),a.set(m,c),n.add(m),i.push({id:o.id,title:t,summary:`${l} \u203A ${c}`,tone:"create"})}return{data:s===null||n.size===0?r:St(s,n),results:i}},ve=(r,e)=>{const t=new Map(r.nodes.map(i=>[i.id,i])),a=[];let n=t.get(e)?.parent??null;for(;n!==null&&!a.includes(n);)a.push(n),n=t.get(n)?.parent??null;return a},Bi=(r,e)=>{const t=new Map(r.nodes.map(i=>[i.id,i]));let a=0;const n=[...t.get(e)?.children??[]];for(let i=n.pop();i!==void 0;i=n.pop())a+=1,n.push(...t.get(i)?.children??[]);return a},Wi=(r,e,t)=>{let a=null;if(e!==null){const s=r.nodes.filter(e);if(s.length===0)return kt();const o=new Map(r.nodes.map(l=>[l.id,l])),d=new Set;for(const l of s){d.add(l.id);for(const m of ve(r,l.id))d.add(m);const f=[...l.children];for(let m=f.pop();m!==void 0;m=f.pop())d.add(m),f.push(...o.get(m)?.children??[])}a=d}const n=r.nodes.filter(s=>(a===null||a.has(s.id))&&!ve(r,s.id).some(o=>t.has(o))),i=new Set(n.map(s=>s.id));return{...r,nodes:n,edges:r.edges.filter(s=>i.has(s.from)&&i.has(s.to))}},Ki=N`
  .branch-root {
    --mind-colour: var(--af-ink);
    --mind-soft: var(--af-paper-sunken);
  }
  .branch-0 {
    --mind-colour: var(--af-blue);
    --mind-soft: var(--af-blue-soft);
  }
  .branch-1 {
    --mind-colour: var(--af-green);
    --mind-soft: var(--af-green-soft);
  }
  .branch-2 {
    --mind-colour: var(--af-violet);
    --mind-soft: var(--af-violet-soft);
  }
  .branch-3 {
    --mind-colour: var(--af-amber);
    --mind-soft: var(--af-amber-soft);
  }
  .branch-4 {
    --mind-colour: var(--af-accent);
    --mind-soft: var(--af-accent-soft);
  }

  .mind-topic {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 12px;
    border: 1px solid color-mix(in srgb, var(--mind-colour) 45%, transparent);
    border-radius: 999px;
    background: var(--af-paper-raised);
    color: var(--af-ink);
    font-family: var(--af-body);
    font-size: 12.5px;
    line-height: 1.3;
    box-shadow: var(--af-shadow-xs);
  }

  .mind-label {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .mind-topic.depth-0 {
    padding: 0 22px;
    border: 0;
    background: var(--af-ink);
    color: var(--af-paper-raised);
    font-size: 16px;
    font-weight: 680;
    letter-spacing: -0.01em;
    box-shadow: var(--af-shadow-sm);
  }

  .mind-topic.depth-1 {
    padding: 0 15px;
    border-width: 1.5px;
    border-color: var(--mind-colour);
    background: var(--mind-soft);
    font-size: 13.5px;
    font-weight: 620;
  }

  .mind-topic.depth-1 .mind-label {
    color: color-mix(in srgb, var(--mind-colour) 70%, var(--af-ink));
  }

  .mind-topic:hover {
    border-color: var(--mind-colour);
  }

  .mind-topic.is-selected {
    border-color: var(--mind-colour);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--mind-colour) 22%, transparent);
  }

  .mind-topic.depth-0.is-selected {
    box-shadow: 0 0 0 3px var(--af-blue-soft);
  }

  .mind-topic.is-related {
    border-color: var(--mind-colour);
  }

  .mind-topic:focus-visible {
    outline: none;
    box-shadow: var(--af-focus);
  }

  /* Added on this page by a draft action: not authored yet. */
  .mind-topic.is-added {
    border-style: dashed;
    border-color: var(--mind-colour);
  }

  .mind-actions {
    position: absolute;
    z-index: 3;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    width: 220px;
  }

  .mind-actions .af-btn {
    padding: 3px 9px;
    font-size: 12px;
    box-shadow: var(--af-shadow-xs);
  }

  .mind-actions .af-input {
    width: 100%;
    font-size: 12.5px;
    box-shadow: var(--af-shadow-xs);
  }

  .mind-actions-error {
    font-size: 11.5px;
    line-height: 1.4;
    color: var(--af-accent);
  }

  .mind-branch {
    fill: none;
    stroke: color-mix(in srgb, var(--mind-colour) 55%, transparent);
    stroke-width: 1.5;
    stroke-linecap: round;
    cursor: default;
    transition: opacity 150ms ease;
  }

  .mind-branch.depth-1 {
    stroke-width: 3;
  }

  .mind-branch.depth-2 {
    stroke-width: 2;
  }

  .mind-branch.is-related {
    stroke: var(--mind-colour);
  }

  .mind-toggle {
    position: absolute;
    z-index: 1;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    transform: translate(-50%, -50%);
    border: 1.5px solid var(--mind-colour);
    border-radius: 999px;
    background: var(--af-paper-raised);
    color: var(--mind-colour);
    font-family: var(--af-mono);
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
    opacity: 0;
    transition: opacity 120ms ease;
  }

  /* Expanded toggles appear with their topic; folded ones always show the count. */
  .mind-topic:hover + .mind-toggle,
  .mind-toggle:hover,
  .mind-toggle:focus-visible,
  .mind-toggle.is-folded {
    opacity: 1;
  }

  .mind-toggle.is-dimmed {
    opacity: 0;
  }

  .mind-toggle.is-folded.is-dimmed {
    opacity: 0.26;
  }

  .mind-toggle:focus-visible {
    outline: none;
    box-shadow: var(--af-focus);
  }

  @media (hover: none) {
    .mind-toggle {
      opacity: 1;
    }
  }
`,Xi=5;class Ct extends Q{static{this.styles=[B,Ki]}#e=new Set;#a=null;#i=!1;#t=null;toggle(e,t){const a=this.items().nodes.find(i=>i.id===e);if(a===void 0||a.children.length===0)return;const n=t??!this.#e.has(e);if(n!==this.#e.has(e)){if(n){this.#e.add(e);const i=this.selection;i!==null&&ve(this.items(),i.id).includes(e)&&this.select(null)}else this.#e.delete(e);this.requestUpdate()}}get collapsed(){return[...this.#e]}parseData(e){return Mt(e)}emptyData(){return kt()}reduceElementActions(e,t){return Yi(e,t)}defaultHeading(){return"Mind map"}emptyMessage(){return"\u8A72\u5F53\u3059\u308B\u30C8\u30D4\u30C3\u30AF\u306F\u3042\u308A\u307E\u305B\u3093\u3002"}statsText(){const e=this.items().nodes.length,t=this.filtered().nodes.length;return t===e?`${e} \u30C8\u30D4\u30C3\u30AF`:`${t} / ${e} \u30C8\u30D4\u30C3\u30AF`}filtered(){const e=this.tagFilter,t=e.active.length===0?null:a=>X(a.tags,e);return Wi(this.items(),t,this.#e)}layoutSignature(){return this.filtered().nodes.map(e=>`${e.id}<${e.parent??""}:${e.side??""}`).join(",")}computePlacement(e){return Ri(e)}refreshContent(){const e=this.authoredItems();e!==this.#a&&(this.#a=e,this.#e=new Set(e.nodes.filter(t=>t.collapsed).map(t=>t.id)),this.#i=!1,this.#t=null),super.refreshContent()}initialView(){if(this.#i){this.viewport?.apply();return}this.#i=!0,this.viewport?.fit()}commentItems(){return this.items().nodes.map(e=>({value:this.commentRef("node",e.id),label:e.label}))}hasSelection(e){return e.kind==="node"&&this.items().nodes.some(t=>t.id===e.id)}relations(e,t){if(e===null||e.kind!=="node")return{nodes:new Map,edges:new Set};const a=I(t.edges,e.id,"outgoing",!0),n=I(t.edges,e.id,"incoming",!0);return{nodes:new Map([...a.nodes,...n.nodes]),edges:new Set([...a.edges,...n.edges])}}renderSelection(){return w}renderCanvas(){const e=this.filtered();return u`
      ${this.renderEdges(e.edges.map(t=>this.#n(t)),[])}
      ${e.nodes.map(t=>this.#s(t))} ${this.#l()}
    `}#r(e){return e===void 0||e.branch<0?"branch-root":`branch-${e.branch%Xi}`}#n(e){const t=this.items().nodes.find(n=>n.id===e.to),a=this.edgeState(e.id);return U`
      <path
        class=${this.elementClass(a,"d-edge","mind-branch",this.#r(t),`depth-${Math.min(t?.depth??1,3)}`)}
        data-branch=${e.id}
        d=${Ui(this.routeOf(e.id))}
      ></path>
    `}#s(e){const t=this.placedNode(e.id);if(!t)return w;const a=this.nodeState(e.id),n=this.#e.has(e.id),i=`depth-${Math.min(e.depth,3)}`;return u`
      <button
        type="button"
        class=${this.elementClass(a,"d-node","mind-topic",i,this.#r(e),n&&"is-folded",e.added&&"is-added")}
        data-topic=${e.id}
        data-grill-questions=${this.questionsOf(e)}
        style="left:${t.x}px; top:${t.y}px; width:${t.width}px; height:${t.height}px"
        aria-pressed=${a.selected?"true":"false"}
        title=${e.description??e.label}
        @click=${()=>this.select({kind:"node",id:e.id})}
      >
        <span class="mind-label">${e.label}</span>
      </button>
      ${e.depth===0||e.children.length===0?w:this.#o(e,t,n,a.dimmed)}
    `}#o(e,t,a,n){const i=a?Bi(this.items(),e.id):0,s=e.side==="left"?t.x:t.x+t.width,o=a?`${e.label} \u306E\u30B5\u30D6\u30C8\u30D4\u30C3\u30AF ${i} \u4EF6\u3092\u3072\u3089\u304F`:`${e.label} \u306E\u30B5\u30D6\u30C8\u30D4\u30C3\u30AF\u3092\u305F\u305F\u3080`;return u`
      <button
        type="button"
        class=${this.elementClass({selected:!1,related:!1,dimmed:n,depth:null},"mind-toggle",this.#r(e),a&&"is-folded")}
        data-toggle=${e.id}
        style="left:${s}px; top:${t.y+t.height/2}px"
        aria-expanded=${a?"false":"true"}
        aria-label=${o}
        title=${o}
        @click=${d=>{d.stopPropagation(),this.toggle(e.id)}}
      >
        ${a?i:"\u2212"}
      </button>
    `}#l(){const e=this.selection;if(e===null||e.kind!=="node")return w;const t=this.items().nodes.find(i=>i.id===e.id),a=this.placedNode(e.id);if(t===void 0||a===void 0)return w;const n=this.#t?.parent===t.id?this.#t:null;return u`
      <div
        class="mind-actions"
        data-for=${t.id}
        style="left:${this.#c(t,a)}px; top:${a.y+a.height+8}px"
        @click=${i=>i.stopPropagation()}
      >
        ${n===null?u`
                <button type="button" class="af-btn" data-action="add" @click=${()=>this.#u(t.id)}>
                  ＋ サブトピック
                </button>
                <button
                  type="button"
                  class="af-btn"
                  data-action="comment"
                  @click=${()=>this.requestElementComment("node",t.id)}
                >
                  コメント
                </button>
              `:u`
                <input
                  class="af-input"
                  aria-label="${t.label} のサブトピック"
                  placeholder="サブトピック名（Enter で追加）"
                  .value=${n.label}
                  @input=${i=>{const s=i.currentTarget;s instanceof HTMLInputElement&&(this.#t={...n,label:s.value,failed:!1})}}
                  @keydown=${i=>this.#p(i,t.id)}
                />
                ${n.failed?u`<span class="mind-actions-error" role="alert"
                        >記録できませんでした（レビュー対象の Artifact 内に置いてください）。</span
                      >`:w}
              `}
      </div>
    `}#c(e,t){return e.side==="left"?t.x+t.width-220:t.x}#u(e){this.#t={parent:e,label:"",failed:!1},this.requestUpdate(),this.updateComplete.then(()=>this.renderRoot.querySelector(".mind-actions input")?.focus())}#p(e,t){if(e.isComposing)return;if(e.key==="Escape"){e.preventDefault(),this.#t=null,this.requestUpdate();return}if(e.key!=="Enter")return;e.preventDefault();const a=this.#t?.label.trim()??"";if(a.length===0)return;const n=$e(`topic ${a}`,this.items().nodes.map(i=>i.id));if(!this.dispatchElementAction(Et,["node",t],{id:n,label:a})){this.#t={parent:t,label:a,failed:!0},this.requestUpdate();return}this.#t=null,this.#e.delete(t),this.select({kind:"node",id:n}),this.requestUpdate()}}const Tt="artifact-mind-map",Dt=(r=Tt)=>{customElements.get(r)||customElements.define(r,Ct)},Ji=z({id:k(p(),$(1)),title:k(p(),$(1)),description:g(p()),tags:g(L(p())),assignee:g(p()),questions:g(p())}),_i=["gray","blue","green","amber","violet","red"],Zi=z({id:k(p(),$(1)),label:k(p(),$(1)),description:g(p()),color:g(F(_i)),limit:g(k(_(),Qt(),Zt(1))),cards:g(L(Ji))}),Qi=z({columns:L(Zi)}),Gi=()=>({columns:[]}),Lt=r=>{const e=Y(Qi,r),t=new Set,a=new Set;return{columns:e.columns.map(n=>{if(t.has(n.id))throw new Error(`duplicate column id: ${n.id}`);return t.add(n.id),{id:n.id,label:n.label,description:n.description??null,color:n.color??null,limit:n.limit??null,cards:(n.cards??[]).map(i=>{if(a.has(i.id))throw new Error(`duplicate card id: ${i.id}`);return a.add(i.id),{id:i.id,title:i.title,description:i.description??null,tags:i.tags??[],assignee:i.assignee??null,...i.questions===void 0?{}:{questions:i.questions},column:n.id,change:null}})}})}},ne=(r,e)=>r.columns.flatMap(t=>t.cards).find(t=>t.id===e),G=r=>r.columns.flatMap(e=>e.cards),er=(r,e)=>e===null?r:{columns:r.columns.map(t=>({...t,cards:t.cards.filter(e)}))},tr=(r,e,t,a)=>{const n=ne(r,e);if(n===void 0||n.column!==t)return!1;if(a===e)return!0;const i=r.columns.find(o=>o.id===t)?.cards??[],s=i.findIndex(o=>o.id===e);return(i[s+1]?.id??null)===a},At="ADD_CARD",jt="MOVE_CARD",ar=le({id:k(p(),$(1)),title:k(p(),ke(),$(1))}),ir=le({column:k(p(),$(1)),before:Gt(k(p(),$(1)))}),Rt=(r,e)=>{const t=Ae(r);return t?.length===3&&t[1]===e?t[2]??null:null},rr=(r,e)=>({columns:r.columns.map(t=>t.cards.some(a=>a.id===e)?{...t,cards:t.cards.filter(a=>a.id!==e)}:t)}),Ut=(r,e,t)=>({columns:r.columns.map(a=>{if(a.id!==t.column)return a;const n={...e,column:a.id},i=t.before===null?-1:a.cards.findIndex(s=>s.id===t.before);return{...a,cards:i<0?[...a.cards,n]:[...a.cards.slice(0,i),n,...a.cards.slice(i)]}})}),nr=(r,e)=>{const t="\u30AB\u30FC\u30C9\u3092\u8FFD\u52A0",a=Rt(e.target.id,"column"),n=r.columns.find(o=>o.id===a);if(n===void 0)return{data:r,result:{id:e.id,title:t,stale:"target-missing"}};const i=de(ar,e.payload);if(!i.success||ne(r,i.output.id)!==void 0)return{data:r,result:{id:e.id,title:t,stale:"constraint-violated"}};const s={id:i.output.id,title:i.output.title,description:null,tags:[],assignee:null,column:n.id,change:"added"};return{data:Ut(r,s,{column:n.id,before:null}),result:{id:e.id,title:t,summary:`${n.label} \u203A ${s.title}`,tone:"create"}}},sr=(r,e)=>{const t="\u30AB\u30FC\u30C9\u3092\u79FB\u52D5",a=Rt(e.target.id,"card"),n=a===null?void 0:ne(r,a);if(n===void 0)return{data:r,result:{id:e.id,title:t,stale:"target-missing"}};const i=de(ir,e.payload),s=r.columns.find(c=>c.id===n.column),o=i.success?r.columns.find(c=>c.id===i.output.column):void 0,d=i.success?i.output.before:null,l=d===null||d!==n.id&&o?.cards.some(c=>c.id===d)===!0;if(!i.success||s===void 0||o===void 0||!l)return{data:r,result:{id:e.id,title:t,stale:"constraint-violated"}};const f={...n,change:n.change??"moved"},m=s.id===o.id?`${n.title}: ${o.label} \u5185\u3067\u4E26\u3079\u66FF\u3048`:`${n.title}: ${s.label} \u2192 ${o.label}`;return{data:Ut(rr(r,n.id),f,{column:o.id,before:d}),result:{id:e.id,title:t,summary:m,tone:"move"}}},or=(r,e)=>{let t=r;const a=[];for(const n of e){const i=n.type===At?nr(t,n):n.type===jt?sr(t,n):{data:t,result:{id:n.id,title:n.type,stale:"unsupported-action-type"}};t=i.data,a.push(i.result)}return{data:t,results:a}},dr=N`
  .kanban-board {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    width: max-content;
    padding: 18px;
  }

  .kanban-column {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 264px;
    padding: 10px;
    border: 1px solid var(--af-rule);
    border-radius: var(--af-radius);
    background: var(--af-paper-sunken);
    cursor: default;
    transition:
      border-color 150ms ease,
      box-shadow 150ms ease;
  }

  .kanban-column.is-selected {
    border-color: var(--af-ink-soft);
    box-shadow: 0 0 0 3px var(--af-blue-soft);
  }

  .kanban-column.is-drop-target {
    border-color: var(--af-blue);
  }

  .kanban-column-head {
    position: relative;
    display: flex;
    align-items: center;
  }

  .kanban-column-title {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 2px 34px 2px 2px;
    border: 0;
    border-radius: var(--af-radius-xs);
    background: none;
    color: var(--af-ink);
    font-family: var(--af-body);
    font-size: 13px;
    font-weight: 650;
    text-align: left;
    cursor: pointer;
  }

  .kanban-column-title:focus-visible {
    outline: none;
    box-shadow: var(--af-focus);
  }

  .kanban-column-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* An authored colour marks the heading, not the cards: the status reads at a glance. */
  .kanban-column[data-color='gray'] {
    --kanban-tone: var(--af-ink-soft);
  }

  .kanban-column[data-color='blue'] {
    --kanban-tone: var(--af-blue);
  }

  .kanban-column[data-color='green'] {
    --kanban-tone: var(--af-green);
  }

  .kanban-column[data-color='amber'] {
    --kanban-tone: var(--af-amber);
  }

  .kanban-column[data-color='violet'] {
    --kanban-tone: var(--af-violet);
  }

  .kanban-column[data-color='red'] {
    --kanban-tone: var(--af-accent);
  }

  .kanban-column[data-color] .kanban-column-label {
    padding: 2px 9px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--kanban-tone) 14%, transparent);
    color: var(--kanban-tone);
  }

  .kanban-count {
    flex: none;
    padding: 1px 7px;
    border-radius: 999px;
    background: var(--af-paper-raised);
    color: var(--af-ink-soft);
    font-family: var(--af-mono);
    font-size: 11px;
    font-weight: 600;
  }

  /* Over its WIP limit: the column asks for attention, not the cards. */
  .kanban-column.is-over {
    border-color: color-mix(in srgb, var(--af-accent) 55%, transparent);
  }

  .kanban-column.is-over .kanban-count {
    background: var(--af-accent-soft);
    color: var(--af-accent);
  }

  .kanban-column-head > .diagram-comment-trigger {
    position: absolute;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
  }

  .kanban-column-description {
    margin: 0 2px;
    color: var(--af-ink-soft);
    font-size: 11.5px;
    line-height: 1.45;
  }

  .kanban-cards {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 44px;
  }

  .kanban-card-slot {
    position: relative;
  }

  .kanban-card {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 9px 34px 9px 11px;
    border: 1px solid var(--af-rule);
    border-radius: var(--af-radius-sm);
    background: var(--af-paper-raised);
    color: var(--af-ink);
    font-family: var(--af-body);
    box-shadow: var(--af-shadow-xs);
    cursor: grab;
    transition:
      border-color 150ms ease,
      box-shadow 150ms ease,
      opacity 150ms ease;
  }

  .kanban-card:hover {
    border-color: var(--af-rule-strong);
  }

  .kanban-card.is-selected {
    border-color: var(--af-ink-soft);
    box-shadow: 0 0 0 3px var(--af-blue-soft);
  }

  .kanban-card:focus-visible {
    outline: none;
    box-shadow: var(--af-focus);
  }

  .kanban-card.is-dragging {
    opacity: 0.4;
  }

  /* Changed on this page by a draft action: not authored yet. */
  .kanban-card.is-added {
    border-style: dashed;
    border-color: var(--af-green);
  }

  .kanban-card.is-moved {
    border-left: 3px solid var(--af-blue);
  }

  .kanban-card-title {
    font-size: 13px;
    font-weight: 560;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }

  .kanban-card-description {
    display: -webkit-box;
    overflow: hidden;
    color: var(--af-ink-soft);
    font-size: 11.5px;
    line-height: 1.45;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    overflow-wrap: anywhere;
  }

  .kanban-card-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
  }

  .kanban-tag {
    padding: 1px 6px;
    border-radius: var(--af-radius-xs);
    background: var(--af-paper-sunken);
    color: var(--af-ink-soft);
    font-size: 10.5px;
  }

  .kanban-assignee {
    margin-left: auto;
    color: var(--af-ink-faint);
    font-size: 11px;
  }

  .kanban-card-slot > .diagram-comment-trigger {
    position: absolute;
    top: 5px;
    right: 5px;
    z-index: 2;
  }

  .kanban-error {
    margin: 6px 0 0;
    padding: 4px 6px;
    border-radius: var(--af-radius-xs);
    background: var(--af-paper-raised);
    color: var(--af-accent);
    font-size: 11.5px;
    line-height: 1.4;
  }

  /* Takes no room of its own, so the cards do not jump while dragging. */
  .kanban-drop-marker {
    height: 3px;
    margin: -5.5px 0;
    border-radius: 2px;
    background: var(--af-blue);
  }

  .kanban-add {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .kanban-add-button {
    padding: 6px 8px;
    border: 1px dashed var(--af-rule-strong);
    border-radius: var(--af-radius-sm);
    background: none;
    color: var(--af-ink-soft);
    font-family: var(--af-body);
    font-size: 12px;
    text-align: left;
    cursor: pointer;
  }

  .kanban-add-button:hover,
  .kanban-add-button:focus-visible {
    border-color: var(--af-ink-soft);
    color: var(--af-ink);
    outline: none;
  }

  .kanban-add .af-input {
    width: 100%;
    font-size: 12.5px;
  }
`,It="\u8A18\u9332\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\uFF08\u30EC\u30D3\u30E5\u30FC\u5BFE\u8C61\u306E Artifact \u5185\u306B\u7F6E\u3044\u3066\u304F\u3060\u3055\u3044\uFF09\u3002";class Ot extends fe{static{this.styles=[B,dr]}#e=null;#a=null;#i=null;#t=null;#r=null;parseData(e){return Lt(e)}emptyData(){return Gi()}reduceElementActions(e,t){return or(e,t)}defaultHeading(){return"Kanban"}shellClass(){return"kanban"}emptyMessage(){return"\u5217\u304C\u3042\u308A\u307E\u305B\u3093\u3002"}commentItems(){const e=this.items();return[...e.columns.map(t=>({value:this.commentRef("column",t.id),label:t.label})),...G(e).map(t=>({value:this.commentRef("card",t.id),label:t.title}))]}hasSelection(e){const t=this.items();return e.kind==="column"?t.columns.some(a=>a.id===e.id):ne(t,e.id)!==void 0}tagItems(){return G(this.items()).map(e=>e.tags)}statsText(){const e=G(this.items()).length,t=G(this.#n()).length;return t===e?`${e} \u30AB\u30FC\u30C9`:`${t} / ${e} \u30AB\u30FC\u30C9`}isEmpty(){return this.items().columns.length===0}viewAlign(){return"start"}contentSize(){if(this.isEmpty())return null;const e=this.renderRoot.querySelector(".kanban-board");return{width:e?.offsetWidth??0,height:e?.offsetHeight??0}}refreshContent(){const e=this.authoredItems();e!==this.#e&&(this.#e=e,this.#a=null,this.#i=null)}renderCanvas(){const e=this.#n(),t=new Map(this.items().columns.map(a=>[a.id,a.cards.length]));return u`<div class="kanban-board">
      ${se(e.columns,a=>a.id,a=>this.#o(a,t.get(a.id)??0))}
    </div>`}#n(){const e=this.tagFilter;return er(this.items(),e.active.length===0?null:t=>X(t.tags,e))}#s(e,t){const a=this.selection;return a!==null&&a.kind===e&&a.id===t}#o(e,t){const a=e.limit!==null&&t>e.limit,n=this.#r?.column===e.id?this.#r:null;return u`
      <section
        class=${J("kanban-column",a&&"is-over",this.#s("column",e.id)&&"is-selected",n!==null&&"is-drop-target")}
        data-column=${e.id}
        data-color=${e.color??w}
        aria-label=${e.label}
      >
        <div class="kanban-column-head">
          <button
            type="button"
            class="kanban-column-title"
            aria-pressed=${this.#s("column",e.id)?"true":"false"}
            title=${e.description??e.label}
            @click=${()=>this.select({kind:"column",id:e.id})}
          >
            <span class="kanban-column-label">${e.label}</span>
            <span class="kanban-count" title=${e.limit===null?w:`WIP \u4E0A\u9650 ${e.limit}`}>
              ${e.limit===null?t:`${t} / ${e.limit}`}
            </span>
          </button>
          ${this.renderCommentTrigger({kind:"column",id:e.id},e.label)}
        </div>
        ${e.description===null?w:u`<p class="kanban-column-description">${e.description}</p>`}
        <div
          class="kanban-cards"
          @dragover=${i=>this.#h(i,e.id)}
          @dragleave=${i=>this.#f(i)}
          @drop=${i=>this.#m(i,e.id)}
        >
          ${se(e.cards,i=>i.id,i=>u`${n?.before===i.id?this.#l():w}${this.#c(i)}`)}
          ${n!==null&&n.before===null?this.#l():w}
        </div>
        ${this.#u(e)}
      </section>
    `}#l(){return u`<div class="kanban-drop-marker" aria-hidden="true"></div>`}#c(e){const t=this.#s("card",e.id);return u`
      <div class="kanban-card-slot">
        <div
          role="button"
          tabindex="0"
          draggable="true"
          class=${J("kanban-card",t&&"is-selected",e.change==="added"&&"is-added",e.change==="moved"&&"is-moved",this.#t===e.id&&"is-dragging")}
          data-card=${e.id}
          data-grill-questions=${this.questionsOf(e)}
          title=${e.description??e.title}
          aria-pressed=${t?"true":"false"}
          @click=${()=>this.select({kind:"card",id:e.id})}
          @keydown=${a=>this.#p(a,e.id)}
          @dragstart=${a=>this.#b(a,e.id)}
          @dragend=${()=>this.#g()}
        >
          <span class="kanban-card-title">${e.title}</span>
          ${e.description===null?w:u`<span class="kanban-card-description">${e.description}</span>`}
          ${e.tags.length===0&&e.assignee===null?w:u`<span class="kanban-card-meta">
                  ${e.tags.map(a=>u`<span class="kanban-tag">${a}</span>`)}
                  ${e.assignee===null?w:u`<span class="kanban-assignee">${e.assignee}</span>`}
                </span>`}
        </div>
        ${this.renderCommentTrigger({kind:"card",id:e.id},e.title)}
        ${this.#i===e.id?u`<p class="kanban-error" role="alert">${It}</p>`:w}
      </div>
    `}#u(e){const t=this.#a?.column===e.id?this.#a:null;return u`<div class="kanban-add">
      ${t===null?u`<button
              type="button"
              class="kanban-add-button"
              data-action="add"
              @click=${()=>this.#y(e.id)}
            >
              ＋ カード
            </button>`:u`
              <input
                class="af-input"
                aria-label="${e.label} に追加するカード"
                placeholder="カード名（Enter で追加）"
                .value=${t.title}
                @input=${a=>{const n=a.currentTarget;n instanceof HTMLInputElement&&(this.#a={...t,title:n.value,failed:!1})}}
                @keydown=${a=>this.#w(a,e.id)}
              />
              ${t.failed?u`<span class="kanban-error" role="alert">${It}</span>`:w}
            `}
    </div>`}#p(e,t){e.target!==e.currentTarget||e.key!=="Enter"&&e.key!==" "||(e.preventDefault(),this.select({kind:"card",id:t}))}#d(e,t){const a=this.dispatchElementAction(jt,["card",e],{column:t.column,before:t.before});this.#i=a?null:e,this.select({kind:"card",id:e}),this.requestUpdate()}#b(e,t){this.#t=t,e.dataTransfer&&(e.dataTransfer.effectAllowed="move",e.dataTransfer.setData("text/plain",t)),this.requestUpdate()}#h(e,t){if(this.#t===null)return;e.preventDefault(),e.dataTransfer&&(e.dataTransfer.dropEffect="move");const a=this.#v(e,t);this.#r?.column===a.column&&this.#r.before===a.before||(this.#r=a,this.requestUpdate())}#f(e){const t=e.currentTarget;!(t instanceof HTMLElement)||e.relatedTarget instanceof Node&&t.contains(e.relatedTarget)||(this.#r=null,this.requestUpdate())}#m(e,t){const a=this.#t;if(a===null)return;e.preventDefault();const n=this.#v(e,t);this.#g(),tr(this.items(),a,n.column,n.before)||this.#d(a,n)}#g(){this.#t===null&&this.#r===null||(this.#t=null,this.#r=null,this.requestUpdate())}#v(e,t){const a=e.currentTarget,n=(a instanceof HTMLElement?[...a.querySelectorAll("[data-card]")]:[]).find(i=>{if(i.dataset.card===this.#t)return!1;const s=i.getBoundingClientRect();return s.top+s.height/2>e.clientY});return{column:t,before:n?.dataset.card??null}}#y(e){this.#a={column:e,title:"",failed:!1},this.requestUpdate(),this.updateComplete.then(()=>this.renderRoot.querySelector(`[data-column="${CSS.escape(e)}"] .kanban-add input`)?.focus({preventScroll:!0}))}#w(e,t){if(e.isComposing)return;if(e.key==="Escape"){e.preventDefault(),this.#a=null,this.requestUpdate();return}if(e.key!=="Enter")return;e.preventDefault();const a=this.#a?.title.trim()??"";if(a.length===0)return;const n=[...this.items().columns.map(s=>s.id),...G(this.items()).map(s=>s.id)],i=$e(`card ${a}`,n);if(!this.dispatchElementAction(At,["column",t],{id:i,title:a})){this.#a={column:t,title:a,failed:!0},this.requestUpdate();return}this.#a=null,this.select({kind:"card",id:i}),this.requestUpdate()}}const Pt="artifact-kanban",Ft=(r=Pt)=>{customElements.get(r)||customElements.define(r,Ot)},Ht=()=>{Ve(),_e(),et(),ht(),bt(),Dt(),Ft()},lr=()=>{ea(),ta(),Ht()};export{gt as A,Ge as D,pt as E,Pt as K,Tt as M,Je as S,mt as a,Qe as b,ct as c,Ot as d,Ct as e,Xe as f,Fe as g,He as h,bt as i,et as j,ht as k,Ft as l,Dt as m,_e as n,Ve as o,Lt as p,Mt as q,lr as r,Be as s,Pe as t,Ht as u};
