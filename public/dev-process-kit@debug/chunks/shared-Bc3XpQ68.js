import{a4 as ie,a5 as U,a6 as G,a7 as tt,ai as L,aj as R,aa as N,ab as _,a8 as y,a9 as F,r as S,ak as M,w as et,al as ct,Q as ae,g as se,V as H,S as T,$ as pt,a3 as re,l as de,am as ht,a0 as k,a1 as u,J as le,D as ce,an as j,H as pe,L as he,j as me,a2 as mt,ah as X,c as ut,n as P,B as ft}from"./shared-BK58el9_.js";import{P as gt,r as ue,p as fe,a as ge}from"./shared-CC2bnOpD.js";import{o as xt}from"./shared-Da_AA5_Q.js";import{c as xe}from"./shared-DPcZakya.js";function be(e,t){let o=0;for(let i=0;i<e.length;i++)o+=t(e[i],i);return o}const B=["actor","command","aggregate","event","policy","readmodel","external","hotspot"],ve=U({id:R,name:N(y(),_(1)),description:L(y())}),ye=U({id:R,type:F(B),name:N(y(),_(1)),description:L(y()),contextId:L(y())}),Ee=U({id:R,from:N(y(),_(1)),to:N(y(),_(1)),label:L(y()),kind:L(F(["member","flow"]))}),bt=U({title:L(y()),contexts:G(tt(ve),[]),elements:G(tt(ye),[]),links:G(tt(Ee),[])}),vt=e=>{const t=ie(bt,e),o=new Set(t.elements.map(n=>n.id)),i=new Set(t.contexts.map(n=>n.id));for(const n of t.elements)if(n.contextId!==void 0&&!i.has(n.contextId))throw new Error(`unknown context "${n.contextId}" for note "${n.id}"`);for(const n of t.links){if(!o.has(n.from))throw new Error(`unknown note "${n.from}" in link "${n.id}"`);if(!o.has(n.to))throw new Error(`unknown note "${n.to}" in link "${n.id}"`)}return t},yt=()=>({contexts:[],elements:[],links:[]}),Y=(e,t)=>{if(t!==void 0)return e.elements.find(o=>o.id===t)},K=(e,t)=>{if(t!==void 0)return e.contexts.find(o=>o.id===t)},ot=(e,t)=>{if(t!==void 0)return e.links.find(o=>o.id===t)},V=e=>e.elements.map(t=>t.id),w={SET_ELEMENT_NAME:S("SET_ELEMENT_NAME","element",M({name:N(y(),_(1))})),SET_ELEMENT_DESCRIPTION:S("SET_ELEMENT_DESCRIPTION","element",M({description:y()})),SET_ELEMENT_TYPE:S("SET_ELEMENT_TYPE","element",M({type:F(B)})),SET_ELEMENT_CONTEXT:S("SET_ELEMENT_CONTEXT","element",M({contextId:ct(y())})),MOVE_ELEMENT:S("MOVE_ELEMENT","element",M({after:ct(y())}),{mode:"sequence"}),ADD_ELEMENT:S("ADD_ELEMENT","artifact",M({id:R,type:F(B),name:N(y(),_(1)),description:L(y()),contextId:L(y())}),{dedupeKey:et}),DELETE_ELEMENT:S("DELETE_ELEMENT","element",M({})),LINK_ELEMENTS:S("LINK_ELEMENTS","artifact",M({id:R,from:N(y(),_(1)),to:N(y(),_(1)),label:L(y()),kind:L(F(["member","flow"]))}),{dedupeKey:et}),SET_LINK_LABEL:S("SET_LINK_LABEL","link",M({label:y()})),UNLINK_ELEMENTS:S("UNLINK_ELEMENTS","artifact",M({from:N(y(),_(1)),to:N(y(),_(1))}),{mode:"sequence"}),ADD_CONTEXT:S("ADD_CONTEXT","artifact",M({id:R,name:N(y(),_(1)),description:L(y())}),{dedupeKey:et}),SET_CONTEXT_NAME:S("SET_CONTEXT_NAME","context",M({name:N(y(),_(1))})),DELETE_CONTEXT:S("DELETE_CONTEXT","context",M({}))},$={setElementName:(e,t)=>({type:"SET_ELEMENT_NAME",target:{type:"element",id:e},payload:{name:t}}),setElementDescription:(e,t)=>({type:"SET_ELEMENT_DESCRIPTION",target:{type:"element",id:e},payload:{description:t}}),setElementType:(e,t)=>({type:"SET_ELEMENT_TYPE",target:{type:"element",id:e},payload:{type:t}}),setElementContext:(e,t)=>({type:"SET_ELEMENT_CONTEXT",target:{type:"element",id:e},payload:{contextId:t}}),moveElement:(e,t)=>({type:"MOVE_ELEMENT",target:{type:"element",id:e},payload:{after:t}}),addElement:(e,t,o)=>({type:"ADD_ELEMENT",target:{type:"artifact",id:"event-storming"},payload:{id:e,type:t,name:o}}),deleteElement:e=>({type:"DELETE_ELEMENT",target:{type:"element",id:e},payload:{}}),linkElements:(e,t,o,i)=>({type:"LINK_ELEMENTS",target:{type:"artifact",id:"event-storming"},payload:{id:e,from:t,to:o,...i?.label===void 0?{}:{label:i.label},...i?.kind===void 0?{}:{kind:i.kind}}}),setLinkLabel:(e,t)=>({type:"SET_LINK_LABEL",target:{type:"link",id:e},payload:{label:t}}),unlinkElements:(e,t)=>({type:"UNLINK_ELEMENTS",target:{type:"artifact",id:"event-storming"},payload:{from:e,to:t}}),addContext:(e,t)=>({type:"ADD_CONTEXT",target:{type:"artifact",id:"event-storming"},payload:{id:e,name:t}}),setContextName:(e,t)=>({type:"SET_CONTEXT_NAME",target:{type:"context",id:e},payload:{name:t}}),deleteContext:e=>({type:"DELETE_CONTEXT",target:{type:"context",id:e},payload:{}})},Et=(e,t)=>{const o=ae(w,t);if(o===null)return null;const i=o.target.id;switch(o.type){case"SET_ELEMENT_NAME":return Q(e,i,n=>({...n,name:o.payload.name}));case"SET_ELEMENT_DESCRIPTION":return Q(e,i,n=>({...n,description:o.payload.description}));case"SET_ELEMENT_TYPE":return Q(e,i,n=>({...n,type:o.payload.type}));case"SET_ELEMENT_CONTEXT":{const{contextId:n}=o.payload;return n!==null&&!e.contexts.some(a=>a.id===n)?null:Q(e,i,a=>n===null?$t(a):{...a,contextId:n})}case"MOVE_ELEMENT":{const{after:n}=o.payload,a=$e(e.elements,i,n);return a===null?null:{...e,elements:a}}case"ADD_ELEMENT":{const n=o.payload;if(e.elements.some(d=>d.id===n.id))return e;if(n.contextId!==void 0&&!e.contexts.some(d=>d.id===n.contextId))return null;const a={id:n.id,type:n.type,name:n.name,...n.description===void 0?{}:{description:n.description},...n.contextId===void 0?{}:{contextId:n.contextId}};return{...e,elements:[...e.elements,a]}}case"DELETE_ELEMENT":return e.elements.some(n=>n.id===i)?{...e,elements:e.elements.filter(n=>n.id!==i),links:e.links.filter(n=>n.from!==i&&n.to!==i)}:null;case"LINK_ELEMENTS":{const n=o.payload;return e.links.some(a=>a.id===n.id)?e:!e.elements.some(a=>a.id===n.from)||!e.elements.some(a=>a.id===n.to)?null:{...e,links:[...e.links,{id:n.id,from:n.from,to:n.to,...n.label===void 0?{}:{label:n.label},...n.kind===void 0?{}:{kind:n.kind}}]}}case"SET_LINK_LABEL":return e.links.some(n=>n.id===i)?{...e,links:e.links.map(n=>n.id===i?{...n,label:o.payload.label}:n)}:null;case"UNLINK_ELEMENTS":{const n=o.payload;return e.links.some(a=>a.from===n.from&&a.to===n.to)?{...e,links:e.links.filter(a=>!(a.from===n.from&&a.to===n.to))}:null}case"ADD_CONTEXT":{const n=o.payload;if(e.contexts.some(d=>d.id===n.id))return e;const a={id:n.id,name:n.name,...n.description===void 0?{}:{description:n.description}};return{...e,contexts:[...e.contexts,a]}}case"SET_CONTEXT_NAME":return e.contexts.some(n=>n.id===i)?{...e,contexts:e.contexts.map(n=>n.id===i?{...n,name:o.payload.name}:n)}:null;case"DELETE_CONTEXT":return e.contexts.some(n=>n.id===i)?{...e,contexts:e.contexts.filter(n=>n.id!==i),elements:e.elements.map(n=>n.contextId===i?$t(n):n)}:null;default:return se(o)}},$t=e=>{const t={...e};return delete t.contextId,t},Q=(e,t,o)=>e.elements.some(i=>i.id===t)?{...e,elements:e.elements.map(i=>i.id===t?o(i):i)}:null,$e=(e,t,o)=>{const i=e.findIndex(d=>d.id===t);if(i<0||o!==null&&!e.some(d=>d.id===o))return null;const n=e[i];if(n===void 0)return null;const a=[...e.filter(d=>d.id!==t)];return a.splice(o===null?0:a.findIndex(d=>d.id===o)+1,0,n),a},we={SET_ELEMENT_NAME:(e,t)=>({title:"\u8981\u7D20\u540D\u3092\u5909\u66F4",tone:"update",body:`"${Y(t,e.target.id)?.name??"?"}\u201C \u2192 "${T(w.SET_ELEMENT_NAME,e).name}"`}),SET_ELEMENT_DESCRIPTION:e=>({title:"\u8981\u7D20\u306E\u8AAC\u660E\u3092\u66F4\u65B0",tone:"update",body:`\u2192 "${T(w.SET_ELEMENT_DESCRIPTION,e).description.slice(0,60)}"`}),SET_ELEMENT_TYPE:e=>({title:"\u8981\u7D20\u306E\u7A2E\u5225\u3092\u5909\u66F4",tone:"update",body:`\u2192 ${T(w.SET_ELEMENT_TYPE,e).type}`}),SET_ELEMENT_CONTEXT:e=>({title:"\u6240\u5C5E\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u3092\u5909\u66F4",tone:"move",body:`\u2192 ${T(w.SET_ELEMENT_CONTEXT,e).contextId??"\u672A\u6240\u5C5E"}`}),MOVE_ELEMENT:e=>({title:"\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u4F4D\u7F6E\u3092\u5909\u66F4",tone:"move",body:T(w.MOVE_ELEMENT,e).after===null?"\u2192 \u5148\u982D\u3078":`\u2192 "${T(w.MOVE_ELEMENT,e).after}" \u306E\u76F4\u5F8C\u3078`}),ADD_ELEMENT:e=>({title:"\u8981\u7D20\u3092\u8FFD\u52A0",tone:"create",body:`+ "${T(w.ADD_ELEMENT,e).name}"`}),DELETE_ELEMENT:(e,t)=>({title:"\u8981\u7D20\u3092\u524A\u9664",tone:"delete",body:`\u2212 "${Y(t,e.target.id)?.name??e.target.id}"`}),LINK_ELEMENTS:e=>({title:"\u8981\u7D20\u3092\u9023\u7D50",tone:"create",body:`${T(w.LINK_ELEMENTS,e).from} \u2192 ${T(w.LINK_ELEMENTS,e).to}`}),SET_LINK_LABEL:e=>({title:"\u30EA\u30F3\u30AF\u540D\u3092\u5909\u66F4",tone:"update",body:`\u2192 "${T(w.SET_LINK_LABEL,e).label}"`}),UNLINK_ELEMENTS:e=>({title:"\u30EA\u30F3\u30AF\u3092\u524A\u9664",tone:"delete",body:`${T(w.UNLINK_ELEMENTS,e).from} \u2192 ${T(w.UNLINK_ELEMENTS,e).to}`}),ADD_CONTEXT:e=>({title:"\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u3092\u8FFD\u52A0",tone:"create",body:`+ "${T(w.ADD_CONTEXT,e).name}"`}),SET_CONTEXT_NAME:e=>({title:"\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u540D\u3092\u5909\u66F4",tone:"update",body:`\u2192 "${T(w.SET_CONTEXT_NAME,e).name}"`}),DELETE_CONTEXT:(e,t)=>({title:"\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u3092\u524A\u9664",tone:"delete",body:`\u2212 "${K(t,e.target.id)?.name??e.target.id}"`})},wt=(e,t,o)=>{const i=we[e.type],n=i?i(e,o??t):{title:e.type,tone:"meta"};return{title:n.title,targetLabel:Tt(t,e.target),tone:n.tone,...n.body===void 0?{}:{summary:n.body}}},kt=e=>`${e.type} ${H(e.target)} ${JSON.stringify(e.payload)}`,Tt=(e,t)=>{switch(t.type){case"element":{const o=Y(e,t.id);return o?`\u8981\u7D20 \xB7 ${o.name}`:`\u8981\u7D20 \xB7 ${t.id} (missing)`}case"context":{const o=K(e,t.id);return o?`\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8 \xB7 ${o.name}`:`\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8 \xB7 ${t.id} (missing)`}case"link":{const o=ot(e,t.id);return o?`\u30EA\u30F3\u30AF \xB7 ${o.from}\u2192${o.to}`:`\u30EA\u30F3\u30AF \xB7 ${t.id} (missing)`}case"artifact":return`Artifact \xB7 ${nt(e)}`;default:return`${t.type} \xB7 ${t.id}`}},It=e=>[...e.elements.map(t=>({value:H({type:"element",id:t.id}),label:t.name,group:"\u8981\u7D20"})),...e.contexts.map(t=>({value:H({type:"context",id:t.id}),label:t.name,group:"\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8"}))],ke=(e,t)=>{const o=e.elements.find(i=>i.id===t.note);return o?{value:H({type:"element",id:o.id}),label:o.name,group:"\u8981\u7D20"}:null},nt=e=>e.title??"Event Storming",St=(e,t)=>{const o={...t},i=Y(e,t.note);t.note!==void 0&&!i&&delete o.note;const n=K(e,t.context);return t.context!==void 0&&!n&&delete o.context,o},Mt=(e,t)=>{switch(t.type){case"element":return Y(e,t.id)!==void 0;case"context":return K(e,t.id)!==void 0;case"link":return ot(e,t.id)!==void 0;case"artifact":return!0;default:return!1}},Nt={name:"event-storming",label:"Event Storming",parseBase:vt,emptyBase:yt,actions:w,apply:Et,hasTarget:Mt,describe:wt,serialize:kt,resolveNavigation:St,commentTargets:(e,t)=>It(e),currentTarget:(e,t)=>ke(e,t),title:nt},Te={width:300,height:260},A={actor:"\u30A2\u30AF\u30BF\u30FC",command:"\u30B3\u30DE\u30F3\u30C9",aggregate:"\u96C6\u7D04",event:"\u30A4\u30D9\u30F3\u30C8",policy:"\u30DD\u30EA\u30B7\u30FC",readmodel:"\u30EA\u30FC\u30C9\u30E2\u30C7\u30EB",external:"\u5916\u90E8\u30B7\u30B9\u30C6\u30E0",hotspot:"\u30DB\u30C3\u30C8\u30B9\u30DD\u30C3\u30C8"},Ie=pt`
  :host {
    display: block;
    position: relative;
    box-sizing: border-box;
    padding: 7px 9px 8px;
    border-radius: 3px;
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
  :host([data-type='event']) {
    background: linear-gradient(178deg, #ffbc55, #f8a52e);
    color: #402703;
  }
  :host([data-type='command']) {
    background: linear-gradient(178deg, #93c9f2, #74b4e8);
    color: #0e2c4b;
  }
  :host([data-type='aggregate']) {
    background: linear-gradient(178deg, #fff3a6, #fdea7e);
    color: #4a3a06;
  }
  :host([data-type='actor']) {
    background: linear-gradient(178deg, #ffdf63, #fdd23e);
    color: #423204;
  }
  :host([data-type='policy']) {
    background: linear-gradient(178deg, #dcc2f7, #c9a6f0);
    color: #32195c;
  }
  :host([data-type='readmodel']) {
    background: linear-gradient(178deg, #c0e788, #a8dc63);
    color: #22380a;
  }
  :host([data-type='external']) {
    background: linear-gradient(178deg, #f9bcd3, #f4a0c0);
    color: #4b1029;
  }
  :host([data-type='hotspot']) {
    background: linear-gradient(178deg, #f04f60, #e02c44);
    color: #ffe9ec;
  }

  .note-type {
    font-family: var(--af-mono);
    font-size: 8.5px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.66;
    margin-bottom: 3px;
  }

  .note-name {
    font-size: 13px;
    font-weight: 680;
    line-height: 1.3;
    letter-spacing: -0.01em;
    overflow-wrap: anywhere;
  }

  .note-desc {
    margin-top: 3px;
    font-size: 10.5px;
    line-height: 1.45;
    opacity: 0.82;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    overflow-wrap: anywhere;
  }

  /* Editing needs room: the card grows over the wall instead of reflowing it. */
  :host([data-mode='editing']) {
    height: auto !important;
    min-height: 100%;
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

  .note-tools {
    position: absolute;
    left: 3px;
    right: 3px;
    bottom: 3px;
    display: flex;
    justify-content: flex-end;
    gap: 1px;
    padding: 2px;
    border-radius: 4px;
    background: color-mix(in srgb, var(--af-paper-raised) 88%, transparent);
    backdrop-filter: blur(2px);
    box-shadow: var(--af-shadow-xs);
    opacity: 0;
    transition: opacity 140ms ease;
  }

  :host(:hover) .note-tools,
  :host([data-mode='editing']) .note-tools,
  :host([data-mode='commenting']) .note-tools {
    opacity: 1;
  }

  .note-tools .af-icon-btn {
    width: 22px;
    height: 22px;
  }
`;class _t extends re{static{this.styles=[de,Ie,ht]}static{this.properties={note:{attribute:!1},notes:{attribute:!1},mode:{type:String,reflect:!0,attribute:"data-mode"},focused:{type:Boolean,reflect:!0},onIntent:{attribute:!1}}}#t="";#s=new gt(this);constructor(){super(),this.note=null,this.notes=[],this.mode="view",this.focused=!1,this.onIntent=null,this.addEventListener("click",()=>this.#e({kind:"select"}))}updated(t){if(t.has("note")&&this.note&&this.setAttribute("data-type",this.note.type),t.has("mode")&&(this.mode!=="commenting"&&(this.#t=""),this.mode==="editing"&&this.renderRoot.querySelector("artifact-inline-edit")?.startEditing()),this.mode!=="commenting")return;const o=this.renderRoot.querySelector(".comment-pop"),i=this.renderRoot.querySelector('[data-role="comment"]');o&&i&&this.#s.open(o,i,Te)}render(){const t=this.note;if(!t)return k;const o=this.mode==="editing";return u`
      <div class="note-type">${A[t.type]}</div>
      ${o?u`<artifact-inline-edit
                class="note-name"
                .value=${t.name}
                .label=${"\u4ED8\u7B8B\u540D"}
                @artifact-commit=${xt(i=>this.#e({kind:"rename",name:i}))}
              ></artifact-inline-edit>
              <artifact-inline-edit
                class="note-desc"
                multiline
                .value=${t.description??""}
                .placeholder=${"\u8AAC\u660E\uFF08\u30AF\u30EA\u30C3\u30AF\u3057\u3066\u7DE8\u96C6\uFF09"}
                .label=${"\u8AAC\u660E"}
                @artifact-commit=${xt(i=>this.#e({kind:"describe",description:i}))}
              ></artifact-inline-edit>`:u`<div class="note-name">${t.name}</div>
              ${t.description?u`<div class="note-desc">${t.description}</div>`:k}`}
      ${this.notes.length>0?u`<span class="note-flag">${this.notes.length}</span>`:k}
      <div class="note-tools">
        <button
          class="af-icon-btn"
          type="button"
          data-role="edit"
          aria-label="名前と説明を編集"
          data-active=${String(o)}
          @click=${this.#o(()=>({kind:"toggle-edit"}))}
        >
          ${le()}
        </button>
        <button
          class="af-icon-btn"
          type="button"
          data-role="comment"
          aria-label="コメント"
          data-active=${String(this.mode==="commenting")}
          @click=${this.#o(()=>({kind:"toggle-comment"}))}
        >
          ${ce()}
        </button>
        <button
          class="af-icon-btn"
          type="button"
          data-role="detail"
          aria-label="種別・コンテキスト・リンクを編集"
          @click=${this.#o(i=>{const n=j(i.currentTarget,HTMLElement)?.getBoundingClientRect();return n===void 0?{kind:"dismiss"}:{kind:"detail",point:{x:n.left,y:n.bottom+4}}})}
        >
          ${pe()}
        </button>
        <button
          class="af-icon-btn"
          type="button"
          data-role="delete"
          aria-label="削除"
          @click=${this.#o(()=>({kind:"delete"}))}
        >
          ${he()}
        </button>
      </div>
      ${this.mode==="commenting"?this.#i():k}
    `}#i(){return ue(fe(this.#t,this.notes.map(me)),t=>{t.kind==="input"?(this.#t=t.body,this.requestUpdate()):this.#e(t)})}#o(t){return o=>{o.stopPropagation(),this.#e(t(o))}}#e(t){this.onIntent?.(t)}}const Lt=(e="artifact-es-note")=>{customElements.get(e)||customElements.define(e,_t)},it=.25,zt=2,Ct=(e,t,o)=>({...e,panX:e.panX+t,panY:e.panY+o}),at=(e,t,o,i)=>{const n=xe(e.zoom*i,it,zt),a=(t-e.panX)/e.zoom,d=(o-e.panY)/e.zoom;return{panX:t-a*n,panY:o-d*n,zoom:n}},Ot=(e,t,o)=>{const i=Math.max(1,t.width-o*2),n=Math.max(1,t.height-o*2),a=Math.max(it,Math.min(1,i/Math.max(1,e.width),n/Math.max(1,e.height)));return{panX:(t.width-e.width*a)/2,panY:(t.height-e.height*a)/2,zoom:a}},Se=(e,t,o)=>t>=e.left&&t<=e.left+e.width&&o>=e.top&&o<=e.top+e.height,st=(e,t,o)=>{for(let i=e.length-1;i>=0;i-=1){const n=e[i];if(n!==void 0&&Se(n.rect,t,o))return n.id}},Dt=(e,t)=>t<e.left+e.width/2?"before":"after",At=(e,t)=>e.filter(({rect:o})=>o.left<t.left+t.width&&t.left<o.left+o.width&&o.top<t.top+t.height&&t.top<o.top+o.height).map(({id:o})=>o),Xt=(e,t,o,i)=>{const n=new Set(t);if(o.some(s=>n.has(s)))return[];const a=e.filter(s=>!n.has(s)),d=o.map(s=>a.indexOf(s)).filter(s=>s>=0);if(d.length===0)return[];const r=i==="before"?Math.min(...d):Math.max(...d)+1,l=[];let c=a[r-1]??null;for(const s of e)n.has(s)&&(l.push({id:s,after:c}),c=s);return l},Pt=(e,t,o,i=4)=>{if(t.pointerId!==e.pointerId)return e;const{point:n}=t,a={pointerId:e.pointerId,start:e.start,current:n,moved:e.moved||Math.hypot(n.x-e.start.x,n.y-e.start.y)>i},d=st(o,n.x,n.y);switch(e.kind){case"connect":return{...a,kind:"connect",fromSliceId:e.fromSliceId,...d!==void 0&&d!==e.fromSliceId?{targetSliceId:d}:{}};case"move-slice":{const r=o.find(l=>l.id===d)?.rect;return{...a,kind:"move-slice",sliceId:e.sliceId,...d!==void 0&&d!==e.sliceId&&r!==void 0?{drop:{sliceId:d,side:Dt(r,n.x)}}:{}}}case"select":return{...a,kind:"select"}}},Me=new Set(["actor>command","command>aggregate","aggregate>event","command>event","policy>command","external>event"]),J=(e,t)=>Me.has(`${e}>${t}`),Ne=(e,t,o)=>e.kind!==void 0?e.kind==="member":J(t,o),_e=["readmodel","actor","policy","command","aggregate","external","event","hotspot"],W=e=>{const t=new Map(e.elements.map(r=>[r.id,r.type])),o=new Map(e.elements.map(r=>[r.id,r.id])),i=r=>{let l=r;for(;o.get(l)!==l;)l=o.get(l)??l;let c=r;for(;c!==l;){const s=o.get(c)??l;o.set(c,l),c=s}return l};for(const r of e.links){const l=t.get(r.from),c=t.get(r.to);l===void 0||c===void 0||Ne(r,l,c)&&o.set(i(r.from),i(r.to))}const n=new Map;for(const r of e.elements){const l=i(r.id),c=n.get(l);c?c.push(r):n.set(l,[r])}const a=new Map(_e.map((r,l)=>[r,l])),d=new Map(e.elements.map((r,l)=>[r.id,l]));return[...n.values()].map(r=>{const l=[...r].sort((p,x)=>(a.get(p.type)??0)-(a.get(x.type)??0)||(d.get(p.id)??0)-(d.get(x.id)??0)),c=l.filter(p=>p.type!=="hotspot"),s=c.length===0?[]:l.filter(p=>p.type==="hotspot");return{id:r[0]?.id??"",notes:c.length===0?l:c,hotspots:s,contextId:r.find(p=>p.contextId!==void 0)?.contextId}})},Rt=(e,t)=>{const o=[...e.notes,...e.hotspots],i=o.find(d=>J(t,d.type));if(i!==void 0)return{anchorId:i.id,incoming:!0};const n=o.find(d=>J(d.type,t));if(n!==void 0)return{anchorId:n.id,incoming:!1};const a=o[0];return a===void 0?void 0:{anchorId:a.id,incoming:!0}},Bt=(e,t)=>{const o=new Map(t.flatMap(i=>[...i.notes,...i.hotspots].map(n=>[n.id,i.id])));return e.links.flatMap(i=>{const n=o.get(i.from),a=o.get(i.to);return n===void 0||a===void 0||n===a?[]:[{id:i.id,from:n,to:a,...i.label!==void 0?{label:i.label}:{}}]})},Yt=(e,t)=>{const o=new Map(e.map((s,p)=>[s.id,p])),i=new Map,n=new Map,a=[];for(const s of t){if(s.from===s.to||!o.has(s.from)||!o.has(s.to))continue;if(i.has(s.to)){a.push(s);continue}i.set(s.to,s);const p=n.get(s.from);p?p.push(s):n.set(s.from,[s])}const d=new Set,r=s=>{d.add(s);const p=(n.get(s)??[]).filter(x=>d.has(x.to)?(a.push(x),!1):!0).sort((x,E)=>(o.get(x.to)??0)-(o.get(E.to)??0));return{sliceId:s,children:p.map(x=>({arrow:x,node:r(x.to)}))}},l=e.filter(s=>!i.has(s.id)).map(s=>r(s.id)),c=[];for(const s of e)d.has(s.id)||c.push(r(s.id));return{roots:[...l,...c],extraArrows:a}},Kt=(e,t)=>{const{widthOf:o,sliceHeight:i,gapX:n,gapY:a,maxWidth:d}=t,r=e.roots.map(c=>({node:c})),l=[];for(;r.length>0;){const c=r.shift();if(!c)break;const s=[],p=(g,v)=>{const C=v+o(g.sliceId)+n,O=g.children.flatMap(D=>C+o(D.node.sliceId)>d?(s.push({node:D.node,continuedFrom:D.arrow}),[]):[{arrow:D.arrow,node:p(D.node,C)}]);return{sliceId:g.sliceId,x:v,children:O}},x=p(c.node,0),E=g=>g.children.length===0?i:Math.max(i,be(g.children,v=>E(v.node))+a*(g.children.length-1)),h=[],f=[];let b=0;const m=(g,v)=>{const C=E(g);h.push({sliceId:g.sliceId,x:g.x,y:v+(C-i)/2}),b=Math.max(b,g.x+o(g.sliceId));let O=v;for(const D of g.children)f.push(D.arrow),m(D.node,O),O+=E(D.node)+a};m(x,0),l.push({placements:h,edges:f,width:b,height:E(x),...c.continuedFrom!==void 0?{continuedFrom:c.continuedFrom}:{}}),r.unshift(...s)}return l},Wt=(e,t,o)=>{const i=[];let n=0,a=0,d=0;for(const r of e){const l=a===0?r.width:d+t+r.width;a>0&&(l>o||r.continuedFrom!==void 0)?(i.push({start:n,count:a}),n+=a,a=1,d=r.width):(a+=1,d=l)}return a>0&&i.push({start:n,count:a}),i},rt=e=>[...e.notes].reverse().find(t=>t.type==="event")??e.notes.at(-1),Ft=(e,t)=>{const o=rt(e),i=t.notes[0];if(!(o===void 0||i===void 0))return{from:o.id,to:i.id}},z={kind:"idle"},jt=(e,t)=>e.kind==="editing"&&e.noteId===t?"editing":e.kind==="commenting"&&e.noteId===t?"commenting":"view",qt=(e,t,o)=>{switch(o.kind){case"toggle-edit":return e.kind==="editing"&&e.noteId===t?z:{kind:"editing",noteId:t};case"toggle-comment":return e.kind==="commenting"&&e.noteId===t?z:{kind:"commenting",noteId:t};case"detail":return e.kind==="detail"&&e.noteId===t?z:{kind:"detail",noteId:t,point:o.point};case"comment":case"delete":case"dismiss":return z;case"select":case"rename":case"describe":return e}},dt=132,Ut=96,Ht=10,Z=12,I=Ut+Z*2,q=46,Le=40,Vt=16,Qt=44,Jt=40,Zt=13,lt=104,ze=64,Ce=40,Oe=["actor","command","aggregate","event","readmodel"],Gt=e=>Z*2+e*dt+(e-1)*Ht,De=(e,t,o)=>{const i=new Map(t.map(E=>[E.id,Gt(E.notes.length)])),n=Bt(e,t),a=Yt(t,n),d=Math.max(o,Gt(1)),r=Kt(a,{widthOf:E=>i.get(E)??0,sliceHeight:I,gapX:q,gapY:Le,maxWidth:d}),l=Wt(r,q,d),c=new Map,s=l.map((E,h)=>{const f=r.slice(E.start,E.start+E.count),b=[],m=[];let g=Vt,v=I;for(const C of f){for(const O of C.placements)c.set(O.sliceId,{x:g+O.x,y:Qt+O.y,band:h}),b.push(O.sliceId);m.push(...C.edges),v=Math.max(v,C.height),g+=C.width+q}return{sliceIds:b,edges:m,width:g-q+Vt,height:Qt+v+Jt,continuedFrom:f[0]?.continuedFrom}}),p=new Map,x=[...a.extraArrows];return s.forEach((E,h)=>{const f=E.continuedFrom;f!==void 0&&(c.get(f.from)?.band===h-1?p.set(h-1,f):x.push(f))}),{slices:t,bands:s,pos:c,widthOf:i,looseArrows:x,carried:p}},Ae=e=>{const{context:t,maxRowWidth:o,viewport:i,handlers:n}=e,{state:a}=t,d=24*i.zoom,r=`background-size:${d}px ${d}px;background-position:${i.panX}px ${i.panY}px`;if(a.elements.length===0)return u`<div class="board-viewport board-viewport--empty" style=${r}>
      <div class="empty">
        <h2>付箋がまだありません</h2>
        <p>イベントストーミングを開始しましょう。ドメインイベントを時系列に貼るところから始めます。</p>
        <button class="af-btn af-btn--accent" type="button" @click=${()=>n.addFirst()}>
          ＋ 最初のイベント
        </button>
      </div>
    </div>`;const l=W(a),c=De(a,l,o),s=Xe(c);return u`
    <div
      class="board-viewport${e.gesture!==void 0?" board-viewport--gesturing":""}"
      data-testid="es-viewport"
      style=${r}
      @pointerdown=${n.viewportPointerDown}
      @pointermove=${n.viewportPointerMove}
      @pointerup=${n.viewportPointerUp}
      @pointercancel=${n.viewportPointerCancel}
      @pointerleave=${n.viewportPointerLeave}
      @wheel=${n.viewportWheel}
    >
      <div
        class="board-content"
        style=${`transform:translate(${i.panX}px, ${i.panY}px) scale(${i.zoom})`}
      >
        <div class="wall" data-testid="es-wall">
          ${c.bands.map((p,x)=>u`
              ${x>0?Pe(c.carried.get(x-1)):k}
              ${Be(e,c,p,x,s)}
            `)}
        </div>
      </div>
      ${Ke(e.gesture)} ${We(a,l)} ${Fe(e)}
      ${je(e)}
    </div>
  `},Xe=e=>{const t=new Map;for(const o of e.looseArrows){const i=e.pos.get(o.from),n=e.pos.get(o.to);i===void 0||n===void 0||i.band===n.band||t.set(o.id,t.size+1)}return t},Pe=e=>u`<div class="band-wrap-mark">つづき${e?.label!==void 0?` \xB7 ${e.label}`:""}</div>`,Re=(e,t)=>{const o=["slice"];e.selectedSliceIds.includes(t.id)&&o.push("slice--selected");const i=e.gesture;return i?.kind==="connect"&&i.moved&&(i.fromSliceId!==t.id&&o.push("slice--candidate"),i.targetSliceId===t.id&&o.push("slice--target")),i?.kind==="move-slice"&&i.moved&&(i.sliceId===t.id&&o.push("slice--lifted"),i.drop?.sliceId===t.id&&o.push(i.drop.side==="before"?"slice--insert-before":"slice--insert-after")),o.join(" ")},Be=(e,t,o,i,n)=>{const{context:a,mode:d,gesture:r,hoverSliceId:l,handlers:c}=e,{navigation:s}=a,p=o.sliceIds.flatMap(h=>t.slices.filter(f=>f.id===h)),x=h=>{const f=t.pos.get(h.id);return{x:f?.x??0,y:f?.y??0,w:t.widthOf.get(h.id)??0}},E=(h,f)=>u`<artifact-es-note
      style=${f}
      .note=${h}
      .notes=${a.comments.filter(b=>b.target.type==="element"&&b.target.id===h.id)}
      .mode=${jt(d,h.id)}
      ?focused=${s.note===h.id}
      .onIntent=${b=>c.noteIntent(h.id,b)}
    ></artifact-es-note>`;return u`
    <section class="band">
      <div class="band-canvas" style=${`width:${o.width}px;height:${o.height}px`}>
        ${Ye(e,t,i)}
        ${p.map(h=>{const{x:f,y:b,w:m}=x(h);return u`<div
            class=${Re(e,h)}
            data-slice-id=${h.id}
            style=${`left:${f}px;top:${b}px;width:${m}px;height:${I}px`}
            @pointerdown=${g=>c.slicePointerDown(h.id,g)}
          ></div>`})}
        <svg class="links-layer" width=${o.width} height=${o.height} aria-hidden="true">
          ${qe(i)} ${Ue(t,o,i,n)}
        </svg>
        ${mt(p.flatMap(h=>h.notes.map((f,b)=>({slice:h,note:f,slot:b}))),({note:h})=>h.id,({slice:h,note:f,slot:b})=>{const{x:m,y:g}=x(h),v=m+Z+b*(dt+Ht);return E(f,`position:absolute;left:${v}px;top:${g+Z}px;width:${dt}px;height:${Ut}px;--es-tilt:${Qe(f.id)}deg;z-index:2`)})}
        ${mt(p.flatMap(h=>h.hotspots.map((f,b)=>({slice:h,note:f,index:b}))),({note:h})=>h.id,({slice:h,note:f,index:b})=>{const{x:m,y:g,w:v}=x(h);return E(f,`position:absolute;left:${m+v-lt-8-b*(lt-24)}px;top:${g-Ce}px;width:${lt}px;height:${ze}px;--es-tilt:-2.4deg;z-index:3`)})}
        ${p.map(h=>{const{x:f,y:b,w:m}=x(h),g=l===h.id||r?.kind==="connect"&&r.fromSliceId===h.id;return u`<button
            class="slice-port${g?" slice-port--on":""}"
            type="button"
            style=${`left:${f+m-Zt}px;top:${b+I/2-Zt}px`}
            aria-label="続きを追加（ドラッグで他のスライスへ接続）"
            title="クリック: 続きのイベントを追加 / ドラッグ: 他のスライスへ接続"
            @pointerdown=${v=>c.portPointerDown(h.id,v)}
          >
            →
          </button>`})}
        ${p.map(h=>{if(l!==h.id||r!==void 0)return k;const{x:f,y:b}=x(h),m=new Set(h.notes.map(v=>v.type)),g=Oe.filter(v=>!m.has(v));return u`<div
            class="slice-chips"
            style=${`left:${f}px;top:${b+I+6}px`}
            @pointerdown=${v=>v.stopPropagation()}
          >
            ${g.map(v=>u`<button class="slice-chip" type="button" @click=${()=>c.attachNote(h.id,v)}>
                  ＋ ${A[v]}
                </button>`)}
            <button
              class="slice-chip slice-chip--hotspot"
              type="button"
              @click=${()=>c.attachNote(h.id,"hotspot")}
            >
              ＋ ${A.hotspot}
            </button>
          </div>`})}
      </div>
    </section>
  `},Ye=(e,t,o)=>{const{context:i,handlers:n}=e,a=i.state.contexts.flatMap((d,r)=>{const l=t.slices.filter(m=>m.contextId===d.id).flatMap(m=>{const g=t.pos.get(m.id);return g===void 0?[]:[{at:g,width:t.widthOf.get(m.id)??0}]}),c=l.filter(({at:m})=>m.band===o);if(c.length===0)return[];const s=Math.min(...c.map(({at:m})=>m.x))-10,p=Math.max(...c.map(({at:m,width:g})=>m.x+g))+10,x=Math.max(4,Math.min(...c.map(({at:m})=>m.y))-30),E=Math.max(...c.map(({at:m})=>m.y))+I+12,h=l.some(({at:m})=>m.band<o)?"\u2026 ":"",f=l.some(({at:m})=>m.band>o)?" \u2026":"",b=String(r%5);return[u`<div
          class="context-region"
          data-hue=${b}
          style=${`left:${s}px;top:${x}px;width:${p-s}px;height:${E-x}px`}
          title=${d.description??d.name}
        ></div>
        <div
          class="context-label"
          data-hue=${b}
          style=${`left:${s+10}px;top:${x}px`}
          @pointerdown=${m=>m.stopPropagation()}
        >
          <button
            class="context-label-name"
            type="button"
            title="クリックして名前を変更"
            @click=${m=>n.renameContext(d.id,{x:m.clientX,y:m.clientY})}
          >
            ${h}${d.name}${f}
          </button>
          <button
            class="context-label-x"
            type="button"
            aria-label=${`\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u300C${d.name}\u300D\u3092\u89E3\u4F53`}
            title="コンテキストを解体（付箋は残ります）"
            @click=${()=>n.dissolveContext(d.id)}
          >
            ✕
          </button>
        </div>`]});return a.length>0?u`${a}`:k},Ke=e=>{if(e===void 0||!e.moved)return k;if(e.kind==="connect")return u`<svg class="gesture-layer" aria-hidden="true">
      ${X`<path class="connect-line" d=${`M ${e.start.x} ${e.start.y} L ${e.current.x} ${e.current.y}`}></path>
      <circle class="connect-tip" cx=${e.current.x} cy=${e.current.y} r="5"></circle>`}
    </svg>`;if(e.kind==="select"){const t=Math.min(e.start.x,e.current.x),o=Math.min(e.start.y,e.current.y),i=Math.abs(e.current.x-e.start.x),n=Math.abs(e.current.y-e.start.y);return u`<div
      class="select-rect"
      style=${`left:${t}px;top:${o}px;width:${i}px;height:${n}px`}
    ></div>`}return k},We=(e,t)=>u`<div class="board-hud">
    <span>${e.elements.length} 付箋</span>
    <span>${t.length} スライス</span>
    <span>${e.contexts.length} コンテキスト</span>
    <span class="board-hint">ホイール: 移動 · ピンチ: ズーム · 背景ドラッグ: 範囲選択</span>
  </div>`,Fe=e=>{const{viewport:t,handlers:o}=e;return u`<div class="board-zoom" @pointerdown=${i=>i.stopPropagation()}>
    <button type="button" aria-label="縮小" @click=${()=>o.zoomStep(-1)}>−</button>
    <button type="button" class="board-zoom-pct" title="100% に戻す" @click=${()=>o.zoomReset()}>
      ${Math.round(t.zoom*100)}%
    </button>
    <button type="button" aria-label="拡大" @click=${()=>o.zoomStep(1)}>＋</button>
    <button type="button" aria-label="全体を表示" title="全体を表示" @click=${()=>o.zoomFit()}>⛶</button>
  </div>`},je=e=>{const{context:t,selectedSliceIds:o,handlers:i}=e;if(o.length===0)return k;const n=t.state.contexts;return u`<div class="board-selection" @pointerdown=${a=>a.stopPropagation()}>
    <span class="board-selection-count">${o.length} スライスを選択中</span>
    <button
      class="af-btn af-btn--accent"
      type="button"
      @click=${a=>i.groupSelection({x:a.clientX,y:a.clientY})}
    >
      コンテキストにまとめる
    </button>
    ${n.length>0?u`<select
            class="af-select"
            aria-label="既存コンテキストへ追加"
            @change=${a=>{const d=j(a.target,HTMLSelectElement);d!==null&&(d.value!==""&&i.assignSelection(d.value),d.value="")}}
          >
            <option value="" selected>既存へ追加…</option>
            ${n.map(a=>u`<option value=${a.id}>${a.name}</option>`)}
          </select>`:k}
    <button class="af-btn" type="button" @click=${()=>i.stripSelectionContext()}>コンテキスト解除</button>
    <button class="af-icon-btn" type="button" aria-label="選択解除" @click=${()=>i.clearSelection()}>✕</button>
  </div>`},te=(e,t,o,i)=>({d:`M ${e.x} ${e.y} C ${t.x} ${t.y}, ${o.x} ${o.y}, ${i.x} ${i.y}`,mid:{x:(e.x+3*t.x+3*o.x+i.x)/8,y:(e.y+3*t.y+3*o.y+i.y)/8}}),qe=e=>X`<defs>
    <marker id=${`es-arrow-${e}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L8,4 L0,8 z"></path>
    </marker>
  </defs>`,Ue=(e,t,o,i)=>{const n=`url(#es-arrow-${o})`,a=[],d=r=>{const l=e.pos.get(r.from),c=e.pos.get(r.to);if(!(l===void 0||c===void 0))return{from:l,to:c,fromWidth:e.widthOf.get(r.from)??0,toWidth:e.widthOf.get(r.to)??0}};for(const r of t.edges){const l=d(r);if(l===void 0)continue;const c={x:l.from.x+l.fromWidth,y:l.from.y+I/2},s={x:l.to.x,y:l.to.y+I/2},p=He(c,s);a.push(X`<path class="link-path" d=${p.d} marker-end=${n}></path>`),r.label!==void 0&&a.push(X`<text class="link-label" x=${p.mid.x} y=${p.mid.y-6} text-anchor="middle">${r.label}</text>`)}for(const r of e.looseArrows){const l=d(r);if(l===void 0)continue;const c=i.get(r.id);if(c===void 0&&l.from.band===o&&l.to.band===o){const s=Ve(l.from,l.fromWidth,l.to,l.toWidth,t.height);if(s===void 0)continue;a.push(X`<path class="link-path" d=${s.d} marker-end=${n}></path>`),r.label!==void 0&&a.push(X`<text class="link-label" x=${s.mid.x} y=${s.mid.y-6} text-anchor="middle">${r.label}</text>`);continue}if(c!==void 0){if(l.from.band===o){const s=l.from.x+l.fromWidth,p=l.from.y+I/2;a.push(X`<g class="jump">
        <line x1=${s} y1=${p} x2=${s+8} y2=${p}></line>
        <circle cx=${s+16} cy=${p} r="8"></circle>
        <text x=${s+16} y=${p}>${c}</text>
      </g>`)}if(l.to.band===o){const s=l.to.x,p=l.to.y+I/2;a.push(X`<g class="jump">
        <circle cx=${s-16} cy=${p} r="8"></circle>
        <text x=${s-16} y=${p}>${c}</text>
        <line x1=${s-8} y1=${p} x2=${s} y2=${p} marker-end=${n}></line>
      </g>`)}}}return a},He=(e,t)=>{if(e.y===t.y)return{d:`M ${e.x} ${e.y} L ${t.x} ${t.y}`,mid:{x:(e.x+t.x)/2,y:e.y}};const o=t.x-q/2,i=Math.min(10,Math.abs(t.y-e.y)/2,Math.max(0,o-e.x),Math.abs(t.x-o)),n=Math.sign(t.y-e.y);return{d:`M ${e.x} ${e.y} L ${o-i} ${e.y} Q ${o} ${e.y} ${o} ${e.y+n*i} L ${o} ${t.y-n*i} Q ${o} ${t.y} ${o+i} ${t.y} L ${t.x} ${t.y}`,mid:{x:(o+t.x)/2,y:t.y}}},Ve=(e,t,o,i,n)=>{if(e.x===o.x&&e.y===o.y)return;const a=n-Jt+36;if(o.x>=e.x+t){const l={x:e.x+t-18,y:e.y+I},c={x:o.x+18,y:o.y+I};return te(l,{x:l.x+48,y:a},{x:c.x-48,y:a},c)}const d={x:e.x+18,y:e.y+I},r={x:o.x+i-18,y:o.y+I};return te(d,{x:d.x-48,y:a},{x:r.x+48,y:a},r)},Qe=e=>{let t=0;for(const o of e)t=(t*31+o.charCodeAt(0))%997;return(t%17-8)*.09},Je=pt`
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

  .board-content {
    position: absolute;
    left: 0;
    top: 0;
    width: max-content;
    transform-origin: 0 0;
    will-change: transform;
  }

  .wall {
    display: grid;
    gap: 6px;
    width: max-content;
    padding: 8px;
  }

  .band {
    display: flex;
    align-items: flex-start;
  }

  /* Wrap marker between rows: the timeline continues on the next row. */
  .band-wrap-mark {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 0 2px 34px;
    font-family: var(--af-mono);
    font-size: 9.5px;
    letter-spacing: 0.12em;
    color: var(--af-ink-faint);
  }

  .band-wrap-mark::before {
    content: '';
    width: 46px;
    height: 12px;
    border-left: 1.5px solid var(--af-rule-strong);
    border-bottom: 1.5px solid var(--af-rule-strong);
    border-bottom-left-radius: 10px;
    margin-top: -10px;
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

  .slice-chip--hotspot:hover {
    border-color: #f04f60;
    color: #d0293b;
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

  /* Numbered chips that carry a link across a wrapped row. */
  .jump line {
    stroke: var(--af-ink-soft);
    stroke-width: 1.6;
    stroke-linecap: round;
    opacity: 0.6;
  }
  .jump circle {
    fill: var(--af-paper-raised);
    stroke: var(--af-ink-faint);
    stroke-width: 1.2;
  }
  .jump text {
    font-family: var(--af-mono);
    font-size: 9px;
    font-weight: 650;
    fill: var(--af-ink-soft);
    text-anchor: middle;
    dominant-baseline: central;
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

  .type-menu {
    min-width: 200px;
  }

  .type-menu .type-options {
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
    cursor: pointer;
    transition: transform 120ms ease;
  }

  .type-chip:hover {
    transform: translateY(-1px);
    box-shadow: var(--af-shadow-sm);
  }

  /* Same palette as the notes themselves: the menu previews what gets stuck on. */
  .type-chip[data-type='event'] {
    background: #ffbc55;
    color: #402703;
  }
  .type-chip[data-type='command'] {
    background: #93c9f2;
    color: #0e2c4b;
  }
  .type-chip[data-type='aggregate'] {
    background: #fff3a6;
    color: #4a3a06;
  }
  .type-chip[data-type='actor'] {
    background: #ffdf63;
    color: #423204;
  }
  .type-chip[data-type='policy'] {
    background: #dcc2f7;
    color: #32195c;
  }
  .type-chip[data-type='readmodel'] {
    background: #c0e788;
    color: #22380a;
  }
  .type-chip[data-type='external'] {
    background: #f9bcd3;
    color: #4b1029;
  }
  .type-chip[data-type='hotspot'] {
    background: #f04f60;
    color: #ffe9ec;
  }

  .context-pop {
    min-width: 220px;
  }

  .detail-pop {
    min-width: 260px;
    max-width: 300px;
  }

  .detail-pop .af-label {
    margin-top: 2px;
  }

  .detail-row {
    display: flex;
    gap: 6px;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    padding: 2px 0;
    border-bottom: 1px solid var(--af-rule);
  }

  .detail-row span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .link-add {
    display: flex;
    gap: 6px;
  }

  .link-add .af-select {
    flex: 1 1 auto;
    min-width: 0;
  }
`,Ze={width:224,height:220},Ge={width:288,height:420},to={width:260,height:150},eo=1200,ee=5,oo={x:20,top:46,bottom:40};class oe extends ut{constructor(){super(),this.definition=Nt,this.#s=new gt(this),this.mode=z,this.boardWidth=eo,this.viewport={panX:24,panY:16,zoom:1},this.gesture=void 0,this.hoverSliceId=void 0,this.selectedSliceIds=[],this.naming=void 0}static{this.styles=[ut.styles,Je,ht]}static{this.properties={mode:{state:!0},boardWidth:{state:!0},viewport:{state:!0},gesture:{state:!0},hoverSliceId:{state:!0},selectedSliceIds:{state:!0},naming:{state:!0}}}#t;#s;disconnectedCallback(){super.disconnectedCallback(),this.#t?.disconnect(),this.#t=void 0}firstUpdated(){typeof ResizeObserver>"u"||(this.#t=new ResizeObserver(t=>{const o=t[0]?.contentRect.width;o!==void 0&&o>0&&(this.boardWidth=o)}),this.#t.observe(this))}updated(){super.updated(),this.mode.kind==="adding"&&this.#i("#type-menu",this.mode.point,Ze),this.mode.kind==="detail"&&this.#i("#detail-pop",this.mode.point,Ge),this.naming!==void 0&&this.#i("#context-pop",this.naming.point,to,"#context-name")}#i(t,o,i,n){const a=this.renderRoot.querySelector(t);if(!a||a.matches(":popover-open")||(this.#s.open(a,ge(o.x,o.y),i),n===void 0))return;const d=this.renderRoot.querySelector(n);d?.focus(),d instanceof HTMLInputElement&&d.select()}#o(){return Math.max(no,this.boardWidth-96)}renderRegions(t){return{header:this.#e(),main:this.#f(t)}}#e(){return u`<button
      class="af-btn"
      type="button"
      data-testid="es-add"
      aria-expanded=${this.mode.kind==="adding"?"true":"false"}
      @click=${t=>{if(this.mode.kind==="adding"){this.mode=z;return}const o=j(t.currentTarget,HTMLElement)?.getBoundingClientRect();o!==void 0&&(this.mode={kind:"adding",point:{x:o.right,y:o.bottom}})}}
    >
      ＋ 付箋
    </button>`}#f(t){return u`
      ${Ae({context:t,mode:this.mode,maxRowWidth:this.#o(),viewport:this.viewport,gesture:this.gesture,hoverSliceId:this.hoverSliceId,selectedSliceIds:this.selectedSliceIds,handlers:{noteIntent:(o,i)=>this.#k(o,i),addFirst:()=>this.#u(t,"event"),attachNote:(o,i)=>this.#S(t,o,i),viewportPointerDown:o=>this.#b(o),viewportPointerMove:o=>this.#v(o),viewportPointerUp:o=>this.#y(t,o),viewportPointerCancel:()=>this.gesture=void 0,viewportPointerLeave:()=>{this.gesture===void 0&&(this.hoverSliceId=void 0)},viewportWheel:o=>this.#E(o),portPointerDown:(o,i)=>this.#g(o,i),slicePointerDown:(o,i)=>this.#x(o,i),zoomStep:o=>this.#$(o),zoomFit:()=>this.#w(),zoomReset:()=>this.#p(1/this.viewport.zoom),groupSelection:o=>{this.selectedSliceIds.length>0&&(this.naming={kind:"create-context",sliceIds:this.selectedSliceIds,point:o})},assignSelection:o=>this.#h(t,o),stripSelectionContext:()=>this.#h(t,null),clearSelection:()=>this.selectedSliceIds=[],renameContext:(o,i)=>this.naming={kind:"rename-context",contextId:o,point:i},dissolveContext:o=>t.dispatch($.deleteContext(o))}})}
      ${this.mode.kind==="adding"?this.#_(t):k}
      ${this.mode.kind==="detail"?this.#L(t,this.mode.noteId):k}
      ${this.naming!==void 0?this.#N(t,this.naming):k}
    `}#a(){return this.renderRoot.querySelector(".board-viewport")}#n(t){const o=this.#a()?.getBoundingClientRect();return o===void 0?{x:t.clientX,y:t.clientY}:{x:t.clientX-o.left,y:t.clientY-o.top}}#r(t){const o=this.#a();if(o===null)return[];const i=o.getBoundingClientRect();return[...this.renderRoot.querySelectorAll("[data-slice-id]")].map(n=>{const a=n.getBoundingClientRect();return{id:n.dataset.sliceId??"",rect:{left:a.left-i.left-(t?.x??0),top:a.top-i.top-(t?.top??0),width:a.width+(t?.x??0)*2,height:a.height+(t?.top??0)+(t?.bottom??0)}}})}#c(t,o){const i=this.#a();i!==null&&(i.setPointerCapture(t.pointerId),this.gesture=o)}#g(t,o){if(o.button!==0)return;o.stopPropagation(),o.preventDefault();const i=this.#n(o);this.#c(o,{kind:"connect",pointerId:o.pointerId,fromSliceId:t,start:i,current:i,moved:!1})}#x(t,o){if(o.button!==0)return;o.stopPropagation(),o.preventDefault();const i=this.#n(o);this.#c(o,{kind:"move-slice",pointerId:o.pointerId,sliceId:t,start:i,current:i,moved:!1})}#b(t){if(t.button!==0||this.gesture!==void 0)return;for(const i of t.composedPath()){if(i===t.currentTarget)break;if(i instanceof Element&&(i.tagName.toLowerCase()==="artifact-es-note"||i.matches("button, select, textarea, input, a")))return}const o=this.#n(t);this.#c(t,{kind:"select",pointerId:t.pointerId,start:o,current:o,moved:!1})}#v(t){const o=this.gesture,i=this.#n(t);if(o===void 0){const n=st(this.#r(oo),i.x,i.y);n!==this.hoverSliceId&&(this.hoverSliceId=n);return}this.gesture=Pt(o,{pointerId:t.pointerId,point:i},this.#r(),ee)}#y(t,o){const i=this.gesture;if(i===void 0||o.pointerId!==i.pointerId)return;const n=Pt(i,{pointerId:o.pointerId,point:this.#n(o)},this.#r(),ee);if(this.gesture=void 0,n.kind==="connect"){n.moved?n.targetSliceId!==void 0&&this.#T(t,n.fromSliceId,n.targetSliceId):this.#I(t,n.fromSliceId);return}if(n.kind==="move-slice"){if(!n.moved){this.selectedSliceIds=this.selectedSliceIds.includes(n.sliceId)?this.selectedSliceIds.filter(d=>d!==n.sliceId):[...this.selectedSliceIds,n.sliceId];return}n.drop!==void 0&&this.#M(t,n.sliceId,n.drop.sliceId,n.drop.side);return}if(!n.moved){this.selectedSliceIds=[];return}const a={left:Math.min(n.start.x,n.current.x),top:Math.min(n.start.y,n.current.y),width:Math.abs(n.current.x-n.start.x),height:Math.abs(n.current.y-n.start.y)};this.selectedSliceIds=[...At(this.#r(),a)]}#E(t){t.preventDefault();const o=this.#n(t);this.viewport=t.ctrlKey||t.metaKey?at(this.viewport,o.x,o.y,Math.exp(-t.deltaY*.01)):Ct(this.viewport,-t.deltaX,-t.deltaY)}#p(t){const o=this.#a()?.getBoundingClientRect();this.viewport=at(this.viewport,(o?.width??0)/2,(o?.height??0)/2,t)}#$(t){this.#p(t===1?1.2:1/1.2)}#w(){const t=this.#a()?.getBoundingClientRect(),o=this.renderRoot.querySelector(".wall");t===void 0||o===null||(this.viewport=Ot({width:o.offsetWidth,height:o.offsetHeight},{width:t.width,height:t.height},48))}#k(t,o){const i=this.context();switch(o.kind){case"select":i.navigate({note:t});break;case"rename":i.dispatch($.setElementName(t,o.name));break;case"describe":i.dispatch($.setElementDescription(t,o.description));break;case"comment":i.dispatch({type:"comment",target:`element:${t}`,payload:{body:o.body}});break;case"delete":i.dispatch($.deleteElement(t)),i.navigation.note===t&&i.navigate({note:null});break}this.mode=qt(this.mode,t,o)}#d(t,o){return W(t).find(i=>i.id===o)}#l(t){return t===void 0?[]:[...t.notes,...t.hotspots].map(o=>o.id)}#T(t,o,i){if(o===i)return;const n=W(t.state),a=n.find(c=>c.id===o),d=n.find(c=>c.id===i),r=a&&d?Ft(a,d):void 0;if(r===void 0||t.state.links.some(c=>c.from===r.from&&c.to===r.to))return;const l=t.state.links.map(c=>c.id);t.dispatch($.linkElements(P(`link-${r.from}`,l),r.from,r.to,{kind:"flow"}))}#I(t,o){const i=this.#d(t.state,o),n=i?rt(i):void 0;if(n===void 0)return;const a=P("new-event",V(t.state)),d=t.state.links.map(r=>r.id);t.dispatchBatch([$.addElement(a,"event",A.event),$.linkElements(P(`link-${n.id}`,d),n.id,a,{kind:"flow"})]).ok&&(t.navigate({note:a}),this.mode={kind:"editing",noteId:a})}#S(t,o,i){const n=this.#d(t.state,o),a=n===void 0?void 0:Rt(n,i);if(a===void 0)return;const d=P(`new-${i}`,V(t.state)),[r,l]=a.incoming?[d,a.anchorId]:[a.anchorId,d],c=t.state.links.map(s=>s.id);t.dispatchBatch([$.addElement(d,i,A[i]),$.linkElements(P(`link-${r}`,c),r,l,{kind:"member"})]).ok&&(t.navigate({note:d}),this.mode={kind:"editing",noteId:d})}#M(t,o,i,n){const a=t.state,d=Xt(a.elements.map(r=>r.id),this.#l(this.#d(a,o)),this.#l(this.#d(a,i)),n);t.dispatchBatch(d.map(r=>$.moveElement(r.id,r.after)))}#h(t,o){const i=W(t.state),n=this.selectedSliceIds.flatMap(a=>this.#l(i.find(d=>d.id===a)));t.dispatchBatch(n.map(a=>$.setElementContext(a,o))).ok&&(this.selectedSliceIds=[])}#m(t,o){const i=this.renderRoot.querySelector("#context-name")?.value.trim()??"";if(i==="")return;if(o.kind==="rename-context"){t.dispatch($.setContextName(o.contextId,i)).ok&&(this.naming=void 0);return}const n=P("context",t.state.contexts.map(r=>r.id)),a=W(t.state),d=o.sliceIds.flatMap(r=>this.#l(a.find(l=>l.id===r)));t.dispatchBatch([$.addContext(n,i),...d.map(r=>$.setElementContext(r,n))]).ok&&(this.selectedSliceIds=[],this.naming=void 0)}#N(t,o){const i=o.kind==="rename-context"?K(t.state,o.contextId)?.name??"":"";return u`<div id="context-pop" class="comment-pop context-pop" popover="manual">
      <span class="af-label">
        ${o.kind==="create-context"?"\u65B0\u3057\u3044\u5883\u754C\u3065\u3051\u3089\u308C\u305F\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8":"\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u540D\u3092\u5909\u66F4"}
      </span>
      <input
        id="context-name"
        class="af-input"
        type="text"
        placeholder="コンテキスト名"
        .value=${i}
        @keydown=${n=>{n.key==="Enter"&&this.#m(t,o),n.key==="Escape"&&(this.naming=void 0)}}
      />
      <div class="pop-actions">
        <button class="af-btn" type="button" @click=${()=>this.naming=void 0}>キャンセル</button>
        <button class="af-btn af-btn--accent" type="button" @click=${()=>this.#m(t,o)}>
          ${o.kind==="create-context"?"\u4F5C\u6210":"\u4FDD\u5B58"}
        </button>
      </div>
    </div>`}#_(t){return u`<div id="type-menu" class="comment-pop type-menu" popover="manual">
      <span class="af-label">付箋の種類</span>
      <div class="type-options">
        ${B.map(o=>u`<button class="type-chip" type="button" data-type=${o} @click=${()=>this.#u(t,o)}>
              ${A[o]}
            </button>`)}
      </div>
      <div class="pop-actions">
        <button class="af-btn" type="button" @click=${()=>this.mode=z}>キャンセル</button>
      </div>
    </div>`}#u(t,o){const i=P(`new-${o}`,V(t.state));if(!t.dispatch($.addElement(i,o,A[o])).ok){this.mode=z;return}t.navigate({note:i}),this.mode={kind:"editing",noteId:i}}#L(t,o){const{state:i}=t,n=i.elements.find(s=>s.id===o);if(!n)return k;const a=s=>i.elements.find(p=>p.id===s)?.name??s,d=i.links.filter(s=>s.from===n.id),r=i.links.filter(s=>s.to===n.id),l=new Set([...d.map(s=>s.to),...r.map(s=>s.from)]),c=i.elements.filter(s=>s.id!==n.id&&!l.has(s.id));return u`<div id="detail-pop" class="comment-pop detail-pop" popover="manual">
      <strong>${n.name}</strong>
      <span class="af-label">種別</span>
      <select
        class="af-select"
        aria-label="種別"
        @change=${s=>{const p=j(s.target,HTMLSelectElement);p!==null&&t.dispatch($.setElementType(n.id,p.value))}}
      >
        ${B.map(s=>u`<option value=${s} ?selected=${s===n.type}>${A[s]}</option>`)}
      </select>
      <span class="af-label">境界づけられたコンテキスト</span>
      <select
        class="af-select"
        aria-label="コンテキスト"
        @change=${s=>{const p=j(s.target,HTMLSelectElement);p!==null&&t.dispatch($.setElementContext(n.id,p.value===""?null:p.value))}}
      >
        <option value="" ?selected=${n.contextId===void 0}>未所属</option>
        ${i.contexts.map(s=>u`<option value=${s.id} ?selected=${s.id===n.contextId}>${s.name}</option>`)}
      </select>
      <span class="af-label">つながり</span>
      ${d.map(s=>u`<div class="detail-row">
            <span>→ ${a(s.to)}${s.label?` \xB7 ${s.label}`:""}</span>
            <button
              class="af-icon-btn"
              type="button"
              aria-label="リンクを解除"
              @click=${()=>t.dispatch($.unlinkElements(s.from,s.to))}
            >
              ${ft()}
            </button>
          </div>`)}
      ${r.map(s=>u`<div class="detail-row">
            <span>← ${a(s.from)}${s.label?` \xB7 ${s.label}`:""}</span>
            <button
              class="af-icon-btn"
              type="button"
              aria-label="リンクを解除"
              @click=${()=>t.dispatch($.unlinkElements(s.from,s.to))}
            >
              ${ft()}
            </button>
          </div>`)}
      ${c.length>0?u`<div class="link-add">
              <select class="af-select" id="es-link-target" aria-label="リンク先">
                ${c.map(s=>u`<option value=${s.id}>${s.name}</option>`)}
              </select>
              <button
                class="af-btn"
                type="button"
                @click=${()=>{const s=this.renderRoot.querySelector("#es-link-target");if(!s?.value)return;const p=t.state.links.map(x=>x.id);t.dispatch($.linkElements(P(`link-${n.id}`,p),n.id,s.value))}}
              >
                ＋ リンク
              </button>
            </div>`:k}
      <div class="pop-actions">
        <button class="af-btn" type="button" @click=${()=>this.mode=z}>閉じる</button>
      </div>
    </div>`}}const no=264,ne=(e="artifact-event-storming")=>{Lt(),customElements.get(e)||customElements.define(e,oe)},io=Object.freeze(Object.defineProperty({__proto__:null,ES_IDLE:z,EsNoteCard:_t,EventStormingElement:oe,NOTE_TYPES:B,NOTE_TYPE_LABELS:A,ZOOM_MAX:zt,ZOOM_MIN:it,allNoteIds:V,applyEventStormingAction:Et,attachAnchor:Rt,buildForest:Yt,buildSlices:W,connectionEndpoints:Ft,defineEsNoteCard:Lt,defineEventStormingElement:ne,describeEventStormingAction:wt,dropSide:Dt,emptyEventStormingBase:yt,eventStormingAction:$,eventStormingActions:w,eventStormingBaseSchema:bt,eventStormingCommentTargets:It,eventStormingDefinition:Nt,eventStormingHasTarget:Mt,eventStormingTargetLabel:Tt,eventStormingTitle:nt,findContext:K,findLink:ot,findNote:Y,fitViewport:Ot,hitRect:st,layoutFlows:Kt,noteCardModeOf:jt,packFlows:Wt,panBy:Ct,parseEventStormingBase:vt,rectsInBand:At,reduceNoteIntent:qt,resolveEventStormingNavigation:St,sameSlice:J,serializeEventStormingAction:kt,sliceArrows:Bt,sliceMovePlan:Xt,sliceVoice:rt,zoomAt:at},Symbol.toStringTag,{value:"Module"}));export{ne as d,io as i};
