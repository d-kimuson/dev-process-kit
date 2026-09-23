import{r as v,am as f,w as Y,ar as x,ac as l,at as D,ae as u,af as g,as as L,a8 as Yt,aw as Lt,a9 as A,aa as C,ab as P,Q as Ct,g as Pt,V as O,S as m,a0 as H,a5 as Vt,l as Ut,$ as J,a1 as $,a2 as c,J as qt,D as zt,L as Bt,j as jt,n as N,a3 as I,K as Kt,G as Gt,au as Ft,c as X}from"./shared-BpZBcqrz.js";import{s as Ht,D as Jt}from"./shared-LG2yyayn.js";import{P as Q,r as Xt,p as Qt,a as Wt}from"./shared-C1mDZfwx.js";import{o as V}from"./shared-D0F9d4gi.js";const p={SET_ACTIVITY_NAME:v("SET_ACTIVITY_NAME","activity",f({name:u(l(),g(1))})),SET_STEP_NAME:v("SET_STEP_NAME","step",f({name:u(l(),g(1))})),REORDER_STEP:v("REORDER_STEP","step",f({after:x(l())}),{mode:"sequence"}),ADD_ACTIVITY:v("ADD_ACTIVITY","artifact",f({id:D,name:u(l(),g(1))}),{dedupeKey:Y}),ADD_STEP:v("ADD_STEP","activity",f({id:D,name:u(l(),g(1))}),{dedupeKey:Y}),DELETE_ACTIVITY:v("DELETE_ACTIVITY","activity",f({})),DELETE_STEP:v("DELETE_STEP","step",f({})),SET_STORY_NAME:v("SET_STORY_NAME","story",f({name:u(l(),g(1))})),SET_STORY_DESCRIPTION:v("SET_STORY_DESCRIPTION","story",f({description:l()})),SET_STORY_MILESTONE:v("SET_STORY_MILESTONE","story",f({milestoneId:x(l())})),MOVE_STORY:v("MOVE_STORY","story",f({activityId:u(l(),g(1)),stepId:u(l(),g(1)),milestoneId:x(l()),after:x(l())}),{mode:"sequence"}),REORDER_STORY:v("REORDER_STORY","story",f({after:x(l())}),{mode:"sequence"}),ADD_STORY:v("ADD_STORY","step",f({id:D,name:u(l(),g(1)),activityId:u(l(),g(1)),milestoneId:L(l())}),{dedupeKey:Y}),DELETE_STORY:v("DELETE_STORY","story",f({})),SET_MILESTONE_NAME:v("SET_MILESTONE_NAME","milestone",f({name:u(l(),g(1))})),ADD_MILESTONE:v("ADD_MILESTONE","artifact",f({id:D,name:u(l(),g(1))}),{dedupeKey:Y}),DELETE_MILESTONE:v("DELETE_MILESTONE","milestone",f({})),REORDER_MILESTONE:v("REORDER_MILESTONE","milestone",f({after:x(l())}),{mode:"sequence"})},Zt={setActivityName:(t,e)=>({type:"SET_ACTIVITY_NAME",target:{type:"activity",id:t},payload:{name:e}}),setStepName:(t,e)=>({type:"SET_STEP_NAME",target:{type:"step",id:t},payload:{name:e}})},te=A({id:u(l(),g(1)),name:u(l(),g(1))}),ee=A({id:D,name:u(l(),g(1)),steps:C(P(te),[])}),ae=A({id:u(l(),g(1)),name:u(l(),g(1))}),ie=A({id:D,name:u(l(),g(1)),description:L(l()),activityId:u(l(),g(1)),stepId:u(l(),g(1)),milestoneId:L(l())}),se=A({title:L(l()),activities:C(P(ee),[]),milestones:C(P(ae),[]),stories:C(P(ie),[])}),W=t=>{const e=Yt(se,t),a=new Map;for(const n of e.activities)for(const o of n.steps)a.set(o.id,n.id);const i=new Set(e.milestones.map(n=>n.id)),s=new Set,r=(n,o)=>{if(s.has(o))throw new Error(`duplicate id "${o}" in ${n}`);s.add(o)};for(const n of e.activities){r("activities",n.id);for(const o of n.steps)r("steps",o.id)}for(const n of e.milestones)r("milestones",n.id);for(const n of e.stories){r("stories",n.id);const o=a.get(n.stepId);if(o===void 0||o!==n.activityId)throw new Error(`story "${n.id}" references unknown activityId/stepId`);if(n.milestoneId!==void 0&&!i.has(n.milestoneId))throw new Error(`story "${n.id}" references unknown milestoneId "${n.milestoneId}"`)}return e},Z=()=>({activities:[],milestones:[],stories:[]}),R=(t,e)=>{if(e!==void 0)return t.activities.find(a=>a.id===e)},B=(t,e)=>`${t}.${e}`,h=(t,e)=>{if(e===void 0)return;const a=Lt(e,2);if(a){const[i,s]=a;if(i===void 0||s===void 0)return;const r=t.activities.find(o=>o.id===i),n=r?.steps.find(o=>o.id===s);return r&&n?{activity:r,step:n}:void 0}if(!e.includes("."))for(const i of t.activities){const s=i.steps.find(r=>r.id===e);if(s)return{activity:i,step:s}}},S=(t,e)=>{if(e!==void 0)return t.milestones.find(a=>a.id===e)},b=(t,e)=>{if(e!==void 0)return t.stories.find(a=>a.id===e)},tt=t=>t.activities.flatMap(e=>e.steps.map(a=>({activity:e,step:a}))),re=t=>({...t,stories:Ht(t.stories,[e=>`${e.activityId}/${e.stepId}/${e.milestoneId??""}`])}),U=(t,e,a)=>t.stories.filter(i=>i.stepId===e&&(i.milestoneId??void 0)===a),et=(t,e,a)=>t.stories.filter(i=>i.activityId===e&&(i.milestoneId??void 0)===a),k=t=>[...t.activities.map(e=>e.id),...t.activities.flatMap(e=>e.steps.map(a=>a.id)),...t.milestones.map(e=>e.id),...t.stories.map(e=>e.id)],ne=(t,e)=>t.stories.filter(a=>a.stepId===e).length,at=(t,e)=>{const a=Ct(p,e);if(a===null)return null;const i=a.target.id;switch(a.type){case"SET_ACTIVITY_NAME":{const{name:s}=a.payload;return t.activities.some(r=>r.id===i)?{...t,activities:t.activities.map(r=>r.id===i?{...r,name:s}:r)}:null}case"SET_STEP_NAME":{const{name:s}=a.payload,r=h(t,i);return r?{...t,activities:t.activities.map(n=>n.id===r.activity.id?{...n,steps:n.steps.map(o=>o.id===r.step.id?{...o,name:s}:o)}:n)}:null}case"REORDER_STEP":{const{after:s}=a.payload,r=h(t,i);if(!r)return null;const n=s===null?null:h(t,s);if(s!==null&&(!n||n.activity.id!==r.activity.id))return null;const o=st(r.activity.steps,r.step.id,n?.step.id??null);return o===null?null:{...t,activities:t.activities.map(d=>d.id===r.activity.id?{...d,steps:o}:d)}}case"ADD_ACTIVITY":{const s=a.payload;return t.activities.some(r=>r.id===s.id)?t:{...t,activities:[...t.activities,{id:s.id,name:s.name,steps:[]}]}}case"ADD_STEP":{const s=a.payload,r=t.activities.find(n=>n.id===i);return r?r.steps.some(n=>n.id===s.id)?t:{...t,activities:t.activities.map(n=>n.id===i?{...n,steps:[...n.steps,{id:s.id,name:s.name}]}:n)}:null}case"DELETE_ACTIVITY":{const s=t.activities.find(n=>n.id===i);if(!s)return null;const r=new Set(s.steps.map(n=>n.id));return{...t,activities:t.activities.filter(n=>n.id!==i),stories:t.stories.filter(n=>n.activityId!==i&&!r.has(n.stepId))}}case"DELETE_STEP":{const s=h(t,i);return s?{...t,activities:t.activities.map(r=>r.id===s.activity.id?{...r,steps:r.steps.filter(n=>n.id!==s.step.id)}:r),stories:t.stories.filter(r=>r.activityId!==s.activity.id||r.stepId!==s.step.id)}:null}case"SET_STORY_NAME":{const{name:s}=a.payload;return j(t,i,r=>({...r,name:s}))}case"SET_STORY_DESCRIPTION":{const{description:s}=a.payload;return j(t,i,r=>({...r,description:s}))}case"SET_STORY_MILESTONE":{const{milestoneId:s}=a.payload;return s!==null&&!S(t,s)?null:j(t,i,r=>s===null?K(r):{...r,milestoneId:s})}case"MOVE_STORY":{const s=a.payload,r=b(t,i);if(!r)return null;const n=h(t,s.stepId);if(!n||n.activity.id!==s.activityId||s.milestoneId!==null&&!S(t,s.milestoneId))return null;const o=s.milestoneId??void 0,d=o===void 0?{...K(r),activityId:n.activity.id,stepId:n.step.id}:{...r,activityId:n.activity.id,stepId:n.step.id,milestoneId:o};return it(t,d,s.after)}case"REORDER_STORY":{const{after:s}=a.payload,r=b(t,i);return r?it(t,r,s,!0):null}case"ADD_STORY":{const s=a.payload,r=h(t,e.target.id);if(!r||r.activity.id!==s.activityId||s.milestoneId!==void 0&&!S(t,s.milestoneId))return null;if(t.stories.some(o=>o.id===s.id))return t;const n={id:s.id,name:s.name,activityId:s.activityId,stepId:r.step.id,...s.milestoneId===void 0?{}:{milestoneId:s.milestoneId}};return{...t,stories:[...t.stories,n]}}case"DELETE_STORY":return t.stories.some(s=>s.id===i)?{...t,stories:t.stories.filter(s=>s.id!==i)}:null;case"SET_MILESTONE_NAME":{const{name:s}=a.payload;return t.milestones.some(r=>r.id===i)?{...t,milestones:t.milestones.map(r=>r.id===i?{...r,name:s}:r)}:null}case"ADD_MILESTONE":{const s=a.payload;return t.milestones.some(r=>r.id===s.id)?t:{...t,milestones:[...t.milestones,{id:s.id,name:s.name}]}}case"DELETE_MILESTONE":return t.milestones.some(s=>s.id===i)?{...t,milestones:t.milestones.filter(s=>s.id!==i),stories:t.stories.map(s=>s.milestoneId===i?K(s):s)}:null;case"REORDER_MILESTONE":{const{after:s}=a.payload,r=st(t.milestones,i,s);return r===null?null:{...t,milestones:r}}default:return Pt(a)}},j=(t,e,a)=>t.stories.some(i=>i.id===e)?{...t,stories:t.stories.map(i=>i.id===e?a(i):i)}:null,K=t=>{const{milestoneId:e,...a}=t;return a},it=(t,e,a,i=!1)=>{const s=e.milestoneId??void 0,r=t.stories.filter(y=>y.id!==e.id),n=r.filter(y=>y.stepId===e.stepId&&(y.milestoneId??void 0)===s);if(a!==null){const y=r.find(M=>M.id===a);if(!y||y.stepId!==e.stepId||(y.milestoneId??void 0)!==s)return null;if(i){const M=b(t,e.id);if(!M||y.stepId!==M.stepId||(y.milestoneId??void 0)!==(M.milestoneId??void 0))return null}}const o=a===null?[e,...n]:rt(n,e,a),d=r.findIndex(y=>y.stepId===e.stepId&&(y.milestoneId??void 0)===s),_=new Set(n.map(y=>y.id)),E=r.filter(y=>!_.has(y.id)),T=d<0?E.length:Math.min(d,E.length),Nt=[...E.slice(0,T),...o,...E.slice(T)];return{...t,stories:Nt}},st=(t,e,a)=>{if(!t.some(r=>r.id===e)||a!==null&&!t.some(r=>r.id===a))return null;if(a===e)return[...t];const i=t.find(r=>r.id===e);if(i===void 0)return null;const s=t.filter(r=>r.id!==e);return rt(s,i,a)},rt=(t,e,a)=>{const i=[...t],s=a===null?-1:i.findIndex(r=>r.id===a);return i.splice(s+1,0,e),i},q=(t,e)=>{const a=typeof e=="string"?e:"",i=typeof t=="string"?t:void 0;return i===void 0?`\u2192 \u300C${a}\u300D`:`\u300C${i}\u300D\u2192\u300C${a}\u300D`},oe={SET_ACTIVITY_NAME:(t,e)=>({title:"\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3\u540D\u3092\u5909\u66F4",tone:"update",body:q(R(e,t.target.id)?.name,m(p.SET_ACTIVITY_NAME,t).name??"")}),SET_STEP_NAME:(t,e)=>({title:"\u30B9\u30C6\u30C3\u30D7\u540D\u3092\u5909\u66F4",tone:"update",body:q(h(e,t.target.id)?.step.name,m(p.SET_STEP_NAME,t).name??"")}),REORDER_STEP:t=>({title:"\u30B9\u30C6\u30C3\u30D7\u306E\u9806\u5E8F\u3092\u5909\u66F4",tone:"move",body:m(p.REORDER_STEP,t).after===null||m(p.REORDER_STEP,t).after===void 0?"\u2192 \u5148\u982D\u3078":`\u2192 \u300C${String(m(p.REORDER_STEP,t).after)}\u300D\u306E\u76F4\u5F8C\u3078`}),ADD_ACTIVITY:t=>({title:"\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3\u3092\u8FFD\u52A0",tone:"create",body:`+ \u300C${m(p.ADD_ACTIVITY,t).name??""}\u300D`}),ADD_STEP:t=>({title:"\u30B9\u30C6\u30C3\u30D7\u3092\u8FFD\u52A0",tone:"create",body:`+ \u300C${m(p.ADD_STEP,t).name??""}\u300D`}),DELETE_ACTIVITY:(t,e)=>({title:"\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3\u3092\u524A\u9664",tone:"delete",body:`\u2212 \u300C${R(e,t.target.id)?.name??t.target.id}\u300D`}),DELETE_STEP:(t,e)=>({title:"\u30B9\u30C6\u30C3\u30D7\u3092\u524A\u9664",tone:"delete",body:`\u2212 \u300C${h(e,t.target.id)?.step.name??t.target.id}\u300D`}),SET_STORY_NAME:(t,e)=>({title:"\u30B9\u30C8\u30FC\u30EA\u30FC\u540D\u3092\u5909\u66F4",tone:"update",body:q(b(e,t.target.id)?.name,m(p.SET_STORY_NAME,t).name??"")}),SET_STORY_DESCRIPTION:t=>({title:"\u30B9\u30C8\u30FC\u30EA\u30FC\u306E\u8AAC\u660E\u3092\u66F4\u65B0",tone:"update",body:`\u2192 \u300C${String(m(p.SET_STORY_DESCRIPTION,t).description??"").slice(0,90)}\u300D`}),SET_STORY_MILESTONE:(t,e)=>({title:"\u30DE\u30A4\u30EB\u30B9\u30C8\u30FC\u30F3\u3092\u5909\u66F4",tone:"move",body:m(p.SET_STORY_MILESTONE,t).milestoneId===null||m(p.SET_STORY_MILESTONE,t).milestoneId===void 0?"\u2192 \u672A\u5272\u5F53\u3078":`\u2192 ${S(e,String(m(p.SET_STORY_MILESTONE,t).milestoneId))?.name??String(m(p.SET_STORY_MILESTONE,t).milestoneId)}`}),MOVE_STORY:(t,e)=>({title:"\u30B9\u30C8\u30FC\u30EA\u30FC\u3092\u79FB\u52D5",tone:"move",body:`\u2192 ${h(e,String(m(p.MOVE_STORY,t).stepId))?.step.name??String(m(p.MOVE_STORY,t).stepId??"")}`}),REORDER_STORY:t=>({title:"\u30B9\u30C8\u30FC\u30EA\u30FC\u306E\u9806\u5E8F\u3092\u5909\u66F4",tone:"move",body:m(p.REORDER_STORY,t).after===null||m(p.REORDER_STORY,t).after===void 0?"\u2192 \u5148\u982D\u3078":`\u2192 \u300C${String(m(p.REORDER_STORY,t).after)}\u300D\u306E\u76F4\u5F8C\u3078`}),ADD_STORY:t=>({title:"\u30B9\u30C8\u30FC\u30EA\u30FC\u3092\u8FFD\u52A0",tone:"create",body:`+ \u300C${m(p.ADD_STORY,t).name??""}\u300D`}),DELETE_STORY:(t,e)=>({title:"\u30B9\u30C8\u30FC\u30EA\u30FC\u3092\u524A\u9664",tone:"delete",body:`\u2212 \u300C${b(e,t.target.id)?.name??t.target.id}\u300D`}),SET_MILESTONE_NAME:(t,e)=>({title:"\u30DE\u30A4\u30EB\u30B9\u30C8\u30FC\u30F3\u540D\u3092\u5909\u66F4",tone:"update",body:q(S(e,t.target.id)?.name,m(p.SET_MILESTONE_NAME,t).name??"")}),ADD_MILESTONE:t=>({title:"\u30DE\u30A4\u30EB\u30B9\u30C8\u30FC\u30F3\u3092\u8FFD\u52A0",tone:"create",body:`+ \u300C${m(p.ADD_MILESTONE,t).name??""}\u300D`}),DELETE_MILESTONE:(t,e)=>({title:"\u30DE\u30A4\u30EB\u30B9\u30C8\u30FC\u30F3\u3092\u524A\u9664",tone:"delete",body:`\u2212 \u300C${S(e,t.target.id)?.name??t.target.id}\u300D`}),REORDER_MILESTONE:t=>({title:"\u30DE\u30A4\u30EB\u30B9\u30C8\u30FC\u30F3\u306E\u9806\u5E8F\u3092\u5909\u66F4",tone:"move",body:m(p.REORDER_MILESTONE,t).after===null||m(p.REORDER_MILESTONE,t).after===void 0?"\u2192 \u5148\u982D\u3078":`\u2192 \u300C${String(m(p.REORDER_MILESTONE,t).after)}\u300D\u306E\u76F4\u5F8C\u3078`})},nt=(t,e,a)=>{let i;try{const s=oe[t.type];i=s?s(t,a??e):{title:t.type,tone:"meta"}}catch{i={title:t.type,tone:"meta"}}return{title:i.title,targetLabel:dt(e,t.target),tone:i.tone,...i.body===void 0?{}:{summary:i.body}}},ot=t=>`${t.type} ${O(t.target)} ${JSON.stringify(t.payload)}`,dt=(t,e)=>{try{switch(e.type){case"activity":{const a=R(t,e.id);return a?`\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3 \xB7 ${a.name}`:`\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3 \xB7 ${e.id} (missing)`}case"step":{const a=h(t,e.id)?.step;return a?`\u30B9\u30C6\u30C3\u30D7 \xB7 ${a.name}`:`\u30B9\u30C6\u30C3\u30D7 \xB7 ${e.id} (missing)`}case"story":{const a=b(t,e.id);return a?`\u30B9\u30C8\u30FC\u30EA\u30FC \xB7 ${a.name}`:`\u30B9\u30C8\u30FC\u30EA\u30FC \xB7 ${e.id} (missing)`}case"milestone":{const a=S(t,e.id);return a?`\u30DE\u30A4\u30EB\u30B9\u30C8\u30FC\u30F3 \xB7 ${a.name}`:`\u30DE\u30A4\u30EB\u30B9\u30C8\u30FC\u30F3 \xB7 ${e.id} (missing)`}case"artifact":return`\u30DE\u30C3\u30D7 \xB7 ${G(t)}`;default:return`${e.type} \xB7 ${e.id}`}}catch{return`${e.type} \xB7 ${e.id}`}},lt=(t,e)=>{const a=[{value:"artifact:usm",label:"\u30DE\u30C3\u30D7\u5168\u4F53",group:"\u30DE\u30C3\u30D7"}];for(const i of t.activities){a.push({value:O({type:"activity",id:i.id}),label:i.name,group:"\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3"});for(const s of i.steps)a.push({value:O({type:"step",id:B(i.id,s.id)}),label:`${i.name} \u203A ${s.name}`,group:"\u30B9\u30C6\u30C3\u30D7"})}for(const i of t.milestones)a.push({value:O({type:"milestone",id:i.id}),label:i.name,group:"\u30DE\u30A4\u30EB\u30B9\u30C8\u30FC\u30F3"});for(const i of t.stories)a.push({value:O({type:"story",id:i.id}),label:i.name,group:"\u30B9\u30C8\u30FC\u30EA\u30FC"});return a},de=(t,e)=>{const a=t.stories.find(i=>i.id===e.story);if(a)return{value:O({type:"story",id:a.id}),label:a.name,group:"\u30B9\u30C8\u30FC\u30EA\u30FC"};for(const i of t.activities){const s=i.steps.find(r=>r.id===e.step);if(s)return{value:O({type:"step",id:B(i.id,s.id)}),label:s.name,group:"\u30B9\u30C6\u30C3\u30D7"}}return null},G=t=>t.title??"User Story Mapping",ct=(t,e)=>{const a=h(t,e.step),i=a?.activity??R(t,e.activity)??t.activities[0],s=a?.step??i?.steps.find(o=>o.id===e.step)??i?.steps[0],r=b(t,e.story),n={...e};return i?n.activity=i.id:delete n.activity,s?n.step=s.id:delete n.step,r?n.story=r.id:delete n.story,n.view=e.view==="group"?"group":"activity",n},pt=(t,e)=>{switch(e.type){case"activity":return R(t,e.id)!==void 0;case"step":return h(t,e.id)!==void 0;case"story":return b(t,e.id)!==void 0;case"milestone":return S(t,e.id)!==void 0;case"artifact":return!0;default:return!1}},mt={name:"usm",label:"User Story Mapping",parseBase:W,emptyBase:Z,actions:p,apply:at,canonicalState:re,hasTarget:pt,canonicalTarget:(t,e)=>{if(e.type!=="step")return e;const a=h(t,e.id);return a?{...e,id:B(a.activity.id,a.step.id)}:e},describe:nt,serialize:ot,resolveNavigation:ct,commentTargets:(t,e)=>lt(t),currentTarget:(t,e)=>de(t,e),title:G},le={width:300,height:260},ce=H`
  :host {
    display: grid;
    gap: 5px;
    background: var(--af-paper-raised);
    border: 1px solid var(--af-rule);
    border-radius: var(--af-radius);
    box-shadow: var(--af-shadow-xs);
    padding: 10px 12px 8px;
    cursor: pointer;
    transition:
      box-shadow 200ms ease,
      transform 200ms ease,
      border-color 200ms ease;
  }

  :host(:hover) {
    border-color: var(--af-rule-strong);
    box-shadow: var(--af-shadow-sm);
    transform: translateY(-1px);
  }

  :host([focused]) {
    border-color: var(--af-blue);
    box-shadow:
      var(--af-shadow),
      0 0 0 2px rgba(51, 102, 204, 0.12);
  }

  :host([dragging]) {
    opacity: 0.45;
    transform: none;
  }

  .card-name {
    font-size: 13px;
    font-weight: 620;
    letter-spacing: -0.01em;
    line-height: 1.3;
  }

  .card-text {
    font-size: 11.5px;
    line-height: 1.5;
    color: var(--af-ink-soft);
    white-space: pre-wrap;
  }

  .card-tools {
    display: flex;
    gap: 2px;
    align-items: center;
    justify-content: flex-end;
    margin-top: 2px;
    padding-top: 5px;
    border-top: 1px solid var(--af-rule);
    opacity: 0;
    transition: opacity 150ms ease;
  }

  :host(:hover) .card-tools,
  :host([focused]) .card-tools,
  :host([data-mode='editing']) .card-tools,
  :host([data-mode='commenting']) .card-tools {
    opacity: 1;
  }
`;class ut extends Vt{static{this.styles=[Ut,ce,J]}static{this.properties={story:{attribute:!1},notes:{attribute:!1},mode:{type:String,reflect:!0,attribute:"data-mode"},focused:{type:Boolean,reflect:!0},dragging:{type:Boolean,reflect:!0},onIntent:{attribute:!1}}}#t="";#i=new Q(this);constructor(){super(),this.story=null,this.notes=[],this.mode="view",this.focused=!1,this.dragging=!1,this.onIntent=null,this.addEventListener("click",()=>this.#e({kind:"select"}))}updated(e){if(e.has("mode")&&(this.mode!=="commenting"&&(this.#t=""),this.mode==="editing"&&this.renderRoot.querySelector("artifact-inline-edit")?.startEditing()),this.mode!=="commenting")return;const a=this.renderRoot.querySelector(".comment-pop"),i=this.renderRoot.querySelector('[data-role="comment"]');a&&i&&this.#i.open(a,i,le)}render(){const e=this.story;if(!e)return $;const a=this.mode==="editing",i=this.mode==="commenting";return c`
      <div class="card-name">
        ${a?c`<artifact-inline-edit
                .value=${e.name}
                .label=${"\u30B9\u30C8\u30FC\u30EA\u30FC\u540D"}
                @artifact-commit=${V(s=>this.#e({kind:"rename",name:s}))}
              ></artifact-inline-edit>`:c`<span>${e.name}</span>`}
      </div>
      ${e.description?c`<div class="card-text">${e.description}</div>`:$}
      <div class="card-tools">
        <button
          class="af-icon-btn"
          type="button"
          data-role="edit"
          aria-label="タイトルを編集"
          data-active=${String(a)}
          @click=${this.#a({kind:"toggle-edit"})}
        >
          ${qt()}
        </button>
        <button
          class="af-icon-btn"
          type="button"
          data-role="comment"
          aria-label="コメント"
          data-active=${String(i)}
          @click=${this.#a({kind:"toggle-comment"})}
        >
          ${zt()}
          ${this.notes.length>0?c`<span class="af-icon-badge">${this.notes.length}</span>`:$}
        </button>
        <button
          class="af-icon-btn"
          type="button"
          data-role="delete"
          aria-label="削除"
          @click=${this.#a({kind:"delete"})}
        >
          ${Bt()}
        </button>
      </div>
      ${i?this.#s():$}
    `}#s(){return Xt(Qt(this.#t,this.notes.map(jt)),e=>{e.kind==="input"?(this.#t=e.body,this.requestUpdate()):this.#e(e)})}#a(e){return a=>{a.stopPropagation(),this.#e(e)}}#e(e){this.onIntent?.(e)}}const gt=(t="artifact-usm-card")=>{customElements.get(t)||customElements.define(t,ut)},z=(t,e,a)=>{const i=t.at(-1)??null;if(e===null||a==="end")return i;const s=t.indexOf(e);return s<0?i:a==="after"?e:s===0?null:t.at(s-1)??null},vt=(t,e,a,i,s)=>{const r=U(t,e.stepId,e.milestoneId).filter(n=>n.id!==a).map(n=>n.id);return{type:"MOVE_STORY",target:{type:"story",id:a},payload:{activityId:e.activityId,stepId:e.stepId,milestoneId:e.milestoneId??null,after:z(r,i,s)}}},ft=(t,e,a,i,s,r)=>{const n=b(t,i);if(!n||n.activityId!==e)return null;const o=et(t,e,a).filter(d=>d.id!==i).map(d=>d.id);return{type:"MOVE_STORY",target:{type:"story",id:i},payload:{activityId:e,stepId:n.stepId,milestoneId:a??null,after:z(o,s,r)}}},yt=(t,e,a,i,s)=>{const r=U(t,i,s).filter(n=>n.id!==e);return{type:"MOVE_STORY",target:{type:"story",id:e},payload:{activityId:a,stepId:i,milestoneId:s??null,after:r.at(-1)?.id??null}}},Et=(t,e,a,i)=>{if(!t.includes(e))return null;const s=t.filter(r=>r!==e);return{type:"REORDER_MILESTONE",target:{type:"milestone",id:e},payload:{after:z(s,a,i)}}},ht=t=>{const e=N("new-activity",k(t.state));if(!t.dispatch({type:"ADD_ACTIVITY",target:{type:"artifact",id:"usm"},payload:{id:e,name:"\u65B0\u3057\u3044\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3"}}).ok)return;const a=N("new-step",[...k(t.state),e]);t.dispatch({type:"ADD_STEP",target:{type:"activity",id:e},payload:{id:a,name:"\u65B0\u3057\u3044\u30B9\u30C6\u30C3\u30D7"}}),t.navigate({activity:e,step:null,story:null})},pe=(t,e)=>{const a=N("new-step",k(t.state));t.dispatch({type:"ADD_STEP",target:{type:"activity",id:e},payload:{id:a,name:"\u65B0\u3057\u3044\u30B9\u30C6\u30C3\u30D7"}})},me=t=>{const e=N("new-milestone",k(t.state));t.dispatch({type:"ADD_MILESTONE",target:{type:"artifact",id:"usm"},payload:{id:e,name:"\u65B0\u3057\u3044\u30DE\u30A4\u30EB\u30B9\u30C8\u30FC\u30F3"}})},bt=(t,e,a,i)=>{const s=N("new-story",k(t.state));t.dispatch({type:"ADD_STORY",target:{type:"step",id:a},payload:{id:s,name:"\u65B0\u3057\u3044\u30B9\u30C8\u30FC\u30EA\u30FC",activityId:e,...i===void 0?{}:{milestoneId:i}}}).ok&&t.navigate({activity:e,step:a,story:s})},w={kind:"idle"},F=(t,e)=>t.kind!=="idle"&&t.storyId===e,Tt=(t,e)=>F(t,e)&&(t.kind==="editing"||t.kind==="commenting")?t.kind:"view",It=(t,e,a)=>{switch(a.kind){case"toggle-edit":return t.kind==="editing"&&t.storyId===e?w:{kind:"editing",storyId:e};case"toggle-comment":return t.kind==="commenting"&&t.storyId===e?w:{kind:"commenting",storyId:e};case"rename":case"comment":case"dismiss":case"delete":return F(t,e)?w:t;case"select":return t}},St=t=>[...t.milestones.map(({id:e,name:a})=>({id:e,name:a})),{id:void 0,name:"\u672A\u5272\u5F53"}],ue=t=>c`
    <div class="empty">
      <h2>バックボーンがまだありません</h2>
      <p>アクティビティとステップを追加すると、ここにストーリーマップが現れます。</p>
      <button class="af-btn af-btn--accent" type="button" @click=${()=>ht(t)}>
        ＋ 最初のアクティビティ
      </button>
    </div>
  `,ge=t=>{const{context:e}=t,a=tt(e.state);if(a.length===0)return ue(e);const i=e.navigation.view==="group"?"group":"activity";return c`
    <div class="view-tabs" role="tablist" aria-label="まとめる単位">
      ${$t(e,"activity",i,"\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3")}
      ${$t(e,"group",i,"\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3\u30B0\u30EB\u30FC\u30D7")}
    </div>
    ${i==="activity"?ve(t,a):fe(t)}
  `},$t=(t,e,a,i)=>{const s=e===a;return c`<a
    class="tab"
    role="tab"
    data-current=${String(s)}
    aria-selected=${s?"true":"false"}
    href=${t.hashFor({view:e})}
    >${i}</a
  >`},ve=(t,e)=>{const{context:a}=t,{state:i}=a,s=St(i);return c`
    <div class="map-scroll">
      <div class="map" style=${`--cols:${e.length+1}`} data-testid="usm-map">
        <div class="map-row">
          <div class="corner">
            <span class="af-label">アクティビティグループ →</span>
          </div>
          ${I(i.activities,r=>r.id,r=>Ot(a,r.id,`grid-column: span ${Math.max(r.steps.length,1)}`))}
          ${Rt(a)}
        </div>
        <div class="map-row">
          ${_t()}
          ${I(e,({activity:r,step:n})=>`${r.id}.${n.id}`,({step:r})=>c`
              <div class="col-head" data-current=${String(a.navigation.step===r.id)}>
                <h4>
                  <artifact-inline-edit
                    .value=${r.name}
                    .label=${"\u30B9\u30C6\u30C3\u30D7\u540D"}
                    @artifact-commit=${V(n=>a.dispatch({type:"SET_STEP_NAME",target:{type:"step",id:r.id},payload:{name:n}}))}
                    @click=${n=>n.stopPropagation()}
                  ></artifact-inline-edit>
                </h4>
              </div>
            `)}
          <div class="corner"><span class="af-label">—</span></div>
        </div>
        ${I(s,r=>r.id,r=>xt(t,r,c`${I(e,({activity:n,step:o})=>`${n.id}.${o.id}`,({activity:n,step:o})=>ye(t,{activityId:n.id,stepId:o.id,milestoneId:r.id}))}`))}
        ${wt(a,e.length)}
      </div>
    </div>
  `},fe=t=>{const{context:e}=t,{state:a}=e,i=St(a);return c`
    <div class="map-scroll">
      <div class="map" style=${`--cols:${a.activities.length+1}`} data-testid="usm-map-group">
        <div class="map-row">
          ${_t()}
          ${I(a.activities,s=>s.id,s=>Ot(e,s.id))}
          ${Rt(e)}
        </div>
        ${I(i,s=>s.id,s=>xt(t,s,c`${I(a.activities,r=>r.id,r=>Ee(t,r.id,s.id))}`))}
        ${wt(e,a.activities.length)}
      </div>
    </div>
  `},_t=()=>c`<div class="corner">
    <span class="af-label">アクティビティ →</span>
    <span class="af-label">マイルストーン ↓</span>
  </div>`,Ot=(t,e,a)=>{const i=t.state.activities.find(s=>s.id===e);return i?c`
    <div class="act-head" style=${a??$}>
      <artifact-inline-edit
        .value=${i.name}
        .label=${"\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3\u540D"}
        @artifact-commit=${V(s=>t.dispatch({type:"SET_ACTIVITY_NAME",target:{type:"activity",id:i.id},payload:{name:s}}))}
      ></artifact-inline-edit>
      <button
        class="af-icon-btn"
        type="button"
        aria-label="このアクティビティにステップを追加"
        @click=${()=>pe(t,i.id)}
      >
        ${Kt()}
      </button>
    </div>
  `:c`<div class="act-head"></div>`},Rt=t=>c`<div class="act-head">
    <button class="af-btn af-btn--ghost" type="button" @click=${()=>ht(t)}>＋ アクティビティ</button>
  </div>`,wt=(t,e)=>c`<div class="map-row">
    <div class="row-head">
      <button class="af-btn af-btn--ghost" type="button" @click=${()=>me(t)}>
        ＋ マイルストーン
      </button>
    </div>
    ${Array.from({length:e+1},()=>c`<div class="cell"></div>`)}
  </div>`,xt=(t,e,a)=>{const{context:i,drag:s,handlers:r}=t,n=e.id;if(n===void 0)return c`<div class="map-row" data-draggable="false" data-row-dragging="false" data-row-drop="false">
      <div class="row-head" data-milestone="" draggable="false"><span>${e.name}</span></div>
      ${a}
      <div class="cell"></div>
    </div>`;const o=`row:${n}`,d=s.target({key:o,accepts:"milestone",hovered:be,onDrop:E=>r.dropOnMilestoneRow(n,E)}),_=s.source({type:"milestone",id:n});return c`
    <div
      class="map-row"
      data-draggable="true"
      data-row-dragging=${String(s.isDragging("milestone",n))}
      data-row-drop=${String(s.isOver(o))}
      @dragenter=${d.dragenter}
      @dragover=${d.dragover}
      @dragleave=${d.dragleave}
      @drop=${d.drop}
    >
      <div
        class="row-head"
        data-milestone=${n}
        draggable="true"
        @dragstart=${E=>{he(E),_.dragstart(E)}}
        @dragend=${_.dragend}
      >
        <span class="row-grip" aria-hidden="true">${Gt()}</span
        ><artifact-inline-edit
          draggable="false"
          .value=${e.name}
          .label=${"\u30DE\u30A4\u30EB\u30B9\u30C8\u30FC\u30F3\u540D"}
          @artifact-commit=${V(E=>i.dispatch({type:"SET_MILESTONE_NAME",target:{type:"milestone",id:n},payload:{name:E}}))}
        ></artifact-inline-edit>
      </div>
      ${a}
      <div class="cell"></div>
    </div>
  `},ye=(t,e)=>{const{context:a,drag:i,handlers:s}=t,r=U(a.state,e.stepId,e.milestoneId),n=`cell:${e.stepId}:${e.milestoneId??""}`,o=i.target({key:n,accepts:"story",hovered:kt,onDrop:d=>s.dropOnCell(e,d)});return c`
    <div
      class="cell"
      data-step=${e.stepId}
      data-milestone=${e.milestoneId??""}
      data-drop=${String(i.isOver(n))}
      @dragenter=${o.dragenter}
      @dragover=${o.dragover}
      @dragleave=${o.dragleave}
      @drop=${o.drop}
    >
      <div class="card-list" data-testid=${`cell-${e.stepId}-${e.milestoneId??"unassigned"}`}>
        ${I(r,d=>d.id,d=>Dt(t,d))}
      </div>
      <button
        class="af-btn af-btn--ghost add-cell"
        type="button"
        title="このマスにストーリーを追加"
        @click=${()=>bt(a,e.activityId,e.stepId,e.milestoneId)}
      >
        ＋ 追加
      </button>
    </div>
  `},Ee=(t,e,a)=>{const{context:i,drag:s,handlers:r}=t,{state:n}=i,o=et(n,e,a),d=n.activities.find(T=>T.id===e)?.steps[0],_=`group:${e}:${a??""}`,E=s.target({key:_,accepts:"story",hovered:kt,onDrop:T=>r.dropOnGroupCell(e,a,T)});return c`
    <div
      class="cell"
      data-activity=${e}
      data-milestone=${a??""}
      data-drop=${String(s.isOver(_))}
      @dragenter=${E.dragenter}
      @dragover=${E.dragover}
      @dragleave=${E.dragleave}
      @drop=${E.drop}
    >
      <div class="card-list" data-testid=${`group-cell-${e}-${a??"unassigned"}`}>
        ${I(o,T=>T.id,T=>Dt(t,T))}
      </div>
      ${d?c`<button
              class="af-btn af-btn--ghost add-cell"
              type="button"
              aria-label="このマスにストーリーを追加"
              @click=${()=>bt(i,e,d.id,a)}
            >
              ＋ 追加
            </button>`:$}
    </div>
  `},Dt=(t,e)=>{const{context:a,mode:i,drag:s,handlers:r}=t,n=a.comments.filter(d=>d.target.type==="story"&&d.target.id===e.id),o=s.source({type:"story",id:e.id});return c`<artifact-usm-card
    data-story=${e.id}
    draggable="true"
    .story=${e}
    .notes=${n}
    .mode=${Tt(i,e.id)}
    .onIntent=${d=>r.cardIntent(e.id,d)}
    ?focused=${a.navigation.story===e.id}
    ?dragging=${s.isDragging("story",e.id)}
    @dragstart=${o.dragstart}
    @dragend=${o.dragend}
  ></artifact-usm-card>`},kt=t=>{const e=t.target instanceof Element?t.target.closest("artifact-usm-card"):null;return e?{id:e.getAttribute("data-story"),element:e}:null},he=t=>{const e=(t.currentTarget instanceof Element?t.currentTarget:null)?.closest(".map-row");if(!e||!t.dataTransfer)return;const a=e.getBoundingClientRect();t.dataTransfer.setDragImage(e,t.clientX-a.left,t.clientY-a.top)},be=t=>{const e=t.target instanceof Element?t.target.closest(".map-row"):null,a=e?.querySelector(".row-head[data-milestone]");if(!e||!a)return null;const i=a.getAttribute("data-milestone");return{id:i===""?null:i,element:e}},Te=(t,e,a)=>{if(e.kind!=="picking-step")return $;const i=b(t.state,e.storyId),s=R(t.state,e.activityId);if(!i||!s)return $;const r=s.steps[0]?.id;return c`<div class="comment-pop move-dialog" id="move-dialog" popover="manual">
    <span class="af-label">移動先のアクティビティ</span>
    <select class="af-select" aria-label="移動先" data-move-dialog>
      ${s.steps.map(n=>c`<option value=${n.id} ?selected=${n.id===r}>${n.name}</option>`)}
    </select>
    <div class="pop-actions">
      <button
        class="af-btn af-btn--accent"
        type="button"
        @click=${n=>{const o=(Ft(n.currentTarget,HTMLElement)?.closest("#move-dialog")??null)?.querySelector("select")?.value??r;o?a.confirm(o):a.cancel()}}
      >
        移動する
      </button>
      <button class="af-btn" type="button" @click=${a.cancel}>キャンセル</button>
    </div>
  </div>`},Ie=H`
  :host {
    --af-usm-accent: var(--af-blue);
  }
  .map-scroll {
    /* A wide table must scroll inside itself and never widen the artifact shell. */
    min-width: 0;
    max-width: 100%;
    overflow-x: auto;
    padding-bottom: 12px;
  }
  .map {
    display: grid;
    gap: 0;
    min-width: max-content;
    border: 1px solid var(--af-rule);
    border-radius: var(--af-radius-lg);
    background: var(--af-paper-raised);
    box-shadow: var(--af-shadow);
    overflow: hidden;
  }
  .map-row {
    display: grid;
    grid-template-columns: 140px repeat(var(--cols), minmax(180px, 240px));
  }
  .map-row + .map-row {
    border-top: 1px solid var(--af-rule-strong);
  }
  .corner,
  .act-head,
  .col-head,
  .row-head,
  .cell {
    padding: 10px;
  }
  .corner {
    background: linear-gradient(135deg, var(--af-paper-sunken), var(--af-paper-inset));
    display: grid;
    gap: 2px;
    align-content: start;
  }

  /* Unit toggle above the table (group band vs one column per activity). */
  .view-tabs {
    display: inline-flex;
    justify-self: start;
    gap: 2px;
    padding: 3px;
    margin-bottom: 12px;
    border: 1px solid var(--af-rule);
    border-radius: 999px;
    background: var(--af-paper-sunken);
    box-shadow: inset 0 1px 2px rgba(20, 28, 44, 0.04);
  }

  .tab {
    padding: 4px 14px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 500;
    text-decoration: none;
    color: var(--af-ink-soft);
    white-space: nowrap;
    transition:
      background 120ms ease,
      color 120ms ease;
  }

  .tab:hover {
    color: var(--af-ink);
    background: var(--af-paper-raised);
  }

  .tab[data-current='true'] {
    background: var(--af-paper-raised);
    color: var(--af-ink);
    font-weight: 600;
    box-shadow: var(--af-shadow-xs);
  }
  .act-head {
    border-left: 1px solid var(--af-rule);
    background: linear-gradient(180deg, var(--af-paper-sunken), var(--af-paper-inset));
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    font-size: 13px;
    font-weight: 600;
  }
  .col-head {
    border-left: 1px solid var(--af-rule);
    background: var(--af-paper-sunken);
    transition: background 150ms ease;
  }
  .col-head[data-current='true'] {
    background: linear-gradient(180deg, rgba(51, 102, 204, 0.06), rgba(51, 102, 204, 0.03));
    box-shadow: inset 0 2px 0 var(--af-blue);
  }
  .col-head h4 {
    font-size: 13px;
    margin: 0;
  }
  .row-head {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--af-paper-sunken);
    font-size: 12px;
    font-weight: 600;
    transition: background 150ms ease;
  }

  .row-head[draggable='true'] {
    cursor: grab;
    -webkit-user-select: none;
    user-select: none;
  }

  .row-head[draggable='true'] artifact-inline-edit {
    -webkit-user-drag: none;
  }

  .row-head[draggable='true']:active {
    cursor: grabbing;
  }

  .row-grip {
    flex: 0 0 auto;
    display: inline-flex;
    color: var(--af-ink-faint);
  }

  .row-grip svg {
    display: block;
    width: 15px;
    height: 15px;
  }

  /* Row-level drag affordance: hover highlights the entire .map-row. */
  .map-row[data-draggable='true']:hover > .row-head {
    background: linear-gradient(90deg, var(--af-blue-soft), var(--af-paper-sunken));
  }
  .map-row[data-draggable='true']:hover > .cell {
    background: linear-gradient(90deg, rgba(51, 102, 204, 0.03), var(--af-paper-raised));
  }
  .map-row[data-draggable='true']:hover .row-grip {
    color: var(--af-blue);
  }
  .map-row[data-draggable='true'] {
    cursor: grab;
  }
  .map-row[data-draggable='true']:active {
    cursor: grabbing;
  }

  /*
   * Dragging state: entire row fades. Never disable pointer events on the
   * source here: Lit applies this state in the microtask right after
   * \`dragstart\`, and Blink then re-hit-tests the pointer and aborts the drag
   * when the source is no longer under it.
   */
  .map-row[data-row-dragging='true'] {
    opacity: 0.45;
  }

  /* Drop target: entire row highlights. */
  .map-row[data-row-drop='true'] {
    outline: 2px dashed var(--af-blue);
    outline-offset: -2px;
  }
  .map-row[data-row-drop='true'] > .row-head {
    background: var(--af-blue-soft);
  }
  .map-row[data-row-drop='true'] > .cell {
    background: linear-gradient(135deg, var(--af-blue-soft), rgba(51, 102, 204, 0.04));
  }
  .cell {
    border-left: 1px solid var(--af-rule);
    border-top: 1px solid var(--af-rule);
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 100px;
    background: var(--af-paper-raised);
    transition: background 150ms ease;
  }
  .cell[data-drop='true'] {
    background: linear-gradient(135deg, var(--af-blue-soft), rgba(51, 102, 204, 0.04));
    outline: 2px dashed var(--af-blue);
    outline-offset: -2px;
  }
  .card-list {
    display: grid;
    gap: 8px;
    align-content: start;
    flex: 1 1 auto;
  }
  .add-cell {
    margin-top: auto;
    opacity: 0;
    transition: opacity 180ms ease;
    border: 1px dashed var(--af-rule-strong);
    border-radius: var(--af-radius-sm);
    background: transparent;
    color: var(--af-ink-faint);
    padding: 4px 8px;
    font-size: 11.5px;
  }
  .add-cell:hover {
    background: var(--af-blue-soft);
    border-color: var(--af-blue);
    color: var(--af-blue);
  }
  .cell:hover .add-cell {
    opacity: 1;
  }
  .empty {
    border: 1px dashed var(--af-rule-strong);
    border-radius: var(--af-radius-lg);
    padding: 28px 24px;
    background: var(--af-paper-raised);
    max-width: 620px;
    display: grid;
    gap: 10px;
  }
  .count {
    font-family: var(--af-mono);
    font-variant-numeric: tabular-nums;
    font-size: 10px;
    color: var(--af-ink-faint);
  }

  /* Step picker shown after a cross-activity drop. */
  .move-dialog {
    min-width: 220px;
  }
`,Se={width:300,height:240};class Mt extends X{constructor(){super(),this.definition=mt,this.#t=new Jt(this),this.#i=new Q(this),this.mode=w}static{this.styles=[X.styles,Ie,J]}static{this.properties={mode:{state:!0}}}#t;#i;renderRegions(e){return{main:this.#s(e)}}updated(){if(super.updated(),this.mode.kind!=="picking-step")return;const e=this.renderRoot.querySelector("#move-dialog");e&&this.#i.open(e,Wt(this.mode.point.x,this.mode.point.y),Se)}#s(e){return c`
      ${ge({context:e,mode:this.mode,drag:this.#t,handlers:{cardIntent:(a,i)=>this.#a(a,i),dropOnCell:(a,i)=>this.#e(a,i),dropOnGroupCell:(a,i,s)=>this.#r(a,i,s),dropOnMilestoneRow:(a,i)=>this.#n(a,i)}})}
      ${Te(e,this.mode,{confirm:a=>this.#o(a),cancel:()=>this.mode=w})}
    `}#a(e,a){const i=this.context();switch(a.kind){case"select":{const s=b(i.state,e);s&&i.navigate({step:s.stepId,story:s.id});break}case"rename":i.dispatch({type:"SET_STORY_NAME",target:{type:"story",id:e},payload:{name:a.name}});break;case"comment":i.dispatch({type:"comment",target:`story:${e}`,payload:{body:a.body}});break;case"delete":i.dispatch({type:"DELETE_STORY",target:{type:"story",id:e},payload:{}});break}this.mode=It(this.mode,e,a)}#e(e,a){const i=this.context();i.dispatch(vt(i.state,e,a.item.id,a.hoveredId,a.place))}#r(e,a,i){const s=this.context(),r=b(s.state,i.item.id);if(!r)return;if(r.activityId!==e){this.mode={kind:"picking-step",storyId:r.id,activityId:e,milestoneId:a,point:{x:i.event.clientX,y:i.event.clientY}};return}const n=ft(s.state,e,a,r.id,i.hoveredId,i.place);n&&s.dispatch(n)}#n(e,a){const i=this.context(),s=i.state.milestones.map(n=>n.id),r=Et(s,a.item.id,a.hoveredId,a.place);r&&i.dispatch(r)}#o(e){const a=this.mode;if(a.kind!=="picking-step")return;const i=this.context();i.dispatch(yt(i.state,a.storyId,a.activityId,e,a.milestoneId)),this.mode=w}}const At=(t="artifact-usm")=>{gt(),customElements.get(t)||customElements.define(t,Mt)},$e=Object.freeze(Object.defineProperty({__proto__:null,IDLE_MODE:w,UsmElement:Mt,UsmStoryCard:ut,allUsmIds:k,applyUsmAction:at,cardModeOf:Tt,defineUsmElement:At,defineUsmStoryCard:gt,describeUsmAction:nt,dropAfter:z,emptyUsmBase:Z,findActivity:R,findMilestone:S,findStep:h,findStory:b,flatSteps:tt,modeConcerns:F,parseUsmBase:W,reduceCardIntent:It,resolveCellDrop:vt,resolveGroupDrop:ft,resolveMilestoneDrop:Et,resolvePickedStepMove:yt,resolveUsmNavigation:ct,serializeUsmAction:ot,storiesInCell:U,storyCountForStep:ne,usmAction:Zt,usmActions:p,usmCommentTargets:lt,usmDefinition:mt,usmHasTarget:pt,usmTargetLabel:dt,usmTitle:G},Symbol.toStringTag,{value:"Module"}));export{At as d,$e as i};
