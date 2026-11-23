const DB={_d:null,
open(){return this._d||(this._d=new Promise((ok,no)=>{const q=indexedDB.open('gallery',1);q.onupgradeneeded=()=>q.result.createObjectStore('kv');q.onsuccess=()=>ok(q.result);q.onerror=no}))},
async get(k){const d=await this.open();return new Promise(r=>{const q=d.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>r(q.result);q.onerror=()=>r()})},
async set(k,v){const d=await this.open();return new Promise(r=>{const t=d.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=r})}};
