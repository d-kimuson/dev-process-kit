import{q as v,al as y,v as Y,aq as w,ab as l,as as x,ad as u,ae as g,ar as L,a7 as At,aw as Nt,a8 as A,a9 as P,aa as C,P as Yt,f as Lt,V as _,R as m,$ as H,a4 as Pt,k as Ct,_ as J,a0 as S,a1 as p,I as Vt,A as qt,K as Ut,i as zt,m as N,a2 as I,J as Bt,B as jt,au as Kt,T as X}from"./shared-CxeFED6G.js";import{s as Gt,D as Ft}from"./shared-LG2yyayn.js";import{P as Q,r as Ht,p as Jt,a as Xt}from"./shared-B6yvfXoy.js";import{o as V}from"./shared-XDZhV_P2.js";const c={SET_ACTIVITY_NAME:v("SET_ACTIVITY_NAME","activity",y({name:u(l(),g(1))})),SET_STEP_NAME:v("SET_STEP_NAME","step",y({name:u(l(),g(1))})),REORDER_STEP:v("REORDER_STEP","step",y({after:w(l())}),{mode:"sequence"}),ADD_ACTIVITY:v("ADD_ACTIVITY","page",y({id:x,name:u(l(),g(1))}),{dedupeKey:Y}),ADD_STEP:v("ADD_STEP","activity",y({id:x,name:u(l(),g(1))}),{dedupeKey:Y}),DELETE_ACTIVITY:v("DELETE_ACTIVITY","activity",y({})),DELETE_STEP:v("DELETE_STEP","step",y({})),SET_STORY_NAME:v("SET_STORY_NAME","story",y({name:u(l(),g(1))})),SET_STORY_DESCRIPTION:v("SET_STORY_DESCRIPTION","story",y({description:l()})),SET_STORY_MILESTONE:v("SET_STORY_MILESTONE","story",y({milestoneId:w(l())})),MOVE_STORY:v("MOVE_STORY","story",y({activityId:u(l(),g(1)),stepId:u(l(),g(1)),milestoneId:w(l()),after:w(l())}),{mode:"sequence"}),REORDER_STORY:v("REORDER_STORY","story",y({after:w(l())}),{mode:"sequence"}),ADD_STORY:v("ADD_STORY","step",y({id:x,name:u(l(),g(1)),activityId:u(l(),g(1)),milestoneId:L(l())}),{dedupeKey:Y}),DELETE_STORY:v("DELETE_STORY","story",y({})),SET_MILESTONE_NAME:v("SET_MILESTONE_NAME","milestone",y({name:u(l(),g(1))})),ADD_MILESTONE:v("ADD_MILESTONE","page",y({id:x,name:u(l(),g(1))}),{dedupeKey:Y}),DELETE_MILESTONE:v("DELETE_MILESTONE","milestone",y({})),REORDER_MILESTONE:v("REORDER_MILESTONE","milestone",y({after:w(l())}),{mode:"sequence"})},Qt={setActivityName:(t,e)=>({type:"SET_ACTIVITY_NAME",target:{type:"activity",id:t},payload:{name:e}}),setStepName:(t,e)=>({type:"SET_STEP_NAME",target:{type:"step",id:t},payload:{name:e}})},Wt=A({id:u(l(),g(1)),name:u(l(),g(1))}),Zt=A({id:x,name:u(l(),g(1)),steps:P(C(Wt),[])}),te=A({id:u(l(),g(1)),name:u(l(),g(1))}),ee=A({id:x,name:u(l(),g(1)),description:L(l()),activityId:u(l(),g(1)),stepId:u(l(),g(1)),milestoneId:L(l())}),ie=A({title:L(l()),activities:P(C(Zt),[]),milestones:P(C(te),[]),stories:P(C(ee),[])}),W=t=>{const e=At(ie,t),i=new Map;for(const n of e.activities)for(const r of n.steps)i.set(r.id,n.id);const a=new Set(e.milestones.map(n=>n.id)),s=new Set,d=(n,r)=>{if(s.has(r))throw new Error(`duplicate id "${r}" in ${n}`);s.add(r)};for(const n of e.activities){d("activities",n.id);for(const r of n.steps)d("steps",r.id)}for(const n of e.milestones)d("milestones",n.id);for(const n of e.stories){d("stories",n.id);const r=i.get(n.stepId);if(r===void 0||r!==n.activityId)throw new Error(`story "${n.id}" references unknown activityId/stepId`);if(n.milestoneId!==void 0&&!a.has(n.milestoneId))throw new Error(`story "${n.id}" references unknown milestoneId "${n.milestoneId}"`)}return e},Z=()=>({activities:[],milestones:[],stories:[]}),O=(t,e)=>{if(e!==void 0)return t.activities.find(i=>i.id===e)},B=(t,e)=>`${t}.${e}`,f=(t,e)=>{if(e===void 0)return;const i=Nt(e,2);if(i){const[a,s]=i;if(a===void 0||s===void 0)return;const d=t.activities.find(r=>r.id===a),n=d?.steps.find(r=>r.id===s);return d&&n?{activity:d,step:n}:void 0}if(!e.includes("."))for(const a of t.activities){const s=a.steps.find(d=>d.id===e);if(s)return{activity:a,step:s}}},k=(t,e)=>{if(e!==void 0)return t.milestones.find(i=>i.id===e)},b=(t,e)=>{if(e!==void 0)return t.stories.find(i=>i.id===e)},tt=t=>t.activities.flatMap(e=>e.steps.map(i=>({activity:e,step:i}))),ae=t=>({...t,stories:Gt(t.stories,[e=>`${e.activityId}/${e.stepId}/${e.milestoneId??""}`])}),q=(t,e,i)=>t.stories.filter(a=>a.stepId===e&&(a.milestoneId??void 0)===i),et=(t,e,i)=>t.stories.filter(a=>a.activityId===e&&(a.milestoneId??void 0)===i),D=t=>[...t.activities.map(e=>e.id),...t.activities.flatMap(e=>e.steps.map(i=>i.id)),...t.milestones.map(e=>e.id),...t.stories.map(e=>e.id)],se=(t,e)=>t.stories.filter(i=>i.stepId===e).length,it=(t,e)=>{const i=Yt(c,e);if(i===null)return null;const a=i.target.id;switch(i.type){case"SET_ACTIVITY_NAME":{const{name:s}=i.payload;return t.activities.some(d=>d.id===a)?{...t,activities:t.activities.map(d=>d.id===a?{...d,name:s}:d)}:null}case"SET_STEP_NAME":{const{name:s}=i.payload,d=f(t,a);return d?{...t,activities:t.activities.map(n=>n.id===d.activity.id?{...n,steps:n.steps.map(r=>r.id===d.step.id?{...r,name:s}:r)}:n)}:null}case"REORDER_STEP":{const{after:s}=i.payload,d=f(t,a);if(!d)return null;const n=s===null?null:f(t,s);if(s!==null&&(!n||n.activity.id!==d.activity.id))return null;const r=st(d.activity.steps,d.step.id,n?.step.id??null);return r===null?null:{...t,activities:t.activities.map(o=>o.id===d.activity.id?{...o,steps:r}:o)}}case"ADD_ACTIVITY":{const s=i.payload;return t.activities.some(d=>d.id===s.id)?t:{...t,activities:[...t.activities,{id:s.id,name:s.name,steps:[]}]}}case"ADD_STEP":{const s=i.payload,d=t.activities.find(n=>n.id===a);return d?d.steps.some(n=>n.id===s.id)?t:{...t,activities:t.activities.map(n=>n.id===a?{...n,steps:[...n.steps,{id:s.id,name:s.name}]}:n)}:null}case"DELETE_ACTIVITY":{const s=t.activities.find(n=>n.id===a);if(!s)return null;const d=new Set(s.steps.map(n=>n.id));return{...t,activities:t.activities.filter(n=>n.id!==a),stories:t.stories.filter(n=>n.activityId!==a&&!d.has(n.stepId))}}case"DELETE_STEP":{const s=f(t,a);return s?{...t,activities:t.activities.map(d=>d.id===s.activity.id?{...d,steps:d.steps.filter(n=>n.id!==s.step.id)}:d),stories:t.stories.filter(d=>d.activityId!==s.activity.id||d.stepId!==s.step.id)}:null}case"SET_STORY_NAME":{const{name:s}=i.payload;return j(t,a,d=>({...d,name:s}))}case"SET_STORY_DESCRIPTION":{const{description:s}=i.payload;return j(t,a,d=>({...d,description:s}))}case"SET_STORY_MILESTONE":{const{milestoneId:s}=i.payload;return s!==null&&!k(t,s)?null:j(t,a,d=>s===null?K(d):{...d,milestoneId:s})}case"MOVE_STORY":{const s=i.payload,d=b(t,a);if(!d)return null;const n=f(t,s.stepId);if(!n||n.activity.id!==s.activityId||s.milestoneId!==null&&!k(t,s.milestoneId))return null;const r=s.milestoneId??void 0,o=r===void 0?{...K(d),activityId:n.activity.id,stepId:n.step.id}:{...d,activityId:n.activity.id,stepId:n.step.id,milestoneId:r};return at(t,o,s.after)}case"REORDER_STORY":{const{after:s}=i.payload,d=b(t,a);return d?at(t,d,s,!0):null}case"ADD_STORY":{const s=i.payload,d=f(t,e.target.id);if(!d||d.activity.id!==s.activityId||s.milestoneId!==void 0&&!k(t,s.milestoneId))return null;if(t.stories.some(r=>r.id===s.id))return t;const n={id:s.id,name:s.name,activityId:s.activityId,stepId:d.step.id,...s.milestoneId===void 0?{}:{milestoneId:s.milestoneId}};return{...t,stories:[...t.stories,n]}}case"DELETE_STORY":return t.stories.some(s=>s.id===a)?{...t,stories:t.stories.filter(s=>s.id!==a)}:null;case"SET_MILESTONE_NAME":{const{name:s}=i.payload;return t.milestones.some(d=>d.id===a)?{...t,milestones:t.milestones.map(d=>d.id===a?{...d,name:s}:d)}:null}case"ADD_MILESTONE":{const s=i.payload;return t.milestones.some(d=>d.id===s.id)?t:{...t,milestones:[...t.milestones,{id:s.id,name:s.name}]}}case"DELETE_MILESTONE":return t.milestones.some(s=>s.id===a)?{...t,milestones:t.milestones.filter(s=>s.id!==a),stories:t.stories.map(s=>s.milestoneId===a?K(s):s)}:null;case"REORDER_MILESTONE":{const{after:s}=i.payload,d=st(t.milestones,a,s);return d===null?null:{...t,milestones:d}}default:return Lt(i)}},j=(t,e,i)=>t.stories.some(a=>a.id===e)?{...t,stories:t.stories.map(a=>a.id===e?i(a):a)}:null,K=t=>{const{milestoneId:e,...i}=t;return i},at=(t,e,i,a=!1)=>{const s=e.milestoneId??void 0,d=t.stories.filter(E=>E.id!==e.id),n=d.filter(E=>E.stepId===e.stepId&&(E.milestoneId??void 0)===s);if(i!==null){const E=d.find(M=>M.id===i);if(!E||E.stepId!==e.stepId||(E.milestoneId??void 0)!==s)return null;if(a){const M=b(t,e.id);if(!M||E.stepId!==M.stepId||(E.milestoneId??void 0)!==(M.milestoneId??void 0))return null}}const r=i===null?[e,...n]:dt(n,e,i),o=d.findIndex(E=>E.stepId===e.stepId&&(E.milestoneId??void 0)===s),$=new Set(n.map(E=>E.id)),h=d.filter(E=>!$.has(E.id)),T=o<0?h.length:Math.min(o,h.length),Mt=[...h.slice(0,T),...r,...h.slice(T)];return{...t,stories:Mt}},st=(t,e,i)=>{if(!t.some(d=>d.id===e)||i!==null&&!t.some(d=>d.id===i))return null;if(i===e)return[...t];const a=t.find(d=>d.id===e);if(a===void 0)return null;const s=t.filter(d=>d.id!==e);return dt(s,a,i)},dt=(t,e,i)=>{const a=[...t],s=i===null?-1:a.findIndex(d=>d.id===i);return a.splice(s+1,0,e),a},U=(t,e)=>{const i=typeof e=="string"?e:"",a=typeof t=="string"?t:void 0;return a===void 0?`\u2192 \u300C${i}\u300D`:`\u300C${a}\u300D\u2192\u300C${i}\u300D`},de={SET_ACTIVITY_NAME:(t,e)=>({title:"\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3\u540D\u3092\u5909\u66F4",tone:"update",body:U(O(e,t.target.id)?.name,m(c.SET_ACTIVITY_NAME,t).name??"")}),SET_STEP_NAME:(t,e)=>({title:"\u30B9\u30C6\u30C3\u30D7\u540D\u3092\u5909\u66F4",tone:"update",body:U(f(e,t.target.id)?.step.name,m(c.SET_STEP_NAME,t).name??"")}),REORDER_STEP:t=>({title:"\u30B9\u30C6\u30C3\u30D7\u306E\u9806\u5E8F\u3092\u5909\u66F4",tone:"move",body:m(c.REORDER_STEP,t).after===null||m(c.REORDER_STEP,t).after===void 0?"\u2192 \u5148\u982D\u3078":`\u2192 \u300C${String(m(c.REORDER_STEP,t).after)}\u300D\u306E\u76F4\u5F8C\u3078`}),ADD_ACTIVITY:t=>({title:"\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3\u3092\u8FFD\u52A0",tone:"create",body:`+ \u300C${m(c.ADD_ACTIVITY,t).name??""}\u300D`}),ADD_STEP:t=>({title:"\u30B9\u30C6\u30C3\u30D7\u3092\u8FFD\u52A0",tone:"create",body:`+ \u300C${m(c.ADD_STEP,t).name??""}\u300D`}),DELETE_ACTIVITY:(t,e)=>({title:"\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3\u3092\u524A\u9664",tone:"delete",body:`\u2212 \u300C${O(e,t.target.id)?.name??t.target.id}\u300D`}),DELETE_STEP:(t,e)=>({title:"\u30B9\u30C6\u30C3\u30D7\u3092\u524A\u9664",tone:"delete",body:`\u2212 \u300C${f(e,t.target.id)?.step.name??t.target.id}\u300D`}),SET_STORY_NAME:(t,e)=>({title:"\u30B9\u30C8\u30FC\u30EA\u30FC\u540D\u3092\u5909\u66F4",tone:"update",body:U(b(e,t.target.id)?.name,m(c.SET_STORY_NAME,t).name??"")}),SET_STORY_DESCRIPTION:t=>({title:"\u30B9\u30C8\u30FC\u30EA\u30FC\u306E\u8AAC\u660E\u3092\u66F4\u65B0",tone:"update",body:`\u2192 \u300C${String(m(c.SET_STORY_DESCRIPTION,t).description??"").slice(0,90)}\u300D`}),SET_STORY_MILESTONE:(t,e)=>({title:"\u30DE\u30A4\u30EB\u30B9\u30C8\u30FC\u30F3\u3092\u5909\u66F4",tone:"move",body:m(c.SET_STORY_MILESTONE,t).milestoneId===null||m(c.SET_STORY_MILESTONE,t).milestoneId===void 0?"\u2192 \u672A\u5272\u5F53\u3078":`\u2192 ${k(e,String(m(c.SET_STORY_MILESTONE,t).milestoneId))?.name??String(m(c.SET_STORY_MILESTONE,t).milestoneId)}`}),MOVE_STORY:(t,e)=>({title:"\u30B9\u30C8\u30FC\u30EA\u30FC\u3092\u79FB\u52D5",tone:"move",body:`\u2192 ${f(e,String(m(c.MOVE_STORY,t).stepId))?.step.name??String(m(c.MOVE_STORY,t).stepId??"")}`}),REORDER_STORY:t=>({title:"\u30B9\u30C8\u30FC\u30EA\u30FC\u306E\u9806\u5E8F\u3092\u5909\u66F4",tone:"move",body:m(c.REORDER_STORY,t).after===null||m(c.REORDER_STORY,t).after===void 0?"\u2192 \u5148\u982D\u3078":`\u2192 \u300C${String(m(c.REORDER_STORY,t).after)}\u300D\u306E\u76F4\u5F8C\u3078`}),ADD_STORY:t=>({title:"\u30B9\u30C8\u30FC\u30EA\u30FC\u3092\u8FFD\u52A0",tone:"create",body:`+ \u300C${m(c.ADD_STORY,t).name??""}\u300D`}),DELETE_STORY:(t,e)=>({title:"\u30B9\u30C8\u30FC\u30EA\u30FC\u3092\u524A\u9664",tone:"delete",body:`\u2212 \u300C${b(e,t.target.id)?.name??t.target.id}\u300D`}),SET_MILESTONE_NAME:(t,e)=>({title:"\u30DE\u30A4\u30EB\u30B9\u30C8\u30FC\u30F3\u540D\u3092\u5909\u66F4",tone:"update",body:U(k(e,t.target.id)?.name,m(c.SET_MILESTONE_NAME,t).name??"")}),ADD_MILESTONE:t=>({title:"\u30DE\u30A4\u30EB\u30B9\u30C8\u30FC\u30F3\u3092\u8FFD\u52A0",tone:"create",body:`+ \u300C${m(c.ADD_MILESTONE,t).name??""}\u300D`}),DELETE_MILESTONE:(t,e)=>({title:"\u30DE\u30A4\u30EB\u30B9\u30C8\u30FC\u30F3\u3092\u524A\u9664",tone:"delete",body:`\u2212 \u300C${k(e,t.target.id)?.name??t.target.id}\u300D`}),REORDER_MILESTONE:t=>({title:"\u30DE\u30A4\u30EB\u30B9\u30C8\u30FC\u30F3\u306E\u9806\u5E8F\u3092\u5909\u66F4",tone:"move",body:m(c.REORDER_MILESTONE,t).after===null||m(c.REORDER_MILESTONE,t).after===void 0?"\u2192 \u5148\u982D\u3078":`\u2192 \u300C${String(m(c.REORDER_MILESTONE,t).after)}\u300D\u306E\u76F4\u5F8C\u3078`})},nt=(t,e,i)=>{let a;try{const s=de[t.type];a=s?s(t,i??e):{title:t.type,tone:"meta"}}catch{a={title:t.type,tone:"meta"}}return{title:a.title,targetLabel:ot(e,t.target),tone:a.tone,...a.body===void 0?{}:{summary:a.body}}},rt=t=>`${t.type} ${_(t.target)} ${JSON.stringify(t.payload)}`,ot=(t,e)=>{try{switch(e.type){case"activity":{const i=O(t,e.id);return i?`\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3 \xB7 ${i.name}`:`\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3 \xB7 ${e.id} (missing)`}case"step":{const i=f(t,e.id)?.step;return i?`\u30B9\u30C6\u30C3\u30D7 \xB7 ${i.name}`:`\u30B9\u30C6\u30C3\u30D7 \xB7 ${e.id} (missing)`}case"story":{const i=b(t,e.id);return i?`\u30B9\u30C8\u30FC\u30EA\u30FC \xB7 ${i.name}`:`\u30B9\u30C8\u30FC\u30EA\u30FC \xB7 ${e.id} (missing)`}case"milestone":{const i=k(t,e.id);return i?`\u30DE\u30A4\u30EB\u30B9\u30C8\u30FC\u30F3 \xB7 ${i.name}`:`\u30DE\u30A4\u30EB\u30B9\u30C8\u30FC\u30F3 \xB7 ${e.id} (missing)`}case"page":return`\u30DE\u30C3\u30D7 \xB7 ${G(t)}`;default:return`${e.type} \xB7 ${e.id}`}}catch{return`${e.type} \xB7 ${e.id}`}},lt=(t,e)=>{const i=[{value:"page:usm",label:"\u30DE\u30C3\u30D7\u5168\u4F53",group:"\u30DE\u30C3\u30D7"}];for(const a of t.activities){i.push({value:_({type:"activity",id:a.id}),label:a.name,group:"\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3"});for(const s of a.steps)i.push({value:_({type:"step",id:B(a.id,s.id)}),label:`${a.name} \u203A ${s.name}`,group:"\u30B9\u30C6\u30C3\u30D7"})}for(const a of t.milestones)i.push({value:_({type:"milestone",id:a.id}),label:a.name,group:"\u30DE\u30A4\u30EB\u30B9\u30C8\u30FC\u30F3"});for(const a of t.stories)i.push({value:_({type:"story",id:a.id}),label:a.name,group:"\u30B9\u30C8\u30FC\u30EA\u30FC"});return i},ne=(t,e)=>{const i=t.stories.find(a=>a.id===e.story);if(i)return{value:_({type:"story",id:i.id}),label:i.name,group:"\u30B9\u30C8\u30FC\u30EA\u30FC"};for(const a of t.activities){const s=a.steps.find(d=>d.id===e.step);if(s)return{value:_({type:"step",id:B(a.id,s.id)}),label:s.name,group:"\u30B9\u30C6\u30C3\u30D7"}}return null},G=t=>t.title??"User Story Mapping",pt=(t,e)=>{const i=f(t,e.step),a=i?.activity??O(t,e.activity)??t.activities[0],s=i?.step??a?.steps.find(r=>r.id===e.step)??a?.steps[0],d=b(t,e.story),n={...e};return a?n.activity=a.id:delete n.activity,s?n.step=s.id:delete n.step,d?n.story=d.id:delete n.story,n.view=e.view==="group"?"group":"activity",n},ct=(t,e)=>{switch(e.type){case"activity":return O(t,e.id)!==void 0;case"step":return f(t,e.id)!==void 0;case"story":return b(t,e.id)!==void 0;case"milestone":return k(t,e.id)!==void 0;case"page":return!0;default:return!1}},mt={name:"usm",label:"User Story Mapping",parseBase:W,emptyBase:Z,actions:c,apply:it,canonicalState:ae,hasTarget:ct,canonicalTarget:(t,e)=>{if(e.type!=="step")return e;const i=f(t,e.id);return i?{...e,id:B(i.activity.id,i.step.id)}:e},describe:nt,serialize:rt,resolveNavigation:pt,commentTargets:(t,e)=>lt(t),currentTarget:(t,e)=>ne(t,e),title:G},re={width:300,height:260},oe=H`
  :host {
    display: grid;
    gap: 5px;
    background: var(--dpk-paper-raised);
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius);
    box-shadow: var(--dpk-shadow-xs);
    padding: 10px 12px 8px;
    cursor: pointer;
    transition:
      box-shadow 200ms ease,
      transform 200ms ease,
      border-color 200ms ease;
  }

  :host(:hover) {
    border-color: var(--dpk-rule-strong);
    box-shadow: var(--dpk-shadow-sm);
    transform: translateY(-1px);
  }

  :host([focused]) {
    border-color: var(--dpk-blue);
    box-shadow:
      var(--dpk-shadow),
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
    color: var(--dpk-ink-soft);
    white-space: pre-wrap;
  }

  .card-tools {
    display: flex;
    gap: 2px;
    align-items: center;
    justify-content: flex-end;
    margin-top: 2px;
    padding-top: 5px;
    border-top: 1px solid var(--dpk-rule);
    opacity: 0;
    transition: opacity 150ms ease;
  }

  :host(:hover) .card-tools,
  :host([focused]) .card-tools,
  :host([data-mode='editing']) .card-tools,
  :host([data-mode='commenting']) .card-tools {
    opacity: 1;
  }
`;class le extends Pt{static{this.styles=[Ct,oe,J]}static{this.properties={story:{attribute:!1},notes:{attribute:!1},mode:{type:String,reflect:!0,attribute:"data-mode"},focused:{type:Boolean,reflect:!0},dragging:{type:Boolean,reflect:!0},onIntent:{attribute:!1}}}#t="";#a=new Q(this);constructor(){super(),this.story=null,this.notes=[],this.mode="view",this.focused=!1,this.dragging=!1,this.onIntent=null,this.addEventListener("click",()=>this.#e({kind:"select"}))}updated(e){if(e.has("mode")&&(this.mode!=="commenting"&&(this.#t=""),this.mode==="editing"&&this.renderRoot.querySelector("dpk-component-inline-edit")?.startEditing()),this.mode!=="commenting")return;const i=this.renderRoot.querySelector(".comment-pop"),a=this.renderRoot.querySelector('[data-role="comment"]');i&&a&&this.#a.open(i,a,re)}render(){const e=this.story;if(!e)return S;const i=this.mode==="editing",a=this.mode==="commenting";return p`
      <div class="card-name">
        ${i?p`<dpk-component-inline-edit
                .value=${e.name}
                .label=${"\u30B9\u30C8\u30FC\u30EA\u30FC\u540D"}
                @dpk-commit=${V(s=>this.#e({kind:"rename",name:s}))}
              ></dpk-component-inline-edit>`:p`<span>${e.name}</span>`}
      </div>
      ${e.description?p`<div class="card-text">${e.description}</div>`:S}
      <div class="card-tools">
        <button
          class="dpk-icon-btn"
          type="button"
          data-role="edit"
          aria-label="タイトルを編集"
          data-active=${String(i)}
          @click=${this.#i({kind:"toggle-edit"})}
        >
          ${Vt()}
        </button>
        <button
          class="dpk-icon-btn"
          type="button"
          data-role="comment"
          aria-label="コメント"
          data-active=${String(a)}
          @click=${this.#i({kind:"toggle-comment"})}
        >
          ${qt()}
          ${this.notes.length>0?p`<span class="dpk-icon-badge">${this.notes.length}</span>`:S}
        </button>
        <button
          class="dpk-icon-btn"
          type="button"
          data-role="delete"
          aria-label="削除"
          @click=${this.#i({kind:"delete"})}
        >
          ${Ut()}
        </button>
      </div>
      ${a?this.#s():S}
    `}#s(){return Ht(Jt(this.#t,this.notes.map(zt)),e=>{e.kind==="input"?(this.#t=e.body,this.requestUpdate()):this.#e(e)})}#i(e){return i=>{i.stopPropagation(),this.#e(e)}}#e(e){this.onIntent?.(e)}}const pe=()=>{customElements.get("dpk-internal-usm-story-card")||customElements.define("dpk-internal-usm-story-card",le)},z=(t,e,i)=>{const a=t.at(-1)??null;if(e===null||i==="end")return a;const s=t.indexOf(e);return s<0?a:i==="after"?e:s===0?null:t.at(s-1)??null},ut=(t,e,i,a,s)=>{const d=q(t,e.stepId,e.milestoneId).filter(n=>n.id!==i).map(n=>n.id);return{type:"MOVE_STORY",target:{type:"story",id:i},payload:{activityId:e.activityId,stepId:e.stepId,milestoneId:e.milestoneId??null,after:z(d,a,s)}}},gt=(t,e,i,a,s,d)=>{const n=b(t,a);if(!n||n.activityId!==e)return null;const r=et(t,e,i).filter(o=>o.id!==a).map(o=>o.id);return{type:"MOVE_STORY",target:{type:"story",id:a},payload:{activityId:e,stepId:n.stepId,milestoneId:i??null,after:z(r,s,d)}}},vt=(t,e,i,a,s)=>{const d=q(t,a,s).filter(n=>n.id!==e);return{type:"MOVE_STORY",target:{type:"story",id:e},payload:{activityId:i,stepId:a,milestoneId:s??null,after:d.at(-1)?.id??null}}},yt=(t,e,i,a)=>{if(!t.includes(e))return null;const s=t.filter(d=>d!==e);return{type:"REORDER_MILESTONE",target:{type:"milestone",id:e},payload:{after:z(s,i,a)}}},Et=t=>{const e=N("new-activity",D(t.state));if(!t.dispatch({type:"ADD_ACTIVITY",target:{type:"page",id:"usm"},payload:{id:e,name:"\u65B0\u3057\u3044\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3"}}).ok)return;const i=N("new-step",[...D(t.state),e]);t.dispatch({type:"ADD_STEP",target:{type:"activity",id:e},payload:{id:i,name:"\u65B0\u3057\u3044\u30B9\u30C6\u30C3\u30D7"}}),t.navigate({activity:e,step:null,story:null})},ce=(t,e)=>{const i=N("new-step",D(t.state));t.dispatch({type:"ADD_STEP",target:{type:"activity",id:e},payload:{id:i,name:"\u65B0\u3057\u3044\u30B9\u30C6\u30C3\u30D7"}})},me=t=>{const e=N("new-milestone",D(t.state));t.dispatch({type:"ADD_MILESTONE",target:{type:"page",id:"usm"},payload:{id:e,name:"\u65B0\u3057\u3044\u30DE\u30A4\u30EB\u30B9\u30C8\u30FC\u30F3"}})},ht=(t,e,i,a)=>{const s=N("new-story",D(t.state));t.dispatch({type:"ADD_STORY",target:{type:"step",id:i},payload:{id:s,name:"\u65B0\u3057\u3044\u30B9\u30C8\u30FC\u30EA\u30FC",activityId:e,...a===void 0?{}:{milestoneId:a}}}).ok&&t.navigate({activity:e,step:i,story:s})},R={kind:"idle"},F=(t,e)=>t.kind!=="idle"&&t.storyId===e,ft=(t,e)=>F(t,e)&&(t.kind==="editing"||t.kind==="commenting")?t.kind:"view",bt=(t,e,i)=>{switch(i.kind){case"toggle-edit":return t.kind==="editing"&&t.storyId===e?R:{kind:"editing",storyId:e};case"toggle-comment":return t.kind==="commenting"&&t.storyId===e?R:{kind:"commenting",storyId:e};case"rename":case"comment":case"dismiss":case"delete":return F(t,e)?R:t;case"select":return t}},Tt=t=>[...t.milestones.map(({id:e,name:i})=>({id:e,name:i})),{id:void 0,name:"\u672A\u5272\u5F53"}],ue=t=>p`
    <div class="empty">
      <h2>バックボーンがまだありません</h2>
      <p>アクティビティとステップを追加すると、ここにストーリーマップが現れます。</p>
      <button class="dpk-btn dpk-btn--accent" type="button" @click=${()=>Et(t)}>
        ＋ 最初のアクティビティ
      </button>
    </div>
  `,ge=t=>{const{context:e}=t,i=tt(e.state);if(i.length===0)return ue(e);const a=e.navigation.view==="group"?"group":"activity";return p`
    <div class="view-tabs" role="tablist" aria-label="まとめる単位">
      ${It(e,"activity",a,"\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3")}
      ${It(e,"group",a,"\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3\u30B0\u30EB\u30FC\u30D7")}
    </div>
    ${a==="activity"?ve(t,i):ye(t)}
  `},It=(t,e,i,a)=>{const s=e===i;return p`<a
    class="tab"
    role="tab"
    data-current=${String(s)}
    aria-selected=${s?"true":"false"}
    href=${t.hashFor({view:e})}
    >${a}</a
  >`},ve=(t,e)=>{const{context:i}=t,{state:a}=i,s=Tt(a);return p`
    <div class="map-scroll">
      <div class="map" style=${`--cols:${e.length+1}`} data-testid="usm-map">
        <div class="map-row">
          <div class="corner">
            <span class="dpk-label">アクティビティグループ →</span>
          </div>
          ${I(a.activities,d=>d.id,d=>St(i,d.id,`grid-column: span ${Math.max(d.steps.length,1)}`))}
          ${$t(i)}
        </div>
        <div class="map-row">
          ${kt()}
          ${I(e,({activity:d,step:n})=>`${d.id}.${n.id}`,({step:d})=>p`
              <div class="col-head" data-current=${String(i.navigation.step===d.id)}>
                <h4>
                  <dpk-component-inline-edit
                    .value=${d.name}
                    .label=${"\u30B9\u30C6\u30C3\u30D7\u540D"}
                    @dpk-commit=${V(n=>i.dispatch({type:"SET_STEP_NAME",target:{type:"step",id:d.id},payload:{name:n}}))}
                    @click=${n=>n.stopPropagation()}
                  ></dpk-component-inline-edit>
                </h4>
              </div>
            `)}
          <div class="corner"><span class="dpk-label">—</span></div>
        </div>
        ${I(s,d=>d.id,d=>Ot(t,d,p`${I(e,({activity:n,step:r})=>`${n.id}.${r.id}`,({activity:n,step:r})=>Ee(t,{activityId:n.id,stepId:r.id,milestoneId:d.id}))}`))}
        ${_t(i,e.length)}
      </div>
    </div>
  `},ye=t=>{const{context:e}=t,{state:i}=e,a=Tt(i);return p`
    <div class="map-scroll">
      <div class="map" style=${`--cols:${i.activities.length+1}`} data-testid="usm-map-group">
        <div class="map-row">
          ${kt()}
          ${I(i.activities,s=>s.id,s=>St(e,s.id))}
          ${$t(e)}
        </div>
        ${I(a,s=>s.id,s=>Ot(t,s,p`${I(i.activities,d=>d.id,d=>he(t,d.id,s.id))}`))}
        ${_t(e,i.activities.length)}
      </div>
    </div>
  `},kt=()=>p`<div class="corner">
    <span class="dpk-label">アクティビティ →</span>
    <span class="dpk-label">マイルストーン ↓</span>
  </div>`,St=(t,e,i)=>{const a=t.state.activities.find(s=>s.id===e);return a?p`
    <div class="act-head" style=${i??S}>
      <dpk-component-inline-edit
        .value=${a.name}
        .label=${"\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3\u540D"}
        @dpk-commit=${V(s=>t.dispatch({type:"SET_ACTIVITY_NAME",target:{type:"activity",id:a.id},payload:{name:s}}))}
      ></dpk-component-inline-edit>
      <button
        class="dpk-icon-btn"
        type="button"
        aria-label="このアクティビティにステップを追加"
        @click=${()=>ce(t,a.id)}
      >
        ${Bt()}
      </button>
    </div>
  `:p`<div class="act-head"></div>`},$t=t=>p`<div class="act-head">
    <button class="dpk-btn dpk-btn--ghost" type="button" @click=${()=>Et(t)}>＋ アクティビティ</button>
  </div>`,_t=(t,e)=>p`<div class="map-row">
    <div class="row-head">
      <button class="dpk-btn dpk-btn--ghost" type="button" @click=${()=>me(t)}>
        ＋ マイルストーン
      </button>
    </div>
    ${Array.from({length:e+1},()=>p`<div class="cell"></div>`)}
  </div>`,Ot=(t,e,i)=>{const{context:a,drag:s,handlers:d}=t,n=e.id;if(n===void 0)return p`<div class="map-row" data-draggable="false" data-row-dragging="false" data-row-drop="false">
      <div class="row-head" data-milestone="" draggable="false"><span>${e.name}</span></div>
      ${i}
      <div class="cell"></div>
    </div>`;const r=`row:${n}`,o=s.target({key:r,accepts:"milestone",hovered:be,onDrop:h=>d.dropOnMilestoneRow(n,h)}),$=s.source({type:"milestone",id:n});return p`
    <div
      class="map-row"
      data-draggable="true"
      data-row-dragging=${String(s.isDragging("milestone",n))}
      data-row-drop=${String(s.isOver(r))}
      @dragenter=${o.dragenter}
      @dragover=${o.dragover}
      @dragleave=${o.dragleave}
      @drop=${o.drop}
    >
      <div
        class="row-head"
        data-milestone=${n}
        draggable="true"
        @dragstart=${h=>{fe(h),$.dragstart(h)}}
        @dragend=${$.dragend}
      >
        <span class="row-grip" aria-hidden="true">${jt()}</span
        ><dpk-component-inline-edit
          draggable="false"
          .value=${e.name}
          .label=${"\u30DE\u30A4\u30EB\u30B9\u30C8\u30FC\u30F3\u540D"}
          @dpk-commit=${V(h=>a.dispatch({type:"SET_MILESTONE_NAME",target:{type:"milestone",id:n},payload:{name:h}}))}
        ></dpk-component-inline-edit>
      </div>
      ${i}
      <div class="cell"></div>
    </div>
  `},Ee=(t,e)=>{const{context:i,drag:a,handlers:s}=t,d=q(i.state,e.stepId,e.milestoneId),n=`cell:${e.stepId}:${e.milestoneId??""}`,r=a.target({key:n,accepts:"story",hovered:wt,onDrop:o=>s.dropOnCell(e,o)});return p`
    <div
      class="cell"
      data-step=${e.stepId}
      data-milestone=${e.milestoneId??""}
      data-drop=${String(a.isOver(n))}
      @dragenter=${r.dragenter}
      @dragover=${r.dragover}
      @dragleave=${r.dragleave}
      @drop=${r.drop}
    >
      <div class="card-list" data-testid=${`cell-${e.stepId}-${e.milestoneId??"unassigned"}`}>
        ${I(d,o=>o.id,o=>Rt(t,o))}
      </div>
      <button
        class="dpk-btn dpk-btn--ghost add-cell"
        type="button"
        title="このマスにストーリーを追加"
        @click=${()=>ht(i,e.activityId,e.stepId,e.milestoneId)}
      >
        ＋ 追加
      </button>
    </div>
  `},he=(t,e,i)=>{const{context:a,drag:s,handlers:d}=t,{state:n}=a,r=et(n,e,i),o=n.activities.find(T=>T.id===e)?.steps[0],$=`group:${e}:${i??""}`,h=s.target({key:$,accepts:"story",hovered:wt,onDrop:T=>d.dropOnGroupCell(e,i,T)});return p`
    <div
      class="cell"
      data-activity=${e}
      data-milestone=${i??""}
      data-drop=${String(s.isOver($))}
      @dragenter=${h.dragenter}
      @dragover=${h.dragover}
      @dragleave=${h.dragleave}
      @drop=${h.drop}
    >
      <div class="card-list" data-testid=${`group-cell-${e}-${i??"unassigned"}`}>
        ${I(r,T=>T.id,T=>Rt(t,T))}
      </div>
      ${o?p`<button
              class="dpk-btn dpk-btn--ghost add-cell"
              type="button"
              aria-label="このマスにストーリーを追加"
              @click=${()=>ht(a,e,o.id,i)}
            >
              ＋ 追加
            </button>`:S}
    </div>
  `},Rt=(t,e)=>{const{context:i,mode:a,drag:s,handlers:d}=t,n=i.comments.filter(o=>o.target.type==="story"&&o.target.id===e.id),r=s.source({type:"story",id:e.id});return p`<dpk-internal-usm-story-card
    data-story=${e.id}
    draggable="true"
    .story=${e}
    .notes=${n}
    .mode=${ft(a,e.id)}
    .onIntent=${o=>d.cardIntent(e.id,o)}
    ?focused=${i.navigation.story===e.id}
    ?dragging=${s.isDragging("story",e.id)}
    @dragstart=${r.dragstart}
    @dragend=${r.dragend}
  ></dpk-internal-usm-story-card>`},wt=t=>{const e=t.target instanceof Element?t.target.closest("dpk-internal-usm-story-card"):null;return e?{id:e.getAttribute("data-story"),element:e}:null},fe=t=>{const e=(t.currentTarget instanceof Element?t.currentTarget:null)?.closest(".map-row");if(!e||!t.dataTransfer)return;const i=e.getBoundingClientRect();t.dataTransfer.setDragImage(e,t.clientX-i.left,t.clientY-i.top)},be=t=>{const e=t.target instanceof Element?t.target.closest(".map-row"):null,i=e?.querySelector(".row-head[data-milestone]");if(!e||!i)return null;const a=i.getAttribute("data-milestone");return{id:a===""?null:a,element:e}},Te=(t,e,i)=>{if(e.kind!=="picking-step")return S;const a=b(t.state,e.storyId),s=O(t.state,e.activityId);if(!a||!s)return S;const d=s.steps[0]?.id;return p`<div class="comment-pop move-dialog" id="move-dialog" popover="manual">
    <span class="dpk-label">移動先のアクティビティ</span>
    <select class="dpk-select" aria-label="移動先" data-move-dialog>
      ${s.steps.map(n=>p`<option value=${n.id} ?selected=${n.id===d}>${n.name}</option>`)}
    </select>
    <div class="pop-actions">
      <button
        class="dpk-btn dpk-btn--accent"
        type="button"
        @click=${n=>{const r=(Kt(n.currentTarget,HTMLElement)?.closest("#move-dialog")??null)?.querySelector("select")?.value??d;r?i.confirm(r):i.cancel()}}
      >
        移動する
      </button>
      <button class="dpk-btn" type="button" @click=${i.cancel}>キャンセル</button>
    </div>
  </div>`},Ie=H`
  :host {
    --dpk-usm-accent: var(--dpk-blue);
  }
  .map-scroll {
    /* A wide table must scroll inside itself and never widen the template shell. */
    min-width: 0;
    max-width: 100%;
    overflow-x: auto;
    padding-bottom: 12px;
  }
  .map {
    display: grid;
    gap: 0;
    min-width: max-content;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow);
    overflow: hidden;
  }
  .map-row {
    display: grid;
    grid-template-columns: 140px repeat(var(--cols), minmax(180px, 240px));
  }
  .map-row + .map-row {
    border-top: 1px solid var(--dpk-rule-strong);
  }
  .corner,
  .act-head,
  .col-head,
  .row-head,
  .cell {
    padding: 10px;
  }
  .corner {
    background: linear-gradient(135deg, var(--dpk-paper-sunken), var(--dpk-paper-inset));
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
    border: 1px solid var(--dpk-rule);
    border-radius: 999px;
    background: var(--dpk-paper-sunken);
    box-shadow: inset 0 1px 2px rgba(20, 28, 44, 0.04);
  }

  .tab {
    padding: 4px 14px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 500;
    text-decoration: none;
    color: var(--dpk-ink-soft);
    white-space: nowrap;
    transition:
      background 120ms ease,
      color 120ms ease;
  }

  .tab:hover {
    color: var(--dpk-ink);
    background: var(--dpk-paper-raised);
  }

  .tab[data-current='true'] {
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    font-weight: 600;
    box-shadow: var(--dpk-shadow-xs);
  }
  .act-head {
    border-left: 1px solid var(--dpk-rule);
    background: linear-gradient(180deg, var(--dpk-paper-sunken), var(--dpk-paper-inset));
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    font-size: 13px;
    font-weight: 600;
  }
  .col-head {
    border-left: 1px solid var(--dpk-rule);
    background: var(--dpk-paper-sunken);
    transition: background 150ms ease;
  }
  .col-head[data-current='true'] {
    background: linear-gradient(180deg, rgba(51, 102, 204, 0.06), rgba(51, 102, 204, 0.03));
    box-shadow: inset 0 2px 0 var(--dpk-blue);
  }
  .col-head h4 {
    font-size: 13px;
    margin: 0;
  }
  .row-head {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--dpk-paper-sunken);
    font-size: 12px;
    font-weight: 600;
    transition: background 150ms ease;
  }

  .row-head[draggable='true'] {
    cursor: grab;
    -webkit-user-select: none;
    user-select: none;
  }

  .row-head[draggable='true'] dpk-component-inline-edit {
    -webkit-user-drag: none;
  }

  .row-head[draggable='true']:active {
    cursor: grabbing;
  }

  .row-grip {
    flex: 0 0 auto;
    display: inline-flex;
    color: var(--dpk-ink-faint);
  }

  .row-grip svg {
    display: block;
    width: 15px;
    height: 15px;
  }

  /* Row-level drag affordance: hover highlights the entire .map-row. */
  .map-row[data-draggable='true']:hover > .row-head {
    background: linear-gradient(90deg, var(--dpk-blue-soft), var(--dpk-paper-sunken));
  }
  .map-row[data-draggable='true']:hover > .cell {
    background: linear-gradient(90deg, rgba(51, 102, 204, 0.03), var(--dpk-paper-raised));
  }
  .map-row[data-draggable='true']:hover .row-grip {
    color: var(--dpk-blue);
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
    outline: 2px dashed var(--dpk-blue);
    outline-offset: -2px;
  }
  .map-row[data-row-drop='true'] > .row-head {
    background: var(--dpk-blue-soft);
  }
  .map-row[data-row-drop='true'] > .cell {
    background: linear-gradient(135deg, var(--dpk-blue-soft), rgba(51, 102, 204, 0.04));
  }
  .cell {
    border-left: 1px solid var(--dpk-rule);
    border-top: 1px solid var(--dpk-rule);
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 100px;
    background: var(--dpk-paper-raised);
    transition: background 150ms ease;
  }
  .cell[data-drop='true'] {
    background: linear-gradient(135deg, var(--dpk-blue-soft), rgba(51, 102, 204, 0.04));
    outline: 2px dashed var(--dpk-blue);
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
    border: 1px dashed var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: transparent;
    color: var(--dpk-ink-faint);
    padding: 4px 8px;
    font-size: 11.5px;
  }
  .add-cell:hover {
    background: var(--dpk-blue-soft);
    border-color: var(--dpk-blue);
    color: var(--dpk-blue);
  }
  .cell:hover .add-cell {
    opacity: 1;
  }
  .empty {
    border: 1px dashed var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-lg);
    padding: 28px 24px;
    background: var(--dpk-paper-raised);
    max-width: 620px;
    display: grid;
    gap: 10px;
  }
  .count {
    font-family: var(--dpk-mono);
    font-variant-numeric: tabular-nums;
    font-size: 10px;
    color: var(--dpk-ink-faint);
  }

  /* Step picker shown after a cross-activity drop. */
  .move-dialog {
    min-width: 220px;
  }
`,ke={width:300,height:240};class xt extends X{constructor(){super(),this.definition=mt,this.#t=new Ft(this),this.#a=new Q(this),this.mode=R}static{this.styles=[X.styles,Ie,J]}static{this.properties={mode:{state:!0}}}#t;#a;renderRegions(e){return{main:this.#s(e)}}updated(){if(super.updated(),this.mode.kind!=="picking-step")return;const e=this.renderRoot.querySelector("#move-dialog");e&&this.#a.open(e,Xt(this.mode.point.x,this.mode.point.y),ke)}#s(e){return p`
      ${ge({context:e,mode:this.mode,drag:this.#t,handlers:{cardIntent:(i,a)=>this.#i(i,a),dropOnCell:(i,a)=>this.#e(i,a),dropOnGroupCell:(i,a,s)=>this.#d(i,a,s),dropOnMilestoneRow:(i,a)=>this.#n(i,a)}})}
      ${Te(e,this.mode,{confirm:i=>this.#r(i),cancel:()=>this.mode=R})}
    `}#i(e,i){const a=this.context();switch(i.kind){case"select":{const s=b(a.state,e);s&&a.navigate({step:s.stepId,story:s.id});break}case"rename":a.dispatch({type:"SET_STORY_NAME",target:{type:"story",id:e},payload:{name:i.name}});break;case"comment":a.dispatch({type:"comment",target:`story:${e}`,payload:{body:i.body}});break;case"delete":a.dispatch({type:"DELETE_STORY",target:{type:"story",id:e},payload:{}});break}this.mode=bt(this.mode,e,i)}#e(e,i){const a=this.context();a.dispatch(ut(a.state,e,i.item.id,i.hoveredId,i.place))}#d(e,i,a){const s=this.context(),d=b(s.state,a.item.id);if(!d)return;if(d.activityId!==e){this.mode={kind:"picking-step",storyId:d.id,activityId:e,milestoneId:i,point:{x:a.event.clientX,y:a.event.clientY}};return}const n=gt(s.state,e,i,d.id,a.hoveredId,a.place);n&&s.dispatch(n)}#n(e,i){const a=this.context(),s=a.state.milestones.map(n=>n.id),d=yt(s,i.item.id,i.hoveredId,i.place);d&&a.dispatch(d)}#r(e){const i=this.mode;if(i.kind!=="picking-step")return;const a=this.context();a.dispatch(vt(a.state,i.storyId,i.activityId,e,i.milestoneId)),this.mode=R}}const Dt=()=>{pe(),customElements.get("dpk-template-usm")||customElements.define("dpk-template-usm",xt)},Se=Object.freeze(Object.defineProperty({__proto__:null,DpkTemplateUsm:xt,IDLE_MODE:R,allUsmIds:D,applyUsmAction:it,cardModeOf:ft,defineUsmElement:Dt,describeUsmAction:nt,dropAfter:z,emptyUsmBase:Z,findActivity:O,findMilestone:k,findStep:f,findStory:b,flatSteps:tt,modeConcerns:F,parseUsmBase:W,reduceCardIntent:bt,resolveCellDrop:ut,resolveGroupDrop:gt,resolveMilestoneDrop:yt,resolvePickedStepMove:vt,resolveUsmNavigation:pt,serializeUsmAction:rt,storiesInCell:q,storyCountForStep:se,usmAction:Qt,usmActions:c,usmCommentTargets:lt,usmDefinition:mt,usmHasTarget:ct,usmTargetLabel:ot,usmTitle:G},Symbol.toStringTag,{value:"Module"}));export{Dt as d,Se as i};
