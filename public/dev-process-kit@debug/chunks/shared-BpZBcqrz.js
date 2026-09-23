const rt=globalThis,yt=rt.ShadowRoot&&(rt.ShadyCSS===void 0||rt.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,xt=Symbol(),Vt=new WeakMap;let Wt=class{constructor(e,t,i){if(this._$cssResult$=!0,i!==xt)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o;const t=this.t;if(yt&&e===void 0){const i=t!==void 0&&t.length===1;i&&(e=Vt.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),i&&Vt.set(t,e))}return e}toString(){return this.cssText}};const bi=e=>new Wt(typeof e=="string"?e:e+"",void 0,xt),N=(e,...t)=>{const i=e.length===1?e[0]:t.reduce((n,a,s)=>n+(r=>{if(r._$cssResult$===!0)return r.cssText;if(typeof r=="number")return r;throw Error("Value passed to 'css' function must be a 'css' function result: "+r+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(a)+e[s+1],e[0]);return new Wt(i,e,xt)},vi=(e,t)=>{if(yt)e.adoptedStyleSheets=t.map(i=>i instanceof CSSStyleSheet?i:i.styleSheet);else for(const i of t){const n=document.createElement("style"),a=rt.litNonce;a!==void 0&&n.setAttribute("nonce",a),n.textContent=i.cssText,e.appendChild(n)}},Zt=yt?e=>e:e=>e instanceof CSSStyleSheet?(t=>{let i="";for(const n of t.cssRules)i+=n.cssText;return bi(i)})(e):e,{is:yi,defineProperty:xi,getOwnPropertyDescriptor:$i,getOwnPropertyNames:ki,getOwnPropertySymbols:wi,getPrototypeOf:Ai}=Object,ot=globalThis,Yt=ot.trustedTypes,_i=Yt?Yt.emptyScript:"",Si=ot.reactiveElementPolyfillSupport,Y=(e,t)=>e,$t={toAttribute(e,t){switch(t){case Boolean:e=e?_i:null;break;case Object:case Array:e=e==null?e:JSON.stringify(e)}return e},fromAttribute(e,t){let i=e;switch(t){case Boolean:i=e!==null;break;case Number:i=e===null?null:Number(e);break;case Object:case Array:try{i=JSON.parse(e)}catch{i=null}}return i}},Qt=(e,t)=>!yi(e,t),Gt={attribute:!0,type:String,converter:$t,reflect:!1,useDefault:!1,hasChanged:Qt};Symbol.metadata??=Symbol("metadata"),ot.litPropertyMetadata??=new WeakMap;let I=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=Gt){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){const i=Symbol(),n=this.getPropertyDescriptor(e,i,t);n!==void 0&&xi(this.prototype,e,n)}}static getPropertyDescriptor(e,t,i){const{get:n,set:a}=$i(this.prototype,e)??{get(){return this[t]},set(s){this[t]=s}};return{get:n,set(s){const r=n?.call(this);a?.call(this,s),this.requestUpdate(e,r,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??Gt}static _$Ei(){if(this.hasOwnProperty(Y("elementProperties")))return;const e=Ai(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(Y("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(Y("properties"))){const t=this.properties,i=[...ki(t),...wi(t)];for(const n of i)this.createProperty(n,t[n])}const e=this[Symbol.metadata];if(e!==null){const t=litPropertyMetadata.get(e);if(t!==void 0)for(const[i,n]of t)this.elementProperties.set(i,n)}this._$Eh=new Map;for(const[t,i]of this.elementProperties){const n=this._$Eu(t,i);n!==void 0&&this._$Eh.set(n,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const t=[];if(Array.isArray(e)){const i=new Set(e.flat(1/0).reverse());for(const n of i)t.unshift(Zt(n))}else e!==void 0&&t.push(Zt(e));return t}static _$Eu(e,t){const i=t.attribute;return i===!1?void 0:typeof i=="string"?i:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){const e=new Map,t=this.constructor.elementProperties;for(const i of t.keys())this.hasOwnProperty(i)&&(e.set(i,this[i]),delete this[i]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return vi(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,i){this._$AK(e,i)}_$ET(e,t){const i=this.constructor.elementProperties.get(e),n=this.constructor._$Eu(e,i);if(n!==void 0&&i.reflect===!0){const a=(i.converter?.toAttribute!==void 0?i.converter:$t).toAttribute(t,i.type);this._$Em=e,a==null?this.removeAttribute(n):this.setAttribute(n,a),this._$Em=null}}_$AK(e,t){const i=this.constructor,n=i._$Eh.get(e);if(n!==void 0&&this._$Em!==n){const a=i.getPropertyOptions(n),s=typeof a.converter=="function"?{fromAttribute:a.converter}:a.converter?.fromAttribute!==void 0?a.converter:$t;this._$Em=n;const r=s.fromAttribute(t,a.type);this[n]=r??this._$Ej?.get(n)??r,this._$Em=null}}requestUpdate(e,t,i,n=!1,a){if(e!==void 0){const s=this.constructor;if(n===!1&&(a=this[e]),i??=s.getPropertyOptions(e),!((i.hasChanged??Qt)(a,t)||i.useDefault&&i.reflect&&a===this._$Ej?.get(e)&&!this.hasAttribute(s._$Eu(e,i))))return;this.C(e,t,i)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(e,t,{useDefault:i,reflect:n,wrapped:a},s){i&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,s??t??this[e]),a!==!0||s!==void 0)||(this._$AL.has(e)||(this.hasUpdated||i||(t=void 0),this._$AL.set(e,t)),n===!0&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[n,a]of this._$Ep)this[n]=a;this._$Ep=void 0}const i=this.constructor.elementProperties;if(i.size>0)for(const[n,a]of i){const{wrapped:s}=a,r=this[n];s!==!0||this._$AL.has(n)||r===void 0||this.C(n,void 0,a,r)}}let e=!1;const t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(i=>i.hostUpdate?.()),this.update(t)):this._$EM()}catch(i){throw e=!1,this._$EM(),i}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(e){}firstUpdated(e){}};I.elementStyles=[],I.shadowRootOptions={mode:"open"},I[Y("elementProperties")]=new Map,I[Y("finalized")]=new Map,Si?.({ReactiveElement:I}),(ot.reactiveElementVersions??=[]).push("2.1.2");const kt=globalThis,Xt=e=>e,ct=kt.trustedTypes,te=ct?ct.createPolicy("lit-html",{createHTML:e=>e}):void 0,ee="$lit$",M=`lit$${Math.random().toFixed(9).slice(2)}$`,ie="?"+M,Ei=`<${ie}>`,U=document,Q=()=>U.createComment(""),G=e=>e===null||typeof e!="object"&&typeof e!="function",wt=Array.isArray,Ci=e=>wt(e)||typeof e?.[Symbol.iterator]=="function",At=`[ 	
\f\r]`,X=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,ne=/-->/g,ae=/>/g,z=RegExp(`>|${At}(?:([^\\s"'>=/]+)(${At}*=${At}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),se=/'/g,re=/"/g,oe=/^(?:script|style|textarea|title)$/i,ce=e=>(t,...i)=>({_$litType$:e,strings:t,values:i}),g=ce(1),ji=ce(2),P=Symbol.for("lit-noChange"),m=Symbol.for("lit-nothing"),le=new WeakMap,R=U.createTreeWalker(U,129);function de(e,t){if(!wt(e)||!e.hasOwnProperty("raw"))throw Error("invalid template strings array");return te!==void 0?te.createHTML(t):t}const Mi=(e,t)=>{const i=e.length-1,n=[];let a,s=t===2?"<svg>":t===3?"<math>":"",r=X;for(let c=0;c<i;c++){const o=e[c];let d,p,l=-1,h=0;for(;h<o.length&&(r.lastIndex=h,p=r.exec(o),p!==null);)h=r.lastIndex,r===X?p[1]==="!--"?r=ne:p[1]!==void 0?r=ae:p[2]!==void 0?(oe.test(p[2])&&(a=RegExp("</"+p[2],"g")),r=z):p[3]!==void 0&&(r=z):r===z?p[0]===">"?(r=a??X,l=-1):p[1]===void 0?l=-2:(l=r.lastIndex-p[2].length,d=p[1],r=p[3]===void 0?z:p[3]==='"'?re:se):r===re||r===se?r=z:r===ne||r===ae?r=X:(r=z,a=void 0);const u=r===z&&e[c+1].startsWith("/>")?" ":"";s+=r===X?o+Ei:l>=0?(n.push(d),o.slice(0,l)+ee+o.slice(l)+M+u):o+M+(l===-2?c:u)}return[de(e,s+(e[i]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),n]};class st{constructor({strings:t,_$litType$:i},n){let a;this.parts=[];let s=0,r=0;const c=t.length-1,o=this.parts,[d,p]=Mi(t,i);if(this.el=st.createElement(d,n),R.currentNode=this.el.content,i===2||i===3){const l=this.el.content.firstChild;l.replaceWith(...l.childNodes)}for(;(a=R.nextNode())!==null&&o.length<c;){if(a.nodeType===1){if(a.hasAttributes())for(const l of a.getAttributeNames())if(l.endsWith(ee)){const h=p[r++],u=a.getAttribute(l).split(M),y=/([.?@])?(.*)/.exec(h);o.push({type:1,index:s,name:y[2],strings:u,ctor:y[1]==="."?Ti:y[1]==="?"?Ni:y[1]==="@"?Ui:lt}),a.removeAttribute(l)}else l.startsWith(M)&&(o.push({type:6,index:s}),a.removeAttribute(l));if(oe.test(a.tagName)){const l=a.textContent.split(M),h=l.length-1;if(h>0){a.textContent=ct?ct.emptyScript:"";for(let u=0;u<h;u++)a.append(l[u],Q()),R.nextNode(),o.push({type:2,index:++s});a.append(l[h],Q())}}}else if(a.nodeType===8)if(a.data===ie)o.push({type:2,index:s});else{let l=-1;for(;(l=a.data.indexOf(M,l+1))!==-1;)o.push({type:7,index:s}),l+=M.length-1}s++}}static createElement(t,i){const n=U.createElement("template");return n.innerHTML=t,n}}function D(e,t,i=e,n){if(t===P)return t;let a=n!==void 0?i._$Co?.[n]:i._$Cl;const s=G(t)?void 0:t._$litDirective$;return a?.constructor!==s&&(a?._$AO?.(!1),s===void 0?a=void 0:(a=new s(e),a._$AT(e,i,n)),n!==void 0?(i._$Co??=[])[n]=a:i._$Cl=a),a!==void 0&&(t=D(e,a._$AS(e,t.values),a,n)),t}class Oi{constructor(t,i){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=i}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:i},parts:n}=this._$AD,a=(t?.creationScope??U).importNode(i,!0);R.currentNode=a;let s=R.nextNode(),r=0,c=0,o=n[0];for(;o!==void 0;){if(r===o.index){let d;o.type===2?d=new Z(s,s.nextSibling,this,t):o.type===1?d=new o.ctor(s,o.name,o.strings,this,t):o.type===6&&(d=new zi(s,this,t)),this._$AV.push(d),o=n[++c]}r!==o?.index&&(s=R.nextNode(),r++)}return R.currentNode=U,a}p(t){let i=0;for(const n of this._$AV)n!==void 0&&(n.strings!==void 0?(n._$AI(t,n,i),i+=n.strings.length-2):n._$AI(t[i])),i++}}class Z{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,i,n,a){this.type=2,this._$AH=m,this._$AN=void 0,this._$AA=t,this._$AB=i,this._$AM=n,this.options=a,this._$Cv=a?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const i=this._$AM;return i!==void 0&&t?.nodeType===11&&(t=i.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,i=this){t=D(this,t,i),G(t)?t===m||t==null||t===""?(this._$AH!==m&&this._$AR(),this._$AH=m):t!==this._$AH&&t!==P&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):Ci(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==m&&G(this._$AH)?this._$AA.nextSibling.data=t:this.T(U.createTextNode(t)),this._$AH=t}$(t){const{values:i,_$litType$:n}=t,a=typeof n=="number"?this._$AC(t):(n.el===void 0&&(n.el=st.createElement(de(n.h,n.h[0]),this.options)),n);if(this._$AH?._$AD===a)this._$AH.p(i);else{const s=new Oi(a,this),r=s.u(this.options);s.p(i),this.T(r),this._$AH=s}}_$AC(t){let i=le.get(t.strings);return i===void 0&&le.set(t.strings,i=new st(t)),i}k(t){wt(this._$AH)||(this._$AH=[],this._$AR());const i=this._$AH;let n,a=0;for(const s of t)a===i.length?i.push(n=new Z(this.O(Q()),this.O(Q()),this,this.options)):n=i[a],n._$AI(s),a++;a<i.length&&(this._$AR(n&&n._$AB.nextSibling,a),i.length=a)}_$AR(t=this._$AA.nextSibling,i){for(this._$AP?.(!1,!0,i);t!==this._$AB;){const n=Xt(t).nextSibling;Xt(t).remove(),t=n}}setConnected(t){this._$AM===void 0&&(this._$Cv=t,this._$AP?.(t))}}class lt{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,i,n,a,s){this.type=1,this._$AH=m,this._$AN=void 0,this.element=t,this.name=i,this._$AM=a,this.options=s,n.length>2||n[0]!==""||n[1]!==""?(this._$AH=Array(n.length-1).fill(new String),this.strings=n):this._$AH=m}_$AI(t,i=this,n,a){const s=this.strings;let r=!1;if(s===void 0)t=D(this,t,i,0),r=!G(t)||t!==this._$AH&&t!==P,r&&(this._$AH=t);else{const c=t;let o,d;for(t=s[0],o=0;o<s.length-1;o++)d=D(this,c[n+o],i,o),d===P&&(d=this._$AH[o]),r||=!G(d)||d!==this._$AH[o],d===m?t=m:t!==m&&(t+=(d??"")+s[o+1]),this._$AH[o]=d}r&&!a&&this.j(t)}j(t){t===m?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class Ti extends lt{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===m?void 0:t}}class Ni extends lt{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==m)}}class Ui extends lt{constructor(t,i,n,a,s){super(t,i,n,a,s),this.type=5}_$AI(t,i=this){if((t=D(this,t,i,0)??m)===P)return;const n=this._$AH,a=t===m&&n!==m||t.capture!==n.capture||t.once!==n.once||t.passive!==n.passive,s=t!==m&&(n===m||a);a&&this.element.removeEventListener(this.name,this,n),s&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class zi{constructor(t,i,n){this.element=t,this.type=6,this._$AN=void 0,this._$AM=i,this.options=n}get _$AU(){return this._$AM._$AU}_$AI(t){D(this,t)}}const Pi={I:Z},Ri=kt.litHtmlPolyfillSupport;Ri?.(st,Z),(kt.litHtmlVersions??=[]).push("3.3.3");const Li=(e,t,i)=>{const n=i?.renderBefore??t;let a=n._$litPart$;if(a===void 0){const s=i?.renderBefore??null;n._$litPart$=a=new Z(t.insertBefore(Q(),s),s,void 0,i??{})}return a._$AI(e),a},_t=globalThis;let O=class extends I{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=Li(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return P}};O._$litElement$=!0,O.finalized=!0,_t.litElementHydrateSupport?.({LitElement:O});const qi=_t.litElementPolyfillSupport;qi?.({LitElement:O}),(_t.litElementVersions??=[]).push("4.2.2");const dt=N`
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
`,pt=N`
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
    box-sizing: border-box;
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
`,ht=(e,t)=>e instanceof t?e:null;class pe extends O{static{this.styles=[dt,pt,N`
      :host {
        display: inline;
        /* Inherit the surrounding type scale instead of forcing the chrome size:
           an inline edit inside a 17px heading must look like a 17px heading.
           Colour comes along too, so an edit on a coloured card stays legible. */
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
        min-height: var(--af-inline-textarea-min-height, 90px);
        resize: vertical;
        font-family: var(--af-body);
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
         seamless field re-states the inherited type and colour. */
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
    `]}static{this.properties={value:{type:String},placeholder:{type:String},multiline:{type:Boolean},wrap:{type:Boolean,reflect:!0},seamless:{type:Boolean,reflect:!0},label:{type:String},editing:{state:!0}}}#e="";#s=0;connectedCallback(){super.connectedCallback(),this.#s+=1}constructor(){super(),this.value="",this.placeholder="",this.multiline=!1,this.wrap=!1,this.seamless=!1,this.label="",this.editing=!1,this.#e=""}startEditing(){this.#e=this.value,this.editing=!0}willUpdate(t){t.has("value")&&!this.editing&&(this.#e=this.value)}updated(){if(!this.editing)return;const t=this.renderRoot.querySelector("input, textarea"),i=this.renderRoot,n=i instanceof ShadowRoot?i.activeElement:document.activeElement;t&&n!==t&&(t.focus(),t.select())}render(){if(!this.editing){const i=this.value.length===0;return g`<span
        class="view"
        data-empty=${String(i)}
        role="button"
        tabindex="0"
        title="クリックして編集"
        @click=${this.#t}
        @keydown=${this.#a}
        >${i?this.placeholder||"\u672A\u8A2D\u5B9A":this.value}</span
      >`}const t=this.label||this.placeholder||"\u7DE8\u96C6";return g`
      ${this.multiline||this.wrap?g`<textarea
              class="af-textarea"
              .value=${this.#e}
              aria-label=${t}
              @input=${this.#r}
              @keydown=${this.#i}
              @blur=${this.#n}
            ></textarea>`:g`<input
              class="af-input"
              .value=${this.#e}
              aria-label=${t}
              @input=${this.#r}
              @keydown=${this.#i}
              @blur=${this.#n}
            />`}
    `}#t=t=>{t.stopPropagation(),this.editing=!0};#a=t=>{t.isComposing||(t.key==="Enter"||t.key===" ")&&(t.preventDefault(),this.editing=!0)};#r=t=>{const i=ht(t.target,HTMLInputElement)??ht(t.target,HTMLTextAreaElement);i!==null&&(this.#e=i.value)};#i=t=>{if(!t.isComposing){if(t.key==="Escape"){t.preventDefault(),this.#e=this.value,this.editing=!1;return}t.key==="Enter"&&(!this.multiline||this.wrap||t.metaKey||t.ctrlKey)&&(t.preventDefault(),this.#l())}};#n=t=>{const i=t.currentTarget;if(!(i instanceof HTMLInputElement||i instanceof HTMLTextAreaElement))return;const n=this.#s,{selectionStart:a,selectionEnd:s}=i;queueMicrotask(()=>{!this.isConnected||!this.editing||(n!==this.#s?(i.focus(),i.setSelectionRange(a,s)):this.#l())})};#l=()=>{if(!this.editing)return;this.editing=!1;const t=(this.wrap?this.#e.replace(/\r?\n/g," "):this.#e).trim();t!==this.value&&this.dispatchEvent(new CustomEvent("artifact-commit",{detail:{value:t},bubbles:!0,composed:!0}))}}const Hi=(e="artifact-inline-edit")=>{customElements.get(e)||customElements.define(e,pe)},Ii={lang:void 0,message:void 0,abortEarly:void 0,abortPipeEarly:void 0};function St(e){return Ii}let Di;function Fi(e){return Di?.get(e)}let Ji;function Ki(e){return Ji?.get(e)}let Vi;function Wi(e,t){return Vi?.get(e)?.get(t)}function tt(e){const t=typeof e;return t==="string"?`"${e}"`:t==="number"||t==="bigint"||t==="boolean"?`${e}`:t==="object"||t==="function"?(e&&Object.getPrototypeOf(e)?.constructor?.name)??"null":t}function x(e,t,i,n,a){const s=a&&"input"in a?a.input:i.value,r=a?.expected??e.expects??null,c=a?.received??tt(s),o={kind:e.kind,type:e.type,input:s,expected:r,received:c,message:`Invalid ${t}: ${r?`Expected ${r} but r`:"R"}eceived ${c}`,requirement:e.requirement,path:a?.path,issues:a?.issues,lang:n.lang,abortEarly:n.abortEarly,abortPipeEarly:n.abortPipeEarly},d=e.kind==="schema",p=a?.message??e.message??Wi(e.reference,o.lang)??(d?Ki(o.lang):null)??n.message??Fi(o.lang);p!==void 0&&(o.message=typeof p=="function"?p(o):p),d&&(i.typed=!1),i.issues?i.issues.push(o):i.issues=[o]}function Zi(e,t){return e===t||Number.isNaN(e)&&Number.isNaN(t)}function Yi(e,t){return Object.prototype.hasOwnProperty.call(e,t)&&t!=="__proto__"&&t!=="prototype"&&t!=="constructor"}function Et(e,t){const i=[...new Set(e)];return i.length>1?`(${i.join(` ${t} `)})`:i[0]??"never"}function k(e){return e["~standard"]={version:1,vendor:"valibot",validate:t=>e["~run"]({value:t},St())},e}var Qi=class extends Error{constructor(e){super(e[0].message),this.name="ValiError",this.issues=e}};function he(e){return{kind:"validation",type:"integer",reference:he,async:!1,expects:null,requirement:Number.isInteger,message:e,"~run"(t,i){return t.typed&&!this.requirement(t.value)&&x(this,"integer",t,i),t}}}function v(e,t){return{kind:"validation",type:"min_length",reference:v,async:!1,expects:`>=${e}`,requirement:e,message:t,"~run"(i,n){return i.typed&&i.value.length<this.requirement&&x(this,"length",i,n,{received:`${i.value.length}`}),i}}}function ue(e,t){return{kind:"validation",type:"min_value",reference:ue,async:!1,expects:`>=${e instanceof Date?e.toJSON():tt(e)}`,requirement:e,message:t,"~run"(i,n){return i.typed&&!(i.value>=this.requirement)&&x(this,"value",i,n,{received:i.value instanceof Date?i.value.toJSON():tt(i.value)}),i}}}function L(e,t){return{kind:"validation",type:"regex",reference:L,async:!1,expects:`${e}`,requirement:e,message:t,"~run"(i,n){return i.typed&&!this.requirement.test(i.value)&&x(this,"format",i,n),i}}}function Ct(){return{kind:"transformation",type:"trim",reference:Ct,async:!1,"~run"(e){return e.value=e.value.trim(),e}}}const Gi={abortEarly:!0};function fe(e,t,i){return typeof e.fallback=="function"?e.fallback(t,i):e.fallback}function ut(e,t,i){return typeof e.default=="function"?e.default(t,i):e.default}function q(e,t){return k({kind:"schema",type:"array",reference:q,expects:"Array",async:!1,item:e,message:t,"~run"(i,n){const a=i.value;if(Array.isArray(a)){i.typed=!0,i.value=[];for(let s=0;s<a.length;s++){const r=a[s],c=this.item["~run"]({value:r},n);if(c.issues){const o={type:"array",origin:"value",input:a,key:s,value:r};for(const d of c.issues)d.path?d.path.unshift(o):d.path=[o],i.issues?.push(d);if(i.issues||(i.issues=c.issues),n.abortEarly){i.typed=!1;break}}c.typed||(i.typed=!1),i.value.push(c.value)}}else x(this,"type",i,n);return i}})}function ge(e){return k({kind:"schema",type:"boolean",reference:ge,expects:"boolean",async:!1,message:e,"~run"(t,i){return typeof t.value=="boolean"?t.typed=!0:x(this,"type",t,i),t}})}function S(e,t){return k({kind:"schema",type:"exact_optional",reference:S,expects:e.expects,async:!1,wrapped:e,default:t,"~run"(i,n){return this.wrapped["~run"](i,n)}})}function me(e){return k({kind:"schema",type:"lazy",reference:me,expects:"unknown",async:!1,getter:e,"~run"(t,i){return this.getter(t.value)["~run"](t,i)}})}function F(e,t){return k({kind:"schema",type:"literal",reference:F,expects:tt(e),async:!1,literal:e,message:t,"~run"(i,n){return Zi(i.value,this.literal)?i.typed=!0:x(this,"type",i,n),i}})}function be(e,t){return k({kind:"schema",type:"nullable",reference:be,expects:`(${e.expects} | null)`,async:!1,wrapped:e,default:t,"~run"(i,n){return i.value===null&&(this.default!==void 0&&(i.value=ut(this,i,n)),i.value===null)?(i.typed=!0,i):this.wrapped["~run"](i,n)}})}function ve(e){return k({kind:"schema",type:"number",reference:ve,expects:"number",async:!1,message:e,"~run"(t,i){return typeof t.value=="number"&&!isNaN(t.value)?t.typed=!0:x(this,"type",t,i),t}})}function w(e,t){return k({kind:"schema",type:"object",reference:w,expects:"Object",async:!1,entries:e,message:t,"~run"(i,n){const a=i.value;if(a&&typeof a=="object"){i.typed=!0,i.value={};for(const s in this.entries){const r=this.entries[s];if(s in a||(r.type==="exact_optional"||r.type==="optional"||r.type==="nullish")&&r.default!==void 0){const c=s in a?a[s]:ut(r),o=r["~run"]({value:c},n);if(o.issues){const d={type:"object",origin:"value",input:a,key:s,value:c};for(const p of o.issues)p.path?p.path.unshift(d):p.path=[d],i.issues?.push(p);if(i.issues||(i.issues=o.issues),n.abortEarly){i.typed=!1;break}}o.typed||(i.typed=!1),i.value[s]=o.value}else if(r.fallback!==void 0)i.value[s]=fe(r);else if(r.type!=="exact_optional"&&r.type!=="optional"&&r.type!=="nullish"&&(x(this,"key",i,n,{input:void 0,expected:`"${s}"`,path:[{type:"object",origin:"key",input:a,key:s,value:a[s]}]}),n.abortEarly))break}}else x(this,"type",i,n);return i}})}function ft(e,t){return k({kind:"schema",type:"optional",reference:ft,expects:`(${e.expects} | undefined)`,async:!1,wrapped:e,default:t,"~run"(i,n){return i.value===void 0&&(this.default!==void 0&&(i.value=ut(this,i,n)),i.value===void 0)?(i.typed=!0,i):this.wrapped["~run"](i,n)}})}function gt(e,t){return k({kind:"schema",type:"picklist",reference:gt,expects:Et(e.map(tt),"|"),async:!1,options:e,message:t,"~run"(i,n){return this.options.includes(i.value)?i.typed=!0:x(this,"type",i,n),i}})}function ye(e,t,i){return k({kind:"schema",type:"record",reference:ye,expects:"Object",async:!1,key:e,value:t,message:i,"~run"(n,a){const s=n.value;if(s&&typeof s=="object"){n.typed=!0,n.value={};for(const r in s)if(Yi(s,r)){const c=s[r],o=this.key["~run"]({value:r},a);if(o.issues){const p={type:"object",origin:"key",input:s,key:r,value:c};for(const l of o.issues)l.path=[p],n.issues?.push(l);if(n.issues||(n.issues=o.issues),a.abortEarly){n.typed=!1;break}}const d=this.value["~run"]({value:c},a);if(d.issues){const p={type:"object",origin:"value",input:s,key:r,value:c};for(const l of d.issues)l.path?l.path.unshift(p):l.path=[p],n.issues?.push(l);if(n.issues||(n.issues=d.issues),a.abortEarly){n.typed=!1;break}}(!o.typed||!d.typed)&&(n.typed=!1),o.typed&&(n.value[o.value]=d.value)}}else x(this,"type",n,a);return n}})}function J(e,t){return k({kind:"schema",type:"strict_object",reference:J,expects:"Object",async:!1,entries:e,message:t,"~run"(i,n){const a=i.value;if(a&&typeof a=="object"){i.typed=!0,i.value={};for(const s in this.entries){const r=this.entries[s];if(s in a||(r.type==="exact_optional"||r.type==="optional"||r.type==="nullish")&&r.default!==void 0){const c=s in a?a[s]:ut(r),o=r["~run"]({value:c},n);if(o.issues){const d={type:"object",origin:"value",input:a,key:s,value:c};for(const p of o.issues)p.path?p.path.unshift(d):p.path=[d],i.issues?.push(p);if(i.issues||(i.issues=o.issues),n.abortEarly){i.typed=!1;break}}o.typed||(i.typed=!1),i.value[s]=o.value}else if(r.fallback!==void 0)i.value[s]=fe(r);else if(r.type!=="exact_optional"&&r.type!=="optional"&&r.type!=="nullish"&&(x(this,"key",i,n,{input:void 0,expected:`"${s}"`,path:[{type:"object",origin:"key",input:a,key:s,value:a[s]}]}),n.abortEarly))break}if(!i.issues||!n.abortEarly){for(const s in a)if(!Object.prototype.hasOwnProperty.call(this.entries,s)){x(this,"key",i,n,{input:s,expected:"never",path:[{type:"object",origin:"key",input:a,key:s,value:a[s]}]});break}}}else x(this,"type",i,n);return i}})}function f(e){return k({kind:"schema",type:"string",reference:f,expects:"string",async:!1,message:e,"~run"(t,i){return typeof t.value=="string"?t.typed=!0:x(this,"type",t,i),t}})}function xe(e){let t;if(e)for(const i of e)if(t)for(const n of i.issues)t.push(n);else t=i.issues;return t}function $e(e,t){return k({kind:"schema",type:"union",reference:$e,expects:Et(e.map(i=>i.expects),"|"),async:!1,options:e,message:t,"~run"(i,n){let a,s,r;for(const c of this.options){const o=c["~run"]({value:i.value},n);if(o.typed)if(o.issues)s?s.push(o):s=[o];else{a=o;break}else r?r.push(o):r=[o]}if(a)return a;if(s){if(s.length===1)return s[0];x(this,"type",i,n,{issues:xe(s)}),i.typed=!0}else{if(r?.length===1)return r[0];x(this,"type",i,n,{issues:xe(r)})}return i}})}function B(){return k({kind:"schema",type:"unknown",reference:B,expects:"unknown",async:!1,"~run"(e){return e.typed=!0,e}})}function ke(e,t,i){return k({kind:"schema",type:"variant",reference:ke,expects:"Object",async:!1,key:e,options:t,message:i,"~run"(n,a){const s=n.value;if(s&&typeof s=="object"){let r,c=0,o=this.key,d=[];const p=(l,h)=>{for(const u of l.options){if(u.type==="variant")p(u,new Set(h).add(u.key));else{let y=!0,_=0;for(const A of h){const T=u.entries[A];if(A in s?T["~run"]({typed:!1,value:s[A]},Gi).issues:T.type!=="exact_optional"&&T.type!=="optional"&&T.type!=="nullish"){y=!1,o!==A&&(c<_||c===_&&A in s&&!(o in s))&&(c=_,o=A,d=[]),o===A&&d.push(u.entries[A].expects);break}_++}if(y){const A=u["~run"]({value:s},a);(!r||!r.typed&&A.typed)&&(r=A)}}if(r&&!r.issues)break}};if(p(this,new Set([this.key])),r)return r;x(this,"type",n,a,{input:s[o],expected:Et(d,"|"),path:[{type:"object",origin:"value",input:s,key:o,value:s[o]}]})}else x(this,"type",n,a);return n}})}function we(e,t,i){const n=e["~run"]({value:t},St());if(n.issues)throw new Qi(n.issues);return n.value}function b(...e){return k({...e[0],pipe:e,"~run"(t,i){for(const n of e)if(n.kind!=="metadata"){if(t.issues&&(n.kind==="schema"||n.kind==="transformation")){t.typed=!1;break}(!t.issues||!i.abortEarly&&!i.abortPipeEarly)&&(t=n["~run"](t,i))}return t}})}function $(e,t,i){const n=e["~run"]({value:t},St());return{typed:n.typed,success:!n.issues,output:n.value,issues:n.issues}}const mt=w({type:b(f(),v(1)),id:b(f(),v(1))}),Xi=b(f(),v(1),L(/^[A-Za-z0-9_-]+$/,'ids may only contain letters, digits, "_" and "-" (a "." builds a path)')),tn=(e,t)=>{if(t===1)return e.includes(".")?null:[e];const i=e.split(".");return i.length===t&&i.every(n=>n.length>0)?i:null},K=w({id:b(f(),v(1)),type:b(f(),v(1)),target:mt,payload:B(),note:S(f()),createdAt:b(f(),v(1))}),en=(e,t,i,n={})=>{const a=w({id:b(f(),v(1)),type:F(e),target:mt,payload:i,note:S(f()),createdAt:b(f(),v(1))}),s=r=>{const c=$(K,r);if(!c.success||c.output.type!==e)return null;const o=$(i,r.payload);return o.success?{id:c.output.id,type:e,target:c.output.target,payload:o.output,...c.output.note===void 0?{}:{note:c.output.note},createdAt:c.output.createdAt}:null};return{schema:a,mode:n.mode??"patch",targetType:t,actionType:e,payloadSchema:i,parse:s,...n.dedupeKey?{dedupeKey:n.dedupeKey}:{}}},nn=(e,t)=>{const i=bt(e,t.type);if(i===void 0)return null;const n=i.parse(t);return n===null?null:n},an=(e,t)=>{const i=$(e.payloadSchema,t.payload);if(!i.success)throw new Error(`invalid payload for action "${t.type}"`);return i.output},bt=(e,t)=>Object.hasOwn(e,t)?e[t]:void 0,sn=e=>{throw new Error(`unhandled action: ${JSON.stringify(e)}`)},rn=w({id:b(f(),v(1))}),on=e=>{const t=$(rn,e.payload);return`${e.type}|${t.success?t.output.id:JSON.stringify(e.payload)}`},E=e=>`${e.type}:${e.id}`,Ae=e=>{const t=e.indexOf(":");return t<=0?{type:"unknown",id:e}:{type:e.slice(0,t),id:e.slice(t+1)}},jt=(e,t)=>typeof e=="string"?Ae(e.includes(":")?e:`${t}:${e}`):{type:e.type,id:e.id},cn=(e,t)=>e.type===t.type&&e.id===t.id,_e=e=>{const t=e.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,40);return t.length>0?t:"item"},ln=(e,t)=>{const i=_e(e),n=new Set(t);if(!n.has(i))return i;for(let a=2;a<1e3;a+=1){const s=`${i}-${a}`;if(!n.has(s))return s}return`${i}-${Math.random().toString(36).slice(2,8)}`},Se=()=>{const e=globalThis.crypto;return e?.randomUUID?e.randomUUID():`a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`},C="comment",et=e=>{const[t]=e;return{path:t?.path?.map(i=>String(i.key)).join(".")??"",message:t?.message??"invalid action"}},Ee=w({type:b(f(),v(1)),target:$e([b(f(),v(1)),mt]),payload:ft(B()),note:S(f()),id:S(b(f(),v(1))),createdAt:S(b(f(),v(1)))}),dn=(e,t)=>{const i=$(Ee,e);if(!i.success)return{ok:!1,issue:et(i.issues)};const n=i.output,a=jt(n.target,t.targetType),s={id:n.id??Se(),type:n.type,target:a,payload:n.payload??{},...n.note===void 0?{}:{note:n.note},createdAt:n.createdAt??new Date().toISOString()},r=$(t.schema,s);if(!r.success)return{ok:!1,issue:et(r.issues)};const c=$(K,r.output);return c.success?{ok:!0,action:c.output}:{ok:!1,issue:et(c.issues)}},Mt=(e,t)=>t.dedupeKey?t.dedupeKey(e):t.mode!=="patch"?null:`${e.type}|${E(e.target)}`,Ot=(e,t,i)=>{const n=Mt(t,i);if(n===null)return[...e,t];const a=e.at(-1);return!a||Mt(a,i)!==n||!pn(a,t)?[...e,t]:[...e.slice(0,-1),t]},pn=(e,t)=>cn(e.target,t.target),Tt=e=>JSON.stringify(e.map(t=>({id:t.id,type:t.type,target:t.target,payload:t.payload,...t.note===void 0?{}:{note:t.note},createdAt:t.createdAt})),null,2),Ce=w({id:b(f(),v(1)),type:F(C),target:w({type:b(f(),v(1)),id:b(f(),v(1))}),payload:w({body:b(f(),v(1))}),note:S(f()),createdAt:b(f(),v(1))}),je={schema:Ce,mode:"append",targetType:"artifact"},hn=w({body:f()}),Nt=e=>{const t=$(hn,e.payload);return t.success?t.output.body:""},Ut="element",Me=b(f(),L(/^[A-Z][A-Z0-9_]*$/,"component action types are CONSTANT_CASE")),Oe=ye(f(),B()),un=w({type:F(Ut),id:b(f(),L(/^[^/]+\/.+/,"component references start with a provider id"))}),fn=w({id:b(f(),v(1)),type:Me,target:un,payload:Oe,note:S(f()),createdAt:b(f(),v(1))}),gn={schema:fn,mode:"sequence",targetType:Ut},mn=J({type:Me,target:b(f(),L(/^element:[^/]+\/.+/)),payload:ft(Oe,{})}),Te=J({id:b(f(),v(1)),title:b(f(),v(1)),summary:S(f()),tone:S(gt(["create","update","delete","move","meta"])),stale:S(gt(["unsupported-action-type","target-missing","constraint-violated"]))}),zt=e=>{if(e.type!==Ut)return null;const t=e.id.indexOf("/");if(t<=0)return null;try{return decodeURIComponent(e.id.slice(0,t))}catch{return null}},j=e=>e.type!==C&&zt(e.target)!==null,bn=(e,t)=>e.filter(i=>j(i)&&zt(i.target)===t),Ne=(e,t)=>{const i=new Map(e.flatMap(n=>j(n)?[[n.id,zt(n.target)]]:[]));return new Map(t.flatMap(n=>n.results.flatMap(a=>i.get(a.id)===n.id?[[a.id,a]]:[])))},Pt=Object.freeze({}),Rt=e=>{const t=e.startsWith("#")?e.slice(1):e;if(t.length===0)return Pt;const i=new URLSearchParams(t.startsWith("?")?t.slice(1):t),n={};for(const[a,s]of i)a.length>0&&s.length>0&&(n[a]=s);return n},V=e=>{const t=new URLSearchParams;for(const n of Object.keys(e).sort((a,s)=>a<s?-1:a>s?1:0)){const a=e[n];a!=null&&a!==""&&t.set(n,a)}const i=t.toString();return i.length===0?"":`#${i}`},Lt=(e,t)=>{const i={...e};for(const[n,a]of Object.entries(t))a==null||a===""?delete i[n]:i[n]=a;return i},vn=(e,t="json")=>`\`\`\`${t}
${e}
\`\`\``,yn=e=>JSON.stringify({type:e.type,target:e.target,payload:e.payload,...e.note===void 0?{}:{note:e.note}},null,2),qt=(e,t,i)=>{const{actions:n,state:a}=e,s=n.filter(o=>o.type===C),r=n.filter(o=>o.type!==C),c=[];if(c.push(`# Artifact draft \u2014 ${t.label}`),c.push(""),c.push(`- template: \`${t.name}\``),c.push(`- framework: \`dev-process-kit@${i}\``),c.push(`- navigation: \`${V(e.navigation)||"(none)"}\``),c.push(`- pending: ${r.length} change(s), ${s.length} comment(s)`),e.stale.length>0&&c.push(`- stale (not applicable to the current base): ${e.stale.length}`),c.push(""),c.push("## How to apply"),c.push(""),c.push("These are patches against the base HTML, not a command log. Apply the requested end state to the meaning model, keep the stable ids of surviving concepts, and keep the base JSON free of any draft envelope."),r.some(j)&&(c.push(""),c.push("Changes targeting `element:<id>/\u2026` belong to the component with that `id` (for example a diagram): apply them to that component's own JSON, following its documented action vocabulary.")),c.push(""),s.length>0){c.push(`## Comments (${s.length})`),c.push("");for(const[o,d]of s.entries()){const p=t.describe(d,a,e.base);c.push(`${o+1}. **${p.targetLabel}** \u2014 \`${E(d.target)}\``),c.push(`   > ${Nt(d).replace(/\n/g,`
   > `)}`)}c.push("")}if(r.length>0){c.push(`## Requested changes (${r.length})`),c.push("");for(const[o,d]of r.entries()){const p=t.describe(d,a,e.base),l=p.summary?` \u2014 ${p.summary}`:"";c.push(`${o+1}. **${p.title}**${l}`),c.push(`   target: \`${E(d.target)}\` (${d.target.type})`),c.push(`   \`\`\`json
   ${yn(d).replace(/\n/g,`
   `)}
   \`\`\``)}c.push("")}return r.length===0&&s.length===0&&(c.push("_No pending draft actions._"),c.push("")),c.push("## Canonical draft (JSON)"),c.push(""),c.push(vn(Tt(n))),c.push(""),c.join(`
`)},W="0.0.1-debug",Ue=async e=>{try{if(navigator.clipboard?.writeText)return await navigator.clipboard.writeText(e),!0}catch{}const t=document.activeElement,i=document.createElement("textarea");try{return i.value=e,i.setAttribute("readonly",""),i.style.position="fixed",i.style.opacity="0",document.body.append(i),i.select(),document.execCommand("copy")}catch{return!1}finally{i.remove(),t instanceof HTMLElement&&t.focus()}},xn=()=>({body:"",attachment:{kind:"artifact"},copy:{kind:"idle"},copyRequest:0}),ze=e=>e.kind==="explicit"?{kind:e.resume}:e,Pe=(e,t)=>{switch(t.kind){case"input":return{...e,body:t.body};case"attach":return{...e,attachment:{kind:t.current?"current":"artifact"}};case"clear-target":return{...e,attachment:ze(e.attachment)};case"target-requested":return{...e,attachment:{kind:"explicit",ref:t.ref,resume:e.attachment.kind==="explicit"?e.attachment.resume:e.attachment.kind}};case"submitted":return{...e,body:"",attachment:ze(e.attachment),copy:{kind:"idle"},copyRequest:e.copyRequest+1};case"copy-started":return{...e,copy:{kind:"pending",format:t.format},copyRequest:e.copyRequest+1};case"copy-finished":return t.request!==e.copyRequest||e.copy.kind!=="pending"?e:{...e,copy:t.ok?{kind:"copied",format:e.copy.format}:{kind:"failed"}}}},$n=(e,t)=>{const i=e.body.trim();return i===""?null:{target:t,body:i}},Re=e=>e.group?`${e.group} \xB7 ${e.label}`:e.label,Le=(e,t)=>{const{definition:i,state:n,navigation:a,derivation:s}=e,r=i.currentTarget?.(n,a)??null,c=t.attachment,o=c.kind==="explicit"?i.commentTargets(n,a).find(l=>l.value===c.ref):null,d=c.kind==="explicit"?{ref:c.ref,label:o?Re(o):c.ref}:c.kind==="current"&&r?{ref:r.value,label:Re(r)}:{ref:`artifact:${i.name}`,label:"Artifact \u5168\u4F53"},p=new Map(s.stale.map(l=>[l.action.id,l.reason]));return{body:t.body,target:d,attachment:c.kind==="explicit"?{kind:"explicit"}:r?{kind:"checkbox",checked:c.kind==="current",group:r.group??""}:{kind:"none"},canSubmit:t.body.trim().length>0,items:s.actions.map(l=>{const h=i.describe(l,n,s.base),u=l.type==="comment";return{id:l.id,title:u?"\u30B3\u30E1\u30F3\u30C8":h.title,targetLabel:h.targetLabel,tone:u?"comment":h.tone,text:{kind:u?"comment":"summary",body:u?Nt(l):h.summary??""},code:i.serialize(l),stale:p.get(l.id)??null}}),issues:e.issues.map(l=>`${l.path?`${l.path}: `:""}${l.message}`),flash:t.copy.kind==="copied"?`copied ${t.copy.format==="json"?"JSON":"brief"} \u2713`:t.copy.kind==="failed"?"copy failed":""}},kn=[dt,pt,N`
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

    .composer .chip svg {
      flex: none;
      width: 12px;
      height: 12px;
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
  `],wn={CHILD:2},qe=e=>(...t)=>({_$litDirective$:e,values:t});let Be=class{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,t,i){this._$Ct=e,this._$AM=t,this._$Ci=i}_$AS(e,t){return this.update(e,t)}update(e,t){return this.render(...t)}};const{I:An}=Pi,He=e=>e,Ie=()=>document.createComment(""),it=(e,t,i)=>{const n=e._$AA.parentNode,a=t===void 0?e._$AB:t._$AA;if(i===void 0){const s=n.insertBefore(Ie(),a),r=n.insertBefore(Ie(),a);i=new An(s,r,e,e.options)}else{const s=i._$AB.nextSibling,r=i._$AM,c=r!==e;if(c){let o;i._$AQ?.(e),i._$AM=e,i._$AP!==void 0&&(o=e._$AU)!==r._$AU&&i._$AP(o)}if(s!==a||c){let o=i._$AA;for(;o!==s;){const d=He(o).nextSibling;He(n).insertBefore(o,a),o=d}}}return i},H=(e,t,i=e)=>(e._$AI(t,i),e),_n={},De=(e,t=_n)=>e._$AH=t,Sn=e=>e._$AH,Bt=e=>{e._$AR(),e._$AA.remove()},Fe=(e,t,i)=>{const n=new Map;for(let a=t;a<=i;a++)n.set(e[a],a);return n},Je=qe(class extends Be{constructor(e){if(super(e),e.type!==wn.CHILD)throw Error("repeat() can only be used in text expressions")}dt(e,t,i){let n;i===void 0?i=t:t!==void 0&&(n=t);const a=[],s=[];let r=0;for(const c of e)a[r]=n?n(c,r):r,s[r]=i(c,r),r++;return{values:s,keys:a}}render(e,t,i){return this.dt(e,t,i).values}update(e,[t,i,n]){const a=Sn(e),{values:s,keys:r}=this.dt(t,i,n);if(!Array.isArray(a))return this.ut=r,s;const c=this.ut??=[],o=[];let d,p,l=0,h=a.length-1,u=0,y=s.length-1;for(;l<=h&&u<=y;)if(a[l]===null)l++;else if(a[h]===null)h--;else if(c[l]===r[u])o[u]=H(a[l],s[u]),l++,u++;else if(c[h]===r[y])o[y]=H(a[h],s[y]),h--,y--;else if(c[l]===r[y])o[y]=H(a[l],s[y]),it(e,o[y+1],a[l]),l++,y--;else if(c[h]===r[u])o[u]=H(a[h],s[u]),it(e,a[l],a[h]),h--,u++;else if(d===void 0&&(d=Fe(r,u,y),p=Fe(c,l,h)),d.has(c[l]))if(d.has(c[h])){const _=p.get(r[u]),A=_!==void 0?a[_]:null;if(A===null){const T=it(e,a[l]);H(T,s[u]),o[u]=T}else o[u]=H(A,s[u]),it(e,a[l],A),a[_]=null;u++}else Bt(a[h]),h--;else Bt(a[l]),l++;for(;u<=y;){const _=it(e,o[y+1]);H(_,s[u]),o[u++]=_}for(;l<=h;){const _=a[l++];_!==null&&Bt(_)}return this.ut=r,De(e,o),P}}),Ht=()=>g`<svg
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
      class="af-textarea"
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
          </li>`:Je(e.items,n=>n.id,n=>qn(n,t))}
  </ul>
  <footer>
    ${i?m:g`
            <button class="af-btn" type="button" @click=${()=>t({kind:"copy",format:"json"})}>
              Copy JSON
            </button>
            <button class="af-btn" type="button" @click=${()=>t({kind:"copy",format:"brief"})}>
              Copy brief
            </button>
          `}
    <button
      class="af-btn af-btn--ghost"
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
        class="af-icon-btn"
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
`;class Ke extends O{static{this.styles=kn}static{this.properties={definition:{attribute:!1},state:{attribute:!1},navigation:{attribute:!1},derivation:{attribute:!1},issues:{attribute:!1},pendingTarget:{attribute:!1},onDelete:{attribute:!1},onClear:{attribute:!1},onComment:{attribute:!1},exportBrief:{attribute:!1},embedded:{type:Boolean}}}#e=xn();constructor(){super(),this.embedded=!1,this.definition=null,this.state=void 0,this.navigation={},this.derivation=null,this.issues=[],this.pendingTarget=null}willUpdate(t){t.has("pendingTarget")&&this.pendingTarget&&(this.#e=Pe(this.#e,{kind:"target-requested",ref:this.pendingTarget}))}updated(t){t.has("pendingTarget")&&this.pendingTarget&&this.isConnected&&this.renderRoot.querySelector("textarea")?.focus()}#s(){return!this.definition||!this.derivation?null:{definition:this.definition,state:this.state,navigation:this.navigation,derivation:this.derivation,issues:this.issues}}render(){const t=this.#s();return t?Ln(Le(t,this.#e),this.#a,this.embedded):m}#t(t){this.#e=Pe(this.#e,t),this.requestUpdate()}#a=t=>{switch(t.kind){case"delete":this.onDelete?.(t.id);return;case"clear":this.onClear?.();return;case"copy":this.#r(t.format);return;case"submit":{const i=this.#s();if(!i||!this.onComment)return;const n=$n(this.#e,Le(i,this.#e).target.ref);if(!n)return;const a=this.onComment(n.target,n.body);if(typeof a=="object"&&a!==null&&"ok"in a&&a.ok===!1)return;this.#t({kind:"submitted"});return}default:this.#t(t)}};async#r(t){const i=this.#s();if(!i)return;this.#t({kind:"copy-started",format:t});const n=this.#e.copyRequest;try{const a=t==="json"?Tt(i.derivation.actions):this.exportBrief?.()??qt({...i.derivation,navigation:i.navigation,issues:i.issues},i.definition,W),s=await Ue(a);this.isConnected&&this.#t({kind:"copy-finished",request:n,ok:s})}catch{this.isConnected&&this.#t({kind:"copy-finished",request:n,ok:!1})}}}const Bn=(e="artifact-comment-panel")=>{customElements.get(e)||customElements.define(e,Ke)},Ve=q(J({value:b(f(),L(/^element:.+/)),label:b(f(),v(1)),group:S(f())})),Hn=w({targets:Ve,providers:q(w({id:b(f(),v(1)),results:q(Te)}))}),In=J({target:b(f(),L(/^element:.+/)),body:b(f(),Ct(),v(1))}),We=e=>e.group?`${e.group} \xB7 ${e.label}`:e.label,Ze=(e,t,i)=>{const n=new Map(t.map(a=>[a.value,a]));return{...e,hasTarget:(a,s)=>e.hasTarget(a,s)||n.has(E(s)),commentTargets:(a,s)=>{const r=e.commentTargets(a,s),c=new Set(r.map(o=>o.value));return[...r,...t.filter(o=>!c.has(o.value))]},describe:(a,s,r)=>{if(j(a)){const d=i.get(a.id),p=n.get(E(a.target));return{title:d?.title??a.type,...d?.summary===void 0?{}:{summary:d.summary},tone:d?.tone??"update",targetLabel:p?We(p):a.target.id}}const c=e.describe(a,s,r),o=a.type==="comment"&&!e.hasTarget(s,a.target)?n.get(E(a.target)):void 0;return o===void 0?c:{...c,targetLabel:We(o)}},serialize:a=>j(a)?`${a.type} ${E(a.target)} ${JSON.stringify(a.payload)}`:e.serialize(a)}},Ye=typeof globalThis=="object"&&globalThis||typeof window=="object"&&window||typeof self=="object"&&self||typeof global=="object"&&global||(function(){return this})();function Qe(e){return typeof Ye.Buffer<"u"&&Ye.Buffer.isBuffer(e)}function Ge(e){if(!e||typeof e!="object")return!1;const t=Object.getPrototypeOf(e);return t===null||t===Object.prototype||Object.getPrototypeOf(t)===null?Object.prototype.toString.call(e)==="[object Object]":!1}function Xe(e){return Object.getOwnPropertySymbols(e).filter(t=>Object.prototype.propertyIsEnumerable.call(e,t))}function ti(e){return e==null?e===void 0?"[object Undefined]":"[object Null]":Object.prototype.toString.call(e)}const Dn="[object RegExp]",Fn="[object String]",Jn="[object Number]",Kn="[object Boolean]",Vn="[object Symbol]",Wn="[object Date]",Zn="[object Map]",Yn="[object Set]",Qn="[object Array]",Gn="[object Function]",Xn="[object ArrayBuffer]",It="[object Object]",ta="[object Error]",ea="[object DataView]",ia="[object Uint8Array]",na="[object Uint8ClampedArray]",aa="[object Uint16Array]",sa="[object Uint32Array]",ra="[object BigUint64Array]",oa="[object Int8Array]",ca="[object Int16Array]",la="[object Int32Array]",da="[object BigInt64Array]",pa="[object Float32Array]",ha="[object Float64Array]";function ua(e,t){return e===t||Number.isNaN(e)&&Number.isNaN(t)}function fa(e,t,i){return nt(e,t,void 0,void 0,void 0,void 0,i)}function nt(e,t,i,n,a,s,r){const c=r(e,t,i,n,a,s);if(c!==void 0)return c;if(typeof e==typeof t)switch(typeof e){case"bigint":case"string":case"boolean":case"symbol":case"undefined":return e===t;case"number":return e===t||Object.is(e,t);case"function":return e===t;case"object":return at(e,t,s,r)}return at(e,t,s,r)}function at(e,t,i,n){if(Object.is(e,t))return!0;let a=ti(e),s=ti(t);if(a==="[object Arguments]"&&(a=It),s==="[object Arguments]"&&(s=It),a!==s)return!1;switch(a){case Fn:return e.toString()===t.toString();case Jn:return ua(e.valueOf(),t.valueOf());case Kn:case Wn:case Vn:return Object.is(e.valueOf(),t.valueOf());case Dn:return e.source===t.source&&e.flags===t.flags;case Gn:return e===t}i=i??new Map;const r=i.get(e),c=i.get(t);if(r!=null&&c!=null)return r===t;i.set(e,t),i.set(t,e);try{switch(a){case Zn:if(e.size!==t.size)return!1;for(const[o,d]of e.entries())if(!t.has(o)||!nt(d,t.get(o),o,e,t,i,n))return!1;return!0;case Yn:{if(e.size!==t.size)return!1;const o=Array.from(e.values()),d=Array.from(t.values());for(let p=0;p<o.length;p++){const l=o[p],h=d.findIndex(u=>nt(l,u,void 0,e,t,i,n));if(h===-1)return!1;d.splice(h,1)}return!0}case Qn:case ia:case na:case aa:case sa:case ra:case oa:case ca:case la:case da:case pa:case ha:if(Qe(e)!==Qe(t)||e.length!==t.length)return!1;for(let o=0;o<e.length;o++)if(!nt(e[o],t[o],o,e,t,i,n))return!1;return!0;case Xn:return e.byteLength!==t.byteLength?!1:at(new Uint8Array(e),new Uint8Array(t),i,n);case ea:return e.byteLength!==t.byteLength||e.byteOffset!==t.byteOffset?!1:at(new Uint8Array(e),new Uint8Array(t),i,n);case ta:return e.name===t.name&&e.message===t.message;case It:{if(!(at(e.constructor,t.constructor,i,n)||Ge(e)&&Ge(t)))return!1;const o=[...Object.keys(e),...Xe(e)],d=[...Object.keys(t),...Xe(t)];if(o.length!==d.length)return!1;for(let p=0;p<o.length;p++){const l=o[p],h=e[l];if(!Object.hasOwn(t,l))return!1;const u=t[l];if(!nt(h,u,l,e,t,i,n))return!1}return!0}default:return!1}}finally{i.delete(e),i.delete(t)}}function ga(){}function vt(e,t){return fa(e,t,ga)}const ei="artifact",ii=e=>E(e),ni=(e,t,i,n=new Map)=>{let a=t;const s=[],r=[],c=[],o=[],d=new Map;for(const l of i){if(l.type===C)continue;if(j(l)){const y=n.get(l.id);y===void 0||y.stale!==void 0?r.push({action:l,reason:y?.stale??"target-missing"}):s.push(l);continue}const h=bt(e.actions,l.type);if(!h){r.push({action:l,reason:"unsupported-action-type"});continue}const u=e.apply(a,l);if(u===null){r.push({action:l,reason:e.hasTarget(a,l.target)?"constraint-violated":"target-missing"});continue}if(h.mode!=="append"&&Dt(e,a,u)){c.push(l);continue}a=u,s.push(l)}for(const l of i){if(l.type!==C)continue;if(l.target.type!==ei&&!e.hasTarget(a,l.target)){r.push({action:l,reason:"target-missing"});continue}o.push(l);const h=ii(l.target);d.set(h,[...d.get(h)??[],l])}const p=new Map(i.map((l,h)=>[l.id,h]));return r.sort((l,h)=>(p.get(l.action.id)??0)-(p.get(h.action.id)??0)),{base:t,state:a,actions:i,applied:s,stale:r,obsolete:c,comments:o,commentsByTarget:d}},Dt=(e,t,i)=>t===i?!0:e.canonicalState===void 0?vt(t,i):vt(e.canonicalState(t),e.canonicalState(i)),ai=e=>{const t=new Set(e.obsolete.map(i=>i.id));return e.actions.filter(i=>!t.has(i.id))},ma=(e,t,i,n)=>{let a=t;const s=n??si(a).map(r=>r.id);for(const r of[...s].reverse())a=ba(e,a,i,r,n!==void 0)??a;return a},si=e=>e.applied.filter(t=>!j(t)),ba=(e,t,i,n,a)=>{const s=si(t),r=s.findIndex(h=>h.id===n),c=s[r];if(c===void 0)return null;const o=s.slice(0,r),d=[...a?va(e,t.base,s,r):[],...ya(e,o,c)],p=new Set,l=d.filter(h=>{const u=h.join(" ");return p.has(u)?!1:(p.add(u),!0)}).sort((h,u)=>u.length-h.length);for(const h of l){const u=xa(e,t,i,h);if(u!==null)return u}return null},va=(e,t,i,n)=>{const a=[];let s=t;for(const r of i.slice(0,n+1))a.push(s),s=e.apply(s,r)??s;return a.flatMap((r,c)=>Dt(e,r,s)?[i.slice(c,n+1).map(o=>o.id)]:[])},ya=(e,t,i)=>{const n=ri(i),a=t.filter(o=>ri(o).some(d=>n.includes(d))),s=oi(e,i),r=a.filter(o=>oi(e,o)===s),c=o=>o.map((d,p)=>[...o.slice(p).map(l=>l.id),i.id]);return[...c(a),...c(r),...a.map(o=>[o.id,i.id]),...a.map(o=>[o.id])]},ri=e=>{const t=e.target.type===ei?[]:e.target.id.split("."),i=typeof e.payload=="object"&&e.payload!==null?Object.values(e.payload).filter(n=>typeof n=="string"&&n!==""):[];return[...t,...i]},oi=(e,t)=>bt(e.actions,t.type)?.mode,xa=(e,t,i,n)=>{const a=new Set(t.stale.map(r=>r.action.id)),s=new Set(n);for(;;){const r=i(t.actions.filter(o=>!s.has(o.id))),c=r.stale.filter(o=>!a.has(o.action.id)).map(o=>o.action);if(c.length===0)return Dt(e,r.state,t.state)?r:null;if(c.some(o=>o.type===C||j(o)))return null;for(const o of c)s.add(o.id)}},$a=w({v:F(1),template:b(f(),v(1)),actions:q(B())});class Ft{constructor(t){this.storage=t}load(t,i){try{const n=this.storage.getItem(t);if(n===null)return[];const a=$($a,JSON.parse(n));return!a.success||a.output.template!==i?[]:a.output.actions.flatMap(s=>{const r=$(K,s);return r.success?[r.output]:[]})}catch{return[]}}save(t,i,n){const a={v:1,template:i,actions:n};try{this.storage.setItem(t,JSON.stringify(a))}catch{}}clear(t){try{this.storage.removeItem(t)}catch{}}}class Jt{constructor(){this.store=new Map}load(t,i){return new Ft({getItem:n=>this.store.get(n)??null,setItem:(n,a)=>{this.store.set(n,a)},removeItem:n=>{this.store.delete(n)}}).load(t,i)}save(t,i,n){this.store.set(t,JSON.stringify({v:1,template:i,actions:n}))}clear(t){this.store.delete(t)}}const Kt=()=>{try{if(typeof localStorage<"u")return new Ft(localStorage)}catch{}return new Jt},ci=e=>`dev-process-kit:draft:${typeof location>"u"?"local":`${location.pathname}${location.search}`}:${e}`,ka=q(B());class li{#e;#s;#t={targets:[],providers:[]};#a=new Map;#r;#i;#n;#l;#d;#p=new Set;#f=[];#g=0;constructor(t){this.#e=t.definition,this.#s=Ze(t.definition,[],this.#a),this.#r=t.base,this.#d=t.storageKey??ci(t.definition.name),this.#l=t.storage===void 0?Kt():t.storage;const i=t.initialActions??this.#l?.load(this.#d,this.definition.name)??[];this.#i=pi(this.definition,i),this.#n=this.#o(this.#i),this.#k()&&this.#x()}get definition(){return this.#s}setComponentSnapshot(t){const i=we(Hn,t);if(!vt(i,this.#t)){this.#t=i,this.#m(),this.#n=this.#o(this.#i);for(const n of this.#p)n()}}#m(){this.#a=Ne(this.#i,this.#t.providers),this.#s=Ze(this.#e,this.#t.targets,this.#a)}#o(t){return ni(this.definition,this.#r,t,Ne(t,this.#t.providers))}get base(){return this.#r}get actions(){return this.#i}get derivation(){return this.#n}get lastIssues(){return this.#f}get prunedCount(){return this.#g}descriptorFor(t,i){return di(this.definition,t,i)}dispatch(t){const i=this.#v(t,this.#n.state);if(!i.ok)return this.#h([i.issue]);const n=this.descriptorFor(i.action.type,i.action.target);return n?(this.#c(Ot(this.#i,i.action,n),[i.action.id]),{ok:!0,id:i.action.id}):this.#h([{path:"type",message:"unknown action type"}])}dispatchBatch(t){const i=$(ka,t);if(!i.success)return this.#h([et(i.issues)]);const n=i.output;if(n.length===0)return{ok:!0,ids:[]};let a=this.#i,s=this.#n.state;const r=[];for(const c of n){const o=this.#v(c,s);if(!o.ok)return this.#h([o.issue]);const d=o.action,p=this.descriptorFor(d.type,d.target);if(!p)return this.#h([{path:"type",message:"unknown action type"}]);if((d.type==="comment"||j(d)?d.target.type==="artifact"||this.definition.hasTarget(s,d.target)?s:null:this.definition.apply(s,d))===null)return this.#h([{path:"target",message:"batch action is not applicable"}]);a=Ot(a,d,p),s=this.#o(a).state,r.push(d.id)}return this.#c(a,r),{ok:!0,ids:r}}#v(t,i){const n=$(Ee,t);if(!n.success)return{ok:!1,issue:et(n.issues)};const a=this.descriptorFor(n.output.type,typeof n.output.target=="string"?jt(n.output.target,"artifact"):n.output.target);if(!a)return{ok:!1,issue:{path:"type",message:`unknown action type "${n.output.type}"`}};const s=dn(n.output,a);if(!s.ok)return s;const r=this.definition.canonicalTarget?.(i,s.action.target)??s.action.target;return{ok:!0,action:{...s.action,target:r}}}#h(t){return this.#f=t,{ok:!1,issues:t}}removeAction(t){const i=this.#i.filter(n=>n.id!==t);i.length!==this.#i.length&&this.#c(i)}clearActions(){this.#i.length>0&&this.#c([])}replaceActions(t){this.#c(pi(this.definition,t))}setBase(t){this.#r=t,this.#c(this.#i)}subscribe(t){return this.#p.add(t),()=>{this.#p.delete(t)}}exportDraft(t){return{template:this.definition.name,frameworkVersion:t,exportedAt:new Date().toISOString(),actions:this.#i}}#c(t,i){this.#f=[],this.#i=t,this.#m(),this.#n=this.#o(this.#i),this.#k(i),this.#x();for(const n of this.#p)n()}#k(t){const i=this.#y(),n=ma(this.definition,this.#n,a=>this.#o(a),t);return n===this.#n?i:(this.#g+=this.#i.length-n.actions.length,this.#i=[...n.actions],this.#m(),this.#n=this.#o(this.#i),this.#y(),!0)}#y(){return this.#n.obsolete.length===0?!1:(this.#g+=this.#n.obsolete.length,this.#i=ai(this.#n),this.#m(),this.#n=this.#o(this.#i),!0)}#x(){this.#l?.save(this.#d,this.definition.name,this.#i)}}const di=(e,t,i)=>t==="comment"?je:i!==void 0&&j({type:t,target:i})?gn:bt(e.actions,t),pi=(e,t)=>t.flatMap(i=>{const n=$(K,i);if(!n.success)return[];const a=n.output,s=di(e,a.type,a.target);if(!s)return[];const r=$(s.schema,a);if(!r.success)return[];const c=$(K,r.output);return c.success?[c.output]:[]}),hi=e=>{const t=e.derivation();return{base:t.base,state:t.state,navigation:e.navigation(),actions:e.controller().actions,comments:t.comments,stale:t.stale,issues:e.issues()}},wa=e=>{const t=e.derivation();return{state:t.state,base:t.base,navigation:e.navigation(),actions:e.controller().actions,comments:t.comments,stale:t.stale,commentCount:i=>{const n=typeof i=="string"?i:E(i);return t.commentsByTarget.get(n)?.length??0},dispatch:i=>e.dispatch(i),dispatchBatch:i=>e.dispatchBatch(i),navigate:(i,n)=>e.navigate(i,n),hashFor:i=>e.hashFor(i),requestComment:i=>e.requestComment(i)}},Aa=(e,t)=>{const i=()=>hi(e);return{version:W,template:e.definition.name,host:t,ready:e.ready,get base(){return e.controller().base},get state(){return e.derivation().state},get navigation(){return e.navigation()},get actions(){return e.controller().actions},get comments(){return e.derivation().comments},get stale(){return e.derivation().stale},get issues(){return e.issues()},dispatch:n=>e.dispatch(n),dispatchBatch:n=>e.dispatchBatch(n),comment:(n,a)=>e.dispatch({type:C,target:n,payload:{body:a}}),removeAction:n=>e.removeAction(n),clearActions:()=>e.clearActions(),importDraft:n=>e.controller().replaceActions(n),navigate:(n,a)=>e.navigate(n,a),hashFor:n=>e.hashFor(n),snapshot:i,exportDraft:()=>e.controller().exportDraft(W),exportBrief:()=>qt(i(),e.controller().definition,W),subscribe:n=>e.subscribe(n)}},_a=(e,t)=>{const i=[],n=a=>{(a===e||a instanceof ShadowRoot)&&t?.(a);for(const s of a.children)s.hasAttribute("data-template")||(("commentTargets"in s||"elementActions"in s)&&i.push(s),n(s),s.shadowRoot&&n(s.shadowRoot))};return n(e),i},ui=(e,t)=>{const i=new Map;for(const n of e)i.set(t(n),(i.get(t(n))??0)+1);return e.filter(n=>i.get(t(n))===1)},fi=e=>ui(e.filter(t=>"elementActions"in t&&t.id.length>0),t=>t.id),gi=(e,t)=>{for(const i of fi(e)){const n=bn(t,i.id),a=Reflect.get(i,"elementActions");Array.isArray(a)&&a.length===n.length&&n.every((s,r)=>{const c=a[r];return typeof c=="object"&&c!==null&&"id"in c&&c.id===s.id})||Reflect.set(i,"elementActions",n)}},Sa=e=>{const t=Reflect.get(e,"elementActionResults");return Array.isArray(t)?t.flatMap(i=>{const n=$(Te,i);return n.success?[n.output]:[]}):[]},Ea=e=>{const t=[];for(const i of e){if(!("commentTargets"in i))continue;const n=$(Ve,i.commentTargets);n.success&&t.push(...n.output)}return{targets:ui(t,i=>i.value),providers:fi(e).map(i=>({id:i.id,results:Sa(i)}))}},mi=()=>Rt(typeof location>"u"?"":location.hash),Ca=(e,t)=>{if(typeof history>"u")return;const i=`${location.pathname}${location.search}${V(e)}`;`${location.pathname}${location.search}${location.hash}`!==i&&(t?history.replaceState(null,"",i):history.pushState(null,"",i))};class ja{#e;#s=null;#t=0;constructor(t){this.#e=t}get orphans(){return this.#t}route(){const t=this.#e.renderRoot,i=ht(t.querySelector('slot[name="preview"]'),HTMLSlotElement);if(i===null)return;this.#s!==i&&(this.#s=i,i.addEventListener("slotchange",this.#a));const n=new Set(Array.from(t.querySelectorAll("slot")).map(s=>s.getAttribute("name")??"")),a=i.assignedElements();for(const s of a){const r=s.getAttribute("data-preview-id");if(!r)continue;const c=`preview:${r}`;s.getAttribute("slot")!==c&&n.has(c)&&s.setAttribute("slot",c)}a.length!==this.#t&&(this.#t=a.length,queueMicrotask(()=>this.#e.requestUpdate()))}#a=()=>{queueMicrotask(()=>this.route())}}const Ma=[dt,pt,N`
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
  `];class Oa extends O{static{this.styles=Ma}static{this.properties={storageKey:{type:String,attribute:"storage-key"},storage:{type:String},notes:{type:String},notesOpen:{state:!0}}}#e=!1;#s=new ja(this);#t;#a=Pt;#r=null;#i=new Set;#n=null;#l;#d;#p;#f=[];#g;#m=new Promise(t=>{this.#g=t});#o;connectedCallback(){super.connectedCallback(),this.dataset.template=this.definition.name,this.#e||(this.#e=!0,this.notesOpen=this.notes==="on"||this.notes==="open"),this.#v(),window.addEventListener("hashchange",this.#A),this.addEventListener("click",this.#C),this.addEventListener("artifact-comment-targets-change",this.#u),this.addEventListener("artifact-comment-request",this.#_),this.addEventListener("artifact-comment-submit",this.#S),this.addEventListener("artifact-element-action",this.#E),this.#p??=new MutationObserver(this.#u),this.#u()}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("hashchange",this.#A),this.removeEventListener("click",this.#C),this.#d?.disconnect(),this.#p?.disconnect(),this.removeEventListener("artifact-comment-targets-change",this.#u),this.removeEventListener("artifact-comment-request",this.#_),this.removeEventListener("artifact-comment-submit",this.#S),this.removeEventListener("artifact-element-action",this.#E)}#v(t=0){if(this.#t){this.#h();return}if(this.childNodes.length===0&&t<2){queueMicrotask(()=>this.#v(t+1));return}this.#j()}#h(){this.#l||(this.#l=this.#t?.subscribe(()=>this.#N()))}updated(){this.#U()}get artifact(){return this.#o??=this.#k(),this.#o}get controller(){if(!this.#t)throw new Error(`<${this.tagName.toLowerCase()}> is not initialized yet`);return this.#t}get derivation(){return this.controller.derivation}get navigation(){return this.#a}dispatch(t){const i=this.controller.dispatch(t);return i.ok||(this.requestUpdate(),this.dispatchEvent(new CustomEvent("artifact-error",{detail:{issues:i.issues},bubbles:!0,composed:!0})),this.#b()),i}dispatchBatch(t){const i=this.controller.dispatchBatch(t);return i.ok||(this.requestUpdate(),this.dispatchEvent(new CustomEvent("artifact-error",{detail:{issues:i.issues},bubbles:!0,composed:!0})),this.#b()),i}removeAction(t){this.controller.removeAction(t)}clearActions(){this.controller.clearActions()}navigate(t,i={}){const n=V(this.#$());this.#a=Lt(this.#a,t),this.#w(i.replace??!1);const a=V(this.#$());this.requestUpdate(),n!==a&&(this.#b(),this.dispatchEvent(new CustomEvent("artifact-navigate",{detail:{navigation:this.#a},bubbles:!0,composed:!0})))}hashFor(t){const i=this.#$();return V(this.definition.resolveNavigation(this.derivation.state,Lt(i,t)))}requestComment(t){this.#r=typeof t=="string"?t:E(t),this.notesOpen=!0,this.requestUpdate()}get integratedReview(){return!1}renderReviewPanel(t){return g`<artifact-comment-panel
      .definition=${this.controller.definition}
      .state=${t.state}
      .navigation=${t.navigation}
      .derivation=${this.derivation}
      .issues=${this.controller.lastIssues}
      .exportBrief=${()=>this.artifact.exportBrief()}
      .pendingTarget=${this.#r}
      .embedded=${this.integratedReview}
      .onDelete=${i=>this.removeAction(i)}
      .onClear=${()=>this.clearActions()}
      .onComment=${(i,n)=>{const a=this.dispatch({type:C,target:i,payload:{body:n}});return a.ok&&(this.#r=null),a}}
    ></artifact-comment-panel>`}renderChrome(t,i){const n=t.actions.length,a=t.comments.length;return g`
      <div class="af-shell">
        <header class="af-header">
          <div class="af-title">
            <span class="af-template-mark">${this.definition.label}</span>
            <h1>${this.definition.title(t.state)}</h1>
          </div>
          <div class="af-header-slot">
            ${i.header??m}
            <slot name="header"></slot>
          </div>
          <div class="af-header-meta">
            <span>dev-process-kit@${W}</span>
            <span>${this.definition.name}</span>
            <span>${n} draft · ${a} note</span>
          </div>
        </header>
        <div class="af-body">
          <aside class="af-sidebar" ?hidden=${i.sidebarHidden||!i.sidebar&&!this.hasSidebarContent()}>
            ${i.sidebar??m}
            <slot name="sidebar"></slot>
          </aside>
          <main class="af-main">
            <div class="af-main-body">
              ${this.#n?g`<div class="af-banner" role="alert">
                      <strong>base data を読み込めませんでした（空の Artifact として表示中）</strong>
                      <code>${this.#n}</code>
                    </div>`:m}
              ${i.main??m}
              <slot name="main"></slot>
              <section class="af-orphans" ?hidden=${this.#s.orphans===0}>
                <p class="af-label">previews without metadata</p>
                <slot name="preview"></slot>
              </section>
            </div>
            <div class="af-memo" ?hidden=${!this.hasMemoContent()}>
              <slot name="memo"></slot>
            </div>
          </main>
          ${this.integratedReview?m:g`<aside class="af-notes" ?hidden=${!this.notesOpen}>${this.renderReviewPanel(t)}</aside>`}
        </div>
        ${i.footer||this.hasFooterContent()?g`<footer class="af-footer">
                ${i.footer??m}
                <slot name="footer"></slot>
              </footer>`:m}
        ${this.integratedReview?m:g`<button
                class="af-fab"
                type="button"
                aria-expanded=${this.notesOpen?"true":"false"}
                title="レビュー / コメント"
                @click=${()=>{this.notesOpen=!this.notesOpen}}
              >
                <span class="af-fab-icon" aria-hidden="true"></span>
                <span
                  class="af-label"
                  style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)"
                >
                  レビュー
                </span>
                ${n>0?g`<span class="af-fab-badge">${n}</span>`:m}
              </button>`}
      </div>
    `}render(){if(!this.#t)return m;const t=this.#x();return this.renderChrome(t,this.renderRegions(t))}hasSidebarContent(){return this.querySelector('[slot="sidebar"]')!==null}hasMemoContent(){return this.querySelector('[slot="memo"]')!==null}hasFooterContent(){return this.querySelector('[slot="footer"]')!==null}context(){return this.#x()}#c(){return{definition:this.definition,controller:()=>this.controller,derivation:()=>this.derivation,ready:this.#m,navigation:()=>this.#$(),issues:()=>this.controller.lastIssues,dispatch:t=>this.dispatch(t),dispatchBatch:t=>this.dispatchBatch(t),subscribe:t=>(this.#i.add(t),()=>{this.#i.delete(t)}),removeAction:t=>this.removeAction(t),clearActions:()=>this.clearActions(),navigate:(t,i)=>this.navigate(t,i),hashFor:t=>this.hashFor(t),requestComment:t=>this.requestComment(t)}}#k(){return Aa(this.#c(),this)}#y(){return hi(this.#c())}#x(){return wa(this.#c())}#$(){return this.definition.resolveNavigation(this.derivation.state,this.#a)}#j(){const t=this.#O();this.#a=mi();const i=this.storageKey;this.#t=new li({definition:this.definition,base:t,storage:this.#M(),...typeof i=="string"?{storageKey:i}:{}}),this.#h(),this.#u(),this.#w(!0),this.#g?.(),this.#T(),this.requestUpdate()}#M(){return this.storage==="off"?null:this.storage==="memory"?new Jt:Kt()}#O(){const t=this.querySelector('script[type="application/json"]');if(!t?.textContent||t.textContent.trim().length===0)return console.warn(`[dev-process-kit] <${this.tagName.toLowerCase()}> has no base JSON; starting from an empty artifact.`),this.#n='no <script type="application/json"> child found',this.definition.emptyBase();try{return this.definition.parseBase(JSON.parse(t.textContent))}catch(i){return console.error("[dev-process-kit] invalid base data:",i),this.#n=i instanceof Error?i.message:String(i),this.definition.emptyBase()}}#T(){this.querySelector('script[type="application/json"]')||(this.#d=new MutationObserver(()=>{const t=this.querySelector('script[type="application/json"]');if(t){this.#d?.disconnect(),this.#d=void 0;try{this.controller.setBase(this.definition.parseBase(JSON.parse(t.textContent??"null")))}catch(i){console.error("[dev-process-kit] invalid base data:",i)}}}),this.#d.observe(this,{childList:!0,subtree:!0}))}#b(){const t=this.#y();for(const i of this.#i)i(t)}#N(){if(!this.isConnected){this.requestUpdate(),this.#b();return}this.#w(!0),gi(this.#f,this.controller.actions),queueMicrotask(this.#u),this.requestUpdate(),this.#b(),this.dispatchEvent(new CustomEvent("artifact-change",{detail:this.#y(),bubbles:!0,composed:!0}))}#w(t){const i=this.#$();this.#a=i,Ca(i,t)}#A=()=>{this.#a=mi(),this.#w(!0),this.requestUpdate(),this.#b(),this.dispatchEvent(new CustomEvent("artifact-navigate",{detail:{navigation:this.#a},bubbles:!0,composed:!0}))};#u=()=>{this.#p?.disconnect(),this.#f=_a(this,t=>{this.isConnected&&this.#p?.observe(t,{childList:!0,subtree:!0})}),this.#t&&(gi(this.#f,this.#t.actions),this.#t.setComponentSnapshot(Ea(this.#f)))};#_=t=>{if(t.stopPropagation(),!(t instanceof CustomEvent)||!this.#t)return;const i=t.detail;typeof i!="object"||i===null||!("target"in i)||typeof i.target!="string"||(this.#u(),!this.controller.definition.commentTargets(this.derivation.state,this.navigation).some(n=>n.value===i.target))||this.requestComment(i.target)};#S=t=>{if(t.stopPropagation(),!(t instanceof CustomEvent)||!t.cancelable||!this.#t)return;const i=$(In,t.detail);if(!i.success)return;this.#u();const{target:n,body:a}=i.output;this.controller.definition.commentTargets(this.derivation.state,this.navigation).some(s=>s.value===n)&&this.dispatch({type:C,target:n,payload:{body:a}}).ok&&t.preventDefault()};#E=t=>{if(t.stopPropagation(),!(t instanceof CustomEvent)||!t.cancelable||!this.#t)return;const i=$(mn,t.detail);if(!i.success)return;this.#u();const{type:n,target:a,payload:s}=i.output;this.controller.definition.commentTargets(this.derivation.state,this.navigation).some(r=>r.value===a)&&this.dispatch({type:n,target:a,payload:s}).ok&&t.preventDefault()};#C=t=>{for(const i of t.composedPath()){if(!(i instanceof Element))continue;if(i===this||i.hasAttribute("data-template"))break;const n=i.getAttribute("data-artifact-navigate");if(n!==null){t.preventDefault(),this.navigate(Rt(n.includes("=")?n:`step=${n}`));return}const a=i.getAttribute("data-artifact-comment");if(a!==null){t.preventDefault(),this.requestComment(a);return}}};#U(){this.#s.route()}}const Ta=(e,t)=>{typeof window>"u"||Object.assign(window,{artifactFramework:{version:e,templates:t}})};export{Bi as $,Ke as A,Ht as B,C,jn as D,Pt as E,W as F,Tn as G,Mn as H,Nn as I,Cn as J,On as K,En as L,Jt as M,ai as N,Rt as O,Ae as P,nn as Q,Lt as R,an as S,Tt as T,_e as U,E as V,Ft as W,mt as X,jt as Y,dt as Z,vt as _,Ta as a,N as a0,m as a1,g as a2,Je as a3,ji as a4,O as a5,Pn as a6,Rn as a7,we as a8,J as a9,ft as aa,q as ab,f as ac,gt as ad,b as ae,v as af,ve as ag,ke as ah,B as ai,F as aj,ge as ak,$ as al,w as am,me as an,Ct as ao,ue as ap,he as aq,be as ar,S as as,Xi as at,ht as au,Ue as av,tn as aw,qe as ax,Be as ay,De as az,li as b,Oa as c,pe as d,je as e,Ot as f,sn as g,qt as h,Ce as i,Nt as j,ii as k,pt as l,Se as m,ln as n,Mt as o,Kt as p,ci as q,en as r,Bn as s,Hi as t,ni as u,K as v,on as w,V as x,zn as y,Un as z};
