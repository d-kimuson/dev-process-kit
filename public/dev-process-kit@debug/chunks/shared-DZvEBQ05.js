import{q as c,al as m,v as L,as as T,ar as S,ab as o,ad as x,ae as f,aq as v,a7 as qe,a8 as A,a9 as N,aa as w,P as Ue,f as Pe,V as O,R as E,m as Qe,$ as F,a4 as Xe,k as Ce,_ as Ye,a0 as D,a1 as h,A as Ve,K as ze,i as Be,a2 as V,T as G}from"./shared-CxeFED6G.js";import{s as z,D as Ke}from"./shared-LG2yyayn.js";import{P as je,r as He,p as Je}from"./shared-B6yvfXoy.js";import{o as Fe}from"./shared-XDZhV_P2.js";const u={SET_STORY_NAME:c("SET_STORY_NAME","story",m({name:x(o(),f(1))})),SET_STORY_DESCRIPTION:c("SET_STORY_DESCRIPTION","story",m({description:o()})),REORDER_STORY:c("REORDER_STORY","story",m({after:v(o())}),{mode:"sequence"}),ADD_STORY:c("ADD_STORY","page",m({id:T,name:x(o(),f(1)),description:S(o())}),{dedupeKey:L}),DELETE_STORY:c("DELETE_STORY","story",m({})),SET_RULE_NAME:c("SET_RULE_NAME","rule",m({name:x(o(),f(1))})),SET_RULE_DESCRIPTION:c("SET_RULE_DESCRIPTION","rule",m({description:o()})),MOVE_RULE:c("MOVE_RULE","rule",m({storyId:x(o(),f(1)),after:v(o())}),{mode:"sequence"}),REORDER_RULE:c("REORDER_RULE","rule",m({after:v(o())}),{mode:"sequence"}),ADD_RULE:c("ADD_RULE","story",m({id:T,name:x(o(),f(1)),description:S(o())}),{dedupeKey:L}),DELETE_RULE:c("DELETE_RULE","rule",m({})),SET_EXAMPLE_NAME:c("SET_EXAMPLE_NAME","example",m({name:x(o(),f(1))})),SET_EXAMPLE_DESCRIPTION:c("SET_EXAMPLE_DESCRIPTION","example",m({description:o()})),MOVE_EXAMPLE:c("MOVE_EXAMPLE","example",m({ruleId:x(o(),f(1)),after:v(o())}),{mode:"sequence"}),REORDER_EXAMPLE:c("REORDER_EXAMPLE","example",m({after:v(o())}),{mode:"sequence"}),ADD_EXAMPLE:c("ADD_EXAMPLE","rule",m({id:T,name:x(o(),f(1)),description:S(o())}),{dedupeKey:L}),DELETE_EXAMPLE:c("DELETE_EXAMPLE","example",m({})),SET_QUESTION_NAME:c("SET_QUESTION_NAME","question",m({name:x(o(),f(1))})),SET_QUESTION_DESCRIPTION:c("SET_QUESTION_DESCRIPTION","question",m({description:o()})),MOVE_QUESTION:c("MOVE_QUESTION","question",m({ruleId:x(o(),f(1)),after:v(o())}),{mode:"sequence"}),REORDER_QUESTION:c("REORDER_QUESTION","question",m({after:v(o())}),{mode:"sequence"}),ADD_QUESTION:c("ADD_QUESTION","rule",m({id:T,name:x(o(),f(1)),description:S(o())}),{dedupeKey:L}),DELETE_QUESTION:c("DELETE_QUESTION","question",m({}))},$={setStoryName:(e,t)=>({type:"SET_STORY_NAME",target:{type:"story",id:e},payload:{name:t}}),setStoryDescription:(e,t)=>({type:"SET_STORY_DESCRIPTION",target:{type:"story",id:e},payload:{description:t}}),reorderStory:(e,t)=>({type:"REORDER_STORY",target:{type:"story",id:e},payload:{after:t}}),addStory:(e,t)=>({type:"ADD_STORY",target:{type:"page",id:"example-mapping"},payload:{id:e,name:t}}),deleteStory:e=>({type:"DELETE_STORY",target:{type:"story",id:e},payload:{}}),setRuleName:(e,t)=>({type:"SET_RULE_NAME",target:{type:"rule",id:e},payload:{name:t}}),setRuleDescription:(e,t)=>({type:"SET_RULE_DESCRIPTION",target:{type:"rule",id:e},payload:{description:t}}),moveRule:(e,t,a)=>({type:"MOVE_RULE",target:{type:"rule",id:e},payload:{storyId:t,after:a}}),reorderRule:(e,t)=>({type:"REORDER_RULE",target:{type:"rule",id:e},payload:{after:t}}),addRule:(e,t,a)=>({type:"ADD_RULE",target:{type:"story",id:e},payload:{id:t,name:a}}),deleteRule:e=>({type:"DELETE_RULE",target:{type:"rule",id:e},payload:{}}),setExampleName:(e,t)=>({type:"SET_EXAMPLE_NAME",target:{type:"example",id:e},payload:{name:t}}),setExampleDescription:(e,t)=>({type:"SET_EXAMPLE_DESCRIPTION",target:{type:"example",id:e},payload:{description:t}}),moveExample:(e,t,a)=>({type:"MOVE_EXAMPLE",target:{type:"example",id:e},payload:{ruleId:t,after:a}}),reorderExample:(e,t)=>({type:"REORDER_EXAMPLE",target:{type:"example",id:e},payload:{after:t}}),addExample:(e,t,a)=>({type:"ADD_EXAMPLE",target:{type:"rule",id:e},payload:{id:t,name:a}}),deleteExample:e=>({type:"DELETE_EXAMPLE",target:{type:"example",id:e},payload:{}}),setQuestionName:(e,t)=>({type:"SET_QUESTION_NAME",target:{type:"question",id:e},payload:{name:t}}),setQuestionDescription:(e,t)=>({type:"SET_QUESTION_DESCRIPTION",target:{type:"question",id:e},payload:{description:t}}),moveQuestion:(e,t,a)=>({type:"MOVE_QUESTION",target:{type:"question",id:e},payload:{ruleId:t,after:a}}),reorderQuestion:(e,t)=>({type:"REORDER_QUESTION",target:{type:"question",id:e},payload:{after:t}}),addQuestion:(e,t,a)=>({type:"ADD_QUESTION",target:{type:"rule",id:e},payload:{id:t,name:a}}),deleteQuestion:e=>({type:"DELETE_QUESTION",target:{type:"question",id:e},payload:{}})},Ge=A({id:T,name:x(o(),f(1)),description:S(o())}),We=A({id:T,storyId:x(o(),f(1)),name:x(o(),f(1)),description:S(o())}),W=A({id:T,ruleId:x(o(),f(1)),name:x(o(),f(1)),description:S(o())}),Z=A({title:S(o()),stories:N(w(Ge),[]),rules:N(w(We),[]),examples:N(w(W),[]),questions:N(w(W),[])}),ee=e=>{const t=qe(Z,e),a=new Set,r=(n,s)=>{if(a.has(s))throw new Error(`duplicate id "${s}" in ${n}`);a.add(s)},i=new Set(t.stories.map(n=>n.id));for(const n of t.stories)r("stories",n.id);for(const n of t.rules)if(r("rules",n.id),!i.has(n.storyId))throw new Error(`rule "${n.id}" references unknown storyId "${n.storyId}"`);const d=new Map(t.rules.map(n=>[n.id,n]));for(const n of t.examples)if(r("examples",n.id),!d.has(n.ruleId))throw new Error(`example "${n.id}" references unknown ruleId "${n.ruleId}"`);for(const n of t.questions)if(r("questions",n.id),!d.has(n.ruleId))throw new Error(`question "${n.id}" references unknown ruleId "${n.ruleId}"`);return t},te=()=>({stories:[],rules:[],examples:[],questions:[]}),Ze=e=>({...e,rules:z(e.rules,["storyId"]),examples:z(e.examples,["ruleId"]),questions:z(e.questions,["ruleId"])}),_=(e,t)=>{if(t!==void 0)return e.stories.find(a=>a.id===t)},g=(e,t)=>{if(t!==void 0)return e.rules.find(a=>a.id===t)},b=(e,t)=>{if(t!==void 0)return e.examples.find(a=>a.id===t)},I=(e,t)=>{if(t!==void 0)return e.questions.find(a=>a.id===t)},q=(e,t)=>{if(t===void 0)return;const a=_(e,t);if(a)return{kind:"story",id:a.id,name:a.name,...a.description===void 0?{}:{description:a.description}};const r=g(e,t);if(r)return{kind:"rule",id:r.id,name:r.name,...r.description===void 0?{}:{description:r.description}};const i=b(e,t);if(i)return{kind:"example",id:i.id,name:i.name,...i.description===void 0?{}:{description:i.description}};const d=I(e,t);if(d)return{kind:"question",id:d.id,name:d.name,...d.description===void 0?{}:{description:d.description}}},ae=(e,t)=>e.rules.filter(a=>a.storyId===t),re=(e,t)=>e.examples.filter(a=>a.ruleId===t),ie=(e,t)=>e.questions.filter(a=>a.ruleId===t),et=(e,t)=>{if(_(e,t))return t;const a=g(e,t);if(a)return a.storyId;const r=b(e,t)?.ruleId??I(e,t)?.ruleId;return r===void 0?void 0:g(e,r)?.storyId},de=e=>[...e.stories.map(t=>t.id),...e.rules.map(t=>t.id),...e.examples.map(t=>t.id),...e.questions.map(t=>t.id)],ne=(e,t)=>g(e,t)?.storyId,tt=(e,t)=>{const a=b(e,t);return a?ne(e,a.ruleId):void 0},se=(e,t)=>{const a=Ue(u,t);if(a===null)return null;const r=a.target.id;switch(a.type){case"SET_STORY_NAME":return oe(e,r,i=>({...i,name:a.payload.name}));case"SET_STORY_DESCRIPTION":return oe(e,r,i=>({...i,description:a.payload.description}));case"REORDER_STORY":{const i=me(e.stories,r,a.payload.after);return i===null?null:{...e,stories:i}}case"ADD_STORY":{const i=a.payload;return e.stories.some(d=>d.id===i.id)?e:U(e,i.id)?null:{...e,stories:[...e.stories,{id:i.id,name:i.name,...i.description===void 0?{}:{description:i.description}}]}}case"DELETE_STORY":{if(!e.stories.some(d=>d.id===r))return null;const i=new Set(e.rules.filter(d=>d.storyId===r).map(d=>d.id));return{...e,stories:e.stories.filter(d=>d.id!==r),rules:e.rules.filter(d=>d.storyId!==r),examples:e.examples.filter(d=>!i.has(d.ruleId)),questions:e.questions.filter(d=>!i.has(d.ruleId))}}case"SET_RULE_NAME":return le(e,r,i=>({...i,name:a.payload.name}));case"SET_RULE_DESCRIPTION":return le(e,r,i=>({...i,description:a.payload.description}));case"MOVE_RULE":{const i=a.payload,d=g(e,r);if(!d||!e.stories.some(s=>s.id===i.storyId))return null;const n=e.rules.filter(s=>s.storyId===i.storyId&&s.id!==r);return i.after!==null&&!n.some(s=>s.id===i.after)?null:{...e,rules:ce(e.rules,{...d,storyId:i.storyId},i.after)}}case"REORDER_RULE":{const i=g(e,r);if(!i)return null;const d=e.rules.filter(n=>n.storyId===i.storyId);return a.payload.after!==null&&!d.some(n=>n.id===a.payload.after)?null:{...e,rules:ce(e.rules,i,a.payload.after)}}case"ADD_RULE":{const i=a.payload,d=_(e,r);return d?e.rules.some(n=>n.id===i.id)?e:U(e,i.id)?null:{...e,rules:[...e.rules,{id:i.id,storyId:d.id,name:i.name,...i.description===void 0?{}:{description:i.description}}]}:null}case"DELETE_RULE":return g(e,r)?{...e,rules:e.rules.filter(i=>i.id!==r),examples:e.examples.filter(i=>i.ruleId!==r),questions:e.questions.filter(i=>i.ruleId!==r)}:null;case"SET_EXAMPLE_NAME":return pe(e,r,i=>({...i,name:a.payload.name}));case"SET_EXAMPLE_DESCRIPTION":return pe(e,r,i=>({...i,description:a.payload.description}));case"MOVE_EXAMPLE":{const i=a.payload,d=b(e,r);if(!d||!g(e,i.ruleId))return null;const n=e.examples.filter(s=>s.ruleId===i.ruleId&&s.id!==r);return i.after!==null&&!n.some(s=>s.id===i.after)?null:{...e,examples:P(e.examples,{...d,ruleId:i.ruleId},i.after)}}case"REORDER_EXAMPLE":{const i=b(e,r);if(!i)return null;const d=e.examples.filter(n=>n.ruleId===i.ruleId);return a.payload.after!==null&&!d.some(n=>n.id===a.payload.after)?null:{...e,examples:P(e.examples,i,a.payload.after)}}case"ADD_EXAMPLE":{const i=a.payload,d=g(e,r);return d?e.examples.some(n=>n.id===i.id)?e:U(e,i.id)?null:{...e,examples:[...e.examples,{id:i.id,ruleId:d.id,name:i.name,...i.description===void 0?{}:{description:i.description}}]}:null}case"DELETE_EXAMPLE":return b(e,r)?{...e,examples:e.examples.filter(i=>i.id!==r)}:null;case"SET_QUESTION_NAME":return ue(e,r,i=>({...i,name:a.payload.name}));case"SET_QUESTION_DESCRIPTION":return ue(e,r,i=>({...i,description:a.payload.description}));case"MOVE_QUESTION":{const i=a.payload,d=I(e,r);if(!d||!g(e,i.ruleId))return null;const n=e.questions.filter(s=>s.ruleId===i.ruleId&&s.id!==r);return i.after!==null&&!n.some(s=>s.id===i.after)?null:{...e,questions:P(e.questions,{...d,ruleId:i.ruleId},i.after)}}case"REORDER_QUESTION":{const i=I(e,r);if(!i)return null;const d=e.questions.filter(n=>n.ruleId===i.ruleId);return a.payload.after!==null&&!d.some(n=>n.id===a.payload.after)?null:{...e,questions:P(e.questions,i,a.payload.after)}}case"ADD_QUESTION":{const i=a.payload,d=g(e,r);return d?e.questions.some(n=>n.id===i.id)?e:U(e,i.id)?null:{...e,questions:[...e.questions,{id:i.id,ruleId:d.id,name:i.name,...i.description===void 0?{}:{description:i.description}}]}:null}case"DELETE_QUESTION":return I(e,r)?{...e,questions:e.questions.filter(i=>i.id!==r)}:null;default:return Pe(a)}},U=(e,t)=>e.stories.some(a=>a.id===t)||e.rules.some(a=>a.id===t)||e.examples.some(a=>a.id===t)||e.questions.some(a=>a.id===t),oe=(e,t,a)=>e.stories.some(r=>r.id===t)?{...e,stories:e.stories.map(r=>r.id===t?a(r):r)}:null,le=(e,t,a)=>e.rules.some(r=>r.id===t)?{...e,rules:e.rules.map(r=>r.id===t?a(r):r)}:null,pe=(e,t,a)=>e.examples.some(r=>r.id===t)?{...e,examples:e.examples.map(r=>r.id===t?a(r):r)}:null,ue=(e,t,a)=>e.questions.some(r=>r.id===t)?{...e,questions:e.questions.map(r=>r.id===t?a(r):r)}:null,ce=(e,t,a)=>{const r=e.filter(p=>p.id!==t.id),i=r.filter(p=>p.storyId===t.storyId),d=a===null?[t,...i]:B(i,t,a),n=r.findIndex(p=>p.storyId===t.storyId),s=new Set(i.map(p=>p.id)),l=r.filter(p=>!s.has(p.id)),y=n<0?l.length:Math.min(n,l.length);return[...l.slice(0,y),...d,...l.slice(y)]},P=(e,t,a)=>{const r=e.filter(p=>p.id!==t.id),i=r.filter(p=>p.ruleId===t.ruleId),d=a===null?[t,...i]:B(i,t,a),n=r.findIndex(p=>p.ruleId===t.ruleId),s=new Set(i.map(p=>p.id)),l=r.filter(p=>!s.has(p.id)),y=n<0?l.length:Math.min(n,l.length);return[...l.slice(0,y),...d,...l.slice(y)]},me=(e,t,a)=>{if(!e.some(d=>d.id===t)||a!==null&&!e.some(d=>d.id===a))return null;if(a===t)return[...e];const r=e.find(d=>d.id===t);if(r===void 0)return null;const i=e.filter(d=>d.id!==t);return B(i,r,a)},B=(e,t,a)=>{const r=[...e],i=a===null?-1:r.findIndex(d=>d.id===a);return r.splice(i+1,0,t),r},Q=(e,t)=>{const a=typeof t=="string"?t:"",r=typeof e=="string"?e:void 0;return r===void 0?`\u2192 \u300C${a}\u300D`:`\u300C${r}\u300D\u2192\u300C${a}\u300D`},at={SET_STORY_NAME:(e,t)=>({title:"\u30B9\u30C8\u30FC\u30EA\u30FC\u540D\u3092\u5909\u66F4",tone:"update",body:Q(_(t,e.target.id)?.name,E(u.SET_STORY_NAME,e).name??"")}),SET_STORY_DESCRIPTION:e=>({title:"\u30B9\u30C8\u30FC\u30EA\u30FC\u306E\u8AAC\u660E\u3092\u66F4\u65B0",tone:"update",body:`\u2192 \u300C${String(E(u.SET_STORY_DESCRIPTION,e).description??"").slice(0,90)}\u300D`}),REORDER_STORY:e=>({title:"\u30B9\u30C8\u30FC\u30EA\u30FC\u306E\u9806\u5E8F\u3092\u5909\u66F4",tone:"move",body:X(E(u.REORDER_STORY,e).after)}),ADD_STORY:e=>({title:"\u30B9\u30C8\u30FC\u30EA\u30FC\u3092\u8FFD\u52A0",tone:"create",body:`+ \u300C${E(u.ADD_STORY,e).name??""}\u300D`}),DELETE_STORY:(e,t)=>({title:"\u30B9\u30C8\u30FC\u30EA\u30FC\u3092\u524A\u9664",tone:"delete",body:`\u2212 \u300C${_(t,e.target.id)?.name??e.target.id}\u300D`}),SET_RULE_NAME:(e,t)=>({title:"\u30EB\u30FC\u30EB\u540D\u3092\u5909\u66F4",tone:"update",body:Q(g(t,e.target.id)?.name,E(u.SET_RULE_NAME,e).name??"")}),SET_RULE_DESCRIPTION:e=>({title:"\u30EB\u30FC\u30EB\u306E\u8AAC\u660E\u3092\u66F4\u65B0",tone:"update",body:`\u2192 \u300C${String(E(u.SET_RULE_DESCRIPTION,e).description??"").slice(0,90)}\u300D`}),MOVE_RULE:(e,t)=>({title:"\u30EB\u30FC\u30EB\u3092\u79FB\u52D5",tone:"move",body:`\u2192 ${_(t,String(E(u.MOVE_RULE,e).storyId))?.name??String(E(u.MOVE_RULE,e).storyId??"")}`}),REORDER_RULE:e=>({title:"\u30EB\u30FC\u30EB\u306E\u9806\u5E8F\u3092\u5909\u66F4",tone:"move",body:X(E(u.REORDER_RULE,e).after)}),ADD_RULE:e=>({title:"\u30EB\u30FC\u30EB\u3092\u8FFD\u52A0",tone:"create",body:`+ \u300C${E(u.ADD_RULE,e).name??""}\u300D`}),DELETE_RULE:(e,t)=>({title:"\u30EB\u30FC\u30EB\u3092\u524A\u9664",tone:"delete",body:`\u2212 \u300C${g(t,e.target.id)?.name??e.target.id}\u300D`}),SET_EXAMPLE_NAME:(e,t)=>({title:"\u5177\u4F53\u4F8B\u540D\u3092\u5909\u66F4",tone:"update",body:Q(b(t,e.target.id)?.name,E(u.SET_EXAMPLE_NAME,e).name??"")}),SET_EXAMPLE_DESCRIPTION:e=>({title:"\u5177\u4F53\u4F8B\u306E\u8AAC\u660E\u3092\u66F4\u65B0",tone:"update",body:`\u2192 \u300C${String(E(u.SET_EXAMPLE_DESCRIPTION,e).description??"").slice(0,90)}\u300D`}),MOVE_EXAMPLE:(e,t)=>({title:"\u5177\u4F53\u4F8B\u3092\u79FB\u52D5",tone:"move",body:`\u2192 ${g(t,String(E(u.MOVE_EXAMPLE,e).ruleId))?.name??String(E(u.MOVE_EXAMPLE,e).ruleId??"")}`}),REORDER_EXAMPLE:e=>({title:"\u5177\u4F53\u4F8B\u306E\u9806\u5E8F\u3092\u5909\u66F4",tone:"move",body:X(E(u.REORDER_EXAMPLE,e).after)}),ADD_EXAMPLE:e=>({title:"\u5177\u4F53\u4F8B\u3092\u8FFD\u52A0",tone:"create",body:`+ \u300C${E(u.ADD_EXAMPLE,e).name??""}\u300D`}),DELETE_EXAMPLE:(e,t)=>({title:"\u5177\u4F53\u4F8B\u3092\u524A\u9664",tone:"delete",body:`\u2212 \u300C${b(t,e.target.id)?.name??e.target.id}\u300D`}),SET_QUESTION_NAME:(e,t)=>({title:"\u8CEA\u554F\u540D\u3092\u5909\u66F4",tone:"update",body:Q(I(t,e.target.id)?.name,E(u.SET_QUESTION_NAME,e).name??"")}),SET_QUESTION_DESCRIPTION:e=>({title:"\u8CEA\u554F\u306E\u8AAC\u660E\u3092\u66F4\u65B0",tone:"update",body:`\u2192 \u300C${String(E(u.SET_QUESTION_DESCRIPTION,e).description??"").slice(0,90)}\u300D`}),MOVE_QUESTION:(e,t)=>({title:"\u8CEA\u554F\u3092\u79FB\u52D5",tone:"move",body:`\u2192 ${g(t,String(E(u.MOVE_QUESTION,e).ruleId))?.name??String(E(u.MOVE_QUESTION,e).ruleId??"")}`}),REORDER_QUESTION:e=>({title:"\u8CEA\u554F\u306E\u9806\u5E8F\u3092\u5909\u66F4",tone:"move",body:X(E(u.REORDER_QUESTION,e).after)}),ADD_QUESTION:e=>({title:"\u8CEA\u554F\u3092\u8FFD\u52A0",tone:"create",body:`+ \u300C${E(u.ADD_QUESTION,e).name??""}\u300D`}),DELETE_QUESTION:(e,t)=>({title:"\u8CEA\u554F\u3092\u524A\u9664",tone:"delete",body:`\u2212 \u300C${I(t,e.target.id)?.name??e.target.id}\u300D`})},X=e=>e==null?"\u2192 \u5148\u982D\u3078":`\u2192 \u300C${e}\u300D\u306E\u76F4\u5F8C\u3078`,Ee=(e,t,a)=>{let r;try{const i=at[e.type];r=i?i(e,a??t):{title:e.type,tone:"meta"}}catch{r={title:e.type,tone:"meta"}}return{title:r.title,targetLabel:ye(t,e.target),tone:r.tone,...r.body===void 0?{}:{summary:r.body}}},ge=e=>`${e.type} ${O(e.target)} ${JSON.stringify(e.payload)}`,rt={story:"\u30B9\u30C8\u30FC\u30EA\u30FC",rule:"\u30EB\u30FC\u30EB",example:"\u5177\u4F53\u4F8B",question:"\u8CEA\u554F"},ye=(e,t)=>{try{switch(t.type){case"story":{const a=_(e,t.id);return a?`\u30B9\u30C8\u30FC\u30EA\u30FC \xB7 ${a.name}`:`\u30B9\u30C8\u30FC\u30EA\u30FC \xB7 ${t.id} (missing)`}case"rule":{const a=g(e,t.id);return a?`\u30EB\u30FC\u30EB \xB7 ${a.name}`:`\u30EB\u30FC\u30EB \xB7 ${t.id} (missing)`}case"example":{const a=b(e,t.id);return a?`\u5177\u4F53\u4F8B \xB7 ${a.name}`:`\u5177\u4F53\u4F8B \xB7 ${t.id} (missing)`}case"question":{const a=I(e,t.id);return a?`\u8CEA\u554F \xB7 ${a.name}`:`\u8CEA\u554F \xB7 ${t.id} (missing)`}case"page":return`\u30DE\u30C3\u30D7 \xB7 ${K(e)}`;default:return`${t.type} \xB7 ${t.id}`}}catch{return`${t.type} \xB7 ${t.id}`}},xe=(e,t)=>{const a=[{value:"page:example-mapping",label:"\u30DE\u30C3\u30D7\u5168\u4F53",group:"\u30DE\u30C3\u30D7"}];for(const r of e.stories)a.push({value:O({type:"story",id:r.id}),label:r.name,group:"\u30B9\u30C8\u30FC\u30EA\u30FC"});for(const r of e.rules){const i=_(e,r.storyId);a.push({value:O({type:"rule",id:r.id}),label:i?`${i.name} \u203A ${r.name}`:r.name,group:"\u30EB\u30FC\u30EB"})}for(const r of e.examples){const i=g(e,r.ruleId);a.push({value:O({type:"example",id:r.id}),label:i?`${i.name} \u203A ${r.name}`:r.name,group:"\u5177\u4F53\u4F8B"})}for(const r of e.questions){const i=g(e,r.ruleId);a.push({value:O({type:"question",id:r.id}),label:i?`${i.name} \u203A ${r.name}`:r.name,group:"\u8CEA\u554F"})}return a},fe=(e,t)=>{const a=q(e,t.card);return a?{value:O({type:a.kind,id:a.id}),label:a.name,group:rt[a.kind]}:null},it=4,dt={empty:"\u30EB\u30FC\u30EB\u672A\u6574\u7406","open-questions":"\u672A\u89E3\u6C7A\u306E\u8CEA\u554F\u3042\u308A","too-big":"\u5206\u5272\u3092\u691C\u8A0E",thin:"\u5177\u4F53\u4F8B\u306E\u7121\u3044\u30EB\u30FC\u30EB\u3042\u308A",ready:"\u5408\u610F\u3067\u304D\u305D\u3046"},he=(e,t)=>{const a=e.rules.filter(l=>l.storyId===t),r=new Set(a.map(l=>l.id)),i=e.examples.filter(l=>r.has(l.ruleId)),d=e.questions.filter(l=>r.has(l.ruleId)).length,n=a.some(l=>!i.some(y=>y.ruleId===l.id)),s=a.length===0?"empty":d>0?"open-questions":a.length>it?"too-big":n?"thin":"ready";return{rules:a.length,examples:i.length,questions:d,readiness:s,label:dt[s]}},K=e=>e.title??"Example Mapping",_e=(e,t)=>{const a=q(e,t.card),r={...t};return a?r.card=a.id:delete r.card,r},be=(e,t)=>{switch(t.type){case"story":case"rule":case"example":case"question":return q(e,t.id)?.kind===t.type;case"page":return!0;default:return!1}},Ie={name:"example-mapping",label:"Example Mapping",parseBase:ee,emptyBase:te,actions:u,apply:se,canonicalState:Ze,hasTarget:be,describe:Ee,serialize:ge,resolveNavigation:_e,commentTargets:(e,t)=>xe(e),currentTarget:(e,t)=>fe(e,t),title:K},C=(e,t,a)=>{const r=Qe(t,de(e.state));return e.dispatch(a(r)).ok?(e.navigate({card:r}),r):null},nt=e=>C(e,"new-story",t=>$.addStory(t,"\u65B0\u3057\u3044\u30B9\u30C8\u30FC\u30EA\u30FC")),st=(e,t)=>C(e,"new-rule",a=>$.addRule(t,a,"\u65B0\u3057\u3044\u30EB\u30FC\u30EB")),ot=(e,t)=>C(e,"new-example",a=>$.addExample(t,a,"\u65B0\u3057\u3044\u5177\u4F53\u4F8B")),lt=(e,t)=>C(e,"new-question",a=>$.addQuestion(t,a,"\u65B0\u3057\u3044\u8CEA\u554F")),pt={width:300,height:260},Se=["story","rule","example","question"],j={story:"\u30B9\u30C8\u30FC\u30EA\u30FC",rule:"\u30EB\u30FC\u30EB",example:"\u5177\u4F53\u4F8B",question:"\u8CEA\u554F"},Re={story:{bg:"linear-gradient(178deg, #fff3a6, #fde77a)",ink:"#4a3a06"},rule:{bg:"linear-gradient(178deg, #a3d1f5, #7cb8ea)",ink:"#0e2c4b"},example:{bg:"linear-gradient(178deg, #c9eb95, #a8dc63)",ink:"#22380a"},question:{bg:"linear-gradient(178deg, #fbc6d9, #f4a0c0)",ink:"#4b1029"}},k=e=>{const{bg:t,ink:a}=Re[e];return`--em-card-bg:${t};--em-card-ink:${a}`},ut=F`
  :host {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 6px;
    box-sizing: border-box;
    min-height: 76px;
    padding: 17px 11px 11px;
    border-radius: 3px;
    background: var(--em-card-bg, var(--dpk-paper-raised));
    color: var(--em-card-ink, var(--dpk-ink));
    box-shadow:
      0 1px 2px rgba(30, 24, 10, 0.14),
      0 5px 10px -4px rgba(30, 24, 10, 0.24);
    cursor: grab;
    transform: rotate(var(--em-tilt, 0deg));
    transition:
      transform 180ms ease,
      box-shadow 180ms ease,
      opacity 180ms ease;
  }

  :host(:hover) {
    z-index: 6;
    transform: rotate(0deg) translateY(-2px);
    box-shadow:
      0 2px 4px rgba(30, 24, 10, 0.16),
      0 12px 22px -6px rgba(30, 24, 10, 0.3);
  }

  :host([focused]) {
    z-index: 5;
    outline: 2px solid var(--dpk-blue);
    outline-offset: 2px;
    transform: rotate(0deg);
  }

  :host([data-mode='editing']),
  :host([data-mode='commenting']) {
    z-index: 7;
    transform: rotate(0deg);
  }

  :host([dragging]) {
    opacity: 0.4;
  }

  :host([data-kind='story']) {
    min-height: 68px;
    padding: 19px 14px 13px;
  }

  /* Small, faint, top-left: readable when looked for, quiet when not. */
  .card-kind {
    position: absolute;
    top: 5px;
    left: 8px;
    font-family: var(--dpk-mono);
    font-size: 8px;
    font-weight: 600;
    letter-spacing: 0.12em;
    opacity: 0.5;
  }

  .card-name {
    min-width: 0;
    font-size: 13px;
    font-weight: 680;
    line-height: 1.35;
    letter-spacing: -0.01em;
    overflow-wrap: anywhere;
    cursor: text;
  }

  :host([data-kind='story']) .card-name {
    font-size: 15.5px;
    line-height: 1.3;
  }

  .card-text {
    font-size: 11.5px;
    line-height: 1.5;
    opacity: 0.72;
    white-space: pre-wrap;
  }

  /* Comments already left: a corner flag, readable without hover. */
  .card-flag {
    position: absolute;
    top: -7px;
    right: -7px;
    min-width: 17px;
    height: 17px;
    padding: 0 4px;
    box-sizing: border-box;
    border-radius: 999px;
    background: var(--dpk-accent);
    color: var(--dpk-accent-ink);
    font-family: var(--dpk-mono);
    font-size: 9.5px;
    font-weight: 650;
    line-height: 17px;
    text-align: center;
    box-shadow: 0 1px 4px rgba(217, 73, 32, 0.35);
  }

  /* A side rail of round buttons that fades in on hover, like Event Storming:
     nothing crosses the card's face. */
  .card-tools {
    position: absolute;
    top: 9px;
    right: -11px;
    z-index: 8;
    display: flex;
    flex-direction: column;
    gap: 3px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 140ms ease;
  }

  :host(:hover) .card-tools,
  :host([data-mode='commenting']) .card-tools,
  .card-tools:focus-within {
    opacity: 1;
    pointer-events: auto;
  }

  .card-tools .dpk-icon-btn {
    width: 22px;
    height: 22px;
    border: 1px solid var(--dpk-rule);
    border-radius: 50%;
    background: color-mix(in srgb, var(--dpk-paper-raised) 94%, transparent);
    box-shadow: var(--dpk-shadow-xs);
  }
`;class ct extends Xe{static{this.styles=[Ce,ut,Ye]}static{this.properties={card:{attribute:!1},notes:{attribute:!1},tilt:{attribute:!1},mode:{type:String,reflect:!0,attribute:"data-mode"},focused:{type:Boolean,reflect:!0},dragging:{type:Boolean,reflect:!0},onIntent:{attribute:!1}}}#e="";#i=new je(this);constructor(){super(),this.card=null,this.notes=[],this.tilt=0,this.mode="view",this.focused=!1,this.dragging=!1,this.onIntent=null,this.addEventListener("click",()=>this.#a({kind:"select"})),this.addEventListener("focusin",()=>this.draggable=!1),this.addEventListener("focusout",()=>this.draggable=!0)}updated(t){if(t.has("card")&&this.card){const{bg:i,ink:d}=Re[this.card.kind];this.setAttribute("data-kind",this.card.kind),this.style.setProperty("--em-card-bg",i),this.style.setProperty("--em-card-ink",d)}if(t.has("tilt")&&this.style.setProperty("--em-tilt",`${this.tilt}deg`),t.has("mode")&&(this.mode!=="commenting"&&(this.#e=""),this.mode==="editing"&&this.renderRoot.querySelector("dpk-component-inline-edit")?.startEditing()),this.mode!=="commenting")return;const a=this.renderRoot.querySelector(".comment-pop"),r=this.renderRoot.querySelector('[data-role="comment"]');a&&r&&this.#i.open(a,r,pt)}render(){const t=this.card;if(!t)return D;const a=j[t.kind];return h`
      <div class="card-kind">${a}</div>
      <dpk-component-inline-edit
        class="card-name"
        ?wrap=${!0}
        ?seamless=${!0}
        .value=${t.name}
        .label=${`${a}\u540D`}
        @dpk-commit=${Fe(r=>this.#a({kind:"rename",name:r}))}
      ></dpk-component-inline-edit>
      ${t.description?h`<div class="card-text">${t.description}</div>`:D}
      ${this.notes.length>0?h`<span class="card-flag">${this.notes.length}</span>`:D}
      <div class="card-tools">
        <button
          class="dpk-icon-btn"
          type="button"
          data-role="comment"
          aria-label="コメント"
          data-active=${String(this.mode==="commenting")}
          @click=${this.#r({kind:"toggle-comment"})}
        >
          ${Ve()}
        </button>
        <button
          class="dpk-icon-btn"
          type="button"
          data-role="delete"
          aria-label="削除"
          @click=${this.#r({kind:"delete"})}
        >
          ${ze()}
        </button>
      </div>
      ${this.mode==="commenting"?this.#t(t):D}
    `}#t(t){return He(Je(this.#e,this.notes.map(Be),{label:t.name}),a=>{a.kind==="input"?(this.#e=a.body,this.requestUpdate()):this.#a(a)})}#r(t){return a=>{a.stopPropagation(),this.#a(t)}}#a(t){this.onIntent?.(t)}}const mt=()=>{customElements.get("dpk-internal-example-mapping-card")||customElements.define("dpk-internal-example-mapping-card",ct)},M=(e,t,a)=>{const r=e.at(-1)??null;if(t===null||a==="end")return r;const i=e.indexOf(t);return i<0?r:a==="after"?t:i===0?null:e.at(i-1)??null},Te=(e,t,a,r)=>{if(!_(e,t))return null;const i=e.stories.filter(d=>d.id!==t).map(d=>d.id);return{type:"REORDER_STORY",target:{type:"story",id:t},payload:{after:M(i,a,r)}}},ve=(e,t,a,r,i)=>{if(!_(e,t)||!g(e,a))return null;const d=e.rules.filter(n=>n.storyId===t&&n.id!==a).map(n=>n.id);return{type:"MOVE_RULE",target:{type:"rule",id:a},payload:{storyId:t,after:M(d,r,i)}}},Oe=(e,t,a,r,i)=>{if(!g(e,t)||!b(e,a))return null;const d=e.examples.filter(n=>n.ruleId===t&&n.id!==a).map(n=>n.id);return{type:"MOVE_EXAMPLE",target:{type:"example",id:a},payload:{ruleId:t,after:M(d,r,i)}}},ke=(e,t,a,r,i)=>{if(!g(e,t)||!I(e,a))return null;const d=e.questions.filter(n=>n.ruleId===t&&n.id!==a).map(n=>n.id);return{type:"MOVE_QUESTION",target:{type:"question",id:a},payload:{ruleId:t,after:M(d,r,i)}}},Y={kind:"idle"},H=(e,t)=>e.kind!=="idle"&&e.cardId===t,De=(e,t)=>H(e,t)&&(e.kind==="editing"||e.kind==="commenting")?e.kind:"view",$e=(e,t,a)=>{switch(a.kind){case"toggle-comment":return e.kind==="commenting"&&e.cardId===t?Y:{kind:"commenting",cardId:t};case"rename":case"comment":case"dismiss":case"delete":return H(e,t)?Y:e;case"select":return e}},Et=(e,t)=>{if(e==="story")return 0;let a=0;for(const r of t)a=a*31+r.charCodeAt(0)|0;return(Math.abs(a)%5-2)*.45},gt=()=>h`<ul class="legend" aria-label="カードの種類">
    ${Se.map(e=>h`<li><span class="legend-swatch" style=${k(e)}></span>${j[e]}</li>`)}
  </ul>`,yt=e=>{const{context:t,handlers:a}=e;return t.state.stories.length===0?h`
      <div class="empty">
        <h2>ストーリーがまだありません</h2>
        <p>
          ストーリー（黄）を1枚置き、その下に受け入れ条件となるルール（青）を並べます。
          ルールごとに、上の欄へ具体例（緑）を、下の欄へ答えの出ない論点を質問（赤）として積みます。
        </p>
        <button class="dpk-btn dpk-btn--accent" type="button" @click=${a.addStory}>＋ 最初のストーリー</button>
      </div>
    `:h`
    <div class="board" data-testid="example-mapping-board">
      ${V(t.state.stories,r=>r.id,r=>xt(e,r))}
      <button class="add-story" type="button" @click=${a.addStory}>＋ ストーリー</button>
    </div>
  `},J=(e,t,a)=>{const{context:r,mode:i,drag:d,handlers:n}=e,s=r.comments.filter(y=>y.target.type===t&&y.target.id===a.id),l=d.source({type:t,id:a.id});return h`<dpk-internal-example-mapping-card
    data-card=${a.id}
    data-card-kind=${t}
    draggable="true"
    .card=${{kind:t,id:a.id,name:a.name,...a.description===void 0?{}:{description:a.description}}}
    .notes=${s}
    .tilt=${Et(t,a.id)}
    .mode=${De(i,a.id)}
    .onIntent=${y=>n.cardIntent(a.id,t,y)}
    ?focused=${r.navigation.card===a.id}
    ?dragging=${d.isDragging(t,a.id)}
    @dragstart=${l.dragstart}
    @dragend=${l.dragend}
  ></dpk-internal-example-mapping-card>`},xt=(e,t)=>{const{context:a,drag:r,handlers:i}=e,d=he(a.state,t.id),n=`story:${t.id}`,s=r.target({key:n,accepts:"story",hovered:Ae(".story-section","story"),onDrop:i.dropStory}),l=`rules:${t.id}`,y=r.target({key:l,accepts:"rule",hovered:Ae(".rule-col","rule"),onDrop:p=>i.dropRule(t.id,p)});return h`
    <section
      class="story-section"
      data-story=${t.id}
      data-drop=${String(r.isOver(n))}
      @dragenter=${s.dragenter}
      @dragover=${s.dragover}
      @dragleave=${s.dragleave}
      @drop=${s.drop}
    >
      <header class="story-row">
        <div class="story-slot">${J(e,"story",t)}</div>
        <div class="story-meta">
          <span class="readiness" data-readiness=${d.readiness}>${d.label}</span>
          <span class="tally"><i class="tally-dot" style=${k("rule")}></i>ルール ${d.rules}</span>
          <span class="tally"
            ><i class="tally-dot" style=${k("example")}></i>具体例 ${d.examples}</span
          >
          <span class="tally"
            ><i class="tally-dot" style=${k("question")}></i>質問 ${d.questions}</span
          >
        </div>
      </header>
      <div
        class="rules-row"
        data-testid=${`rules-${t.id}`}
        data-drop=${String(r.isOver(l))}
        @dragenter=${y.dragenter}
        @dragover=${y.dragover}
        @dragleave=${y.dragleave}
        @drop=${y.drop}
      >
        ${V(ae(a.state,t.id),p=>p.id,p=>ft(e,p))}
        <button class="add-rule" type="button" @click=${()=>i.addRule(t.id)}>
          <span class="add-plus">＋</span>ルール
        </button>
      </div>
    </section>
  `},ft=(e,t)=>{const{drag:a}=e;return h`
    <div class="rule-col" data-rule=${t.id} ?data-dragging=${a.isDragging("rule",t.id)}>
      ${J(e,"rule",t)} ${Me(e,t.id,"example")}
      ${Me(e,t.id,"question")}
    </div>
  `},ht={example:{testid:"examples",label:"\u5177\u4F53\u4F8B",empty:"\u5177\u4F53\u4F8B\u304C\u307E\u3060\u3042\u308A\u307E\u305B\u3093",add:"\uFF0B \u5177\u4F53\u4F8B"},question:{testid:"questions",label:"\u8CEA\u554F",empty:"\u672A\u89E3\u6C7A\u306E\u8CEA\u554F\u306F\u3042\u308A\u307E\u305B\u3093",add:"\uFF0B \u8CEA\u554F"}},Me=(e,t,a)=>{const{context:r,drag:i,handlers:d}=e,n=ht[a],s=`${n.testid}:${t}`,l=a==="example"?i.target({key:s,accepts:"example",hovered:Le("example"),onDrop:R=>d.dropExample(t,R)}):i.target({key:s,accepts:"question",hovered:Le("question"),onDrop:R=>d.dropQuestion(t,R)}),y=a==="example"?re(r.state,t):ie(r.state,t),p=a==="example"?d.addExample:d.addQuestion;return h`<div
    class="card-area card-area--${a}"
    data-testid=${`${n.testid}-${t}`}
    data-drop=${String(i.isOver(s))}
    @dragenter=${l.dragenter}
    @dragover=${l.dragover}
    @dragleave=${l.dragleave}
    @drop=${l.drop}
  >
    <h3 class="area-label"><i class="tally-dot" style=${k(a)}></i>${n.label}</h3>
    ${V(y,R=>R.id,R=>J(e,a,R))}
    ${y.length===0?h`<p class="stack-hint">${n.empty}</p>`:D}
    <button class="add-card add-${a}" type="button" @click=${()=>p(t)}>${n.add}</button>
  </div>`},Le=e=>t=>{const a=t.target instanceof Element?t.target.closest("dpk-internal-example-mapping-card"):null;return!a||a.getAttribute("data-card-kind")!==e?null:{id:a.getAttribute("data-card"),element:a}},Ae=(e,t)=>a=>{const r=a.target instanceof Element?a.target.closest(e):null;return r?{id:r.getAttribute(`data-${t}`),element:r}:null},_t=F`
  /* ------------------------------------------------------------ legend */

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 11.5px;
    color: var(--dpk-ink-soft);
  }

  .legend li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .legend-swatch {
    width: 14px;
    height: 11px;
    border-radius: 2px;
    background: var(--em-card-bg);
    box-shadow: 0 1px 2px rgba(30, 24, 10, 0.18);
  }

  /* ------------------------------------------------------------- board */

  .board {
    display: grid;
    gap: 22px;
    align-content: start;
  }

  .story-section {
    display: grid;
    gap: 18px;
    min-width: 0;
    padding: 20px 22px 24px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-lg);
    background:
      radial-gradient(circle, rgba(20, 28, 44, 0.07) 1px, transparent 1.2px) 0 0 / 18px 18px,
      var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow);
    transition: outline-color 150ms ease;
  }

  .story-section[data-drop='true'] {
    outline: 2px dashed var(--dpk-blue);
    outline-offset: 4px;
  }

  /* The story heads the table: one wide card, with where it stands beside it. */
  .story-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 14px 20px;
  }

  .story-slot {
    width: min(420px, 100%);
  }

  .story-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  .readiness {
    padding: 4px 11px;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 650;
    background: var(--dpk-paper-sunken);
    color: var(--dpk-ink-soft);
  }

  .readiness[data-readiness='ready'] {
    background: var(--dpk-green-soft);
    color: var(--dpk-green);
  }

  .readiness[data-readiness='open-questions'],
  .readiness[data-readiness='too-big'] {
    background: rgba(214, 53, 80, 0.1);
    color: #b81c33;
  }

  .readiness[data-readiness='thin'] {
    background: var(--dpk-amber-soft);
    color: var(--dpk-amber);
  }

  .tally {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 9px;
    border: 1px solid var(--dpk-rule);
    border-radius: 999px;
    background: var(--dpk-paper-raised);
    font-family: var(--dpk-mono);
    font-size: 10.5px;
    font-variant-numeric: tabular-nums;
    color: var(--dpk-ink-soft);
  }

  .tally-dot {
    width: 8px;
    height: 8px;
    border-radius: 2px;
    background: var(--em-card-bg);
  }

  /* ------------------------------------------------- rules and examples */

  /* Rules side by side under the story; the row scrolls, never the page. */
  .rules-row {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    min-width: 0;
    overflow-x: auto;
    padding: 4px 4px 16px;
    border-radius: var(--dpk-radius);
  }

  .rules-row[data-drop='true'] {
    background: var(--dpk-blue-soft);
  }

  /* A rule and its examples read as one lane: a soft tint, no side border. */
  .rule-col {
    flex: 0 0 204px;
    display: grid;
    gap: 16px;
    align-content: start;
    padding: 10px 10px 14px;
    border-radius: var(--dpk-radius-lg);
    background: linear-gradient(180deg, rgba(51, 102, 204, 0.09), rgba(51, 102, 204, 0.03) 70%, transparent);
  }

  .rule-col[data-dragging] {
    opacity: 0.45;
  }

  /* Examples on top, questions below: two areas, each its own drop target. */
  .card-area {
    display: grid;
    gap: 12px;
    align-content: start;
    min-height: 44px;
    padding: 8px 8px 10px;
    border-radius: var(--dpk-radius);
  }

  .card-area--example {
    background: rgba(74, 163, 94, 0.08);
  }

  .card-area--question {
    background: rgba(214, 53, 80, 0.06);
  }

  .card-area--question dpk-internal-example-mapping-card {
    min-height: 56px;
  }

  .card-area[data-drop='true'] {
    outline: 2px dashed var(--dpk-blue);
    outline-offset: 2px;
  }

  .area-label {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--dpk-ink-soft);
  }

  .stack-hint {
    margin: 0;
    font-size: 11px;
    color: var(--dpk-ink-faint);
    text-align: center;
  }

  /* -------------------------------------------------------- add buttons */

  .add-card,
  .add-rule,
  .add-story {
    border: 1px dashed var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: rgba(255, 255, 255, 0.6);
    color: var(--dpk-ink-faint);
    font: inherit;
    font-size: 11.5px;
    cursor: pointer;
    transition:
      background 140ms ease,
      border-color 140ms ease,
      color 140ms ease;
  }

  .add-card {
    padding: 6px 8px;
  }

  .add-rule {
    flex: 0 0 120px;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 2px;
    min-height: 96px;
  }

  .add-plus {
    font-size: 18px;
    line-height: 1;
  }

  .add-story {
    justify-self: start;
    padding: 10px 18px;
    font-size: 12.5px;
  }

  .add-card:hover,
  .add-rule:hover,
  .add-story:hover {
    border-color: var(--dpk-blue);
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue);
  }

  .empty {
    display: grid;
    gap: 10px;
    max-width: 620px;
    padding: 28px 24px;
    border: 1px dashed var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-raised);
  }

  .empty p {
    margin: 0;
    color: var(--dpk-ink-soft);
    line-height: 1.7;
  }
`,bt={story:"SET_STORY_NAME",rule:"SET_RULE_NAME",example:"SET_EXAMPLE_NAME",question:"SET_QUESTION_NAME"},It={story:"DELETE_STORY",rule:"DELETE_RULE",example:"DELETE_EXAMPLE",question:"DELETE_QUESTION"};class Ne extends G{constructor(){super(),this.definition=Ie,this.#e=new Ke(this),this.mode=Y}static{this.styles=[G.styles,_t]}static{this.properties={mode:{state:!0}}}#e;renderRegions(t){return{header:gt(),main:this.#i(t)}}#i(t){return h`
      ${yt({context:t,mode:this.mode,drag:this.#e,handlers:{cardIntent:(a,r,i)=>this.#r(a,r,i),addStory:()=>this.#t(nt(t)),addRule:a=>this.#t(st(t,a)),addExample:a=>this.#t(ot(t,a)),addQuestion:a=>this.#t(lt(t,a)),dropStory:a=>this.#a(a),dropRule:(a,r)=>this.#d(a,r),dropExample:(a,r)=>this.#s(a,r),dropQuestion:(a,r)=>this.#o(a,r)}})}
    `}#t(t){t!==null&&(this.mode={kind:"editing",cardId:t})}#r(t,a,r){const i=this.context();switch(r.kind){case"select":i.navigate({card:t});break;case"rename":i.dispatch({type:bt[a],target:{type:a,id:t},payload:{name:r.name}});break;case"comment":i.dispatch({type:"comment",target:`${a}:${t}`,payload:{body:r.body}});break;case"delete":i.dispatch({type:It[a],target:{type:a,id:t},payload:{}}),i.navigation.card===t&&i.navigate({card:null});break}this.mode=$e(this.mode,t,r)}#a(t){const a=this.context(),r=Te(a.state,t.item.id,t.hoveredId,t.place);r&&a.dispatch(r)}#d(t,a){const r=this.context(),i=this.#n(a.hoveredId,a.event.clientX,a.place),d=ve(r.state,t,a.item.id,a.hoveredId,i);d&&r.dispatch(d)}#n(t,a,r){if(t===null)return r;const i=this.renderRoot.querySelector(`.rule-col[data-rule="${t}"]`);if(!i)return r;const d=i.getBoundingClientRect();return a<=d.left+d.width/2?"before":"after"}#s(t,a){const r=this.context(),i=Oe(r.state,t,a.item.id,a.hoveredId,a.place);i&&r.dispatch(i)}#o(t,a){const r=this.context(),i=ke(r.state,t,a.item.id,a.hoveredId,a.place);i&&r.dispatch(i)}}const we=()=>{mt(),customElements.get("dpk-template-example-mapping")||customElements.define("dpk-template-example-mapping",Ne)},St=Object.freeze(Object.defineProperty({__proto__:null,CARD_KINDS:Se,CARD_KIND_LABELS:j,DpkTemplateExampleMapping:Ne,IDLE_MODE:Y,allMappingIds:de,applyExampleMappingAction:se,cardModeOf:De,cardPaletteStyle:k,defineExampleMappingElement:we,describeExampleMappingAction:Ee,dropAfter:M,emptyExampleMappingBase:te,exampleMappingAction:$,exampleMappingActions:u,exampleMappingBaseSchema:Z,exampleMappingCommentTargets:xe,exampleMappingCurrentTarget:fe,exampleMappingDefinition:Ie,exampleMappingHasTarget:be,exampleMappingTargetLabel:ye,exampleMappingTitle:K,examplesOfRule:re,findCard:q,findExample:b,findQuestion:I,findRule:g,findStory:_,modeConcerns:H,parseExampleMappingBase:ee,presentStorySummary:he,questionsOfRule:ie,reduceCardIntent:$e,reorderById:me,resolveExampleDrop:Oe,resolveExampleMappingNavigation:_e,resolveQuestionDrop:ke,resolveRuleDrop:ve,resolveStoryDrop:Te,rulesOfStory:ae,serializeExampleMappingAction:ge,storyIdOfCard:et,storyIdOfExample:tt,storyIdOfRule:ne},Symbol.toStringTag,{value:"Module"}));export{we as d,St as i};
