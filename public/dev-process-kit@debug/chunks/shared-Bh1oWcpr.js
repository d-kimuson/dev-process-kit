import{a8 as It,aw as X,a9 as V,aa as x,ab as Y,as as S,ac as c,at as I,ae as h,af as b,ad as D,r as f,am as u,w as B,ar as N,Q as Rt,g as Pt,V as C,S as y,U as Dt,a2 as m,a1 as R,a3 as $t,B as At,n as Ot,a0 as kt,c as at}from"./shared-BpZBcqrz.js";import{i as Vt}from"./shared-C8Czv-C2.js";import{a as rt,o as st}from"./shared-D0F9d4gi.js";const K=["browser","native"],j=["mobile","tablet","desktop","fluid"],Yt=V({id:I,kind:x(D(K),"browser"),viewport:x(D(j),"fluid"),label:S(c()),url:S(c())}),Nt=V({id:I,name:h(c(),b(1)),description:S(c()),previews:x(Y(Yt),[])}),Ct=V({id:I,name:h(c(),b(1)),description:S(c()),steps:x(Y(Nt),[])}),Mt=V({id:I,name:h(c(),b(1)),description:S(c()),stories:x(Y(Ct),[])}),ot=V({title:S(c()),baseUrl:S(c()),activities:x(Y(Mt),[])}),Wt=t=>{const e=new Set,a=new Set;for(const r of t.activities){if(a.has(r.id))return`duplicate activity id "${r.id}"`;a.add(r.id);const i=new Set;for(const s of r.stories){if(i.has(s.id))return`duplicate story id "${s.id}" in activity "${r.id}"`;i.add(s.id);const o=new Set;for(const n of s.steps){if(o.has(n.id))return`duplicate step id "${n.id}" in story "${s.id}"`;o.add(n.id);for(const d of n.previews){if(e.has(d.id))return`duplicate preview id "${d.id}": preview ids are global, they name a light DOM slot`;e.add(d.id)}}}}return null},nt=t=>{const e=It(ot,t),a=Wt(e);if(a!==null)throw new Error(a);return e},dt=()=>({activities:[]}),$=(t,e)=>{if(e!==void 0)return t.activities.find(a=>a.id===e)},P=(t,e)=>`${t}.${e}`,g=(t,e)=>{if(e===void 0)return;const a=X(e,2);if(a){const[i,s]=a;if(i===void 0||s===void 0)return;const o=t.activities.find(d=>d.id===i),n=o?.stories.find(d=>d.id===s);return o&&n?{activity:o,story:n}:void 0}if(e.includes("."))return;const r=t.activities.flatMap(i=>i.stories.filter(s=>s.id===e).map(s=>({activity:i,story:s})));return r.length===1?r[0]:void 0},pt=t=>{const e=t.lastIndexOf(".");return e>=0?t.slice(e+1):t},M=t=>`${t.activity.id}.${t.story.id}.${t.step.id}`,q=(t,e,a)=>`${t.id}.${e.id}.${a.id}`,E=(t,e)=>{if(e===void 0)return;const a=X(e,3);if(a){const[i,s,o]=a;if(i===void 0||s===void 0||o===void 0)return;const n=t.activities.find(l=>l.id===i),d=n?.stories.find(l=>l.id===s),p=d?d.steps.findIndex(l=>l.id===o):-1,w=d&&p>=0?d.steps[p]:void 0;return n&&d&&w?{activity:n,story:d,step:w,stepIndex:p}:void 0}if(e.includes("."))return;const r=H(t).filter(i=>i.step.id===e);return r.length===1?r[0]:void 0},_=(t,e)=>{if(e===void 0)return;const a=X(e,4);if(a){const[r,i,s,o]=a;if(r===void 0||i===void 0||s===void 0||o===void 0)return;const n=E(t,`${r}.${i}.${s}`),d=n?.step.previews.find(p=>p.id===o);return n&&d?{location:n,preview:d}:void 0}if(!e.includes("."))for(const r of t.activities)for(const i of r.stories)for(const[s,o]of i.steps.entries()){const n=o.previews.find(d=>d.id===e);if(n)return{location:{activity:r,story:i,step:o,stepIndex:s},preview:n}}},H=t=>t.activities.flatMap(e=>e.stories.flatMap(a=>a.steps.map((r,i)=>({activity:e,story:a,step:r,stepIndex:i})))),lt=t=>H(t).map(e=>e.step.id),v={SET_ACTIVITY_NAME:f("SET_ACTIVITY_NAME","activity",u({name:h(c(),b(1))})),SET_ACTIVITY_DESCRIPTION:f("SET_ACTIVITY_DESCRIPTION","activity",u({description:c()})),SET_STORY_NAME:f("SET_STORY_NAME","story",u({name:h(c(),b(1))})),SET_STORY_DESCRIPTION:f("SET_STORY_DESCRIPTION","story",u({description:c()})),SET_STEP_NAME:f("SET_STEP_NAME","step",u({name:h(c(),b(1))})),SET_STEP_DESCRIPTION:f("SET_STEP_DESCRIPTION","step",u({description:c()})),SET_PREVIEW_KIND:f("SET_PREVIEW_KIND","preview",u({kind:D(K)})),SET_PREVIEW_VIEWPORT:f("SET_PREVIEW_VIEWPORT","preview",u({viewport:D(j)})),SET_PREVIEW_LABEL:f("SET_PREVIEW_LABEL","preview",u({label:c()})),REORDER_ACTIVITY:f("REORDER_ACTIVITY","activity",u({after:N(c())}),{mode:"sequence"}),REORDER_STORY:f("REORDER_STORY","story",u({after:N(c())}),{mode:"sequence"}),REORDER_STEP:f("REORDER_STEP","step",u({after:N(c())}),{mode:"sequence"}),MOVE_STORY:f("MOVE_STORY","story",u({toActivity:h(c(),b(1)),after:N(c())}),{mode:"sequence"}),MOVE_STEP:f("MOVE_STEP","step",u({toStory:h(c(),b(1)),after:N(c())}),{mode:"sequence"}),ADD_ACTIVITY:f("ADD_ACTIVITY","artifact",u({id:I,name:h(c(),b(1)),description:S(c())}),{dedupeKey:B}),ADD_STORY:f("ADD_STORY","activity",u({id:I,name:h(c(),b(1)),description:S(c())}),{dedupeKey:B}),ADD_STEP:f("ADD_STEP","story",u({id:I,name:h(c(),b(1)),description:S(c()),previews:S(Y(u({id:I,kind:x(D(K),"browser"),viewport:x(D(j),"fluid"),label:S(c()),url:S(c())})))}),{dedupeKey:B}),ADD_PREVIEW:f("ADD_PREVIEW","step",u({id:I,kind:x(D(K),"browser"),viewport:x(D(j),"fluid"),label:S(c()),url:S(c())}),{dedupeKey:B}),DELETE_ACTIVITY:f("DELETE_ACTIVITY","activity",u({})),DELETE_STORY:f("DELETE_STORY","story",u({})),DELETE_STEP:f("DELETE_STEP","step",u({})),DELETE_PREVIEW:f("DELETE_PREVIEW","preview",u({}))},W={setActivityName:(t,e)=>({type:"SET_ACTIVITY_NAME",target:{type:"activity",id:t},payload:{name:e}}),setActivityDescription:(t,e)=>({type:"SET_ACTIVITY_DESCRIPTION",target:{type:"activity",id:t},payload:{description:e}}),setStoryName:(t,e)=>({type:"SET_STORY_NAME",target:{type:"story",id:t},payload:{name:e}}),setStoryDescription:(t,e)=>({type:"SET_STORY_DESCRIPTION",target:{type:"story",id:t},payload:{description:e}}),setStepName:(t,e)=>({type:"SET_STEP_NAME",target:{type:"step",id:t},payload:{name:e}}),setStepDescription:(t,e)=>({type:"SET_STEP_DESCRIPTION",target:{type:"step",id:t},payload:{description:e}}),setPreviewViewport:(t,e)=>({type:"SET_PREVIEW_VIEWPORT",target:{type:"preview",id:t},payload:{viewport:e}}),setPreviewKind:(t,e)=>({type:"SET_PREVIEW_KIND",target:{type:"preview",id:t},payload:{kind:e}}),setPreviewLabel:(t,e)=>({type:"SET_PREVIEW_LABEL",target:{type:"preview",id:t},payload:{label:e}}),reorderActivity:(t,e)=>({type:"REORDER_ACTIVITY",target:{type:"activity",id:t},payload:{after:e}}),reorderStory:(t,e)=>({type:"REORDER_STORY",target:{type:"story",id:t},payload:{after:e}}),reorderStep:(t,e)=>({type:"REORDER_STEP",target:{type:"step",id:t},payload:{after:e}}),moveStep:(t,e,a)=>({type:"MOVE_STEP",target:{type:"step",id:t},payload:{toStory:e,after:a}}),moveStory:(t,e,a)=>({type:"MOVE_STORY",target:{type:"story",id:t},payload:{toActivity:e,after:a}}),addActivity:(t,e,a)=>({type:"ADD_ACTIVITY",target:{type:"artifact",id:"prototype"},payload:{id:t,name:e,...a===void 0?{}:{description:a}}}),addStory:(t,e,a,r)=>({type:"ADD_STORY",target:{type:"activity",id:t},payload:{id:e,name:a,...r===void 0?{}:{description:r}}}),addStep:(t,e,a,r)=>({type:"ADD_STEP",target:{type:"story",id:t},payload:{id:e,name:a,...r===void 0?{}:{previews:r}}}),addPreview:(t,e)=>({type:"ADD_PREVIEW",target:{type:"step",id:t},payload:{...e}}),deleteActivity:t=>({type:"DELETE_ACTIVITY",target:{type:"activity",id:t},payload:{}}),deleteStory:t=>({type:"DELETE_STORY",target:{type:"story",id:t},payload:{}}),deleteStep:t=>({type:"DELETE_STEP",target:{type:"step",id:t},payload:{}}),deletePreview:t=>({type:"DELETE_PREVIEW",target:{type:"preview",id:t},payload:{}})},ct=(t,e)=>{const a=Rt(v,e);if(a===null)return null;const r=a.target.id;switch(a.type){case"SET_ACTIVITY_NAME":return A(t,r,i=>({...i,name:a.payload.name}));case"SET_ACTIVITY_DESCRIPTION":return A(t,r,i=>({...i,description:a.payload.description}));case"SET_STORY_NAME":return O(t,r,i=>({...i,name:a.payload.name}));case"SET_STORY_DESCRIPTION":return O(t,r,i=>({...i,description:a.payload.description}));case"SET_STEP_NAME":return L(t,r,i=>({...i,name:a.payload.name}));case"SET_STEP_DESCRIPTION":return L(t,r,i=>({...i,description:a.payload.description}));case"SET_PREVIEW_KIND":return G(t,r,i=>({...i,kind:a.payload.kind}));case"SET_PREVIEW_VIEWPORT":return G(t,r,i=>({...i,viewport:a.payload.viewport}));case"SET_PREVIEW_LABEL":return G(t,r,i=>({...i,label:a.payload.label}));case"REORDER_ACTIVITY":{const{after:i}=a.payload,s=U(t.activities,r,i);return s===null?null:{...t,activities:s}}case"REORDER_STORY":{const{after:i}=a.payload,s=g(t,r);if(!s)return null;const o=i===null?null:g(t,i);if(i!==null&&(!o||o.activity!==s.activity))return null;const n=U(s.activity.stories,s.story.id,o?.story.id??null);return n===null?null:A(t,s.activity.id,d=>({...d,stories:n}))}case"REORDER_STEP":{const{after:i}=a.payload,s=E(t,r);if(!s)return null;const o=i===null?null:E(t,i);if(i!==null&&(!o||o.story!==s.story))return null;const n=U(s.story.steps,s.step.id,o?.step.id??null);return n===null?null:O(t,P(s.activity.id,s.story.id),d=>({...d,steps:n}))}case"MOVE_STORY":{const{toActivity:i,after:s}=a.payload,o=g(t,r);if(!o)return null;const n=t.activities.find(l=>l.id===i);if(!n)return null;const d=s===null?null:g(t,s);if(s!==null&&(!d||d.activity!==n))return null;const p=d?.story.id??null;if(o.activity.id===i){const l=U(o.activity.stories,o.story.id,p);return l===null?null:A(t,i,T=>({...T,stories:l}))}if(n.stories.some(l=>l.id===o.story.id))return null;const w=Q(n.stories,o.story,p);return Z(t,l=>l.id===o.activity.id?{...l,stories:l.stories.filter(T=>T.id!==pt(r))}:l.id===i?{...l,stories:w}:l)}case"MOVE_STEP":{const{toStory:i,after:s}=a.payload,o=E(t,r);if(!o)return null;const n=g(t,i);if(!n)return null;const d=s===null?null:E(t,s);if(s!==null&&(!d||d.story!==n.story))return null;const p=d?.step.id??null;if(o.story===n.story){const l=U(o.story.steps,o.step.id,p);return l===null?null:O(t,i,T=>({...T,steps:l}))}if(n.story.steps.some(l=>l.id===o.step.id))return null;const w=Q(n.story.steps,o.step,p);return Z(t,l=>({...l,stories:l.stories.map(T=>T===o.story?{...T,steps:T.steps.filter(k=>k.id!==pt(r))}:T===n.story?{...T,steps:w}:T)}))}case"ADD_ACTIVITY":{const i=a.payload;if(t.activities.some(o=>o.id===i.id))return t;const s={id:i.id,name:i.name,...i.description===void 0?{}:{description:i.description},stories:[]};return{...t,activities:[...t.activities,s]}}case"ADD_STORY":{const i=a.payload,s=t.activities.find(n=>n.id===r);if(!s)return null;if(s.stories.some(n=>n.id===i.id))return t;const o={id:i.id,name:i.name,...i.description===void 0?{}:{description:i.description},steps:[]};return A(t,r,n=>({...n,stories:[...n.stories,o]}))}case"ADD_STEP":{const i=a.payload,s=g(t,r)?.story;if(!s)return null;if(s.steps.some(d=>d.id===i.id))return t;const o=(i.previews??[]).map(d=>d.id);if(new Set(o).size!==o.length||o.some(d=>_(t,d)))return null;const n={id:i.id,name:i.name,...i.description===void 0?{}:{description:i.description},previews:i.previews??[]};return O(t,r,d=>({...d,steps:[...d.steps,n]}))}case"ADD_PREVIEW":{const i=a.payload,s=E(t,r)?.step;return s?s.previews.some(o=>o.id===i.id)?t:_(t,i.id)?null:L(t,r,o=>({...o,previews:[...o.previews,i]})):null}case"DELETE_ACTIVITY":{const i=r;return t.activities.some(s=>s.id===i)?{...t,activities:t.activities.filter(s=>s.id!==i)}:null}case"DELETE_STORY":{const i=g(t,r);return i?A(t,i.activity.id,s=>({...s,stories:s.stories.filter(o=>o.id!==i.story.id)})):null}case"DELETE_STEP":{const i=E(t,r);return i?O(t,P(i.activity.id,i.story.id),s=>({...s,steps:s.steps.filter(o=>o.id!==i.step.id)})):null}case"DELETE_PREVIEW":{const i=_(t,r);return i?L(t,M(i.location),s=>({...s,previews:s.previews.filter(o=>o.id!==i.preview.id)})):null}default:return Pt(a)}},Z=(t,e)=>({...t,activities:t.activities.map(e)}),A=(t,e,a)=>{const r=e;return t.activities.some(i=>i.id===r)?Z(t,i=>i.id===r?a(i):i):null},O=(t,e,a)=>{const r=g(t,e);if(!r)return null;const i=r.story.id;return A(t,r.activity.id,s=>({...s,stories:s.stories.map(o=>o.id===i?a(o):o)}))},L=(t,e,a)=>{const r=E(t,e);if(!r)return null;const i=r.step.id;return O(t,P(r.activity.id,r.story.id),s=>({...s,steps:s.steps.map(o=>o.id===i?a(o):o)}))},G=(t,e,a)=>{const r=_(t,e);if(!r)return null;const i=r.preview.id;return L(t,M(r.location),s=>({...s,previews:s.previews.map(o=>o.id===i?a(o):o)}))},U=(t,e,a)=>{const r=t.findIndex(o=>o.id===e);if(r<0||a!==null&&!t.some(o=>o.id===a))return null;if(e===a)return[...t];const i=t[r];if(i===void 0)return null;const s=t.filter(o=>o.id!==e);return Q(s,i,a)},Q=(t,e,a)=>{const r=[...t],i=a===null?-1:r.findIndex(s=>s.id===a);return r.splice(i+1,0,e),r},z=(t,e)=>t===void 0?`\u2192 "${e}"`:`"${t}" \u2192 "${e}"`,vt={SET_ACTIVITY_NAME:(t,e)=>({title:"Activity \u540D\u3092\u5909\u66F4",tone:"update",body:z($(e,t.target.id)?.name,y(v.SET_ACTIVITY_NAME,t).name)}),SET_ACTIVITY_DESCRIPTION:(t,e)=>({title:"Activity \u306E\u8AAC\u660E\u3092\u66F4\u65B0",tone:"update",body:tt($(e,t.target.id)?.description,y(v.SET_ACTIVITY_DESCRIPTION,t).description)}),SET_STORY_NAME:(t,e)=>({title:"UserStory \u540D\u3092\u5909\u66F4",tone:"update",body:z(g(e,t.target.id)?.story.name,y(v.SET_STORY_NAME,t).name)}),SET_STORY_DESCRIPTION:(t,e)=>({title:"UserStory \u306E\u8AAC\u660E\u3092\u66F4\u65B0",tone:"update",body:tt(g(e,t.target.id)?.story.description,y(v.SET_STORY_DESCRIPTION,t).description)}),SET_STEP_NAME:(t,e)=>({title:"Step \u540D\u3092\u5909\u66F4",tone:"update",body:z(E(e,t.target.id)?.step.name,y(v.SET_STEP_NAME,t).name)}),SET_STEP_DESCRIPTION:(t,e)=>({title:"Step \u306E\u8AAC\u660E\u3092\u66F4\u65B0",tone:"update",body:tt(E(e,t.target.id)?.step.description,y(v.SET_STEP_DESCRIPTION,t).description)}),SET_PREVIEW_KIND:(t,e)=>({title:"Preview \u306E\u7A2E\u5225\u3092\u5909\u66F4",tone:"update",body:z(_(e,t.target.id)?.preview.kind,y(v.SET_PREVIEW_KIND,t).kind)}),SET_PREVIEW_VIEWPORT:(t,e)=>({title:"Preview \u306E\u30D3\u30E5\u30FC\u30DD\u30FC\u30C8\u3092\u5909\u66F4",tone:"update",body:z(_(e,t.target.id)?.preview.viewport,y(v.SET_PREVIEW_VIEWPORT,t).viewport)}),SET_PREVIEW_LABEL:t=>({title:"Preview \u306E\u30E9\u30D9\u30EB\u3092\u5909\u66F4",tone:"update",body:`\u2192 "${y(v.SET_PREVIEW_LABEL,t).label}"`}),REORDER_ACTIVITY:t=>et("Activity",y(v.REORDER_ACTIVITY,t).after),REORDER_STORY:t=>et("UserStory",y(v.REORDER_STORY,t).after),REORDER_STEP:t=>et("Step",y(v.REORDER_STEP,t).after),MOVE_STORY:(t,e)=>({title:"UserStory \u3092\u79FB\u52D5",tone:"move",body:`\u2192 ${$(e,y(v.MOVE_STORY,t).toActivity)?.name??y(v.MOVE_STORY,t).toActivity}`}),MOVE_STEP:(t,e)=>({title:"Step \u3092\u79FB\u52D5",tone:"move",body:`\u2192 ${g(e,y(v.MOVE_STEP,t).toStory)?.story.name??y(v.MOVE_STEP,t).toStory}`}),ADD_ACTIVITY:t=>F("Activity",y(v.ADD_ACTIVITY,t).name),ADD_STORY:t=>F("UserStory",y(v.ADD_STORY,t).name),ADD_STEP:t=>F("Step",y(v.ADD_STEP,t).name),ADD_PREVIEW:t=>F("Preview",y(v.ADD_PREVIEW,t).label??y(v.ADD_PREVIEW,t).id),DELETE_ACTIVITY:(t,e)=>J($(e,t.target.id)?.name),DELETE_STORY:(t,e)=>J(g(e,t.target.id)?.story.name),DELETE_STEP:(t,e)=>J(E(e,t.target.id)?.step.name),DELETE_PREVIEW:(t,e)=>J(_(e,t.target.id)?.preview.label)},tt=(t,e)=>{const a=e.length>90?`${e.slice(0,90)}\u2026`:e;return t===void 0||t===""?`\u2192 "${a}"`:`"${Lt(t)}" \u2192 "${a}"`},Lt=t=>t.length>60?`${t.slice(0,60)}\u2026`:t,et=(t,e)=>({title:`${t} \u306E\u9806\u5E8F\u3092\u5909\u66F4`,tone:"move",body:e===null?"\u2192 \u5148\u982D\u3078":`\u2192 "${e}" \u306E\u76F4\u5F8C\u3078`}),F=(t,e)=>({title:`${t} \u3092\u8FFD\u52A0`,tone:"create",body:`+ "${e}"`}),J=t=>({title:"\u524A\u9664",tone:"delete",body:t===void 0?"(unknown target)":`\u2212 "${t}"`}),ut=(t,e,a)=>{const r=Object.hasOwn(vt,t.type)?vt[t.type]:void 0,i=r?r(t,a??e):{title:t.type,tone:"meta"};return{title:i.title,targetLabel:yt(e,t.target),tone:i.tone,...i.body===void 0?{}:{summary:i.body}}},ft=t=>`${t.type} ${C(t.target)} ${JSON.stringify(t.payload)}`,yt=(t,e)=>{switch(e.type){case"activity":{const a=$(t,e.id);return a?`Activity \xB7 ${a.name}`:`Activity \xB7 ${e.id} (missing)`}case"story":{const a=g(t,e.id)?.story;return a?`UserStory \xB7 ${a.name}`:`UserStory \xB7 ${e.id} (missing)`}case"step":{const a=E(t,e.id)?.step;return a?`Step \xB7 ${a.name}`:`Step \xB7 ${e.id} (missing)`}case"preview":{const a=_(t,e.id)?.preview;return a?`Preview \xB7 ${a.label??a.id}`:`Preview \xB7 ${e.id} (missing)`}case"artifact":return`Artifact \xB7 ${it(t)}`;default:return`${e.type} \xB7 ${e.id}`}},Ut=(t,e)=>{if(e.url)return e.url;const a=t.baseUrl?.trim(),r=Dt(t.title??"");return`${(a?a.startsWith("http")?a:`https://${a}`:`https://${r==="item"?"artifact":r}.example.com`).replace(/\/+$/,"")}/${e.id}`},Et=t=>{const e=[];for(const a of t.activities){e.push({value:C({type:"activity",id:a.id}),label:a.name,group:"Activity"});for(const r of a.stories){e.push({value:C({type:"story",id:P(a.id,r.id)}),label:`${a.name} \u203A ${r.name}`,group:"UserStory"});for(const i of r.steps)e.push({value:C({type:"step",id:q(a,r,i)}),label:`${r.name} \u203A ${i.name}`,group:"Step"})}}return e},zt=(t,e)=>{const a=E(t,e.step);return a?{value:C({type:"step",id:M(a)}),label:a.step.name,group:"Step"}:null},it=t=>t.title??"UX Prototype",mt=(t,e)=>{const a=$(t,e.activity),r=e.story,i=a?.stories.find(k=>k.id===r||P(a.id,k.id)===r),s=e.step,o=(a&&i&&s?E(t,`${P(a.id,i.id)}.${s}`):void 0)??E(t,s),n=i&&a?{activity:a,story:i}:g(t,r),d=o?.activity??a??n?.activity??t.activities[0],p=o?.story??(n&&n.activity===d?n.story:void 0)??d?.stories[0],w=o?.step??p?.steps[0],l={...e};d?l.activity=d.id:delete l.activity,p&&d?l.story=g(t,p.id)?p.id:P(d.id,p.id):delete l.story,w&&p&&d?l.step=E(t,w.id)?w.id:q(d,p,w):delete l.step;const T=w&&e.preview&&w.previews.some(k=>k.id===e.preview)?e.preview:w?.previews[0]?.id;return T?l.preview=T:delete l.preview,l},Bt=(t,e)=>{switch(e.type){case"activity":return $(t,e.id)!==void 0;case"story":return g(t,e.id)!==void 0;case"step":return E(t,e.id)!==void 0;case"preview":return _(t,e.id)!==void 0;case"artifact":return!0;default:return!1}},Tt={name:"prototype",label:"UX Prototype",parseBase:nt,emptyBase:dt,actions:v,apply:ct,hasTarget:Bt,canonicalTarget:(t,e)=>{if(e.type==="step"){const a=E(t,e.id);return a?{...e,id:M(a)}:e}if(e.type==="story"){const a=g(t,e.id);return a?{...e,id:P(a.activity.id,a.story.id)}:e}if(e.type==="preview"){const a=_(t,e.id);return a?{...e,id:a.preview.id}:e}return e},describe:ut,serialize:ft,resolveNavigation:mt,commentTargets:(t,e)=>Et(t),currentTarget:(t,e)=>zt(t,e),title:it},gt=t=>{const{state:e,navigation:a}=t,r=E(e,a.step),i=r?.activity??e.activities[0],s=r?.story??i?.stories[0];if(!i||!s)return m`<p class="nav-empty">
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
          ${e.activities.map(p=>m`<option value=${p.id} ?selected=${p.id===i.id}>${p.name}</option>`)}
        </select>
      </div>
      <div class="field">
        <span class="af-label">User Story</span>
        <select
          class="af-select"
          aria-label="User Story"
          @change=${rt(p=>t.navigate({activity:i.id,story:p,step:null}))}
        >
          ${i.stories.map(p=>m`<option value=${p.id} ?selected=${p.id===s.id}>${p.name}</option>`)}
        </select>
      </div>
      <div class="steps-head">
        <span class="af-label">Step</span>
        <span class="af-label">${o.length}</span>
      </div>
      <ol class="steps">
        ${$t(o,p=>q(i,s,p),(p,w)=>{const l=q(i,s,p),T=t.commentCount({type:"step",id:l});return m`
              <li class="step-row" data-current=${String(p.id===n?.id)}>
                <a class="step-link" href=${t.hashFor({activity:i.id,story:s.id,step:p.id})}>
                  <span class="step-index">${String(w+1).padStart(2,"0")}</span>
                  <span class="step-name">${p.name}</span>
                  ${T>0?m`<span class="step-note">${T}</span>`:R}
                </a>
                <span class="row-tools">
                  <button
                    class="af-icon-btn"
                    type="button"
                    aria-label="ステップを削除"
                    @click=${()=>t.dispatch(W.deleteStep(l))}
                  >
                    ${At()}
                  </button>
                </span>
              </li>
            `})}
      </ol>
      <button class="af-btn" type="button" @click=${()=>Kt(t,P(i.id,s.id))}>
        ＋ Step
      </button>
      ${n?Vt(d,m`<div class="detail">
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
              </div>`):R}
    </div>
  `},Kt=(t,e)=>{const a=Ot("new-step",lt(t.state));t.dispatch(W.addStep(e,a,"\u65B0\u3057\u3044\u30B9\u30C6\u30C3\u30D7")).ok&&t.navigate({story:e,step:a})},wt={mobile:"390px",tablet:"834px",desktop:"1180px",fluid:"100%"},St={mobile:"620px",tablet:"640px",desktop:"520px",fluid:"420px"},ht=(t,e)=>{const{state:a,navigation:r}=t,i=E(a,r.step),s=i?i.step.previews.find(d=>d.id===r.preview)??i.step.previews[0]:void 0,o=Ht(a,s?.id);if(!i)return m`
      <div class="stage">
        <p class="stage-empty">
          Step がまだありません。Prototype は
          <strong>Activity › UserStory › Step › Preview</strong> の意味構造を持ち、 1 Step = 1 画面 / 1
          体験状態です。base JSON に Step を追加すると、ここに Preview が現れます。
        </p>
        ${o}
      </div>
    `;const n=i.step.previews;return m`
    <div class="stage">
      ${n.length>1?jt(t,n,s?.id):R}
      ${s?bt(t,s,e.hasPreviewContent(s.id)):R}
      ${n.length===0?m`<p class="af-label">preview metadata がありません — 追加は Agent に依頼してください</p>`:R}
      ${o}
    </div>
  `},jt=(t,e,a)=>m`<div class="stage-bar">
    <div class="tabs" role="tablist">
      ${e.map(r=>m`<a
            class="tab"
            role="tab"
            data-current=${String(r.id===a)}
            aria-selected=${r.id===a?"true":"false"}
            href=${t.hashFor({preview:r.id})}
            >${r.label??r.viewport}</a
          >`)}
    </div>
  </div>`,bt=(t,e,a)=>m`
    <figure
      class="frame"
      data-kind=${e.kind}
      data-viewport=${e.viewport}
      style=${`--frame-width:${wt[e.viewport]};--frame-min-height:${St[e.viewport]}`}
    >
      ${e.kind==="browser"?m`<div class="chrome">
              <span class="dots"><i></i><i></i><i></i></span>
              <span class="url">${Ut(t.state,e)}</span>
            </div>`:R}
      <div class="viewport">
        ${e.kind==="native"?qt():R}
        <slot name=${`preview:${e.id}`}></slot>
        ${a?R:m`<div class="frame-placeholder">
                <span class="af-label">light dom preview</span>
                <code>&lt;div slot="preview" data-preview-id="${e.id}"&gt;</code>
              </div>`}
      </div>
    </figure>
  `,qt=()=>m`<div class="status-bar">
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
  </div>`,Ht=(t,e)=>{const a=H(t).flatMap(r=>r.step.previews.filter(i=>i.id!==e));return a.length===0?m`${R}`:m`<div class="parked" aria-hidden="true">
    ${a.map(r=>m`<slot name=${`preview:${r.id}`}></slot>`)}
  </div>`},Ft=kt`
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
`;class _t extends at{constructor(){super(...arguments),this.definition=Tt}static{this.styles=[at.styles,Ft]}renderRegions(e){return{sidebar:gt(e),main:ht(e,{hasPreviewContent:a=>this.#t(a)})}}#t(e){return Array.from(this.querySelectorAll("[data-preview-id]")).some(a=>a.getAttribute("data-preview-id")===e)}}const xt=(t="artifact-prototype")=>{customElements.get(t)||customElements.define(t,_t)},Jt=Object.freeze(Object.defineProperty({__proto__:null,PrototypeElement:_t,VIEWPORT_MIN_HEIGHT:St,VIEWPORT_WIDTH:wt,allStepIds:lt,applyPrototypeAction:ct,definePrototypeElement:xt,describePrototypeAction:ut,emptyPrototypeBase:dt,findActivity:$,findPreview:_,findStep:E,findStory:g,flattenSteps:H,parsePrototypeBase:nt,prototypeAction:W,prototypeActions:v,prototypeBaseSchema:ot,prototypeCommentTargets:Et,prototypeDefinition:Tt,prototypeTargetLabel:yt,prototypeTitle:it,renderFrame:bt,renderNav:gt,renderStage:ht,resolvePrototypeNavigation:mt,serializePrototypeAction:ft},Symbol.toStringTag,{value:"Module"}));export{xt as d,Jt as i};
