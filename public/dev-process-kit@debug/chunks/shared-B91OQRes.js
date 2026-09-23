import{q as ae,ag as le,a8 as b,ad as f,ae as x,ab as p,ai as T,a7 as oe,aa as z,a9 as k,aj as se,R as A,V as de,a1 as o,a2 as pe,a0 as u,$ as ce,T as L,av as ge}from"./shared-CxeFED6G.js";import{c as C}from"./shared-DPcZakya.js";const ue=le("kind",[b({kind:T("option"),optionId:f(p(),x(1))}),b({kind:T("free"),text:p()}),b({kind:T("clear")})]),w={ANSWER_QUESTION:ae("ANSWER_QUESTION","question",ue)},N=(t,e)=>({type:"ANSWER_QUESTION",target:{type:"question",id:t},payload:e}),he=b({id:f(p(),x(1)),label:f(p(),x(1))}),be=b({id:f(p(),x(1)),ref:k(f(p(),x(1))),title:f(p(),x(1)),description:k(p()),note:k(p()),options:k(z(he),[]),freeText:k(se(),!0)}),_=b({title:k(p(),""),questions:z(be)}),B=t=>{const e=oe(_,t),i=new Set,r=e.questions.map((n,l)=>{if(i.has(n.id))throw new Error(`duplicate question id: ${n.id}`);i.add(n.id);const s=new Set;for(const a of n.options){if(s.has(a.id))throw new Error(`duplicate option id: ${a.id} in question ${n.id}`);s.add(a.id)}return{id:n.id,ref:n.ref??`Q${l+1}`,title:n.title,description:n.description??null,note:n.note??null,options:n.options,freeText:n.freeText}});return{title:e.title,questions:r,answers:{}}},G=()=>({title:"",questions:[],answers:{}}),c=(t,e)=>t.questions.find(i=>i.id===e),fe=(t,e)=>c(t,e)?.ref??e,R=(t,e)=>{const i=c(t,e);return i?`${i.ref} \xB7 ${i.title}`:e},$=(t,e)=>e?e.kind==="option"?t.options.find(i=>i.id===e.optionId)?.label??"":e.text.trim():"",y=(t,e)=>$(t,e)!=="",O=t=>{let e="";for(let i=t+1;i>0;i=Math.floor((i-1)/26))e=String.fromCharCode(97+(i-1)%26)+e;return e},Q=t=>({total:t.questions.length,answered:t.questions.filter(e=>y(e,t.answers[e.id])).length}),q=(t,e,i)=>{const r=t.answers[e];if(i===null){if(r===void 0)return t;const n={...t.answers};return delete n[e],{...t,answers:n}}return r?.kind===i.kind&&(r.kind==="option"&&i.kind==="option"&&r.optionId===i.optionId||r.kind==="free"&&i.kind==="free"&&r.text===i.text)?t:{...t,answers:{...t.answers,[e]:i}}},U=(t,e)=>{if(e.type!=="ANSWER_QUESTION")return null;const i=c(t,e.target.id);if(!i)return null;const r=A(w.ANSWER_QUESTION,e);return r.kind==="clear"?q(t,i.id,null):r.kind==="option"?i.options.some(n=>n.id===r.optionId)?q(t,i.id,{kind:"option",optionId:r.optionId}):null:q(t,i.id,{kind:"free",text:r.text})},M=t=>t.title===""?"Visually Grill":t.title,H=(t,e)=>{switch(e.type){case"question":return R(t,e.id);case"page":return"\u30DA\u30FC\u30B8\u5168\u4F53";default:return e.id}},xe=(t,e)=>{const i=A(w.ANSWER_QUESTION,e);return i.kind==="clear"?{title:"\u56DE\u7B54\u3092\u30AF\u30EA\u30A2",tone:"delete"}:i.kind==="option"?{title:"\u56DE\u7B54",tone:"update",body:`\u2192 \u300C${c(t,e.target.id)?.options.find(r=>r.id===i.optionId)?.label??i.optionId}\u300D`}:{title:"\u81EA\u7531\u8A18\u8FF0\u3067\u56DE\u7B54",tone:"update",body:`\u2192 \u300C${i.text.slice(0,120)}\u300D`}},W=(t,e,i)=>{let r;try{r=xe(i??e,t)}catch{r={title:t.type,tone:"meta"}}return{title:r.title,targetLabel:H(e,t.target),tone:r.tone,...r.body===void 0?{}:{summary:r.body}}},F=t=>`${t.type} ${de(t.target)} ${JSON.stringify(t.payload)}`,j=t=>t.questions.map(e=>({value:`question:${e.id}`,label:R(t,e.id),group:"\u8CEA\u554F"})),V=(t,e)=>{const i=e.question;if(i!==void 0&&c(t,i))return e;const r=t.questions[0];return r===void 0?e:{...e,question:r.id}},D=(t,e)=>{const i=e.question;return i!==void 0&&c(t,i)?i:t.questions[0]?.id??null},ke=(t,e)=>{const i=t.questions,r=i.findIndex(n=>n.id===e);return(r===-1?i:[...i.slice(r+1),...i.slice(0,r)]).find(n=>!y(n,t.answers[n.id]))?.id??null},ve=(t,e,i)=>{const r=e.answers[t.id];return{id:t.id,ref:t.ref,title:t.title,description:t.description,note:t.note,open:t.id===i,answered:$(t,r)!=="",summary:$(t,r),choices:t.options.map((n,l)=>({id:n.id,letter:O(l),label:n.label,checked:r?.kind==="option"&&r.optionId===n.id})),draft:r?.kind==="free"?r.text:"",freeSelected:r?.kind==="free",allowFreeText:t.freeText}},P=(t,e)=>{const i=D(t,e);return{questions:t.questions.map(r=>ve(r,t,i))}},K=t=>{const e=Q(t);return{progress:`\u56DE\u7B54\u6E08\u307F ${e.answered} / ${e.total}`,answered:e.answered,total:e.total}},Y=(t,e)=>{switch(e.type){case"question":return c(t,e.id)!==void 0;case"page":return!0;default:return!1}},J={name:"grill",label:"Visually Grill",parseBase:B,emptyBase:G,actions:w,apply:U,hasTarget:Y,describe:W,serialize:F,resolveNavigation:V,commentTargets:t=>j(t),title:M},v="data-grill-questions",me=t=>{const e=[t];for(const i of t.querySelectorAll("*"))i.shadowRoot&&e.push(i.shadowRoot);return e},X=(t,e,i)=>{const r=i.question??e.questions[0]?.id??null,n=new Map(e.questions.map(s=>[s.ref,s])),l=[];for(const s of me(t))for(const a of s.querySelectorAll(`[${v}]`)){const g=a.getAttribute(v)??"";for(const h of g.split(/\s+/)){if(h==="")continue;const d=n.get(h);d&&l.push({index:l.length,target:a,questionId:d.id,ref:d.ref,title:d.title,answered:y(d,e.answers[d.id]),open:d.id===r})}}return l},Z=(t,e)=>{const i=t.getBoundingClientRect(),r=new Map;e.forEach((l,s)=>{const a=t.querySelector(`[data-label="${s}"]`);if(!a)return;const g=r.get(l.target)??[];g.push(a),r.set(l.target,g)});const n=new Map;for(const[l,s]of r){const a=l.getBoundingClientRect(),g=a.width>0||a.height>0,h=n.get(l)??we(l,t);n.set(l,h);const d=a.bottom>i.top&&a.top<i.bottom&&a.right>i.left&&a.left<i.right,E=a.bottom>h.top&&a.top<h.bottom;s.forEach((m,ie)=>{if(m.dataset.visible=String(g&&d&&E),!g||!d||!E)return;const S=m.offsetWidth,I=m.offsetHeight,re=a.right-i.left-S+8-(s.length-1-ie)*(S+5),ne=a.top-i.top-I/2;m.style.transform=`translate(${C(re,0,Math.max(0,t.clientWidth-S))}px, ${C(ne,0,Math.max(0,t.clientHeight-I))}px)`})}},we=(t,e)=>{const i=t.getRootNode(),r=i instanceof ShadowRoot?i.host:null,n=r?.shadowRoot?.querySelector(".diagram-canvas")??null;return n instanceof Element?n.getBoundingClientRect():r instanceof Element?r.getBoundingClientRect():e.getBoundingClientRect()},$e=(t,e)=>o`
  <div class="grill-list">
    ${t.questions.length===0?o`<p class="grill-empty">該当する質問はありません。</p>`:pe(t.questions,i=>i.id,i=>ye(i,e))}
  </div>
`,ye=(t,e)=>o`
  <section class="grill-question" data-question=${t.id} data-answered=${String(t.answered)}>
    <button
      class="grill-heading"
      type="button"
      aria-expanded=${t.open?"true":"false"}
      aria-controls=${`grill-body-${t.id}`}
      @click=${()=>e.open(t.id)}
    >
      <span class="grill-ref">${t.ref}</span>
      <span class="grill-heading-text">
        <strong>${t.title}</strong>
        ${!t.open&&t.answered?o`<span class="grill-summary">${t.summary}</span>`:u}
      </span>
      <span class="grill-chevron" aria-hidden="true">${t.open?"\u2212":"+"}</span>
    </button>
    ${t.open?o`<div class="grill-body" id=${`grill-body-${t.id}`}>
            ${t.description?o`<p class="grill-description">${t.description}</p>`:u}
            ${t.note?o`<p class="grill-note">${t.note}</p>`:u}
            <div class="grill-choices" role="radiogroup" aria-label=${t.title}>
              ${t.choices.map(i=>qe(t.id,i,e))}
              ${t.allowFreeText?o`<label class="grill-choice grill-choice--free" data-free=${String(t.freeSelected)}>
                      <input
                        type="radio"
                        name=${`grill-${t.id}`}
                        value="__free"
                        .checked=${t.freeSelected}
                        @change=${()=>e.answer(t.id,{kind:"free",text:""})}
                      />
                      <span class="grill-choice-text">自由記述</span>
                    </label>`:u}
            </div>
            ${t.allowFreeText?o`<textarea
                    class="dpk-textarea grill-free"
                    data-free-text=${t.id}
                    aria-label=${`${t.ref} \u306E\u81EA\u7531\u8A18\u8FF0`}
                    placeholder="回答を入力…（⌘/Ctrl+Enter で次へ）"
                    .value=${t.draft}
                    ?hidden=${!t.freeSelected}
                    @input=${i=>{const r=i.currentTarget;r instanceof HTMLTextAreaElement&&e.answer(t.id,{kind:"free",text:r.value})}}
                    @keydown=${i=>{i.isComposing||!(i.metaKey||i.ctrlKey)||i.key!=="Enter"||(i.preventDefault(),e.next(t.id))}}
                  ></textarea>`:u}
            ${t.answered?o`<button
                    type="button"
                    class="grill-clear"
                    @click=${()=>e.answer(t.id,{kind:"clear"})}
                  >
                    回答をクリア
                  </button>`:u}
          </div>`:u}
  </section>
`,qe=(t,e,i)=>o`
  <label class="grill-choice" data-choice=${e.id}>
    <input
      type="radio"
      name=${`grill-${t}`}
      value=${e.id}
      .checked=${e.checked}
      @change=${()=>i.answer(t,{kind:"option",optionId:e.id})}
    />
    <span class="grill-choice-text">
      <span class="grill-letter">(${e.letter})</span>
      <span>${e.label}</span>
    </span>
  </label>
`,Se=ce`
  .dpk-main {
    order: 1;
  }

  /* The shell's sidebar becomes a right-hand rail, keeping its width and scroll. */
  .dpk-sidebar {
    order: 2;
    width: 336px;
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 0;
    border-right: 0;
    border-left: 1px solid var(--dpk-rule);
  }

  /* The header reserves room for the corner button, exactly like the review
     button in the other templates. */
  .grill-panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  .grill-tab-panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

  .grill-tab-panel[hidden],
  .dpk-sidebar[hidden] {
    display: none;
  }

  .grill-tab-panel dpk-component-comment-panel {
    flex: 1;
  }

  /* ------------------------------------------------------- header control */

  /*
   * The one control the reader always needs: the questions. It sits where the
   * other templates put their review button, and folds the question column away
   * so the diagrams get the width back.
   */
  .grill-toggle {
    position: fixed;
    top: 10px;
    right: 16px;
    z-index: 60;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    padding: 0;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: 999px;
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink-soft);
    font-size: 16.5px;
    font-weight: 650;
    line-height: 1;
    box-shadow: var(--dpk-shadow);
    cursor: pointer;
    transition:
      color 160ms ease,
      background 160ms ease,
      border-color 160ms ease,
      box-shadow 160ms ease,
      transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .grill-toggle:hover {
    color: var(--dpk-ink);
    transform: translateY(-2px) scale(1.05);
    box-shadow: var(--dpk-shadow-lg);
  }

  .grill-toggle:active {
    transform: translateY(0) scale(0.97);
    box-shadow: var(--dpk-shadow-xs);
  }

  .grill-toggle:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  .grill-toggle[aria-expanded='true'] {
    color: var(--dpk-accent-ink);
    border-color: transparent;
    background: linear-gradient(135deg, var(--dpk-accent), #c23e12);
    box-shadow: 0 2px 8px rgba(217, 73, 32, 0.3);
  }

  .grill-toggle-glyph {
    display: block;
  }

  .grill-toggle-badge {
    position: absolute;
    top: -5px;
    right: -5px;
    min-width: 22px;
    height: 18px;
    padding: 0 5px;
    border: 2px solid var(--dpk-paper-raised);
    border-radius: 999px;
    background: var(--dpk-paper-inset);
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: 9px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    line-height: 14px;
    /* The widest value is wider than the button it sits on: keep it on one line. */
    white-space: nowrap;
    text-align: center;
  }

  .grill-toggle[aria-expanded='true'] .grill-toggle-badge {
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink-soft);
  }

  /* ------------------------------------------------------------- the list */

  .grill-tabs {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
    padding: 8px 10px;
    border-bottom: 1px solid var(--dpk-rule);
    background: var(--dpk-paper-raised);
  }

  .grill-tabs button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 9px;
    border: 1px solid transparent;
    border-radius: var(--dpk-radius-xs);
    background: transparent;
    color: var(--dpk-ink-faint);
    font-size: 11.5px;
    cursor: pointer;
  }

  .grill-tabs button:hover {
    background: var(--dpk-paper-inset);
    color: var(--dpk-ink);
  }

  .grill-tabs button[aria-selected='true'] {
    border-color: var(--dpk-rule-strong);
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    font-weight: 600;
    box-shadow: var(--dpk-shadow-xs);
  }

  .grill-count {
    font-family: var(--dpk-mono);
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    color: var(--dpk-ink-faint);
  }

  .grill-list {
    flex: 1;
    min-height: 0;
    overflow: auto;
    overscroll-behavior: contain;
    padding: 2px 10px 12px;
  }

  .grill-empty {
    margin: 0;
    padding: 22px 8px;
    text-align: center;
    font-size: 12px;
    color: var(--dpk-ink-faint);
  }

  .grill-question {
    border-bottom: 1px solid var(--dpk-rule);
  }

  .grill-question:last-child {
    border-bottom: 0;
  }

  .grill-heading {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    width: 100%;
    padding: 11px 6px;
    border: 0;
    border-radius: var(--dpk-radius-xs);
    background: none;
    text-align: left;
    cursor: pointer;
  }

  .grill-heading:hover {
    background: var(--dpk-paper-sunken);
  }

  .grill-ref {
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    min-width: 30px;
    height: 22px;
    padding: 0 6px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: 999px;
    font-family: var(--dpk-mono);
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    color: var(--dpk-ink-faint);
  }

  .grill-question[data-answered='true'] .grill-ref {
    border-color: transparent;
    background: var(--dpk-green-soft);
    color: var(--dpk-green);
    font-weight: 600;
  }

  .grill-question:has(.grill-heading[aria-expanded='true']) .grill-ref {
    border-color: transparent;
    background: var(--dpk-accent-soft);
    color: var(--dpk-accent);
    font-weight: 600;
  }

  .grill-heading-text {
    flex: 1;
    min-width: 0;
  }

  .grill-heading-text strong {
    display: block;
    font-size: 12.5px;
    font-weight: 600;
    line-height: 1.6;
  }

  .grill-summary {
    display: block;
    margin-top: 4px;
    font-size: 10.5px;
    line-height: 1.6;
    color: var(--dpk-green);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .grill-chevron {
    flex: 0 0 auto;
    width: 16px;
    color: var(--dpk-ink-faint);
    font-size: 12px;
    line-height: 22px;
    text-align: center;
  }

  .grill-body {
    padding: 0 6px 13px 45px;
  }

  .grill-description {
    margin: 0 0 8px;
    font-size: 11.5px;
    line-height: 1.85;
    color: var(--dpk-ink-soft);
  }

  .grill-note {
    margin: 0 0 10px;
    padding: 7px 10px;
    border-left: 2px solid var(--dpk-amber);
    border-radius: 0 var(--dpk-radius-xs) var(--dpk-radius-xs) 0;
    background: var(--dpk-amber-soft);
    font-size: 11px;
    line-height: 1.7;
    color: var(--dpk-ink-soft);
  }

  .grill-choices {
    display: grid;
    gap: 6px;
  }

  .grill-choice {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 9px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper);
    font-size: 11.5px;
    line-height: 1.7;
    cursor: pointer;
  }

  .grill-choice:hover {
    border-color: var(--dpk-rule-strong);
  }

  .grill-choice:has(input:checked) {
    border-color: color-mix(in srgb, var(--dpk-green) 45%, transparent);
    background: var(--dpk-green-soft);
  }

  .grill-choice input {
    flex: 0 0 auto;
    margin: 3px 0 0;
    accent-color: var(--dpk-green);
  }

  .grill-choice-text {
    display: flex;
    gap: 7px;
    min-width: 0;
  }

  .grill-letter {
    flex: 0 0 auto;
    font-family: var(--dpk-mono);
    font-size: 10px;
    line-height: 1.9;
    color: var(--dpk-green);
  }

  .grill-free {
    margin-top: 7px;
    min-height: 76px;
    max-height: 240px;
  }

  .grill-clear {
    margin-top: 10px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--dpk-ink-faint);
    font-size: 10.5px;
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
  }

  .grill-clear:hover {
    color: var(--dpk-ink);
  }

  .grill-footer {
    flex-shrink: 0;
    padding: 10px 12px;
    border-top: 1px solid var(--dpk-rule);
    background: var(--dpk-paper-raised);
  }

  .grill-copy {
    width: 100%;
  }

  /* The copy button reports the outcome, so a click is never silent. */
  .grill-copy[data-status='copied'] {
    border-color: transparent;
    background: var(--dpk-green);
    color: var(--dpk-accent-ink);
  }

  .grill-copy[data-status='copied']:hover:not([disabled]) {
    border-color: transparent;
    background: color-mix(in srgb, var(--dpk-green) 85%, #000);
  }

  .grill-copy[data-status='failed'] {
    border-color: transparent;
    background: var(--dpk-amber);
    color: var(--dpk-accent-ink);
  }

  .grill-copy[data-status='failed']:hover:not([disabled]) {
    border-color: transparent;
    background: color-mix(in srgb, var(--dpk-amber) 85%, #000);
  }

  /* Announced to assistive tech; the button label change alone is easy to miss. */
  .grill-sr {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  /* -------------------------------------------------- main area and badges */

  .grill-stage {
    position: relative;
    min-width: 0;
  }

  .grill-labels {
    position: absolute;
    inset: 0;
    z-index: 3;
    overflow: hidden;
    pointer-events: none;
  }

  .grill-label {
    position: absolute;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 30px;
    height: 22px;
    padding: 0 7px;
    border: 2px solid var(--dpk-paper-raised);
    border-radius: 999px;
    background: var(--dpk-accent);
    color: var(--dpk-accent-ink);
    font-family: var(--dpk-mono);
    font-size: 10px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    box-shadow: var(--dpk-shadow-xs);
    cursor: pointer;
    pointer-events: auto;
  }

  .grill-label[data-visible='false'] {
    visibility: hidden;
  }

  .grill-label:hover {
    background: color-mix(in srgb, var(--dpk-accent) 80%, #000);
  }

  .grill-label[data-answered='true'] {
    background: var(--dpk-green);
  }

  .grill-label[aria-pressed='true'] {
    box-shadow:
      0 0 0 2px color-mix(in srgb, var(--dpk-accent) 45%, transparent),
      var(--dpk-shadow-xs);
  }

  .grill-label:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }
`;class ee extends L{constructor(){super(),this.definition=J,this.#n=[],this.#a=!1,this.#l=null,this.#o=null,this.#i=null,this.#r="idle",this.#t=null,this.#e=()=>{this.#a||(this.#a=!0,requestAnimationFrame(()=>{this.#a=!1;const e=this.renderRoot.querySelector(".grill-labels");e&&Z(e,this.#n)}))},this.tab="questions",this.folded=!1}static{this.styles=[L.styles,Se]}static{this.properties={tab:{state:!0},folded:{state:!0}}}#n;#a;#l;#o;#i;#r;#t;connectedCallback(){super.connectedCallback(),document.addEventListener("scroll",this.#e,!0),window.addEventListener("resize",this.#e),this.addEventListener("dpk-diagram-view",this.#e)}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("scroll",this.#e,!0),window.removeEventListener("resize",this.#e),this.removeEventListener("dpk-diagram-view",this.#e),this.#i?.disconnect(),this.#i=null,this.#t!==null&&clearTimeout(this.#t),this.#t=null}renderRegions(e){return this.#n=X(this,e.state,e.navigation),{header:this.#p(e),main:this.#u(e,this.#n),sidebar:this.#c(e),sidebarHidden:this.folded}}updated(){super.updated(),this.#k(),this.#e(),this.#v();const e=this.#o;e!==null&&(this.#o=null,this.renderRoot.querySelector(`[data-free-text="${e}"]`)?.focus())}get integratedReview(){return!0}requestComment(e){this.tab="review",this.folded=!1,super.requestComment(e)}#s(e,i){this.tab="questions",this.folded=!1,this.#l=null,e.navigate({question:i})}#p(e){const i=K(e.state),r=`${this.folded?"\u8CEA\u554F / Review \u3092\u3072\u3089\u304F":"\u8CEA\u554F / Review \u3092\u305F\u305F\u3080"}\uFF08${i.progress}\uFF09`;return o`
      <button
        type="button"
        class="grill-toggle"
        aria-expanded=${this.folded?"false":"true"}
        aria-label=${r}
        title=${r}
        @click=${()=>this.folded=!this.folded}
      >
        <span class="grill-toggle-glyph" aria-hidden="true">?</span>
        <span class="grill-toggle-badge" aria-hidden="true">${i.answered} / ${i.total}</span>
      </button>
    `}#c(e){const i=P(e.state,e.navigation),r=this.#r==="copied"?"\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F":this.#r==="failed"?"\u30B3\u30D4\u30FC\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F":"\u56DE\u7B54\u30FBReview \u3092\u307E\u3068\u3081\u3066\u30B3\u30D4\u30FC";return o`
      <div class="grill-panel">
        <div class="grill-tabs" role="tablist" aria-label="質問 / Review">
          ${["questions","review"].map(n=>o`
              <button
                type="button"
                role="tab"
                id=${`grill-tab-${n}`}
                data-tab=${n}
                aria-controls=${`grill-panel-${n}`}
                aria-selected=${String(this.tab===n)}
                tabindex=${this.tab===n?0:-1}
                @click=${()=>this.tab=n}
                @keydown=${l=>this.#g(l)}
              >
                ${n==="questions"?"\u8CEA\u554F":"Review"}<span class="grill-count"
                  >${n==="questions"?e.state.questions.length:e.actions.length}</span
                >
              </button>
            `)}
        </div>
        <div
          class="grill-tab-panel"
          id="grill-panel-questions"
          role="tabpanel"
          aria-labelledby="grill-tab-questions"
          ?hidden=${this.tab!=="questions"}
        >
          ${$e(i,{open:n=>this.#s(e,n),answer:(n,l)=>this.#h(n,l),next:n=>this.#d(n)})}
        </div>
        <div
          class="grill-tab-panel"
          id="grill-panel-review"
          role="tabpanel"
          aria-labelledby="grill-tab-review"
          ?hidden=${this.tab!=="review"}
        >
          ${this.renderReviewPanel(e)}
        </div>
        <div class="grill-footer">
          <button
            class="dpk-btn dpk-btn--accent grill-copy"
            type="button"
            data-status=${this.#r}
            ?disabled=${e.actions.length===0}
            @click=${()=>{this.#b()}}
          >
            ${r}
          </button>
          <span class="grill-sr" role="status">${this.#r==="idle"?"":r}</span>
        </div>
      </div>
    `}#g(e){["ArrowLeft","ArrowRight","Home","End"].includes(e.key)&&(e.preventDefault(),this.tab=e.key==="Home"?"questions":e.key==="End"||this.tab==="questions"?"review":"questions",this.renderRoot.querySelector(`[data-tab="${this.tab}"]`)?.focus())}#u(e,i){return o`
      <div class="grill-stage">
        <slot name="main"></slot>
        <div class="grill-labels">
          ${i.map(r=>o`
              <button
                type="button"
                class="grill-label"
                data-label=${r.index}
                data-answered=${String(r.answered)}
                data-visible="false"
                aria-pressed=${r.open?"true":"false"}
                aria-label=${`${r.ref} \xB7 ${r.title}`}
                title=${`${r.ref} \xB7 ${r.title}`}
                @click=${()=>this.#s(e,r.questionId)}
              >
                ${r.ref}
              </button>
            `)}
        </div>
      </div>
    `}#h(e,i){if(this.dispatch(N(e,i)).ok){if(i.kind==="option"){this.#d(e);return}i.kind==="free"&&i.text===""&&(this.#o=e)}}#d(e){const i=ke(this.derivation.state,e);i!==null&&this.navigate({question:i})}async#b(){const e=this.api.exportBrief();this.#f(await ge(e)?"copied":"failed")}#f(e){this.#r=e,this.requestUpdate(),this.#t!==null&&clearTimeout(this.#t),this.#t=setTimeout(()=>{this.#t=null,this.#r="idle",this.requestUpdate()},2400)}#x(){this.requestUpdate()}#k(){this.#i?.disconnect(),this.#i??=new MutationObserver(()=>{this.#x(),this.#e()}),this.#i.observe(this,{childList:!0,subtree:!0,attributes:!0,attributeFilter:[v]});for(const e of this.querySelectorAll("*"))e===this||!e.shadowRoot||this.#i.observe(e.shadowRoot,{childList:!0,subtree:!0,attributes:!0,attributeFilter:[v]})}#e;#v(){const e=this.navigation.question??null;if(this.tab!=="questions"||this.folded||e===null||e===this.#l)return;this.#l=e;const i=this.renderRoot.querySelector(`[data-question="${e}"]`);i!==null&&typeof i.scrollIntoView=="function"&&i.scrollIntoView({block:"nearest"})}}const te=()=>{customElements.get("dpk-template-grill")||customElements.define("dpk-template-grill",ee)},Te=Object.freeze(Object.defineProperty({__proto__:null,DpkTemplateGrill:ee,GRILL_QUESTIONS_ATTRIBUTE:v,answerCounts:Q,answerQuestion:N,answerText:$,applyGrillAction:U,collectLabelBindings:X,defineGrillElement:te,describeGrillAction:W,emptyGrillBase:G,findQuestion:c,grillActions:w,grillBaseSchema:_,grillCommentTargets:j,grillDefinition:J,grillHasTarget:Y,grillTargetLabel:H,grillTitle:M,isAnswered:y,openQuestionId:D,optionLetter:O,parseGrillBase:B,positionLabels:Z,presentGrillHeader:K,presentGrillPanel:P,questionLabel:R,questionRef:fe,resolveGrillNavigation:V,serializeGrillAction:F,withAnswer:q},Symbol.toStringTag,{value:"Module"}));export{te as d,Te as i};
