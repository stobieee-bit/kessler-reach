// Dev-only: validates content cross-references in data.js (run: node validate.js)
const fs = require('fs');
const path = require('path');
const code = fs.readFileSync(path.join(__dirname, 'js', 'data.js'), 'utf8');
const D = new Function(code + '; return KR_DATA;')();
const bad = [];
const item = id => { if(!D.ITEMS[id]) bad.push('missing item: '+id); };
Object.values(D.ACTIONS).forEach(a => {
  if(a.inputs) Object.keys(a.inputs).forEach(item);
  if(a.outputs) Object.keys(a.outputs).forEach(item);
  if(a.bonus) item(a.bonus.item);
  if(!D.SKILLS.find(s=>s.id===a.skill)) bad.push('bad skill '+a.skill+' in '+a.id);
  if(a.zones) a.zones.forEach(z=>{ if(!D.ZONES[z]) bad.push('bad zone '+z+' in '+a.id); });
  if(a.facility && !D.FACILITY_NAMES[a.facility]) bad.push('bad facility in '+a.id);
  if(a.type==='craft' && !a.facility) bad.push('craft without facility: '+a.id);
});
Object.values(D.ENEMIES).forEach(E => {
  (E.loot||[]).forEach(L=>item(L.item));
  E.zones.forEach(z=>{ if(!D.ZONES[z]) bad.push('bad zone in enemy '+E.id); });
});
Object.values(D.QUESTS).forEach(q => {
  q.objectives.forEach(o => {
    if(o.item) item(o.item);
    if(o.enemy && !D.ENEMIES[o.enemy]) bad.push('bad enemy in '+q.id);
    if(o.action && !D.ACTIONS[o.action]) bad.push('bad action in '+q.id);
  });
  const r = q.rewards||{};
  if(r.items) Object.keys(r.items).forEach(item);
  if(r.xp) Object.keys(r.xp).forEach(k=>{ if(!D.SKILLS.find(s=>s.id===k)) bad.push('bad xp skill '+k+' in '+q.id); });
  if(r.unlockZone && !D.ZONES[r.unlockZone]) bad.push('bad unlockZone in '+q.id);
  ((q.reqs&&q.reqs.quests)||[]).forEach(x=>{ if(!D.QUESTS[x]) bad.push('bad req quest in '+q.id); });
});
Object.values(D.SHOPS).forEach(v=>v.stock.forEach(o=>item(o.item)));
D.NPCS.forEach(n=>{
  if(n.shop && !D.SHOPS[n.shop]) bad.push('npc bad shop '+n.id);
  if(!D.ZONES[n.zone]) bad.push('npc bad zone '+n.id);
  n.dlg.forEach(e=>{
    if(e.when && !D.QUESTS[e.when.split(':')[1]]) bad.push('npc dlg bad quest in '+n.id+': '+e.when);
    if(e.offer && !D.QUESTS[e.offer]) bad.push('npc bad offer '+n.id);
    if(e.turnin && !D.QUESTS[e.turnin]) bad.push('npc bad turnin '+n.id);
    if(!e.say || !e.say.length) bad.push('npc empty dialogue in '+n.id);
  });
});
D.QUEST_ORDER.forEach(qid=>{
  const q=D.QUESTS[qid];
  if(q.giver && q.giver!=='echo'){
    const n=D.NPCS.find(x=>x.id===q.giver);
    if(!n) bad.push('quest bad giver '+qid);
    else{
      if(!n.dlg.some(e=>e.offer===qid)) bad.push('giver '+q.giver+' never offers '+qid);
      if(!n.dlg.some(e=>e.turnin===qid)) bad.push('giver '+q.giver+' never turns in '+qid);
    }
  }
  const r=q.rewards||{};
  if(r.unlockShop && !D.SHOPS[r.unlockShop]) bad.push('quest bad unlockShop '+qid);
});
Object.values(D.ZONES).forEach(z=>(z.facilities||[]).forEach(f=>{ if(!D.FACILITY_NAMES[f]) bad.push('bad facility in zone '+z.id); }));
D.EVENTS.forEach(e=>{
  if(!D.ZONES[e.zone]) bad.push('event bad zone '+e.id);
  e.skills.forEach(s=>{ if(!D.SKILLS.find(x=>x.id===s)) bad.push('event bad skill '+e.id+': '+s); });
});
// world layout references
const zoneIds = new Set(D.WORLD.regions.map(r=>r.zone));
D.WORLD.regions.forEach(r=>{ if(!D.ZONES[r.zone]) bad.push('world region bad zone '+r.zone); });
D.WORLD.corridors.forEach(c=>{
  if(!zoneIds.has(c.a) || !zoneIds.has(c.b)) bad.push('corridor bad endpoint '+c.a+'-'+c.b);
  if(c.gate && !D.ZONES[c.gate]) bad.push('corridor bad gate zone '+c.gate);
});
D.WORLD.nodes.forEach(n=>{
  if(!D.ACTIONS[n.action]) bad.push('world node bad action '+n.action);
  if(!zoneIds.has(n.zone)) bad.push('world node bad zone '+n.zone);
});
D.WORLD.facilities.forEach(f=>{ if(!D.FACILITY_NAMES[f.f]) bad.push('world facility bad type '+f.f); if(!zoneIds.has(f.zone)) bad.push('world facility bad zone '+f.zone); });
D.WORLD.enemies.forEach(e=>{ if(!D.ENEMIES[e.e]) bad.push('world enemy bad id '+e.e); if(!zoneIds.has(e.zone)) bad.push('world enemy bad zone '+e.zone); });
// every non-quest gather/hack action should exist somewhere in the world
Object.values(D.ACTIONS).filter(a=>(a.type==='gather'||a.type==='hack') && !a.questOnly).forEach(a=>{
  if(!D.WORLD.nodes.some(n=>n.action===a.id)) bad.push('action has no world node: '+a.id);
});
// ---- placement walkability (mirrors world.js walk field math) ----
{
  const W=D.WORLD;
  const regions=W.regions, byZone={}; regions.forEach(r=>byZone[r.zone]=r);
  const sstep=t=>{ t=Math.max(0,Math.min(1,t)); return t*t*(3-2*t); };
  const distSeg=(px,pz,ax,az,bx,bz)=>{ const dx=bx-ax,dz=bz-az,l2=dx*dx+dz*dz; let t=l2?((px-ax)*dx+(pz-az)*dz)/l2:0; t=Math.max(0,Math.min(1,t)); return Math.hypot(px-(ax+dx*t), pz-(az+dz*t)); };
  const walkField=(x,z)=>{ let m=0;
    for(const r of regions) m=Math.max(m, sstep((r.r-Math.hypot(x-r.x,z-r.z))/16));
    for(const c of W.corridors){ const a=byZone[c.a], b=byZone[c.b]; m=Math.max(m, sstep((c.w-distSeg(x,z,a.x,a.z,b.x,b.z))/8)); }
    return m; };
  const waterDepth=(x,z)=>{ let d=0; for(const w of W.water) d=Math.max(d, sstep((w.r-Math.hypot(x-w.x,z-w.z))/9)); return d; };
  const checkSpot=(label,zone,dx,dz,wantWater)=>{
    const r=byZone[zone]; if(!r) return;
    const x=r.x+dx, z=r.z+dz;
    const wf=walkField(x,z), wd=waterDepth(x,z);
    if(wf<0.55) bad.push(`${label} on unwalkable rim (walkField ${wf.toFixed(2)})`);
    if(wantWater && wd<0.4) bad.push(`${label} flagged water but is dry (depth ${wd.toFixed(2)})`);
    if(!wantWater && wd>0.45) bad.push(`${label} is underwater (depth ${wd.toFixed(2)})`);
  };
  D.WORLD.nodes.forEach(n=>checkSpot('node '+n.action+' @'+n.zone, n.zone, n.dx, n.dz, !!n.water));
  D.WORLD.enemies.forEach(e=>checkSpot('enemy '+e.e+' @'+e.zone, e.zone, e.dx, e.dz, false));
  D.WORLD.facilities.forEach(f=>checkSpot('facility '+f.f+' @'+f.zone, f.zone, f.dx, f.dz, false));
  D.NPCS.forEach(n=>checkSpot('npc '+n.id, n.zone, n.dx, n.dz, false));
  (D.WORLD.villages||[]).forEach(v=>checkSpot('village '+v.id, v.zone, v.dx, v.dz, false));
  checkSpot('hangar', D.WORLD.hangar.zone, D.WORLD.hangar.dx, D.WORLD.hangar.dz, false);
  checkSpot('board', D.WORLD.board.zone, D.WORLD.board.dx, D.WORLD.board.dz, false);
  (D.WORLD.plots||[]).forEach((p,i)=>checkSpot('plot#'+i+' @'+p.zone, p.zone, p.dx, p.dz, false));
}
// hydroponics integrity
Object.entries(D.SEEDS).forEach(([id,sd])=>{
  if(!D.ITEMS[id]) bad.push('seed item missing: '+id);
  if(!D.ITEMS[sd.crop]) bad.push('seed crop missing: '+id+' -> '+sd.crop);
});
Object.entries(D.SEED_DROPS).forEach(([flora,seed])=>{
  if(!D.ITEMS[flora]) bad.push('seed-drop flora missing: '+flora);
  if(!D.SEEDS[seed]) bad.push('seed-drop seed missing: '+seed);
});
// every gear item referenced by a craft? (informational only)
console.log(bad.length ? 'PROBLEMS:\n'+bad.join('\n') : 'ALL CROSS-REFERENCES OK');
console.log(`items=${Object.keys(D.ITEMS).length} actions=${Object.keys(D.ACTIONS).length} enemies=${Object.keys(D.ENEMIES).length} zones=${Object.keys(D.ZONES).length} quests=${D.QUEST_ORDER.length}`);
process.exit(bad.length ? 1 : 0);
