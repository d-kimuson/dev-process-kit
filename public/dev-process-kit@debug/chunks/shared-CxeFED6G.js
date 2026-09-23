const ot=globalThis,yt=ot.ShadowRoot&&(ot.ShadyCSS===void 0||ot.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,kt=Symbol(),Vt=new WeakMap;let Wt=class{constructor(e,t,i){if(this._$cssResult$=!0,i!==kt)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o;const t=this.t;if(yt&&e===void 0){const i=t!==void 0&&t.length===1;i&&(e=Vt.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),i&&Vt.set(t,e))}return e}toString(){return this.cssText}};const bi=e=>new Wt(typeof e=="string"?e:e+"",void 0,kt),N=(e,...t)=>{const i=e.length===1?e[0]:t.reduce((n,s,r)=>n+(o=>{if(o._$cssResult$===!0)return o.cssText;if(typeof o=="number")return o;throw Error("Value passed to 'css' function must be a 'css' function result: "+o+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+e[r+1],e[0]);return new Wt(i,e,kt)},vi=(e,t)=>{if(yt)e.adoptedStyleSheets=t.map(i=>i instanceof CSSStyleSheet?i:i.styleSheet);else for(const i of t){const n=document.createElement("style"),s=ot.litNonce;s!==void 0&&n.setAttribute("nonce",s),n.textContent=i.cssText,e.appendChild(n)}},Zt=yt?e=>e:e=>e instanceof CSSStyleSheet?(t=>{let i="";for(const n of t.cssRules)i+=n.cssText;return bi(i)})(e):e,{is:yi,defineProperty:ki,getOwnPropertyDescriptor:xi,getOwnPropertyNames:$i,getOwnPropertySymbols:wi,getPrototypeOf:Ai}=Object,at=globalThis,Yt=at.trustedTypes,_i=Yt?Yt.emptyScript:"",Si=at.reactiveElementPolyfillSupport,Y=(e,t)=>e,xt={toAttribute(e,t){switch(t){case Boolean:e=e?_i:null;break;case Object:case Array:e=e==null?e:JSON.stringify(e)}return e},fromAttribute(e,t){let i=e;switch(t){case Boolean:i=e!==null;break;case Number:i=e===null?null:Number(e);break;case Object:case Array:try{i=JSON.parse(e)}catch{i=null}}return i}},Qt=(e,t)=>!yi(e,t),Gt={attribute:!0,type:String,converter:xt,reflect:!1,useDefault:!1,hasChanged:Qt};Symbol.metadata??=Symbol("metadata"),at.litPropertyMetadata??=new WeakMap;let I=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=Gt){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){const i=Symbol(),n=this.getPropertyDescriptor(e,i,t);n!==void 0&&ki(this.prototype,e,n)}}static getPropertyDescriptor(e,t,i){const{get:n,set:s}=xi(this.prototype,e)??{get(){return this[t]},set(r){this[t]=r}};return{get:n,set(r){const o=n?.call(this);s?.call(this,r),this.requestUpdate(e,o,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??Gt}static _$Ei(){if(this.hasOwnProperty(Y("elementProperties")))return;const e=Ai(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(Y("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(Y("properties"))){const t=this.properties,i=[...$i(t),...wi(t)];for(const n of i)this.createProperty(n,t[n])}const e=this[Symbol.metadata];if(e!==null){const t=litPropertyMetadata.get(e);if(t!==void 0)for(const[i,n]of t)this.elementProperties.set(i,n)}this._$Eh=new Map;for(const[t,i]of this.elementProperties){const n=this._$Eu(t,i);n!==void 0&&this._$Eh.set(n,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const t=[];if(Array.isArray(e)){const i=new Set(e.flat(1/0).reverse());for(const n of i)t.unshift(Zt(n))}else e!==void 0&&t.push(Zt(e));return t}static _$Eu(e,t){const i=t.attribute;return i===!1?void 0:typeof i=="string"?i:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){const e=new Map,t=this.constructor.elementProperties;for(const i of t.keys())this.hasOwnProperty(i)&&(e.set(i,this[i]),delete this[i]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return vi(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,i){this._$AK(e,i)}_$ET(e,t){const i=this.constructor.elementProperties.get(e),n=this.constructor._$Eu(e,i);if(n!==void 0&&i.reflect===!0){const s=(i.converter?.toAttribute!==void 0?i.converter:xt).toAttribute(t,i.type);this._$Em=e,s==null?this.removeAttribute(n):this.setAttribute(n,s),this._$Em=null}}_$AK(e,t){const i=this.constructor,n=i._$Eh.get(e);if(n!==void 0&&this._$Em!==n){const s=i.getPropertyOptions(n),r=typeof s.converter=="function"?{fromAttribute:s.converter}:s.converter?.fromAttribute!==void 0?s.converter:xt;this._$Em=n;const o=r.fromAttribute(t,s.type);this[n]=o??this._$Ej?.get(n)??o,this._$Em=null}}requestUpdate(e,t,i,n=!1,s){if(e!==void 0){const r=this.constructor;if(n===!1&&(s=this[e]),i??=r.getPropertyOptions(e),!((i.hasChanged??Qt)(s,t)||i.useDefault&&i.reflect&&s===this._$Ej?.get(e)&&!this.hasAttribute(r._$Eu(e,i))))return;this.C(e,t,i)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(e,t,{useDefault:i,reflect:n,wrapped:s},r){i&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,r??t??this[e]),s!==!0||r!==void 0)||(this._$AL.has(e)||(this.hasUpdated||i||(t=void 0),this._$AL.set(e,t)),n===!0&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[n,s]of this._$Ep)this[n]=s;this._$Ep=void 0}const i=this.constructor.elementProperties;if(i.size>0)for(const[n,s]of i){const{wrapped:r}=s,o=this[n];r!==!0||this._$AL.has(n)||o===void 0||this.C(n,void 0,s,o)}}let e=!1;const t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(i=>i.hostUpdate?.()),this.update(t)):this._$EM()}catch(i){throw e=!1,this._$EM(),i}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(e){}firstUpdated(e){}};I.elementStyles=[],I.shadowRootOptions={mode:"open"},I[Y("elementProperties")]=new Map,I[Y("finalized")]=new Map,Si?.({ReactiveElement:I}),(at.reactiveElementVersions??=[]).push("2.1.2");const $t=globalThis,Xt=e=>e,dt=$t.trustedTypes,te=dt?dt.createPolicy("lit-html",{createHTML:e=>e}):void 0,ee="$lit$",M=`lit$${Math.random().toFixed(9).slice(2)}$`,ie="?"+M,Ei=`<${ie}>`,U=document,Q=()=>U.createComment(""),G=e=>e===null||typeof e!="object"&&typeof e!="function",wt=Array.isArray,Ci=e=>wt(e)||typeof e?.[Symbol.iterator]=="function",At=`[ 	
\f\r]`,X=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,ne=/-->/g,se=/>/g,z=RegExp(`>|${At}(?:([^\\s"'>=/]+)(${At}*=${At}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),re=/'/g,oe=/"/g,ae=/^(?:script|style|textarea|title)$/i,de=e=>(t,...i)=>({_$litType$:e,strings:t,values:i}),g=de(1),ji=de(2),P=Symbol.for("lit-noChange"),m=Symbol.for("lit-nothing"),pe=new WeakMap,R=U.createTreeWalker(U,129);function le(e,t){if(!wt(e)||!e.hasOwnProperty("raw"))throw Error("invalid template strings array");return te!==void 0?te.createHTML(t):t}const Mi=(e,t)=>{const i=e.length-1,n=[];let s,r=t===2?"<svg>":t===3?"<math>":"",o=X;for(let d=0;d<i;d++){const a=e[d];let l,c,p=-1,h=0;for(;h<a.length&&(o.lastIndex=h,c=o.exec(a),c!==null);)h=o.lastIndex,o===X?c[1]==="!--"?o=ne:c[1]!==void 0?o=se:c[2]!==void 0?(ae.test(c[2])&&(s=RegExp("</"+c[2],"g")),o=z):c[3]!==void 0&&(o=z):o===z?c[0]===">"?(o=s??X,p=-1):c[1]===void 0?p=-2:(p=o.lastIndex-c[2].length,l=c[1],o=c[3]===void 0?z:c[3]==='"'?oe:re):o===oe||o===re?o=z:o===ne||o===se?o=X:(o=z,s=void 0);const u=o===z&&e[d+1].startsWith("/>")?" ":"";r+=o===X?a+Ei:p>=0?(n.push(l),a.slice(0,p)+ee+a.slice(p)+M+u):a+M+(p===-2?d:u)}return[le(e,r+(e[i]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),n]};class rt{constructor({strings:t,_$litType$:i},n){let s;this.parts=[];let r=0,o=0;const d=t.length-1,a=this.parts,[l,c]=Mi(t,i);if(this.el=rt.createElement(l,n),R.currentNode=this.el.content,i===2||i===3){const p=this.el.content.firstChild;p.replaceWith(...p.childNodes)}for(;(s=R.nextNode())!==null&&a.length<d;){if(s.nodeType===1){if(s.hasAttributes())for(const p of s.getAttributeNames())if(p.endsWith(ee)){const h=c[o++],u=s.getAttribute(p).split(M),y=/([.?@])?(.*)/.exec(h);a.push({type:1,index:r,name:y[2],strings:u,ctor:y[1]==="."?Ti:y[1]==="?"?Ni:y[1]==="@"?Ui:pt}),s.removeAttribute(p)}else p.startsWith(M)&&(a.push({type:6,index:r}),s.removeAttribute(p));if(ae.test(s.tagName)){const p=s.textContent.split(M),h=p.length-1;if(h>0){s.textContent=dt?dt.emptyScript:"";for(let u=0;u<h;u++)s.append(p[u],Q()),R.nextNode(),a.push({type:2,index:++r});s.append(p[h],Q())}}}else if(s.nodeType===8)if(s.data===ie)a.push({type:2,index:r});else{let p=-1;for(;(p=s.data.indexOf(M,p+1))!==-1;)a.push({type:7,index:r}),p+=M.length-1}r++}}static createElement(t,i){const n=U.createElement("template");return n.innerHTML=t,n}}function D(e,t,i=e,n){if(t===P)return t;let s=n!==void 0?i._$Co?.[n]:i._$Cl;const r=G(t)?void 0:t._$litDirective$;return s?.constructor!==r&&(s?._$AO?.(!1),r===void 0?s=void 0:(s=new r(e),s._$AT(e,i,n)),n!==void 0?(i._$Co??=[])[n]=s:i._$Cl=s),s!==void 0&&(t=D(e,s._$AS(e,t.values),s,n)),t}class Oi{constructor(t,i){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=i}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:i},parts:n}=this._$AD,s=(t?.creationScope??U).importNode(i,!0);R.currentNode=s;let r=R.nextNode(),o=0,d=0,a=n[0];for(;a!==void 0;){if(o===a.index){let l;a.type===2?l=new Z(r,r.nextSibling,this,t):a.type===1?l=new a.ctor(r,a.name,a.strings,this,t):a.type===6&&(l=new zi(r,this,t)),this._$AV.push(l),a=n[++d]}o!==a?.index&&(r=R.nextNode(),o++)}return R.currentNode=U,s}p(t){let i=0;for(const n of this._$AV)n!==void 0&&(n.strings!==void 0?(n._$AI(t,n,i),i+=n.strings.length-2):n._$AI(t[i])),i++}}class Z{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,i,n,s){this.type=2,this._$AH=m,this._$AN=void 0,this._$AA=t,this._$AB=i,this._$AM=n,this.options=s,this._$Cv=s?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const i=this._$AM;return i!==void 0&&t?.nodeType===11&&(t=i.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,i=this){t=D(this,t,i),G(t)?t===m||t==null||t===""?(this._$AH!==m&&this._$AR(),this._$AH=m):t!==this._$AH&&t!==P&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):Ci(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==m&&G(this._$AH)?this._$AA.nextSibling.data=t:this.T(U.createTextNode(t)),this._$AH=t}$(t){const{values:i,_$litType$:n}=t,s=typeof n=="number"?this._$AC(t):(n.el===void 0&&(n.el=rt.createElement(le(n.h,n.h[0]),this.options)),n);if(this._$AH?._$AD===s)this._$AH.p(i);else{const r=new Oi(s,this),o=r.u(this.options);r.p(i),this.T(o),this._$AH=r}}_$AC(t){let i=pe.get(t.strings);return i===void 0&&pe.set(t.strings,i=new rt(t)),i}k(t){wt(this._$AH)||(this._$AH=[],this._$AR());const i=this._$AH;let n,s=0;for(const r of t)s===i.length?i.push(n=new Z(this.O(Q()),this.O(Q()),this,this.options)):n=i[s],n._$AI(r),s++;s<i.length&&(this._$AR(n&&n._$AB.nextSibling,s),i.length=s)}_$AR(t=this._$AA.nextSibling,i){for(this._$AP?.(!1,!0,i);t!==this._$AB;){const n=Xt(t).nextSibling;Xt(t).remove(),t=n}}setConnected(t){this._$AM===void 0&&(this._$Cv=t,this._$AP?.(t))}}class pt{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,i,n,s,r){this.type=1,this._$AH=m,this._$AN=void 0,this.element=t,this.name=i,this._$AM=s,this.options=r,n.length>2||n[0]!==""||n[1]!==""?(this._$AH=Array(n.length-1).fill(new String),this.strings=n):this._$AH=m}_$AI(t,i=this,n,s){const r=this.strings;let o=!1;if(r===void 0)t=D(this,t,i,0),o=!G(t)||t!==this._$AH&&t!==P,o&&(this._$AH=t);else{const d=t;let a,l;for(t=r[0],a=0;a<r.length-1;a++)l=D(this,d[n+a],i,a),l===P&&(l=this._$AH[a]),o||=!G(l)||l!==this._$AH[a],l===m?t=m:t!==m&&(t+=(l??"")+r[a+1]),this._$AH[a]=l}o&&!s&&this.j(t)}j(t){t===m?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class Ti extends pt{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===m?void 0:t}}class Ni extends pt{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==m)}}class Ui extends pt{constructor(t,i,n,s,r){super(t,i,n,s,r),this.type=5}_$AI(t,i=this){if((t=D(this,t,i,0)??m)===P)return;const n=this._$AH,s=t===m&&n!==m||t.capture!==n.capture||t.once!==n.once||t.passive!==n.passive,r=t!==m&&(n===m||s);s&&this.element.removeEventListener(this.name,this,n),r&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class zi{constructor(t,i,n){this.element=t,this.type=6,this._$AN=void 0,this._$AM=i,this.options=n}get _$AU(){return this._$AM._$AU}_$AI(t){D(this,t)}}const Pi={I:Z},Ri=$t.litHtmlPolyfillSupport;Ri?.(rt,Z),($t.litHtmlVersions??=[]).push("3.3.3");const Li=(e,t,i)=>{const n=i?.renderBefore??t;let s=n._$litPart$;if(s===void 0){const r=i?.renderBefore??null;n._$litPart$=s=new Z(t.insertBefore(Q(),r),r,void 0,i??{})}return s._$AI(e),s},_t=globalThis;let O=class extends I{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=Li(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return P}};O._$litElement$=!0,O.finalized=!0,_t.litElementHydrateSupport?.({LitElement:O});const qi=_t.litElementPolyfillSupport;qi?.({LitElement:O}),(_t.litElementVersions??=[]).push("4.2.2");const lt=N`
  :host {
    /* Neutral, white-based surface scale. */
    --dpk-paper: #fafbfc;
    --dpk-paper-raised: #ffffff;
    --dpk-paper-sunken: #f3f5f8;
    --dpk-paper-inset: #eceef2;
    --dpk-ink: #1a1d24;
    --dpk-ink-soft: #4d5566;
    --dpk-ink-faint: #7c8599;
    --dpk-rule: rgba(20, 28, 44, 0.08);
    --dpk-rule-strong: rgba(20, 28, 44, 0.14);
    --dpk-accent: #d94920;
    --dpk-accent-soft: rgba(217, 73, 32, 0.07);
    --dpk-accent-ink: #ffffff;
    --dpk-blue: #3366cc;
    --dpk-blue-soft: rgba(51, 102, 204, 0.08);
    --dpk-green: #1a8a4a;
    --dpk-green-soft: rgba(26, 138, 74, 0.08);
    --dpk-amber: #b47a0a;
    --dpk-amber-soft: rgba(180, 122, 10, 0.09);
    --dpk-violet: #7c4dcc;
    --dpk-violet-soft: rgba(124, 77, 204, 0.08);
    --dpk-display: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    --dpk-body: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    --dpk-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;

    /* Shape + elevation scale, so every surface reads as one system. */
    --dpk-radius-xs: 5px;
    --dpk-radius-sm: 7px;
    --dpk-radius: 8px;
    --dpk-radius-lg: 12px;
    --dpk-shadow-xs: 0 1px 2px rgba(20, 28, 44, 0.05), 0 1px 1px rgba(20, 28, 44, 0.03);
    --dpk-shadow-sm: 0 1px 2px rgba(20, 28, 44, 0.06), 0 2px 8px -2px rgba(20, 28, 44, 0.12);
    --dpk-shadow: 0 1px 3px rgba(20, 28, 44, 0.06), 0 8px 24px -8px rgba(20, 28, 44, 0.18);
    --dpk-shadow-lg: 0 2px 6px rgba(20, 28, 44, 0.06), 0 16px 40px -12px rgba(20, 28, 44, 0.22);
    --dpk-focus: 0 0 0 3px rgba(51, 102, 204, 0.25);
    --dpk-control-h: 32px;

    color: var(--dpk-ink);
    font-family: var(--dpk-body);
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
    font-family: var(--dpk-display);
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

  .dpk-mono,
  .dpk-num {
    font-variant-numeric: tabular-nums;
  }

  .dpk-label {
    font-family: var(--dpk-mono);
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--dpk-ink-faint);
  }
`,ct=N`
  .dpk-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 30px;
    padding: 0 12px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    font-size: 12.5px;
    font-weight: 520;
    line-height: 1;
    white-space: nowrap;
    box-shadow: var(--dpk-shadow-xs);
    cursor: pointer;
    transition:
      background 140ms ease,
      border-color 140ms ease,
      box-shadow 140ms ease,
      color 140ms ease,
      transform 80ms ease;
  }

  .dpk-btn:hover:not([disabled]) {
    background: var(--dpk-paper-sunken);
    border-color: rgba(20, 28, 44, 0.22);
    box-shadow: var(--dpk-shadow-sm);
  }

  .dpk-btn:active:not([disabled]) {
    transform: translateY(1px);
    box-shadow: none;
  }

  .dpk-btn:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  .dpk-btn[disabled] {
    opacity: 0.45;
    box-shadow: none;
    cursor: not-allowed;
  }

  .dpk-btn--accent {
    border-color: transparent;
    background: linear-gradient(180deg, var(--dpk-accent), #c23e12);
    color: var(--dpk-accent-ink);
    box-shadow:
      0 1px 2px rgba(217, 73, 32, 0.25),
      0 0 0 1px rgba(217, 73, 32, 0.15);
  }

  .dpk-btn--accent:hover:not([disabled]) {
    background: linear-gradient(180deg, #e0521f, #b83710);
    border-color: transparent;
    box-shadow:
      0 2px 6px rgba(217, 73, 32, 0.3),
      0 0 0 1px rgba(217, 73, 32, 0.2);
  }

  /* Selection state, shared by every template's filter/nav controls. */
  .dpk-btn--selected {
    border-color: transparent;
    background: linear-gradient(180deg, var(--dpk-blue), #2952a3);
    color: #fff;
    box-shadow: 0 1px 3px rgba(51, 102, 204, 0.3);
  }

  .dpk-btn--selected:hover:not([disabled]) {
    background: linear-gradient(180deg, #2952a3, #213f80);
    border-color: transparent;
    box-shadow: 0 2px 6px rgba(51, 102, 204, 0.35);
  }

  .dpk-btn--ghost {
    border-color: transparent;
    background: transparent;
    box-shadow: none;
    color: var(--dpk-ink-soft);
  }

  .dpk-btn--ghost:hover:not([disabled]) {
    background: var(--dpk-paper-inset);
    border-color: transparent;
    color: var(--dpk-ink);
  }

  .dpk-icon-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: var(--dpk-radius-xs);
    background: transparent;
    color: var(--dpk-ink-faint);
    font-size: 11px;
    line-height: 1;
    cursor: pointer;
    transition:
      background 140ms ease,
      color 140ms ease,
      transform 100ms ease;
  }

  .dpk-icon-btn:hover:not([disabled]) {
    background: var(--dpk-paper-inset);
    color: var(--dpk-ink);
    transform: scale(1.08);
  }

  .dpk-icon-btn:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  .dpk-icon-btn[disabled] {
    opacity: 0.35;
    cursor: default;
  }

  .dpk-icon-btn[data-active='true'] {
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue);
  }

  .dpk-icon-btn svg {
    display: block;
    width: 15px;
    height: 15px;
  }

  /* Count badge for an icon-only control (comments on a card, drafts on the rail). */
  .dpk-icon-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 15px;
    height: 15px;
    padding: 0 3px;
    border: 1.5px solid var(--dpk-paper-raised);
    border-radius: 999px;
    background: var(--dpk-accent);
    color: var(--dpk-accent-ink);
    font-family: var(--dpk-mono);
    font-size: 9px;
    font-variant-numeric: tabular-nums;
    line-height: 12px;
    text-align: center;
  }

  .dpk-input,
  .dpk-textarea,
  .dpk-select {
    box-sizing: border-box;
    width: 100%;
    min-height: var(--dpk-control-h);
    padding: 5px 9px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    font: inherit;
    font-size: 12.5px;
    transition:
      border-color 120ms ease,
      box-shadow 120ms ease;
  }

  .dpk-input:hover,
  .dpk-textarea:hover,
  .dpk-select:hover {
    border-color: rgba(20, 22, 26, 0.24);
  }

  .dpk-input:focus,
  .dpk-textarea:focus,
  .dpk-select:focus {
    outline: none;
    border-color: var(--dpk-blue);
    box-shadow: var(--dpk-focus);
  }

  .dpk-select {
    appearance: none;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M3 4.5 6 7.5 9 4.5' fill='none' stroke='%23878e9e' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/></svg>");
    background-repeat: no-repeat;
    background-position: right 7px center;
    padding-right: 26px;
    cursor: pointer;
  }

  .dpk-textarea {
    resize: vertical;
    min-height: 64px;
    line-height: 1.55;
  }
`,Bi=N`
  .comment-pop {
    box-sizing: border-box;
    overflow: auto;
    position: fixed;
    inset: auto;
    margin: 0;
    display: grid;
    gap: 8px;
    padding: 12px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-lg);
    color: var(--dpk-ink);
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
    color: var(--dpk-ink-soft);
  }

  .comment-pop .comment-list li {
    padding-left: 8px;
    border-left: 2px solid var(--dpk-accent);
  }

  .comment-pop .dpk-textarea {
    min-height: 54px;
  }

  .pop-actions {
    display: flex;
    gap: 2px;
    align-items: center;
    justify-content: flex-end;
  }
`,ht=(e,t)=>e instanceof t?e:null;class ce extends O{static{this.styles=[lt,ct,N`
      :host {
        display: inline;
        /* Inherit the surrounding type scale instead of forcing the chrome size:
           an inline edit inside a 17px heading must look like a 17px heading.
           Color comes along too, so an edit on a colored card stays legible. */
        font-family: inherit;
        font-size: inherit;
        font-weight: inherit;
        line-height: inherit;
        color: inherit;
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
        border-bottom-color: var(--dpk-blue);
        background: var(--dpk-blue-soft);
      }

      .view[data-empty='true'] {
        color: var(--dpk-ink-faint);
        font-style: italic;
      }

      input,
      textarea {
        font: inherit;
        color: inherit;
        background: var(--dpk-paper-raised);
        border: 1px solid var(--dpk-blue);
        border-radius: var(--dpk-radius-sm);
        box-shadow: var(--dpk-focus);
        padding: 3px 7px;
        min-width: 0;
        width: 100%;
        transition: box-shadow 140ms ease;
      }

      textarea {
        min-height: var(--dpk-inline-textarea-min-height, 90px);
        resize: vertical;
        font-family: var(--dpk-body);
        line-height: 1.5;
      }

      /* wrap: the field wraps like the text it replaces, and Enter still
         commits, so a one-line value is edited without losing sight of it. */
      :host([wrap]) textarea {
        min-height: 0;
        resize: none;
        line-height: inherit;
      }

      /* seamless: no field chrome at all — the text is edited where it sits.
         The chrome theme paints fields with its own ink and size, so the
         seamless field re-states the inherited type and color. */
      :host([seamless]) input,
      :host([seamless]) textarea {
        padding: 0;
        border: none;
        border-radius: 0;
        background: transparent;
        box-shadow: none;
        height: 100%;
        min-height: 0;
        overflow: auto;
        resize: none;
        font: inherit;
        font-size: inherit;
        line-height: inherit;
        color: inherit;
      }

      :host([seamless]) .view {
        padding: 0;
      }
    `]}static{this.properties={value:{type:String},placeholder:{type:String},multiline:{type:Boolean},wrap:{type:Boolean,reflect:!0},seamless:{type:Boolean,reflect:!0},label:{type:String},editing:{state:!0}}}#e="";#r=0;connectedCallback(){super.connectedCallback(),this.#r+=1}constructor(){super(),this.value="",this.placeholder="",this.multiline=!1,this.wrap=!1,this.seamless=!1,this.label="",this.editing=!1,this.#e=""}startEditing(){this.#e=this.value,this.editing=!0}willUpdate(t){t.has("value")&&!this.editing&&(this.#e=this.value)}updated(){if(!this.editing)return;const t=this.renderRoot.querySelector("input, textarea"),i=this.renderRoot,n=i instanceof ShadowRoot?i.activeElement:document.activeElement;t&&n!==t&&(t.focus(),t.select())}render(){if(!this.editing){const i=this.value.length===0;return g`<span
        class="view"
        data-empty=${String(i)}
        role="button"
        tabindex="0"
        title="クリックして編集"
        @click=${this.#t}
        @keydown=${this.#s}
        >${i?this.placeholder||"\u672A\u8A2D\u5B9A":this.value}</span
      >`}const t=this.label||this.placeholder||"\u7DE8\u96C6";return g`
      ${this.multiline||this.wrap?g`<textarea
              class="dpk-textarea"
              .value=${this.#e}
              aria-label=${t}
              @input=${this.#o}
              @keydown=${this.#i}
              @blur=${this.#n}
            ></textarea>`:g`<input
              class="dpk-input"
              .value=${this.#e}
              aria-label=${t}
              @input=${this.#o}
              @keydown=${this.#i}
              @blur=${this.#n}
            />`}
    `}#t=t=>{t.stopPropagation(),this.editing=!0};#s=t=>{t.isComposing||(t.key==="Enter"||t.key===" ")&&(t.preventDefault(),this.editing=!0)};#o=t=>{const i=ht(t.target,HTMLInputElement)??ht(t.target,HTMLTextAreaElement);i!==null&&(this.#e=i.value)};#i=t=>{if(!t.isComposing){if(t.key==="Escape"){t.preventDefault(),this.#e=this.value,this.editing=!1;return}t.key==="Enter"&&(!this.multiline||this.wrap||t.metaKey||t.ctrlKey)&&(t.preventDefault(),this.#p())}};#n=t=>{const i=t.currentTarget;if(!(i instanceof HTMLInputElement||i instanceof HTMLTextAreaElement))return;const n=this.#r,{selectionStart:s,selectionEnd:r}=i;queueMicrotask(()=>{!this.isConnected||!this.editing||(n!==this.#r?(i.focus(),i.setSelectionRange(s,r)):this.#p())})};#p=()=>{if(!this.editing)return;this.editing=!1;const t=(this.wrap?this.#e.replace(/\r?\n/g," "):this.#e).trim();t!==this.value&&this.dispatchEvent(new CustomEvent("dpk-commit",{detail:{value:t},bubbles:!0,composed:!0}))}}const Hi=()=>{customElements.get("dpk-component-inline-edit")||customElements.define("dpk-component-inline-edit",ce)},Ii={lang:void 0,message:void 0,abortEarly:void 0,abortPipeEarly:void 0};function St(e){return Ii}let Di;function Ji(e){return Di?.get(e)}let Fi;function Ki(e){return Fi?.get(e)}let Vi;function Wi(e,t){return Vi?.get(e)?.get(t)}function tt(e){const t=typeof e;return t==="string"?`"${e}"`:t==="number"||t==="bigint"||t==="boolean"?`${e}`:t==="object"||t==="function"?(e&&Object.getPrototypeOf(e)?.constructor?.name)??"null":t}function k(e,t,i,n,s){const r=s&&"input"in s?s.input:i.value,o=s?.expected??e.expects??null,d=s?.received??tt(r),a={kind:e.kind,type:e.type,input:r,expected:o,received:d,message:`Invalid ${t}: ${o?`Expected ${o} but r`:"R"}eceived ${d}`,requirement:e.requirement,path:s?.path,issues:s?.issues,lang:n.lang,abortEarly:n.abortEarly,abortPipeEarly:n.abortPipeEarly},l=e.kind==="schema",c=s?.message??e.message??Wi(e.reference,a.lang)??(l?Ki(a.lang):null)??n.message??Ji(a.lang);c!==void 0&&(a.message=typeof c=="function"?c(a):c),l&&(i.typed=!1),i.issues?i.issues.push(a):i.issues=[a]}function Zi(e,t){return e===t||Number.isNaN(e)&&Number.isNaN(t)}function Yi(e,t){return Object.prototype.hasOwnProperty.call(e,t)&&t!=="__proto__"&&t!=="prototype"&&t!=="constructor"}function Et(e,t){const i=[...new Set(e)];return i.length>1?`(${i.join(` ${t} `)})`:i[0]??"never"}function $(e){return e["~standard"]={version:1,vendor:"valibot",validate:t=>e["~run"]({value:t},St())},e}var Qi=class extends Error{constructor(e){super(e[0].message),this.name="ValiError",this.issues=e}};function he(e){return{kind:"validation",type:"integer",reference:he,async:!1,expects:null,requirement:Number.isInteger,message:e,"~run"(t,i){return t.typed&&!this.requirement(t.value)&&k(this,"integer",t,i),t}}}function v(e,t){return{kind:"validation",type:"min_length",reference:v,async:!1,expects:`>=${e}`,requirement:e,message:t,"~run"(i,n){return i.typed&&i.value.length<this.requirement&&k(this,"length",i,n,{received:`${i.value.length}`}),i}}}function ue(e,t){return{kind:"validation",type:"min_value",reference:ue,async:!1,expects:`>=${e instanceof Date?e.toJSON():tt(e)}`,requirement:e,message:t,"~run"(i,n){return i.typed&&!(i.value>=this.requirement)&&k(this,"value",i,n,{received:i.value instanceof Date?i.value.toJSON():tt(i.value)}),i}}}function L(e,t){return{kind:"validation",type:"regex",reference:L,async:!1,expects:`${e}`,requirement:e,message:t,"~run"(i,n){return i.typed&&!this.requirement.test(i.value)&&k(this,"format",i,n),i}}}function Ct(){return{kind:"transformation",type:"trim",reference:Ct,async:!1,"~run"(e){return e.value=e.value.trim(),e}}}const Gi={abortEarly:!0};function fe(e,t,i){return typeof e.fallback=="function"?e.fallback(t,i):e.fallback}function ut(e,t,i){return typeof e.default=="function"?e.default(t,i):e.default}function q(e,t){return $({kind:"schema",type:"array",reference:q,expects:"Array",async:!1,item:e,message:t,"~run"(i,n){const s=i.value;if(Array.isArray(s)){i.typed=!0,i.value=[];for(let r=0;r<s.length;r++){const o=s[r],d=this.item["~run"]({value:o},n);if(d.issues){const a={type:"array",origin:"value",input:s,key:r,value:o};for(const l of d.issues)l.path?l.path.unshift(a):l.path=[a],i.issues?.push(l);if(i.issues||(i.issues=d.issues),n.abortEarly){i.typed=!1;break}}d.typed||(i.typed=!1),i.value.push(d.value)}}else k(this,"type",i,n);return i}})}function ge(e){return $({kind:"schema",type:"boolean",reference:ge,expects:"boolean",async:!1,message:e,"~run"(t,i){return typeof t.value=="boolean"?t.typed=!0:k(this,"type",t,i),t}})}function S(e,t){return $({kind:"schema",type:"exact_optional",reference:S,expects:e.expects,async:!1,wrapped:e,default:t,"~run"(i,n){return this.wrapped["~run"](i,n)}})}function me(e){return $({kind:"schema",type:"lazy",reference:me,expects:"unknown",async:!1,getter:e,"~run"(t,i){return this.getter(t.value)["~run"](t,i)}})}function J(e,t){return $({kind:"schema",type:"literal",reference:J,expects:tt(e),async:!1,literal:e,message:t,"~run"(i,n){return Zi(i.value,this.literal)?i.typed=!0:k(this,"type",i,n),i}})}function be(e,t){return $({kind:"schema",type:"nullable",reference:be,expects:`(${e.expects} | null)`,async:!1,wrapped:e,default:t,"~run"(i,n){return i.value===null&&(this.default!==void 0&&(i.value=ut(this,i,n)),i.value===null)?(i.typed=!0,i):this.wrapped["~run"](i,n)}})}function ve(e){return $({kind:"schema",type:"number",reference:ve,expects:"number",async:!1,message:e,"~run"(t,i){return typeof t.value=="number"&&!isNaN(t.value)?t.typed=!0:k(this,"type",t,i),t}})}function w(e,t){return $({kind:"schema",type:"object",reference:w,expects:"Object",async:!1,entries:e,message:t,"~run"(i,n){const s=i.value;if(s&&typeof s=="object"){i.typed=!0,i.value={};for(const r in this.entries){const o=this.entries[r];if(r in s||(o.type==="exact_optional"||o.type==="optional"||o.type==="nullish")&&o.default!==void 0){const d=r in s?s[r]:ut(o),a=o["~run"]({value:d},n);if(a.issues){const l={type:"object",origin:"value",input:s,key:r,value:d};for(const c of a.issues)c.path?c.path.unshift(l):c.path=[l],i.issues?.push(c);if(i.issues||(i.issues=a.issues),n.abortEarly){i.typed=!1;break}}a.typed||(i.typed=!1),i.value[r]=a.value}else if(o.fallback!==void 0)i.value[r]=fe(o);else if(o.type!=="exact_optional"&&o.type!=="optional"&&o.type!=="nullish"&&(k(this,"key",i,n,{input:void 0,expected:`"${r}"`,path:[{type:"object",origin:"key",input:s,key:r,value:s[r]}]}),n.abortEarly))break}}else k(this,"type",i,n);return i}})}function ft(e,t){return $({kind:"schema",type:"optional",reference:ft,expects:`(${e.expects} | undefined)`,async:!1,wrapped:e,default:t,"~run"(i,n){return i.value===void 0&&(this.default!==void 0&&(i.value=ut(this,i,n)),i.value===void 0)?(i.typed=!0,i):this.wrapped["~run"](i,n)}})}function gt(e,t){return $({kind:"schema",type:"picklist",reference:gt,expects:Et(e.map(tt),"|"),async:!1,options:e,message:t,"~run"(i,n){return this.options.includes(i.value)?i.typed=!0:k(this,"type",i,n),i}})}function ye(e,t,i){return $({kind:"schema",type:"record",reference:ye,expects:"Object",async:!1,key:e,value:t,message:i,"~run"(n,s){const r=n.value;if(r&&typeof r=="object"){n.typed=!0,n.value={};for(const o in r)if(Yi(r,o)){const d=r[o],a=this.key["~run"]({value:o},s);if(a.issues){const c={type:"object",origin:"key",input:r,key:o,value:d};for(const p of a.issues)p.path=[c],n.issues?.push(p);if(n.issues||(n.issues=a.issues),s.abortEarly){n.typed=!1;break}}const l=this.value["~run"]({value:d},s);if(l.issues){const c={type:"object",origin:"value",input:r,key:o,value:d};for(const p of l.issues)p.path?p.path.unshift(c):p.path=[c],n.issues?.push(p);if(n.issues||(n.issues=l.issues),s.abortEarly){n.typed=!1;break}}(!a.typed||!l.typed)&&(n.typed=!1),a.typed&&(n.value[a.value]=l.value)}}else k(this,"type",n,s);return n}})}function F(e,t){return $({kind:"schema",type:"strict_object",reference:F,expects:"Object",async:!1,entries:e,message:t,"~run"(i,n){const s=i.value;if(s&&typeof s=="object"){i.typed=!0,i.value={};for(const r in this.entries){const o=this.entries[r];if(r in s||(o.type==="exact_optional"||o.type==="optional"||o.type==="nullish")&&o.default!==void 0){const d=r in s?s[r]:ut(o),a=o["~run"]({value:d},n);if(a.issues){const l={type:"object",origin:"value",input:s,key:r,value:d};for(const c of a.issues)c.path?c.path.unshift(l):c.path=[l],i.issues?.push(c);if(i.issues||(i.issues=a.issues),n.abortEarly){i.typed=!1;break}}a.typed||(i.typed=!1),i.value[r]=a.value}else if(o.fallback!==void 0)i.value[r]=fe(o);else if(o.type!=="exact_optional"&&o.type!=="optional"&&o.type!=="nullish"&&(k(this,"key",i,n,{input:void 0,expected:`"${r}"`,path:[{type:"object",origin:"key",input:s,key:r,value:s[r]}]}),n.abortEarly))break}if(!i.issues||!n.abortEarly){for(const r in s)if(!Object.prototype.hasOwnProperty.call(this.entries,r)){k(this,"key",i,n,{input:r,expected:"never",path:[{type:"object",origin:"key",input:s,key:r,value:s[r]}]});break}}}else k(this,"type",i,n);return i}})}function f(e){return $({kind:"schema",type:"string",reference:f,expects:"string",async:!1,message:e,"~run"(t,i){return typeof t.value=="string"?t.typed=!0:k(this,"type",t,i),t}})}function ke(e){let t;if(e)for(const i of e)if(t)for(const n of i.issues)t.push(n);else t=i.issues;return t}function xe(e,t){return $({kind:"schema",type:"union",reference:xe,expects:Et(e.map(i=>i.expects),"|"),async:!1,options:e,message:t,"~run"(i,n){let s,r,o;for(const d of this.options){const a=d["~run"]({value:i.value},n);if(a.typed)if(a.issues)r?r.push(a):r=[a];else{s=a;break}else o?o.push(a):o=[a]}if(s)return s;if(r){if(r.length===1)return r[0];k(this,"type",i,n,{issues:ke(r)}),i.typed=!0}else{if(o?.length===1)return o[0];k(this,"type",i,n,{issues:ke(o)})}return i}})}function B(){return $({kind:"schema",type:"unknown",reference:B,expects:"unknown",async:!1,"~run"(e){return e.typed=!0,e}})}function $e(e,t,i){return $({kind:"schema",type:"variant",reference:$e,expects:"Object",async:!1,key:e,options:t,message:i,"~run"(n,s){const r=n.value;if(r&&typeof r=="object"){let o,d=0,a=this.key,l=[];const c=(p,h)=>{for(const u of p.options){if(u.type==="variant")c(u,new Set(h).add(u.key));else{let y=!0,_=0;for(const A of h){const T=u.entries[A];if(A in r?T["~run"]({typed:!1,value:r[A]},Gi).issues:T.type!=="exact_optional"&&T.type!=="optional"&&T.type!=="nullish"){y=!1,a!==A&&(d<_||d===_&&A in r&&!(a in r))&&(d=_,a=A,l=[]),a===A&&l.push(u.entries[A].expects);break}_++}if(y){const A=u["~run"]({value:r},s);(!o||!o.typed&&A.typed)&&(o=A)}}if(o&&!o.issues)break}};if(c(this,new Set([this.key])),o)return o;k(this,"type",n,s,{input:r[a],expected:Et(l,"|"),path:[{type:"object",origin:"value",input:r,key:a,value:r[a]}]})}else k(this,"type",n,s);return n}})}function we(e,t,i){const n=e["~run"]({value:t},St());if(n.issues)throw new Qi(n.issues);return n.value}function b(...e){return $({...e[0],pipe:e,"~run"(t,i){for(const n of e)if(n.kind!=="metadata"){if(t.issues&&(n.kind==="schema"||n.kind==="transformation")){t.typed=!1;break}(!t.issues||!i.abortEarly&&!i.abortPipeEarly)&&(t=n["~run"](t,i))}return t}})}function x(e,t,i){const n=e["~run"]({value:t},St());return{typed:n.typed,success:!n.issues,output:n.value,issues:n.issues}}const mt=w({type:b(f(),v(1)),id:b(f(),v(1))}),Xi=b(f(),v(1),L(/^[A-Za-z0-9_-]+$/,'ids may only contain letters, digits, "_" and "-" (a "." builds a path)')),tn=(e,t)=>{if(t===1)return e.includes(".")?null:[e];const i=e.split(".");return i.length===t&&i.every(n=>n.length>0)?i:null},K=w({id:b(f(),v(1)),type:b(f(),v(1)),target:mt,payload:B(),note:S(f()),createdAt:b(f(),v(1))}),en=(e,t,i,n={})=>{const s=w({id:b(f(),v(1)),type:J(e),target:mt,payload:i,note:S(f()),createdAt:b(f(),v(1))}),r=o=>{const d=x(K,o);if(!d.success||d.output.type!==e)return null;const a=x(i,o.payload);return a.success?{id:d.output.id,type:e,target:d.output.target,payload:a.output,...d.output.note===void 0?{}:{note:d.output.note},createdAt:d.output.createdAt}:null};return{schema:s,mode:n.mode??"patch",targetType:t,actionType:e,payloadSchema:i,parse:r,...n.dedupeKey?{dedupeKey:n.dedupeKey}:{}}},nn=(e,t)=>{const i=bt(e,t.type);if(i===void 0)return null;const n=i.parse(t);return n===null?null:n},sn=(e,t)=>{const i=x(e.payloadSchema,t.payload);if(!i.success)throw new Error(`invalid payload for action "${t.type}"`);return i.output},bt=(e,t)=>Object.hasOwn(e,t)?e[t]:void 0,rn=e=>{throw new Error(`unhandled action: ${JSON.stringify(e)}`)},on=w({id:b(f(),v(1))}),an=e=>{const t=x(on,e.payload);return`${e.type}|${t.success?t.output.id:JSON.stringify(e.payload)}`},E=e=>`${e.type}:${e.id}`,Ae=e=>{const t=e.indexOf(":");return t<=0?{type:"unknown",id:e}:{type:e.slice(0,t),id:e.slice(t+1)}},jt=(e,t)=>typeof e=="string"?Ae(e.includes(":")?e:`${t}:${e}`):{type:e.type,id:e.id},dn=(e,t)=>e.type===t.type&&e.id===t.id,_e=e=>{const t=e.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,40);return t.length>0?t:"item"},pn=(e,t)=>{const i=_e(e),n=new Set(t);if(!n.has(i))return i;for(let s=2;s<1e3;s+=1){const r=`${i}-${s}`;if(!n.has(r))return r}return`${i}-${Math.random().toString(36).slice(2,8)}`},Se=()=>{const e=globalThis.crypto;return e?.randomUUID?e.randomUUID():`a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`},C="comment",et=e=>{const[t]=e;return{path:t?.path?.map(i=>String(i.key)).join(".")??"",message:t?.message??"invalid action"}},Ee=w({type:b(f(),v(1)),target:xe([b(f(),v(1)),mt]),payload:ft(B()),note:S(f()),id:S(b(f(),v(1))),createdAt:S(b(f(),v(1)))}),ln=(e,t)=>{const i=x(Ee,e);if(!i.success)return{ok:!1,issue:et(i.issues)};const n=i.output,s=jt(n.target,t.targetType),r={id:n.id??Se(),type:n.type,target:s,payload:n.payload??{},...n.note===void 0?{}:{note:n.note},createdAt:n.createdAt??new Date().toISOString()},o=x(t.schema,r);if(!o.success)return{ok:!1,issue:et(o.issues)};const d=x(K,o.output);return d.success?{ok:!0,action:d.output}:{ok:!1,issue:et(d.issues)}},Mt=(e,t)=>t.dedupeKey?t.dedupeKey(e):t.mode!=="patch"?null:`${e.type}|${E(e.target)}`,Ot=(e,t,i)=>{const n=Mt(t,i);if(n===null)return[...e,t];const s=e.at(-1);return!s||Mt(s,i)!==n||!cn(s,t)?[...e,t]:[...e.slice(0,-1),t]},cn=(e,t)=>dn(e.target,t.target),Tt=e=>JSON.stringify(e.map(t=>({id:t.id,type:t.type,target:t.target,payload:t.payload,...t.note===void 0?{}:{note:t.note},createdAt:t.createdAt})),null,2),Ce=w({id:b(f(),v(1)),type:J(C),target:w({type:b(f(),v(1)),id:b(f(),v(1))}),payload:w({body:b(f(),v(1))}),note:S(f()),createdAt:b(f(),v(1))}),je={schema:Ce,mode:"append",targetType:"page"},hn=w({body:f()}),Nt=e=>{const t=x(hn,e.payload);return t.success?t.output.body:""},Ut="element",Me=b(f(),L(/^[A-Z][A-Z0-9_]*$/,"component action types are CONSTANT_CASE")),Oe=ye(f(),B()),un=w({type:J(Ut),id:b(f(),L(/^[^/]+\/.+/,"component references start with a provider id"))}),fn=w({id:b(f(),v(1)),type:Me,target:un,payload:Oe,note:S(f()),createdAt:b(f(),v(1))}),gn={schema:fn,mode:"sequence",targetType:Ut},mn=F({type:Me,target:b(f(),L(/^element:[^/]+\/.+/)),payload:ft(Oe,{})}),Te=F({id:b(f(),v(1)),title:b(f(),v(1)),summary:S(f()),tone:S(gt(["create","update","delete","move","meta"])),stale:S(gt(["unsupported-action-type","target-missing","constraint-violated"]))}),zt=e=>{if(e.type!==Ut)return null;const t=e.id.indexOf("/");if(t<=0)return null;try{return decodeURIComponent(e.id.slice(0,t))}catch{return null}},j=e=>e.type!==C&&zt(e.target)!==null,bn=(e,t)=>e.filter(i=>j(i)&&zt(i.target)===t),Ne=(e,t)=>{const i=new Map(e.flatMap(n=>j(n)?[[n.id,zt(n.target)]]:[]));return new Map(t.flatMap(n=>n.results.flatMap(s=>i.get(s.id)===n.id?[[s.id,s]]:[])))},Pt=Object.freeze({}),Rt=e=>{const t=e.startsWith("#")?e.slice(1):e;if(t.length===0)return Pt;const i=new URLSearchParams(t.startsWith("?")?t.slice(1):t),n={};for(const[s,r]of i)s.length>0&&r.length>0&&(n[s]=r);return n},V=e=>{const t=new URLSearchParams;for(const n of Object.keys(e).sort((s,r)=>s<r?-1:s>r?1:0)){const s=e[n];s!=null&&s!==""&&t.set(n,s)}const i=t.toString();return i.length===0?"":`#${i}`},Lt=(e,t)=>{const i={...e};for(const[n,s]of Object.entries(t))s==null||s===""?delete i[n]:i[n]=s;return i},vn=(e,t="json")=>`\`\`\`${t}
${e}
\`\`\``,yn=e=>JSON.stringify({type:e.type,target:e.target,payload:e.payload,...e.note===void 0?{}:{note:e.note}},null,2),qt=(e,t,i)=>{const{actions:n,state:s}=e,r=n.filter(a=>a.type===C),o=n.filter(a=>a.type!==C),d=[];if(d.push(`# Review draft \u2014 ${t.label}`),d.push(""),d.push(`- template: \`${t.name}\``),d.push(`- framework: \`dev-process-kit@${i}\``),d.push(`- navigation: \`${V(e.navigation)||"(none)"}\``),d.push(`- pending: ${o.length} change(s), ${r.length} comment(s)`),e.stale.length>0&&d.push(`- stale (not applicable to the current base): ${e.stale.length}`),d.push(""),d.push("## How to apply"),d.push(""),d.push("These are patches against the base HTML, not a command log. Apply the requested end state to the meaning model, keep the stable ids of surviving concepts, and keep the base JSON free of any draft envelope."),o.some(j)&&(d.push(""),d.push("Changes targeting `element:<id>/\u2026` belong to the component with that `id` (for example a diagram): apply them to that component's own JSON, following its documented action vocabulary.")),d.push(""),r.length>0){d.push(`## Comments (${r.length})`),d.push("");for(const[a,l]of r.entries()){const c=t.describe(l,s,e.base);d.push(`${a+1}. **${c.targetLabel}** \u2014 \`${E(l.target)}\``),d.push(`   > ${Nt(l).replace(/\n/g,`
   > `)}`)}d.push("")}if(o.length>0){d.push(`## Requested changes (${o.length})`),d.push("");for(const[a,l]of o.entries()){const c=t.describe(l,s,e.base),p=c.summary?` \u2014 ${c.summary}`:"";d.push(`${a+1}. **${c.title}**${p}`),d.push(`   target: \`${E(l.target)}\` (${l.target.type})`),d.push(`   \`\`\`json
   ${yn(l).replace(/\n/g,`
   `)}
   \`\`\``)}d.push("")}return o.length===0&&r.length===0&&(d.push("_No pending draft actions._"),d.push("")),d.push("## Canonical draft (JSON)"),d.push(""),d.push(vn(Tt(n))),d.push(""),d.join(`
`)},W="0.0.1-debug",Ue=async e=>{try{if(navigator.clipboard?.writeText)return await navigator.clipboard.writeText(e),!0}catch{}const t=document.activeElement,i=document.createElement("textarea");try{return i.value=e,i.setAttribute("readonly",""),i.style.position="fixed",i.style.opacity="0",document.body.append(i),i.select(),document.execCommand("copy")}catch{return!1}finally{i.remove(),t instanceof HTMLElement&&t.focus()}},kn=()=>({body:"",attachment:{kind:"page"},copy:{kind:"idle"},copyRequest:0}),ze=e=>e.kind==="explicit"?{kind:e.resume}:e,Pe=(e,t)=>{switch(t.kind){case"input":return{...e,body:t.body};case"attach":return{...e,attachment:{kind:t.current?"current":"page"}};case"clear-target":return{...e,attachment:ze(e.attachment)};case"target-requested":return{...e,attachment:{kind:"explicit",ref:t.ref,resume:e.attachment.kind==="explicit"?e.attachment.resume:e.attachment.kind}};case"submitted":return{...e,body:"",attachment:ze(e.attachment),copy:{kind:"idle"},copyRequest:e.copyRequest+1};case"copy-started":return{...e,copy:{kind:"pending",format:t.format},copyRequest:e.copyRequest+1};case"copy-finished":return t.request!==e.copyRequest||e.copy.kind!=="pending"?e:{...e,copy:t.ok?{kind:"copied",format:e.copy.format}:{kind:"failed"}}}},xn=(e,t)=>{const i=e.body.trim();return i===""?null:{target:t,body:i}},Re=e=>e.group?`${e.group} \xB7 ${e.label}`:e.label,Le=(e,t)=>{const{definition:i,state:n,navigation:s,derivation:r}=e,o=i.currentTarget?.(n,s)??null,d=t.attachment,a=d.kind==="explicit"?i.commentTargets(n,s).find(p=>p.value===d.ref):null,l=d.kind==="explicit"?{ref:d.ref,label:a?Re(a):d.ref}:d.kind==="current"&&o?{ref:o.value,label:Re(o)}:{ref:`page:${i.name}`,label:"\u30DA\u30FC\u30B8\u5168\u4F53"},c=new Map(r.stale.map(p=>[p.action.id,p.reason]));return{body:t.body,target:l,attachment:d.kind==="explicit"?{kind:"explicit"}:o?{kind:"checkbox",checked:d.kind==="current",group:o.group??""}:{kind:"none"},canSubmit:t.body.trim().length>0,items:r.actions.map(p=>{const h=i.describe(p,n,r.base),u=p.type==="comment";return{id:p.id,title:u?"\u30B3\u30E1\u30F3\u30C8":h.title,targetLabel:h.targetLabel,tone:u?"comment":h.tone,text:{kind:u?"comment":"summary",body:u?Nt(p):h.summary??""},code:i.serialize(p),stale:c.get(p.id)??null}}),issues:e.issues.map(p=>`${p.path?`${p.path}: `:""}${p.message}`),flash:t.copy.kind==="copied"?`copied ${t.copy.format==="json"?"JSON":"brief"} \u2713`:t.copy.kind==="failed"?"copy failed":""}},$n=[lt,ct,N`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 0;
      width: 100%;
      background: var(--dpk-paper-raised);
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 14px 16px 12px;
      border-bottom: 1px solid var(--dpk-rule);
      background: linear-gradient(180deg, var(--dpk-paper-raised), var(--dpk-paper));
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
      border-bottom: 1px solid var(--dpk-rule);
      background: var(--dpk-paper-sunken);
    }

    .composer textarea {
      min-height: 62px;
      background: var(--dpk-paper-raised);
      border-radius: var(--dpk-radius);
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
      color: var(--dpk-ink-soft);
      cursor: pointer;
    }

    .composer .attach input {
      width: 14px;
      height: 14px;
      margin: 0;
      accent-color: var(--dpk-accent);
      cursor: pointer;
    }

    .composer .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border: 1px solid var(--dpk-rule);
      border-radius: 999px;
      background: var(--dpk-paper-raised);
      font-size: 11.5px;
      cursor: pointer;
    }

    .composer .chip svg {
      flex: none;
      width: 12px;
      height: 12px;
    }

    .composer .chip:hover {
      border-color: var(--dpk-rule-strong);
    }

    .target-line {
      margin-right: auto;
      font-family: var(--dpk-mono);
      font-size: 10px;
      letter-spacing: 0.03em;
      color: var(--dpk-ink-faint);
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
      border: 1px solid var(--dpk-rule);
      border-radius: var(--dpk-radius);
      background: var(--dpk-paper-raised);
      box-shadow: var(--dpk-shadow-xs);
      transition:
        box-shadow 160ms ease,
        border-color 160ms ease;
    }

    .item:hover {
      box-shadow: var(--dpk-shadow-sm);
    }

    .item::before {
      content: '';
      position: absolute;
      left: 0;
      top: 10px;
      bottom: 10px;
      width: 3px;
      border-radius: 0 2px 2px 0;
      background: var(--tone, var(--dpk-ink-faint));
    }

    .item[data-tone='comment'] {
      --tone: var(--dpk-accent);
      background: linear-gradient(90deg, var(--dpk-accent-soft), transparent 55%);
    }

    .item[data-tone='create'] {
      --tone: var(--dpk-green);
    }

    .item[data-tone='update'] {
      --tone: var(--dpk-blue);
    }

    .item[data-tone='delete'] {
      --tone: var(--dpk-accent);
    }

    .item[data-tone='move'] {
      --tone: var(--dpk-violet);
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
      border: 1px solid var(--dpk-rule-strong);
      border-radius: 999px;
      font-family: var(--dpk-mono);
      font-size: 9px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--dpk-ink-faint);
    }

    .item-head .dpk-icon-btn {
      margin-left: auto;
    }

    .item-target {
      font-family: var(--dpk-mono);
      font-size: 10px;
      color: var(--dpk-ink-faint);
    }

    .item-summary {
      font-size: 12px;
      color: var(--dpk-ink-soft);
    }

    .item-body {
      margin: 2px 0 0;
      padding-left: 9px;
      border-left: 2px solid var(--dpk-accent);
      font-size: 12.5px;
      white-space: pre-wrap;
    }

    .item-code {
      margin-top: 2px;
      font-family: var(--dpk-mono);
      font-size: 10px;
      color: var(--dpk-ink-faint);
      overflow-wrap: anywhere;
    }

    .empty {
      padding: 6px 4px;
      font-size: 12px;
      line-height: 1.7;
      color: var(--dpk-ink-faint);
    }

    .issues {
      margin: 10px 12px 0;
      padding: 9px 11px;
      border: 1px solid rgba(194, 64, 15, 0.35);
      border-radius: var(--dpk-radius-sm);
      background: var(--dpk-accent-soft);
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
      border-top: 1px solid var(--dpk-rule);
      background: linear-gradient(180deg, var(--dpk-paper-sunken), var(--dpk-paper-inset));
    }

    .flash {
      font-family: var(--dpk-mono);
      font-size: 10px;
      letter-spacing: 0.04em;
      color: var(--dpk-green);
    }
  `],wn={CHILD:2},qe=e=>(...t)=>({_$litDirective$:e,values:t});let Be=class{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,t,i){this._$Ct=e,this._$AM=t,this._$Ci=i}_$AS(e,t){return this.update(e,t)}update(e,t){return this.render(...t)}};const{I:An}=Pi,He=e=>e,Ie=()=>document.createComment(""),it=(e,t,i)=>{const n=e._$AA.parentNode,s=t===void 0?e._$AB:t._$AA;if(i===void 0){const r=n.insertBefore(Ie(),s),o=n.insertBefore(Ie(),s);i=new An(r,o,e,e.options)}else{const r=i._$AB.nextSibling,o=i._$AM,d=o!==e;if(d){let a;i._$AQ?.(e),i._$AM=e,i._$AP!==void 0&&(a=e._$AU)!==o._$AU&&i._$AP(a)}if(r!==s||d){let a=i._$AA;for(;a!==r;){const l=He(a).nextSibling;He(n).insertBefore(a,s),a=l}}}return i},H=(e,t,i=e)=>(e._$AI(t,i),e),_n={},De=(e,t=_n)=>e._$AH=t,Sn=e=>e._$AH,Bt=e=>{e._$AR(),e._$AA.remove()},Je=(e,t,i)=>{const n=new Map;for(let s=t;s<=i;s++)n.set(e[s],s);return n},Fe=qe(class extends Be{constructor(e){if(super(e),e.type!==wn.CHILD)throw Error("repeat() can only be used in text expressions")}dt(e,t,i){let n;i===void 0?i=t:t!==void 0&&(n=t);const s=[],r=[];let o=0;for(const d of e)s[o]=n?n(d,o):o,r[o]=i(d,o),o++;return{values:r,keys:s}}render(e,t,i){return this.dt(e,t,i).values}update(e,[t,i,n]){const s=Sn(e),{values:r,keys:o}=this.dt(t,i,n);if(!Array.isArray(s))return this.ut=o,r;const d=this.ut??=[],a=[];let l,c,p=0,h=s.length-1,u=0,y=r.length-1;for(;p<=h&&u<=y;)if(s[p]===null)p++;else if(s[h]===null)h--;else if(d[p]===o[u])a[u]=H(s[p],r[u]),p++,u++;else if(d[h]===o[y])a[y]=H(s[h],r[y]),h--,y--;else if(d[p]===o[y])a[y]=H(s[p],r[y]),it(e,a[y+1],s[p]),p++,y--;else if(d[h]===o[u])a[u]=H(s[h],r[u]),it(e,s[p],s[h]),h--,u++;else if(l===void 0&&(l=Je(o,u,y),c=Je(d,p,h)),l.has(d[p]))if(l.has(d[h])){const _=c.get(o[u]),A=_!==void 0?s[_]:null;if(A===null){const T=it(e,s[p]);H(T,r[u]),a[u]=T}else a[u]=H(A,r[u]),it(e,s[p],A),s[_]=null;u++}else Bt(s[h]),h--;else Bt(s[p]),p++;for(;u<=y;){const _=it(e,a[y+1]);H(_,r[u]),a[u++]=_}for(;p<=h;){const _=s[p++];_!==null&&Bt(_)}return this.ut=o,De(e,a),P}}),Ht=()=>g`<svg
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
  </svg>`,En=()=>g`<svg
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
  </svg>`,Cn=()=>g`<svg
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
  </svg>`,jn=()=>g`<svg
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
  </svg>`,Mn=()=>g`<svg
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
  </svg>`,On=()=>g`<svg
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
  </svg>`,Tn=()=>g`<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false">
    <circle cx="6.5" cy="4.5" r="1" />
    <circle cx="9.5" cy="4.5" r="1" />
    <circle cx="6.5" cy="8" r="1" />
    <circle cx="9.5" cy="8" r="1" />
    <circle cx="6.5" cy="11.5" r="1" />
    <circle cx="9.5" cy="11.5" r="1" />
  </svg>`,Nn=()=>g`<svg
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
  </svg>`,Un=()=>g`<svg
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
  </svg>`,zn=()=>g`<svg
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
  </svg>`,Pn=()=>g`<svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M9.5 2.5h4v4M6.5 13.5h-4v-4M13.5 2.5L9 7M2.5 13.5L7 9" />
  </svg>`,Rn=()=>g`<svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M13.5 7h-4.5v-4.5M2.5 9h4.5v4.5M9 7l4.5-4.5M7 9l-4.5 4.5" />
  </svg>`,Ln=(e,t,i=!1)=>g`
  ${i?m:g`<header><h2>Review notes</h2></header>`}
  ${e.issues.length>0?g`<div class="issues" role="alert">
          <strong>Action rejected.</strong>
          <ul>
            ${e.issues.map(n=>g`<li>${n}</li>`)}
          </ul>
        </div>`:m}
  <div class="composer">
    <textarea
      class="dpk-textarea"
      aria-label="レビューコメント"
      placeholder="変更したいこと / 気づきを書く（Agent への指示として渡る）"
      .value=${e.body}
      @input=${n=>{n.currentTarget instanceof HTMLTextAreaElement&&t({kind:"input",body:n.currentTarget.value})}}
      @keydown=${n=>{!n.isComposing&&n.key==="Enter"&&(n.metaKey||n.ctrlKey)&&(n.preventDefault(),t({kind:"submit"}))}}
    ></textarea>
    ${e.attachment.kind==="explicit"?g`<div class="row">
            <button class="chip" type="button" aria-label="紐づけを解除" @click=${()=>t({kind:"clear-target"})}>
              ${e.target.label} ${Ht()}
            </button>
          </div>`:e.attachment.kind==="checkbox"?g`<div class="row">
              <label class="attach">
                <input
                  type="checkbox"
                  .checked=${e.attachment.checked}
                  @change=${n=>{n.currentTarget instanceof HTMLInputElement&&t({kind:"attach",current:n.currentTarget.checked})}}
                />
                <span>この ${e.attachment.group} に紐づける</span>
              </label>
            </div>`:m}
    <div class="row">
      <span class="target-line">→ ${e.target.label}</span>
      <button
        class="dpk-btn dpk-btn--accent"
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
          </li>`:Fe(e.items,n=>n.id,n=>qn(n,t))}
  </ul>
  <footer>
    ${i?m:g`
            <button class="dpk-btn" type="button" @click=${()=>t({kind:"copy",format:"json"})}>
              Copy JSON
            </button>
            <button class="dpk-btn" type="button" @click=${()=>t({kind:"copy",format:"brief"})}>
              Copy brief
            </button>
          `}
    <button
      class="dpk-btn dpk-btn--ghost"
      type="button"
      ?disabled=${e.items.length===0}
      @click=${()=>t({kind:"clear"})}
    >
      Clear
    </button>
    ${e.flash?g`<span class="flash" role="status">${e.flash}</span>`:m}
  </footer>
`,qn=(e,t)=>g`
  <li class="item" data-tone=${e.tone} data-stale=${String(e.stale!==null)}>
    <div class="item-head">
      <span class="item-title">${e.title}</span>
      ${e.stale?g`<span class="stale-badge">${e.stale}</span>`:m}
      <button
        class="dpk-icon-btn"
        type="button"
        aria-label="この draft action を削除"
        @click=${()=>t({kind:"delete",id:e.id})}
      >
        ${Ht()}
      </button>
    </div>
    <div class="item-target">${e.targetLabel}</div>
    ${e.text.kind==="comment"?g`<p class="item-body">${e.text.body}</p>`:e.text.body?g`<div class="item-summary">${e.text.body}</div>`:m}
    <code class="item-code">${e.code}</code>
  </li>
`;class Ke extends O{static{this.styles=$n}static{this.properties={definition:{attribute:!1},state:{attribute:!1},navigation:{attribute:!1},derivation:{attribute:!1},issues:{attribute:!1},pendingTarget:{attribute:!1},onDelete:{attribute:!1},onClear:{attribute:!1},onComment:{attribute:!1},exportBrief:{attribute:!1},embedded:{type:Boolean}}}#e=kn();constructor(){super(),this.embedded=!1,this.definition=null,this.state=void 0,this.navigation={},this.derivation=null,this.issues=[],this.pendingTarget=null}willUpdate(t){t.has("pendingTarget")&&this.pendingTarget&&(this.#e=Pe(this.#e,{kind:"target-requested",ref:this.pendingTarget}))}updated(t){t.has("pendingTarget")&&this.pendingTarget&&this.isConnected&&this.renderRoot.querySelector("textarea")?.focus()}#r(){return!this.definition||!this.derivation?null:{definition:this.definition,state:this.state,navigation:this.navigation,derivation:this.derivation,issues:this.issues}}render(){const t=this.#r();return t?Ln(Le(t,this.#e),this.#s,this.embedded):m}#t(t){this.#e=Pe(this.#e,t),this.requestUpdate()}#s=t=>{switch(t.kind){case"delete":this.onDelete?.(t.id);return;case"clear":this.onClear?.();return;case"copy":this.#o(t.format);return;case"submit":{const i=this.#r();if(!i||!this.onComment)return;const n=xn(this.#e,Le(i,this.#e).target.ref);if(!n||!this.onComment(n.target,n.body).ok)return;this.#t({kind:"submitted"});return}default:this.#t(t)}};async#o(t){const i=this.#r();if(!i)return;this.#t({kind:"copy-started",format:t});const n=this.#e.copyRequest;try{const s=t==="json"?Tt(i.derivation.actions):this.exportBrief?.()??qt({...i.derivation,navigation:i.navigation,issues:i.issues},i.definition,W),r=await Ue(s);this.isConnected&&this.#t({kind:"copy-finished",request:n,ok:r})}catch{this.isConnected&&this.#t({kind:"copy-finished",request:n,ok:!1})}}}const Bn=()=>{customElements.get("dpk-component-comment-panel")||customElements.define("dpk-component-comment-panel",Ke)},Ve=q(F({value:b(f(),L(/^element:.+/)),label:b(f(),v(1)),group:S(f())})),Hn=w({targets:Ve,providers:q(w({id:b(f(),v(1)),results:q(Te)}))}),In=F({target:b(f(),L(/^element:.+/)),body:b(f(),Ct(),v(1))}),We=e=>e.group?`${e.group} \xB7 ${e.label}`:e.label,Ze=(e,t,i)=>{const n=new Map(t.map(s=>[s.value,s]));return{...e,hasTarget:(s,r)=>e.hasTarget(s,r)||n.has(E(r)),commentTargets:(s,r)=>{const o=e.commentTargets(s,r),d=new Set(o.map(a=>a.value));return[...o,...t.filter(a=>!d.has(a.value))]},describe:(s,r,o)=>{if(j(s)){const l=i.get(s.id),c=n.get(E(s.target));return{title:l?.title??s.type,...l?.summary===void 0?{}:{summary:l.summary},tone:l?.tone??"update",targetLabel:c?We(c):s.target.id}}const d=e.describe(s,r,o),a=s.type==="comment"&&!e.hasTarget(r,s.target)?n.get(E(s.target)):void 0;return a===void 0?d:{...d,targetLabel:We(a)}},serialize:s=>j(s)?`${s.type} ${E(s.target)} ${JSON.stringify(s.payload)}`:e.serialize(s)}},Ye=typeof globalThis=="object"&&globalThis||typeof window=="object"&&window||typeof self=="object"&&self||typeof global=="object"&&global||(function(){return this})();function Qe(e){return typeof Ye.Buffer<"u"&&Ye.Buffer.isBuffer(e)}function Ge(e){if(!e||typeof e!="object")return!1;const t=Object.getPrototypeOf(e);return t===null||t===Object.prototype||Object.getPrototypeOf(t)===null?Object.prototype.toString.call(e)==="[object Object]":!1}function Xe(e){return Object.getOwnPropertySymbols(e).filter(t=>Object.prototype.propertyIsEnumerable.call(e,t))}function ti(e){return e==null?e===void 0?"[object Undefined]":"[object Null]":Object.prototype.toString.call(e)}const Dn="[object RegExp]",Jn="[object String]",Fn="[object Number]",Kn="[object Boolean]",Vn="[object Symbol]",Wn="[object Date]",Zn="[object Map]",Yn="[object Set]",Qn="[object Array]",Gn="[object Function]",Xn="[object ArrayBuffer]",It="[object Object]",ts="[object Error]",es="[object DataView]",is="[object Uint8Array]",ns="[object Uint8ClampedArray]",ss="[object Uint16Array]",rs="[object Uint32Array]",os="[object BigUint64Array]",as="[object Int8Array]",ds="[object Int16Array]",ps="[object Int32Array]",ls="[object BigInt64Array]",cs="[object Float32Array]",hs="[object Float64Array]";function us(e,t){return e===t||Number.isNaN(e)&&Number.isNaN(t)}function fs(e,t,i){return nt(e,t,void 0,void 0,void 0,void 0,i)}function nt(e,t,i,n,s,r,o){const d=o(e,t,i,n,s,r);if(d!==void 0)return d;if(typeof e==typeof t)switch(typeof e){case"bigint":case"string":case"boolean":case"symbol":case"undefined":return e===t;case"number":return e===t||Object.is(e,t);case"function":return e===t;case"object":return st(e,t,r,o)}return st(e,t,r,o)}function st(e,t,i,n){if(Object.is(e,t))return!0;let s=ti(e),r=ti(t);if(s==="[object Arguments]"&&(s=It),r==="[object Arguments]"&&(r=It),s!==r)return!1;switch(s){case Jn:return e.toString()===t.toString();case Fn:return us(e.valueOf(),t.valueOf());case Kn:case Wn:case Vn:return Object.is(e.valueOf(),t.valueOf());case Dn:return e.source===t.source&&e.flags===t.flags;case Gn:return e===t}i=i??new Map;const o=i.get(e),d=i.get(t);if(o!=null&&d!=null)return o===t;i.set(e,t),i.set(t,e);try{switch(s){case Zn:if(e.size!==t.size)return!1;for(const[a,l]of e.entries())if(!t.has(a)||!nt(l,t.get(a),a,e,t,i,n))return!1;return!0;case Yn:{if(e.size!==t.size)return!1;const a=Array.from(e.values()),l=Array.from(t.values());for(let c=0;c<a.length;c++){const p=a[c],h=l.findIndex(u=>nt(p,u,void 0,e,t,i,n));if(h===-1)return!1;l.splice(h,1)}return!0}case Qn:case is:case ns:case ss:case rs:case os:case as:case ds:case ps:case ls:case cs:case hs:if(Qe(e)!==Qe(t)||e.length!==t.length)return!1;for(let a=0;a<e.length;a++)if(!nt(e[a],t[a],a,e,t,i,n))return!1;return!0;case Xn:return e.byteLength!==t.byteLength?!1:st(new Uint8Array(e),new Uint8Array(t),i,n);case es:return e.byteLength!==t.byteLength||e.byteOffset!==t.byteOffset?!1:st(new Uint8Array(e),new Uint8Array(t),i,n);case ts:return e.name===t.name&&e.message===t.message;case It:{if(!(st(e.constructor,t.constructor,i,n)||Ge(e)&&Ge(t)))return!1;const a=[...Object.keys(e),...Xe(e)],l=[...Object.keys(t),...Xe(t)];if(a.length!==l.length)return!1;for(let c=0;c<a.length;c++){const p=a[c],h=e[p];if(!Object.hasOwn(t,p))return!1;const u=t[p];if(!nt(h,u,p,e,t,i,n))return!1}return!0}default:return!1}}finally{i.delete(e),i.delete(t)}}function gs(){}function vt(e,t){return fs(e,t,gs)}const ei="page",ii=e=>E(e),ni=(e,t,i,n=new Map)=>{let s=t;const r=[],o=[],d=[],a=[],l=new Map;for(const p of i){if(p.type===C)continue;if(j(p)){const y=n.get(p.id);y===void 0||y.stale!==void 0?o.push({action:p,reason:y?.stale??"target-missing"}):r.push(p);continue}const h=bt(e.actions,p.type);if(!h){o.push({action:p,reason:"unsupported-action-type"});continue}const u=e.apply(s,p);if(u===null){o.push({action:p,reason:e.hasTarget(s,p.target)?"constraint-violated":"target-missing"});continue}if(h.mode!=="append"&&Dt(e,s,u)){d.push(p);continue}s=u,r.push(p)}for(const p of i){if(p.type!==C)continue;if(p.target.type!==ei&&!e.hasTarget(s,p.target)){o.push({action:p,reason:"target-missing"});continue}a.push(p);const h=ii(p.target);l.set(h,[...l.get(h)??[],p])}const c=new Map(i.map((p,h)=>[p.id,h]));return o.sort((p,h)=>(c.get(p.action.id)??0)-(c.get(h.action.id)??0)),{base:t,state:s,actions:i,applied:r,stale:o,obsolete:d,comments:a,commentsByTarget:l}},Dt=(e,t,i)=>t===i?!0:e.canonicalState===void 0?vt(t,i):vt(e.canonicalState(t),e.canonicalState(i)),si=e=>{const t=new Set(e.obsolete.map(i=>i.id));return e.actions.filter(i=>!t.has(i.id))},ms=(e,t,i,n)=>{let s=t;const r=n??ri(s).map(o=>o.id);for(const o of[...r].reverse())s=bs(e,s,i,o,n!==void 0)??s;return s},ri=e=>e.applied.filter(t=>!j(t)),bs=(e,t,i,n,s)=>{const r=ri(t),o=r.findIndex(h=>h.id===n),d=r[o];if(d===void 0)return null;const a=r.slice(0,o),l=[...s?vs(e,t.base,r,o):[],...ys(e,a,d)],c=new Set,p=l.filter(h=>{const u=h.join(" ");return c.has(u)?!1:(c.add(u),!0)}).sort((h,u)=>u.length-h.length);for(const h of p){const u=ks(e,t,i,h);if(u!==null)return u}return null},vs=(e,t,i,n)=>{const s=[];let r=t;for(const o of i.slice(0,n+1))s.push(r),r=e.apply(r,o)??r;return s.flatMap((o,d)=>Dt(e,o,r)?[i.slice(d,n+1).map(a=>a.id)]:[])},ys=(e,t,i)=>{const n=oi(i),s=t.filter(a=>oi(a).some(l=>n.includes(l))),r=ai(e,i),o=s.filter(a=>ai(e,a)===r),d=a=>a.map((l,c)=>[...a.slice(c).map(p=>p.id),i.id]);return[...d(s),...d(o),...s.map(a=>[a.id,i.id]),...s.map(a=>[a.id])]},oi=e=>{const t=e.target.type===ei?[]:e.target.id.split("."),i=typeof e.payload=="object"&&e.payload!==null?Object.values(e.payload).filter(n=>typeof n=="string"&&n!==""):[];return[...t,...i]},ai=(e,t)=>bt(e.actions,t.type)?.mode,ks=(e,t,i,n)=>{const s=new Set(t.stale.map(o=>o.action.id)),r=new Set(n);for(;;){const o=i(t.actions.filter(a=>!r.has(a.id))),d=o.stale.filter(a=>!s.has(a.action.id)).map(a=>a.action);if(d.length===0)return Dt(e,o.state,t.state)?o:null;if(d.some(a=>a.type===C||j(a)))return null;for(const a of d)r.add(a.id)}},xs=w({v:J(1),template:b(f(),v(1)),actions:q(B())});class Jt{constructor(t){this.storage=t}load(t,i){try{const n=this.storage.getItem(t);if(n===null)return[];const s=x(xs,JSON.parse(n));return!s.success||s.output.template!==i?[]:s.output.actions.flatMap(r=>{const o=x(K,r);return o.success?[o.output]:[]})}catch{return[]}}save(t,i,n){const s={v:1,template:i,actions:n};try{this.storage.setItem(t,JSON.stringify(s))}catch{}}clear(t){try{this.storage.removeItem(t)}catch{}}}class Ft{constructor(){this.store=new Map}load(t,i){return new Jt({getItem:n=>this.store.get(n)??null,setItem:(n,s)=>{this.store.set(n,s)},removeItem:n=>{this.store.delete(n)}}).load(t,i)}save(t,i,n){this.store.set(t,JSON.stringify({v:1,template:i,actions:n}))}clear(t){this.store.delete(t)}}const Kt=()=>{try{if(typeof localStorage<"u")return new Jt(localStorage)}catch{}return new Ft},di=e=>`dev-process-kit:draft:${typeof location>"u"?"local":`${location.pathname}${location.search}`}:${e}`,$s=q(B());class pi{#e;#r;#t={targets:[],providers:[]};#s=new Map;#o;#i;#n;#p;#l;#c=new Set;#f=[];#g=0;constructor(t){this.#e=t.definition,this.#r=Ze(t.definition,[],this.#s),this.#o=t.base,this.#l=t.storageKey??di(t.definition.name),this.#p=t.storage===void 0?Kt():t.storage;const i=t.initialActions??this.#p?.load(this.#l,this.definition.name)??[];this.#i=ci(this.definition,i),this.#n=this.#a(this.#i),this.#$()&&this.#k()}get definition(){return this.#r}setComponentSnapshot(t){const i=we(Hn,t);if(!vt(i,this.#t)){this.#t=i,this.#m(),this.#n=this.#a(this.#i);for(const n of this.#c)n()}}#m(){this.#s=Ne(this.#i,this.#t.providers),this.#r=Ze(this.#e,this.#t.targets,this.#s)}#a(t){return ni(this.definition,this.#o,t,Ne(t,this.#t.providers))}get base(){return this.#o}get actions(){return this.#i}get derivation(){return this.#n}get lastIssues(){return this.#f}get prunedCount(){return this.#g}descriptorFor(t,i){return li(this.definition,t,i)}dispatch(t){const i=this.#v(t,this.#n.state);if(!i.ok)return this.#h([i.issue]);const n=this.descriptorFor(i.action.type,i.action.target);return n?(this.#d(Ot(this.#i,i.action,n),[i.action.id]),{ok:!0,id:i.action.id}):this.#h([{path:"type",message:"unknown action type"}])}dispatchBatch(t){const i=x($s,t);if(!i.success)return this.#h([et(i.issues)]);const n=i.output;if(n.length===0)return{ok:!0,ids:[]};let s=this.#i,r=this.#n.state;const o=[];for(const d of n){const a=this.#v(d,r);if(!a.ok)return this.#h([a.issue]);const l=a.action,c=this.descriptorFor(l.type,l.target);if(!c)return this.#h([{path:"type",message:"unknown action type"}]);if((l.type==="comment"||j(l)?l.target.type==="page"||this.definition.hasTarget(r,l.target)?r:null:this.definition.apply(r,l))===null)return this.#h([{path:"target",message:"batch action is not applicable"}]);s=Ot(s,l,c),r=this.#a(s).state,o.push(l.id)}return this.#d(s,o),{ok:!0,ids:o}}#v(t,i){const n=x(Ee,t);if(!n.success)return{ok:!1,issue:et(n.issues)};const s=this.descriptorFor(n.output.type,typeof n.output.target=="string"?jt(n.output.target,"page"):n.output.target);if(!s)return{ok:!1,issue:{path:"type",message:`unknown action type "${n.output.type}"`}};const r=ln(n.output,s);if(!r.ok)return r;const o=this.definition.canonicalTarget?.(i,r.action.target)??r.action.target;return{ok:!0,action:{...r.action,target:o}}}#h(t){return this.#f=t,{ok:!1,issues:t}}removeAction(t){const i=this.#i.filter(n=>n.id!==t);i.length!==this.#i.length&&this.#d(i)}clearActions(){this.#i.length>0&&this.#d([])}replaceActions(t){this.#d(ci(this.definition,t))}setBase(t){this.#o=t,this.#d(this.#i)}subscribe(t){return this.#c.add(t),()=>{this.#c.delete(t)}}exportDraft(t){return{template:this.definition.name,frameworkVersion:t,exportedAt:new Date().toISOString(),actions:this.#i}}#d(t,i){this.#f=[],this.#i=t,this.#m(),this.#n=this.#a(this.#i),this.#$(i),this.#k();for(const n of this.#c)n()}#$(t){const i=this.#y(),n=ms(this.definition,this.#n,s=>this.#a(s),t);return n===this.#n?i:(this.#g+=this.#i.length-n.actions.length,this.#i=[...n.actions],this.#m(),this.#n=this.#a(this.#i),this.#y(),!0)}#y(){return this.#n.obsolete.length===0?!1:(this.#g+=this.#n.obsolete.length,this.#i=si(this.#n),this.#m(),this.#n=this.#a(this.#i),!0)}#k(){this.#p?.save(this.#l,this.definition.name,this.#i)}}const li=(e,t,i)=>t==="comment"?je:i!==void 0&&j({type:t,target:i})?gn:bt(e.actions,t),ci=(e,t)=>t.flatMap(i=>{const n=x(K,i);if(!n.success)return[];const s=n.output,r=li(e,s.type,s.target);if(!r)return[];const o=x(r.schema,s);if(!o.success)return[];const d=x(K,o.output);return d.success?[d.output]:[]}),hi=e=>{const t=e.derivation();return{base:t.base,state:t.state,navigation:e.navigation(),actions:e.controller().actions,comments:t.comments,stale:t.stale,issues:e.issues()}},ws=e=>{const t=e.derivation();return{state:t.state,base:t.base,navigation:e.navigation(),actions:e.controller().actions,comments:t.comments,stale:t.stale,commentCount:i=>{const n=typeof i=="string"?i:E(i);return t.commentsByTarget.get(n)?.length??0},dispatch:i=>e.dispatch(i),dispatchBatch:i=>e.dispatchBatch(i),navigate:(i,n)=>e.navigate(i,n),hashFor:i=>e.hashFor(i),requestComment:i=>e.requestComment(i)}},As=(e,t)=>{const i=()=>hi(e);return{version:W,template:e.definition.name,host:t,ready:e.ready,get base(){return e.controller().base},get state(){return e.derivation().state},get navigation(){return e.navigation()},get actions(){return e.controller().actions},get comments(){return e.derivation().comments},get stale(){return e.derivation().stale},get issues(){return e.issues()},dispatch:n=>e.dispatch(n),dispatchBatch:n=>e.dispatchBatch(n),comment:(n,s)=>e.dispatch({type:C,target:n,payload:{body:s}}),removeAction:n=>e.removeAction(n),clearActions:()=>e.clearActions(),importDraft:n=>e.controller().replaceActions(n),navigate:(n,s)=>e.navigate(n,s),hashFor:n=>e.hashFor(n),snapshot:i,exportDraft:()=>e.controller().exportDraft(W),exportBrief:()=>qt(i(),e.controller().definition,W),subscribe:n=>e.subscribe(n)}},_s=(e,t)=>{const i=[],n=s=>{(s===e||s instanceof ShadowRoot)&&t?.(s);for(const r of s.children)r.hasAttribute("data-template")||(("commentTargets"in r||"elementActions"in r)&&i.push(r),n(r),r.shadowRoot&&n(r.shadowRoot))};return n(e),i},ui=(e,t)=>{const i=new Map;for(const n of e)i.set(t(n),(i.get(t(n))??0)+1);return e.filter(n=>i.get(t(n))===1)},fi=e=>ui(e.filter(t=>"elementActions"in t&&t.id.length>0),t=>t.id),gi=(e,t)=>{for(const i of fi(e)){const n=bn(t,i.id),s=Reflect.get(i,"elementActions");Array.isArray(s)&&s.length===n.length&&n.every((r,o)=>{const d=s[o];return typeof d=="object"&&d!==null&&"id"in d&&d.id===r.id})||Reflect.set(i,"elementActions",n)}},Ss=e=>{const t=Reflect.get(e,"elementActionResults");return Array.isArray(t)?t.flatMap(i=>{const n=x(Te,i);return n.success?[n.output]:[]}):[]},Es=e=>{const t=[];for(const i of e){if(!("commentTargets"in i))continue;const n=x(Ve,i.commentTargets);n.success&&t.push(...n.output)}return{targets:ui(t,i=>i.value),providers:fi(e).map(i=>({id:i.id,results:Ss(i)}))}},mi=()=>Rt(typeof location>"u"?"":location.hash),Cs=(e,t)=>{if(typeof history>"u")return;const i=`${location.pathname}${location.search}${V(e)}`;`${location.pathname}${location.search}${location.hash}`!==i&&(t?history.replaceState(null,"",i):history.pushState(null,"",i))};class js{#e;#r=null;#t=0;constructor(t){this.#e=t}get orphans(){return this.#t}route(){const t=this.#e.renderRoot,i=ht(t.querySelector('slot[name="preview"]'),HTMLSlotElement);if(i===null)return;this.#r!==i&&(this.#r=i,i.addEventListener("slotchange",this.#s));const n=new Set(Array.from(t.querySelectorAll("slot")).map(r=>r.getAttribute("name")??"")),s=i.assignedElements();for(const r of s){const o=r.getAttribute("data-preview-id");if(!o)continue;const d=`preview:${o}`;r.getAttribute("slot")!==d&&n.has(d)&&r.setAttribute("slot",d)}s.length!==this.#t&&(this.#t=s.length,queueMicrotask(()=>this.#e.requestUpdate()))}#s=()=>{queueMicrotask(()=>this.route())}}const Ms=[lt,ct,N`
    :host {
      display: block;
      min-height: 100%;
      background: var(--dpk-paper);
    }

    .dpk-shell {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      min-height: 100%;
      max-height: 100%;
    }

    /* ------------------------------------------------------------- header */

    .dpk-header {
      display: flex;
      align-items: center;
      gap: 16px;
      /* Right padding keeps the header content clear of the fixed review button. */
      padding: 14px 78px 14px 20px;
      border-bottom: 1px solid var(--dpk-rule);
      background: linear-gradient(180deg, var(--dpk-paper-raised) 0%, var(--dpk-paper) 100%);
    }

    .dpk-title {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .dpk-title h1 {
      font-size: 16.5px;
      font-weight: 620;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dpk-template-mark {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 9px 2px 7px;
      border-radius: 999px;
      background: var(--dpk-accent-soft);
      font-family: var(--dpk-mono);
      font-size: 9.5px;
      font-weight: 550;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--dpk-accent);
    }

    .dpk-template-mark::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--dpk-accent);
    }

    .dpk-header-slot {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .dpk-header-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: auto;
      padding: 4px 12px;
      border-radius: 999px;
      border: 1px solid var(--dpk-rule);
      background: var(--dpk-paper-sunken);
      font-family: var(--dpk-mono);
      font-size: 10px;
      letter-spacing: 0.04em;
      color: var(--dpk-ink-faint);
      white-space: nowrap;
    }

    .dpk-header-meta span + span::before {
      content: '';
      display: inline-block;
      width: 3px;
      height: 3px;
      margin-right: 8px;
      vertical-align: 1px;
      border-radius: 50%;
      background: var(--dpk-ink-faint);
      opacity: 0.5;
    }

    /* --------------------------------------------------------------- body */

    .dpk-body {
      display: flex;
      min-height: 0;
    }

    .dpk-sidebar {
      width: 252px;
      flex: 0 0 auto;
      border-right: 1px solid var(--dpk-rule);
      background: linear-gradient(180deg, var(--dpk-paper-sunken) 0%, var(--dpk-paper-inset) 100%);
      overflow: auto;
      padding: 16px 14px;
    }

    .dpk-sidebar[hidden] {
      display: none;
    }

    .dpk-main {
      flex: 1 1 0%;
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: auto;
      background: var(--dpk-paper);
    }

    .dpk-main-body {
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
    .dpk-memo {
      position: sticky;
      bottom: 0;
      z-index: 5;
      padding: 0 20px 20px;
      pointer-events: none;
    }

    .dpk-memo[hidden] {
      display: none;
    }

    .dpk-memo ::slotted(*) {
      display: block;
      max-width: 100%;
      padding: 10px 14px;
      border: 1px solid var(--dpk-rule);
      border-radius: var(--dpk-radius-lg);
      background: var(--dpk-paper-raised);
      box-shadow: var(--dpk-shadow-lg);
      font-size: 12.5px;
      line-height: 1.65;
      color: var(--dpk-ink-soft);
      pointer-events: auto;
    }

    .dpk-orphans {
      margin-top: 16px;
      border: 1px dashed var(--dpk-rule-strong);
      border-radius: var(--dpk-radius-sm);
      padding: 10px;
    }

    .dpk-banner {
      display: grid;
      gap: 4px;
      margin-bottom: 14px;
      border: 1px solid var(--dpk-accent);
      border-left-width: 3px;
      border-radius: var(--dpk-radius-sm);
      background: var(--dpk-accent-soft);
      padding: 10px 12px;
      max-width: 900px;
    }

    .dpk-banner strong {
      font-size: 13px;
    }

    .dpk-banner code {
      font-family: var(--dpk-mono);
      font-size: 11px;
      color: var(--dpk-ink-soft);
      overflow-wrap: anywhere;
    }

    .dpk-notes {
      flex: 0 0 auto;
      width: 344px;
      border-left: 1px solid var(--dpk-rule);
      background: var(--dpk-paper-raised);
      overflow: hidden;
      display: flex;
    }

    .dpk-notes[hidden] {
      display: none;
    }

    /* ------------------------------------------------------------- footer */

    .dpk-footer {
      border-top: 1px solid var(--dpk-rule);
      padding: 10px 20px;
      display: flex;
      gap: 12px;
      align-items: center;
      background: var(--dpk-paper-sunken);
      font-size: 12px;
      color: var(--dpk-ink-faint);
    }

    /* --------------------------------------------------- floating review */

    /* Review toggle: pinned to the top right corner, always in the same place. */
    .dpk-fab {
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
      box-shadow: var(--dpk-shadow);
      cursor: pointer;
      transition:
        color 160ms ease,
        background 160ms ease,
        border-color 160ms ease,
        box-shadow 160ms ease,
        transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .dpk-fab:hover {
      color: var(--dpk-ink);
      transform: translateY(-2px) scale(1.05);
      box-shadow: var(--dpk-shadow-lg);
    }

    .dpk-fab:active {
      transform: translateY(0) scale(0.97);
      box-shadow: var(--dpk-shadow-xs);
    }

    .dpk-fab:focus-visible {
      outline: none;
      box-shadow: var(--dpk-focus);
    }

    .dpk-fab[aria-expanded='true'] {
      color: var(--dpk-accent-ink);
      border-color: transparent;
      background: linear-gradient(135deg, var(--dpk-accent), #c23e12);
      box-shadow: 0 2px 8px rgba(217, 73, 32, 0.3);
    }

    .dpk-fab[aria-expanded='true']:hover {
      box-shadow: 0 4px 14px rgba(217, 73, 32, 0.4);
    }

    .dpk-fab-icon {
      position: relative;
      display: block;
      width: 16px;
      height: 12px;
      border: 1.6px solid currentColor;
      border-radius: 3.5px;
    }

    .dpk-fab-icon::after {
      content: '';
      position: absolute;
      left: 2px;
      bottom: -4px;
      border-left: 3.5px solid transparent;
      border-right: 3.5px solid transparent;
      border-top: 4px solid currentColor;
    }

    .dpk-fab-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      border: 2px solid var(--dpk-paper-raised);
      border-radius: 999px;
      background: linear-gradient(135deg, #e55a2b, var(--dpk-accent));
      color: var(--dpk-accent-ink);
      font-family: var(--dpk-mono);
      font-size: 9.5px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      line-height: 14px;
      text-align: center;
      box-shadow: 0 1px 4px rgba(217, 73, 32, 0.3);
    }
  `];class Os extends O{static{this.styles=Ms}static{this.properties={storageKey:{type:String,attribute:"storage-key"},storage:{type:String},notes:{type:String},notesOpen:{state:!0}}}#e=!1;#r=new js(this);#t;#s=Pt;#o=null;#i=new Set;#n=null;#p;#l;#c;#f=[];#g;#m=new Promise(t=>{this.#g=t});#a;connectedCallback(){super.connectedCallback(),this.dataset.template=this.definition.name,this.#e||(this.#e=!0,this.notesOpen=this.notes==="on"||this.notes==="open"),this.#v(),window.addEventListener("hashchange",this.#A),this.addEventListener("click",this.#C),this.addEventListener("dpk-comment-targets-change",this.#u),this.addEventListener("dpk-comment-request",this.#_),this.addEventListener("dpk-comment-submit",this.#S),this.addEventListener("dpk-element-action",this.#E),this.#c??=new MutationObserver(this.#u),this.#u()}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("hashchange",this.#A),this.removeEventListener("click",this.#C),this.#l?.disconnect(),this.#c?.disconnect(),this.removeEventListener("dpk-comment-targets-change",this.#u),this.removeEventListener("dpk-comment-request",this.#_),this.removeEventListener("dpk-comment-submit",this.#S),this.removeEventListener("dpk-element-action",this.#E)}#v(t=0){if(this.#t){this.#h();return}if(this.childNodes.length===0&&t<2){queueMicrotask(()=>this.#v(t+1));return}this.#j()}#h(){this.#p||(this.#p=this.#t?.subscribe(()=>this.#N()))}updated(){this.#U()}get api(){return this.#a??=this.#$(),this.#a}get controller(){if(!this.#t)throw new Error(`<${this.tagName.toLowerCase()}> is not initialized yet`);return this.#t}get derivation(){return this.controller.derivation}get navigation(){return this.#s}dispatch(t){const i=this.controller.dispatch(t);return i.ok||(this.requestUpdate(),this.dispatchEvent(new CustomEvent("dpk-error",{detail:{issues:i.issues},bubbles:!0,composed:!0})),this.#b()),i}dispatchBatch(t){const i=this.controller.dispatchBatch(t);return i.ok||(this.requestUpdate(),this.dispatchEvent(new CustomEvent("dpk-error",{detail:{issues:i.issues},bubbles:!0,composed:!0})),this.#b()),i}removeAction(t){this.controller.removeAction(t)}clearActions(){this.controller.clearActions()}navigate(t,i={}){const n=V(this.#x());this.#s=Lt(this.#s,t),this.#w(i.replace??!1);const s=V(this.#x());this.requestUpdate(),n!==s&&(this.#b(),this.dispatchEvent(new CustomEvent("dpk-navigate",{detail:{navigation:this.#s},bubbles:!0,composed:!0})))}hashFor(t){const i=this.#x();return V(this.definition.resolveNavigation(this.derivation.state,Lt(i,t)))}requestComment(t){this.#o=typeof t=="string"?t:E(t),this.notesOpen=!0,this.requestUpdate()}get integratedReview(){return!1}renderReviewPanel(t){return g`<dpk-component-comment-panel
      .definition=${this.controller.definition}
      .state=${t.state}
      .navigation=${t.navigation}
      .derivation=${this.derivation}
      .issues=${this.controller.lastIssues}
      .exportBrief=${()=>this.api.exportBrief()}
      .pendingTarget=${this.#o}
      .embedded=${this.integratedReview}
      .onDelete=${i=>this.removeAction(i)}
      .onClear=${()=>this.clearActions()}
      .onComment=${(i,n)=>{const s=this.dispatch({type:C,target:i,payload:{body:n}});return s.ok&&(this.#o=null),s}}
    ></dpk-component-comment-panel>`}renderChrome(t,i){const n=t.actions.length,s=t.comments.length;return g`
      <div class="dpk-shell">
        <header class="dpk-header">
          <div class="dpk-title">
            <span class="dpk-template-mark">${this.definition.label}</span>
            <h1>${this.definition.title(t.state)}</h1>
          </div>
          <div class="dpk-header-slot">
            ${i.header??m}
            <slot name="header"></slot>
          </div>
          <div class="dpk-header-meta">
            <span>dev-process-kit@${W}</span>
            <span>${this.definition.name}</span>
            <span>${n} draft · ${s} note</span>
          </div>
        </header>
        <div class="dpk-body">
          <aside
            class="dpk-sidebar"
            ?hidden=${i.sidebarHidden||!i.sidebar&&!this.hasSidebarContent()}
          >
            ${i.sidebar??m}
            <slot name="sidebar"></slot>
          </aside>
          <main class="dpk-main">
            <div class="dpk-main-body">
              ${this.#n?g`<div class="dpk-banner" role="alert">
                      <strong>base data を読み込めませんでした（空のページとして表示中）</strong>
                      <code>${this.#n}</code>
                    </div>`:m}
              ${i.main??m}
              <slot name="main"></slot>
              <section class="dpk-orphans" ?hidden=${this.#r.orphans===0}>
                <p class="dpk-label">previews without metadata</p>
                <slot name="preview"></slot>
              </section>
            </div>
            <div class="dpk-memo" ?hidden=${!this.hasMemoContent()}>
              <slot name="memo"></slot>
            </div>
          </main>
          ${this.integratedReview?m:g`<aside class="dpk-notes" ?hidden=${!this.notesOpen}>${this.renderReviewPanel(t)}</aside>`}
        </div>
        ${i.footer||this.hasFooterContent()?g`<footer class="dpk-footer">
                ${i.footer??m}
                <slot name="footer"></slot>
              </footer>`:m}
        ${this.integratedReview?m:g`<button
                class="dpk-fab"
                type="button"
                aria-expanded=${this.notesOpen?"true":"false"}
                title="レビュー / コメント"
                @click=${()=>{this.notesOpen=!this.notesOpen}}
              >
                <span class="dpk-fab-icon" aria-hidden="true"></span>
                <span
                  class="dpk-label"
                  style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)"
                >
                  レビュー
                </span>
                ${n>0?g`<span class="dpk-fab-badge">${n}</span>`:m}
              </button>`}
      </div>
    `}render(){if(!this.#t)return m;const t=this.#k();return this.renderChrome(t,this.renderRegions(t))}hasSidebarContent(){return this.querySelector('[slot="sidebar"]')!==null}hasMemoContent(){return this.querySelector('[slot="memo"]')!==null}hasFooterContent(){return this.querySelector('[slot="footer"]')!==null}context(){return this.#k()}#d(){return{definition:this.definition,controller:()=>this.controller,derivation:()=>this.derivation,ready:this.#m,navigation:()=>this.#x(),issues:()=>this.controller.lastIssues,dispatch:t=>this.dispatch(t),dispatchBatch:t=>this.dispatchBatch(t),subscribe:t=>(this.#i.add(t),()=>{this.#i.delete(t)}),removeAction:t=>this.removeAction(t),clearActions:()=>this.clearActions(),navigate:(t,i)=>this.navigate(t,i),hashFor:t=>this.hashFor(t),requestComment:t=>this.requestComment(t)}}#$(){return As(this.#d(),this)}#y(){return hi(this.#d())}#k(){return ws(this.#d())}#x(){return this.definition.resolveNavigation(this.derivation.state,this.#s)}#j(){const t=this.#O();this.#s=mi();const i=this.storageKey;this.#t=new pi({definition:this.definition,base:t,storage:this.#M(),...typeof i=="string"?{storageKey:i}:{}}),this.#h(),this.#u(),this.#w(!0),this.#g?.(),this.#T(),this.requestUpdate()}#M(){return this.storage==="off"?null:this.storage==="memory"?new Ft:Kt()}#O(){const t=this.querySelector('script[type="application/json"]');if(!t?.textContent||t.textContent.trim().length===0)return console.warn(`[dev-process-kit] <${this.tagName.toLowerCase()}> has no base JSON; starting from an empty state.`),this.#n='no <script type="application/json"> child found',this.definition.emptyBase();try{return this.definition.parseBase(JSON.parse(t.textContent))}catch(i){return console.error("[dev-process-kit] invalid base data:",i),this.#n=i instanceof Error?i.message:String(i),this.definition.emptyBase()}}#T(){this.querySelector('script[type="application/json"]')||(this.#l=new MutationObserver(()=>{const t=this.querySelector('script[type="application/json"]');if(t){this.#l?.disconnect(),this.#l=void 0;try{this.controller.setBase(this.definition.parseBase(JSON.parse(t.textContent??"null")))}catch(i){console.error("[dev-process-kit] invalid base data:",i)}}}),this.#l.observe(this,{childList:!0,subtree:!0}))}#b(){const t=this.#y();for(const i of this.#i)i(t)}#N(){if(!this.isConnected){this.requestUpdate(),this.#b();return}this.#w(!0),gi(this.#f,this.controller.actions),queueMicrotask(this.#u),this.requestUpdate(),this.#b(),this.dispatchEvent(new CustomEvent("dpk-change",{detail:this.#y(),bubbles:!0,composed:!0}))}#w(t){const i=this.#x();this.#s=i,Cs(i,t)}#A=()=>{this.#s=mi(),this.#w(!0),this.requestUpdate(),this.#b(),this.dispatchEvent(new CustomEvent("dpk-navigate",{detail:{navigation:this.#s},bubbles:!0,composed:!0}))};#u=()=>{this.#c?.disconnect(),this.#f=_s(this,t=>{this.isConnected&&this.#c?.observe(t,{childList:!0,subtree:!0})}),this.#t&&(gi(this.#f,this.#t.actions),this.#t.setComponentSnapshot(Es(this.#f)))};#_=t=>{if(t.stopPropagation(),!(t instanceof CustomEvent)||!this.#t)return;const i=t.detail;typeof i!="object"||i===null||!("target"in i)||typeof i.target!="string"||(this.#u(),!this.controller.definition.commentTargets(this.derivation.state,this.navigation).some(n=>n.value===i.target))||this.requestComment(i.target)};#S=t=>{if(t.stopPropagation(),!(t instanceof CustomEvent)||!t.cancelable||!this.#t)return;const i=x(In,t.detail);if(!i.success)return;this.#u();const{target:n,body:s}=i.output;this.controller.definition.commentTargets(this.derivation.state,this.navigation).some(r=>r.value===n)&&this.dispatch({type:C,target:n,payload:{body:s}}).ok&&t.preventDefault()};#E=t=>{if(t.stopPropagation(),!(t instanceof CustomEvent)||!t.cancelable||!this.#t)return;const i=x(mn,t.detail);if(!i.success)return;this.#u();const{type:n,target:s,payload:r}=i.output;this.controller.definition.commentTargets(this.derivation.state,this.navigation).some(o=>o.value===s)&&this.dispatch({type:n,target:s,payload:r}).ok&&t.preventDefault()};#C=t=>{for(const i of t.composedPath()){if(!(i instanceof Element))continue;if(i===this||i.hasAttribute("data-template"))break;const n=i.getAttribute("data-dpk-navigate");if(n!==null){t.preventDefault(),this.navigate(Rt(n.includes("=")?n:`step=${n}`));return}const s=i.getAttribute("data-dpk-comment");if(s!==null){t.preventDefault(),this.requestComment(s);return}}};#U(){this.#r.route()}}const Ts=(e,t)=>{typeof window>"u"||Object.assign(window,{devProcessKit:{version:e,templates:t}})};export{N as $,jn as A,Tn as B,C,Ke as D,Pt as E,W as F,Mn as G,Nn as H,Cn as I,On as J,En as K,si as L,Ft as M,Rt as N,Ae as O,nn as P,Lt as Q,sn as R,Tt as S,Os as T,_e as U,E as V,Jt as W,mt as X,jt as Y,lt as Z,Bi as _,Ts as a,m as a0,g as a1,Fe as a2,ji as a3,O as a4,Pn as a5,Rn as a6,we as a7,F as a8,ft as a9,q as aa,f as ab,gt as ac,b as ad,v as ae,ve as af,$e as ag,B as ah,J as ai,ge as aj,x as ak,w as al,me as am,Ct as an,ue as ao,he as ap,be as aq,S as ar,Xi as as,vt as at,ht as au,Ue as av,tn as aw,qe as ax,Be as ay,De as az,je as b,ce as c,pi as d,Ot as e,rn as f,qt as g,Ce as h,Nt as i,ii as j,ct as k,Se as l,pn as m,Mt as n,Kt as o,di as p,en as q,Bn as r,Hi as s,ni as t,K as u,an as v,V as w,zn as x,Un as y,Ht as z};
