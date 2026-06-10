/* ============================================================
   KESSLER REACH — game systems + HUD (3D open-world edition)
   World rendering & navigation live in world.js (KRWorld).
   This file owns rules: skills, items, combat math, missions,
   economy, saves — and the HUD panels around the viewport.
   ============================================================ */
'use strict';

(function(){
const D = KR_DATA;
const SAVE_KEY = 'kessler_reach_save_v1';
const MAXL = D.MAX_LEVEL;

/* ================= helpers ================= */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => Math.floor(n).toLocaleString('en-US');
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const rint = (a,b) => a + Math.floor(Math.random()*(b-a+1));
const skillDef = id => D.SKILLS.find(s=>s.id===id);
function fmtDur(sec){
  sec = Math.max(0, Math.floor(sec));
  if(sec < 90) return sec + 's';
  if(sec < 5400) return Math.floor(sec/60) + 'm ' + (sec%60) + 's';
  return Math.floor(sec/3600) + 'h ' + Math.floor((sec%3600)/60) + 'm';
}

/* ================= xp curve (original) ================= */
const XP_TABLE = (()=>{ const t=[0,0]; let acc=0;
  for(let l=2;l<=MAXL;l++){ acc += Math.floor(80*Math.pow(1.09,l-2)); t[l]=acc; } return t; })();
function levelFor(xp){ let l=1; while(l<MAXL && xp>=XP_TABLE[l+1]) l++; return l; }
function seeded(n){ n|=0; n=n+0x6D2B79F5|0; let t=Math.imul(n^n>>>15,1|n); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }

/* ================= total-level milestones ================= */
const MILESTONES = [
  {sum:150,  desc:'+3% all XP', xpb:0.03},
  {sum:300,  desc:'+5% gathering speed', gspd:0.05},
  {sum:600,  desc:'+25 max hull', hpb:25},
  {sum:900,  desc:'+10% sell prices', sellb:0.10},
  {sum:1200, desc:'+5% more XP and the title “Polymath”', xpb:0.05, title:'Polymath'},
];
function milestoneBonus(key){
  if(!state) return 0;
  let v=0; const tot=totalLevel();
  for(const m of MILESTONES) if(tot>=m.sum && m[key]) v+=m[key];
  return v;
}
function checkMilestones(){
  const tot=totalLevel();
  for(const m of MILESTONES){
    if(tot>=m.sum && !state.milestonesHit.includes(m.sum)){
      state.milestonesHit.push(m.sum);
      if(m.title && !state.title) state.title=m.title;
      toast(`<b>Milestone: total level ${m.sum}!</b>`,'quest', m.desc);
      addLog(`Milestone reached — total level ${m.sum}: ${m.desc}.`,'gold');
      sndQuest();
    }
  }
}

/* ================= the market (daily drift) ================= */
const MARKET_CATS = ['minerals','salvage','flora','catch','meals','stims','gear','tech'];
let _itemCat = null;
function itemCategory(id){
  if(!_itemCat){
    _itemCat = {};
    const bySkill = {extraction:'minerals', salvaging:'salvage', xenobotany:'flora', trawling:'catch'};
    for(const a of Object.values(D.ACTIONS)){
      if(!a.outputs) continue;
      for(const k of Object.keys(a.outputs)){
        if(a.type==='gather' && bySkill[a.skill]) _itemCat[k]=bySkill[a.skill];
        else if(a.skill==='synthesis') _itemCat[k]='meals';
        else if(a.skill==='chemistry') _itemCat[k]='stims';
        else if(a.skill==='fabrication') _itemCat[k] = D.ITEMS[k].slot ? 'gear' : 'minerals';
        else if(a.skill==='engineering') _itemCat[k]='tech';
      }
    }
  }
  return _itemCat[id] || null;
}
function marketMult(id){
  const cat = itemCategory(id);
  if(!cat) return 1;
  const day = Math.floor(Date.now()/86400000);
  return 0.78 + seeded(day*131 + MARKET_CATS.indexOf(cat)*977)*0.5;   // 0.78×–1.28×, drifts daily
}
function sellPrice(id){
  const it = D.ITEMS[id];
  return Math.max(1, Math.round(it.value * marketMult(id) * (1 + milestoneBonus('sellb'))));
}

/* ================= dynamic world events ================= */
function activeEvent(){
  if(!state || !state.event) return null;
  if(Date.now() > state.event.until){ return null; }
  return D.EVENTS.find(e=>e.id===state.event.id) || null;
}
function tickEvents(){
  const now = Date.now();
  if(state.event && now > state.event.until){
    const ev = D.EVENTS.find(e=>e.id===state.event.id);
    if(ev) addLog(`${ev.icon} ${ev.name} has passed.`);
    state.event = null;
    state.nextEventAt = now + (150 + Math.floor(Math.random()*140))*1000;
  }
  if(!state.event){
    if(!state.nextEventAt) state.nextEventAt = now + (60 + Math.floor(Math.random()*90))*1000;
    if(now >= state.nextEventAt){
      const ev = D.EVENTS[Math.floor(Math.random()*D.EVENTS.length)];
      state.event = {id:ev.id, until: now + 150*1000};
      toast(`<b>${ev.icon} ${ev.name}</b> — ${D.ZONES[ev.zone].name}`,'quest', ev.desc);
      addLog(`${ev.icon} ${ev.name} over ${D.ZONES[ev.zone].name}!`,'gold');
      sndLoot();
    }
  }
}

/* ================= state ================= */
let state = null;
const ui = { sideTab:'cargo', sel:null, questSel:null, float:null };
const dirty = { side:false, skills:false, float:false };
function markDirty(...ks){ ks.forEach(k=>dirty[k]=true); }
let autoNext = null; // {eid, t} — re-engage nearest same species after a kill

function freshState(callsign){
  const skills = {};
  D.SKILLS.forEach(s => skills[s.id] = {xp:0});
  return {
    v:2, callsign: callsign||'Drifter', title:'', created:Date.now(), lastSeen:Date.now(),
    credits:25, hp:44,
    skills, cargo:{}, gear:{weapon:null, suit:null, visor:null, multitool:null, gadget:null},
    zone:'meridian', pos:{x:D.WORLD.camp.x, z:D.WORLD.camp.z},
    unlockedZones:[], seenZones:[], visited:[], contracts:[], unlockedShops:[],
    event:null, nextEventAt:0, milestonesHit:[], hints:[],
    action:null, combat:null,
    quests:{}, buffs:[], notifiedQ:[],
    settings:{autoEat:true, eatAt:0.45, sound:true, music:true, vol:{master:0.8, sfx:1, music:0.7}},
    tracked:null, achievements:[],
    log:[], stats:{kills:0, deaths:0, actionsDone:0, crEarned:0, alphaKills:0, contractsDone:0, cachesOpened:0, crits:0, eventXp:0},
  };
}
function migrate(s){
  const f = freshState(s.callsign);
  for(const k in f) if(s[k]===undefined) s[k]=f[k];
  D.SKILLS.forEach(sk => { if(!s.skills[sk.id]) s.skills[sk.id]={xp:0}; });
  for(const k in f.settings) if(s.settings[k]===undefined) s.settings[k]=f.settings[k];
  if(!s.settings.vol || typeof s.settings.vol.master!=='number') s.settings.vol={master:0.8, sfx:1, music:0.7};
  for(const k in f.stats) if(s.stats[k]===undefined) s.stats[k]=f.stats[k];
  if(!s.pos || typeof s.pos.x!=='number') s.pos = {x:D.WORLD.camp.x, z:D.WORLD.camp.z};
  s.combat = null;                  // never resume mid-fight
  if(s.action && !D.ACTIONS[s.action.id]) s.action=null;
  return s;
}
let saveCount = 0;
function save(){
  if(!state) return;
  state.lastSeen = Date.now();
  try{ state.pos = KRWorld.playerPos(); }catch(e){}
  try{
    const json = JSON.stringify(state);
    localStorage.setItem(SAVE_KEY, json);
    if(++saveCount % 10 === 0) localStorage.setItem(SAVE_KEY+'_backup', json);  // rolling safety copy
  }catch(e){}
}

/* ================= derived stats ================= */
const skillXp = id => state.skills[id].xp;
const skillLevel = id => levelFor(skillXp(id));
function effLevel(id){
  let l = skillLevel(id);
  const now = Date.now();
  for(const b of state.buffs) if(b.until>now && b.skills && b.skills.includes(id)) l += b.amt;
  return Math.min(l, MAXL+15);
}
function speedBuff(){ const now=Date.now(); let s=0; for(const b of state.buffs) if(b.until>now && b.speed) s+=b.speed; return s; }
function gearStats(){
  const g = {acc:0, def:0, hpb:0, gspd:0, aspd:0, scan:1, pxp:0, xpb:0};
  for(const slot in state.gear){
    const it = state.gear[slot] ? D.ITEMS[state.gear[slot]] : null;
    if(!it) continue;
    if(slot!=='weapon'){ g.acc+=it.acc||0; }
    g.def+=it.def||0; g.hpb+=it.hpb||0; g.gspd+=it.gspd||0; g.aspd+=it.aspd||0; g.pxp+=it.pxp||0; g.xpb+=it.xpb||0;
    if(it.scan) g.scan*=it.scan;
  }
  return g;
}
const weapon = () => state.gear.weapon ? D.ITEMS[state.gear.weapon] : D.UNARMED;
const maxHp = () => 38 + 6*skillLevel('vitality') + gearStats().hpb + milestoneBonus('hpb');
function pAcc(){ const w=weapon(); return effLevel(w.style)*5 + w.acc + gearStats().acc; }
function pMaxHit(){ const w=weapon(); return Math.round(effLevel(w.style)*0.45) + w.hit; }
function pDef(){ return effLevel('resilience')*4 + gearStats().def; }
function weaponSpd(){ return weapon().spd * (1 - gearStats().aspd); }
function styleRange(st){ return st==='marksmanship' ? 10 : st==='psionics' ? 8 : 3.0; }
const totalLevel = () => D.SKILLS.reduce((t,s)=>t+skillLevel(s.id),0);

/* ================= log / toast / sound ================= */
function addLog(msg, cls){
  state.log.unshift({t:Date.now(), msg, cls:cls||''});
  if(state.log.length>50) state.log.length=50;
  renderLog();
}
function renderLog(){
  $('#logbar').innerHTML = state.log.slice(0,12).map(l=>{
    const d=new Date(l.t);
    const hh=String(d.getHours()).padStart(2,'0'), mm=String(d.getMinutes()).padStart(2,'0');
    return `<div class="log-line ${l.cls}"><span class="lt">${hh}:${mm}</span>${l.msg}</div>`;
  }).join('');
}
function toast(html, cls, sub){
  const t = document.createElement('div');
  t.className = 'toast ' + (cls||'');
  t.innerHTML = html + (sub?`<div class="t-sub">${sub}</div>`:'');
  $('#toasts').appendChild(t);
  setTimeout(()=>{ t.classList.add('out'); setTimeout(()=>t.remove(), 320); }, 3600);
}
let actx = null;
function vols(){ return (state && state.settings.vol) || {master:0.8, sfx:1, music:0.7}; }
function blip(freq, dur, type, gain, delay){
  if(!state || !state.settings.sound) return;
  const v = vols();
  const g0 = (gain||0.035) * v.master * v.sfx;
  if(g0 <= 0.0006) return;
  try{
    actx = actx || new (window.AudioContext||window.webkitAudioContext)();
    const o=actx.createOscillator(), g=actx.createGain(), t0=actx.currentTime+(delay||0);
    o.type=type||'square'; o.frequency.value=freq;
    g.gain.setValueAtTime(g0, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0+(dur||0.09));
    o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0+(dur||0.09)+0.02);
  }catch(e){}
}
// action feedback
const sfxGather = ()=>{ blip(195,.07,'square',.028); };
const sfxCraft  = ()=>{ blip(620,.05,'square',.022); blip(880,.07,'square',.018,.05); };
const sfxEat    = ()=>{ blip(500,.08,'sine',.032); blip(410,.06,'sine',.026,.07); };
const sfxEquip  = ()=>{ blip(440,.06,'square',.028); blip(587,.07,'square',.022,.06); };
const sfxSell   = ()=>{ blip(1240,.09,'sine',.035); };
const sfxHack   = ()=>{ blip(700,.05,'square',.022); blip(932,.06,'square',.018,.06); };
// generative score: sparse pentatonic notes over the ambient pad
let music = null;
function startMusic(){
  if(music || !state || !state.settings.sound || !state.settings.music) return;
  try{
    actx = actx || new (window.AudioContext||window.webkitAudioContext)();
    const g = actx.createGain();
    g.gain.value = 0.05 * vols().master * vols().music;
    g.connect(actx.destination);
    const SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25];
    const timer = setInterval(()=>{
      if(!state || !state.settings.sound || !state.settings.music) return;
      if(Math.random() < 0.35) return;                       // rests keep it airy
      const f = SCALE[Math.floor(Math.random()*SCALE.length)] * (Math.random()<0.18 ? 2 : 1);
      const o = actx.createOscillator(); o.type='triangle'; o.frequency.value = f;
      const eg = actx.createGain(); const t0 = actx.currentTime;
      eg.gain.setValueAtTime(0.0001, t0);
      eg.gain.linearRampToValueAtTime(1, t0+0.06);
      eg.gain.exponentialRampToValueAtTime(0.0001, t0+1.7);
      o.connect(eg); eg.connect(g); o.start(t0); o.stop(t0+1.8);
    }, 1500);
    music = {g, timer};
  }catch(e){}
}
function stopMusic(){
  if(!music) return;
  clearInterval(music.timer);
  try{ music.g.disconnect(); }catch(e){}
  music = null;
}
function updateVolumes(){
  const v = vols();
  if(music) music.g.gain.value = 0.05 * v.master * v.music;
  if(ambient){
    if(ambient.g)  ambient.g.gain.value  = 0.045 * v.master * v.music;
    if(ambient.og) ambient.og.gain.value = 0.013 * v.master * v.music;
  }
}
// procedural ambient bed: filtered wind noise + a low detuned pad
let ambient = null;
function startAmbient(){
  if(ambient || !state || !state.settings.sound) return;
  try{
    actx = actx || new (window.AudioContext||window.webkitAudioContext)();
    if(actx.state==='suspended') actx.resume();
    const len = actx.sampleRate*3;
    const buf = actx.createBuffer(1, len, actx.sampleRate);
    const d = buf.getChannelData(0);
    let last=0;
    for(let i=0;i<len;i++){ const w=Math.random()*2-1; last=(last+0.025*w)/1.025; d[i]=last*3.2; }
    const src=actx.createBufferSource(); src.buffer=buf; src.loop=true;
    const filt=actx.createBiquadFilter(); filt.type='lowpass'; filt.frequency.value=380;
    const g=actx.createGain(); g.gain.value=0.045*vols().master*vols().music;
    src.connect(filt); filt.connect(g); g.connect(actx.destination); src.start();
    const o1=actx.createOscillator(); o1.type='sine'; o1.frequency.value=55;
    const o2=actx.createOscillator(); o2.type='sine'; o2.frequency.value=55.7;
    const og=actx.createGain(); og.gain.value=0.013*vols().master*vols().music;
    o1.connect(og); o2.connect(og); og.connect(actx.destination);
    o1.start(); o2.start();
    ambient={src, o1, o2, g, og};
  }catch(e){}
}
function stopAmbient(){
  if(!ambient) return;
  try{ ambient.src.stop(); ambient.o1.stop(); ambient.o2.stop(); }catch(e){}
  ambient=null;
}
const sndLevel = ()=>{ blip(523,.1); blip(784,.14,'square',.04,.1); };
const sndQuest = ()=>{ blip(523,.09); blip(659,.09,'square',.04,.09); blip(784,.16,'square',.04,.18); };
const sndLoot  = ()=>{ blip(880,.12,'sine',.05); };
const sndDeath = ()=>{ blip(150,.3,'sawtooth',.05); blip(98,.4,'sawtooth',.05,.2); };

/* ================= inventory ================= */
const countItem = id => state.cargo[id]||0;
function addItem(id, qty){
  if(qty<=0) return;
  state.cargo[id] = (state.cargo[id]||0) + qty;
  markDirty('side','float');
}
function removeItem(id, qty){
  const have = countItem(id);
  if(have < qty) return false;
  state.cargo[id] = have - qty;
  if(state.cargo[id]<=0) delete state.cargo[id];
  if(ui.sel===id && !state.cargo[id]) ui.sel=null;
  markDirty('side','float');
  return true;
}
function addCredits(n, report){
  state.credits += n;
  if(n>0) state.stats.crEarned += n;
  if(report) report.credits += n;
}

/* ================= xp ================= */
function gainXp(skill, amt, report){
  let mult = 1 + gearStats().xpb + milestoneBonus('xpb');
  if(skill==='piloting') mult += gearStats().pxp;
  const ev = activeEvent();
  let evBonus = 0;
  if(ev && state.zone===ev.zone && ev.skills.includes(skill)){
    evBonus = Math.round(amt*mult*(ev.mult-1));
    mult *= ev.mult;
  }
  amt = Math.max(1, Math.round(amt*mult));
  if(evBonus>0) state.stats.eventXp += evBonus;
  const before = skillLevel(skill);
  state.skills[skill].xp = Math.min(state.skills[skill].xp + amt, XP_TABLE[MAXL]);
  const after = skillLevel(skill);
  if(report){ report.xp[skill]=(report.xp[skill]||0)+amt; }
  if(after>before){
    if(report){ report.levels[skill]=after; }
    else{
      const sd = skillDef(skill);
      toast(`<b>Level up!</b> ${sd.icon} ${sd.name} is now level <b>${after}</b>.`,'', after===MAXL?'Mastery achieved — the Reach takes note.':'');
      addLog(`${sd.icon} ${sd.name} advanced to level ${after}.`,'good');
      sndLevel();
      flashSkill(skill);
      checkZoneNotify(); checkQuestNotify(); checkMilestones();
      markDirty('float');
    }
    markDirty('skills');
  }
  markDirty('skills');
}

/* ================= buffs ================= */
function resolveBuffSkills(spec){
  if(spec==='gather') return D.GATHER_SKILLS.slice();
  if(spec==='offense') return D.OFFENSE_SKILLS.slice();
  if(spec==='combat') return D.COMBAT_SKILLS.slice();
  return spec ? spec.slice() : null;
}
function applyBuff(b){
  const skills = resolveBuffSkills(b.skills);
  const key = (skills?skills.join(','):'') + '|' + (b.speed||0);
  state.buffs = state.buffs.filter(x => ((x.skills?x.skills.join(','):'')+'|'+(x.speed||0)) !== key);
  state.buffs.push({skills, amt:b.amt||0, speed:b.speed||0, until:Date.now()+b.dur*1000});
}
function pruneBuffs(){
  const now=Date.now();
  state.buffs = state.buffs.filter(b=>b.until>now);
}

/* ================= zones & gates ================= */
function isZoneUnlocked(zid){
  if(!state) return zid==='meridian'||zid==='rustflats';
  const z = D.ZONES[zid];
  if(z.always) return true;
  if(state.unlockedZones.includes(zid)) return true;
  if(!z.pilot && !z.quest) return false;
  const pilotOk = !z.pilot || skillLevel('piloting') >= z.pilot;
  const questOk = !z.quest || (state.quests[z.quest] && state.quests[z.quest].claimed);
  return pilotOk && questOk;
}
function zoneReqText(z){
  const parts=[];
  if(z.pilot) parts.push(`Piloting ${z.pilot}`);
  if(z.quest) parts.push(`mission “${D.QUESTS[z.quest].name}”`);
  return parts.join(' + ');
}
function checkZoneNotify(){
  for(const zid of D.ZONE_ORDER){
    const z=D.ZONES[zid];
    if(z.always || state.seenZones.includes(zid)) continue;
    if(isZoneUnlocked(zid)){
      state.seenZones.push(zid);
      toast(`<b>Gate unlocked:</b> ${z.icon} ${z.name}`, 'quest', 'The barrier is down — walk on through.');
      addLog(`Gate to ${z.name} is now open.`,'gold');
    }
  }
}
function announceRegion(zid){
  const el = $('#regionFade');
  el.textContent = D.ZONES[zid].name;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}

/* ================= actions ================= */
function actionDuration(a){
  let mult = 1 + speedBuff();
  if(a.type==='gather') mult += gearStats().gspd + milestoneBonus('gspd');
  return a.time / mult;
}
function hackChance(a){ return clamp(0.5 + (effLevel('hacking')-a.lvl)*0.03, 0.5, 0.95); }
function hasInputs(a){
  if(!a.inputs) return true;
  for(const k in a.inputs) if(countItem(k) < a.inputs[k]) return false;
  return true;
}
function maxReps(a){
  if(!a.inputs) return -1;
  let m = Infinity;
  for(const k in a.inputs) m = Math.min(m, Math.floor(countItem(k)/a.inputs[k]));
  return m;
}
function actionAvailable(a){
  if(skillLevel(a.skill) < a.lvl) return false;
  if(a.questOnly){
    const q = state.quests[a.questOnly];
    if(!q || !q.started || q.claimed) return false;
  }
  return true;
}
function startAction(id, reps, entUid){
  const a = D.ACTIONS[id];
  if(!a || !actionAvailable(a)) return;
  if(a.inputs && !hasInputs(a)){ toast('<b>Missing materials.</b>','bad'); return; }
  disengage();
  state.action = {id, prog:0, reps: reps||-1, ent: entUid||null};
  KRWorld.startWork(entUid||null);
  markDirty('float');
}
function stopAction(msg){
  if(!state.action) return;
  state.action = null;
  KRWorld.stopWork();
  if(msg) addLog(msg);
  markDirty('float');
}
function completeAction(a, report){
  if(a.inputs) for(const k in a.inputs) removeItem(k, a.inputs[k]);
  let success = true;
  if(a.type==='hack') success = Math.random() < hackChance(a);
  if(success){
    if(a.outputs) for(const k in a.outputs){
      addItem(k, a.outputs[k]);
      if(report) report.items[k]=(report.items[k]||0)+a.outputs[k];
      if(!report && a.type==='gather') KRWorld.splat('player', `+${a.outputs[k]} ${D.ITEMS[k].name}`, 'yield');
      onCraftEvent(a, k, a.outputs[k], report);
    }
    if(a.credits){ addCredits(rint(a.credits[0], a.credits[1]), report); }
    if(a.bonus && Math.random()<a.bonus.chance){
      addItem(a.bonus.item, 1);
      if(report) report.items[a.bonus.item]=(report.items[a.bonus.item]||0)+1;
    }
    if(a.type==='gather'){
      const ch = (1/150) * gearStats().scan;
      if(Math.random()<ch){
        addItem('anomaly_cache',1);
        if(report) report.items.anomaly_cache=(report.items.anomaly_cache||0)+1;
        else { toast('<b>Anomaly Cache</b> found!','quest'); sndLoot(); addLog('Found a sealed Anomaly Cache.','gold'); }
      }
    }
    if(a.type==='craft'){
      const critChance = 0.05 + skillLevel(a.skill)*0.0012;   // 5% → ~17% at level 100
      if(Math.random() < critChance){
        state.stats.crits++;
        for(const k in a.outputs){
          addItem(k, a.outputs[k]);
          if(report) report.items[k]=(report.items[k]||0)+a.outputs[k];
        }
        gainXp(a.skill, Math.round(a.xp*0.5), report);
        if(!report){ KRWorld.splat('player','✦ masterwork','crit'); blip(990,.1,'sine',.04); }
      }
    }
    gainXp(a.skill, a.xp, report);
    if(!report){
      if(a.type==='gather') sfxGather();
      else if(a.type==='craft') sfxCraft();
      else if(a.type==='hack') sfxHack();
    }
    if(a.type==='hack') onHackEvent(a.id, report);
    if(a.type==='pilot') onRunEvent(report);
    if(!report) hintOnce('gather', '<b>Tip:</b> everything you gather stacks in your Cargo Hold — sell it, cook it, or build with it at any settlement workshop.');
  }else{
    gainXp(a.skill, Math.max(1, Math.round(a.xp*0.25)), report);
    const dmg = rint(2, Math.max(4, Math.round(maxHp()*0.08)));
    applyDamage(dmg, 'Security countermeasures zapped you');
    KRWorld.splat('player', dmg, 'hite');
    addLog(`Hack failed on ${a.name} (-${dmg} hull).`,'bad');
  }
  state.stats.actionsDone++;
}
function tickAction(dt){
  const act = state.action;
  if(!act) return;
  const a = D.ACTIONS[act.id];
  if(!a){ state.action=null; return; }
  act.prog += dt;
  const dur = actionDuration(a);
  if(act.prog >= dur){
    act.prog -= dur;
    if(a.inputs && !hasInputs(a)){ stopAction('Ran out of materials.'); return; }
    completeAction(a);
    if(state.action && act.reps>0){
      act.reps--;
      if(act.reps<=0){ stopAction(); return; }
    }
    if(state.action && a.inputs && !hasInputs(a)) stopAction('Ran out of materials.');
    markDirty('float');
  }
}

/* ================= combat (world entities) ================= */
function hintOnce(id, html){
  if(!state.hints) state.hints=[];
  if(state.hints.includes(id)) return;
  state.hints.push(id);
  toast(html, '', '');
}
function engage(ent){
  if(state.combat && state.combat.ent===ent.uid) return;
  stopAction();
  disengage();
  state.combat = {ent:ent.uid, eid:ent.eid, pT:weaponSpd()*0.6, eT:D.ENEMIES[ent.eid].spd*0.8};
  KRWorld.setEngaged(ent, true);
  addLog(`Engaged ${ent.def.name}.`);
  hintOnce('combat', '<b>Tip:</b> auto-eat keeps you alive if you carry meals. Walk away any time to disengage — and craft a weapon at the fabricator if you haven\'t.');
}
function disengage(){
  if(!state.combat) return;
  const e = KRWorld.byUid(state.combat.ent);
  if(e) KRWorld.setEngaged(e, false);
  state.combat = null;
}
function applyDamage(dmg, why){
  state.hp -= dmg;
  if(state.hp<=0) die(why);
}
function die(why){
  state.stats.deaths++;
  const loss = Math.min(1000, Math.floor(state.credits*0.05));
  state.credits -= loss;
  state.hp = maxHp();
  disengage(); stopAction(); closeFloat();
  autoNext = null;
  KRWorld.respawnAtCamp();
  sndDeath();
  toast(`<b>Hull breach!</b> ${why||'You went down'}.`,'bad', `Emergency recall to the Meridian.${loss?` Lost ${fmt(loss)} cr in dropped cargo claims.`:''}`);
  addLog('You were knocked out and recalled to the Meridian wreck.','bad');
}
function onKillEntity(ent, E){
  let cr = rint(E.credits[0], E.credits[1]);
  if(ent.elite){
    cr *= 3;
    state.stats.alphaKills++;
    addItem('anomaly_cache', 1);
    toast(`<b>★ Alpha ${E.name} destroyed!</b>`,'quest','Triple credits and a sealed cache.');
    sndLoot();
  }
  addCredits(cr);
  let lootMsg = [];
  for(const L of (E.loot||[])){
    if(Math.random() < L.chance){
      const q = rint(L.qty[0], L.qty[1]);
      addItem(L.item, q);
      lootMsg.push(`${D.ITEMS[L.item].name}×${q}`);
      if(L.item==='vault_sigil'){ toast(`<b>Vault Sigil</b> recovered! (${countItem('vault_sigil')}/3)`,'quest'); sndLoot(); }
      if(L.item==='anomaly_cache'){ sndLoot(); }
    }
  }
  state.stats.kills++;
  onKillEvent(E.id);
  KRWorld.splat('player', `+${fmt(cr)} cr`, 'cr');
  addLog(`Defeated ${E.name} — ${fmt(cr)} cr${lootMsg.length? ', '+lootMsg.join(', '):''}.`,'good');
  if(E.boss){ toast(`<b>${E.name} destroyed!</b>`,'quest','The Undervault\'s halls fall silent.'); sndQuest(); }
  KRWorld.killEntity(ent);
  state.combat = null;
  autoNext = {eid:E.id, t:1.1};
}
function tickCombat(dt){
  const c = state.combat;
  if(!c) return;
  if(document.hidden) return;            // combat freezes while the tab is hidden — no off-screen deaths
  const ent = KRWorld.byUid(c.ent);
  if(!ent || ent.state==='dead'){ disengage(); return; }
  const E = D.ENEMIES[c.eid];
  const d = KRWorld.distTo(ent);
  if(d > 60){ disengage(); addLog(`Lost ${E.name} in the distance.`); return; }
  const w = weapon();
  const range = styleRange(w.style);
  if(d <= range){
    c.pT -= dt;
    if(c.pT<=0){
      c.pT += weaponSpd();
      if(c.pT<0) c.pT = weaponSpd()*0.5;   // catch up after a long frame without burst-firing
      KRWorld.attackFx('player', ent, w.style);
      const hitChance = clamp(pAcc()/(pAcc()+E.def*1.5+8), .05, .95);
      if(Math.random()<hitChance){
        const dmg = rint(1, pMaxHit());
        ent.hp -= dmg;
        KRWorld.splat(ent, dmg, 'hitp');
        blip(420,.05,'square',.018);
        gainXp(w.style, dmg*2.2);
        gainXp('vitality', dmg*0.9);
        if(ent.hp<=0){ onKillEntity(ent, E); return; }
      }else KRWorld.splat(ent, 'miss', 'miss');
    }
  }else if(d > range+0.5){
    KRWorld.moveToEntity(ent);   // close the distance
  }
  if(d <= 3.4){
    c.eT -= dt;
    if(c.eT<=0){
      c.eT += E.spd;
      KRWorld.attackFx(ent, 'player', null);
      const eAcc = E.acc * (ent.elite?1.25:1);
      const hitChance = clamp(eAcc/(eAcc+pDef()+35), .05, .95);
      if(Math.random()<hitChance){
        const dmg = rint(1, Math.round(E.hit * (ent.elite?1.4:1)));
        KRWorld.splat('player', dmg, 'hite');
        gainXp('resilience', dmg*1.3);
        applyDamage(dmg, `${E.name} tore through your suit`);
      }else KRWorld.splat('player', 'miss', 'miss');
    }
  }
  autoEat();
}

/* ================= eating / items ================= */
function bestMeal(){
  let best=null;
  for(const id in state.cargo){
    const it=D.ITEMS[id];
    if(it && it.type==='meal' && state.cargo[id]>0 && (!best || it.heal>best.heal)) best=it;
  }
  return best;
}
function eat(id){
  const it=D.ITEMS[id];
  if(!it || !it.heal || !removeItem(id,1)) return;
  state.hp = Math.min(maxHp(), state.hp + it.heal);
  sfxEat();
}
function autoEat(){
  if(!state.settings.autoEat || !state.combat) return;
  if(state.hp/maxHp() <= state.settings.eatAt){
    const m = bestMeal();
    if(m){ eat(m.id); KRWorld.splat('player', '+'+m.heal, 'heal'); }
  }
}
function useItem(id){
  const it = D.ITEMS[id];
  if(!it || countItem(id)<1) return;
  if(it.type==='meal'){ eat(id); addLog(`Ate ${it.name} (+${it.heal} hull).`); }
  else if(it.type==='stim'){
    removeItem(id,1);
    if(it.buff) applyBuff(it.buff);
    if(it.heal) state.hp = Math.min(maxHp(), state.hp+it.heal);
    addLog(`Injected ${it.name}.`,'good');
    toast(`<b>${it.name}</b> active.`,'', it.desc);
  }
  else if(it.type==='consumable' && it.open){
    removeItem(id,1);
    state.stats.cachesOpened++;
    const cr = rint(it.open[0], it.open[1]);
    addCredits(cr);
    toast(`<b>Anomaly Cache:</b> ${fmt(cr)} cr inside.`,'quest'); sndLoot();
    addLog(`Opened an Anomaly Cache: ${fmt(cr)} cr.`,'gold');
  }
  markDirty('side');
}
function equipItem(id){
  const it = D.ITEMS[id];
  if(!it || !it.slot || countItem(id)<1) return;
  removeItem(id,1);
  const prev = state.gear[it.slot];
  state.gear[it.slot] = id;
  if(prev) addItem(prev,1);
  state.hp = Math.min(state.hp, maxHp());
  addLog(`Equipped ${it.name}.`);
  sfxEquip();
  markDirty('side');
}
function unequip(slot){
  const id = state.gear[slot];
  if(!id) return;
  state.gear[slot]=null;
  addItem(id,1);
  state.hp = Math.min(state.hp, maxHp());
  markDirty('side');
}
function sellItem(id, qty){
  const it = D.ITEMS[id];
  if(!it || it.value<=0) return;
  qty = qty==='all' ? countItem(id) : Math.min(qty, countItem(id));
  if(qty<=0) return;
  removeItem(id, qty);
  const total = sellPrice(id)*qty;
  addCredits(total);
  sfxSell();
  addLog(`Sold ${it.name}×${qty} for ${fmt(total)} cr.`);
}
function buyOffer(vendorId, idx, qty){
  const v = D.SHOPS[vendorId];
  const o = v ? v.stock[idx] : null;
  if(!o) return;
  qty = qty||1;
  let bought = 0;
  while(bought<qty && state.credits>=o.price){ state.credits-=o.price; addItem(o.item,1); bought++; }
  if(!bought){ toast('<b>Not enough credits.</b>','bad'); return; }
  sfxSell();
  addLog(`Bought ${D.ITEMS[o.item].name}×${bought} from ${v.name} for ${fmt(o.price*bought)} cr.`);
  markDirty('float','side');
}

/* ================= missions ================= */
function questReqsMet(q){
  if(q.reqs.quests) for(const id of q.reqs.quests) if(!state.quests[id] || !state.quests[id].claimed) return false;
  if(q.reqs.skills) for(const k in q.reqs.skills) if(skillLevel(k) < q.reqs.skills[k]) return false;
  return true;
}
function questStatus(q){
  const qs = state.quests[q.id];
  if(qs && qs.claimed) return 'claimed';
  if(qs && qs.started) return questObjectivesDone(q) ? 'complete' : 'active';
  return questReqsMet(q) ? 'available' : 'locked';
}
function objProgress(q, i){
  const o = q.objectives[i];
  const qs = state.quests[q.id];
  if(o.type==='collect') return Math.min(countItem(o.item), o.qty);
  if(o.type==='level') return Math.min(skillLevel(o.skill), o.qty);
  return Math.min((qs && qs.prog[i])||0, o.qty);
}
function questObjectivesDone(q){
  return q.objectives.every((o,i)=>objProgress(q,i)>=o.qty);
}
function startQuest(qid){
  const q = D.QUESTS[qid];
  if(questStatus(q)!=='available') return;
  state.quests[qid] = {started:true, claimed:false, prog:q.objectives.map(()=>0)};
  toast(`<b>Mission accepted:</b> ${q.name}`,'quest'); sndQuest();
  addLog(`Mission accepted: ${q.name}.`,'gold');
  markDirty('side');
}
function bumpQuestCounters(matchFn, amt, report){
  for(const qid of D.QUEST_ORDER){
    const q = D.QUESTS[qid], qs = state.quests[qid];
    if(!qs || !qs.started || qs.claimed) continue;
    let changed=false;
    q.objectives.forEach((o,i)=>{
      if(matchFn(o) && qs.prog[i] < o.qty){ qs.prog[i] = Math.min(o.qty, qs.prog[i]+amt); changed=true; }
    });
    if(changed && !report && questObjectivesDone(q)){
      toast(`<b>${q.name}</b> — objectives complete. Turn it in!`,'quest'); sndQuest();
    }
    if(changed) markDirty('side');
  }
}
function onKillEvent(eid){
  bumpQuestCounters(o=>o.type==='kill' && o.enemy===eid, 1);
  for(const c of state.contracts){
    if(c.kind==='kill' && c.eid===eid && c.have<c.need){
      c.have++;
      if(c.have>=c.need){ toast(`<b>Order filled:</b> ${D.ENEMIES[eid].name}`,'quest','Claim it at the Haven contract board.'); sndQuest(); }
      markDirty('float');
    }
  }
}

/* ================= feats (achievements) ================= */
const ACHIEVEMENTS = [
  {id:'first_blood', icon:'⚔', name:'First Blood',        desc:'Defeat a hostile',                       check:s=>s.stats.kills>=1},
  {id:'century',     icon:'💀', name:'Centurion',          desc:'Defeat 100 hostiles',                    check:s=>s.stats.kills>=100},
  {id:'alpha',       icon:'★',  name:'Alpha Hunter',       desc:'Bring down an ★ Alpha',                  check:s=>s.stats.alphaKills>=1},
  {id:'alpha10',     icon:'🌟', name:'Apex Cull',          desc:'Bring down 10 Alphas',                   check:s=>s.stats.alphaKills>=10},
  {id:'warden',      icon:'👁', name:'Warden Down',        desc:'Defeat WARDEN-7',                        check:s=>s.quests.q7&&s.quests.q7.claimed},
  {id:'story',       icon:'📜', name:'The Whole Truth',    desc:'Finish the campaign',                    check:s=>s.quests.q11&&s.quests.q11.claimed},
  {id:'all_q',       icon:'🏆', name:'Completionist',      desc:'Claim every mission',                    check:s=>D.QUEST_ORDER.every(q=>s.quests[q]&&s.quests[q].claimed)},
  {id:'rich1',       icon:'⬡',  name:'First Fortune',      desc:'Earn 10,000 cr lifetime',                check:s=>s.stats.crEarned>=10000},
  {id:'rich2',       icon:'💰', name:'Magnate',            desc:'Earn 250,000 cr lifetime',               check:s=>s.stats.crEarned>=250000},
  {id:'sk50',        icon:'📈', name:'Specialist',         desc:'Reach level 50 in any skill',            check:s=>D.SKILLS.some(k=>levelFor(s.skills[k.id].xp)>=50)},
  {id:'sk100',       icon:'💯', name:'True Mastery',       desc:'Reach level 100 in any skill',           check:s=>D.SKILLS.some(k=>levelFor(s.skills[k.id].xp)>=100)},
  {id:'tot500',      icon:'Σ',  name:'Well-Rounded',       desc:'Total level 500',                        check:s=>D.SKILLS.reduce((t,k)=>t+levelFor(s.skills[k.id].xp),0)>=500},
  {id:'tot1200',     icon:'🧠', name:'Polymath',           desc:'Total level 1200',                       check:s=>D.SKILLS.reduce((t,k)=>t+levelFor(s.skills[k.id].xp),0)>=1200},
  {id:'work10',      icon:'📋', name:'Reliable',           desc:'Fill 10 work orders',                    check:s=>s.stats.contractsDone>=10},
  {id:'work50',      icon:'🗂', name:'Pillar of Haven',    desc:'Fill 50 work orders',                    check:s=>s.stats.contractsDone>=50},
  {id:'cache10',     icon:'🎁', name:'Anomaly Magnet',     desc:'Open 10 anomaly caches',                 check:s=>s.stats.cachesOpened>=10},
  {id:'crit1',       icon:'✦',  name:'Masterwork',         desc:'Craft a masterwork',                     check:s=>s.stats.crits>=1},
  {id:'crit50',      icon:'⚒',  name:'Signature Series',   desc:'Craft 50 masterworks',                   check:s=>s.stats.crits>=50},
  {id:'charted',     icon:'🗺', name:'Cartographer',       desc:'Chart all seven regions',                check:s=>s.visited.length>=7},
  {id:'friends',     icon:'🤝', name:'Friend of the Reach',desc:'Earn every settlement trader\'s trust',  check:s=>s.unlockedShops.length>=4},
  {id:'storm',       icon:'⚡', name:'Storm Chaser',       desc:'Earn 5,000 bonus XP from world events',  check:s=>s.stats.eventXp>=5000},
  {id:'hardy',       icon:'🛡', name:'Hard to Kill',       desc:'Total level 300 with zero deaths',       check:s=>s.stats.deaths===0 && D.SKILLS.reduce((t,k)=>t+levelFor(s.skills[k.id].xp),0)>=300},
];
function checkAchievements(){
  if(!state) return;
  for(const a of ACHIEVEMENTS){
    if(state.achievements.includes(a.id)) continue;
    let ok=false;
    try{ ok = a.check(state); }catch(e){}
    if(ok){
      state.achievements.push(a.id);
      toast(`<b>🏅 Feat earned: ${a.name}</b>`,'quest', a.desc);
      addLog(`Feat earned — ${a.icon} ${a.name}.`,'gold');
      sndQuest();
      markDirty('side');
    }
  }
}

/* ================= dialogue ================= */
const npcDef = id => D.NPCS.find(n=>n.id===id);
function questGiverLabel(q){
  if(!q.giver || q.giver==='echo') return 'ECHO — your suit AI';
  const n = npcDef(q.giver);
  return n ? `${n.name} — ${D.ZONES[n.zone].name}` : '';
}
function shopUnlocked(vendorId){
  const v = D.SHOPS[vendorId];
  if(!v) return false;
  return !v.gatedBy || state.unlockedShops.includes(vendorId);
}
function pickDlg(npc){
  for(const entry of npc.dlg){
    if(!entry.when) return entry;
    const [st, qid] = entry.when.split(':');
    if(D.QUESTS[qid] && questStatus(D.QUESTS[qid])===st) return entry;
  }
  return npc.dlg[npc.dlg.length-1];
}
function openTalk(npcId, uid){
  ui.float = {type:'talk', npc:npcId, uid, step:0};
  renderFloat();
}

/* ================= work orders (repeatable contracts) =================
   Four rolling slots: two cull bounties, one supply (gather) order,
   one fabrication (craft) order — all scaled to your levels.          */
function combatPower(){ return Math.max(skillLevel('kinetics'), skillLevel('marksmanship'), skillLevel('psionics')); }
function rollContract(kind){
  if(kind==='gather'){
    const pool = Object.values(D.ACTIONS).filter(a=>a.type==='gather' && a.lvl<=skillLevel(a.skill) && a.outputs);
    const a = pool[rint(0, pool.length-1)];
    const item = Object.keys(a.outputs)[0];
    const need = rint(12, 28);
    return {kind:'gather', item, skill:a.skill, need,
      cr:Math.round(D.ITEMS[item].value*need*1.8)+80, xp:Math.round(a.xp*need*0.5)};
  }
  if(kind==='craft'){
    const pool = Object.values(D.ACTIONS).filter(a=>a.type==='craft' && !a.questOnly && a.lvl<=skillLevel(a.skill));
    const a = pool[rint(0, pool.length-1)];
    const item = Object.keys(a.outputs)[0];
    const need = rint(3, 8);
    return {kind:'craft', item, skill:a.skill, need, have:0,
      cr:Math.round(D.ITEMS[item].value*need*2)+120, xp:Math.round(a.xp*need*0.6)};
  }
  const cp = combatPower();
  const pool = Object.values(D.ENEMIES).filter(E=>!E.boss && E.lvl <= cp*1.5+10);
  const E = pool[rint(0, pool.length-1)];
  const need = rint(6, 12);
  return {kind:'kill', eid:E.id, need, have:0, cr:Math.round(E.lvl*need*2.4)+60, xp:Math.round(E.lvl*need*2)};
}
function ensureContracts(){
  state.contracts = (state.contracts||[]).filter(c=>{
    if(!c.kind) c.kind='kill';
    if(c.kind==='kill') return !!D.ENEMIES[c.eid];
    return !!D.ITEMS[c.item];
  });
  const KINDS = ['kill','kill','gather','craft'];
  while(state.contracts.length<4) state.contracts.push(rollContract(KINDS[state.contracts.length]));
}
function contractProgress(c){
  if(c.kind==='gather') return Math.min(countItem(c.item), c.need);
  return Math.min(c.have||0, c.need);
}
function claimContract(i){
  const c = state.contracts[i];
  if(!c || contractProgress(c) < c.need) return;
  if(c.kind==='gather') removeItem(c.item, c.need);
  state.stats.contractsDone++;
  addCredits(c.cr);
  const xpSkill = c.kind==='kill' ? 'vitality' : c.skill;
  gainXp(xpSkill, c.xp);
  const what = c.kind==='kill' ? D.ENEMIES[c.eid].name+' ×'+c.need : D.ITEMS[c.item].name+' ×'+c.need;
  addLog(`Work order filled: ${what} — ${fmt(c.cr)} cr.`,'gold');
  toast(`<b>Order paid:</b> ${fmt(c.cr)} cr`,'quest', `+${fmt(c.xp)} ${skillDef(xpSkill).name} xp. A new order is posted.`);
  sndQuest();
  state.contracts[i] = rollContract(c.kind);
  markDirty('float','side');
}
function onCraftEvent(a, item, qty, report){
  if(a.type!=='craft') return;
  bumpQuestCounters(o=>o.type==='craft' && o.item===item, qty, report);
  for(const c of state.contracts){
    if(c.kind==='craft' && c.item===item && c.have<c.need){
      c.have = Math.min(c.need, c.have+qty);
      if(c.have>=c.need && !report){ toast(`<b>Order filled:</b> ${D.ITEMS[item].name}`,'quest','Claim it at the Haven contract board.'); sndQuest(); }
      markDirty('float');
    }
  }
}
function onHackEvent(aid, report){ bumpQuestCounters(o=>o.type==='hack' && o.action===aid, 1, report); }
function onRunEvent(report){ bumpQuestCounters(o=>o.type==='run', 1, report); }
function claimQuest(qid){
  const q = D.QUESTS[qid];
  if(questStatus(q)!=='complete') return;
  for(const o of q.objectives) if(o.type==='collect') removeItem(o.item, o.qty);
  const r = q.rewards||{};
  if(r.credits) addCredits(r.credits);
  if(r.xp) for(const k in r.xp) gainXp(k, r.xp[k]);
  if(r.items) for(const k in r.items){ addItem(k, r.items[k]); }
  if(r.unlockZone && !state.unlockedZones.includes(r.unlockZone)) state.unlockedZones.push(r.unlockZone);
  if(r.unlockShop && !state.unlockedShops.includes(r.unlockShop)) state.unlockedShops.push(r.unlockShop);
  if(r.title) state.title = r.title;
  state.quests[qid].claimed = true;
  sndQuest();
  const rewardBits = [];
  if(r.credits) rewardBits.push(fmt(r.credits)+' cr');
  if(r.items) for(const k in r.items) rewardBits.push(D.ITEMS[k].name);
  if(r.unlockZone) rewardBits.push('access to '+D.ZONES[r.unlockZone].name);
  if(r.unlockShop) rewardBits.push(D.SHOPS[r.unlockShop].name+' will trade with you');
  if(r.title) rewardBits.push('title “'+r.title+'”');
  toast(`<b>Mission complete:</b> ${q.name}`,'quest', rewardBits.join(' · '));
  addLog(`Mission complete: ${q.name}.`,'gold');
  checkZoneNotify(); checkQuestNotify();
  renderTop(); renderSide();
}
function checkQuestNotify(){
  for(const qid of D.QUEST_ORDER){
    const q = D.QUESTS[qid];
    if(state.notifiedQ.includes(qid)) continue;
    if(questStatus(q)==='available'){
      state.notifiedQ.push(qid);
      const who = (!q.giver || q.giver==='echo') ? 'Check your mission journal.' : `Speak to ${npcDef(q.giver).name} at ${D.ZONES[npcDef(q.giver).zone].name}.`;
      toast(`<b>New mission available:</b> ${q.name}`,'quest', who);
    }
  }
}

/* ================= offline progress ================= */
function applyOffline(){
  const away = (Date.now() - (state.lastSeen||Date.now()))/1000;
  if(away < 60 || !state.action) return null;
  const a = D.ACTIONS[state.action.id];
  if(!a || a.type==='hack') return null;
  const dur = actionDuration(a);
  let n = Math.floor(Math.min(away, 6*3600)/dur);
  if(state.action.reps>0) n = Math.min(n, state.action.reps);
  const mr = maxReps(a);
  if(mr>=0) n = Math.min(n, mr);
  if(n<=0) return null;
  const report = {xp:{}, items:{}, credits:0, levels:{}, n, away, action:a};
  for(let i=0;i<n;i++) completeAction(a, report);
  if(state.action && state.action.reps>0){
    state.action.reps -= n;
    if(state.action.reps<=0) state.action=null;
  }
  if(a.inputs && !hasInputs(a)) state.action=null;
  return report;
}

/* ================= world API (hooks for world.js) ================= */
const FACILITY_EMOJI = {fabricator:'🏭', galley:'🍜', chemlab:'🧪', bench:'⚙'};
const worldApi = {
  getState: ()=>state,
  isZoneUnlocked,
  getEvent(){ const ev=activeEvent(); return ev ? {zone:ev.zone, icon:ev.icon} : null; },
  combatTarget: ()=> state && state.combat ? state.combat.ent : null,
  actionProgress(){
    if(!state || !state.action) return null;
    const a = D.ACTIONS[state.action.id];
    return {pct: clamp(state.action.prog/actionDuration(a),0,1), label:a.name};
  },
  onMove(){
    if(!state) return;
    stopAction();
    disengage();
    autoNext = null;
  },
  onTarget(ent){
    if(!state) return;
    stopAction();
    autoNext = null;
    if(!(ent.kind==='enemy' && state.combat && state.combat.ent===ent.uid)) disengage();
  },
  onAggro(ent){
    if(!state || state.combat || document.hidden) return;
    engage(ent);
    toast(`<b>Ambush!</b> ${ent.def.name} locked onto you.`,'bad');
  },
  onLeash(ent){
    if(state && state.combat && state.combat.ent===ent.uid){
      disengage();
      addLog(`${ent.def.name} broke off pursuit and returned to its post.`);
    }
  },
  onRegionChange(zid){
    if(!state) return;
    state.zone = zid;
    renderTop();
    announceRegion(zid);
    if(!state.visited.includes(zid)){
      state.visited.push(zid);
      gainXp('piloting', 150);
      toast(`<b>Region charted:</b> ${D.ZONES[zid].icon} ${D.ZONES[zid].name}`, 'quest', '+150 Piloting XP added to your flight log.');
      addLog(`Charted ${D.ZONES[zid].name} (+150 Piloting xp).`,'gold');
    }
  },
  interact(ent){
    if(!state) return;
    if(ent.kind==='node'){
      const a = D.ACTIONS[ent.action];
      if(skillLevel(a.skill) < a.lvl){ toast(`<b>Requires ${skillDef(a.skill).name} ${a.lvl}.</b>`,'bad'); return; }
      if(a.questOnly && !actionAvailable(a)) { toast('<b>Nothing here right now.</b>','bad'); return; }
      startAction(a.id, -1, ent.uid);
    }
    else if(ent.kind==='facility') openFloat({type:'workshop', f:ent.f, uid:ent.uid});
    else if(ent.kind==='npc') openTalk(ent.npcId, ent.uid);
    else if(ent.kind==='hangar') openFloat({type:'hangar', uid:ent.uid});
    else if(ent.kind==='board') openFloat({type:'board', uid:ent.uid});
    else if(ent.kind==='enemy') engage(ent);
    else if(ent.kind==='gate'){
      if(!isZoneUnlocked(ent.zone)){
        const z = D.ZONES[ent.zone];
        toast(`<b>Gate sealed:</b> ${z.name}`,'bad', 'Requires '+zoneReqText(z));
      }
    }
  },
  hint(ent){
    if(!state) return {text:''};
    if(ent.kind==='node'){
      const a = ent.def, sd = skillDef(a.skill);
      const ok = skillLevel(a.skill) >= a.lvl;
      return {text:`${a.icon} ${a.name}`, sub:`${sd.name} ${a.lvl} · ${a.xp} xp`, ok};
    }
    if(ent.kind==='enemy') return {text:`${ent.def.icon} ${ent.def.name}`, sub:`level ${ent.def.lvl} · ${ent.def.hp} hull`, ok:true};
    if(ent.kind==='facility') return {text:`${FACILITY_EMOJI[ent.f]} ${D.FACILITY_NAMES[ent.f]}`, sub:'open workshop', ok:true};
    if(ent.kind==='npc'){
      const n = npcDef(ent.npcId);
      const q = D.QUEST_ORDER.map(id=>D.QUESTS[id]).find(q=>q.giver===ent.npcId && ['available','complete'].includes(questStatus(q)));
      return {text:`${n.icon} ${n.name}`, sub:(q?'❗ ':'')+n.role, ok:true};
    }
    if(ent.kind==='hangar') return {text:'🚀 Hangar Pad', sub:'flight contracts (Piloting)', ok:true};
    if(ent.kind==='board') return {text:'📋 Contract Board', sub:'repeatable bounties', ok:true};
    if(ent.kind==='gate'){
      const z = D.ZONES[ent.zone];
      const open = isZoneUnlocked(ent.zone);
      return {text:`${open?'🟢':'⛔'} Gate: ${z.name}`, sub: open?'open':'requires '+zoneReqText(z), ok:open};
    }
    return {text:''};
  },
};

/* ================= rendering: top / skills / log ================= */
function renderTop(){
  $('#topCallsign').innerHTML = esc(state.callsign) + (state.title?`<span class="title-tag">⟨${esc(state.title)}⟩</span>`:'');
  $('#topZone').textContent = D.ZONES[state.zone].icon+' '+D.ZONES[state.zone].name;
  $('#btnSound').classList.toggle('off', !state.settings.sound);
  updateTopDynamic();
}
function updateTopDynamic(){
  $('#topCredits').textContent = fmt(state.credits);
  const mh = maxHp(), pct = clamp(state.hp/mh,0,1);
  const fill = $('#topHpFill');
  fill.style.width = (pct*100)+'%';
  fill.classList.toggle('low', pct<=0.3);
  $('#topHpText').textContent = `${Math.ceil(state.hp)} / ${mh}`;
  const now = Date.now();
  let chips = state.buffs.filter(b=>b.until>now).map(b=>{
    const what = b.speed ? `+${Math.round(b.speed*100)}% speed` : `+${b.amt} ${b.skills.length>3?'multi':b.skills.map(s=>skillDef(s).name).join('/')}`;
    return `<span class="buff-chip">💉 ${what} · ${fmtDur((b.until-now)/1000)}</span>`;
  }).join('');
  const ev = activeEvent();
  if(ev) chips = `<span class="buff-chip event">${ev.icon} ${ev.name} · ${D.ZONES[ev.zone].name} · ${fmtDur((state.event.until-now)/1000)}</span>` + chips;
  $('#topBuffs').innerHTML = chips;
}
function renderSkills(){
  $('#totalLevel').textContent = 'Σ '+fmt(totalLevel());
  $('#skillList').innerHTML = D.SKILLS.map(s=>{
    const lvl = skillLevel(s.id), xp = skillXp(s.id);
    const cur = XP_TABLE[lvl], next = lvl>=MAXL ? cur : XP_TABLE[lvl+1];
    const pct = lvl>=MAXL ? 100 : ((xp-cur)/(next-cur))*100;
    const eff = effLevel(s.id);
    return `<div class="skill-row" data-skill="${s.id}" id="sk-${s.id}" title="${esc(s.desc)}\n${fmt(xp)} xp${lvl<MAXL?' — next level at '+fmt(next):' — MAX'}">
      <span class="skill-ico">${s.icon}</span><span class="skill-name">${s.name}</span>
      <span class="skill-lvl">${lvl}${eff>lvl?'<span style="color:var(--gold)">+</span>':''}</span>
      <span class="skill-bar"><i style="width:${pct}%"></i></span>
    </div>`;
  }).join('');
}
function flashSkill(id){
  const el = $('#sk-'+id);
  if(el){ el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
}

/* ================= floating panel (workshop / shop / hangar) ================= */
function openFloat(f){ ui.float = f; renderFloat(); }
function closeFloat(){ if(ui.float){ ui.float=null; renderFloat(); } }
function ioLine(a){
  const bits = [];
  if(a.inputs) for(const k in a.inputs){
    const have = countItem(k), need = a.inputs[k];
    bits.push(`<span>${D.ITEMS[k].icon} ${D.ITEMS[k].name} <span class="have ${have>=need?'':'no'}">${fmt(have)}/${need}</span></span>`);
  }
  return bits.join('');
}
function gearStatLine(it){
  const bits=[];
  if(it.style) bits.push(skillDef(it.style).icon+' '+skillDef(it.style).name);
  if(it.acc) bits.push('acc +'+it.acc);
  if(it.hit) bits.push('hit '+it.hit);
  if(it.spd) bits.push(it.spd+'s');
  if(it.def) bits.push('def +'+it.def);
  if(it.hpb) bits.push('hull +'+it.hpb);
  if(it.gspd) bits.push('+'+Math.round(it.gspd*100)+'% gather speed');
  if(it.aspd) bits.push('+'+Math.round(it.aspd*100)+'% attack speed');
  if(it.scan) bits.push('×'+it.scan+' anomaly find');
  if(it.pxp) bits.push('+'+Math.round(it.pxp*100)+'% piloting xp');
  if(it.xpb) bits.push('+'+Math.round(it.xpb*100)+'% all xp');
  return bits.join(' · ');
}
function recipeRow(a){
  const lvl = skillLevel(a.skill);
  const locked = lvl < a.lvl;
  const active = state.action && state.action.id===a.id;
  const dur = actionDuration(a);
  const sd = skillDef(a.skill);
  const can = !locked && hasInputs(a);
  const mr = maxReps(a);
  const outId = a.outputs ? Object.keys(a.outputs)[0] : null;
  const outIt = outId ? D.ITEMS[outId] : null;
  const gearLine = outIt && outIt.slot ? gearStatLine(outIt) : (outIt && outIt.heal?`heals ${outIt.heal}`:'');
  const pct = active ? clamp(state.action.prog/dur*100,0,100) : 0;
  return `<div class="act-card ${locked?'locked':''} ${active?'active':''}">
    <div class="act-top"><span class="act-ico">${a.icon}</span><span class="act-name">${a.name}</span>
      <span class="act-lvl ${locked?'no':''}">${sd.icon} ${a.lvl}</span></div>
    <div class="act-io">${ioLine(a)}</div>
    <div class="act-meta">${a.xp} xp · ${dur.toFixed(1)}s${gearLine?' · '+gearLine:''}</div>
    <div class="bar"><i id="bar-${a.id}" style="width:${pct}%"></i></div>
    <div class="act-foot">
      ${active ? `<button class="btn danger" data-stop="1">Stop</button><span class="act-meta">${state.action.reps>0?state.action.reps+' left':''}</span>`
      : locked ? `<button class="btn" disabled>Requires ${sd.name} ${a.lvl}</button>`
      : `<button class="btn primary tiny" data-start="${a.id}" data-reps="1" ${can?'':'disabled'}>×1</button>
         <button class="btn tiny" data-start="${a.id}" data-reps="5" ${can?'':'disabled'}>×5</button>
         <button class="btn tiny" data-start="${a.id}" data-reps="${mr}" ${can?'':'disabled'}>All${mr>0?' ('+mr+')':''}</button>`}
    </div>
  </div>`;
}
function pilotRow(a){
  const lvl = skillLevel(a.skill);
  const locked = lvl < a.lvl;
  const active = state.action && state.action.id===a.id;
  const dur = actionDuration(a);
  const pct = active ? clamp(state.action.prog/dur*100,0,100) : 0;
  return `<div class="act-card ${locked?'locked':''} ${active?'active':''}">
    <div class="act-top"><span class="act-ico">${a.icon}</span><span class="act-name">${a.name}</span>
      <span class="act-lvl ${locked?'no':''}">🚀 ${a.lvl}</span></div>
    <div class="act-meta">${a.xp} xp · ${dur.toFixed(1)}s · ${fmt(a.credits[0])}–${fmt(a.credits[1])} cr</div>
    <div class="act-meta" style="color:var(--faint); font-style:italic;">${a.flavor||''}</div>
    <div class="bar"><i id="bar-${a.id}" style="width:${pct}%"></i></div>
    <div class="act-foot">${active
      ? '<button class="btn danger" data-stop="1">Land</button>'
      : locked ? `<button class="btn" disabled>Requires Piloting ${a.lvl}</button>`
      : `<button class="btn primary" data-start="${a.id}">Fly</button>`}</div>
  </div>`;
}
function renderFloat(){
  const el = $('#floatPanel');
  if(!ui.float){ el.classList.add('hidden'); el.innerHTML=''; return; }
  el.classList.remove('hidden');
  const oldBody = el.querySelector('.fp-body');
  const keepScroll = oldBody ? oldBody.scrollTop : 0;
  let title='', body='';
  if(ui.float.type==='workshop'){
    const f = ui.float.f;
    const sk = {fabricator:'fabrication', galley:'synthesis', chemlab:'chemistry', bench:'engineering'}[f];
    const sd = skillDef(sk);
    title = `${FACILITY_EMOJI[f]} ${D.FACILITY_NAMES[f]} — ${sd.name} ${skillLevel(sk)}`;
    const recipes = Object.values(D.ACTIONS)
      .filter(a=>a.type==='craft' && a.facility===f)
      .filter(a=>!a.questOnly || actionAvailable(a))
      .sort((x,y)=>x.lvl-y.lvl);
    body = recipes.map(recipeRow).join('');
  }else if(ui.float.type==='shop'){
    const vendor = D.SHOPS[ui.float.vendor];
    title = `⬡ ${vendor.name}`;
    body = vendor.stock.map((o,i)=>{
      const it=D.ITEMS[o.item];
      return `<div class="shop-row"><span class="shop-ico">${it.icon}</span>
        <div><div class="shop-name">${it.name}</div><div class="shop-desc">${it.desc}</div></div>
        <span class="shop-price">${fmt(o.price)} cr</span>
        <button class="btn primary tiny" data-buy="${i}" ${state.credits>=o.price?'':'disabled'}>Buy</button>
        <button class="btn tiny" data-buy="${i}" data-buyq="5" ${state.credits>=o.price?'':'disabled'}>×5</button></div>`;
    }).join('');
    const day = Math.floor(Date.now()/86400000);
    const report = MARKET_CATS.map((c,i)=>{
      const m = 0.78 + seeded(day*131 + i*977)*0.5;
      return `<span style="color:${m>=1?'var(--xp)':'var(--bad)'}">${c} ${Math.round(m*100)}%</span>`;
    }).join(' · ');
    body += `<div class="empty-note">Today's market: ${report}</div>
      <div class="empty-note">Sell from your Cargo Hold — the uplink pays today's rates.</div>`;
  }else if(ui.float.type==='talk'){
    const npc = npcDef(ui.float.npc);
    const entry = pickDlg(npc);
    const lines = entry.say;
    const step = Math.min(ui.float.step, lines.length-1);
    const last = step >= lines.length-1;
    title = `${npc.icon} ${npc.name}`;
    const btns = [];
    if(!last) btns.push('<button class="btn primary" data-dlgnext="1">▸ Continue</button>');
    else{
      if(entry.offer) btns.push(`<button class="btn primary" data-dlgaccept="${entry.offer}">Accept: ${D.QUESTS[entry.offer].name}</button>`);
      if(entry.turnin) btns.push(`<button class="btn gold" data-dlgturnin="${entry.turnin}">Turn in: ${D.QUESTS[entry.turnin].name}</button>`);
      if(npc.shop && shopUnlocked(npc.shop)) btns.push('<button class="btn" data-dlgtrade="1">⬡ Trade</button>');
      btns.push('<button class="btn" data-closefloat="1">Leave</button>');
    }
    body = `<div class="talk-role">${npc.role}</div>
      <div class="talk-text">“${lines[step]}”</div>
      <div class="talk-dots">${lines.map((_,i)=>`<span class="${i<=step?'on':''}"></span>`).join('')}</div>
      <div class="talk-btns">${btns.join('')}</div>`;
  }else if(ui.float.type==='hangar'){
    title = `🚀 Hangar Pad — Piloting ${skillLevel('piloting')}`;
    const runs = Object.values(D.ACTIONS).filter(a=>a.type==='pilot').sort((x,y)=>x.lvl-y.lvl);
    body = runs.map(pilotRow).join('');
  }else if(ui.float.type==='board'){
    title = '📋 Contract Board';
    ensureContracts();
    body = state.contracts.map((c,i)=>{
      const p = contractProgress(c);
      const done = p>=c.need;
      let icon, label, meta, xpName;
      if(c.kind==='kill'){
        const E = D.ENEMIES[c.eid];
        icon=E.icon; label=`Cull: ${E.name}`; xpName='Vitality';
        meta=`Defeat ${c.need} — found in ${E.zones.map(z=>D.ZONES[z].name).join(', ')}`;
      }else if(c.kind==='gather'){
        const it=D.ITEMS[c.item];
        icon=it.icon; label=`Supply: ${it.name}`; xpName=skillDef(c.skill).name;
        meta=`Deliver ${c.need} (${skillDef(c.skill).name}) — consumed on claim`;
      }else{
        const it=D.ITEMS[c.item];
        icon=it.icon; label=`Fabricate: ${it.name}`; xpName=skillDef(c.skill).name;
        meta=`Craft ${c.need} fresh (${skillDef(c.skill).name})`;
      }
      return `<div class="act-card ${done?'active':''}">
        <div class="act-top"><span class="act-ico">${icon}</span><span class="act-name">${label}</span></div>
        <div class="act-meta">${meta}</div>
        <div class="act-meta" style="color:var(--gold)">Pays: ${fmt(c.cr)} cr · ${fmt(c.xp)} ${xpName} xp</div>
        <div class="bar"><i style="width:${clamp(p/c.need*100,0,100)}%"></i></div>
        <div class="act-foot">${done
          ? `<button class="btn gold" data-contract="${i}">Claim payment</button>`
          : `<span class="act-meta">${fmt(p)}/${c.need}</span>`}</div>
      </div>`;
    }).join('');
    body += `<div class="empty-note">Orders refresh when claimed and scale with your skills. Something for every trade.</div>`;
  }
  el.innerHTML = `<div class="fp-head"><span>${title}</span><button class="icon-btn" data-closefloat="1">✕</button></div><div class="fp-body">${body}</div>`;
  const newBody = el.querySelector('.fp-body');
  if(newBody) newBody.scrollTop = keepScroll;
}

/* ================= side panel ================= */
const SIDE_TABS = [
  {id:'cargo', label:'Cargo'},
  {id:'gear', label:'Gear'},
  {id:'missions', label:'Missions'},
  {id:'map', label:'Map'},
  {id:'feats', label:'Feats'},
];
function renderSideTabs(){
  const qReady = D.QUEST_ORDER.filter(q=>['available','complete'].includes(questStatus(D.QUESTS[q]))).length;
  $('#sideTabs').innerHTML = SIDE_TABS.map(t=>
    `<button data-sidetab="${t.id}" class="${ui.sideTab===t.id?'on':''}">${t.label}${t.id==='missions'&&qReady?`<span class="tab-n">●${qReady}</span>`:''}</button>`
  ).join('');
}
function renderSide(){
  renderSideTabs();
  const el = $('#sideContent');
  const st = el.scrollTop;
  let html='';
  if(ui.sideTab==='cargo') html = cargoHtml();
  else if(ui.sideTab==='gear') html = gearHtml();
  else if(ui.sideTab==='missions') html = missionsHtml();
  else if(ui.sideTab==='map') html = `<canvas id="mmap" width="330" height="330" style="width:100%; border-radius:10px;"></canvas>
    <div class="empty-note"><span style="color:var(--acc)">⬤</span> open gate · <span style="color:var(--bad)">⬤</span> sealed gate · <span style="color:var(--gold)">▪</span> settlement · <span style="color:var(--gold)">◌</span> live event<br>Walk there — no teleports in the Reach.</div>`;
  else if(ui.sideTab==='feats'){
    const earned = state.achievements.length;
    html = `<div class="empty-note" style="padding:8px;">🏅 ${earned} / ${ACHIEVEMENTS.length} feats earned</div>`;
    html += ACHIEVEMENTS.map(a=>{
      const got = state.achievements.includes(a.id);
      return `<div class="quest-row" style="${got?'':'opacity:.45'}">
        <div class="q-top"><span style="font-size:16px; margin-right:4px;">${a.icon}</span>
        <span class="q-name">${a.name}</span><span class="q-state ${got?'complete':'locked'}">${got?'earned':'—'}</span></div>
        <div class="q-body">${a.desc}</div>
      </div>`;
    }).join('');
  }
  el.innerHTML = html;
  el.scrollTop = st;
  if(ui.sideTab==='map'){ const cv=$('#mmap'); if(cv) KRWorld.drawMinimap(cv); }
}
function cargoHtml(){
  const ids = Object.keys(state.cargo).filter(id=>state.cargo[id]>0);
  ids.sort((a,b)=>D.ITEMS[a].name.localeCompare(D.ITEMS[b].name));
  let html = ids.length
    ? `<div class="item-grid">${ids.map(id=>{
        const it=D.ITEMS[id];
        return `<div class="item-cell ${ui.sel===id?'sel':''}" data-sel="${id}" title="${esc(it.name)} ×${fmt(state.cargo[id])}">${it.icon}<span class="item-qty">${state.cargo[id]>999?fmt(state.cargo[id]/1000)+'k':fmt(state.cargo[id])}</span></div>`;
      }).join('')}</div>`
    : '<div class="empty-note">Cargo hold is empty. Get out there.</div>';
  const it = ui.sel ? D.ITEMS[ui.sel] : null;
  if(it && countItem(it.id)>0){
    const btns = [];
    if(it.slot) btns.push(`<button class="btn primary tiny" data-equip="${it.id}">Equip</button>`);
    if(it.type==='meal') btns.push(`<button class="btn primary tiny" data-use="${it.id}">Eat</button>`);
    if(it.type==='stim') btns.push(`<button class="btn primary tiny" data-use="${it.id}">Inject</button>`);
    if(it.type==='consumable') btns.push(`<button class="btn primary tiny" data-use="${it.id}">Open</button>`);
    const mp = it.value>0 ? sellPrice(it.id) : 0;
    if(it.value>0){
      btns.push(`<button class="btn gold tiny" data-sell="${it.id}" data-qty="1">Sell 1 (${fmt(mp)})</button>`);
      btns.push(`<button class="btn gold tiny" data-sell="${it.id}" data-qty="10">Sell 10</button>`);
      btns.push(`<button class="btn gold tiny" data-sell="${it.id}" data-qty="all">Sell all</button>`);
    }
    const stat = it.slot ? gearStatLine(it) : it.heal ? 'Heals '+it.heal+' hull' : '';
    let compare = '';
    if(it.slot){
      const eqId = state.gear[it.slot];
      const eq = eqId ? D.ITEMS[eqId] : (it.slot==='weapon' ? D.UNARMED : {});
      if(eqId!==it.id){
        const diffs = [['acc','acc'],['hit','max hit'],['def','def'],['hpb','hull'],['gspd','gather'],['aspd','atk spd'],['xpb','xp']]
          .map(([k,label])=>{
            const dv=(it[k]||0)-(eq[k]||0);
            if(!dv) return null;
            const pct = (k==='gspd'||k==='aspd'||k==='xpb');
            const val = pct ? Math.round(dv*100)+'%' : dv;
            return `<span style="color:${dv>0?'var(--xp)':'var(--bad)'}">${dv>0?'▲':'▼'} ${label} ${dv>0?'+':''}${val}</span>`;
          }).filter(Boolean);
        if(diffs.length) compare = `<div class="d-stats">vs equipped: ${diffs.join(' · ')}</div>`;
      }
    }
    const mm = it.value>0 ? marketMult(it.id) : 1;
    const mline = (it.value>0 && itemCategory(it.id))
      ? `<div class="d-stats" style="color:${mm>=1?'var(--xp)':'var(--bad)'}">Market: ${mm>=1?'▲':'▼'} ${Math.round(mm*100)}% of list today</div>` : '';
    html += `<div class="detail">
      <div><span class="d-name">${it.icon} ${it.name}</span><span class="d-type">${it.type}${it.value>0?' · '+fmt(it.value)+' cr':''}</span></div>
      <div class="d-desc">${it.desc}</div>
      ${stat?`<div class="d-stats">${stat}</div>`:''}
      ${compare}
      ${mline}
      <div class="d-btns">${btns.join('')}</div>
    </div>`;
  }
  return html;
}
function gearHtml(){
  const SLOTS = [['weapon','Weapon'],['suit','Suit'],['visor','Visor'],['multitool','Multitool'],['gadget','Gadget']];
  const w = weapon(), g = gearStats();
  let html = '<div class="gear-grid">';
  html += SLOTS.map(([slot,label])=>{
    const id = state.gear[slot];
    const it = id?D.ITEMS[id]:null;
    return `<div class="gear-slot" data-unequip="${slot}" title="${it?'Click to unequip':'Empty slot'}">
      <div class="gs-label">${label}</div>
      ${it?`<div class="gs-item">${it.icon} ${it.name}</div><div class="gs-stat">${gearStatLine(it)}</div>`
          :`<div class="gs-item none">${slot==='weapon'?'Bare hands':'— empty —'}</div>`}
    </div>`;
  }).join('');
  html += '</div>';
  html += `<div class="stat-sheet">
    <div class="stat-line"><span>Combat style</span><b>${skillDef(w.style).icon} ${skillDef(w.style).name}</b></div>
    <div class="stat-line"><span>Accuracy</span><b>${pAcc()}</b></div>
    <div class="stat-line"><span>Max hit</span><b>${pMaxHit()}</b></div>
    <div class="stat-line"><span>Attack interval</span><b>${weaponSpd().toFixed(2)}s</b></div>
    <div class="stat-line"><span>Attack range</span><b>${styleRange(w.style)}m</b></div>
    <div class="stat-line"><span>Defense</span><b>${pDef()}</b></div>
    <div class="stat-line"><span>Max hull</span><b>${maxHp()}</b></div>
    <div class="stat-line"><span>Gather speed bonus</span><b>+${Math.round((g.gspd+speedBuff())*100)}%</b></div>
    <div class="stat-line"><span>XP bonus</span><b>+${Math.round(g.xpb*100)}%</b></div>
    <div class="stat-line"><span>Auto-eat</span><b>${state.settings.autoEat?'on, below '+Math.round(state.settings.eatAt*100)+'%':'off'}</b></div>
  </div>`;
  const tot = totalLevel();
  const next = MILESTONES.find(m=>tot<m.sum);
  html += `<div class="stat-sheet" style="margin-top:8px;">
    <div class="stat-line"><span>Total level</span><b>${fmt(tot)}</b></div>
    ${next
      ? `<div class="stat-line"><span>Next milestone (Σ${next.sum})</span><b>${next.desc}</b></div>
         <div class="bar" style="margin-top:6px;"><i style="width:${clamp(tot/next.sum*100,0,100)}%"></i></div>`
      : '<div class="stat-line"><span>Milestones</span><b>all reached — Polymath</b></div>'}
  </div>`;
  return html;
}
function missionsHtml(){
  return D.QUEST_ORDER.map(qid=>{
    const q = D.QUESTS[qid];
    const stat = questStatus(q);
    const sel = ui.questSel===qid;
    let body='';
    if(sel){
      body += `<div class="q-body">${q.blurb}</div>`;
      if(stat==='locked'){
        const reqBits=[];
        if(q.reqs.quests) q.reqs.quests.forEach(r=>{ if(!state.quests[r]||!state.quests[r].claimed) reqBits.push('mission “'+D.QUESTS[r].name+'”'); });
        if(q.reqs.skills) for(const k in q.reqs.skills) if(skillLevel(k)<q.reqs.skills[k]) reqBits.push(skillDef(k).name+' '+q.reqs.skills[k]);
        body += `<div class="q-reqs">Requires: ${reqBits.join(', ')}</div>`;
      }else{
        body += q.objectives.map((o,i)=>{
          const p = objProgress(q,i), done = p>=o.qty;
          let label='';
          if(o.type==='collect') label = `Deliver ${D.ITEMS[o.item].icon} ${D.ITEMS[o.item].name}`;
          if(o.type==='craft') label = `Craft ${D.ITEMS[o.item].icon} ${D.ITEMS[o.item].name}`;
          if(o.type==='kill') label = `Defeat ${D.ENEMIES[o.enemy].icon} ${D.ENEMIES[o.enemy].name}`;
          if(o.type==='hack') label = `Breach ${D.ACTIONS[o.action].name}`;
          if(o.type==='run') label = `Complete piloting runs`;
          if(o.type==='level') label = `Reach ${skillDef(o.skill).name} level`;
          return `<div class="obj ${done?'done':''}"><span>${done?'✔':'◌'}</span><span>${label}</span><span class="ob-prog">${fmt(p)}/${o.qty}</span></div>`;
        }).join('');
      }
      const r=q.rewards||{}, rb=[];
      if(r.credits) rb.push(fmt(r.credits)+' cr');
      if(r.xp) for(const k in r.xp) rb.push(fmt(r.xp[k])+' '+skillDef(k).name+' xp');
      if(r.items) for(const k in r.items) rb.push(D.ITEMS[k].name);
      if(r.unlockZone) rb.push('unlocks '+D.ZONES[r.unlockZone].name);
      if(r.title) rb.push('title “'+r.title+'”');
      body += `<div class="q-rewards">Rewards: ${rb.join(' · ')}</div>`;
      body += `<div class="q-body" style="color:var(--acc2)">From: ${questGiverLabel(q)}</div>`;
      const echoQuest = !q.giver || q.giver==='echo';
      if(stat==='available'){
        body += echoQuest
          ? `<div class="q-btns"><button class="btn primary" data-qstart="${qid}">Accept mission</button></div>`
          : `<div class="q-body" style="color:var(--gold)">❗ Speak to ${npcDef(q.giver).name} to accept.</div>`;
      }
      if(stat==='complete'){
        body += echoQuest
          ? `<div class="q-btns"><button class="btn gold" data-qclaim="${qid}">Turn in</button></div>`
          : `<div class="q-body" style="color:var(--gold)">✔ Objectives done — return to ${npcDef(q.giver).name}.</div>`;
      }
      if(stat==='active' || stat==='complete'){
        body += `<div class="q-btns"><button class="btn tiny" data-qtrack="${qid}">${state.tracked===qid?'Tracking ✓':'Track on HUD'}</button></div>`;
      }
    }
    return `<div class="quest-row ${sel?'sel':''}" data-quest="${qid}">
      <div class="q-top"><span class="q-name">${q.name}</span><span class="q-state ${stat}">${stat}</span></div>
      ${body}
    </div>`;
  }).join('');
}

/* ================= dynamic tick updates ================= */
function updateDynamic(){
  updateTopDynamic();
  if(state.action){
    const a = D.ACTIONS[state.action.id];
    const bar = $('#bar-'+a.id);
    if(bar) bar.style.width = clamp(state.action.prog/actionDuration(a)*100,0,100)+'%';
  }
}

/* ================= modals ================= */
function showModal(html, locked){
  $('#modalRoot').innerHTML = `<div class="modal-back" ${locked?'data-locked="1"':''}><div class="modal">${html}</div></div>`;
}
function closeModal(){ $('#modalRoot').innerHTML=''; }
function showTitle(awayReport){
  const hasSave = !!state;
  showModal(`
    <div class="intro-title"><span class="ka">KESSLER</span> REACH</div>
    <div class="intro-sub">a frontier skilling RPG · v2.0</div>
    <p style="text-align:center; color:var(--dim);">${hasSave
      ? `Welcome back, <b style="color:var(--acc)">${esc(state.callsign)}</b> — the Reach kept your place.`
      : 'A shattered sky. A crashed hauler. Fifteen ways to become a legend.'}</p>
    <div class="m-btns" style="justify-content:center;">
      ${hasSave?'<button class="btn primary" id="titleContinue">▶ Continue</button>':''}
      <button class="btn ${hasSave?'':'primary'}" id="titleNew">${hasSave?'New drifter':'▶ Begin'}</button>
      <button class="btn" id="titleHelp">Help & about</button>
    </div>
  `, true);
  if(hasSave) $('#titleContinue').addEventListener('click', ()=>{
    closeModal();
    if(awayReport) showAway(awayReport);
  });
  $('#titleNew').addEventListener('click', ()=>{
    if(hasSave){
      showModal(`<h2>New drifter</h2><p>This erases your current save — ${esc(state.callsign)}, every level, every credit. No undo.</p>
        <div class="m-btns"><button class="btn danger" id="wipeYes">Erase and start over</button><button class="btn primary" id="wipeNo">Keep my save</button></div>`, true);
      $('#wipeYes').addEventListener('click', ()=>{ localStorage.removeItem(SAVE_KEY); state=null; location.reload(); });
      $('#wipeNo').addEventListener('click', ()=>{ showTitle(awayReport); });
    }else showIntro();
  });
  $('#titleHelp').addEventListener('click', ()=>{ showHelp(()=>showTitle(awayReport)); });
}
function showHelp(backFn){
  showModal(`<h2>Help & About</h2>
    <p style="color:var(--acc)">Controls</p>
    <div class="guide-row"><span class="g-lvl">Click</span><span style="flex:1">Walk there · use whatever you clicked (nodes, machines, people, hostiles)</span></div>
    <div class="guide-row"><span class="g-lvl">WASD</span><span style="flex:1">Move directly (camera-relative)</span></div>
    <div class="guide-row"><span class="g-lvl">Drag</span><span style="flex:1">Orbit the camera (arrow keys too · pinch or scroll to zoom)</span></div>
    <div class="guide-row"><span class="g-lvl">1–5</span><span style="flex:1">Side panels: Cargo · Gear · Missions · Map · Feats</span></div>
    <div class="guide-row"><span class="g-lvl">H / Esc</span><span style="flex:1">This screen / close panels</span></div>
    <p style="color:var(--acc); margin-top:10px;">The loop</p>
    <p>Gather in the field, refine at settlement workshops, fight for what can't be gathered, and fly to unlock the far regions. Missions are accepted and turned in by talking to people — the journal tracks and points. Gates open when you meet their Piloting level or finish the right mission.</p>
    <p>Watch for <b style="color:var(--gold)">world events</b> (bonus XP where they land), <b style="color:var(--gold)">★ Alpha</b> hostiles (triple loot), rolling <b style="color:var(--gold)">work orders</b> at Haven's board, daily <b style="color:var(--gold)">market drift</b>, and total-level <b style="color:var(--gold)">milestones</b>.</p>
    <p style="color:var(--acc); margin-top:10px;">About</p>
    <p>Kessler Reach is an original game — every name, place, item and line of lore was written for it.
    Rendering: Three.js r147 (MIT). Built with Claude Code. Your save lives in this browser; export it from ⚙ Settings.</p>
    <div class="m-btns"><button class="btn primary" id="helpBack">Back</button></div>`, true);
  $('#helpBack').addEventListener('click', ()=>{ if(backFn) backFn(); else closeModal(); });
}
function showIntro(){
  showModal(`
    <div class="intro-title"><span class="ka">KESSLER</span> REACH</div>
    <div class="intro-sub">a frontier skilling RPG · v2.0</div>
    <p>${D.INTRO_LORE}</p>
    <p style="color:var(--acc)">Click the ground to walk (or WASD). Click glowing things to use them. Drag to orbit, scroll to zoom.</p>
    <label>Your callsign</label>
    <input type="text" id="introName" maxlength="16" placeholder="Drifter" value="Drifter">
    <div class="m-btns"><button class="btn primary" id="introStart">Wake up in the wreck</button></div>
  `, true);
  $('#introStart').addEventListener('click', ()=>{
    const name = ($('#introName').value||'Drifter').trim().slice(0,16) || 'Drifter';
    state = freshState(name);
    addItem('emergency_ration', 3);
    ensureContracts();
    KRWorld.setPlayerPos(state.pos.x, state.pos.z);
    closeModal();
    renderAll();
    addLog('You crawl out of the Meridian\'s wreck. The Reach is waiting.','gold');
    toast(`<b>Welcome to the Reach, ${esc(name)}.</b>`,'quest','Open Missions and accept “Dead Stick”. Click the world to move.');
    checkQuestNotify();
    save();
  });
  $('#introName').addEventListener('keydown', e=>{ if(e.key==='Enter') $('#introStart').click(); });
}
function showAway(report){
  const lines = [];
  lines.push(`<div>⏱ Away ${fmtDur(report.away)} — completed <b>${fmt(report.n)}×</b> ${report.action.name}</div>`);
  for(const k in report.xp) lines.push(`<div>${skillDef(k).icon} +${fmt(report.xp[k])} ${skillDef(k).name} xp${report.levels[k]?` → <b>level ${report.levels[k]}</b>`:''}</div>`);
  for(const k in report.items) lines.push(`<div>${D.ITEMS[k].icon} ${D.ITEMS[k].name} ×${fmt(report.items[k])}</div>`);
  if(report.credits) lines.push(`<div>⬡ +${fmt(report.credits)} cr</div>`);
  showModal(`<h2>While you were away</h2><div class="away-list">${lines.join('')}</div>
    <div class="m-btns"><button class="btn primary" data-close-modal="1">Back to work</button></div>`);
}
function showSettings(){
  const s = state.settings;
  const playH = (Date.now()-state.created)/3600000;
  showModal(`<h2>Settings & Save <span style="color:var(--faint); font-size:11px; letter-spacing:1px;">v2.0</span></h2>
    <div class="setting-row"><span class="grow">Callsign</span><input type="text" id="setName" maxlength="16" style="width:160px" value="${esc(state.callsign)}"></div>
    <div class="setting-row"><span class="grow">Auto-eat in combat</span><input type="checkbox" id="setAutoEat" ${s.autoEat?'checked':''}></div>
    <div class="setting-row"><span class="grow">Auto-eat below</span>
      <select id="setEatAt">${[0.3,0.45,0.6].map(v=>`<option value="${v}" ${Math.abs(s.eatAt-v)<0.01?'selected':''}>${Math.round(v*100)}%</option>`).join('')}</select></div>
    <div class="setting-row"><span class="grow">Sound</span><input type="checkbox" id="setSound" ${s.sound?'checked':''}></div>
    <div class="setting-row"><span class="grow">Music & ambience</span><input type="checkbox" id="setMusic" ${s.music?'checked':''}></div>
    <div class="setting-row"><span class="grow">Master volume</span><input type="range" id="volMaster" min="0" max="1" step="0.05" value="${s.vol.master}" style="width:140px"></div>
    <div class="setting-row"><span class="grow">Effects volume</span><input type="range" id="volSfx" min="0" max="1" step="0.05" value="${s.vol.sfx}" style="width:140px"></div>
    <div class="setting-row"><span class="grow">Music volume</span><input type="range" id="volMusic" min="0" max="1" step="0.05" value="${s.vol.music}" style="width:140px"></div>
    <div class="setting-row"><span class="grow">Lifetime: ${fmt(state.stats.kills)} kills · ${fmt(state.stats.deaths)} deaths · ${fmt(state.stats.actionsDone)} actions · ${fmt(state.stats.crEarned)} cr earned · ${playH.toFixed(1)}h</span></div>
    <label>Export save (copy this string somewhere safe)</label>
    <textarea id="exportBox" readonly></textarea>
    <div class="m-btns"><button class="btn" id="btnExport">Generate export</button></div>
    <label>Import save (paste an export string)</label>
    <textarea id="importBox" placeholder="paste here"></textarea>
    <div class="m-btns">
      <button class="btn" id="btnImport">Import</button>
      <button class="btn danger" id="btnReset">Hard reset</button>
      <button class="btn primary" id="btnCloseSet">Done</button>
    </div>`);
  $('#btnCloseSet').addEventListener('click', ()=>{
    state.callsign = ($('#setName').value||'Drifter').trim().slice(0,16) || 'Drifter';
    state.settings.autoEat = $('#setAutoEat').checked;
    state.settings.eatAt = parseFloat($('#setEatAt').value);
    state.settings.sound = $('#setSound').checked;
    state.settings.music = $('#setMusic').checked;
    state.settings.vol = {master:parseFloat($('#volMaster').value), sfx:parseFloat($('#volSfx').value), music:parseFloat($('#volMusic').value)};
    if(state.settings.sound){ startAmbient(); if(state.settings.music) startMusic(); else stopMusic(); }
    else { stopAmbient(); stopMusic(); }
    updateVolumes();
    closeModal(); renderTop(); save();
  });
  $('#btnExport').addEventListener('click', ()=>{
    save();
    $('#exportBox').value = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
    $('#exportBox').select();
  });
  $('#btnImport').addEventListener('click', ()=>{
    try{
      const s2 = JSON.parse(decodeURIComponent(escape(atob($('#importBox').value.trim()))));
      if(!s2.skills || !s2.cargo) throw new Error('bad save');
      state = migrate(s2);
      KRWorld.setPlayerPos(state.pos.x, state.pos.z);
      closeModal(); renderAll(); save();
      toast('<b>Save imported.</b>');
    }catch(e){ toast('<b>Import failed</b> — invalid save string.','bad'); }
  });
  $('#btnReset').addEventListener('click', ()=>{
    showModal(`<h2>Hard reset</h2><p>This permanently deletes your drifter, all levels and all cargo. There is no undo.</p>
      <div class="m-btns"><button class="btn danger" id="btnReally">Delete everything</button><button class="btn primary" data-close-modal="1">Keep playing</button></div>`);
    $('#btnReally').addEventListener('click', ()=>{ localStorage.removeItem(SAVE_KEY); state=null; location.reload(); });
  });
}
function showSkillGuide(skillId){
  const sd = skillDef(skillId);
  const lvl = skillLevel(skillId);
  const acts = Object.values(D.ACTIONS).filter(a=>a.skill===skillId && !a.questOnly).sort((a,b)=>a.lvl-b.lvl);
  const rows = acts.map(a=>{
    const where = a.zones ? a.zones.map(z=>D.ZONES[z].name).join(', ') : 'any '+D.FACILITY_NAMES[a.facility];
    const outs = a.outputs ? Object.keys(a.outputs).map(k=>D.ITEMS[k].name).join(', ') : (a.credits?'credits':'');
    return `<div class="guide-row ${lvl>=a.lvl?'':'no'}"><span class="g-lvl">${lvl>=a.lvl?'✔':''} ${a.lvl}</span><span style="flex:1">${a.icon} ${a.name}${outs?' → '+outs:''}</span><span style="color:var(--faint)">${where}</span></div>`;
  }).join('');
  showModal(`<h2>${sd.icon} ${sd.name} — level ${lvl}</h2><p>${sd.desc}</p>
    <p style="color:var(--acc)">${fmt(skillXp(skillId))} xp${lvl<MAXL?' · '+fmt(XP_TABLE[lvl+1]-skillXp(skillId))+' to level '+(lvl+1):' · MAX LEVEL'}</p>
    ${rows || '<p>Trained through combat and missions.</p>'}
    <div class="m-btns"><button class="btn primary" data-close-modal="1">Close</button></div>`);
}

/* ================= quest tracker HUD ================= */
let trackerCache = '';
function renderTracker(){
  const el = $('#tracker');
  if(!el || !state) return;
  let qid = state.tracked;
  if(!qid || !state.quests[qid] || state.quests[qid].claimed || !state.quests[qid].started){
    qid = D.QUEST_ORDER.find(id=>state.quests[id] && state.quests[id].started && !state.quests[id].claimed) || null;
  }
  let html = '';
  if(qid){
    const q = D.QUESTS[qid];
    const lines = q.objectives.map((o,i)=>{
      const p = objProgress(q,i), done = p>=o.qty;
      let label='';
      if(o.type==='collect') label = D.ITEMS[o.item].name;
      else if(o.type==='craft') label = 'Craft '+D.ITEMS[o.item].name;
      else if(o.type==='kill') label = D.ENEMIES[o.enemy].name;
      else if(o.type==='hack') label = D.ACTIONS[o.action].name;
      else if(o.type==='run') label = 'Piloting runs';
      return `<div class="trk-obj ${done?'done':''}">${done?'✔':'·'} ${label} <span>${fmt(p)}/${o.qty}</span></div>`;
    }).join('');
    const ready = questObjectivesDone(q);
    html = `<div class="trk-name">${q.name}${ready?' <span style="color:var(--gold)">— turn in!</span>':''}</div>${lines}`;
  }
  if(html!==trackerCache){ trackerCache=html; el.innerHTML=html; el.style.display=html?'block':'none'; }
}

/* ================= render all ================= */
function renderAll(){
  renderTop(); renderSkills(); renderSide(); renderLog(); renderFloat(); renderTracker();
}

/* ================= events ================= */
document.addEventListener('click', e=>{
  if(state && state.settings.sound){ if(!ambient) startAmbient(); if(!music) startMusic(); }
  const t = e.target.closest('[data-sidetab],[data-start],[data-stop],[data-sel],[data-equip],[data-unequip],[data-use],[data-sell],[data-buy],[data-quest],[data-qstart],[data-qclaim],[data-qtrack],[data-skill],[data-close-modal],[data-closefloat],[data-contract],[data-dlgnext],[data-dlgaccept],[data-dlgturnin],[data-dlgtrade]');
  if(t) blip(740, .035, 'sine', .015);   // soft UI tick
  if(!t){
    const back = e.target.classList && e.target.classList.contains('modal-back');
    if(back && !e.target.dataset.locked) closeModal();
    return;
  }
  if(!state) return;
  const d = t.dataset;
  if(d.sidetab){ ui.sideTab=d.sidetab; renderSide(); }
  else if(d.start){
    const entUid = ui.float ? ui.float.uid : (state.action?state.action.ent:null);
    startAction(d.start, d.reps?parseInt(d.reps,10):-1, entUid);
    renderFloat();
  }
  else if(d.stop){ stopAction(); renderFloat(); }
  else if(d.sel){ ui.sel = (ui.sel===d.sel?null:d.sel); renderSide(); }
  else if(d.equip){ equipItem(d.equip); renderSide(); }
  else if(d.unequip){ unequip(d.unequip); renderSide(); }
  else if(d.use){ useItem(d.use); renderSide(); updateTopDynamic(); }
  else if(d.sell){ sellItem(d.sell, d.qty==='all'?'all':parseInt(d.qty,10)); renderSide(); updateTopDynamic(); }
  else if(d.buy!==undefined){ if(ui.float && ui.float.vendor) buyOffer(ui.float.vendor, parseInt(d.buy,10), d.buyq?parseInt(d.buyq,10):1); renderFloat(); renderSide(); updateTopDynamic(); }
  else if(d.dlgnext){ if(ui.float){ ui.float.step++; renderFloat(); } }
  else if(d.dlgaccept){ startQuest(d.dlgaccept); if(ui.float){ ui.float.step=0; } renderFloat(); }
  else if(d.dlgturnin){ claimQuest(d.dlgturnin); if(ui.float){ ui.float.step=0; } renderFloat(); }
  else if(d.dlgtrade){ if(ui.float){ const npc=npcDef(ui.float.npc); ui.float={type:'shop', vendor:npc.shop, uid:ui.float.uid}; renderFloat(); } }
  else if(d.quest){ if(!e.target.closest('[data-qstart],[data-qclaim],[data-qtrack]')){ ui.questSel = (ui.questSel===d.quest?null:d.quest); renderSide(); } }
  else if(d.qstart){ startQuest(d.qstart); renderSide(); }
  else if(d.qclaim){ claimQuest(d.qclaim); }
  else if(d.qtrack){ state.tracked = (state.tracked===d.qtrack?null:d.qtrack); renderSide(); renderTracker(); }
  else if(d.skill){ showSkillGuide(d.skill); }
  else if(d.closeModal){ closeModal(); }
  else if(d.closefloat){ closeFloat(); }
  else if(d.contract!==undefined){ claimContract(parseInt(d.contract,10)); }
});
document.addEventListener('keydown', e=>{
  if(e.key==='Escape'){
    const back = $('.modal-back');
    if(back && !back.dataset.locked){ closeModal(); return; }
    closeFloat();
    return;
  }
  if(!state || $('.modal-back')) return;
  if(e.target && ['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
  const tabKeys = {'1':'cargo','2':'gear','3':'missions','4':'map','5':'feats'};
  if(tabKeys[e.key]){ ui.sideTab=tabKeys[e.key]; renderSide(); }
  else if(e.key==='h'||e.key==='H'){ showHelp(); }
});
$('#btnSettings').addEventListener('click', ()=>{ if(state) showSettings(); });
$('#btnHelp').addEventListener('click', ()=>showHelp());
$('#hudmap').addEventListener('click', ()=>{ if(state){ ui.sideTab='map'; renderSide(); } });
window.addEventListener('error', ()=>{
  if(window.__krErrToast) return;
  window.__krErrToast = 1;
  try{ toast('<b>Glitch in the Reach</b>','bad','An error was logged to the console. Your save is safe.'); }catch(e){}
});
$('#btnSound').addEventListener('click', function(){
  if(!state) return;
  state.settings.sound = !state.settings.sound;
  this.classList.toggle('off', !state.settings.sound);
  if(state.settings.sound){ startAmbient(); startMusic(); } else { stopAmbient(); stopMusic(); }
});
window.addEventListener('beforeunload', save);
document.addEventListener('visibilitychange', ()=>{ if(document.hidden) save(); });

/* ================= main loop (game logic; rendering is in world.js) ================= */
let lastT = performance.now(), saveT = 0, mapT = 0;
setInterval(()=>{
  window.__krTicks = (window.__krTicks||0)+1;
  if(!state) return;
  const now = performance.now();
  let dt = (now-lastT)/1000; lastT = now;
  dt = Math.min(dt, 2);
  pruneBuffs();
  tickEvents();
  tickAction(dt);
  tickCombat(dt);
  KRWorld.pump();
  if(autoNext){
    autoNext.t -= dt;
    if(autoNext.t<=0){
      const nxt = KRWorld.nearestAlive(autoNext.eid, 22);
      autoNext = null;
      if(nxt && !state.combat && !state.action) engage(nxt);
    }
  }
  if(!state.combat && state.hp < maxHp()) state.hp = Math.min(maxHp(), state.hp + (0.2 + maxHp()*0.008)*dt);
  if(ui.float){
    const ent = KRWorld.byUid(ui.float.uid);
    if(ent && KRWorld.distTo(ent) > 10) closeFloat();
  }
  saveT += dt;
  if(saveT>15){ saveT=0; save(); }
  mapT += dt;
  if(mapT>1){ mapT=0;
    if(ui.sideTab==='map'){ const cv=$('#mmap'); if(cv) KRWorld.drawMinimap(cv); }
    checkAchievements();
    renderTracker();
  }
  const hm = $('#hudmap');
  if(hm && !document.hidden) KRWorld.drawLocalMap(hm);
  if(dirty.float){ dirty.float=false; renderFloat(); }
  if(dirty.side){ dirty.side=false; renderSide(); }
  if(dirty.skills){ dirty.skills=false; renderSkills(); }
  updateDynamic();
}, 100);

/* ================= data validation (dev aid) ================= */
function validateData(){
  const bad = [];
  const item = id => { if(!D.ITEMS[id]) bad.push('missing item: '+id); };
  Object.values(D.ACTIONS).forEach(a=>{
    if(a.inputs) Object.keys(a.inputs).forEach(item);
    if(a.outputs) Object.keys(a.outputs).forEach(item);
    if(a.bonus) item(a.bonus.item);
    if(!skillDef(a.skill)) bad.push('missing skill: '+a.skill+' in '+a.id);
  });
  Object.values(D.ENEMIES).forEach(E=>{ (E.loot||[]).forEach(L=>item(L.item)); });
  Object.values(D.QUESTS).forEach(q=>q.objectives.forEach(o=>{
    if(o.item) item(o.item);
    if(o.enemy && !D.ENEMIES[o.enemy]) bad.push('missing enemy '+o.enemy+' in '+q.id);
    if(o.action && !D.ACTIONS[o.action]) bad.push('missing action '+o.action+' in '+q.id);
  }));
  Object.values(D.SHOPS).forEach(v=>v.stock.forEach(o=>item(o.item)));
  D.WORLD.nodes.forEach(n=>{ if(!D.ACTIONS[n.action]) bad.push('world node bad action '+n.action); });
  D.WORLD.enemies.forEach(e=>{ if(!D.ENEMIES[e.e]) bad.push('world enemy bad id '+e.e); });
  D.NPCS.forEach(n=>{
    if(n.shop && !D.SHOPS[n.shop]) bad.push('npc bad shop '+n.id);
    if(!D.ZONES[n.zone]) bad.push('npc bad zone '+n.id);
    n.dlg.forEach(e=>{ if(e.when && !D.QUESTS[e.when.split(':')[1]]) bad.push('npc dlg bad quest in '+n.id+': '+e.when); if(e.offer && !D.QUESTS[e.offer]) bad.push('npc bad offer '+n.id); if(e.turnin && !D.QUESTS[e.turnin]) bad.push('npc bad turnin '+n.id); });
  });
  D.QUEST_ORDER.forEach(qid=>{
    const g = D.QUESTS[qid].giver;
    if(g && g!=='echo' && !D.NPCS.find(n=>n.id===g)) bad.push('quest bad giver '+qid);
    const r = D.QUESTS[qid].rewards||{};
    if(r.unlockShop && !D.SHOPS[r.unlockShop]) bad.push('quest bad unlockShop '+qid);
  });
  if(bad.length) console.warn('KR data problems:', bad);
  else console.log('KR data validated: '+Object.keys(D.ITEMS).length+' items, '+Object.keys(D.ACTIONS).length+' actions, '+Object.keys(D.ENEMIES).length+' enemies, '+D.QUEST_ORDER.length+' missions, '+D.NPCS.length+' NPCs, '+D.WORLD.nodes.length+' world nodes.');
}

/* ================= boot ================= */
function boot(){
  validateData();
  KRWorld.init(worldApi);
  let loaded = null;
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(raw) loaded = migrate(JSON.parse(raw));
  }catch(e){ console.error('save load failed', e); }
  if(loaded){
    state = loaded;
    ensureContracts();
    KRWorld.setPlayerPos(state.pos.x, state.pos.z);
    const report = applyOffline();
    if(state.action && state.action.ent) KRWorld.startWork(state.action.ent);
    renderAll();
    showTitle(report);
    checkQuestNotify();
  }else{
    showTitle(null);
  }
  const bootEl = document.getElementById('boot');
  if(bootEl){ bootEl.classList.add('off'); setTimeout(()=>bootEl.remove(), 700); }
  window.KR = {get state(){return state;}, gainXp, addItem, addCredits, save, D, startQuest, claimQuest, engage, isZoneUnlocked,
    interact:(uid)=>worldApi.interact(KRWorld.byUid(uid)),
    _event(id){ const ev=D.EVENTS.find(e=>e.id===id); if(ev){ state.event={id, until:Date.now()+150000}; toast(`<b>${ev.icon} ${ev.name}</b>`,'quest',ev.desc); } },
    _debugOffline(){ const r=applyOffline(); if(r){ renderAll(); showAway(r); } return r; }};
}
boot();
})();
