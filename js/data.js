/* ============================================================
   KESSLER REACH — content database
   All names, lore, skills, items, creatures and missions are
   original. Setting: the Reach, a frontier star system wrecked
   by an orbital debris cascade ("the Shatter").
   ============================================================ */
'use strict';

var KR_DATA = (function(){

  /* ---------------- skills ---------------- */
  const SKILLS = [
    {id:'salvaging',    name:'Salvaging',    icon:'🔩', cat:'gather',  desc:'Strip wreckage fields for plating, coils and lost-age circuitry.'},
    {id:'extraction',   name:'Extraction',   icon:'⛏',  cat:'gather',  desc:'Drill exotic ores from regolith pockets and deep ice.'},
    {id:'xenobotany',   name:'Xenobotany',   icon:'🌿', cat:'gather',  desc:'Harvest the Reach\'s luminous alien flora.'},
    {id:'trawling',     name:'Trawling',     icon:'🪝', cat:'gather',  desc:'Net charged fauna from the ion shallows.'},
    {id:'fabrication',  name:'Fabrication',  icon:'🏭', cat:'artisan', desc:'Refine ore into alloy and print weapons and armor.'},
    {id:'synthesis',    name:'Synthesis',    icon:'🍜', cat:'artisan', desc:'Turn raw catch and flora into restorative meals.'},
    {id:'chemistry',    name:'Chemistry',    icon:'🧪', cat:'artisan', desc:'Distill flora into performance stims and serums.'},
    {id:'engineering',  name:'Engineering',  icon:'⚙',  cat:'artisan', desc:'Assemble tools, gadgets and mission hardware.'},
    {id:'kinetics',     name:'Kinetics',     icon:'🗡',  cat:'combat',  desc:'Close-quarters mastery of powered blades and mauls.'},
    {id:'marksmanship', name:'Marksmanship', icon:'🎯', cat:'combat',  desc:'Precision with coilguns, rails and plasma lances.'},
    {id:'psionics',     name:'Psionics',     icon:'🧠', cat:'combat',  desc:'Project will into force through neural resonators.'},
    {id:'resilience',   name:'Resilience',   icon:'🛡',  cat:'combat',  desc:'Shrug off damage. Trains as you endure hits.'},
    {id:'vitality',     name:'Vitality',     icon:'❤',  cat:'combat',  desc:'Raw constitution. Governs maximum hull integrity.'},
    {id:'hacking',      name:'Hacking',      icon:'🔓', cat:'utility', desc:'Breach lockboxes, vault doors and dead datacores.'},
    {id:'piloting',     name:'Piloting',     icon:'🚀', cat:'utility', desc:'Fly the debris lanes. Unlocks farther destinations.'},
  ];
  const GATHER_SKILLS = ['salvaging','extraction','xenobotany','trawling'];
  const OFFENSE_SKILLS = ['kinetics','marksmanship','psionics'];
  const COMBAT_SKILLS = ['kinetics','marksmanship','psionics','resilience','vitality'];

  /* ---------------- items ---------------- */
  const ITEMS = {};
  function I(id, name, icon, type, value, desc, extra){
    ITEMS[id] = Object.assign({id, name, icon, type, value, desc}, extra||{});
  }

  // ores (extraction)
  I('ferrox_ore',     'Ferrox Ore',      '🪨','material', 4, 'Dull red ore exposed by old impact craters.');
  I('cryotite_ore',   'Cryotite Ore',    '🧊','material', 9, 'Pale ore veined with frozen volatiles.');
  I('vantium_ore',    'Vantium Ore',     '🪨','material',16, 'Dense blue-grey ore prized by fabricators.');
  I('aurium_ore',     'Aurium Ore',      '🪙','material',26, 'Warm golden ore that hums faintly.');
  I('obsidite_ore',   'Obsidite Ore',    '⬛','material',40, 'Light-swallowing glassy ore from the deep bores.');
  I('neutronite_ore', 'Neutronite Ore',  '💠','material',62, 'Impossibly heavy. Handle with the suit servos.');
  // alloy bars (fabrication)
  I('ferrox_bar',     'Ferrox Bar',      '🟥','material',10, 'Workhorse alloy of the frontier.');
  I('cryotite_bar',   'Cryotite Bar',    '🟦','material',22, 'Cold-forged alloy with a mirror sheen.');
  I('vantium_bar',    'Vantium Bar',     '🟪','material',40, 'Aerospace-grade alloy bar.');
  I('aurium_bar',     'Aurium Bar',      '🟨','material',65, 'Conductive alloy used in high-energy gear.');
  I('obsidite_bar',   'Obsidite Bar',    '⬛','material',100,'Matte-black alloy, absurdly hard.');
  I('neutronite_bar', 'Neutronite Bar',  '💠','material',155,'The densest alloy a frontier press can make.');
  // salvage (salvaging)
  I('scrap_plating',  'Scrap Plating',   '🔩','material', 3, 'Hull fragments. The Reach has no shortage.');
  I('conduit_coil',   'Conduit Coil',    '🧵','material', 8, 'Superconductive wiring stripped from wrecks.');
  I('servo_parts',    'Servo Parts',     '🦾','material',15, 'Actuators and joints, mostly functional.');
  I('hullweave_mesh', 'Hullweave Mesh',  '🕸','material',26, 'Flexible armor weave from military wrecks.');
  I('fusion_cell',    'Fusion Cell',     '🔋','material',42, 'Cracked but rechargeable power core.');
  I('relic_circuitry','Relic Circuitry', '🧿','material',70, 'Pre-Shatter logic boards. Irreplaceable.');
  // flora (xenobotany)
  I('lumen_moss',     'Lumen Moss',      '🌱','material', 3, 'Soft moss that glows faintly blue.');
  I('spirefruit',     'Spirefruit',      '🍐','material', 7, 'Tart fruit growing on glasswood spires.');
  I('glasswood_resin','Glasswood Resin', '🫧','material',13, 'Crystal-clear sap, sharp as flint when dry.');
  I('duskpetal',      'Duskpetal',       '🥀','material',22, 'Opens only in planet-shadow. Potent alkaloids.');
  I('pyrelace_fern',  'Pyrelace Fern',   '🌺','material',35, 'Burns slow and hot. Chemists love it.');
  I('voidlotus',      'Voidlotus',       '🪷','material',58, 'Grows where nothing should. Smells like ozone.');
  // catch (trawling)
  I('skimmerling',    'Skimmerling',     '🐟','material', 3, 'Palm-sized charge-feeder. Surprisingly tasty.');
  I('glowfin',        'Glowfin',         '🐠','material', 7, 'Its fins flicker like neon signage.');
  I('razorjaw',       'Razorjaw',        '🦈','material',14, 'Bites through trawl-line. And boots.');
  I('pulse_eel',      'Pulse Eel',       '🪱','material',24, 'Discharges when threatened. Net carefully.');
  I('mirrorscale',    'Mirrorscale',     '🐡','material',38, 'Scales like polished chrome.');
  I('riftmaw',        'Riftmaw',         '🦑','material',60, 'Hauled up from lightless ion trenches.');
  // meals (synthesis) — heal amounts
  I('emergency_ration','Emergency Ration','🥫','meal',  6, 'Tastes like regret. Restores a little hull.', {heal:10});
  I('seared_skimmerling','Seared Skimmerling','🍢','meal', 8, 'Frontier classic, seared on a vent grill.', {heal:8});
  I('glowfin_skewer', 'Glowfin Skewer',  '🍡','meal', 14, 'Still glows a little going down.', {heal:15});
  I('razorjaw_steak', 'Razorjaw Steak',  '🥩','meal', 26, 'Dense, peppery, dangerous to overcook.', {heal:24});
  I('pulse_eel_soup', 'Pulse Eel Soup',  '🍲','meal', 45, 'Tingles. Duskpetal rounds out the broth.', {heal:35});
  I('mirrorscale_feast','Mirrorscale Feast','🍱','meal',70, 'Banquet-grade. Pyrelace smoke finish.', {heal:48});
  I('riftmaw_banquet','Riftmaw Banquet', '🍛','meal',110, 'The finest table in the Reach.', {heal:70});
  // stims (chemistry) — temporary buffs
  I('solvent',        'Industrial Solvent','🧴','material',5,'Base reagent for every stim recipe.');
  I('focus_stim',     'Focus Stim',      '💉','stim', 40, '+4 to gathering skills for 3 minutes.', {buff:{skills:'gather', amt:4, dur:180}});
  I('combat_stim',    'Combat Stim',     '💉','stim', 70, '+4 to offensive skills for 3 minutes.', {buff:{skills:'offense', amt:4, dur:180}});
  I('shield_serum',   'Shield Serum',    '💉','stim',110, '+6 Resilience for 3 minutes.', {buff:{skills:['resilience'], amt:6, dur:180}});
  I('surge_stim',     'Surge Stim',      '💉','stim',160, 'All actions 15% faster for 2 minutes.', {buff:{speed:0.15, dur:120}});
  I('apex_serum',     'Apex Serum',      '💉','stim',240, '+6 to all combat skills for 4 minutes and heals 30.', {buff:{skills:'combat', amt:6, dur:240}, heal:30});
  // weapons — kinetics
  I('shock_baton',    'Shock Baton',     '🔦','gear',  80, 'Riot surplus. Hits harder than it looks.', {slot:'weapon', style:'kinetics', acc:14, hit:6,  spd:2.4});
  I('pulse_blade',    'Pulse Blade',     '🗡','gear', 260, 'Cryotite edge with an oscillating field.',  {slot:'weapon', style:'kinetics', acc:20, hit:10, spd:2.4});
  I('arc_saber',      'Arc Saber',       '⚡','gear', 700, 'Leaves afterimages. And amputations.',      {slot:'weapon', style:'kinetics', acc:30, hit:15, spd:2.4});
  I('graviton_maul',  'Graviton Maul',   '🔨','gear',1600, 'Briefly doubles local gravity on impact.',  {slot:'weapon', style:'kinetics', acc:42, hit:21, spd:2.4});
  I('singularity_edge','Singularity Edge','🌀','gear',3600,'The edge is a held-open seam in space.',    {slot:'weapon', style:'kinetics', acc:56, hit:28, spd:2.4});
  // weapons — marksmanship
  I('scrap_pistol',   'Scrap Pistol',    '🔫','gear',  80, 'Three wrecks contributed parts to this.',   {slot:'weapon', style:'marksmanship', acc:14, hit:7,  spd:3.0});
  I('coil_rifle',     'Coil Rifle',      '🔫','gear', 260, 'Magnetic rails, satisfying thunk.',         {slot:'weapon', style:'marksmanship', acc:20, hit:12, spd:3.0});
  I('railshot_carbine','Railshot Carbine','🔫','gear', 700, 'Punches clean through loader chassis.',    {slot:'weapon', style:'marksmanship', acc:30, hit:17, spd:3.0});
  I('plasma_lance',   'Plasma Lance',    '🥽','gear',1600, 'A spear of star-stuff on a trigger.',       {slot:'weapon', style:'marksmanship', acc:42, hit:24, spd:3.0});
  I('nova_cannon',    'Nova Cannon',     '💥','gear',3600, 'Shoulder-fired sunrise.',                   {slot:'weapon', style:'marksmanship', acc:58, hit:32, spd:3.0});
  // weapons — psionics
  I('neural_coil',    'Neural Coil',     '📿','gear',  80, 'Entry-grade resonator. Faint headache included.',{slot:'weapon', style:'psionics', acc:14, hit:6,  spd:2.7});
  I('synapse_lash',   'Synapse Lash',    '🧵','gear', 260, 'A whip of focused intent.',                 {slot:'weapon', style:'psionics', acc:23, hit:9,  spd:2.7});
  I('mindspike_array','Mindspike Array', '🔱','gear', 700, 'Three-pronged thought projector.',          {slot:'weapon', style:'psionics', acc:34, hit:14, spd:2.7});
  I('cortex_resonator','Cortex Resonator','🎛','gear',1600,'Hum it a note, it returns an earthquake.',  {slot:'weapon', style:'psionics', acc:47, hit:20, spd:2.7});
  I('eidolon_projector','Eidolon Projector','👁','gear',3600,'Casts your will as a striking phantom.',  {slot:'weapon', style:'psionics', acc:62, hit:26, spd:2.7});
  // suits
  I('patchwork_suit', 'Patchwork Suit',  '🦺','gear', 100, 'Plating sewn onto a flight suit.',          {slot:'suit', def:8,  hpb:5});
  I('ferrox_exosuit', 'Ferrox Exosuit',  '🥋','gear', 300, 'First proper armor most drifters own.',     {slot:'suit', def:16, hpb:10});
  I('vantium_carapace','Vantium Carapace','🛡','gear', 800, 'Segmented and nearly weightless.',         {slot:'suit', def:28, hpb:18});
  I('aurium_aegis',   'Aurium Aegis',    '✨','gear',1900, 'Sheds energy strikes in golden ripples.',   {slot:'suit', def:42, hpb:28});
  I('neutronite_warplate','Neutronite Warplate','⬛','gear',4200,'You stop walking around things.',     {slot:'suit', def:60, hpb:40});
  // visors
  I('patchwork_visor','Patchwork Visor', '🥽','gear',  50, 'Cracked, taped, beloved.',                  {slot:'visor', def:4,  hpb:2});
  I('ferrox_visor',   'Ferrox Visor',    '🪖','gear', 150, 'Standard drifter headgear.',                {slot:'visor', def:8,  hpb:5});
  I('vantium_visor',  'Vantium Visor',   '🪖','gear', 400, 'Full-spectrum overlay, vantium shell.',     {slot:'visor', def:14, hpb:8});
  I('aurium_visor',   'Aurium Visor',    '🪖','gear', 950, 'Predictive threat tracing.',                {slot:'visor', def:22, hpb:12});
  I('neutronite_visor','Neutronite Visor','🪖','gear',2100,'Nothing gets through. Including doubt.',    {slot:'visor', def:32, hpb:18});
  // multitools
  I('multitool_mk1',  'Multitool Mk I',  '🔧','gear', 120, 'Gathering actions 5% faster.',  {slot:'multitool', gspd:0.05});
  I('multitool_mk2',  'Multitool Mk II', '🔧','gear', 350, 'Gathering actions 10% faster.', {slot:'multitool', gspd:0.10});
  I('multitool_mk3',  'Multitool Mk III','🔧','gear', 900, 'Gathering actions 15% faster.', {slot:'multitool', gspd:0.15});
  I('multitool_mk4',  'Multitool Mk IV', '🔧','gear',2200, 'Gathering actions 20% faster.', {slot:'multitool', gspd:0.20});
  I('multitool_mk5',  'Multitool Mk V',  '🔧','gear',5000, 'Gathering actions 25% faster.', {slot:'multitool', gspd:0.25});
  // gadgets
  I('shield_capacitor','Shield Capacitor','🔘','gear', 800, '+10 Defense while equipped.',            {slot:'gadget', def:10});
  I('auto_loader',    'Auto-Loader',     '🤖','gear',1200, 'Attacks 10% faster while equipped.',       {slot:'gadget', aspd:0.10});
  I('scanner_array',  'Scanner Array',   '📡','gear',1500, 'Doubles anomaly-cache find chance.',       {slot:'gadget', scan:2});
  I('grapple_unit',   'Grapple Unit',    '🪢','gear', 900, '+15% Piloting experience.',                {slot:'gadget', pxp:0.15});
  I('warden_core',    'Warden Core',     '🫀','gear',5000, 'Heart of WARDEN-7. +5 Acc, +5 Def, +5% all XP.', {slot:'gadget', acc:5, def:5, xpb:0.05});
  // late-game gathering materials (fills levels 60–90)
  I('brinemetal_plate','Brinemetal Plate','🩸','material',55,'Corrosion-proof plating cut from the drowned freighter.');
  I('echo_bloom',     'Echo Bloom',      '🌸','material',80, 'A flower that repeats sounds from fifty years ago.');
  I('phasefin',       'Phasefin',        '🐋','material',78, 'It is only half here. Net both halves.');
  I('singularity_shard','Singularity Shard','✨','material',120,'A splinter of collapsed space. Cold to look at.');
  // obsidite combat tier (fills the gap between aurium and neutronite)
  I('obsidite_razor', 'Obsidite Razor',  '🔪','gear',2400, 'Light falls in and never reports back.',     {slot:'weapon', style:'kinetics', acc:49, hit:24, spd:2.4});
  I('obsidite_railgun','Obsidite Railgun','🔫','gear',2400,'Fires a sliver of the dark itself.',         {slot:'weapon', style:'marksmanship', acc:49, hit:27, spd:3.0});
  I('obsidite_halo',  'Obsidite Halo',   '⭕','gear',2400, 'Thought, focused through a ring of night.',  {slot:'weapon', style:'psionics', acc:54, hit:22, spd:2.7});
  I('obsidite_bulwark','Obsidite Bulwark','🛡','gear',2800,'A wall the Reach respects.',                 {slot:'suit', def:50, hpb:33});
  I('obsidite_gaze',  'Obsidite Gaze',   '🪖','gear',1400, 'See everything. Reveal nothing.',            {slot:'visor', def:26, hpb:14});
  // late meals & stims
  I('voidglass_terrine','Voidglass Terrine','🫕','meal',150,'Haute cuisine from the bottom of the dark.', {heal:90});
  I('phase_stim',     'Phase Stim',      '💠','stim',320, 'All actions 20% faster for 2.5 minutes.', {buff:{speed:0.20, dur:150}});
  // late gadgets & tools
  I('stabilizer_rig', 'Stabilizer Rig',  '🧷','gear',1800, '+15 Defense, +10 hull while equipped.', {slot:'gadget', def:15, hpb:10});
  I('multitool_mk6',  'Multitool Mk VI', '🔧','gear',9000, 'Gathering actions 30% faster.', {slot:'multitool', gspd:0.30});
  I('tidecaller_charm','Tidecaller Charm','🫧','gear',1200,'+10% gathering speed. Smells of the Sound.', {slot:'gadget', gspd:0.10});
  // mission & misc
  I('water_recycler_core','Water Recycler Core','🚰','quest',0,'Driftrock\'s lifeline, rebuilt from scrap.');
  I('beacon_repair_kit','Beacon Repair Kit','📦','quest',0,'Everything needed to wake the Meridian\'s distress beacon.');
  I('signal_decryptor','Signal Decryptor','🛰','quest',0,'Cracks the Undervault\'s door handshake.');
  I('vault_sigil',    'Vault Sigil',     '🔺','quest',0, 'A warm metal triangle. The Undervault answers to three.');
  I('anomaly_cache',  'Anomaly Cache',   '🎁','consumable',0,'Sealed pre-Shatter container. Use to open.', {open:[60,240]});
  I('salvaged_tech',  'Salvaged Tech',   '📟','material',25,'Assorted gizmos. Vendors pay decently.');

  /* ---------------- actions ----------------
     type: gather | craft | hack | pilot
     craft extras: facility, inputs {id:qty}, outputs {id:qty}
     gather extras: zones [..], outputs
     hack extras: zones, credits [min,max], bonus {item, chance}
     pilot extras: zones(haven), credits [min,max]            */
  const ACTIONS = {};
  function A(id, def){ ACTIONS[id] = Object.assign({id}, def); }

  // -- salvaging
  A('sv_scrap',    {type:'gather', skill:'salvaging', lvl:1,  xp:10,  time:2.8, name:'Hull Debris Field',    icon:'🔩', zones:['meridian','rustflats'], outputs:{scrap_plating:1}, flavor:'Pry plating off the Meridian\'s scattered hull.'});
  A('sv_coil',     {type:'gather', skill:'salvaging', lvl:8,  xp:16,  time:3.0, name:'Conduit Run',          icon:'🧵', zones:['rustflats'], outputs:{conduit_coil:1}, flavor:'Strip superconductor from buried cable trunks.'});
  A('sv_servo',    {type:'gather', skill:'salvaging', lvl:20, xp:30,  time:3.3, name:'Loader Graveyard',     icon:'🦾', zones:['rustflats'], outputs:{servo_parts:1}, flavor:'Harvest actuators from dead cargo loaders.'});
  A('sv_hullweave',{type:'gather', skill:'salvaging', lvl:35, xp:50,  time:3.7, name:'Warship Ribcage',      icon:'🕸', zones:['rustflats'], outputs:{hullweave_mesh:1}, flavor:'Cut mesh from a split military frigate.'});
  A('sv_fusion',   {type:'gather', skill:'salvaging', lvl:50, xp:75,  time:4.2, name:'Reactor Spill',        icon:'🔋', zones:['kelvin'], outputs:{fusion_cell:1}, flavor:'Fish intact cells out of a frozen reactor breach.'});
  A('sv_relic',    {type:'gather', skill:'salvaging', lvl:70, xp:115, time:4.8, name:'Pre-Shatter Stacks',   icon:'🧿', zones:['undervault'], outputs:{relic_circuitry:1}, flavor:'Desolder relic boards from the old world\'s racks.'});
  A('sv_shipbreak',{type:'gather', skill:'salvaging', lvl:60, xp:92,  time:4.4, name:'Drowned Freighter',    icon:'🩸', zones:['cinder'], outputs:{brinemetal_plate:1}, flavor:'Cut brinemetal off the hulk the Sound swallowed.'});
  // -- extraction
  A('ex_ferrox',   {type:'gather', skill:'extraction', lvl:1,  xp:12,  time:3.0, name:'Ferrox Outcrop',      icon:'🪨', zones:['rustflats'], outputs:{ferrox_ore:1}, flavor:'Impact-exposed ore, soft enough for a fresh drill.'});
  A('ex_cryotite', {type:'gather', skill:'extraction', lvl:12, xp:22,  time:3.2, name:'Cryotite Pocket',     icon:'🧊', zones:['rustflats','kelvin'], outputs:{cryotite_ore:1}, flavor:'Permafrost pockets hide pale cryotite seams.'});
  A('ex_vantium',  {type:'gather', skill:'extraction', lvl:28, xp:38,  time:3.6, name:'Vantium Seam',        icon:'🪨', zones:['kelvin'], outputs:{vantium_ore:1}, flavor:'Deep blue veins under the glacier shelf.'});
  A('ex_aurium',   {type:'gather', skill:'extraction', lvl:45, xp:60,  time:4.0, name:'Aurium Vein',         icon:'🪙', zones:['kelvin'], outputs:{aurium_ore:1}, flavor:'The hum gets louder the deeper you drill.'});
  A('ex_obsidite', {type:'gather', skill:'extraction', lvl:60, xp:88,  time:4.4, name:'Obsidite Bore',       icon:'⬛', zones:['kelvin'], outputs:{obsidite_ore:1}, flavor:'Light goes in. Nothing comes back out.'});
  A('ex_neutronite',{type:'gather', skill:'extraction', lvl:78, xp:130, time:5.0, name:'Neutronite Core-Tap', icon:'💠', zones:['kelvin'], outputs:{neutronite_ore:1}, flavor:'The drill screams. Worth it.'});
  A('ex_singularity',{type:'gather', skill:'extraction', lvl:90, xp:165, time:5.4, name:'Singularity Scar',   icon:'✨', zones:['undervault'], outputs:{singularity_shard:1}, flavor:'Where the Shatter began, something is still falling inward.'});
  // -- xenobotany
  A('xb_moss',     {type:'gather', skill:'xenobotany', lvl:1,  xp:10,  time:2.8, name:'Lumen Moss Bank',     icon:'🌱', zones:['meridian','glasswood'], outputs:{lumen_moss:1}, flavor:'Glowing moss carpets the shaded wreck-side.'});
  A('xb_spirefruit',{type:'gather', skill:'xenobotany', lvl:10, xp:18,  time:3.0, name:'Spirefruit Grove',    icon:'🍐', zones:['glasswood'], outputs:{spirefruit:1}, flavor:'Fruit chimes softly when ripe.'});
  A('xb_resin',    {type:'gather', skill:'xenobotany', lvl:22, xp:32,  time:3.3, name:'Resin Tapping',       icon:'🫧', zones:['glasswood'], outputs:{glasswood_resin:1}, flavor:'Tap glasswood trunks for crystal sap.'});
  A('xb_duskpetal',{type:'gather', skill:'xenobotany', lvl:35, xp:50,  time:3.7, name:'Duskpetal Hollow',    icon:'🥀', zones:['glasswood'], outputs:{duskpetal:1}, flavor:'Pick fast — they close at first light.'});
  A('xb_pyrelace', {type:'gather', skill:'xenobotany', lvl:50, xp:76,  time:4.1, name:'Pyrelace Thicket',    icon:'🌺', zones:['glasswood'], outputs:{pyrelace_fern:1}, flavor:'Wear gloves. The fronds smolder.'});
  A('xb_voidlotus',{type:'gather', skill:'xenobotany', lvl:70, xp:118, time:4.7, name:'Voidlotus Pool',      icon:'🪷', zones:['undervault'], outputs:{voidlotus:1}, flavor:'Blooming in total darkness, fed by nothing.'});
  A('xb_echobloom',{type:'gather', skill:'xenobotany', lvl:85, xp:145, time:5.0, name:'Echo Bloom Terrace',   icon:'🌸', zones:['undervault'], outputs:{echo_bloom:1}, flavor:'Lean close and the flowers whisper in dead voices.'});
  // -- trawling
  A('tw_skimmer',  {type:'gather', skill:'trawling', lvl:1,  xp:11,  time:3.0, name:'Coolant Lagoon',       icon:'🐟', zones:['meridian','cinder'], outputs:{skimmerling:1}, flavor:'Skimmerlings school around the warm outflow.'});
  A('tw_glowfin',  {type:'gather', skill:'trawling', lvl:10, xp:19,  time:3.2, name:'Glowfin Shoal',        icon:'🐠', zones:['cinder'], outputs:{glowfin:1}, flavor:'Follow the flicker under the surface.'});
  A('tw_razorjaw', {type:'gather', skill:'trawling', lvl:24, xp:34,  time:3.5, name:'Razorjaw Drift',       icon:'🦈', zones:['cinder'], outputs:{razorjaw:1}, flavor:'Reinforced line required. Fingers optional.'});
  A('tw_eel',      {type:'gather', skill:'trawling', lvl:38, xp:54,  time:3.9, name:'Pulse Eel Run',        icon:'🪱', zones:['cinder'], outputs:{pulse_eel:1}, flavor:'Ground your net before each haul.'});
  A('tw_mirror',   {type:'gather', skill:'trawling', lvl:52, xp:80,  time:4.3, name:'Mirrorscale Deep',     icon:'🐡', zones:['cinder'], outputs:{mirrorscale:1}, flavor:'They see themselves in each other. Endlessly.'});
  A('tw_riftmaw',  {type:'gather', skill:'trawling', lvl:72, xp:124, time:4.9, name:'Ion Trench',           icon:'🦑', zones:['undervault'], outputs:{riftmaw:1}, flavor:'Something always tugs back. Pull harder.'});
  A('tw_phasefin', {type:'gather', skill:'trawling', lvl:86, xp:150, time:5.2, name:'Phase Eddy',            icon:'🐋', zones:['undervault'], outputs:{phasefin:1}, flavor:'Cast where the water flickers between heres.'});
  // -- fabrication: smelting
  A('fb_ferrox_bar',    {type:'craft', skill:'fabrication', lvl:1,  xp:15,  time:2.5, name:'Ferrox Bar',     icon:'🟥', facility:'fabricator', inputs:{ferrox_ore:1},     outputs:{ferrox_bar:1}});
  A('fb_cryotite_bar',  {type:'craft', skill:'fabrication', lvl:12, xp:26,  time:2.5, name:'Cryotite Bar',   icon:'🟦', facility:'fabricator', inputs:{cryotite_ore:1},   outputs:{cryotite_bar:1}});
  A('fb_vantium_bar',   {type:'craft', skill:'fabrication', lvl:30, xp:45,  time:2.6, name:'Vantium Bar',    icon:'🟪', facility:'fabricator', inputs:{vantium_ore:1},    outputs:{vantium_bar:1}});
  A('fb_aurium_bar',    {type:'craft', skill:'fabrication', lvl:47, xp:70,  time:2.7, name:'Aurium Bar',     icon:'🟨', facility:'fabricator', inputs:{aurium_ore:1},     outputs:{aurium_bar:1}});
  A('fb_obsidite_bar',  {type:'craft', skill:'fabrication', lvl:62, xp:100, time:2.8, name:'Obsidite Bar',   icon:'⬛', facility:'fabricator', inputs:{obsidite_ore:1},   outputs:{obsidite_bar:1}});
  A('fb_neutronite_bar',{type:'craft', skill:'fabrication', lvl:80, xp:150, time:3.0, name:'Neutronite Bar', icon:'💠', facility:'fabricator', inputs:{neutronite_ore:1}, outputs:{neutronite_bar:1}});
  // -- fabrication: weapons & armor (gear crafts)
  const GEARCRAFTS = [
    ['shock_baton',1,30,{scrap_plating:5}], ['pulse_blade',14,80,{cryotite_bar:3}], ['arc_saber',32,180,{vantium_bar:3}],
    ['graviton_maul',48,340,{aurium_bar:3, fusion_cell:1}], ['singularity_edge',80,700,{neutronite_bar:3, relic_circuitry:2}],
    ['scrap_pistol',1,30,{scrap_plating:4, conduit_coil:1}], ['coil_rifle',14,80,{cryotite_bar:2, conduit_coil:4}], ['railshot_carbine',32,180,{vantium_bar:2, servo_parts:3}],
    ['plasma_lance',48,340,{aurium_bar:2, fusion_cell:2}], ['nova_cannon',80,700,{neutronite_bar:2, fusion_cell:3, relic_circuitry:1}],
    ['neural_coil',1,30,{conduit_coil:2, lumen_moss:3}], ['synapse_lash',14,80,{cryotite_bar:2, spirefruit:4}], ['mindspike_array',32,180,{vantium_bar:2, glasswood_resin:4}],
    ['cortex_resonator',48,340,{aurium_bar:2, duskpetal:5}], ['eidolon_projector',80,700,{neutronite_bar:2, voidlotus:4, relic_circuitry:1}],
    ['patchwork_suit',4,40,{scrap_plating:8}], ['ferrox_exosuit',16,95,{ferrox_bar:5}], ['vantium_carapace',34,210,{vantium_bar:5}],
    ['aurium_aegis',52,380,{aurium_bar:5, hullweave_mesh:3}], ['neutronite_warplate',82,760,{neutronite_bar:5, relic_circuitry:2}],
    ['patchwork_visor',6,30,{scrap_plating:4}], ['ferrox_visor',18,70,{ferrox_bar:3}], ['vantium_visor',36,150,{vantium_bar:3}],
    ['aurium_visor',54,280,{aurium_bar:3}], ['neutronite_visor',84,540,{neutronite_bar:3}],
    // obsidite tier — bridges the long road from aurium to neutronite
    ['obsidite_razor',64,420,{obsidite_bar:3, fusion_cell:1}], ['obsidite_railgun',64,420,{obsidite_bar:2, fusion_cell:2}],
    ['obsidite_halo',64,420,{obsidite_bar:2, pyrelace_fern:4}],
    ['obsidite_bulwark',66,460,{obsidite_bar:5, hullweave_mesh:4}], ['obsidite_gaze',68,320,{obsidite_bar:3, brinemetal_plate:2}],
  ];
  GEARCRAFTS.forEach(([item,lvl,xp,inputs])=>{
    const it = ITEMS[item];
    A('fb_'+item, {type:'craft', skill:'fabrication', lvl, xp, time:3.2, name:it.name, icon:it.icon, facility:'fabricator', inputs, outputs:{[item]:1}});
  });
  // -- synthesis
  A('sy_skimmer',  {type:'craft', skill:'synthesis', lvl:1,  xp:12,  time:2.2, name:'Seared Skimmerling', icon:'🍢', facility:'galley', inputs:{skimmerling:1}, outputs:{seared_skimmerling:1}});
  A('sy_glowfin',  {type:'craft', skill:'synthesis', lvl:10, xp:20,  time:2.3, name:'Glowfin Skewer',     icon:'🍡', facility:'galley', inputs:{glowfin:1}, outputs:{glowfin_skewer:1}});
  A('sy_razorjaw', {type:'craft', skill:'synthesis', lvl:24, xp:36,  time:2.4, name:'Razorjaw Steak',     icon:'🥩', facility:'galley', inputs:{razorjaw:1}, outputs:{razorjaw_steak:1}});
  A('sy_eelsoup',  {type:'craft', skill:'synthesis', lvl:38, xp:58,  time:2.6, name:'Pulse Eel Soup',     icon:'🍲', facility:'galley', inputs:{pulse_eel:1, duskpetal:1}, outputs:{pulse_eel_soup:1}});
  A('sy_feast',    {type:'craft', skill:'synthesis', lvl:52, xp:86,  time:2.8, name:'Mirrorscale Feast',  icon:'🍱', facility:'galley', inputs:{mirrorscale:1, pyrelace_fern:1}, outputs:{mirrorscale_feast:1}});
  A('sy_banquet',  {type:'craft', skill:'synthesis', lvl:72, xp:132, time:3.0, name:'Riftmaw Banquet',    icon:'🍛', facility:'galley', inputs:{riftmaw:1, voidlotus:1}, outputs:{riftmaw_banquet:1}});
  A('sy_terrine',  {type:'craft', skill:'synthesis', lvl:85, xp:160, time:3.2, name:'Voidglass Terrine',  icon:'🫕', facility:'galley', inputs:{phasefin:1, echo_bloom:1}, outputs:{voidglass_terrine:1}});
  // -- chemistry
  A('ch_focus',    {type:'craft', skill:'chemistry', lvl:8,  xp:30,  time:3.0, name:'Focus Stim',   icon:'💉', facility:'chemlab', inputs:{spirefruit:2, solvent:1}, outputs:{focus_stim:1}});
  A('ch_combat',   {type:'craft', skill:'chemistry', lvl:25, xp:52,  time:3.2, name:'Combat Stim',  icon:'💉', facility:'chemlab', inputs:{glasswood_resin:2, solvent:1}, outputs:{combat_stim:1}});
  A('ch_shield',   {type:'craft', skill:'chemistry', lvl:40, xp:78,  time:3.4, name:'Shield Serum', icon:'💉', facility:'chemlab', inputs:{duskpetal:2, solvent:1}, outputs:{shield_serum:1}});
  A('ch_surge',    {type:'craft', skill:'chemistry', lvl:55, xp:110, time:3.6, name:'Surge Stim',   icon:'💉', facility:'chemlab', inputs:{pyrelace_fern:2, solvent:1}, outputs:{surge_stim:1}});
  A('ch_apex',     {type:'craft', skill:'chemistry', lvl:75, xp:160, time:3.8, name:'Apex Serum',   icon:'💉', facility:'chemlab', inputs:{voidlotus:2, solvent:1}, outputs:{apex_serum:1}});
  A('ch_phase',    {type:'craft', skill:'chemistry', lvl:88, xp:200, time:4.0, name:'Phase Stim',   icon:'💠', facility:'chemlab', inputs:{echo_bloom:2, solvent:1}, outputs:{phase_stim:1}});
  // -- engineering
  A('en_mt1',      {type:'craft', skill:'engineering', lvl:1,  xp:25,  time:3.0, name:'Multitool Mk I',   icon:'🔧', facility:'bench', inputs:{scrap_plating:6, conduit_coil:2}, outputs:{multitool_mk1:1}});
  A('en_mt2',      {type:'craft', skill:'engineering', lvl:15, xp:60,  time:3.2, name:'Multitool Mk II',  icon:'🔧', facility:'bench', inputs:{ferrox_bar:4, conduit_coil:6}, outputs:{multitool_mk2:1}});
  A('en_mt3',      {type:'craft', skill:'engineering', lvl:30, xp:120, time:3.4, name:'Multitool Mk III', icon:'🔧', facility:'bench', inputs:{cryotite_bar:4, servo_parts:4}, outputs:{multitool_mk3:1}});
  A('en_mt4',      {type:'craft', skill:'engineering', lvl:50, xp:240, time:3.6, name:'Multitool Mk IV',  icon:'🔧', facility:'bench', inputs:{aurium_bar:4, fusion_cell:2}, outputs:{multitool_mk4:1}});
  A('en_mt5',      {type:'craft', skill:'engineering', lvl:70, xp:420, time:3.8, name:'Multitool Mk V',   icon:'🔧', facility:'bench', inputs:{obsidite_bar:4, relic_circuitry:2}, outputs:{multitool_mk5:1}});
  A('en_shieldcap',{type:'craft', skill:'engineering', lvl:25, xp:110, time:3.4, name:'Shield Capacitor', icon:'🔘', facility:'bench', inputs:{cryotite_bar:3, conduit_coil:8}, outputs:{shield_capacitor:1}});
  A('en_autoload', {type:'craft', skill:'engineering', lvl:35, xp:170, time:3.5, name:'Auto-Loader',      icon:'🤖', facility:'bench', inputs:{servo_parts:6, vantium_bar:2}, outputs:{auto_loader:1}});
  A('en_scanner',  {type:'craft', skill:'engineering', lvl:45, xp:230, time:3.6, name:'Scanner Array',    icon:'📡', facility:'bench', inputs:{vantium_bar:3, fusion_cell:1}, outputs:{scanner_array:1}});
  A('en_stabilizer',{type:'craft', skill:'engineering', lvl:60, xp:300, time:3.7, name:'Stabilizer Rig',   icon:'🧷', facility:'bench', inputs:{vantium_bar:4, fusion_cell:2, hullweave_mesh:4}, outputs:{stabilizer_rig:1}});
  A('en_mt6',      {type:'craft', skill:'engineering', lvl:88, xp:550, time:4.0, name:'Multitool Mk VI',  icon:'🔧', facility:'bench', inputs:{neutronite_bar:3, relic_circuitry:3, singularity_shard:1}, outputs:{multitool_mk6:1}});
  A('en_beaconkit',{type:'craft', skill:'engineering', lvl:5,  xp:60,  time:3.5, name:'Beacon Repair Kit',icon:'📦', facility:'bench', inputs:{conduit_coil:10, ferrox_bar:2}, outputs:{beacon_repair_kit:1}, questOnly:'q2'});
  A('en_recycler', {type:'craft', skill:'engineering', lvl:28, xp:150, time:3.8, name:'Water Recycler Core',icon:'🚰', facility:'bench', inputs:{servo_parts:6, cryotite_bar:4, conduit_coil:8}, outputs:{water_recycler_core:1}, questOnly:'q9'});
  A('en_decryptor',{type:'craft', skill:'engineering', lvl:45, xp:400, time:4.0, name:'Signal Decryptor', icon:'🛰', facility:'bench', inputs:{fusion_cell:3, aurium_bar:2, servo_parts:6}, outputs:{signal_decryptor:1}, questOnly:'q6'});
  // -- hacking
  A('hk_lockbox',  {type:'hack', skill:'hacking', lvl:1,  xp:22,  time:4.0, name:'Scavver Lockbox',      icon:'🧰', zones:['rustflats'], credits:[6,18],   flavor:'Four-digit spin lock. Practically a gift.'});
  A('hk_maintenance',{type:'hack', skill:'hacking', lvl:15, xp:44,  time:4.2, name:'Maintenance Node',     icon:'🖥', zones:['haven'], credits:[16,40], bonus:{item:'solvent', chance:0.2}, flavor:'Station subsystems leak petty cash and supplies.'});
  A('hk_vaultdoor',{type:'hack', skill:'hacking', lvl:35, xp:75,  time:4.5, name:'Kelvin Vault Door',    icon:'🚪', zones:['kelvin'], credits:[40,95], bonus:{item:'vantium_ore', chance:0.25}, flavor:'Corporate cold-storage, abandoned mid-heist.'});
  A('hk_datacore', {type:'hack', skill:'hacking', lvl:60, xp:120, time:5.0, name:'Dead Datacore',        icon:'🗄', zones:['undervault'], credits:[90,220], bonus:{item:'relic_circuitry', chance:0.15}, flavor:'Pre-Shatter encryption. Respect it. Break it.'});
  // -- piloting
  A('pl_canyon',   {type:'pilot', skill:'piloting', lvl:1,  xp:26,  time:5.0, name:'Canyon Skim',          icon:'🛶', zones:['haven'], credits:[4,8],   flavor:'Courier hop through the glass canyons.'});
  A('pl_slalom',   {type:'pilot', skill:'piloting', lvl:12, xp:48,  time:5.5, name:'Debris Slalom',        icon:'🛰', zones:['haven'], credits:[8,16],  flavor:'Thread the low-orbit junk stream.'});
  A('pl_beltrun',  {type:'pilot', skill:'piloting', lvl:25, xp:76,  time:6.0, name:'Belt Run',             icon:'☄', zones:['haven'], credits:[16,30], flavor:'Long haul along the shattered moon\'s ring.'});
  A('pl_stormdive',{type:'pilot', skill:'piloting', lvl:40, xp:115, time:6.5, name:'Storm Dive',           icon:'🌀', zones:['haven'], credits:[28,50], flavor:'Drop cargo through Cinder Sound\'s ion storms.'});
  A('pl_threading',{type:'pilot', skill:'piloting', lvl:60, xp:180, time:7.0, name:'Kessler Threading',    icon:'🧭', zones:['haven'], credits:[50,90], flavor:'The run that names legends. Zero margin.'});

  /* ---------------- enemies ---------------- */
  const ENEMIES = {};
  function E(id, def){ ENEMIES[id] = Object.assign({id}, def); }
  E('scrap_hound',    {name:'Scrap Hound',      icon:'🐕', lvl:3,  hp:20,  acc:10,  def:6,   hit:3,  spd:2.8, zones:['meridian','rustflats'], credits:[4,12],   loot:[{item:'scrap_plating', qty:[1,3], chance:0.8}]});
  E('rustback_scavver',{name:'Rustback Scavver', icon:'🦝', lvl:9,  hp:46,  acc:18,  def:13,  hit:5,  spd:2.6, zones:['rustflats'], credits:[8,20],   loot:[{item:'conduit_coil', qty:[1,2], chance:0.6},{item:'salvaged_tech', qty:[1,1], chance:0.15}]});
  E('feral_loader',   {name:'Feral Loader',     icon:'🏗', lvl:16, hp:82,  acc:28,  def:24,  hit:8,  spd:3.2, zones:['rustflats'], credits:[15,35],  loot:[{item:'servo_parts', qty:[1,2], chance:0.5},{item:'scrap_plating', qty:[2,4], chance:0.7}]});
  E('glasswing_swarm',{name:'Glasswing Swarm',  icon:'🦋', lvl:13, hp:58,  acc:24,  def:14,  hit:4,  spd:1.8, zones:['glasswood'], credits:[10,24],  loot:[{item:'lumen_moss', qty:[1,3], chance:0.6},{item:'spirefruit', qty:[1,2], chance:0.4}]});
  E('sporeback_strider',{name:'Sporeback Strider',icon:'🦗',lvl:22, hp:112, acc:34,  def:30,  hit:9,  spd:3.0, zones:['glasswood'], credits:[20,45],  loot:[{item:'spirefruit', qty:[1,3], chance:0.5},{item:'glasswood_resin', qty:[1,2], chance:0.5}]});
  E('verdant_stalker',{name:'Verdant Stalker',  icon:'🐆', lvl:32, hp:165, acc:46,  def:42,  hit:13, spd:2.7, zones:['glasswood'], credits:[35,70],  loot:[{item:'duskpetal', qty:[1,2], chance:0.5},{item:'anomaly_cache', qty:[1,1], chance:0.08}]});
  E('brine_lurker',   {name:'Brine Lurker',     icon:'🦀', lvl:30, hp:150, acc:44,  def:38,  hit:12, spd:2.9, zones:['cinder'], credits:[30,60],  loot:[{item:'razorjaw', qty:[1,2], chance:0.55},{item:'pulse_eel', qty:[1,1], chance:0.3}]});
  E('tidal_husk',     {name:'Tidal Husk',       icon:'🧟', lvl:42, hp:225, acc:58,  def:54,  hit:16, spd:3.1, zones:['cinder'], credits:[50,100], loot:[{item:'mirrorscale', qty:[1,1], chance:0.3},{item:'fusion_cell', qty:[1,1], chance:0.12},{item:'anomaly_cache', qty:[1,1], chance:0.08}]});
  E('cryo_wraith',    {name:'Cryo Wraith',      icon:'👻', lvl:50, hp:285, acc:70,  def:62,  hit:19, spd:2.8, zones:['kelvin'], credits:[60,120], loot:[{item:'cryotite_ore', qty:[1,3], chance:0.6},{item:'vantium_ore', qty:[1,2], chance:0.4}]});
  E('borehole_horror',{name:'Borehole Horror',  icon:'🪱', lvl:62, hp:390, acc:86,  def:78,  hit:24, spd:3.3, aggro:true, zones:['kelvin'], credits:[90,170], loot:[{item:'obsidite_ore', qty:[1,2], chance:0.45},{item:'fusion_cell', qty:[1,1], chance:0.25}]});
  E('vault_sentinel', {name:'Vault Sentinel',   icon:'🤖', lvl:70, hp:470, acc:98,  def:88,  hit:27, spd:3.0, aggro:true, zones:['undervault'], credits:[110,220], loot:[{item:'relic_circuitry', qty:[1,2], chance:0.35},{item:'vault_sigil', qty:[1,1], chance:0.25}]});
  E('hollow_custodian',{name:'Hollow Custodian', icon:'🗿', lvl:80, hp:590, acc:112, def:100, hit:32, spd:3.2, aggro:true, zones:['undervault'], credits:[150,300], loot:[{item:'vault_sigil', qty:[1,1], chance:0.35},{item:'neutronite_ore', qty:[1,2], chance:0.4},{item:'anomaly_cache', qty:[1,1], chance:0.1}]});
  E('rust_titan',     {name:'Rust Titan',       icon:'🏗', lvl:56, hp:330, acc:76,  def:70,  hit:21, spd:3.4, zones:['rustflats'], credits:[70,140],  loot:[{item:'servo_parts', qty:[2,4], chance:0.6},{item:'hullweave_mesh', qty:[1,2], chance:0.4},{item:'anomaly_cache', qty:[1,1], chance:0.1}]});
  E('echo_shade',     {name:'Echo Shade',       icon:'👤', lvl:75, hp:520, acc:104, def:92,  hit:29, spd:2.6, aggro:true, zones:['undervault'], credits:[130,260], loot:[{item:'echo_bloom', qty:[1,2], chance:0.4},{item:'relic_circuitry', qty:[1,1], chance:0.2},{item:'vault_sigil', qty:[1,1], chance:0.15}]});
  E('shard_golem',    {name:'Shard Golem',      icon:'🧊', lvl:85, hp:660, acc:120, def:108, hit:34, spd:3.4, aggro:true, zones:['kelvin'], credits:[170,340], loot:[{item:'neutronite_ore', qty:[1,2], chance:0.5},{item:'obsidite_ore', qty:[1,2], chance:0.5},{item:'anomaly_cache', qty:[1,1], chance:0.12}]});
  E('warden_7',       {name:'WARDEN-7',         icon:'👁', lvl:90, hp:880, acc:130, def:115, hit:38, spd:3.0, aggro:true, zones:['undervault'], boss:true, credits:[800,1500], loot:[{item:'neutronite_bar', qty:[2,4], chance:1},{item:'anomaly_cache', qty:[1,2], chance:0.6},{item:'relic_circuitry', qty:[2,3], chance:0.8}]});

  /* ---------------- zones ---------------- */
  const ZONES = {};
  const ZONE_ORDER = ['meridian','rustflats','glasswood','haven','cinder','kelvin','undervault'];
  function Z(id, def){ ZONES[id] = Object.assign({id}, def); }
  Z('meridian',  {name:'Wreck of the Meridian', icon:'🛶', always:true, facilities:['fabricator','galley','bench'],
    desc:'Your crash site and camp — half a hauler buried in dust. The galley still works. So does hope.'});
  Z('rustflats', {name:'The Rustflats', icon:'🏜', always:true,
    desc:'A horizon of fallen ships. Everything here is sharp, valuable, or hungry.'});
  Z('glasswood', {name:'Glasswood Verge', icon:'🌲', pilot:5,
    desc:'A forest of translucent trees chiming in the wind. Beautiful. Carnivorous in places.'});
  Z('haven',     {name:'Haven Station', icon:'🛰', quest:'q2', facilities:['fabricator','galley','chemlab','bench'], shop:true,
    desc:'The last big orbital. Markets, machinery, and the only honest quartermaster in the Reach.'});
  Z('cinder',    {name:'Cinder Sound', icon:'🌊', pilot:12, facilities:['galley'],
    desc:'An ion sea under a permanent storm. The shallows teem with charged fauna.'});
  Z('kelvin',    {name:'Kelvin Deep', icon:'🧊', pilot:22,
    desc:'Glacier-buried mining works. The cold preserved the ore — and other things.'});
  Z('undervault',{name:'The Undervault', icon:'🕳', pilot:45, quest:'q6',
    desc:'A sealed pre-Shatter archive beneath the shattered moon. Its custodians never got the memo.'});

  /* ---------------- missions ---------------- */
  const QUESTS = {};
  const QUEST_ORDER = ['q1','q2','q3','q13','q9','q5','q4','q12','q10','q6','q7','q8','q11'];
  function Q(id, def){ QUESTS[id] = Object.assign({id}, def); }
  Q('q1', {name:'Dead Stick', giver:'echo', reqs:{},
    blurb:'You walked away from the crash. Now prove you can live out here: scavenge, eat, and put a weapon on your hip.',
    objectives:[
      {type:'collect', item:'scrap_plating', qty:5},
      {type:'craft', item:'seared_skimmerling', qty:2},
      {type:'craft', item:'shock_baton', qty:1},
    ],
    rewards:{credits:250, xp:{salvaging:100, fabrication:100}}});
  Q('q2', {name:'Static on the Line', giver:'echo', reqs:{quests:['q1']},
    blurb:'The Meridian\'s distress beacon is dead and Haven Station can\'t hear you. Clear the scrap hounds nesting in the antenna mast and build a repair kit.',
    objectives:[
      {type:'kill', enemy:'scrap_hound', qty:4},
      {type:'craft', item:'beacon_repair_kit', qty:1},
    ],
    rewards:{credits:600, xp:{engineering:150, piloting:150}, unlockZone:'haven'}});
  Q('q3', {name:'The Glass Garden', giver:'saffi', reqs:{quests:['q2'], skills:{xenobotany:8}},
    blurb:'Haven\'s chemist pays well for proof you can work the Verge: fresh spirefruit, and stims brewed from it.',
    objectives:[
      {type:'collect', item:'spirefruit', qty:12},
      {type:'craft', item:'focus_stim', qty:3},
    ],
    rewards:{credits:800, xp:{chemistry:200}, items:{multitool_mk2:1}}});
  Q('q4', {name:'Cold Comfort', giver:'halden', reqs:{quests:['q3'], skills:{extraction:25}},
    blurb:'Kelvin Deep\'s old mining concern left vaults, veins and... residents. Survey the deep ice and crack what they sealed.',
    objectives:[
      {type:'collect', item:'vantium_ore', qty:15},
      {type:'hack', action:'hk_vaultdoor', qty:2},
      {type:'kill', enemy:'cryo_wraith', qty:3},
    ],
    rewards:{credits:1500, xp:{extraction:400, hacking:300}, items:{shield_capacitor:1}}});
  Q('q5', {name:'The Long Haul', giver:'vex', reqs:{quests:['q2'], skills:{piloting:15}},
    blurb:'The quartermaster needs vantium delivered through the junk stream, and only trusts pilots with logged runs.',
    objectives:[
      {type:'run', qty:12},
      {type:'collect', item:'vantium_bar', qty:8},
    ],
    rewards:{credits:2500, xp:{piloting:600}, items:{grapple_unit:1}}});
  Q('q6', {name:'Whisper Protocol', giver:'nyx', reqs:{quests:['q4'], skills:{hacking:35}},
    blurb:'Something under the shattered moon is broadcasting on a pre-Shatter channel. Build a decryptor, sharpen your intrusion skills, and answer it.',
    objectives:[
      {type:'hack', action:'hk_vaultdoor', qty:4},
      {type:'craft', item:'signal_decryptor', qty:1},
      {type:'kill', enemy:'tidal_husk', qty:5},
    ],
    rewards:{credits:4000, xp:{hacking:800}, unlockZone:'undervault'}});
  Q('q7', {name:'The Hollow Warden', giver:'nyx', reqs:{quests:['q6']},
    blurb:'The Undervault\'s machine warden has kept the archive sealed for fifty years. Collect three Vault Sigils from its custodians and put it to rest.',
    objectives:[
      {type:'collect', item:'vault_sigil', qty:3},
      {type:'kill', enemy:'warden_7', qty:1},
    ],
    rewards:{credits:10000, xp:{kinetics:500, marksmanship:500, psionics:500, resilience:500, vitality:500}, items:{warden_core:1}, title:'Vaultbreaker'}});
  Q('q9', {name:'The Driftrock Debt', giver:'okoye', reqs:{quests:['q2'], skills:{engineering:20}},
    blurb:'Driftrock\'s scavvers pulled you off a wreck once — before you ever woke in the Meridian. Boss Okoye is calling in the debt: the village is hungry, its water recycler is dead, and a feral Rust Titan is grinding their salvage runs to paste.',
    objectives:[
      {type:'collect', item:'glowfin_skewer', qty:8},
      {type:'craft', item:'water_recycler_core', qty:1},
      {type:'kill', enemy:'rust_titan', qty:2},
    ],
    rewards:{credits:2200, xp:{engineering:400, synthesis:250}, unlockShop:'moll'}});
  Q('q10', {name:'Tides of Brinemoor', giver:'maris', reqs:{quests:['q2'], skills:{trawling:30}},
    blurb:'Brinemoor\'s lantern festival marks fifty years since the Shatter — and the village means to celebrate in defiance of it. Elder Maris needs soup for the long tables, mirrorscale for the lanterns, and the shallows cleared of lurkers first.',
    objectives:[
      {type:'collect', item:'pulse_eel_soup', qty:6},
      {type:'kill', enemy:'brine_lurker', qty:6},
      {type:'collect', item:'mirrorscale', qty:4},
    ],
    rewards:{credits:2800, xp:{trawling:600, synthesis:300}, items:{tidecaller_charm:1}, unlockShop:'siska'}});
  Q('q13', {name:'Roots in the Glass', giver:'iva', reqs:{quests:['q3'], skills:{xenobotany:22, chemistry:15}},
    blurb:'Verdant Hollow — three platforms and a greenhouse among the chiming trees — is the Verge\'s only research station, and the sporeback striders have decided it\'s edible. Iva Ren needs resin stocks rebuilt, combat stims brewed at the Hollow\'s own lab, and the striders taught some manners.',
    objectives:[
      {type:'collect', item:'glasswood_resin', qty:12},
      {type:'craft', item:'combat_stim', qty:4},
      {type:'kill', enemy:'sporeback_strider', qty:4},
    ],
    rewards:{credits:1800, xp:{xenobotany:500, chemistry:300}, unlockShop:'fenn'}});
  Q('q12', {name:'The Ninth Bore', giver:'brakk', reqs:{quests:['q4'], skills:{extraction:40}},
    blurb:'Borehole 9 is the last working dig in Kelvin Deep — and its ninth bore just woke up hungry. Foreman Brakk needs the aurium quota met, the old corporate vaults opened for storage, and the horrors in the bore returned to the dark they came from.',
    objectives:[
      {type:'collect', item:'aurium_ore', qty:12},
      {type:'hack', action:'hk_vaultdoor', qty:3},
      {type:'kill', enemy:'borehole_horror', qty:2},
    ],
    rewards:{credits:3500, xp:{extraction:800, engineering:300}, items:{fusion_cell:3}, unlockShop:'ruta'}});
  Q('q8', {name:'Echoes in the Vault', giver:'nyx', reqs:{quests:['q7']},
    blurb:'With WARDEN-7 silent, the archive is finally listening. Nyx wants the truth it kept: crack its datacores, cut through the Echo Shades wearing dead archivists\' voices, and bring relic boards enough to rebuild the record of the day the sky broke.',
    objectives:[
      {type:'hack', action:'hk_datacore', qty:5},
      {type:'kill', enemy:'echo_shade', qty:4},
      {type:'collect', item:'relic_circuitry', qty:10},
    ],
    rewards:{credits:6000, xp:{hacking:1500, psionics:600}}});
  Q('q11', {name:'What the Shatter Hid', giver:'nyx', reqs:{quests:['q8']},
    blurb:'The record is rebuilt, and it says the Shatter was no accident — something was sealed in orbit, and the sky was broken to keep it there. Nyx needs proof the seal still holds: shards from the Singularity Scar, golem cores from the deep ice, and a meal fit for the last archivist\'s table while you both decide who to tell.',
    objectives:[
      {type:'collect', item:'singularity_shard', qty:3},
      {type:'kill', enemy:'shard_golem', qty:3},
      {type:'collect', item:'voidglass_terrine', qty:2},
    ],
    rewards:{credits:15000, xp:{extraction:1500, piloting:2000}, title:'Reachwarden'}});

  /* ---------------- vendors ---------------- */
  const SHOPS = {
    vex: {name:'Quartermaster Vex', stock:[
      {item:'solvent', price:15},
      {item:'emergency_ration', price:10},
      {item:'seared_skimmerling', price:25},
      {item:'focus_stim', price:120},
      {item:'multitool_mk1', price:300},
      {item:'scrap_pistol', price:280},
      {item:'neural_coil', price:280},
      {item:'patchwork_suit', price:320},
      {item:'patchwork_visor', price:180},
    ]},
    fenn: {name:'Greenhand Fenn', gatedBy:'q13', stock:[
      {item:'spirefruit', price:18},
      {item:'glasswood_resin', price:32},
      {item:'solvent', price:13},
      {item:'focus_stim', price:100},
      {item:'combat_stim', price:170},
      {item:'glowfin_skewer', price:40},
    ]},
    ruta: {name:'Deep-Ruta', gatedBy:'q12', stock:[
      {item:'cryotite_ore', price:24},
      {item:'vantium_ore', price:42},
      {item:'fusion_cell', price:110},
      {item:'ferrox_bar', price:26},
      {item:'multitool_mk3', price:1100},
      {item:'shield_serum', price:260},
      {item:'razorjaw_steak', price:75},
    ]},
    moll: {name:'Junk-Eye Moll', gatedBy:'q9', stock:[
      {item:'emergency_ration', price:8},
      {item:'solvent', price:13},
      {item:'shock_baton', price:180},
      {item:'multitool_mk1', price:240},
      {item:'patchwork_suit', price:260},
      {item:'combat_stim', price:190},
      {item:'conduit_coil', price:20},
    ]},
    siska: {name:'Salt-Siska', gatedBy:'q10', stock:[
      {item:'glowfin_skewer', price:38},
      {item:'razorjaw_steak', price:70},
      {item:'pulse_eel_soup', price:120},
      {item:'solvent', price:13},
      {item:'focus_stim', price:110},
      {item:'surge_stim', price:420},
    ]},
  };

  /* ---------------- people of the Reach ----------------
     dlg entries are checked top-down; first match speaks.
     when: '<status>:<questId>' against quest status, or omitted = default.
     offer/turnin attach mission buttons to the final line.       */
  const NPCS = [
    // —— Haven Station ——
    {id:'vex', name:'Quartermaster Vex', role:'Quartermaster of Haven', icon:'⬡', zone:'haven', dx:2, dz:2, roam:3, suit:0xc8a23c, visor:0xffe9b0, shop:'vex', dlg:[
      {when:'available:q5', offer:'q5', say:[
        'You\'re the drifter who fixed the Meridian\'s beacon? Half the station heard it wake up.',
        'I\'ve got vantium that needs moving through the junk stream, and the last three pilots I hired are now part of the junk stream.',
        'Log some runs so I know you can fly, bring me the bars, and I\'ll pay like you\'re irreplaceable. Because apparently everyone is.']},
      {when:'active:q5', say:['Bars and flight hours, drifter. The vantium doesn\'t care about your feelings and neither does the junk stream.']},
      {when:'complete:q5', turnin:'q5', say:['Every bar accounted for, and the dock log says you fly like you\'ve done it for years. Take the grapple unit — and my standing offer: anything in my crates is yours at list price.']},
      {when:'claimed:q11', say:['Reachwarden. Heh. I sold rations to a legend before anyone knew. That\'s going on my sign.']},
      {say:['Buy something or stand somewhere less expensive.',
        'Everything\'s priced fair. Fair to me, mostly, but fair.',
        'The Reach takes everything eventually. Insurance is cheap — it\'s called a second suit.']}]},
    {id:'saffi', name:'Saffi Oduya', role:'Station chemist', icon:'🧪', zone:'haven', dx:6, dz:-12, roam:4, suit:0x6ad4c8, visor:0xd8fff4, dlg:[
      {when:'available:q3', offer:'q3', say:[
        'You walked here from the Meridian wreck? Then you passed the Verge and didn\'t pick anything. Criminal.',
        'Spirefruit, drifter. The trees grow glass and the fruit grows answers — stims, serums, half my catalogue.',
        'Bring me a haul and brew the first batch yourself at my lab. I teach, you sweat, everyone profits.']},
      {when:'active:q3', say:['Fresh spirefruit, picked at the chime. And don\'t bruise them — the stims come out moody.']},
      {when:'complete:q3', turnin:'q3', say:['Look at these! And the stims — clean, stable, barely any screaming molecules. You\'ve got chemist\'s hands under those gloves. Take this multitool; you\'ve earned the upgrade.']},
      {when:'claimed:q8', say:['Echo blooms repeat the last thing they heard before the Shatter. Nyx says it\'s data. I say it\'s grief with petals. We\'re both right.']},
      {say:['The Verge chimes at dusk. That\'s the trees trading minerals — or gossiping. Science is undecided.',
        'If your stim glows green, drink it. If it glows red, sell it to someone you dislike.',
        'Pyrelace burns at exactly blood temperature. The Reach has a sense of humor.']}]},
    {id:'halden', name:'Halden Crowe', role:'Cryo-surveyor', icon:'🧊', zone:'haven', dx:-12, dz:-4, roam:5, suit:0x8aa4c8, visor:0xcfe8ff, dlg:[
      {when:'claimed:q11', say:['So the Shatter was aimed. Fifty years I blamed bad luck. Turns out the sky had better aim than luck ever did. Thank you for the truth, Reachwarden — it warms better than the heaters.']},
      {when:'available:q4', offer:'q4', say:[
        'You\'ve got working drills and a pulse — that\'s two more than my last survey team.',
        'Kelvin Deep. Corporate dug too far down before the Shatter, then left everything: the ore, the vaults, the... residents. I need the survey finished.',
        'Vantium samples, two vault doors opened, and the wraiths thinned out. Do that and the deep ice is yours to work forever.']},
      {when:'active:q4', say:['The wraiths sound like wind until the wind starts answering questions. Keep your visor sealed and your maul charged.']},
      {when:'complete:q4', turnin:'q4', say:['Vantium assays, door logs, three confirmed wraith kills. Survey\'s closed — fifty years late, but closed. The shield capacitor\'s yours; I\'ve no plans to need it again.']},
      {say:['I wintered three years in the Deep. The ice remembers heat the way the Reach remembers ships — jealously.',
        'If you hear drilling and your drill is off, leave the bore. That\'s free advice; the second telling costs.',
        'Shard golems weren\'t in any survey I ran. The ice is... inventing things now. Wonderful.']}]},
    {id:'nyx', name:'Archivist Nyx', role:'Keeper of pre-Shatter records', icon:'🕯', zone:'haven', dx:8, dz:-20, roam:3, suit:0x4e4660, visor:0xc8b8ff, dlg:[
      {when:'complete:q11', turnin:'q11', say:[
        'Shards from the Scar. Golem cores. And — is that a voidglass terrine? You absurd, magnificent drifter.',
        'The seal holds. The thing the old world buried in orbit is still falling and still failing to land, and now two people alive know why the sky broke.',
        'Eat with me. Then we decide, together, what the Reach gets told. Whatever we choose — the record will say a Reachwarden stood here.']},
      {when:'available:q11', offer:'q11', say:[
        'I rebuilt the record, drifter. I read it twice and then I sat in the dark for a day.',
        'The Shatter was aimed. The old world broke its own sky to seal something in orbit — a cascade as a cage.',
        'I need proof the cage still holds: shards from the Singularity Scar, cores from the golems the ice is building, and... bring food. Some truths shouldn\'t be read on an empty stomach.']},
      {when:'active:q11', say:['The Scar, the golems, the terrine. I\'ll be here, rehearsing how to say "the sky was a door" out loud.']},
      {when:'complete:q8', turnin:'q8', say:['Datacores, relic boards — and you walked through the Shades to get them. The record is whole again. Give me a night with it... and then come back. There\'s something you need to read.']},
      {when:'available:q8', offer:'q8', say:[
        'You killed the Warden and the archive started talking in its sleep. I\'ve waited fifty years to hear it.',
        'Its datacores hold the only unedited record of the day the sky broke. The Echo Shades will object — they\'re wearing the voices of my predecessors.',
        'Crack the cores. Quiet the Shades. Bring me relic boards enough to rebuild the truth.']},
      {when:'active:q8', say:['Every datacore is a page of the only book that matters. Mind the Shades — they quote the dead, and they aim while they do it.']},
      {when:'complete:q7', turnin:'q7', say:['The Warden is down. I felt the archive exhale from here. Take its core — and take the name the old records reserve for moments like this: Vaultbreaker.']},
      {when:'available:q7', offer:'q7', say:[
        'The decryptor worked. The Undervault\'s door knows your name now — but its Warden doesn\'t care.',
        'WARDEN-7. The old world\'s last sentry, still standing post over a finished war.',
        'Its custodians carry Vault Sigils. Three will open the inner door. The Warden will try to close it with you inside. End it.']},
      {when:'active:q7', say:['Three sigils, one Warden. History is rarely this tidy — don\'t waste the symmetry.']},
      {when:'complete:q6', turnin:'q6', say:[
        'The decryptor sings, the vaults are open practice, and the southern approach is quiet. You\'ve done it — the Undervault will answer us now.',
        'The gate stands open, drifter. Fifty years of silence, and you picked the lock.']},
      {when:'available:q6', offer:'q6', say:[
        'You hear it too, don\'t you? Under the static. The Undervault is whispering on a channel that died fifty years ago.',
        'I am the last archivist of a world that no longer exists, and I am telling you: that whisper is an index. A table of contents. The archive is intact.',
        'Build a decryptor. Sharpen your intrusion work on Kelvin\'s vaults. And clear the husks off the southern approach — I intend to follow you down one day.']},
      {when:'active:q6', say:['The whisper repeats every forty signals. It\'s patient. Be more patient.']},
      {when:'claimed:q11', say:['We chose well, I think. The Reach deserves its truth in doses it can survive.', 'The record names you Reachwarden. The record, for once, is accurate.']},
      {say:['Before the Shatter, this system held nine billion voices. I keep what\'s left of them.',
        'Every wreck in the sky is a sentence from a book the Reach forgot how to read.',
        'The debris ring sets in the west this month. The old calendars called it Lantern Season.']}]},
    {id:'reyes', name:'Dockmaster Reyes', role:'Runs the Haven hangar', icon:'🛰', zone:'haven', dx:-22, dz:-2, roam:5, suit:0x8a93a8, visor:0xffd9a0, dlg:[
      {when:'claimed:q11', say:['Word\'s out, you know. Not the whole truth — Nyx is careful — but enough that pilots fly the ring lanes quieter now. Like the sky\'s listening. Maybe it always was.']},
      {when:'claimed:q5', say:['Vex still tells people about your vantium run. In the version from last week you did it blindfolded.']},
      {say:['Canyon Skim\'s a milk run. Kessler Threading has a memorial plaque. Work your way up, yeah?',
        'Every pilot who brags about the junk stream is lying or new. The good ones just shrug.',
        'Your bird\'s always fueled here, drifter. Pad fees waived for anyone who actually lands on the pad.']}]},
    // —— Driftrock, the scavver village ——
    {id:'okoye', name:'Boss Okoye', role:'Holds Driftrock together', icon:'🔧', zone:'rustflats', dx:-16, dz:-30, roam:4, suit:0xa8623c, visor:0xffd9b0, dlg:[
      {when:'available:q9', offer:'q9', say:[
        'I know your face, drifter. My crew cut you out of a cryopod two years before the Meridian finished falling. You owe Driftrock a life.',
        'I\'m collecting. The recycler\'s dead, the kids are eating rust-flavored paste, and a feral Rust Titan has claimed our best salvage runs.',
        'Skewers for the table, a new recycler core from your bench, and that Titan in pieces. Then we\'re square — better than square.']},
      {when:'active:q9', say:['The Titan dens by the warship ribcage. It used to load cargo. Now it loads graves. Mind its reach.']},
      {when:'complete:q9', turnin:'q9', say:['Water\'s running clear, the kids are fed, and Pim\'s wearing a Titan bolt as a necklace. Debt\'s paid, drifter. Moll will trade with you now — that\'s worth more out here than my thanks.']},
      {when:'claimed:q9', say:['Recycler\'s still humming. You ever need a roof in the Rustflats, one of ours is yours.']},
      {say:['Driftrock stands because nobody here believes in luck. We believe in inventory.',
        'Haven calls us squatters. Haven also buys our salvage. Pride\'s cheaper than plating.',
        'You salvage clean, you live long. You salvage greedy, you ARE salvage.']}]},
    {id:'moll', name:'Junk-Eye Moll', role:'Driftrock\'s trader', icon:'👁', zone:'rustflats', dx:-22, dz:-36, roam:3, suit:0x7a6a4a, visor:0xa0ffe0, shop:'moll', dlg:[
      {when:'claimed:q9', say:['Okoye says you\'re square with the rock, which makes you square with me. Browse, haggle, just don\'t breathe on the good shelf.']},
      {say:['I trade with Driftrock and Driftrock trades with people Okoye vouches for. See the problem, stranger?',
        'My left eye\'s glass and my right eye\'s worse, but I can still spot a freeloader at forty meters.']}]},
    {id:'pim', name:'Pim', role:'Scavver kid, future legend', icon:'🪛', zone:'rustflats', dx:-8, dz:-26, roam:16, suit:0x96603c, visor:0xb0e8ff, dlg:[
      {when:'claimed:q9', say:['You should\'ve SEEN the Titan go down! I\'m telling it with two Titans from now on. Maybe a third for Haven crowds.']},
      {say:['I found a whole servo arm yesterday. Okoye says I can keep it if I stop calling it my brother.',
        'When I\'m big I\'m going to fly Kessler Threading backwards. Reyes says that\'s illegal. So was being born out here!',
        'The hounds don\'t bite Driftrock kids. We taste like rust.']}]},
    // —— Brinemoor, the stilt village ——
    {id:'maris', name:'Elder Maris', role:'Keeper of Brinemoor\'s lanterns', icon:'🏮', zone:'cinder', dx:-12, dz:10, roam:4, suit:0x5a8a9a, visor:0xd0f8ff, dlg:[
      {when:'available:q10', offer:'q10', say:[
        'Fifty years this season since the sky broke, drifter. Brinemoor answers grief the only way that\'s ever worked: lanterns on the water and soup for everyone.',
        'But the lurkers have claimed the festival shallows, the long tables stand empty, and we\'re short mirrorscale for the lantern skins.',
        'Clear the shallows. Fill the pots. Bring the scale. Help us light the Sound the way it deserves.']},
      {when:'active:q10', say:['Soup, scale, and quiet water. The Sound gives all three to those who ask properly — with a net and a blade.']},
      {when:'complete:q10', turnin:'q10', say:['Tonight a thousand lanterns answer the Shatter, and yours burn at the front. Take the Tidecaller — it has hung by my door for thirty years waiting for hands like yours. And trade with Siska as family does.']},
      {when:'claimed:q10', say:['The lanterns still talk about you, drifter. So do we.']},
      {say:['The Sound took our boats the year I was born and gave them back as reefs. We fish our own history here.',
        'Storm-light on the water means the eels are running. Or that the sky misses us. Both are true.',
        'Haven counts credits. Brinemoor counts tides. We\'re both rich, differently.']}]},
    {id:'siska', name:'Salt-Siska', role:'Brinemoor\'s trader', icon:'🧂', zone:'cinder', dx:-18, dz:14, roam:3, suit:0x6a9aaa, visor:0xffe9b0, shop:'siska', dlg:[
      {when:'claimed:q10', say:['Festival-friend! My stock\'s your stock. The soup recipe stays mine though — Maris made me swear on a tide.']},
      {say:['I sell to Brinemoor and Brinemoor\'s friends. Light a lantern with us first, stranger — then we talk fish.',
        'Everything I stock swam, grew, or fermented within sight of this porch. Quality you can smell.']}]},
    {id:'tarn', name:'Fisher Tarn', role:'Knows every eddy in the Sound', icon:'🪝', zone:'cinder', dx:-7, dz:9, roam:10, suit:0x4a7a8a, visor:0xc0f0ff, dlg:[
      {when:'claimed:q10', say:['Saw a riftmaw breach clean out of the water during the festival. Even the monsters came to watch. Your doing, I reckon.']},
      {say:['Throw the first skimmerling back. Always. The Sound keeps books.',
        'Mirrorscale run silver before a storm and gold after. Catch the gold ones — they\'ve seen something.',
        'My grandmother netted a pulse eel barehanded. My grandmother also had four fingers. Use the net.']}]},
    // —— the wilds ——
    // —— Verdant Hollow, the grove hamlet ——
    {id:'iva', name:'Iva Ren', role:'Field botanist of the Hollow', icon:'🌿', zone:'glasswood', dx:-12, dz:-20, roam:14, suit:0x3f7058, visor:0xd8ffd0, dlg:[
      {when:'complete:q13', turnin:'q13', say:[
        'Resin, stims, and four fewer striders eating my sample plots. The Hollow breathes easier — and my monograph finally has a co-author credit.',
        'Fenn will trade with you now. Fair warning: their prices are honest and their opinions are free.']},
      {when:'available:q13', offer:'q13', say:[
        'Welcome to Verdant Hollow, drifter — three platforms, one greenhouse, and the only research station the Verge has ever tolerated.',
        'Saffi says you can brew. Good. The striders have gotten bold, my resin stock is gone, and I need combat stims I can trust at dusk.',
        'Tap the glasswood, brew at our lab, and thin the sporebacks. Do that and the Hollow is your second home.']},
      {when:'active:q13', say:['Resin from the trunks, stims from the lab, striders off my plots. The order matters less than the doing.']},
      {when:'claimed:q11', say:['Echo blooms in the Undervault, voidlotus in the dark, and now the records say the sky was a cage. The flora knew, drifter. The flora always knew.']},
      {say:['The glasswood trees aren\'t trees. They\'re coral that learned about the sky. Don\'t tell the trees I said so.',
        'Duskpetal opens for planet-shadow and closes for torchlight. It has better taste than most people.',
        'I\'ve named forty-one species out here. The stalkers keep eating my naming committee — mind yourself after dusk.']}]},
    {id:'senna', name:'Warden Senna', role:'Keeps the Hollow\'s perimeter', icon:'🏹', zone:'glasswood', dx:-18, dz:-18, roam:12, suit:0x2a5a44, visor:0xb0ffd8, dlg:[
      {when:'claimed:q13', say:['Four striders down and the dusk watch got quiet. You hear that? Me neither. Best sound in the Verge.']},
      {say:['I walk the platforms at dusk and count the chimes. Wrong number of chimes means company.',
        'Iva names the plants. I name the things that eat the plants. Shorter list, worse names.',
        'Stay on the lit paths after dark, drifter. The Verge is beautiful the way deep water is beautiful.']}]},
    {id:'fenn', name:'Greenhand Fenn', role:'The Hollow\'s trader', icon:'🌱', zone:'glasswood', dx:-10, dz:-18, roam:4, suit:0x4f7a4a, visor:0xe0ffc0, shop:'fenn', dlg:[
      {when:'claimed:q13', say:['Iva vouched, Senna nodded, and that\'s the whole bureaucracy of the Hollow. Shelves are open — everything picked under this canopy.']},
      {say:['I trade with Hollow folk. Help Iva with her strider problem and we\'ll talk proper.',
        'No, the greenhouse isn\'t for sale. Yes, everyone asks.']}]},
    // —— Borehole 9, the mining outpost ——
    {id:'goss', name:'Vey Goss', role:'Prospector of Borehole 9', icon:'⛏', zone:'kelvin', dx:11, dz:9, roam:12, suit:0x8aa4c8, visor:0xfff0c0, dlg:[
      {when:'claimed:q4', say:['Crowe closed his survey thanks to you, which means MY claims are legal now. First aurium vein\'s named after my mother. Second one\'s named after you.']},
      {say:['Cold keeps the ore honest and the company scarce. Paradise, if you dress for it.',
        'The golems started showing up near the neutronite taps. Ice doesn\'t build things, friend. Except now it does.',
        'Forty years prospecting and my best find is still a thermos that actually seals.']}]},
    {id:'brakk', name:'Foreman Brakk', role:'Runs Borehole 9', icon:'🪨', zone:'kelvin', dx:16, dz:4, roam:5, suit:0x6a5a48, visor:0xffd0a0, dlg:[
      {when:'available:q12', offer:'q12', say:[
        'Borehole 9. Last working dig in the Deep — three huts, one drill, and more grit than the rest of the Reach combined.',
        'Crowe\'s survey says the ninth bore is clear. Crowe\'s survey doesn\'t swing a pick. The bore\'s full of horrors and the aurium quota\'s overdue.',
        'Ore for the quota, the old vault doors opened for storage, and the horrors dead. Pull that off and Ruta\'s shelves open to you.']},
      {when:'active:q12', say:['Quota first, drifter. The Deep respects tonnage and nothing else.']},
      {when:'complete:q12', turnin:'q12', say:['Quota met, vaults open, horrors quiet. The ninth bore is a working dig again — first time in fifty years. These fusion cells are yours; we pull more out of the walls than we can burn.']},
      {when:'claimed:q12', say:['The bore\'s singing today. Good tonnage. You want work, the board at Haven always knows our quotas.']},
      {say:['Heaters stay on, drills stay turning, people stay alive. Management philosophy, Borehole style.',
        'Haven calls this a hardship post. Haven has never seen an aurium vein by floodlight.']}]},
    {id:'ruta', name:'Deep-Ruta', role:'Borehole 9\'s trader', icon:'💎', zone:'kelvin', dx:12, dz:2, roam:4, suit:0x5a6a8a, visor:0xc0e8ff, shop:'ruta', dlg:[
      {when:'claimed:q12', say:['Brakk says you dig like you were born down here. Shelves are open — ore, bars, cells, and the only hot steaks in the Deep.']},
      {say:['Stock\'s for crew. Help Brakk make quota and you\'re crew.',
        'Everything here was carried up nine hundred meters of ice. The prices reflect the cardio.']}]},
    // —— Threshold Camp, at the Undervault door ——
    {id:'vael', name:'Guide Vael', role:'Watches the Undervault door', icon:'🕳', zone:'undervault', dx:-27, dz:26, roam:8, suit:0x3a3242, visor:0xd8c8ff, dlg:[
      {when:'claimed:q11', say:['Reachwarden. I guided survey teams to this door for thirty years and never once saw it open. Now I drink tea inside it. History\'s strange company.']},
      {when:'claimed:q7', say:['The Warden\'s quiet and the halls breathe easy. I still count everyone who walks in. Old habits — but now they all walk out, too.']},
      {when:'claimed:q6', say:['So the door knows your name now. I\'ll mark you in the ledger: one drifter, in and — let\'s keep it — out.']},
      {say:['I keep the camp, the ledger, and the kettle. In thirty years the door has eaten eleven expeditions. You look like you might be the twelfth — or the first to come back.',
        'The Shades quote the dead at you. Don\'t answer. They take answers as invitations.',
        'Echo blooms grow thicker near the door every year. Something in there is gardening.']}]},
  ];

  /* ---------------- dynamic world events ----------------
     Timed regional happenings; the bonus applies while you're
     in the event's region. The Reach never sits still.        */
  const EVENTS = [
    {id:'meteor',  name:'Meteor Shower',     zone:'rustflats', icon:'☄', mult:1.5, skills:['salvaging','extraction'],
      desc:'Fresh wreckage rains over the flats — Salvaging & Extraction XP +50% there.'},
    {id:'bloom',   name:'Lumen Bloom',       zone:'glasswood', icon:'🌺', mult:1.5, skills:['xenobotany'],
      desc:'The whole Verge lights up at once — Xenobotany XP +50% there.'},
    {id:'shoal',   name:'Silver Shoal',      zone:'cinder',    icon:'🐟', mult:1.5, skills:['trawling'],
      desc:'A vast shoal enters the Sound — Trawling XP +50% there.'},
    {id:'aurora',  name:'Deep Aurora',       zone:'kelvin',    icon:'❄', mult:1.5, skills:['extraction','salvaging'],
      desc:'The ice sings under the lights — Extraction & Salvaging XP +50% there.'},
    {id:'surge',   name:'Grid Surge',        zone:'haven',     icon:'⚡', mult:1.4, skills:['fabrication','synthesis','chemistry','engineering'],
      desc:'Haven\'s reactors run hot — crafting XP +40% at the station.'},
    {id:'echoes',  name:'Echo Tide',         zone:'undervault',icon:'👁', mult:1.4, skills:['kinetics','marksmanship','psionics','resilience','vitality'],
      desc:'The archive stirs in its sleep — combat XP +40% in the Undervault.'},
    {id:'lanes',   name:'Clear Lanes',       zone:'haven',     icon:'🚀', mult:1.5, skills:['piloting'],
      desc:'The junk stream parts — Piloting XP +50% at the hangar.'},
    {id:'ghostnet',name:'Ghost Frequencies', zone:'rustflats', icon:'🔓', mult:1.5, skills:['hacking'],
      desc:'Dead networks wake across the flats — Hacking XP +50% there.'},
  ];

  /* ---------------- misc ---------------- */
  const FACILITY_NAMES = {fabricator:'Fabricator', galley:'Galley', chemlab:'Chem Lab', bench:'Engineering Bench'};
  const UNARMED = {name:'Bare Hands', acc:6, hit:2, spd:3.0, style:'kinetics'};
  const MAX_LEVEL = 100;

  const INTRO_LORE = 'Fifty years ago an orbital cascade — the Shatter — chewed this system\'s sky into a permanent storm of wreckage, and the Reach fell off every star chart. You just crash-landed in the bones of the hauler Meridian with a cracked visor, a dead beacon, and one bar of charge in your multitool. Out here, every skill you learn is the difference between being salvage and being a legend.';

  /* ---------------- world authoring (3D open world) ----------------
     One continuous landmass. Regions are walkable discs joined by
     valley corridors; mountains wall off everything else. Gates sit in
     corridors and open when the destination zone's requirements are met.
     Positions: x east, z south. dx/dz are offsets from region center. */
  const WORLD = {
    camp:{x:4, z:74},                       // respawn point at the Meridian wreck
    regions:[
      {zone:'meridian',  x:0,    z:60,   r:48, color:0x46584e, decor:'camp'},
      {zone:'rustflats', x:-130, z:10,   r:60, color:0x6e5337, decor:'wrecks'},
      {zone:'glasswood', x:125,  z:35,   r:55, color:0x3f7058, decor:'trees'},
      {zone:'haven',     x:-5,   z:-85,  r:45, color:0x565f6e, decor:'station'},
      {zone:'cinder',    x:70,   z:150,  r:60, color:0x3a4046, decor:'shore'},
      {zone:'kelvin',    x:-120, z:-140, r:60, color:0xb9cdd9, decor:'ice'},
      {zone:'undervault',x:120,  z:-150, r:55, color:0x453e54, decor:'ruins'},
    ],
    corridors:[
      {a:'meridian', b:'rustflats',  w:13},
      {a:'meridian', b:'glasswood',  w:12, gate:'glasswood'},
      {a:'meridian', b:'haven',      w:13, gate:'haven'},
      {a:'meridian', b:'cinder',     w:12, gate:'cinder'},
      {a:'haven',    b:'kelvin',     w:12, gate:'kelvin'},
      {a:'haven',    b:'undervault', w:12, gate:'undervault'},
    ],
    water:[                                  // carved pools; global water plane shows in dips
      {x:0,   z:96,  r:12},                  // coolant lagoon at camp
      {x:95,  z:196, r:48},                  // the ion sea, Cinder Sound's south-east bay
      {x:124, z:-132, r:9},                  // black pool in the Undervault
    ],
    // gather / hack nodes — interactive world objects bound to ACTIONS
    nodes:[
      // Wreck of the Meridian
      {action:'sv_scrap',   zone:'meridian', dx:-15, dz:-8},
      {action:'sv_scrap',   zone:'meridian', dx:14,  dz:16},
      {action:'xb_moss',    zone:'meridian', dx:22,  dz:-12},
      {action:'xb_moss',    zone:'meridian', dx:-24, dz:12},
      {action:'tw_skimmer', zone:'meridian', dx:-3,  dz:33, water:true},
      // The Rustflats
      {action:'sv_scrap',     zone:'rustflats', dx:24,  dz:14},
      {action:'sv_scrap',     zone:'rustflats', dx:-10, dz:30},
      {action:'sv_coil',      zone:'rustflats', dx:-22, dz:-12},
      {action:'sv_coil',      zone:'rustflats', dx:8,   dz:-26},
      {action:'sv_servo',     zone:'rustflats', dx:-34, dz:10},
      {action:'sv_servo',     zone:'rustflats', dx:28,  dz:-18},
      {action:'sv_hullweave', zone:'rustflats', dx:-6,  dz:-38},
      {action:'ex_ferrox',    zone:'rustflats', dx:36,  dz:24},
      {action:'ex_ferrox',    zone:'rustflats', dx:18,  dz:36},
      {action:'ex_ferrox',    zone:'rustflats', dx:-28, dz:32},
      {action:'ex_cryotite',  zone:'rustflats', dx:-40, dz:-22},
      {action:'hk_lockbox',   zone:'rustflats', dx:2,   dz:8},
      // Glasswood Verge
      {action:'xb_moss',       zone:'glasswood', dx:-26, dz:18},
      {action:'xb_spirefruit', zone:'glasswood', dx:10,  dz:-14},
      {action:'xb_spirefruit', zone:'glasswood', dx:24,  dz:8},
      {action:'xb_spirefruit', zone:'glasswood', dx:-8,  dz:24},
      {action:'xb_resin',      zone:'glasswood', dx:-20, dz:-22},
      {action:'xb_resin',      zone:'glasswood', dx:32,  dz:-8},
      {action:'xb_duskpetal',  zone:'glasswood', dx:-34, dz:6},
      {action:'xb_duskpetal',  zone:'glasswood', dx:14,  dz:32},
      {action:'xb_pyrelace',   zone:'glasswood', dx:36,  dz:22},
      {action:'xb_pyrelace',   zone:'glasswood', dx:-12, dz:-34},
      // Haven Station
      {action:'hk_maintenance', zone:'haven', dx:-16, dz:10},
      // Cinder Sound (trawl spots sit just offshore in the bay)
      {action:'tw_skimmer',  zone:'cinder', dx:-8,  dz:30, water:true},
      {action:'tw_glowfin',  zone:'cinder', dx:0,   dz:30, water:true},
      {action:'tw_glowfin',  zone:'cinder', dx:22,  dz:26, water:true},
      {action:'tw_razorjaw', zone:'cinder', dx:38,  dz:18, water:true},
      {action:'tw_eel',      zone:'cinder', dx:-16, dz:34, water:true},
      {action:'tw_mirror',   zone:'cinder', dx:12,  dz:38, water:true},
      // Kelvin Deep
      {action:'ex_cryotite',   zone:'kelvin', dx:18,  dz:20},
      {action:'ex_vantium',    zone:'kelvin', dx:-14, dz:-18},
      {action:'ex_vantium',    zone:'kelvin', dx:26,  dz:-10},
      {action:'ex_vantium',    zone:'kelvin', dx:-30, dz:14},
      {action:'ex_aurium',     zone:'kelvin', dx:8,   dz:-32},
      {action:'ex_aurium',     zone:'kelvin', dx:-36, dz:-12},
      {action:'ex_obsidite',   zone:'kelvin', dx:34,  dz:18},
      {action:'ex_obsidite',   zone:'kelvin', dx:-20, dz:-36},
      {action:'ex_neutronite', zone:'kelvin', dx:40,  dz:-24},
      {action:'sv_fusion',     zone:'kelvin', dx:-8,  dz:34},
      {action:'sv_fusion',     zone:'kelvin', dx:16,  dz:38},
      {action:'hk_vaultdoor',  zone:'kelvin', dx:0,   dz:-8},
      // The Undervault
      {action:'sv_relic',    zone:'undervault', dx:-18, dz:-12},
      {action:'sv_relic',    zone:'undervault', dx:24,  dz:-20},
      {action:'xb_voidlotus',zone:'undervault', dx:-28, dz:14},
      {action:'xb_voidlotus',zone:'undervault', dx:14,  dz:26},
      {action:'tw_riftmaw',  zone:'undervault', dx:4,   dz:18, water:true},
      {action:'hk_datacore', zone:'undervault', dx:-4,  dz:-28},
      // late-game expansion nodes (the freighter lies in the shallows — cut from the shore)
      {action:'sv_shipbreak',  zone:'cinder', dx:5,   dz:11, water:true},
      {action:'sv_shipbreak',  zone:'cinder', dx:-10, dz:26, water:true},
      {action:'ex_singularity',zone:'undervault', dx:-10, dz:36},
      {action:'ex_singularity',zone:'undervault', dx:32,  dz:24},
      {action:'xb_echobloom',  zone:'undervault', dx:-36, dz:-6},
      {action:'xb_echobloom',  zone:'undervault', dx:10,  dz:-38},
      {action:'tw_phasefin',   zone:'undervault', dx:6,   dz:14, water:true},
    ],
    facilities:[
      {f:'fabricator', zone:'meridian', dx:7,  dz:-4},
      {f:'galley',     zone:'meridian', dx:13, dz:2},
      {f:'bench',      zone:'meridian', dx:10, dz:9},
      {f:'fabricator', zone:'haven', dx:10,  dz:-8},
      {f:'galley',     zone:'haven', dx:16,  dz:-2},
      {f:'chemlab',    zone:'haven', dx:4,   dz:-14},
      {f:'bench',      zone:'haven', dx:14,  dz:6},
      {f:'galley',     zone:'cinder', dx:-12, dz:2},
      // village services along the road — the journey shouldn't require hauling home
      {f:'galley',     zone:'glasswood', dx:-8,  dz:-12},
      {f:'chemlab',    zone:'glasswood', dx:-20, dz:-12},
      {f:'galley',     zone:'kelvin', dx:9,   dz:1},
      {f:'bench',      zone:'kelvin', dx:20,  dz:10},
    ],
    hangar:{zone:'haven', dx:-26, dz:-6},
    board:{zone:'haven', dx:-8, dz:14},
    villages:[
      {id:'driftrock', name:'Driftrock',      zone:'rustflats',  dx:-18, dz:-34, kind:'shanty'},
      {id:'brinemoor', name:'Brinemoor',      zone:'cinder',     dx:-10, dz:14,  kind:'stilt'},
      {id:'verdant',   name:'Verdant Hollow', zone:'glasswood',  dx:-14, dz:-16, kind:'grove'},
      {id:'borehole',  name:'Borehole 9',     zone:'kelvin',     dx:14,  dz:6,   kind:'mining'},
      {id:'threshold', name:'Threshold Camp', zone:'undervault', dx:-30, dz:24,  kind:'camp'},
    ],
    enemies:[
      {e:'scrap_hound',     zone:'meridian', dx:30,  dz:20},
      {e:'scrap_hound',     zone:'meridian', dx:-26, dz:20},
      {e:'scrap_hound',     zone:'rustflats', dx:14, dz:22},
      {e:'scrap_hound',     zone:'rustflats', dx:-18, dz:18},
      {e:'rustback_scavver',zone:'rustflats', dx:-26, dz:-30},
      {e:'rustback_scavver',zone:'rustflats', dx:34,  dz:-28},
      {e:'rustback_scavver',zone:'rustflats', dx:44,  dz:6},
      {e:'feral_loader',    zone:'rustflats', dx:-44, dz:0},
      {e:'feral_loader',    zone:'rustflats', dx:12,  dz:-40},
      {e:'glasswing_swarm', zone:'glasswood', dx:0,   dz:8},
      {e:'glasswing_swarm', zone:'glasswood', dx:-26, dz:-10},
      {e:'glasswing_swarm', zone:'glasswood', dx:26,  dz:30},
      {e:'sporeback_strider',zone:'glasswood', dx:40, dz:4},
      {e:'sporeback_strider',zone:'glasswood', dx:-30, dz:28},
      {e:'verdant_stalker', zone:'glasswood', dx:8,   dz:-32},
      {e:'verdant_stalker', zone:'glasswood', dx:-40, dz:-18},
      {e:'brine_lurker',    zone:'cinder', dx:-28, dz:-8},
      {e:'brine_lurker',    zone:'cinder', dx:8,   dz:-18},
      {e:'brine_lurker',    zone:'cinder', dx:30,  dz:-2},
      {e:'tidal_husk',      zone:'cinder', dx:-42, dz:-20},
      {e:'tidal_husk',      zone:'cinder', dx:42,  dz:-24},
      {e:'cryo_wraith',     zone:'kelvin', dx:-24, dz:28},
      {e:'cryo_wraith',     zone:'kelvin', dx:28,  dz:32},
      {e:'cryo_wraith',     zone:'kelvin', dx:-40, dz:-30},
      {e:'borehole_horror', zone:'kelvin', dx:42,  dz:0},
      {e:'borehole_horror', zone:'kelvin', dx:-6,  dz:-44},
      {e:'vault_sentinel',  zone:'undervault', dx:-26, dz:-26},
      {e:'vault_sentinel',  zone:'undervault', dx:28,  dz:6},
      {e:'vault_sentinel',  zone:'undervault', dx:-10, dz:30},
      {e:'hollow_custodian',zone:'undervault', dx:34,  dz:-30},
      {e:'hollow_custodian',zone:'undervault', dx:-36, dz:8},
      {e:'warden_7',        zone:'undervault', dx:2,   dz:-4},
      // expansion hostiles
      {e:'rust_titan',      zone:'rustflats', dx:34,  dz:-28},
      {e:'rust_titan',      zone:'rustflats', dx:-30, dz:30},
      {e:'echo_shade',      zone:'undervault', dx:-22, dz:12},
      {e:'echo_shade',      zone:'undervault', dx:18,  dz:-18},
      {e:'echo_shade',      zone:'undervault', dx:38,  dz:16},
      {e:'shard_golem',     zone:'kelvin', dx:22,  dz:-42},
      {e:'shard_golem',     zone:'kelvin', dx:-46, dz:6},
    ],
  };

  return {SKILLS, GATHER_SKILLS, OFFENSE_SKILLS, COMBAT_SKILLS, ITEMS, ACTIONS, ENEMIES, ZONES, ZONE_ORDER, QUESTS, QUEST_ORDER, SHOPS, NPCS, EVENTS, FACILITY_NAMES, UNARMED, MAX_LEVEL, INTRO_LORE, WORLD};
})();
