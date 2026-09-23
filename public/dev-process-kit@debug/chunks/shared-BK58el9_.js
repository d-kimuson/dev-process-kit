const it=globalThis,ut=it.ShadowRoot&&(it.ShadyCSS===void 0||it.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,ft=Symbol(),Lt=new WeakMap;let Rt=class{constructor(e,t,i){if(this._$cssResult$=!0,i!==ft)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o;const t=this.t;if(ut&&e===void 0){const i=t!==void 0&&t.length===1;i&&(e=Lt.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),i&&Lt.set(t,e))}return e}toString(){return this.cssText}};const Ke=e=>new Rt(typeof e=="string"?e:e+"",void 0,ft),M=(e,...t)=>{const i=e.length===1?e[0]:t.reduce((a,n,s)=>a+(r=>{if(r._$cssResult$===!0)return r.cssText;if(typeof r=="number")return r;throw Error("Value passed to 'css' function must be a 'css' function result: "+r+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(n)+e[s+1],e[0]);return new Rt(i,e,ft)},Ve=(e,t)=>{if(ut)e.adoptedStyleSheets=t.map(i=>i instanceof CSSStyleSheet?i:i.styleSheet);else for(const i of t){const a=document.createElement("style"),n=it.litNonce;n!==void 0&&a.setAttribute("nonce",n),a.textContent=i.cssText,e.appendChild(a)}},Ht=ut?e=>e:e=>e instanceof CSSStyleSheet?(t=>{let i="";for(const a of t.cssRules)i+=a.cssText;return Ke(i)})(e):e,{is:We,defineProperty:Ye,getOwnPropertyDescriptor:Ze,getOwnPropertyNames:Qe,getOwnPropertySymbols:Ge,getPrototypeOf:Xe}=Object,at=globalThis,It=at.trustedTypes,ti=It?It.emptyScript:"",ei=at.reactiveElementPolyfillSupport,J=(e,t)=>e,gt={toAttribute(e,t){switch(t){case Boolean:e=e?ti:null;break;case Object:case Array:e=e==null?e:JSON.stringify(e)}return e},fromAttribute(e,t){let i=e;switch(t){case Boolean:i=e!==null;break;case Number:i=e===null?null:Number(e);break;case Object:case Array:try{i=JSON.parse(e)}catch{i=null}}return i}},Dt=(e,t)=>!We(e,t),Ft={attribute:!0,type:String,converter:gt,reflect:!1,useDefault:!1,hasChanged:Dt};Symbol.metadata??=Symbol("metadata"),at.litPropertyMetadata??=new WeakMap;let q=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=Ft){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){const i=Symbol(),a=this.getPropertyDescriptor(e,i,t);a!==void 0&&Ye(this.prototype,e,a)}}static getPropertyDescriptor(e,t,i){const{get:a,set:n}=Ze(this.prototype,e)??{get(){return this[t]},set(s){this[t]=s}};return{get:a,set(s){const r=a?.call(this);n?.call(this,s),this.requestUpdate(e,r,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??Ft}static _$Ei(){if(this.hasOwnProperty(J("elementProperties")))return;const e=Xe(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(J("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(J("properties"))){const t=this.properties,i=[...Qe(t),...Ge(t)];for(const a of i)this.createProperty(a,t[a])}const e=this[Symbol.metadata];if(e!==null){const t=litPropertyMetadata.get(e);if(t!==void 0)for(const[i,a]of t)this.elementProperties.set(i,a)}this._$Eh=new Map;for(const[t,i]of this.elementProperties){const a=this._$Eu(t,i);a!==void 0&&this._$Eh.set(a,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const t=[];if(Array.isArray(e)){const i=new Set(e.flat(1/0).reverse());for(const a of i)t.unshift(Ht(a))}else e!==void 0&&t.push(Ht(e));return t}static _$Eu(e,t){const i=t.attribute;return i===!1?void 0:typeof i=="string"?i:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){const e=new Map,t=this.constructor.elementProperties;for(const i of t.keys())this.hasOwnProperty(i)&&(e.set(i,this[i]),delete this[i]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return Ve(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,i){this._$AK(e,i)}_$ET(e,t){const i=this.constructor.elementProperties.get(e),a=this.constructor._$Eu(e,i);if(a!==void 0&&i.reflect===!0){const n=(i.converter?.toAttribute!==void 0?i.converter:gt).toAttribute(t,i.type);this._$Em=e,n==null?this.removeAttribute(a):this.setAttribute(a,n),this._$Em=null}}_$AK(e,t){const i=this.constructor,a=i._$Eh.get(e);if(a!==void 0&&this._$Em!==a){const n=i.getPropertyOptions(a),s=typeof n.converter=="function"?{fromAttribute:n.converter}:n.converter?.fromAttribute!==void 0?n.converter:gt;this._$Em=a;const r=s.fromAttribute(t,n.type);this[a]=r??this._$Ej?.get(a)??r,this._$Em=null}}requestUpdate(e,t,i,a=!1,n){if(e!==void 0){const s=this.constructor;if(a===!1&&(n=this[e]),i??=s.getPropertyOptions(e),!((i.hasChanged??Dt)(n,t)||i.useDefault&&i.reflect&&n===this._$Ej?.get(e)&&!this.hasAttribute(s._$Eu(e,i))))return;this.C(e,t,i)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(e,t,{useDefault:i,reflect:a,wrapped:n},s){i&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,s??t??this[e]),n!==!0||s!==void 0)||(this._$AL.has(e)||(this.hasUpdated||i||(t=void 0),this._$AL.set(e,t)),a===!0&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[a,n]of this._$Ep)this[a]=n;this._$Ep=void 0}const i=this.constructor.elementProperties;if(i.size>0)for(const[a,n]of i){const{wrapped:s}=n,r=this[a];s!==!0||this._$AL.has(a)||r===void 0||this.C(a,void 0,n,r)}}let e=!1;const t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(i=>i.hostUpdate?.()),this.update(t)):this._$EM()}catch(i){throw e=!1,this._$EM(),i}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(e){}firstUpdated(e){}};q.elementStyles=[],q.shadowRootOptions={mode:"open"},q[J("elementProperties")]=new Map,q[J("finalized")]=new Map,ei?.({ReactiveElement:q}),(at.reactiveElementVersions??=[]).push("2.1.2");const mt=globalThis,Jt=e=>e,nt=mt.trustedTypes,Kt=nt?nt.createPolicy("lit-html",{createHTML:e=>e}):void 0,Vt="$lit$",S=`lit$${Math.random().toFixed(9).slice(2)}$`,Wt="?"+S,ii=`<${Wt}>`,T=document,K=()=>T.createComment(""),V=e=>e===null||typeof e!="object"&&typeof e!="function",bt=Array.isArray,ai=e=>bt(e)||typeof e?.[Symbol.iterator]=="function",yt=`[ 	
\f\r]`,W=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,Yt=/-->/g,Zt=/>/g,U=RegExp(`>|${yt}(?:([^\\s"'>=/]+)(${yt}*=${yt}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),Qt=/'/g,Gt=/"/g,Xt=/^(?:script|style|textarea|title)$/i,te=e=>(t,...i)=>({_$litType$:e,strings:t,values:i}),g=te(1),ni=te(2),N=Symbol.for("lit-noChange"),f=Symbol.for("lit-nothing"),ee=new WeakMap,z=T.createTreeWalker(T,129);function ie(e,t){if(!bt(e)||!e.hasOwnProperty("raw"))throw Error("invalid template strings array");return Kt!==void 0?Kt.createHTML(t):t}const si=(e,t)=>{const i=e.length-1,a=[];let n,s=t===2?"<svg>":t===3?"<math>":"",r=W;for(let c=0;c<i;c++){const o=e[c];let p,d,l=-1,u=0;for(;u<o.length&&(r.lastIndex=u,d=r.exec(o),d!==null);)u=r.lastIndex,r===W?d[1]==="!--"?r=Yt:d[1]!==void 0?r=Zt:d[2]!==void 0?(Xt.test(d[2])&&(n=RegExp("</"+d[2],"g")),r=U):d[3]!==void 0&&(r=U):r===U?d[0]===">"?(r=n??W,l=-1):d[1]===void 0?l=-2:(l=r.lastIndex-d[2].length,p=d[1],r=d[3]===void 0?U:d[3]==='"'?Gt:Qt):r===Gt||r===Qt?r=U:r===Yt||r===Zt?r=W:(r=U,n=void 0);const h=r===U&&e[c+1].startsWith("/>")?" ":"";s+=r===W?o+ii:l>=0?(a.push(p),o.slice(0,l)+Vt+o.slice(l)+S+h):o+S+(l===-2?c:h)}return[ie(e,s+(e[i]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),a]};class et{constructor({strings:t,_$litType$:i},a){let n;this.parts=[];let s=0,r=0;const c=t.length-1,o=this.parts,[p,d]=si(t,i);if(this.el=et.createElement(p,a),z.currentNode=this.el.content,i===2||i===3){const l=this.el.content.firstChild;l.replaceWith(...l.childNodes)}for(;(n=z.nextNode())!==null&&o.length<c;){if(n.nodeType===1){if(n.hasAttributes())for(const l of n.getAttributeNames())if(l.endsWith(Vt)){const u=d[r++],h=n.getAttribute(l).split(S),b=/([.?@])?(.*)/.exec(u);o.push({type:1,index:s,name:b[2],strings:h,ctor:b[1]==="."?oi:b[1]==="?"?ci:b[1]==="@"?li:st}),n.removeAttribute(l)}else l.startsWith(S)&&(o.push({type:6,index:s}),n.removeAttribute(l));if(Xt.test(n.tagName)){const l=n.textContent.split(S),u=l.length-1;if(u>0){n.textContent=nt?nt.emptyScript:"";for(let h=0;h<u;h++)n.append(l[h],K()),z.nextNode(),o.push({type:2,index:++s});n.append(l[u],K())}}}else if(n.nodeType===8)if(n.data===Wt)o.push({type:2,index:s});else{let l=-1;for(;(l=n.data.indexOf(S,l+1))!==-1;)o.push({type:7,index:s}),l+=S.length-1}s++}}static createElement(t,i){const a=T.createElement("template");return a.innerHTML=t,a}}function L(e,t,i=e,a){if(t===N)return t;let n=a!==void 0?i._$Co?.[a]:i._$Cl;const s=V(t)?void 0:t._$litDirective$;return n?.constructor!==s&&(n?._$AO?.(!1),s===void 0?n=void 0:(n=new s(e),n._$AT(e,i,a)),a!==void 0?(i._$Co??=[])[a]=n:i._$Cl=n),n!==void 0&&(t=L(e,n._$AS(e,t.values),n,a)),t}class ri{constructor(t,i){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=i}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:i},parts:a}=this._$AD,n=(t?.creationScope??T).importNode(i,!0);z.currentNode=n;let s=z.nextNode(),r=0,c=0,o=a[0];for(;o!==void 0;){if(r===o.index){let p;o.type===2?p=new F(s,s.nextSibling,this,t):o.type===1?p=new o.ctor(s,o.name,o.strings,this,t):o.type===6&&(p=new di(s,this,t)),this._$AV.push(p),o=a[++c]}r!==o?.index&&(s=z.nextNode(),r++)}return z.currentNode=T,n}p(t){let i=0;for(const a of this._$AV)a!==void 0&&(a.strings!==void 0?(a._$AI(t,a,i),i+=a.strings.length-2):a._$AI(t[i])),i++}}class F{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,i,a,n){this.type=2,this._$AH=f,this._$AN=void 0,this._$AA=t,this._$AB=i,this._$AM=a,this.options=n,this._$Cv=n?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const i=this._$AM;return i!==void 0&&t?.nodeType===11&&(t=i.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,i=this){t=L(this,t,i),V(t)?t===f||t==null||t===""?(this._$AH!==f&&this._$AR(),this._$AH=f):t!==this._$AH&&t!==N&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):ai(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==f&&V(this._$AH)?this._$AA.nextSibling.data=t:this.T(T.createTextNode(t)),this._$AH=t}$(t){const{values:i,_$litType$:a}=t,n=typeof a=="number"?this._$AC(t):(a.el===void 0&&(a.el=et.createElement(ie(a.h,a.h[0]),this.options)),a);if(this._$AH?._$AD===n)this._$AH.p(i);else{const s=new ri(n,this),r=s.u(this.options);s.p(i),this.T(r),this._$AH=s}}_$AC(t){let i=ee.get(t.strings);return i===void 0&&ee.set(t.strings,i=new et(t)),i}k(t){bt(this._$AH)||(this._$AH=[],this._$AR());const i=this._$AH;let a,n=0;for(const s of t)n===i.length?i.push(a=new F(this.O(K()),this.O(K()),this,this.options)):a=i[n],a._$AI(s),n++;n<i.length&&(this._$AR(a&&a._$AB.nextSibling,n),i.length=n)}_$AR(t=this._$AA.nextSibling,i){for(this._$AP?.(!1,!0,i);t!==this._$AB;){const a=Jt(t).nextSibling;Jt(t).remove(),t=a}}setConnected(t){this._$AM===void 0&&(this._$Cv=t,this._$AP?.(t))}}class st{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,i,a,n,s){this.type=1,this._$AH=f,this._$AN=void 0,this.element=t,this.name=i,this._$AM=n,this.options=s,a.length>2||a[0]!==""||a[1]!==""?(this._$AH=Array(a.length-1).fill(new String),this.strings=a):this._$AH=f}_$AI(t,i=this,a,n){const s=this.strings;let r=!1;if(s===void 0)t=L(this,t,i,0),r=!V(t)||t!==this._$AH&&t!==N,r&&(this._$AH=t);else{const c=t;let o,p;for(t=s[0],o=0;o<s.length-1;o++)p=L(this,c[a+o],i,o),p===N&&(p=this._$AH[o]),r||=!V(p)||p!==this._$AH[o],p===f?t=f:t!==f&&(t+=(p??"")+s[o+1]),this._$AH[o]=p}r&&!n&&this.j(t)}j(t){t===f?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class oi extends st{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===f?void 0:t}}class ci extends st{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==f)}}class li extends st{constructor(t,i,a,n,s){super(t,i,a,n,s),this.type=5}_$AI(t,i=this){if((t=L(this,t,i,0)??f)===N)return;const a=this._$AH,n=t===f&&a!==f||t.capture!==a.capture||t.once!==a.once||t.passive!==a.passive,s=t!==f&&(a===f||n);n&&this.element.removeEventListener(this.name,this,a),s&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class di{constructor(t,i,a){this.element=t,this.type=6,this._$AN=void 0,this._$AM=i,this.options=a}get _$AU(){return this._$AM._$AU}_$AI(t){L(this,t)}}const pi={I:F},hi=mt.litHtmlPolyfillSupport;hi?.(et,F),(mt.litHtmlVersions??=[]).push("3.3.3");const ui=(e,t,i)=>{const a=i?.renderBefore??t;let n=a._$litPart$;if(n===void 0){const s=i?.renderBefore??null;a._$litPart$=n=new F(t.insertBefore(K(),s),s,void 0,i??{})}return n._$AI(e),n},vt=globalThis;let E=class extends q{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=ui(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return N}};E._$litElement$=!0,E.finalized=!0,vt.litElementHydrateSupport?.({LitElement:E});const fi=vt.litElementPolyfillSupport;fi?.({LitElement:E}),(vt.litElementVersions??=[]).push("4.2.2");const rt=M`
  :host {
    /* Neutral, white-based surface scale. */
    --af-paper: #fafbfc;
    --af-paper-raised: #ffffff;
    --af-paper-sunken: #f3f5f8;
    --af-paper-inset: #eceef2;
    --af-ink: #1a1d24;
    --af-ink-soft: #4d5566;
    --af-ink-faint: #7c8599;
    --af-rule: rgba(20, 28, 44, 0.08);
    --af-rule-strong: rgba(20, 28, 44, 0.14);
    --af-accent: #d94920;
    --af-accent-soft: rgba(217, 73, 32, 0.07);
    --af-accent-ink: #ffffff;
    --af-blue: #3366cc;
    --af-blue-soft: rgba(51, 102, 204, 0.08);
    --af-green: #1a8a4a;
    --af-green-soft: rgba(26, 138, 74, 0.08);
    --af-amber: #b47a0a;
    --af-amber-soft: rgba(180, 122, 10, 0.09);
    --af-violet: #7c4dcc;
    --af-violet-soft: rgba(124, 77, 204, 0.08);
    --af-display: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    --af-body: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    --af-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;

    /* Shape + elevation scale, so every surface reads as one system. */
    --af-radius-xs: 5px;
    --af-radius-sm: 7px;
    --af-radius: 8px;
    --af-radius-lg: 12px;
    --af-shadow-xs: 0 1px 2px rgba(20, 28, 44, 0.05), 0 1px 1px rgba(20, 28, 44, 0.03);
    --af-shadow-sm: 0 1px 2px rgba(20, 28, 44, 0.06), 0 2px 8px -2px rgba(20, 28, 44, 0.12);
    --af-shadow: 0 1px 3px rgba(20, 28, 44, 0.06), 0 8px 24px -8px rgba(20, 28, 44, 0.18);
    --af-shadow-lg: 0 2px 6px rgba(20, 28, 44, 0.06), 0 16px 40px -12px rgba(20, 28, 44, 0.22);
    --af-focus: 0 0 0 3px rgba(51, 102, 204, 0.25);
    --af-control-h: 32px;

    color: var(--af-ink);
    font-family: var(--af-body);
    font-size: 14px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    display: block;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  h1,
  h2,
  h3,
  h4 {
    font-family: var(--af-display);
    font-weight: 650;
    margin: 0;
    line-height: 1.2;
    letter-spacing: -0.01em;
  }

  button {
    font: inherit;
    color: inherit;
  }

  ::selection {
    background: rgba(47, 90, 168, 0.18);
  }

  .af-mono,
  .af-num {
    font-variant-numeric: tabular-nums;
  }

  .af-label {
    font-family: var(--af-mono);
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--af-ink-faint);
  }
`,ot=M`
  .af-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 30px;
    padding: 0 12px;
    border: 1px solid var(--af-rule-strong);
    border-radius: var(--af-radius-sm);
    background: var(--af-paper-raised);
    color: var(--af-ink);
    font-size: 12.5px;
    font-weight: 520;
    line-height: 1;
    white-space: nowrap;
    box-shadow: var(--af-shadow-xs);
    cursor: pointer;
    transition:
      background 140ms ease,
      border-color 140ms ease,
      box-shadow 140ms ease,
      color 140ms ease,
      transform 80ms ease;
  }

  .af-btn:hover:not([disabled]) {
    background: var(--af-paper-sunken);
    border-color: rgba(20, 28, 44, 0.22);
    box-shadow: var(--af-shadow-sm);
  }

  .af-btn:active:not([disabled]) {
    transform: translateY(1px);
    box-shadow: none;
  }

  .af-btn:focus-visible {
    outline: none;
    box-shadow: var(--af-focus);
  }

  .af-btn[disabled] {
    opacity: 0.45;
    box-shadow: none;
    cursor: not-allowed;
  }

  .af-btn--accent {
    border-color: transparent;
    background: linear-gradient(180deg, var(--af-accent), #c23e12);
    color: var(--af-accent-ink);
    box-shadow:
      0 1px 2px rgba(217, 73, 32, 0.25),
      0 0 0 1px rgba(217, 73, 32, 0.15);
  }

  .af-btn--accent:hover:not([disabled]) {
    background: linear-gradient(180deg, #e0521f, #b83710);
    border-color: transparent;
    box-shadow:
      0 2px 6px rgba(217, 73, 32, 0.3),
      0 0 0 1px rgba(217, 73, 32, 0.2);
  }

  /* Selection state, shared by every template's filter/nav controls. */
  .af-btn--selected {
    border-color: transparent;
    background: linear-gradient(180deg, var(--af-blue), #2952a3);
    color: #fff;
    box-shadow: 0 1px 3px rgba(51, 102, 204, 0.3);
  }

  .af-btn--selected:hover:not([disabled]) {
    background: linear-gradient(180deg, #2952a3, #213f80);
    border-color: transparent;
    box-shadow: 0 2px 6px rgba(51, 102, 204, 0.35);
  }

  .af-btn--ghost {
    border-color: transparent;
    background: transparent;
    box-shadow: none;
    color: var(--af-ink-soft);
  }

  .af-btn--ghost:hover:not([disabled]) {
    background: var(--af-paper-inset);
    border-color: transparent;
    color: var(--af-ink);
  }

  .af-icon-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: var(--af-radius-xs);
    background: transparent;
    color: var(--af-ink-faint);
    font-size: 11px;
    line-height: 1;
    cursor: pointer;
    transition:
      background 140ms ease,
      color 140ms ease,
      transform 100ms ease;
  }

  .af-icon-btn:hover:not([disabled]) {
    background: var(--af-paper-inset);
    color: var(--af-ink);
    transform: scale(1.08);
  }

  .af-icon-btn:focus-visible {
    outline: none;
    box-shadow: var(--af-focus);
  }

  .af-icon-btn[disabled] {
    opacity: 0.35;
    cursor: default;
  }

  .af-icon-btn[data-active='true'] {
    background: var(--af-blue-soft);
    color: var(--af-blue);
  }

  .af-icon-btn svg {
    display: block;
    width: 15px;
    height: 15px;
  }

  /* Count badge for an icon-only control (comments on a card, drafts on the rail). */
  .af-icon-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 15px;
    height: 15px;
    padding: 0 3px;
    border: 1.5px solid var(--af-paper-raised);
    border-radius: 999px;
    background: var(--af-accent);
    color: var(--af-accent-ink);
    font-family: var(--af-mono);
    font-size: 9px;
    font-variant-numeric: tabular-nums;
    line-height: 12px;
    text-align: center;
  }

  .af-input,
  .af-textarea,
  .af-select {
    width: 100%;
    min-height: var(--af-control-h);
    padding: 5px 9px;
    border: 1px solid var(--af-rule-strong);
    border-radius: var(--af-radius-sm);
    background: var(--af-paper-raised);
    color: var(--af-ink);
    font: inherit;
    font-size: 12.5px;
    transition:
      border-color 120ms ease,
      box-shadow 120ms ease;
  }

  .af-input:hover,
  .af-textarea:hover,
  .af-select:hover {
    border-color: rgba(20, 22, 26, 0.24);
  }

  .af-input:focus,
  .af-textarea:focus,
  .af-select:focus {
    outline: none;
    border-color: var(--af-blue);
    box-shadow: var(--af-focus);
  }

  .af-select {
    appearance: none;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M3 4.5 6 7.5 9 4.5' fill='none' stroke='%23878e9e' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/></svg>");
    background-repeat: no-repeat;
    background-position: right 7px center;
    padding-right: 26px;
    cursor: pointer;
  }

  .af-textarea {
    resize: vertical;
    min-height: 64px;
    line-height: 1.55;
  }
`,gi=M`
  .comment-pop {
    box-sizing: border-box;
    overflow: auto;
    position: fixed;
    inset: auto;
    margin: 0;
    display: grid;
    gap: 8px;
    padding: 12px;
    border: 1px solid var(--af-rule);
    border-radius: var(--af-radius-lg);
    background: var(--af-paper-raised);
    box-shadow: var(--af-shadow-lg);
    color: var(--af-ink);
    font-size: 12.5px;
  }

  .comment-pop .comment-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 4px;
    max-height: 140px;
    overflow: auto;
    font-size: 12px;
    color: var(--af-ink-soft);
  }

  .comment-pop .comment-list li {
    padding-left: 8px;
    border-left: 2px solid var(--af-accent);
  }

  .comment-pop .af-textarea {
    min-height: 54px;
  }

  .pop-actions {
    display: flex;
    gap: 2px;
    align-items: center;
    justify-content: flex-end;
  }
`,ct=(e,t)=>e instanceof t?e:null;class ae extends E{static{this.styles=[rt,ot,M`
      :host {
        display: inline;
        /* Inherit the surrounding type scale instead of forcing the chrome size:
           an inline edit inside a 17px heading must look like a 17px heading. */
        font-family: inherit;
        font-size: inherit;
        font-weight: inherit;
        line-height: inherit;
      }

      .view {
        cursor: text;
        border-bottom: 1px dashed transparent;
        border-radius: 3px;
        padding: 1px 3px;
        transition:
          background 140ms ease,
          border-color 140ms ease;
      }

      .view:hover {
        border-bottom-color: var(--af-blue);
        background: var(--af-blue-soft);
      }

      .view[data-empty='true'] {
        color: var(--af-ink-faint);
        font-style: italic;
      }

      input,
      textarea {
        font: inherit;
        color: inherit;
        background: var(--af-paper-raised);
        border: 1px solid var(--af-blue);
        border-radius: var(--af-radius-sm);
        box-shadow: var(--af-focus);
        padding: 3px 7px;
        min-width: 0;
        width: 100%;
        transition: box-shadow 140ms ease;
      }

      textarea {
        min-height: 90px;
        resize: vertical;
        font-family: var(--af-body);
        line-height: 1.5;
      }
    `]}static{this.properties={value:{type:String},placeholder:{type:String},multiline:{type:Boolean},label:{type:String},editing:{state:!0}}}#t="";#e=0;connectedCallback(){super.connectedCallback(),this.#e+=1}constructor(){super(),this.value="",this.placeholder="",this.multiline=!1,this.label="",this.editing=!1,this.#t=""}startEditing(){this.#t=this.value,this.editing=!0}willUpdate(t){t.has("value")&&!this.editing&&(this.#t=this.value)}updated(){if(!this.editing)return;const t=this.renderRoot.querySelector("input, textarea"),i=this.renderRoot,a=i instanceof ShadowRoot?i.activeElement:document.activeElement;t&&a!==t&&(t.focus(),t.select())}render(){if(!this.editing){const i=this.value.length===0;return g`<span
        class="view"
        data-empty=${String(i)}
        role="button"
        tabindex="0"
        title="クリックして編集"
        @click=${this.#i}
        @keydown=${this.#a}
        >${i?this.placeholder||"\u672A\u8A2D\u5B9A":this.value}</span
      >`}const t=this.label||this.placeholder||"\u7DE8\u96C6";return g`
      ${this.multiline?g`<textarea
              class="af-textarea"
              .value=${this.#t}
              aria-label=${t}
              @input=${this.#n}
              @keydown=${this.#r}
              @blur=${this.#s}
            ></textarea>`:g`<input
              class="af-input"
              .value=${this.#t}
              aria-label=${t}
              @input=${this.#n}
              @keydown=${this.#r}
              @blur=${this.#s}
            />`}
    `}#i=t=>{t.stopPropagation(),this.editing=!0};#a=t=>{t.isComposing||(t.key==="Enter"||t.key===" ")&&(t.preventDefault(),this.editing=!0)};#n=t=>{const i=ct(t.target,HTMLInputElement)??ct(t.target,HTMLTextAreaElement);i!==null&&(this.#t=i.value)};#r=t=>{if(!t.isComposing){if(t.key==="Escape"){t.preventDefault(),this.#t=this.value,this.editing=!1;return}t.key==="Enter"&&(!this.multiline||t.metaKey||t.ctrlKey)&&(t.preventDefault(),this.#c())}};#s=t=>{const i=t.currentTarget;if(!(i instanceof HTMLInputElement||i instanceof HTMLTextAreaElement))return;const a=this.#e,{selectionStart:n,selectionEnd:s}=i;queueMicrotask(()=>{!this.isConnected||!this.editing||(a!==this.#e?(i.focus(),i.setSelectionRange(n,s)):this.#c())})};#c=()=>{if(!this.editing)return;this.editing=!1;const t=this.#t.trim();t!==this.value&&this.dispatchEvent(new CustomEvent("artifact-commit",{detail:{value:t},bubbles:!0,composed:!0}))}}const mi=(e="artifact-inline-edit")=>{customElements.get(e)||customElements.define(e,ae)},bi={lang:void 0,message:void 0,abortEarly:void 0,abortPipeEarly:void 0};function xt(e){return bi}let yi;function vi(e){return yi?.get(e)}let xi;function $i(e){return xi?.get(e)}let ki;function wi(e,t){return ki?.get(e)?.get(t)}function $t(e){const t=typeof e;return t==="string"?`"${e}"`:t==="number"||t==="bigint"||t==="boolean"?`${e}`:t==="object"||t==="function"?(e&&Object.getPrototypeOf(e)?.constructor?.name)??"null":t}function x(e,t,i,a,n){const s=n&&"input"in n?n.input:i.value,r=n?.expected??e.expects??null,c=n?.received??$t(s),o={kind:e.kind,type:e.type,input:s,expected:r,received:c,message:`Invalid ${t}: ${r?`Expected ${r} but r`:"R"}eceived ${c}`,requirement:e.requirement,path:n?.path,issues:n?.issues,lang:a.lang,abortEarly:a.abortEarly,abortPipeEarly:a.abortPipeEarly},p=e.kind==="schema",d=n?.message??e.message??wi(e.reference,o.lang)??(p?$i(o.lang):null)??a.message??vi(o.lang);d!==void 0&&(o.message=typeof d=="function"?d(o):d),p&&(i.typed=!1),i.issues?i.issues.push(o):i.issues=[o]}function Ai(e,t){return e===t||Number.isNaN(e)&&Number.isNaN(t)}function kt(e,t){const i=[...new Set(e)];return i.length>1?`(${i.join(` ${t} `)})`:i[0]??"never"}function w(e){return e["~standard"]={version:1,vendor:"valibot",validate:t=>e["~run"]({value:t},xt())},e}var _i=class extends Error{constructor(e){super(e[0].message),this.name="ValiError",this.issues=e}};function y(e,t){return{kind:"validation",type:"min_length",reference:y,async:!1,expects:`>=${e}`,requirement:e,message:t,"~run"(i,a){return i.typed&&i.value.length<this.requirement&&x(this,"length",i,a,{received:`${i.value.length}`}),i}}}function ne(e,t){return{kind:"validation",type:"regex",reference:ne,async:!1,expects:`${e}`,requirement:e,message:t,"~run"(i,a){return i.typed&&!this.requirement.test(i.value)&&x(this,"format",i,a),i}}}const Si={abortEarly:!0};function se(e,t,i){return typeof e.fallback=="function"?e.fallback(t,i):e.fallback}function lt(e,t,i){return typeof e.default=="function"?e.default(t,i):e.default}function dt(e,t){return w({kind:"schema",type:"array",reference:dt,expects:"Array",async:!1,item:e,message:t,"~run"(i,a){const n=i.value;if(Array.isArray(n)){i.typed=!0,i.value=[];for(let s=0;s<n.length;s++){const r=n[s],c=this.item["~run"]({value:r},a);if(c.issues){const o={type:"array",origin:"value",input:n,key:s,value:r};for(const p of c.issues)p.path?p.path.unshift(o):p.path=[o],i.issues?.push(p);if(i.issues||(i.issues=c.issues),a.abortEarly){i.typed=!1;break}}c.typed||(i.typed=!1),i.value.push(c.value)}}else x(this,"type",i,a);return i}})}function re(e){return w({kind:"schema",type:"boolean",reference:re,expects:"boolean",async:!1,message:e,"~run"(t,i){return typeof t.value=="boolean"?t.typed=!0:x(this,"type",t,i),t}})}function C(e,t){return w({kind:"schema",type:"exact_optional",reference:C,expects:e.expects,async:!1,wrapped:e,default:t,"~run"(i,a){return this.wrapped["~run"](i,a)}})}function Y(e,t){return w({kind:"schema",type:"literal",reference:Y,expects:$t(e),async:!1,literal:e,message:t,"~run"(i,a){return Ai(i.value,this.literal)?i.typed=!0:x(this,"type",i,a),i}})}function oe(e,t){return w({kind:"schema",type:"nullable",reference:oe,expects:`(${e.expects} | null)`,async:!1,wrapped:e,default:t,"~run"(i,a){return i.value===null&&(this.default!==void 0&&(i.value=lt(this,i,a)),i.value===null)?(i.typed=!0,i):this.wrapped["~run"](i,a)}})}function ce(e){return w({kind:"schema",type:"number",reference:ce,expects:"number",async:!1,message:e,"~run"(t,i){return typeof t.value=="number"&&!isNaN(t.value)?t.typed=!0:x(this,"type",t,i),t}})}function _(e,t){return w({kind:"schema",type:"object",reference:_,expects:"Object",async:!1,entries:e,message:t,"~run"(i,a){const n=i.value;if(n&&typeof n=="object"){i.typed=!0,i.value={};for(const s in this.entries){const r=this.entries[s];if(s in n||(r.type==="exact_optional"||r.type==="optional"||r.type==="nullish")&&r.default!==void 0){const c=s in n?n[s]:lt(r),o=r["~run"]({value:c},a);if(o.issues){const p={type:"object",origin:"value",input:n,key:s,value:c};for(const d of o.issues)d.path?d.path.unshift(p):d.path=[p],i.issues?.push(d);if(i.issues||(i.issues=o.issues),a.abortEarly){i.typed=!1;break}}o.typed||(i.typed=!1),i.value[s]=o.value}else if(r.fallback!==void 0)i.value[s]=se(r);else if(r.type!=="exact_optional"&&r.type!=="optional"&&r.type!=="nullish"&&(x(this,"key",i,a,{input:void 0,expected:`"${s}"`,path:[{type:"object",origin:"key",input:n,key:s,value:n[s]}]}),a.abortEarly))break}}else x(this,"type",i,a);return i}})}function wt(e,t){return w({kind:"schema",type:"optional",reference:wt,expects:`(${e.expects} | undefined)`,async:!1,wrapped:e,default:t,"~run"(i,a){return i.value===void 0&&(this.default!==void 0&&(i.value=lt(this,i,a)),i.value===void 0)?(i.typed=!0,i):this.wrapped["~run"](i,a)}})}function le(e,t){return w({kind:"schema",type:"picklist",reference:le,expects:kt(e.map($t),"|"),async:!1,options:e,message:t,"~run"(i,a){return this.options.includes(i.value)?i.typed=!0:x(this,"type",i,a),i}})}function de(e,t){return w({kind:"schema",type:"strict_object",reference:de,expects:"Object",async:!1,entries:e,message:t,"~run"(i,a){const n=i.value;if(n&&typeof n=="object"){i.typed=!0,i.value={};for(const s in this.entries){const r=this.entries[s];if(s in n||(r.type==="exact_optional"||r.type==="optional"||r.type==="nullish")&&r.default!==void 0){const c=s in n?n[s]:lt(r),o=r["~run"]({value:c},a);if(o.issues){const p={type:"object",origin:"value",input:n,key:s,value:c};for(const d of o.issues)d.path?d.path.unshift(p):d.path=[p],i.issues?.push(d);if(i.issues||(i.issues=o.issues),a.abortEarly){i.typed=!1;break}}o.typed||(i.typed=!1),i.value[s]=o.value}else if(r.fallback!==void 0)i.value[s]=se(r);else if(r.type!=="exact_optional"&&r.type!=="optional"&&r.type!=="nullish"&&(x(this,"key",i,a,{input:void 0,expected:`"${s}"`,path:[{type:"object",origin:"key",input:n,key:s,value:n[s]}]}),a.abortEarly))break}if(!i.issues||!a.abortEarly){for(const s in n)if(!Object.prototype.hasOwnProperty.call(this.entries,s)){x(this,"key",i,a,{input:s,expected:"never",path:[{type:"object",origin:"key",input:n,key:s,value:n[s]}]});break}}}else x(this,"type",i,a);return i}})}function m(e){return w({kind:"schema",type:"string",reference:m,expects:"string",async:!1,message:e,"~run"(t,i){return typeof t.value=="string"?t.typed=!0:x(this,"type",t,i),t}})}function pe(e){let t;if(e)for(const i of e)if(t)for(const a of i.issues)t.push(a);else t=i.issues;return t}function he(e,t){return w({kind:"schema",type:"union",reference:he,expects:kt(e.map(i=>i.expects),"|"),async:!1,options:e,message:t,"~run"(i,a){let n,s,r;for(const c of this.options){const o=c["~run"]({value:i.value},a);if(o.typed)if(o.issues)s?s.push(o):s=[o];else{n=o;break}else r?r.push(o):r=[o]}if(n)return n;if(s){if(s.length===1)return s[0];x(this,"type",i,a,{issues:pe(s)}),i.typed=!0}else{if(r?.length===1)return r[0];x(this,"type",i,a,{issues:pe(r)})}return i}})}function R(){return w({kind:"schema",type:"unknown",reference:R,expects:"unknown",async:!1,"~run"(e){return e.typed=!0,e}})}function ue(e,t,i){return w({kind:"schema",type:"variant",reference:ue,expects:"Object",async:!1,key:e,options:t,message:i,"~run"(a,n){const s=a.value;if(s&&typeof s=="object"){let r,c=0,o=this.key,p=[];const d=(l,u)=>{for(const h of l.options){if(h.type==="variant")d(h,new Set(u).add(h.key));else{let b=!0,A=0;for(const k of u){const O=h.entries[k];if(k in s?O["~run"]({typed:!1,value:s[k]},Si).issues:O.type!=="exact_optional"&&O.type!=="optional"&&O.type!=="nullish"){b=!1,o!==k&&(c<A||c===A&&k in s&&!(o in s))&&(c=A,o=k,p=[]),o===k&&p.push(h.entries[k].expects);break}A++}if(b){const k=h["~run"]({value:s},n);(!r||!r.typed&&k.typed)&&(r=k)}}if(r&&!r.issues)break}};if(d(this,new Set([this.key])),r)return r;x(this,"type",a,n,{input:s[o],expected:kt(p,"|"),path:[{type:"object",origin:"value",input:s,key:o,value:s[o]}]})}else x(this,"type",a,n);return a}})}function Ei(e,t,i){const a=e["~run"]({value:t},xt());if(a.issues)throw new _i(a.issues);return a.value}function v(...e){return w({...e[0],pipe:e,"~run"(t,i){for(const a of e)if(a.kind!=="metadata"){if(t.issues&&(a.kind==="schema"||a.kind==="transformation")){t.typed=!1;break}(!t.issues||!i.abortEarly&&!i.abortPipeEarly)&&(t=a["~run"](t,i))}return t}})}function $(e,t,i){const a=e["~run"]({value:t},xt());return{typed:a.typed,success:!a.issues,output:a.value,issues:a.issues}}const pt=_({type:v(m(),y(1)),id:v(m(),y(1))}),Ci=v(m(),y(1),ne(/^[A-Za-z0-9_-]+$/,'ids may only contain letters, digits, "_" and "-" (a "." builds a path)')),ji=(e,t)=>{if(t===1)return e.includes(".")?null:[e];const i=e.split(".");return i.length===t&&i.every(a=>a.length>0)?i:null},H=_({id:v(m(),y(1)),type:v(m(),y(1)),target:pt,payload:R(),note:C(m()),createdAt:v(m(),y(1))}),Oi=(e,t,i,a={})=>{const n=_({id:v(m(),y(1)),type:Y(e),target:pt,payload:i,note:C(m()),createdAt:v(m(),y(1))}),s=r=>{const c=$(H,r);if(!c.success||c.output.type!==e)return null;const o=$(i,r.payload);return o.success?{id:c.output.id,type:e,target:c.output.target,payload:o.output,...c.output.note===void 0?{}:{note:c.output.note},createdAt:c.output.createdAt}:null};return{schema:n,mode:a.mode??"patch",targetType:t,actionType:e,payloadSchema:i,parse:s,...a.dedupeKey?{dedupeKey:a.dedupeKey}:{}}},Mi=(e,t)=>{const i=ht(e,t.type);if(i===void 0)return null;const a=i.parse(t);return a===null?null:a},Ti=(e,t)=>{const i=$(e.payloadSchema,t.payload);if(!i.success)throw new Error(`invalid payload for action "${t.type}"`);return i.output},ht=(e,t)=>Object.hasOwn(e,t)?e[t]:void 0,Ui=e=>{throw new Error(`unhandled action: ${JSON.stringify(e)}`)},Ni=_({id:v(m(),y(1))}),zi=e=>{const t=$(Ni,e.payload);return`${e.type}|${t.success?t.output.id:JSON.stringify(e.payload)}`},P=e=>`${e.type}:${e.id}`,fe=e=>{const t=e.indexOf(":");return t<=0?{type:"unknown",id:e}:{type:e.slice(0,t),id:e.slice(t+1)}},ge=(e,t)=>typeof e=="string"?fe(e.includes(":")?e:`${t}:${e}`):{type:e.type,id:e.id},Pi=(e,t)=>e.type===t.type&&e.id===t.id,me=e=>{const t=e.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,40);return t.length>0?t:"item"},Bi=(e,t)=>{const i=me(e),a=new Set(t);if(!a.has(i))return i;for(let n=2;n<1e3;n+=1){const s=`${i}-${n}`;if(!a.has(s))return s}return`${i}-${Math.random().toString(36).slice(2,8)}`},be=()=>{const e=globalThis.crypto;return e?.randomUUID?e.randomUUID():`a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`},j="comment",Z=e=>{const[t]=e;return{path:t?.path?.map(i=>String(i.key)).join(".")??"",message:t?.message??"invalid action"}},ye=_({type:v(m(),y(1)),target:he([v(m(),y(1)),pt]),payload:wt(R()),note:C(m()),id:C(v(m(),y(1))),createdAt:C(v(m(),y(1)))}),qi=(e,t)=>{const i=$(ye,e);if(!i.success)return{ok:!1,issue:Z(i.issues)};const a=i.output,n=ge(a.target,t.targetType),s={id:a.id??be(),type:a.type,target:n,payload:a.payload??{},...a.note===void 0?{}:{note:a.note},createdAt:a.createdAt??new Date().toISOString()},r=$(t.schema,s);if(!r.success)return{ok:!1,issue:Z(r.issues)};const c=$(H,r.output);return c.success?{ok:!0,action:c.output}:{ok:!1,issue:Z(c.issues)}},At=(e,t)=>t.dedupeKey?t.dedupeKey(e):t.mode!=="patch"?null:`${e.type}|${P(e.target)}`,_t=(e,t,i)=>{const a=At(t,i);if(a===null)return[...e,t];const n=e.at(-1);return!n||At(n,i)!==a||!Li(n,t)?[...e,t]:[...e.slice(0,-1),t]},Li=(e,t)=>Pi(e.target,t.target),St=e=>JSON.stringify(e.map(t=>({id:t.id,type:t.type,target:t.target,payload:t.payload,...t.note===void 0?{}:{note:t.note},createdAt:t.createdAt})),null,2),ve=_({id:v(m(),y(1)),type:Y(j),target:_({type:v(m(),y(1)),id:v(m(),y(1))}),payload:_({body:v(m(),y(1))}),note:C(m()),createdAt:v(m(),y(1))}),Et={schema:ve,mode:"append",targetType:"artifact"},Ri=_({body:m()}),Ct=e=>{const t=$(Ri,e.payload);return t.success?t.output.body:""},jt=Object.freeze({}),Ot=e=>{const t=e.startsWith("#")?e.slice(1):e;if(t.length===0)return jt;const i=new URLSearchParams(t.startsWith("?")?t.slice(1):t),a={};for(const[n,s]of i)n.length>0&&s.length>0&&(a[n]=s);return a},I=e=>{const t=new URLSearchParams;for(const a of Object.keys(e).sort((n,s)=>n<s?-1:n>s?1:0)){const n=e[a];n!=null&&n!==""&&t.set(a,n)}const i=t.toString();return i.length===0?"":`#${i}`},Mt=(e,t)=>{const i={...e};for(const[a,n]of Object.entries(t))n==null||n===""?delete i[a]:i[a]=n;return i},Hi=(e,t="json")=>`\`\`\`${t}
${e}
\`\`\``,Ii=e=>JSON.stringify({type:e.type,target:e.target,payload:e.payload,...e.note===void 0?{}:{note:e.note}},null,2),Tt=(e,t,i)=>{const{actions:a,state:n}=e,s=a.filter(o=>o.type===j),r=a.filter(o=>o.type!==j),c=[];if(c.push(`# Artifact draft \u2014 ${t.label}`),c.push(""),c.push(`- template: \`${t.name}\``),c.push(`- framework: \`dev-process-kit@${i}\``),c.push(`- navigation: \`${I(e.navigation)||"(none)"}\``),c.push(`- pending: ${r.length} change(s), ${s.length} comment(s)`),e.stale.length>0&&c.push(`- stale (not applicable to the current base): ${e.stale.length}`),c.push(""),c.push("## How to apply"),c.push(""),c.push("These are patches against the base HTML, not a command log. Apply the requested end state to the meaning model, keep the stable ids of surviving concepts, and keep the base JSON free of any draft envelope."),c.push(""),s.length>0){c.push(`## Comments (${s.length})`),c.push("");for(const[o,p]of s.entries()){const d=t.describe(p,n,e.base);c.push(`${o+1}. **${d.targetLabel}** \u2014 \`${P(p.target)}\``),c.push(`   > ${Ct(p).replace(/\n/g,`
   > `)}`)}c.push("")}if(r.length>0){c.push(`## Requested changes (${r.length})`),c.push("");for(const[o,p]of r.entries()){const d=t.describe(p,n,e.base),l=d.summary?` \u2014 ${d.summary}`:"";c.push(`${o+1}. **${d.title}**${l}`),c.push(`   target: \`${P(p.target)}\` (${p.target.type})`),c.push(`   \`\`\`json
   ${Ii(p).replace(/\n/g,`
   `)}
   \`\`\``)}c.push("")}return r.length===0&&s.length===0&&(c.push("_No pending draft actions._"),c.push("")),c.push("## Canonical draft (JSON)"),c.push(""),c.push(Hi(St(a))),c.push(""),c.join(`
`)},D="0.0.1-debug",xe=async e=>{try{if(navigator.clipboard?.writeText)return await navigator.clipboard.writeText(e),!0}catch{}const t=document.activeElement,i=document.createElement("textarea");try{return i.value=e,i.setAttribute("readonly",""),i.style.position="fixed",i.style.opacity="0",document.body.append(i),i.select(),document.execCommand("copy")}catch{return!1}finally{i.remove(),t instanceof HTMLElement&&t.focus()}},Di=()=>({body:"",attachment:{kind:"artifact"},copy:{kind:"idle"},copyRequest:0}),$e=e=>e.kind==="explicit"?{kind:e.resume}:e,ke=(e,t)=>{switch(t.kind){case"input":return{...e,body:t.body};case"attach":return{...e,attachment:{kind:t.current?"current":"artifact"}};case"clear-target":return{...e,attachment:$e(e.attachment)};case"target-requested":return{...e,attachment:{kind:"explicit",ref:t.ref,resume:e.attachment.kind==="explicit"?e.attachment.resume:e.attachment.kind}};case"submitted":return{...e,body:"",attachment:$e(e.attachment),copy:{kind:"idle"},copyRequest:e.copyRequest+1};case"copy-started":return{...e,copy:{kind:"pending",format:t.format},copyRequest:e.copyRequest+1};case"copy-finished":return t.request!==e.copyRequest||e.copy.kind!=="pending"?e:{...e,copy:t.ok?{kind:"copied",format:e.copy.format}:{kind:"failed"}}}},Fi=(e,t)=>{const i=e.body.trim();return i===""?null:{target:t,body:i}},we=e=>e.group?`${e.group} \xB7 ${e.label}`:e.label,Ae=(e,t)=>{const{definition:i,state:a,navigation:n,derivation:s}=e,r=i.currentTarget?.(a,n)??null,c=t.attachment,o=c.kind==="explicit"?i.commentTargets(a,n).find(l=>l.value===c.ref):null,p=c.kind==="explicit"?{ref:c.ref,label:o?we(o):c.ref}:c.kind==="current"&&r?{ref:r.value,label:we(r)}:{ref:`artifact:${i.name}`,label:"Artifact \u5168\u4F53"},d=new Map(s.stale.map(l=>[l.action.id,l.reason]));return{body:t.body,target:p,attachment:c.kind==="explicit"?{kind:"explicit"}:r?{kind:"checkbox",checked:c.kind==="current",group:r.group??""}:{kind:"none"},canSubmit:t.body.trim().length>0,items:s.actions.map(l=>{const u=i.describe(l,a,s.base),h=l.type==="comment";return{id:l.id,title:h?"\u30B3\u30E1\u30F3\u30C8":u.title,targetLabel:u.targetLabel,tone:h?"comment":u.tone,text:{kind:h?"comment":"summary",body:h?Ct(l):u.summary??""},code:i.serialize(l),stale:d.get(l.id)??null}}),issues:e.issues.map(l=>`${l.path?`${l.path}: `:""}${l.message}`),flash:t.copy.kind==="copied"?`copied ${t.copy.format==="json"?"JSON":"brief"} \u2713`:t.copy.kind==="failed"?"copy failed":""}},Ji=[rt,ot,M`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 0;
      width: 100%;
      background: var(--af-paper-raised);
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 14px 16px 12px;
      border-bottom: 1px solid var(--af-rule);
      background: linear-gradient(180deg, var(--af-paper-raised), var(--af-paper));
    }

    header h2 {
      font-size: 13.5px;
      font-weight: 620;
      letter-spacing: -0.01em;
    }

    .composer {
      display: grid;
      gap: 10px;
      padding: 14px 16px 14px;
      border-bottom: 1px solid var(--af-rule);
      background: var(--af-paper-sunken);
    }

    .composer textarea {
      min-height: 62px;
      background: var(--af-paper-raised);
      border-radius: var(--af-radius);
    }

    .composer .row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .composer .attach {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 12px;
      color: var(--af-ink-soft);
      cursor: pointer;
    }

    .composer .attach input {
      width: 14px;
      height: 14px;
      margin: 0;
      accent-color: var(--af-accent);
      cursor: pointer;
    }

    .composer .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border: 1px solid var(--af-rule);
      border-radius: 999px;
      background: var(--af-paper-raised);
      font-size: 11.5px;
      cursor: pointer;
    }

    .composer .chip:hover {
      border-color: var(--af-rule-strong);
    }

    .target-line {
      margin-right: auto;
      font-family: var(--af-mono);
      font-size: 10px;
      letter-spacing: 0.03em;
      color: var(--af-ink-faint);
    }

    .list {
      list-style: none;
      margin: 0;
      padding: 10px 12px;
      overflow: auto;
      flex: 1;
      min-height: 0;
      display: grid;
      gap: 8px;
      align-content: start;
    }

    .item {
      position: relative;
      display: grid;
      gap: 4px;
      padding: 10px 12px 11px 14px;
      border: 1px solid var(--af-rule);
      border-radius: var(--af-radius);
      background: var(--af-paper-raised);
      box-shadow: var(--af-shadow-xs);
      transition:
        box-shadow 160ms ease,
        border-color 160ms ease;
    }

    .item:hover {
      box-shadow: var(--af-shadow-sm);
    }

    .item::before {
      content: '';
      position: absolute;
      left: 0;
      top: 10px;
      bottom: 10px;
      width: 3px;
      border-radius: 0 2px 2px 0;
      background: var(--tone, var(--af-ink-faint));
    }

    .item[data-tone='comment'] {
      --tone: var(--af-accent);
      background: linear-gradient(90deg, var(--af-accent-soft), transparent 55%);
    }

    .item[data-tone='create'] {
      --tone: var(--af-green);
    }

    .item[data-tone='update'] {
      --tone: var(--af-blue);
    }

    .item[data-tone='delete'] {
      --tone: var(--af-accent);
    }

    .item[data-tone='move'] {
      --tone: var(--af-violet);
    }

    .item[data-stale='true'] {
      opacity: 0.5;
      border-style: dashed;
      box-shadow: none;
    }

    .item-head {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .item-title {
      font-size: 12.5px;
      font-weight: 600;
    }

    .stale-badge {
      padding: 1px 7px;
      border: 1px solid var(--af-rule-strong);
      border-radius: 999px;
      font-family: var(--af-mono);
      font-size: 9px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--af-ink-faint);
    }

    .item-head .af-icon-btn {
      margin-left: auto;
    }

    .item-target {
      font-family: var(--af-mono);
      font-size: 10px;
      color: var(--af-ink-faint);
    }

    .item-summary {
      font-size: 12px;
      color: var(--af-ink-soft);
    }

    .item-body {
      margin: 2px 0 0;
      padding-left: 9px;
      border-left: 2px solid var(--af-accent);
      font-size: 12.5px;
      white-space: pre-wrap;
    }

    .item-code {
      margin-top: 2px;
      font-family: var(--af-mono);
      font-size: 10px;
      color: var(--af-ink-faint);
      overflow-wrap: anywhere;
    }

    .empty {
      padding: 6px 4px;
      font-size: 12px;
      line-height: 1.7;
      color: var(--af-ink-faint);
    }

    .issues {
      margin: 10px 12px 0;
      padding: 9px 11px;
      border: 1px solid rgba(194, 64, 15, 0.35);
      border-radius: var(--af-radius-sm);
      background: var(--af-accent-soft);
      font-size: 11.5px;
    }

    .issues ul {
      margin: 4px 0 0;
      padding-left: 16px;
    }

    footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid var(--af-rule);
      background: linear-gradient(180deg, var(--af-paper-sunken), var(--af-paper-inset));
    }

    .flash {
      font-family: var(--af-mono);
      font-size: 10px;
      letter-spacing: 0.04em;
      color: var(--af-green);
    }

    .scope {
      margin-left: auto;
      font-family: var(--af-mono);
      font-size: 9px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--af-ink-faint);
    }
  `],Ki={CHILD:2},_e=e=>(...t)=>({_$litDirective$:e,values:t});let Se=class{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,t,i){this._$Ct=e,this._$AM=t,this._$Ci=i}_$AS(e,t){return this.update(e,t)}update(e,t){return this.render(...t)}};const{I:Vi}=pi,Ee=e=>e,Ce=()=>document.createComment(""),Q=(e,t,i)=>{const a=e._$AA.parentNode,n=t===void 0?e._$AB:t._$AA;if(i===void 0){const s=a.insertBefore(Ce(),n),r=a.insertBefore(Ce(),n);i=new Vi(s,r,e,e.options)}else{const s=i._$AB.nextSibling,r=i._$AM,c=r!==e;if(c){let o;i._$AQ?.(e),i._$AM=e,i._$AP!==void 0&&(o=e._$AU)!==r._$AU&&i._$AP(o)}if(s!==n||c){let o=i._$AA;for(;o!==s;){const p=Ee(o).nextSibling;Ee(a).insertBefore(o,n),o=p}}}return i},B=(e,t,i=e)=>(e._$AI(t,i),e),Wi={},je=(e,t=Wi)=>e._$AH=t,Yi=e=>e._$AH,Ut=e=>{e._$AR(),e._$AA.remove()},Oe=(e,t,i)=>{const a=new Map;for(let n=t;n<=i;n++)a.set(e[n],n);return a},Me=_e(class extends Se{constructor(e){if(super(e),e.type!==Ki.CHILD)throw Error("repeat() can only be used in text expressions")}dt(e,t,i){let a;i===void 0?i=t:t!==void 0&&(a=t);const n=[],s=[];let r=0;for(const c of e)n[r]=a?a(c,r):r,s[r]=i(c,r),r++;return{values:s,keys:n}}render(e,t,i){return this.dt(e,t,i).values}update(e,[t,i,a]){const n=Yi(e),{values:s,keys:r}=this.dt(t,i,a);if(!Array.isArray(n))return this.ut=r,s;const c=this.ut??=[],o=[];let p,d,l=0,u=n.length-1,h=0,b=s.length-1;for(;l<=u&&h<=b;)if(n[l]===null)l++;else if(n[u]===null)u--;else if(c[l]===r[h])o[h]=B(n[l],s[h]),l++,h++;else if(c[u]===r[b])o[b]=B(n[u],s[b]),u--,b--;else if(c[l]===r[b])o[b]=B(n[l],s[b]),Q(e,o[b+1],n[l]),l++,b--;else if(c[u]===r[h])o[h]=B(n[u],s[h]),Q(e,n[l],n[u]),u--,h++;else if(p===void 0&&(p=Oe(r,h,b),d=Oe(c,l,u)),p.has(c[l]))if(p.has(c[u])){const A=d.get(r[h]),k=A!==void 0?n[A]:null;if(k===null){const O=Q(e,n[l]);B(O,s[h]),o[h]=O}else o[h]=B(k,s[h]),Q(e,n[l],k),n[A]=null;h++}else Ut(n[u]),u--;else Ut(n[l]),l++;for(;h<=b;){const A=Q(e,o[b+1]);B(A,s[h]),o[h++]=A}for(;l<=u;){const A=n[l++];A!==null&&Ut(A)}return this.ut=r,je(e,o),N}}),Nt=()=>g`<svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>`,Zi=()=>g`<svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M3.5 5h9M5.5 5V3.5a1 1 0 011-1h3a1 1 0 011 1V5" />
    <path d="M5 5l.5 7.5h5L11 5" />
    <path d="M6.8 7.5v3.5M9.2 7.5v3.5" />
  </svg>`,Qi=()=>g`<svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M3 13l1.5-1.5M11.3 2.7a1.5 1.5 0 012.1 2.1L5.5 12.7l-3 .8.8-3z" />
  </svg>`,Gi=()=>g`<svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M3.5 3.5h9a1 1 0 011 1v5a1 1 0 01-1 1H8.2l-2.7 2.2v-2.2H3.5a1 1 0 01-1-1v-5a1 1 0 011-1z" />
  </svg>`,Xi=()=>g`<svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M6.5 9.5l3-3" />
    <path d="M7 5.5l1-1a2.1 2.1 0 013 3l-1 1" />
    <path d="M9 10.5l-1 1a2.1 2.1 0 01-3-3l1-1" />
  </svg>`,ta=()=>g`<svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M8 3.5v9M3.5 8h9" />
  </svg>`,ea=()=>g`<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false">
    <circle cx="6.5" cy="4.5" r="1" />
    <circle cx="9.5" cy="4.5" r="1" />
    <circle cx="6.5" cy="8" r="1" />
    <circle cx="9.5" cy="8" r="1" />
    <circle cx="6.5" cy="11.5" r="1" />
    <circle cx="9.5" cy="11.5" r="1" />
  </svg>`,ia=()=>g`<svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M8 2.5v11M8 2.5L5.5 5M8 2.5l2.5 2.5M8 13.5l-2.5-2.5M8 13.5l2.5-2.5M2.5 8h11M2.5 8L5 5.5M2.5 8l2.5 2.5M13.5 8L11 5.5M13.5 8L11 10.5"
    />
  </svg>`,aa=()=>g`<svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M8 12.5V3.5M4.5 7L8 3.5 11.5 7" />
  </svg>`,na=()=>g`<svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M8 3.5v9M4.5 9L8 12.5 11.5 9" />
  </svg>`,sa=(e,t)=>g`
  <header><h2>Review notes</h2></header>
  ${e.issues.length>0?g`<div class="issues" role="alert">
          <strong>Action rejected.</strong>
          <ul>
            ${e.issues.map(i=>g`<li>${i}</li>`)}
          </ul>
        </div>`:f}
  <div class="composer">
    <textarea
      class="af-textarea"
      aria-label="レビューコメント"
      placeholder="変更したいこと / 気づきを書く（Agent への指示として渡る）"
      .value=${e.body}
      @input=${i=>{i.currentTarget instanceof HTMLTextAreaElement&&t({kind:"input",body:i.currentTarget.value})}}
      @keydown=${i=>{!i.isComposing&&i.key==="Enter"&&(i.metaKey||i.ctrlKey)&&(i.preventDefault(),t({kind:"submit"}))}}
    ></textarea>
    ${e.attachment.kind==="explicit"?g`<div class="row">
            <button class="chip" type="button" aria-label="紐づけを解除" @click=${()=>t({kind:"clear-target"})}>
              ${e.target.label} ${Nt()}
            </button>
          </div>`:e.attachment.kind==="checkbox"?g`<div class="row">
              <label class="attach">
                <input
                  type="checkbox"
                  .checked=${e.attachment.checked}
                  @change=${i=>{i.currentTarget instanceof HTMLInputElement&&t({kind:"attach",current:i.currentTarget.checked})}}
                />
                <span>この ${e.attachment.group} に紐づける</span>
              </label>
            </div>`:f}
    <div class="row">
      <span class="target-line">→ ${e.target.label}</span>
      <button
        class="af-btn af-btn--accent"
        type="button"
        ?disabled=${!e.canSubmit}
        @click=${()=>t({kind:"submit"})}
      >
        Add note
      </button>
    </div>
  </div>
  <ul class="list">
    ${e.items.length===0?g`<li class="empty">
            No draft actions yet.<br />
            Comments and structural patches both land here, and survive reload via LocalStorage.
          </li>`:Me(e.items,i=>i.id,i=>ra(i,t))}
  </ul>
  <footer>
    <button class="af-btn" type="button" @click=${()=>t({kind:"copy",format:"json"})}>Copy JSON</button>
    <button class="af-btn" type="button" @click=${()=>t({kind:"copy",format:"brief"})}>Copy brief</button>
    <button
      class="af-btn af-btn--ghost"
      type="button"
      ?disabled=${e.items.length===0}
      @click=${()=>t({kind:"clear"})}
    >
      Clear
    </button>
    ${e.flash?g`<span class="flash" role="status">${e.flash}</span>`:f}
    <span class="scope">localStorage draft</span>
  </footer>
`,ra=(e,t)=>g`
  <li class="item" data-tone=${e.tone} data-stale=${String(e.stale!==null)}>
    <div class="item-head">
      <span class="item-title">${e.title}</span>
      ${e.stale?g`<span class="stale-badge">${e.stale}</span>`:f}
      <button
        class="af-icon-btn"
        type="button"
        aria-label="この draft action を削除"
        @click=${()=>t({kind:"delete",id:e.id})}
      >
        ${Nt()}
      </button>
    </div>
    <div class="item-target">${e.targetLabel}</div>
    ${e.text.kind==="comment"?g`<p class="item-body">${e.text.body}</p>`:e.text.body?g`<div class="item-summary">${e.text.body}</div>`:f}
    <code class="item-code">${e.code}</code>
  </li>
`;class Te extends E{static{this.styles=Ji}static{this.properties={definition:{attribute:!1},state:{attribute:!1},navigation:{attribute:!1},derivation:{attribute:!1},issues:{attribute:!1},pendingTarget:{attribute:!1},onDelete:{attribute:!1},onClear:{attribute:!1},onComment:{attribute:!1},exportBrief:{attribute:!1}}}#t=Di();constructor(){super(),this.definition=null,this.state=void 0,this.navigation={},this.derivation=null,this.issues=[],this.pendingTarget=null}willUpdate(t){t.has("pendingTarget")&&this.pendingTarget&&(this.#t=ke(this.#t,{kind:"target-requested",ref:this.pendingTarget}))}updated(t){t.has("pendingTarget")&&this.pendingTarget&&this.isConnected&&this.renderRoot.querySelector("textarea")?.focus()}#e(){return!this.definition||!this.derivation?null:{definition:this.definition,state:this.state,navigation:this.navigation,derivation:this.derivation,issues:this.issues}}render(){const t=this.#e();return t?sa(Ae(t,this.#t),this.#a):f}#i(t){this.#t=ke(this.#t,t),this.requestUpdate()}#a=t=>{switch(t.kind){case"delete":this.onDelete?.(t.id);return;case"clear":this.onClear?.();return;case"copy":this.#n(t.format);return;case"submit":{const i=this.#e();if(!i||!this.onComment)return;const a=Fi(this.#t,Ae(i,this.#t).target.ref);if(!a)return;const n=this.onComment(a.target,a.body);if(typeof n=="object"&&n!==null&&"ok"in n&&n.ok===!1)return;this.#i({kind:"submitted"});return}default:this.#i(t)}};async#n(t){const i=this.#e();if(!i)return;this.#i({kind:"copy-started",format:t});const a=this.#t.copyRequest;try{const n=t==="json"?St(i.derivation.actions):this.exportBrief?.()??Tt({...i.derivation,navigation:i.navigation,issues:i.issues},i.definition,D),s=await xe(n);this.isConnected&&this.#i({kind:"copy-finished",request:a,ok:s})}catch{this.isConnected&&this.#i({kind:"copy-finished",request:a,ok:!1})}}}const oa=(e="artifact-comment-panel")=>{customElements.get(e)||customElements.define(e,Te)},Ue=typeof globalThis=="object"&&globalThis||typeof window=="object"&&window||typeof self=="object"&&self||typeof global=="object"&&global||(function(){return this})();function Ne(e){return typeof Ue.Buffer<"u"&&Ue.Buffer.isBuffer(e)}function ze(e){if(!e||typeof e!="object")return!1;const t=Object.getPrototypeOf(e);return t===null||t===Object.prototype||Object.getPrototypeOf(t)===null?Object.prototype.toString.call(e)==="[object Object]":!1}function Pe(e){return Object.getOwnPropertySymbols(e).filter(t=>Object.prototype.propertyIsEnumerable.call(e,t))}function Be(e){return e==null?e===void 0?"[object Undefined]":"[object Null]":Object.prototype.toString.call(e)}const ca="[object RegExp]",la="[object String]",da="[object Number]",pa="[object Boolean]",ha="[object Symbol]",ua="[object Date]",fa="[object Map]",ga="[object Set]",ma="[object Array]",ba="[object Function]",ya="[object ArrayBuffer]",zt="[object Object]",va="[object Error]",xa="[object DataView]",$a="[object Uint8Array]",ka="[object Uint8ClampedArray]",wa="[object Uint16Array]",Aa="[object Uint32Array]",_a="[object BigUint64Array]",Sa="[object Int8Array]",Ea="[object Int16Array]",Ca="[object Int32Array]",ja="[object BigInt64Array]",Oa="[object Float32Array]",Ma="[object Float64Array]";function Ta(e,t){return e===t||Number.isNaN(e)&&Number.isNaN(t)}function Ua(e,t,i){return G(e,t,void 0,void 0,void 0,void 0,i)}function G(e,t,i,a,n,s,r){const c=r(e,t,i,a,n,s);if(c!==void 0)return c;if(typeof e==typeof t)switch(typeof e){case"bigint":case"string":case"boolean":case"symbol":case"undefined":return e===t;case"number":return e===t||Object.is(e,t);case"function":return e===t;case"object":return X(e,t,s,r)}return X(e,t,s,r)}function X(e,t,i,a){if(Object.is(e,t))return!0;let n=Be(e),s=Be(t);if(n==="[object Arguments]"&&(n=zt),s==="[object Arguments]"&&(s=zt),n!==s)return!1;switch(n){case la:return e.toString()===t.toString();case da:return Ta(e.valueOf(),t.valueOf());case pa:case ua:case ha:return Object.is(e.valueOf(),t.valueOf());case ca:return e.source===t.source&&e.flags===t.flags;case ba:return e===t}i=i??new Map;const r=i.get(e),c=i.get(t);if(r!=null&&c!=null)return r===t;i.set(e,t),i.set(t,e);try{switch(n){case fa:if(e.size!==t.size)return!1;for(const[o,p]of e.entries())if(!t.has(o)||!G(p,t.get(o),o,e,t,i,a))return!1;return!0;case ga:{if(e.size!==t.size)return!1;const o=Array.from(e.values()),p=Array.from(t.values());for(let d=0;d<o.length;d++){const l=o[d],u=p.findIndex(h=>G(l,h,void 0,e,t,i,a));if(u===-1)return!1;p.splice(u,1)}return!0}case ma:case $a:case ka:case wa:case Aa:case _a:case Sa:case Ea:case Ca:case ja:case Oa:case Ma:if(Ne(e)!==Ne(t)||e.length!==t.length)return!1;for(let o=0;o<e.length;o++)if(!G(e[o],t[o],o,e,t,i,a))return!1;return!0;case ya:return e.byteLength!==t.byteLength?!1:X(new Uint8Array(e),new Uint8Array(t),i,a);case xa:return e.byteLength!==t.byteLength||e.byteOffset!==t.byteOffset?!1:X(new Uint8Array(e),new Uint8Array(t),i,a);case va:return e.name===t.name&&e.message===t.message;case zt:{if(!(X(e.constructor,t.constructor,i,a)||ze(e)&&ze(t)))return!1;const o=[...Object.keys(e),...Pe(e)],p=[...Object.keys(t),...Pe(t)];if(o.length!==p.length)return!1;for(let d=0;d<o.length;d++){const l=o[d],u=e[l];if(!Object.hasOwn(t,l))return!1;const h=t[l];if(!G(u,h,l,e,t,i,a))return!1}return!0}default:return!1}}finally{i.delete(e),i.delete(t)}}function Na(){}function qe(e,t){return Ua(e,t,Na)}const za="artifact",Le=e=>P(e),tt=(e,t,i)=>{let a=t;const n=[],s=[],r=[],c=[],o=new Map;for(const d of i){const l=ht(e.actions,d.type);if(d.type===j)continue;if(!l){s.push({action:d,reason:"unsupported-action-type"});continue}const u=e.apply(a,d);if(u===null){s.push({action:d,reason:e.hasTarget(a,d.target)?"constraint-violated":"target-missing"});continue}if(l.mode!=="append"&&qe(a,u)){r.push(d);continue}a=u,n.push(d)}for(const d of i){if(d.type!==j)continue;if(d.target.type!==za&&!e.hasTarget(a,d.target)){s.push({action:d,reason:"target-missing"});continue}c.push(d);const l=Le(d.target);o.set(l,[...o.get(l)??[],d])}const p=new Map(i.map((d,l)=>[d.id,l]));return s.sort((d,l)=>(p.get(d.action.id)??0)-(p.get(l.action.id)??0)),{base:t,state:a,actions:i,applied:n,stale:s,obsolete:r,comments:c,commentsByTarget:o}},Re=e=>{const t=new Set(e.obsolete.map(i=>i.id));return e.actions.filter(i=>!t.has(i.id))},Pa=_({v:Y(1),template:v(m(),y(1)),actions:dt(R())});class Pt{constructor(t){this.storage=t}load(t,i){try{const a=this.storage.getItem(t);if(a===null)return[];const n=$(Pa,JSON.parse(a));return!n.success||n.output.template!==i?[]:n.output.actions.flatMap(s=>{const r=$(H,s);return r.success?[r.output]:[]})}catch{return[]}}save(t,i,a){const n={v:1,template:i,actions:a};try{this.storage.setItem(t,JSON.stringify(n))}catch{}}clear(t){try{this.storage.removeItem(t)}catch{}}}class Bt{constructor(){this.store=new Map}load(t,i){return new Pt({getItem:a=>this.store.get(a)??null,setItem:(a,n)=>{this.store.set(a,n)},removeItem:a=>{this.store.delete(a)}}).load(t,i)}save(t,i,a){this.store.set(t,JSON.stringify({v:1,template:i,actions:a}))}clear(t){this.store.delete(t)}}const qt=()=>{try{if(typeof localStorage<"u")return new Pt(localStorage)}catch{}return new Bt},He=e=>`dev-process-kit:draft:${typeof location>"u"?"local":`${location.pathname}${location.search}`}:${e}`,Ba=dt(R());class Ie{#t;#e;#i;#a;#n;#r=new Set;#s=[];#c=0;constructor(t){this.definition=t.definition,this.#t=t.base,this.#n=t.storageKey??He(t.definition.name),this.#a=t.storage===void 0?qt():t.storage;const i=t.initialActions??this.#a?.load(this.#n,this.definition.name)??[];this.#e=De(this.definition,i),this.#i=tt(this.definition,this.#t,this.#e),this.#h()&&this.#u()}get base(){return this.#t}get actions(){return this.#e}get derivation(){return this.#i}get lastIssues(){return this.#s}get prunedCount(){return this.#c}descriptorFor(t){return t==="comment"?Et:ht(this.definition.actions,t)}dispatch(t){const i=this.#l(t,this.#i.state);if(!i.ok)return this.#o([i.issue]);const a=this.descriptorFor(i.action.type);return a?(this.#d(_t(this.#e,i.action,a)),{ok:!0,id:i.action.id}):this.#o([{path:"type",message:"unknown action type"}])}dispatchBatch(t){const i=$(Ba,t);if(!i.success)return this.#o([Z(i.issues)]);const a=i.output;if(a.length===0)return{ok:!0,ids:[]};let n=this.#e,s=this.#i.state;const r=[];for(const c of a){const o=this.#l(c,s);if(!o.ok)return this.#o([o.issue]);const p=o.action,d=this.descriptorFor(p.type);if(!d)return this.#o([{path:"type",message:"unknown action type"}]);if((p.type==="comment"?p.target.type==="artifact"||this.definition.hasTarget(s,p.target)?s:null:this.definition.apply(s,p))===null)return this.#o([{path:"target",message:"batch action is not applicable"}]);n=_t(n,p,d),s=tt(this.definition,this.#t,n).state,r.push(p.id)}return this.#d(n),{ok:!0,ids:r}}#l(t,i){const a=$(ye,t);if(!a.success)return{ok:!1,issue:Z(a.issues)};const n=this.descriptorFor(a.output.type);if(!n)return{ok:!1,issue:{path:"type",message:`unknown action type "${a.output.type}"`}};const s=qi(a.output,n);if(!s.ok)return s;const r=this.definition.canonicalTarget?.(i,s.action.target)??s.action.target;return{ok:!0,action:{...s.action,target:r}}}#o(t){return this.#s=t,{ok:!1,issues:t}}removeAction(t){const i=this.#e.filter(a=>a.id!==t);i.length!==this.#e.length&&this.#d(i)}clearActions(){this.#e.length>0&&this.#d([])}replaceActions(t){this.#d(De(this.definition,t))}setBase(t){this.#t=t,this.#d(this.#e)}subscribe(t){return this.#r.add(t),()=>{this.#r.delete(t)}}exportDraft(t){return{template:this.definition.name,frameworkVersion:t,exportedAt:new Date().toISOString(),actions:this.#e}}#d(t){this.#s=[],this.#e=t,this.#i=tt(this.definition,this.#t,this.#e),this.#h(),this.#u();for(const i of this.#r)i()}#h(){return this.#i.obsolete.length===0?!1:(this.#c+=this.#i.obsolete.length,this.#e=Re(this.#i),this.#i=tt(this.definition,this.#t,this.#e),!0)}#u(){this.#a?.save(this.#n,this.definition.name,this.#e)}}const De=(e,t)=>t.flatMap(i=>{const a=$(H,i);if(!a.success)return[];const n=a.output,s=n.type==="comment"?Et:ht(e.actions,n.type);if(!s)return[];const r=$(s.schema,n);if(!r.success)return[];const c=$(H,r.output);return c.success?[c.output]:[]}),Fe=e=>{const t=e.derivation();return{base:t.base,state:t.state,navigation:e.navigation(),actions:e.controller().actions,comments:t.comments,stale:t.stale,issues:e.issues()}},qa=e=>{const t=e.derivation();return{state:t.state,base:t.base,navigation:e.navigation(),actions:e.controller().actions,comments:t.comments,stale:t.stale,commentCount:i=>{const a=typeof i=="string"?i:P(i);return t.commentsByTarget.get(a)?.length??0},dispatch:i=>e.dispatch(i),dispatchBatch:i=>e.dispatchBatch(i),navigate:(i,a)=>e.navigate(i,a),hashFor:i=>e.hashFor(i),requestComment:i=>e.requestComment(i)}},La=(e,t)=>{const i=()=>Fe(e);return{version:D,template:e.definition.name,host:t,ready:e.ready,get base(){return e.controller().base},get state(){return e.derivation().state},get navigation(){return e.navigation()},get actions(){return e.controller().actions},get comments(){return e.derivation().comments},get stale(){return e.derivation().stale},get issues(){return e.issues()},dispatch:a=>e.dispatch(a),dispatchBatch:a=>e.dispatchBatch(a),comment:(a,n)=>e.dispatch({type:j,target:a,payload:{body:n}}),removeAction:a=>e.removeAction(a),clearActions:()=>e.clearActions(),importDraft:a=>e.controller().replaceActions(a),navigate:(a,n)=>e.navigate(a,n),hashFor:a=>e.hashFor(a),snapshot:i,exportDraft:()=>e.controller().exportDraft(D),exportBrief:()=>Tt(i(),e.definition,D),subscribe:a=>e.subscribe(a)}},Je=()=>Ot(typeof location>"u"?"":location.hash),Ra=(e,t)=>{if(typeof history>"u")return;const i=`${location.pathname}${location.search}${I(e)}`;`${location.pathname}${location.search}${location.hash}`!==i&&(t?history.replaceState(null,"",i):history.pushState(null,"",i))};class Ha{#t;#e=null;#i=0;constructor(t){this.#t=t}get orphans(){return this.#i}route(){const t=this.#t.renderRoot,i=ct(t.querySelector('slot[name="preview"]'),HTMLSlotElement);if(i===null)return;this.#e!==i&&(this.#e=i,i.addEventListener("slotchange",this.#a));const a=new Set(Array.from(t.querySelectorAll("slot")).map(s=>s.getAttribute("name")??"")),n=i.assignedElements();for(const s of n){const r=s.getAttribute("data-preview-id");if(!r)continue;const c=`preview:${r}`;s.getAttribute("slot")!==c&&a.has(c)&&s.setAttribute("slot",c)}n.length!==this.#i&&(this.#i=n.length,queueMicrotask(()=>this.#t.requestUpdate()))}#a=()=>{queueMicrotask(()=>this.route())}}const Ia=[rt,ot,M`
    :host {
      display: block;
      min-height: 100%;
      background: var(--af-paper);
    }

    .af-shell {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      min-height: 100%;
      max-height: 100%;
    }

    /* ------------------------------------------------------------- header */

    .af-header {
      display: flex;
      align-items: center;
      gap: 16px;
      /* Right padding keeps the header content clear of the fixed review button. */
      padding: 14px 78px 14px 20px;
      border-bottom: 1px solid var(--af-rule);
      background: linear-gradient(180deg, var(--af-paper-raised) 0%, var(--af-paper) 100%);
    }

    .af-title {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .af-title h1 {
      font-size: 16.5px;
      font-weight: 620;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .af-template-mark {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 9px 2px 7px;
      border-radius: 999px;
      background: var(--af-accent-soft);
      font-family: var(--af-mono);
      font-size: 9.5px;
      font-weight: 550;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--af-accent);
    }

    .af-template-mark::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--af-accent);
    }

    .af-header-slot {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .af-header-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: auto;
      padding: 4px 12px;
      border-radius: 999px;
      border: 1px solid var(--af-rule);
      background: var(--af-paper-sunken);
      font-family: var(--af-mono);
      font-size: 10px;
      letter-spacing: 0.04em;
      color: var(--af-ink-faint);
      white-space: nowrap;
    }

    .af-header-meta span + span::before {
      content: '';
      display: inline-block;
      width: 3px;
      height: 3px;
      margin-right: 8px;
      vertical-align: 1px;
      border-radius: 50%;
      background: var(--af-ink-faint);
      opacity: 0.5;
    }

    /* --------------------------------------------------------------- body */

    .af-body {
      display: flex;
      min-height: 0;
    }

    .af-sidebar {
      width: 252px;
      flex: 0 0 auto;
      border-right: 1px solid var(--af-rule);
      background: linear-gradient(180deg, var(--af-paper-sunken) 0%, var(--af-paper-inset) 100%);
      overflow: auto;
      padding: 16px 14px;
    }

    .af-sidebar[hidden] {
      display: none;
    }

    .af-main {
      flex: 1 1 0%;
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: auto;
      background: var(--af-paper);
    }

    .af-main-body {
      flex: 1 0 auto;
      display: grid;
      align-content: start;
      gap: 16px;
      min-width: 0;
      padding: 24px;
    }

    /*
     * Author memo. It sits at the end of the main column and sticks to the
     * bottom of the scrollport: always visible, floating over whatever scrolls
     * behind it, and never stealing height from the preview.
     */
    .af-memo {
      position: sticky;
      bottom: 0;
      z-index: 5;
      padding: 0 20px 20px;
      pointer-events: none;
    }

    .af-memo[hidden] {
      display: none;
    }

    .af-memo ::slotted(*) {
      display: block;
      max-width: 100%;
      padding: 10px 14px;
      border: 1px solid var(--af-rule);
      border-radius: var(--af-radius-lg);
      background: var(--af-paper-raised);
      box-shadow: var(--af-shadow-lg);
      font-size: 12.5px;
      line-height: 1.65;
      color: var(--af-ink-soft);
      pointer-events: auto;
    }

    .af-orphans {
      margin-top: 16px;
      border: 1px dashed var(--af-rule-strong);
      border-radius: var(--af-radius-sm);
      padding: 10px;
    }

    .af-banner {
      display: grid;
      gap: 4px;
      margin-bottom: 14px;
      border: 1px solid var(--af-accent);
      border-left-width: 3px;
      border-radius: var(--af-radius-sm);
      background: var(--af-accent-soft);
      padding: 10px 12px;
      max-width: 900px;
    }

    .af-banner strong {
      font-size: 13px;
    }

    .af-banner code {
      font-family: var(--af-mono);
      font-size: 11px;
      color: var(--af-ink-soft);
      overflow-wrap: anywhere;
    }

    .af-notes {
      flex: 0 0 auto;
      width: 344px;
      border-left: 1px solid var(--af-rule);
      background: var(--af-paper-raised);
      overflow: hidden;
      display: flex;
    }

    .af-notes[hidden] {
      display: none;
    }

    /* ------------------------------------------------------------- footer */

    .af-footer {
      border-top: 1px solid var(--af-rule);
      padding: 10px 20px;
      display: flex;
      gap: 12px;
      align-items: center;
      background: var(--af-paper-sunken);
      font-size: 12px;
      color: var(--af-ink-faint);
    }

    /* --------------------------------------------------- floating review */

    /* Review toggle: pinned to the top right corner, always in the same place. */
    .af-fab {
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
      box-shadow: var(--af-shadow);
      cursor: pointer;
      transition:
        color 160ms ease,
        background 160ms ease,
        border-color 160ms ease,
        box-shadow 160ms ease,
        transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .af-fab:hover {
      color: var(--af-ink);
      transform: translateY(-2px) scale(1.05);
      box-shadow: var(--af-shadow-lg);
    }

    .af-fab:active {
      transform: translateY(0) scale(0.97);
      box-shadow: var(--af-shadow-xs);
    }

    .af-fab:focus-visible {
      outline: none;
      box-shadow: var(--af-focus);
    }

    .af-fab[aria-expanded='true'] {
      color: var(--af-accent-ink);
      border-color: transparent;
      background: linear-gradient(135deg, var(--af-accent), #c23e12);
      box-shadow: 0 2px 8px rgba(217, 73, 32, 0.3);
    }

    .af-fab[aria-expanded='true']:hover {
      box-shadow: 0 4px 14px rgba(217, 73, 32, 0.4);
    }

    .af-fab-icon {
      position: relative;
      display: block;
      width: 16px;
      height: 12px;
      border: 1.6px solid currentColor;
      border-radius: 3.5px;
    }

    .af-fab-icon::after {
      content: '';
      position: absolute;
      left: 2px;
      bottom: -4px;
      border-left: 3.5px solid transparent;
      border-right: 3.5px solid transparent;
      border-top: 4px solid currentColor;
    }

    .af-fab-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      border: 2px solid var(--af-paper-raised);
      border-radius: 999px;
      background: linear-gradient(135deg, #e55a2b, var(--af-accent));
      color: var(--af-accent-ink);
      font-family: var(--af-mono);
      font-size: 9.5px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      line-height: 14px;
      text-align: center;
      box-shadow: 0 1px 4px rgba(217, 73, 32, 0.3);
    }
  `];class Da extends E{static{this.styles=Ia}static{this.properties={storageKey:{type:String,attribute:"storage-key"},storage:{type:String},notes:{type:String},notesOpen:{state:!0}}}#t=!1;#e=new Ha(this);#i;#a=jt;#n=null;#r=new Set;#s=null;#c;#l;#o;#d=new Promise(t=>{this.#o=t});#h;connectedCallback(){super.connectedCallback(),this.dataset.template=this.definition.name,this.#t||(this.#t=!0,this.notesOpen=this.notes==="on"||this.notes==="open"),this.#u(),window.addEventListener("hashchange",this.#x),this.addEventListener("click",this.#$)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("hashchange",this.#x),this.removeEventListener("click",this.#$),this.#l?.disconnect()}#u(t=0){if(this.#i){this.#b();return}if(this.childNodes.length===0&&t<2){queueMicrotask(()=>this.#u(t+1));return}this.#w()}#b(){this.#c||(this.#c=this.#i?.subscribe(()=>this.#E()))}updated(){this.#C()}get artifact(){return this.#h??=this.#k(),this.#h}get controller(){if(!this.#i)throw new Error(`<${this.tagName.toLowerCase()}> is not initialized yet`);return this.#i}get derivation(){return this.controller.derivation}get navigation(){return this.#a}dispatch(t){const i=this.controller.dispatch(t);return i.ok||(this.requestUpdate(),this.dispatchEvent(new CustomEvent("artifact-error",{detail:{issues:i.issues},bubbles:!0,composed:!0})),this.#p()),i}dispatchBatch(t){const i=this.controller.dispatchBatch(t);return i.ok||(this.requestUpdate(),this.dispatchEvent(new CustomEvent("artifact-error",{detail:{issues:i.issues},bubbles:!0,composed:!0})),this.#p()),i}removeAction(t){this.controller.removeAction(t)}clearActions(){this.controller.clearActions()}navigate(t,i={}){const a=I(this.#f());this.#a=Mt(this.#a,t),this.#g(i.replace??!1);const n=I(this.#f());this.requestUpdate(),a!==n&&(this.#p(),this.dispatchEvent(new CustomEvent("artifact-navigate",{detail:{navigation:this.#a},bubbles:!0,composed:!0})))}hashFor(t){const i=this.#f();return I(this.definition.resolveNavigation(this.derivation.state,Mt(i,t)))}requestComment(t){this.#n=typeof t=="string"?t:P(t),this.notesOpen=!0,this.requestUpdate()}renderChrome(t,i){const a=t.actions.length,n=t.comments.length;return g`
      <div class="af-shell">
        <header class="af-header">
          <div class="af-title">
            <span class="af-template-mark">${this.definition.label}</span>
            <h1>${this.definition.title(t.state)}</h1>
          </div>
          <div class="af-header-slot">
            ${i.header??f}
            <slot name="header"></slot>
          </div>
          <div class="af-header-meta">
            <span>dev-process-kit@${D}</span>
            <span>${this.definition.name}</span>
            <span>${a} draft · ${n} note</span>
          </div>
        </header>
        <div class="af-body">
          <aside class="af-sidebar" ?hidden=${!i.sidebar&&!this.hasSidebarContent()}>
            ${i.sidebar??f}
            <slot name="sidebar"></slot>
          </aside>
          <main class="af-main">
            <div class="af-main-body">
              ${this.#s?g`<div class="af-banner" role="alert">
                      <strong>base data を読み込めませんでした（空の Artifact として表示中）</strong>
                      <code>${this.#s}</code>
                    </div>`:f}
              ${i.main??f}
              <slot name="main"></slot>
              <section class="af-orphans" ?hidden=${this.#e.orphans===0}>
                <p class="af-label">previews without metadata</p>
                <slot name="preview"></slot>
              </section>
            </div>
            <div class="af-memo" ?hidden=${!this.hasMemoContent()}>
              <slot name="memo"></slot>
            </div>
          </main>
          <aside class="af-notes" ?hidden=${!this.notesOpen}>
            <artifact-comment-panel
              .definition=${this.definition}
              .state=${t.state}
              .navigation=${t.navigation}
              .derivation=${this.derivation}
              .issues=${this.controller.lastIssues}
              .exportBrief=${()=>this.artifact.exportBrief()}
              .pendingTarget=${this.#n}
              .onDelete=${s=>this.removeAction(s)}
              .onClear=${()=>this.clearActions()}
              .onComment=${(s,r)=>{const c=this.dispatch({type:j,target:s,payload:{body:r}});return c.ok&&(this.#n=null),c}}
            ></artifact-comment-panel>
          </aside>
        </div>
        ${i.footer||this.hasFooterContent()?g`<footer class="af-footer">
                ${i.footer??f}
                <slot name="footer"></slot>
              </footer>`:f}
        <button
          class="af-fab"
          type="button"
          aria-expanded=${this.notesOpen?"true":"false"}
          title="レビュー / コメント"
          @click=${()=>{this.notesOpen=!this.notesOpen}}
        >
          <span class="af-fab-icon" aria-hidden="true"></span>
          <span class="af-label" style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)">
            レビュー
          </span>
          ${a>0?g`<span class="af-fab-badge">${a}</span>`:f}
        </button>
      </div>
    `}render(){if(!this.#i)return f;const t=this.#v();return this.renderChrome(t,this.renderRegions(t))}hasSidebarContent(){return this.querySelector('[slot="sidebar"]')!==null}hasMemoContent(){return this.querySelector('[slot="memo"]')!==null}hasFooterContent(){return this.querySelector('[slot="footer"]')!==null}context(){return this.#v()}#m(){return{definition:this.definition,controller:()=>this.controller,derivation:()=>this.derivation,ready:this.#d,navigation:()=>this.#f(),issues:()=>this.controller.lastIssues,dispatch:t=>this.dispatch(t),dispatchBatch:t=>this.dispatchBatch(t),subscribe:t=>(this.#r.add(t),()=>{this.#r.delete(t)}),removeAction:t=>this.removeAction(t),clearActions:()=>this.clearActions(),navigate:(t,i)=>this.navigate(t,i),hashFor:t=>this.hashFor(t),requestComment:t=>this.requestComment(t)}}#k(){return La(this.#m(),this)}#y(){return Fe(this.#m())}#v(){return qa(this.#m())}#f(){return this.definition.resolveNavigation(this.derivation.state,this.#a)}#w(){const t=this.#_();this.#a=Je();const i=this.storageKey;this.#i=new Ie({definition:this.definition,base:t,storage:this.#A(),...typeof i=="string"?{storageKey:i}:{}}),this.#b(),this.#g(!0),this.#o?.(),this.#S(),this.requestUpdate()}#A(){return this.storage==="off"?null:this.storage==="memory"?new Bt:qt()}#_(){const t=this.querySelector('script[type="application/json"]');if(!t?.textContent||t.textContent.trim().length===0)return console.warn(`[dev-process-kit] <${this.tagName.toLowerCase()}> has no base JSON; starting from an empty artifact.`),this.#s='no <script type="application/json"> child found',this.definition.emptyBase();try{return this.definition.parseBase(JSON.parse(t.textContent))}catch(i){return console.error("[dev-process-kit] invalid base data:",i),this.#s=i instanceof Error?i.message:String(i),this.definition.emptyBase()}}#S(){this.querySelector('script[type="application/json"]')||(this.#l=new MutationObserver(()=>{const t=this.querySelector('script[type="application/json"]');if(t){this.#l?.disconnect(),this.#l=void 0;try{this.controller.setBase(this.definition.parseBase(JSON.parse(t.textContent??"null")))}catch(i){console.error("[dev-process-kit] invalid base data:",i)}}}),this.#l.observe(this,{childList:!0,subtree:!0}))}#p(){const t=this.#y();for(const i of this.#r)i(t)}#E(){if(!this.isConnected){this.requestUpdate(),this.#p();return}this.#g(!0),this.requestUpdate(),this.#p(),this.dispatchEvent(new CustomEvent("artifact-change",{detail:this.#y(),bubbles:!0,composed:!0}))}#g(t){const i=this.#f();this.#a=i,Ra(i,t)}#x=()=>{this.#a=Je(),this.#g(!0),this.requestUpdate(),this.#p(),this.dispatchEvent(new CustomEvent("artifact-navigate",{detail:{navigation:this.#a},bubbles:!0,composed:!0}))};#$=t=>{for(const i of t.composedPath()){if(!(i instanceof HTMLElement))continue;if(i===this)break;const a=i.dataset.artifactNavigate;if(a!==void 0){t.preventDefault(),this.navigate(Ot(a.includes("=")?a:`step=${a}`));return}const n=i.dataset.artifactComment;if(n!==void 0){t.preventDefault(),this.requestComment(n);return}}};#C(){this.#e.route()}}const Fa=(e,t)=>{typeof window>"u"||Object.assign(window,{artifactFramework:{version:e,templates:t}})};export{M as $,Te as A,Nt as B,j as C,Gi as D,jt as E,D as F,ea as G,Xi as H,ia as I,Qi as J,ta as K,Zi as L,Bt as M,Re as N,Ot as O,fe as P,Mi as Q,Mt as R,Ti as S,St as T,me as U,P as V,Pt as W,pt as X,ge as Y,rt as Z,qe as _,Fa as a,f as a0,g as a1,Me as a2,E as a3,Ei as a4,de as a5,wt as a6,dt as a7,m as a8,le as a9,v as aa,y as ab,ce as ac,ue as ad,R as ae,Y as af,re as ag,ni as ah,C as ai,Ci as aj,_ as ak,oe as al,gi as am,ct as an,xe as ao,ji as ap,_e as aq,Se as ar,je as as,$ as at,Ie as b,Da as c,ae as d,Et as e,_t as f,Ui as g,Tt as h,ve as i,Ct as j,Le as k,ot as l,be as m,Bi as n,At as o,qt as p,He as q,Oi as r,oa as s,mi as t,tt as u,H as v,zi as w,I as x,na as y,aa as z};
