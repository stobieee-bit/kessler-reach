// Dev-only economy audit: xp/hr and cr/hr consistency across skills (run: node audit.js)
const fs = require('fs');
const path = require('path');
const code = fs.readFileSync(path.join(__dirname, 'js', 'data.js'), 'utf8');
const D = new Function(code + '; return KR_DATA;')();
const rows = [];
for(const a of Object.values(D.ACTIONS)){
  if(a.type==='gather'){
    const out = Object.entries(a.outputs)[0];
    const perHr = 3600/a.time;
    rows.push({kind:'gather', skill:a.skill, lvl:a.lvl, id:a.id,
      xpHr: Math.round(a.xp*perHr), crHr: Math.round(D.ITEMS[out[0]].value*out[1]*perHr)});
  }else if(a.type==='craft' && !a.questOnly){
    const outVal = Object.entries(a.outputs).reduce((t,[k,q])=>t+D.ITEMS[k].value*q,0);
    const inVal = Object.entries(a.inputs||{}).reduce((t,[k,q])=>t+D.ITEMS[k].value*q,0);
    rows.push({kind:'craft', skill:a.skill, lvl:a.lvl, id:a.id,
      xpHr: Math.round(a.xp*3600/a.time), margin: outVal-inVal});
  }else if(a.type==='hack'){
    rows.push({kind:'hack', skill:a.skill, lvl:a.lvl, id:a.id,
      xpHr: Math.round(a.xp*3600/a.time), crHr: Math.round((a.credits[0]+a.credits[1])/2*3600/a.time)});
  }else if(a.type==='pilot'){
    rows.push({kind:'pilot', skill:a.skill, lvl:a.lvl, id:a.id,
      xpHr: Math.round(a.xp*3600/a.time), crHr: Math.round((a.credits[0]+a.credits[1])/2*3600/a.time)});
  }
}
console.log('--- gather/hack/pilot: xp/hr & cr/hr by level ---');
rows.filter(r=>r.kind!=='craft').sort((a,b)=>a.lvl-b.lvl).forEach(r=>
  console.log(`${String(r.lvl).padStart(3)}  ${r.skill.padEnd(12)} ${r.id.padEnd(16)} xp/hr ${String(r.xpHr).padStart(7)}  cr/hr ${String(r.crHr).padStart(7)}`));
console.log('--- crafts: xp/hr & margin per craft ---');
rows.filter(r=>r.kind==='craft').sort((a,b)=>a.lvl-b.lvl).forEach(r=>
  console.log(`${String(r.lvl).padStart(3)}  ${r.skill.padEnd(12)} ${r.id.padEnd(20)} xp/hr ${String(r.xpHr).padStart(7)}  margin ${String(r.margin).padStart(5)}`));
console.log('--- seeds: xp/hr-equivalent (harvest cycle) & cr profit ---');
for(const [id,sd] of Object.entries(D.SEEDS)){
  const cropVal = D.ITEMS[sd.crop].value * (sd.yield[0]+sd.yield[1])/2;
  console.log(`${String(sd.lvl).padStart(3)}  hydroponics  ${id.padEnd(16)} xp/cycle ${String(sd.plantXp+sd.harvestXp).padStart(5)} (${sd.mins}m)  crop value ${Math.round(cropVal)}`);
}
console.log('--- enemies: avg credits per kill vs level ---');
Object.values(D.ENEMIES).sort((a,b)=>a.lvl-b.lvl).forEach(E=>
  console.log(`${String(E.lvl).padStart(3)}  ${E.name.padEnd(18)} hp ${String(E.hp).padStart(4)}  avg cr ${Math.round((E.credits[0]+E.credits[1])/2)}`));
