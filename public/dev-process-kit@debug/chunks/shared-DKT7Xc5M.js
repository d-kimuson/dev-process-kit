import{r as se,ad as de,a5 as h,aa as b,ab as x,a8 as c,af as E,a4 as ce,a7 as L,a6 as v,ag as pe,S as C,V as ue,a1 as s,a2 as ge,a0 as g,$ as fe,c as N,ao as he}from"./shared-BK58el9_.js";import{c as _}from"./shared-DPcZakya.js";const be=de("kind",[h({kind:E("option"),optionId:b(c(),x(1))}),h({kind:E("free"),text:c()}),h({kind:E("clear")})]),k={ANSWER_QUESTION:se("ANSWER_QUESTION","question",be)},B=(e,t)=>({type:"ANSWER_QUESTION",target:{type:"question",id:e},payload:t}),xe=h({id:b(c(),x(1)),label:b(c(),x(1))}),ve=h({id:b(c(),x(1)),ref:v(b(c(),x(1))),title:b(c(),x(1)),description:v(c()),note:v(c()),options:v(L(xe),[]),freeText:v(pe(),!0)}),G=h({title:v(c(),""),questions:L(ve)}),O=e=>{const t=ce(G,e),i=new Set,r=t.questions.map((a,n)=>{if(i.has(a.id))throw new Error(`duplicate question id: ${a.id}`);i.add(a.id);const l=new Set;for(const o of a.options){if(l.has(o.id))throw new Error(`duplicate option id: ${o.id} in question ${a.id}`);l.add(o.id)}return{id:a.id,ref:a.ref??`Q${n+1}`,title:a.title,description:a.description??null,note:a.note??null,options:a.options,freeText:a.freeText}});return{title:t.title,questions:r,answers:{}}},Q=()=>({title:"",questions:[],answers:{}}),p=(e,t)=>e.questions.find(i=>i.id===t),me=(e,t)=>p(e,t)?.ref??t,q=(e,t)=>{const i=p(e,t);return i?`${i.ref} \xB7 ${i.title}`:t},m=(e,t)=>t?t.kind==="option"?e.options.find(i=>i.id===t.optionId)?.label??"":t.text.trim():"",w=(e,t)=>m(e,t)!=="",U=e=>{let t="";for(let i=e+1;i>0;i=Math.floor((i-1)/26))t=String.fromCharCode(97+(i-1)%26)+t;return t},I=e=>{const t=e.questions.filter(i=>w(i,e.answers[i.id])).length;return{all:e.questions.length,open:e.questions.length-t,answered:t}},R=(e,t)=>t==="all"?e.questions:e.questions.filter(i=>w(i,e.answers[i.id])===(t==="answered")),M=e=>e.questions.flatMap(t=>{const i=m(t,e.answers[t.id]);return i===""?[]:[`## ${t.ref}. ${t.title}

${i}`]}).join(`

`),S=(e,t,i)=>{const r=e.answers[t];if(i===null){if(r===void 0)return e;const a={...e.answers};return delete a[t],{...e,answers:a}}return r?.kind===i.kind&&(r.kind==="option"&&i.kind==="option"&&r.optionId===i.optionId||r.kind==="free"&&i.kind==="free"&&r.text===i.text)?e:{...e,answers:{...e.answers,[t]:i}}},W=(e,t)=>{if(t.type!=="ANSWER_QUESTION")return null;const i=p(e,t.target.id);if(!i)return null;const r=C(k.ANSWER_QUESTION,t);return r.kind==="clear"?S(e,i.id,null):r.kind==="option"?i.options.some(a=>a.id===r.optionId)?S(e,i.id,{kind:"option",optionId:r.optionId}):null:S(e,i.id,{kind:"free",text:r.text})},F=e=>e.title===""?"Visually Grill":e.title,j=(e,t)=>{switch(t.type){case"question":return q(e,t.id);case"artifact":return"Artifact \u5168\u4F53";default:return t.id}},we=(e,t)=>{const i=C(k.ANSWER_QUESTION,t);return i.kind==="clear"?{title:"\u56DE\u7B54\u3092\u30AF\u30EA\u30A2",tone:"delete"}:i.kind==="option"?{title:"\u56DE\u7B54",tone:"update",body:`\u2192 \u300C${p(e,t.target.id)?.options.find(r=>r.id===i.optionId)?.label??i.optionId}\u300D`}:{title:"\u81EA\u7531\u8A18\u8FF0\u3067\u56DE\u7B54",tone:"update",body:`\u2192 \u300C${i.text.slice(0,120)}\u300D`}},H=(e,t,i)=>{let r;try{r=we(i??t,e)}catch{r={title:e.type,tone:"meta"}}return{title:r.title,targetLabel:j(t,e.target),tone:r.tone,...r.body===void 0?{}:{summary:r.body}}},V=e=>`${e.type} ${ue(e.target)} ${JSON.stringify(e.payload)}`,P=e=>e.questions.map(t=>({value:`question:${t.id}`,label:q(e,t.id),group:"\u8CEA\u554F"})),D=(e,t)=>{const i=t.question,r=(i===void 0?void 0:p(e,i))??e.questions[0];return r?{value:`question:${r.id}`,label:q(e,r.id),group:"\u8CEA\u554F"}:null},K=(e,t)=>{const i=t.question;if(i!==void 0&&p(e,i))return t;const r=e.questions[0];return r===void 0?t:{...t,question:r.id}},Y=(e,t)=>{const i=t.question;return i!==void 0&&p(e,i)?i:e.questions[0]?.id??null},ye=(e,t,i)=>{const r=R(e,t),a=r.findIndex(n=>n.id===i);return(a===-1?r:[...r.slice(a+1),...r.slice(0,a)]).find(n=>!w(n,e.answers[n.id]))?.id??null},$e={idle:"\u56DE\u7B54\u3092\u30B3\u30D4\u30FC",copied:"\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F",failed:"\u30B3\u30D4\u30FC\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F"},ke={all:"\u3059\u3079\u3066",open:"\u672A\u56DE\u7B54",answered:"\u56DE\u7B54\u6E08\u307F"},qe=["all","open","answered"],Se=(e,t,i)=>{const r=t.answers[e.id];return{id:e.id,ref:e.ref,title:e.title,description:e.description,note:e.note,open:e.id===i,answered:m(e,r)!=="",summary:m(e,r),choices:e.options.map((a,n)=>({id:a.id,letter:U(n),label:a.label,checked:r?.kind==="option"&&r.optionId===a.id})),draft:r?.kind==="free"?r.text:"",freeSelected:r?.kind==="free",allowFreeText:e.freeText}},J=(e,t,i,r="idle")=>{const a=I(e),n=Y(e,i);return{filters:qe.map(l=>({id:l,label:ke[l],count:a[l],selected:t===l})),questions:R(e,t).map(l=>Se(l,e,n)),canCopy:a.answered>0,copyStatus:r,copyLabel:$e[r]}},X=e=>{const t=I(e);return{progress:`\u56DE\u7B54\u6E08\u307F ${t.answered} / ${t.all}`,answered:t.answered,total:t.all}},Z=(e,t)=>{switch(t.type){case"question":return p(e,t.id)!==void 0;case"artifact":return!0;default:return!1}},ee={name:"grill",label:"Visually Grill",parseBase:O,emptyBase:Q,actions:k,apply:W,hasTarget:Z,describe:H,serialize:V,resolveNavigation:K,commentTargets:e=>P(e),currentTarget:(e,t)=>D(e,t),title:F},y="data-grill-questions",Te=e=>{const t=[e];for(const i of e.querySelectorAll("*"))i.shadowRoot&&t.push(i.shadowRoot);return t},te=(e,t,i)=>{const r=i.question??t.questions[0]?.id??null,a=new Map(t.questions.map(l=>[l.ref,l])),n=[];for(const l of Te(e))for(const o of l.querySelectorAll(`[${y}]`)){const u=o.getAttribute(y)??"";for(const f of u.split(/\s+/)){if(f==="")continue;const d=a.get(f);d&&n.push({index:n.length,target:o,questionId:d.id,ref:d.ref,title:d.title,answered:w(d,t.answers[d.id]),open:d.id===r})}}return n},ie=(e,t)=>{const i=e.getBoundingClientRect(),r=new Map;t.forEach((n,l)=>{const o=e.querySelector(`[data-label="${l}"]`);if(!o)return;const u=r.get(n.target)??[];u.push(o),r.set(n.target,u)});const a=new Map;for(const[n,l]of r){const o=n.getBoundingClientRect(),u=o.width>0||o.height>0,f=a.get(n)??Ee(n,e);a.set(n,f);const d=o.bottom>i.top&&o.top<i.bottom&&o.right>i.left&&o.left<i.right,z=o.bottom>f.top&&o.top<f.bottom;l.forEach(($,ne)=>{if($.dataset.visible=String(u&&d&&z),!u||!d||!z)return;const T=$.offsetWidth,A=$.offsetHeight,oe=o.right-i.left-T+8-(l.length-1-ne)*(T+5),le=o.top-i.top-A/2;$.style.transform=`translate(${_(oe,0,Math.max(0,e.clientWidth-T))}px, ${_(le,0,Math.max(0,e.clientHeight-A))}px)`})}},Ee=(e,t)=>{const i=e.getRootNode(),r=i instanceof ShadowRoot?i.host:null,a=r?.shadowRoot?.querySelector(".diagram-canvas")??null;return a instanceof Element?a.getBoundingClientRect():r instanceof Element?r.getBoundingClientRect():t.getBoundingClientRect()},Ie=(e,t)=>s`
  <div class="grill-filters" role="group" aria-label="質問の絞り込み">
    ${e.filters.map(i=>s`
        <button
          type="button"
          data-filter=${i.id}
          aria-pressed=${i.selected?"true":"false"}
          @click=${()=>t.filter(i.id)}
        >
          ${i.label}<span class="grill-count">${i.count}</span>
        </button>
      `)}
  </div>
  <div class="grill-list">
    ${e.questions.length===0?s`<p class="grill-empty">該当する質問はありません。</p>`:ge(e.questions,i=>i.id,i=>Re(i,t))}
  </div>
  <div class="grill-footer">
    <button
      class="af-btn af-btn--accent grill-copy"
      type="button"
      data-status=${e.copyStatus}
      ?disabled=${!e.canCopy}
      @click=${t.copy}
    >
      ${e.copyLabel}
    </button>
    <span class="grill-sr" role="status">${e.copyStatus==="idle"?"":e.copyLabel}</span>
  </div>
`,Re=(e,t)=>s`
  <section class="grill-question" data-question=${e.id} data-answered=${String(e.answered)}>
    <button
      class="grill-heading"
      type="button"
      aria-expanded=${e.open?"true":"false"}
      aria-controls=${`grill-body-${e.id}`}
      @click=${()=>t.open(e.id)}
    >
      <span class="grill-ref">${e.ref}</span>
      <span class="grill-heading-text">
        <strong>${e.title}</strong>
        ${!e.open&&e.answered?s`<span class="grill-summary">${e.summary}</span>`:g}
      </span>
      <span class="grill-chevron" aria-hidden="true">${e.open?"\u2212":"+"}</span>
    </button>
    ${e.open?s`<div class="grill-body" id=${`grill-body-${e.id}`}>
            ${e.description?s`<p class="grill-description">${e.description}</p>`:g}
            ${e.note?s`<p class="grill-note">${e.note}</p>`:g}
            <div class="grill-choices" role="radiogroup" aria-label=${e.title}>
              ${e.choices.map(i=>ze(e.id,i,t))}
              ${e.allowFreeText?s`<label class="grill-choice grill-choice--free" data-free=${String(e.freeSelected)}>
                      <input
                        type="radio"
                        name=${`grill-${e.id}`}
                        value="__free"
                        .checked=${e.freeSelected}
                        @change=${()=>t.answer(e.id,{kind:"free",text:""})}
                      />
                      <span class="grill-choice-text">自由記述</span>
                    </label>`:g}
            </div>
            ${e.allowFreeText?s`<textarea
                    class="af-textarea grill-free"
                    data-free-text=${e.id}
                    aria-label=${`${e.ref} \u306E\u81EA\u7531\u8A18\u8FF0`}
                    placeholder="回答を入力…（⌘/Ctrl+Enter で次へ）"
                    .value=${e.draft}
                    ?hidden=${!e.freeSelected}
                    @input=${i=>{const r=i.currentTarget;r instanceof HTMLTextAreaElement&&t.answer(e.id,{kind:"free",text:r.value})}}
                    @keydown=${i=>{i.isComposing||!(i.metaKey||i.ctrlKey)||i.key!=="Enter"||(i.preventDefault(),t.next(e.id))}}
                  ></textarea>`:g}
            ${e.answered?s`<button
                    type="button"
                    class="grill-clear"
                    @click=${()=>t.answer(e.id,{kind:"clear"})}
                  >
                    回答をクリア
                  </button>`:g}
          </div>`:g}
  </section>
`,ze=(e,t,i)=>s`
  <label class="grill-choice" data-choice=${t.id}>
    <input
      type="radio"
      name=${`grill-${e}`}
      value=${t.id}
      .checked=${t.checked}
      @change=${()=>i.answer(e,{kind:"option",optionId:t.id})}
    />
    <span class="grill-choice-text">
      <span class="grill-letter">(${t.letter})</span>
      <span>${t.label}</span>
    </span>
  </label>
`,Ae=fe`
  /*
   * The questions belong on the right, and the answers are the review: this
   * template does not use the core comment rail, so neither the rail nor its
   * floating button is rendered. The panel's copy button is the hand-off.
   */
  .af-notes {
    display: var(--grill-notes-display, none);
  }

  .af-fab {
    display: var(--grill-fab-display, none);
  }

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

  .grill-filters {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
    padding: 8px 10px;
    border-bottom: 1px solid var(--af-rule);
    background: var(--af-paper-raised);
  }

  .grill-filters button {
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

  .grill-filters button:hover {
    background: var(--af-paper-inset);
    color: var(--af-ink);
  }

  .grill-filters button[aria-pressed='true'] {
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
`;class re extends N{constructor(){super(),this.definition=ee,this.#r=[],this.#a=!1,this.#l=null,this.#n=null,this.#i=null,this.#o="idle",this.#t=null,this.#e=()=>{this.#a||(this.#a=!0,requestAnimationFrame(()=>{this.#a=!1;const t=this.renderRoot.querySelector(".grill-labels");t&&ie(t,this.#r)}))},this.filter="all",this.folded=!1}static{this.styles=[N.styles,Ae]}static{this.properties={filter:{state:!0},folded:{state:!0}}}#r;#a;#l;#n;#i;#o;#t;connectedCallback(){super.connectedCallback(),document.addEventListener("scroll",this.#e,!0),window.addEventListener("resize",this.#e),this.addEventListener("artifact-diagram-view",this.#e)}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("scroll",this.#e,!0),window.removeEventListener("resize",this.#e),this.removeEventListener("artifact-diagram-view",this.#e),this.#i?.disconnect(),this.#i=null,this.#t!==null&&clearTimeout(this.#t),this.#t=null}renderRegions(t){this.#r=te(this,t.state,t.navigation);const i=this.folded?void 0:this.#c(t);return{header:this.#d(t),main:this.#p(t,this.#r),...i===void 0?{}:{sidebar:i}}}updated(){super.updated(),this.#b(),this.#e(),this.#x();const t=this.#n;t!==null&&(this.#n=null,this.renderRoot.querySelector(`[data-free-text="${t}"]`)?.focus())}#d(t){const i=X(t.state),r=`${this.folded?"\u8CEA\u554F\u3092\u3072\u3089\u304F":"\u8CEA\u554F\u3092\u305F\u305F\u3080"}\uFF08${i.progress}\uFF09`;return s`
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
    `}#c(t){const i=J(t.state,this.filter,t.navigation,this.#o);return s`
      <div class="grill-panel">
        ${Ie(i,{filter:r=>this.filter=r,open:r=>t.navigate({question:r}),answer:(r,a)=>this.#u(r,a),next:r=>this.#s(r),copy:()=>{this.#g(t)}})}
      </div>
    `}#p(t,i){return s`
      <div class="grill-stage">
        <slot name="main"></slot>
        <div class="grill-labels">
          ${i.map(r=>s`
              <button
                type="button"
                class="grill-label"
                data-label=${r.index}
                data-answered=${String(r.answered)}
                data-visible="false"
                aria-pressed=${r.open?"true":"false"}
                aria-label=${`${r.ref} \xB7 ${r.title}`}
                title=${`${r.ref} \xB7 ${r.title}`}
                @click=${()=>t.navigate({question:r.questionId})}
              >
                ${r.ref}
              </button>
            `)}
        </div>
      </div>
    `}#u(t,i){if(this.dispatch(B(t,i)).ok){if(i.kind==="option"){this.#s(t);return}i.kind==="free"&&i.text===""&&(this.#n=t)}}#s(t){const i=ye(this.derivation.state,this.filter,t);i!==null&&this.navigate({question:i})}async#g(t){const i=M(t.state);i!==""&&this.#f(await he(i)?"copied":"failed")}#f(t){this.#o=t,this.requestUpdate(),this.#t!==null&&clearTimeout(this.#t),this.#t=setTimeout(()=>{this.#t=null,this.#o="idle",this.requestUpdate()},2400)}#h(){this.requestUpdate()}#b(){this.#i?.disconnect(),this.#i??=new MutationObserver(()=>{this.#h(),this.#e()}),this.#i.observe(this,{childList:!0,subtree:!0,attributes:!0,attributeFilter:[y]});for(const t of this.querySelectorAll("*"))t===this||!t.shadowRoot||this.#i.observe(t.shadowRoot,{childList:!0,subtree:!0,attributes:!0,attributeFilter:[y]})}#e;#x(){const t=this.navigation.question??null;if(t===null||t===this.#l)return;this.#l=t;const i=this.renderRoot.querySelector(`[data-question="${t}"]`);i!==null&&typeof i.scrollIntoView=="function"&&i.scrollIntoView({block:"nearest"})}}const ae=(e="artifact-grill")=>{customElements.get(e)||customElements.define(e,re)},Le=Object.freeze(Object.defineProperty({__proto__:null,GRILL_QUESTIONS_ATTRIBUTE:y,GrillElement:re,answerQuestion:B,answerText:m,applyGrillAction:W,collectLabelBindings:te,copyPayload:M,countsByFilter:I,defineGrillElement:ae,describeGrillAction:H,emptyGrillBase:Q,findQuestion:p,grillActions:k,grillBaseSchema:G,grillCommentTargets:P,grillCurrentTarget:D,grillDefinition:ee,grillHasTarget:Z,grillTargetLabel:j,grillTitle:F,isAnswered:w,openQuestionId:Y,optionLetter:U,parseGrillBase:O,positionLabels:ie,presentGrillHeader:X,presentGrillPanel:J,questionLabel:q,questionRef:me,resolveGrillNavigation:K,serializeGrillAction:V,visibleQuestions:R,withAnswer:S},Symbol.toStringTag,{value:"Module"}));export{ae as d,Le as i};
