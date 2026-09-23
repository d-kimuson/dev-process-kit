import{r as ne,ah as oe,a9 as h,ae as b,af as x,ac as c,aj as T,a8 as le,ab as z,aa as v,ak as se,S as A,V as de,a2 as l,a3 as ce,a1 as u,a0 as pe,c as L,av as ge}from"./shared-BpZBcqrz.js";import{c as C}from"./shared-DPcZakya.js";const ue=oe("kind",[h({kind:T("option"),optionId:b(c(),x(1))}),h({kind:T("free"),text:c()}),h({kind:T("clear")})]),$={ANSWER_QUESTION:ne("ANSWER_QUESTION","question",ue)},N=(t,e)=>({type:"ANSWER_QUESTION",target:{type:"question",id:t},payload:e}),fe=h({id:b(c(),x(1)),label:b(c(),x(1))}),he=h({id:b(c(),x(1)),ref:v(b(c(),x(1))),title:b(c(),x(1)),description:v(c()),note:v(c()),options:v(z(fe),[]),freeText:v(se(),!0)}),_=h({title:v(c(),""),questions:z(he)}),B=t=>{const e=le(_,t),i=new Set,r=e.questions.map((a,o)=>{if(i.has(a.id))throw new Error(`duplicate question id: ${a.id}`);i.add(a.id);const s=new Set;for(const n of a.options){if(s.has(n.id))throw new Error(`duplicate option id: ${n.id} in question ${a.id}`);s.add(n.id)}return{id:a.id,ref:a.ref??`Q${o+1}`,title:a.title,description:a.description??null,note:a.note??null,options:a.options,freeText:a.freeText}});return{title:e.title,questions:r,answers:{}}},G=()=>({title:"",questions:[],answers:{}}),p=(t,e)=>t.questions.find(i=>i.id===e),be=(t,e)=>p(t,e)?.ref??e,E=(t,e)=>{const i=p(t,e);return i?`${i.ref} \xB7 ${i.title}`:e},k=(t,e)=>e?e.kind==="option"?t.options.find(i=>i.id===e.optionId)?.label??"":e.text.trim():"",y=(t,e)=>k(t,e)!=="",O=t=>{let e="";for(let i=t+1;i>0;i=Math.floor((i-1)/26))e=String.fromCharCode(97+(i-1)%26)+e;return e},Q=t=>({total:t.questions.length,answered:t.questions.filter(e=>y(e,t.answers[e.id])).length}),q=(t,e,i)=>{const r=t.answers[e];if(i===null){if(r===void 0)return t;const a={...t.answers};return delete a[e],{...t,answers:a}}return r?.kind===i.kind&&(r.kind==="option"&&i.kind==="option"&&r.optionId===i.optionId||r.kind==="free"&&i.kind==="free"&&r.text===i.text)?t:{...t,answers:{...t.answers,[e]:i}}},U=(t,e)=>{if(e.type!=="ANSWER_QUESTION")return null;const i=p(t,e.target.id);if(!i)return null;const r=A($.ANSWER_QUESTION,e);return r.kind==="clear"?q(t,i.id,null):r.kind==="option"?i.options.some(a=>a.id===r.optionId)?q(t,i.id,{kind:"option",optionId:r.optionId}):null:q(t,i.id,{kind:"free",text:r.text})},M=t=>t.title===""?"Visually Grill":t.title,H=(t,e)=>{switch(e.type){case"question":return E(t,e.id);case"artifact":return"Artifact \u5168\u4F53";default:return e.id}},xe=(t,e)=>{const i=A($.ANSWER_QUESTION,e);return i.kind==="clear"?{title:"\u56DE\u7B54\u3092\u30AF\u30EA\u30A2",tone:"delete"}:i.kind==="option"?{title:"\u56DE\u7B54",tone:"update",body:`\u2192 \u300C${p(t,e.target.id)?.options.find(r=>r.id===i.optionId)?.label??i.optionId}\u300D`}:{title:"\u81EA\u7531\u8A18\u8FF0\u3067\u56DE\u7B54",tone:"update",body:`\u2192 \u300C${i.text.slice(0,120)}\u300D`}},W=(t,e,i)=>{let r;try{r=xe(i??e,t)}catch{r={title:t.type,tone:"meta"}}return{title:r.title,targetLabel:H(e,t.target),tone:r.tone,...r.body===void 0?{}:{summary:r.body}}},F=t=>`${t.type} ${de(t.target)} ${JSON.stringify(t.payload)}`,j=t=>t.questions.map(e=>({value:`question:${e.id}`,label:E(t,e.id),group:"\u8CEA\u554F"})),V=(t,e)=>{const i=e.question;if(i!==void 0&&p(t,i))return e;const r=t.questions[0];return r===void 0?e:{...e,question:r.id}},D=(t,e)=>{const i=e.question;return i!==void 0&&p(t,i)?i:t.questions[0]?.id??null},ve=(t,e)=>{const i=t.questions,r=i.findIndex(a=>a.id===e);return(r===-1?i:[...i.slice(r+1),...i.slice(0,r)]).find(a=>!y(a,t.answers[a.id]))?.id??null},me=(t,e,i)=>{const r=e.answers[t.id];return{id:t.id,ref:t.ref,title:t.title,description:t.description,note:t.note,open:t.id===i,answered:k(t,r)!=="",summary:k(t,r),choices:t.options.map((a,o)=>({id:a.id,letter:O(o),label:a.label,checked:r?.kind==="option"&&r.optionId===a.id})),draft:r?.kind==="free"?r.text:"",freeSelected:r?.kind==="free",allowFreeText:t.freeText}},P=(t,e)=>{const i=D(t,e);return{questions:t.questions.map(r=>me(r,t,i))}},K=t=>{const e=Q(t);return{progress:`\u56DE\u7B54\u6E08\u307F ${e.answered} / ${e.total}`,answered:e.answered,total:e.total}},Y=(t,e)=>{switch(e.type){case"question":return p(t,e.id)!==void 0;case"artifact":return!0;default:return!1}},J={name:"grill",label:"Visually Grill",parseBase:B,emptyBase:G,actions:$,apply:U,hasTarget:Y,describe:W,serialize:F,resolveNavigation:V,commentTargets:t=>j(t),title:M},m="data-grill-questions",we=t=>{const e=[t];for(const i of t.querySelectorAll("*"))i.shadowRoot&&e.push(i.shadowRoot);return e},X=(t,e,i)=>{const r=i.question??e.questions[0]?.id??null,a=new Map(e.questions.map(s=>[s.ref,s])),o=[];for(const s of we(t))for(const n of s.querySelectorAll(`[${m}]`)){const g=n.getAttribute(m)??"";for(const f of g.split(/\s+/)){if(f==="")continue;const d=a.get(f);d&&o.push({index:o.length,target:n,questionId:d.id,ref:d.ref,title:d.title,answered:y(d,e.answers[d.id]),open:d.id===r})}}return o},Z=(t,e)=>{const i=t.getBoundingClientRect(),r=new Map;e.forEach((o,s)=>{const n=t.querySelector(`[data-label="${s}"]`);if(!n)return;const g=r.get(o.target)??[];g.push(n),r.set(o.target,g)});const a=new Map;for(const[o,s]of r){const n=o.getBoundingClientRect(),g=n.width>0||n.height>0,f=a.get(o)??$e(o,t);a.set(o,f);const d=n.bottom>i.top&&n.top<i.bottom&&n.right>i.left&&n.left<i.right,R=n.bottom>f.top&&n.top<f.bottom;s.forEach((w,ie)=>{if(w.dataset.visible=String(g&&d&&R),!g||!d||!R)return;const S=w.offsetWidth,I=w.offsetHeight,re=n.right-i.left-S+8-(s.length-1-ie)*(S+5),ae=n.top-i.top-I/2;w.style.transform=`translate(${C(re,0,Math.max(0,t.clientWidth-S))}px, ${C(ae,0,Math.max(0,t.clientHeight-I))}px)`})}},$e=(t,e)=>{const i=t.getRootNode(),r=i instanceof ShadowRoot?i.host:null,a=r?.shadowRoot?.querySelector(".diagram-canvas")??null;return a instanceof Element?a.getBoundingClientRect():r instanceof Element?r.getBoundingClientRect():e.getBoundingClientRect()},ke=(t,e)=>l`
  <div class="grill-list">
    ${t.questions.length===0?l`<p class="grill-empty">該当する質問はありません。</p>`:ce(t.questions,i=>i.id,i=>ye(i,e))}
  </div>
`,ye=(t,e)=>l`
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
        ${!t.open&&t.answered?l`<span class="grill-summary">${t.summary}</span>`:u}
      </span>
      <span class="grill-chevron" aria-hidden="true">${t.open?"\u2212":"+"}</span>
    </button>
    ${t.open?l`<div class="grill-body" id=${`grill-body-${t.id}`}>
            ${t.description?l`<p class="grill-description">${t.description}</p>`:u}
            ${t.note?l`<p class="grill-note">${t.note}</p>`:u}
            <div class="grill-choices" role="radiogroup" aria-label=${t.title}>
              ${t.choices.map(i=>qe(t.id,i,e))}
              ${t.allowFreeText?l`<label class="grill-choice grill-choice--free" data-free=${String(t.freeSelected)}>
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
            ${t.allowFreeText?l`<textarea
                    class="af-textarea grill-free"
                    data-free-text=${t.id}
                    aria-label=${`${t.ref} \u306E\u81EA\u7531\u8A18\u8FF0`}
                    placeholder="回答を入力…（⌘/Ctrl+Enter で次へ）"
                    .value=${t.draft}
                    ?hidden=${!t.freeSelected}
                    @input=${i=>{const r=i.currentTarget;r instanceof HTMLTextAreaElement&&e.answer(t.id,{kind:"free",text:r.value})}}
                    @keydown=${i=>{i.isComposing||!(i.metaKey||i.ctrlKey)||i.key!=="Enter"||(i.preventDefault(),e.next(t.id))}}
                  ></textarea>`:u}
            ${t.answered?l`<button
                    type="button"
                    class="grill-clear"
                    @click=${()=>e.answer(t.id,{kind:"clear"})}
                  >
                    回答をクリア
                  </button>`:u}
          </div>`:u}
  </section>
`,qe=(t,e,i)=>l`
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
`,Se=pe`
  .af-main {
    order: 1;
  }

  /* The shell's sidebar becomes a right-hand rail, keeping its width and scroll. */
  .af-sidebar {
    order: 2;
    width: 336px;
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 0;
    border-right: 0;
    border-left: 1px solid var(--af-rule);
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
  .af-sidebar[hidden] {
    display: none;
  }

  .grill-tab-panel artifact-comment-panel {
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
    border: 1px solid var(--af-rule-strong);
    border-radius: 999px;
    background: var(--af-paper-raised);
    color: var(--af-ink-soft);
    font-size: 16.5px;
    font-weight: 650;
    line-height: 1;
    box-shadow: var(--af-shadow);
    cursor: pointer;
    transition:
      color 160ms ease,
      background 160ms ease,
      border-color 160ms ease,
      box-shadow 160ms ease,
      transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .grill-toggle:hover {
    color: var(--af-ink);
    transform: translateY(-2px) scale(1.05);
    box-shadow: var(--af-shadow-lg);
  }

  .grill-toggle:active {
    transform: translateY(0) scale(0.97);
    box-shadow: var(--af-shadow-xs);
  }

  .grill-toggle:focus-visible {
    outline: none;
    box-shadow: var(--af-focus);
  }

  .grill-toggle[aria-expanded='true'] {
    color: var(--af-accent-ink);
    border-color: transparent;
    background: linear-gradient(135deg, var(--af-accent), #c23e12);
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
    border: 2px solid var(--af-paper-raised);
    border-radius: 999px;
    background: var(--af-paper-inset);
    color: var(--af-ink-faint);
    font-family: var(--af-mono);
    font-size: 9px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    line-height: 14px;
    /* The widest value is wider than the button it sits on: keep it on one line. */
    white-space: nowrap;
    text-align: center;
  }

  .grill-toggle[aria-expanded='true'] .grill-toggle-badge {
    background: var(--af-paper-raised);
    color: var(--af-ink-soft);
  }

  /* ------------------------------------------------------------- the list */

  .grill-tabs {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
    padding: 8px 10px;
    border-bottom: 1px solid var(--af-rule);
    background: var(--af-paper-raised);
  }

  .grill-tabs button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 9px;
    border: 1px solid transparent;
    border-radius: var(--af-radius-xs);
    background: transparent;
    color: var(--af-ink-faint);
    font-size: 11.5px;
    cursor: pointer;
  }

  .grill-tabs button:hover {
    background: var(--af-paper-inset);
    color: var(--af-ink);
  }

  .grill-tabs button[aria-selected='true'] {
    border-color: var(--af-rule-strong);
    background: var(--af-paper-raised);
    color: var(--af-ink);
    font-weight: 600;
    box-shadow: var(--af-shadow-xs);
  }

  .grill-count {
    font-family: var(--af-mono);
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    color: var(--af-ink-faint);
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
    color: var(--af-ink-faint);
  }

  .grill-question {
    border-bottom: 1px solid var(--af-rule);
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
    border-radius: var(--af-radius-xs);
    background: none;
    text-align: left;
    cursor: pointer;
  }

  .grill-heading:hover {
    background: var(--af-paper-sunken);
  }

  .grill-ref {
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    min-width: 30px;
    height: 22px;
    padding: 0 6px;
    border: 1px solid var(--af-rule-strong);
    border-radius: 999px;
    font-family: var(--af-mono);
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    color: var(--af-ink-faint);
  }

  .grill-question[data-answered='true'] .grill-ref {
    border-color: transparent;
    background: var(--af-green-soft);
    color: var(--af-green);
    font-weight: 600;
  }

  .grill-question:has(.grill-heading[aria-expanded='true']) .grill-ref {
    border-color: transparent;
    background: var(--af-accent-soft);
    color: var(--af-accent);
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
    color: var(--af-green);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .grill-chevron {
    flex: 0 0 auto;
    width: 16px;
    color: var(--af-ink-faint);
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
    color: var(--af-ink-soft);
  }

  .grill-note {
    margin: 0 0 10px;
    padding: 7px 10px;
    border-left: 2px solid var(--af-amber);
    border-radius: 0 var(--af-radius-xs) var(--af-radius-xs) 0;
    background: var(--af-amber-soft);
    font-size: 11px;
    line-height: 1.7;
    color: var(--af-ink-soft);
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
    border: 1px solid var(--af-rule);
    border-radius: var(--af-radius-sm);
    background: var(--af-paper);
    font-size: 11.5px;
    line-height: 1.7;
    cursor: pointer;
  }

  .grill-choice:hover {
    border-color: var(--af-rule-strong);
  }

  .grill-choice:has(input:checked) {
    border-color: color-mix(in srgb, var(--af-green) 45%, transparent);
    background: var(--af-green-soft);
  }

  .grill-choice input {
    flex: 0 0 auto;
    margin: 3px 0 0;
    accent-color: var(--af-green);
  }

  .grill-choice-text {
    display: flex;
    gap: 7px;
    min-width: 0;
  }

  .grill-letter {
    flex: 0 0 auto;
    font-family: var(--af-mono);
    font-size: 10px;
    line-height: 1.9;
    color: var(--af-green);
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
    color: var(--af-ink-faint);
    font-size: 10.5px;
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
  }

  .grill-clear:hover {
    color: var(--af-ink);
  }

  .grill-footer {
    flex-shrink: 0;
    padding: 10px 12px;
    border-top: 1px solid var(--af-rule);
    background: var(--af-paper-raised);
  }

  .grill-copy {
    width: 100%;
  }

  /* The copy button reports the outcome, so a click is never silent. */
  .grill-copy[data-status='copied'] {
    border-color: transparent;
    background: var(--af-green);
    color: var(--af-accent-ink);
  }

  .grill-copy[data-status='copied']:hover:not([disabled]) {
    border-color: transparent;
    background: color-mix(in srgb, var(--af-green) 85%, #000);
  }

  .grill-copy[data-status='failed'] {
    border-color: transparent;
    background: var(--af-amber);
    color: var(--af-accent-ink);
  }

  .grill-copy[data-status='failed']:hover:not([disabled]) {
    border-color: transparent;
    background: color-mix(in srgb, var(--af-amber) 85%, #000);
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
    border: 2px solid var(--af-paper-raised);
    border-radius: 999px;
    background: var(--af-accent);
    color: var(--af-accent-ink);
    font-family: var(--af-mono);
    font-size: 10px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    box-shadow: var(--af-shadow-xs);
    cursor: pointer;
    pointer-events: auto;
  }

  .grill-label[data-visible='false'] {
    visibility: hidden;
  }

  .grill-label:hover {
    background: color-mix(in srgb, var(--af-accent) 80%, #000);
  }

  .grill-label[data-answered='true'] {
    background: var(--af-green);
  }

  .grill-label[aria-pressed='true'] {
    box-shadow:
      0 0 0 2px color-mix(in srgb, var(--af-accent) 45%, transparent),
      var(--af-shadow-xs);
  }

  .grill-label:focus-visible {
    outline: none;
    box-shadow: var(--af-focus);
  }
`;class ee extends L{constructor(){super(),this.definition=J,this.#a=[],this.#n=!1,this.#o=null,this.#l=null,this.#i=null,this.#r="idle",this.#t=null,this.#e=()=>{this.#n||(this.#n=!0,requestAnimationFrame(()=>{this.#n=!1;const e=this.renderRoot.querySelector(".grill-labels");e&&Z(e,this.#a)}))},this.tab="questions",this.folded=!1}static{this.styles=[L.styles,Se]}static{this.properties={tab:{state:!0},folded:{state:!0}}}#a;#n;#o;#l;#i;#r;#t;connectedCallback(){super.connectedCallback(),document.addEventListener("scroll",this.#e,!0),window.addEventListener("resize",this.#e),this.addEventListener("artifact-diagram-view",this.#e)}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("scroll",this.#e,!0),window.removeEventListener("resize",this.#e),this.removeEventListener("artifact-diagram-view",this.#e),this.#i?.disconnect(),this.#i=null,this.#t!==null&&clearTimeout(this.#t),this.#t=null}renderRegions(e){return this.#a=X(this,e.state,e.navigation),{header:this.#c(e),main:this.#u(e,this.#a),sidebar:this.#p(e),sidebarHidden:this.folded}}updated(){super.updated(),this.#v(),this.#e(),this.#m();const e=this.#l;e!==null&&(this.#l=null,this.renderRoot.querySelector(`[data-free-text="${e}"]`)?.focus())}get integratedReview(){return!0}requestComment(e){this.tab="review",this.folded=!1,super.requestComment(e)}#s(e,i){this.tab="questions",this.folded=!1,this.#o=null,e.navigate({question:i})}#c(e){const i=K(e.state),r=`${this.folded?"\u8CEA\u554F / Review \u3092\u3072\u3089\u304F":"\u8CEA\u554F / Review \u3092\u305F\u305F\u3080"}\uFF08${i.progress}\uFF09`;return l`
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
    `}#p(e){const i=P(e.state,e.navigation),r=this.#r==="copied"?"\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F":this.#r==="failed"?"\u30B3\u30D4\u30FC\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F":"\u56DE\u7B54\u30FBReview \u3092\u307E\u3068\u3081\u3066\u30B3\u30D4\u30FC";return l`
      <div class="grill-panel">
        <div class="grill-tabs" role="tablist" aria-label="質問 / Review">
          ${["questions","review"].map(a=>l`
              <button
                type="button"
                role="tab"
                id=${`grill-tab-${a}`}
                data-tab=${a}
                aria-controls=${`grill-panel-${a}`}
                aria-selected=${String(this.tab===a)}
                tabindex=${this.tab===a?0:-1}
                @click=${()=>this.tab=a}
                @keydown=${o=>this.#g(o)}
              >
                ${a==="questions"?"\u8CEA\u554F":"Review"}<span class="grill-count"
                  >${a==="questions"?e.state.questions.length:e.actions.length}</span
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
          ${ke(i,{open:a=>this.#s(e,a),answer:(a,o)=>this.#f(a,o),next:a=>this.#d(a)})}
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
            class="af-btn af-btn--accent grill-copy"
            type="button"
            data-status=${this.#r}
            ?disabled=${e.actions.length===0}
            @click=${()=>{this.#h()}}
          >
            ${r}
          </button>
          <span class="grill-sr" role="status">${this.#r==="idle"?"":r}</span>
        </div>
      </div>
    `}#g(e){["ArrowLeft","ArrowRight","Home","End"].includes(e.key)&&(e.preventDefault(),this.tab=e.key==="Home"?"questions":e.key==="End"||this.tab==="questions"?"review":"questions",this.renderRoot.querySelector(`[data-tab="${this.tab}"]`)?.focus())}#u(e,i){return l`
      <div class="grill-stage">
        <slot name="main"></slot>
        <div class="grill-labels">
          ${i.map(r=>l`
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
    `}#f(e,i){if(this.dispatch(N(e,i)).ok){if(i.kind==="option"){this.#d(e);return}i.kind==="free"&&i.text===""&&(this.#l=e)}}#d(e){const i=ve(this.derivation.state,e);i!==null&&this.navigate({question:i})}async#h(){const e=this.artifact.exportBrief();this.#b(await ge(e)?"copied":"failed")}#b(e){this.#r=e,this.requestUpdate(),this.#t!==null&&clearTimeout(this.#t),this.#t=setTimeout(()=>{this.#t=null,this.#r="idle",this.requestUpdate()},2400)}#x(){this.requestUpdate()}#v(){this.#i?.disconnect(),this.#i??=new MutationObserver(()=>{this.#x(),this.#e()}),this.#i.observe(this,{childList:!0,subtree:!0,attributes:!0,attributeFilter:[m]});for(const e of this.querySelectorAll("*"))e===this||!e.shadowRoot||this.#i.observe(e.shadowRoot,{childList:!0,subtree:!0,attributes:!0,attributeFilter:[m]})}#e;#m(){const e=this.navigation.question??null;if(this.tab!=="questions"||this.folded||e===null||e===this.#o)return;this.#o=e;const i=this.renderRoot.querySelector(`[data-question="${e}"]`);i!==null&&typeof i.scrollIntoView=="function"&&i.scrollIntoView({block:"nearest"})}}const te=(t="artifact-grill")=>{customElements.get(t)||customElements.define(t,ee)},Te=Object.freeze(Object.defineProperty({__proto__:null,GRILL_QUESTIONS_ATTRIBUTE:m,GrillElement:ee,answerCounts:Q,answerQuestion:N,answerText:k,applyGrillAction:U,collectLabelBindings:X,defineGrillElement:te,describeGrillAction:W,emptyGrillBase:G,findQuestion:p,grillActions:$,grillBaseSchema:_,grillCommentTargets:j,grillDefinition:J,grillHasTarget:Y,grillTargetLabel:H,grillTitle:M,isAnswered:y,openQuestionId:D,optionLetter:O,parseGrillBase:B,positionLabels:Z,presentGrillHeader:K,presentGrillPanel:P,questionLabel:E,questionRef:be,resolveGrillNavigation:V,serializeGrillAction:F,withAnswer:q},Symbol.toStringTag,{value:"Module"}));export{te as d,Te as i};
