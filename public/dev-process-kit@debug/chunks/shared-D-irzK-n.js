import{a8 as le,a9 as F,aa as et,ab as ot,as as N,ac as v,at as P,ad as K,ae as T,af as S,r as $,am as I,w as nt,ar as ut,Q as ce,g as pe,V as j,S as k,a0 as gt,a5 as he,l as me,$ as xt,a1 as M,a2 as E,D as fe,L as ue,j as ge,_ as xe,a4 as B,a3 as bt,au as be,c as vt,n as _}from"./shared-BpZBcqrz.js";import{P as Et,r as ve,p as Ee,a as ye}from"./shared-C1mDZfwx.js";import{o as we}from"./shared-D0F9d4gi.js";import{c as yt}from"./shared-DPcZakya.js";function ke(e,t){let o=0;for(let i=0;i<e.length;i++)o+=t(e[i],i);return o}const H=["actor","command","aggregate","event","policy","readmodel","external","hotspot"],$e=F({id:P,name:T(v(),S(1)),description:N(v())}),Ie=F({id:P,type:K(H),name:T(v(),S(1)),description:N(v()),contextId:N(v())}),Te=F({id:P,from:T(v(),S(1)),to:T(v(),S(1)),label:N(v()),kind:N(K(["member","flow"]))}),wt=F({title:N(v()),contexts:et(ot($e),[]),elements:et(ot(Ie),[]),links:et(ot(Te),[])}),kt=e=>{const t=le(wt,e),o=new Set(t.elements.map(n=>n.id)),i=new Set(t.contexts.map(n=>n.id));for(const n of t.elements)if(n.contextId!==void 0&&!i.has(n.contextId))throw new Error(`unknown context "${n.contextId}" for note "${n.id}"`);for(const n of t.links){if(!o.has(n.from))throw new Error(`unknown note "${n.from}" in link "${n.id}"`);if(!o.has(n.to))throw new Error(`unknown note "${n.to}" in link "${n.id}"`)}return t},$t=()=>({contexts:[],elements:[],links:[]}),C=(e,t)=>{if(t!==void 0)return e.elements.find(o=>o.id===t)},R=(e,t)=>{if(t!==void 0)return e.contexts.find(o=>o.id===t)},it=(e,t)=>{if(t!==void 0)return e.links.find(o=>o.id===t)},q=e=>e.elements.map(t=>t.id),w={SET_ELEMENT_NAME:$("SET_ELEMENT_NAME","element",I({name:T(v(),S(1))})),SET_ELEMENT_DESCRIPTION:$("SET_ELEMENT_DESCRIPTION","element",I({description:v()})),SET_ELEMENT_TYPE:$("SET_ELEMENT_TYPE","element",I({type:K(H)})),SET_ELEMENT_CONTEXT:$("SET_ELEMENT_CONTEXT","element",I({contextId:ut(v())})),MOVE_ELEMENT:$("MOVE_ELEMENT","element",I({after:ut(v())}),{mode:"sequence"}),ADD_ELEMENT:$("ADD_ELEMENT","artifact",I({id:P,type:K(H),name:T(v(),S(1)),description:N(v()),contextId:N(v())}),{dedupeKey:nt}),DELETE_ELEMENT:$("DELETE_ELEMENT","element",I({})),LINK_ELEMENTS:$("LINK_ELEMENTS","artifact",I({id:P,from:T(v(),S(1)),to:T(v(),S(1)),label:N(v()),kind:N(K(["member","flow"]))}),{dedupeKey:nt}),SET_LINK_LABEL:$("SET_LINK_LABEL","link",I({label:v()})),UNLINK_ELEMENTS:$("UNLINK_ELEMENTS","artifact",I({from:T(v(),S(1)),to:T(v(),S(1))}),{mode:"sequence"}),ADD_CONTEXT:$("ADD_CONTEXT","artifact",I({id:P,name:T(v(),S(1)),description:N(v())}),{dedupeKey:nt}),SET_CONTEXT_NAME:$("SET_CONTEXT_NAME","context",I({name:T(v(),S(1))})),DELETE_CONTEXT:$("DELETE_CONTEXT","context",I({}))},y={setElementName:(e,t)=>({type:"SET_ELEMENT_NAME",target:{type:"element",id:e},payload:{name:t}}),setElementDescription:(e,t)=>({type:"SET_ELEMENT_DESCRIPTION",target:{type:"element",id:e},payload:{description:t}}),setElementType:(e,t)=>({type:"SET_ELEMENT_TYPE",target:{type:"element",id:e},payload:{type:t}}),setElementContext:(e,t)=>({type:"SET_ELEMENT_CONTEXT",target:{type:"element",id:e},payload:{contextId:t}}),moveElement:(e,t)=>({type:"MOVE_ELEMENT",target:{type:"element",id:e},payload:{after:t}}),addElement:(e,t,o)=>({type:"ADD_ELEMENT",target:{type:"artifact",id:"event-storming"},payload:{id:e,type:t,name:o}}),deleteElement:e=>({type:"DELETE_ELEMENT",target:{type:"element",id:e},payload:{}}),linkElements:(e,t,o,i)=>({type:"LINK_ELEMENTS",target:{type:"artifact",id:"event-storming"},payload:{id:e,from:t,to:o,...i?.label===void 0?{}:{label:i.label},...i?.kind===void 0?{}:{kind:i.kind}}}),setLinkLabel:(e,t)=>({type:"SET_LINK_LABEL",target:{type:"link",id:e},payload:{label:t}}),unlinkElements:(e,t)=>({type:"UNLINK_ELEMENTS",target:{type:"artifact",id:"event-storming"},payload:{from:e,to:t}}),addContext:(e,t)=>({type:"ADD_CONTEXT",target:{type:"artifact",id:"event-storming"},payload:{id:e,name:t}}),setContextName:(e,t)=>({type:"SET_CONTEXT_NAME",target:{type:"context",id:e},payload:{name:t}}),deleteContext:e=>({type:"DELETE_CONTEXT",target:{type:"context",id:e},payload:{}})},It=(e,t)=>{const o=ce(w,t);if(o===null)return null;const i=o.target.id;switch(o.type){case"SET_ELEMENT_NAME":return Q(e,i,n=>({...n,name:o.payload.name}));case"SET_ELEMENT_DESCRIPTION":return Q(e,i,n=>({...n,description:o.payload.description}));case"SET_ELEMENT_TYPE":return Q(e,i,n=>({...n,type:o.payload.type}));case"SET_ELEMENT_CONTEXT":{const{contextId:n}=o.payload;return n!==null&&!e.contexts.some(a=>a.id===n)?null:Q(e,i,a=>n===null?Tt(a):{...a,contextId:n})}case"MOVE_ELEMENT":{const{after:n}=o.payload,a=Se(e.elements,i,n);return a===null?null:{...e,elements:a}}case"ADD_ELEMENT":{const n=o.payload;if(e.elements.some(s=>s.id===n.id))return e;if(n.contextId!==void 0&&!e.contexts.some(s=>s.id===n.contextId))return null;const a={id:n.id,type:n.type,name:n.name,...n.description===void 0?{}:{description:n.description},...n.contextId===void 0?{}:{contextId:n.contextId}};return{...e,elements:[...e.elements,a]}}case"DELETE_ELEMENT":return e.elements.some(n=>n.id===i)?{...e,elements:e.elements.filter(n=>n.id!==i),links:e.links.filter(n=>n.from!==i&&n.to!==i)}:null;case"LINK_ELEMENTS":{const n=o.payload;return e.links.some(a=>a.id===n.id)?e:!e.elements.some(a=>a.id===n.from)||!e.elements.some(a=>a.id===n.to)?null:{...e,links:[...e.links,{id:n.id,from:n.from,to:n.to,...n.label===void 0?{}:{label:n.label},...n.kind===void 0?{}:{kind:n.kind}}]}}case"SET_LINK_LABEL":return e.links.some(n=>n.id===i)?{...e,links:e.links.map(n=>n.id===i?{...n,label:o.payload.label}:n)}:null;case"UNLINK_ELEMENTS":{const n=o.payload;return e.links.some(a=>a.from===n.from&&a.to===n.to)?{...e,links:e.links.filter(a=>!(a.from===n.from&&a.to===n.to))}:null}case"ADD_CONTEXT":{const n=o.payload;if(e.contexts.some(s=>s.id===n.id))return e;const a={id:n.id,name:n.name,...n.description===void 0?{}:{description:n.description}};return{...e,contexts:[...e.contexts,a]}}case"SET_CONTEXT_NAME":return e.contexts.some(n=>n.id===i)?{...e,contexts:e.contexts.map(n=>n.id===i?{...n,name:o.payload.name}:n)}:null;case"DELETE_CONTEXT":return e.contexts.some(n=>n.id===i)?{...e,contexts:e.contexts.filter(n=>n.id!==i),elements:e.elements.map(n=>n.contextId===i?Tt(n):n)}:null;default:return pe(o)}},Tt=e=>{const t={...e};return delete t.contextId,t},Q=(e,t,o)=>e.elements.some(i=>i.id===t)?{...e,elements:e.elements.map(i=>i.id===t?o(i):i)}:null,Se=(e,t,o)=>{const i=e.findIndex(s=>s.id===t);if(i<0||o!==null&&!e.some(s=>s.id===o))return null;const n=e[i];if(n===void 0)return null;const a=[...e.filter(s=>s.id!==t)];return a.splice(o===null?0:a.findIndex(s=>s.id===o)+1,0,n),a},Me=new Set(["actor>command","command>aggregate","aggregate>event","command>event","policy>command","external>event"]),Z=(e,t)=>Me.has(`${e}>${t}`),Ne=(e,t,o)=>e.kind!==void 0?e.kind==="member":Z(t,o),Le=["readmodel","actor","policy","command","aggregate","external","event","hotspot"],_e=(e,t)=>{const o=new Map;for(const i of e.links){const n=t.get(i.from),a=t.get(i.to);if(n===void 0||a===void 0||n==="hotspot"==(a==="hotspot")||i.kind!==void 0&&i.kind!=="member")continue;const s=n==="hotspot"?i.from:i.to;o.has(s)||o.set(s,n==="hotspot"?i.to:i.from)}return o},ze=(e,t,o)=>{const i=new Map(e.map(r=>[r.id,r.id])),n=r=>{let d=r;for(;i.get(d)!==d;)d=i.get(d)??d;let c=r;for(;c!==d;){const p=i.get(c)??d;i.set(c,d),c=p}return d};for(const r of t){if(!i.has(r.from)||!i.has(r.to))continue;const d=o.get(r.from),c=o.get(r.to);d===void 0||c===void 0||Ne(r,d,c)&&i.set(n(r.from),n(r.to))}const a=new Map,s=new Map;for(const r of e){const d=n(r.id);s.set(r.id,d);const c=a.get(d);c?c.push(r):a.set(d,[r])}return{groups:a,rootOf:s}},D=e=>{const t=new Map(e.elements.map(c=>[c.id,c.type])),o=_e(e,t),i=e.elements.filter(c=>!o.has(c.id)),{groups:n,rootOf:a}=ze(i,e.links,t),s=new Map;for(const[c,p]of o){const u=C(e,c),f=a.get(p);if(u===void 0||f===void 0)continue;const l=s.get(f);l?l.push({note:u,targetId:p}):s.set(f,[{note:u,targetId:p}])}const r=new Map(Le.map((c,p)=>[c,p])),d=new Map(e.elements.map((c,p)=>[c.id,p]));return[...n].map(([c,p])=>{const u=[...p].sort((f,l)=>(r.get(f.type)??0)-(r.get(l.type)??0)||(d.get(f.id)??0)-(d.get(l.id)??0));return{id:p[0]?.id??"",notes:u,pins:s.get(c)??[],contextId:p.find(f=>f.contextId!==void 0)?.contextId}})},Oe=e=>{const t=D(e).flatMap(i=>[...i.notes,...i.pins.map(n=>n.note)]),o=new Set(t.map(i=>i.id));return{...e,elements:[...t,...e.elements.filter(i=>!o.has(i.id))]}},St=(e,t)=>{const o=[...e.notes,...e.pins.map(s=>s.note)],i=o.find(s=>Z(t,s.type));if(i!==void 0)return{anchorId:i.id,incoming:!0};const n=o.find(s=>Z(s.type,t));if(n!==void 0)return{anchorId:n.id,incoming:!1};const a=o[0];return a===void 0?void 0:{anchorId:a.id,incoming:!0}},Mt=(e,t)=>{const o=new Map(t.flatMap(i=>i.notes.map(n=>[n.id,i.id])));return e.links.flatMap(i=>{const n=o.get(i.from),a=o.get(i.to);return n===void 0||a===void 0||n===a?[]:[{id:i.id,from:n,to:a,...i.label!==void 0?{label:i.label}:{}}]})},at=(e,t)=>`${e}\0${t}`,Nt=(e,t,o)=>{const{widthOf:i,gapX:n,padX:a,maxWidth:s}=o,r=new Map;for(const h of t)r.set(at(h.from,h.to),h),r.set(at(h.to,h.from),h);const d=(h,g)=>h===void 0||g===void 0?void 0:r.get(at(h,g)),c=h=>ke(h,g=>i(g))+n*Math.max(0,h.length-1)+a*2<=s,p=[];let u=[],f;const l=()=>{u.length!==0&&(p.push({sliceIds:u,...f===void 0?{}:{cutFrom:f}}),u=[],f=void 0)};for(const h of e.map(g=>g.id)){if(u.length>0&&!c([...u,h])){let g=u.length;for(;d(u[g-1],g===u.length?h:u[g])!==void 0&&(g-=1,g!==0););const x=g===0?[]:u.splice(g),m=g===0?d(u.at(-1),h):d(u.at(-1),x[0]);l(),u=x,f=m}u.push(h)}return l(),p},U=e=>[...e.notes].reverse().find(t=>t.type==="event")??e.notes.at(-1),Lt=(e,t)=>{const o=U(e),i=t.notes[0];if(!(o===void 0||i===void 0))return{from:o.id,to:i.id}},Ce={SET_ELEMENT_NAME:(e,t)=>({title:"\u8981\u7D20\u540D\u3092\u5909\u66F4",tone:"update",body:`"${C(t,e.target.id)?.name??"?"}\u201C \u2192 "${k(w.SET_ELEMENT_NAME,e).name}"`}),SET_ELEMENT_DESCRIPTION:e=>({title:"\u8981\u7D20\u306E\u8AAC\u660E\u3092\u66F4\u65B0",tone:"update",body:`\u2192 "${k(w.SET_ELEMENT_DESCRIPTION,e).description.slice(0,60)}"`}),SET_ELEMENT_TYPE:e=>({title:"\u8981\u7D20\u306E\u7A2E\u5225\u3092\u5909\u66F4",tone:"update",body:`\u2192 ${k(w.SET_ELEMENT_TYPE,e).type}`}),SET_ELEMENT_CONTEXT:e=>({title:"\u6240\u5C5E\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u3092\u5909\u66F4",tone:"move",body:`\u2192 ${k(w.SET_ELEMENT_CONTEXT,e).contextId??"\u672A\u6240\u5C5E"}`}),MOVE_ELEMENT:e=>({title:"\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u4F4D\u7F6E\u3092\u5909\u66F4",tone:"move",body:k(w.MOVE_ELEMENT,e).after===null?"\u2192 \u5148\u982D\u3078":`\u2192 "${k(w.MOVE_ELEMENT,e).after}" \u306E\u76F4\u5F8C\u3078`}),ADD_ELEMENT:e=>({title:"\u8981\u7D20\u3092\u8FFD\u52A0",tone:"create",body:`+ "${k(w.ADD_ELEMENT,e).name}"`}),DELETE_ELEMENT:(e,t)=>({title:"\u8981\u7D20\u3092\u524A\u9664",tone:"delete",body:`\u2212 "${C(t,e.target.id)?.name??e.target.id}"`}),LINK_ELEMENTS:e=>({title:"\u8981\u7D20\u3092\u9023\u7D50",tone:"create",body:`${k(w.LINK_ELEMENTS,e).from} \u2192 ${k(w.LINK_ELEMENTS,e).to}`}),SET_LINK_LABEL:e=>({title:"\u30EA\u30F3\u30AF\u540D\u3092\u5909\u66F4",tone:"update",body:`\u2192 "${k(w.SET_LINK_LABEL,e).label}"`}),UNLINK_ELEMENTS:e=>({title:"\u30EA\u30F3\u30AF\u3092\u524A\u9664",tone:"delete",body:`${k(w.UNLINK_ELEMENTS,e).from} \u2192 ${k(w.UNLINK_ELEMENTS,e).to}`}),ADD_CONTEXT:e=>({title:"\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u3092\u8FFD\u52A0",tone:"create",body:`+ "${k(w.ADD_CONTEXT,e).name}"`}),SET_CONTEXT_NAME:e=>({title:"\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u540D\u3092\u5909\u66F4",tone:"update",body:`\u2192 "${k(w.SET_CONTEXT_NAME,e).name}"`}),DELETE_CONTEXT:(e,t)=>({title:"\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u3092\u524A\u9664",tone:"delete",body:`\u2212 "${R(t,e.target.id)?.name??e.target.id}"`})},_t=(e,t,o)=>{const i=Ce[e.type],n=i?i(e,o??t):{title:e.type,tone:"meta"};return{title:n.title,targetLabel:Ot(t,e.target),tone:n.tone,...n.body===void 0?{}:{summary:n.body}}},zt=e=>`${e.type} ${j(e.target)} ${JSON.stringify(e.payload)}`,Ot=(e,t)=>{switch(t.type){case"element":{const o=C(e,t.id);return o?`\u8981\u7D20 \xB7 ${o.name}`:`\u8981\u7D20 \xB7 ${t.id} (missing)`}case"context":{const o=R(e,t.id);return o?`\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8 \xB7 ${o.name}`:`\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8 \xB7 ${t.id} (missing)`}case"link":{const o=it(e,t.id);return o?`\u30EA\u30F3\u30AF \xB7 ${o.from}\u2192${o.to}`:`\u30EA\u30F3\u30AF \xB7 ${t.id} (missing)`}case"artifact":return`Artifact \xB7 ${st(e)}`;default:return`${t.type} \xB7 ${t.id}`}},Ct=e=>[...e.elements.map(t=>({value:j({type:"element",id:t.id}),label:t.name,group:"\u8981\u7D20"})),...e.contexts.map(t=>({value:j({type:"context",id:t.id}),label:t.name,group:"\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8"}))],De=(e,t)=>{const o=e.elements.find(i=>i.id===t.note);return o?{value:j({type:"element",id:o.id}),label:o.name,group:"\u8981\u7D20"}:null},st=e=>e.title??"Event Storming",Dt=(e,t)=>{const o={...t},i=C(e,t.note);t.note!==void 0&&!i&&delete o.note;const n=R(e,t.context);return t.context!==void 0&&!n&&delete o.context,o},Xt=(e,t)=>{switch(t.type){case"element":return C(e,t.id)!==void 0;case"context":return R(e,t.id)!==void 0;case"link":return it(e,t.id)!==void 0;case"artifact":return!0;default:return!1}},At={name:"event-storming",label:"Event Storming",parseBase:kt,emptyBase:$t,actions:w,apply:It,canonicalState:Oe,hasTarget:Xt,describe:_t,serialize:zt,resolveNavigation:Dt,commentTargets:(e,t)=>Ct(e),currentTarget:(e,t)=>De(e,t),title:st},Xe={width:300,height:260},X={actor:"\u30A2\u30AF\u30BF\u30FC",command:"\u30B3\u30DE\u30F3\u30C9",aggregate:"\u96C6\u7D04",event:"\u30A4\u30D9\u30F3\u30C8",policy:"\u30DD\u30EA\u30B7\u30FC",readmodel:"\u30EA\u30FC\u30C9\u30E2\u30C7\u30EB",external:"\u5916\u90E8\u30B7\u30B9\u30C6\u30E0",hotspot:"\u30DB\u30C3\u30C8\u30B9\u30DD\u30C3\u30C8"},Ae={event:{bg:"linear-gradient(178deg, #ffbc55, #f8a52e)",ink:"#402703"},command:{bg:"linear-gradient(178deg, #93c9f2, #74b4e8)",ink:"#0e2c4b"},aggregate:{bg:"linear-gradient(178deg, #fff3a6, #fdea7e)",ink:"#4a3a06"},actor:{bg:"linear-gradient(178deg, #ffdf63, #fdd23e)",ink:"#423204"},policy:{bg:"linear-gradient(178deg, #dcc2f7, #c9a6f0)",ink:"#32195c"},readmodel:{bg:"linear-gradient(178deg, #c0e788, #a8dc63)",ink:"#22380a"},external:{bg:"linear-gradient(178deg, #f9bcd3, #f4a0c0)",ink:"#4b1029"},hotspot:{bg:"linear-gradient(178deg, #d63550, #b81c33)",ink:"#ffffff"}},rt=e=>{const{bg:t,ink:o}=Ae[e];return`--es-note-bg:${t};--es-note-ink:${o}`},Pe=gt`
  :host {
    display: flex;
    flex-direction: column;
    /* Top-aligned: the name stays put when the editor takes its place. */
    justify-content: flex-start;
    position: relative;
    box-sizing: border-box;
    padding: 16px 9px 8px;
    border-radius: 3px;
    background: var(--es-note-bg, var(--af-paper-raised));
    color: var(--es-note-ink, var(--af-ink));
    box-shadow:
      0 1px 2px rgba(30, 24, 10, 0.14),
      0 5px 10px -4px rgba(30, 24, 10, 0.24);
    cursor: pointer;
    transform: rotate(var(--es-tilt, 0deg));
    transition:
      transform 180ms ease,
      box-shadow 180ms ease;
    overflow: visible;
  }

  :host(:hover) {
    transform: rotate(0deg) translateY(-2px);
    box-shadow:
      0 2px 4px rgba(30, 24, 10, 0.16),
      0 12px 22px -6px rgba(30, 24, 10, 0.3);
    z-index: 6;
  }

  :host([focused]) {
    outline: 2px solid var(--af-blue);
    outline-offset: 2px;
    transform: rotate(0deg);
    z-index: 5;
  }

  :host([data-mode='editing']),
  :host([data-mode='commenting']) {
    z-index: 7;
    transform: rotate(0deg);
  }

  /* --------------------------------------------------- sticky note palette */

  /* Small, faint, top-left: readable when looked for, quiet when not. */
  .note-type {
    position: absolute;
    top: 5px;
    left: 7px;
    font-family: var(--af-mono);
    font-size: 8px;
    font-weight: 600;
    letter-spacing: 0.12em;
    opacity: 0.5;
  }

  /* Pinned hotspots are small: the type label is off and the name is centered. */
  :host([compact]) {
    justify-content: center;
    padding: 7px 9px 8px;
  }

  :host([compact]) .note-type {
    display: none;
  }

  .note-name {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
    font-size: 13px;
    font-weight: 680;
    line-height: 1.32;
    letter-spacing: -0.01em;
    overflow-wrap: anywhere;
  }

  :host([compact]) .note-name {
    flex: 0 1 auto;
    font-size: 11.5px;
    line-height: 1.3;
  }

  /* Comments already left: a passive corner flag, readable without hover. */
  .note-flag {
    position: absolute;
    top: -7px;
    right: -7px;
    min-width: 17px;
    height: 17px;
    padding: 0 4px;
    border-radius: 999px;
    background: var(--af-accent);
    color: var(--af-accent-ink);
    font-family: var(--af-mono);
    font-size: 9.5px;
    font-weight: 650;
    line-height: 17px;
    text-align: center;
    box-shadow: 0 1px 4px rgba(217, 73, 32, 0.35);
  }

  /* A side rail of round buttons that fades in on hover, like the hotspot chip:
     nothing crosses the card's face, and it stays clear of the pins above. */
  .note-tools {
    position: absolute;
    top: 9px;
    right: -11px;
    z-index: 8;
    display: flex;
    flex-direction: column;
    gap: 3px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 140ms ease;
  }

  /* Labelled, not a glyph: the hotspot affordance names itself on the card's
     top-right corner. It stays above the pins, which hang above that corner. */
  .note-hotspot {
    position: absolute;
    top: -9px;
    right: -4px;
    z-index: 9;
    padding: 2px 7px;
    border: 1px solid color-mix(in srgb, #e02c44 45%, transparent);
    border-radius: 999px;
    font-size: 9.5px;
    font-weight: 620;
    white-space: nowrap;
    color: #c2213a;
    background: color-mix(in srgb, var(--af-paper-raised) 94%, transparent);
    box-shadow: var(--af-shadow-xs);
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    transition: opacity 140ms ease;
  }

  :host(:hover) .note-hotspot,
  :host([data-mode='editing']) .note-hotspot,
  .note-hotspot:focus-visible {
    opacity: 1;
    pointer-events: auto;
  }

  .note-hotspot:hover {
    border-color: #e02c44;
    background: #fff1f3;
  }

  :host(:hover) .note-tools,
  :host([data-mode='commenting']) .note-tools,
  .note-tools:focus-within {
    opacity: 1;
    pointer-events: auto;
  }

  .note-tools .af-icon-btn {
    width: 22px;
    height: 22px;
    border: 1px solid var(--af-rule);
    border-radius: 50%;
    background: color-mix(in srgb, var(--af-paper-raised) 94%, transparent);
    backdrop-filter: blur(2px);
    box-shadow: var(--af-shadow-xs);
  }
`;class Pt extends he{static{this.styles=[me,Pe,xt]}static{this.properties={note:{attribute:!1},notes:{attribute:!1},mode:{type:String,reflect:!0,attribute:"data-mode"},focused:{type:Boolean,reflect:!0},compact:{type:Boolean,reflect:!0},onIntent:{attribute:!1}}}#t="";#d=new Et(this);constructor(){super(),this.note=null,this.notes=[],this.mode="view",this.focused=!1,this.compact=!1,this.onIntent=null,this.addEventListener("click",()=>this.#o({kind:"select"}))}updated(t){if(t.has("note")&&this.note&&(this.setAttribute("data-type",this.note.type),this.note.description===void 0?this.removeAttribute("title"):this.setAttribute("title",this.note.description)),t.has("mode")&&(this.mode!=="commenting"&&(this.#t=""),this.mode==="editing"&&this.renderRoot.querySelector("artifact-inline-edit")?.startEditing()),this.mode!=="commenting")return;const o=this.renderRoot.querySelector(".comment-pop"),i=this.renderRoot.querySelector('[data-role="comment"]');o&&i&&this.#d.open(o,i,Xe)}render(){const t=this.note;return t?E`
      <div class="note-type">${X[t.type]}</div>
      <artifact-inline-edit
        class="note-name"
        ?wrap=${!0}
        ?seamless=${!0}
        .value=${t.name}
        .label=${"\u4ED8\u7B8B\u540D"}
        @artifact-commit=${we(o=>this.#o({kind:"rename",name:o}))}
      ></artifact-inline-edit>
      ${this.notes.length>0?E`<span class="note-flag">${this.notes.length}</span>`:M}
      ${t.type==="hotspot"?M:E`<button
              class="note-hotspot"
              type="button"
              data-role="hotspot"
              title="この付箋にホットスポットを立てる"
              @click=${this.#a(()=>({kind:"add-hotspot"}))}
            >
              ＋ ホットスポット
            </button>`}
      <div class="note-tools">
        <button
          class="af-icon-btn"
          type="button"
          data-role="comment"
          aria-label="コメント"
          data-active=${String(this.mode==="commenting")}
          @click=${this.#a(()=>({kind:"toggle-comment"}))}
        >
          ${fe()}
        </button>
        <button
          class="af-icon-btn"
          type="button"
          data-role="delete"
          aria-label="削除"
          @click=${this.#a(()=>({kind:"delete"}))}
        >
          ${ue()}
        </button>
      </div>
      ${this.mode==="commenting"?this.#l():M}
    `:M}#l(){return ve(Ee(this.#t,this.notes.map(ge)),t=>{t.kind==="input"?(this.#t=t.body,this.requestUpdate()):this.#o(t)})}#a(t){return o=>{o.stopPropagation(),this.#o(t(o))}}#o(t){this.onIntent?.(t)}}const Bt=(e="artifact-es-note")=>{customElements.get(e)||customElements.define(e,Pt)},dt=.25,Rt=2,Yt=(e,t,o)=>({...e,panX:e.panX+t,panY:e.panY+o}),lt=(e,t,o,i)=>{const n=yt(e.zoom*i,dt,Rt),a=(t-e.panX)/e.zoom,s=(o-e.panY)/e.zoom;return{panX:t-a*n,panY:o-s*n,zoom:n}},Kt=(e,t,o)=>{const i=Math.max(1,t.width-o*2),n=Math.max(1,t.height-o*2),a=Math.max(dt,Math.min(1,i/Math.max(1,e.width),n/Math.max(1,e.height)));return{panX:(t.width-e.width*a)/2,panY:(t.height-e.height*a)/2,zoom:a}},qt=(e,t,o,i)=>{const n=(a,s,r,d)=>{const c=r*e.zoom;return c<=d?(d-c)/2-s*e.zoom:Math.min(-s*e.zoom,Math.max(d-(s+r)*e.zoom,a))};return{zoom:e.zoom,panX:n(e.panX,-i,t.width+i*2,o.width),panY:n(e.panY,-i,t.height+i*2,o.height)}},Be=(e,t,o)=>t>=e.left&&t<=e.left+e.width&&o>=e.top&&o<=e.top+e.height,ct=(e,t,o)=>{for(let i=e.length-1;i>=0;i-=1){const n=e[i];if(n!==void 0&&Be(n.rect,t,o))return n.id}},Ut=(e,t)=>t<e.left+e.width/2?"before":"after",Wt=(e,t)=>e.filter(({rect:o})=>o.left<t.left+t.width&&t.left<o.left+o.width&&o.top<t.top+t.height&&t.top<o.top+o.height).map(({id:o})=>o),pt=(e,t,o,i)=>{const n=new Set(t);if(o.some(p=>n.has(p)))return[];const a=e.filter(p=>!n.has(p)),s=o.map(p=>a.indexOf(p)).filter(p=>p>=0);if(s.length===0)return[];const r=i==="before"?Math.min(...s):Math.max(...s)+1,d=[];let c=a[r-1]??null;for(const p of e)n.has(p)&&(d.push({id:p,after:c}),c=p);return d},Vt=(e,t,o,i)=>{const n=pt(e,t,o,i);if(n.length===0)return n;const a=[...e];for(const s of n){const r=a.indexOf(s.id),d=r<0?void 0:a[r];d!==void 0&&(a.splice(r,1),a.splice(s.after===null?0:a.indexOf(s.after)+1,0,d))}return xe(a,e)?[]:n},Ft=(e,t,o,i=4)=>{if(t.pointerId!==e.pointerId)return e;const{point:n}=t,a={pointerId:e.pointerId,start:e.start,current:n,moved:e.moved||Math.hypot(n.x-e.start.x,n.y-e.start.y)>i},s=ct(o,n.x,n.y);switch(e.kind){case"connect":return{...a,kind:"connect",fromSliceId:e.fromSliceId,...s!==void 0&&s!==e.fromSliceId?{targetSliceId:s}:{}};case"move-slice":{const r=o.find(d=>d.id===s)?.rect;return{...a,kind:"move-slice",sliceId:e.sliceId,...s!==void 0&&s!==e.sliceId&&r!==void 0?{drop:{sliceId:s,side:Ut(r,n.x)}}:{}}}case"select":return{...a,kind:"select"}}},L={kind:"idle"},jt=(e,t)=>e.kind==="editing"&&e.noteId===t?"editing":e.kind==="commenting"&&e.noteId===t?"commenting":"view",Ht=(e,t,o)=>{switch(o.kind){case"toggle-comment":return e.kind==="commenting"&&e.noteId===t?L:{kind:"commenting",noteId:t};case"comment":case"delete":case"dismiss":return L;case"select":case"add-hotspot":return e;case"rename":return e.kind==="editing"&&e.noteId===t?L:e}},W=132,Qt=96,ht=10,mt=24,J=12,z=Qt+J*2,G=46,tt=16,Zt=44,Jt=40,ft=16,Gt=13,Y=8,Re=6,te=92,ee=54,oe=72,ne=ee+4,Ye=e=>Math.max(Zt,oe+(e-1)*ne-J),Ke=["actor","command","aggregate","event","policy","readmodel","external"],ie=e=>mt*2+e*W+(e-1)*ht,qe=e=>{if(e===void 0)return 0;const t=new Map;for(const o of e.pins)t.set(o.targetId,(t.get(o.targetId)??0)+1);return Math.max(0,...t.values())},Ue=(e,t,o)=>{const i=new Map(t.map(l=>[l.id,ie(l.notes.length)])),n=Mt(e,t),a=Nt(t,n,{widthOf:l=>i.get(l)??0,gapX:G,padX:tt,maxWidth:Math.max(o,ie(1))}),s=new Map,r=new Map,d=new Map,c=new Map(t.map(l=>[l.id,l]));let p=Y;const u=a.map((l,h)=>{const g=l.cutFrom===void 0?void 0:r.get(l.cutFrom.from),x=g===void 0?0:Math.max(0,g-tt);let m=x+tt;const b=Ye(Math.max(1,...l.sliceIds.map(A=>qe(c.get(A)))));for(const A of l.sliceIds)s.set(A,m-x),r.set(A,m),d.set(A,h),m+=(i.get(A)??0)+G;const O=b+z+Jt,V={sliceIds:l.sliceIds,x,width:m-G+tt-x,height:O,y:p,head:b,cutFrom:l.cutFrom};return p+=O+Re,V}),f=u.at(-1);return{slices:t,bands:u,xOf:s,absXOf:r,bandOf:d,widthOf:i,arrows:n,width:Math.max(0,...u.map(l=>l.x+l.width))+Y*2,height:f===void 0?Y*2:f.y+f.height+Y}},We=e=>{const{context:t,maxRowWidth:o,viewport:i,handlers:n}=e,{state:a}=t,s=24*i.zoom,r=`background-size:${s}px ${s}px;background-position:${i.panX}px ${i.panY}px`;if(a.elements.length===0)return E`<div class="board-viewport board-viewport--empty" style=${r}>
      <div class="empty">
        <h2>付箋がまだありません</h2>
        <p>イベントストーミングを開始しましょう。ドメインイベントを時系列に貼るところから始めます。</p>
        <button class="af-btn af-btn--accent" type="button" @click=${()=>n.addFirst()}>
          ＋ 最初のイベント
        </button>
      </div>
    </div>`;const d=D(a),c=Ue(a,d,o);return E`
    <div
      class="board-viewport${e.gesture!==void 0?" board-viewport--gesturing":""}"
      data-testid="es-viewport"
      tabindex="0"
      style=${r}
      @pointerdown=${n.viewportPointerDown}
      @pointermove=${n.viewportPointerMove}
      @pointerup=${n.viewportPointerUp}
      @pointercancel=${n.viewportPointerCancel}
      @pointerleave=${n.viewportPointerLeave}
      @wheel=${n.viewportWheel}
      @keydown=${n.keyDown}
    >
      <div
        class="board-content"
        style=${`transform:translate(${i.panX}px, ${i.panY}px) scale(${i.zoom})`}
      >
        <div class="wall" data-testid="es-wall" style=${`width:${c.width}px;height:${c.height}px`}>
          ${to(e,c)}
          ${c.bands.map((p,u)=>Fe(e,c,p,u))}
        </div>
      </div>
      ${He(e.gesture)} ${Qe(a,d)} ${Ze(e)}
      ${Je(e)}
    </div>
  `},Ve=(e,t)=>{const o=["slice"];e.selectedSliceIds.includes(t.id)&&o.push("slice--selected");const i=e.gesture;return i?.kind==="connect"&&i.moved&&(i.fromSliceId!==t.id&&o.push("slice--candidate"),i.targetSliceId===t.id&&o.push("slice--target")),i?.kind==="move-slice"&&i.moved&&(i.sliceId===t.id&&o.push("slice--lifted"),i.drop?.sliceId===t.id&&o.push(i.drop.side==="before"?"slice--insert-before":"slice--insert-after")),o.join(" ")},Fe=(e,t,o,i)=>{const{context:n,mode:a,gesture:s,hoverSliceId:r,handlers:d}=e,{navigation:c}=n,p=o.sliceIds.flatMap(l=>t.slices.filter(h=>h.id===l)),u=l=>({x:t.xOf.get(l.id)??0,y:o.head,w:t.widthOf.get(l.id)??0}),f=(l,h,g=!1)=>E`<artifact-es-note
      style=${h}
      .note=${l}
      .notes=${n.comments.filter(x=>x.target.type==="element"&&x.target.id===l.id)}
      .mode=${jt(a,l.id)}
      ?focused=${c.note===l.id}
      ?compact=${g}
      .onIntent=${x=>d.noteIntent(l.id,x)}
    ></artifact-es-note>`;return E`
    <section class="band" data-band=${i} style=${`left:${Y+o.x}px;top:${o.y}px`}>
      <div class="band-canvas" style=${`width:${o.width}px;height:${o.height}px`}>
        ${je(e,t,i)}
        ${p.map(l=>{const{x:h,y:g,w:x}=u(l);return E`<div
            class=${Ve(e,l)}
            data-slice-id=${l.id}
            style=${`left:${h}px;top:${g}px;width:${x}px;height:${z}px`}
            @pointerdown=${m=>d.slicePointerDown(l.id,m)}
          ></div>`})}
        ${bt(p.flatMap(l=>l.notes.map((h,g)=>({slice:l,note:h,slot:g}))),({note:l})=>l.id,({slice:l,note:h,slot:g})=>{const{x,y:m}=u(l),b=x+mt+g*(W+ht);return f(h,`${rt(h.type)};position:absolute;left:${b}px;top:${m+J}px;width:${W}px;height:${Qt}px;--es-tilt:${no(h.id)}deg;z-index:2`)})}
        ${bt(p.flatMap(l=>{const h=u(l);return l.notes.flatMap((g,x)=>l.pins.filter(m=>m.targetId===g.id).map((m,b)=>({pin:m,slot:x,index:b,at:h})))}),({pin:l})=>l.note.id,({pin:l,slot:h,index:g,at:x})=>{const m=x.x+mt+h*(W+ht),b=x.y+J;return f(l.note,`${rt(l.note.type)};position:absolute;left:${m+W-te-6-g*10}px;top:${b-oe-g*ne}px;width:${te}px;height:${ee}px;--es-tilt:-2.4deg;z-index:3`,!0)})}
        ${p.map(l=>{const{x:h,y:g,w:x}=u(l),m=r===l.id||s?.kind==="connect"&&s.fromSliceId===l.id;return E`<button
            class="slice-port${m?" slice-port--on":""}"
            type="button"
            style=${`left:${h+x-Gt}px;top:${g+z/2-Gt}px`}
            aria-label="続きを追加（種類を選んで追加 / ドラッグで他のスライスへ接続）"
            title="クリック: 続きの付箋を選んで追加 / ドラッグ: 他のスライスへ接続"
            @pointerdown=${b=>d.portPointerDown(l.id,b)}
          >
            →
          </button>`})}
        ${p.map(l=>{if(r!==l.id||s!==void 0)return M;const{x:h,y:g}=u(l),x=new Set(l.notes.map(b=>b.type)),m=Ke.filter(b=>!x.has(b));return E`<div
            class="slice-chips"
            style=${`left:${h}px;top:${g+z+6}px`}
            @pointerdown=${b=>b.stopPropagation()}
          >
            ${m.map(b=>E`<button class="slice-chip" type="button" @click=${()=>d.attachNote(l.id,b)}>
                  ＋ ${X[b]}
                </button>`)}
          </div>`})}
      </div>
    </section>
  `},je=(e,t,o)=>{const{context:i,handlers:n}=e,a=i.state.contexts.flatMap((s,r)=>{const d=t.slices.filter(m=>m.contextId===s.id).flatMap(m=>{const b=t.xOf.get(m.id),O=t.bandOf.get(m.id);return b===void 0||O===void 0?[]:[{x:b,band:O,width:t.widthOf.get(m.id)??0}]}),c=d.filter(m=>m.band===o);if(c.length===0)return[];const p=Math.min(...c.map(m=>m.x))-10,u=Math.max(...c.map(m=>m.x+m.width))+10,f=14,l=(t.bands[o]?.head??Zt)+z+12,h=d.some(m=>m.band<o)?"\u2026 ":"",g=d.some(m=>m.band>o)?" \u2026":"",x=String(r%5);return[E`<div
          class="context-region"
          data-hue=${x}
          style=${`left:${p}px;top:${f}px;width:${u-p}px;height:${l-f}px`}
          title=${s.description??s.name}
        ></div>
        <div
          class="context-label"
          data-hue=${x}
          style=${`left:${p+10}px;top:${f}px`}
          @pointerdown=${m=>m.stopPropagation()}
        >
          <button
            class="context-label-name"
            type="button"
            title="クリックして名前を変更"
            @click=${m=>n.renameContext(s.id,{x:m.clientX,y:m.clientY})}
          >
            ${h}${s.name}${g}
          </button>
          <button
            class="context-label-x"
            type="button"
            aria-label=${`\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u300C${s.name}\u300D\u3092\u89E3\u4F53`}
            title="コンテキストを解体（付箋は残ります）"
            @click=${()=>n.dissolveContext(s.id)}
          >
            ✕
          </button>
        </div>`]});return a.length>0?E`${a}`:M},He=e=>{if(e===void 0||!e.moved)return M;if(e.kind==="connect")return E`<svg class="gesture-layer" aria-hidden="true">
      ${B`<path class="connect-line" d=${`M ${e.start.x} ${e.start.y} L ${e.current.x} ${e.current.y}`}></path>
      <circle class="connect-tip" cx=${e.current.x} cy=${e.current.y} r="5"></circle>`}
    </svg>`;if(e.kind==="select"){const t=Math.min(e.start.x,e.current.x),o=Math.min(e.start.y,e.current.y),i=Math.abs(e.current.x-e.start.x),n=Math.abs(e.current.y-e.start.y);return E`<div
      class="select-rect"
      style=${`left:${t}px;top:${o}px;width:${i}px;height:${n}px`}
    ></div>`}return M},Qe=(e,t)=>E`<div class="board-hud">
    <span>${e.elements.length} 付箋</span>
    <span>${t.length} スライス</span>
    <span>${e.contexts.length} コンテキスト</span>
    <span class="board-hint">ホイール: 移動 · ピンチ: ズーム · 背景ドラッグ: 範囲選択</span>
  </div>`,Ze=e=>{const{viewport:t,handlers:o}=e;return E`<div class="board-zoom" @pointerdown=${i=>i.stopPropagation()}>
    <button type="button" aria-label="縮小" @click=${()=>o.zoomStep(-1)}>−</button>
    <button type="button" class="board-zoom-pct" title="100% に戻す" @click=${()=>o.zoomReset()}>
      ${Math.round(t.zoom*100)}%
    </button>
    <button type="button" aria-label="拡大" @click=${()=>o.zoomStep(1)}>＋</button>
    <button type="button" aria-label="全体を表示" title="全体を表示" @click=${()=>o.zoomFit()}>⛶</button>
  </div>`},Je=e=>{const{context:t,selectedSliceIds:o,selectedLinkIds:i,handlers:n}=e;if(i.length===0&&o.length===0)return M;const a=t.state.contexts;return i.length>0?E`<div class="board-selection" @pointerdown=${s=>s.stopPropagation()}>
      <span class="board-selection-count">${i.length} 本のリンクを選択中</span>
      <button class="af-btn af-btn--accent" type="button" @click=${()=>n.deleteSelection()}>
        リンクを削除
      </button>
      <span class="board-selection-hint">Delete でも削除できます</span>
      <button class="af-icon-btn" type="button" aria-label="選択解除" @click=${()=>n.clearSelection()}>
        ✕
      </button>
    </div>`:E`<div class="board-selection" @pointerdown=${s=>s.stopPropagation()}>
    <span class="board-selection-count">${o.length} スライスを選択中</span>
    <button
      class="af-btn af-btn--accent"
      type="button"
      @click=${s=>n.groupSelection({x:s.clientX,y:s.clientY})}
    >
      コンテキストにまとめる
    </button>
    ${a.length>0?E`<select
            class="af-select"
            aria-label="既存コンテキストへ追加"
            @change=${s=>{const r=be(s.target,HTMLSelectElement);r!==null&&(r.value!==""&&n.assignSelection(r.value),r.value="")}}
          >
            <option value="" selected>既存へ追加…</option>
            ${a.map(s=>E`<option value=${s.id}>${s.name}</option>`)}
          </select>`:M}
    <button class="af-btn" type="button" @click=${()=>n.stripSelectionContext()}>コンテキスト解除</button>
    <button class="af-btn" type="button" @click=${()=>n.deleteSelection()}>削除</button>
    <button class="af-icon-btn" type="button" aria-label="選択解除" @click=${()=>n.clearSelection()}>✕</button>
  </div>`},ae=(e,t,o,i)=>({d:`M ${e.x} ${e.y} C ${t.x} ${t.y}, ${o.x} ${o.y}, ${i.x} ${i.y}`,mid:{x:(e.x+3*t.x+3*o.x+i.x)/8,y:(e.y+3*t.y+3*o.y+i.y)/8}}),Ge=()=>B`<marker id="es-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0,0 L8,4 L0,8 z"></path>
  </marker>`,to=(e,t)=>{const o="url(#es-arrow)",i=[],n=r=>{const d=t.absXOf.get(r),c=t.bandOf.get(r),p=c===void 0?void 0:t.bands[c];if(!(d===void 0||c===void 0||p===void 0))return{x:Y+d,y:p.y+p.head,w:t.widthOf.get(r)??0,band:c}},a=r=>{const d=t.bands[r];return d===void 0?0:d.y+d.height},s=(r,d,c,p)=>{i.push(B`<path class="link-hit" d=${d} @pointerdown=${l=>l.stopPropagation()} @click=${l=>e.handlers.linkClick(r.id,l.shiftKey||l.metaKey||l.ctrlKey)}></path>`);const u=e.selectedLinkIds.includes(r.id)?" is-selected":"";if(i.push(B`<path class="link-path${u}" d=${d} marker-end=${o}></path>`),r.label===void 0)return;const f={start:6,end:-6,middle:0}[p];i.push(B`<text class="link-label" x=${c.x+f} y=${c.y-6} text-anchor=${p}>${r.label}</text>`)};for(const r of t.arrows){const d=n(r.from),c=n(r.to);if(d===void 0||c===void 0)continue;if(d.band===c.band){const x=c.x>=d.x+d.w;if((x?c.x-(d.x+d.w):d.x-(c.x+c.w))<=G+2){const b=d.y+z/2,O=x?d.x+d.w:d.x,V=x?c.x:c.x+c.w;s(r,`M ${O} ${b} L ${V} ${b}`,{x:(O+V)/2,y:b},"middle");continue}const m=eo(d,c,a(d.band)-Jt/2);s(r,m.d,m.mid,"middle");continue}const p=d.y<c.y,u=d.x+ft,f=yt(u,c.x+ft,c.x+c.w-ft),l={x:u,y:p?d.y+z:d.y},h={x:f,y:p?c.y:c.y+z},g=p?(a(d.band)+(t.bands[c.band]?.y??0))/2:(a(c.band)+(t.bands[d.band]?.y??0))/2;s(r,oo([l,{x:l.x,y:g},{x:h.x,y:g},h]),{x:h.x-6,y:g},"end")}return B`<svg class="links-layer" width=${t.width} height=${t.height}>
    <defs>${Ge()}</defs>
    ${i}
  </svg>`},eo=(e,t,o)=>{const i=e.y+z;if(t.x>=e.x+e.w){const s={x:e.x+e.w-18,y:i},r={x:t.x+18,y:i};return ae(s,{x:s.x+48,y:o},{x:r.x-48,y:o},r)}const n={x:e.x+18,y:i},a={x:t.x+t.w-18,y:i};return ae(n,{x:n.x-48,y:o},{x:a.x+48,y:o},a)},oo=(e,t=10)=>{let o=`M ${e[0]?.x??0} ${e[0]?.y??0}`;for(let n=1;n<e.length-1;n+=1){const a=e[n-1],s=e[n],r=e[n+1];if(a===void 0||s===void 0||r===void 0)continue;const d=Math.sign(s.x-a.x),c=Math.sign(s.y-a.y),p=Math.sign(r.x-s.x),u=Math.sign(r.y-s.y),f=Math.hypot(s.x-a.x,s.y-a.y),l=Math.hypot(r.x-s.x,r.y-s.y),h=Math.max(0,Math.min(t,f/2,l/2));o+=` L ${s.x-d*h} ${s.y-c*h} Q ${s.x} ${s.y} ${s.x+p*h} ${s.y+u*h}`}const i=e.at(-1);return i===void 0?o:`${o} L ${i.x} ${i.y}`},no=e=>{let t=0;for(const o of e)t=(t*31+o.charCodeAt(0))%997;return(t%17-8)*.09},io=gt`
  /* The board owns the whole main area; the viewport clips, never the shell. */
  .af-main {
    overflow: hidden;
  }

  .af-main-body {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 0;
    gap: 0;
  }

  /* ------------------------------------------------------------- viewport */

  /* An infinite pannable surface; the dot grid scrolls with the content
     (background-position/-size are set inline from the viewport state). */
  .board-viewport {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    touch-action: none;
    background-color: var(--af-paper);
    background-image: radial-gradient(circle, var(--af-rule) 1px, transparent 1px);
  }

  .board-viewport--gesturing,
  .board-viewport--gesturing * {
    user-select: none;
  }

  .board-viewport--empty {
    display: grid;
    place-items: center;
    padding: 24px;
  }

  .board-viewport:focus-visible {
    outline: none;
    box-shadow: inset var(--af-focus);
  }

  .board-content {
    position: absolute;
    left: 0;
    top: 0;
    width: max-content;
    transform-origin: 0 0;
    will-change: transform;
  }

  /* The wall is a fixed-size canvas: bands and the arrow layer are placed inside
     it at explicit coordinates, so an arrow may span several bands. */
  .wall {
    position: relative;
  }

  .band {
    position: absolute;
    display: flex;
    align-items: flex-start;
  }

  .band-canvas {
    position: relative;
    flex: 0 0 auto;
  }

  /* ---------------------------------------------------------------- slices */

  /* One causal slice: its notes framed together, read left to right.
     The frame is also the drag handle for moving the whole slice. */
  .slice {
    position: absolute;
    z-index: 1;
    border: 1px solid var(--af-rule-strong);
    border-radius: 12px;
    background: color-mix(in srgb, var(--af-paper-raised) 78%, transparent);
    box-shadow: var(--af-shadow-xs);
    cursor: grab;
  }

  .slice--selected {
    border-color: var(--af-blue);
    box-shadow:
      0 0 0 2px var(--af-blue-soft),
      var(--af-shadow-xs);
  }

  /* While a connection drag is out: everywhere it may land lights up dashed… */
  .slice--candidate {
    border: 1.5px dashed color-mix(in srgb, var(--af-blue) 55%, transparent);
  }

  /* …and the slice under the cursor confirms the landing. */
  .slice--target {
    border: 1.5px solid var(--af-blue);
    background: color-mix(in srgb, var(--af-blue-soft) 55%, transparent);
    box-shadow:
      0 0 0 3px var(--af-blue-soft),
      var(--af-shadow-sm);
  }

  /* The slice being carried by a move drag. */
  .slice--lifted {
    opacity: 0.45;
    border-style: dashed;
    cursor: grabbing;
  }

  /* Insertion bar on the side of the drop target the slice will land on. */
  .slice--insert-before::before,
  .slice--insert-after::after {
    content: '';
    position: absolute;
    top: -6px;
    bottom: -6px;
    width: 3px;
    border-radius: 2px;
    background: var(--af-blue);
  }

  .slice--insert-before::before {
    left: -10px;
  }

  .slice--insert-after::after {
    right: -10px;
  }

  /* Connection port on a slice's right edge: click continues, drag connects.
     Shown only for the hovered slice (hover is hit-tested by the element,
     with padding, so it stays up while the cursor crosses over to it). */
  .slice-port {
    position: absolute;
    z-index: 5;
    width: 26px;
    height: 26px;
    border: 1px solid var(--af-rule-strong);
    border-radius: 50%;
    background: var(--af-paper-raised);
    color: var(--af-ink-soft);
    font-size: 13px;
    line-height: 1;
    box-shadow: var(--af-shadow-xs);
    cursor: crosshair;
    opacity: 0;
    pointer-events: none;
    transition:
      opacity 120ms ease,
      border-color 120ms ease;
  }

  .slice-port--on,
  .slice-port:focus-visible {
    opacity: 1;
    pointer-events: auto;
  }

  .slice-port:hover {
    border-color: var(--af-blue);
    color: var(--af-blue);
  }

  /* Add-note chips under the hovered slice: the roles it is still missing. */
  .slice-chips {
    position: absolute;
    z-index: 6;
    display: flex;
    gap: 4px;
    padding: 2px 0;
  }

  .slice-chip {
    border: 1px dashed var(--af-rule-strong);
    border-radius: 999px;
    padding: 3px 9px;
    font-size: 10.5px;
    font-weight: 620;
    white-space: nowrap;
    color: var(--af-ink-soft);
    background: color-mix(in srgb, var(--af-paper-raised) 88%, transparent);
    cursor: pointer;
    transition:
      border-color 120ms ease,
      color 120ms ease;
  }

  .slice-chip:hover {
    border-color: var(--af-blue);
    color: var(--af-blue);
  }

  /* ------------------------------------------------------ bounded contexts */

  .context-region[data-hue='0'],
  .context-label[data-hue='0'] {
    --ctx-rgb: 51, 102, 204;
  }
  .context-region[data-hue='1'],
  .context-label[data-hue='1'] {
    --ctx-rgb: 13, 148, 136;
  }
  .context-region[data-hue='2'],
  .context-label[data-hue='2'] {
    --ctx-rgb: 174, 110, 6;
  }
  .context-region[data-hue='3'],
  .context-label[data-hue='3'] {
    --ctx-rgb: 124, 58, 237;
  }
  .context-region[data-hue='4'],
  .context-label[data-hue='4'] {
    --ctx-rgb: 190, 50, 100;
  }

  .context-region {
    position: absolute;
    z-index: 0;
    border: 1.5px dashed rgba(var(--ctx-rgb), 0.33);
    border-radius: 10px;
    background: rgba(var(--ctx-rgb), 0.05);
    pointer-events: none;
  }

  /* The label rides the region's top edge and carries the rename/dissolve UI. */
  .context-label {
    position: absolute;
    z-index: 7;
    transform: translateY(-55%);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .context-label-name {
    border: none;
    border-radius: 999px;
    padding: 3px 10px;
    font-family: var(--af-mono);
    font-size: 9.5px;
    font-weight: 650;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    white-space: nowrap;
    color: #fff;
    background: rgba(var(--ctx-rgb), 0.9);
    cursor: pointer;
    box-shadow: var(--af-shadow-xs);
  }

  .context-label-name:hover {
    background: rgba(var(--ctx-rgb), 1);
  }

  .context-label-x {
    width: 18px;
    height: 18px;
    border: none;
    border-radius: 50%;
    font-size: 9px;
    line-height: 1;
    color: rgba(var(--ctx-rgb), 0.9);
    background: color-mix(in srgb, var(--af-paper-raised) 92%, transparent);
    box-shadow: var(--af-shadow-xs);
    cursor: pointer;
    opacity: 0;
    transition: opacity 120ms ease;
  }

  .context-label:hover .context-label-x,
  .context-label-x:focus-visible {
    opacity: 1;
  }

  /* ---------------------------------------------------------------- arrows */

  .links-layer {
    position: absolute;
    inset: 0;
    /* Causality strokes are annotations drawn over the wall. */
    z-index: 4;
    pointer-events: none;
    overflow: visible;
  }

  /* Stroke must come from a stylesheet, not a presentation attribute:
     a var() inside stroke="..." is not substituted and the line stays invisible. */
  .link-path {
    fill: none;
    stroke: var(--af-ink-soft);
    stroke-width: 1.6;
    stroke-linecap: round;
    opacity: 0.6;
  }

  /* Invisible fat stroke on top of the line: a mistaken connection is easy to
     pick, and picking it never starts a wall gesture. */
  .link-hit {
    fill: none;
    stroke: transparent;
    stroke-width: 14;
    stroke-linecap: round;
    pointer-events: stroke;
    cursor: pointer;
  }

  .link-path.is-selected {
    stroke: var(--af-blue);
    stroke-width: 2.6;
    opacity: 1;
  }

  .link-label {
    font-family: var(--af-mono);
    font-size: 9px;
    letter-spacing: 0.06em;
    fill: var(--af-ink-soft);
    paint-order: stroke;
    stroke: var(--af-paper-raised);
    stroke-width: 3;
    stroke-linejoin: round;
  }

  .links-layer marker path {
    fill: var(--af-ink-soft);
    opacity: 0.75;
  }

  /* --------------------------------------------------------------- gesture */

  /* Overlays live in viewport space, above the transformed content. */
  .gesture-layer {
    position: absolute;
    inset: 0;
    z-index: 30;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: visible;
  }

  .connect-line {
    fill: none;
    stroke: var(--af-blue);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-dasharray: 6 4;
  }

  .connect-tip {
    fill: var(--af-blue);
  }

  .select-rect {
    position: absolute;
    z-index: 30;
    border: 1px solid var(--af-blue);
    background: color-mix(in srgb, var(--af-blue-soft) 40%, transparent);
    pointer-events: none;
  }

  /* ------------------------------------------------------------ floating UI */

  .board-hud {
    position: absolute;
    left: 12px;
    bottom: 12px;
    z-index: 40;
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 5px 12px;
    border: 1px solid var(--af-rule);
    border-radius: 999px;
    font-family: var(--af-mono);
    font-size: 10px;
    letter-spacing: 0.05em;
    color: var(--af-ink-faint);
    background: color-mix(in srgb, var(--af-paper-raised) 82%, transparent);
    backdrop-filter: blur(6px);
    pointer-events: none;
  }

  .board-hint {
    color: var(--af-ink-faint);
    opacity: 0.8;
  }

  .board-zoom {
    position: absolute;
    right: 12px;
    bottom: 12px;
    z-index: 40;
    display: flex;
    align-items: center;
    border: 1px solid var(--af-rule);
    border-radius: 8px;
    background: color-mix(in srgb, var(--af-paper-raised) 88%, transparent);
    backdrop-filter: blur(6px);
    box-shadow: var(--af-shadow-xs);
    overflow: hidden;
  }

  .board-zoom button {
    border: none;
    background: transparent;
    padding: 6px 10px;
    font-size: 12px;
    line-height: 1;
    color: var(--af-ink-soft);
    cursor: pointer;
  }

  .board-zoom button:hover {
    background: var(--af-blue-soft);
    color: var(--af-blue);
  }

  .board-zoom .board-zoom-pct {
    min-width: 48px;
    font-family: var(--af-mono);
    font-size: 10.5px;
  }

  .board-selection {
    position: absolute;
    left: 50%;
    bottom: 14px;
    transform: translateX(-50%);
    z-index: 45;
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 8px 12px;
    border: 1px solid var(--af-rule-strong);
    border-radius: 10px;
    background: color-mix(in srgb, var(--af-paper-raised) 94%, transparent);
    backdrop-filter: blur(6px);
    box-shadow: var(--af-shadow);
  }

  .board-selection-count {
    font-family: var(--af-mono);
    font-size: 10.5px;
    color: var(--af-ink-soft);
    white-space: nowrap;
  }

  .board-selection-hint {
    font-size: 10.5px;
    color: var(--af-ink-faint);
    white-space: nowrap;
  }

  /* ----------------------------------------------------------------- empty */

  .empty {
    border: 1px dashed var(--af-rule-strong);
    border-radius: var(--af-radius-lg);
    padding: 28px 24px;
    background: var(--af-paper-raised);
    max-width: 560px;
    display: grid;
    gap: 10px;
    box-shadow: var(--af-shadow-sm);
    justify-items: start;
  }

  /* --------------------------------------------------------------- pickers */

  .context-pop {
    min-width: 220px;
  }

  /* -------------------------------------------------------- append picker */

  /* The palette travels in --es-note-bg/-ink, so a chip previews what it adds. */
  .append-menu {
    min-width: 220px;
  }

  .append-menu .type-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
  }

  .type-chip {
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 4px;
    padding: 6px 8px;
    font-size: 11px;
    font-weight: 620;
    text-align: left;
    background: var(--es-note-bg, var(--af-paper-raised));
    color: var(--es-note-ink, var(--af-ink));
    cursor: pointer;
    transition: transform 120ms ease;
  }

  .type-chip:hover {
    transform: translateY(-1px);
    box-shadow: var(--af-shadow-sm);
  }

  .link-add .af-select {
    flex: 1 1 auto;
    min-width: 0;
  }
`,ao={width:260,height:150},so={width:236,height:210},ro=64,lo=["event","command","aggregate","actor","policy","readmodel","external"],co=1200,se=5,po={x:20,top:46,bottom:40};class re extends vt{constructor(){super(),this.definition=At,this.#d=new Et(this),this.mode=L,this.boardWidth=co,this.viewport={panX:24,panY:16,zoom:1},this.gesture=void 0,this.hoverSliceId=void 0,this.selectedSliceIds=[],this.selectedLinkIds=[],this.naming=void 0}static{this.styles=[vt.styles,io,xt]}static{this.properties={mode:{state:!0},boardWidth:{state:!0},viewport:{state:!0},gesture:{state:!0},hoverSliceId:{state:!0},selectedSliceIds:{state:!0},selectedLinkIds:{state:!0},naming:{state:!0}}}#t;#d;disconnectedCallback(){super.disconnectedCallback(),this.#t?.disconnect(),this.#t=void 0}firstUpdated(){typeof ResizeObserver>"u"||(this.#t=new ResizeObserver(t=>{const o=t[0]?.contentRect.width;o!==void 0&&o>0&&(this.boardWidth=o)}),this.#t.observe(this))}updated(){super.updated(),this.#c(this.viewport),this.mode.kind==="append"&&this.#l("#append-menu",this.mode.point,so),this.naming!==void 0&&this.#l("#context-pop",this.naming.point,ao,"#context-name")}#l(t,o,i,n){const a=this.renderRoot.querySelector(t);if(!a||a.matches(":popover-open")||(this.#d.open(a,ye(o.x,o.y),i),n===void 0))return;const s=this.renderRoot.querySelector(n);s?.focus(),s instanceof HTMLInputElement&&s.select()}#a(){return Math.max(ho,this.boardWidth-96)}renderRegions(t){return{main:this.#o(t)}}#o(t){return E`
      ${We({context:t,mode:this.mode,maxRowWidth:this.#a(),viewport:this.viewport,gesture:this.gesture,hoverSliceId:this.hoverSliceId,selectedSliceIds:this.selectedSliceIds,selectedLinkIds:this.selectedLinkIds,handlers:{noteIntent:(o,i)=>this.#I(o,i),addFirst:()=>this.#A(t),attachNote:(o,i)=>this.#_(t,o,i),viewportPointerDown:o=>this.#v(o),viewportPointerMove:o=>this.#E(o),viewportPointerUp:o=>this.#y(t,o),viewportPointerCancel:()=>this.gesture=void 0,viewportPointerLeave:()=>{this.gesture===void 0&&(this.hoverSliceId=void 0)},viewportWheel:o=>this.#w(o),portPointerDown:(o,i)=>this.#x(o,i),slicePointerDown:(o,i)=>this.#b(o,i),zoomStep:o=>this.#k(o),zoomFit:()=>this.#$(),zoomReset:()=>this.#h(1/this.viewport.zoom),groupSelection:o=>{this.selectedSliceIds.length>0&&(this.naming={kind:"create-context",sliceIds:this.selectedSliceIds,point:o})},assignSelection:o=>this.#u(t,o),stripSelectionContext:()=>this.#u(t,null),clearSelection:()=>{this.selectedSliceIds=[],this.selectedLinkIds=[]},linkClick:(o,i)=>this.#O(o,i),deleteSelection:()=>this.#f(t),keyDown:o=>this.#C(t,o),renameContext:(o,i)=>this.naming={kind:"rename-context",contextId:o,point:i},dissolveContext:o=>t.dispatch(y.deleteContext(o))}})}
      ${this.mode.kind==="append"?this.#X(t,this.mode.sliceId):M}
      ${this.naming!==void 0?this.#D(t,this.naming):M}
    `}#e(){return this.renderRoot.querySelector(".board-viewport")}#n(t){const o=this.#e()?.getBoundingClientRect();return o===void 0?{x:t.clientX,y:t.clientY}:{x:t.clientX-o.left,y:t.clientY-o.top}}#s(t){const o=this.#e();if(o===null)return[];const i=o.getBoundingClientRect();return[...this.renderRoot.querySelectorAll("[data-slice-id]")].map(n=>{const a=n.getBoundingClientRect();return{id:n.dataset.sliceId??"",rect:{left:a.left-i.left-(t?.x??0),top:a.top-i.top-(t?.top??0),width:a.width+(t?.x??0)*2,height:a.height+(t?.top??0)+(t?.bottom??0)}}})}#p(t,o){const i=this.#e();i!==null&&(i.setPointerCapture(t.pointerId),this.gesture=o)}#x(t,o){if(o.button!==0)return;o.stopPropagation(),o.preventDefault();const i=this.#n(o);this.#p(o,{kind:"connect",pointerId:o.pointerId,fromSliceId:t,start:i,current:i,moved:!1})}#b(t,o){if(o.button!==0)return;o.stopPropagation(),o.preventDefault();const i=this.#n(o);this.#p(o,{kind:"move-slice",pointerId:o.pointerId,sliceId:t,start:i,current:i,moved:!1})}#v(t){if(t.button!==0||this.gesture!==void 0)return;for(const i of t.composedPath()){if(i===t.currentTarget)break;if(i instanceof Element&&(i.tagName.toLowerCase()==="artifact-es-note"||i.matches("button, select, textarea, input, a")))return}const o=this.#n(t);(this.mode.kind==="editing"||this.mode.kind==="append")&&(this.mode=L),this.selectedLinkIds=[],this.#p(t,{kind:"select",pointerId:t.pointerId,start:o,current:o,moved:!1})}#E(t){const o=this.gesture,i=this.#n(t);if(o===void 0){const n=ct(this.#s(po),i.x,i.y);n!==this.hoverSliceId&&(this.hoverSliceId=n);return}this.gesture=Ft(o,{pointerId:t.pointerId,point:i},this.#s(),se)}#y(t,o){const i=this.gesture;if(i===void 0||o.pointerId!==i.pointerId)return;const n=Ft(i,{pointerId:o.pointerId,point:this.#n(o)},this.#s(),se);if(this.gesture=void 0,n.kind==="connect"){n.moved?n.targetSliceId!==void 0&&this.#T(t,n.fromSliceId,n.targetSliceId):this.#M(n.fromSliceId);return}if(n.kind==="move-slice"){if(!n.moved){this.selectedSliceIds=this.selectedSliceIds.includes(n.sliceId)?this.selectedSliceIds.filter(s=>s!==n.sliceId):[...this.selectedSliceIds,n.sliceId];return}n.drop!==void 0&&this.#z(t,n.sliceId,n.drop.sliceId,n.drop.side);return}if(!n.moved){this.selectedSliceIds=[];return}const a={left:Math.min(n.start.x,n.current.x),top:Math.min(n.start.y,n.current.y),width:Math.abs(n.current.x-n.start.x),height:Math.abs(n.current.y-n.start.y)};this.selectedSliceIds=[...Wt(this.#s(),a)]}#w(t){t.preventDefault();const o=this.#n(t);this.#c(t.ctrlKey||t.metaKey?lt(this.viewport,o.x,o.y,Math.exp(-t.deltaY*.01)):Yt(this.viewport,-t.deltaX,-t.deltaY))}#h(t){const o=this.#e()?.getBoundingClientRect();this.#c(lt(this.viewport,(o?.width??0)/2,(o?.height??0)/2,t))}#k(t){this.#h(t===1?1.2:1/1.2)}#$(){const t=this.#e()?.getBoundingClientRect(),o=this.#m();t===void 0||o===void 0||this.#c(Kt(o,{width:t.width,height:t.height},48))}#m(){const t=this.renderRoot.querySelector(".wall");return t===null?void 0:{width:t.offsetWidth,height:t.offsetHeight}}#c(t){const o=this.#e()?.getBoundingClientRect(),i=this.#m(),n=o===void 0||i===void 0||i.width===0||o.width===0?t:qt(t,i,{width:o.width,height:o.height},ro),a=this.viewport;n.panX===a.panX&&n.panY===a.panY&&n.zoom===a.zoom||(this.viewport=n)}#I(t,o){const i=this.context();switch(o.kind){case"select":i.navigate({note:t});break;case"rename":i.dispatch(y.setElementName(t,o.name));break;case"comment":i.dispatch({type:"comment",target:`element:${t}`,payload:{body:o.body}});break;case"delete":i.dispatch(y.deleteElement(t)),i.navigation.note===t&&i.navigate({note:null});break;case"add-hotspot":this.#L(i,t);break}this.mode=Ht(this.mode,t,o)}#r(t,o){return D(t).find(i=>i.id===o)}#i(t){return t===void 0?[]:[...t.notes,...t.pins.map(o=>o.note)].map(o=>o.id)}#T(t,o,i){if(o===i)return;const n=D(t.state),a=n.find(f=>f.id===o),s=n.find(f=>f.id===i),r=a&&s?Lt(a,s):void 0;if(a===void 0||s===void 0||r===void 0||t.state.links.some(f=>f.from===r.from&&f.to===r.to))return;const d=t.state.links.map(f=>f.id),c=t.state.elements.map(f=>f.id),p=U(a)?.id,u=p!==void 0&&n.indexOf(s)>n.indexOf(a)?Vt(c,this.#i(s),[p],"after"):[];t.dispatchBatch([y.linkElements(_(`link-${r.from}`,d),r.from,r.to,{kind:"flow"}),...u.map(f=>y.moveElement(f.id,f.after))])}#S(t){const o=this.#e(),i=this.#s().find(a=>a.id===t)?.rect;if(o===null||i===void 0)return;const n=o.getBoundingClientRect();return{x:n.left+i.left+i.width,y:n.top+i.top+i.height/2}}#M(t){const o=this.#S(t);o!==void 0&&(this.mode={kind:"append",sliceId:t,point:o})}#N(t,o,i){const n=this.#r(t.state,o),a=n?U(n):void 0;if(a===void 0){this.mode=L;return}const s=_(`new-${i}`,q(t.state)),r=t.state.links.map(d=>d.id);if(!t.dispatchBatch([y.addElement(s,i,X[i]),y.linkElements(_(`link-${a.id}`,r),a.id,s,{kind:"flow"})]).ok){this.mode=L;return}t.navigate({note:s}),this.mode={kind:"editing",noteId:s}}#L(t,o){const i=_("new-hotspot",q(t.state)),n=t.state.links.map(a=>a.id);t.dispatchBatch([y.addElement(i,"hotspot",X.hotspot),y.linkElements(_(`link-${i}`,n),i,o,{kind:"member"})]).ok&&(t.navigate({note:i}),this.mode={kind:"editing",noteId:i})}#_(t,o,i){const n=this.#r(t.state,o),a=n===void 0?void 0:St(n,i);if(a===void 0)return;const s=_(`new-${i}`,q(t.state)),[r,d]=a.incoming?[s,a.anchorId]:[a.anchorId,s],c=t.state.links.map(p=>p.id);t.dispatchBatch([y.addElement(s,i,X[i]),y.linkElements(_(`link-${r}`,c),r,d,{kind:"member"})]).ok&&(t.navigate({note:s}),this.mode={kind:"editing",noteId:s})}#z(t,o,i,n){const a=t.state,s=pt(a.elements.map(r=>r.id),this.#i(this.#r(a,o)),this.#i(this.#r(a,i)),n);t.dispatchBatch(s.map(r=>y.moveElement(r.id,r.after)))}#O(t,o){this.mode.kind==="editing"&&(this.mode=L),this.selectedSliceIds=[],this.selectedLinkIds=o?this.selectedLinkIds.includes(t)?this.selectedLinkIds.filter(i=>i!==t):[...this.selectedLinkIds,t]:[t],this.#e()?.focus()}#f(t){if(this.selectedLinkIds.length>0){const n=t.state.links.filter(a=>this.selectedLinkIds.includes(a.id));t.dispatchBatch(n.map(a=>y.unlinkElements(a.from,a.to))),this.selectedLinkIds=[];return}if(this.selectedSliceIds.length===0)return;const o=D(t.state),i=this.selectedSliceIds.flatMap(n=>this.#i(o.find(a=>a.id===n)));t.dispatchBatch(i.map(n=>y.deleteElement(n))),this.selectedSliceIds=[]}#C(t,o){if(o.target!==o.currentTarget)return;if(o.key==="Escape"){this.selectedSliceIds=[],this.selectedLinkIds=[];return}if(o.key!=="Delete"&&o.key!=="Backspace"||this.mode.kind!=="idle"||this.naming!==void 0)return;if(o.preventDefault(),this.selectedLinkIds.length>0||this.selectedSliceIds.length>0){this.#f(t);return}const i=t.navigation.note;i===void 0||C(t.state,i)===void 0||(t.dispatch(y.deleteElement(i)),t.navigate({note:null}))}#u(t,o){const i=D(t.state),n=this.selectedSliceIds.flatMap(a=>this.#i(i.find(s=>s.id===a)));t.dispatchBatch(n.map(a=>y.setElementContext(a,o))).ok&&(this.selectedSliceIds=[])}#g(t,o){const i=this.renderRoot.querySelector("#context-name")?.value.trim()??"";if(i==="")return;if(o.kind==="rename-context"){t.dispatch(y.setContextName(o.contextId,i)).ok&&(this.naming=void 0);return}const n=_("context",t.state.contexts.map(r=>r.id)),a=D(t.state),s=o.sliceIds.flatMap(r=>this.#i(a.find(d=>d.id===r)));t.dispatchBatch([y.addContext(n,i),...s.map(r=>y.setElementContext(r,n))]).ok&&(this.selectedSliceIds=[],this.naming=void 0)}#D(t,o){const i=o.kind==="rename-context"?R(t.state,o.contextId)?.name??"":"";return E`<div id="context-pop" class="comment-pop context-pop" popover="manual">
      <span class="af-label">
        ${o.kind==="create-context"?"\u65B0\u3057\u3044\u5883\u754C\u3065\u3051\u3089\u308C\u305F\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8":"\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u540D\u3092\u5909\u66F4"}
      </span>
      <input
        id="context-name"
        class="af-input"
        type="text"
        placeholder="コンテキスト名"
        .value=${i}
        @keydown=${n=>{n.key==="Enter"&&this.#g(t,o),n.key==="Escape"&&(this.naming=void 0)}}
      />
      <div class="pop-actions">
        <button class="af-btn" type="button" @click=${()=>this.naming=void 0}>キャンセル</button>
        <button class="af-btn af-btn--accent" type="button" @click=${()=>this.#g(t,o)}>
          ${o.kind==="create-context"?"\u4F5C\u6210":"\u4FDD\u5B58"}
        </button>
      </div>
    </div>`}#X(t,o){const i=this.#r(t.state,o),n=i===void 0?void 0:U(i);return E`<div id="append-menu" class="comment-pop append-menu" popover="manual">
      <span class="af-label">${n===void 0?"\u7D9A\u304D\u306B\u8FFD\u52A0\u3059\u308B\u4ED8\u7B8B":`\u300C${n.name}\u300D\u306E\u7D9A\u304D\u306B\u8FFD\u52A0`}</span>
      <div class="type-options">
        ${lo.map(a=>E`<button
              class="type-chip"
              type="button"
              data-type=${a}
              style=${rt(a)}
              @click=${()=>this.#N(t,o,a)}
            >
              ${X[a]}
            </button>`)}
      </div>
      <div class="pop-actions">
        <button class="af-btn" type="button" @click=${()=>this.mode=L}>キャンセル</button>
      </div>
    </div>`}#A(t){const o=_("new-event",q(t.state));if(!t.dispatch(y.addElement(o,"event",X.event)).ok){this.mode=L;return}t.navigate({note:o}),this.mode={kind:"editing",noteId:o}}}const ho=264,de=(e="artifact-event-storming")=>{Bt(),customElements.get(e)||customElements.define(e,re)},mo=Object.freeze(Object.defineProperty({__proto__:null,ES_IDLE:L,EsNoteCard:Pt,EventStormingElement:re,NOTE_TYPES:H,NOTE_TYPE_LABELS:X,ZOOM_MAX:Rt,ZOOM_MIN:dt,allNoteIds:q,applyEventStormingAction:It,attachAnchor:St,buildSlices:D,connectionEndpoints:Lt,constrainViewport:qt,defineEsNoteCard:Bt,defineEventStormingElement:de,describeEventStormingAction:_t,dropSide:Ut,emptyEventStormingBase:$t,eventStormingAction:y,eventStormingActions:w,eventStormingBaseSchema:wt,eventStormingCommentTargets:Ct,eventStormingDefinition:At,eventStormingHasTarget:Xt,eventStormingTargetLabel:Ot,eventStormingTitle:st,findContext:R,findLink:it,findNote:C,fitViewport:Kt,hitRect:ct,noteCardModeOf:jt,panBy:Yt,parseEventStormingBase:kt,planSliceBands:Nt,rectsInBand:Wt,reduceNoteIntent:Ht,resolveEventStormingNavigation:Dt,sameSlice:Z,serializeEventStormingAction:zt,sliceArrows:Mt,sliceMovePlan:pt,sliceMoveSteps:Vt,sliceVoice:U,zoomAt:lt},Symbol.toStringTag,{value:"Module"}));export{de as d,mo as i};
