/* Car City Game — game-minecraft.js (part 3/16, split from the old game.js).
   Plain JS, ONE shared global scope across all scripts — the load order in index.html MUST stay: core, world, vehicles, then game-* parts in numbered order. */
/* ================= HEARTS: your health (cave boss fights & the Minecraft world) ================= */
const PHP={v:10,max:10,hurtAt:0,regenT:0};
const heartsDiv=document.createElement("div");
heartsDiv.id="hearts";
heartsDiv.style.cssText="position:absolute;left:50%;transform:translateX(-50%);bottom:92px;font-size:20px;letter-spacing:2px;text-shadow:0 2px 5px rgba(0,0,0,.7);display:none;pointer-events:none;z-index:30";
$("hud").appendChild(heartsDiv);
function heartsShow(on){heartsDiv.style.display=on?"block":"none";if(on)heartsUI();}
function heartsUI(){let s="";for(let i=0;i<PHP.max;i++)s+=i<PHP.v?"❤️":"🖤";heartsDiv.textContent=s;}
function heartsReset(){PHP.v=PHP.max;PHP.hurtAt=0;heartsUI();}
function playerHurt(n){
  const now=performance.now();
  if(now-PHP.hurtAt<900)return false;   // short mercy time between hits
  PHP.hurtAt=now;PHP.v=Math.max(0,PHP.v-n);heartsUI();
  return true;
}
function heartsRegen(dt){
  if(PHP.v>=PHP.max)return;
  if(performance.now()-PHP.hurtAt<4000)return;   // no regen right after a hit
  PHP.regenT+=dt;
  if(PHP.regenT>5){PHP.regenT=0;PHP.v=Math.min(PHP.max,PHP.v+1);heartsUI();}
}
/* ================= THE CAVE BOSS: a rock golem deep in every cave =================
   Win the fight: you GET 10% of your money. Lose all hearts: you LOSE 10%. */
const BOSS={on:false,hp:0,max:12,g:null,x:0,z:0,cool:0,lastT:0};
function buildBossMesh(){
  const g=new THREE.Group();
  const rockM=new THREE.MeshLambertMaterial({color:0x6b6258});
  const rockD=new THREE.MeshLambertMaterial({color:0x4a443c});
  const body=new THREE.Mesh(new THREE.BoxGeometry(2.2,2.2,1.5),rockM);body.position.y=2;g.add(body);
  const head=new THREE.Mesh(new THREE.BoxGeometry(1.3,1.1,1.2),rockD);head.position.y=3.7;g.add(head);
  const eyeM=new THREE.MeshBasicMaterial({color:0xff3020});
  [[-0.3],[0.3]].forEach(p=>{const e=new THREE.Mesh(new THREE.BoxGeometry(0.26,0.18,0.1),eyeM);e.position.set(p[0],3.8,0.63);g.add(e);});
  [[-1.5],[1.5]].forEach(p=>{
    const arm=new THREE.Mesh(new THREE.BoxGeometry(0.8,2.4,0.8),rockD);arm.position.set(p[0],2,0);g.add(arm);
    const fist=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),rockM);fist.position.set(p[0],0.6,0);g.add(fist);
  });
  [[-0.6],[0.6]].forEach(p=>{const leg=new THREE.Mesh(new THREE.BoxGeometry(0.85,1,0.9),rockD);leg.position.set(p[0],0.5,0);g.add(leg);});
  return g;
}
function startBoss(){
  if(BOSS.on)return;
  BOSS.on=true;BOSS.hp=BOSS.max;BOSS.cool=0;BOSS.lastT=performance.now();
  BOSS.x=CAVE.cx;BOSS.z=CAVE.cz-10;
  BOSS.g=buildBossMesh();
  BOSS.g.position.set(BOSS.x,CAVE.fy,BOSS.z);
  if(CAVE.room)CAVE.room.add(BOSS.g);
  heartsReset();heartsShow(true);
  toast("\u{1F5FF} THE CAVE BOSS AWAKENS! Get close and press T to SWING — don't let it touch you!!");
}
function endBoss(){
  BOSS.on=false;
  if(BOSS.g&&BOSS.g.parent)BOSS.g.parent.remove(BOSS.g);
  BOSS.g=null;
  if(S.world!=="mc")heartsShow(false);
}
function bossWin(){
  const prize=Math.floor(MONEY.v*0.10);
  endBoss();
  addMoney(prize);
  pushNews("\u{1F5FF} "+mpName()+" DEFEATED the cave boss and won $"+fmtMoney(prize)+"!");
  toast("\u{1F3C6} YOU BEAT THE CAVE BOSS — +10% of your money: $"+fmtMoney(prize)+"!!");
  saveGame();
}
function bossLose(){
  const lost=Math.floor(MONEY.v*0.10);
  MONEY.v-=lost;updateMoneyUI();
  endBoss();
  exitCave(true);
  heartsReset();heartsShow(false);
  toast("\u{1F480} The boss got you... you lost 10% of your money ($"+fmtMoney(lost)+"). Train and try again!");
  saveGame();
}
function bossAttack(){
  const d=Math.hypot(player.x-BOSS.x,player.z-BOSS.z);
  if(d>4.5){toast("⚔️ Too far — get closer to the boss and press T!");return;}
  BOSS.hp--;
  /* the boss staggers back from your hit */
  const dx=(BOSS.x-player.x)/(d||1),dz=(BOSS.z-player.z)/(d||1);
  BOSS.x+=dx*2.2;BOSS.z+=dz*2.2;
  if(BOSS.hp<=0){bossWin();return;}
  toast("⚔️ HIT! Boss health: "+BOSS.hp+" / "+BOSS.max);
}
function updateBoss(){
  if(!BOSS.on||!CAVE.in)return;
  const now=performance.now(),dt=Math.min(0.1,(now-BOSS.lastT)/1000);
  BOSS.lastT=now;
  heartsRegen(dt);
  /* stomp toward the player */
  const dx=player.x-BOSS.x,dz=player.z-BOSS.z,d=Math.hypot(dx,dz);
  if(d>1.3){BOSS.x+=dx/d*3.1*dt;BOSS.z+=dz/d*3.1*dt;}
  /* stay inside the cave room */
  BOSS.x=Math.max(CAVE.cx-21,Math.min(CAVE.cx+21,BOSS.x));
  BOSS.z=Math.max(CAVE.cz-15,Math.min(CAVE.cz+15,BOSS.z));
  if(BOSS.g){
    BOSS.g.position.set(BOSS.x,CAVE.fy+Math.abs(Math.sin(now/280))*0.25,BOSS.z);
    BOSS.g.rotation.y=Math.atan2(dx,dz);
  }
  /* it caught you! */
  if(d<1.8&&playerHurt(1)){
    const kx=dx/(d||1),kz=dz/(d||1);
    player.x=Math.max(CAVE.cx-21,Math.min(CAVE.cx+21,player.x+kx*4));
    player.z=Math.max(CAVE.cz-15,Math.min(CAVE.cz+15,player.z+kz*4));
    if(PHP.v<=0)bossLose();
    else toast("\u{1F4A5} The boss smashed you! "+PHP.v+" ❤️ left — keep moving!");
  }
}
/* pressing T inside a cave: attack the boss, or open the cave menu */
function caveT(){
  if(BOSS.on){bossAttack();return;}
  showDest("\u{1F573}️ The cave...",[
    {label:"\u{1F5FF} FIGHT THE CAVE BOSS — win +10% of your money, lose −10%!",value:"boss"},
    {label:"\u{1F48E} Keep collecting crystals",value:"stay"},
    {label:"\u{1F31E} Go back outside",value:"exit"}
  ],v=>{
    if(v==="boss")startBoss();
    else if(v==="exit")exitCave();
  });
}
/* ================= ⛏️ THE MINECRAFT WORLD =================
   Blocky hills, trees & ores to mine, zombies, hearts — every resource
   sells for REAL game money. Your own adventure (no other players). */
const MCINV={wood:0,stone:0,coal:0,iron:0,gold:0,diamond:0};
const MCTOOLS={sword:0,pick:0,armor:0};   // craft them from your resources!
const MCBUILD=[];                          // wood blocks you placed this visit
const MC_PRICES={wood:5,stone:3,coal:10,iron:25,gold:60,diamond:250};
const MC_EMOJI={wood:"\u{1FAB5}",stone:"\u{1FAA8}",coal:"⚫",iron:"⚙️",gold:"\u{1F947}",diamond:"\u{1F48E}"};
const MC_YIELD={tree:["wood",3],stone:["stone",2],coal:["coal",2],iron:["iron",1],gold:["gold",1],diamond:["diamond",1]};
function enterMc(){
  switchWorld("mc");
  teleportTo(6,6);
  heartsReset();
  toast("⛏️ Welcome to MINECRAFT! Press T near trees & ores to MINE them, T anywhere else to SELL — and watch out for \u{1F9DF} ZOMBIES!");
}
function nearMcThing(){
  let best=null;
  for(let i=mcThings.length-1;i>=0;i--){
    const t=mcThings[i];
    if(offScene(t.g)){mcThings.splice(i,1);continue;}
    const d=Math.hypot(player.x-t.x,player.z-t.z);
    if(d<4&&(!best||d<best.d))best={t,d};
  }
  return best?best.t:null;
}
function mineMc(t){
  if(t.g.parent)t.g.parent.remove(t.g);
  const i=mcThings.indexOf(t);if(i>=0)mcThings.splice(i,1);
  let[res,n]=MC_YIELD[t.kind]||["stone",1];
  if(MCTOOLS.pick&&t.kind!=="tree")n*=2;   // the pickaxe DOUBLES every ore!
  MCINV[res]+=n;
  toast(MC_EMOJI[res]+" "+(t.kind==="tree"?"CHOP! ":"MINE! ")+"+"+n+" "+res+(MCTOOLS.pick&&t.kind!=="tree"?" (⛏ x2!)":"")+" (you have "+MCINV[res]+") — worth $"+(MC_PRICES[res]*n));
  saveGame();
}
/* 🧱 place a wood block right in front of you — build stairs, forts, anything! */
function mcPlaceBlock(){
  if(MCINV.wood<1){toast("\u{1F6AB} You need 1 \u{1FAB5} wood — chop a tree first!");return;}
  MCINV.wood--;
  const bx=Math.round(player.x+Math.sin(player.yaw)*2.6),bz=Math.round(player.z+Math.cos(player.yaw)*2.6);
  const base=Math.max(terrainH(bx,bz),deckYAt(bx,bz,player.y+2.4));
  const m=new THREE.Mesh(new THREE.BoxGeometry(2,1.2,2),new THREE.MeshLambertMaterial({color:0x8a6b42}));
  m.position.set(bx,base+0.6,bz);
  scene.add(m);
  const rec={g:m,x:bx,z:bz,hw:1,hd:1,tops:[base+1.2]};
  decks.push(rec);
  MCBUILD.push({mesh:m,rec});
  toast("\u{1F9F1} Block placed! ("+MCINV.wood+" wood left) — you can WALK on it. Stack them into stairs!");
  saveGame();
}
function mcClearBuild(){
  for(const b of MCBUILD){
    scene.remove(b.mesh);
    const i=decks.indexOf(b.rec);if(i>=0)decks.splice(i,1);
  }
  MCBUILD.length=0;
}
function mcTotal(mult){let s=0;for(const k in MCINV)s+=MCINV[k]*MC_PRICES[k];return Math.round(s*(mult||1));}
function mcCraft(what){
  const recipes={sword:{wood:5,iron:2},pick:{wood:3,stone:2},armor:{iron:5}};
  const r=recipes[what];
  for(const k in r)if(MCINV[k]<r[k]){toast("\u{1F6AB} Not enough! You need "+Object.keys(r).map(q=>r[q]+" "+MC_EMOJI[q]+" "+q).join(" + ")+".");return;}
  for(const k in r)MCINV[k]-=r[k];
  MCTOOLS[what]=1;
  toast(what==="sword"?"\u{1F5E1}✨ SWORD crafted — zombies now die in ONE hit!"
    :what==="pick"?"⛏✨ PICKAXE crafted — every ore now gives DOUBLE!"
    :"\u{1F6E1}✨ ARMOR crafted — it blocks lots of zombie bites!");
  saveGame();
}
function openMcSell(mult){
  mult=mult||1;
  const total=mcTotal(mult);
  const inv=Object.keys(MCINV).map(k=>MC_EMOJI[k]+" "+MCINV[k]).join("  ");
  const opts=[
    {label:"\u{1F4B0} SELL EVERYTHING — $"+fmtMoney(total)+(mult>1?" (\u{1F9D1}‍\u{1F33E} +25% trader bonus!)":""),value:"sell"},
    {label:"\u{1F9F1} Place a wood block — 1 \u{1FAB5} (build stairs & forts!)",value:"block"}
  ];
  if(!MCTOOLS.sword)opts.push({label:"\u{1F5E1} Craft a SWORD — 5 \u{1FAB5} + 2 ⚙️ (one-hit zombies!)",value:"sword"});
  if(!MCTOOLS.pick)opts.push({label:"⛏ Craft a PICKAXE — 3 \u{1FAB5} + 2 \u{1FAA8} (double ores!)",value:"pick"});
  if(!MCTOOLS.armor)opts.push({label:"\u{1F6E1} Craft ARMOR — 5 ⚙️ (blocks zombie bites!)",value:"armor"});
  opts.push({label:"\u{1F3E0} Leave MINECRAFT (back to the city)",value:"leave"});
  opts.push({label:"❌ Keep mining",value:"cancel"});
  showDest("\u{1F392} Backpack: "+inv+"  ·  "+(MCTOOLS.sword?"\u{1F5E1}":"")+(MCTOOLS.pick?"⛏":"")+(MCTOOLS.armor?"\u{1F6E1}":""),opts,v=>{
    if(v==="leave"){switchWorld("earth");teleportTo(WORLD.ox+6,WORLD.oz+6);toast("\u{1F3E0} Back in the city!");return;}
    if(v==="block"){mcPlaceBlock();return;}
    if(v==="sword"||v==="pick"||v==="armor"){mcCraft(v);return;}
    if(v!=="sell")return;
    if(!total){toast("\u{1F392} Your backpack is empty — chop some trees and mine some ores first!");return;}
    addMoney(total);
    for(const k in MCINV)MCINV[k]=0;
    toast("\u{1F4B0} SOLD! You earned $"+fmtMoney(total)+(mult>1?" with Trader Steve's +25% bonus":"")+" — it's in your normal game money!");
    saveGame();
  });
}
/* mobs: zombies chase & bite (MORE at night!), creepers go BOOM, pigs are lunch */
const MCMOBS=[];
function mcDeath(){
  teleportTo(6,6);
  heartsReset();
  for(const m of MCMOBS){if(m.g.parent)m.g.parent.remove(m.g);disposeGroup(m.g);}
  MCMOBS.length=0;
  toast("\u{1F480} The monsters got you! You respawned at the spawn — your backpack is safe.");
}
function mcHurtPlayer(n,what){
  /* armor blocks a lot of hits! */
  if(MCTOOLS.armor&&Math.random()<0.45){toast("\u{1F6E1} CLANG! Your armor blocked the "+what+"!");return false;}
  if(!playerHurt(n))return false;
  /* a killing blow returns false: death shows its own message,
     so callers must NOT add a "hearts left" toast on top */
  if(PHP.v<=0){mcDeath();return false;}
  return true;
}
function nearMcMob(r){
  let best=null;
  for(const m of MCMOBS){
    const d=Math.hypot(player.x-m.x,player.z-m.z);
    if(d<r&&(!best||d<best.d))best={m,d};
  }
  return best?best.m:null;
}
function killMcMob(m){
  const i=MCMOBS.indexOf(m);
  if(m.g.parent)m.g.parent.remove(m.g);else scene.remove(m.g);
  disposeGroup(m.g);
  if(i>=0)MCMOBS.splice(i,1);
}
function mcAttack(m){
  if(m.kind==="pig"){
    killMcMob(m);
    MCD.pack.push(["\u{1F356} Porkchop",40]);MCD.pack.push(["\u{1F356} Porkchop",40]);
    renderPack();saveGame();
    toast("\u{1F437}\u{1F356} CHOP! +2 porkchops in your \u{1F392} Food backpack (press R to eat)!");
    return;
  }
  m.hp=(m.hp||2)-(MCTOOLS.sword?99:1);
  /* the hit knocks the monster back */
  const dx=m.x-player.x,dz=m.z-player.z,d=Math.hypot(dx,dz)||1;
  m.x+=dx/d*2.6;m.z+=dz/d*2.6;
  if(m.hp<=0){
    killMcMob(m);
    addMoney(20);
    if(Math.random()<0.15){MCINV.iron++;toast("⚔️\u{1F4A5} "+(m.kind==="creeper"?"Creeper":"Zombie")+" DEFEATED — +$20 and it dropped ⚙️ 1 iron!");}
    else toast("⚔️\u{1F4A5} "+(m.kind==="creeper"?"Creeper":"Zombie")+" DEFEATED — +$20!"+(MCTOOLS.sword?" (\u{1F5E1} one hit!)":""));
    saveGame();
  }else toast("⚔️ HIT! One more swing finishes it — or craft a \u{1F5E1} SWORD for one-hit wins!");
}
function updateMc(dt){
  if(S.world!=="mc"){
    if(MCMOBS.length){for(const m of MCMOBS)if(m.g.parent)m.g.parent.remove(m.g);MCMOBS.length=0;}
    return;
  }
  heartsRegen(dt);
  /* population: more zombies at NIGHT, a couple of creepers, some tasty pigs */
  for(let i=MCMOBS.length-1;i>=0;i--){
    const m=MCMOBS[i];
    if(Math.hypot(m.x-player.x,m.z-player.z)>110){scene.remove(m.g);disposeGroup(m.g);MCMOBS.splice(i,1);}
  }
  const counts={zombie:0,creeper:0,pig:0};
  for(const m of MCMOBS)counts[m.kind]=(counts[m.kind]||0)+1;
  const want={zombie:isNight()?7:3,creeper:2,pig:3};
  if(Math.random()<0.03){
    const kind=["zombie","creeper","pig"].find(k=>counts[k]<want[k]);
    if(kind){
      const a=Math.random()*Math.PI*2,d=(kind==="pig"?20:38)+Math.random()*30;
      const mx=player.x+Math.sin(a)*d,mz=player.z+Math.cos(a)*d;
      if(Math.hypot(mx-6,mz-6)>22){
        const g=kind==="zombie"?makeMcMob():kind==="creeper"?makeMcCreeper():makeMcPig();
        g.position.set(mx,terrainH(mx,mz),mz);
        scene.add(g);
        MCMOBS.push({g,x:mx,z:mz,yaw:Math.random()*7,t:0,kind,hp:2,fuse:0});
      }
    }
  }
  const now=performance.now();
  for(let i=MCMOBS.length-1;i>=0;i--){
    const m=MCMOBS[i];
    if(!m)continue;   // the list can empty mid-loop if you just died
    const dx=player.x-m.x,dz=player.z-m.z,d=Math.hypot(dx,dz);
    if(m.kind==="pig"){
      /* pigs just trot about */
      m.t-=dt;
      if(m.t<=0){m.t=2+Math.random()*4;m.yaw+=(Math.random()-0.5)*2;}
      m.x+=Math.sin(m.yaw)*0.9*dt;m.z+=Math.cos(m.yaw)*0.9*dt;
    }else if(m.kind==="creeper"){
      /* creepers sneak close... then HISSSS... BOOM */
      if(m.fuse>0){
        m.fuse-=dt;
        m.g.scale.setScalar(1+Math.sin(now/45)*0.12);   // shaking!
        if(d>7){m.fuse=0;m.g.scale.setScalar(1);toast("\u{1F32C} Phew — you outran the creeper, it calmed down!");}
        else if(m.fuse<=0){
          killMcMob(m);
          playCrash(40);
          puffSmoke(m.x,terrainH(m.x,m.z)+1,m.z,true);puffSmoke(m.x+1,terrainH(m.x,m.z)+2,m.z-1,true);
          if(d<5&&player.onFoot){
            if(mcHurtPlayer(3,"explosion"))toast("\u{1F4A5}\u{1F7E9} SSSS... BOOM!! The creeper exploded on you — "+PHP.v+" ❤️ left!");
          }else toast("\u{1F4A5}\u{1F7E9} BOOM! The creeper exploded — that was CLOSE!");
          continue;
        }
      }else if(d<16&&player.onFoot){
        m.yaw=Math.atan2(dx,dz);
        if(d>2.4){m.x+=dx/d*3.4*dt;m.z+=dz/d*3.4*dt;}
        else{m.fuse=1.2;toast("\u{1F7E9}\u{26A0} SSSSSSS... A CREEPER — RUN!!!");}
      }else{
        m.t-=dt;
        if(m.t<=0){m.t=2+Math.random()*3;m.yaw+=(Math.random()-0.5)*2.4;}
        m.x+=Math.sin(m.yaw)*1*dt;m.z+=Math.cos(m.yaw)*1*dt;
      }
    }else{
      /* zombies: BRAINS!! */
      if(d<18&&player.onFoot){
        m.yaw=Math.atan2(dx,dz);
        if(d>1){m.x+=dx/d*2.9*dt;m.z+=dz/d*2.9*dt;}
      }else{
        m.t-=dt;
        if(m.t<=0){m.t=2+Math.random()*3;m.yaw+=(Math.random()-0.5)*2.4;}
        m.x+=Math.sin(m.yaw)*1.1*dt;m.z+=Math.cos(m.yaw)*1.1*dt;
      }
      if(d<1.3&&player.onFoot){
        const kx=dx/(d||1),kz=dz/(d||1);
        player.x+=kx*3.5;player.z+=kz*3.5;
        if(mcHurtPlayer(1,"zombie bite")&&PHP.v>0)toast("\u{1F9DF} A zombie bit you! "+PHP.v+" ❤️ left — press T next to it to FIGHT BACK!");
        if(S.world!=="mc")break;   // died & respawned
      }
    }
    m.g.position.set(m.x,terrainH(m.x,m.z)+(m.kind==="pig"?0:Math.abs(Math.sin(now/260+m.x))*0.08),m.z);
    m.g.rotation.y=m.yaw;
  }
}
/* ---------- CITY NEWS: every TV in the game shows what's really happening ---------- */
const NEWS=[{t:"Welcome to CITY NEWS — all the city's stories, LIVE!",ts:Date.now()}];
function pushNews(t){
  NEWS.push({t,ts:Date.now()});
  if(NEWS.length>12)NEWS.shift();
  /* if you're tuned in to CITY NEWS RADIO, the AI DJ reads the story LIVE */
  try{if(S.mode==="game"&&SND.music&&radioStation().dj)djSay("Breaking news! "+cleanTTS(t));}catch(e){}
}
