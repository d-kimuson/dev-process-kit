import{a4 as It,ap as X,a5 as V,a6 as x,a7 as Y,ai as w,a8 as c,aj as R,aa as h,ab as b,a9 as D,r as y,ak as u,w as B,al as N,Q as Rt,g as Pt,V as C,S as f,U as Dt,aq as $t,ar as At,a0 as I,as as Ot,a1 as m,a2 as kt,B as Vt,n as Yt,$ as Nt,c as at}from"./shared-BK58el9_.js";import{a as rt,o as st}from"./shared-Da_AA5_Q.js";const K=["browser","native"],j=["mobile","tablet","desktop","fluid"],Ct=V({id:R,kind:x(D(K),"browser"),viewport:x(D(j),"fluid"),label:w(c()),url:w(c())}),Mt=V({id:R,name:h(c(),b(1)),description:w(c()),previews:x(Y(Ct),[])}),Wt=V({id:R,name:h(c(),b(1)),description:w(c()),steps:x(Y(Mt),[])}),Lt=V({id:R,name:h(c(),b(1)),description:w(c()),stories:x(Y(Wt),[])}),ot=V({title:w(c()),baseUrl:w(c()),activities:x(Y(Lt),[])}),Ut=t=>{const e=new Set,i=new Set;for(const r of t.activities){if(i.has(r.id))return`duplicate activity id "${r.id}"`;i.add(r.id);const a=new Set;for(const s of r.stories){if(a.has(s.id))return`duplicate story id "${s.id}" in activity "${r.id}"`;a.add(s.id);const o=new Set;for(const n of s.steps){if(o.has(n.id))return`duplicate step id "${n.id}" in story "${s.id}"`;o.add(n.id);for(const d of n.previews){if(e.has(d.id))return`duplicate preview id "${d.id}": preview ids are global, they name a light DOM slot`;e.add(d.id)}}}}return null},nt=t=>{const e=It(ot,t),i=Ut(e);if(i!==null)throw new Error(i);return e},dt=()=>({activities:[]}),$=(t,e)=>{if(e!==void 0)return t.activities.find(i=>i.id===e)},P=(t,e)=>`${t}.${e}`,g=(t,e)=>{if(e===void 0)return;const i=X(e,2);if(i){const[a,s]=i;if(a===void 0||s===void 0)return;const o=t.activities.find(d=>d.id===a),n=o?.stories.find(d=>d.id===s);return o&&n?{activity:o,story:n}:void 0}if(e.includes("."))return;const r=t.activities.flatMap(a=>a.stories.filter(s=>s.id===e).map(s=>({activity:a,story:s})));return r.length===1?r[0]:void 0},pt=t=>{const e=t.lastIndexOf(".");return e>=0?t.slice(e+1):t},M=t=>`${t.activity.id}.${t.story.id}.${t.step.id}`,q=(t,e,i)=>`${t.id}.${e.id}.${i.id}`,E=(t,e)=>{if(e===void 0)return;const i=X(e,3);if(i){const[a,s,o]=i;if(a===void 0||s===void 0||o===void 0)return;const n=t.activities.find(l=>l.id===a),d=n?.stories.find(l=>l.id===s),p=d?d.steps.findIndex(l=>l.id===o):-1,S=d&&p>=0?d.steps[p]:void 0;return n&&d&&S?{activity:n,story:d,step:S,stepIndex:p}:void 0}if(e.includes("."))return;const r=H(t).filter(a=>a.step.id===e);return r.length===1?r[0]:void 0},_=(t,e)=>{if(e===void 0)return;const i=X(e,4);if(i){const[r,a,s,o]=i;if(r===void 0||a===void 0||s===void 0||o===void 0)return;const n=E(t,`${r}.${a}.${s}`),d=n?.step.previews.find(p=>p.id===o);return n&&d?{location:n,preview:d}:void 0}if(!e.includes("."))for(const r of t.activities)for(const a of r.stories)for(const[s,o]of a.steps.entries()){const n=o.previews.find(d=>d.id===e);if(n)return{location:{activity:r,story:a,step:o,stepIndex:s},preview:n}}},H=t=>t.activities.flatMap(e=>e.stories.flatMap(i=>i.steps.map((r,a)=>({activity:e,story:i,step:r,stepIndex:a})))),lt=t=>H(t).map(e=>e.step.id),v={SET_ACTIVITY_NAME:y("SET_ACTIVITY_NAME","activity",u({name:h(c(),b(1))})),SET_ACTIVITY_DESCRIPTION:y("SET_ACTIVITY_DESCRIPTION","activity",u({description:c()})),SET_STORY_NAME:y("SET_STORY_NAME","story",u({name:h(c(),b(1))})),SET_STORY_DESCRIPTION:y("SET_STORY_DESCRIPTION","story",u({description:c()})),SET_STEP_NAME:y("SET_STEP_NAME","step",u({name:h(c(),b(1))})),SET_STEP_DESCRIPTION:y("SET_STEP_DESCRIPTION","step",u({description:c()})),SET_PREVIEW_KIND:y("SET_PREVIEW_KIND","preview",u({kind:D(K)})),SET_PREVIEW_VIEWPORT:y("SET_PREVIEW_VIEWPORT","preview",u({viewport:D(j)})),SET_PREVIEW_LABEL:y("SET_PREVIEW_LABEL","preview",u({label:c()})),REORDER_ACTIVITY:y("REORDER_ACTIVITY","activity",u({after:N(c())}),{mode:"sequence"}),REORDER_STORY:y("REORDER_STORY","story",u({after:N(c())}),{mode:"sequence"}),REORDER_STEP:y("REORDER_STEP","step",u({after:N(c())}),{mode:"sequence"}),MOVE_STORY:y("MOVE_STORY","story",u({toActivity:h(c(),b(1)),after:N(c())}),{mode:"sequence"}),MOVE_STEP:y("MOVE_STEP","step",u({toStory:h(c(),b(1)),after:N(c())}),{mode:"sequence"}),ADD_ACTIVITY:y("ADD_ACTIVITY","artifact",u({id:R,name:h(c(),b(1)),description:w(c())}),{dedupeKey:B}),ADD_STORY:y("ADD_STORY","activity",u({id:R,name:h(c(),b(1)),description:w(c())}),{dedupeKey:B}),ADD_STEP:y("ADD_STEP","story",u({id:R,name:h(c(),b(1)),description:w(c()),previews:w(Y(u({id:R,kind:x(D(K),"browser"),viewport:x(D(j),"fluid"),label:w(c()),url:w(c())})))}),{dedupeKey:B}),ADD_PREVIEW:y("ADD_PREVIEW","step",u({id:R,kind:x(D(K),"browser"),viewport:x(D(j),"fluid"),label:w(c()),url:w(c())}),{dedupeKey:B}),DELETE_ACTIVITY:y("DELETE_ACTIVITY","activity",u({})),DELETE_STORY:y("DELETE_STORY","story",u({})),DELETE_STEP:y("DELETE_STEP","step",u({})),DELETE_PREVIEW:y("DELETE_PREVIEW","preview",u({}))},W={setActivityName:(t,e)=>({type:"SET_ACTIVITY_NAME",target:{type:"activity",id:t},payload:{name:e}}),setActivityDescription:(t,e)=>({type:"SET_ACTIVITY_DESCRIPTION",target:{type:"activity",id:t},payload:{description:e}}),setStoryName:(t,e)=>({type:"SET_STORY_NAME",target:{type:"story",id:t},payload:{name:e}}),setStoryDescription:(t,e)=>({type:"SET_STORY_DESCRIPTION",target:{type:"story",id:t},payload:{description:e}}),setStepName:(t,e)=>({type:"SET_STEP_NAME",target:{type:"step",id:t},payload:{name:e}}),setStepDescription:(t,e)=>({type:"SET_STEP_DESCRIPTION",target:{type:"step",id:t},payload:{description:e}}),setPreviewViewport:(t,e)=>({type:"SET_PREVIEW_VIEWPORT",target:{type:"preview",id:t},payload:{viewport:e}}),setPreviewKind:(t,e)=>({type:"SET_PREVIEW_KIND",target:{type:"preview",id:t},payload:{kind:e}}),setPreviewLabel:(t,e)=>({type:"SET_PREVIEW_LABEL",target:{type:"preview",id:t},payload:{label:e}}),reorderActivity:(t,e)=>({type:"REORDER_ACTIVITY",target:{type:"activity",id:t},payload:{after:e}}),reorderStory:(t,e)=>({type:"REORDER_STORY",target:{type:"story",id:t},payload:{after:e}}),reorderStep:(t,e)=>({type:"REORDER_STEP",target:{type:"step",id:t},payload:{after:e}}),moveStep:(t,e,i)=>({type:"MOVE_STEP",target:{type:"step",id:t},payload:{toStory:e,after:i}}),moveStory:(t,e,i)=>({type:"MOVE_STORY",target:{type:"story",id:t},payload:{toActivity:e,after:i}}),addActivity:(t,e,i)=>({type:"ADD_ACTIVITY",target:{type:"artifact",id:"prototype"},payload:{id:t,name:e,...i===void 0?{}:{description:i}}}),addStory:(t,e,i,r)=>({type:"ADD_STORY",target:{type:"activity",id:t},payload:{id:e,name:i,...r===void 0?{}:{description:r}}}),addStep:(t,e,i,r)=>({type:"ADD_STEP",target:{type:"story",id:t},payload:{id:e,name:i,...r===void 0?{}:{previews:r}}}),addPreview:(t,e)=>({type:"ADD_PREVIEW",target:{type:"step",id:t},payload:{...e}}),deleteActivity:t=>({type:"DELETE_ACTIVITY",target:{type:"activity",id:t},payload:{}}),deleteStory:t=>({type:"DELETE_STORY",target:{type:"story",id:t},payload:{}}),deleteStep:t=>({type:"DELETE_STEP",target:{type:"step",id:t},payload:{}}),deletePreview:t=>({type:"DELETE_PREVIEW",target:{type:"preview",id:t},payload:{}})},ct=(t,e)=>{const i=Rt(v,e);if(i===null)return null;const r=i.target.id;switch(i.type){case"SET_ACTIVITY_NAME":return A(t,r,a=>({...a,name:i.payload.name}));case"SET_ACTIVITY_DESCRIPTION":return A(t,r,a=>({...a,description:i.payload.description}));case"SET_STORY_NAME":return O(t,r,a=>({...a,name:i.payload.name}));case"SET_STORY_DESCRIPTION":return O(t,r,a=>({...a,description:i.payload.description}));case"SET_STEP_NAME":return L(t,r,a=>({...a,name:i.payload.name}));case"SET_STEP_DESCRIPTION":return L(t,r,a=>({...a,description:i.payload.description}));case"SET_PREVIEW_KIND":return Q(t,r,a=>({...a,kind:i.payload.kind}));case"SET_PREVIEW_VIEWPORT":return Q(t,r,a=>({...a,viewport:i.payload.viewport}));case"SET_PREVIEW_LABEL":return Q(t,r,a=>({...a,label:i.payload.label}));case"REORDER_ACTIVITY":{const{after:a}=i.payload,s=U(t.activities,r,a);return s===null?null:{...t,activities:s}}case"REORDER_STORY":{const{after:a}=i.payload,s=g(t,r);if(!s)return null;const o=a===null?null:g(t,a);if(a!==null&&(!o||o.activity!==s.activity))return null;const n=U(s.activity.stories,s.story.id,o?.story.id??null);return n===null?null:A(t,s.activity.id,d=>({...d,stories:n}))}case"REORDER_STEP":{const{after:a}=i.payload,s=E(t,r);if(!s)return null;const o=a===null?null:E(t,a);if(a!==null&&(!o||o.story!==s.story))return null;const n=U(s.story.steps,s.step.id,o?.step.id??null);return n===null?null:O(t,P(s.activity.id,s.story.id),d=>({...d,steps:n}))}case"MOVE_STORY":{const{toActivity:a,after:s}=i.payload,o=g(t,r);if(!o)return null;const n=t.activities.find(l=>l.id===a);if(!n)return null;const d=s===null?null:g(t,s);if(s!==null&&(!d||d.activity!==n))return null;const p=d?.story.id??null;if(o.activity.id===a){const l=U(o.activity.stories,o.story.id,p);return l===null?null:A(t,a,T=>({...T,stories:l}))}if(n.stories.some(l=>l.id===o.story.id))return null;const S=Z(n.stories,o.story,p);return G(t,l=>l.id===o.activity.id?{...l,stories:l.stories.filter(T=>T.id!==pt(r))}:l.id===a?{...l,stories:S}:l)}case"MOVE_STEP":{const{toStory:a,after:s}=i.payload,o=E(t,r);if(!o)return null;const n=g(t,a);if(!n)return null;const d=s===null?null:E(t,s);if(s!==null&&(!d||d.story!==n.story))return null;const p=d?.step.id??null;if(o.story===n.story){const l=U(o.story.steps,o.step.id,p);return l===null?null:O(t,a,T=>({...T,steps:l}))}if(n.story.steps.some(l=>l.id===o.step.id))return null;const S=Z(n.story.steps,o.step,p);return G(t,l=>({...l,stories:l.stories.map(T=>T===o.story?{...T,steps:T.steps.filter(k=>k.id!==pt(r))}:T===n.story?{...T,steps:S}:T)}))}case"ADD_ACTIVITY":{const a=i.payload;if(t.activities.some(o=>o.id===a.id))return t;const s={id:a.id,name:a.name,...a.description===void 0?{}:{description:a.description},stories:[]};return{...t,activities:[...t.activities,s]}}case"ADD_STORY":{const a=i.payload,s=t.activities.find(n=>n.id===r);if(!s)return null;if(s.stories.some(n=>n.id===a.id))return t;const o={id:a.id,name:a.name,...a.description===void 0?{}:{description:a.description},steps:[]};return A(t,r,n=>({...n,stories:[...n.stories,o]}))}case"ADD_STEP":{const a=i.payload,s=g(t,r)?.story;if(!s)return null;if(s.steps.some(d=>d.id===a.id))return t;const o=(a.previews??[]).map(d=>d.id);if(new Set(o).size!==o.length||o.some(d=>_(t,d)))return null;const n={id:a.id,name:a.name,...a.description===void 0?{}:{description:a.description},previews:a.previews??[]};return O(t,r,d=>({...d,steps:[...d.steps,n]}))}case"ADD_PREVIEW":{const a=i.payload,s=E(t,r)?.step;return s?s.previews.some(o=>o.id===a.id)?t:_(t,a.id)?null:L(t,r,o=>({...o,previews:[...o.previews,a]})):null}case"DELETE_ACTIVITY":{const a=r;return t.activities.some(s=>s.id===a)?{...t,activities:t.activities.filter(s=>s.id!==a)}:null}case"DELETE_STORY":{const a=g(t,r);return a?A(t,a.activity.id,s=>({...s,stories:s.stories.filter(o=>o.id!==a.story.id)})):null}case"DELETE_STEP":{const a=E(t,r);return a?O(t,P(a.activity.id,a.story.id),s=>({...s,steps:s.steps.filter(o=>o.id!==a.step.id)})):null}case"DELETE_PREVIEW":{const a=_(t,r);return a?L(t,M(a.location),s=>({...s,previews:s.previews.filter(o=>o.id!==a.preview.id)})):null}default:return Pt(i)}},G=(t,e)=>({...t,activities:t.activities.map(e)}),A=(t,e,i)=>{const r=e;return t.activities.some(a=>a.id===r)?G(t,a=>a.id===r?i(a):a):null},O=(t,e,i)=>{const r=g(t,e);if(!r)return null;const a=r.story.id;return A(t,r.activity.id,s=>({...s,stories:s.stories.map(o=>o.id===a?i(o):o)}))},L=(t,e,i)=>{const r=E(t,e);if(!r)return null;const a=r.step.id;return O(t,P(r.activity.id,r.story.id),s=>({...s,steps:s.steps.map(o=>o.id===a?i(o):o)}))},Q=(t,e,i)=>{const r=_(t,e);if(!r)return null;const a=r.preview.id;return L(t,M(r.location),s=>({...s,previews:s.previews.map(o=>o.id===a?i(o):o)}))},U=(t,e,i)=>{const r=t.findIndex(o=>o.id===e);if(r<0||i!==null&&!t.some(o=>o.id===i))return null;if(e===i)return[...t];const a=t[r];if(a===void 0)return null;const s=t.filter(o=>o.id!==e);return Z(s,a,i)},Z=(t,e,i)=>{const r=[...t],a=i===null?-1:r.findIndex(s=>s.id===i);return r.splice(a+1,0,e),r},z=(t,e)=>t===void 0?`\u2192 "${e}"`:`"${t}" \u2192 "${e}"`,vt={SET_ACTIVITY_NAME:(t,e)=>({title:"Activity \u540D\u3092\u5909\u66F4",tone:"update",body:z($(e,t.target.id)?.name,f(v.SET_ACTIVITY_NAME,t).name)}),SET_ACTIVITY_DESCRIPTION:(t,e)=>({title:"Activity \u306E\u8AAC\u660E\u3092\u66F4\u65B0",tone:"update",body:tt($(e,t.target.id)?.description,f(v.SET_ACTIVITY_DESCRIPTION,t).description)}),SET_STORY_NAME:(t,e)=>({title:"UserStory \u540D\u3092\u5909\u66F4",tone:"update",body:z(g(e,t.target.id)?.story.name,f(v.SET_STORY_NAME,t).name)}),SET_STORY_DESCRIPTION:(t,e)=>({title:"UserStory \u306E\u8AAC\u660E\u3092\u66F4\u65B0",tone:"update",body:tt(g(e,t.target.id)?.story.description,f(v.SET_STORY_DESCRIPTION,t).description)}),SET_STEP_NAME:(t,e)=>({title:"Step \u540D\u3092\u5909\u66F4",tone:"update",body:z(E(e,t.target.id)?.step.name,f(v.SET_STEP_NAME,t).name)}),SET_STEP_DESCRIPTION:(t,e)=>({title:"Step \u306E\u8AAC\u660E\u3092\u66F4\u65B0",tone:"update",body:tt(E(e,t.target.id)?.step.description,f(v.SET_STEP_DESCRIPTION,t).description)}),SET_PREVIEW_KIND:(t,e)=>({title:"Preview \u306E\u7A2E\u5225\u3092\u5909\u66F4",tone:"update",body:z(_(e,t.target.id)?.preview.kind,f(v.SET_PREVIEW_KIND,t).kind)}),SET_PREVIEW_VIEWPORT:(t,e)=>({title:"Preview \u306E\u30D3\u30E5\u30FC\u30DD\u30FC\u30C8\u3092\u5909\u66F4",tone:"update",body:z(_(e,t.target.id)?.preview.viewport,f(v.SET_PREVIEW_VIEWPORT,t).viewport)}),SET_PREVIEW_LABEL:t=>({title:"Preview \u306E\u30E9\u30D9\u30EB\u3092\u5909\u66F4",tone:"update",body:`\u2192 "${f(v.SET_PREVIEW_LABEL,t).label}"`}),REORDER_ACTIVITY:t=>et("Activity",f(v.REORDER_ACTIVITY,t).after),REORDER_STORY:t=>et("UserStory",f(v.REORDER_STORY,t).after),REORDER_STEP:t=>et("Step",f(v.REORDER_STEP,t).after),MOVE_STORY:(t,e)=>({title:"UserStory \u3092\u79FB\u52D5",tone:"move",body:`\u2192 ${$(e,f(v.MOVE_STORY,t).toActivity)?.name??f(v.MOVE_STORY,t).toActivity}`}),MOVE_STEP:(t,e)=>({title:"Step \u3092\u79FB\u52D5",tone:"move",body:`\u2192 ${g(e,f(v.MOVE_STEP,t).toStory)?.story.name??f(v.MOVE_STEP,t).toStory}`}),ADD_ACTIVITY:t=>F("Activity",f(v.ADD_ACTIVITY,t).name),ADD_STORY:t=>F("UserStory",f(v.ADD_STORY,t).name),ADD_STEP:t=>F("Step",f(v.ADD_STEP,t).name),ADD_PREVIEW:t=>F("Preview",f(v.ADD_PREVIEW,t).label??f(v.ADD_PREVIEW,t).id),DELETE_ACTIVITY:(t,e)=>J($(e,t.target.id)?.name),DELETE_STORY:(t,e)=>J(g(e,t.target.id)?.story.name),DELETE_STEP:(t,e)=>J(E(e,t.target.id)?.step.name),DELETE_PREVIEW:(t,e)=>J(_(e,t.target.id)?.preview.label)},tt=(t,e)=>{const i=e.length>90?`${e.slice(0,90)}\u2026`:e;return t===void 0||t===""?`\u2192 "${i}"`:`"${zt(t)}" \u2192 "${i}"`},zt=t=>t.length>60?`${t.slice(0,60)}\u2026`:t,et=(t,e)=>({title:`${t} \u306E\u9806\u5E8F\u3092\u5909\u66F4`,tone:"move",body:e===null?"\u2192 \u5148\u982D\u3078":`\u2192 "${e}" \u306E\u76F4\u5F8C\u3078`}),F=(t,e)=>({title:`${t} \u3092\u8FFD\u52A0`,tone:"create",body:`+ "${e}"`}),J=t=>({title:"\u524A\u9664",tone:"delete",body:t===void 0?"(unknown target)":`\u2212 "${t}"`}),ut=(t,e,i)=>{const r=Object.hasOwn(vt,t.type)?vt[t.type]:void 0,a=r?r(t,i??e):{title:t.type,tone:"meta"};return{title:a.title,targetLabel:ft(e,t.target),tone:a.tone,...a.body===void 0?{}:{summary:a.body}}},yt=t=>`${t.type} ${C(t.target)} ${JSON.stringify(t.payload)}`,ft=(t,e)=>{switch(e.type){case"activity":{const i=$(t,e.id);return i?`Activity \xB7 ${i.name}`:`Activity \xB7 ${e.id} (missing)`}case"story":{const i=g(t,e.id)?.story;return i?`UserStory \xB7 ${i.name}`:`UserStory \xB7 ${e.id} (missing)`}case"step":{const i=E(t,e.id)?.step;return i?`Step \xB7 ${i.name}`:`Step \xB7 ${e.id} (missing)`}case"preview":{const i=_(t,e.id)?.preview;return i?`Preview \xB7 ${i.label??i.id}`:`Preview \xB7 ${e.id} (missing)`}case"artifact":return`Artifact \xB7 ${it(t)}`;default:return`${e.type} \xB7 ${e.id}`}},Bt=(t,e)=>{if(e.url)return e.url;const i=t.baseUrl?.trim(),r=Dt(t.title??"");return`${(i?i.startsWith("http")?i:`https://${i}`:`https://${r==="item"?"artifact":r}.example.com`).replace(/\/+$/,"")}/${e.id}`},Et=t=>{const e=[];for(const i of t.activities){e.push({value:C({type:"activity",id:i.id}),label:i.name,group:"Activity"});for(const r of i.stories){e.push({value:C({type:"story",id:P(i.id,r.id)}),label:`${i.name} \u203A ${r.name}`,group:"UserStory"});for(const a of r.steps)e.push({value:C({type:"step",id:q(i,r,a)}),label:`${r.name} \u203A ${a.name}`,group:"Step"})}}return e},Kt=(t,e)=>{const i=E(t,e.step);return i?{value:C({type:"step",id:M(i)}),label:i.step.name,group:"Step"}:null},it=t=>t.title??"UX Prototype",mt=(t,e)=>{const i=$(t,e.activity),r=e.story,a=i?.stories.find(k=>k.id===r||P(i.id,k.id)===r),s=e.step,o=(i&&a&&s?E(t,`${P(i.id,a.id)}.${s}`):void 0)??E(t,s),n=a&&i?{activity:i,story:a}:g(t,r),d=o?.activity??i??n?.activity??t.activities[0],p=o?.story??(n&&n.activity===d?n.story:void 0)??d?.stories[0],S=o?.step??p?.steps[0],l={...e};d?l.activity=d.id:delete l.activity,p&&d?l.story=g(t,p.id)?p.id:P(d.id,p.id):delete l.story,S&&p&&d?l.step=E(t,S.id)?S.id:q(d,p,S):delete l.step;const T=S&&e.preview&&S.previews.some(k=>k.id===e.preview)?e.preview:S?.previews[0]?.id;return T?l.preview=T:delete l.preview,l},jt=(t,e)=>{switch(e.type){case"activity":return $(t,e.id)!==void 0;case"story":return g(t,e.id)!==void 0;case"step":return E(t,e.id)!==void 0;case"preview":return _(t,e.id)!==void 0;case"artifact":return!0;default:return!1}},Tt={name:"prototype",label:"UX Prototype",parseBase:nt,emptyBase:dt,actions:v,apply:ct,hasTarget:jt,canonicalTarget:(t,e)=>{if(e.type==="step"){const i=E(t,e.id);return i?{...e,id:M(i)}:e}if(e.type==="story"){const i=g(t,e.id);return i?{...e,id:P(i.activity.id,i.story.id)}:e}if(e.type==="preview"){const i=_(t,e.id);return i?{...e,id:i.preview.id}:e}return e},describe:ut,serialize:yt,resolveNavigation:mt,commentTargets:(t,e)=>Et(t),currentTarget:(t,e)=>Kt(t,e),title:it},qt=$t(class extends At{constructor(){super(...arguments),this.key=I}render(t,e){return this.key=t,e}update(t,[e,i]){return e!==this.key&&(Ot(t),this.key=e),i}}),gt=t=>{const{state:e,navigation:i}=t,r=E(e,i.step),a=r?.activity??e.activities[0],s=r?.story??a?.stories[0];if(!a||!s)return m`<p class="nav-empty">
      Activity がまだありません。base JSON の <code>activities</code> を追加するか、Agent に依頼してください。
    </p>`;const o=s.steps,n=r?.step,d=r?M(r):void 0;return m`
    <div class="nav">
      <div class="field">
        <span class="af-label">Activity</span>
        <select
          class="af-select"
          aria-label="Activity"
          @change=${rt(p=>t.navigate({activity:p,story:null,step:null}))}
        >
          ${e.activities.map(p=>m`<option value=${p.id} ?selected=${p.id===a.id}>${p.name}</option>`)}
        </select>
      </div>
      <div class="field">
        <span class="af-label">User Story</span>
        <select
          class="af-select"
          aria-label="User Story"
          @change=${rt(p=>t.navigate({activity:a.id,story:p,step:null}))}
        >
          ${a.stories.map(p=>m`<option value=${p.id} ?selected=${p.id===s.id}>${p.name}</option>`)}
        </select>
      </div>
      <div class="steps-head">
        <span class="af-label">Step</span>
        <span class="af-label">${o.length}</span>
      </div>
      <ol class="steps">
        ${kt(o,p=>q(a,s,p),(p,S)=>{const l=q(a,s,p),T=t.commentCount({type:"step",id:l});return m`
              <li class="step-row" data-current=${String(p.id===n?.id)}>
                <a class="step-link" href=${t.hashFor({activity:a.id,story:s.id,step:p.id})}>
                  <span class="step-index">${String(S+1).padStart(2,"0")}</span>
                  <span class="step-name">${p.name}</span>
                  ${T>0?m`<span class="step-note">${T}</span>`:I}
                </a>
                <span class="row-tools">
                  <button
                    class="af-icon-btn"
                    type="button"
                    aria-label="ステップを削除"
                    @click=${()=>t.dispatch(W.deleteStep(l))}
                  >
                    ${Vt()}
                  </button>
                </span>
              </li>
            `})}
      </ol>
      <button class="af-btn" type="button" @click=${()=>Ht(t,P(a.id,s.id))}>
        ＋ Step
      </button>
      ${n?qt(d,m`<div class="detail">
                <div class="detail-row">
                  <span class="af-label">Step 名</span>
                  <span class="detail-value">
                    <artifact-inline-edit
                      .value=${n.name}
                      .label=${"Step \u540D"}
                      @artifact-commit=${st(p=>t.dispatch(W.setStepName(d??n.id,p)))}
                    ></artifact-inline-edit>
                  </span>
                </div>
                <div class="detail-row">
                  <span class="af-label">説明</span>
                  <span class="detail-value">
                    <artifact-inline-edit
                      multiline
                      .value=${n.description??""}
                      .placeholder=${"\u3053\u306E Step \u3067\u4F55\u304C\u8D77\u304D\u308B\u304B\uFF08\u30AF\u30EA\u30C3\u30AF\u3057\u3066\u7DE8\u96C6\uFF09"}
                      .label=${"\u8AAC\u660E"}
                      @artifact-commit=${st(p=>t.dispatch(W.setStepDescription(d??n.id,p)))}
                    ></artifact-inline-edit>
                  </span>
                </div>
              </div>`):I}
    </div>
  `},Ht=(t,e)=>{const i=Yt("new-step",lt(t.state));t.dispatch(W.addStep(e,i,"\u65B0\u3057\u3044\u30B9\u30C6\u30C3\u30D7")).ok&&t.navigate({story:e,step:i})},St={mobile:"390px",tablet:"834px",desktop:"1180px",fluid:"100%"},wt={mobile:"620px",tablet:"640px",desktop:"520px",fluid:"420px"},ht=(t,e)=>{const{state:i,navigation:r}=t,a=E(i,r.step),s=a?a.step.previews.find(d=>d.id===r.preview)??a.step.previews[0]:void 0,o=Xt(i,s?.id);if(!a)return m`
      <div class="stage">
        <p class="stage-empty">
          Step がまだありません。Prototype は
          <strong>Activity › UserStory › Step › Preview</strong> の意味構造を持ち、 1 Step = 1 画面 / 1
          体験状態です。base JSON に Step を追加すると、ここに Preview が現れます。
        </p>
        ${o}
      </div>
    `;const n=a.step.previews;return m`
    <div class="stage">
      ${n.length>1?Ft(t,n,s?.id):I}
      ${s?bt(t,s,e.hasPreviewContent(s.id)):I}
      ${n.length===0?m`<p class="af-label">preview metadata がありません — 追加は Agent に依頼してください</p>`:I}
      ${o}
    </div>
  `},Ft=(t,e,i)=>m`<div class="stage-bar">
    <div class="tabs" role="tablist">
      ${e.map(r=>m`<a
            class="tab"
            role="tab"
            data-current=${String(r.id===i)}
            aria-selected=${r.id===i?"true":"false"}
            href=${t.hashFor({preview:r.id})}
            >${r.label??r.viewport}</a
          >`)}
    </div>
  </div>`,bt=(t,e,i)=>m`
    <figure
      class="frame"
      data-kind=${e.kind}
      data-viewport=${e.viewport}
      style=${`--frame-width:${St[e.viewport]};--frame-min-height:${wt[e.viewport]}`}
    >
      ${e.kind==="browser"?m`<div class="chrome">
              <span class="dots"><i></i><i></i><i></i></span>
              <span class="url">${Bt(t.state,e)}</span>
            </div>`:I}
      <div class="viewport">
        ${e.kind==="native"?Jt():I}
        <slot name=${`preview:${e.id}`}></slot>
        ${i?I:m`<div class="frame-placeholder">
                <span class="af-label">light dom preview</span>
                <code>&lt;div slot="preview" data-preview-id="${e.id}"&gt;</code>
              </div>`}
      </div>
    </figure>
  `,Jt=()=>m`<div class="status-bar">
    <span class="status-time">9:41</span>
    <span class="punch-hole" aria-hidden="true"></span>
    <svg class="status-wifi" viewBox="0 0 16 12" aria-hidden="true">
      <path d="M8 9.2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
      <path
        d="M4.7 7.4a4.8 4.8 0 0 1 6.6 0"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
      <path
        d="M2.1 4.7a8.4 8.4 0 0 1 11.8 0"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
    </svg>
  </div>`,Xt=(t,e)=>{const i=H(t).flatMap(r=>r.step.previews.filter(a=>a.id!==e));return i.length===0?m`${I}`:m`<div class="parked" aria-hidden="true">
    ${i.map(r=>m`<slot name=${`preview:${r.id}`}></slot>`)}
  </div>`},Gt=Nt`
  :host {
    --af-prototype-accent: var(--af-blue);
  }

  /* ---------------------------------------------------------------- sidebar */

  .nav {
    display: grid;
    gap: 14px;
    align-content: start;
    min-width: 188px;
  }

  .field {
    display: grid;
    gap: 5px;
  }

  .steps-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding-bottom: 5px;
    border-bottom: 1px solid var(--af-rule);
  }

  .steps {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 2px;
    max-height: 38vh;
    overflow: auto;
  }

  .step-row {
    position: relative;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 4px 0 9px;
    border-radius: var(--af-radius-sm);
    transition:
      background 140ms ease,
      box-shadow 140ms ease;
  }

  .step-row:hover {
    background: var(--af-paper-inset);
  }

  .step-row[data-current='true'] {
    background: var(--af-paper-raised);
    box-shadow: var(--af-shadow-sm);
  }

  .step-row[data-current='true']::before {
    content: '';
    position: absolute;
    left: 0;
    top: 8px;
    bottom: 8px;
    width: 3px;
    border-radius: var(--af-radius-xs);
    background: linear-gradient(180deg, var(--af-blue), #2952a3);
  }

  .step-link {
    display: flex;
    flex: 1;
    min-width: 0;
    align-items: center;
    gap: 7px;
    padding: 7px 0;
    text-decoration: none;
    color: var(--af-ink-soft);
    font-size: 12.5px;
    font-weight: 460;
  }

  .step-row[data-current='true'] .step-link {
    color: var(--af-ink);
    font-weight: 550;
  }

  .step-index {
    flex: 0 0 auto;
    min-width: 17px;
    padding: 1px 4px;
    border-radius: var(--af-radius-xs);
    background: var(--af-paper-inset);
    font-family: var(--af-mono);
    font-size: 9.5px;
    font-variant-numeric: tabular-nums;
    text-align: center;
    color: var(--af-ink-faint);
    transition:
      background 140ms ease,
      color 140ms ease;
  }

  .step-row[data-current='true'] .step-index {
    background: var(--af-blue-soft);
    color: var(--af-blue);
  }

  .step-name {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .step-note {
    margin-left: auto;
    min-width: 16px;
    padding: 1px 5px;
    border-radius: 999px;
    background: var(--af-accent);
    color: var(--af-accent-ink);
    font-family: var(--af-mono);
    font-size: 9px;
    font-variant-numeric: tabular-nums;
    text-align: center;
  }

  .row-tools {
    display: flex;
    gap: 0;
    opacity: 0;
    transition: opacity 120ms ease;
  }

  .step-row:hover .row-tools,
  .step-row[data-current='true'] .row-tools {
    opacity: 1;
  }

  .detail {
    display: grid;
    gap: 12px;
    padding: 12px 12px 14px;
    border: 1px solid var(--af-rule);
    border-radius: var(--af-radius);
    background: var(--af-paper-raised);
    box-shadow: var(--af-shadow-sm);
  }

  .detail-row {
    display: grid;
    gap: 4px;
  }

  .detail-value {
    font-size: 12.5px;
    color: var(--af-ink-soft);
  }

  .nav-empty {
    font-size: 12px;
    line-height: 1.6;
    color: var(--af-ink-faint);
  }

  /* ------------------------------------------------------------------ stage */

  .stage {
    display: grid;
    gap: 14px;
    width: 100%;
    min-width: 0;
  }

  .stage-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    flex-wrap: wrap;
  }

  .tabs {
    display: inline-flex;
    gap: 2px;
    padding: 3px;
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

  .stage-empty {
    max-width: 62ch;
    padding: 16px 18px;
    border: 1px dashed var(--af-rule-strong);
    border-radius: var(--af-radius-lg);
    background: var(--af-paper-sunken);
    font-size: 13px;
    line-height: 1.7;
    color: var(--af-ink-soft);
  }

  /* ------------------------------------------------------------------ frame */

  .frame {
    width: min(var(--frame-width), 100%);
    max-width: 100%;
    margin: 0;
    border: 1px solid var(--af-rule);
    border-radius: var(--af-radius-lg);
    background: var(--af-paper-raised);
    box-shadow: var(--af-shadow-lg);
    overflow: hidden;
    transition: box-shadow 200ms ease;
  }

  .chrome {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: linear-gradient(180deg, var(--af-paper-sunken), var(--af-paper-inset));
    border-bottom: 1px solid var(--af-rule);
  }

  .dots {
    display: inline-flex;
    gap: 5px;
  }

  .dots i {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--af-rule-strong);
  }

  .dots i:nth-child(1) {
    background: #ff5f57;
  }

  .dots i:nth-child(2) {
    background: #febc2e;
  }

  .dots i:nth-child(3) {
    background: #28c840;
  }

  .chrome .url {
    flex: 1;
    min-width: 0;
    padding: 4px 14px;
    border: 1px solid var(--af-rule);
    border-radius: var(--af-radius-sm);
    background: var(--af-paper-raised);
    box-shadow: inset 0 1px 2px rgba(20, 28, 44, 0.04);
    font-family: var(--af-mono);
    font-size: 10.5px;
    color: var(--af-ink-faint);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  /*
   * Native previews are recognised by their device shape: a slim bezel, a status
   * bar with a punch-hole camera, and a home indicator. No address bar.
   */
  .frame[data-kind='native'] {
    padding: 10px;
    border-color: #22262e;
    border-radius: 28px;
    background: linear-gradient(160deg, #2e3440, #1a1d24);
    box-shadow:
      var(--af-shadow-lg),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  .frame[data-kind='native'] .viewport {
    overflow: hidden;
    border-radius: 18px;
  }

  /* A phone is portrait: derive the screen height from its width (~1:2.05)
     instead of reusing the browser preview heights. */
  .frame[data-kind='native'][data-viewport='mobile'] .viewport {
    min-height: calc((var(--frame-width, 390px) - 16px) * 2.05);
  }

  .status-bar {
    position: relative;
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: space-between;
    height: 30px;
    padding: 0 12px;
    background: #0c0e13;
    color: #e9edf4;
    font-size: 11.5px;
    font-weight: 550;
    font-variant-numeric: tabular-nums;
  }

  .status-time {
    letter-spacing: 0.02em;
  }

  .punch-hole {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 10px;
    height: 10px;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: #04060a;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.07);
  }

  .status-wifi {
    width: 15px;
    height: 12px;
    fill: currentColor;
    color: #e9edf4;
  }

  /* Home indicator. */
  .frame[data-kind='native'] .viewport::after {
    content: '';
    position: absolute;
    bottom: 8px;
    left: 50%;
    width: 88px;
    height: 4px;
    transform: translateX(-50%);
    border-radius: 999px;
    background: rgba(138, 146, 160, 0.55);
  }

  /*
   * The preview is never scrolled on its own: it shows everything it contains and
   * the artifact scrolls as a whole. The flex column keeps a short mock filling
   * the frame's minimum height without pinning a maximum.
   */
  .viewport {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    min-height: var(--frame-min-height, 480px);
    background: #fff;
  }

  /*
   * The author's wrapper becomes the frame's filling layer: a one-cell grid makes
   * its height definite, so a mock that asks for height:100% fills the frame
   * instead of collapsing to its content.
   */
  /*
   * The author's wrapper is a stretch row: a mock fills a short frame and grows
   * the frame when its own content is taller. Stretching (rather than a
   * percentage height) is what makes the fill reliable.
   */
  /* Only the viewport carries the minimum height; the wrapper grows to fill it. */
  .viewport ::slotted(*) {
    display: grid;
    flex: 1 0 auto;
    min-width: 0;
  }

  .frame-placeholder {
    position: absolute;
    inset: 0;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 8px;
    padding: 12px;
    text-align: center;
    color: var(--af-ink-faint);
    background: repeating-linear-gradient(
      -45deg,
      var(--af-paper-sunken),
      var(--af-paper-sunken) 8px,
      var(--af-paper) 8px,
      var(--af-paper) 16px
    );
  }

  .frame-placeholder code {
    padding: 3px 7px;
    border: 1px solid var(--af-rule);
    border-radius: var(--af-radius-xs);
    background: var(--af-paper-raised);
    font-family: var(--af-mono);
    font-size: 10px;
  }

  .parked {
    display: none;
  }
`;class _t extends at{constructor(){super(...arguments),this.definition=Tt}static{this.styles=[at.styles,Gt]}renderRegions(e){return{sidebar:gt(e),main:ht(e,{hasPreviewContent:i=>this.#t(i)})}}#t(e){return Array.from(this.querySelectorAll("[data-preview-id]")).some(i=>i.getAttribute("data-preview-id")===e)}}const xt=(t="artifact-prototype")=>{customElements.get(t)||customElements.define(t,_t)},Qt=Object.freeze(Object.defineProperty({__proto__:null,PrototypeElement:_t,VIEWPORT_MIN_HEIGHT:wt,VIEWPORT_WIDTH:St,allStepIds:lt,applyPrototypeAction:ct,definePrototypeElement:xt,describePrototypeAction:ut,emptyPrototypeBase:dt,findActivity:$,findPreview:_,findStep:E,findStory:g,flattenSteps:H,parsePrototypeBase:nt,prototypeAction:W,prototypeActions:v,prototypeBaseSchema:ot,prototypeCommentTargets:Et,prototypeDefinition:Tt,prototypeTargetLabel:ft,prototypeTitle:it,renderFrame:bt,renderNav:gt,renderStage:ht,resolvePrototypeNavigation:mt,serializePrototypeAction:yt},Symbol.toStringTag,{value:"Module"}));export{xt as d,Qt as i};
