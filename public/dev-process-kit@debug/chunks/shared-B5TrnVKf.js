import{Z as Rt,k as Ot,_ as Ut,$ as N,a0 as y,a1 as u,a2 as re,a3 as O,a4 as It,A as Pt,a5 as Ft,a6 as Ht,a7 as Y,a8 as z,a9 as f,aa as A,ab as c,ac as F,ad as w,ae as $,af as J,ag as Vt,ah as xe,ai as ye,aj as oe,ak as de,al as le,am as Nt,an as we,m as $e,ao as Yt,ap as Bt,aq as Wt,r as Kt,s as Xt}from"./shared-CxeFED6G.js";import{i as _t}from"./shared-Bl8RXFFG.js";import{P as Jt,p as Zt,r as Qt}from"./shared-B6yvfXoy.js";import{c as te}from"./shared-DPcZakya.js";const Gt='script[type="application/json"]',qe=(a,e)=>{const t=a.querySelector(Gt);if(!t)return null;const n=t.textContent??"";if(n.trim()==="")return{ok:!1,error:"JSON block is empty"};try{return{ok:!0,value:e(JSON.parse(n))}}catch(s){return{ok:!1,error:s instanceof Error?s.message:String(s)}}},en=(a,e,t)=>{const n=qe(a,e);if(n)return t(n),()=>{};const s=new MutationObserver(()=>{const i=qe(a,e);i&&(s.disconnect(),t(i))});return s.observe(a,{childList:!0,subtree:!0}),()=>s.disconnect()},Me={nodeSpacing:34,layerSpacing:84,padding:28,sweeps:4,coordinatePasses:6},ne=a=>{const e=[...a].sort((n,s)=>n-s);if(e.length===0)return 0;const t=Math.floor(e.length/2);return e.length%2===1?e[t]??0:((e[t-1]??0)+(e[t]??0))/2},tn=(a,e)=>{const t=new Map;for(const r of a)t.set(r.id,[]);for(const r of e)t.get(r.from)?.push(r);const n=new Map,s=new Set,i=r=>{n.set(r,"open");for(const o of t.get(r)??[]){const d=n.get(o.to)??"new";d==="open"?s.add(o.id):d==="new"&&i(o.to)}n.set(r,"done")};for(const r of a)(n.get(r.id)??"new")==="new"&&i(r.id);return{reversed:s,forward:e.filter(r=>!s.has(r.id))}},nn=(a,e)=>{const t=new Map,n=new Map;for(const o of a)t.set(o.id,[]),n.set(o.id,[]);for(const o of e)n.get(o.from)?.push(o),t.get(o.to)?.push(o);const s=new Map(a.map(o=>[o.id,0])),i=new Map(a.map(o=>[o.id,(t.get(o.id)??[]).length])),r=a.filter(o=>(i.get(o.id)??0)===0).map(o=>o.id);for(const o of r)for(const d of n.get(o)??[]){const l=s.get(d.to)??0;s.set(d.to,Math.max(l,(s.get(o)??0)+1));const g=(i.get(d.to)??0)-1;i.set(d.to,g),g===0&&r.push(d.to)}return s},sn=(a,e,t,n)=>{const s=[...a.keys()].sort((i,r)=>i-r);for(let i=0;i<n;i++){const r=i%2===0;for(const o of r?s:[...s].reverse()){const d=a.get(o)??[],l=new Map(d.map((p,v)=>[p,v])),g=p=>{const v=l.get(p);return v===void 0?null:v},m=d.map(p=>{const v=(e.get(p)??[]).filter(q=>(t.get(q)??o)===o+(r?-1:1)).map(g).filter(q=>q!==null);return{id:p,want:v.length>0?ne(v):l.get(p)??0}});m.sort((p,v)=>p.want-v.want||(l.get(p.id)??0)-(l.get(v.id)??0)),a.set(o,m.map(p=>p.id))}}},Se=(a,e,t,n)=>{const s=a.map((r,o)=>({id:r,want:t.get(r)??o*100,index:o}));s.sort((r,o)=>r.want-o.want||r.index-o.index);let i=0;for(const r of s){const o=e.get(r.id);o&&(o.y=i,i+=o.spec.height+n)}return{height:Math.max(0,i-n)}},an=(a,e,t,n,s)=>{const i=[...a.keys()].sort((l,g)=>l-g),r=new Map;for(const l of i)r.set(l,Se(a.get(l)??[],e,new Map,s.nodeSpacing).height);const o=Math.max(0,...r.values());for(const l of i){const g=(o-(r.get(l)??0))/2;for(const m of a.get(l)??[]){const p=e.get(m);p&&(p.y+=g)}}const d=(l,g)=>{const m=(t.get(l)??[]).filter(p=>n.get(p)===g).flatMap(p=>{const v=e.get(p);return v?[v.y+v.spec.height/2]:[]});return m.length>0?ne(m):null};for(let l=0;l<s.coordinatePasses;l++){const g=l%2===0;for(const m of g?i:[...i].reverse()){const p=a.get(m)??[],v=new Map;for(const S of p){const C=d(S,m+(g?-1:1)),j=e.get(S);j!==void 0&&v.set(S,C===null?j.y+j.spec.height/2:C)}const q=p.map(S=>e.get(S)?.y??0);Se(p,e,v,s.nodeSpacing);const b=p.map(S=>e.get(S)?.y??0),M=ne(q)-ne(b);for(const S of p){const C=e.get(S);C&&(C.y+=M)}}}},Ee=(a,e,t)=>{const n=e===void 0?void 0:a.spec.ports?.[e];return n?{x:a.x+n.x,y:a.y+n.y}:t==="out"?{x:a.x+a.spec.width,y:a.y+a.spec.height/2}:{x:a.x,y:a.y+a.spec.height/2}},ze=(a,e,t)=>{let n=0;const s=[];for(const i of a){const r=t.byId.get(i.from),o=t.byId.get(i.to);if(!r||!o)continue;const d=Ee(r,i.fromPort,"out"),l=Ee(o,i.toPort,"in");if(i.from===i.to){const q=r.x+r.spec.width,b=r.y+r.spec.height,M=Math.max(t.padding/2,b+18);s.push({id:i.id,points:[d,{x:q+20,y:d.y},{x:q+20,y:M},{x:r.x-20,y:M},{x:r.x-20,y:l.y},l]});continue}if(!e.has(i.id)&&(r.layer<o.layer||r.layer===o.layer&&l.x>d.x+12)){if(Math.abs(d.y-l.y)<.5){s.push({id:i.id,points:[d,l]});continue}const q=r.layer<o.layer?Math.max(d.x+14,o.x-Math.max(12,t.layerSpacing/2)):(d.x+l.x)/2;s.push({id:i.id,points:[d,{x:q,y:d.y},{x:q,y:l.y},l]});continue}const g=i.fromPort===void 0?{x:r.x+r.spec.width/2,y:r.y+r.spec.height}:d,m=i.toPort===void 0?{x:o.x+o.spec.width/2,y:o.y+o.spec.height}:l,p=Math.max(g.y,m.y)+18+n*14;n+=1;const v=[d,g,{x:g.x,y:p},{x:m.x,y:p},m,l].filter((q,b,M)=>b===0||q.x!==M[b-1]?.x||q.y!==M[b-1]?.y);s.push({id:i.id,points:v})}return s},Ce=(a,e,t)=>{const n=e.flatMap(p=>[...p.points]),s=[...a.map(p=>p.x),...a.map(p=>p.x+p.spec.width),...n.map(p=>p.x)],i=[...a.map(p=>p.y),...a.map(p=>p.y+p.spec.height),...n.map(p=>p.y)],r=Math.min(0,...s),o=Math.min(0,...i),d=Math.max(0,...s),l=Math.max(0,...i),g=t-r,m=t-o;return{width:d-r+t*2,height:l-o+t*2,nodes:a.map(p=>({id:p.spec.id,x:p.x+g,y:p.y+m,width:p.spec.width,height:p.spec.height,layer:p.layer,order:p.order})),routes:e.map(p=>({id:p.id,points:p.points.map(v=>({x:v.x+g,y:v.y+m}))}))}},Te=(a,e)=>{const t=new Map(a.map(n=>[n.id,[]]));for(const n of e)n.from!==n.to&&(t.get(n.from)?.push(n.to),t.get(n.to)?.push(n.from));return t},De=(a,e,t,n)=>a.map(s=>({spec:s,layer:e.get(s.id)??0,order:t.get(s.id)??0,...n(s)})),rn=(a,e)=>{const t=new Map;for(const n of a){const s=e.get(n.id)??0,i=t.get(s);i?i.push(n.id):t.set(s,[n.id])}return t},on=(a,e,t={})=>{const n={...Me,...t};if(a.length===0)return{width:0,height:0,nodes:[],routes:[]};const s=new Set(a.map(b=>b.id)),i=e.filter(b=>s.has(b.from)&&s.has(b.to)),{forward:r,reversed:o}=tn(a,i),d=nn(a,r),l=rn(a,d);sn(l,Te(a,i),d,n.sweeps);const g=new Map;for(const b of l.values())b.forEach((M,S)=>g.set(M,S));const m=De(a,d,g,()=>({x:0,y:0})),p=new Map(m.map(b=>[b.spec.id,b]));an(l,p,Te(a,i),d,n);const v=[...l.keys()].sort((b,M)=>b-M);let q=0;for(const b of v){const M=Math.max(...(l.get(b)??[]).map(S=>p.get(S)?.spec.width??0));for(const S of l.get(b)??[]){const C=p.get(S);C&&(C.x=q)}q+=M+n.layerSpacing}return Ce(m,ze(i,o,{byId:p,layerSpacing:n.layerSpacing,padding:n.padding}),n.padding)},dn=(a,e,t={})=>{const n={...Me,...t};if(a.length===0)return{width:0,height:0,nodes:[],routes:[]};const s=new Set(a.map(d=>d.id)),i=e.filter(d=>s.has(d.from)&&s.has(d.to)),r=De(a,new Map,new Map,d=>d.position??{x:0,y:0}),o=new Map(r.map(d=>[d.spec.id,d]));return Ce(r,ze(i,new Set,{byId:o,layerSpacing:n.layerSpacing,padding:n.padding}),n.padding)},ln={active:[],match:"single"},X=(a,e)=>e.active.length===0?!0:e.match==="all"?e.active.every(t=>a.includes(t)):e.active.some(t=>a.includes(t)),pn=(a,e)=>a.active.includes(e)?{...a,active:a.active.filter(t=>t!==e)}:a.match==="single"?{...a,active:[e]}:{...a,active:[...a.active,e]},cn=(a,e)=>({match:e,active:e==="single"&&a.active.length>1?a.active.slice(-1):a.active}),hn=a=>({...a,active:[]}),un=a=>{const e=new Map;for(const t of a)for(const n of new Set(t))e.set(n,(e.get(n)??0)+1);return[...e].map(([t,n])=>({tag:t,count:n}))},H={nodes:new Map,edges:new Set},U=(a,e,t,n)=>{const s=new Map,i=new Set,r=[{id:e,depth:0}],o=new Set([e]);for(const d of r)if(!(!n&&d.depth>=1))for(const l of a){const g=t==="outgoing"?l.from:l.to,m=t==="outgoing"?l.to:l.from;g===d.id&&(i.add(l.id),!o.has(m)&&(o.add(m),s.set(m,d.depth+1),r.push({id:m,depth:d.depth+1})))}return{nodes:s,edges:i}},gn=(a,e)=>{const t=new Map(a.map(i=>[i,U(e,i,"outgoing",!0).nodes])),n=new Set,s=[];for(const i of a){if(n.has(i))continue;const r=a.filter(o=>o===i||t.get(i)?.has(o)===!0&&t.get(o)?.has(i)===!0);for(const o of r)n.add(o);(r.length>1||e.some(o=>o.from===i&&o.to===i))&&s.push(r)}return s},pe=a=>new Map(a.flatMap((e,t)=>e.map(n=>[n,t]))),Ae=(a,e)=>e.get(a.from)===e.get(a.to)&&e.has(a.from),Le=a=>{try{return a.split("/").map(e=>decodeURIComponent(e))}catch{return null}},je=(a,e,t,n)=>{const s=e!==null&&e.kind===t&&e.id===a,i=t==="node"?n.nodes.has(a):n.edges.has(a),r=t==="node"?n.nodes.get(a)??null:null;return{selected:s,related:i&&!s,dimmed:e!==null&&!s&&!i,depth:r}},_=(...a)=>a.filter(e=>typeof e=="string"&&e!=="").join(" "),mn=a=>{const e=a[0]??{x:0,y:0},t=a.at(-1)??e;if(a.length<=2)return{x:(e.x+t.x)/2,y:(e.y+t.y)/2};if(a.length===4){const i=a[1]??e,r=a[2]??t;return{x:i.x,y:(i.y+r.y)/2}}const n=a[2]??e,s=a[3]??t;return{x:(n.x+s.x)/2,y:n.y}},fn=(a,e)=>un(a).map(t=>({tag:t.tag,count:t.count,selected:e.active.includes(t.tag)})),bn=(a,e,t)=>`${a} ${t.node} \xB7 ${e} ${t.edge}`,B=[Rt,Ot,Ut,N`
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
      border: 1px solid var(--dpk-rule);
      border-radius: var(--dpk-radius-lg);
      background: var(--dpk-paper-raised);
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
      color: var(--dpk-ink);
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
      border-bottom: 1px solid var(--dpk-rule);
      background: linear-gradient(180deg, var(--dpk-paper-raised), var(--dpk-paper));
      flex-shrink: 0;
    }

    .diagram-title {
      font-size: 12.5px;
      font-weight: 620;
      letter-spacing: -0.01em;
    }

    .diagram-subject {
      font-size: 10px;
      color: var(--dpk-ink-faint);
      padding-left: 10px;
      border-left: 1px solid var(--dpk-rule-strong);
    }

    .diagram-toolbar-actions {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-left: auto;
      flex-wrap: wrap;
    }

    .diagram-stats {
      font-family: var(--dpk-mono);
      font-size: 10px;
      color: var(--dpk-ink-faint);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .diagram-tags {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
      padding: 6px 12px;
      border-bottom: 1px solid var(--dpk-rule);
      background: var(--dpk-paper);
      flex-shrink: 0;
    }

    .diagram-match {
      display: flex;
      gap: 1px;
      padding: 2px;
      margin-right: 5px;
      border: 1px solid var(--dpk-rule-strong);
      border-radius: var(--dpk-radius-xs);
    }

    .diagram-match button {
      border: 0;
      border-radius: 3px;
      padding: 3px 6px;
      background: transparent;
      color: var(--dpk-ink-faint);
      font-size: 9.5px;
      cursor: pointer;
    }

    .diagram-match button[aria-pressed='true'] {
      background: var(--dpk-blue-soft);
      color: var(--dpk-blue);
      font-weight: 650;
    }

    .dpk-tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 8px;
      border: 1px solid transparent;
      border-radius: var(--dpk-radius-xs);
      background: var(--dpk-paper-inset);
      color: var(--dpk-ink-soft);
      font-size: 10.5px;
      cursor: pointer;
    }

    .dpk-tag:hover {
      background: var(--dpk-paper-sunken);
      color: var(--dpk-ink);
    }

    .dpk-tag[aria-pressed='true'] {
      border-color: color-mix(in srgb, var(--dpk-blue) 40%, transparent);
      background: var(--dpk-blue-soft);
      color: var(--dpk-blue);
      font-weight: 600;
    }

    .dpk-tag-count {
      font-family: var(--dpk-mono);
      font-size: 9px;
      opacity: 0.7;
      font-variant-numeric: tabular-nums;
    }

    .dpk-tag-clear {
      border: 0;
      background: none;
      padding: 4px 6px;
      color: var(--dpk-ink-faint);
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
      background-color: var(--dpk-paper-raised);
      background-image: radial-gradient(var(--dpk-rule-strong) 0.7px, transparent 0.7px);
      background-size: 22px 22px;
    }

    .diagram-canvas:focus-visible {
      outline: none;
      box-shadow: inset var(--dpk-focus);
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
      border: 1px solid var(--dpk-rule-strong);
      border-radius: var(--dpk-radius-sm);
      background: var(--dpk-paper-raised);
      box-shadow: var(--dpk-shadow-sm);
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
      background: var(--dpk-paper-sunken);
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
      border-radius: var(--dpk-radius-xs);
      background: color-mix(in srgb, var(--dpk-paper-raised) 88%, transparent);
      font-size: 9.5px;
      color: var(--dpk-ink-faint);
    }

    .diagram-legend span {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    .diagram-legend i {
      width: 16px;
      border-top: 1.6px solid var(--dpk-rule-strong);
    }

    .diagram-empty,
    .diagram-notice {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      margin: 0;
      font-size: 12px;
      color: var(--dpk-ink-faint);
      text-align: center;
      pointer-events: none;
    }

    .diagram-notice {
      pointer-events: auto;
      padding: 12px 16px;
      border: 1px solid var(--dpk-rule-strong);
      border-radius: var(--dpk-radius);
      background: var(--dpk-paper-raised);
      box-shadow: var(--dpk-shadow-sm);
      color: var(--dpk-ink-soft);
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
      border: 1px solid var(--dpk-rule-strong);
      border-radius: var(--dpk-radius-sm);
      background: var(--dpk-paper-raised);
      color: var(--dpk-ink-soft);
      box-shadow: var(--dpk-shadow-xs);
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
      color: var(--dpk-accent);
      border-color: var(--dpk-accent);
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
      color: var(--dpk-accent);
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
      stroke: var(--dpk-rule-strong);
      stroke-width: 1.5;
      stroke-linejoin: round;
    }

    .d-edge.is-selected .d-edge-path,
    .d-edge:focus-visible .d-edge-path {
      stroke: var(--dpk-ink);
      stroke-width: 2.4;
    }

    .d-edge:focus-visible .d-edge-hit {
      stroke: var(--dpk-blue-soft);
    }

    .d-edge-label {
      font-size: 9.5px;
      fill: var(--dpk-ink-faint);
      paint-order: stroke;
      stroke: var(--dpk-paper-raised);
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
  `],Z=a=>a.map((e,t)=>`${t===0?"M":"L"}${e.x} ${e.y}`).join(" "),Re=a=>O`
  <defs>
    ${a.map(e=>O`
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
            fill=${e.open===!0||e.color===void 0?y:e.color}
            stroke=${e.color??y}
            stroke-width="1.3"
          ></path>
        </marker>
      `)}
  </defs>
`,kn=(a,e,t)=>u`
  <div class="diagram-tags" role="group" aria-label="タグの絞り込み">
    <div class="diagram-match" role="group" aria-label="タグの一致条件">
      ${[["single","Single"],["all","AND"],["any","OR"]].map(([n,s])=>u`
          <button
            type="button"
            data-match=${n}
            aria-pressed=${e===n?"true":"false"}
            @click=${()=>t({kind:"match",match:n})}
          >
            ${s}
          </button>
        `)}
    </div>
    ${re(a,n=>n.tag,n=>u`
        <button
          type="button"
          class="dpk-tag"
          data-tag=${n.tag}
          aria-pressed=${n.selected?"true":"false"}
          @click=${()=>t({kind:"tag",tag:n.tag})}
        >
          ${n.tag}<span class="dpk-tag-count">${n.count}</span>
        </button>
      `)}
    ${a.some(n=>n.selected)?u`<button type="button" class="dpk-tag-clear" @click=${()=>t({kind:"clear-tags"})}>解除</button>`:y}
  </div>
`,vn=a=>u`
  <div class="diagram-zoom">
    <button
      type="button"
      aria-label="縮小"
      @click=${e=>{e.stopPropagation(),a?.({kind:"zoom",factor:1/1.1})}}
    >
      −
    </button>
    <button
      type="button"
      class="diagram-zoom-value"
      title="全体を表示"
      aria-label="全体を表示"
      @click=${()=>a?.({kind:"fit"})}
    >
      100%
    </button>
    <button
      type="button"
      aria-label="拡大"
      @click=${e=>{e.stopPropagation(),a?.({kind:"zoom",factor:1.1})}}
    >
      ＋
    </button>
  </div>
`,ce=.08,xn=1.8,yn=a=>{if(a.length===0)return{x:0,y:0,width:0,height:0};const e=Math.min(...a.map(i=>i.x)),t=Math.min(...a.map(i=>i.y)),n=Math.max(...a.map(i=>i.x+i.width))-e,s=Math.max(...a.map(i=>i.y+i.height))-t;return{x:e-n*.1,y:t-s*.1,width:n*1.2,height:s*1.2}},he=(a,e)=>a+e/12,ue=16,Oe=(a,e,t,n,s="center")=>{if(e.width===0||e.height===0)return{...a,x:0,y:0};const i=(r,o,d,l)=>{const g=d*a.scale;return g<=l?s==="start"?ue-he(o,d)*a.scale:(l-g)/2-o*a.scale:Math.min(-o*a.scale,Math.max(l-(o+d)*a.scale,r))};return{...a,x:i(a.x,e.x,e.width,t),y:i(a.y,e.y,e.height,n)}},wn=(a,e,t,n,s,i,r="center")=>{const o=Oe({...a,x:a.x-s,y:a.y-i},e,t,n,r);return Math.abs(i)>Math.abs(s)&&o.y===a.y?null:o},Ue='button,[role="button"],a,input,textarea,select',$n=a=>{const{canvas:e,world:t,onClearSelection:n,onView:s,align:i="center"}=a;let r={x:0,y:0,width:0,height:0},o={x:0,y:0,scale:1};const d=()=>({width:e.clientWidth||1e3,height:e.clientHeight||560}),l=()=>{const{width:h,height:x}=d();o=Oe(o,r,h,x,i),t.style.transform=`translate(${o.x}px, ${o.y}px) scale(${o.scale})`,s?.(o)},g=()=>{const{width:h,height:x}=d(),E=r.width/1.2||1,D=r.height/1.2||1;o={...o,scale:te(Math.min((h-24)/E,(x-40)/D),ce,1)},o={...o,x:(h-r.width*o.scale)/2-r.x*o.scale,y:(x-r.height*o.scale)/2-r.y*o.scale},l()},m=()=>{const{width:h}=d(),x=r.width/1.2||1,E=te((h-24)/x,ce,1);o={scale:E,x:(h-r.width*E)/2-r.x*E,y:16},l()},p=()=>{o={scale:1,x:ue-he(r.x,r.width),y:ue-he(r.y,r.height)},l()},v=(h,x=d().width/2,E=d().height/2)=>{const D=o.scale,R=te(D*h,ce,xn);R!==D&&(o={scale:R,x:x-(x-o.x)*R/D,y:E-(E-o.y)*R/D},l())},q=h=>{if(h.target instanceof Element&&h.target.closest(".diagram-zoom"))return;const x=h.deltaMode===1?16:h.deltaMode===2?d().height:1;if(h.ctrlKey||h.metaKey){h.preventDefault();const K=e.getBoundingClientRect();v(Math.exp(-te(h.deltaY*x,-60,60)*.0012),h.clientX-K.left,h.clientY-K.top);return}const{width:E,height:D}=d(),R=wn(o,r,E,D,h.deltaX*x,h.deltaY*x,i);R!==null&&(h.preventDefault(),o=R,l())},b=new Map;let M=null,S=!1;const C=()=>{const h=[...b.values()],x=h[0];if(!x)return null;const E=h[1];return E?{x:(x.x+E.x)/2,y:(x.y+E.y)/2,distance:Math.hypot(E.x-x.x,E.y-x.y)}:{...x,distance:0}},j=h=>{b.size===0&&(S=!1);const x=(h.target instanceof Element?h.target:null)?.closest(Ue)??null;h.button!==0||h.pointerType!=="touch"&&x!==null||(b.set(h.pointerId,{x:h.clientX,y:h.clientY}),M=C(),x===null&&e.setPointerCapture(h.pointerId))},V=h=>{if(!b.has(h.pointerId)||M===null)return;b.set(h.pointerId,{x:h.clientX,y:h.clientY});const x=C();if(x===null)return;const E=x.x-M.x,D=x.y-M.y;if((Math.abs(E)+Math.abs(D)>1||Math.abs(x.distance-M.distance)>1)&&(S=!0),x.distance>0&&M.distance>0){const R=e.getBoundingClientRect();v(Math.pow(x.distance/M.distance,.45),M.x-R.left,M.y-R.top)}o={...o,x:o.x+E,y:o.y+D},l(),M=x,e.classList.toggle("is-panning",S)},I=h=>{b.delete(h.pointerId),M=C(),!(b.size>0)&&(e.classList.remove("is-panning"),h.type==="pointercancel"&&(S=!1))},ee=h=>{S&&(h.preventDefault(),h.stopPropagation()),I(h)},k=h=>{if(S){h.preventDefault(),h.stopPropagation(),S=!1;return}const x=h.target instanceof Element?h.target:null;x===null||x.closest(Ue)!==null||n()},T=h=>{if(h.target!==e)return;const x=30;if(h.key==="+"||h.key==="=")v(1.1);else if(h.key==="-")v(1/1.1);else if(h.key==="0")g();else if(h.key==="Escape")n();else if(h.key==="ArrowLeft"||h.key==="ArrowRight"||h.key==="ArrowUp"||h.key==="ArrowDown")o={...o,x:o.x+(h.key==="ArrowLeft"?x:h.key==="ArrowRight"?-x:0),y:o.y+(h.key==="ArrowUp"?x:h.key==="ArrowDown"?-x:0)},l();else return;h.preventDefault()},L=h=>{const x=h.target instanceof HTMLElement?h.target:null;if(x===null||!t.contains(x))return;const E=x.getBoundingClientRect(),D=e.getBoundingClientRect();let R=0,K=0;E.left<D.left+12?R=D.left+12-E.left:E.right>D.right-12&&(R=D.right-12-E.right),E.top<D.top+12?K=D.top+12-E.top:E.bottom>D.bottom-40&&(K=D.bottom-40-E.bottom),!(R===0&&K===0)&&(o={...o,x:o.x+R,y:o.y+K},l())};e.addEventListener("wheel",q,{passive:!1}),e.addEventListener("pointerdown",j),e.addEventListener("pointermove",V),e.addEventListener("pointerup",ee),e.addEventListener("pointercancel",I),e.addEventListener("lostpointercapture",I),e.addEventListener("click",k,!0),e.addEventListener("keydown",T),e.addEventListener("focusin",L);const P=typeof ResizeObserver>"u"?null:new ResizeObserver(()=>l());return P?.observe(e),{setContent(h){r=yn(h.width===0&&h.height===0?[]:[h]),t.style.width=`${h.width}px`,t.style.height=`${h.height}px`,l()},apply:l,fit:g,fitWidth:m,reset:p,zoom:v,view:()=>({...o}),destroy(){P?.disconnect(),e.removeEventListener("wheel",q),e.removeEventListener("pointerdown",j),e.removeEventListener("pointermove",V),e.removeEventListener("pointerup",ee),e.removeEventListener("pointercancel",I),e.removeEventListener("lostpointercapture",I),e.removeEventListener("click",k,!0),e.removeEventListener("keydown",T),e.removeEventListener("focusin",L)}}};class ge extends It{static{this.styles=B}static{this.properties={data:{attribute:!1},id:{type:String,reflect:!0},heading:{type:String},subject:{type:String}}}#e=null;#n=null;#i=[];#t=[];#s=null;#a=ln;#r=null;#o=null;#l=null;#p=null;#u=-1;#c="";#d=null;#b=null;#h=new Map;#g=null;#m=new Map;#f=null;#v=new Jt(this);constructor(){super(),this.id=this.getAttribute("id")??"",this.data=null,this.heading=null,this.subject=null}connectedCallback(){super.connectedCallback(),this.#c="",this.requestUpdate(),this.#p=en(this,e=>this.parseData(e),e=>{e.ok?this.#q(e.value):this.#A(e.error)})}disconnectedCallback(){super.disconnectedCallback(),this.#p?.(),this.#p=null,this.#o?.destroy(),this.#o=null,this.#l=null}willUpdate(e){e.has("data")&&this.data!==null&&this.#q(this.data)}updated(){this.#y(),this.#x(),this.#E(),this.#z()}#x(){const e=this.renderRoot.querySelector(".diagram");if(!(this.#f===null||!e||typeof e.showPopover!="function")&&!e.matches(":popover-open"))try{e.showPopover()}catch{}}#y(){const e=JSON.stringify([this.commentTargets,this.#t]);e!==this.#c&&(this.#c=e,this.dispatchEvent(new CustomEvent("dpk-comment-targets-change",{bubbles:!0,composed:!0})))}#E(){this.#l=this.renderRoot.querySelector(".diagram-zoom-value");const e=this.renderRoot.querySelector(".diagram-canvas"),t=this.renderRoot.querySelector(".diagram-world");if(!e||!t)return;this.#o??=$n({canvas:e,world:t,align:this.viewAlign(),onClearSelection:()=>this.#k(null),onView:i=>{this.#l&&(this.#l.textContent=`${Math.round(i.scale*100)}%`),this.dispatchEvent(new CustomEvent("dpk-diagram-view",{detail:{view:i},bubbles:!0,composed:!0})),this.onViewChange(i)}});const n=this.contentSize();if(n===null){this.#o.apply();return}this.#o.setContent({x:0,y:0,width:n.width,height:n.height});const s=this.layoutVersion();s!==this.#u&&(this.#u=s,this.initialView())}#z(){const e=this.#b!==this.#d;this.#b=this.#d;const t=this.renderRoot.querySelector(".comment-pop"),n=this.#M();!t||!n||(this.#v.open(t,n,{width:300,height:280},{placement:"right-start",trackTransform:!0}),e&&t.querySelector("textarea")?.focus({preventScroll:!0}))}get commentTargets(){if(!this.id||this.#s!==null)return[];const e=`${this.subject??this.heading??this.defaultHeading()} \xB7 ${this.id}`;return this.commentItems().map(t=>({...t,group:e}))}commentItems(){return[]}commentRef(e,...t){return`element:${[this.id,e,...t].map(n=>encodeURIComponent(n)).join("/")}`}requestElementComment(e,...t){const n=this.commentRef(e,...t);this.commentTargets.some(s=>s.value===n)&&this.dispatchEvent(new CustomEvent("dpk-comment-request",{detail:{target:n},bubbles:!0,composed:!0}))}get elementActions(){return this.#i}set elementActions(e){this.#i=e,this.#w()}get elementActionResults(){return this.#t}reduceElementActions(e,t){return{data:e,results:t.map(n=>({id:n.id,title:n.type,stale:"unsupported-action-type"}))}}dispatchElementAction(e,t,n){const s=new CustomEvent("dpk-element-action",{detail:{type:e,target:this.commentRef(...t),payload:n},bubbles:!0,composed:!0,cancelable:!0});return this.dispatchEvent(s),s.defaultPrevented}get selection(){return this.#r}select(e){this.#k(e)}get tagFilter(){return this.#a}set tagFilter(e){this.#a=e,this.requestUpdate()}get dataError(){return this.#s}resetView(){this.fitViewport()}#$(e){if(e===(this.#f!==null))return;const t=this.renderRoot.querySelector(".diagram");this.#f=e?{height:t?.offsetHeight??0}:null,this.#d=null,this.requestUpdate()}#C={handleEvent:e=>e.preventDefault(),passive:!1};#T={handleEvent:e=>{e.key!=="Escape"||this.#r!==null||(e.preventDefault(),this.#$(!1))},capture:!0};renderSelection(){const e=this.#d,t=e===null?void 0:this.#m.get(e);if(e===null||t===void 0)return y;const n=Zt(this.#h.get(e)??"",[],{label:t,...this.#g===e?{error:"\u9001\u4FE1\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"}:{}});return u`${_t(e,Qt(n,s=>this.#D(e,s)))}`}renderCommentTrigger(e,t,n){if(!this.id)return y;const s=this.commentRef(e.kind,e.id);return this.#m.set(s,t),u`<button
      type="button"
      class=${_("diagram-comment-trigger",n&&"is-placed")}
      style=${n?`left:${n.x}px; top:${n.y}px`:y}
      data-comment-kind=${e.kind}
      data-comment-id=${e.id}
      aria-label=${`${t}\u306B\u30B3\u30E1\u30F3\u30C8`}
      title=${`${t}\u306B\u30B3\u30E1\u30F3\u30C8`}
      aria-haspopup="dialog"
      aria-expanded=${this.#d===s?"true":"false"}
      @click=${()=>{this.#k(e),this.#d=s,this.requestUpdate()}}
    >
      ${Pt()}
    </button>`}renderEdgeCommentTrigger(e,t,n){const s=Math.floor((n.length-1)/2),i=n[s],r=n[s+1]??i;return!this.id||!i||!r?y:O`<foreignObject
      class="diagram-edge-comment"
      x=${(i.x+r.x)/2-16}
      y=${(i.y+r.y)/2-16}
      width="32"
      height="32"
    >${this.renderCommentTrigger(e,t)}</foreignObject>`}layoutVersion(){return 0}fitViewport(){this.viewport?.fit()}initialView(){this.viewport?.reset()}viewAlign(){return"center"}questionsOf(e){const t=e.questions?.trim();return t===void 0||t===""?y:t}onViewChange(e){}statsText(){return""}tagItems(){return[]}isEmpty(){return this.contentSize()===null}shellClass(){return""}defaultHeading(){return""}defaultSubject(){return""}emptyMessage(){return"\u8A72\u5F53\u3059\u308B\u8981\u7D20\u306F\u3042\u308A\u307E\u305B\u3093\u3002"}renderToolbarActions(){return y}renderLegend(){return y}renderAboveCanvas(){return y}get viewport(){return this.#o}items(){return this.#n??this.emptyData()}authoredItems(){return this.#e??this.emptyData()}elementClass(e,...t){return _(...t,e.selected&&"is-selected",e.related&&"is-related",e.dimmed&&"is-dimmed")}#q(e){this.#s=null,this.#e=e,this.#w()}#w(){if(this.#e===null){this.#t=this.#i.map(t=>({id:t.id,title:t.type,stale:"target-missing"})),this.requestUpdate();return}const e=this.reduceElementActions(this.#e,this.#i);this.#n=e.data,this.#t=e.results,this.#r!==null&&(this.hasSelection(this.#r)||(this.#r=null,this.#d=null)),this.requestUpdate()}#M(){const e=this.#r;return e?[...this.renderRoot.querySelectorAll("[data-comment-kind]")].find(t=>t.dataset.commentKind===e.kind&&t.dataset.commentId===e.id)??null:null}#D(e,t){if(t.kind==="input"){this.#h=new Map(this.#h).set(e,t.body),this.#g=null,this.requestUpdate();return}if(t.kind==="comment"){if(this.dispatchEvent(new CustomEvent("dpk-comment-submit",{detail:{target:e,body:t.body},bubbles:!0,composed:!0,cancelable:!0}))){this.#g=e,this.requestUpdate();return}const s=new Map(this.#h);s.delete(e),this.#h=s}this.#g=null;const n=this.#M();this.#k(null),n?.focus({preventScroll:!0})}#A(e){this.#s=e,this.#e=null,this.#n=null,this.#w(),console.error("[dev-process-kit] invalid diagram data:",e),this.requestUpdate()}hasSelection(e){return!0}#k(e){(e===null?this.#r===null:this.#r!==null&&this.#r.kind===e.kind&&this.#r.id===e.id)||(this.#r=e,this.#d=null,this.dispatchEvent(new CustomEvent("dpk-diagram-select",{detail:{selection:e},bubbles:!0,composed:!0})),this.requestUpdate())}#S=e=>{switch(e.kind){case"tag":this.#a=pn(this.#a,e.tag),this.requestUpdate();return;case"match":this.#a=cn(this.#a,e.match),this.requestUpdate();return;case"clear-tags":this.#a=hn(this.#a),this.requestUpdate();return;case"select":this.#k(e.selection);return;case"zoom":this.#o?.zoom(e.factor);return;case"fit":this.fitViewport();return;default:return}};refreshContent(){}render(){this.#m=new Map,this.refreshContent();const e=fn(this.tagItems(),this.#a),t=this.#f,n=t===null?"\u6700\u5927\u5316":"\u5143\u306E\u30B5\u30A4\u30BA\u306B\u623B\u3059";return u`
      ${t===null?y:u`<div class="diagram-placeholder" style="height:${t.height}px"></div>`}
      <div
        class=${_("diagram",this.shellClass(),t!==null&&"is-maximized")}
        popover=${t===null?y:"manual"}
        @wheel=${t===null?y:this.#C}
        @keydown=${t===null?y:this.#T}
      >
        <div class="diagram-toolbar">
          <span class="diagram-title">${this.heading??this.defaultHeading()}</span>
          ${(this.subject??this.defaultSubject())===""?y:u`<span class="diagram-subject">${this.subject??this.defaultSubject()}</span>`}
          <div class="diagram-toolbar-actions">
            ${this.renderToolbarActions()}
            <span class="diagram-stats">${this.statsText()}</span>
            <button
              type="button"
              class="dpk-icon-btn diagram-maximize"
              aria-label=${n}
              title=${n}
              aria-pressed=${t===null?"false":"true"}
              @click=${()=>this.#$(t===null)}
            >
              ${t===null?Ft():Ht()}
            </button>
          </div>
        </div>
        ${kn(e,this.#a.match,this.#S)} ${this.renderAboveCanvas()}
        <div
          class="diagram-canvas"
          tabindex="0"
          aria-label="図。矢印キーでパン、プラス・マイナスでズーム、0で全体表示。"
        >
          <div class="diagram-world">${this.renderCanvas()}</div>
          ${this.isEmpty()?u`<p class="diagram-empty">${this.emptyMessage()}</p>`:y}
          ${this.#s===null?y:u`<p class="diagram-notice" role="alert">
                  図のデータを読み込めませんでした。<br />${this.#s}
                </p>`}
          ${this.renderLegend()} ${vn(this.#S)}
        </div>
        ${this.renderSelection()}
      </div>
    `}}class Q extends ge{#e=null;#n="";#i=0;#t=H;commentItems(){const e=this.items();return[...e.nodes.map(t=>({value:this.commentRef("node",t.id),label:t.id})),...e.edges.map(t=>({value:this.commentRef("edge",t.id),label:`${t.from} \u2192 ${t.to} (${t.id})`}))]}get visible(){const e=this.filtered();return{nodes:e.nodes,edges:e.edges}}get layout(){return this.#e}get layoutMode(){return"layered"}get tagDimension(){return"node"}layoutOptions(){return{}}matchesFilter(e){return!0}layoutSignature(){return""}statsLabels(){return{node:"\u8981\u7D20",edge:"\u95A2\u9023"}}statsText(){const e=this.filtered();return bn(e.nodes.length,e.edges.length,this.statsLabels())}tagItems(){const e=this.items();return(this.tagDimension==="edge"?e.edges:e.nodes).map(t=>t.tags)}contentSize(){const e=this.#e;return e===null||e.nodes.length===0?null:{width:e.width,height:e.height}}layoutVersion(){return this.#i}hasSelection(e){const t=this.items();return e.kind==="node"?t.nodes.some(n=>n.id===e.id):t.edges.some(n=>n.id===e.id)}placedNode(e){return this.#e?.nodes.find(t=>t.id===e)}routeOf(e){return this.#e?.routes.find(t=>t.id===e)?.points??[]}nodeState(e){return je(e,this.selection,"node",this.#t)}edgeState(e){return je(e,this.selection,"edge",this.#t)}renderEdges(e,t){const n=this.#e?.width??0,s=this.#e?.height??0;return u`<svg class="diagram-edges" width=${n} height=${s}>
      ${Re(t)}${e}
    </svg>`}filtered(){const e=this.items();if(this.tagDimension==="edge"){const s=e.edges.filter(r=>X(r.tags,this.tagFilter)&&this.matchesFilter(r)),i=new Set(s.flatMap(r=>[r.from,r.to]));return{...e,edges:s,nodes:e.nodes.filter(r=>i.has(r.id))}}const t=e.nodes.filter(s=>X(s.tags,this.tagFilter)&&this.matchesFilter(s)),n=new Set(t.map(s=>s.id));return{...e,nodes:t,edges:e.edges.filter(s=>n.has(s.from)&&n.has(s.to))}}refreshContent(){const e=this.filtered(),t=[this.layoutMode,e.nodes.map(n=>`${n.id}:${n.width}x${n.height}`).join(","),e.edges.map(n=>`${n.id}:${n.from}>${n.to}`).join(","),this.layoutSignature()].join("|");t!==this.#n&&(this.#n=t,this.#i+=1,this.#e=this.computePlacement(e)),this.#t=this.relations(this.selection,e)}computePlacement(e){const t=e.nodes.map(i=>({id:i.id,width:i.width,height:i.height,...i.ports===void 0?{}:{ports:i.ports},...i.position===void 0?{}:{position:i.position}})),n=e.edges.map(i=>({id:i.id,from:i.from,to:i.to,...i.fromPort===void 0?{}:{fromPort:i.fromPort},...i.toPort===void 0?{}:{toPort:i.toPort}})),s=this.layoutOptions();return this.layoutMode==="fixed"?dn(t,n,s):on(t,n,s)}}const qn=z({x:J(),y:J()}),Mn=z({id:w(c(),$(1)),name:w(c(),$(1)),code:f(c()),kind:f(F(["normal","initial","terminal","compensation"]),"normal"),description:f(c()),position:f(qn),questions:f(c())}),Sn=z({id:w(c(),$(1)),from:w(c(),$(1)),to:w(c(),$(1)),title:w(c(),$(1)),kind:f(F(["normal","exception"]),"normal"),tags:f(A(c()),[]),guard:f(c()),effect:f(c()),questions:f(c())}),Ie={width:178,height:86},En=()=>({nodes:[],edges:[]}),zn=z({states:A(Mn),transitions:f(A(Sn),[])}),Pe=a=>{const e=Y(zn,a),t=new Set;for(const i of e.states){if(t.has(i.id))throw new Error(`duplicate state id: ${i.id}`);t.add(i.id)}const n=new Set,s=e.transitions.map(i=>{if(n.has(i.id))throw new Error(`duplicate transition id: ${i.id}`);if(n.add(i.id),!t.has(i.from))throw new Error(`unknown transition source: ${i.from}`);if(!t.has(i.to))throw new Error(`unknown transition target: ${i.to}`);return{id:i.id,from:i.from,to:i.to,title:i.title,kind:i.kind,tags:i.tags,guard:i.guard??null,effect:i.effect??null,...i.questions===void 0?{}:{questions:i.questions}}});return{nodes:e.states.map(i=>({id:i.id,name:i.name,code:i.code??null,kind:i.kind,description:i.description??null,width:Ie.width,height:Ie.height,tags:[],...i.position===void 0?{}:{position:i.position},...i.questions===void 0?{}:{questions:i.questions}})),edges:s}},Cn=a=>a.length>0&&a.every(e=>e.position!==void 0),Tn=N`
  .state-node {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
    padding: 0 15px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-xs);
    text-align: left;
    overflow: hidden;
  }

  .state-node:hover {
    border-color: var(--dpk-blue);
  }

  .state-node.is-initial {
    border-left-width: 3px;
  }

  .state-node.is-terminal {
    border: 3px double var(--dpk-rule-strong);
  }

  .state-node.is-compensation {
    border-color: color-mix(in srgb, var(--dpk-amber) 50%, transparent);
    background: var(--dpk-amber-soft);
  }

  .state-node.is-selected {
    border-color: var(--dpk-blue);
    box-shadow: 0 0 0 3px var(--dpk-blue-soft);
  }

  .state-node.is-related {
    border-color: color-mix(in srgb, var(--dpk-green) 60%, transparent);
  }

  .state-code {
    font-family: var(--dpk-mono);
    font-size: 9px;
    letter-spacing: 0.02em;
    color: var(--dpk-ink-faint);
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
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink-soft);
    font-size: 10px;
    line-height: 1.5;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
  }

  .state-label:hover {
    border-color: color-mix(in srgb, var(--dpk-blue) 40%, transparent);
    color: var(--dpk-blue);
  }

  .state-label.is-selected {
    border-color: color-mix(in srgb, var(--dpk-blue) 55%, transparent);
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue);
    font-weight: 600;
  }

  .state-label.is-dimmed {
    opacity: 0.35;
  }

  .state-edge.is-exception .d-edge-path {
    stroke: color-mix(in srgb, var(--dpk-amber) 65%, var(--dpk-rule-strong));
    stroke-dasharray: 5 4;
  }

  .state-edge.is-related .d-edge-path {
    stroke: var(--dpk-green);
  }

  .state-edge.is-selected .d-edge-path {
    stroke: var(--dpk-blue);
  }

  .state-initial-mark {
    fill: var(--dpk-ink-faint);
    stroke: var(--dpk-ink-faint);
  }

  .state-initial-mark.is-dimmed {
    opacity: 0.26;
  }

  #state-arrow .diagram-arrow {
    fill: var(--dpk-ink-faint);
    stroke: var(--dpk-ink-faint);
  }

  #state-arrow-active .diagram-arrow {
    fill: var(--dpk-blue);
    stroke: var(--dpk-blue);
  }

  #state-arrow-exception .diagram-arrow {
    fill: var(--dpk-amber);
    stroke: var(--dpk-amber);
  }
`,Dn=[{id:"state-arrow"},{id:"state-arrow-active"},{id:"state-arrow-exception"}];class Fe extends Q{static{this.styles=[B,Tn]}parseData(e){return Pe(e)}emptyData(){return En()}defaultHeading(){return"State machine"}statsLabels(){return{node:"\u72B6\u614B",edge:"\u9077\u79FB"}}emptyMessage(){return"\u8A72\u5F53\u3059\u308B\u9077\u79FB\u306F\u3042\u308A\u307E\u305B\u3093\u3002"}get tagDimension(){return"edge"}get layoutMode(){return Cn(this.filtered().nodes)?"fixed":"layered"}layoutOptions(){return this.layoutMode==="fixed"?{padding:44}:{nodeSpacing:40,layerSpacing:110,padding:44}}relations(e,t){if(e===null||e.kind!=="node")return H;const n=U(t.edges,e.id,"outgoing",!1),s=U(t.edges,e.id,"incoming",!1);return{nodes:new Map([...n.nodes,...s.nodes]),edges:new Set([...n.edges,...s.edges])}}renderCanvas(){const e=this.visible.nodes,t=e.filter(n=>n.kind==="initial").map(n=>this.#i(n));return u`
      ${this.renderEdges([...t,...this.visible.edges.map(n=>this.#t(n))],Dn)}
      ${e.map(n=>this.#s(n))} ${this.visible.edges.map(n=>this.#a(n))}
    `}#e(e){return this.filtered().nodes.find(t=>t.id===e)?.name??e}#n(e){return[e.guard,e.effect].filter(t=>t!==null).join(`
`)||e.title}#i(e){const t=this.placedNode(e.id);if(!t)return y;const n=t.y+t.height/2,s=this.nodeState(e.id);return O`
      <g class=${_("state-initial-mark",s.dimmed&&"is-dimmed")}>
        <circle cx=${t.x-22} cy=${n} r="5"></circle>
        <path
          d=${Z([{x:t.x-17,y:n},{x:t.x-1,y:n}])}
          stroke-width="1.6"
        ></path>
      </g>
    `}#t(e){const t=this.edgeState(e.id),n=this.routeOf(e.id),s=Z(n),i=t.selected||t.related?"state-arrow-active":e.kind==="exception"?"state-arrow-exception":"state-arrow",r=()=>this.select({kind:"edge",id:e.id});return O`
      <g
        class=${this.elementClass(t,"d-edge","state-edge",e.kind==="exception"&&"is-exception")}
        data-transition=${e.id}
      >
        <title>${this.#n(e)}</title>
        <path class="d-edge-path" d=${s} marker-end=${`url(#${i})`}></path>
        <path
          class="d-edge-hit"
          d=${s}
          role="button"
          tabindex="0"
          aria-label=${`${this.#e(e.from)} \u304B\u3089 ${this.#e(e.to)} \u3078\u306E ${e.title}`}
          @click=${r}
          @keydown=${o=>{o.key!=="Enter"&&o.key!==" "||(o.preventDefault(),r())}}
        ></path>
      </g>
    `}#s(e){const t=this.placedNode(e.id);if(!t)return y;const n=this.nodeState(e.id);return u`
      <button
        type="button"
        class=${this.elementClass(n,"d-node","state-node",`is-${e.kind}`)}
        data-state=${e.id}
        data-grill-questions=${this.questionsOf(e)}
        style="left:${t.x}px; top:${t.y}px; width:${e.width}px; height:${e.height}px"
        aria-pressed=${n.selected?"true":"false"}
        title=${e.description??e.name}
        @click=${()=>this.select({kind:"node",id:e.id})}
      >
        <span class="state-name">${e.name}</span>
        ${e.code===null?y:u`<span class="state-code">${e.code}</span>`}
      </button>
      ${this.renderCommentTrigger({kind:"node",id:e.id},e.name,{x:t.x+e.width-20,y:t.y-14})}
    `}#a(e){const t=this.edgeState(e.id),n=mn(this.routeOf(e.id));return u`
      <span class="state-label-slot" style="left:${n.x}px; top:${n.y}px">
        <button
          type="button"
          class=${this.elementClass(t,"state-label")}
          data-transition-label=${e.id}
          data-grill-questions=${this.questionsOf(e)}
          title=${this.#n(e)}
          @click=${()=>this.select({kind:"edge",id:e.id})}
        >
          ${e.title}
        </button>
        ${this.renderCommentTrigger({kind:"edge",id:e.id},`${this.#e(e.from)} \u2192 ${this.#e(e.to)} \xB7 ${e.title}`)}
      </span>
    `}}const He=()=>{customElements.get("dpk-component-state-diagram")||customElements.define("dpk-component-state-diagram",Fe)},An=z({kind:ye("message"),id:w(c(),$(1)),from:w(c(),$(1)),to:w(c(),$(1)),title:w(c(),$(1)),style:f(F(["request","response","async"]),"request"),tags:f(A(c()),[]),guard:f(c()),detail:f(c()),questions:f(c())}),Ln=z({label:w(c(),$(1)),items:A(xe())}),jn=z({kind:ye("fragment"),id:w(c(),$(1)),operator:F(["alt","opt","loop","par"]),title:w(c(),$(1)),collapsed:f(oe(),!1),branches:w(A(Ln),$(1))}),Rn=Vt("kind",[An,jn]),On=z({id:w(c(),$(1)),name:w(c(),$(1)),role:f(c()),symbol:f(c()),kind:f(F(["internal","external"]),"internal"),description:f(c()),questions:f(c())}),Un=z({participants:w(A(On),$(1)),items:f(A(xe()),[])}),Ve=240,me=(a,e,t)=>{if(a.has(e))throw new Error(`duplicate ${t} id: ${e}`);a.add(e)},Ne=(a,e,t)=>a.map(n=>{const s=Y(Rn,n);if(s.kind==="message"){if(me(t,s.id,"message"),!e.has(s.from))throw new Error(`unknown sender: ${s.from}`);if(!e.has(s.to))throw new Error(`unknown receiver: ${s.to}`);return{kind:"message",id:s.id,from:s.from,to:s.to,title:s.title,style:s.style,tags:s.tags,guard:s.guard??null,detail:s.detail??null,questions:s.questions??null}}return me(t,s.id,"fragment"),{kind:"fragment",id:s.id,operator:s.operator,title:s.title,collapsed:s.collapsed,branches:s.branches.map(i=>({label:i.label,items:Ne(i.items,e,t)}))}}),Ye=a=>{const e=Y(Un,a),t=new Set;for(const n of e.participants)me(t,n.id,"participant");return{participants:e.participants.map(n=>({id:n.id,name:n.name,role:n.role??null,symbol:n.symbol??null,external:n.kind==="external",description:n.description??null,questions:n.questions??null})),items:Ne(e.items,t,new Set)}},In=()=>({participants:[],items:[]}),Be=(a,e)=>{for(const t of a)if(t.kind==="message")e.push(t);else for(const n of t.branches)Be(n.items,e)},W=a=>{const e=[];return Be(a,e),e},Pn=a=>new Map(W(a.items).map((e,t)=>[e.id,String(t+1).padStart(2,"0")])),Fn=a=>W(a).length,We=(a,e)=>{const t=[];for(const n of a){if(n.kind==="message"){e(n)&&t.push(n);continue}const s=n.branches.map(i=>({label:i.label,items:We(i.items,e)})).filter(i=>i.items.length>0);s.length>0&&t.push({...n,branches:s})}return t},Hn=64,Vn=86,Nn=31,Yn=32,Bn=40,Wn=(a,e)=>{const t=We(a.items,e),n=new Set;for(const q of W(t))n.add(q.from),n.add(q.to);const s=a.participants.filter(q=>n.has(q.id)),i=new Map(s.map((q,b)=>[q.id,120+b*Ve])),r=Math.max(360,s.length*Ve),o=[],d=[],l=[],g=[],m=[];let p=25;const v=(q,b)=>{for(const M of q){if(M.kind==="message"){o.push({message:M,y:p+29,depth:b}),p+=M.from===M.to?Vn:Hn;continue}const S=22+b*13,C=p,j=r-44-b*26;p+=Nn,M.collapsed?(m.push({fragment:M,x:S,y:p+6}),p+=Bn):M.branches.forEach((V,I)=>{I>0&&(g.push({x:S,y:p,width:j}),p+=8),l.push({label:V.label,x:S+12,y:p}),p+=Yn,v(V.items,b+1),p+=8}),d.push({fragment:M,x:S,y:C,width:j,height:p-C,count:Fn([M])}),p+=14}};return v(t,0),{width:r,height:p+24,participants:s,rows:o,frames:d,branches:l,dividers:g,folds:m,x:i}},Kn=N`
  .sequence .diagram-canvas {
    background-image: none;
  }

  .sequence-rail {
    position: relative;
    height: 62px;
    flex-shrink: 0;
    overflow: hidden;
    border-bottom: 1px solid var(--dpk-rule);
    background: var(--dpk-paper);
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
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-xs);
    text-align: left;
    cursor: pointer;
  }

  .sequence-participant.is-external {
    border-style: dashed;
  }

  .sequence-participant[aria-pressed='true'] {
    border-color: var(--dpk-blue);
    box-shadow: 0 0 0 3px var(--dpk-blue-soft);
  }

  .sequence-participant.is-related {
    border-color: color-mix(in srgb, var(--dpk-green) 60%, transparent);
  }

  .sequence-symbol {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-paper-inset);
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: 9.5px;
  }

  .sequence-participant.is-external .sequence-symbol {
    background: var(--dpk-amber-soft);
    color: var(--dpk-amber);
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
    color: var(--dpk-ink-faint);
  }

  .sequence-lifeline {
    stroke: var(--dpk-rule-strong);
    stroke-width: 1;
    stroke-dasharray: 4 6;
  }

  .sequence-divider {
    stroke: var(--dpk-rule-strong);
    stroke-dasharray: 4 4;
  }

  .sequence-message {
    fill: none;
    stroke: var(--dpk-ink-faint);
    stroke-width: 1.5;
    stroke-linejoin: round;
  }

  .sequence-message.is-response {
    stroke-dasharray: 5 4;
  }

  .sequence-message.is-async {
    stroke: var(--dpk-blue);
  }

  .sequence-message-row.is-related .sequence-message {
    stroke: var(--dpk-green);
    stroke-width: 2;
  }

  .sequence-message-row.is-selected .sequence-message {
    stroke: var(--dpk-ink);
    stroke-width: 2.4;
  }

  .sequence-message-row.is-dimmed,
  .sequence-label.is-dimmed {
    opacity: 0.24;
  }

  .sequence-frame {
    position: absolute;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-xs);
    background: color-mix(in srgb, var(--dpk-blue-soft) 50%, transparent);
    pointer-events: none;
  }

  .sequence-frame-header {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 5px 9px;
    border: 1px solid var(--dpk-rule-strong);
    border-bottom: 0;
    border-radius: var(--dpk-radius-xs) var(--dpk-radius-xs) 0 0;
    background: var(--dpk-paper-sunken);
    color: var(--dpk-ink-soft);
    font-size: 10px;
    text-align: left;
    cursor: pointer;
  }

  .sequence-frame-header:hover {
    background: var(--dpk-paper-inset);
    color: var(--dpk-ink);
  }

  .sequence-operator {
    min-width: 26px;
    font-family: var(--dpk-mono);
    font-weight: 700;
    color: var(--dpk-blue);
  }

  .sequence-frame-count {
    margin-left: auto;
    font-family: var(--dpk-mono);
    font-size: 9px;
    color: var(--dpk-ink-faint);
  }

  .sequence-branch {
    position: absolute;
    font-size: 9.5px;
    color: var(--dpk-ink-faint);
  }

  .sequence-fold {
    position: absolute;
    font-size: 10px;
    color: var(--dpk-ink-faint);
  }

  .sequence-label {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 6px;
    max-height: 27px;
    padding: 3px 5px;
    border: 1px solid transparent;
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink-soft);
    font-size: 10px;
    text-align: left;
    cursor: pointer;
  }

  .sequence-label:hover {
    border-color: color-mix(in srgb, var(--dpk-blue) 40%, transparent);
    color: var(--dpk-blue);
  }

  .sequence-label.is-selected {
    border-color: color-mix(in srgb, var(--dpk-blue) 55%, transparent);
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue);
  }

  .sequence-number {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 19px;
    height: 17px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: 3px;
    font-family: var(--dpk-mono);
    font-size: 8px;
    font-variant-numeric: tabular-nums;
    color: var(--dpk-ink-faint);
  }

  .sequence-text {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  #seq-request .diagram-arrow,
  #seq-response .diagram-arrow {
    fill: var(--dpk-ink-faint);
    stroke: var(--dpk-ink-faint);
  }

  #seq-async .diagram-arrow {
    stroke: var(--dpk-blue);
  }

  #seq-related .diagram-arrow {
    fill: var(--dpk-green);
    stroke: var(--dpk-green);
  }

  #seq-selected .diagram-arrow {
    fill: var(--dpk-ink);
    stroke: var(--dpk-ink);
  }
`,Xn=[{id:"seq-request"},{id:"seq-response"},{id:"seq-async"},{id:"seq-related"},{id:"seq-selected"}],_n={request:"\u51E6\u7406 / \u4FDD\u8A3C",response:"\u5FDC\u7B54 / \u4FDD\u8A3C",async:"\u975E\u540C\u671F\u51E6\u7406 / \u4FDD\u8A3C"};class Ke extends ge{static{this.styles=[B,Kn]}#e=null;#n=new Map;#i=new Map;#t=new Set;#s=new Set;#a="";#r=0;commentItems(){const e=this.items();return[...e.participants.map(t=>({value:this.commentRef("participant",t.id),label:t.name})),...W(e.items).map(t=>({value:this.commentRef("message",t.id),label:t.title}))]}parseData(e){return this.#i.clear(),Ye(e)}emptyData(){return In()}defaultHeading(){return"Sequence"}shellClass(){return"sequence"}emptyMessage(){return"\u8A72\u5F53\u3059\u308B\u30E1\u30C3\u30BB\u30FC\u30B8\u306F\u3042\u308A\u307E\u305B\u3093\u3002"}fitViewport(){this.viewport?.fitWidth()}onViewChange(e){const t=this.renderRoot.querySelector(".sequence-rail-world");t&&(t.style.transform=`translateX(${e.x}px) scale(${e.scale})`)}hasSelection(e){const t=this.items();return e.kind==="participant"?t.participants.some(n=>n.id===e.id):W(t.items).some(n=>n.id===e.id)}tagItems(){return W(this.items().items).map(e=>e.tags)}statsText(){const e=this.#e,t=W(this.items().items).length;return e===null?"":`${e.rows.length} / ${t} \u30E1\u30C3\u30BB\u30FC\u30B8`}contentSize(){const e=this.#e;return e===null||e.rows.length===0?null:{width:e.width,height:e.height}}isEmpty(){return this.contentSize()===null}layoutVersion(){return this.#r}refreshContent(){const e=this.#l(),t=this.tagFilter,n=[t.match,[...t.active].join(","),[...this.#i].map(([r,o])=>`${r}:${o}`).join(","),W(e.items).map(r=>r.id).join(",")].join("|");n!==this.#a&&(this.#a=n,this.#r+=1,this.#n=Pn(this.items()),this.#e=Wn(e,r=>X(r.tags,t))),this.#t=new Set,this.#s=new Set;const s=this.selection,i=this.#e;if(s!==null&&i!==null)if(s.kind==="message"){const r=i.rows.find(o=>o.message.id===s.id);this.#t.add(s.id),r&&(this.#s.add(r.message.from),this.#s.add(r.message.to))}else for(const r of i.rows)r.message.from!==s.id&&r.message.to!==s.id||this.#t.add(r.message.id)}#o(e){const t=e.detail===null?null:`${_n[e.style]}: ${e.detail}`;return[e.guard,t].filter(n=>n!==null).join(`
`)||e.title}#l(){const e=this.items(),t=n=>n.map(s=>s.kind==="message"?s:{...s,collapsed:this.#i.get(s.id)??s.collapsed,branches:s.branches.map(i=>({label:i.label,items:t(i.items)}))});return{participants:e.participants,items:t(e.items)}}#p(e){return this.#e?.frames.find(t=>t.fragment.id===e.id)?.fragment.collapsed??e.collapsed}#u(e){this.#i.set(e.id,!this.#p(e)),this.requestUpdate()}#c(e){const t=this.selection?.kind==="message"&&this.selection.id===e,n=!t&&this.#t.has(e);return{selected:t,related:n,dimmed:this.selection!==null&&!t&&!n,depth:null}}#d(e){const t=this.selection?.kind==="participant"&&this.selection.id===e,n=!t&&this.#s.has(e);return{selected:t,related:n,dimmed:this.selection!==null&&!t&&!n,depth:null}}renderAboveCanvas(){const e=this.#e;return e===null?y:u`
      <div class="sequence-rail" role="group" aria-label="参加者">
        <div class="sequence-rail-world">
          ${e.participants.map(t=>this.#b(t,e))}
        </div>
      </div>
    `}#b(e,t){const n=t.x.get(e.id)??0,s=this.#d(e.id);return u`
      <button
        type="button"
        class=${this.elementClass(s,"sequence-participant",e.external&&"is-external")}
        data-participant=${e.id}
        data-grill-questions=${this.questionsOf(e)}
        style="left:${n-95}px"
        aria-pressed=${s.selected?"true":"false"}
        title=${e.description??e.name}
        @click=${()=>this.select({kind:"participant",id:e.id})}
      >
        <span class="sequence-symbol" aria-hidden="true">${e.symbol??e.name.slice(0,2)}</span>
        <span>
          <span class="sequence-name">${e.name}</span>
          ${e.role===null?y:u`<span class="sequence-role">${e.role}</span>`}
        </span>
      </button>
      ${this.renderCommentTrigger({kind:"participant",id:e.id},e.name,{x:n+95-34,y:17})}
    `}renderCanvas(){const e=this.#e;return e===null?u``:u`
      ${this.#h(e)}
      ${e.frames.map(t=>u`<div
          class="sequence-frame"
          style="left:${t.x}px; top:${t.y}px; width:${t.width}px; height:${t.height}px"
        ></div>`)}
      ${e.frames.map(t=>this.#g(t.fragment,t.x,t.y,t.width,t.count))}
      ${e.branches.map(t=>u`<span class="sequence-branch" style="left:${t.x}px; top:${t.y}px"
          >[${t.label}]</span
        >`)}
      ${e.folds.map(t=>u`<span class="sequence-fold" style="left:${t.x}px; top:${t.y}px"
          >${t.fragment.branches.map(n=>`[${n.label}]`).join(" / ")}</span
        >`)}
      ${e.rows.map(t=>this.#m(t.y,t.message,e))}
    `}#h(e){const t=e.participants.map(i=>O`<path
          class="sequence-lifeline"
          d=${`M${e.x.get(i.id)??0} 0 V${e.height}`}
        ></path>`),n=e.dividers.map(i=>O`<path class="sequence-divider" d=${`M${i.x} ${i.y} h${i.width}`}></path>`),s=e.rows.map(i=>{const r=e.x.get(i.message.from)??0,o=e.x.get(i.message.to)??0,d=r===o?`M${r} ${i.y} h42 v25 H${r}`:`M${r} ${i.y} H${o}`,l=this.#c(i.message.id),g=l.selected?"seq-selected":l.related?"seq-related":i.message.style==="async"?"seq-async":i.message.style==="response"?"seq-response":"seq-request",m=()=>this.select({kind:"message",id:i.message.id});return O`
        <g
          class=${this.elementClass(l,"sequence-message-row","d-edge",`is-${i.message.style}`)}
          data-message=${i.message.id}
        >
          <title>${this.#o(i.message)}</title>
          <path class="d-edge-hit" d=${d} role="button" tabindex="0"
            aria-label=${`${i.message.title}\u3092\u9078\u629E`}
            @click=${m}
            @keydown=${p=>{p.key!=="Enter"&&p.key!==" "||(p.preventDefault(),m())}}></path>
          <path class="sequence-message is-${i.message.style}" d=${d} marker-end=${`url(#${g})`}></path>
        </g>
      `});return u`<svg class="diagram-edges" width=${e.width} height=${e.height}>
      ${Re(Xn)} ${t} ${n} ${s}
    </svg>`}#g(e,t,n,s,i){const r=this.#p(e);return u`
      <button
        type="button"
        class="sequence-frame-header"
        data-fragment=${e.id}
        style="left:${t}px; top:${n}px; width:${s}px"
        aria-expanded=${r?"false":"true"}
        aria-label=${`${e.operator} \xB7 ${e.title}\u3092${r?"\u5C55\u958B":"\u6298\u308A\u305F\u305F\u3080"}`}
        @click=${()=>this.#u(e)}
      >
        <span aria-hidden="true">${r?"\u25B8":"\u25BE"}</span>
        <span class="sequence-operator">${e.operator}</span>
        <span class="sequence-text">${e.title}</span>
        <span class="sequence-frame-count">${i} メッセージ</span>
      </button>
    `}#m(e,t,n){const s=n.x.get(t.from)??0,i=n.x.get(t.to)??0,r=s===i,o=this.#c(t.id),d=r?s+12:Math.min(s,i)+14,l=r?175:Math.abs(i-s)-28;return u`
      <button
        type="button"
        class=${this.elementClass(o,"sequence-label")}
        data-message-label=${t.id}
        data-grill-questions=${this.questionsOf(t)}
        style="left:${d}px; top:${e-28}px; width:${l}px"
        title=${this.#o(t)}
        @click=${()=>this.select({kind:"message",id:t.id})}
      >
        <span class="sequence-number">${this.#n.get(t.id)??""}</span>
        <span class="sequence-text">${t.title}</span>
      </button>
      ${this.renderCommentTrigger({kind:"message",id:t.id},`${this.#n.get(t.id)??""} ${t.title}`.trim(),{x:d+l-30,y:e-31})}
    `}}const Xe=()=>{customElements.get("dpk-component-sequence-diagram")||customElements.define("dpk-component-sequence-diagram",Ke)},_e={width:176,height:84},Jn=z({id:w(c(),$(1)),name:w(c(),$(1)),path:f(c()),layer:f(c()),tags:f(A(c()),[]),description:f(c()),questions:f(c())}),Zn=z({id:w(c(),$(1)),from:w(c(),$(1)),to:w(c(),$(1)),contract:f(c()),description:f(c()),questions:f(c())}),Qn=z({modules:A(Jn),dependencies:f(A(Zn),[])}),Gn=()=>({nodes:[],edges:[]}),ei=a=>{const e=Y(Qn,a),t=new Set;for(const i of e.modules){if(t.has(i.id))throw new Error(`duplicate module id: ${i.id}`);t.add(i.id)}const n=new Set,s=e.dependencies.map(i=>{if(n.has(i.id))throw new Error(`duplicate dependency id: ${i.id}`);if(n.add(i.id),!t.has(i.from))throw new Error(`unknown dependency source: ${i.from}`);if(!t.has(i.to))throw new Error(`unknown dependency target: ${i.to}`);return{id:i.id,from:i.from,to:i.to,tags:[],contract:i.contract??null,description:i.description??null}});return{nodes:e.modules.map(i=>({id:i.id,name:i.name,path:i.path??null,layer:i.layer??null,description:i.description??null,tags:i.tags,width:_e.width,height:_e.height,...i.questions===void 0?{}:{questions:i.questions}})),edges:s}},ti=N`
  .dep-direction {
    display: flex;
    gap: 1px;
    padding: 2px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-xs);
  }

  .dep-direction button {
    border: 0;
    border-radius: 3px;
    padding: 3px 7px;
    background: transparent;
    color: var(--dpk-ink-faint);
    font-size: 9.5px;
    cursor: pointer;
  }

  .dep-direction button[aria-pressed='true'] {
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue);
    font-weight: 650;
  }

  .dep-toggle {
    min-height: 26px;
    padding: 0 8px;
    font-size: 10.5px;
  }

  .dep-toggle[aria-pressed='true'] {
    border-color: color-mix(in srgb, var(--dpk-blue) 40%, transparent);
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue);
  }

  .dep-module {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 11px 12px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-xs);
    text-align: left;
    overflow: hidden;
  }

  .dep-module:hover {
    border-color: var(--dpk-blue);
  }

  .dep-module.is-cyclic:not(.is-selected) {
    border-color: color-mix(in srgb, var(--dpk-amber) 55%, transparent);
  }

  .dep-module.is-selected {
    border-color: var(--dpk-blue);
    background: var(--dpk-blue-soft);
    box-shadow: 0 0 0 3px var(--dpk-blue-soft);
  }

  .dep-module.is-related {
    border-color: color-mix(in srgb, var(--dpk-green) 55%, transparent);
    background: var(--dpk-green-soft);
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
    color: var(--dpk-ink-faint);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dep-cycle-badge {
    flex-shrink: 0;
    padding: 1px 4px;
    border-radius: 3px;
    background: var(--dpk-amber-soft);
    color: var(--dpk-amber);
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
    font-family: var(--dpk-mono);
    font-size: 9px;
    color: var(--dpk-ink-faint);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dep-edge .d-edge-path {
    stroke: var(--dpk-rule-strong);
    stroke-width: 1.4;
  }

  .dep-edge.is-related .d-edge-path {
    stroke: var(--dpk-green);
    stroke-width: 2;
  }

  .dep-edge.is-selected .d-edge-path {
    stroke: var(--dpk-blue);
    stroke-width: 2.6;
  }

  .dep-edge:focus-visible .d-edge-path {
    stroke: var(--dpk-blue);
  }

  .diagram-legend .dep-swatch-outgoing {
    border-color: #6e9b61;
  }

  .diagram-legend .dep-swatch-incoming {
    border-color: #729aaa;
  }

  .diagram-legend .dep-swatch-cycle {
    border-color: var(--dpk-amber);
  }

  #dep-neutral .diagram-arrow {
    fill: var(--dpk-rule-strong);
    stroke: var(--dpk-rule-strong);
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
    fill: var(--dpk-amber);
    stroke: var(--dpk-amber);
  }

  #dep-selected .diagram-arrow {
    fill: var(--dpk-blue);
    stroke: var(--dpk-blue);
  }
`,ni=[{id:"dep-neutral"},{id:"dep-outgoing"},{id:"dep-incoming"},{id:"dep-cycle"},{id:"dep-selected"}];class Je extends Q{static{this.styles=[B,ti]}#e="both";#n=!1;#i=!1;#t=[];#s=H;#a=H;parseData(e){return ei(e)}emptyData(){return Gn()}defaultHeading(){return"Dependencies"}statsLabels(){return{node:"\u30E2\u30B8\u30E5\u30FC\u30EB",edge:"\u4F9D\u5B58"}}emptyMessage(){return this.#i?"\u8A72\u5F53\u3059\u308B\u5FAA\u74B0\u4F9D\u5B58\u306F\u3042\u308A\u307E\u305B\u3093\u3002":"\u8A72\u5F53\u3059\u308B\u30E2\u30B8\u30E5\u30FC\u30EB\u306F\u3042\u308A\u307E\u305B\u3093\u3002"}layoutOptions(){return{nodeSpacing:40,layerSpacing:96,padding:32}}relations(e,t){return e===null||e.kind!=="node"?H:{nodes:new Map([...this.#s.nodes,...this.#a.nodes]),edges:new Set([...this.#s.edges,...this.#a.edges])}}refreshContent(){const e=this.items(),t=this.tagFilter,n=e.nodes.filter(o=>X(o.tags,t)),s=new Set(n.map(o=>o.id)),i=e.edges.filter(o=>s.has(o.from)&&s.has(o.to));this.#t=gn(n.map(o=>o.id),i);const r=this.selection;this.#s=r!==null&&r.kind==="node"&&this.#e!=="incoming"?U(i,r.id,"outgoing",this.#n):H,this.#a=r!==null&&r.kind==="node"&&this.#e!=="outgoing"?U(i,r.id,"incoming",this.#n):H,super.refreshContent()}matchesFilter(e){return this.#i?pe(this.#t).has(e.id):!0}filtered(){const e=super.filtered();if(!this.#i)return e;const t=pe(this.#t),n=e.edges.filter(i=>Ae(i,t)),s=new Set(n.flatMap(i=>[i.from,i.to]));return{nodes:e.nodes.filter(i=>s.has(i.id)),edges:n}}renderToolbarActions(){const e=this.#t.length;return u`
      <div class="dep-direction" role="group" aria-label="選択したモジュールから追う方向">
        ${[["outgoing","\u4F9D\u5B58\u5148"],["incoming","\u4F9D\u5B58\u5143"],["both","\u4E21\u65B9"]].map(([t,n])=>u`
            <button
              type="button"
              data-direction=${t}
              aria-pressed=${this.#e===t?"true":"false"}
              @click=${()=>this.#r(t)}
            >
              ${n}
            </button>
          `)}
      </div>
      <button
        type="button"
        class="dpk-btn dpk-btn--ghost dep-toggle"
        data-toggle="transitive"
        aria-pressed=${this.#n?"true":"false"}
        @click=${()=>{this.#n=!this.#n,this.requestUpdate()}}
      >
        間接も含む
      </button>
      <button
        type="button"
        class="dpk-btn dpk-btn--ghost dep-toggle"
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
    </div>`}#r(e){this.#e=e,this.requestUpdate()}#o(e,t){const n=this.selection;return n!==null&&n.kind==="edge"&&n.id===e.id?"dep-selected":Ae(e,t)?"dep-cycle":this.#s.edges.has(e.id)?"dep-outgoing":this.#a.edges.has(e.id)?"dep-incoming":"dep-neutral"}renderCanvas(){const e=this.visible,t=pe(this.#t),n=r=>e.nodes.find(o=>o.id===r)?.name??r,s=e.edges.map(r=>{const o=this.edgeState(r.id),d=this.routeOf(r.id),l=Z(d),g=()=>this.select({kind:"edge",id:r.id});return O`
        <g class=${this.elementClass(o,"d-edge","dep-edge")} data-dependency=${r.id}>
          <title>${[r.contract,r.description].filter(m=>m!==null).join(`
`)||r.id}</title>
          <path class="d-edge-path" d=${l} marker-end=${`url(#${this.#o(r,t)})`}></path>
          <path
            class="d-edge-hit"
            d=${l}
            role="button"
            tabindex="0"
            aria-label=${`${n(r.from)} \u304C ${n(r.to)} \u306B\u4F9D\u5B58`}
            @click=${g}
            @keydown=${m=>{m.key!=="Enter"&&m.key!==" "||(m.preventDefault(),g())}}
          ></path>
          ${this.renderEdgeCommentTrigger({kind:"edge",id:r.id},`${n(r.from)} \u2192 ${n(r.to)}`,d)}
        </g>
      `}),i=e.nodes.map(r=>{const o=this.placedNode(r.id);if(!o)return y;const d=this.nodeState(r.id),l=t.has(r.id),g=this.#s.nodes.has(r.id),m=this.#a.nodes.has(r.id);return u`
        <button
          type="button"
          class=${this.elementClass(d,"d-node","dep-module",l&&"is-cyclic",g&&"is-dependency",m&&"is-dependent")}
          data-module=${r.id}
          data-grill-questions=${this.questionsOf(r)}
          style="left:${o.x}px; top:${o.y}px; width:${r.width}px; height:${r.height}px"
          aria-pressed=${d.selected?"true":"false"}
          aria-label=${`${r.name}${l?"\u30FB\u5FAA\u74B0\u4F9D\u5B58\u3042\u308A":""}`}
          title=${[r.path??r.name,r.description].filter(p=>p!==null).join(`
`)}
          @click=${()=>this.select({kind:"node",id:r.id})}
        >
          <span class="dep-head">
            <span class="dep-layer">${r.layer??""}</span>
            ${l?u`<span class="dep-cycle-badge">循環</span>`:y}
          </span>
          <span class="dep-name">${r.name}</span>
          <span class="dep-path">${r.path??""}</span>
        </button>
        ${this.renderCommentTrigger({kind:"node",id:r.id},r.name,{x:o.x+r.width-20,y:o.y-14})}
      `});return u`${this.renderEdges(s,ni)}${i}`}}const Ze=()=>{customElements.get("dpk-component-dependency-graph")||customElements.define("dpk-component-dependency-graph",Je)},Qe=276,fe=74,ii=28,si=44,ai=z({id:w(c(),$(1)),type:w(c(),$(1)),key:f(F(["PK","FK","UQ"])),ref:f(c()),nullable:f(oe(),!1),questions:f(c())}),ri=z({id:w(c(),$(1)),name:w(c(),$(1)),tags:f(A(c()),[]),fields:A(ai),questions:f(c())}),Ge=z({tables:A(ri)}),oi=z({before:f(Ge),after:Ge}),di=()=>({nodes:[],edges:[]}),et=a=>({id:a.id,type:a.type,key:a.key??null,ref:a.ref??null,nullable:a.nullable,questions:a.questions??null}),tt=(a,e)=>a.type===e.type&&a.key===e.key&&a.ref===e.ref&&a.nullable===e.nullable,ie=a=>a.status==="changed"?si:ii,nt=a=>fe+a.reduce((e,t)=>e+ie(t),0),it=(a,e)=>{let t=fe;for(const n of a){if(n.id===e)return t+ie(n)/2;t+=ie(n)}return fe/2},st=a=>a.flatMap(e=>e.fields.flatMap(t=>{if(t.ref===void 0)return[];const[n,s]=t.ref.split(".");if(n===void 0||s===void 0)throw new Error(`invalid ref "${t.ref}" on ${e.id}.${t.id}; expected table.field`);return[{id:`${n}:${s}>${e.id}:${t.id}`,from:n,to:e.id,sourceField:s,targetField:t.id}]})),li=(a,e)=>[...new Set([...a,...e].map(t=>t.id))].flatMap(t=>{const n=a.find(d=>d.id===t),s=e.find(d=>d.id===t),i=s??n;if(!i)return[];const r=et(i);if(!n)return[{...r,status:"added",before:null}];if(!s)return[{...r,status:"removed",before:null}];const o=et(n);return[{...r,status:tt(o,r)?"same":"changed",before:tt(o,r)?null:o}]}),pi=a=>{const e=Y(oi,a),t=e.before?.tables??e.after.tables,n=e.after.tables,s=[...new Set([...t,...n].map(p=>p.id))],i=new Map;for(const p of[...t,...n])i.set(p.id,p.tags);const r=s.flatMap(p=>{const v=t.find(C=>C.id===p),q=n.find(C=>C.id===p),b=q??v;if(!b)return[];const M=li(v?.fields??[],q?.fields??[]),S=v?q?M.some(C=>C.status!=="same")?"changed":"same":"removed":"added";return[{id:p,name:b.name,status:S,fields:M,tags:i.get(p)??[],width:Qe,height:nt(M),...b.questions===void 0?{}:{questions:b.questions}}]}),o=new Map(r.map(p=>[p.id,p])),d=st(t),l=st(n),g=[...new Set([...d,...l].map(p=>p.id))].flatMap(p=>{const v=d.find(j=>j.id===p),q=l.find(j=>j.id===p),b=q??v;if(!b)return[];const M=o.get(b.from),S=o.get(b.to);if(!M||!S)return[];const C=v?q?"same":"removed":"added";return[{id:p,from:b.from,to:b.to,sourceField:b.sourceField,targetField:b.targetField,status:C,tags:[],fromPort:`${p}:out`,toPort:`${p}:in`}]}),m=p=>{const v={},q={};for(const b of g)b.from===p.id&&(v[`${b.id}:out`]={x:Qe,y:it(p.fields,b.sourceField)}),b.to===p.id&&(q[`${b.id}:in`]={x:0,y:it(p.fields,b.targetField)});return{out:v,in:q}};return{nodes:r.map(p=>{const v=m(p);return{...p,ports:{...v.out,...v.in}}}),edges:g}},ci=N`
  .er-search {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .er-search .dpk-input {
    width: 150px;
    min-height: 26px;
    font-size: 11px;
  }

  .er-table {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-xs);
    overflow: hidden;
    cursor: default;
  }

  .er-table.is-added {
    border-color: color-mix(in srgb, var(--dpk-green) 55%, transparent);
  }

  .er-table.is-removed {
    border-color: color-mix(in srgb, var(--dpk-accent) 55%, transparent);
  }

  .er-table.is-changed {
    border-color: color-mix(in srgb, var(--dpk-amber) 55%, transparent);
  }

  .er-table.is-selected {
    border-color: var(--dpk-blue);
    box-shadow: 0 0 0 3px var(--dpk-blue-soft);
  }

  .er-table.is-related {
    border-color: color-mix(in srgb, var(--dpk-green) 50%, transparent);
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
    border-bottom: 1px solid var(--dpk-rule);
    border-radius: 0;
    background: var(--dpk-paper);
    text-align: left;
    cursor: pointer;
  }

  .er-head:hover {
    background: var(--dpk-paper-sunken);
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
    font-family: var(--dpk-mono);
    font-size: 10px;
  }

  .er-table.is-added .er-mark {
    background: var(--dpk-green-soft);
    color: var(--dpk-green);
  }

  .er-table.is-removed .er-mark {
    background: var(--dpk-accent-soft);
    color: var(--dpk-accent);
  }

  .er-table.is-changed .er-mark {
    background: var(--dpk-amber-soft);
    color: var(--dpk-amber);
  }

  .er-name {
    grid-area: name;
    font-family: var(--dpk-mono);
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
    color: var(--dpk-ink-faint);
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
    border-bottom: 1px solid var(--dpk-rule);
    font-size: 10.5px;
  }

  .er-field:last-child {
    border-bottom: 0;
  }

  .er-field.is-added {
    background: color-mix(in srgb, var(--dpk-green) 7%, transparent);
  }

  .er-field.is-removed {
    background: color-mix(in srgb, var(--dpk-accent) 7%, transparent);
    text-decoration: line-through;
    color: var(--dpk-ink-faint);
  }

  .er-field.is-changed {
    background: color-mix(in srgb, var(--dpk-amber) 7%, transparent);
  }

  .er-field.is-match {
    box-shadow: inset 2px 0 0 var(--dpk-blue);
  }

  .er-field-mark {
    font-family: var(--dpk-mono);
    font-size: 10px;
    text-align: center;
  }

  .er-field.is-added .er-field-mark {
    color: var(--dpk-green);
  }

  .er-field.is-removed .er-field-mark {
    color: var(--dpk-accent);
  }

  .er-field.is-changed .er-field-mark {
    color: var(--dpk-amber);
  }

  .er-key {
    display: grid;
    place-items: center;
    border-radius: 3px;
    background: var(--dpk-paper-inset);
    font-family: var(--dpk-mono);
    font-size: 8.5px;
    color: var(--dpk-ink-faint);
  }

  .er-key[data-empty='true'] {
    background: transparent;
  }

  .er-field-name {
    font-family: var(--dpk-mono);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .er-field-type {
    font-size: 9.5px;
    color: var(--dpk-ink-faint);
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
    color: var(--dpk-accent);
    text-decoration: line-through;
  }

  .er-change ins {
    color: var(--dpk-green);
    text-decoration: none;
  }

  .er-edge .d-edge-path {
    stroke-width: 1.5;
  }

  .er-edge.is-added .d-edge-path {
    stroke: var(--dpk-green);
  }

  .er-edge.is-removed .d-edge-path {
    stroke: var(--dpk-accent);
    stroke-dasharray: 5 4;
  }

  .er-edge.is-selected .d-edge-path {
    stroke: var(--dpk-blue);
    stroke-width: 2.6;
  }

  .er-cardinality {
    font-family: var(--dpk-mono);
    font-size: 10px;
    fill: var(--dpk-ink-faint);
    paint-order: stroke;
    stroke: var(--dpk-paper-raised);
    stroke-width: 4px;
  }

  .er-cardinality.is-added {
    fill: var(--dpk-green);
  }

  .er-cardinality.is-removed {
    fill: var(--dpk-accent);
  }

  .diagram-legend .er-swatch-added {
    border-color: var(--dpk-green);
  }

  .diagram-legend .er-swatch-removed {
    border-color: var(--dpk-accent);
  }

  .diagram-legend .er-swatch-changed {
    border-color: var(--dpk-amber);
  }

  #er-neutral .diagram-arrow {
    fill: var(--dpk-rule-strong);
    stroke: var(--dpk-rule-strong);
  }

  #er-added .diagram-arrow {
    fill: var(--dpk-green);
    stroke: var(--dpk-green);
  }

  #er-removed .diagram-arrow {
    fill: var(--dpk-accent);
    stroke: var(--dpk-accent);
  }

  #er-selected .diagram-arrow {
    fill: var(--dpk-blue);
    stroke: var(--dpk-blue);
  }
`,hi=[{id:"er-neutral"},{id:"er-added"},{id:"er-removed"},{id:"er-selected"}],at={same:"\u5909\u66F4\u306A\u3057",added:"\u8FFD\u52A0",removed:"\u524A\u9664",changed:"\u5909\u66F4"},rt={same:"",added:"+",removed:"\u2212",changed:"~"};class ot extends Q{static{this.styles=[B,ci]}#e="";parseData(e){return pi(e)}emptyData(){return di()}defaultHeading(){return"ERD"}statsLabels(){return{node:"\u30C6\u30FC\u30D6\u30EB",edge:"\u95A2\u9023"}}emptyMessage(){return"\u8A72\u5F53\u3059\u308B\u30C6\u30FC\u30D6\u30EB\u306F\u3042\u308A\u307E\u305B\u3093\u3002"}layoutOptions(){return{nodeSpacing:38,layerSpacing:96,padding:32}}matchesFilter(e){return this.#e===""?!0:[e.id,e.name,...e.fields.map(t=>t.id)].some(t=>t.toLowerCase().includes(this.#e))}relations(e,t){if(e===null||e.kind!=="node")return H;const n=U(t.edges,e.id,"outgoing",!1),s=U(t.edges,e.id,"incoming",!1);return{nodes:new Map([...n.nodes,...s.nodes]),edges:new Set([...n.edges,...s.edges])}}renderToolbarActions(){return u`
      <label class="er-search">
        <span class="dpk-label">検索</span>
        <input
          class="dpk-input"
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
    </div>`}#n(e){const t=this.selection;return t!==null&&t.kind==="edge"?"er-selected":e==="added"?"er-added":e==="removed"?"er-removed":"er-neutral"}renderCanvas(){const e=this.visible,t=e.edges.map(n=>{const s=this.edgeState(n.id),i=this.routeOf(n.id),r=Z(i),o=()=>this.select({kind:"edge",id:n.id});return O`
        <g class=${this.elementClass(s,"d-edge","er-edge",`is-${n.status}`)} data-relation=${n.id}>
          <title>${`${n.from}.${n.sourceField} \u2192 ${n.to}.${n.targetField}`}</title>
          <path class="d-edge-path" d=${r} marker-end=${`url(#${this.#n(n.status)})`}></path>
          <path
            class="d-edge-hit"
            d=${r}
            role="button"
            tabindex="0"
            aria-label=${`${n.from} \u3068 ${n.to} \u306E\u95A2\u9023`}
            @click=${o}
            @keydown=${d=>{d.key!=="Enter"&&d.key!==" "||(d.preventDefault(),o())}}
          ></path>
          ${i.length>0?this.#i(i,n.status):y}
          ${this.renderEdgeCommentTrigger({kind:"edge",id:n.id},`${n.from}.${n.sourceField} \u2192 ${n.to}.${n.targetField}`,i)}
        </g>
      `});return u`${this.renderEdges(t,hi)}${e.nodes.map(n=>this.#t(n))}`}#i(e,t){const n=e[0],s=e.at(-1);return!n||!s?u``:O`
      <text class="er-cardinality is-${t}" x=${n.x+9} y=${n.y-5}>1</text>
      <text class="er-cardinality is-${t}" x=${s.x-13} y=${s.y-5}>N</text>
    `}#t(e){const t=this.placedNode(e.id);if(!t)return y;const n=this.nodeState(e.id);return u`
      <div
        class=${this.elementClass(n,"d-node","er-table",`is-${e.status}`)}
        data-er-table=${e.id}
        data-grill-questions=${this.questionsOf(e)}
        style="left:${t.x}px; top:${t.y}px; width:${e.width}px; height:${nt(e.fields)}px"
      >
        <button
          type="button"
          class="er-head"
          data-table=${e.id}
          aria-pressed=${n.selected?"true":"false"}
          title=${`${e.id} / ${e.name}`}
          @click=${()=>this.select({kind:"node",id:e.id})}
        >
          ${e.status==="same"?y:u`<span class="er-mark" aria-hidden="true">${rt[e.status]}</span>`}
          <span class="er-name">${e.id}</span>
          <span class="er-label">${e.name}</span>
          <span class="dpk-label er-status">${at[e.status]}</span>
        </button>
        ${this.renderCommentTrigger({kind:"node",id:e.id},`${e.id} \xB7 ${e.name}`)}
        <div class="er-fields">${e.fields.map(s=>this.#s(s))}</div>
      </div>
    `}#s(e){const t=s=>[s.type,s.key??"\u2014",s.ref??null,s.nullable?"null\u53EF":null].filter(Boolean).join(" \xB7 "),n=this.#e!==""&&e.id.toLowerCase().includes(this.#e);return u`
      <div
        class="er-field is-${e.status} ${n?"is-match":""}"
        style="height:${ie(e)}px"
        data-grill-questions=${this.questionsOf(e)}
        title=${[at[e.status],e.id,t(e)].filter(Boolean).join(" / ")}
      >
        <span class="er-field-mark" aria-hidden="true">${rt[e.status]}</span>
        <span class="er-key" data-empty=${e.key===null?"true":"false"}>${e.key??"\xB7"}</span>
        <span class="er-field-name">${e.id}</span>
        ${e.status==="changed"&&e.before!==null?u`<span class="er-change">
                <del>− ${t(e.before)}</del>
                <ins>+ ${t(e)}</ins>
              </span>`:u`<span class="er-field-type">${t(e)}</span>`}
      </div>
    `}}const dt=()=>{customElements.get("dpk-component-er-diagram")||customElements.define("dpk-component-er-diagram",ot)},lt={width:220,height:112},se=26,ui=z({src:w(c(),$(1)),alt:w(c(),$(1)),license:f(c())}),gi=z({id:w(c(),$(1)),name:w(c(),$(1)),description:f(c()),boundary:f(c()),symbol:f(c()),tags:f(A(c()),[]),artwork:f(ui),position:z({x:J(),y:J()}),questions:f(c())}),mi=z({id:w(c(),$(1)),label:w(c(),$(1)),kind:f(F(["internal","external"]),"internal")}),fi=z({id:w(c(),$(1)),from:w(c(),$(1)),to:w(c(),$(1)),label:f(c())}),bi=z({boundaries:f(A(mi),[]),services:A(gi),links:f(A(fi),[])}),ki=()=>({nodes:[],edges:[],boundaries:[]}),vi=a=>{const e=Y(bi,a),t=new Set;for(const o of e.boundaries){if(t.has(o.id))throw new Error(`duplicate boundary id: ${o.id}`);t.add(o.id)}const n=new Set,s=e.services.map(o=>{if(n.has(o.id))throw new Error(`duplicate service id: ${o.id}`);if(n.add(o.id),o.boundary!==void 0&&!t.has(o.boundary))throw new Error(`unknown boundary: ${o.boundary}`);return{id:o.id,name:o.name,description:o.description??null,boundary:o.boundary??null,symbol:o.symbol??null,artwork:o.artwork?{src:o.artwork.src,alt:o.artwork.alt,license:o.artwork.license??null}:null,tags:o.tags,width:lt.width,height:lt.height,position:o.position,...o.questions===void 0?{}:{questions:o.questions}}}),i=new Set,r=e.links.map(o=>{if(i.has(o.id))throw new Error(`duplicate link id: ${o.id}`);if(i.add(o.id),!n.has(o.from))throw new Error(`unknown link source: ${o.from}`);if(!n.has(o.to))throw new Error(`unknown link target: ${o.to}`);return{id:o.id,from:o.from,to:o.to,label:o.label??null,tags:[]}});return{nodes:s,edges:r,boundaries:e.boundaries.map(o=>({id:o.id,label:o.label,kind:o.kind}))}},be={left:se,top:se*1.6,right:se,bottom:se},xi={left:0,top:0,right:0,bottom:0},yi=12,pt=a=>({left:Math.min(...a.map(e=>e.position?.x??0)),top:Math.min(...a.map(e=>e.position?.y??0)),right:Math.max(...a.map(e=>(e.position?.x??0)+e.width)),bottom:Math.max(...a.map(e=>(e.position?.y??0)+e.height))}),wi=(a,e,t,n)=>{const s=a.left-e.left<t.right+n.right&&t.left-n.left<a.right+e.right,i=a.top-e.top<t.bottom+n.bottom&&t.top-n.top<a.bottom+e.bottom;if(!s||!i)return e;const r=Math.max(t.left-a.right,a.left-t.right),o=Math.max(t.top-a.bottom,a.top-t.bottom);if(r<0&&o<0)return e;const d=(l,g,m)=>l===0?0:Math.max(0,m-yi)*l/(l+g);return r>=o?t.left>=a.right?{...e,right:Math.min(e.right,d(e.right,n.left,r))}:{...e,left:Math.min(e.left,d(e.left,n.right,r))}:t.top>=a.bottom?{...e,bottom:Math.min(e.bottom,d(e.bottom,n.top,o))}:{...e,top:Math.min(e.top,d(e.top,n.bottom,o))}},$i=(a,e)=>{const t=e.flatMap(s=>{const i=a.filter(r=>r.boundary===s.id);return i.length===0?[]:[{boundary:s,bounds:pt(i)}]}),n=[...t.map(s=>({id:s.boundary.id,bounds:s.bounds,padding:be})),...a.filter(s=>s.boundary===null||!t.some(i=>i.boundary.id===s.boundary)).map(s=>({id:null,bounds:pt([s]),padding:xi}))];return t.map(({boundary:s,bounds:i})=>{const r=n.filter(l=>l.id!==s.id).map(l=>wi(i,be,l.bounds,l.padding)).reduce((l,g)=>({left:Math.min(l.left,g.left),top:Math.min(l.top,g.top),right:Math.min(l.right,g.right),bottom:Math.min(l.bottom,g.bottom)}),be),o=i.left-r.left,d=i.top-r.top;return{boundary:s,x:o,y:d,width:i.right+r.right-o,height:i.bottom+r.bottom-d}})},qi=(a,e)=>{const t=i=>i.y+i.height/2,n=i=>i.x+i.width/2,s=(i,r,o)=>{if(o?i.y===r.y:i.x===r.x)return[i,r];if(o){const l=(i.x+r.x)/2;return[i,{x:l,y:i.y},{x:l,y:r.y},r]}const d=(i.y+r.y)/2;return[i,{x:i.x,y:d},{x:r.x,y:d},r]};return e.x>=a.x+a.width?s({x:a.x+a.width,y:t(a)},{x:e.x,y:t(e)},!0):a.x>=e.x+e.width?s({x:a.x,y:t(a)},{x:e.x+e.width,y:t(e)},!0):e.y>=a.y+a.height?s({x:n(a),y:a.y+a.height},{x:n(e),y:e.y},!1):a.y>=e.y+e.height?s({x:n(a),y:a.y},{x:n(e),y:e.y+e.height},!1):null},Mi=(a,e)=>{const t=new Map(a.nodes.map(s=>[s.id,s])),n=a.routes.map(s=>{const i=e.find(l=>l.id===s.id),r=i?t.get(i.from):void 0,o=i?t.get(i.to):void 0,d=r&&o&&r!==o?qi(r,o):null;return d===null?s:{id:s.id,points:d}});return{...a,routes:n}},Si=N`
  .arch-toggle {
    min-height: 26px;
    padding: 0 9px;
    font-size: 10.5px;
  }

  .arch-toggle[aria-pressed='true'] {
    border-color: color-mix(in srgb, var(--dpk-blue) 40%, transparent);
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue);
  }

  .arch-boundary {
    position: absolute;
    border: 1px dashed var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-lg);
    background: color-mix(in srgb, var(--dpk-blue) 3%, transparent);
    pointer-events: none;
  }

  .arch-boundary.is-external {
    border-color: color-mix(in srgb, var(--dpk-amber) 45%, transparent);
    background: color-mix(in srgb, var(--dpk-amber) 4%, transparent);
  }

  .arch-boundary span {
    position: absolute;
    top: 9px;
    left: 14px;
    font-family: var(--dpk-mono);
    font-size: 9px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--dpk-ink-faint);
  }

  .arch-service {
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr);
    gap: 10px;
    align-items: start;
    padding: 14px 13px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-xs);
    text-align: left;
    overflow: hidden;
  }

  .arch-service:hover {
    border-color: var(--dpk-blue);
  }

  .arch-service.is-selected {
    border-color: var(--dpk-blue);
    box-shadow: 0 0 0 3px var(--dpk-blue-soft);
  }

  .arch-service.is-related {
    border-color: color-mix(in srgb, var(--dpk-green) 55%, transparent);
    background: var(--dpk-green-soft);
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
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-paper-inset);
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
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
    color: var(--dpk-ink-faint);
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .arch-link .d-edge-path {
    stroke: var(--dpk-rule-strong);
    stroke-width: 1.5;
  }

  .arch-link.is-related .d-edge-path {
    stroke: var(--dpk-green);
    stroke-width: 2;
  }

  .arch-link.is-selected .d-edge-path {
    stroke: var(--dpk-blue);
    stroke-width: 2.4;
  }

  .arch-link-label {
    font-size: 9.5px;
    fill: var(--dpk-ink-faint);
    paint-order: stroke;
    stroke: var(--dpk-paper-raised);
    stroke-width: 5px;
    stroke-linejoin: round;
  }

  #arch-neutral .diagram-arrow {
    fill: var(--dpk-rule-strong);
    stroke: var(--dpk-rule-strong);
  }

  #arch-selected .diagram-arrow {
    fill: var(--dpk-blue);
    stroke: var(--dpk-blue);
  }
`,Ei=[{id:"arch-neutral"},{id:"arch-selected"}];class ct extends Q{static{this.styles=[B,Si]}#e=!0;parseData(e){return vi(e)}emptyData(){return ki()}defaultHeading(){return"Architecture"}statsLabels(){return{node:"\u30B5\u30FC\u30D3\u30B9",edge:"\u63A5\u7D9A"}}emptyMessage(){return"\u8A72\u5F53\u3059\u308B\u30B5\u30FC\u30D3\u30B9\u306F\u3042\u308A\u307E\u305B\u3093\u3002"}get layoutMode(){return"fixed"}layoutOptions(){return{padding:40}}computePlacement(e){return Mi(super.computePlacement(e),e.edges)}isEmpty(){return this.visible.nodes.length===0}contentSize(){const e=super.contentSize();if(e===null)return null;const t=this.#n();return t.length===0?e:{width:Math.max(e.width,...t.map(n=>n.x+n.width)),height:Math.max(e.height,...t.map(n=>n.y+n.height))}}relations(e,t){if(e===null||e.kind!=="node")return H;const n=U(t.edges,e.id,"outgoing",!1),s=U(t.edges,e.id,"incoming",!1);return{nodes:new Map([...n.nodes,...s.nodes]),edges:new Set([...n.edges,...s.edges])}}renderToolbarActions(){return u`
      <button
        type="button"
        class="dpk-btn dpk-btn--ghost arch-toggle"
        data-toggle="boundaries"
        aria-pressed=${this.#e?"true":"false"}
        @click=${()=>{this.#e=!this.#e,this.requestUpdate()}}
      >
        境界
      </button>
    `}#n(){const e=this.visible.nodes.flatMap(t=>{const n=this.placedNode(t.id);return n?[{...t,position:{x:n.x,y:n.y}}]:[]});return $i(e,this.items().boundaries)}renderCanvas(){const e=this.visible,t=s=>e.nodes.find(i=>i.id===s)?.name??s,n=e.edges.map(s=>{const i=this.edgeState(s.id),r=this.routeOf(s.id),o=Z(r),d=()=>this.select({kind:"edge",id:s.id});return O`
        <g class=${this.elementClass(i,"d-edge","arch-link")} data-link=${s.id}>
          <title>${s.label??s.id}</title>
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
            aria-label=${`${t(s.from)} \u304B\u3089 ${t(s.to)} \u3078\u306E\u63A5\u7D9A`}
            @click=${d}
            @keydown=${l=>{l.key!=="Enter"&&l.key!==" "||(l.preventDefault(),d())}}
          ></path>
          ${s.label===null||r.length===0?y:this.#i(s.label,r)}
          ${this.renderEdgeCommentTrigger({kind:"edge",id:s.id},`${t(s.from)} \u2192 ${t(s.to)}${s.label===null?"":` \xB7 ${s.label}`}`,r)}
        </g>
      `});return u`
      ${this.#e?this.#n().map(s=>u`<div
                class=${`arch-boundary ${s.boundary.kind==="external"?"is-external":""}`}
                data-boundary=${s.boundary.id}
                style="left:${s.x}px; top:${s.y}px; width:${s.width}px; height:${s.height}px"
              >
                <span>${s.boundary.label}</span>
              </div>`):y}
      ${this.renderEdges(n,Ei)} ${e.nodes.map(s=>this.#t(s))}
    `}#i(e,t){const n=t[Math.floor(t.length/2)]??t[0];return n?O`<text class="arch-link-label" x=${n.x} y=${n.y-6}>${e}</text>`:u``}#t(e){const t=this.placedNode(e.id);if(!t)return y;const n=this.nodeState(e.id);return u`
      <button
        type="button"
        class=${this.elementClass(n,"d-node","arch-service")}
        data-service=${e.id}
        data-grill-questions=${this.questionsOf(e)}
        style="left:${t.x}px; top:${t.y}px; width:${e.width}px; height:${e.height}px"
        aria-pressed=${n.selected?"true":"false"}
        title=${e.description??e.name}
        @click=${()=>this.select({kind:"node",id:e.id})}
      >
        ${e.artwork===null?u`<span class="arch-symbol" aria-hidden="true">${e.symbol??e.name.slice(0,2)}</span>`:u`<img
                class="arch-artwork"
                src=${e.artwork.src}
                alt=${e.artwork.alt}
                title=${e.artwork.license===null?y:`\u30A2\u30A4\u30B3\u30F3\u51FA\u5178: ${e.artwork.license}`}
              />`}
        <span class="arch-body">
          <span class="arch-name">${e.name}</span>
          ${e.description===null?y:u`<span class="arch-description">${e.description}</span>`}
        </span>
      </button>
      ${this.renderCommentTrigger({kind:"node",id:e.id},e.name,{x:t.x+e.width-20,y:t.y-14})}
    `}}const ht=()=>{customElements.get("dpk-component-architecture-map")||customElements.define("dpk-component-architecture-map",ct)},ut=[72,52,40],gt=[0,22,10,8],zi=a=>ut[Math.min(a,ut.length-1)]??40,mt=a=>gt[Math.min(a,gt.length-1)]??8,Ci=(a,e={})=>{const t=e.padding??40,n=a.nodes.find(k=>k.parent===null);if(n===void 0)return{width:0,height:0,nodes:[],routes:[]};const s=new Map(a.nodes.map(k=>[k.id,k])),i=k=>k.children.flatMap(T=>{const L=s.get(T);return L===void 0?[]:[L]}),r=new Map,o=k=>k.reduce((T,L,P)=>T+d(L)+(P===0?0:mt(L.depth)),0),d=k=>{const T=r.get(k.id);if(T!==void 0)return T;const L=Math.max(k.height,o(i(k)));return r.set(k.id,L),L},l=[],g=(k,T,L)=>{if(T.length===0)return;const P=zi(k.node.depth);let h=k.y+k.node.height/2-o(T)/2;for(const x of T){const E=d(x),D={x:L==="right"?k.x+k.node.width+P:k.x-P-x.width,y:h+E/2-x.height/2,node:x};l.push(D),g(D,i(x),L),h+=E+mt(x.depth)}},m={x:-n.width/2,y:-n.height/2,node:n};l.push(m);const p=i(n);g(m,p.filter(k=>k.side!=="left"),"right"),g(m,p.filter(k=>k.side==="left"),"left");const v=Math.min(...l.map(k=>k.x)),q=Math.min(...l.map(k=>k.y)),b=Math.max(...l.map(k=>k.x+k.node.width)),M=Math.max(...l.map(k=>k.y+k.node.height)),S=t-v,C=t-q,j=new Map,V=l.map(k=>{const T=j.get(k.node.depth)??0;return j.set(k.node.depth,T+1),{id:k.node.id,x:k.x+S,y:k.y+C,width:k.node.width,height:k.node.height,layer:k.node.depth,order:T}}),I=new Map(V.map(k=>[k.id,k])),ee=a.edges.flatMap(k=>{const T=I.get(k.from),L=I.get(k.to),P=s.get(k.to);if(T===void 0||L===void 0||P===void 0)return[];const h=P.side==="left",x={x:h?T.x:T.x+T.width,y:T.y+T.height/2},E={x:h?L.x+L.width:L.x,y:L.y+L.height/2};return[{id:k.id,points:[x,E]}]});return{width:b-v+t*2,height:M-q+t*2,nodes:V,routes:ee}},Ti=a=>{const e=a[0],t=a.at(-1);if(e===void 0||t===void 0)return"";const n=(t.x-e.x)/2;return`M${e.x} ${e.y} C${e.x+n} ${e.y} ${t.x-n} ${t.y} ${t.x} ${t.y}`},ft=Nt(()=>z({id:w(c(),$(1)),label:w(c(),$(1)),description:f(c()),tags:f(A(c())),questions:f(c()),collapsed:f(oe()),side:f(F(["left","right"])),children:f(A(ft))})),Di=z({root:ft}),bt=()=>({root:null,nodes:[],edges:[]}),kt=[{fontSize:16,padding:22,height:48,min:120,max:280},{fontSize:13.5,padding:15,height:34,min:80,max:240},{fontSize:12.5,padding:12,height:28,min:56,max:220}],Ai=a=>kt[Math.min(a,kt.length-1)]??{fontSize:12.5,padding:12,height:28,min:56,max:220},Li=(a,e)=>{let t=0;for(const n of a)t+=(n.codePointAt(0)??0)>=11904?e:e*.62;return t},ji=(a,e)=>{const t=Ai(e),n=Math.ceil(Li(a,t.fontSize)+t.padding*2+4);return{width:Math.min(t.max,Math.max(t.min,n)),height:t.height}},ke=a=>a.children===void 0||a.children.length===0?1:a.children.reduce((e,t)=>e+ke(t),0),vt=a=>{const e={left:0,right:0};for(const t of a)t.side!==void 0&&(e[t.side]+=ke(t));return a.map(t=>{if(t.side!==void 0)return t.side;const n=e.right<=e.left?"right":"left";return e[n]+=ke(t),n})},xt=a=>yt(Y(Di,a).root),yt=(a,e=new Set)=>{const t=[],n=[],s=new Set,i=(r,o,d,l,g)=>{if(s.has(r.id))throw new Error(`duplicate topic id: ${r.id}`);if(s.add(r.id),r.side!==void 0&&d!==1)throw new Error(`side is only allowed on a main topic (a child of the root): ${r.id}`);const m=r.children??[];t.push({id:r.id,label:r.label,description:r.description??null,parent:o,depth:d,branch:l,side:g,children:m.map(v=>v.id),collapsed:r.collapsed??!1,added:e.has(r.id),tags:r.tags??[],...ji(r.label,d),...r.questions===void 0?{}:{questions:r.questions}}),o!==null&&n.push({id:r.id,from:o,to:r.id,tags:[]});const p=d===0?vt(m):[];m.forEach((v,q)=>i(v,r.id,d+1,d===0?q:l,d===0?p[q]??"right":g))};return i(a,null,0,-1,null),{root:a,nodes:t,edges:n}},wt="ADD_TOPIC",Ri=le({id:w(c(),$(1)),label:w(c(),we(),$(1))}),Oi=a=>{const e=Le(a);return e?.length===3&&e[1]==="node"?e[2]??null:null},$t=(a,e,t)=>a.id===e?{...a,children:[...a.children??[],t]}:a.children===void 0?a:{...a,children:a.children.map(n=>$t(n,e,t))},Ui=a=>{if(a.children===void 0)return a;const e=vt(a.children);return{...a,children:a.children.map((t,n)=>({...t,side:e[n]??"right"}))}},Ii=(a,e)=>{const t="\u30C8\u30D4\u30C3\u30AF\u3092\u8FFD\u52A0",n=new Map(a.nodes.map(o=>[o.id,o.label])),s=new Set,i=[];let r=a.root===null?null:Ui(a.root);for(const o of e){if(o.type!==wt){i.push({id:o.id,title:o.type,stale:"unsupported-action-type"});continue}const d=Oi(o.target.id),l=d===null?void 0:n.get(d),g=de(Ri,o.payload);if(r===null||d===null||l===void 0){i.push({id:o.id,title:t,stale:"target-missing"});continue}if(!g.success||n.has(g.output.id)){i.push({id:o.id,title:t,stale:"constraint-violated"});continue}const{id:m,label:p}=g.output;r=$t(r,d,{id:m,label:p}),n.set(m,p),s.add(m),i.push({id:o.id,title:t,summary:`${l} \u203A ${p}`,tone:"create"})}return{data:r===null||s.size===0?a:yt(r,s),results:i}},ve=(a,e)=>{const t=new Map(a.nodes.map(i=>[i.id,i])),n=[];let s=t.get(e)?.parent??null;for(;s!==null&&!n.includes(s);)n.push(s),s=t.get(s)?.parent??null;return n},Pi=(a,e)=>{const t=new Map(a.nodes.map(i=>[i.id,i]));let n=0;const s=[...t.get(e)?.children??[]];for(let i=s.pop();i!==void 0;i=s.pop())n+=1,s.push(...t.get(i)?.children??[]);return n},Fi=(a,e,t)=>{let n=null;if(e!==null){const r=a.nodes.filter(e);if(r.length===0)return bt();const o=new Map(a.nodes.map(l=>[l.id,l])),d=new Set;for(const l of r){d.add(l.id);for(const m of ve(a,l.id))d.add(m);const g=[...l.children];for(let m=g.pop();m!==void 0;m=g.pop())d.add(m),g.push(...o.get(m)?.children??[])}n=d}const s=a.nodes.filter(r=>(n===null||n.has(r.id))&&!ve(a,r.id).some(o=>t.has(o))),i=new Set(s.map(r=>r.id));return{...a,nodes:s,edges:a.edges.filter(r=>i.has(r.from)&&i.has(r.to))}},Hi=N`
  .branch-root {
    --mind-color: var(--dpk-ink);
    --mind-soft: var(--dpk-paper-sunken);
  }
  .branch-0 {
    --mind-color: var(--dpk-blue);
    --mind-soft: var(--dpk-blue-soft);
  }
  .branch-1 {
    --mind-color: var(--dpk-green);
    --mind-soft: var(--dpk-green-soft);
  }
  .branch-2 {
    --mind-color: var(--dpk-violet);
    --mind-soft: var(--dpk-violet-soft);
  }
  .branch-3 {
    --mind-color: var(--dpk-amber);
    --mind-soft: var(--dpk-amber-soft);
  }
  .branch-4 {
    --mind-color: var(--dpk-accent);
    --mind-soft: var(--dpk-accent-soft);
  }

  .mind-topic {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 12px;
    border: 1px solid color-mix(in srgb, var(--mind-color) 45%, transparent);
    border-radius: 999px;
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    font-family: var(--dpk-body);
    font-size: 12.5px;
    line-height: 1.3;
    box-shadow: var(--dpk-shadow-xs);
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
    background: var(--dpk-ink);
    color: var(--dpk-paper-raised);
    font-size: 16px;
    font-weight: 680;
    letter-spacing: -0.01em;
    box-shadow: var(--dpk-shadow-sm);
  }

  .mind-topic.depth-1 {
    padding: 0 15px;
    border-width: 1.5px;
    border-color: var(--mind-color);
    background: var(--mind-soft);
    font-size: 13.5px;
    font-weight: 620;
  }

  .mind-topic.depth-1 .mind-label {
    color: color-mix(in srgb, var(--mind-color) 70%, var(--dpk-ink));
  }

  .mind-topic:hover {
    border-color: var(--mind-color);
  }

  .mind-topic.is-selected {
    border-color: var(--mind-color);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--mind-color) 22%, transparent);
  }

  .mind-topic.depth-0.is-selected {
    box-shadow: 0 0 0 3px var(--dpk-blue-soft);
  }

  .mind-topic.is-related {
    border-color: var(--mind-color);
  }

  .mind-topic:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  /* Added on this page by a draft action: not authored yet. */
  .mind-topic.is-added {
    border-style: dashed;
    border-color: var(--mind-color);
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

  .mind-actions .dpk-btn {
    padding: 3px 9px;
    font-size: 12px;
    box-shadow: var(--dpk-shadow-xs);
  }

  .mind-actions .dpk-input {
    width: 100%;
    font-size: 12.5px;
    box-shadow: var(--dpk-shadow-xs);
  }

  .mind-actions-error {
    font-size: 11.5px;
    line-height: 1.4;
    color: var(--dpk-accent);
  }

  .mind-branch {
    fill: none;
    stroke: color-mix(in srgb, var(--mind-color) 55%, transparent);
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
    stroke: var(--mind-color);
  }

  .mind-toggle {
    position: absolute;
    z-index: 1;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    transform: translate(-50%, -50%);
    border: 1.5px solid var(--mind-color);
    border-radius: 999px;
    background: var(--dpk-paper-raised);
    color: var(--mind-color);
    font-family: var(--dpk-mono);
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
    box-shadow: var(--dpk-focus);
  }

  @media (hover: none) {
    .mind-toggle {
      opacity: 1;
    }
  }
`,Vi=5;class qt extends Q{static{this.styles=[B,Hi]}#e=new Set;#n=null;#i=!1;#t=null;toggle(e,t){const n=this.items().nodes.find(i=>i.id===e);if(n===void 0||n.children.length===0)return;const s=t??!this.#e.has(e);if(s!==this.#e.has(e)){if(s){this.#e.add(e);const i=this.selection;i!==null&&ve(this.items(),i.id).includes(e)&&this.select(null)}else this.#e.delete(e);this.requestUpdate()}}get collapsed(){return[...this.#e]}parseData(e){return xt(e)}emptyData(){return bt()}reduceElementActions(e,t){return Ii(e,t)}defaultHeading(){return"Mind map"}emptyMessage(){return"\u8A72\u5F53\u3059\u308B\u30C8\u30D4\u30C3\u30AF\u306F\u3042\u308A\u307E\u305B\u3093\u3002"}statsText(){const e=this.items().nodes.length,t=this.filtered().nodes.length;return t===e?`${e} \u30C8\u30D4\u30C3\u30AF`:`${t} / ${e} \u30C8\u30D4\u30C3\u30AF`}filtered(){const e=this.tagFilter,t=e.active.length===0?null:n=>X(n.tags,e);return Fi(this.items(),t,this.#e)}layoutSignature(){return this.filtered().nodes.map(e=>`${e.id}<${e.parent??""}:${e.side??""}`).join(",")}computePlacement(e){return Ci(e)}refreshContent(){const e=this.authoredItems();e!==this.#n&&(this.#n=e,this.#e=new Set(e.nodes.filter(t=>t.collapsed).map(t=>t.id)),this.#i=!1,this.#t=null),super.refreshContent()}initialView(){if(this.#i){this.viewport?.apply();return}this.#i=!0,this.viewport?.fit()}commentItems(){return this.items().nodes.map(e=>({value:this.commentRef("node",e.id),label:e.label}))}hasSelection(e){return e.kind==="node"&&this.items().nodes.some(t=>t.id===e.id)}relations(e,t){if(e===null||e.kind!=="node")return{nodes:new Map,edges:new Set};const n=U(t.edges,e.id,"outgoing",!0),s=U(t.edges,e.id,"incoming",!0);return{nodes:new Map([...n.nodes,...s.nodes]),edges:new Set([...n.edges,...s.edges])}}renderSelection(){return y}renderCanvas(){const e=this.filtered();return u`
      ${this.renderEdges(e.edges.map(t=>this.#a(t)),[])}
      ${e.nodes.map(t=>this.#r(t))} ${this.#l()}
    `}#s(e){return e===void 0||e.branch<0?"branch-root":`branch-${e.branch%Vi}`}#a(e){const t=this.items().nodes.find(s=>s.id===e.to),n=this.edgeState(e.id);return O`
      <path
        class=${this.elementClass(n,"d-edge","mind-branch",this.#s(t),`depth-${Math.min(t?.depth??1,3)}`)}
        data-branch=${e.id}
        d=${Ti(this.routeOf(e.id))}
      ></path>
    `}#r(e){const t=this.placedNode(e.id);if(!t)return y;const n=this.nodeState(e.id),s=this.#e.has(e.id),i=`depth-${Math.min(e.depth,3)}`;return u`
      <button
        type="button"
        class=${this.elementClass(n,"d-node","mind-topic",i,this.#s(e),s&&"is-folded",e.added&&"is-added")}
        data-topic=${e.id}
        data-grill-questions=${this.questionsOf(e)}
        style="left:${t.x}px; top:${t.y}px; width:${t.width}px; height:${t.height}px"
        aria-pressed=${n.selected?"true":"false"}
        title=${e.description??e.label}
        @click=${()=>this.select({kind:"node",id:e.id})}
      >
        <span class="mind-label">${e.label}</span>
      </button>
      ${e.depth===0||e.children.length===0?y:this.#o(e,t,s,n.dimmed)}
    `}#o(e,t,n,s){const i=n?Pi(this.items(),e.id):0,r=e.side==="left"?t.x:t.x+t.width,o=n?`${e.label} \u306E\u30B5\u30D6\u30C8\u30D4\u30C3\u30AF ${i} \u4EF6\u3092\u3072\u3089\u304F`:`${e.label} \u306E\u30B5\u30D6\u30C8\u30D4\u30C3\u30AF\u3092\u305F\u305F\u3080`;return u`
      <button
        type="button"
        class=${this.elementClass({selected:!1,related:!1,dimmed:s,depth:null},"mind-toggle",this.#s(e),n&&"is-folded")}
        data-toggle=${e.id}
        style="left:${r}px; top:${t.y+t.height/2}px"
        aria-expanded=${n?"false":"true"}
        aria-label=${o}
        title=${o}
        @click=${d=>{d.stopPropagation(),this.toggle(e.id)}}
      >
        ${n?i:"\u2212"}
      </button>
    `}#l(){const e=this.selection;if(e===null||e.kind!=="node")return y;const t=this.items().nodes.find(i=>i.id===e.id),n=this.placedNode(e.id);if(t===void 0||n===void 0)return y;const s=this.#t?.parent===t.id?this.#t:null;return u`
      <div
        class="mind-actions"
        data-for=${t.id}
        style="left:${this.#p(t,n)}px; top:${n.y+n.height+8}px"
        @click=${i=>i.stopPropagation()}
      >
        ${s===null?u`
                <button type="button" class="dpk-btn" data-action="add" @click=${()=>this.#u(t.id)}>
                  ＋ サブトピック
                </button>
                <button
                  type="button"
                  class="dpk-btn"
                  data-action="comment"
                  @click=${()=>this.requestElementComment("node",t.id)}
                >
                  コメント
                </button>
              `:u`
                <input
                  class="dpk-input"
                  aria-label="${t.label} のサブトピック"
                  placeholder="サブトピック名（Enter で追加）"
                  .value=${s.label}
                  @input=${i=>{const r=i.currentTarget;r instanceof HTMLInputElement&&(this.#t={...s,label:r.value,failed:!1})}}
                  @keydown=${i=>this.#c(i,t.id)}
                />
                ${s.failed?u`<span class="mind-actions-error" role="alert"
                        >記録できませんでした（dpk-template-* 要素の中に置いてください）。</span
                      >`:y}
              `}
      </div>
    `}#p(e,t){return e.side==="left"?t.x+t.width-220:t.x}#u(e){this.#t={parent:e,label:"",failed:!1},this.requestUpdate(),this.updateComplete.then(()=>this.renderRoot.querySelector(".mind-actions input")?.focus())}#c(e,t){if(e.isComposing)return;if(e.key==="Escape"){e.preventDefault(),this.#t=null,this.requestUpdate();return}if(e.key!=="Enter")return;e.preventDefault();const n=this.#t?.label.trim()??"";if(n.length===0)return;const s=$e(`topic ${n}`,this.items().nodes.map(i=>i.id));if(!this.dispatchElementAction(wt,["node",t],{id:s,label:n})){this.#t={parent:t,label:n,failed:!0},this.requestUpdate();return}this.#t=null,this.#e.delete(t),this.select({kind:"node",id:s}),this.requestUpdate()}}const Mt=()=>{customElements.get("dpk-component-mind-map")||customElements.define("dpk-component-mind-map",qt)},Ni=z({id:w(c(),$(1)),title:w(c(),$(1)),description:f(c()),tags:f(A(c())),assignee:f(c()),questions:f(c())}),Yi=["gray","blue","green","amber","violet","red"],Bi=z({id:w(c(),$(1)),label:w(c(),$(1)),description:f(c()),color:f(F(Yi)),limit:f(w(J(),Bt(),Yt(1))),cards:f(A(Ni))}),Wi=z({columns:A(Bi)}),Ki=()=>({columns:[]}),St=a=>{const e=Y(Wi,a),t=new Set,n=new Set;return{columns:e.columns.map(s=>{if(t.has(s.id))throw new Error(`duplicate column id: ${s.id}`);return t.add(s.id),{id:s.id,label:s.label,description:s.description??null,color:s.color??null,limit:s.limit??null,cards:(s.cards??[]).map(i=>{if(n.has(i.id))throw new Error(`duplicate card id: ${i.id}`);return n.add(i.id),{id:i.id,title:i.title,description:i.description??null,tags:i.tags??[],assignee:i.assignee??null,...i.questions===void 0?{}:{questions:i.questions},column:s.id,change:null}})}})}},ae=(a,e)=>a.columns.flatMap(t=>t.cards).find(t=>t.id===e),G=a=>a.columns.flatMap(e=>e.cards),Xi=(a,e)=>e===null?a:{columns:a.columns.map(t=>({...t,cards:t.cards.filter(e)}))},_i=(a,e,t,n)=>{const s=ae(a,e);if(s===void 0||s.column!==t)return!1;if(n===e)return!0;const i=a.columns.find(o=>o.id===t)?.cards??[],r=i.findIndex(o=>o.id===e);return(i[r+1]?.id??null)===n},Et="ADD_CARD",zt="MOVE_CARD",Ji=le({id:w(c(),$(1)),title:w(c(),we(),$(1))}),Zi=le({column:w(c(),$(1)),before:Wt(w(c(),$(1)))}),Ct=(a,e)=>{const t=Le(a);return t?.length===3&&t[1]===e?t[2]??null:null},Qi=(a,e)=>({columns:a.columns.map(t=>t.cards.some(n=>n.id===e)?{...t,cards:t.cards.filter(n=>n.id!==e)}:t)}),Tt=(a,e,t)=>({columns:a.columns.map(n=>{if(n.id!==t.column)return n;const s={...e,column:n.id},i=t.before===null?-1:n.cards.findIndex(r=>r.id===t.before);return{...n,cards:i<0?[...n.cards,s]:[...n.cards.slice(0,i),s,...n.cards.slice(i)]}})}),Gi=(a,e)=>{const t="\u30AB\u30FC\u30C9\u3092\u8FFD\u52A0",n=Ct(e.target.id,"column"),s=a.columns.find(o=>o.id===n);if(s===void 0)return{data:a,result:{id:e.id,title:t,stale:"target-missing"}};const i=de(Ji,e.payload);if(!i.success||ae(a,i.output.id)!==void 0)return{data:a,result:{id:e.id,title:t,stale:"constraint-violated"}};const r={id:i.output.id,title:i.output.title,description:null,tags:[],assignee:null,column:s.id,change:"added"};return{data:Tt(a,r,{column:s.id,before:null}),result:{id:e.id,title:t,summary:`${s.label} \u203A ${r.title}`,tone:"create"}}},es=(a,e)=>{const t="\u30AB\u30FC\u30C9\u3092\u79FB\u52D5",n=Ct(e.target.id,"card"),s=n===null?void 0:ae(a,n);if(s===void 0)return{data:a,result:{id:e.id,title:t,stale:"target-missing"}};const i=de(Zi,e.payload),r=a.columns.find(p=>p.id===s.column),o=i.success?a.columns.find(p=>p.id===i.output.column):void 0,d=i.success?i.output.before:null,l=d===null||d!==s.id&&o?.cards.some(p=>p.id===d)===!0;if(!i.success||r===void 0||o===void 0||!l)return{data:a,result:{id:e.id,title:t,stale:"constraint-violated"}};const g={...s,change:s.change??"moved"},m=r.id===o.id?`${s.title}: ${o.label} \u5185\u3067\u4E26\u3079\u66FF\u3048`:`${s.title}: ${r.label} \u2192 ${o.label}`;return{data:Tt(Qi(a,s.id),g,{column:o.id,before:d}),result:{id:e.id,title:t,summary:m,tone:"move"}}},ts=(a,e)=>{let t=a;const n=[];for(const s of e){const i=s.type===Et?Gi(t,s):s.type===zt?es(t,s):{data:t,result:{id:s.id,title:s.type,stale:"unsupported-action-type"}};t=i.data,n.push(i.result)}return{data:t,results:n}},ns=N`
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
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius);
    background: var(--dpk-paper-sunken);
    cursor: default;
    transition:
      border-color 150ms ease,
      box-shadow 150ms ease;
  }

  .kanban-column.is-selected {
    border-color: var(--dpk-ink-soft);
    box-shadow: 0 0 0 3px var(--dpk-blue-soft);
  }

  .kanban-column.is-drop-target {
    border-color: var(--dpk-blue);
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
    border-radius: var(--dpk-radius-xs);
    background: none;
    color: var(--dpk-ink);
    font-family: var(--dpk-body);
    font-size: 13px;
    font-weight: 650;
    text-align: left;
    cursor: pointer;
  }

  .kanban-column-title:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  .kanban-column-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* An authored color marks the heading, not the cards: the status reads at a glance. */
  .kanban-column[data-color='gray'] {
    --kanban-tone: var(--dpk-ink-soft);
  }

  .kanban-column[data-color='blue'] {
    --kanban-tone: var(--dpk-blue);
  }

  .kanban-column[data-color='green'] {
    --kanban-tone: var(--dpk-green);
  }

  .kanban-column[data-color='amber'] {
    --kanban-tone: var(--dpk-amber);
  }

  .kanban-column[data-color='violet'] {
    --kanban-tone: var(--dpk-violet);
  }

  .kanban-column[data-color='red'] {
    --kanban-tone: var(--dpk-accent);
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
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink-soft);
    font-family: var(--dpk-mono);
    font-size: 11px;
    font-weight: 600;
  }

  /* Over its WIP limit: the column asks for attention, not the cards. */
  .kanban-column.is-over {
    border-color: color-mix(in srgb, var(--dpk-accent) 55%, transparent);
  }

  .kanban-column.is-over .kanban-count {
    background: var(--dpk-accent-soft);
    color: var(--dpk-accent);
  }

  .kanban-column-head > .diagram-comment-trigger {
    position: absolute;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
  }

  .kanban-column-description {
    margin: 0 2px;
    color: var(--dpk-ink-soft);
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
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    font-family: var(--dpk-body);
    box-shadow: var(--dpk-shadow-xs);
    cursor: grab;
    transition:
      border-color 150ms ease,
      box-shadow 150ms ease,
      opacity 150ms ease;
  }

  .kanban-card:hover {
    border-color: var(--dpk-rule-strong);
  }

  .kanban-card.is-selected {
    border-color: var(--dpk-ink-soft);
    box-shadow: 0 0 0 3px var(--dpk-blue-soft);
  }

  .kanban-card:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  .kanban-card.is-dragging {
    opacity: 0.4;
  }

  /* Changed on this page by a draft action: not authored yet. */
  .kanban-card.is-added {
    border-style: dashed;
    border-color: var(--dpk-green);
  }

  .kanban-card.is-moved {
    border-left: 3px solid var(--dpk-blue);
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
    color: var(--dpk-ink-soft);
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
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-paper-sunken);
    color: var(--dpk-ink-soft);
    font-size: 10.5px;
  }

  .kanban-assignee {
    margin-left: auto;
    color: var(--dpk-ink-faint);
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
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-paper-raised);
    color: var(--dpk-accent);
    font-size: 11.5px;
    line-height: 1.4;
  }

  /* Takes no room of its own, so the cards do not jump while dragging. */
  .kanban-drop-marker {
    height: 3px;
    margin: -5.5px 0;
    border-radius: 2px;
    background: var(--dpk-blue);
  }

  .kanban-add {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .kanban-add-button {
    padding: 6px 8px;
    border: 1px dashed var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: none;
    color: var(--dpk-ink-soft);
    font-family: var(--dpk-body);
    font-size: 12px;
    text-align: left;
    cursor: pointer;
  }

  .kanban-add-button:hover,
  .kanban-add-button:focus-visible {
    border-color: var(--dpk-ink-soft);
    color: var(--dpk-ink);
    outline: none;
  }

  .kanban-add .dpk-input {
    width: 100%;
    font-size: 12.5px;
  }
`,Dt="\u8A18\u9332\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\uFF08dpk-template-* \u8981\u7D20\u306E\u4E2D\u306B\u7F6E\u3044\u3066\u304F\u3060\u3055\u3044\uFF09\u3002";class At extends ge{static{this.styles=[B,ns]}#e=null;#n=null;#i=null;#t=null;#s=null;parseData(e){return St(e)}emptyData(){return Ki()}reduceElementActions(e,t){return ts(e,t)}defaultHeading(){return"Kanban"}shellClass(){return"kanban"}emptyMessage(){return"\u5217\u304C\u3042\u308A\u307E\u305B\u3093\u3002"}commentItems(){const e=this.items();return[...e.columns.map(t=>({value:this.commentRef("column",t.id),label:t.label})),...G(e).map(t=>({value:this.commentRef("card",t.id),label:t.title}))]}hasSelection(e){const t=this.items();return e.kind==="column"?t.columns.some(n=>n.id===e.id):ae(t,e.id)!==void 0}tagItems(){return G(this.items()).map(e=>e.tags)}statsText(){const e=G(this.items()).length,t=G(this.#a()).length;return t===e?`${e} \u30AB\u30FC\u30C9`:`${t} / ${e} \u30AB\u30FC\u30C9`}isEmpty(){return this.items().columns.length===0}viewAlign(){return"start"}contentSize(){if(this.isEmpty())return null;const e=this.renderRoot.querySelector(".kanban-board");return{width:e?.offsetWidth??0,height:e?.offsetHeight??0}}refreshContent(){const e=this.authoredItems();e!==this.#e&&(this.#e=e,this.#n=null,this.#i=null)}renderCanvas(){const e=this.#a(),t=new Map(this.items().columns.map(n=>[n.id,n.cards.length]));return u`<div class="kanban-board">
      ${re(e.columns,n=>n.id,n=>this.#o(n,t.get(n.id)??0))}
    </div>`}#a(){const e=this.tagFilter;return Xi(this.items(),e.active.length===0?null:t=>X(t.tags,e))}#r(e,t){const n=this.selection;return n!==null&&n.kind===e&&n.id===t}#o(e,t){const n=e.limit!==null&&t>e.limit,s=this.#s?.column===e.id?this.#s:null;return u`
      <section
        class=${_("kanban-column",n&&"is-over",this.#r("column",e.id)&&"is-selected",s!==null&&"is-drop-target")}
        data-column=${e.id}
        data-color=${e.color??y}
        aria-label=${e.label}
      >
        <div class="kanban-column-head">
          <button
            type="button"
            class="kanban-column-title"
            aria-pressed=${this.#r("column",e.id)?"true":"false"}
            title=${e.description??e.label}
            @click=${()=>this.select({kind:"column",id:e.id})}
          >
            <span class="kanban-column-label">${e.label}</span>
            <span class="kanban-count" title=${e.limit===null?y:`WIP \u4E0A\u9650 ${e.limit}`}>
              ${e.limit===null?t:`${t} / ${e.limit}`}
            </span>
          </button>
          ${this.renderCommentTrigger({kind:"column",id:e.id},e.label)}
        </div>
        ${e.description===null?y:u`<p class="kanban-column-description">${e.description}</p>`}
        <div
          class="kanban-cards"
          @dragover=${i=>this.#h(i,e.id)}
          @dragleave=${i=>this.#g(i)}
          @drop=${i=>this.#m(i,e.id)}
        >
          ${re(e.cards,i=>i.id,i=>u`${s?.before===i.id?this.#l():y}${this.#p(i)}`)}
          ${s!==null&&s.before===null?this.#l():y}
        </div>
        ${this.#u(e)}
      </section>
    `}#l(){return u`<div class="kanban-drop-marker" aria-hidden="true"></div>`}#p(e){const t=this.#r("card",e.id);return u`
      <div class="kanban-card-slot">
        <div
          role="button"
          tabindex="0"
          draggable="true"
          class=${_("kanban-card",t&&"is-selected",e.change==="added"&&"is-added",e.change==="moved"&&"is-moved",this.#t===e.id&&"is-dragging")}
          data-card=${e.id}
          data-grill-questions=${this.questionsOf(e)}
          title=${e.description??e.title}
          aria-pressed=${t?"true":"false"}
          @click=${()=>this.select({kind:"card",id:e.id})}
          @keydown=${n=>this.#c(n,e.id)}
          @dragstart=${n=>this.#b(n,e.id)}
          @dragend=${()=>this.#f()}
        >
          <span class="kanban-card-title">${e.title}</span>
          ${e.description===null?y:u`<span class="kanban-card-description">${e.description}</span>`}
          ${e.tags.length===0&&e.assignee===null?y:u`<span class="kanban-card-meta">
                  ${e.tags.map(n=>u`<span class="kanban-tag">${n}</span>`)}
                  ${e.assignee===null?y:u`<span class="kanban-assignee">${e.assignee}</span>`}
                </span>`}
        </div>
        ${this.renderCommentTrigger({kind:"card",id:e.id},e.title)}
        ${this.#i===e.id?u`<p class="kanban-error" role="alert">${Dt}</p>`:y}
      </div>
    `}#u(e){const t=this.#n?.column===e.id?this.#n:null;return u`<div class="kanban-add">
      ${t===null?u`<button
              type="button"
              class="kanban-add-button"
              data-action="add"
              @click=${()=>this.#x(e.id)}
            >
              ＋ カード
            </button>`:u`
              <input
                class="dpk-input"
                aria-label="${e.label} に追加するカード"
                placeholder="カード名（Enter で追加）"
                .value=${t.title}
                @input=${n=>{const s=n.currentTarget;s instanceof HTMLInputElement&&(this.#n={...t,title:s.value,failed:!1})}}
                @keydown=${n=>this.#y(n,e.id)}
              />
              ${t.failed?u`<span class="kanban-error" role="alert">${Dt}</span>`:y}
            `}
    </div>`}#c(e,t){e.target!==e.currentTarget||e.key!=="Enter"&&e.key!==" "||(e.preventDefault(),this.select({kind:"card",id:t}))}#d(e,t){const n=this.dispatchElementAction(zt,["card",e],{column:t.column,before:t.before});this.#i=n?null:e,this.select({kind:"card",id:e}),this.requestUpdate()}#b(e,t){this.#t=t,e.dataTransfer&&(e.dataTransfer.effectAllowed="move",e.dataTransfer.setData("text/plain",t)),this.requestUpdate()}#h(e,t){if(this.#t===null)return;e.preventDefault(),e.dataTransfer&&(e.dataTransfer.dropEffect="move");const n=this.#v(e,t);this.#s?.column===n.column&&this.#s.before===n.before||(this.#s=n,this.requestUpdate())}#g(e){const t=e.currentTarget;!(t instanceof HTMLElement)||e.relatedTarget instanceof Node&&t.contains(e.relatedTarget)||(this.#s=null,this.requestUpdate())}#m(e,t){const n=this.#t;if(n===null)return;e.preventDefault();const s=this.#v(e,t);this.#f(),_i(this.items(),n,s.column,s.before)||this.#d(n,s)}#f(){this.#t===null&&this.#s===null||(this.#t=null,this.#s=null,this.requestUpdate())}#v(e,t){const n=e.currentTarget,s=(n instanceof HTMLElement?[...n.querySelectorAll("[data-card]")]:[]).find(i=>{if(i.dataset.card===this.#t)return!1;const r=i.getBoundingClientRect();return r.top+r.height/2>e.clientY});return{column:t,before:s?.dataset.card??null}}#x(e){this.#n={column:e,title:"",failed:!1},this.requestUpdate(),this.updateComplete.then(()=>this.renderRoot.querySelector(`[data-column="${CSS.escape(e)}"] .kanban-add input`)?.focus({preventScroll:!0}))}#y(e,t){if(e.isComposing)return;if(e.key==="Escape"){e.preventDefault(),this.#n=null,this.requestUpdate();return}if(e.key!=="Enter")return;e.preventDefault();const n=this.#n?.title.trim()??"";if(n.length===0)return;const s=[...this.items().columns.map(r=>r.id),...G(this.items()).map(r=>r.id)],i=$e(`card ${n}`,s);if(!this.dispatchElementAction(Et,["column",t],{id:i,title:n})){this.#n={column:t,title:n,failed:!0},this.requestUpdate();return}this.#n=null,this.select({kind:"card",id:i}),this.requestUpdate()}}const Lt=()=>{customElements.get("dpk-component-kanban")||customElements.define("dpk-component-kanban",At)},jt=()=>{He(),Xe(),Ze(),dt(),ht(),Mt(),Lt()},is=()=>{Kt(),Xt(),jt()};export{ct as D,Je as a,ot as b,At as c,qt as d,Ke as e,Fe as f,ht as g,Ze as h,dt as i,Lt as j,Mt as k,Xe as l,He as m,xt as n,Ye as o,St as p,Pe as q,is as r,jt as s};
