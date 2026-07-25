/* Car City Game — game-input.js (part 1/16, split from the old game.js).
   Plain JS, ONE shared global scope across all scripts — the load order in index.html MUST stay: core, world, vehicles, then game-* parts in numbered order. */
/* ================= INPUT / ADMIN / CRUISE / FLOW ================= */
const keys={};
addEventListener("keydown",e=>{
  if(e.target.tagName==="INPUT")return;
  /* piano open: your computer keyboard plays notes instead of driving */
  if($("pianoModal").classList.contains("open")){
    if(e.key==="Escape"){PIANO.open=false;$("pianoModal").classList.remove("open");return;}
    const m=PKEYMAP[e.key.toLowerCase()];
    if(m!==undefined&&!e.repeat)playPianoNote(m);
    return;
  }
  keys[e.key.toLowerCase()]=true;
  if(e.key===" ")e.preventDefault();
  if(S.mode!=="game")return;
  if(e.key.toLowerCase()==="q")cycleCam(-1);
  if(e.key.toLowerCase()==="e")cycleCam(1);
  if(e.key.toLowerCase()==="f")tryEnterLeave();
  if(e.key.toLowerCase()==="t")tryCall();
  if(e.key.toLowerCase()==="m")toggleMap();
  if(e.key.toLowerCase()==="c")$("controls").classList.toggle("open");
  if(e.key.toLowerCase()==="v")toggleACC();
  if(e.key.toLowerCase()==="r"){
    if(MEDIT.on){MEDIT.rot+=Math.PI/2;toast("\u{1F504} Rotated — the next item you place faces a new way");if(GHOST.lastE)updateGhost(GHOST.lastE);}
    else eatSelected();
  }
});
addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
/* free look with right mouse */
const look={on:false,yaw:0,pitch:0,lx:0,ly:0};
addEventListener("contextmenu",e=>{if(S.mode==="game")e.preventDefault();});
addEventListener("mousedown",e=>{if(e.button===2&&S.mode==="game"){look.on=true;look.lx=e.clientX;look.ly=e.clientY;}});
addEventListener("mouseup",e=>{if(e.button===2)look.on=false;});
addEventListener("mousemove",e=>{
  if(!look.on)return;
  look.yaw-=(e.clientX-look.lx)*0.008;look.pitch+=(e.clientY-look.ly)*0.006;
  look.pitch=Math.max(-0.9,Math.min(0.9,look.pitch));
  look.lx=e.clientX;look.ly=e.clientY;
});
function cycleCam(d){S.camMode=(S.camMode+d+4)%4;$("camLabel").innerHTML=`Camera: ${CAM_NAMES[S.camMode]} &nbsp;<kbd>Q</kbd>/<kbd>E</kbd>`;}
/* ---------- tablet mode: on-screen steering wheel + pedals ---------- */
const TOUCH={on:false,steer:0,gas:0,brake:0,hand:0,honk:0,held:false};
/* every control reads input through these, so keyboard and touch both work */
function steerInput(){let st=(keys.a?1:0)-(keys.d?1:0);if(TOUCH.on)st-=TOUCH.steer;if(GP.active)st-=GP.steer;return Math.max(-1,Math.min(1,st));}
function thrInput(){let t=(keys.w?1:0)-(keys.s?1:0);if(TOUCH.on)t+=TOUCH.gas-TOUCH.brake;if(GP.active)t+=GP.gas-GP.brake;return Math.max(-1,Math.min(1,t));}
function spaceInput(){return keys[" "]||(TOUCH.on&&TOUCH.hand>0)||(GP.active&&GP.hand);} // handbrake / jump / train brake / plane climb
const wheelCv=$("wheelCv");
{ /* draw the wheel once; rotation is done with a CSS transform */
  const c=wheelCv.getContext("2d"),W=wheelCv.width,R=W/2;
  c.translate(R,R);
  c.lineWidth=W*0.12;c.strokeStyle="#20293c";
  c.beginPath();c.arc(0,0,R*0.8,0,Math.PI*2);c.stroke();
  c.lineWidth=W*0.085;c.strokeStyle="#4a5670";
  c.beginPath();c.arc(0,0,R*0.8,0,Math.PI*2);c.stroke();
  c.lineWidth=W*0.06;
  for(const a of[Math.PI/2,Math.PI/2+2.094,Math.PI/2+4.189]){
    c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(a)*R*0.76,Math.sin(a)*R*0.76);c.stroke();
  }
  c.fillStyle="#232b3d";c.beginPath();c.arc(0,0,R*0.2,0,Math.PI*2);c.fill();
  c.fillStyle="#ffb02e";c.beginPath();c.arc(0,-R*0.8,W*0.04,0,Math.PI*2);c.fill();
}
{ /* drag anywhere on the wheel to turn it, ~110° of lock each way */
  let pid=null,a0=0,s0=0;
  const ang=e=>{const r=wheelCv.getBoundingClientRect();
    return Math.atan2(e.clientY-(r.top+r.height/2),e.clientX-(r.left+r.width/2));};
  wheelCv.addEventListener("pointerdown",e=>{
    pid=e.pointerId;wheelCv.setPointerCapture(pid);
    a0=ang(e);s0=TOUCH.steer;TOUCH.held=true;e.preventDefault();
  });
  wheelCv.addEventListener("pointermove",e=>{
    if(e.pointerId!==pid||!TOUCH.held)return;
    let d=ang(e)-a0;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;
    TOUCH.steer=Math.max(-1,Math.min(1,s0+d/1.92));
  });
  const end=()=>{pid=null;TOUCH.held=false;};
  wheelCv.addEventListener("pointerup",end);
  wheelCv.addEventListener("pointercancel",end);
}
function bindPedal(el,prop){
  const set=v=>{TOUCH[prop]=v;el.classList.toggle("press",v>0);};
  el.addEventListener("pointerdown",e=>{el.setPointerCapture(e.pointerId);set(1);e.preventDefault();});
  el.addEventListener("pointerup",()=>set(0));
  el.addEventListener("pointercancel",()=>set(0));
}
bindPedal($("pedGas"),"gas");
bindPedal($("pedBrake"),"brake");
bindPedal($("pedHand"),"hand");
bindPedal($("pedHonk"),"honk");
{ /* tablet SHIFT: sprint on foot, descend in planes & rockets */
  const el=$("pedShift");
  el.addEventListener("pointerdown",e=>{el.setPointerCapture(e.pointerId);keys.shift=true;el.classList.add("press");e.preventDefault();});
  const end=()=>{keys.shift=false;el.classList.remove("press");};
  el.addEventListener("pointerup",end);
  el.addEventListener("pointercancel",end);
}
/* mobile T & F buttons: T = call train/plane/bus/rocket, F = step in & out */
$("pedCallT").addEventListener("pointerdown",e=>{e.preventDefault();if(S.mode==="game")tryCall();});
$("pedEnterF").addEventListener("pointerdown",e=>{e.preventDefault();if(S.mode==="game")tryEnterLeave();});
$("pedEatR").addEventListener("pointerdown",e=>{e.preventDefault();if(S.mode==="game")eatSelected();});
/* tablet camera button: works exactly like the Q key */
$("pedCamQ").addEventListener("pointerdown",e=>{e.preventDefault();if(S.mode==="game")cycleCam(-1);});
function updateTouch(dt){
  if(!TOUCH.on)return;
  if(!TOUCH.held){ /* wheel springs back to center when released */
    TOUCH.steer*=Math.pow(0.002,dt);
    if(Math.abs(TOUCH.steer)<0.01)TOUCH.steer=0;
  }
  wheelCv.style.transform="rotate("+(TOUCH.steer*110)+"deg)";
}
function setTablet(on){
  TOUCH.on=on;
  $("hud").classList.toggle("tablet",on);
  $("bTablet").classList.toggle("on",on);
  if(!on){TOUCH.steer=TOUCH.gas=TOUCH.brake=TOUCH.hand=TOUCH.honk=0;TOUCH.held=false;}
}
$("bTablet").onclick=()=>{
  setTablet(!TOUCH.on);
  toast(TOUCH.on?"\u{1F4F1} Tablet mode ON — steering wheel + pedals":"Tablet mode OFF");
};
if(window.matchMedia&&matchMedia("(pointer:coarse)").matches)setTablet(true);
/* ---------- controllers: Xbox / PlayStation / Nintendo (Switch & Wii U Pro
   pads paired over Bluetooth) / USB steering wheels — via the Gamepad API ---------- */
const GP={active:false,steer:0,gas:0,brake:0,hand:false,base:null,prev:[]};
addEventListener("gamepadconnected",e=>{
  GP.base=null;
  toast("\u{1F3AE} Controller connected: "+e.gamepad.id.slice(0,42));
});
addEventListener("gamepaddisconnected",()=>{GP.active=false;GP.steer=GP.gas=GP.brake=0;GP.hand=false;GP.base=null;});
function pollGamepad(){
  const pads=navigator.getGamepads?navigator.getGamepads():[];
  let g=null;for(const p of pads){if(p&&p.connected){g=p;break;}}
  GP.active=!!g;
  if(!g){GP.steer=GP.gas=GP.brake=0;GP.hand=false;return;}
  if(!GP.base)GP.base=g.axes.map(a=>a);   // rest position (wheel pedals idle at +1)
  const dz=v=>Math.abs(v)<0.12?0:v;
  const b=i=>g.buttons[i]?g.buttons[i].value:0;
  GP.steer=dz(g.axes[0]||0);              // left stick / wheel = steering
  let gas=b(7),brake=b(6);                // RT / R2 = gas, LT / L2 = brake
  const ly=dz(g.axes[1]||0);              // left stick up/down also drives
  if(Math.abs(GP.base[1]||0)<0.5){if(ly<0)gas=Math.max(gas,-ly);else brake=Math.max(brake,ly);}
  for(const i of[1,2]){                   // steering-wheel pedals: axes idling at +1
    if(g.axes.length>i&&(GP.base[i]||0)>0.6){
      const v=Math.max(0,Math.min(1,(GP.base[i]-g.axes[i])/2));
      if(i===1)gas=Math.max(gas,v);else brake=Math.max(brake,v);
    }
  }
  GP.gas=gas;GP.brake=brake;
  GP.hand=b(0)>0.5;                       // A / Cross = handbrake & jump
  GP.honk=S.mode==="game"&&b(12)>0.5;     // d-pad up = honk (menus use it to navigate)
  const press=i=>b(i)>0.5&&!GP.prev[i];
  /* d-pad or left stick as menu navigation, with key-repeat on the stick */
  const now=performance.now();
  let ndx=0,ndy=0;
  if(press(14))ndx=-1;else if(press(15))ndx=1;
  if(press(12))ndy=-1;else if(press(13))ndy=1;
  if(!ndx&&!ndy&&now-(GP.navT||0)>230){
    const ax=dz(g.axes[0]||0),ay=dz(g.axes[1]||0);
    if(ax<-0.6)ndx=-1;else if(ax>0.6)ndx=1;
    else if(ay<-0.6)ndy=-1;else if(ay>0.6)ndy=1;
  }
  if(ndx||ndy)GP.navT=now;
  const setSel=(list,i)=>{list.forEach(el=>el.classList.remove("sel"));
    if(list[i]){list[i].classList.add("sel");list[i].scrollIntoView({block:"nearest"});}};
  if(S.mode==="menu"){
    /* garage: navigate the vehicle cards, LB/RB switch tabs, A picks */
    if(press(4)||press(5)){
      const tabs=[...document.querySelectorAll("#tabs .tab")];
      const cur=tabs.findIndex(t=>t.classList.contains("on"));
      tabs[(cur+(press(5)?1:tabs.length-1))%tabs.length].click();
      GP.sel=0;
    }
    const cards=[...document.querySelectorAll("#grid .card")];
    if(cards.length){
      if(ndx||ndy){
        GP.sel=Math.max(0,Math.min(cards.length-1,(GP.sel||0)+ndx+ndy*4));
        setSel(cards,GP.sel);
      }
      if(press(0))cards[Math.max(0,Math.min(cards.length-1,GP.sel||0))].click();
    }
  }else if($("destModal").classList.contains("open")){
    /* destination picker: up/down + A */
    const list=[...document.querySelectorAll("#destList button")];
    if(list.length){
      if(ndy||ndx){
        GP.dsel=Math.max(0,Math.min(list.length-1,(GP.dsel||0)+ndy+ndx));
        setSel(list,GP.dsel);
      }
      if(press(0)){list[Math.max(0,Math.min(list.length-1,GP.dsel||0))].click();GP.dsel=0;}
    }
  }else if(S.mode==="game"){
    if(press(2))tryEnterLeave();          // X / Square = enter & leave
    if(press(3))tryCall();                // Y / Triangle = call train/bus/plane
    if(press(1))cycleCam(1);              // B / Circle = camera
    if(press(9))toggleMap();              // Start = map
  }
  GP.prev=g.buttons.map(x=>x.value>0.5);
}
/* buttons */
$("bMenu").onclick=()=>{S.mode="menu";$("menu").style.display="flex";$("hud").classList.remove("show");};
$("bSpawn").onclick=()=>goSpawn();
$("bTraffic").onclick=()=>{
  S.traffic=!S.traffic;
  $("bTraffic").innerHTML="&#128678; Traffic: "+(S.traffic?"ON":"OFF");
  $("bTraffic").classList.toggle("on",S.traffic);
  traffic.forEach(c=>{c.mesh.visible=S.traffic&&!c.controlled;if(S.traffic)respawnCar(c);});
};
/* the old ADMIN mode is gone — this panel only keeps Police chases & Hunger,
   plus the 👑 OWNER tools (day & time, kick/ban) when this world is yours */
$("bAdmin").onclick=()=>{
  const show=!$("adminPanel").classList.contains("show");
  $("adminPanel").classList.toggle("show",show);
  $("bAdmin").classList.toggle("on",show);
  if(show&&typeof refreshOwnerBox==="function")refreshOwnerBox();
};
function baseLimitFor(t){
  if(t==="car")return S.selected?S.selected.top:200;
  if(t==="train")return 140;
  if(t==="plane")return 950;
  if(t==="rocket")return 400;   // climb speed of the rocket (km/h)
  return 90; // bus
}
function limitFor(t){return baseLimitFor(t)+BONUS[t];}
function updateLimitUI(){}   // the old admin MAX-SPEED panel was removed
$("bArrest").onclick=()=>{
  S.arrest=!S.arrest;
  $("bArrest").innerHTML="\u{1F46E} Police chases: "+(S.arrest?"ON":"OFF");
  $("bArrest").classList.toggle("on",S.arrest);
  if(!S.arrest)for(const c of traffic)if(c.chase)endChase(c);
  toast(S.arrest?"\u{1F46E} Police chases ON":"\u{1F60E} Police chases OFF — the cops will ignore you");
};
/* cruise control */
function toggleACC(){
  ACC.on=!ACC.on;
  const v=parseFloat($("accInput").value);
  if(!isNaN(v)&&v>0)ACC.target=S.unit==="kmh"?v:v/0.621371;
  $("accBtn").textContent=ACC.on?"ON":"OFF";
  $("accBtn").classList.toggle("on",ACC.on);
  toast(ACC.on?("Cruise control ON: "+Math.round(uConv(ACC.target))+" "+uLabel()):"Cruise control OFF");
}
$("accBtn").onclick=toggleACC;
$("accInput").addEventListener("change",()=>{
  const v=parseFloat($("accInput").value);
  if(!isNaN(v)&&v>0)ACC.target=S.unit==="kmh"?v:v/0.621371;
});
function accSpeedMS(){return ACC.target/3.6;}
/* audio toggles (settings) */
$("sndTgl").onclick=()=>{
  SND.sound=!SND.sound;
  $("sndTgl").classList.toggle("on",SND.sound);
  $("sndTgl").innerHTML="\u{1F50A} Sound "+(SND.sound?"ON":"OFF");
};
$("musTgl").onclick=()=>{
  SND.music=!SND.music;
  $("musTgl").classList.toggle("on",SND.music);
  $("musTgl").innerHTML="\u{1F3B5} Music "+(SND.music?"ON":"OFF");
  setMusicOn(SND.music);
};
/* DEFAULT game sound (engine, horn, birds…) lives in the WebAudio engine, which
   browsers only let us start on a user gesture. The radio UI used to be the only
   thing that started it — now the first tap OR key press while playing wakes it,
   and also heals music/audio the browser blocked at load. */
function wakeAudio(){
  if(S.mode==="game")ensureAudio();
  try{if(audioCtx&&audioCtx.state==="suspended")audioCtx.resume();}catch(e){}
  if(SND.music&&musicAudio&&musicAudio.paused&&!musicAudio.error&&radioStation().files.length)musicAudio.play().catch(()=>{});
}
addEventListener("pointerdown",wakeAudio,{capture:true});
addEventListener("keydown",wakeAudio,{capture:true});
/* spawn / start */
function goSpawn(){
  endRide(true);
  switchWorld("earth");
  MCD.phase="idle";MCD.target=null;MCD.cd=8;   // spawn always frees the wheel
  const sx=WORLD.ox+6,sz=WORLD.oz+6;
  player.inRocket=false;
  if(CAVE.in)exitCave(true);
  player.x=sx;player.z=sz;player.vy=0;
  player.inTrain=player.inPlane=player.inBus=false;player.train=null;player.planeRef=null;player.bus=null;
  if(player.drive){player.drive=null;}
  player.onFoot=false;
  if(myVehicle){myVehicle.x=sx;myVehicle.z=sz;myVehicle.yaw=Math.PI;myVehicle.speed=0;player.drive=myVehicle;player.onFoot=false;}
  else player.onFoot=true;
  player.mesh.visible=player.onFoot;
  updateChunks(sx,sz,true);updateLandmarks(sx,sz);
  toast("Teleported to spawn"+(WORLD.name?" of world \""+WORLD.name+"\"":""));
}
/* pick a vehicle in the menu: owned ones open your garage, the rest cost money */
function selectVehicle(v){
  if(OWN.has(v.name)){openGarage(v);return;}
  const p=vehPrice(v);
  if(MONEY.v<p){
    toast("\u{1F4B0} The "+v.name+" costs $"+fmtMoney(p)+" — you only have $"+fmtMoney(MONEY.v)+". Sell dumplings & win races!");
    return;
  }
  MONEY.v-=p;OWN.add(v.name);
  updateMoneyUI();saveGame();profileSave(true);
  toast("\u{1F389} You bought the "+v.name+" for $"+fmtMoney(p)+"!");
  renderMenu();
  openGarage(v);
}
/* ---------- the garage: a showcase room where you paint your car, then DRIVE ---------- */
const GAR={v:null,color:0,mesh:null,room:null,ang:0,cy:-620};
const GAR_COLORS=[0xd7263d,0xff7f11,0xf4d35e,0x8ac926,0x2ec4b6,0x1b98e0,0x0f4c81,0x9b5de5,0xff5d8f,0xefefef,0x3a3a3a,0x111111,0xffb02e,0xb56576,0x6d28d9,0x14532d];
function buildGarageRoom(){
  if(GAR.room)return;
  const g=new THREE.Group(),y=GAR.cy;
  const wall=new THREE.MeshLambertMaterial({color:0x232b3d,side:THREE.BackSide});
  const shell=new THREE.Mesh(new THREE.CylinderGeometry(14,14,9,24,1,false),wall);
  shell.position.set(0,y+4.5,0);g.add(shell);
  const floor=new THREE.Mesh(new THREE.CylinderGeometry(14,14,0.4,24),new THREE.MeshLambertMaterial({color:0x323a4d}));
  floor.position.set(0,y-0.2,0);g.add(floor);
  const disc=new THREE.Mesh(new THREE.CylinderGeometry(4.6,5,0.35,28),new THREE.MeshLambertMaterial({color:0x4a5670}));
  disc.position.set(0,y+0.18,0);g.add(disc);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(5,0.1,8,40),new THREE.MeshBasicMaterial({color:0x3fd0ff}));
  ring.rotation.x=Math.PI/2;ring.position.set(0,y+0.42,0);g.add(ring);
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3;
    const strip=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.06,6),new THREE.MeshBasicMaterial({color:0xf4f7fb}));
    strip.position.set(Math.sin(a)*6,y+8.6,Math.cos(a)*6);strip.rotation.y=a;g.add(strip);
  }
  const lamp=new THREE.PointLight(0xffffff,1.4,60);lamp.position.set(0,y+7,0);g.add(lamp);
  const lamp2=new THREE.PointLight(0x9fd8ff,0.5,40);lamp2.position.set(6,y+3,6);g.add(lamp2);
  scene.add(g);
  GAR.room=g;
}
function garageSetMesh(){
  if(GAR.mesh){GAR.room.remove(GAR.mesh);disposeGroup(GAR.mesh);}
  const m=buildVehicleMesh(GAR.v.type,GAR.color,GAR.v.top,GAR.v.name);
  if(m.userData.riderMesh)m.userData.riderMesh.visible=false;
  applyCustom(m,GAR.v,custOf(GAR.v.name));
  m.position.set(0,GAR.cy+0.38,0);
  GAR.room.add(m);GAR.mesh=m;
}
function renderGarageColors(){
  const w=$("garColors");w.innerHTML="";
  GAR_COLORS.forEach(c=>{
    const b=document.createElement("button");
    b.className="gcol"+(c===GAR.color?" on":"");
    b.style.background="#"+c.toString(16).padStart(6,"0");
    b.title="Paint";
    b.onclick=()=>{GAR.color=c;PAINT[GAR.v.name]=c;garageSetMesh();renderGarageColors();saveGame();};
    w.appendChild(b);
  });
}
function openGarage(v){
  GAR.v=v;GAR.color=paintOf(v);GAR.ang=0;
  buildGarageRoom();garageSetMesh();renderGarageColors();
  $("garName").textContent=EMOJI[v.type]+" "+v.name;
  $("garInfo").textContent=TYPE_LABEL[v.type]+" · top speed "+Math.round(uConv(v.top))+" "+uLabel()+" · pick a paint color, then hit DRIVE!";
  S.mode="garage";
  $("garCustom").style.display="flex";   // every vehicle can be customized now
  cuUI();
  $("garSell").style.display=DEFAULT_OWNED.includes(v.name)?"none":"";
  $("menu").style.display="none";
  $("hud").classList.remove("show");
  $("garagePanel").classList.add("open");
}
function closeGarage(back){
  $("garagePanel").classList.remove("open");
  if(GAR.mesh){GAR.room.remove(GAR.mesh);disposeGroup(GAR.mesh);GAR.mesh=null;}
  if(back){S.mode="menu";$("menu").style.display="flex";}
}
function updateGarage(dt){
  GAR.ang+=dt*0.5;
  const cy=GAR.cy;
  camera.position.set(Math.sin(GAR.ang)*8.6,cy+3.4,Math.cos(GAR.ang)*8.6);
  camera.lookAt(0,cy+1.1,0);
}
$("garBack").onclick=()=>closeGarage(true);
$("garDrive").onclick=()=>{const v=GAR.v;closeGarage(false);startGame(v);};
/* sell a vehicle back for 70% of its price (starter vehicles excluded) */
$("garSell").onclick=()=>{
  const v=GAR.v;
  if(!v)return;
  if(DEFAULT_OWNED.includes(v.name)){toast("That's one of your starter vehicles — you can't sell it!");return;}
  const val=Math.max(10,Math.round(vehPrice(v)*0.7/10)*10);
  showDest("\u{1F4B5} Sell your "+v.name+"?",[
    {label:"✅ Sell it for $"+fmtMoney(val)+" (70% of the price)",value:"yes"},
    {label:"❌ No, keep it!",value:"no"}
  ],a=>{
    if(a!=="yes")return;
    OWN.delete(v.name);
    addMoney(val);profileSave(true);
    toast("\u{1F4B5} Sold the "+v.name+" for $"+fmtMoney(val)+"!");
    closeGarage(true);renderMenu();
  });
};
function startGame(v){
  player.inRocket=false;
  if(CAVE.in)exitCave(true);
  /* switching cars keeps you where you were — only your first start
     (or a world change / coming back from the moon) uses the spawn */
  const resume=S.everPlayed&&S.world==="earth"&&S.lastPlayWorld===WORLD.name;
  const rx=player.x,rz=player.z;
  switchWorld("earth");
  S.selected=v;S.mode="game";
  $("menu").style.display="none";$("hud").classList.add("show");
  $("vehName").textContent=v.name;
  /* a running job ends here — otherwise the police siren & cruiser mesh
     would leak onto the newly picked car */
  if(JOB.type)endJob(true);
  if(myVehicle){scene.remove(myVehicle.mesh);disposeGroup(myVehicle.mesh);}
  const sx=resume?rx:WORLD.ox+6,sz=resume?rz:WORLD.oz+6;
  S.everPlayed=true;S.lastPlayWorld=WORLD.name;
  const mesh=buildVehicleMesh(v.type,paintOf(v),v.top,v.name);
  applyCustom(mesh,v,custOf(v.name));
  scene.add(mesh);
  myVehicle={mesh,type:v.type==="camper"?"car":v.type,top:v.top,x:sx,z:sz,yaw:Math.PI,speed:0,vy:0,y:0,grounded:true,roll:0,camper:v.type==="camper"};
  if(mesh.userData.riderMesh)mesh.userData.riderMesh.visible=true;
  player.drive=myVehicle;player.onFoot=false;
  player.inTrain=player.inPlane=player.inBus=false;player.train=null;player.planeRef=null;player.bus=null;
  player.mesh.visible=false;
  /* every car honks differently — supercars sound deep, bikes ring high */
  try{setHornPitch(v.type==="car"?(v.top>=340?300:v.top>=280?360:410):(v.type==="moto"?500:620));}catch(e){}
  updateLimitUI();updateChunks(sx,sz,true);updateLandmarks(sx,sz);
  mpJoin();chatStart();
  dailyReward();
}
/* ---------- destination modal ---------- */
let destCb=null;
function showDest(title,options,cb){
  $("destTitle").textContent=title;
  const list=$("destList");list.innerHTML="";
  destCb=cb;
  options.forEach(o=>{
    const b=document.createElement("button");
    b.innerHTML=o.label;
    b.onclick=()=>{$("destModal").classList.remove("open");const f=destCb;destCb=null;f(o.value);};
    list.appendChild(b);
  });
  $("destModal").classList.add("open");
}
/* ---------- hunger + McDrive + food backpack ---------- */
const HUNGER={v:100,starveT:0,on:true};
const MCD_MENU=[
  ["\u{1F357} Chicken nuggets (6)",18],["\u{1F357} Chicken nuggets (9)",25],["\u{1F357} Chicken nuggets (20)",45],
  ["\u{1F354} Hamburger",20],["\u{1F9C0} Cheeseburger",24],["\u{1F354} Big Mac",35],
  ["\u{1F964} Coca Cola (small)",8],["\u{1F964} Coca Cola (medium)",12],["\u{1F964} Coca Cola (large)",16],
  ["\u{1F964} Pepsi (small)",8],["\u{1F964} Pepsi (medium)",12],["\u{1F964} Pepsi (large)",16],
  ["\u{1F34E} Apple juice (small)",8],["\u{1F34E} Apple juice (medium)",12],["\u{1F34E} Apple juice (large)",16],
  ["\u{1F35F} Fries (small)",12],["\u{1F35F} Fries (medium)",18],["\u{1F35F} Fries (large)",25]
];
const MCD={phase:"idle",target:null,order:[],pack:[],sel:0,wait:0,cd:0};
function renderMcdOrder(){
  $("mcdOrder").textContent=MCD.order.length
    ?"Your order: "+MCD.order.map(o=>o[0]).join(", ")
    :"Your order: nothing yet";
}
{
  const list=$("mcdList");
  MCD_MENU.forEach(item=>{
    const b=document.createElement("button");
    b.innerHTML=item[0];
    b.onclick=()=>{MCD.order.push(item);renderMcdOrder();};
    list.appendChild(b);
  });
}
$("mcdDone").onclick=()=>{
  $("mcdModal").classList.remove("open");
  if(MCD.delivery){
    /* ordering from HOME: a courier brings it to your door */
    MCD.delivery=false;
    if(MCD.order.length){
      const cost=MCD.order.reduce((s,it)=>s+it[1],0)+10;
      startOrder(ORDER.pend,MCD.order.slice(),0,cost,"\u{1F354} McDrive order");
    }else toast("No order — maybe later!");
    MCD.order=[];
    return;
  }
  if(MCD.order.length){MCD.phase="tofood";toast("\u{1F697} Driving to the pickup window...");}
  else{MCD.phase="idle";MCD.cd=12;toast("No order — drive on!");}
};
function renderPack(){
  const list=$("packList");list.innerHTML="";
  if(!MCD.pack.length){
    const d=document.createElement("div");
    d.style.cssText="color:var(--dim);font-size:13px";
    d.textContent="Empty — order something at a McDrive!";
    list.appendChild(d);return;
  }
  MCD.sel=Math.max(0,Math.min(MCD.pack.length-1,MCD.sel));
  MCD.pack.forEach((it,i)=>{
    const b=document.createElement("button");
    b.innerHTML=it[0]+" <span style='color:var(--dim)'>+"+it[1]+"</span>";
    if(i===MCD.sel)b.classList.add("sel");
    b.onclick=()=>{MCD.sel=i;renderPack();};
    list.appendChild(b);
  });
}
$("bPack").onclick=()=>{renderPack();$("packModal").classList.toggle("open");};
$("packClose").onclick=()=>$("packModal").classList.remove("open");
/* ---------- shops: walk in, press T, buy food ---------- */
const SHOP_FOOD=[
  ["\u{1F34E} Apple",12],["\u{1F34C} Banana",11],["\u{1F347} Grapes",12],["\u{1F353} Strawberries",13],
  ["\u{1F35E} Bread",22],["\u{1F950} Croissant",15],["\u{1F95B} Milk",14],["\u{1F963} Cereal",20],
  ["\u{1F9C0} Cheese",18],["\u{1F95A} Eggs",16],["\u{1F36B} Chocolate",14],["\u{1F36A} Cookies",12]
];
const HUGE_FOOD=[...SHOP_FOOD,
  ["\u{1F349} Watermelon",25],["\u{1F34D} Pineapple",20],["\u{1F96D} Mango",16],["\u{1F966} Broccoli",13],
  ["\u{1F955} Carrots",10],["\u{1F355} Frozen pizza",30],["\u{1F35D} Pasta",24],["\u{1F35A} Rice",22],
  ["\u{1F96B} Soup",18],["\u{1F9C3} Juice box",10],["\u{1F366} Ice cream",16],["\u{1F382} Cake",28]
];
function nearShop(){
  for(let i=shops.length-1;i>=0;i--){
    const s=shops[i];
    if(offScene(s.g)){shops.splice(i,1);continue;}
    /* giant MEGA MARTs are 100 x 76 m — T works anywhere inside */
    if(s.huge){if(Math.abs(player.x-s.x)<52&&Math.abs(player.z-s.z)<40)return s;}
    else if(Math.hypot(player.x-s.x,player.z-s.z)<9)return s;
  }
  return null;
}
function openShop(s){
  $("shopTitle").textContent=s.huge?"\u{1F6D2} MEGA MART — huge shop!":"\u{1F6D2} Shop — buy some food";
  const list=$("shopList");list.innerHTML="";
  (s.huge?HUGE_FOOD:SHOP_FOOD).forEach(item=>{
    const b=document.createElement("button");
    b.innerHTML=item[0]+" <span style='color:var(--dim)'>+"+item[1]+"</span>";
    b.onclick=()=>{MCD.pack.push(item);toast("\u{1F6CD}️ "+item[0]+" is in your backpack! (press R to eat)");renderPack();};
    list.appendChild(b);
  });
  if(s.huge){
    const b=document.createElement("button");
    b.innerHTML="\u{1F95F} Squishy Dumpling <span style='color:#ff5d8f'>surprise!</span>";
    b.onclick=()=>{DUMP.unopened++;toast("\u{1F95F} Squishy Dumpling bought! Open it in the \u{1F95F} Squishies menu.");};
    list.appendChild(b);
    const bb=document.createElement("button");
    bb.innerHTML="\u{1F9C8} Butter Squishy <span style='color:#f4d35e'>surprise! (rare MEDIUM &amp; MEGA!)</span>";
    bb.onclick=()=>{BUTTER.unopened++;toast("\u{1F9C8} Butter Squishy bought! Open it in the \u{1F95F} Squishies menu (Butter tab).");};
    list.appendChild(bb);
    /* the fishing corner */
    if(!ROD.owned){
      const rod=document.createElement("button");
      rod.innerHTML="\u{1F3A3} Fishing rod <span style='color:var(--dim)'>$200 — fish at any water edge!</span>";
      rod.onclick=()=>{
        if(MONEY.v<200){toast("\u{1F4B0} The rod costs $200!");return;}
        MONEY.v-=200;updateMoneyUI();saveGame();
        ROD.owned=true;
        try{localStorage.setItem("vc4rod","1");}catch(e){}
        toast("\u{1F3A3} Rod bought! Stand at the water's edge, face the sea, press T to cast!");
        rod.remove();
      };
      list.appendChild(rod);
    }
    /* the pet corner */
    const dog=document.createElement("button");
    dog.innerHTML="\u{1F436} Puppy <span style='color:var(--dim)'>$500 — follows you everywhere!</span>";
    dog.onclick=()=>buyPet("dog",500);
    list.appendChild(dog);
    const cat=document.createElement("button");
    cat.innerHTML="\u{1F431} Kitten <span style='color:var(--dim)'>$400 — follows you everywhere!</span>";
    cat.onclick=()=>buyPet("cat",400);
    list.appendChild(cat);
    const par=document.createElement("button");
    par.innerHTML="\u{1F99C} Parrot <span style='color:var(--dim)'>$600 — rides on your SHOULDER!</span>";
    par.onclick=()=>buyPet("parrot",600);
    list.appendChild(par);
  }
  $("shopModal").classList.add("open");
}
$("shopClose").onclick=()=>$("shopModal").classList.remove("open");
/* ---------- Squishy Dumplings: collectibles from MEGA MARTs ---------- */
const DUMP={unopened:0,owned:[]};
const DUMP_COLORS=[["Red","#d7263d"],["Blue","#1b98e0"],["Green","#8ac926"],["Yellow","#f4d35e"],
  ["Pink","#ff5d8f"],["Purple","#9b5de5"],["Orange","#ff7f11"],["White","#f2f5f7"]];
const RAINBOW_CSS="linear-gradient(90deg,#ff004c,#ff9e00,#ffee00,#37ff00,#00cfff,#9b5de5)";
function dumpValue(d){
  if(d.color==="Rainbow")return d.glitter?250:30;
  if(d.color==="Gold")return d.glitter?20:30;
  if(d.color==="Pumpkin"||d.color==="Snowy")return d.glitter?150:40;   // seasonal specials
  if(d.color==="Pearl")return d.glitter?90:25;                         // island exclusive (sells BELOW the $35 shop price!)
  if(d.color==="Alien")return d.glitter?2500:1000;                     // robbed from the moon aliens!
  if(d.color==="Lava")return d.glitter?300:120;                        // mined from a volcano crater
  /* PLANET dumplings: worth exactly how far away the planet is ($1 per km) —
     glitter ones are worth 2.5x. Neptune dumplings are the most valuable! */
  if(typeof PLANETS!=="undefined"){
    const pk=d.color.toLowerCase();
    if(PLANETS[pk]&&PLANETS[pk].km>0)return d.glitter?Math.round(PLANETS[pk].km*2.5):PLANETS[pk].km;
  }
  if(typeof SKY_DUMPS!=="undefined"&&SKY_DUMPS.some(s=>s[0]===d.color))return d.glitter?240:80;   // cloud collection
  if(typeof BEACH_DUMPS!=="undefined"&&BEACH_DUMPS.some(b=>b[0]===d.color))return d.glitter?90:25;   // beach collection
  return d.glitter?100:15;
}
/* ---------- Butter squishies: same colors & glitter, but they also come in SIZES —
   MEDIUM is rare (1/200) and MEGA is ultra rare (1/600) ---------- */
const BUTTER={unopened:0,owned:[]};
function butterValue(d){return dumpValue(d)*(d.size==="mega"?20:d.size==="med"?6:1);}
function butterSizeLabel(d){return d.size==="mega"?"\u{1F31F} MEGA ":d.size==="med"?"\u{1F538} MEDIUM ":"";}
