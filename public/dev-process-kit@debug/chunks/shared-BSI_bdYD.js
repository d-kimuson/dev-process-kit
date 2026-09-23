import{r as v,ak as f,w as Y,al as D,a8 as l,aj as x,aa as m,ab as g,ai as L,a4 as Ct,ap as Pt,a5 as A,a6 as C,a7 as P,Q as Vt,g as Ut,V as O,S as u,$ as J,a3 as qt,l as zt,am as X,a0 as $,a1 as c,J as Bt,D as jt,L as Kt,j as Gt,n as N,a2 as I,K as Ft,G as Ht,an as Jt,c as Q}from"./shared-BK58el9_.js";import{P as W,r as Xt,p as Qt,a as Wt}from"./shared-CC2bnOpD.js";import{o as V}from"./shared-Da_AA5_Q.js";const p={SET_ACTIVITY_NAME:v("SET_ACTIVITY_NAME","activity",f({name:m(l(),g(1))})),SET_STEP_NAME:v("SET_STEP_NAME","step",f({name:m(l(),g(1))})),REORDER_STEP:v("REORDER_STEP","step",f({after:D(l())}),{mode:"sequence"}),ADD_ACTIVITY:v("ADD_ACTIVITY","artifact",f({id:x,name:m(l(),g(1))}),{dedupeKey:Y}),ADD_STEP:v("ADD_STEP","activity",f({id:x,name:m(l(),g(1))}),{dedupeKey:Y}),DELETE_ACTIVITY:v("DELETE_ACTIVITY","activity",f({})),DELETE_STEP:v("DELETE_STEP","step",f({})),SET_STORY_NAME:v("SET_STORY_NAME","story",f({name:m(l(),g(1))})),SET_STORY_DESCRIPTION:v("SET_STORY_DESCRIPTION","story",f({description:l()})),SET_STORY_MILESTONE:v("SET_STORY_MILESTONE","story",f({milestoneId:D(l())})),MOVE_STORY:v("MOVE_STORY","story",f({activityId:m(l(),g(1)),stepId:m(l(),g(1)),milestoneId:D(l()),after:D(l())}),{mode:"sequence"}),REORDER_STORY:v("REORDER_STORY","story",f({after:D(l())}),{mode:"sequence"}),ADD_STORY:v("ADD_STORY","step",f({id:x,name:m(l(),g(1)),activityId:m(l(),g(1)),milestoneId:L(l())}),{dedupeKey:Y}),DELETE_STORY:v("DELETE_STORY","story",f({})),SET_MILESTONE_NAME:v("SET_MILESTONE_NAME","milestone",f({name:m(l(),g(1))})),ADD_MILESTONE:v("ADD_MILESTONE","artifact",f({id:x,name:m(l(),g(1))}),{dedupeKey:Y}),DELETE_MILESTONE:v("DELETE_MILESTONE","milestone",f({})),REORDER_MILESTONE:v("REORDER_MILESTONE","milestone",f({after:D(l())}),{mode:"sequence"})},Zt={setActivityName:(e,t)=>({type:"SET_ACTIVITY_NAME",target:{type:"activity",id:e},payload:{name:t}}),setStepName:(e,t)=>({type:"SET_STEP_NAME",target:{type:"step",id:e},payload:{name:t}})},te=A({id:m(l(),g(1)),name:m(l(),g(1))}),ee=A({id:x,name:m(l(),g(1)),steps:C(P(te),[])}),ie=A({id:m(l(),g(1)),name:m(l(),g(1))}),ae=A({id:x,name:m(l(),g(1)),description:L(l()),activityId:m(l(),g(1)),stepId:m(l(),g(1)),milestoneId:L(l())}),se=A({title:L(l()),activities:C(P(ee),[]),milestones:C(P(ie),[]),stories:C(P(ae),[])}),Z=e=>{const t=Ct(se,e),i=new Map;for(const n of t.activities)for(const o of n.steps)i.set(o.id,n.id);const a=new Set(t.milestones.map(n=>n.id)),s=new Set,r=(n,o)=>{if(s.has(o))throw new Error(`duplicate id "${o}" in ${n}`);s.add(o)};for(const n of t.activities){r("activities",n.id);for(const o of n.steps)r("steps",o.id)}for(const n of t.milestones)r("milestones",n.id);for(const n of t.stories){r("stories",n.id);const o=i.get(n.stepId);if(o===void 0||o!==n.activityId)throw new Error(`story "${n.id}" references unknown activityId/stepId`);if(n.milestoneId!==void 0&&!a.has(n.milestoneId))throw new Error(`story "${n.id}" references unknown milestoneId "${n.milestoneId}"`)}return t},tt=()=>({activities:[],milestones:[],stories:[]}),R=(e,t)=>{if(t!==void 0)return e.activities.find(i=>i.id===t)},j=(e,t)=>`${e}.${t}`,E=(e,t)=>{if(t===void 0)return;const i=Pt(t,2);if(i){const[a,s]=i;if(a===void 0||s===void 0)return;const r=e.activities.find(o=>o.id===a),n=r?.steps.find(o=>o.id===s);return r&&n?{activity:r,step:n}:void 0}if(!t.includes("."))for(const a of e.activities){const s=a.steps.find(r=>r.id===t);if(s)return{activity:a,step:s}}},S=(e,t)=>{if(t!==void 0)return e.milestones.find(i=>i.id===t)},b=(e,t)=>{if(t!==void 0)return e.stories.find(i=>i.id===t)},et=e=>e.activities.flatMap(t=>t.steps.map(i=>({activity:t,step:i}))),U=(e,t,i)=>e.stories.filter(a=>a.stepId===t&&(a.milestoneId??void 0)===i),it=(e,t,i)=>e.stories.filter(a=>a.activityId===t&&(a.milestoneId??void 0)===i),k=e=>[...e.activities.map(t=>t.id),...e.activities.flatMap(t=>t.steps.map(i=>i.id)),...e.milestones.map(t=>t.id),...e.stories.map(t=>t.id)],re=(e,t)=>e.stories.filter(i=>i.stepId===t).length,at=(e,t)=>{const i=Vt(p,t);if(i===null)return null;const a=i.target.id;switch(i.type){case"SET_ACTIVITY_NAME":{const{name:s}=i.payload;return e.activities.some(r=>r.id===a)?{...e,activities:e.activities.map(r=>r.id===a?{...r,name:s}:r)}:null}case"SET_STEP_NAME":{const{name:s}=i.payload,r=E(e,a);return r?{...e,activities:e.activities.map(n=>n.id===r.activity.id?{...n,steps:n.steps.map(o=>o.id===r.step.id?{...o,name:s}:o)}:n)}:null}case"REORDER_STEP":{const{after:s}=i.payload,r=E(e,a);if(!r)return null;const n=s===null?null:E(e,s);if(s!==null&&(!n||n.activity.id!==r.activity.id))return null;const o=rt(r.activity.steps,r.step.id,n?.step.id??null);return o===null?null:{...e,activities:e.activities.map(d=>d.id===r.activity.id?{...d,steps:o}:d)}}case"ADD_ACTIVITY":{const s=i.payload;return e.activities.some(r=>r.id===s.id)?e:{...e,activities:[...e.activities,{id:s.id,name:s.name,steps:[]}]}}case"ADD_STEP":{const s=i.payload,r=e.activities.find(n=>n.id===a);return r?r.steps.some(n=>n.id===s.id)?e:{...e,activities:e.activities.map(n=>n.id===a?{...n,steps:[...n.steps,{id:s.id,name:s.name}]}:n)}:null}case"DELETE_ACTIVITY":{const s=e.activities.find(n=>n.id===a);if(!s)return null;const r=new Set(s.steps.map(n=>n.id));return{...e,activities:e.activities.filter(n=>n.id!==a),stories:e.stories.filter(n=>n.activityId!==a&&!r.has(n.stepId))}}case"DELETE_STEP":{const s=E(e,a);return s?{...e,activities:e.activities.map(r=>r.id===s.activity.id?{...r,steps:r.steps.filter(n=>n.id!==s.step.id)}:r),stories:e.stories.filter(r=>r.activityId!==s.activity.id||r.stepId!==s.step.id)}:null}case"SET_STORY_NAME":{const{name:s}=i.payload;return K(e,a,r=>({...r,name:s}))}case"SET_STORY_DESCRIPTION":{const{description:s}=i.payload;return K(e,a,r=>({...r,description:s}))}case"SET_STORY_MILESTONE":{const{milestoneId:s}=i.payload;return s!==null&&!S(e,s)?null:K(e,a,r=>s===null?G(r):{...r,milestoneId:s})}case"MOVE_STORY":{const s=i.payload,r=b(e,a);if(!r)return null;const n=E(e,s.stepId);if(!n||n.activity.id!==s.activityId||s.milestoneId!==null&&!S(e,s.milestoneId))return null;const o=s.milestoneId??void 0,d=o===void 0?{...G(r),activityId:n.activity.id,stepId:n.step.id}:{...r,activityId:n.activity.id,stepId:n.step.id,milestoneId:o};return st(e,d,s.after)}case"REORDER_STORY":{const{after:s}=i.payload,r=b(e,a);return r?st(e,r,s,!0):null}case"ADD_STORY":{const s=i.payload,r=E(e,t.target.id);if(!r||r.activity.id!==s.activityId||s.milestoneId!==void 0&&!S(e,s.milestoneId))return null;if(e.stories.some(o=>o.id===s.id))return e;const n={id:s.id,name:s.name,activityId:s.activityId,stepId:r.step.id,...s.milestoneId===void 0?{}:{milestoneId:s.milestoneId}};return{...e,stories:[...e.stories,n]}}case"DELETE_STORY":return e.stories.some(s=>s.id===a)?{...e,stories:e.stories.filter(s=>s.id!==a)}:null;case"SET_MILESTONE_NAME":{const{name:s}=i.payload;return e.milestones.some(r=>r.id===a)?{...e,milestones:e.milestones.map(r=>r.id===a?{...r,name:s}:r)}:null}case"ADD_MILESTONE":{const s=i.payload;return e.milestones.some(r=>r.id===s.id)?e:{...e,milestones:[...e.milestones,{id:s.id,name:s.name}]}}case"DELETE_MILESTONE":return e.milestones.some(s=>s.id===a)?{...e,milestones:e.milestones.filter(s=>s.id!==a),stories:e.stories.map(s=>s.milestoneId===a?G(s):s)}:null;case"REORDER_MILESTONE":{const{after:s}=i.payload,r=rt(e.milestones,a,s);return r===null?null:{...e,milestones:r}}default:return Ut(i)}},K=(e,t,i)=>e.stories.some(a=>a.id===t)?{...e,stories:e.stories.map(a=>a.id===t?i(a):a)}:null,G=e=>{const{milestoneId:t,...i}=e;return i},st=(e,t,i,a=!1)=>{const s=t.milestoneId??void 0,r=e.stories.filter(y=>y.id!==t.id),n=r.filter(y=>y.stepId===t.stepId&&(y.milestoneId??void 0)===s);if(i!==null){const y=r.find(M=>M.id===i);if(!y||y.stepId!==t.stepId||(y.milestoneId??void 0)!==s)return null;if(a){const M=b(e,t.id);if(!M||y.stepId!==M.stepId||(y.milestoneId??void 0)!==(M.milestoneId??void 0))return null}}const o=i===null?[t,...n]:nt(n,t,i),d=r.findIndex(y=>y.stepId===t.stepId&&(y.milestoneId??void 0)===s),_=new Set(n.map(y=>y.id)),h=r.filter(y=>!_.has(y.id)),T=d<0?h.length:Math.min(d,h.length),Lt=[...h.slice(0,T),...o,...h.slice(T)];return{...e,stories:Lt}},rt=(e,t,i)=>{if(!e.some(r=>r.id===t)||i!==null&&!e.some(r=>r.id===i))return null;if(i===t)return[...e];const a=e.find(r=>r.id===t);if(a===void 0)return null;const s=e.filter(r=>r.id!==t);return nt(s,a,i)},nt=(e,t,i)=>{const a=[...e],s=i===null?-1:a.findIndex(r=>r.id===i);return a.splice(s+1,0,t),a},q=(e,t)=>{const i=typeof t=="string"?t:"",a=typeof e=="string"?e:void 0;return a===void 0?`\u2192 \u300C${i}\u300D`:`\u300C${a}\u300D\u2192\u300C${i}\u300D`},ne={SET_ACTIVITY_NAME:(e,t)=>({title:"\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3\u540D\u3092\u5909\u66F4",tone:"update",body:q(R(t,e.target.id)?.name,u(p.SET_ACTIVITY_NAME,e).name??"")}),SET_STEP_NAME:(e,t)=>({title:"\u30B9\u30C6\u30C3\u30D7\u540D\u3092\u5909\u66F4",tone:"update",body:q(E(t,e.target.id)?.step.name,u(p.SET_STEP_NAME,e).name??"")}),REORDER_STEP:e=>({title:"\u30B9\u30C6\u30C3\u30D7\u306E\u9806\u5E8F\u3092\u5909\u66F4",tone:"move",body:u(p.REORDER_STEP,e).after===null||u(p.REORDER_STEP,e).after===void 0?"\u2192 \u5148\u982D\u3078":`\u2192 \u300C${String(u(p.REORDER_STEP,e).after)}\u300D\u306E\u76F4\u5F8C\u3078`}),ADD_ACTIVITY:e=>({title:"\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3\u3092\u8FFD\u52A0",tone:"create",body:`+ \u300C${u(p.ADD_ACTIVITY,e).name??""}\u300D`}),ADD_STEP:e=>({title:"\u30B9\u30C6\u30C3\u30D7\u3092\u8FFD\u52A0",tone:"create",body:`+ \u300C${u(p.ADD_STEP,e).name??""}\u300D`}),DELETE_ACTIVITY:(e,t)=>({title:"\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3\u3092\u524A\u9664",tone:"delete",body:`\u2212 \u300C${R(t,e.target.id)?.name??e.target.id}\u300D`}),DELETE_STEP:(e,t)=>({title:"\u30B9\u30C6\u30C3\u30D7\u3092\u524A\u9664",tone:"delete",body:`\u2212 \u300C${E(t,e.target.id)?.step.name??e.target.id}\u300D`}),SET_STORY_NAME:(e,t)=>({title:"\u30B9\u30C8\u30FC\u30EA\u30FC\u540D\u3092\u5909\u66F4",tone:"update",body:q(b(t,e.target.id)?.name,u(p.SET_STORY_NAME,e).name??"")}),SET_STORY_DESCRIPTION:e=>({title:"\u30B9\u30C8\u30FC\u30EA\u30FC\u306E\u8AAC\u660E\u3092\u66F4\u65B0",tone:"update",body:`\u2192 \u300C${String(u(p.SET_STORY_DESCRIPTION,e).description??"").slice(0,90)}\u300D`}),SET_STORY_MILESTONE:(e,t)=>({title:"\u30DE\u30A4\u30EB\u30B9\u30C8\u30FC\u30F3\u3092\u5909\u66F4",tone:"move",body:u(p.SET_STORY_MILESTONE,e).milestoneId===null||u(p.SET_STORY_MILESTONE,e).milestoneId===void 0?"\u2192 \u672A\u5272\u5F53\u3078":`\u2192 ${S(t,String(u(p.SET_STORY_MILESTONE,e).milestoneId))?.name??String(u(p.SET_STORY_MILESTONE,e).milestoneId)}`}),MOVE_STORY:(e,t)=>({title:"\u30B9\u30C8\u30FC\u30EA\u30FC\u3092\u79FB\u52D5",tone:"move",body:`\u2192 ${E(t,String(u(p.MOVE_STORY,e).stepId))?.step.name??String(u(p.MOVE_STORY,e).stepId??"")}`}),REORDER_STORY:e=>({title:"\u30B9\u30C8\u30FC\u30EA\u30FC\u306E\u9806\u5E8F\u3092\u5909\u66F4",tone:"move",body:u(p.REORDER_STORY,e).after===null||u(p.REORDER_STORY,e).after===void 0?"\u2192 \u5148\u982D\u3078":`\u2192 \u300C${String(u(p.REORDER_STORY,e).after)}\u300D\u306E\u76F4\u5F8C\u3078`}),ADD_STORY:e=>({title:"\u30B9\u30C8\u30FC\u30EA\u30FC\u3092\u8FFD\u52A0",tone:"create",body:`+ \u300C${u(p.ADD_STORY,e).name??""}\u300D`}),DELETE_STORY:(e,t)=>({title:"\u30B9\u30C8\u30FC\u30EA\u30FC\u3092\u524A\u9664",tone:"delete",body:`\u2212 \u300C${b(t,e.target.id)?.name??e.target.id}\u300D`}),SET_MILESTONE_NAME:(e,t)=>({title:"\u30DE\u30A4\u30EB\u30B9\u30C8\u30FC\u30F3\u540D\u3092\u5909\u66F4",tone:"update",body:q(S(t,e.target.id)?.name,u(p.SET_MILESTONE_NAME,e).name??"")}),ADD_MILESTONE:e=>({title:"\u30DE\u30A4\u30EB\u30B9\u30C8\u30FC\u30F3\u3092\u8FFD\u52A0",tone:"create",body:`+ \u300C${u(p.ADD_MILESTONE,e).name??""}\u300D`}),DELETE_MILESTONE:(e,t)=>({title:"\u30DE\u30A4\u30EB\u30B9\u30C8\u30FC\u30F3\u3092\u524A\u9664",tone:"delete",body:`\u2212 \u300C${S(t,e.target.id)?.name??e.target.id}\u300D`}),REORDER_MILESTONE:e=>({title:"\u30DE\u30A4\u30EB\u30B9\u30C8\u30FC\u30F3\u306E\u9806\u5E8F\u3092\u5909\u66F4",tone:"move",body:u(p.REORDER_MILESTONE,e).after===null||u(p.REORDER_MILESTONE,e).after===void 0?"\u2192 \u5148\u982D\u3078":`\u2192 \u300C${String(u(p.REORDER_MILESTONE,e).after)}\u300D\u306E\u76F4\u5F8C\u3078`})},ot=(e,t,i)=>{let a;try{const s=ne[e.type];a=s?s(e,i??t):{title:e.type,tone:"meta"}}catch{a={title:e.type,tone:"meta"}}return{title:a.title,targetLabel:lt(t,e.target),tone:a.tone,...a.body===void 0?{}:{summary:a.body}}},dt=e=>`${e.type} ${O(e.target)} ${JSON.stringify(e.payload)}`,lt=(e,t)=>{try{switch(t.type){case"activity":{const i=R(e,t.id);return i?`\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3 \xB7 ${i.name}`:`\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3 \xB7 ${t.id} (missing)`}case"step":{const i=E(e,t.id)?.step;return i?`\u30B9\u30C6\u30C3\u30D7 \xB7 ${i.name}`:`\u30B9\u30C6\u30C3\u30D7 \xB7 ${t.id} (missing)`}case"story":{const i=b(e,t.id);return i?`\u30B9\u30C8\u30FC\u30EA\u30FC \xB7 ${i.name}`:`\u30B9\u30C8\u30FC\u30EA\u30FC \xB7 ${t.id} (missing)`}case"milestone":{const i=S(e,t.id);return i?`\u30DE\u30A4\u30EB\u30B9\u30C8\u30FC\u30F3 \xB7 ${i.name}`:`\u30DE\u30A4\u30EB\u30B9\u30C8\u30FC\u30F3 \xB7 ${t.id} (missing)`}case"artifact":return`\u30DE\u30C3\u30D7 \xB7 ${F(e)}`;default:return`${t.type} \xB7 ${t.id}`}}catch{return`${t.type} \xB7 ${t.id}`}},ct=(e,t)=>{const i=[{value:"artifact:usm",label:"\u30DE\u30C3\u30D7\u5168\u4F53",group:"\u30DE\u30C3\u30D7"}];for(const a of e.activities){i.push({value:O({type:"activity",id:a.id}),label:a.name,group:"\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3"});for(const s of a.steps)i.push({value:O({type:"step",id:j(a.id,s.id)}),label:`${a.name} \u203A ${s.name}`,group:"\u30B9\u30C6\u30C3\u30D7"})}for(const a of e.milestones)i.push({value:O({type:"milestone",id:a.id}),label:a.name,group:"\u30DE\u30A4\u30EB\u30B9\u30C8\u30FC\u30F3"});for(const a of e.stories)i.push({value:O({type:"story",id:a.id}),label:a.name,group:"\u30B9\u30C8\u30FC\u30EA\u30FC"});return i},oe=(e,t)=>{const i=e.stories.find(a=>a.id===t.story);if(i)return{value:O({type:"story",id:i.id}),label:i.name,group:"\u30B9\u30C8\u30FC\u30EA\u30FC"};for(const a of e.activities){const s=a.steps.find(r=>r.id===t.step);if(s)return{value:O({type:"step",id:j(a.id,s.id)}),label:s.name,group:"\u30B9\u30C6\u30C3\u30D7"}}return null},F=e=>e.title??"User Story Mapping",pt=(e,t)=>{const i=E(e,t.step),a=i?.activity??R(e,t.activity)??e.activities[0],s=i?.step??a?.steps.find(o=>o.id===t.step)??a?.steps[0],r=b(e,t.story),n={...t};return a?n.activity=a.id:delete n.activity,s?n.step=s.id:delete n.step,r?n.story=r.id:delete n.story,n.view=t.view==="group"?"group":"activity",n},ut=(e,t)=>{switch(t.type){case"activity":return R(e,t.id)!==void 0;case"step":return E(e,t.id)!==void 0;case"story":return b(e,t.id)!==void 0;case"milestone":return S(e,t.id)!==void 0;case"artifact":return!0;default:return!1}},mt={name:"usm",label:"User Story Mapping",parseBase:Z,emptyBase:tt,actions:p,apply:at,hasTarget:ut,canonicalTarget:(e,t)=>{if(t.type!=="step")return t;const i=E(e,t.id);return i?{...t,id:j(i.activity.id,i.step.id)}:t},describe:ot,serialize:dt,resolveNavigation:pt,commentTargets:(e,t)=>ct(e),currentTarget:(e,t)=>oe(e,t),title:F},z={kind:"idle"},gt="text/plain",de=e=>`${e.type}:${e.id}`,le=(e,t)=>{const i=(e??"").trim();if(i.length===0)return null;const a=i.indexOf(":");if(a<0)return{type:t,id:i};const s=i.slice(0,a),r=i.slice(a+1);return s.length===0||r.length===0?null:{type:s,id:r}},ce=(e,t)=>t<=e.top+e.height/2?"before":"after";class pe{#i;#t=z;#a;constructor(t){this.#i=t,t.addController(this)}hostDisconnected(){this.reset()}get state(){return this.#t}get item(){return this.#t.kind==="dragging"?this.#t.item:null}isDragging(t,i){const a=this.item;return a!==null&&a.type===t&&a.id===i}isOver(t){return this.#t.kind!=="idle"&&this.#t.over===t}reset(){clearTimeout(this.#a),this.#a=void 0,this.#r(z)}source(t){return{dragstart:i=>{i.dataTransfer&&(i.dataTransfer.setData(gt,de(t)),i.dataTransfer.effectAllowed="move"),clearTimeout(this.#a),this.#a=setTimeout(()=>{this.#a=void 0,this.#r({kind:"dragging",item:t,over:null})},0)},dragend:()=>this.reset()}}target(t){return{dragenter:i=>{this.#s(t.accepts)&&(i.preventDefault(),this.#e(t.key))},dragover:i=>{this.#s(t.accepts)&&(i.preventDefault(),i.dataTransfer&&(i.dataTransfer.dropEffect="move"),this.#e(t.key))},dragleave:()=>{this.isOver(t.key)&&this.#e(null)},drop:i=>{i.preventDefault();const a=le(i.dataTransfer?.getData(gt),t.accepts)??this.item;if(this.#r(z),!a||a.type!==t.accepts)return;const s=t.hovered?.(i)??null;t.onDrop({item:{type:t.accepts,id:a.id},hoveredId:s?.id??null,place:s?ce(s.element.getBoundingClientRect(),i.clientY):"end",event:i})}}}#s(t){const i=this.item;return i===null||i.type===t}#e(t){const i=this.#t;if(i.kind==="dragging"){i.over!==t&&this.#r({...i,over:t});return}if(t===null){i.kind==="receiving"&&this.#r(z);return}(i.kind==="idle"||i.over!==t)&&this.#r({kind:"receiving",over:t})}#r(t){this.#t!==t&&(this.#t=t,this.#i.requestUpdate())}}const ue={width:300,height:260},me=J`
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
`;class vt extends qt{static{this.styles=[zt,me,X]}static{this.properties={story:{attribute:!1},notes:{attribute:!1},mode:{type:String,reflect:!0,attribute:"data-mode"},focused:{type:Boolean,reflect:!0},dragging:{type:Boolean,reflect:!0},onIntent:{attribute:!1}}}#i="";#t=new W(this);constructor(){super(),this.story=null,this.notes=[],this.mode="view",this.focused=!1,this.dragging=!1,this.onIntent=null,this.addEventListener("click",()=>this.#e({kind:"select"}))}updated(t){if(t.has("mode")&&(this.mode!=="commenting"&&(this.#i=""),this.mode==="editing"&&this.renderRoot.querySelector("artifact-inline-edit")?.startEditing()),this.mode!=="commenting")return;const i=this.renderRoot.querySelector(".comment-pop"),a=this.renderRoot.querySelector('[data-role="comment"]');i&&a&&this.#t.open(i,a,ue)}render(){const t=this.story;if(!t)return $;const i=this.mode==="editing",a=this.mode==="commenting";return c`
      <div class="card-name">
        ${i?c`<artifact-inline-edit
                .value=${t.name}
                .label=${"\u30B9\u30C8\u30FC\u30EA\u30FC\u540D"}
                @artifact-commit=${V(s=>this.#e({kind:"rename",name:s}))}
              ></artifact-inline-edit>`:c`<span>${t.name}</span>`}
      </div>
      ${t.description?c`<div class="card-text">${t.description}</div>`:$}
      <div class="card-tools">
        <button
          class="af-icon-btn"
          type="button"
          data-role="edit"
          aria-label="タイトルを編集"
          data-active=${String(i)}
          @click=${this.#s({kind:"toggle-edit"})}
        >
          ${Bt()}
        </button>
        <button
          class="af-icon-btn"
          type="button"
          data-role="comment"
          aria-label="コメント"
          data-active=${String(a)}
          @click=${this.#s({kind:"toggle-comment"})}
        >
          ${jt()}
          ${this.notes.length>0?c`<span class="af-icon-badge">${this.notes.length}</span>`:$}
        </button>
        <button
          class="af-icon-btn"
          type="button"
          data-role="delete"
          aria-label="削除"
          @click=${this.#s({kind:"delete"})}
        >
          ${Kt()}
        </button>
      </div>
      ${a?this.#a():$}
    `}#a(){return Xt(Qt(this.#i,this.notes.map(Gt)),t=>{t.kind==="input"?(this.#i=t.body,this.requestUpdate()):this.#e(t)})}#s(t){return i=>{i.stopPropagation(),this.#e(t)}}#e(t){this.onIntent?.(t)}}const ft=(e="artifact-usm-card")=>{customElements.get(e)||customElements.define(e,vt)},B=(e,t,i)=>{const a=e.at(-1)??null;if(t===null||i==="end")return a;const s=e.indexOf(t);return s<0?a:i==="after"?t:s===0?null:e.at(s-1)??null},yt=(e,t,i,a,s)=>{const r=U(e,t.stepId,t.milestoneId).filter(n=>n.id!==i).map(n=>n.id);return{type:"MOVE_STORY",target:{type:"story",id:i},payload:{activityId:t.activityId,stepId:t.stepId,milestoneId:t.milestoneId??null,after:B(r,a,s)}}},ht=(e,t,i,a,s,r)=>{const n=b(e,a);if(!n||n.activityId!==t)return null;const o=it(e,t,i).filter(d=>d.id!==a).map(d=>d.id);return{type:"MOVE_STORY",target:{type:"story",id:a},payload:{activityId:t,stepId:n.stepId,milestoneId:i??null,after:B(o,s,r)}}},Et=(e,t,i,a,s)=>{const r=U(e,a,s).filter(n=>n.id!==t);return{type:"MOVE_STORY",target:{type:"story",id:t},payload:{activityId:i,stepId:a,milestoneId:s??null,after:r.at(-1)?.id??null}}},bt=(e,t,i,a)=>{if(!e.includes(t))return null;const s=e.filter(r=>r!==t);return{type:"REORDER_MILESTONE",target:{type:"milestone",id:t},payload:{after:B(s,i,a)}}},Tt=e=>{const t=N("new-activity",k(e.state));if(!e.dispatch({type:"ADD_ACTIVITY",target:{type:"artifact",id:"usm"},payload:{id:t,name:"\u65B0\u3057\u3044\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3"}}).ok)return;const i=N("new-step",[...k(e.state),t]);e.dispatch({type:"ADD_STEP",target:{type:"activity",id:t},payload:{id:i,name:"\u65B0\u3057\u3044\u30B9\u30C6\u30C3\u30D7"}}),e.navigate({activity:t,step:null,story:null})},ge=(e,t)=>{const i=N("new-step",k(e.state));e.dispatch({type:"ADD_STEP",target:{type:"activity",id:t},payload:{id:i,name:"\u65B0\u3057\u3044\u30B9\u30C6\u30C3\u30D7"}})},ve=e=>{const t=N("new-milestone",k(e.state));e.dispatch({type:"ADD_MILESTONE",target:{type:"artifact",id:"usm"},payload:{id:t,name:"\u65B0\u3057\u3044\u30DE\u30A4\u30EB\u30B9\u30C8\u30FC\u30F3"}})},It=(e,t,i,a)=>{const s=N("new-story",k(e.state));e.dispatch({type:"ADD_STORY",target:{type:"step",id:i},payload:{id:s,name:"\u65B0\u3057\u3044\u30B9\u30C8\u30FC\u30EA\u30FC",activityId:t,...a===void 0?{}:{milestoneId:a}}}).ok&&e.navigate({activity:t,step:i,story:s})},w={kind:"idle"},H=(e,t)=>e.kind!=="idle"&&e.storyId===t,St=(e,t)=>H(e,t)&&(e.kind==="editing"||e.kind==="commenting")?e.kind:"view",$t=(e,t,i)=>{switch(i.kind){case"toggle-edit":return e.kind==="editing"&&e.storyId===t?w:{kind:"editing",storyId:t};case"toggle-comment":return e.kind==="commenting"&&e.storyId===t?w:{kind:"commenting",storyId:t};case"rename":case"comment":case"dismiss":case"delete":return H(e,t)?w:e;case"select":return e}},_t=e=>[...e.milestones.map(({id:t,name:i})=>({id:t,name:i})),{id:void 0,name:"\u672A\u5272\u5F53"}],fe=e=>c`
    <div class="empty">
      <h2>バックボーンがまだありません</h2>
      <p>アクティビティとステップを追加すると、ここにストーリーマップが現れます。</p>
      <button class="af-btn af-btn--accent" type="button" @click=${()=>Tt(e)}>
        ＋ 最初のアクティビティ
      </button>
    </div>
  `,ye=e=>{const{context:t}=e,i=et(t.state);if(i.length===0)return fe(t);const a=t.navigation.view==="group"?"group":"activity";return c`
    <div class="view-tabs" role="tablist" aria-label="まとめる単位">
      ${Ot(t,"activity",a,"\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3")}
      ${Ot(t,"group",a,"\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3\u30B0\u30EB\u30FC\u30D7")}
    </div>
    ${a==="activity"?he(e,i):Ee(e)}
  `},Ot=(e,t,i,a)=>{const s=t===i;return c`<a
    class="tab"
    role="tab"
    data-current=${String(s)}
    aria-selected=${s?"true":"false"}
    href=${e.hashFor({view:t})}
    >${a}</a
  >`},he=(e,t)=>{const{context:i}=e,{state:a}=i,s=_t(a);return c`
    <div class="map-scroll">
      <div class="map" style=${`--cols:${t.length+1}`} data-testid="usm-map">
        <div class="map-row">
          <div class="corner">
            <span class="af-label">アクティビティグループ →</span>
          </div>
          ${I(a.activities,r=>r.id,r=>wt(i,r.id,`grid-column: span ${Math.max(r.steps.length,1)}`))}
          ${Dt(i)}
        </div>
        <div class="map-row">
          ${Rt()}
          ${I(t,({activity:r,step:n})=>`${r.id}.${n.id}`,({step:r})=>c`
              <div class="col-head" data-current=${String(i.navigation.step===r.id)}>
                <h4>
                  <artifact-inline-edit
                    .value=${r.name}
                    .label=${"\u30B9\u30C6\u30C3\u30D7\u540D"}
                    @artifact-commit=${V(n=>i.dispatch({type:"SET_STEP_NAME",target:{type:"step",id:r.id},payload:{name:n}}))}
                    @click=${n=>n.stopPropagation()}
                  ></artifact-inline-edit>
                </h4>
              </div>
            `)}
          <div class="corner"><span class="af-label">—</span></div>
        </div>
        ${I(s,r=>r.id,r=>kt(e,r,c`${I(t,({activity:n,step:o})=>`${n.id}.${o.id}`,({activity:n,step:o})=>be(e,{activityId:n.id,stepId:o.id,milestoneId:r.id}))}`))}
        ${xt(i,t.length)}
      </div>
    </div>
  `},Ee=e=>{const{context:t}=e,{state:i}=t,a=_t(i);return c`
    <div class="map-scroll">
      <div class="map" style=${`--cols:${i.activities.length+1}`} data-testid="usm-map-group">
        <div class="map-row">
          ${Rt()}
          ${I(i.activities,s=>s.id,s=>wt(t,s.id))}
          ${Dt(t)}
        </div>
        ${I(a,s=>s.id,s=>kt(e,s,c`${I(i.activities,r=>r.id,r=>Te(e,r.id,s.id))}`))}
        ${xt(t,i.activities.length)}
      </div>
    </div>
  `},Rt=()=>c`<div class="corner">
    <span class="af-label">アクティビティ →</span>
    <span class="af-label">マイルストーン ↓</span>
  </div>`,wt=(e,t,i)=>{const a=e.state.activities.find(s=>s.id===t);return a?c`
    <div class="act-head" style=${i??$}>
      <artifact-inline-edit
        .value=${a.name}
        .label=${"\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3\u540D"}
        @artifact-commit=${V(s=>e.dispatch({type:"SET_ACTIVITY_NAME",target:{type:"activity",id:a.id},payload:{name:s}}))}
      ></artifact-inline-edit>
      <button
        class="af-icon-btn"
        type="button"
        aria-label="このアクティビティにステップを追加"
        @click=${()=>ge(e,a.id)}
      >
        ${Ft()}
      </button>
    </div>
  `:c`<div class="act-head"></div>`},Dt=e=>c`<div class="act-head">
    <button class="af-btn af-btn--ghost" type="button" @click=${()=>Tt(e)}>＋ アクティビティ</button>
  </div>`,xt=(e,t)=>c`<div class="map-row">
    <div class="row-head">
      <button class="af-btn af-btn--ghost" type="button" @click=${()=>ve(e)}>
        ＋ マイルストーン
      </button>
    </div>
    ${Array.from({length:t+1},()=>c`<div class="cell"></div>`)}
  </div>`,kt=(e,t,i)=>{const{context:a,drag:s,handlers:r}=e,n=t.id;if(n===void 0)return c`<div class="map-row" data-draggable="false" data-row-dragging="false" data-row-drop="false">
      <div class="row-head" data-milestone="" draggable="false"><span>${t.name}</span></div>
      ${i}
      <div class="cell"></div>
    </div>`;const o=`row:${n}`,d=s.target({key:o,accepts:"milestone",hovered:Se,onDrop:h=>r.dropOnMilestoneRow(n,h)}),_=s.source({type:"milestone",id:n});return c`
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
        @dragstart=${h=>{Ie(h),_.dragstart(h)}}
        @dragend=${_.dragend}
      >
        <span class="row-grip" aria-hidden="true">${Ht()}</span
        ><artifact-inline-edit
          draggable="false"
          .value=${t.name}
          .label=${"\u30DE\u30A4\u30EB\u30B9\u30C8\u30FC\u30F3\u540D"}
          @artifact-commit=${V(h=>a.dispatch({type:"SET_MILESTONE_NAME",target:{type:"milestone",id:n},payload:{name:h}}))}
        ></artifact-inline-edit>
      </div>
      ${i}
      <div class="cell"></div>
    </div>
  `},be=(e,t)=>{const{context:i,drag:a,handlers:s}=e,r=U(i.state,t.stepId,t.milestoneId),n=`cell:${t.stepId}:${t.milestoneId??""}`,o=a.target({key:n,accepts:"story",hovered:At,onDrop:d=>s.dropOnCell(t,d)});return c`
    <div
      class="cell"
      data-step=${t.stepId}
      data-milestone=${t.milestoneId??""}
      data-drop=${String(a.isOver(n))}
      @dragenter=${o.dragenter}
      @dragover=${o.dragover}
      @dragleave=${o.dragleave}
      @drop=${o.drop}
    >
      <div class="card-list" data-testid=${`cell-${t.stepId}-${t.milestoneId??"unassigned"}`}>
        ${I(r,d=>d.id,d=>Mt(e,d))}
      </div>
      <button
        class="af-btn af-btn--ghost add-cell"
        type="button"
        title="このマスにストーリーを追加"
        @click=${()=>It(i,t.activityId,t.stepId,t.milestoneId)}
      >
        ＋ 追加
      </button>
    </div>
  `},Te=(e,t,i)=>{const{context:a,drag:s,handlers:r}=e,{state:n}=a,o=it(n,t,i),d=n.activities.find(T=>T.id===t)?.steps[0],_=`group:${t}:${i??""}`,h=s.target({key:_,accepts:"story",hovered:At,onDrop:T=>r.dropOnGroupCell(t,i,T)});return c`
    <div
      class="cell"
      data-activity=${t}
      data-milestone=${i??""}
      data-drop=${String(s.isOver(_))}
      @dragenter=${h.dragenter}
      @dragover=${h.dragover}
      @dragleave=${h.dragleave}
      @drop=${h.drop}
    >
      <div class="card-list" data-testid=${`group-cell-${t}-${i??"unassigned"}`}>
        ${I(o,T=>T.id,T=>Mt(e,T))}
      </div>
      ${d?c`<button
              class="af-btn af-btn--ghost add-cell"
              type="button"
              aria-label="このマスにストーリーを追加"
              @click=${()=>It(a,t,d.id,i)}
            >
              ＋ 追加
            </button>`:$}
    </div>
  `},Mt=(e,t)=>{const{context:i,mode:a,drag:s,handlers:r}=e,n=i.comments.filter(d=>d.target.type==="story"&&d.target.id===t.id),o=s.source({type:"story",id:t.id});return c`<artifact-usm-card
    data-story=${t.id}
    draggable="true"
    .story=${t}
    .notes=${n}
    .mode=${St(a,t.id)}
    .onIntent=${d=>r.cardIntent(t.id,d)}
    ?focused=${i.navigation.story===t.id}
    ?dragging=${s.isDragging("story",t.id)}
    @dragstart=${o.dragstart}
    @dragend=${o.dragend}
  ></artifact-usm-card>`},At=e=>{const t=e.target instanceof Element?e.target.closest("artifact-usm-card"):null;return t?{id:t.getAttribute("data-story"),element:t}:null},Ie=e=>{const t=(e.currentTarget instanceof Element?e.currentTarget:null)?.closest(".map-row");if(!t||!e.dataTransfer)return;const i=t.getBoundingClientRect();e.dataTransfer.setDragImage(t,e.clientX-i.left,e.clientY-i.top)},Se=e=>{const t=e.target instanceof Element?e.target.closest(".map-row"):null,i=t?.querySelector(".row-head[data-milestone]");if(!t||!i)return null;const a=i.getAttribute("data-milestone");return{id:a===""?null:a,element:t}},$e=(e,t,i)=>{if(t.kind!=="picking-step")return $;const a=b(e.state,t.storyId),s=R(e.state,t.activityId);if(!a||!s)return $;const r=s.steps[0]?.id;return c`<div class="comment-pop move-dialog" id="move-dialog" popover="manual">
    <span class="af-label">移動先のアクティビティ</span>
    <select class="af-select" aria-label="移動先" data-move-dialog>
      ${s.steps.map(n=>c`<option value=${n.id} ?selected=${n.id===r}>${n.name}</option>`)}
    </select>
    <div class="pop-actions">
      <button
        class="af-btn af-btn--accent"
        type="button"
        @click=${n=>{const o=(Jt(n.currentTarget,HTMLElement)?.closest("#move-dialog")??null)?.querySelector("select")?.value??r;o?i.confirm(o):i.cancel()}}
      >
        移動する
      </button>
      <button class="af-btn" type="button" @click=${i.cancel}>キャンセル</button>
    </div>
  </div>`},_e=J`
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
`,Oe={width:300,height:240};class Nt extends Q{constructor(){super(),this.definition=mt,this.#i=new pe(this),this.#t=new W(this),this.mode=w}static{this.styles=[Q.styles,_e,X]}static{this.properties={mode:{state:!0}}}#i;#t;renderRegions(t){return{main:this.#a(t)}}updated(){if(super.updated(),this.mode.kind!=="picking-step")return;const t=this.renderRoot.querySelector("#move-dialog");t&&this.#t.open(t,Wt(this.mode.point.x,this.mode.point.y),Oe)}#a(t){return c`
      ${ye({context:t,mode:this.mode,drag:this.#i,handlers:{cardIntent:(i,a)=>this.#s(i,a),dropOnCell:(i,a)=>this.#e(i,a),dropOnGroupCell:(i,a,s)=>this.#r(i,a,s),dropOnMilestoneRow:(i,a)=>this.#n(i,a)}})}
      ${$e(t,this.mode,{confirm:i=>this.#o(i),cancel:()=>this.mode=w})}
    `}#s(t,i){const a=this.context();switch(i.kind){case"select":{const s=b(a.state,t);s&&a.navigate({step:s.stepId,story:s.id});break}case"rename":a.dispatch({type:"SET_STORY_NAME",target:{type:"story",id:t},payload:{name:i.name}});break;case"comment":a.dispatch({type:"comment",target:`story:${t}`,payload:{body:i.body}});break;case"delete":a.dispatch({type:"DELETE_STORY",target:{type:"story",id:t},payload:{}});break}this.mode=$t(this.mode,t,i)}#e(t,i){const a=this.context();a.dispatch(yt(a.state,t,i.item.id,i.hoveredId,i.place))}#r(t,i,a){const s=this.context(),r=b(s.state,a.item.id);if(!r)return;if(r.activityId!==t){this.mode={kind:"picking-step",storyId:r.id,activityId:t,milestoneId:i,point:{x:a.event.clientX,y:a.event.clientY}};return}const n=ht(s.state,t,i,r.id,a.hoveredId,a.place);n&&s.dispatch(n)}#n(t,i){const a=this.context(),s=a.state.milestones.map(n=>n.id),r=bt(s,i.item.id,i.hoveredId,i.place);r&&a.dispatch(r)}#o(t){const i=this.mode;if(i.kind!=="picking-step")return;const a=this.context();a.dispatch(Et(a.state,i.storyId,i.activityId,t,i.milestoneId)),this.mode=w}}const Yt=(e="artifact-usm")=>{ft(),customElements.get(e)||customElements.define(e,Nt)},Re=Object.freeze(Object.defineProperty({__proto__:null,IDLE_MODE:w,UsmElement:Nt,UsmStoryCard:vt,allUsmIds:k,applyUsmAction:at,cardModeOf:St,defineUsmElement:Yt,defineUsmStoryCard:ft,describeUsmAction:ot,dropAfter:B,emptyUsmBase:tt,findActivity:R,findMilestone:S,findStep:E,findStory:b,flatSteps:et,modeConcerns:H,parseUsmBase:Z,reduceCardIntent:$t,resolveCellDrop:yt,resolveGroupDrop:ht,resolveMilestoneDrop:bt,resolvePickedStepMove:Et,resolveUsmNavigation:pt,serializeUsmAction:dt,storiesInCell:U,storyCountForStep:re,usmAction:Zt,usmActions:p,usmCommentTargets:ct,usmDefinition:mt,usmHasTarget:ut,usmTargetLabel:lt,usmTitle:F},Symbol.toStringTag,{value:"Module"}));export{Yt as d,Re as i};
