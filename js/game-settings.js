/* Car City Game — game-settings.js (part 15/16, split from the old game.js).
   Plain JS, ONE shared global scope across all scripts — the load order in index.html MUST stay: core, world, vehicles, then game-* parts in numbered order. */
/* ================= EFFECT SETTINGS (police, sounds, weather, quality) ================= */
const SETTINGS={police:true,crash:true,honk:true,engine:true,siren:true,weather:true,quality:"med",ultra:false};
try{Object.assign(SETTINGS,JSON.parse(localStorage.getItem("vc4fx")||"{}"));}catch(e){}
function saveFx(){try{localStorage.setItem("vc4fx",JSON.stringify(SETTINGS))}catch(e){}}
function wireFx(id,key,label){
  const el=$(id);
  const upd=()=>{el.classList.toggle("on",SETTINGS[key]);el.innerHTML=label+" "+(SETTINGS[key]?"ON":"OFF");};
  el.onclick=()=>{
    SETTINGS[key]=!SETTINGS[key];saveFx();upd();
    if(key==="police"&&!SETTINGS.police)for(const c of traffic)if(c.chase)endChase(c);
  };
  upd();
}
wireFx("fxPolice","police","\u{1F46E} Police");
wireFx("fxCrash","crash","\u{1F4A5} Crash sound");
wireFx("fxHonk","honk","\u{1F4E3} Honks");
wireFx("fxEngine","engine","\u{1F697} Engine sound");
wireFx("fxSiren","siren","\u{1F6A8} Sirens");
wireFx("fxWeather","weather","\u{1F327} Weather");
function applyQualityUI(){
  ["low","med","high"].forEach(q=>$("q"+q[0].toUpperCase()+q.slice(1)).classList.toggle("on",SETTINGS.quality===q));
}
["low","med","high"].forEach(q=>{
  $("q"+q[0].toUpperCase()+q.slice(1)).onclick=()=>{
    SETTINGS.quality=q;saveFx();setQuality(q);applyQualityUI();
    toast("✨ Graphics: "+(q==="low"?"⚡ FAST — 1x pixels, no shadows, short view (best for slow devices)"
      :q==="high"?"✨ BEAUTIFUL — your screen's FULL pixel density, razor-sharp shadows & a far deeper view!"
      :"NORMAL — 2x pixels, 2K shadows"));
  };
});
setQuality(SETTINGS.quality);applyQualityUI();
/* ---- ULTRA graphics: waving grass, flying sand & extra world detail ---- */
function applyUltraUI(){$("uxOn").classList.toggle("on",!!SETTINGS.ultra);$("uxOff").classList.toggle("on",!SETTINGS.ultra);}
function setUltra(on){
  SETTINGS.ultra=on;saveFx();window.ULTRA=on;applyUltraUI();
  rebuildWorld();   // loaded chunks rebuild with (or without) the extra detail
  toast(on?"\u{1F525} ULTRA graphics ON — waving grass, flying desert sand, fuller trees, balconies & more! (The world around you reloads with the new detail.)"
    :"Ultra graphics OFF — back to normal detail.");
}
$("uxOn").onclick=()=>setUltra(true);
$("uxOff").onclick=()=>setUltra(false);
window.ULTRA=!!SETTINGS.ultra;applyUltraUI();
/* a field of real grass blades around you that WAVE in the wind */
const GRASSF={mesh:null,slots:[],cx:1e9,cz:1e9};
const GRASS_N=650;
function grassInit(){
  if(GRASSF.mesh)return;
  const geo=new THREE.PlaneGeometry(0.5,1.0);geo.translate(0,0.5,0);
  const mat=new THREE.MeshLambertMaterial({color:0x67a844,side:THREE.DoubleSide});
  const im=new THREE.InstancedMesh(geo,mat,GRASS_N);
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  im.frustumCulled=false;
  scene.add(im);GRASSF.mesh=im;
  for(let i=0;i<GRASS_N;i++)GRASSF.slots.push({x:0,z:0,y:-999,ph:Math.random()*6.28,sc:0.6+Math.random()*0.9,rot:Math.random()*3.14});
}
function grassReseed(){
  const R=52;
  for(const s of GRASSF.slots){
    s.y=-999;
    for(let tries=0;tries<4;tries++){
      const x=player.x+(Math.random()-0.5)*2*R,z=player.z+(Math.random()-0.5)*2*R;
      if(Math.abs(x-Math.round(x/120)*120)<13||Math.abs(z-Math.round(z/120)*120)<13)continue;   // roads
      const h=terrainH(x,z);
      if(h<0.25||h>42)continue;                        // no water, no cliff tops
      if(biomeAt(x,z)==="desert")continue;             // sand has its own effect
      const mk2=marketPlotSpot(Math.round((x-2070)/MKSP),Math.round((z-630)/MKSP));
      if(mk2&&Math.abs(x-mk2.x)<54&&Math.abs(z-mk2.z)<54)continue;   // market floors stay clean
      s.x=x;s.z=z;s.y=h;break;
    }
  }
  GRASSF.cx=player.x;GRASSF.cz=player.z;
}
const _gm4=new THREE.Matrix4(),_gEu=new THREE.Euler(),_gQt=new THREE.Quaternion(),_gSc=new THREE.Vector3(),_gPs=new THREE.Vector3();
function updateGrass(now){
  if(!SETTINGS.ultra||S.world!=="earth"||CAVE.in){if(GRASSF.mesh)GRASSF.mesh.visible=false;return;}
  grassInit();
  GRASSF.mesh.visible=true;
  if(Math.hypot(player.x-GRASSF.cx,player.z-GRASSF.cz)>14)grassReseed();
  const wk=(WEATHER.state==="rain"||WEATHER.state==="snow")?1.6:0.8;   // storms bend the grass harder
  const gust=1+Math.sin(now/2400)*0.55;
  for(let i=0;i<GRASS_N;i++){
    const s=GRASSF.slots[i];
    if(s.y<-100){_gm4.makeScale(0,0,0);GRASSF.mesh.setMatrixAt(i,_gm4);continue;}
    const sway=Math.sin(now/380+s.ph)*0.17*wk*gust+Math.sin(now/97+s.ph*2)*0.03;
    _gEu.set(sway,s.rot,sway*0.6);
    _gQt.setFromEuler(_gEu);
    _gSc.set(s.sc,s.sc,s.sc);_gPs.set(s.x,s.y,s.z);
    _gm4.compose(_gPs,_gQt,_gSc);
    GRASSF.mesh.setMatrixAt(i,_gm4);
  }
  GRASSF.mesh.instanceMatrix.needsUpdate=true;
}
/* desert sand grains that FLY with the wind */
const SANDF={pts:null};
function sandInit(){
  if(SANDF.pts)return;
  const n=420,pos=new Float32Array(n*3);
  for(let i=0;i<n;i++){pos[i*3]=(Math.random()-0.5)*90;pos[i*3+1]=Math.random()*3.5;pos[i*3+2]=(Math.random()-0.5)*90;}
  const g=new THREE.BufferGeometry();
  g.setAttribute("position",new THREE.BufferAttribute(pos,3));
  SANDF.pts=new THREE.Points(g,new THREE.PointsMaterial({color:0xe8c98a,size:0.22,transparent:true,opacity:0.75,depthWrite:false}));
  SANDF.pts.visible=false;scene.add(SANDF.pts);
}
function updateSand(dt,now){
  const want=SETTINGS.ultra&&S.world==="earth"&&!CAVE.in&&biomeAt(player.x,player.z)==="desert";
  if(!want){if(SANDF.pts)SANDF.pts.visible=false;return;}
  sandInit();
  const p=SANDF.pts;p.visible=true;
  p.position.set(player.x,Math.max(0,terrainH(player.x,player.z)),player.z);
  const arr=p.geometry.attributes.position.array;
  const wdir=now/9000;   // the wind slowly turns
  const wx=Math.sin(wdir)*(9+Math.sin(now/1700)*4),wz=Math.cos(wdir)*(9+Math.cos(now/1300)*4);
  for(let i=0;i<arr.length;i+=3){
    arr[i]+=wx*dt+Math.sin(now/300+i)*0.02;
    arr[i+1]+=Math.sin(now/500+i)*0.012;
    arr[i+2]+=wz*dt;
    if(arr[i]>45)arr[i]-=90;else if(arr[i]<-45)arr[i]+=90;
    if(arr[i+2]>45)arr[i+2]-=90;else if(arr[i+2]<-45)arr[i+2]+=90;
    if(arr[i+1]<0.05||arr[i+1]>4)arr[i+1]=Math.random()*3.5;
  }
  p.geometry.attributes.position.needsUpdate=true;
}
/* ================= WEATHER: rain, snow (December) & fog — shared on servers ================= */
const WEATHER={state:"clear",rain:null};
function weatherState(){
  if(!SETTINGS.weather)return "clear";
  const slot=Math.floor((CLOCK.day*1440+CLOCK.min)/240);   // changes every 4 game hours, same for everyone
  const r=h2i(slot,911);
  if(r<0.62)return "clear";
  /* the seasons: snow all WINTER (Dec/Jan/Feb), extra sunshine in summer */
  const month=new Date().getMonth();
  if([5,6,7].includes(month)&&r<0.74)return "clear";   // summer: more sun
  if(r<0.86)return [11,0,1].includes(month)?"snow":"rain";
  return "fog";
}
function buildRain(){
  const n=900,pos=new Float32Array(n*3);
  for(let i=0;i<n;i++){pos[i*3]=(Math.random()-0.5)*80;pos[i*3+1]=Math.random()*40;pos[i*3+2]=(Math.random()-0.5)*80;}
  const g=new THREE.BufferGeometry();
  g.setAttribute("position",new THREE.BufferAttribute(pos,3));
  const m=new THREE.Points(g,new THREE.PointsMaterial({color:0x9fc4e0,size:0.14,transparent:true,opacity:0.8}));
  m.visible=false;scene.add(m);
  return m;
}
function updateWeather(dt){
  if(!WEATHER.rain)WEATHER.rain=buildRain();
  WEATHER.state=(S.world==="earth"&&!CAVE.in)?weatherState():"clear";
  const r=WEATHER.rain,st=WEATHER.state;
  if(st==="rain"||st==="snow"){
    r.visible=true;
    r.material.color.set(st==="snow"?0xffffff:0x9fc4e0);
    r.material.size=st==="snow"?0.24:0.14;
    const pos=r.geometry.attributes.position;
    const fall=(st==="snow"?6:32)*dt;
    for(let i=0;i<pos.count;i++){
      let y=pos.getY(i)-fall*(0.7+(i%5)*0.12);
      if(y<0)y=40;
      pos.setY(i,y);
    }
    pos.needsUpdate=true;
    r.position.set(player.x,player.y,player.z);
  }else r.visible=false;
  /* fog & rain thicken the air (applied after updateSky each frame) */
  if(S.world==="earth"){
    if(st==="fog"){scene.fog.near=34;scene.fog.far=230;}
    else if(st==="rain"||st==="snow"){scene.fog.near=110;scene.fog.far=430;}
  }
}
function wetGrip(){return WEATHER.state==="rain"?0.72:(WEATHER.state==="snow"?0.6:1);}
/* ================= DAILY TREASURE HUNT — same spot for everyone on a server ================= */
const TREASURE={key:"",x:0,z:0,found:false,mesh:null};
function setupTreasure(){
  const dstr=new Date().toISOString().slice(0,10);
  if(TREASURE.key===dstr)return;
  TREASURE.key=dstr;
  let h=0;for(let i=0;i<dstr.length;i++)h=(h*33+dstr.charCodeAt(i))>>>0;
  TREASURE.x=WORLD.ox+((h%160)-80)*31;
  TREASURE.z=WORLD.oz+((Math.floor(h/160)%160)-80)*27;
  TREASURE.found=localStorage.getItem("vc4treasure")===dstr+":"+mpWorldKey();
  if(TREASURE.mesh){scene.remove(TREASURE.mesh);disposeGroup(TREASURE.mesh);TREASURE.mesh=null;}
}
function buildTreasureChest(){
  const g=new THREE.Group();
  const y=terrainH(TREASURE.x,TREASURE.z);
  const body=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(1.4,0.8,0.9),new THREE.MeshLambertMaterial({color:0x6f4e37})));
  body.position.set(0,0.4,0);g.add(body);
  const lid=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(1.44,0.3,0.94),new THREE.MeshLambertMaterial({color:0x5a3d28})));
  lid.position.set(0,0.9,0);g.add(lid);
  const gold=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.14,0.7),new THREE.MeshBasicMaterial({color:0xffd700}));
  gold.position.set(0,0.84,0);g.add(gold);
  const band=new THREE.Mesh(new THREE.BoxGeometry(0.2,1.14,0.96),new THREE.MeshLambertMaterial({color:0xd9a520}));
  band.position.set(0,0.55,0);g.add(band);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.6,0.09,8,22),new THREE.MeshBasicMaterial({color:0xffd700}));
  ring.rotation.x=Math.PI/2;ring.position.y=0.25;g.add(ring);
  g.position.set(TREASURE.x,y,TREASURE.z);
  g.userData.ring=ring;
  scene.add(g);
  return g;
}
function updateTreasure(dt){
  setupTreasure();
  if(TREASURE.found||S.world!=="earth"||CAVE.in){
    if(TREASURE.mesh)TREASURE.mesh.visible=false;
    return;
  }
  const d=Math.hypot(player.x-TREASURE.x,player.z-TREASURE.z);
  if(d<90&&!TREASURE.mesh)TREASURE.mesh=buildTreasureChest();
  if(TREASURE.mesh){
    TREASURE.mesh.visible=true;
    TREASURE.mesh.userData.ring.rotation.z+=dt*1.2;
    if(d<3.4&&player.onFoot)claimTreasure();
  }
}
async function claimTreasure(){
  TREASURE.found=true;
  try{localStorage.setItem("vc4treasure",TREASURE.key+":"+mpWorldKey());}catch(e){}
  if(TREASURE.mesh){scene.remove(TREASURE.mesh);disposeGroup(TREASURE.mesh);TREASURE.mesh=null;}
  let first=true;
  if(SERVER_READY)first=await fbPut("/treasure/"+mpWorldKey()+"/"+fbKey(TREASURE.key),{n:mpName(),ts:Date.now()});
  ACH.flags.treasure=true;saveAch();
  addMoney(first?2000:250);
  toast(first
    ?"\u{1F3F4}‍☠️\u{1F947} YOU FOUND TODAY'S TREASURE FIRST — $2,000!! A new one appears tomorrow!"
    :"\u{1F3F4}‍☠️ Treasure found! Another player got here first — still $250 for you!");
  pushNews("\u{1F3F4}‍☠️ "+mpName()+" dug up today's hidden treasure"+(first?" FIRST — $2,000!":"!"));
}
function treasureHintText(){
  const dx=TREASURE.x-player.x,dz=TREASURE.z-player.z,d=Math.hypot(dx,dz);
  const ns=dz>200?"NORTH":dz<-200?"SOUTH":"";
  const ew=dx>200?"EAST":dx<-200?"WEST":"";
  const dir=(ns&&ew)?ns+"-"+ew:(ns||ew||"RIGHT HERE");
  return "\u{1F3F4}‍☠️ Today's treasure is about "+(Math.round(d/500)*500>=1000?(Math.round(d/500)/2)+" km":"less than 500 m")+" to the "+dir+"! Get warmer to see the chest.";
}
/* ================= ACHIEVEMENTS ================= */
const ACH={done:new Set(),flags:{}};
try{
  const a=JSON.parse(localStorage.getItem("vc4ach")||"null");
  if(a){(a.done||[]).forEach(x=>ACH.done.add(x));Object.assign(ACH.flags,a.flags||{});}
}catch(e){}
function saveAch(){try{localStorage.setItem("vc4ach",JSON.stringify({done:[...ACH.done],flags:ACH.flags}))}catch(e){}}
const ACH_DEFS=[
  ["km100","\u{1F697}","Road tripper","Drive 100 km in total",()=>S.km>=100],
  ["km1000","\u{1F6E3}","Marathon machine","Drive 1,000 km in total",()=>S.km>=1000],
  ["cars5","\u{1F3CE}","Collector","Own 5 vehicles",()=>OWN.size>=5],
  ["cars15","\u{1F3DB}","Car museum","Own 15 vehicles",()=>OWN.size>=15],
  ["rich1k","\u{1F4B5}","First grand","Reach $1,000",()=>MONEY.v>=1000],
  ["rich1m","\u{1F911}","Millionaire","Reach $1,000,000",()=>MONEY.v>=1000000],
  ["mansion","\u{1F3F0}","Home sweet home","Get a MEGA MANSION",()=>RENT.list.some(r2=>String(r2.id).startsWith("M:"))],
  ["glit","✨","Glitter fan","Own a glitter dumpling",()=>DUMP.owned.some(d=>d.glitter)],
  ["rainglit","\u{1F308}","The rarest","Own a GLITTER RAINBOW dumpling",()=>DUMP.owned.some(d=>d.color==="Rainbow"&&d.glitter)],
  ["moon","\u{1F319}","Astronaut","Visit the Moon",()=>!!ACH.flags.moon],
  ["concert","\u{1F3B9}","Superstar","Collect tips from a concert",()=>!!ACH.flags.concert],
  ["race","\u{1F3C6}","Race winner","Win a race",()=>!!ACH.flags.race],
  ["pet","\u{1F436}","Best friend","Buy a pet",()=>!!PET.type],
  ["treasure","\u{1F3F4}‍☠️","Treasure hunter","Find a daily treasure",()=>!!ACH.flags.treasure],
  ["job500","\u{1F4BC}","Hard worker","Earn $500 in one job shift",()=>!!ACH.flags.job]
];
let _achT=2;
function updateAch(dt){
  _achT-=dt;
  if(_achT>0)return;
  _achT=3;
  if(S.world==="moon")ACH.flags.moon=true;
  if(JOB.type&&JOB.total>=500)ACH.flags.job=true;
  for(const d of ACH_DEFS){
    if(ACH.done.has(d[0]))continue;
    let ok=false;
    try{ok=d[4]();}catch(e){}
    if(ok){
      ACH.done.add(d[0]);saveAch();
      addMoney(250);
      toast("\u{1F3C6} ACHIEVEMENT: "+d[1]+" "+d[2]+" — +$250!");
    }
  }
}
function renderAch(){
  const w=$("achList");w.innerHTML="";
  ACH_DEFS.forEach(d=>{
    const done=ACH.done.has(d[0]);
    const el=document.createElement("div");
    el.className="achRow"+(done?" done":"");
    el.innerHTML="<span class='ae'>"+(done?d[1]:"\u{1F512}")+"</span><span class='at'><b>"+d[2]+"</b><br><span>"+d[3]+"</span></span><span class='ax'>"+(done?"✅":"")+"</span>";
    w.appendChild(el);
  });
}
$("bAch").onclick=()=>{renderAch();$("achModal").classList.toggle("open");};
$("achClose").onclick=()=>$("achModal").classList.remove("open");
/* ================= PHOTO MODE ================= */
$("bPhoto").onclick=()=>{
  if(S.mode!=="game"){toast("Start driving first!");return;}
  $("hud").classList.remove("show");
  requestAnimationFrame(()=>{
    renderer.render(scene,camera);
    renderer.domElement.toBlob(b=>{
      $("hud").classList.add("show");
      if(!b){toast("\u{1F4F7} Couldn't take the photo!");return;}
      const a=document.createElement("a");
      a.href=URL.createObjectURL(b);
      a.download="car-city-photo.png";
      a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),5000);
      toast("\u{1F4F7} CLICK! Photo saved to your downloads!");
    });
  });
};
/* ================= AUTO-DRIVE: ~50 km/h, asks ⬅ ⬆ ➡ every 3rd crossing ================= */
const AUTO={on:false,axis:"z",line:0,dir:1,t:0,count:0,ask:null,askT:0,turn:"straight"};
function autoLaneC(){const off=3.5;return AUTO.axis==="z"?(AUTO.dir>0?AUTO.line-off:AUTO.line+off):(AUTO.dir>0?AUTO.line+off:AUTO.line-off);}
function toggleAuto(){
  if(AUTO.on){autoOff();return;}
  if(!player.drive||player.drive!==myVehicle||myVehicle.type==="bike"){toast("\u{1F916} Get in a car or on a motorcycle first!");return;}
  const v=myVehicle;
  const gx=nearGridLine(v.x),gz=nearGridLine(v.z);
  if(Math.min(gx,gz)>10){toast("\u{1F916} Drive onto a normal city road first — then turn auto-drive on!");return;}
  if(gx<=gz){AUTO.axis="z";AUTO.line=Math.round((v.x-30)/120)*120+30;AUTO.dir=Math.cos(v.yaw)>=0?1:-1;AUTO.t=v.z;}
  else{AUTO.axis="x";AUTO.line=Math.round((v.z-30)/120)*120+30;AUTO.dir=Math.sin(v.yaw)>=0?1:-1;AUTO.t=v.x;}
  AUTO.count=0;AUTO.ask=null;AUTO.turn="straight";AUTO.on=true;
  $("bAuto").classList.add("on");
  toast("\u{1F916} AUTO-DRIVE ON (~50 km/h). Every 3rd crossing it asks ⬅ ⬆ ➡ — if you don't choose, it picks itself. Steer to take over!");
}
function autoOff(silent){
  AUTO.on=false;AUTO.ask=null;
  $("autoAsk").classList.remove("show");
  $("bAuto").classList.remove("on");
  if(!silent)toast("\u{1F916} Auto-drive OFF — you have the wheel!");
}
function autoChoose(c){
  AUTO.turn=c;
  $("autoAsk").classList.remove("show");
}
$("bAuto").onclick=()=>{if(S.mode==="game")toggleAuto();};
$("autoL").onclick=()=>{autoChoose("left");toast("⬅ Okay — turning LEFT!");};
$("autoS").onclick=()=>{autoChoose("straight");toast("⬆ Okay — STRAIGHT ahead!");};
$("autoR").onclick=()=>{autoChoose("right");toast("➡ Okay — turning RIGHT!");};
function updateAuto(dt){
  const v=myVehicle;
  if(!v||player.drive!==v){autoOff(true);return 0;}
  if(steerInput()!==0||thrInput()!==0){autoOff();return Math.abs(v.speed);}
  const max=50/3.6;
  let tgt=max;
  /* stop for red lights like a good robot */
  const phase=lightPhase();
  const redFor=AUTO.axis==="z"?phase===1:phase===0;
  const nxtStop=AUTO.dir>0?Math.ceil((AUTO.t-30+10)/120)*120+30:Math.floor((AUTO.t-30-10)/120)*120+30;
  const stopGap=(nxtStop-AUTO.t)*AUTO.dir-10;
  if(redFor&&stopGap>0&&stopGap<18)tgt*=Math.max(0,stopGap-2)/16;
  if(FUEL.km<=0&&v.type!=="bike")tgt=0;
  v.speed+=(tgt-v.speed)*Math.min(1,1.4*dt);
  const prev=AUTO.t;
  AUTO.t+=v.speed*dt*AUTO.dir;
  /* every 3rd crossing: ask ⬅ ⬆ ➡ */
  const li1=Math.floor((AUTO.t-30)/120);
  const nextCross=AUTO.dir>0?(li1+1)*120+30:li1*120+30;
  const distToCross=(nextCross-AUTO.t)*AUTO.dir;
  if(!AUTO.ask&&AUTO.count%3===2&&distToCross<48&&distToCross>8){
    AUTO.ask=nextCross;AUTO.askT=0;AUTO.turn=null;
    $("autoAsk").classList.add("show");
    try{
      const u=new SpeechSynthesisUtterance("Left, right, or straight?");
      u.rate=1.15;speechSynthesis.speak(u);
    }catch(e){}
  }
  if(AUTO.ask!==null&&AUTO.turn===null){
    AUTO.askT+=dt;
    if(AUTO.askT>3.5||distToCross<8){
      autoChoose(["left","straight","right"][Math.floor(Math.random()*3)]);
      toast("\u{1F916} You didn't choose — I picked "+(AUTO.turn==="left"?"⬅ LEFT":AUTO.turn==="right"?"➡ RIGHT":"⬆ STRAIGHT")+"!");
    }
  }
  /* passed a crossing? */
  const li0=Math.floor((prev-30)/120);
  if(li0!==li1){
    const cl=(AUTO.dir>0?li1:li0)*120+30;
    AUTO.count++;
    if(AUTO.ask===cl&&AUTO.turn&&AUTO.turn!=="straight"){
      const h=AUTO.axis==="z"?[0,AUTO.dir]:[AUTO.dir,0];
      const nh=AUTO.turn==="left"?[h[1],-h[0]]:[-h[1],h[0]];
      const oldLine=AUTO.line;
      AUTO.axis=nh[0]!==0?"x":"z";
      AUTO.dir=nh[0]!==0?nh[0]:nh[1];
      AUTO.t=oldLine;
      AUTO.line=cl;
    }
    if(AUTO.ask===cl){AUTO.ask=null;AUTO.turn="straight";$("autoAsk").classList.remove("show");}
  }
  /* place the car on its lane */
  const c=autoLaneC();
  if(AUTO.axis==="z"){v.x+=(c-v.x)*Math.min(1,4*dt);v.z=AUTO.t;}
  else{v.z+=(c-v.z)*Math.min(1,4*dt);v.x=AUTO.t;}
  const wantYaw=AUTO.axis==="z"?(AUTO.dir>0?0:Math.PI):(AUTO.dir>0?Math.PI/2:-Math.PI/2);
  let dy=wantYaw-v.yaw;
  while(dy>Math.PI)dy-=Math.PI*2;while(dy<-Math.PI)dy+=Math.PI*2;
  v.yaw+=dy*Math.min(1,5*dt);
  v.y=terrainH(v.x,v.z);v.grounded=true;v.vy=0;
  v.mesh.position.set(v.x,v.y,v.z);
  v.mesh.rotation.set(0,v.yaw,0);
  v.mesh.rotateX(-slopePitch(v.x,v.z,v.yaw,2));
  for(const w of v.mesh.userData.wheels)w.spin.rotation.x+=v.speed/w.r*dt;
  headLight.intensity=isNight()?1.1:0;
  headLight.position.set(v.x+Math.sin(v.yaw)*6,v.y+1.6,v.z+Math.cos(v.yaw)*6);
  player.x=v.x;player.z=v.z;player.y=v.y;
  return Math.abs(v.speed);
}
