import{s as z,p as d,q as ue,t as fe,F as Y,w as de,d as V,i as X,x as me,o as pe,g as w,c as y,j as he,b as A,y as be,R as ye,Q as ve}from"./q-DC-1kLxL.js";const N={manifestHash:"kf2hc3",core:"q-DcKVriXW.js",preloader:"q-BKZ00VYc.js",qwikLoader:"q-naDMFAHy.js",bundleGraphAsset:"assets/27EZfDwJ-bundle-graph.json",injections:[{tag:"link",location:"head",attributes:{rel:"stylesheet",href:"/assets/Bl1IR6z1-style.css"}}],mapping:{s_D0klH7xaWQs:"q-C020M7ya.js",s_StW5Xejgk3o:"q-Uys13_L5.js",s_dzfnviS6dBQ:"q-VFaHfcf1.js",s_inmdLLfyBMU:"q-CfSDsI5Z.js",s_3wOW9prnetw:"q-C020M7ya.js",s_Eb40jmTDh4w:"q-CfSDsI5Z.js",s_UU5aDOl6cQE:"q-C020M7ya.js",s_ge0TyOk09lU:"q-C020M7ya.js",s_yUnbqUPCRt4:"q-Uys13_L5.js",s_2pWKbqmEwTo:"q-C020M7ya.js",s_NgvO7tCLtaw:"q-C020M7ya.js",s_dv5F8Hz0p3o:"q-B8lAsERa.js",s_yeI9tnZ8lZA:"q-Cs705bho.js",s_5pOGbAS4vao:"q-Bitw1Y-O.js",s_KjAo0ASRqh4:"q-tGZBCuEe.js",s_2QWNe5sYWTo:"q-CXQK-0s1.js",s_4y8vqMFEmDM:"q-CrSzcb5u.js",s_58JIgmd6w7Y:"q-Uys13_L5.js",s_RdcNQNeWRqw:"q-tGZBCuEe.js",s_U3ZPMRrOUro:"q-C020M7ya.js",s_XRbIynRnZqg:"q-hxbWonW_.js",s_Y0O7vaB2o0Y:"q-CFhQAVCc.js",s_YQALR0bPzOw:"q-DMAj2Abs.js",s_aS2oHNfEvMw:"q-CIYeY9A9.js",s_bj6Z9BYLn24:"q-Bitw1Y-O.js",s_gxIuf3nkoJw:"q-C7xtGQnq.js",s_ihTEV0C5xKA:"q-B8lAsERa.js",s_jx01sgXQnAo:"q-Bo3ZUEel.js",s_nXbMjh1z4c8:"q-CLL5D7sl.js",s_u3U3Sgf0asE:"q-DcKVriXW.js",s_wJeIwVNJ1uQ:"q-BWSmKTbZ.js",s_yh7kHMdRNag:"q-CfSDsI5Z.js",s_20CbiLAYdbA:"q-B8lAsERa.js",s_53TtZC0C9R0:"q-BELYANpq.js",s_BthniXPk0hA:"q-BOozv8RW.js",s_UO6SClnVcOg:"q-CJN8qrxw.js",s_lx26mH2yxbw:"q-B3js5w87.js",s_01IAa1GFfEs:"q-Bitw1Y-O.js",s_1YnzFTibIqM:"q-Uys13_L5.js",s_1l5q0DK97Mk:"q-Bitw1Y-O.js",s_3yrrWhFgA0k:"q-CIYeY9A9.js",s_4XynZRLqvqQ:"q-CIYeY9A9.js",s_6mySBlRYmcE:"q-Bitw1Y-O.js",s_8MvNMgKrm5k:"q-Bitw1Y-O.js",s_FOlRS6ROwOM:"q-tGZBCuEe.js",s_LLqZVz8sxaY:"q-DcKVriXW.js",s_OH51JCAkl0w:"q-Uys13_L5.js",s_OZiMUJgz3SQ:"q-Uys13_L5.js",s_RoEYsq9sc8o:"q-tGZBCuEe.js",s_Z28SQ8ByPQ0:"q-Bitw1Y-O.js",s_bwXMMRXW7OA:"q-Bitw1Y-O.js",s_fYRF53W60a4:"q-Uys13_L5.js",s_hhIOa0SEdTs:"q-B8lAsERa.js",s_ix9RBfeyL00:"q-Uys13_L5.js",s_k7vCEI8CLuw:"q-Uys13_L5.js",s_kE8jUege9eM:"q-CfSDsI5Z.js",s_u4XA4Rtxw4c:"q-Bo3ZUEel.js",s_vp0AiPwbFsA:"q-tGZBCuEe.js",s_wVhScMGyGsA:"q-B8lAsERa.js",s_wYf0TgIEqIg:"q-C020M7ya.js",s_xesE6fi2200:"q-CfSDsI5Z.js"}};/**
 * @license
 * @builder.io/qwik/server 1.17.0
 * Copyright Builder.io, Inc. All Rights Reserved.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/QwikDev/qwik/blob/main/LICENSE
 */var qe=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(t,n)=>(typeof require<"u"?require:t)[n]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')}),_e="<sync>";function K(e,t){const n=t?.mapper,r=e.symbolMapper?e.symbolMapper:(s,i,a)=>{if(n){const l=R(s),c=n[l];if(!c){if(l===_e)return[l,""];if(globalThis.__qwik_reg_symbols?.has(l))return[s,"_"];if(a)return[s,`${a}?qrl=${s}`];console.error("Cannot resolve symbol",s,"in",n,a)}return c}};return{isServer:!0,async importSymbol(s,i,a){const l=R(a),c=globalThis.__qwik_reg_symbols?.get(l);if(c)return c;let u=String(i);u.endsWith(".js")||(u+=".js");const m=qe(u);if(!(a in m))throw new Error(`Q-ERROR: missing symbol '${a}' in module '${u}'.`);return m[a]},raf:()=>(console.error("server can not rerender"),Promise.resolve()),nextTick:s=>new Promise(i=>{setTimeout(()=>{i(s())})}),chunkForSymbol(s,i,a){return r(s,n,a)}}}async function ge(e,t){const n=K(e,t);z(n)}var R=e=>{const t=e.lastIndexOf("_");return t>-1?e.slice(t+1):e},we="q:instance",T={$DEBUG$:!1,$invPreloadProbability$:.65},$e=Date.now(),Ee=/\.[mc]?js$/,ee=0,Se=1,je=2,Pe=3,M,D,ke=(e,t)=>({$name$:e,$state$:Ee.test(e)?ee:Pe,$deps$:ne?t?.map(n=>({...n,$factor$:1})):t,$inverseProbability$:1,$createdTs$:Date.now(),$waitedMs$:0,$loadedMs$:0}),Ce=e=>{const t=new Map;let n=0;for(;n<e.length;){const r=e[n++],o=[];let s,i=1;for(;s=e[n],typeof s=="number";)s<0?i=-s/10:o.push({$name$:e[s],$importProbability$:i,$factor$:1}),n++;t.set(r,o)}return t},te=e=>{let t=U.get(e);if(!t){let n;if(D){if(n=D.get(e),!n)return;n.length||(n=void 0)}t=ke(e,n),U.set(e,t)}return t},Ae=(e,t)=>{t&&("debug"in t&&(T.$DEBUG$=!!t.debug),typeof t.preloadProbability=="number"&&(T.$invPreloadProbability$=1-t.preloadProbability)),!(M!=null||!e)&&(M="",D=Ce(e))},U=new Map,ne,L,re=0,j=[],Re=(...e)=>{console.log(`Preloader ${Date.now()-$e}ms ${re}/${j.length} queued>`,...e)},Le=()=>{U.clear(),L=!1,ne=!0,re=0,j.length=0},Be=()=>{L&&(j.sort((e,t)=>e.$inverseProbability$-t.$inverseProbability$),L=!1)},Ie=()=>{Be();let e=.4;const t=[];for(const n of j){const r=Math.round((1-n.$inverseProbability$)*10);r!==e&&(e=r,t.push(e)),t.push(n.$name$)}return t},se=(e,t,n)=>{if(n?.has(e))return;const r=e.$inverseProbability$;if(e.$inverseProbability$=t,!(r-e.$inverseProbability$<.01)&&(M!=null&&e.$state$<je&&(e.$state$===ee&&(e.$state$=Se,j.push(e),T.$DEBUG$&&Re(`queued ${Math.round((1-e.$inverseProbability$)*100)}%`,e.$name$)),L=!0),e.$deps$)){n||(n=new Set),n.add(e);const o=1-e.$inverseProbability$;for(const s of e.$deps$){const i=te(s.$name$);if(i.$inverseProbability$===0)continue;let a;if(o===1||o>=.99&&F<100)F++,a=Math.min(.01,1-s.$importProbability$);else{const l=1-s.$importProbability$*o,c=s.$factor$,u=l/c;a=Math.max(.02,i.$inverseProbability$*u),s.$factor$=u}se(i,a,n)}}},J=(e,t)=>{const n=te(e);n&&n.$inverseProbability$>t&&se(n,t)},F,xe=(e,t)=>{if(!e?.length)return;F=0;let n=t?1-t:.4;if(Array.isArray(e))for(let r=e.length-1;r>=0;r--){const o=e[r];typeof o=="number"?n=1-o/10:J(o,n)}else J(e,n)};function Oe(e){const t=[],n=r=>{if(r)for(const o of r)t.includes(o.url)||(t.push(o.url),o.imports&&n(o.imports))};return n(e),t}var Ne=e=>{const t=de();return e?.qrls?.map(n=>{const r=n.$refSymbol$||n.$symbol$,o=n.$chunk$,s=t.chunkForSymbol(r,o,n.dev?.file);return s?s[1]:o}).filter(Boolean)};function Te(e,t,n){const r=t.prefetchStrategy;if(r===null)return[];if(!n?.manifest.bundleGraph)return Ne(e);if(typeof r?.symbolsToPrefetch=="function")try{const s=r.symbolsToPrefetch({manifest:n.manifest});return Oe(s)}catch(s){console.error("getPrefetchUrls, symbolsToPrefetch()",s)}const o=new Set;for(const s of e?.qrls||[]){const i=R(s.$refSymbol$||s.$symbol$);i&&i.length>=10&&o.add(i)}return[...o]}var Me=(e,t)=>{if(!t?.manifest.bundleGraph)return[...new Set(e)];Le();let n=.99;for(const r of e.slice(0,15))xe(r,n),n*=.85;return Ie()},Q=(e,t)=>{if(t==null)return null;const n=`${e}${t}`.split("/"),r=[];for(const o of n)o===".."&&r.length>0?r.pop():r.push(o);return r.join("/")},De=(e,t,n,r,o)=>{const s=Q(e,t?.manifest?.preloader),i="/"+t?.manifest.bundleGraphAsset;if(s&&i&&n!==!1){const l=typeof n=="object"?{debug:n.debug,preloadProbability:n.ssrPreloadProbability}:void 0;Ae(t?.manifest.bundleGraph,l);const c=[];n?.debug&&c.push("d:1"),n?.maxIdlePreloads&&c.push(`P:${n.maxIdlePreloads}`),n?.preloadProbability&&c.push(`Q:${n.preloadProbability}`);const u=c.length?`,{${c.join(",")}}`:"",m=`let b=fetch("${i}");import("${s}").then(({l})=>l(${JSON.stringify(e)},b${u}));`;r.push(d("link",{rel:"modulepreload",href:s,nonce:o}),d("link",{rel:"preload",href:i,as:"fetch",crossorigin:"anonymous",nonce:o}),d("script",{type:"module",async:!0,dangerouslySetInnerHTML:m,nonce:o}))}const a=Q(e,t?.manifest.core);a&&r.push(d("link",{rel:"modulepreload",href:a,nonce:o}))},Ue=(e,t,n,r,o)=>{if(r.length===0||n===!1)return null;const{ssrPreloads:s,ssrPreloadProbability:i}=Qe(typeof n=="boolean"?void 0:n);let a=s;const l=[],c=[],u=t?.manifest.manifestHash;if(a){const q=t?.manifest.preloader,p=t?.manifest.core,b=Me(r,t);let E=4;const P=i*10;for(const v of b)if(typeof v=="string"){if(E<P)break;if(v===q||v===p)continue;if(c.push(v),--a===0)break}else E=v}const m=Q(e,u&&t?.manifest.preloader);let $=c.length?`${JSON.stringify(c)}.map((l,e)=>{e=document.createElement('link');e.rel='modulepreload';e.href=${JSON.stringify(e)}+l;document.head.appendChild(e)});`:"";return m&&($+=`window.addEventListener('load',f=>{f=_=>import("${m}").then(({p})=>p(${JSON.stringify(r)}));try{requestIdleCallback(f,{timeout:2000})}catch(e){setTimeout(f,200)}})`),$&&l.push(d("script",{type:"module","q:type":"preload",async:!0,dangerouslySetInnerHTML:$,nonce:o})),l.length>0?d(Y,{children:l}):null},Fe=(e,t,n,r,o)=>{if(n.preloader!==!1){const s=Te(t,n,r);if(s.length>0){const i=Ue(e,r,n.preloader,s,n.serverData?.nonce);i&&o.push(i)}}};function Qe(e){return{...Ye,...e}}var Ye={ssrPreloads:7,ssrPreloadProbability:.5,debug:!1,maxIdlePreloads:25,preloadProbability:.35},He='const t=document,e=window,n=new Set,o=new Set([t]);let r;const s=(t,e)=>Array.from(t.querySelectorAll(e)),a=t=>{const e=[];return o.forEach(n=>e.push(...s(n,t))),e},i=t=>{w(t),s(t,"[q\\\\:shadowroot]").forEach(t=>{const e=t.shadowRoot;e&&i(e)})},c=t=>t&&"function"==typeof t.then,l=(t,e,n=e.type)=>{a("[on"+t+"\\\\:"+n+"]").forEach(o=>{b(o,t,e,n)})},f=e=>{if(void 0===e._qwikjson_){let n=(e===t.documentElement?t.body:e).lastElementChild;for(;n;){if("SCRIPT"===n.tagName&&"qwik/json"===n.getAttribute("type")){e._qwikjson_=JSON.parse(n.textContent.replace(/\\\\x3C(\\/?script)/gi,"<$1"));break}n=n.previousElementSibling}}},p=(t,e)=>new CustomEvent(t,{detail:e}),b=async(e,n,o,r=o.type)=>{const s="on"+n+":"+r;e.hasAttribute("preventdefault:"+r)&&o.preventDefault(),e.hasAttribute("stoppropagation:"+r)&&o.stopPropagation();const a=e._qc_,i=a&&a.li.filter(t=>t[0]===s);if(i&&i.length>0){for(const t of i){const n=t[1].getFn([e,o],()=>e.isConnected)(o,e),r=o.cancelBubble;c(n)&&await n,r&&o.stopPropagation()}return}const l=e.getAttribute(s);if(l){const n=e.closest("[q\\\\:container]"),r=n.getAttribute("q:base"),s=n.getAttribute("q:version")||"unknown",a=n.getAttribute("q:manifest-hash")||"dev",i=new URL(r,t.baseURI);for(const p of l.split("\\n")){const l=new URL(p,i),b=l.href,h=l.hash.replace(/^#?([^?[|]*).*$/,"$1")||"default",q=performance.now();let _,d,y;const w=p.startsWith("#"),g={qBase:r,qManifest:a,qVersion:s,href:b,symbol:h,element:e,reqTime:q};if(w){const e=n.getAttribute("q:instance");_=(t["qFuncs_"+e]||[])[Number.parseInt(h)],_||(d="sync",y=Error("sym:"+h))}else{u("qsymbol",g);const t=l.href.split("#")[0];try{const e=import(t);f(n),_=(await e)[h],_||(d="no-symbol",y=Error(`${h} not in ${t}`))}catch(t){d||(d="async"),y=t}}if(!_){u("qerror",{importError:d,error:y,...g}),console.error(y);break}const m=t.__q_context__;if(e.isConnected)try{t.__q_context__=[e,o,l];const n=_(o,e);c(n)&&await n}catch(t){u("qerror",{error:t,...g})}finally{t.__q_context__=m}}}},u=(e,n)=>{t.dispatchEvent(p(e,n))},h=t=>t.replace(/([A-Z])/g,t=>"-"+t.toLowerCase()),q=async t=>{let e=h(t.type),n=t.target;for(l("-document",t,e);n&&n.getAttribute;){const o=b(n,"",t,e);let r=t.cancelBubble;c(o)&&await o,r||(r=r||t.cancelBubble||n.hasAttribute("stoppropagation:"+t.type)),n=t.bubbles&&!0!==r?n.parentElement:null}},_=t=>{l("-window",t,h(t.type))},d=()=>{const s=t.readyState;if(!r&&("interactive"==s||"complete"==s)&&(o.forEach(i),r=1,u("qinit"),(e.requestIdleCallback??e.setTimeout).bind(e)(()=>u("qidle")),n.has("qvisible"))){const t=a("[on\\\\:qvisible]"),e=new IntersectionObserver(t=>{for(const n of t)n.isIntersecting&&(e.unobserve(n.target),b(n.target,"",p("qvisible",n)))});t.forEach(t=>e.observe(t))}},y=(t,e,n,o=!1)=>{t.addEventListener(e,n,{capture:o,passive:!1})},w=(...t)=>{for(const r of t)"string"==typeof r?n.has(r)||(o.forEach(t=>y(t,r,q,!0)),y(e,r,_,!0),n.add(r)):o.has(r)||(n.forEach(t=>y(r,t,q,!0)),o.add(r))};if(!("__q_context__"in t)){t.__q_context__=0;const r=e.qwikevents;r&&(Array.isArray(r)?w(...r):w("click","input")),e.qwikevents={events:n,roots:o,push:w},y(t,"readystatechange",d),d()}',Ze=`const doc = document;
const win = window;
const events = /* @__PURE__ */ new Set();
const roots = /* @__PURE__ */ new Set([doc]);
let hasInitialized;
const nativeQuerySelectorAll = (root, selector) => Array.from(root.querySelectorAll(selector));
const querySelectorAll = (query) => {
  const elements = [];
  roots.forEach((root) => elements.push(...nativeQuerySelectorAll(root, query)));
  return elements;
};
const findShadowRoots = (fragment) => {
  processEventOrNode(fragment);
  nativeQuerySelectorAll(fragment, "[q\\\\:shadowroot]").forEach((parent) => {
    const shadowRoot = parent.shadowRoot;
    shadowRoot && findShadowRoots(shadowRoot);
  });
};
const isPromise = (promise) => promise && typeof promise.then === "function";
const broadcast = (infix, ev, type = ev.type) => {
  querySelectorAll("[on" + infix + "\\\\:" + type + "]").forEach((el) => {
    dispatch(el, infix, ev, type);
  });
};
const resolveContainer = (containerEl) => {
  if (containerEl._qwikjson_ === void 0) {
    const parentJSON = containerEl === doc.documentElement ? doc.body : containerEl;
    let script = parentJSON.lastElementChild;
    while (script) {
      if (script.tagName === "SCRIPT" && script.getAttribute("type") === "qwik/json") {
        containerEl._qwikjson_ = JSON.parse(
          script.textContent.replace(/\\\\x3C(\\/?script)/gi, "<$1")
        );
        break;
      }
      script = script.previousElementSibling;
    }
  }
};
const createEvent = (eventName, detail) => new CustomEvent(eventName, {
  detail
});
const dispatch = async (element, onPrefix, ev, eventName = ev.type) => {
  const attrName = "on" + onPrefix + ":" + eventName;
  if (element.hasAttribute("preventdefault:" + eventName)) {
    ev.preventDefault();
  }
  if (element.hasAttribute("stoppropagation:" + eventName)) {
    ev.stopPropagation();
  }
  const ctx = element._qc_;
  const relevantListeners = ctx && ctx.li.filter((li) => li[0] === attrName);
  if (relevantListeners && relevantListeners.length > 0) {
    for (const listener of relevantListeners) {
      const results = listener[1].getFn([element, ev], () => element.isConnected)(ev, element);
      const cancelBubble = ev.cancelBubble;
      if (isPromise(results)) {
        await results;
      }
      if (cancelBubble) {
        ev.stopPropagation();
      }
    }
    return;
  }
  const attrValue = element.getAttribute(attrName);
  if (attrValue) {
    const container = element.closest("[q\\\\:container]");
    const qBase = container.getAttribute("q:base");
    const qVersion = container.getAttribute("q:version") || "unknown";
    const qManifest = container.getAttribute("q:manifest-hash") || "dev";
    const base = new URL(qBase, doc.baseURI);
    for (const qrl of attrValue.split("\\n")) {
      const url = new URL(qrl, base);
      const href = url.href;
      const symbol = url.hash.replace(/^#?([^?[|]*).*$/, "$1") || "default";
      const reqTime = performance.now();
      let handler;
      let importError;
      let error;
      const isSync = qrl.startsWith("#");
      const eventData = {
        qBase,
        qManifest,
        qVersion,
        href,
        symbol,
        element,
        reqTime
      };
      if (isSync) {
        const hash = container.getAttribute("q:instance");
        handler = (doc["qFuncs_" + hash] || [])[Number.parseInt(symbol)];
        if (!handler) {
          importError = "sync";
          error = new Error("sym:" + symbol);
        }
      } else {
        emitEvent("qsymbol", eventData);
        const uri = url.href.split("#")[0];
        try {
          const module = import(
                        uri
          );
          resolveContainer(container);
          handler = (await module)[symbol];
          if (!handler) {
            importError = "no-symbol";
            error = new Error(\`\${symbol} not in \${uri}\`);
          }
        } catch (err) {
          importError || (importError = "async");
          error = err;
        }
      }
      if (!handler) {
        emitEvent("qerror", {
          importError,
          error,
          ...eventData
        });
        console.error(error);
        break;
      }
      const previousCtx = doc.__q_context__;
      if (element.isConnected) {
        try {
          doc.__q_context__ = [element, ev, url];
          const results = handler(ev, element);
          if (isPromise(results)) {
            await results;
          }
        } catch (error2) {
          emitEvent("qerror", { error: error2, ...eventData });
        } finally {
          doc.__q_context__ = previousCtx;
        }
      }
    }
  }
};
const emitEvent = (eventName, detail) => {
  doc.dispatchEvent(createEvent(eventName, detail));
};
const camelToKebab = (str) => str.replace(/([A-Z])/g, (a) => "-" + a.toLowerCase());
const processDocumentEvent = async (ev) => {
  let type = camelToKebab(ev.type);
  let element = ev.target;
  broadcast("-document", ev, type);
  while (element && element.getAttribute) {
    const results = dispatch(element, "", ev, type);
    let cancelBubble = ev.cancelBubble;
    if (isPromise(results)) {
      await results;
    }
    cancelBubble || (cancelBubble = cancelBubble || ev.cancelBubble || element.hasAttribute("stoppropagation:" + ev.type));
    element = ev.bubbles && cancelBubble !== true ? element.parentElement : null;
  }
};
const processWindowEvent = (ev) => {
  broadcast("-window", ev, camelToKebab(ev.type));
};
const processReadyStateChange = () => {
  const readyState = doc.readyState;
  if (!hasInitialized && (readyState == "interactive" || readyState == "complete")) {
    roots.forEach(findShadowRoots);
    hasInitialized = 1;
    emitEvent("qinit");
    const riC = win.requestIdleCallback ?? win.setTimeout;
    riC.bind(win)(() => emitEvent("qidle"));
    if (events.has("qvisible")) {
      const results = querySelectorAll("[on\\\\:qvisible]");
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            observer.unobserve(entry.target);
            dispatch(entry.target, "", createEvent("qvisible", entry));
          }
        }
      });
      results.forEach((el) => observer.observe(el));
    }
  }
};
const addEventListener = (el, eventName, handler, capture = false) => {
  el.addEventListener(eventName, handler, { capture, passive: false });
};
const processEventOrNode = (...eventNames) => {
  for (const eventNameOrNode of eventNames) {
    if (typeof eventNameOrNode === "string") {
      if (!events.has(eventNameOrNode)) {
        roots.forEach(
          (root) => addEventListener(root, eventNameOrNode, processDocumentEvent, true)
        );
        addEventListener(win, eventNameOrNode, processWindowEvent, true);
        events.add(eventNameOrNode);
      }
    } else {
      if (!roots.has(eventNameOrNode)) {
        events.forEach(
          (eventName) => addEventListener(eventNameOrNode, eventName, processDocumentEvent, true)
        );
        roots.add(eventNameOrNode);
      }
    }
  }
};
if (!("__q_context__" in doc)) {
  doc.__q_context__ = 0;
  const qwikevents = win.qwikevents;
  if (qwikevents) {
    if (Array.isArray(qwikevents)) {
      processEventOrNode(...qwikevents);
    } else {
      processEventOrNode("click", "input");
    }
  }
  win.qwikevents = {
    events,
    roots,
    push: processEventOrNode
  };
  addEventListener(doc, "readystatechange", processReadyStateChange);
  processReadyStateChange();
}`;function We(e={}){return e.debug?Ze:He}function O(){if(typeof performance>"u")return()=>0;const e=performance.now();return()=>(performance.now()-e)/1e6}function Ge(e){let t=e.base;return typeof e.base=="function"&&(t=e.base(e)),typeof t=="string"?(t.endsWith("/")||(t+="/"),t):"/build/"}var Je="<!DOCTYPE html>";async function ze(e,t){let n=t.stream,r=0,o=0,s=0,i=0,a="",l;const c=t.streaming?.inOrder??{strategy:"auto",maximunInitialChunk:5e4,maximunChunk:3e4},u=t.containerTagName??"html",m=t.containerAttributes??{},B=n,$=O(),q=Ge(t),p=oe(t.manifest),b=t.serverData?.nonce;function E(){a&&(B.write(a),a="",r=0,s++,s===1&&(i=$()))}function P(f){const h=f.length;r+=h,o+=h,a+=f}switch(c.strategy){case"disabled":n={write:P};break;case"direct":n=B;break;case"auto":let f=0,h=!1;const W=c.maximunChunk??0,x=c.maximunInitialChunk??0;n={write(_){_==="<!--qkssr-f-->"?h||(h=!0):_==="<!--qkssr-pu-->"?f++:_==="<!--qkssr-po-->"?f--:P(_),f===0&&(h||r>=(s===0?x:W))&&(h=!1,E())}};break}u==="html"?n.write(Je):n.write("<!--cq-->"),p||console.warn("Missing client manifest, loading symbols in the client might 404. Please ensure the client build has run and generated the manifest for the server build."),await ge(t,p);const v=p?.manifest.injections,k=v?v.map(f=>d(f.tag,f.attributes??{})):[];let C=t.qwikLoader?typeof t.qwikLoader=="object"?t.qwikLoader.include==="never"?2:0:t.qwikLoader==="inline"?1:t.qwikLoader==="never"?2:0:0;const I=p?.manifest.qwikLoader;if(C===0&&!I&&(C=1),C===0)k.unshift(d("link",{rel:"modulepreload",href:`${q}${I}`,nonce:b}),d("script",{type:"module",async:!0,src:`${q}${I}`,nonce:b}));else if(C===1){const f=We({debug:t.debug});k.unshift(d("script",{id:"qwikloader",type:"module",async:!0,nonce:b,dangerouslySetInnerHTML:f}))}De(q,p,t.preloader,k,b);const ie=O(),ae=[];let H=0,Z=0;await ue(e,{stream:n,containerTagName:u,containerAttributes:m,serverData:t.serverData,base:q,beforeContent:k,beforeClose:async(f,h,W,x)=>{H=ie();const _=O();l=await fe(f,h,void 0,x);const g=[];Fe(q,l,t,p,g);const ce=JSON.stringify(l.state,void 0,void 0);if(g.push(d("script",{type:"qwik/json",dangerouslySetInnerHTML:Xe(ce),nonce:b})),l.funcs.length>0){const S=m[we];g.push(d("script",{"q:func":"qwik/json",dangerouslySetInnerHTML:tt(S,l.funcs),nonce:b}))}const G=Array.from(h.$events$,S=>JSON.stringify(S));if(G.length>0){const S=`(window.qwikevents||(window.qwikevents=[])).push(${G.join(",")})`;g.push(d("script",{dangerouslySetInnerHTML:S,nonce:b}))}return Ke(ae,f),Z=_(),d(Y,{children:g})},manifestHash:p?.manifest.manifestHash||"dev"+Ve()}),u!=="html"&&n.write("<!--/cq-->"),E();const le=l.resources.some(f=>f._cache!==1/0);return{prefetchResources:void 0,snapshotResult:l,flushes:s,manifest:p?.manifest,size:o,isStatic:!le,timing:{render:H,snapshot:Z,firstFlush:i}}}function Ve(){return Math.random().toString(36).slice(2)}function oe(e){const t=e?{...N,...e}:N;if(!t||"mapper"in t)return t;if(t.mapping){const n={};return Object.entries(t.mapping).forEach(([r,o])=>{n[R(r)]=[r,o]}),{mapper:n,manifest:t,injections:t.injections||[]}}}var Xe=e=>e.replace(/<(\/?script)/gi,"\\x3C$1");function Ke(e,t){for(const n of t){const r=n.$componentQrl$?.getSymbol();r&&!e.includes(r)&&e.push(r)}}var et='document["qFuncs_HASH"]=';function tt(e,t){return et.replace("HASH",e)+`[${t.join(`,
`)}]`}async function lt(e){const t=K({},oe(e));z(t)}const nt=()=>{const e=me(),t=pe();return w(Y,{children:[y("title",null,null,e.title,1,null),y("link",null,{rel:"canonical",href:he(n=>n.url.href,[t],"p0.url.href")},null,3,null),y("meta",null,{name:"viewport",content:"width=device-width, initial-scale=1.0"},null,3,null),y("link",null,{rel:"icon",type:"image/svg+xml",href:"/favicon.svg"},null,3,null),e.meta.map(n=>A("meta",{...n},null,0,n.key)),e.links.map(n=>A("link",{...n},null,0,n.key)),e.styles.map(n=>A("style",{...n.props,...n.props?.dangerouslySetInnerHTML?{}:{dangerouslySetInnerHTML:n.style}},null,0,n.key)),e.scripts.map(n=>A("script",{...n.props,...n.props?.dangerouslySetInnerHTML?{}:{dangerouslySetInnerHTML:n.script}},null,0,n.key))]},1,"uI_0")},rt=V(X(nt,"s_4y8vqMFEmDM")),st=()=>w(ve,{children:[y("head",null,null,[y("meta",null,{charSet:"utf-8"},null,3,null),y("link",null,{rel:"manifest",href:"/manifest.json"},null,3,null),y("script",null,{src:"https://unpkg.com/lucide@latest/dist/umd/lucide.js",defer:!0},null,3,null),w(rt,null,3,"eE_0"),w(be,null,3,"eE_1")],1,null),y("body",null,{lang:"en",class:"bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 text-gray-900 antialiased om-pattern"},w(ye,null,3,"eE_2"),1,null)]},1,"eE_3"),ot=V(X(st,"s_XRbIynRnZqg"));function ct(e){return ze(w(ot,null,3,"2l_0"),{manifest:N,...e,containerTagName:"html",containerAttributes:{lang:"en-us",...e.containerAttributes}})}export{N as m,ct as r,lt as s};
