/* ============================================================
   KESSLER REACH — 3D open world (Three.js)
   Authored continuous landmass: walkable region discs joined by
   valley corridors, mountain ridges everywhere else, gates in the
   corridors. Click-to-move, orbit camera, world interactables.
   ============================================================ */
'use strict';

var KRWorld = (function(){
const D = KR_DATA;
const W = D.WORLD;
let api = null;

/* ---------------- math helpers ---------------- */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const sstep=t=>{ t=clamp(t,0,1); return t*t*(3-2*t); };
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
// deterministic value noise
function hash2(x,y){ let h=Math.sin(x*127.1+y*311.7)*43758.5453; return h-Math.floor(h); }
function vnoise(x,y){
  const xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi;
  const a=hash2(xi,yi), b=hash2(xi+1,yi), c=hash2(xi,yi+1), d=hash2(xi+1,yi+1);
  const u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);
  return lerp(lerp(a,b,u), lerp(c,d,u), v)*2-1;
}
function fbm(x,y){ return vnoise(x,y)*0.65 + vnoise(x*2.13+5.2,y*2.13+1.3)*0.35; }
function distSeg(px,pz, ax,az, bx,bz){
  const dx=bx-ax, dz=bz-az, l2=dx*dx+dz*dz;
  let t = l2 ? ((px-ax)*dx+(pz-az)*dz)/l2 : 0; t=clamp(t,0,1);
  const qx=ax+dx*t, qz=az+dz*t;
  return Math.hypot(px-qx, pz-qz);
}

/* ---------------- region layout ---------------- */
const REGIONS = W.regions.map(r=>Object.assign({}, r));
const regionByZone = {}; REGIONS.forEach(r=>regionByZone[r.zone]=r);
const CORRIDORS = W.corridors.map(c=>{
  const a=regionByZone[c.a], b=regionByZone[c.b];
  return {ax:a.x, az:a.z, bx:b.x, bz:b.z, w:c.w, gate:c.gate, a:c.a, b:c.b};
});

function walkField(x,z){
  let m=0;
  for(const r of REGIONS) m=Math.max(m, sstep((r.r-Math.hypot(x-r.x,z-r.z))/16));
  for(const c of CORRIDORS) m=Math.max(m, sstep((c.w-distSeg(x,z,c.ax,c.az,c.bx,c.bz))/8));
  return m;
}
function regionWeight(r,x,z){ return sstep((r.r-Math.hypot(x-r.x,z-r.z))/16); }
function waterDepth(x,z){
  let d=0;
  for(const wd of W.water) d=Math.max(d, sstep((wd.r-Math.hypot(x-wd.x,z-wd.z))/9));
  return d;
}
function heightAt(x,z){
  const wk = walkField(x,z);
  const ridge = 13 + fbm(x*0.03+7, z*0.03)*6;
  let valley = Math.max(-0.35, fbm(x*0.06, z*0.06)*1.5);
  const hv = regionWeight(regionByZone.haven, x, z);
  valley = lerp(valley, 1.1, hv);                       // station plateau
  const kv = regionWeight(regionByZone.kelvin, x, z);
  valley += kv * (0.9 + Math.max(0, fbm(x*0.1+3, z*0.1))*1.4);   // snowy bumps
  let h = lerp(ridge, valley, sstep(wk));
  h -= waterDepth(x,z)*3.4;                              // carved pools / sea
  return h;
}
const WATER_Y = -0.55;
function regionAt(x,z){
  let best=null, bd=Infinity;
  for(const r of REGIONS){ const d=Math.hypot(x-r.x,z-r.z)-r.r; if(d<bd){bd=d; best=r;} }
  return best ? best.zone : 'meridian';
}

/* ---------------- scene state ---------------- */
let scene, camera, renderer, canvas, terrainMesh;
let viewportEl, labelRoot, hintEl;
const cam = {yaw:2.4, pitch:0.72, dist:19};
const ents = [];          // all interactable entities
const entByUid = {};
const obstacles = [];     // {x,z,r}
const projectiles = [];   // {mesh,from,to,t,dur}
const splats = [];        // {el, follow, dy, age, life}
const nameplates = {};    // uid -> {el, hpEl, nameEl}
let player = null;        // {group, parts, x, z, tgt:{x,z}|null, pending:uid|null, moving, working, anim, lungeT,...}
let clickMarker = null;
let progressEl = null;
let curRegion = null, regionPollT = 0, gatePollT = 0, gearPollT = 0;
const keys = {};
let pickables = [];       // meshes for raycast
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let hoverEnt = null;
let prevT = 0;

/* ---------------- low-res textures (the N64 feel) ---------------- */
const TEX = {};
function makeTex(size, painter, repeat){
  const c = document.createElement('canvas'); c.width=c.height=size;
  painter(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if(repeat) t.repeat.set(repeat, repeat);
  return t;
}
function buildTextures(){
  // grayscale maps so vertex colors / material tints shade them
  TEX.ground = makeTex(64,(g,s)=>{
    g.fillStyle='#969696'; g.fillRect(0,0,s,s);
    for(let i=0;i<500;i++){ const v=120+Math.floor(Math.random()*120);
      g.fillStyle=`rgb(${v},${v},${v})`; g.fillRect(Math.random()*s|0, Math.random()*s|0, 2, 2); }
    for(let i=0;i<26;i++){ const v=80+Math.random()*60|0; g.fillStyle=`rgba(${v},${v},${v},0.5)`;
      g.beginPath(); g.arc(Math.random()*s, Math.random()*s, 2+Math.random()*5, 0, 7); g.fill(); }
  }, 110);
  TEX.hull = makeTex(64,(g,s)=>{
    g.fillStyle='#a0a0a0'; g.fillRect(0,0,s,s);
    g.strokeStyle='#787878'; g.lineWidth=2;
    for(let i=0;i<3;i++) g.strokeRect(i*21+1, 1, 20, s-2);
    g.fillStyle='#6a6a6a';
    for(let i=0;i<16;i++) g.fillRect(3+Math.random()*(s-6)|0, 3+Math.random()*(s-6)|0, 2, 2);
    g.fillStyle='#bcbcbc'; g.fillRect(0, 12, s, 3); g.fillRect(0, 44, s, 2);
  });
  TEX.rock = makeTex(64,(g,s)=>{
    g.fillStyle='#8e8e8e'; g.fillRect(0,0,s,s);
    for(let i=0;i<70;i++){ const v=100+Math.random()*110|0; g.fillStyle=`rgb(${v},${v},${v})`;
      g.beginPath(); g.arc(Math.random()*s, Math.random()*s, 1+Math.random()*4, 0, 7); g.fill(); }
    g.strokeStyle='#6c6c6c'; g.lineWidth=1;
    for(let i=0;i<6;i++){ g.beginPath(); g.moveTo(Math.random()*s, 0); g.lineTo(Math.random()*s, s); g.stroke(); }
  });
  TEX.plank = makeTex(64,(g,s)=>{
    g.fillStyle='#9a9a9a'; g.fillRect(0,0,s,s);
    g.strokeStyle='#747474'; g.lineWidth=2;
    for(let i=0;i<5;i++){ g.beginPath(); g.moveTo(0, i*13+4); g.lineTo(s, i*13+4+(Math.random()*3|0)); g.stroke(); }
    g.fillStyle='#7e7e7e'; for(let i=0;i<20;i++) g.fillRect(Math.random()*s|0, Math.random()*s|0, 3, 1);
  });
  TEX.water = makeTex(64,(g,s)=>{
    g.fillStyle='#a8c8c8'; g.fillRect(0,0,s,s);
    g.strokeStyle='#c8e8e8'; g.lineWidth=2;
    for(let i=0;i<6;i++){ g.beginPath();
      for(let x=0;x<=s;x+=8){ const y=i*11+Math.sin((x/s)*6.28+i)*3; x===0?g.moveTo(x,y):g.lineTo(x,y); }
      g.stroke(); }
  }, 70);
}

/* ---------------- materials / builders ---------------- */
function mat(color, opts){ return new THREE.MeshLambertMaterial(Object.assign({color}, opts||{})); }
function box(w,h,d, color, opts){ return new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat(color, opts)); }
function texBox(w,h,d, color, tex, opts){ return new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat(color, Object.assign({map:tex}, opts||{}))); }
function emojiSprite(char, size){
  const c = document.createElement('canvas'); c.width=c.height=64;
  const g = c.getContext('2d'); g.font='48px serif'; g.textAlign='center'; g.textBaseline='middle';
  g.fillText(char, 32, 36);
  const tex = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, transparent:true, depthWrite:false}));
  s.scale.setScalar(size||1.8);
  return s;
}
function hitProxy(r, h){
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 8),
    new THREE.MeshBasicMaterial({transparent:true, opacity:0, depthWrite:false}));
  m.position.y = h/2;
  return m;
}
function blobShadow(r){
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 16),
    new THREE.MeshBasicMaterial({color:0x000000, transparent:true, opacity:0.28, depthWrite:false}));
  m.rotation.x = -Math.PI/2;
  return m;
}

/* ---------------- player & humanoids ---------------- */
function makeHumanoid(suit, visor){
  const g = new THREE.Group();
  const torso = box(0.55,0.62,0.32, suit); torso.position.y=1.06; g.add(torso);
  const chest = box(0.42,0.2,0.06, visor, {emissive:visor, emissiveIntensity:0.35}); chest.position.set(0,1.18,0.18); g.add(chest);
  const pack = box(0.4,0.45,0.18, 0x3a4048); pack.position.set(0,1.08,-0.26); g.add(pack);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.015,0.5,4), mat(0x6a7488)); antenna.position.set(-0.14,1.5,-0.3); g.add(antenna);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.045,6,6), mat(visor,{emissive:visor, emissiveIntensity:1})); tip.position.set(-0.14,1.76,-0.3); g.add(tip);
  const head = box(0.34,0.3,0.3, 0xc9b9a0); head.position.y=1.58; g.add(head);
  const vis = box(0.3,0.1,0.06, visor, {emissive:visor, emissiveIntensity:0.9}); vis.position.set(0,1.6,0.16); g.add(vis);
  const parts = {arms:[], legs:[], torso, head};
  [[-0.37,1],[0.37,1]].forEach(([sx])=>{
    const p=new THREE.Group(); p.position.set(sx,1.32,0);
    const pad=box(0.2,0.14,0.2, suit); pad.position.y=0.04; p.add(pad);
    const a=box(0.14,0.5,0.14, suit); a.position.y=-0.25; p.add(a); g.add(p); parts.arms.push(p);
  });
  [[-0.16],[0.16]].forEach(([sx])=>{
    const p=new THREE.Group(); p.position.set(sx,0.76,0);
    const l=box(0.16,0.56,0.16, 0x2c3440); l.position.y=-0.28; p.add(l); g.add(p); parts.legs.push(p);
  });
  const weapon = box(0.1,0.5,0.1, 0x888888, {emissive:0x222222}); weapon.position.set(0,-0.45,0.12); weapon.visible=false;
  parts.arms[1].add(weapon); parts.weapon = weapon;
  g.add(blobShadow(0.55));
  return {group:g, parts};
}

/* ---------------- enemy bodies ---------------- */
const ENEMY_LOOKS = {
  scrap_hound:{shape:'quad', color:0x96603c}, rustback_scavver:{shape:'quad', color:0x8a7a52},
  feral_loader:{shape:'bot', color:0xb08c3c}, glasswing_swarm:{shape:'fly', color:0x9fe8ff},
  sporeback_strider:{shape:'quad', color:0x6aa05a}, verdant_stalker:{shape:'quad', color:0x3a7a4a},
  brine_lurker:{shape:'orb', color:0x5a8a9a}, tidal_husk:{shape:'biped', color:0x7a8a8a},
  cryo_wraith:{shape:'fly', color:0xbfe8ff}, borehole_horror:{shape:'orb', color:0x6a4a7a},
  vault_sentinel:{shape:'bot', color:0xaab4c8}, hollow_custodian:{shape:'bot', color:0x8a86a8},
  warden_7:{shape:'warden', color:0x8a2a3a},
};
function makeEnemyBody(eid, lvl){
  const look = ENEMY_LOOKS[eid] || {shape:'orb', color:0x999999};
  const s = 0.8 + lvl*0.011;
  const g = new THREE.Group();
  const c = look.color;
  if(look.shape==='quad'){
    const body=new THREE.Mesh(new THREE.SphereGeometry(0.5,10,8), mat(c)); body.scale.set(1.3,0.8,0.9); body.position.y=0.62; g.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(0.28,8,8), mat(c)); head.position.set(0,0.78,0.62); g.add(head);
    for(const [lx,lz] of [[-0.3,0.3],[0.3,0.3],[-0.3,-0.34],[0.3,-0.34]]){
      const leg=box(0.12,0.55,0.12, 0x2c3038); leg.position.set(lx,0.28,lz); g.add(leg);
    }
  }else if(look.shape==='bot'){
    const body=box(0.8,1,0.6, c); body.position.y=0.95; g.add(body);
    const head=box(0.46,0.36,0.46, c); head.position.y=1.66; g.add(head);
    const eye=box(0.3,0.08,0.05, 0xff6a5a, {emissive:0xff3a2a, emissiveIntensity:1}); eye.position.set(0,1.68,0.25); g.add(eye);
    [[-0.22],[0.22]].forEach(([lx])=>{ const leg=box(0.18,0.5,0.18, 0x2c3038); leg.position.set(lx,0.25,0); g.add(leg); });
  }else if(look.shape==='fly'){
    const body=new THREE.Mesh(new THREE.OctahedronGeometry(0.55), mat(c,{emissive:c, emissiveIntensity:0.35, transparent:true, opacity:0.9}));
    body.position.y=1.3; g.add(body); g.userData.hover=true;
  }else if(look.shape==='biped'){
    const body=box(0.6,1.1,0.4, c); body.position.y=1.0; g.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(0.24,8,8), mat(c)); head.position.y=1.78; g.add(head);
    [[-0.18],[0.18]].forEach(([lx])=>{ const leg=box(0.16,0.5,0.16, 0x2c3038); leg.position.set(lx,0.25,0); g.add(leg); });
  }else if(look.shape==='warden'){
    const core=new THREE.Mesh(new THREE.SphereGeometry(0.95,14,12), mat(0x3a3242)); core.position.y=1.7; g.add(core);
    const eye=new THREE.Mesh(new THREE.SphereGeometry(0.34,10,8), mat(0xff2a3a,{emissive:0xff2a3a, emissiveIntensity:1.2})); eye.position.set(0,1.7,0.75); g.add(eye);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1.35,0.08,8,28), mat(0x8a86a8,{emissive:0x4a4668, emissiveIntensity:0.5}));
    ring.position.y=1.7; ring.rotation.x=Math.PI/2.4; g.add(ring); g.userData.hover=true; g.userData.ring=ring;
  }else{ // orb
    const body=new THREE.Mesh(new THREE.SphereGeometry(0.6,10,8), mat(c)); body.position.y=0.7; g.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,8,8), mat(c)); head.position.set(0,1.05,0.5); g.add(head);
  }
  g.scale.setScalar(s);
  g.add(blobShadow(0.7));
  return g;
}

/* ---------------- node bodies ---------------- */
const ORE_COLORS = {ex_ferrox:0x8a4a3a, ex_cryotite:0x9ad4e8, ex_vantium:0x5a6aa8, ex_aurium:0xd4aa4a, ex_obsidite:0x2a2a34, ex_neutronite:0x7ae8d8};
const FLORA_COLORS = {xb_moss:0x6ae8a8, xb_spirefruit:0xa8e86a, xb_resin:0x8ad4c8, xb_duskpetal:0x9a6ab8, xb_pyrelace:0xe88a5a, xb_voidlotus:0xd8c8f8};
function makeNodeBody(a, water){
  const g = new THREE.Group();
  const skill = a.skill;
  if(water){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1.5,0.1,8,24), mat(0x6ae8e8,{emissive:0x2a8a8a, emissiveIntensity:0.8, transparent:true, opacity:0.85}));
    ring.rotation.x=-Math.PI/2; ring.position.y=0.06; g.add(ring); g.userData.ripple=ring;
  }else if(skill==='salvaging'){
    [[0,0.3,0,1.4,0.6,1.1,0],[0.5,0.75,0.3,0.9,0.4,0.7,0.4],[-0.55,0.6,-0.2,0.8,0.5,0.6,-0.3]].forEach(p=>{
      const b=box(p[3],p[4],p[5], 0x7a5640); b.position.set(p[0],p[1],p[2]); b.rotation.y=p[6]; g.add(b);
    });
  }else if(skill==='extraction'){
    const rock=new THREE.Mesh(new THREE.IcosahedronGeometry(1.05,0), mat(ORE_COLORS[a.id]||0x888888));
    rock.position.y=0.7; rock.rotation.set(0.3,0.6,0.1); g.add(rock);
    const base=new THREE.Mesh(new THREE.IcosahedronGeometry(0.7,0), mat(0x4a4640)); base.position.set(0.8,0.4,0.3); g.add(base);
  }else if(skill==='xenobotany'){
    const c = FLORA_COLORS[a.id]||0x6ae8a8;
    for(const [px,pz,h] of [[0,0,1.2],[0.5,0.3,0.8],[-0.4,0.35,0.9]]){
      const cone=new THREE.Mesh(new THREE.ConeGeometry(0.3,h,6), mat(c,{emissive:c, emissiveIntensity:0.25}));
      cone.position.set(px,h/2,pz); g.add(cone);
    }
  }else if(skill==='hacking'){
    const kiosk=box(0.8,1.5,0.5, 0x3a4252); kiosk.position.y=0.75; g.add(kiosk);
    const scr=box(0.6,0.5,0.06, 0x2ae8c8, {emissive:0x18a890, emissiveIntensity:1}); scr.position.set(0,1.1,0.27); scr.rotation.x=-0.2; g.add(scr);
  }
  const icon = emojiSprite(a.icon, 1.6); icon.position.y = water?1.4:2.4; g.add(icon); g.userData.icon=icon;
  return g;
}
const FACILITY_EMOJI = {fabricator:'🏭', galley:'🍜', chemlab:'🧪', bench:'⚙'};
function makeFacilityBody(f){
  const g = new THREE.Group();
  if(f==='fabricator'){
    const b=box(2,1.7,1.6, 0x55504a); b.position.y=0.85; g.add(b);
    const glow=box(1.2,0.6,0.06, 0xff8c3a, {emissive:0xc05a18, emissiveIntensity:1}); glow.position.set(0,0.8,0.84); g.add(glow);
    const stack=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.22,1.4,8), mat(0x3a3632)); stack.position.set(0.7,2.2,0); g.add(stack);
  }else if(f==='galley'){
    const b=new THREE.Mesh(new THREE.CylinderGeometry(0.9,1.1,0.9,10), mat(0x5a4a3a)); b.position.y=0.45; g.add(b);
    const fire=new THREE.Mesh(new THREE.ConeGeometry(0.4,0.7,8), mat(0xffaa3a,{emissive:0xff7a1a, emissiveIntensity:1.3})); fire.position.y=1.2; g.add(fire); g.userData.fire=fire;
  }else if(f==='chemlab'){
    const b=new THREE.Mesh(new THREE.CylinderGeometry(0.7,0.7,1.7,10), mat(0x6ad4c8,{transparent:true, opacity:0.7, emissive:0x1a6a60, emissiveIntensity:0.5}));
    b.position.y=0.85; g.add(b);
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.8,0.8,0.2,10), mat(0x3a4252)); cap.position.y=1.8; g.add(cap);
  }else{ // bench
    const top=box(1.7,0.14,0.9, 0x6a5a44); top.position.y=0.85; g.add(top);
    [[-0.7,-0.3],[0.7,-0.3],[-0.7,0.3],[0.7,0.3]].forEach(([lx,lz])=>{ const leg=box(0.12,0.85,0.12, 0x3a3632); leg.position.set(lx,0.42,lz); g.add(leg); });
    const tool=box(0.4,0.25,0.3, 0x8aa4c8, {emissive:0x2a4468, emissiveIntensity:0.6}); tool.position.set(0.3,1.05,0); g.add(tool);
  }
  const icon = emojiSprite(FACILITY_EMOJI[f]||'⚙', 1.7); icon.position.y=3; g.add(icon);
  return g;
}
function makeGateBody(){
  const g = new THREE.Group();
  [[-5],[5]].forEach(([px])=>{
    const py=new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.6,5,8), mat(0x3a4252,{emissive:0x16202c, emissiveIntensity:0.4}));
    py.position.set(px,2.5,0); g.add(py);
    const tip=new THREE.Mesh(new THREE.SphereGeometry(0.5,8,8), mat(0xff5d6c,{emissive:0xff2a3a, emissiveIntensity:1})); tip.position.set(px,5.2,0); g.add(tip); (g.userData.tips=g.userData.tips||[]).push(tip);
  });
  const barrier=new THREE.Mesh(new THREE.PlaneGeometry(10,4.6),
    new THREE.MeshBasicMaterial({color:0xff4a5a, transparent:true, opacity:0.22, side:THREE.DoubleSide, depthWrite:false}));
  barrier.position.y=2.3; g.add(barrier); g.userData.barrier=barrier;
  return g;
}

/* ---------------- terrain & environment ---------------- */
function buildTerrain(){
  const SIZE=540, SEG=190;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI/2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count*3);
  const col = new THREE.Color(), tmp = new THREE.Color();
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i), z=pos.getZ(i);
    const h=heightAt(x,z);
    pos.setY(i,h);
    // base: blend region colors by weight
    col.set(0x2c3440); // ridge slate
    let acc=0;
    for(const r of REGIONS){
      const w=regionWeight(r,x,z);
      if(w>0){ tmp.set(r.color); col.lerp(tmp, w*(1-acc)); acc=Math.min(1,acc+w); }
    }
    const wk=sstep(walkField(x,z));
    tmp.set(0x232b38); col.lerp(tmp, (1-wk)*0.8);          // mountains dark
    if(h>9){ tmp.set(0x9aa8b8); col.lerp(tmp, clamp((h-9)/8,0,0.7)); } // high rock frost
    const wd=waterDepth(x,z);
    if(wd>0.05 && h>WATER_Y-0.1){ tmp.set(0x8a7a5c); col.lerp(tmp, clamp(wd*1.6,0,0.8)); } // shores
    if(h<WATER_Y){ tmp.set(0x10242c); col.lerp(tmp, 0.75); }   // underwater
    const n=(fbm(x*0.3,z*0.3)+1)/2;
    col.multiplyScalar(0.92+n*0.16);
    colors[i*3]=col.r; colors[i*3+1]=col.g; colors[i*3+2]=col.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors,3));
  geo.computeVertexNormals();
  terrainMesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({vertexColors:true, map:TEX.ground}));
  scene.add(terrainMesh);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(SIZE,SIZE),
    new THREE.MeshLambertMaterial({color:0x1a6a78, transparent:true, opacity:0.8, emissive:0x0a2a32, map:TEX.water}));
  water.rotation.x=-Math.PI/2; water.position.y=WATER_Y; scene.add(water);
}
function buildSky(){
  scene.background = new THREE.Color(0x070a14);
  scene.fog = new THREE.Fog(0x0a0e1a, 90, 300);
  // stars
  const n=1100, sp=new Float32Array(n*3), rng=mulberry32(7);
  for(let i=0;i<n;i++){
    const t=rng()*Math.PI*2, p=Math.acos(rng()*0.9);
    const r=850;
    sp[i*3]=Math.sin(p)*Math.cos(t)*r; sp[i*3+1]=Math.cos(p)*r*0.9+60; sp[i*3+2]=Math.sin(p)*Math.sin(t)*r;
  }
  const sg=new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp,3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({color:0xcfe0f2, size:1.7, sizeAttenuation:false, fog:false})));
  // the shattered moon
  const moon=new THREE.Mesh(new THREE.SphereGeometry(52,20,16), new THREE.MeshBasicMaterial({color:0x8a93a8, fog:false}));
  moon.position.set(420,300,-560); scene.add(moon);
  const dark=new THREE.Mesh(new THREE.SphereGeometry(52.5,20,16), new THREE.MeshBasicMaterial({color:0x10141f, fog:false}));
  dark.position.copy(moon.position); dark.position.x-=14; dark.position.y+=6; scene.add(dark);
  [[60,-20,18],[78,8,12],[52,30,9]].forEach(([ox,oy,r])=>{
    const ch=new THREE.Mesh(new THREE.IcosahedronGeometry(r,0), new THREE.MeshBasicMaterial({color:0x6a7388, fog:false}));
    ch.position.set(moon.position.x+ox, moon.position.y+oy, moon.position.z+10); scene.add(ch);
  });
  // debris ring (the Shatter)
  const ring=new THREE.Group(); const rng2=mulberry32(13);
  const dgeo=new THREE.BoxGeometry(4,1.5,2.5), dmat=new THREE.MeshBasicMaterial({color:0x39435a, fog:false});
  for(let i=0;i<240;i++){
    const m=new THREE.Mesh(dgeo,dmat);
    const a=rng2()*Math.PI*2, r=560+rng2()*240;
    m.position.set(Math.cos(a)*r, 240+Math.sin(a*3)*46, Math.sin(a)*r);
    m.rotation.set(rng2()*3, rng2()*3, rng2()*3);
    const s=0.5+rng2()*2.4; m.scale.setScalar(s);
    ring.add(m);
  }
  ring.rotation.z=0.16; scene.add(ring);
  scene.userData.ring=ring;
  // lights
  scene.add(new THREE.HemisphereLight(0x9fd8e8, 0x4a3a30, 0.85));
  const sun=new THREE.DirectionalLight(0xfff2dd, 0.85); sun.position.set(120,180,-80); scene.add(sun);
}
function scatterDecor(){
  const rng = mulberry32(42);
  function place(r, fn, count, minD){
    for(let i=0;i<count;i++){
      for(let tries=0;tries<14;tries++){
        const a=rng()*Math.PI*2, d=Math.sqrt(rng())*(r.r-6);
        const x=r.x+Math.cos(a)*d, z=r.z+Math.sin(a)*d;
        if(walkField(x,z)<0.6 || waterDepth(x,z)>0.1) continue;
        let near=false;
        for(const e of ents) if(Math.hypot(e.x-x,e.z-z)<5){ near=true; break; }
        if(near) continue;
        const g=fn(rng); g.position.set(x, heightAt(x,z), z); g.rotation.y=rng()*Math.PI*2;
        scene.add(g);
        if(minD) obstacles.push({x,z,r:minD});
        break;
      }
    }
  }
  const rock=rng=>{ const s=0.5+rng()*1.3; const m=new THREE.Mesh(new THREE.IcosahedronGeometry(s,0), mat(0x4a4e58)); m.position.y=s*0.5; const g=new THREE.Group(); g.add(m); return g; };
  const tree=rng=>{
    const g=new THREE.Group(); const h=3+rng()*3.4;
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.2,h*0.45,6), mat(0x6a7a72)); trunk.position.y=h*0.22; g.add(trunk);
    const crown=new THREE.Mesh(new THREE.ConeGeometry(0.9+rng()*0.7, h*0.8, 6),
      mat(0x7fd8c8,{transparent:true, opacity:0.72, emissive:0x1a5a50, emissiveIntensity:0.35}));
    crown.position.y=h*0.45+h*0.35; g.add(crown); return g;
  };
  const wreck=rng=>{
    const g=new THREE.Group();
    for(let i=0;i<2+Math.floor(rng()*2);i++){
      const b=box(0.8+rng()*2.4, 0.4+rng()*1.4, 0.6+rng()*1.6, rng()<0.5?0x6a4a36:0x5a5248);
      b.position.set((rng()-0.5)*2.4, 0.3+rng()*0.7, (rng()-0.5)*2.4); b.rotation.set(rng()*0.5, rng()*3, rng()*0.4); g.add(b);
    }
    return g;
  };
  const spike=rng=>{ const g=new THREE.Group(); const h=1.6+rng()*3;
    const m=new THREE.Mesh(new THREE.ConeGeometry(0.5+rng()*0.5,h,5), mat(0xd8ecf4,{transparent:true, opacity:0.92})); m.position.y=h/2; g.add(m); return g; };
  const pillar=rng=>{ const g=new THREE.Group(); const h=2.5+rng()*4;
    const m=box(0.9,h,0.9, 0x4e4660,{emissive:0x241e34, emissiveIntensity:0.4}); m.position.y=h/2; m.rotation.y=rng(); g.add(m);
    if(rng()<0.4){ const top=box(1.3,0.3,1.3, 0x5a526c); top.position.y=h+0.15; g.add(top); }
    return g; };
  const ashrock=rng=>{ const s=0.5+rng()*1.1; const m=new THREE.Mesh(new THREE.IcosahedronGeometry(s,0), mat(0x2e3238)); m.position.y=s*0.45; const g=new THREE.Group(); g.add(m); return g; };
  place(regionByZone.glasswood, tree, 64, 0.7);
  place(regionByZone.meridian, tree, 8, 0.7);
  place(regionByZone.meridian, rock, 8, 0.8);
  place(regionByZone.rustflats, wreck, 22, 1.3);
  place(regionByZone.rustflats, rock, 8, 0.8);
  place(regionByZone.kelvin, spike, 24, 0.7);
  place(regionByZone.kelvin, rock, 6, 0.8);
  place(regionByZone.undervault, pillar, 16, 0.8);
  place(regionByZone.cinder, ashrock, 16, 0.8);
  place(regionByZone.haven, rock, 4, 0.8);
  // the Meridian wreck at camp
  const mr=regionByZone.meridian;
  const hull=new THREE.Group();
  const main=new THREE.Mesh(new THREE.CylinderGeometry(3.4,3.4,16,12,1,false), mat(0x5a4638,{map:TEX.hull}));
  main.rotation.z=Math.PI/2; main.rotation.y=0.4; main.position.y=2.2; hull.add(main);
  const fin=texBox(0.5,5,3.4, 0x4a3a30, TEX.hull); fin.position.set(-5,4,1); fin.rotation.z=0.5; hull.add(fin);
  const glow=box(6,0.4,0.3, 0x3fe0c8, {emissive:0x1a8a78, emissiveIntensity:0.9}); glow.position.set(2,3.4,2.9); glow.rotation.y=0.4; hull.add(glow);
  hull.position.set(mr.x-20, heightAt(mr.x-20, mr.z-2), mr.z-2);
  scene.add(hull);
  obstacles.push({x:mr.x-20, z:mr.z-2, r:8});
  // Haven station dome + towers
  const hv=regionByZone.haven;
  const dome=new THREE.Mesh(new THREE.SphereGeometry(9,18,12,0,Math.PI*2,0,Math.PI/2),
    mat(0x6a7488,{transparent:true, opacity:0.5, emissive:0x222c44, emissiveIntensity:0.5}));
  dome.position.set(hv.x-2, heightAt(hv.x-2,hv.z-24), hv.z-24); scene.add(dome);
  obstacles.push({x:hv.x-2, z:hv.z-24, r:9.5});
  [[hv.x-16,hv.z-16],[hv.x+13,hv.z-20]].forEach(([tx,tz])=>{
    const t=texBox(2.4,10,2.4, 0x4e5868, TEX.hull, {emissive:0x1a2436, emissiveIntensity:0.5}); t.position.set(tx, heightAt(tx,tz)+5, tz); scene.add(t);
    const beacon=new THREE.Mesh(new THREE.SphereGeometry(0.4,8,8), mat(0x3fe0c8,{emissive:0x3fe0c8, emissiveIntensity:1.2}));
    beacon.position.set(tx, heightAt(tx,tz)+10.5, tz); scene.add(beacon);
    obstacles.push({x:tx, z:tz, r:2});
  });
}

/* ---------------- entities ---------------- */
function addEnt(e){
  e.uid = e.uid || ('u'+ents.length);
  ents.push(e); entByUid[e.uid]=e;
  if(e.group){
    e.group.userData.uid = e.uid;
    e.group.position.set(e.x, heightAt(e.x,e.z), e.z);
    scene.add(e.group);
    const proxy = hitProxy(e.pick||1.6, e.pickH||3.4);
    proxy.userData.uid = e.uid;
    e.group.add(proxy);
    pickables.push(proxy);
    e.group.traverse(o=>{ if(o.isMesh||o.isSprite) o.userData.uid=e.uid; });
    pickables.push(e.group);
  }
  return e;
}
function buildEntities(){
  // nodes (gather + hack)
  W.nodes.forEach((n,i)=>{
    const r = regionByZone[n.zone]; const a = D.ACTIONS[n.action];
    let x=r.x+n.dx, z=r.z+n.dz;
    const ent = addEnt({uid:'n'+i, kind:'node', action:n.action, def:a, x, z, water:!!n.water,
      group:makeNodeBody(a, n.water), pick:1.8, range:n.water?7.5:3.2});
    if(!n.water) obstacles.push({x, z, r:1.3});
    if(n.water) ent.group.position.y = WATER_Y+0.08;
  });
  // facilities
  W.facilities.forEach((f,i)=>{
    const r=regionByZone[f.zone]; const x=r.x+f.dx, z=r.z+f.dz;
    addEnt({uid:'f'+i, kind:'facility', f:f.f, x, z, group:makeFacilityBody(f.f), pick:1.9, range:4});
    obstacles.push({x, z, r:1.7});
  });
  // hangar
  {
    const r=regionByZone[W.hangar.zone]; const x=r.x+W.hangar.dx, z=r.z+W.hangar.dz;
    const g=new THREE.Group();
    const pad=new THREE.Mesh(new THREE.CylinderGeometry(5,5,0.3,20), mat(0x3e4654)); pad.position.y=0.15; g.add(pad);
    const ringM=new THREE.Mesh(new THREE.TorusGeometry(4.2,0.12,8,30), mat(0xffc35c,{emissive:0xa8762a, emissiveIntensity:0.8}));
    ringM.rotation.x=-Math.PI/2; ringM.position.y=0.33; g.add(ringM);
    const ship=new THREE.Group();
    const body=box(1.2,0.6,2.6, 0x8a93a8); body.position.y=1; ship.add(body);
    const wingL=box(1.6,0.1,0.9, 0x6a7388); wingL.position.set(-1.2,1,0.3); ship.add(wingL);
    const wingR=box(1.6,0.1,0.9, 0x6a7388); wingR.position.set(1.2,1,0.3); ship.add(wingR);
    const thr=box(0.5,0.3,0.2, 0x3fe0c8,{emissive:0x1a8a78, emissiveIntensity:1}); thr.position.set(0,0.9,1.4); ship.add(thr);
    ship.position.set(0,0.2,0); g.add(ship); g.userData.ship=ship;
    const icon=emojiSprite('🚀',2); icon.position.y=4; g.add(icon);
    addEnt({uid:'hangar', kind:'hangar', x, z, group:g, pick:5, pickH:3, range:6.5});
    obstacles.push({x, z, r:4.6});
  }
  // the people of the Reach — roaming, named, talkative
  D.NPCS.forEach(n=>{
    const r=regionByZone[n.zone]; const x=r.x+n.dx, z=r.z+n.dz;
    const h=makeHumanoid(n.suit, n.visor);
    const icon=emojiSprite(n.icon, 1.25); icon.position.y=2.45; h.group.add(icon);
    addEnt({uid:'npc_'+n.id, kind:'npc', npcId:n.id, name:n.name, role:n.role, x, z, sx:x, sz:z,
      roam:n.roam||4, group:h.group, parts:h.parts, pick:1.5, range:3.5,
      wanderT:2+Math.random()*5, tgt:null, animT:Math.random()*9, moving:false});
  });
  // contract board
  if(W.board){
    const r=regionByZone[W.board.zone]; const x=r.x+W.board.dx, z=r.z+W.board.dz;
    const g=new THREE.Group();
    const post=box(0.22,1.8,0.22, 0x3a4252); post.position.y=0.9; g.add(post);
    const panel=box(1.9,1.15,0.14, 0x2a3448, {emissive:0x121c2e, emissiveIntensity:0.6}); panel.position.y=1.95; g.add(panel);
    const scr=box(1.55,0.85,0.05, 0xffc35c, {emissive:0xa8762a, emissiveIntensity:0.8}); scr.position.set(0,1.95,0.1); g.add(scr);
    const icon=emojiSprite('📋',1.6); icon.position.y=3.3; g.add(icon);
    addEnt({uid:'board', kind:'board', x, z, group:g, pick:1.7, range:3.5});
    obstacles.push({x, z, r:0.9});
  }
  // gates
  CORRIDORS.filter(c=>c.gate).forEach(c=>{
    const t=0.5; // midpoint of corridor
    const x=lerp(c.ax,c.bx,t), z=lerp(c.az,c.bz,t);
    const g=makeGateBody();
    g.rotation.y=Math.atan2(c.bx-c.ax, c.bz-c.az);   // face along corridor
    const ent=addEnt({uid:'g_'+c.gate, kind:'gate', zone:c.gate, x, z, group:g, pick:5.5, pickH:5, range:7, open:false});
    ent.block={x,z,r:10};   // wider than the corridor's walkable halfwidth — no squeezing past

  });
  // enemies
  W.enemies.forEach((e,i)=>{
    const r=regionByZone[e.zone]; const def=D.ENEMIES[e.e];
    const x=r.x+e.dx, z=r.z+e.dz;
    const ent = addEnt({uid:'e'+i, kind:'enemy', eid:e.e, def, x, z, sx:x, sz:z,
      hp:def.hp, maxHp:def.hp, state:'wander', wanderT:1+Math.random()*3, tgt:null,
      group:makeEnemyBody(e.e, def.lvl), pick:1.6, range:2.8, engaged:false, animT:Math.random()*9});
    rollElite(ent);
  });
}

/* ---------------- settlements ---------------- */
function makeShack(rng){
  const g=new THREE.Group();
  const w=2.4+rng()*1.2, d=2+rng()*1, h=1.7+rng()*0.5;
  const body=texBox(w,h,d, 0x9a7a58, TEX.hull); body.position.y=h/2; g.add(body);
  const roof=texBox(w+0.5,0.14,d+0.7, 0x6a5a48, TEX.plank); roof.position.y=h+0.07; roof.rotation.z=0.08+rng()*0.06; g.add(roof);
  const door=box(0.5,1.1,0.06, 0x2a2622); door.position.set(w*0.2, 0.55, d/2+0.03); g.add(door);
  const lamp=new THREE.Mesh(new THREE.SphereGeometry(0.09,6,6), mat(0xffc35c,{emissive:0xc08a2a, emissiveIntensity:1.2}));
  lamp.position.set(w*0.2, 1.35, d/2+0.12); g.add(lamp);
  if(rng()<0.6){ const crate=texBox(0.5,0.5,0.5, 0x7a6a4a, TEX.plank); crate.position.set(-w*0.35, 0.25, d/2+0.4); g.add(crate); }
  return g;
}
function makeStiltHut(rng){
  const g=new THREE.Group();
  const w=2.2+rng()*0.8, d=2+rng()*0.6;
  [[-w/2+0.15,-d/2+0.15],[w/2-0.15,-d/2+0.15],[-w/2+0.15,d/2-0.15],[w/2-0.15,d/2-0.15]].forEach(([px,pz])=>{
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.11,1.6,6), mat(0x5a4a3a, {map:TEX.plank})); pole.position.set(px,0.8,pz); g.add(pole);
  });
  const floor=texBox(w+0.4,0.12,d+0.4, 0x8a7458, TEX.plank); floor.position.y=1.6; g.add(floor);
  const body=texBox(w,1.4,d, 0x6a8a8a, TEX.hull); body.position.y=2.36; g.add(body);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(Math.max(w,d)*0.85, 0.9, 4), mat(0x4a6a6a, {map:TEX.plank}));
  roof.position.y=3.5; roof.rotation.y=Math.PI/4; g.add(roof);
  const lantern=new THREE.Mesh(new THREE.SphereGeometry(0.12,6,6), mat(0x7ae8e8,{emissive:0x2a9a9a, emissiveIntensity:1.4}));
  lantern.position.set(0, 1.95, d/2+0.2); g.add(lantern);
  return g;
}
function makeFirepit(){
  const g=new THREE.Group();
  for(let i=0;i<6;i++){ const st=new THREE.Mesh(new THREE.IcosahedronGeometry(0.22,0), mat(0x4a4640,{map:TEX.rock}));
    const a=i/6*Math.PI*2; st.position.set(Math.cos(a)*0.6, 0.12, Math.sin(a)*0.6); g.add(st); }
  const fire=new THREE.Mesh(new THREE.ConeGeometry(0.32,0.7,6), mat(0xffaa3a,{emissive:0xff7a1a, emissiveIntensity:1.4}));
  fire.position.y=0.45; g.add(fire); g.userData.fire=fire;
  return g;
}
function makeSignpost(name){
  const g=new THREE.Group();
  const post=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.09,1.7,6), mat(0x5a4a3a,{map:TEX.plank})); post.position.y=0.85; g.add(post);
  const c=document.createElement('canvas'); c.width=128; c.height=32;
  const gx=c.getContext('2d');
  gx.fillStyle='#2a2018'; gx.fillRect(0,0,128,32);
  gx.strokeStyle='#8a7458'; gx.lineWidth=3; gx.strokeRect(1,1,126,30);
  gx.fillStyle='#ffd9a0'; gx.font='bold 17px Georgia'; gx.textAlign='center'; gx.textBaseline='middle';
  gx.fillText(name, 64, 17);
  const tex=new THREE.CanvasTexture(c);
  const plate=new THREE.Mesh(new THREE.BoxGeometry(1.7,0.45,0.08), new THREE.MeshLambertMaterial({map:tex}));
  plate.position.y=1.55; g.add(plate);
  return g;
}
function buildVillages(){
  const rng = mulberry32(99);
  for(const v of (W.villages||[])){
    const r=regionByZone[v.zone]; const cx=r.x+v.dx, cz=r.z+v.dz;
    // trampled ground under the settlement
    const dirt=new THREE.Mesh(new THREE.CircleGeometry(13, 22),
      new THREE.MeshLambertMaterial({color:0x4a4034, map:TEX.ground, transparent:true, opacity:0.55, depthWrite:false}));
    dirt.rotation.x=-Math.PI/2;
    dirt.position.set(cx, heightAt(cx,cz)+0.06, cz);
    scene.add(dirt);
    // every settlement gets a signpost facing the road
    const sign=makeSignpost(v.name);
    const sx=cx+9, sz=cz+9;
    sign.position.set(sx, heightAt(sx,sz), sz); sign.rotation.y=Math.PI/4+Math.PI;
    scene.add(sign);
    if(v.kind==='shanty'){
      [[-8,-4,0.4],[6,-7,2.6],[-3,7,1.3],[9,3,4.4],[-11,4,5.6]].forEach(([dx,dz,rot])=>{
        const s=makeShack(rng); const x=cx+dx, z=cz+dz;
        s.position.set(x, heightAt(x,z), z); s.rotation.y=rot; scene.add(s);
        obstacles.push({x, z, r:2.2});
      });
      const fp=makeFirepit(); fp.position.set(cx, heightAt(cx,cz), cz); scene.add(fp);
      const light=new THREE.PointLight(0xff9a4a, 1.0, 30); light.position.set(cx, heightAt(cx,cz)+3, cz); scene.add(light);
      // junk fence
      for(let i=0;i<7;i++){ const a=rng()*Math.PI*2, d=12+rng()*3;
        const x=cx+Math.cos(a)*d, z=cz+Math.sin(a)*d;
        if(!walkable(x,z)) continue;
        const f=texBox(1.6,0.8+rng()*0.5,0.12, 0x7a5640, TEX.hull); f.position.set(x, heightAt(x,z)+0.45, z); f.rotation.y=a+1.57; scene.add(f);
      }
    }else if(v.kind==='stilt'){
      [[-6,-2,0.3],[3,-5,1.8],[7,2,3.6],[-2,5,5.1]].forEach(([dx,dz,rot])=>{
        const s=makeStiltHut(rng); const x=cx+dx, z=cz+dz;
        s.position.set(x, heightAt(x,z), z); s.rotation.y=rot; scene.add(s);
        obstacles.push({x, z, r:1.9});
      });
      // walkway planks toward the water
      for(let i=0;i<4;i++){ const x=cx+10+i*2.2, z=cz+6+i*1.4;
        const p=texBox(2.4,0.1,1.1, 0x8a7458, TEX.plank); p.position.set(x, heightAt(x,z)+0.3, z); p.rotation.y=0.5; scene.add(p); }
      const light=new THREE.PointLight(0x6ae8e8, 0.9, 28); light.position.set(cx, heightAt(cx,cz)+4, cz); scene.add(light);
      // drying racks
      for(let i=0;i<3;i++){ const x=cx-4+i*3.4, z=cz+9;
        const rack=new THREE.Group();
        [[-0.8],[0.8]].forEach(([px])=>{ const post=box(0.08,1.2,0.08, 0x5a4a3a); post.position.set(px,0.6,0); rack.add(post); });
        const bar=box(1.7,0.06,0.06, 0x5a4a3a); bar.position.y=1.15; rack.add(bar);
        const fish=box(0.18,0.4,0.05, 0x9ad4e8); fish.position.set(-0.3,0.9,0); rack.add(fish);
        const fish2=box(0.18,0.34,0.05, 0x9ad4e8); fish2.position.set(0.25,0.93,0); rack.add(fish2);
        rack.position.set(x, heightAt(x,z), z); scene.add(rack);
      }
    }else if(v.kind==='grove'){
      // Verdant Hollow: platforms wrapped around great glasswood trunks + a greenhouse dome
      [[-7,-3],[5,-6],[-1,6]].forEach(([dx,dz])=>{
        const x=cx+dx, z=cz+dz, h=heightAt(x,z);
        const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.75,7,8), mat(0x6a8a7a,{map:TEX.plank}));
        trunk.position.set(x, h+3.5, z); scene.add(trunk);
        const crown=new THREE.Mesh(new THREE.ConeGeometry(2.6,4.4,7),
          mat(0x7fd8c8,{transparent:true, opacity:0.7, emissive:0x1a5a50, emissiveIntensity:0.4}));
        crown.position.set(x, h+8.4, z); scene.add(crown);
        const plat=new THREE.Mesh(new THREE.CylinderGeometry(1.9,1.9,0.16,9), mat(0x8a7458,{map:TEX.plank}));
        plat.position.set(x, h+2.4, z); scene.add(plat);
        const rail=new THREE.Mesh(new THREE.TorusGeometry(1.8,0.05,6,14), mat(0x5a4a3a));
        rail.rotation.x=Math.PI/2; rail.position.set(x, h+2.9, z); scene.add(rail);
        const lantern=new THREE.Mesh(new THREE.SphereGeometry(0.12,6,6), mat(0xa0ffd0,{emissive:0x3aaa6a, emissiveIntensity:1.4}));
        lantern.position.set(x+0.8, h+2.1, z+0.8); scene.add(lantern);
        obstacles.push({x, z, r:1.1});
      });
      // greenhouse dome
      const gx=cx+8, gz=cz+2, gh=heightAt(gx,gz);
      const dome=new THREE.Mesh(new THREE.SphereGeometry(2.6,12,8,0,Math.PI*2,0,Math.PI/2),
        mat(0xb0e8d8,{transparent:true, opacity:0.42, emissive:0x2a6a5a, emissiveIntensity:0.5}));
      dome.position.set(gx, gh, gz); scene.add(dome);
      for(let i=0;i<5;i++){ const px=gx-1.4+rng()*2.8, pz=gz-1.4+rng()*2.8;
        const plant=new THREE.Mesh(new THREE.ConeGeometry(0.22,0.7+rng()*0.5,5), mat(0x6ae8a8,{emissive:0x1a8a48, emissiveIntensity:0.4}));
        plant.position.set(px, gh+0.35, pz); scene.add(plant); }
      obstacles.push({x:gx, z:gz, r:2.7});
      const light=new THREE.PointLight(0x7affc0, 0.9, 30); light.position.set(cx, heightAt(cx,cz)+5, cz); scene.add(light);
    }else if(v.kind==='mining'){
      // Borehole 9: corrugated arch-huts, a drill rig, floodlights, glowing heaters
      [[-6,-2,0.4],[4,-5,1.9],[0,5,3.4]].forEach(([dx,dz,rot])=>{
        const x=cx+dx, z=cz+dz, h=heightAt(x,z);
        const hut=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,3.6,10,1,false,0,Math.PI),
          mat(0x7a7a82,{map:TEX.hull}));
        hut.rotation.z=Math.PI/2; hut.rotation.y=rot; hut.position.set(x, h+0.1, z); scene.add(hut);
        const door=box(0.7,1.2,0.08, 0x2a2622); door.position.set(x+Math.sin(rot)*1.9, h+0.7, z+Math.cos(rot)*1.9); door.rotation.y=rot; scene.add(door);
        obstacles.push({x, z, r:2});
      });
      // drill rig
      const dx2=cx+7, dz2=cz+1, dh=heightAt(dx2,dz2);
      const frame=texBox(0.9,6,0.9, 0x8a6a3a, TEX.hull); frame.position.set(dx2, dh+3, dz2); scene.add(frame);
      const drill=new THREE.Mesh(new THREE.ConeGeometry(0.5,1.6,8), mat(0xb0b4c0,{emissive:0x3a3e48, emissiveIntensity:0.4}));
      drill.rotation.x=Math.PI; drill.position.set(dx2, dh+1.2, dz2); scene.add(drill);
      obstacles.push({x:dx2, z:dz2, r:1.2});
      // heaters
      [[-3,2],[2,-1]].forEach(([hx,hz])=>{
        const x=cx+hx, z=cz+hz;
        const barrel=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.4,0.9,8), mat(0x5a4638,{map:TEX.hull}));
        barrel.position.set(x, heightAt(x,z)+0.45, z); scene.add(barrel);
        const glow=new THREE.Mesh(new THREE.CylinderGeometry(0.32,0.32,0.12,8), mat(0xff8a3a,{emissive:0xff6a1a, emissiveIntensity:1.5}));
        glow.position.set(x, heightAt(x,z)+0.95, z); scene.add(glow);
      });
      // floodlight pole
      const fx=cx-2, fz=cz-7;
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.12,5,6), mat(0x3a4252)); pole.position.set(fx, heightAt(fx,fz)+2.5, fz); scene.add(pole);
      const lamp=box(0.7,0.3,0.3, 0xfff0c0,{emissive:0xc8b070, emissiveIntensity:1.4}); lamp.position.set(fx, heightAt(fx,fz)+5, fz); lamp.rotation.x=0.5; scene.add(lamp);
      const light=new THREE.PointLight(0xffd9a0, 1.0, 32); light.position.set(cx, heightAt(cx,cz)+4, cz); scene.add(light);
    }else if(v.kind==='camp'){
      // Threshold Camp: two tents, a relay mast, crates, a kettle fire
      [[-3,-1,0.3],[2,-3,2.4]].forEach(([dx,dz,rot])=>{
        const x=cx+dx, z=cz+dz, h=heightAt(x,z);
        const tent=new THREE.Mesh(new THREE.ConeGeometry(1.5,1.7,4), mat(0x4e4660,{map:TEX.plank}));
        tent.position.set(x, h+0.85, z); tent.rotation.y=rot; scene.add(tent);
        obstacles.push({x, z, r:1.5});
      });
      const mx=cx+4, mz=cz+2, mh=heightAt(mx,mz);
      const mast=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.08,5.4,6), mat(0x6a7488)); mast.position.set(mx, mh+2.7, mz); scene.add(mast);
      const beacon=new THREE.Mesh(new THREE.SphereGeometry(0.14,6,6), mat(0xc8b8ff,{emissive:0x8a6aff, emissiveIntensity:1.6}));
      beacon.position.set(mx, mh+5.5, mz); scene.add(beacon);
      const crates=texBox(1.1,0.8,0.8, 0x5a526c, TEX.plank); crates.position.set(cx-1, heightAt(cx-1,cz+3)+0.4, cz+3); scene.add(crates);
      const fp2=makeFirepit(); fp2.position.set(cx+1, heightAt(cx+1,cz), cz); scene.add(fp2);
      const light=new THREE.PointLight(0xb8a0ff, 0.8, 24); light.position.set(cx, heightAt(cx,cz)+3, cz); scene.add(light);
    }
  }
  // Haven buildout: habitat blocks, market stalls, light pylons
  const hv=regionByZone.haven;
  [[14,-26,0.4,0x5a6478],[24,-12,1.2,0x4e5868],[-24,-22,2.2,0x5a6478]].forEach(([dx,dz,rot,col])=>{
    const x=hv.x+dx, z=hv.z+dz;
    const b=texBox(4.5,3+Math.random()*1.5,3.6, col, TEX.hull); b.position.set(x, heightAt(x,z)+1.6, z); b.rotation.y=rot; scene.add(b);
    const win=box(2.6,0.5,0.08, 0xffe9b0,{emissive:0xa8884a, emissiveIntensity:0.9}); win.position.set(x, heightAt(x,z)+2.2, z+1.85); win.rotation.y=rot; scene.add(win);
    obstacles.push({x, z, r:3});
  });
  [[8,8,0xc85a5a],[-4,10,0x5ac8a8]].forEach(([dx,dz,col])=>{
    const x=hv.x+dx, z=hv.z+dz;
    const stall=new THREE.Group();
    [[-1,-0.6],[1,-0.6],[-1,0.6],[1,0.6]].forEach(([px,pz])=>{ const post=box(0.1,1.6,0.1, 0x4a4038); post.position.set(px,0.8,pz); stall.add(post); });
    const awn=texBox(2.6,0.1,1.8, col, TEX.plank); awn.position.y=1.65; awn.rotation.z=0.06; stall.add(awn);
    const table=texBox(2.2,0.5,1.2, 0x6a5a48, TEX.plank); table.position.y=0.5; stall.add(table);
    stall.position.set(x, heightAt(x,z), z); scene.add(stall);
    obstacles.push({x, z, r:1.6});
  });
  [[-14,8],[20,-2]].forEach(([dx,dz])=>{
    const x=hv.x+dx, z=hv.z+dz;
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.14,4.4,6), mat(0x3a4252)); pole.position.set(x, heightAt(x,z)+2.2, z); scene.add(pole);
    const orb=new THREE.Mesh(new THREE.SphereGeometry(0.26,8,8), mat(0x3fe0c8,{emissive:0x3fe0c8, emissiveIntensity:1.1})); orb.position.set(x, heightAt(x,z)+4.5, z); scene.add(orb);
  });
  const hvLight=new THREE.PointLight(0x9fd8ff, 0.7, 44); hvLight.position.set(hv.x, heightAt(hv.x,hv.z)+8, hv.z); scene.add(hvLight);
  // camp fire light at the Meridian galley
  const mr=regionByZone.meridian;
  const campLight=new THREE.PointLight(0xff9a4a, 0.9, 24); campLight.position.set(mr.x+13, heightAt(mr.x+13,mr.z+2)+2.4, mr.z+2); scene.add(campLight);
}

/* ---------------- movement & collision ---------------- */
function lockedGateBlocks(x,z){
  for(const e of ents) if(e.kind==='gate' && !e.open && Math.hypot(x-e.block.x,z-e.block.z)<e.block.r) return true;
  return false;
}
function walkable(x,z){
  if(Math.abs(x)>262||Math.abs(z)>262) return false;
  if(walkField(x,z)<0.5) return false;
  if(heightAt(x,z)<WATER_Y+0.05) return false;
  return !lockedGateBlocks(x,z);
}
function pushOut(x,z, pr){
  for(const o of obstacles){
    const dx=x-o.x, dz=z-o.z, d=Math.hypot(dx,dz), m=o.r+pr;
    if(d<m && d>0.001){ x=o.x+dx/d*m; z=o.z+dz/d*m; }
  }
  return [x,z];
}
function tryMove(e, nx, nz, pr){
  const escaping = !walkable(e.x, e.z);   // never trap anything in a bad spot — let it walk out
  if(escaping){ e.x=nx; e.z=nz; return true; }
  if(walkable(nx,nz)){ [nx,nz]=pushOut(nx,nz,pr); if(walkable(nx,nz)){ e.x=nx; e.z=nz; return true; } }
  // axis slide
  if(walkable(nx, e.z)){ [nx]=pushOut(nx,e.z,pr); e.x=nx; return true; }
  if(walkable(e.x, nz)){ const r=pushOut(e.x,nz,pr); e.z=r[1]; return true; }
  return false;
}

/* ---------------- input ---------------- */
let pdown=null, dragging=false;
const touches=new Map();           // active pointers for pinch zoom
let pinchD=0;
function onPointerDown(ev){
  touches.set(ev.pointerId, {x:ev.clientX, y:ev.clientY});
  if(touches.size===2){
    const a=[...touches.values()];
    pinchD=Math.hypot(a[0].x-a[1].x, a[0].y-a[1].y);
    pdown=null; dragging=false;
    return;
  }
  pdown={x:ev.clientX, y:ev.clientY, lx:ev.clientX, ly:ev.clientY, b:ev.button};
  dragging=false;
}
function onPointerMove(ev){
  if(touches.has(ev.pointerId)) touches.set(ev.pointerId, {x:ev.clientX, y:ev.clientY});
  if(touches.size===2){
    const a=[...touches.values()];
    const d=Math.hypot(a[0].x-a[1].x, a[0].y-a[1].y);
    cam.dist=clamp(cam.dist+(pinchD-d)*0.06, 9, 46);
    pinchD=d;
    return;
  }
  if(pdown){
    const dx=ev.clientX-pdown.lx, dy=ev.clientY-pdown.ly;
    pdown.lx=ev.clientX; pdown.ly=ev.clientY;
    if(Math.abs(ev.clientX-pdown.x)>6 || Math.abs(ev.clientY-pdown.y)>6) dragging=true;
    if(dragging){
      cam.yaw -= dx*0.0065;
      cam.pitch = clamp(cam.pitch + dy*0.005, 0.32, 1.35);
    }
  }
  updateHover(ev);
}
function onPointerUp(ev){
  touches.delete(ev.pointerId);
  const wasDrag=dragging, had=pdown;
  pdown=null; dragging=false;
  if(!had || wasDrag || had.b!==0) return;   // only clicks that BEGAN on the canvas act on the world
  pick(ev, true);
}
function onWheel(ev){ cam.dist=clamp(cam.dist+ev.deltaY*0.02, 9, 46); ev.preventDefault(); }
function setNdc(ev){
  const r=canvas.getBoundingClientRect();
  ndc.x=((ev.clientX-r.left)/r.width)*2-1;
  ndc.y=-((ev.clientY-r.top)/r.height)*2+1;
}
function pick(ev, click){
  setNdc(ev);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(pickables, true);
  let ent=null;
  for(const h of hits){
    let o=h.object;
    while(o && !o.userData.uid) o=o.parent;
    if(o && o.userData.uid){ const e=entByUid[o.userData.uid]; if(e && !(e.kind==='enemy'&&e.state==='dead')){ ent=e; break; } }
  }
  if(click){
    if(ent){ moveToEntity(ent); api.onTarget(ent); return; }
    const th = ray.intersectObject(terrainMesh);
    if(th.length){
      const p=th[0].point;
      player.pending=null;
      player.tgt={x:p.x, z:p.z};
      api.onMove();
      showMarker(p.x, p.z);
    }
  }
  return ent;
}
function updateHover(ev){
  if(!ev || !player) return;
  const ent = pick(ev, false);
  hoverEnt = ent;
  canvas.style.cursor = ent ? 'pointer' : 'default';
  if(ent){
    const h = api.hint(ent);
    hintEl.style.display='block';
    hintEl.innerHTML = h.text + (h.sub?`<span class="hint-sub${h.ok===false?' no':''}">${h.sub}</span>`:'');
    hintEl.style.left=(ev.clientX+14)+'px'; hintEl.style.top=(ev.clientY+10)+'px';
  }else hintEl.style.display='none';
}
function onKey(ev, down){
  if(ev.target && (ev.target.tagName==='INPUT'||ev.target.tagName==='TEXTAREA'||ev.target.tagName==='SELECT')) return;
  const k=ev.key.toLowerCase();
  if(['w','a','s','d'].includes(k)){ keys[k]=down; if(down){ player.pending=null; player.tgt=null; api.onMove(); } }
  if(down && k==='arrowleft') cam.yaw+=0.12;
  if(down && k==='arrowright') cam.yaw-=0.12;
  if(down && k==='arrowup') cam.pitch=clamp(cam.pitch+0.07,0.32,1.35);
  if(down && k==='arrowdown') cam.pitch=clamp(cam.pitch-0.07,0.32,1.35);
}
function showMarker(x,z){
  clickMarker.position.set(x, heightAt(x,z)+0.1, z);
  clickMarker.material.opacity=0.9;
  clickMarker.scale.setScalar(1);
  clickMarker.userData.age=0;
  clickMarker.visible=true;
}

/* ---------------- labels (HTML overlay) ---------------- */
function project(x,y,z){
  const v=new THREE.Vector3(x,y,z).project(camera);
  if(v.z>1) return null;
  const r=canvas.getBoundingClientRect();
  return {x:(v.x*0.5+0.5)*r.width, y:(-v.y*0.5+0.5)*r.height};
}
function ensurePlate(e){
  let p=nameplates[e.uid];
  if(!p){
    const el=document.createElement('div'); el.className='wname'+(e.def&&e.def.boss?' boss':'');
    el.innerHTML=`<span class="wn-name"></span><div class="whp"><i></i></div>`;
    labelRoot.appendChild(el);
    p={el, nameEl:el.querySelector('.wn-name'), hpEl:el.querySelector('.whp i'), hpBox:el.querySelector('.whp')};
    nameplates[e.uid]=p;
  }
  return p;
}
function updateLabels(){
  // nameplates: enemies (red, hp) and npcs (gold, name only)
  for(const e of ents){
    if(e.kind==='npc'){
      const p=nameplates[e.uid];
      const d=Math.hypot(e.x-player.x, e.z-player.z);
      if(d>34){ if(p) p.el.style.display='none'; continue; }
      const s=project(e.x, e.group.position.y+2.1, e.z);
      const plate=ensurePlate(e);
      plate.el.classList.add('npcp');
      if(!s){ plate.el.style.display='none'; continue; }
      plate.el.style.display='block';
      plate.el.style.left=s.x+'px'; plate.el.style.top=s.y+'px';
      plate.nameEl.textContent=e.name;
      plate.hpBox.style.display='none';
      continue;
    }
    if(e.kind!=='enemy') continue;
    const p=nameplates[e.uid];
    const d=Math.hypot(e.x-player.x, e.z-player.z);
    if(e.state==='dead' || d>62){ if(p) p.el.style.display='none'; continue; }
    const top = e.group.position.y + 2.5*(0.8+e.def.lvl*0.011) + (e.group.userData.hover?0.8:0);
    const s=project(e.x, top, e.z);
    const plate=ensurePlate(e);
    if(!s){ plate.el.style.display='none'; continue; }
    plate.el.style.display='block';
    plate.el.style.left=s.x+'px'; plate.el.style.top=s.y+'px';
    plate.nameEl.textContent=`${e.elite?'★ Alpha ':''}${e.def.name} · ${e.def.lvl}`;
    plate.el.classList.toggle('elite', !!e.elite);
    const hurt = e.hp<e.maxHp || e.engaged;
    plate.hpBox.style.display=hurt?'block':'none';
    if(hurt) plate.hpEl.style.width=clamp(e.hp/e.maxHp*100,0,100)+'%';
  }
  // splats
  for(let i=splats.length-1;i>=0;i--){
    const s=splats[i];
    s.age+=0.016;
    if(s.age>=s.life){ s.el.remove(); splats.splice(i,1); continue; }
    const pos = s.follow==='player'
      ? {x:player.x, y:player.group.position.y+2.2, z:player.z}
      : {x:s.follow.x, y:s.follow.group.position.y+2.4, z:s.follow.z};
    const sc=project(pos.x, pos.y, pos.z);
    if(sc){ s.el.style.left=(sc.x+s.dx)+'px'; s.el.style.top=(sc.y - s.age*34)+'px'; s.el.style.opacity=1-(s.age/s.life); }
  }
  // action progress over player
  const pr = api.actionProgress();
  if(pr){
    const s=project(player.x, player.group.position.y+2.45, player.z);
    if(s){
      progressEl.style.display='block';
      progressEl.style.left=s.x+'px'; progressEl.style.top=s.y+'px';
      progressEl.querySelector('i').style.width=(pr.pct*100)+'%';
      progressEl.querySelector('.wp-label').textContent=pr.label;
    }
  }else progressEl.style.display='none';
}

/* ---------------- public fx ---------------- */
function splat(target, text, cls){
  const el=document.createElement('div');
  el.className='wsplat '+(cls||'');
  el.textContent=text;
  labelRoot.appendChild(el);
  splats.push({el, follow:target, dx:(Math.random()-0.5)*36, age:0, life:0.95});
}
const STYLE_COLORS = {kinetics:0x9fe8ff, marksmanship:0xffd35c, psionics:0xc08bff};
function attackFx(src, dst, style){
  const from = src==='player' ? player : src;
  const to = dst==='player' ? player : dst;
  if(src==='player' && (style==='marksmanship'||style==='psionics')){
    const m=new THREE.Mesh(new THREE.SphereGeometry(0.16,6,6),
      new THREE.MeshBasicMaterial({color:STYLE_COLORS[style]}));
    m.position.set(from.x, from.group.position.y+1.4, from.z);
    scene.add(m);
    projectiles.push({mesh:m, fx:from.x, fy:from.group.position.y+1.4, fz:from.z,
      tx:to.x, ty:to.group.position.y+1.2, tz:to.z, t:0, dur:0.22});
  }else{
    from.lungeT = 1;
    from.lungeDx = (to.x-from.x); from.lungeDz = (to.z-from.z);
    const l=Math.hypot(from.lungeDx,from.lungeDz)||1; from.lungeDx/=l; from.lungeDz/=l;
  }
}
// every respawn re-rolls: ~12% come back as a tougher ★ Alpha
function rollElite(e){
  e.elite = !e.def.boss && Math.random() < 0.12;
  e.baseScale = (0.8 + e.def.lvl*0.011) * (e.elite ? 1.25 : 1);
  e.maxHp = Math.round(e.def.hp * (e.elite ? 1.6 : 1));
  e.hp = e.maxHp;
  e.group.scale.setScalar(e.baseScale);
}
function killEntity(e){
  e.state='dead'; e.engaged=false; e.deadT=8; e.dieAnim=0;
  const p=nameplates[e.uid]; if(p) p.el.style.display='none';
}
function setEngaged(e, on){ e.engaged=on; if(!on && e.state!=='dead') e.state='wander'; }
function respawnAtCamp(){
  player.x=W.camp.x; player.z=W.camp.z; player.tgt=null; player.pending=null;
}
function moveToEntity(e){
  player.pending=e.uid;
  player.tgt={x:e.x, z:e.z};
}
function distTo(e){ return Math.hypot(e.x-player.x, e.z-player.z); }
function nearestAlive(eid, maxD){
  let best=null, bd=maxD;
  for(const e of ents) if(e.kind==='enemy'&&e.eid===eid&&e.state!=='dead'){
    const d=distTo(e); if(d<bd){bd=d; best=e;}
  }
  return best;
}

/* ---------------- per-frame update ---------------- */
function updatePlayer(dt){
  const p=player;
  // WASD
  let kx=0,kz=0;
  if(keys.w)kz-=1; if(keys.s)kz+=1; if(keys.a)kx-=1; if(keys.d)kx+=1;
  if(kx||kz){
    const sy=Math.sin(cam.yaw), cy=Math.cos(cam.yaw);
    const dx=(kx*cy - kz*sy), dz=(-kx*sy - kz*cy);
    const l=Math.hypot(dx,dz)||1;
    tryMove(p, p.x+dx/l*9*dt, p.z+dz/l*9*dt, 0.5);
    p.moving=true; p.face=Math.atan2(dx,dz);
  }else if(p.tgt){
    const dx=p.tgt.x-p.x, dz=p.tgt.z-p.z, d=Math.hypot(dx,dz);
    const pend = p.pending?entByUid[p.pending]:null;
    const arrive = pend ? (pend.range||3) : 0.25;
    if(d<=arrive){
      p.tgt=null; p.moving=false; p.stuckT=0;
      if(pend){ p.pending=null; p.face=Math.atan2(pend.x-p.x, pend.z-p.z); api.interact(pend); }
    }else{
      const step=Math.min(9*dt, d);
      const dirx=dx/d, dirz=dz/d;
      let moved = tryMove(p, p.x+dirx*step, p.z+dirz*step, 0.5);
      if(!moved){
        for(const ang of [0.6,-0.6,1.1,-1.1,1.6,-1.6]){   // steer around clutter
          const ca=Math.cos(ang), sa=Math.sin(ang);
          const rx=dirx*ca-dirz*sa, rz=dirx*sa+dirz*ca;
          if(tryMove(p, p.x+rx*step, p.z+rz*step, 0.5)){ moved=true; break; }
        }
      }
      if(moved){ p.stuckT=0; p.moving=true; p.face=Math.atan2(p.tgt.x-p.x, p.tgt.z-p.z); }
      else{
        p.stuckT=(p.stuckT||0)+dt;
        if(pend && d<=arrive+2.6){     // close enough to use it through the clutter
          p.tgt=null; p.moving=false; p.stuckT=0;
          p.pending=null; p.face=Math.atan2(pend.x-p.x, pend.z-p.z); api.interact(pend);
        }else if(p.stuckT>0.8){ p.tgt=null; p.pending=null; p.moving=false; p.stuckT=0; }
      }
    }
  }else p.moving=false;
  // facing target while fighting / working
  const fight = api.combatTarget();
  if(fight){ const e=entByUid[fight]; if(e) p.face=Math.atan2(e.x-p.x, e.z-p.z); }
  p.group.position.set(p.x, heightAt(p.x,p.z), p.z);
  p.group.rotation.y = p.face||0;
  // animate
  p.animT=(p.animT||0)+dt;
  const sw = p.moving ? Math.sin(p.animT*9.5)*0.65 : 0;
  p.parts.legs[0].rotation.x=sw; p.parts.legs[1].rotation.x=-sw;
  if(p.working){
    p.parts.arms[1].rotation.x = -0.6+Math.sin(p.animT*8)*0.8;
    p.parts.arms[0].rotation.x = sw*0.4;
  }else{
    p.parts.arms[0].rotation.x=-sw*0.8; p.parts.arms[1].rotation.x=sw*0.8;
  }
  if(p.lungeT>0){
    p.lungeT=Math.max(0,p.lungeT-dt*4);
    const k=Math.sin(p.lungeT*Math.PI)*0.5;
    p.group.position.x+=p.lungeDx*k; p.group.position.z+=p.lungeDz*k;
  }
  p.group.position.y += p.moving?Math.abs(Math.sin(p.animT*9.5))*0.07:0;
}
function updateNpc(e, dt){
  e.animT+=dt;
  const dp=Math.hypot(player.x-e.x, player.z-e.z);
  if(dp<5){                                  // greet the drifter
    e.tgt=null; e.moving=false;
    e.face=Math.atan2(player.x-e.x, player.z-e.z);
  }else if(e.tgt){
    const dx=e.tgt.x-e.x, dz=e.tgt.z-e.z, d=Math.hypot(dx,dz);
    if(d<0.3){ e.tgt=null; e.moving=false; }
    else{ tryMove(e, e.x+dx/d*1.5*dt, e.z+dz/d*1.5*dt, 0.4); e.face=Math.atan2(dx,dz); e.moving=true; }
  }else{
    e.moving=false;
    e.wanderT-=dt;
    if(e.wanderT<=0){
      e.wanderT=4+Math.random()*7;
      const a=Math.random()*Math.PI*2, rr=1+Math.random()*e.roam;
      const nx=e.sx+Math.cos(a)*rr, nz=e.sz+Math.sin(a)*rr;
      if(walkable(nx,nz)) e.tgt={x:nx, z:nz};
    }
  }
  e.group.position.set(e.x, heightAt(e.x,e.z), e.z);
  e.group.rotation.y = e.face||0;
  const sw = e.moving ? Math.sin(e.animT*7)*0.5 : 0;
  e.parts.legs[0].rotation.x=sw; e.parts.legs[1].rotation.x=-sw;
  e.parts.arms[0].rotation.x=-sw*0.7; e.parts.arms[1].rotation.x=sw*0.7;
}
function updateEnemies(dt){
  for(const e of ents){
    if(e.kind==='npc'){ updateNpc(e, dt); continue; }
    if(e.kind!=='enemy') continue;
    e.animT+=dt;
    if(e.state==='dead'){
      e.dieAnim=Math.min(1, e.dieAnim+dt*2.4);
      e.group.scale.setScalar((e.baseScale||1)*(1-e.dieAnim));
      e.group.visible = e.dieAnim<1;
      e.deadT-=dt;
      if(e.deadT<=0){
        e.state='wander'; e.x=e.sx; e.z=e.sz; e.dieAnim=0;
        e.group.visible=true;
        rollElite(e);
      }
      continue;
    }
    if(e.engaged){
      const dHome=Math.hypot(e.x-e.sx, e.z-e.sz);
      if(dHome>45){                                   // leash: reset and walk home
        e.calmT=8; e.hp=e.maxHp; e.tgt={x:e.sx, z:e.sz};
        api.onLeash(e);
      }else{
        const d=Math.hypot(player.x-e.x, player.z-e.z);
        if(d>2.1){
          const dx=(player.x-e.x)/d, dz=(player.z-e.z)/d;
          if(!tryMove(e, e.x+dx*4.4*dt, e.z+dz*4.4*dt, 0.4)){
            for(const ang of [0.7,-0.7,1.3,-1.3]){
              const ca=Math.cos(ang), sa=Math.sin(ang);
              if(tryMove(e, e.x+(dx*ca-dz*sa)*4.4*dt, e.z+(dx*sa+dz*ca)*4.4*dt, 0.4)) break;
            }
          }
        }
        e.face=Math.atan2(player.x-e.x, player.z-e.z);
      }
    }else{
      if(e.def.aggro){
        e.calmT = Math.max(0, (e.calmT||0)-dt);
        if(e.calmT<=0 && Math.hypot(player.x-e.x, player.z-e.z) < 11) api.onAggro(e);
      }
      e.wanderT-=dt;
      if(e.tgt){
        const dx=e.tgt.x-e.x, dz=e.tgt.z-e.z, d=Math.hypot(dx,dz);
        if(d<0.4) e.tgt=null;
        else{ tryMove(e, e.x+dx/d*2.1*dt, e.z+dz/d*2.1*dt, 0.4); e.face=Math.atan2(dx,dz); }
      }else if(e.wanderT<=0){
        e.wanderT=2+Math.random()*4;
        const a=Math.random()*Math.PI*2, r=3+Math.random()*9;
        const nx=e.sx+Math.cos(a)*r, nz=e.sz+Math.sin(a)*r;
        if(walkable(nx,nz)) e.tgt={x:nx, z:nz};
      }
    }
    let y=heightAt(e.x,e.z);
    if(e.group.userData.hover) y+=0.4+Math.sin(e.animT*2.2)*0.25;
    if(e.lungeT>0){
      e.lungeT=Math.max(0,e.lungeT-dt*4);
      const k=Math.sin(e.lungeT*Math.PI)*0.6;
      e.group.position.set(e.x+e.lungeDx*k, y, e.z+e.lungeDz*k);
    }else e.group.position.set(e.x,y,e.z);
    e.group.rotation.y=e.face||0;
    if(e.group.userData.ring) e.group.userData.ring.rotation.z+=dt*1.4;
  }
}
function updateMisc(dt, t){
  // projectiles
  for(let i=projectiles.length-1;i>=0;i--){
    const pr=projectiles[i];
    pr.t+=dt;
    const k=Math.min(1, pr.t/pr.dur);
    pr.mesh.position.set(lerp(pr.fx,pr.tx,k), lerp(pr.fy,pr.ty,k)+Math.sin(k*Math.PI)*0.6, lerp(pr.fz,pr.tz,k));
    if(k>=1){ scene.remove(pr.mesh); projectiles.splice(i,1); }
  }
  // click marker
  if(clickMarker.visible){
    clickMarker.userData.age+=dt;
    clickMarker.material.opacity=Math.max(0, 0.9-clickMarker.userData.age*1.4);
    clickMarker.scale.setScalar(1+clickMarker.userData.age*1.3);
    if(clickMarker.material.opacity<=0) clickMarker.visible=false;
  }
  // node icon bobbing + working node pulse
  for(const e of ents){
    if(e.kind==='node' && e.group.userData.icon){
      e.group.userData.icon.position.y = (e.water?1.4:2.4) + Math.sin(t*1.6 + e.x)*0.12;
      if(e.uid===player.workUid){
        const k=1+Math.sin(t*7)*0.06;
        e.group.scale.setScalar(k);
      }else if(e.group.scale.x!==1) e.group.scale.setScalar(1);
      if(e.group.userData.ripple) e.group.userData.ripple.rotation.z = t*0.8;
    }
  }
  // debris ring drift + water shimmer
  if(scene.userData.ring) scene.userData.ring.rotation.y += dt*0.004;
  if(TEX.water){ TEX.water.offset.x = t*0.006; TEX.water.offset.y = t*0.004; }
  // region detection
  regionPollT-=dt;
  if(regionPollT<=0){
    regionPollT=0.3;
    const rz=regionAt(player.x, player.z);
    if(rz!==curRegion){ curRegion=rz; api.onRegionChange(rz); }
  }
  // gates open/close
  gatePollT-=dt;
  if(gatePollT<=0){
    gatePollT=0.5;
    for(const e of ents) if(e.kind==='gate'){
      const open = api.isZoneUnlocked(e.zone);
      if(open!==e.open){
        e.open=open;
        e.group.userData.barrier.visible=!open;
        (e.group.userData.tips||[]).forEach(tp=>{
          tp.material.color.set(open?0x3fe0c8:0xff5d6c);
          tp.material.emissive.set(open?0x1a8a78:0xff2a3a);
        });
      }
    }
  }
  // weapon visual matches equipped style
  gearPollT-=dt;
  if(gearPollT<=0){
    gearPollT=1;
    const st=api.getState();
    const w = st && st.gear.weapon ? D.ITEMS[st.gear.weapon] : null;
    player.parts.weapon.visible=!!w;
    if(w) player.parts.weapon.material.color.set(STYLE_COLORS[w.style]||0x888888);
  }
}
function updateCamera(){
  const px=player.x, pz=player.z, py=player.group.position.y;
  const cx=px+Math.sin(cam.yaw)*Math.cos(cam.pitch)*cam.dist;
  const cz=pz+Math.cos(cam.yaw)*Math.cos(cam.pitch)*cam.dist;
  let cy=py+Math.sin(cam.pitch)*cam.dist;
  cy=Math.max(cy, heightAt(cx,cz)+1.6);
  camera.position.set(cx,cy,cz);
  camera.lookAt(px, py+1.3, pz);
}
let lastFrameAt = 0;
function frame(t){
  requestAnimationFrame(frame);
  const now=t/1000;
  lastFrameAt = performance.now();
  let dt=now-prevT; prevT=now;
  if(dt>0.1) dt=0.1;
  if(!player) return;
  updatePlayer(dt);
  updateEnemies(dt);
  updateMisc(dt, now);
  updateCamera();
  updateLabels();
  renderer.render(scene, camera);
}
// keeps the simulation moving when rAF is paused (hidden/background tab)
function pump(){
  if(!player) return;
  if(performance.now() - lastFrameAt < 300) return;
  const dt = 0.1;
  prevT += dt;
  updatePlayer(dt);
  updateEnemies(dt);
  updateMisc(dt, performance.now()/1000);
}

/* ---------------- minimap ---------------- */
function drawMinimap(cv){
  const g=cv.getContext('2d');
  const S=cv.width, scale=S/560, ox=S/2, oz=S/2;
  const X=x=>ox+x*scale, Z=z=>oz+z*scale;
  g.fillStyle='#0a0e1a'; g.fillRect(0,0,S,S);
  for(const c of CORRIDORS){
    g.strokeStyle = (!c.gate || api.isZoneUnlocked(c.gate)) ? '#27395c' : '#3a1c26';
    g.lineWidth=c.w*scale*1.6;
    g.lineCap='round';
    g.beginPath(); g.moveTo(X(c.ax),Z(c.az)); g.lineTo(X(c.bx),Z(c.bz)); g.stroke();
  }
  for(const r of REGIONS){
    const unlocked=api.isZoneUnlocked(r.zone);
    g.fillStyle='#'+new THREE.Color(r.color).getHexString();
    g.globalAlpha=unlocked?0.85:0.3;
    g.beginPath(); g.arc(X(r.x),Z(r.z),r.r*scale,0,7); g.fill();
    g.globalAlpha=1;
    g.fillStyle=unlocked?'#cfe0f2':'#54677f';
    g.font='10px Segoe UI'; g.textAlign='center';
    g.fillText(D.ZONES[r.zone].name, X(r.x), Z(r.z)-r.r*scale-4);
  }
  for(const w of W.water){
    g.fillStyle='#16525e'; g.globalAlpha=0.9;
    g.beginPath(); g.arc(X(w.x),Z(w.z),w.r*scale,0,7); g.fill(); g.globalAlpha=1;
  }
  for(const e of ents) if(e.kind==='gate'){
    g.fillStyle=e.open?'#3fe0c8':'#ff5d6c';
    g.beginPath(); g.arc(X(e.x),Z(e.z),3.4,0,7); g.fill();
  }
  for(const v of (W.villages||[])){
    const r=regionByZone[v.zone]; const x=r.x+v.dx, z=r.z+v.dz;
    g.fillStyle='#ffc35c';
    g.fillRect(X(x)-2.5, Z(z)-2.5, 5, 5);
    g.font='9px Segoe UI'; g.textAlign='center';
    g.fillText(v.name, X(x), Z(z)+11);
  }
  if(api.getEvent){
    const ev = api.getEvent();
    if(ev){
      const r = regionByZone[ev.zone];
      g.font='16px serif'; g.textAlign='center';
      g.fillText(ev.icon, X(r.x), Z(r.z)+6);
      g.strokeStyle='#ffc35c'; g.lineWidth=1.6; g.globalAlpha=0.8;
      g.beginPath(); g.arc(X(r.x), Z(r.z), 12+Math.sin(Date.now()/300)*3, 0, 7); g.stroke();
      g.globalAlpha=1;
    }
  }
  if(player){
    g.fillStyle='#fff';
    g.save(); g.translate(X(player.x),Z(player.z)); g.rotate(-(player.face||0));
    g.beginPath(); g.moveTo(0,-6); g.lineTo(4,5); g.lineTo(-4,5); g.closePath(); g.fill();
    g.restore();
  }
}

/* ---------------- local HUD minimap (player-centered) ---------------- */
function drawLocalMap(cv){
  if(!player) return;
  const g=cv.getContext('2d');
  const S=cv.width, half=S/2, range=62, scale=half/range;
  g.clearRect(0,0,S,S);
  g.save();
  g.beginPath(); g.arc(half,half,half-1,0,7); g.clip();
  // ground: region tint where the player stands, darker outside walkable
  g.fillStyle='#101622'; g.fillRect(0,0,S,S);
  for(const r of REGIONS){
    const dx=(r.x-player.x)*scale, dz=(r.z-player.z)*scale;
    g.fillStyle='#'+new THREE.Color(r.color).getHexString();
    g.globalAlpha=0.5;
    g.beginPath(); g.arc(half+dx, half+dz, r.r*scale, 0, 7); g.fill();
  }
  g.globalAlpha=0.8;
  for(const w of W.water){
    const dx=(w.x-player.x)*scale, dz=(w.z-player.z)*scale;
    g.fillStyle='#16525e';
    g.beginPath(); g.arc(half+dx, half+dz, w.r*scale, 0, 7); g.fill();
  }
  g.globalAlpha=1;
  // entities as dots
  for(const e of ents){
    const d=Math.hypot(e.x-player.x, e.z-player.z);
    if(d>range) continue;
    const x=half+(e.x-player.x)*scale, y=half+(e.z-player.z)*scale;
    if(e.kind==='enemy'){
      if(e.state==='dead') continue;
      g.fillStyle = e.elite ? '#ffd35c' : '#ff5d6c';
      g.fillRect(x-1.5, y-1.5, 3, 3);
    }else if(e.kind==='npc'){
      g.fillStyle='#ffc35c'; g.beginPath(); g.arc(x,y,2,0,7); g.fill();
    }else if(e.kind==='node'){
      g.fillStyle='#3fe0c8'; g.fillRect(x-1, y-1, 2, 2);
    }else if(e.kind==='facility'||e.kind==='hangar'||e.kind==='board'){
      g.fillStyle='#6ea4ff'; g.fillRect(x-2, y-2, 4, 4);
    }else if(e.kind==='gate'){
      g.fillStyle=e.open?'#3fe0c8':'#ff5d6c';
      g.beginPath(); g.arc(x,y,3,0,7); g.stroke(); g.fill();
    }
  }
  // player arrow (faces camera-forward)
  g.fillStyle='#ffffff';
  g.save(); g.translate(half,half); g.rotate(-(player.face||0));
  g.beginPath(); g.moveTo(0,-5.5); g.lineTo(4,4.5); g.lineTo(-4,4.5); g.closePath(); g.fill();
  g.restore();
  g.restore();
  g.strokeStyle='#27395c'; g.lineWidth=2;
  g.beginPath(); g.arc(half,half,half-1,0,7); g.stroke();
}

/* ---------------- init ---------------- */
function init(apiIn){
  api = apiIn;
  viewportEl = document.getElementById('viewport');
  labelRoot = document.getElementById('labels');
  hintEl = document.getElementById('hint');
  canvas = document.getElementById('gl');
  renderer = new THREE.WebGLRenderer({canvas, antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));   // chunky-clean, and kind to laptops
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2200);
  function resize(){
    const r=viewportEl.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect=r.width/r.height;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  buildTextures();
  buildSky();
  buildTerrain();
  buildEntities();
  scatterDecor();
  buildVillages();
  // player
  const h=makeHumanoid(0x2a8a7a, 0x3fe0c8);
  player={group:h.group, parts:h.parts, x:W.camp.x, z:W.camp.z, tgt:null, pending:null, face:2.6, moving:false, working:false, workUid:null, animT:0, lungeT:0};
  scene.add(player.group);
  // click marker
  clickMarker=new THREE.Mesh(new THREE.RingGeometry(0.45,0.62,20),
    new THREE.MeshBasicMaterial({color:0x3fe0c8, transparent:true, opacity:0, side:THREE.DoubleSide, depthWrite:false}));
  clickMarker.rotation.x=-Math.PI/2; clickMarker.visible=false; scene.add(clickMarker);
  // progress bar element
  progressEl=document.createElement('div');
  progressEl.className='wprog'; progressEl.style.display='none';
  progressEl.innerHTML='<span class="wp-label"></span><div class="wp-bar"><i></i></div>';
  labelRoot.appendChild(progressEl);
  // input
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', ev=>{ touches.delete(ev.pointerId); pdown=null; dragging=false; });
  canvas.addEventListener('wheel', onWheel, {passive:false});
  canvas.addEventListener('contextmenu', e=>e.preventDefault());
  window.addEventListener('keydown', e=>onKey(e,true));
  window.addEventListener('keyup', e=>onKey(e,false));
  window.addEventListener('blur', ()=>{ for(const k in keys) keys[k]=false; });
  resize();
  requestAnimationFrame(frame);
}

return {
  init, splat, attackFx, killEntity, setEngaged, respawnAtCamp, moveToEntity, distTo, nearestAlive, drawMinimap, drawLocalMap, pump,
  byUid:uid=>entByUid[uid],
  get entities(){ return ents; },
  playerPos:()=>({x:player.x, z:player.z}),
  setPlayerPos(x,z){ if(player){ player.x=x; player.z=z; player.tgt=null; player.pending=null; } },
  startWork(uid){ if(player){ player.working=true; player.workUid=uid; } },
  stopWork(){ if(player){ player.working=false; player.workUid=null; } },
  camYaw:()=>cam.yaw,
  _debug:{heightAt, walkable, walkField, regionAt},
};
})();
