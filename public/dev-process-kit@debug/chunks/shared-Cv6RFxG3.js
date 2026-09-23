import{a7 as xe,aw as X,a8 as V,a9 as k,aa as Y,ar as S,ab as c,as as x,ad as h,ae as b,ac as P,q as y,al as u,v as K,aq as N,P as Ie,f as Re,V as C,R as E,U as Pe,a1 as m,a0 as I,a2 as De,z as $e,m as Ae,$ as Oe,T as re}from"./shared-CxeFED6G.js";import{i as Ve}from"./shared-Bl8RXFFG.js";import{a as ae,o as se}from"./shared-XDZhV_P2.js";const B=["browser","native"],q=["mobile","tablet","desktop","fluid"],Ye=V({id:x,kind:k(P(B),"browser"),viewport:k(P(q),"fluid"),label:S(c()),url:S(c())}),Ne=V({id:x,name:h(c(),b(1)),description:S(c()),previews:k(Y(Ye),[])}),Ce=V({id:x,name:h(c(),b(1)),description:S(c()),steps:k(Y(Ne),[])}),Me=V({id:x,name:h(c(),b(1)),description:S(c()),stories:k(Y(Ce),[])}),oe=V({title:S(c()),baseUrl:S(c()),activities:k(Y(Me),[])}),We=e=>{const t=new Set,r=new Set;for(const a of e.activities){if(r.has(a.id))return`duplicate activity id "${a.id}"`;r.add(a.id);const i=new Set;for(const s of a.stories){if(i.has(s.id))return`duplicate story id "${s.id}" in activity "${a.id}"`;i.add(s.id);const o=new Set;for(const d of s.steps){if(o.has(d.id))return`duplicate step id "${d.id}" in story "${s.id}"`;o.add(d.id);for(const n of d.previews){if(t.has(n.id))return`duplicate preview id "${n.id}": preview ids are global, they name a light DOM slot`;t.add(n.id)}}}}return null},de=e=>{const t=xe(oe,e),r=We(t);if(r!==null)throw new Error(r);return t},ne=()=>({activities:[]}),D=(e,t)=>{if(t!==void 0)return e.activities.find(r=>r.id===t)},R=(e,t)=>`${e}.${t}`,T=(e,t)=>{if(t===void 0)return;const r=X(t,2);if(r){const[i,s]=r;if(i===void 0||s===void 0)return;const o=e.activities.find(n=>n.id===i),d=o?.stories.find(n=>n.id===s);return o&&d?{activity:o,story:d}:void 0}if(t.includes("."))return;const a=e.activities.flatMap(i=>i.stories.filter(s=>s.id===t).map(s=>({activity:i,story:s})));return a.length===1?a[0]:void 0},pe=e=>{const t=e.lastIndexOf(".");return t>=0?e.slice(t+1):e},M=e=>`${e.activity.id}.${e.story.id}.${e.step.id}`,j=(e,t,r)=>`${e.id}.${t.id}.${r.id}`,f=(e,t)=>{if(t===void 0)return;const r=X(t,3);if(r){const[i,s,o]=r;if(i===void 0||s===void 0||o===void 0)return;const d=e.activities.find(l=>l.id===i),n=d?.stories.find(l=>l.id===s),p=n?n.steps.findIndex(l=>l.id===o):-1,w=n&&p>=0?n.steps[p]:void 0;return d&&n&&w?{activity:d,story:n,step:w,stepIndex:p}:void 0}if(t.includes("."))return;const a=H(e).filter(i=>i.step.id===t);return a.length===1?a[0]:void 0},_=(e,t)=>{if(t===void 0)return;const r=X(t,4);if(r){const[a,i,s,o]=r;if(a===void 0||i===void 0||s===void 0||o===void 0)return;const d=f(e,`${a}.${i}.${s}`),n=d?.step.previews.find(p=>p.id===o);return d&&n?{location:d,preview:n}:void 0}if(!t.includes("."))for(const a of e.activities)for(const i of a.stories)for(const[s,o]of i.steps.entries()){const d=o.previews.find(n=>n.id===t);if(d)return{location:{activity:a,story:i,step:o,stepIndex:s},preview:d}}},H=e=>e.activities.flatMap(t=>t.stories.flatMap(r=>r.steps.map((a,i)=>({activity:t,story:r,step:a,stepIndex:i})))),le=e=>H(e).map(t=>t.step.id),v={SET_ACTIVITY_NAME:y("SET_ACTIVITY_NAME","activity",u({name:h(c(),b(1))})),SET_ACTIVITY_DESCRIPTION:y("SET_ACTIVITY_DESCRIPTION","activity",u({description:c()})),SET_STORY_NAME:y("SET_STORY_NAME","story",u({name:h(c(),b(1))})),SET_STORY_DESCRIPTION:y("SET_STORY_DESCRIPTION","story",u({description:c()})),SET_STEP_NAME:y("SET_STEP_NAME","step",u({name:h(c(),b(1))})),SET_STEP_DESCRIPTION:y("SET_STEP_DESCRIPTION","step",u({description:c()})),SET_PREVIEW_KIND:y("SET_PREVIEW_KIND","preview",u({kind:P(B)})),SET_PREVIEW_VIEWPORT:y("SET_PREVIEW_VIEWPORT","preview",u({viewport:P(q)})),SET_PREVIEW_LABEL:y("SET_PREVIEW_LABEL","preview",u({label:c()})),REORDER_ACTIVITY:y("REORDER_ACTIVITY","activity",u({after:N(c())}),{mode:"sequence"}),REORDER_STORY:y("REORDER_STORY","story",u({after:N(c())}),{mode:"sequence"}),REORDER_STEP:y("REORDER_STEP","step",u({after:N(c())}),{mode:"sequence"}),MOVE_STORY:y("MOVE_STORY","story",u({toActivity:h(c(),b(1)),after:N(c())}),{mode:"sequence"}),MOVE_STEP:y("MOVE_STEP","step",u({toStory:h(c(),b(1)),after:N(c())}),{mode:"sequence"}),ADD_ACTIVITY:y("ADD_ACTIVITY","page",u({id:x,name:h(c(),b(1)),description:S(c())}),{dedupeKey:K}),ADD_STORY:y("ADD_STORY","activity",u({id:x,name:h(c(),b(1)),description:S(c())}),{dedupeKey:K}),ADD_STEP:y("ADD_STEP","story",u({id:x,name:h(c(),b(1)),description:S(c()),previews:S(Y(u({id:x,kind:k(P(B),"browser"),viewport:k(P(q),"fluid"),label:S(c()),url:S(c())})))}),{dedupeKey:K}),ADD_PREVIEW:y("ADD_PREVIEW","step",u({id:x,kind:k(P(B),"browser"),viewport:k(P(q),"fluid"),label:S(c()),url:S(c())}),{dedupeKey:K}),DELETE_ACTIVITY:y("DELETE_ACTIVITY","activity",u({})),DELETE_STORY:y("DELETE_STORY","story",u({})),DELETE_STEP:y("DELETE_STEP","step",u({})),DELETE_PREVIEW:y("DELETE_PREVIEW","preview",u({}))},W={setActivityName:(e,t)=>({type:"SET_ACTIVITY_NAME",target:{type:"activity",id:e},payload:{name:t}}),setActivityDescription:(e,t)=>({type:"SET_ACTIVITY_DESCRIPTION",target:{type:"activity",id:e},payload:{description:t}}),setStoryName:(e,t)=>({type:"SET_STORY_NAME",target:{type:"story",id:e},payload:{name:t}}),setStoryDescription:(e,t)=>({type:"SET_STORY_DESCRIPTION",target:{type:"story",id:e},payload:{description:t}}),setStepName:(e,t)=>({type:"SET_STEP_NAME",target:{type:"step",id:e},payload:{name:t}}),setStepDescription:(e,t)=>({type:"SET_STEP_DESCRIPTION",target:{type:"step",id:e},payload:{description:t}}),setPreviewViewport:(e,t)=>({type:"SET_PREVIEW_VIEWPORT",target:{type:"preview",id:e},payload:{viewport:t}}),setPreviewKind:(e,t)=>({type:"SET_PREVIEW_KIND",target:{type:"preview",id:e},payload:{kind:t}}),setPreviewLabel:(e,t)=>({type:"SET_PREVIEW_LABEL",target:{type:"preview",id:e},payload:{label:t}}),reorderActivity:(e,t)=>({type:"REORDER_ACTIVITY",target:{type:"activity",id:e},payload:{after:t}}),reorderStory:(e,t)=>({type:"REORDER_STORY",target:{type:"story",id:e},payload:{after:t}}),reorderStep:(e,t)=>({type:"REORDER_STEP",target:{type:"step",id:e},payload:{after:t}}),moveStep:(e,t,r)=>({type:"MOVE_STEP",target:{type:"step",id:e},payload:{toStory:t,after:r}}),moveStory:(e,t,r)=>({type:"MOVE_STORY",target:{type:"story",id:e},payload:{toActivity:t,after:r}}),addActivity:(e,t,r)=>({type:"ADD_ACTIVITY",target:{type:"page",id:"prototype"},payload:{id:e,name:t,...r===void 0?{}:{description:r}}}),addStory:(e,t,r,a)=>({type:"ADD_STORY",target:{type:"activity",id:e},payload:{id:t,name:r,...a===void 0?{}:{description:a}}}),addStep:(e,t,r,a)=>({type:"ADD_STEP",target:{type:"story",id:e},payload:{id:t,name:r,...a===void 0?{}:{previews:a}}}),addPreview:(e,t)=>({type:"ADD_PREVIEW",target:{type:"step",id:e},payload:{...t}}),deleteActivity:e=>({type:"DELETE_ACTIVITY",target:{type:"activity",id:e},payload:{}}),deleteStory:e=>({type:"DELETE_STORY",target:{type:"story",id:e},payload:{}}),deleteStep:e=>({type:"DELETE_STEP",target:{type:"step",id:e},payload:{}}),deletePreview:e=>({type:"DELETE_PREVIEW",target:{type:"preview",id:e},payload:{}})},ce=(e,t)=>{const r=Ie(v,t);if(r===null)return null;const a=r.target.id;switch(r.type){case"SET_ACTIVITY_NAME":return $(e,a,i=>({...i,name:r.payload.name}));case"SET_ACTIVITY_DESCRIPTION":return $(e,a,i=>({...i,description:r.payload.description}));case"SET_STORY_NAME":return A(e,a,i=>({...i,name:r.payload.name}));case"SET_STORY_DESCRIPTION":return A(e,a,i=>({...i,description:r.payload.description}));case"SET_STEP_NAME":return L(e,a,i=>({...i,name:r.payload.name}));case"SET_STEP_DESCRIPTION":return L(e,a,i=>({...i,description:r.payload.description}));case"SET_PREVIEW_KIND":return Q(e,a,i=>({...i,kind:r.payload.kind}));case"SET_PREVIEW_VIEWPORT":return Q(e,a,i=>({...i,viewport:r.payload.viewport}));case"SET_PREVIEW_LABEL":return Q(e,a,i=>({...i,label:r.payload.label}));case"REORDER_ACTIVITY":{const{after:i}=r.payload,s=z(e.activities,a,i);return s===null?null:{...e,activities:s}}case"REORDER_STORY":{const{after:i}=r.payload,s=T(e,a);if(!s)return null;const o=i===null?null:T(e,i);if(i!==null&&(!o||o.activity!==s.activity))return null;const d=z(s.activity.stories,s.story.id,o?.story.id??null);return d===null?null:$(e,s.activity.id,n=>({...n,stories:d}))}case"REORDER_STEP":{const{after:i}=r.payload,s=f(e,a);if(!s)return null;const o=i===null?null:f(e,i);if(i!==null&&(!o||o.story!==s.story))return null;const d=z(s.story.steps,s.step.id,o?.step.id??null);return d===null?null:A(e,R(s.activity.id,s.story.id),n=>({...n,steps:d}))}case"MOVE_STORY":{const{toActivity:i,after:s}=r.payload,o=T(e,a);if(!o)return null;const d=e.activities.find(l=>l.id===i);if(!d)return null;const n=s===null?null:T(e,s);if(s!==null&&(!n||n.activity!==d))return null;const p=n?.story.id??null;if(o.activity.id===i){const l=z(o.activity.stories,o.story.id,p);return l===null?null:$(e,i,g=>({...g,stories:l}))}if(d.stories.some(l=>l.id===o.story.id))return null;const w=Z(d.stories,o.story,p);return G(e,l=>l.id===o.activity.id?{...l,stories:l.stories.filter(g=>g.id!==pe(a))}:l.id===i?{...l,stories:w}:l)}case"MOVE_STEP":{const{toStory:i,after:s}=r.payload,o=f(e,a);if(!o)return null;const d=T(e,i);if(!d)return null;const n=s===null?null:f(e,s);if(s!==null&&(!n||n.story!==d.story))return null;const p=n?.step.id??null;if(o.story===d.story){const l=z(o.story.steps,o.step.id,p);return l===null?null:A(e,i,g=>({...g,steps:l}))}if(d.story.steps.some(l=>l.id===o.step.id))return null;const w=Z(d.story.steps,o.step,p);return G(e,l=>({...l,stories:l.stories.map(g=>g===o.story?{...g,steps:g.steps.filter(O=>O.id!==pe(a))}:g===d.story?{...g,steps:w}:g)}))}case"ADD_ACTIVITY":{const i=r.payload;if(e.activities.some(o=>o.id===i.id))return e;const s={id:i.id,name:i.name,...i.description===void 0?{}:{description:i.description},stories:[]};return{...e,activities:[...e.activities,s]}}case"ADD_STORY":{const i=r.payload,s=e.activities.find(d=>d.id===a);if(!s)return null;if(s.stories.some(d=>d.id===i.id))return e;const o={id:i.id,name:i.name,...i.description===void 0?{}:{description:i.description},steps:[]};return $(e,a,d=>({...d,stories:[...d.stories,o]}))}case"ADD_STEP":{const i=r.payload,s=T(e,a)?.story;if(!s)return null;if(s.steps.some(n=>n.id===i.id))return e;const o=(i.previews??[]).map(n=>n.id);if(new Set(o).size!==o.length||o.some(n=>_(e,n)))return null;const d={id:i.id,name:i.name,...i.description===void 0?{}:{description:i.description},previews:i.previews??[]};return A(e,a,n=>({...n,steps:[...n.steps,d]}))}case"ADD_PREVIEW":{const i=r.payload,s=f(e,a)?.step;return s?s.previews.some(o=>o.id===i.id)?e:_(e,i.id)?null:L(e,a,o=>({...o,previews:[...o.previews,i]})):null}case"DELETE_ACTIVITY":{const i=a;return e.activities.some(s=>s.id===i)?{...e,activities:e.activities.filter(s=>s.id!==i)}:null}case"DELETE_STORY":{const i=T(e,a);return i?$(e,i.activity.id,s=>({...s,stories:s.stories.filter(o=>o.id!==i.story.id)})):null}case"DELETE_STEP":{const i=f(e,a);return i?A(e,R(i.activity.id,i.story.id),s=>({...s,steps:s.steps.filter(o=>o.id!==i.step.id)})):null}case"DELETE_PREVIEW":{const i=_(e,a);return i?L(e,M(i.location),s=>({...s,previews:s.previews.filter(o=>o.id!==i.preview.id)})):null}default:return Re(r)}},G=(e,t)=>({...e,activities:e.activities.map(t)}),$=(e,t,r)=>{const a=t;return e.activities.some(i=>i.id===a)?G(e,i=>i.id===a?r(i):i):null},A=(e,t,r)=>{const a=T(e,t);if(!a)return null;const i=a.story.id;return $(e,a.activity.id,s=>({...s,stories:s.stories.map(o=>o.id===i?r(o):o)}))},L=(e,t,r)=>{const a=f(e,t);if(!a)return null;const i=a.step.id;return A(e,R(a.activity.id,a.story.id),s=>({...s,steps:s.steps.map(o=>o.id===i?r(o):o)}))},Q=(e,t,r)=>{const a=_(e,t);if(!a)return null;const i=a.preview.id;return L(e,M(a.location),s=>({...s,previews:s.previews.map(o=>o.id===i?r(o):o)}))},z=(e,t,r)=>{const a=e.findIndex(o=>o.id===t);if(a<0||r!==null&&!e.some(o=>o.id===r))return null;if(t===r)return[...e];const i=e[a];if(i===void 0)return null;const s=e.filter(o=>o.id!==t);return Z(s,i,r)},Z=(e,t,r)=>{const a=[...e],i=r===null?-1:a.findIndex(s=>s.id===r);return a.splice(i+1,0,t),a},U=(e,t)=>e===void 0?`\u2192 "${t}"`:`"${e}" \u2192 "${t}"`,ve={SET_ACTIVITY_NAME:(e,t)=>({title:"Activity \u540D\u3092\u5909\u66F4",tone:"update",body:U(D(t,e.target.id)?.name,E(v.SET_ACTIVITY_NAME,e).name)}),SET_ACTIVITY_DESCRIPTION:(e,t)=>({title:"Activity \u306E\u8AAC\u660E\u3092\u66F4\u65B0",tone:"update",body:ee(D(t,e.target.id)?.description,E(v.SET_ACTIVITY_DESCRIPTION,e).description)}),SET_STORY_NAME:(e,t)=>({title:"UserStory \u540D\u3092\u5909\u66F4",tone:"update",body:U(T(t,e.target.id)?.story.name,E(v.SET_STORY_NAME,e).name)}),SET_STORY_DESCRIPTION:(e,t)=>({title:"UserStory \u306E\u8AAC\u660E\u3092\u66F4\u65B0",tone:"update",body:ee(T(t,e.target.id)?.story.description,E(v.SET_STORY_DESCRIPTION,e).description)}),SET_STEP_NAME:(e,t)=>({title:"Step \u540D\u3092\u5909\u66F4",tone:"update",body:U(f(t,e.target.id)?.step.name,E(v.SET_STEP_NAME,e).name)}),SET_STEP_DESCRIPTION:(e,t)=>({title:"Step \u306E\u8AAC\u660E\u3092\u66F4\u65B0",tone:"update",body:ee(f(t,e.target.id)?.step.description,E(v.SET_STEP_DESCRIPTION,e).description)}),SET_PREVIEW_KIND:(e,t)=>({title:"Preview \u306E\u7A2E\u5225\u3092\u5909\u66F4",tone:"update",body:U(_(t,e.target.id)?.preview.kind,E(v.SET_PREVIEW_KIND,e).kind)}),SET_PREVIEW_VIEWPORT:(e,t)=>({title:"Preview \u306E\u30D3\u30E5\u30FC\u30DD\u30FC\u30C8\u3092\u5909\u66F4",tone:"update",body:U(_(t,e.target.id)?.preview.viewport,E(v.SET_PREVIEW_VIEWPORT,e).viewport)}),SET_PREVIEW_LABEL:e=>({title:"Preview \u306E\u30E9\u30D9\u30EB\u3092\u5909\u66F4",tone:"update",body:`\u2192 "${E(v.SET_PREVIEW_LABEL,e).label}"`}),REORDER_ACTIVITY:e=>te("Activity",E(v.REORDER_ACTIVITY,e).after),REORDER_STORY:e=>te("UserStory",E(v.REORDER_STORY,e).after),REORDER_STEP:e=>te("Step",E(v.REORDER_STEP,e).after),MOVE_STORY:(e,t)=>({title:"UserStory \u3092\u79FB\u52D5",tone:"move",body:`\u2192 ${D(t,E(v.MOVE_STORY,e).toActivity)?.name??E(v.MOVE_STORY,e).toActivity}`}),MOVE_STEP:(e,t)=>({title:"Step \u3092\u79FB\u52D5",tone:"move",body:`\u2192 ${T(t,E(v.MOVE_STEP,e).toStory)?.story.name??E(v.MOVE_STEP,e).toStory}`}),ADD_ACTIVITY:e=>F("Activity",E(v.ADD_ACTIVITY,e).name),ADD_STORY:e=>F("UserStory",E(v.ADD_STORY,e).name),ADD_STEP:e=>F("Step",E(v.ADD_STEP,e).name),ADD_PREVIEW:e=>F("Preview",E(v.ADD_PREVIEW,e).label??E(v.ADD_PREVIEW,e).id),DELETE_ACTIVITY:(e,t)=>J(D(t,e.target.id)?.name),DELETE_STORY:(e,t)=>J(T(t,e.target.id)?.story.name),DELETE_STEP:(e,t)=>J(f(t,e.target.id)?.step.name),DELETE_PREVIEW:(e,t)=>J(_(t,e.target.id)?.preview.label)},ee=(e,t)=>{const r=t.length>90?`${t.slice(0,90)}\u2026`:t;return e===void 0||e===""?`\u2192 "${r}"`:`"${Le(e)}" \u2192 "${r}"`},Le=e=>e.length>60?`${e.slice(0,60)}\u2026`:e,te=(e,t)=>({title:`${e} \u306E\u9806\u5E8F\u3092\u5909\u66F4`,tone:"move",body:t===null?"\u2192 \u5148\u982D\u3078":`\u2192 "${t}" \u306E\u76F4\u5F8C\u3078`}),F=(e,t)=>({title:`${e} \u3092\u8FFD\u52A0`,tone:"create",body:`+ "${t}"`}),J=e=>({title:"\u524A\u9664",tone:"delete",body:e===void 0?"(unknown target)":`\u2212 "${e}"`}),ue=(e,t,r)=>{const a=Object.hasOwn(ve,e.type)?ve[e.type]:void 0,i=a?a(e,r??t):{title:e.type,tone:"meta"};return{title:i.title,targetLabel:Ee(t,e.target),tone:i.tone,...i.body===void 0?{}:{summary:i.body}}},ye=e=>`${e.type} ${C(e.target)} ${JSON.stringify(e.payload)}`,Ee=(e,t)=>{switch(t.type){case"activity":{const r=D(e,t.id);return r?`Activity \xB7 ${r.name}`:`Activity \xB7 ${t.id} (missing)`}case"story":{const r=T(e,t.id)?.story;return r?`UserStory \xB7 ${r.name}`:`UserStory \xB7 ${t.id} (missing)`}case"step":{const r=f(e,t.id)?.step;return r?`Step \xB7 ${r.name}`:`Step \xB7 ${t.id} (missing)`}case"preview":{const r=_(e,t.id)?.preview;return r?`Preview \xB7 ${r.label??r.id}`:`Preview \xB7 ${t.id} (missing)`}case"page":return`Page \xB7 ${ie(e)}`;default:return`${t.type} \xB7 ${t.id}`}},ze=(e,t)=>{if(t.url)return t.url;const r=e.baseUrl?.trim(),a=Pe(e.title??"");return`${(r?r.startsWith("http")?r:`https://${r}`:`https://${a==="item"?"page":a}.example.com`).replace(/\/+$/,"")}/${t.id}`},fe=e=>{const t=[];for(const r of e.activities){t.push({value:C({type:"activity",id:r.id}),label:r.name,group:"Activity"});for(const a of r.stories){t.push({value:C({type:"story",id:R(r.id,a.id)}),label:`${r.name} \u203A ${a.name}`,group:"UserStory"});for(const i of a.steps)t.push({value:C({type:"step",id:j(r,a,i)}),label:`${a.name} \u203A ${i.name}`,group:"Step"})}}return t},Ue=(e,t)=>{const r=f(e,t.step);return r?{value:C({type:"step",id:M(r)}),label:r.step.name,group:"Step"}:null},ie=e=>e.title??"UX Prototype",me=(e,t)=>{const r=D(e,t.activity),a=t.story,i=r?.stories.find(O=>O.id===a||R(r.id,O.id)===a),s=t.step,o=(r&&i&&s?f(e,`${R(r.id,i.id)}.${s}`):void 0)??f(e,s),d=i&&r?{activity:r,story:i}:T(e,a),n=o?.activity??r??d?.activity??e.activities[0],p=o?.story??(d&&d.activity===n?d.story:void 0)??n?.stories[0],w=o?.step??p?.steps[0],l={...t};n?l.activity=n.id:delete l.activity,p&&n?l.story=T(e,p.id)?p.id:R(n.id,p.id):delete l.story,w&&p&&n?l.step=f(e,w.id)?w.id:j(n,p,w):delete l.step;const g=w&&t.preview&&w.previews.some(O=>O.id===t.preview)?t.preview:w?.previews[0]?.id;return g?l.preview=g:delete l.preview,l},Ke=(e,t)=>{switch(t.type){case"activity":return D(e,t.id)!==void 0;case"story":return T(e,t.id)!==void 0;case"step":return f(e,t.id)!==void 0;case"preview":return _(e,t.id)!==void 0;case"page":return!0;default:return!1}},ge={name:"prototype",label:"UX Prototype",parseBase:de,emptyBase:ne,actions:v,apply:ce,hasTarget:Ke,canonicalTarget:(e,t)=>{if(t.type==="step"){const r=f(e,t.id);return r?{...t,id:M(r)}:t}if(t.type==="story"){const r=T(e,t.id);return r?{...t,id:R(r.activity.id,r.story.id)}:t}if(t.type==="preview"){const r=_(e,t.id);return r?{...t,id:r.preview.id}:t}return t},describe:ue,serialize:ye,resolveNavigation:me,commentTargets:(e,t)=>fe(e),currentTarget:(e,t)=>Ue(e,t),title:ie},Te=e=>{const{state:t,navigation:r}=e,a=f(t,r.step),i=a?.activity??t.activities[0],s=a?.story??i?.stories[0];if(!i||!s)return m`<p class="nav-empty">
      Activity がまだありません。base JSON の <code>activities</code> を追加するか、Agent に依頼してください。
    </p>`;const o=s.steps,d=a?.step,n=a?M(a):void 0;return m`
    <div class="nav">
      <div class="field">
        <span class="dpk-label">Activity</span>
        <select
          class="dpk-select"
          aria-label="Activity"
          @change=${ae(p=>e.navigate({activity:p,story:null,step:null}))}
        >
          ${t.activities.map(p=>m`<option value=${p.id} ?selected=${p.id===i.id}>${p.name}</option>`)}
        </select>
      </div>
      <div class="field">
        <span class="dpk-label">User Story</span>
        <select
          class="dpk-select"
          aria-label="User Story"
          @change=${ae(p=>e.navigate({activity:i.id,story:p,step:null}))}
        >
          ${i.stories.map(p=>m`<option value=${p.id} ?selected=${p.id===s.id}>${p.name}</option>`)}
        </select>
      </div>
      <div class="steps-head">
        <span class="dpk-label">Step</span>
        <span class="dpk-label">${o.length}</span>
      </div>
      <ol class="steps">
        ${De(o,p=>j(i,s,p),(p,w)=>{const l=j(i,s,p),g=e.commentCount({type:"step",id:l});return m`
              <li class="step-row" data-current=${String(p.id===d?.id)}>
                <a class="step-link" href=${e.hashFor({activity:i.id,story:s.id,step:p.id})}>
                  <span class="step-index">${String(w+1).padStart(2,"0")}</span>
                  <span class="step-name">${p.name}</span>
                  ${g>0?m`<span class="step-note">${g}</span>`:I}
                </a>
                <span class="row-tools">
                  <button
                    class="dpk-icon-btn"
                    type="button"
                    aria-label="ステップを削除"
                    @click=${()=>e.dispatch(W.deleteStep(l))}
                  >
                    ${$e()}
                  </button>
                </span>
              </li>
            `})}
      </ol>
      <button class="dpk-btn" type="button" @click=${()=>Be(e,R(i.id,s.id))}>
        ＋ Step
      </button>
      ${d?Ve(n,m`<div class="detail">
                <div class="detail-row">
                  <span class="dpk-label">Step 名</span>
                  <span class="detail-value">
                    <dpk-component-inline-edit
                      .value=${d.name}
                      .label=${"Step \u540D"}
                      @dpk-commit=${se(p=>e.dispatch(W.setStepName(n??d.id,p)))}
                    ></dpk-component-inline-edit>
                  </span>
                </div>
                <div class="detail-row">
                  <span class="dpk-label">説明</span>
                  <span class="detail-value">
                    <dpk-component-inline-edit
                      multiline
                      .value=${d.description??""}
                      .placeholder=${"\u3053\u306E Step \u3067\u4F55\u304C\u8D77\u304D\u308B\u304B\uFF08\u30AF\u30EA\u30C3\u30AF\u3057\u3066\u7DE8\u96C6\uFF09"}
                      .label=${"\u8AAC\u660E"}
                      @dpk-commit=${se(p=>e.dispatch(W.setStepDescription(n??d.id,p)))}
                    ></dpk-component-inline-edit>
                  </span>
                </div>
              </div>`):I}
    </div>
  `},Be=(e,t)=>{const r=Ae("new-step",le(e.state));e.dispatch(W.addStep(t,r,"\u65B0\u3057\u3044\u30B9\u30C6\u30C3\u30D7")).ok&&e.navigate({story:t,step:r})},we={mobile:"390px",tablet:"834px",desktop:"1180px",fluid:"100%"},Se={mobile:"620px",tablet:"640px",desktop:"520px",fluid:"420px"},he=(e,t)=>{const{state:r,navigation:a}=e,i=f(r,a.step),s=i?i.step.previews.find(n=>n.id===a.preview)??i.step.previews[0]:void 0,o=He(r,s?.id);if(!i)return m`
      <div class="stage">
        <p class="stage-empty">
          Step がまだありません。Prototype は
          <strong>Activity › UserStory › Step › Preview</strong> の意味構造を持ち、 1 Step = 1 画面 / 1
          体験状態です。base JSON に Step を追加すると、ここに Preview が現れます。
        </p>
        ${o}
      </div>
    `;const d=i.step.previews;return m`
    <div class="stage">
      ${d.length>1?qe(e,d,s?.id):I}
      ${s?be(e,s,t.hasPreviewContent(s.id)):I}
      ${d.length===0?m`<p class="dpk-label">preview metadata がありません — 追加は Agent に依頼してください</p>`:I}
      ${o}
    </div>
  `},qe=(e,t,r)=>m`<div class="stage-bar">
    <div class="tabs" role="tablist">
      ${t.map(a=>m`<a
            class="tab"
            role="tab"
            data-current=${String(a.id===r)}
            aria-selected=${a.id===r?"true":"false"}
            href=${e.hashFor({preview:a.id})}
            >${a.label??a.viewport}</a
          >`)}
    </div>
  </div>`,be=(e,t,r)=>m`
    <figure
      class="frame"
      data-kind=${t.kind}
      data-viewport=${t.viewport}
      style=${`--frame-width:${we[t.viewport]};--frame-min-height:${Se[t.viewport]}`}
    >
      ${t.kind==="browser"?m`<div class="chrome">
              <span class="dots"><i></i><i></i><i></i></span>
              <span class="url">${ze(e.state,t)}</span>
            </div>`:I}
      <div class="viewport">
        ${t.kind==="native"?je():I}
        <slot name=${`preview:${t.id}`}></slot>
        ${r?I:m`<div class="frame-placeholder">
                <span class="dpk-label">light dom preview</span>
                <code>&lt;div slot="preview" data-preview-id="${t.id}"&gt;</code>
              </div>`}
      </div>
    </figure>
  `,je=()=>m`<div class="status-bar">
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
  </div>`,He=(e,t)=>{const r=H(e).flatMap(a=>a.step.previews.filter(i=>i.id!==t));return r.length===0?m`${I}`:m`<div class="parked" aria-hidden="true">
    ${r.map(a=>m`<slot name=${`preview:${a.id}`}></slot>`)}
  </div>`},Fe=Oe`
  :host {
    --dpk-prototype-accent: var(--dpk-blue);
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
    border-bottom: 1px solid var(--dpk-rule);
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
    border-radius: var(--dpk-radius-sm);
    transition:
      background 140ms ease,
      box-shadow 140ms ease;
  }

  .step-row:hover {
    background: var(--dpk-paper-inset);
  }

  .step-row[data-current='true'] {
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-sm);
  }

  .step-row[data-current='true']::before {
    content: '';
    position: absolute;
    left: 0;
    top: 8px;
    bottom: 8px;
    width: 3px;
    border-radius: var(--dpk-radius-xs);
    background: linear-gradient(180deg, var(--dpk-blue), #2952a3);
  }

  .step-link {
    display: flex;
    flex: 1;
    min-width: 0;
    align-items: center;
    gap: 7px;
    padding: 7px 0;
    text-decoration: none;
    color: var(--dpk-ink-soft);
    font-size: 12.5px;
    font-weight: 460;
  }

  .step-row[data-current='true'] .step-link {
    color: var(--dpk-ink);
    font-weight: 550;
  }

  .step-index {
    flex: 0 0 auto;
    min-width: 17px;
    padding: 1px 4px;
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-paper-inset);
    font-family: var(--dpk-mono);
    font-size: 9.5px;
    font-variant-numeric: tabular-nums;
    text-align: center;
    color: var(--dpk-ink-faint);
    transition:
      background 140ms ease,
      color 140ms ease;
  }

  .step-row[data-current='true'] .step-index {
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue);
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
    background: var(--dpk-accent);
    color: var(--dpk-accent-ink);
    font-family: var(--dpk-mono);
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
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-sm);
  }

  .detail-row {
    display: grid;
    gap: 4px;
  }

  .detail-value {
    font-size: 12.5px;
    color: var(--dpk-ink-soft);
  }

  .nav-empty {
    font-size: 12px;
    line-height: 1.6;
    color: var(--dpk-ink-faint);
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

  .stage-empty {
    max-width: 62ch;
    padding: 16px 18px;
    border: 1px dashed var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-sunken);
    font-size: 13px;
    line-height: 1.7;
    color: var(--dpk-ink-soft);
  }

  /* ------------------------------------------------------------------ frame */

  .frame {
    width: min(var(--frame-width), 100%);
    max-width: 100%;
    margin: 0;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-lg);
    overflow: hidden;
    transition: box-shadow 200ms ease;
  }

  .chrome {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: linear-gradient(180deg, var(--dpk-paper-sunken), var(--dpk-paper-inset));
    border-bottom: 1px solid var(--dpk-rule);
  }

  .dots {
    display: inline-flex;
    gap: 5px;
  }

  .dots i {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--dpk-rule-strong);
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
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised);
    box-shadow: inset 0 1px 2px rgba(20, 28, 44, 0.04);
    font-family: var(--dpk-mono);
    font-size: 10.5px;
    color: var(--dpk-ink-faint);
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
      var(--dpk-shadow-lg),
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
   * the page scrolls as a whole. The flex column keeps a short mock filling
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
    color: var(--dpk-ink-faint);
    background: repeating-linear-gradient(
      -45deg,
      var(--dpk-paper-sunken),
      var(--dpk-paper-sunken) 8px,
      var(--dpk-paper) 8px,
      var(--dpk-paper) 16px
    );
  }

  .frame-placeholder code {
    padding: 3px 7px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-paper-raised);
    font-family: var(--dpk-mono);
    font-size: 10px;
  }

  .parked {
    display: none;
  }
`;class _e extends re{constructor(){super(...arguments),this.definition=ge}static{this.styles=[re.styles,Fe]}renderRegions(t){return{sidebar:Te(t),main:he(t,{hasPreviewContent:r=>this.#e(r)})}}#e(t){return Array.from(this.querySelectorAll("[data-preview-id]")).some(r=>r.getAttribute("data-preview-id")===t)}}const ke=()=>{customElements.get("dpk-template-prototype")||customElements.define("dpk-template-prototype",_e)},Je=Object.freeze(Object.defineProperty({__proto__:null,DpkTemplatePrototype:_e,VIEWPORT_MIN_HEIGHT:Se,VIEWPORT_WIDTH:we,allStepIds:le,applyPrototypeAction:ce,definePrototypeElement:ke,describePrototypeAction:ue,emptyPrototypeBase:ne,findActivity:D,findPreview:_,findStep:f,findStory:T,flattenSteps:H,parsePrototypeBase:de,prototypeAction:W,prototypeActions:v,prototypeBaseSchema:oe,prototypeCommentTargets:fe,prototypeDefinition:ge,prototypeTargetLabel:Ee,prototypeTitle:ie,renderFrame:be,renderNav:Te,renderStage:he,resolvePrototypeNavigation:me,serializePrototypeAction:ye},Symbol.toStringTag,{value:"Module"}));export{ke as d,Je as i};
