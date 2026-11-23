(()=>{
const $=s=>document.querySelector(s);
const E=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e};
const IMG=/\.(jpe?g|png|gif|webp|bmp|avif|heic)$/i,VID=/\.(mp4|webm|mkv|mov|3gp)$/i;
const FS='showDirectoryPicker' in window;
let all=[],fb=[],dirs=[],trash={},tab='pictures',album=null,q='',cols=3,list=[],cur=0,inTrash=false,pending=0,bip=null;
const key=i=>i.folder+'/'+i.name+i.file.size;
const url=i=>i.url||(i.url=URL.createObjectURL(i.file));

async function walk(d,p,out){for await(const [n,h] of d.entries()){if(h.kind==='directory'){if(n[0]!=='.')await walk(h,n,out)}else if(IMG.test(n)||VID.test(n))out.push({name:n,folder:p,h,video:VID.test(n)})}}
async function scan(){
  dirs=await DB.get('dirs')||[];trash=await DB.get('trash')||{};pending=0;const out=[];
  for(const d of dirs){if(await d.queryPermission({mode:'read'})==='granted')await walk(d,d.name,out);else pending++}
  for(let k=0;k<out.length;k+=40)await Promise.all(out.slice(k,k+40).map(async i=>{i.file=await i.h.getFile();i.date=i.file.lastModified}));
  all=out.concat(fb);
  $('#gate').hidden=!!(all.length||dirs.length);$('#banner').hidden=!pending;render();
}
async function addFolder(){
  if(!FS)return $('#fin').click();
  try{const d=await showDirectoryPicker({mode:'read'});const ds=await DB.get('dirs')||[];ds.push(d);await DB.set('dirs',ds);await scan()}catch(e){}
}
$('#fin').onchange=e=>{for(const f of e.target.files)fb.push({file:f,name:f.name,folder:'Selected',date:f.lastModified,video:f.type.startsWith('video')});scan()};
$('#grant').onclick=$('#add').onclick=addFolder;
$('#regrant').onclick=async()=>{for(const d of dirs)await d.requestPermission({mode:'read'});scan()};

const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){const t=e.target;t.src=url(t.__i)+(t.__i.video?'#t=0.1':'');io.unobserve(t)}}),{rootMargin:'300px'});
function cell(i,k){const c=E('div','c');const t=E(i.video?'video':'img');t.__i=i;if(i.video){t.muted=true;t.preload='metadata';c.append(t,E('span','pl','▶'))}else{t.decoding='async';c.append(t)}io.observe(t);c.onclick=()=>openViewer(k);return c}
function grid(el,arr){
  list=arr;if(!arr.length)return el.append(E('div','empty',inTrash?'Trash khali hai':'Yahan kuch nahi mila. ＋ dabakar folder add karo.'));
  let g,last='';arr.forEach((i,k)=>{const d=new Date(i.date).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
    if(d!==last){last=d;el.append(E('div','day',d));g=E('div','grid');el.append(g)}g.append(cell(i,k))});
}
function render(){
  const m=$('#main');m.innerHTML='';m.style.setProperty('--cols',cols);
  const vis=all.filter(i=>!!trash[key(i)]===inTrash).sort((a,b)=>b.date-a.date);
  $('#sbar').hidden=!(tab==='search'&&!inTrash);
  $('#back').hidden=!(album||inTrash);
  $('#title').textContent=inTrash?'Trash':album||{pictures:'Pictures',albums:'Albums',search:'Search'}[tab];
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab&&!inTrash));
  if(inTrash||tab==='pictures')return grid(m,vis);
  if(tab==='albums'&&!album){
    const f={};vis.forEach(i=>(f[i.folder]=f[i.folder]||[]).push(i));
    const w=E('div','albums');Object.keys(f).sort().forEach(n=>{const b=E('button','al');const c=cell(f[n][0],0);c.onclick=null;b.append(c,E('b','',n),E('small','',f[n].length+' items'));b.onclick=()=>{album=n;render()};w.append(b)});
    m.append(w);if(!w.children.length)grid(m,[]);return;
  }
  if(tab==='albums')return grid(m,vis.filter(i=>i.folder===album));
  const s=q.trim().toLowerCase();
  grid(m,s?vis.filter(i=>(i.name+' '+i.folder+' '+new Date(i.date).toDateString()+(i.video?' video':' photo')).toLowerCase().includes(s)):[]);
}
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;album=null;inTrash=false;render()});
$('#back').onclick=()=>{album=null;inTrash=false;render()};
$('#trashBtn').onclick=()=>{inTrash=true;album=null;render()};
$('#sbar').oninput=e=>{q=e.target.value;render()};

// pinch to change grid size
let pd=0;const dist=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
$('#main').addEventListener('touchstart',e=>{if(e.touches.length===2)pd=dist(e.touches)},{passive:true});
$('#main').addEventListener('touchmove',e=>{if(e.touches.length!==2||!pd)return;const r=dist(e.touches)/pd;
  if(r>1.3&&cols>1){cols--;pd=dist(e.touches)}else if(r<.75&&cols<6){cols++;pd=dist(e.touches)}else return;
  document.querySelectorAll('.grid').forEach(g=>g.style.setProperty('--cols',cols))},{passive:true});
document.addEventListener('touchend',()=>pd=0);

// viewer
function show(){
  const i=list[cur];if(!i)return closeV();
  const b=$('#vbody');b.innerHTML='';const m=E(i.video?'video':'img');m.src=url(i);if(i.video){m.controls=true;m.autoplay=true;m.playsInline=true}b.append(m);
  $('#vname').textContent=i.name;$('#vtrash').innerHTML=inTrash?'↺<small>Restore</small>':'🗑<small>Trash</small>';$('#vedit').hidden=i.video;
}
function openViewer(k){cur=k;$('#viewer').hidden=false;show()}
function closeV(){$('#viewer').hidden=true;$('#vbody').innerHTML=''}
$('#vclose').onclick=closeV;
let sx=null;$('#vbody').addEventListener('touchstart',e=>sx=e.touches.length===1?e.touches[0].clientX:null,{passive:true});
$('#vbody').addEventListener('touchend',e=>{if(sx==null)return;const dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>70){cur=Math.max(0,Math.min(list.length-1,cur+(dx<0?1:-1)));show()}});
$('#vshare').onclick=async()=>{const f=list[cur].file;try{await navigator.share({files:[f]})}catch(e){const a=E('a');a.href=url(list[cur]);a.download=f.name;a.click()}};
$('#vinfo').onclick=()=>{const i=list[cur];alert(`${i.name}\nFolder: ${i.folder}\nSize: ${(i.file.size/1048576).toFixed(2)} MB\nDate: ${new Date(i.date).toLocaleString()}`)};
$('#vtrash').onclick=async()=>{const k=key(list[cur]);inTrash?delete trash[k]:trash[k]=Date.now();await DB.set('trash',trash);closeV();render()};

// editor
const P={Normal:'',"B&W":'grayscale(1)',Sepia:'sepia(.8)',Vivid:'saturate(1.6) contrast(1.1)',Warm:'sepia(.3) saturate(1.3)',Cool:'hue-rotate(15deg) saturate(1.1)'};
let eimg=null,pf='';const cv=$('#cv'),cx=cv.getContext('2d');
function draw(){cx.filter=`brightness(${$('#eb').value}%) contrast(${$('#ec').value}%) saturate(${$('#es').value}%) ${pf}`;cx.clearRect(0,0,cv.width,cv.height);cx.drawImage(eimg,0,0,cv.width,cv.height)}
$('#presets').append(...Object.keys(P).map(n=>{const b=E('button','',n);b.onclick=()=>{pf=P[n];document.querySelectorAll('#presets button').forEach(x=>x.classList.toggle('on',x===b));draw()};return b}));
$('#vedit').onclick=()=>{const i=new Image();i.onload=()=>{eimg=i;const s=Math.min(1,2048/Math.max(i.width,i.height));cv.width=i.width*s;cv.height=i.height*s;pf='';$('#eb').value=$('#ec').value=$('#es').value=100;$('#editor').hidden=false;draw()};i.src=url(list[cur])};
['#eb','#ec','#es'].forEach(x=>$(x).oninput=draw);
$('#eclose').onclick=()=>$('#editor').hidden=true;
$('#esave').onclick=()=>cv.toBlob(b=>{const a=E('a');a.href=URL.createObjectURL(b);a.download='edited_'+list[cur].name.replace(/\.\w+$/,'')+'.jpg';a.click();$('#editor').hidden=true},'image/jpeg',.92);

// install + service worker
addEventListener('beforeinstallprompt',e=>{e.preventDefault();bip=e;$('#install').hidden=false});
$('#install').onclick=()=>bip&&bip.prompt();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
if(!FS)$('#gate p').textContent+=' (Is browser mein folder picker nahi hai, isliye photos manually select karni hongi.)';
scan();
})();
