'use strict';
(() => {
  const base = '/agricontract/';
  const networkFetch = window.fetch.bind(window);
  const worker = new Worker(base + 'browser-worker.js');
  const pending = new Map();
  let nextId = 1;
  worker.onmessage = ({data}) => {
    const entry = pending.get(data.id); if (!entry) return;
    pending.delete(data.id);
    data.error ? entry.reject(new Error(data.error)) : entry.resolve(data);
  };
  worker.onerror = error => {
    for (const entry of pending.values()) entry.reject(new Error(error.message));
    pending.clear();
  };
  function call(type, payload) {
    return new Promise((resolve, reject) => {
      const id = nextId++; pending.set(id, {resolve,reject}); worker.postMessage({id,type,payload});
    });
  }
  function encode(bytes) {
    let text=''; for(let i=0;i<bytes.length;i+=32768) text += String.fromCharCode(...bytes.subarray(i,i+32768));
    return btoa(text);
  }
  function decode(value) { return Uint8Array.from(atob(value), c=>c.charCodeAt(0)); }
  const database = new Promise((resolve,reject) => {
    const request = indexedDB.open('agricontract-browser-demo-v1',1);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  async function storage(mode,value) {
    const db = await database;
    return new Promise((resolve,reject) => {
      const transaction = db.transaction('state',mode);
      const store = transaction.objectStore('state');
      const request = mode==='readonly' ? store.get('current') : store.put(value,'current');
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }
  let serial = Promise.resolve();
  function serialize(task) {
    const result = serial.then(task); serial=result.catch(()=>{}); return result;
  }
  const ready = call('init');
  window.fetch = async (input, options={}) => {
    const path = new URL(typeof input==='string'?input:input.url,location.href);
    let apiPath = path.pathname;
    if(apiPath.startsWith(base)) apiPath='/' + apiPath.slice(base.length);
    if(path.origin!==location.origin || !apiPath.startsWith('/api/')) return networkFetch(input,options);
    const method = (options.method || (input instanceof Request && input.method) || 'GET').toUpperCase();
    let bytes = new Uint8Array();
    if(options.body instanceof Blob) bytes=new Uint8Array(await options.body.arrayBuffer());
    else if(options.body) bytes=new TextEncoder().encode(options.body);
    const task=async()=> {
      await ready;
      const state=await storage('readonly');
      const {result}=await call('request',{method,path:apiPath+path.search,body:encode(bytes),state});
      await storage('readwrite',result.state);
      return new Response(decode(result.response.body),{status:result.response.status,headers:{'Content-Type':result.response.mime}});
    };
    return serialize(()=>navigator.locks ? navigator.locks.request('agricontract-demo-state',task) : task());
  };
  window.agriBrowserReady = ready;
  async function start() {
    const banner=document.createElement('div');
    banner.id='browser-demo-note';
    banner.style.cssText='padding:9px 14px;background:#e7f3eb;color:#174632;font:13px/1.4 system-ui;text-align:center';
    banner.textContent='Browser demo · Fictional records saved on this device · No shared accounts between devices';
    const help=document.createElement('details');
    const summary=document.createElement('summary');summary.textContent='Demo logins';
    const instructions=document.createElement('div');
    instructions.textContent='processor / coopa / coopb · Password: demo1234 · Signing PIN: 1111 / 2222 / 3333';
    help.append(summary,instructions);banner.append(help);
    document.body.prepend(banner);
    const loading=document.createElement('div');
    loading.style.cssText='position:fixed;inset:0;background:#f5f3ec;z-index:9999;display:grid;place-content:center;text-align:center;padding:24px;font:18px/1.6 system-ui;color:#174632';
    loading.innerHTML='<h1>AgriContract</h1><p>Opening your demo…<br><small>The first visit downloads the app runtime. Please wait.</small></p>';
    document.body.append(loading);
    try {
      await ready; await database;
      for(const src of (document.body.dataset.demoScripts||'').split(',').filter(Boolean)) {
        await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=base+src;script.onload=resolve;script.onerror=reject;document.body.append(script);});
      }
      if(document.body.dataset.printKind) {
        const kind=document.body.dataset.printKind;
        loadData(kind).then(data=>document.querySelector('main').replaceChildren(kind==='contract'?contractCard(data):bankPack(data))).catch(fail);
      }
      loading.remove(); document.documentElement.dataset.demoReady='true';
    } catch(error) {
      console.error(error);
      loading.replaceChildren();
      const title=document.createElement('h1');title.textContent='The demo could not start';
      const detail=document.createElement('p');detail.textContent=String(error.message||error);
      const retry=document.createElement('button');retry.textContent='Try again';retry.onclick=()=>location.reload();
      const backup=document.createElement('a');backup.href=base+'demo.mp4';backup.textContent='Watch the recorded demo';
      loading.append(title,detail,retry,backup);
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
