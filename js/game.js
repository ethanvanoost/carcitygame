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
/* little white stars sprinkled on every glitter dumpling */
const _starGeo=new THREE.OctahedronGeometry(1,0);
const _starMat=new THREE.MeshBasicMaterial({color:0xffffff});
function addDumpStars(target,r){
  for(let i=0;i<10;i++){
    const th=i*2.399963,y=1-(i+0.5)/5;   // golden spiral over the sphere
    const rad=Math.sqrt(Math.max(0,1-y*y));
    const s=new THREE.Mesh(_starGeo,_starMat);
    s.scale.setScalar(r*0.2);
    s.position.set(Math.cos(th)*rad*r,y*r,Math.sin(th)*rad*r);
    s.rotation.set(i,i*2,0);
    target.add(s);
  }
}
/* holding a dumpling in your hands */
const HOLD={d:null,mesh:null,mat:null,stars:null};
{
  const mat=new THREE.MeshLambertMaterial({color:0xffffff});
  const m=new THREE.Mesh(new THREE.SphereGeometry(0.26,10,8),mat);
  m.scale.y=0.75;m.visible=false;scene.add(m);
  const st=new THREE.Group();addDumpStars(st,0.27);st.visible=false;m.add(st);
  HOLD.mesh=m;HOLD.mat=mat;HOLD.stars=st;
}
function holdDump(d){
  if(HOLD.d===d){
    HOLD.d=null;HOLD.mesh.visible=false;
    toast("You put the "+(d.size?"butter squishy":"dumpling")+" away.");
  }else{
    HOLD.d=d;
    if(d.color!=="Rainbow")HOLD.mat.color.set(d.hex);
    HOLD.stars.visible=!!d.glitter;
    const sc=d.size==="mega"?2.3:d.size==="med"?1.5:1;   // butter squishies come in sizes
    HOLD.mesh.scale.set(sc,0.75*sc,sc);
    toast("✋"+(d.size?"\u{1F9C8}":"\u{1F95F}")+" You're holding your "+(d.glitter?"GLITTER ":"")+(d.size?butterSizeLabel(d):"")+d.color+" "+(d.size?"butter squishy":"dumpling")+"!"+(player.onFoot?"":" (step out of your vehicle to see it)"));
  }
  renderDump();
}
function updateHeld(){
  const m=HOLD.mesh;
  if(!HOLD.d||!player.onFoot||!player.mesh.visible){m.visible=false;return;}
  m.visible=true;
  const yaw=player.yaw;
  m.position.set(
    player.x+Math.sin(yaw)*0.5+Math.sin(yaw+Math.PI/2)*0.3,
    player.y+1.12,
    player.z+Math.cos(yaw)*0.5+Math.cos(yaw+Math.PI/2)*0.3);
  if(HOLD.d.color==="Rainbow")HOLD.mat.color.setHSL((performance.now()/1500)%1,0.9,0.55);
  if(HOLD.d.glitter)HOLD.mat.emissive.setHSL((performance.now()/300)%1,0.8,0.3);
  else HOLD.mat.emissive.setRGB(0,0,0);
}
/* displaying your dumplings on a table at your MEGA MANSION */
const DISPLAYS=new Map();   // mansion id -> dumplings on the table
/* rainbowMat() lives in world.js now (the museum uses it too) */
function nearMansion(){
  for(let i=mansions.length-1;i>=0;i--){
    const m=mansions[i];
    if(offScene(m.g)){mansions.splice(i,1);continue;}
    const r=m.plot?17:56,r2=m.plot?17:46;
    if(Math.abs(player.x-m.x)<r&&Math.abs(player.z-m.z)<r2)return m;
  }
  return null;
}
function buildDumpTable(m){
  if(m.tableG){m.g.remove(m.tableG);disposeGroup(m.tableG);m.tableG=null;}
  const items=DISPLAYS.get(m.id);
  if(!items||!items.length)return;
  const tg=new THREE.Group();
  const tx=m.x+20,tz=m.z+40;   // ~2 m outside the front wall
  const ty=terrainH(tx,tz);
  const cols=Math.ceil(items.length/2);
  const top=new THREE.Mesh(new THREE.BoxGeometry(Math.max(3,cols*0.9+1),0.14,2.2),new THREE.MeshLambertMaterial({color:0x8a6f4d}));
  top.position.set(tx,ty+0.85,tz);tg.add(top);
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(o=>{
    const l=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.85),new THREE.MeshLambertMaterial({color:0x6f4e37}));
    l.position.set(tx+o[0]*(Math.max(3,cols*0.9+1)/2-0.3),ty+0.42,tz+o[1]*0.8);tg.add(l);
  });
  items.forEach((d,i)=>{
    const mat=d.color==="Rainbow"?rainbowMat():new THREE.MeshLambertMaterial({color:new THREE.Color(d.hex)});
    if(d.glitter&&d.color!=="Rainbow")mat.emissive=new THREE.Color(d.hex).multiplyScalar(0.4);
    const dm=new THREE.Mesh(new THREE.SphereGeometry(0.22,10,8),mat);
    dm.scale.y=0.75;
    dm.position.set(tx-(cols-1)*0.45+Math.floor(i/2)*0.9,ty+1.05,tz-0.45+(i%2)*0.9);
    if(d.glitter)addDumpStars(dm,0.23);
    tg.add(dm);
  });
  m.g.add(tg);m.tableG=tg;
}
window.onMansionBuilt=m=>{if(DISPLAYS.has(m.id))buildDumpTable(m);buildMansionFurniture(m);};
/* build a HUGE list in chunks of 1000 so the page never freezes —
   the first 1000 show right away, the rest keep loading by themselves */
function chunkedList(list,items,makeEl,chunk=1000){
  const token=(list._chunkToken=(list._chunkToken||0)+1);
  let i=0;
  (function step(){
    if(token!==list._chunkToken)return;   // a newer render started — stop this one
    const frag=document.createDocumentFragment(),end=Math.min(items.length,i+chunk);
    for(;i<end;i++)frag.appendChild(makeEl(items[i],i));
    list.appendChild(frag);
    if(i<items.length){
      const more=document.createElement("div");
      more.style.cssText="color:var(--dim);font-size:13px;padding:4px";
      more.textContent="Loading more… "+i+" / "+items.length;
      list.appendChild(more);
      setTimeout(()=>{if(token===list._chunkToken)more.remove();step();},0);
    }
  })();
}
const SQTAB={v:"dump"};   // which Squishies tab is open: dumplings or butter
function renderDump(){
  const butter=SQTAB.v==="butter";
  $("dumpTabD").classList.toggle("on",!butter);
  $("dumpTabB").classList.toggle("on",butter);
  const C=butter?BUTTER:DUMP,one=butter?"butter squishy":"dumpling",many=butter?"butter squishies":"dumplings";
  $("dumpInfo").textContent=C.unopened
    ?"You have "+C.unopened+" unopened "+(C.unopened>1?many:one)+" — open one!"
    :"No unopened "+many+" — buy them at a \u{1F6D2} MEGA MART (one every ~3 km, see the map).";
  $("dumpOpen").textContent=(butter?"\u{1F9C8} Open a butter squishy!":"\u{1F95F} Open a dumpling!");
  $("dumpOpenAll").textContent="\u{1F389} Open ALL "+many+"!";
  const list=$("dumpList");list.innerHTML="";
  if(!C.owned.length){
    const d=document.createElement("div");
    d.style.cssText="color:var(--dim);font-size:13px";
    d.textContent=butter
      ?"Your butter collection is empty — MEDIUM ones are 1/200 and MEGA ones 1/600!"
      :"Your collection is empty.";
    list.appendChild(d);
  }
  chunkedList(list,C.owned,d=>{
    const el=document.createElement("button");
    el.className="dumpItem"+(d.glitter?" glitter":"")+(HOLD.d===d?" held":"");
    el.innerHTML="<span class='swatch' style='background:"+d.hex+"'></span>"
      +(d.glitter?"✨ GLITTER ":"")+(butter?butterSizeLabel(d):"")+d.color+" "+one
      +" <span style='color:var(--dim)'>$"+fmtMoney(butter?butterValue(d):dumpValue(d))+"</span>"
      +(HOLD.d===d?" ✋ holding":"");
    el.onclick=()=>holdDump(d);
    return el;
  });
  const m=nearMansion();
  $("dumpDisplay").style.display=butter?"none":"";
  $("dumpDisplay").textContent=m&&DISPLAYS.has(m.id)?"\u{1F3F0} Remove the dumpling display":"\u{1F3F0} Display your dumplings at your mansion";
  $("dumpOpen").style.display=C.unopened?"":"none";
}
$("dumpTabD").onclick=()=>{SQTAB.v="dump";renderDump();};
$("dumpTabB").onclick=()=>{SQTAB.v="butter";renderDump();};
$("bDump").onclick=()=>{renderDump();$("dumpModal").classList.toggle("open");};
$("dumpClose").onclick=()=>$("dumpModal").classList.remove("open");
function rollDump(){
  DUMP.unopened--;
  const roll=Math.random(),month=new Date().getMonth();
  let color,hex;
  if(month===9&&Math.random()<0.15){color="Pumpkin";hex="#ff7518";}        // 🎃 October special!
  else if(month===11&&Math.random()<0.15){color="Snowy";hex="#eafcff";}    // ❄️ December special!
  else if(roll<0.02){color="Rainbow";hex=RAINBOW_CSS;}             // rare!
  else if(roll<0.08){color="Gold";hex="#ffd700";}
  else{const c=DUMP_COLORS[Math.floor(Math.random()*DUMP_COLORS.length)];color=c[0];hex=c[1];}
  const glitter=Math.random()<0.08;   // rainbow + glitter = VERY rare
  const d={color,hex,glitter};
  DUMP.owned.push(d);
  if(color==="Rainbow"&&glitter)
    pushNews("\u{1F308}✨ BREAKING: "+mpName()+" just opened the LEGENDARY GLITTER RAINBOW dumpling — the rarest in the world!!");
  else if(color==="Rainbow")
    pushNews("\u{1F308} "+mpName()+" opened a rare RAINBOW dumpling!");
  return d;
}
/* butter squishies roll the same colors + glitter, PLUS a size:
   MEDIUM = rare (1/200), MEGA = ultra rare (1/600) */
function rollButter(){
  BUTTER.unopened--;
  const roll=Math.random();
  let color,hex;
  if(roll<0.02){color="Rainbow";hex=RAINBOW_CSS;}
  else if(roll<0.08){color="Gold";hex="#ffd700";}
  else{const c=DUMP_COLORS[Math.floor(Math.random()*DUMP_COLORS.length)];color=c[0];hex=c[1];}
  const glitter=Math.random()<0.08;
  const sr=Math.random();
  const size=sr<1/600?"mega":sr<1/600+1/200?"med":"norm";
  const d={color,hex,glitter,size};
  BUTTER.owned.push(d);
  if(size==="mega"&&color==="Rainbow"&&glitter)
    pushNews("\u{1F9C8}\u{1F308}✨ BREAKING: "+mpName()+" opened a GLITTER RAINBOW MEGA butter squishy — the rarest butter in the universe!!");
  else if(size==="mega")
    pushNews("\u{1F9C8}\u{1F31F} "+mpName()+" opened an ULTRA RARE MEGA butter squishy (1/600)!");
  return d;
}
$("dumpOpen").onclick=()=>{
  if(SQTAB.v==="butter"){
    if(!BUTTER.unopened)return;
    const d=rollButter();
    if(d.size==="mega")toast("\u{1F31F}\u{1F9C8} NO WAY — an ULTRA RARE MEGA "+(d.glitter?"GLITTER ":"")+d.color+" butter squishy (1/600)!! ($"+fmtMoney(butterValue(d))+")");
    else if(d.size==="med")toast("\u{1F538}\u{1F9C8} RARE — a MEDIUM "+(d.glitter?"GLITTER ":"")+d.color+" butter squishy (1/200)! ($"+fmtMoney(butterValue(d))+")");
    else if(d.color==="Rainbow"&&d.glitter)toast("\u{1F308}✨ WOW — a GLITTER RAINBOW butter squishy!");
    else toast(d.glitter?"✨\u{1F9C8} A RARE GLITTER "+d.color+" butter squishy!":"\u{1F9C8} You got a "+d.color+" butter squishy!");
    renderDump();saveGame();return;
  }
  if(!DUMP.unopened)return;
  const d=rollDump(),{color,glitter}=d;
  if(color==="Rainbow"&&glitter)toast("\u{1F308}✨ NO WAY!!! A GLITTER RAINBOW DUMPLING — the rarest of all! ($250)");
  else if(color==="Rainbow")toast("\u{1F308}\u{1F95F} WOW — a rare RAINBOW dumpling! ($30)");
  else if(color==="Gold")toast("\u{1F947}\u{1F95F} Shiny — a GOLD"+(glitter?" GLITTER":"")+" dumpling!");
  else toast(glitter?"✨\u{1F95F} WOW — a RARE GLITTER "+color+" dumpling!!":"\u{1F95F} You got a "+color+" dumpling!");
  renderDump();saveGame();
};
/* open EVERY unopened dumpling at once — in batches of 1000 so the page
   never freezes, with one big summary at the end */
let OPENALL_BUSY=false;
$("dumpOpenAll").onclick=()=>{
  if(OPENALL_BUSY)return;
  const butter=SQTAB.v==="butter",C=butter?BUTTER:DUMP;
  const roll=butter?rollButter:rollDump,val=butter?butterValue:dumpValue;
  const many=butter?"butter squishies":"dumplings";
  if(!C.unopened){toast("No unopened "+many+" — buy them at a \u{1F6D2} MEGA MART!");return;}
  OPENALL_BUSY=true;
  const total=C.unopened;
  let opened=0,glit=0,mega=0,best=null,bestVal=-1;
  (function step(){
    let n=0;
    while(C.unopened>0&&n<1000){
      const d=roll();n++;opened++;
      if(d.glitter)glit++;
      if(d.size==="mega")mega++;
      const v=val(d);
      if(v>bestVal){bestVal=v;best=d;}
    }
    if(C.unopened>0){
      toast((butter?"\u{1F9C8}":"\u{1F95F}")+" Opening "+many+"… "+opened+" / "+total);
      setTimeout(step,0);
    }else{
      OPENALL_BUSY=false;
      toast("\u{1F389} You opened "+opened+" "+many+(glit?" ("+glit+" ✨ GLITTER!)":"")+(mega?" ("+mega+" \u{1F31F} MEGA!!)":"")
        +" — best pull: "+(best.glitter?"✨ GLITTER ":"")+(butter?butterSizeLabel(best):"")+best.color+" ($"+fmtMoney(bestVal)+")!");
      renderDump();saveGame();
    }
  })();
};
$("dumpDisplay").onclick=()=>{
  const m=nearMansion();
  if(!m){toast("\u{1F3F0} Go to your MEGA MANSION first — there's one every ~2 km (see the map)!");return;}
  if(!rentedAt(m.id)){toast("Rent this mansion first — press T at the RECEPTION inside!");return;}
  if(DISPLAYS.has(m.id)){DISPLAYS.delete(m.id);buildDumpTable(m);toast("Dumplings packed up — display removed.");renderDump();saveGame();return;}
  if(!DUMP.owned.length){toast("You have no dumplings to display — buy some at a MEGA MART!");return;}
  DISPLAYS.set(m.id,DUMP.owned.map(d=>({color:d.color,hex:d.hex,glitter:d.glitter})));
  buildDumpTable(m);
  toast("\u{1F95F} Your dumplings are on a table outside your mansion!");
  renderDump();saveGame();
};
/* ---------- money (everything is still free — it's just for bragging) ---------- */
const MONEY={v:0,rainbow:false};
/* big-number format: K, M, B, T, QA, QI, SX, SP */
function fmtMoney(v){
  if(v<0)return "-"+fmtMoney(-v);   // fines can push you into the red
  const units=[[1e24,"SP"],[1e21,"SX"],[1e18,"QI"],[1e15,"QA"],[1e12,"T"],[1e9,"B"],[1e6,"M"],[1e3,"K"]];
  for(const[m,s]of units)if(v>=m){
    const n=v/m;
    let str=n>=100?String(Math.round(n)):n>=10?n.toFixed(1):n.toFixed(2);
    str=str.replace(/\.0+$/,"").replace(/(\.\d*[1-9])0+$/,"$1");
    return str+s;
  }
  return String(v);
}
function updateMoneyUI(){
  const t="$"+fmtMoney(MONEY.v),red=MONEY.v<0;
  $("moneyTxt").textContent=t;
  $("moneyTxt").classList.toggle("rainbow",MONEY.rainbow&&!red);
  $("moneyTxt").style.color=red?"var(--bad)":"";
  $("mmVal").textContent=t;
  $("mmVal").classList.toggle("rainbow",MONEY.rainbow&&!red);
  $("mmVal").style.color=red?"var(--bad)":"";
}
/* fines ALWAYS get paid — not enough money means you go into the MINUS */
function payFine(amount,label){
  MONEY.v-=amount;
  updateMoneyUI();saveGame();profileSave();
  if(MONEY.v<0)toast("\u{1F4B8} "+label+" — you didn't have enough, so you're at $"+fmtMoney(MONEY.v)+" now. Earn it back!");
}
function addMoney(n){
  MONEY.v+=n;
  if(MONEY.v>=1000&&!MONEY.rainbow){
    MONEY.rainbow=true;
    toast("\u{1F308} $1,000! Your money text is RAINBOW forever!!");
  }
  updateMoneyUI();saveGame();profileSave();
}
$("bMoney").onclick=()=>{updateMoneyUI();renderPayList();$("moneyModal").classList.toggle("open");};
$("moneyClose").onclick=()=>$("moneyModal").classList.remove("open");
/* ---------- fuel: cars & motorcycles run dry after 699 km — fill up at ⛽ gas stations ---------- */
const FUEL={cap:699,km:699,warned:false};
function fuelVehicle(){return myVehicle&&myVehicle.type!=="bike";}
function nearGasSt(){
  for(let i=gasStations.length-1;i>=0;i--){
    const s=gasStations[i];
    if(offScene(s.g)){gasStations.splice(i,1);continue;}
    if(Math.hypot(player.x-s.x,player.z-s.z)<18)return s;
  }
  return null;
}
function updateFuel(dt,speedMS){
  if(player.drive!==myVehicle||!fuelVehicle()||S.world!=="earth")return;
  const before=FUEL.km;
  FUEL.km=Math.max(0,FUEL.km-speedMS*dt/1000);
  if(FUEL.km===0&&before>0)toast("⛽ OUT OF GAS! Your engine died — get to a gas station and press T.");
  else if(FUEL.km<50&&!FUEL.warned){FUEL.warned=true;toast("⛽ Low fuel — less than 50 km left! Find a GAS station (one every ~840 m).");}
  if(FUEL.km>50)FUEL.warned=false;
}
function tryRefuel(){
  const gs=nearGasSt();
  if(!gs||!fuelVehicle())return false;
  if(Math.hypot(player.x-myVehicle.x,player.z-myVehicle.z)>25){toast("⛽ Bring your car to the pumps first!");return true;}
  if(FUEL.km>=FUEL.cap-1){toast("⛽ Your tank is already full ("+FUEL.cap+" km)!");return true;}
  const missing=FUEL.cap-FUEL.km;
  const cost=Math.min(MONEY.v,Math.ceil(missing*0.05));
  FUEL.km=FUEL.cap;
  if(cost>0){MONEY.v-=cost;updateMoneyUI();profileSave();}
  saveGame();
  toast("⛽ Filled up +"+Math.round(missing)+" km"+(cost>0?" — paid $"+cost:" — on the house!"));
  return true;
}
/* ---------- caves: walk up to a mountain cave mouth and press T to go inside ---------- */
const CAVE={in:false,rx:0,rz:0,cx:0,cz:0,fy:-648,room:null,crystals:[]};
function nearCaveEntrance(){
  for(let i=caves.length-1;i>=0;i--){
    const c=caves[i];
    if(offScene(c.g)){caves.splice(i,1);continue;}
    if(Math.hypot(player.x-c.x,player.z-c.z)<10)return c;
  }
  return null;
}
function buildCaveRoom(){
  const g=new THREE.Group(),y=CAVE.fy,cx=CAVE.cx,cz=CAVE.cz;
  const rock=new THREE.MeshLambertMaterial({color:0x3f3a35});
  const rock2=new THREE.MeshLambertMaterial({color:0x55504a});
  const floor=new THREE.Mesh(new THREE.BoxGeometry(46,1,34),rock2);floor.position.set(cx,y-0.5,cz);g.add(floor);
  const ceil=new THREE.Mesh(new THREE.BoxGeometry(46,1,34),rock);ceil.position.set(cx,y+7.5,cz);g.add(ceil);
  [[0,-17.5,46,1],[0,17.5,46,1],[-23.5,0,1,36],[23.5,0,1,36]].forEach(p=>{
    const w=new THREE.Mesh(new THREE.BoxGeometry(p[2],9,p[3]),rock);
    w.position.set(cx+p[0],y+3.5,cz+p[1]);g.add(w);});
  /* stalagmites & stalactites */
  const sr=rng(Math.round(cx*13+cz*7));
  for(let i=0;i<14;i++){
    const sx=cx+(sr()-0.5)*38,sz2=cz+(sr()-0.5)*26;
    if(Math.hypot(sx-cx,sz2-cz)<4)continue;
    const up=sr()<0.5;
    const cone=new THREE.Mesh(new THREE.ConeGeometry(0.4+sr()*0.5,1.4+sr()*2.4,7),rock2);
    if(up)cone.position.set(sx,y+0.7,sz2);
    else{cone.rotation.x=Math.PI;cone.position.set(sx,y+6.4,sz2);}
    g.add(cone);
  }
  /* glowing crystals — walk into them to collect ($1,000 each!). Each cave
     remembers which crystals were taken; they respawn after 30 minutes. */
  CAVE.crystals=[];
  const taken=caveTaken();
  const cols=[0x7df9ff,0xb388ff,0x7cff9e];
  for(let i=0;i<3;i++){
    const a=i*2.1+0.6,d=8+i*3;
    const px=cx+Math.sin(a)*d,pz=cz+Math.cos(a)*d*0.6;
    const gone=taken[i]&&Date.now()-taken[i]<CAVE_RESPAWN;
    const cr=new THREE.Mesh(new THREE.OctahedronGeometry(0.7),new THREE.MeshBasicMaterial({color:cols[i]}));
    cr.position.set(px,y+0.9,pz);cr.visible=!gone;g.add(cr);
    const lt=new THREE.PointLight(cols[i],gone?0:0.8,14);lt.position.set(px,y+2,pz);g.add(lt);
    CAVE.crystals.push({mesh:cr,x:px,z:pz,got:gone,idx:i});
  }
  const lamp=new THREE.PointLight(0xffc38a,0.9,44);lamp.position.set(cx,y+5,cz);g.add(lamp);
  /* glowing exit mat */
  const mat=new THREE.Mesh(new THREE.PlaneGeometry(3,3),new THREE.MeshBasicMaterial({color:0x4ade80}));
  mat.rotation.x=-Math.PI/2;mat.position.set(cx,y+0.06,cz+14);g.add(mat);
  scene.add(g);
  CAVE.room=g;
}
function enterCave(c){
  if(player.drive){
    if(player.drive===myVehicle&&Math.abs(myVehicle.speed)>3){toast("Slow down before entering the cave!");return;}
    player.drive=null;
  }
  CAVE.rx=c.x;CAVE.rz=c.z+7;
  CAVE.cx=Math.round(c.x);CAVE.cz=Math.round(c.z);
  if(CAVE.room){scene.remove(CAVE.room);disposeGroup(CAVE.room);CAVE.room=null;}
  buildCaveRoom();
  CAVE.in=true;
  player.onFoot=true;player.mesh.visible=true;player.vy=0;player.grounded=true;
  player.x=CAVE.cx;player.z=CAVE.cz+10;player.y=CAVE.fy;
  toast("\u{1F573}️ You entered the cave — grab the glowing crystals! Press T to go back outside.");
}
function exitCave(silent){
  CAVE.in=false;
  if(BOSS.on)endBoss();
  if(CAVE.room){scene.remove(CAVE.room);disposeGroup(CAVE.room);CAVE.room=null;}
  player.x=CAVE.rx;player.z=CAVE.rz;
  player.y=terrainH(player.x,player.z);player.vy=0;player.grounded=true;
  if(!silent)toast("\u{1F31E} Back outside — the cave stays right here.");
}
/* which crystals of THIS cave were taken (and when) — respawn after 30 min */
const CAVE_RESPAWN=30*60*1000;
function caveKey(){return "vc4cavec:"+CAVE.cx+","+CAVE.cz;}
function caveTaken(){
  try{const d=JSON.parse(localStorage.getItem(caveKey())||"{}");return d&&typeof d==="object"?d:{};}catch(e){return{};}
}
function markCaveTaken(i){
  const d=caveTaken();d[i]=Date.now();
  try{localStorage.setItem(caveKey(),JSON.stringify(d));}catch(e){}
}
function updateCave(){
  if(!CAVE.in)return;
  for(const cr of CAVE.crystals){
    if(cr.got)continue;
    cr.mesh.rotation.y+=0.03;
    if(Math.hypot(player.x-cr.x,player.z-cr.z)<2){
      cr.got=true;cr.mesh.visible=false;
      markCaveTaken(cr.idx);
      addMoney(1000);
      toast("\u{1F48E} Crystal collected — +$1,000! (it grows back in 30 minutes)");
    }
  }
  updateBoss();
}
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
/* ================= 📻 CITY NEWS RADIO: a live AI DJ voice =================
   Reads real things happening in YOUR game: accidents, fires, weather,
   the leaderboard and breaking news — via the browser's built-in voice. */
function cleanTTS(t){return String(t).replace(/[^\x20-\x7E]/g," ").replace(/\s+/g," ").trim();}
function djSay(txt){
  if(!("speechSynthesis" in window))return;
  try{
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(txt);
    u.rate=1.05;u.pitch=1.12;u.volume=0.95;u.lang="en-US";
    speechSynthesis.speak(u);
  }catch(e){}
}
const DJ_NAMES=["DJ Nova","DJ Turbo","MC Dumpling"];
function djReport(){
  const bits=[];
  /* live traffic: real events happening right now */
  const evs=EVENTS.list.filter(e=>["accident","fire","construction","festival","meteor","rescue"].includes(e.type));
  if(evs.length){
    const e=evs[Math.floor(Math.random()*evs.length)];
    const at="near "+Math.round(e.x)+", "+Math.round(e.z);
    if(e.type==="accident")bits.push("Traffic alert! A crash "+at+". Police and ambulance are on the scene — slow down out there!");
    else if(e.type==="fire")bits.push("A house is on FIRE "+at+"! The fire truck is racing over — give it space!");
    else if(e.type==="construction")bits.push("Road works "+at+" — expect delays and drive slowly past the cones.");
    else if(e.type==="festival")bits.push("Party time! A festival is happening "+at+" — free 50 dollars for every visitor!");
    else if(e.type==="meteor")bits.push("Look at the sky! A METEOR SHOWER is coming down "+at+" — the glowing space rocks are worth big money!");
    else if(e.type==="rescue")bits.push("Emergency! Someone is stranded "+at+" and needs a hero with a car. Reward for the rescue!");
  }
  /* weather */
  if(WEATHER.state==="rain")bits.push("Weather update: it's raining — the roads are slippery, take those corners easy.");
  else if(WEATHER.state==="snow")bits.push("Weather update: SNOW on the roads! Grip is way down — drive like a pro.");
  else if(WEATHER.state==="fog")bits.push("Weather update: thick fog out there. Lights on and eyes open!");
  /* the leaderboard champion */
  if(BOARD.top&&Math.random()<0.4)bits.push("This week's tournament leader is "+cleanTTS(BOARD.top)+" — can anybody catch them?");
  /* fallback + latest news */
  const n=NEWS[NEWS.length-1];
  if(!bits.length&&n)bits.push(cleanTTS(n.t));
  if(!bits.length)bits.push("All quiet in Car City right now... perfect weather for a cruise. Stay tuned!");
  const dj=DJ_NAMES[Math.floor(Math.random()*DJ_NAMES.length)];
  djSay("You're on City News Radio with "+dj+". "+bits[Math.floor(Math.random()*bits.length)]);
}
setInterval(()=>{
  try{if(S.mode==="game"&&SND.music&&radioStation().dj&&!speechSynthesis.speaking)djReport();}catch(e){}
},22000);
/* ================= 🚗 THE CAR SCREEN =================
   In your car the round mini map becomes ONE wide rounded screen:
   the map on the left, the song list on the right — tap a song to play it. */
const CAR_TRACKS=[
  {name:"\u{1F5DE} CITY NEWS RADIO — live AI DJ",dj:true},
  {name:"\u{1F3B5} Dai Dai — Shakira & Burna Boy",src:"Music/radio/Shakira & Burna Boy - Dai Dai (Lyrics) World Cup Song 2026.mp3"},
  {name:"\u{1F3B5} Beat It — Michael Jackson",src:"Music/radio/Beat It - Michael Jackson (Lyrics).mp3"},
  {name:"\u{1F3B5} Billie Jean — Michael Jackson",src:"Music/radio/Billie Jean - Michael Jackson (Lyrics).mp3"},
  {name:"\u{1F3B5} Smooth Criminal — Michael Jackson",src:"Music/radio/Michael Jackson - Smooth Criminal [Lyrics].mp3"},
  {name:"\u{1F3B5} World Cup (Champions) — IShowSpeed",src:"Music/radio/IShowSpeed - World Cup (Champions) (Lyrics).mp3"},
  {name:"\u{1F3B5} Gut Genug — KitschKrieg & Shirin David",src:"Music/radio/KITSCHKRIEG feat. BLUMENGARTEN & SHIRIN DAVID - Gut Genug (Lyrics).mp3"},
  {name:"\u{1F3B5} Indian meme song",src:"Music/radio/Indian meme song (Original).mp3"},
  {name:"\u{1F3B5} Subway Surfers (Bass Boosted)",src:"Music/radio/Subway Surfers Bass Boosted.mp3"},
  {name:"\u{1F30A} Orbit — chill",src:"Music/orbit-d0d-main-version-29627-02-39.mp3"},
  {name:"\u{1F327} Rainy Window — chill",src:"Music/rainy-window-avbe-main-version-18796-01-21.mp3"},
  {name:"\u{1F32B} Soft Mist — chill",src:"Music/soft-mist-movement-tranquilium-main-version-25768-04-42.mp3"},
  {name:"\u{1F4F4} Radio OFF",off:true}
];
let TUNES_SEL=-1;
function musicOnUI(){
  if(!SND.music){
    SND.music=true;
    $("musTgl").classList.add("on");
    $("musTgl").innerHTML="\u{1F3B5} Music ON";
  }
}
function renderCarTunes(){
  const w=$("carTunes");
  w.innerHTML="<div class='tuneHead'>\u{1F4FB} CAR RADIO</div>";
  /* your OWN station shows first — so you can SEE that you're on air */
  if(MYRADIO.on){
    const b=document.createElement("button");
    b.className="tune on";
    b.textContent="\u{1F534} "+MYRADIO.name+" — YOU are ON AIR!";
    b.onclick=()=>toast("\u{1F534} That's YOUR station — everyone else can tune in. Talk away!");
    w.appendChild(b);
  }
  /* 🔴 live player radios on top — like "Notch's radio" */
  for(const[k,r]of LIVERADIOS){
    if(Date.now()-r.ts>120000){LIVERADIOS.delete(k);continue;}
    if(payKey(r.owner||"")===payKey(mpName()))continue;   // your own station is drawn above
    const b=document.createElement("button");
    b.className="tune"+(LISTEN.key===k?" on":"");
    b.textContent="\u{1F534} "+r.name+" — LIVE";
    b.onclick=()=>tuneLiveRadio(k);
    w.appendChild(b);
  }
  CAR_TRACKS.forEach((t,i)=>{
    const b=document.createElement("button");
    b.className="tune"+(i===TUNES_SEL&&!LISTEN.key?" on":"");
    b.textContent=t.name;
    b.onclick=()=>{
      TUNES_SEL=i;LISTEN.key=null;
      if(t.off){setStation(0);toast("\u{1F4F4} Radio off.");}
      else if(t.dj){
        musicOnUI();ensureAudio();
        setStation(RADIO_STATIONS.findIndex(s=>s.dj));
        djSay("You are listening to City News Radio — live traffic, live news, live everything! Stay tuned.");
        toast("\u{1F5DE} CITY NEWS RADIO — the DJ is live!");
      }else{
        musicOnUI();ensureAudio();
        playTrackFile(t.src);
        toast("\u{1F3B6} Now playing: "+t.name.replace(/^\S+\s/,""));
      }
      renderCarTunes();
    };
    w.appendChild(b);
  });
}
/* the mini map morphs into the car screen whenever you sit in YOUR vehicle */
let _carScreenOn=false,_tunesT=0;
setInterval(()=>{
  const inCar=S.mode==="game"&&!!myVehicle&&player.drive===myVehicle;
  if(inCar!==_carScreenOn){
    _carScreenOn=inCar;
    $("miniWrap").classList.toggle("car",inCar);
    if(inCar){renderCarTunes();_tunesT=Date.now();}
  }else if(inCar&&(LIVERADIOS.size||MYRADIO.on)&&Date.now()-_tunesT>5000){
    /* live stations come & go — keep the list fresh */
    renderCarTunes();_tunesT=Date.now();
  }
},350);
/* ================= 🎤 THE MICROPHONE: one shared speech listener ================= */
/* tiny version badge — so we can always SEE which game version is running */
const GAMEVER=63;
const verBadge=document.createElement("div");
verBadge.style.cssText="position:fixed;right:6px;bottom:4px;z-index:60;font:600 10px 'Segoe UI',sans-serif;color:#7d8aa5;opacity:.6;pointer-events:none";
verBadge.textContent="v"+GAMEVER;
document.body.appendChild(verBadge);
/* live caption bar: shows EVERYTHING the mic hears, while it hears it */
const micCap=document.createElement("div");
micCap.style.cssText="position:fixed;left:50%;bottom:96px;transform:translateX(-50%);background:rgba(13,17,26,.9);color:#3fd0ff;font:600 15px 'Segoe UI',sans-serif;padding:7px 14px;border-radius:12px;z-index:99;display:none;max-width:80vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none";
document.body.appendChild(micCap);
let micCapT=0;
function micCaption(t){
  micCap.textContent="\u{1F3A4} "+t;
  micCap.style.display="block";
  clearTimeout(micCapT);
  micCapT=setTimeout(()=>{micCap.style.display="none";},3500);
}
const MIC={rec:null,mode:null};
function micSupported(){return !!(window.SpeechRecognition||window.webkitSpeechRecognition);}
function micStop(){
  const r=MIC.rec;
  MIC.rec=null;MIC.mode=null;
  if(r){try{r.onend=null;r.stop();}catch(e){}}
  micUI();
}
function micStart(mode,onResult){
  if(!micSupported()){toast("\u{1F3A4} This browser has no speech support — use Chrome (or Edge)!");return false;}
  micStop();
  const R=window.SpeechRecognition||window.webkitSpeechRecognition;
  const rec=new R();
  /* the assistant listens for ENGLISH commands; your radio speaks YOUR language */
  rec.lang=mode==="assistant"?"en-US":(navigator.language||"en-US");
  rec.continuous=true;rec.interimResults=true;
  rec.onresult=e=>{
    for(let i=e.resultIndex;i<e.results.length;i++){
      const txt=e.results[i][0].transcript.trim();
      if(txt)micCaption(txt);            // LIVE captions — you see what it hears
      if(e.results[i].isFinal)onResult(txt);
    }
  };
  rec.onstart=()=>micCaption(mode==="assistant"?'Listening... say "HEY GOOGLE"!':"ON AIR — everything you say goes out live!");
  rec.onerror=e=>{
    if(e.error==="not-allowed"||e.error==="service-not-allowed"){
      toast("\u{1F3A4}\u{1F6AB} Microphone BLOCKED — click the \u{1F512} next to the address bar, allow the Microphone, then try again!");
      if(MYRADIO.on)stopMyRadio();else micStop();
    }else if(e.error==="audio-capture"){
      toast("\u{1F3A4}\u{274C} No microphone found — plug one in (or check Windows sound settings)!");
      if(MYRADIO.on)stopMyRadio();else micStop();
    }else if(e.error==="network"){
      toast("\u{1F3A4}\u{26A0} The speech service can't be reached — speech only works in Chrome/Edge with internet.");
    }else if(e.error!=="no-speech"&&e.error!=="aborted"){
      /* anything unexpected: SHOW it instead of failing silently */
      toast("\u{1F3A4}\u{26A0} Microphone problem: \""+e.error+"\"");
    }
    /* "no-speech" and "aborted" are normal — the mic just restarts */
  };
  rec.onend=()=>{if(MIC.rec===rec){try{rec.start();}catch(e){}}};   // keep listening
  try{rec.start();}catch(e){toast("\u{1F3A4} Couldn't start the microphone!");return false;}
  MIC.rec=rec;MIC.mode=mode;
  micUI();
  return true;
}
function micUI(){
  $("bGoogle").classList.toggle("on",MIC.mode==="assistant");
  $("bGoogle").innerHTML=MIC.mode==="assistant"?"\u{1F3A4} Google AI \u{1F534}":"\u{1F3A4} Google AI";
  $("bMyRadio").classList.toggle("on",MIC.mode==="radio");
  $("bMyRadio").innerHTML=MIC.mode==="radio"?"\u{1F534} Stop Radio":"\u{1F4FB} Create Radio";
}
/* ================= 🎤 GOOGLE AI: say "Hey Google, ..." ================= */
const GA={awake:0};
function gSay(txt){
  if(!("speechSynthesis" in window))return;
  try{
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(txt);
    u.rate=1.05;u.pitch=1.0;u.volume=1;u.lang="en-US";
    speechSynthesis.speak(u);
  }catch(e){}
}
/* where can the assistant take you? every big place in the game */
function resolveDest(s){
  s=" "+s.toLowerCase().replace(/[^a-z0-9 ,.-]/g,"").trim()+" ";
  const c=s.match(/(-?\d+)[,\s]+(-?\d+)/);
  if(c)return{x:parseFloat(c[1]),z:parseFloat(c[2]),say:"coordinates "+c[1]+", "+c[2]};
  const un=b=>b?{x:b.sp.x,z:b.sp.z}:null;
  const T=[
    [["airport","airfield","plane"],()=>{const a=nearestAirports(player.x,player.z,1)[0];return{x:a.term.x,z:a.term.z};},"the nearest airport"],
    [["gas station","gas","fuel"],()=>un(nearestSpot(gasSpot,GSP,286,150,5)),"the nearest gas station"],
    [["mcdrive","mcdonald","burger"],()=>un(nearestSpot(mcdSpot,MCSP,46,90,6)),"the nearest McDrive"],
    [["mega mart","megamart","market","shop","store"],()=>un(nearestSpot(hugeShopSpot,HSP,750,390,3)),"the nearest MEGA MART"],
    [["mansion"],()=>un(nearestSpot(mansionSpot,MSP,1230,870,3)),"the nearest mega mansion"],
    [["beach","boat","sea"],()=>un(nearestSpot(boatSpot,BOATSP,320,120,8)),"the beach"],
    [["cinema","movie"],()=>un(nearestSpot((i,j)=>{const p=entPos(i,j);return{x:p.x-24,z:p.z};},ENSP,2000,4200,3)),"the nearest cinema"],
    [["arcade"],()=>un(nearestSpot(entPos,ENSP,2000,4200,3)),"the nearest arcade"],
    [["casino"],()=>un(nearestSpot((i,j)=>{const p=entPos(i,j);return{x:p.x+24,z:p.z};},ENSP,2000,4200,3)),"the nearest casino"],
    [["race track","racetrack","speedway"],()=>{const b=nearestSpot(raceTrackPos,RTSP,4800,3400,2);return b?{x:b.sp.x+38,z:b.sp.z+6}:null;},"the nearest race track"],
    [["police"],()=>{const b=nearestSpot(civicPos,CVSP2,3700,1300,3);return b?{x:b.sp.x-14,z:b.sp.z}:null;},"the nearest police station"],
    [["fire station","fire"],()=>{const b=nearestSpot(civicPos,CVSP2,3700,1300,3);return b?{x:b.sp.x+14,z:b.sp.z}:null;},"the nearest fire station"],
    [["off-road","offroad","off road","dirt"],()=>un(nearestSpot(offroadPos,ORSP,900,2600,3)),"the off-road park"],
    [["industrial","factory"],()=>un(nearestSpot(induPos,INSP,5200,700,2)),"the industrial zone"],
    [["portal","time"],()=>un(nearestSpot(portalPos,TPSP,30,2430,2)),"the time portal"],
    [["cave"],()=>un(nearestSpot(caveSpot,CVSP,740,380,5)),"the nearest cave"],
    [["rocket","space"],()=>nearestRocketPad(player.x,player.z),"the nearest rocket station"],
    [["stunt"],()=>un(nearestSpot(stuntPos,3600,1800,600,2)),"the stunt park"],
    [["museum"],()=>un(nearestSpot(museumSpot,DMUS,520,260,6)),"the dumpling museum"],
    [["pool","swimming"],()=>un(nearestSpot(poolSpot,PPSP,1710,430,3)),"the pool park"],
    [["volcano"],()=>un(nearestSpot(volcanoSpot,VOLC,4200,7800,3)),"the volcano island"],
    [["train station","station"],()=>{const st=nearStationInfo();return st?{x:st.cx+7,z:st.sz}:{x:railC(0,50)+7,z:50};},"the train station"],
    [["spawn","home"],()=>({x:WORLD.ox+6,z:WORLD.oz+6}),"spawn"]
  ];
  for(const[keys,fn,say]of T){
    if(keys.some(k=>s.includes(k))){
      let p=null;try{p=fn();}catch(e){}
      if(p)return{x:p.x,z:p.z,say};
      return null;
    }
  }
  return null;
}
function playByName(q){
  q=q.toLowerCase().replace(/\bthe\b/g,"").trim();
  /* live player radios first ("play notch's radio") */
  for(const[k,r]of LIVERADIOS){
    if(r.name.toLowerCase().includes(q.replace(/ radio$/,""))||q.includes(r.name.toLowerCase())){
      tuneLiveRadio(k);gSay("Tuned to "+r.name+".");return;
    }
  }
  const t=CAR_TRACKS.find(t=>!t.off&&t.name.toLowerCase().replace(/[^a-z0-9 ]/g,"").includes(q.replace(/[^a-z0-9 ]/g,"")));
  if(!t){gSay("Sorry, that is not possible.");return;}
  TUNES_SEL=CAR_TRACKS.indexOf(t);LISTEN.key=null;
  if(t.dj){
    musicOnUI();ensureAudio();
    setStation(RADIO_STATIONS.findIndex(s=>s.dj));
    gSay("Playing City News Radio.");
    setTimeout(djReport,2500);
  }else{
    musicOnUI();ensureAudio();
    playTrackFile(t.src);
    gSay("Playing "+t.name.replace(/^\S+\s/,"").split("—")[0]+".");
  }
  if(_carScreenOn)renderCarTunes();
}
function gaCommand(cmd){
  let m=cmd.match(/^(?:please )?(?:navigate|route|drive|go|bring me|take me) (?:me )?to (.+)$/);
  if(m){
    const d=resolveDest(m[1]);
    if(d){setRoute(d.x,d.z);gSay("Navigating to "+d.say+".");toast("\u{1F9ED} Google: navigating to "+d.say+"!");}
    else gSay("Sorry, that is not possible.");
    return;
  }
  m=cmd.match(/^teleport (?:me )?to (.+)$/);
  if(m){
    const d=resolveDest(m[1]);
    if(d){teleportTo(d.x,d.z);gSay("Teleported to "+d.say+".");toast("✨ Google: teleported to "+d.say+"!");}
    else gSay("Sorry, that is not possible.");
    return;
  }
  m=cmd.match(/^play (.+)$/);
  if(m){playByName(m[1]);return;}
  if(/^(stop|radio off|stop (the )?(music|radio|song))/.test(cmd)){
    setStation(0);LISTEN.key=null;
    if(_carScreenOn)renderCarTunes();
    gSay("Radio off.");
    return;
  }
  gSay("Sorry, that is not possible.");
}
function gaHear(raw){
  const t=raw.toLowerCase();
  /* forgiving wake word: any "google"-ish sound counts ("hey google",
     "he google", "a googol", ... — accents & mishearings welcome!) */
  const woke=/goo?gle|googol|googly|koogle|cugle/.test(t);
  let cmd=woke?t.replace(/.*?(goo?gle|googol|googly|koogle|cugle)[,!.?]?\s*/,"").trim():t.trim();
  if(!woke&&performance.now()>GA.awake){
    /* the mic DID hear you — show it, so it never feels broken */
    if(performance.now()-(GA.hintAt||0)>4000){
      GA.hintAt=performance.now();
      toast("\u{1F3A4} I heard: \""+raw.slice(0,60)+"\" — start with \"HEY GOOGLE\"!");
    }
    return;
  }
  if(!cmd||cmd.length<3){
    GA.awake=performance.now()+9000;
    gSay("Yes?");
    toast("\u{1F3A4} Google: \"Yes?\" — say: NAVIGATE TO ..., TELEPORT TO ..., or PLAY <song>");
    return;
  }
  GA.awake=0;
  toast("\u{1F3A4} You said: \""+cmd+"\"");
  gaCommand(cmd);
}
$("bGoogle").onclick=()=>{
  if(MIC.mode==="assistant"){micStop();toast("\u{1F3A4} Google AI is OFF.");return;}
  if(micStart("assistant",gaHear))
    toast("\u{1F3A4} Google AI is LISTENING! Say: \"Hey Google\" ... then \"navigate to the nearest airport\", \"teleport to 1200, 300\" or \"play Billie Jean\"!");
};
/* ================= 🔴 CREATE RADIO: your own live voice station =================
   Your speech is turned into text, broadcast over the shared chat channel
   (auto-deletes after 5 min), and read aloud on every listener's car radio. */
const MYRADIO={on:false,name:"",key:""};
const LIVERADIOS=new Map();   // key -> {name, owner, ts}
const LISTEN={key:null};
function radioPacket(text){
  try{
    const p=firebase.database().ref("chat").push({
      n:mpName(),
      m:("\u{1F4FB}|"+MYRADIO.key+"|"+MYRADIO.name+"|"+(text||"~")).slice(0,200),
      t:Date.now()
    });
    /* if the database says NO, show it — never fail silently */
    if(p&&p.catch)p.catch(e=>toast("\u{1F534}\u{26A0} Radio couldn't broadcast: "+(e&&e.message||e)));
  }catch(e){toast("\u{1F534}\u{26A0} Radio couldn't broadcast: "+(e&&e.message||e));}
}
function stopMyRadio(){
  MYRADIO.on=false;
  micStop();
  toast("\u{1F4FB} Your radio is off the air. Thanks for the show!");
}
$("bMyRadio").onclick=()=>{
  if(MYRADIO.on||MIC.mode==="radio"){stopMyRadio();return;}
  if(S.mode!=="game"){toast("Start driving first!");return;}
  if(!mpInit()){toast("\u{1F534} Your radio needs the online database.");return;}
  const nm=cleanServerName(prompt("\u{1F4FB} Name your radio station!",mpName()+"'s radio")||"").slice(0,18);
  if(!nm)return;
  MYRADIO.name=nm;MYRADIO.key=payKey(mpName());
  if(!micStart("radio",txt=>{
    if(!txt||!MYRADIO.on)return;
    radioPacket(txt);
    /* live feedback so you SEE that your voice went out */
    toast("\u{1F534}\u{1F4E1} ON AIR: \""+txt.slice(0,90)+"\"");
  }))return;
  MYRADIO.on=true;
  micUI();
  chatStart();
  radioPacket("");
  pushNews("\u{1F4FB}\u{1F534} \""+nm+"\" is ON AIR — tune in on your car radio!");
  toast("\u{1F534} ON AIR! Everything you SAY goes out live on \""+nm+"\" — press the button again to stop.");
};
/* stay discoverable while on air */
setInterval(()=>{if(MYRADIO.on)radioPacket("");},45000);
function handleRadioPacket(d){
  const parts=(d.m||"").split("|");
  if(parts.length<4)return;
  const rkey=parts[1],rname=parts[2],text=parts.slice(3).join("|");
  if(!rkey||!rname)return;
  if((Date.now()-(d.t||0))>120000)return;
  /* a brand-new station? tell this player about it (news is local, so
     the announcement has to happen HERE, on the listener's side) */
  const isNew=!LIVERADIOS.has(rkey);
  const mine=payKey(d.n||"")===payKey(mpName());
  LIVERADIOS.set(rkey,{name:rname,owner:d.n||"",ts:Date.now()});
  if(isNew&&!mine&&S.mode==="game"){
    toast("\u{1F4FB}\u{1F534} \""+rname+"\" by "+(d.n||"a player")+" is ON AIR — hop in your car and tap it in the song list!");
    NEWS.push({t:"\u{1F4FB}\u{1F534} \""+rname+"\" by "+(d.n||"a player")+" is ON AIR — tune in on your car radio!",ts:Date.now()});
    if(NEWS.length>12)NEWS.shift();
  }
  /* tuned in? the radio voice reads it out (never your own echo) */
  /* the live voice only plays while you're actually sitting in your car */
  if(LISTEN.key===rkey&&text&&text!=="~"&&!mine&&SND.music&&S.mode==="game"&&_carScreenOn){
    try{
      const u=new SpeechSynthesisUtterance(text);
      u.rate=1.02;u.pitch=1.0;u.volume=1;
      u.lang=navigator.language||"en-US";   // read it out in YOUR language's voice
      speechSynthesis.speak(u);
    }catch(e){}
  }
  if(_carScreenOn)renderCarTunes();
}
function tuneLiveRadio(k){
  const r=LIVERADIOS.get(k);
  if(!r)return;
  LISTEN.key=k;TUNES_SEL=-1;
  setStation(0);           // pause the music — the live voice takes over
  musicOnUI();
  chatStart();
  toast("\u{1F534}\u{1F4FB} Tuned in to \""+r.name+"\" by "+r.owner+" — you'll hear everything they say!");
  if(_carScreenOn)renderCarTunes();
}
/* ================= ⛪ THE CHURCH ORGAN: real Bach from the Midi/ folder =================
   Every game SUNDAY the organ plays, all game day long. The music position
   follows the shared game clock, so players near the church hear the SAME spot. */
function parseMidi(buf){
  const d=new DataView(buf);let p=0;
  const u8=()=>d.getUint8(p++);
  const u16=()=>{const v=d.getUint16(p);p+=2;return v;};
  const u32=()=>{const v=d.getUint32(p);p+=4;return v;};
  const tag=()=>String.fromCharCode(u8(),u8(),u8(),u8());
  if(tag()!=="MThd")return null;
  const hl=u32();u16();const ntr=u16(),div=u16();p+=hl-6;
  if(div&0x8000)return null;   // SMPTE timing — not used by these files
  const tempos=[],raw=[];
  for(let t=0;t<ntr;t++){
    if(tag()!=="MTrk")return null;
    const len=u32(),end=p+len;let tick=0,run=0;
    while(p<end){
      let dt=0,b;do{b=u8();dt=(dt<<7)|(b&127);}while(b&128);
      tick+=dt;
      let st=d.getUint8(p);
      if(st&128){p++;run=st;}else st=run;
      if(st===0xff){
        const ty=u8();let ln=0;do{b=u8();ln=(ln<<7)|(b&127);}while(b&128);
        if(ty===0x51&&ln>=3)tempos.push({tick,us:(d.getUint8(p)<<16)|(d.getUint8(p+1)<<8)|d.getUint8(p+2)});
        p+=ln;
      }else if(st===0xf0||st===0xf7){
        let ln=0;do{b=u8();ln=(ln<<7)|(b&127);}while(b&128);p+=ln;
      }else{
        const hi=st&0xf0;
        if(hi===0xc0||hi===0xd0)u8();
        else{
          const a=u8(),v=u8();
          if(hi===0x90)raw.push({tick,n:a,v});
          else if(hi===0x80)raw.push({tick,n:a,v:0});
        }
      }
    }
    p=end;
  }
  tempos.sort((a,b)=>a.tick-b.tick);
  raw.sort((a,b)=>a.tick-b.tick||b.v-a.v);
  const t2s=tk=>{
    let sec=0,lt=0,us=500000;
    for(let i=0;i<tempos.length&&tempos[i].tick<=tk;i++){sec+=(tempos[i].tick-lt)*us/1e6/div;lt=tempos[i].tick;us=tempos[i].us;}
    return sec+(tk-lt)*us/1e6/div;
  };
  const notes=[],onMap={};
  for(const e of raw){
    if(e.v>0)(onMap[e.n]=onMap[e.n]||[]).push(e);
    else{
      const st=(onMap[e.n]||[]).shift();
      if(st){const t0=t2s(st.tick),t1=t2s(e.tick);if(t1>t0)notes.push({t:t0,d:t1-t0,n:e.n,v:st.v});}
    }
  }
  notes.sort((a,b)=>a.t-b.t);
  let dur=0;for(const n of notes)dur=Math.max(dur,n.t+n.d);
  return notes.length?{notes,dur:dur+2}:null;
}
const ORGAN={files:["Prelude1","Fugue1","Prelude2","Fugue2","Prelude3","Fugue3"],
  pieces:null,loading:false,total:0,gain:null,on:false,anchorC:0,anchorP:0,schedTo:0};
function organLoad(){
  if(ORGAN.loading)return;
  ORGAN.loading=true;
  Promise.all(ORGAN.files.map(f=>fetch("Midi/"+f+".mid").then(r=>r.arrayBuffer()).then(parseMidi).catch(()=>null)))
    .then(ps=>{
      ORGAN.pieces=ps.filter(Boolean);
      ORGAN.total=ORGAN.pieces.reduce((s,q)=>s+q.dur+4,0);
      if(!ORGAN.pieces.length){ORGAN.pieces=null;ORGAN.loading=false;}   // retry later
    }).catch(()=>{ORGAN.loading=false;});
}
/* one organ note: layered sine partials = churchy pipe sound */
function organNote(when,dur,midi,vel){
  const now=audioCtx.currentTime;
  if(when<now-0.05)return;
  when=Math.max(when,now+0.01);
  const f=440*Math.pow(2,(midi-69)/12);
  const g=audioCtx.createGain();
  const amp=0.035+vel/127*0.045;
  const relStart=when+Math.max(0.07,dur-0.02);
  g.gain.setValueAtTime(0,when);
  g.gain.linearRampToValueAtTime(amp,when+0.05);
  g.gain.setValueAtTime(amp,relStart);
  g.gain.linearRampToValueAtTime(0,relStart+0.14);
  g.connect(ORGAN.gain);
  [[1,1],[2,0.45],[3,0.22],[4,0.1]].forEach(([m,a])=>{
    if(f*m>5500)return;
    const o=audioCtx.createOscillator();
    o.type="sine";o.frequency.value=f*m;
    const og=audioCtx.createGain();og.gain.value=a;
    o.connect(og);og.connect(g);
    o.start(when);o.stop(relStart+0.16);
  });
}
function organSchedule(from,to,base){
  let off=0;
  for(const q of ORGAN.pieces){
    if(to>off&&from<off+q.dur)
      for(const n of q.notes)
        if(n.t>=from-off&&n.t<to-off)organNote(base+off+n.t,Math.min(n.d,8),n.n,n.v);
    off+=q.dur+4;
  }
  if(to>ORGAN.total&&from<=ORGAN.total)organSchedule(0,to-ORGAN.total,base+ORGAN.total);
}
function organTick(){
  const d=Math.hypot(player.x-CHURCH.x,player.z-CHURCH.z);
  const sunday=weekday()==="Sunday";
  /* SUNDAY: the organ fills the whole square, all game day.
     Other days: the organist practices — you hear it when you step INSIDE. */
  const want=S.mode==="game"&&S.world==="earth"&&SND.sound&&(sunday?d<180:d<11);
  if(!want){
    if(ORGAN.on){ORGAN.on=false;if(ORGAN.gain)ORGAN.gain.gain.setTargetAtTime(0,audioCtx?audioCtx.currentTime:0,0.15);}
    return;
  }
  if(!ORGAN.pieces){organLoad();return;}
  ensureAudio();
  if(!audioCtx)return;
  try{if(audioCtx.state==="suspended")audioCtx.resume();}catch(e){}
  if(!ORGAN.gain){ORGAN.gain=audioCtx.createGain();ORGAN.gain.gain.value=0;ORGAN.gain.connect(audioCtx.destination);}
  ORGAN.gain.gain.setTargetAtTime(sunday?Math.max(0,1-d/180)*0.6:0.32,audioCtx.currentTime,0.25);
  if(sunday&&ORGAN.toastDay!==CLOCK.day&&d<130){
    ORGAN.toastDay=CLOCK.day;
    toast("⛪\u{1F3B6} It's SUNDAY — the church organ plays all day long!");
  }
  /* a different piece opens the service each week; position follows the game clock */
  const week=Math.floor((CLOCK.day-1)/7)%ORGAN.pieces.length;
  let base=0;for(let i=0;i<week;i++)base+=ORGAN.pieces[i].dur+4;
  const pos=(base+CLOCK.min/5)%ORGAN.total;   // 1 real second per playlist second
  const now=audioCtx.currentTime;
  const playPos=ORGAN.anchorP+(now-ORGAN.anchorC);
  if(!ORGAN.on||Math.abs(playPos-pos)>1.5){   // (re)start or resync after a time jump
    ORGAN.on=true;ORGAN.anchorC=now;ORGAN.anchorP=pos;ORGAN.schedTo=pos;
  }
  const cur=ORGAN.anchorP+(now-ORGAN.anchorC);
  const horizon=cur+1.6;
  if(ORGAN.schedTo<horizon){
    organSchedule(ORGAN.schedTo,horizon,now-cur);
    ORGAN.schedTo=horizon;
  }
}
/* ================= 🏆 SATURDAY CAR MEET at the church square =================
   Every game Saturday: park your coolest car on the pad, walk to a friend's
   car and press T to vote 🔥. When Saturday ends the winner gets $500 and a
   golden crown above their car all Sunday. Votes ride the chat channel. */
const MEET={votes:new Map(),voters:new Set(),voteDay:0,lastDay:0,announcedDay:0,
  glowDay:parseInt(localStorage.getItem("vc4meetglow")||"0",10)||0,glowSpr:null};
function meetActive(){return weekday()==="Saturday"&&S.world==="earth"&&S.mode==="game";}
function meetDist(){return Math.hypot(player.x-CHURCH.meetX,player.z-CHURCH.meetZ);}
function tryMeetVote(){
  if(MEET.voteDay===CLOCK.day){toast("\u{1F5F3} You already voted today — one vote per Saturday!");return true;}
  let best=null;
  for(const o of MP.others.values()){
    if(o.kind==="foot"||o.kind==="seat")continue;
    if(Math.hypot(o.x-CHURCH.meetX,o.z-CHURCH.meetZ)>30)continue;   // car must be AT the meet
    const dd=Math.hypot(o.x-player.x,o.z-player.z);
    if(dd<8&&(!best||dd<best.dd))best={o,dd};
  }
  if(!best)return false;
  MEET.voteDay=CLOCK.day;
  chatStart();
  try{
    const pr=firebase.database().ref("chat").push({n:mpName(),m:"\u{1F3C6}|"+best.o.name,t:Date.now()});
    if(pr&&pr.catch)pr.catch(()=>{});
  }catch(e){}
  toast("\u{1F525} You voted for "+best.o.name+"'s car! The winner is crowned when Saturday ends.");
  return true;
}
function handleMeetVote(d){
  const target=(d.m||"").split("|")[1];
  if(!target||weekday()!=="Saturday")return;
  if(payKey(d.n||"")===payKey(target))return;   // no voting for yourself
  if(MEET.voters.has(payKey(d.n||"")))return;   // one vote per player
  MEET.voters.add(payKey(d.n||""));
  MEET.votes.set(target,(MEET.votes.get(target)||0)+1);
  if(payKey(target)===payKey(mpName())&&S.mode==="game")
    toast("\u{1F525}\u{1F3C6} "+d.n+" voted for YOUR car! ("+MEET.votes.get(target)+" vote"+(MEET.votes.get(target)>1?"s":"")+")");
}
function meetTick(){
  /* the day flipped? crown yesterday's winner */
  if(MEET.lastDay&&CLOCK.day!==MEET.lastDay){
    const wasSat=(((MEET.lastDay-1)%7)+7)%7===5;
    if(wasSat&&MEET.votes.size){
      let win=null;
      for(const[n,v]of MEET.votes)if(!win||v>win.v)win={n,v};
      pushNews("\u{1F3C6} "+win.n+" WON the Saturday Car Meet with "+win.v+" vote"+(win.v>1?"s":"")+"!");
      if(payKey(win.n)===payKey(mpName())){
        addMoney(500);
        MEET.glowDay=CLOCK.day;
        try{localStorage.setItem("vc4meetglow",""+CLOCK.day);}catch(e){}
        toast("\u{1F3C6}\u{1F451} YOUR car won the SATURDAY CAR MEET — $500 and a golden crown all Sunday!");
        saveGame();
      }
    }
    MEET.votes.clear();MEET.voters.clear();
  }
  MEET.lastDay=CLOCK.day;
  /* tell everyone when Saturday starts */
  if(meetActive()&&MEET.announcedDay!==CLOCK.day){
    MEET.announcedDay=CLOCK.day;
    pushNews("\u{1F3C6} It's SATURDAY — CAR MEET at the ⛪ church square (428, 330)! Park your coolest car & vote \u{1F525}");
  }
  /* the winner's golden crown above their car */
  const want=MEET.glowDay===CLOCK.day&&!!myVehicle&&S.mode==="game"&&S.world==="earth";
  if(want&&!MEET.glowSpr){
    const cv=document.createElement("canvas");cv.width=128;cv.height=128;
    const c=cv.getContext("2d");c.font="100px serif";c.textAlign="center";c.fillText("\u{1F451}",64,100);
    MEET.glowSpr=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthTest:false}));
    MEET.glowSpr.scale.set(2.4,2.4,1);MEET.glowSpr.position.y=3.4;
    myVehicle.mesh.add(MEET.glowSpr);
  }else if(!want&&MEET.glowSpr){
    if(MEET.glowSpr.parent)MEET.glowSpr.parent.remove(MEET.glowSpr);
    try{MEET.glowSpr.material.map.dispose();MEET.glowSpr.material.dispose();}catch(e){}
    MEET.glowSpr=null;
  }else if(want&&MEET.glowSpr&&MEET.glowSpr.parent!==myVehicle.mesh){
    myVehicle.mesh.add(MEET.glowSpr);   // you picked a new car — the crown moves along
  }
}
setInterval(()=>{try{meetTick();organTick();}catch(e){}},400);
/* every story stays available for 5 REAL minutes */
function pruneNews(){
  const now=Date.now();
  for(let i=NEWS.length-1;i>=0;i--)if(now-NEWS[i].ts>300000)NEWS.splice(i,1);
}
const newsCv=document.createElement("canvas");newsCv.width=256;newsCv.height=136;
const newsTex=new THREE.CanvasTexture(newsCv);
const newsMat=new THREE.MeshBasicMaterial({map:newsTex});
KEEP.add(newsMat);KEEP.add(newsTex);
/* ================= THE TV: real channels! ================= */
const TVS=[];   // every placed TV
const TV3MM=[
  "100% Lossless Simple Kelp Farm! [3MM] - Tainro (720p).mp4",
  "How to Build a Starter House in Minecraft [3MM] - Tainro (720p).mp4",
  "How to Build a Water Elevator in Minecraft! [3MM] - Tainro (720p).mp4",
  "How to Use a Conduit in Minecraft! [3MM] - Tainro (720p).mp4",
  "How to Use a Lectern in Minecraft! [3MM] - Tainro (720p).mp4",
  "Let's Grow Some Food! [3MM] - Tainro (720p).mp4",
  "Minecraft Super Simple Item Sorter! [3MM] - Tainro (720p).mp4",
  "Simple Cobblestone Generator! [3MM] - Tainro (720p).mp4"
];
const TV={channel:"news",idx:0,videoEl:null,videoTex:null};
function tvVideoName(i){return TV3MM[i].replace(" [3MM] - Tainro (720p).mp4","");}
function ensureTvVideo(){
  if(TV.videoEl)return;
  const v=document.createElement("video");
  v.playsInline=true;v.setAttribute("playsinline","");
  v.addEventListener("ended",()=>{
    TV.idx=(TV.idx+1)%TV3MM.length;   // when a video ends, the next one plays
    playTvVideo();
    toast("\u{1F4FA} Next up: "+tvVideoName(TV.idx));
  });
  TV.videoEl=v;
  TV.videoTex=new THREE.VideoTexture(v);
  KEEP.add(TV.videoTex);
}
function playTvVideo(){
  ensureTvVideo();
  TV.videoEl.src="Videos/3MM/"+encodeURIComponent(TV3MM[TV.idx]);
  TV.videoEl.play().catch(()=>{});
}
function setTvChannel(ch){
  TV.channel=ch;
  if(ch!=="3mm"&&TV.videoEl)TV.videoEl.pause();
  if(ch==="3mm"){ensureTvVideo();newsMat.map=TV.videoTex;newsMat.color.set(0xffffff);playTvVideo();}
  else if(ch==="off"){newsMat.map=null;newsMat.color.set(0x05070a);}
  else{newsMat.map=newsTex;newsMat.color.set(0xffffff);}
  if(ch==="soccer"&&SOC.idx<0)startSoccer(0);
  newsMat.needsUpdate=true;
}
function nearTv(){
  for(let i=TVS.length-1;i>=0;i--){
    const t=TVS[i];
    if(offScene(t.g)){TVS.splice(i,1);continue;}
    if(Math.abs(player.y-t.y)<3&&Math.hypot(player.x-t.x,player.z-t.z)<3.2)return t;
  }
  return null;
}
function openNewsMenu(){
  pruneNews();
  const opts=[{label:"\u{1F4E1} LIVE — always show the NEWEST story",value:"auto"}];
  NEWS.slice().reverse().slice(0,8).forEach(n=>{
    opts.push({label:"\u{1F4F0} "+n.t.slice(0,48)+(n.t.length>48?"…":""),value:n});
  });
  opts.push({label:"❌ Cancel",value:"cancel"});
  showDest("\u{1F4F0} CITY NEWS — pick a story (each stays 5 minutes)",opts,v=>{
    if(v==="cancel")return;
    TV.newsPick=v==="auto"?null:v;
    setTvChannel("news");
    toast(v==="auto"?"\u{1F4F0} LIVE mode — the newest story is always on screen!":"\u{1F4F0} That story stays on screen while it's fresh (5 min)!");
  });
}
function openTvMenu(){
  showDest("\u{1F4FA} TV — pick a channel",[
    {label:"⛏ Channel 1 — 3 Minute Minecraft (3MM)",value:"3mm"},
    {label:"\u{1F4F0} Channel 2 — CITY NEWS (pick a story!)",value:"news"},
    {label:"⚽ Channel 3 — WORLD CUP soccer (7 matches!)",value:"soccer"},
    {label:"\u{1F525} Channel 4 — The Cozy Fireplace",value:"fire"},
    {label:"\u{1F420} Channel 5 — The Aquarium",value:"aqua"},
    {label:"⏻ Turn the TV OFF",value:"off"},
    {label:"❌ Cancel",value:"cancel"}
  ],v=>{
    if(v==="cancel")return;
    if(v==="3mm"){
      const opts=TV3MM.map((f,i)=>({label:"▶ "+tvVideoName(i),value:i}));
      opts.push({label:"❌ Cancel",value:"cancel"});
      showDest("⛏ 3 Minute Minecraft — pick a video",opts,vi=>{
        if(vi==="cancel")return;
        TV.idx=vi;
        setTvChannel("3mm");
        toast("\u{1F4FA}⛏ Now playing: "+tvVideoName(vi)+" — when it ends, the next video starts!");
      });
      return;
    }
    if(v==="news"){openNewsMenu();return;}
    if(v==="soccer"){
      const opts=WC.map((mt,i)=>({label:(i===6?"\u{1F3C6} FINAL: ":"▶ Match "+(i+1)+": ")+mt[0][0]+" ("+mt[0][2]+") vs "+mt[1][0]+" ("+mt[1][2]+")",value:i}));
      if(SOC.idx>=0)opts.unshift({label:"\u{1F4FA} Keep watching the current match",value:"cur"});
      opts.push({label:"❌ Cancel",value:"cancel"});
      showDest("⚽ WORLD CUP — pick a match",opts,vi=>{
        if(vi==="cancel")return;
        if(vi!=="cur")startSoccer(vi);
        setTvChannel("soccer");
        toast("⚽\u{1F4FA} KICK-OFF! "+WC[SOC.idx][0][0]+" vs "+WC[SOC.idx][1][0]+" — when it ends, the next match starts!");
      });
      return;
    }
    setTvChannel(v);
    toast(v==="off"?"\u{1F4FA}⏻ TV is OFF — good night!"
      :v==="fire"?"\u{1F525} The cozy fireplace channel... so warm."
      :"\u{1F420} The aquarium channel — blub blub!");
  });
}
/* ================= ⚽ THE WORLD CUP CHANNEL: 7 generated matches ================= */
const WC=[
  [["SPAIN","#c60b1e","LAMINE YAMAL"],["PORTUGAL","#0a5c36","RONALDO"]],
  [["FRANCE","#0055a4","MBAPPÉ"],["ARGENTINA","#6faedb","MESSI"]],
  [["BRAZIL","#ffdc02","NEYMAR"],["ENGLAND","#e8edf7","KANE"]],
  [["GERMANY","#d9d9d9","MUSIALA"],["NETHERLANDS","#ff7f00","GAKPO"]],
  [["SPAIN","#c60b1e","LAMINE YAMAL"],["FRANCE","#0055a4","MBAPPÉ"]],
  [["ARGENTINA","#6faedb","MESSI"],["PORTUGAL","#0a5c36","RONALDO"]],
  [["SPAIN","#c60b1e","LAMINE YAMAL"],["ARGENTINA","#6faedb","MESSI"]]
];
const SOC={idx:-1,t:0,score:[0,0],ball:{x:128,y:70,tx:128,ty:70},players:[],banner:"",bannerT:0,ft:false};
function startSoccer(i){
  SOC.idx=i;SOC.t=0;SOC.score=[0,0];SOC.banner="";SOC.bannerT=0;SOC.ft=false;
  SOC.ball={x:128,y:72,tx:128,ty:72};
  SOC.players=[];
  for(let s=0;s<2;s++)for(let k=0;k<6;k++){
    SOC.players.push({s,bx:s?160+(k%3)*28:40+(k%3)*28,by:48+Math.floor(k/3)*36,ph:Math.random()*7,star:k===1});
  }
}
function cheer(){
  if(!audioCtx||!SND.sound)return;
  const t=audioCtx.currentTime,dur=0.8;
  const buf=audioCtx.createBuffer(1,audioCtx.sampleRate*dur,audioCtx.sampleRate);
  const d=buf.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.sin(i/d.length*Math.PI);
  const src=audioCtx.createBufferSource();src.buffer=buf;
  const f=audioCtx.createBiquadFilter();f.type="bandpass";f.frequency.value=900;f.Q.value=0.5;
  const g=audioCtx.createGain();g.gain.value=0.12;
  src.connect(f);f.connect(g);g.connect(audioCtx.destination);src.start();
}
function drawSoccer(dt){
  const mt=WC[SOC.idx],A=mt[0],B=mt[1];
  SOC.t+=dt;
  const minute=Math.min(90,Math.floor(SOC.t/150*90));
  const now=performance.now();
  /* the ball travels between players — and sometimes goes for GOAL */
  const b=SOC.ball;
  const bd=Math.hypot(b.tx-b.x,b.ty-b.y);
  if(bd<3&&!SOC.ft){
    if(b.goal!==undefined){
      /* the shot arrived at a goal mouth! */
      const scoringSide=b.goal;   // 0 = team A scored (right goal), 1 = team B
      if(Math.random()<0.6){
        SOC.score[scoringSide]++;
        const T=scoringSide?B:A;
        const scorer=Math.random()<0.65?T[2]:"No. "+(2+Math.floor(Math.random()*9));
        SOC.banner="⚽ GOOOAL! "+scorer+" ("+T[0]+")";
        SOC.bannerT=3.2;
        cheer();
      }else{SOC.banner="\u{1F9E4} SAVED!";SOC.bannerT=1.4;}
      b.goal=undefined;
      b.tx=128;b.ty=72;
    }else if(Math.random()<0.22){
      /* shoot! aim at a goal mouth */
      const side=Math.random()<0.5?0:1;
      b.goal=side;
      b.tx=side?12:244;b.ty=62+Math.random()*20;
    }else{
      const p=SOC.players[Math.floor(Math.random()*SOC.players.length)];
      b.tx=p.bx+Math.sin(now/700+p.ph)*8;
      b.ty=p.by+Math.cos(now/900+p.ph)*7;
    }
  }
  const bs=64*dt;
  if(bd>0.5){b.x+=(b.tx-b.x)/bd*Math.min(bs,bd);b.y+=(b.ty-b.y)/bd*Math.min(bs,bd);}
  /* full time → show the result, then the next match kicks off */
  if(SOC.t>=150&&!SOC.ft){
    SOC.ft=true;
    SOC.banner="\u{1F3C1} FULL TIME "+SOC.score[0]+" - "+SOC.score[1];
    SOC.bannerT=6;
  }
  if(SOC.ft&&SOC.bannerT<=0){startSoccer((SOC.idx+1)%WC.length);return;}
  SOC.bannerT-=dt;
  /* --- draw the match --- */
  const c=newsCv.getContext("2d");
  c.fillStyle="#1e7a34";c.fillRect(0,0,256,136);
  for(let i=0;i<6;i++){c.fillStyle=i%2?"#1e8038":"#1c7431";c.fillRect(i*43,26,43,110);}
  c.strokeStyle="rgba(255,255,255,.7)";c.lineWidth=1.5;
  c.strokeRect(8,32,240,98);
  c.beginPath();c.moveTo(128,32);c.lineTo(128,130);c.stroke();
  c.beginPath();c.arc(128,81,16,0,7);c.stroke();
  c.strokeRect(8,58,22,46);c.strokeRect(226,58,22,46);
  /* players wiggle around their formation spots (the star wears a ring) */
  for(const p of SOC.players){
    const px=p.bx+Math.sin(now/700+p.ph)*8,py=p.by+Math.cos(now/900+p.ph)*7+26;
    c.fillStyle=p.s?B[1]:A[1];
    c.beginPath();c.arc(px,py,3.4,0,7);c.fill();
    c.strokeStyle="#08131f";c.lineWidth=1;c.stroke();
    if(p.star){c.strokeStyle="#ffd75e";c.lineWidth=1.4;c.beginPath();c.arc(px,py,5.4,0,7);c.stroke();}
  }
  /* the ball */
  c.fillStyle="#ffffff";c.beginPath();c.arc(b.x,b.y+26,2.4,0,7);c.fill();
  c.strokeStyle="#08131f";c.lineWidth=0.8;c.stroke();
  /* scoreboard */
  c.fillStyle="#08131f";c.fillRect(0,0,256,26);
  c.fillStyle=A[1];c.fillRect(4,5,16,16);
  c.fillStyle=B[1];c.fillRect(236,5,16,16);
  c.fillStyle="#fff";c.font="bold 13px Segoe UI";c.textAlign="center";
  c.fillText(A[0].slice(0,3)+"  "+SOC.score[0]+" - "+SOC.score[1]+"  "+B[0].slice(0,3),128,17);
  c.font="bold 11px Segoe UI";c.textAlign="left";
  c.fillStyle="#ffd75e";c.fillText((SOC.ft?"FT":minute+"'"),24,17);
  c.textAlign="right";c.fillStyle="#9fd8ff";c.fillText(SOC.idx===6?"\u{1F3C6} FINAL":"WORLD CUP",232,17);
  /* goal / full-time banner */
  if(SOC.bannerT>0&&SOC.banner){
    c.fillStyle="rgba(8,19,31,.85)";c.fillRect(0,56,256,30);
    c.fillStyle="#ffd75e";c.font="bold 15px Segoe UI";c.textAlign="center";
    c.fillText(SOC.banner,128,76);
  }
  newsTex.needsUpdate=true;
}
/* --- CITY NEWS: each story shows ONCE for 5 seconds, then B&W static --- */
let _newsCur=null,_newsTimer=0,_staticT=0,_animT=0;
function drawHeadline(t){
  const c=newsCv.getContext("2d");
  c.fillStyle="#08131f";c.fillRect(0,0,256,136);
  c.fillStyle="#c0392b";c.fillRect(0,0,256,26);
  c.fillStyle="#fff";c.font="bold 16px Segoe UI";c.textAlign="left";
  c.fillText("\u{1F4FA} CITY NEWS · LIVE",8,19);
  c.font="13px Segoe UI";c.fillStyle="#e8edf7";
  const words=String(t).split(" ");
  let line="",y=48;
  for(const w of words){
    if((line+" "+w).length>32){c.fillText(line,8,y);y+=17;line=w;}
    else line=line?line+" "+w:w;
    if(y>110)break;
  }
  if(line&&y<=110)c.fillText(line,8,y);
  c.fillStyle="#1a2438";c.fillRect(0,118,256,18);
  c.fillStyle="#ffd75e";c.font="bold 11px Segoe UI";
  c.fillText("BREAKING NEWS · live from your world",8,131);
  newsTex.needsUpdate=true;
}
function drawStatic(){
  /* no news right now: black & white square static, like a real old TV */
  const c=newsCv.getContext("2d");
  for(let y=0;y<136;y+=8)for(let x=0;x<256;x+=8){
    const v=Math.random()<0.45?8:Math.floor(120+Math.random()*135);
    c.fillStyle="rgb("+v+","+v+","+v+")";
    c.fillRect(x,y,8,8);
  }
  newsTex.needsUpdate=true;
}
/* --- the generated channels: fireplace & aquarium --- */
const aquaFish=[];
for(let i=0;i<5;i++)aquaFish.push({x:Math.random()*256,y:30+i*20,sp:12+Math.random()*22,dir:Math.random()<0.5?1:-1,col:["#ff7f11","#f4d35e","#ff5d8f","#4fc3f7","#94d82d"][i]});
function drawFireplace(){
  const c=newsCv.getContext("2d");
  c.fillStyle="#160c06";c.fillRect(0,0,256,136);
  c.fillStyle="#4a3728";c.fillRect(48,104,160,14);   // logs
  c.fillStyle="#5a4430";c.fillRect(70,96,120,10);
  for(let i=0;i<14;i++){
    const x=70+Math.random()*116,h=18+Math.random()*52,w=8+Math.random()*14;
    c.fillStyle=["#ff7f11","#ffd166","#d7263d","#ff9e3d"][i%4];
    c.beginPath();
    c.moveTo(x-w/2,104);c.quadraticCurveTo(x,104-h*1.3,x+w/2,104);
    c.closePath();c.fill();
  }
  for(let i=0;i<6;i++){c.fillStyle="#ffd166";c.fillRect(80+Math.random()*100,30+Math.random()*60,2,2);}
  newsTex.needsUpdate=true;
}
function drawAquarium(){
  const c=newsCv.getContext("2d");
  const gr=c.createLinearGradient(0,0,0,136);
  gr.addColorStop(0,"#0e4d78");gr.addColorStop(1,"#062b47");
  c.fillStyle=gr;c.fillRect(0,0,256,136);
  c.fillStyle="#2f9e44";
  for(const wx of[30,120,215]){c.fillRect(wx,96,5,40);c.fillRect(wx+8,106,4,30);}
  for(const f of aquaFish){
    c.save();
    c.translate(f.x,f.y+Math.sin(performance.now()/400+f.x)*4);
    c.scale(f.dir,1);
    c.fillStyle=f.col;
    c.beginPath();c.ellipse(0,0,11,6,0,0,7);c.fill();
    c.beginPath();c.moveTo(-10,0);c.lineTo(-17,-5);c.lineTo(-17,5);c.closePath();c.fill();
    c.fillStyle="#08131f";c.beginPath();c.arc(5,-1.5,1.6,0,7);c.fill();
    c.restore();
  }
  c.fillStyle="rgba(255,255,255,.5)";
  for(let i=0;i<5;i++)c.beginPath(),c.arc((i*53+performance.now()/40)%256,(136-(performance.now()/14+i*40)%136),2,0,7),c.fill();
  newsTex.needsUpdate=true;
}
function updateTv(dt){
  /* video sound follows how close you stand to a TV */
  if(TV.channel==="3mm"&&TV.videoEl){
    let d=1e9;
    for(let i=TVS.length-1;i>=0;i--){
      const t=TVS[i];
      if(offScene(t.g)){TVS.splice(i,1);continue;}
      d=Math.min(d,Math.hypot(player.x-t.x,player.z-t.z));
    }
    TV.videoEl.volume=SND.sound?Math.max(0,Math.min(0.75,1.1-d/26)):0;
    return;
  }
  if(TV.channel==="off")return;
  if(TV.channel==="soccer"){drawSoccer(dt);return;}
  if(TV.channel==="news"){
    pruneNews();
    /* show the story you picked (while it's fresh), otherwise the newest one */
    const cur=(TV.newsPick&&NEWS.includes(TV.newsPick))?TV.newsPick:(NEWS.length?NEWS[NEWS.length-1]:null);
    if(cur!==_newsCur){
      _newsCur=cur;
      if(cur)drawHeadline(cur.t);
    }
    if(!cur){
      _staticT-=dt;
      if(_staticT<=0){_staticT=0.12;drawStatic();}
    }
    return;
  }
  _animT-=dt;
  if(_animT>0)return;
  _animT=0.1;
  if(TV.channel==="fire")drawFireplace();
  else if(TV.channel==="aqua"){
    for(const f of aquaFish){
      f.x+=f.sp*f.dir*0.1;
      if(f.x>270){f.dir=-1;f.x=270;}
      if(f.x<-14){f.dir=1;f.x=-14;}
    }
    drawAquarium();
  }
}
/* ---------- random events: construction, accidents (+ambulance), fires (+fire truck) & festivals ---------- */
const EVENTS={list:[],timer:25};
/* an emergency vehicle that drives in and parks at the scene */
function addResponder(e,kind,delay){
  const mesh=buildEmergencyMesh(kind);
  const a=Math.random()*Math.PI*2;
  const r={kind,mesh,x:e.x+Math.sin(a)*220,z:e.z+Math.cos(a)*220,
    ox:(Math.random()-0.5)*10,oz:8+Math.random()*4,state:"drive",delay:delay||0};
  mesh.position.set(r.x,terrainH(r.x,r.z),r.z);
  mesh.visible=false;
  e.g.add(mesh);
  e.resp=r;
}
function updateResponder(e,dt,now){
  const r=e.resp;
  if(!r)return;
  if(r.delay>0){r.delay-=dt;return;}
  r.mesh.visible=true;
  if(r.state==="drive"){
    const tx=e.x+r.ox,tz=e.z+r.oz;
    const dx=tx-r.x,dz=tz-r.z,d=Math.hypot(dx,dz);
    if(d<3){
      r.state="parked";
      if(r.kind==="fire")toast("\u{1F692} The fire truck arrived — water ON!");
      else if(r.kind==="ambulance")toast("\u{1F691} The ambulance is on scene — the patients are in good hands!");
    }else{
      const yaw=Math.atan2(dx,dz);
      r.x+=dx/d*17*dt;r.z+=dz/d*17*dt;
      r.mesh.rotation.set(0,yaw,0);
      if(r.mesh.userData.wheels)for(const w of r.mesh.userData.wheels)w.spin.rotation.x+=17/w.r*dt;
    }
    r.mesh.position.set(r.x,terrainH(r.x,r.z),r.z);
  }
  if(r.mesh.userData.lights){
    const on=Math.floor(now/160)%2===0;
    r.mesh.userData.lights[0].visible=on;
    r.mesh.userData.lights[1].visible=!on;
  }
}
function eventSpeedCap(x,z){
  let cap=Infinity;
  for(const e of EVENTS.list)if(e.cap&&Math.hypot(x-e.x,z-e.z)<e.zone)cap=Math.min(cap,e.cap);
  return cap;
}
function eventRoadPoint(){
  const axis=Math.random()<0.5?"z":"x";
  const p=axis==="z"?player.x:player.z;
  const line=Math.round((p-30)/120)*120+30+120*(Math.floor(Math.random()*3)-1);
  const along=(axis==="z"?player.z:player.x)+(Math.random()<0.5?-1:1)*(180+Math.random()*180);
  const off=Math.random()<0.5?3.5:-3.5;
  return axis==="z"?{x:line+off,z:along,axis}:{x:along,z:line+off,axis};
}
function spawnEvent(forceType){
  const pool=["construction","accident","festival","fire","rescue",isNight()?"meteor":"accident"];
  const type=forceType||pool[Math.floor(Math.random()*pool.length)];
  const g=new THREE.Group();
  const e={type,g,life:150,x:0,z:0};
  if(type==="fire"){
    /* a HOUSE FIRE: flames on a nearby building until the fire truck puts it out */
    const cand=buildings.filter(b=>{
      if(!b.alive||b.walkThru)return false;
      const d=Math.hypot(b.x-player.x,b.z-player.z);
      return d>70&&d<340;
    });
    if(!cand.length){disposeGroup(g);return;}
    const b=cand[Math.floor(Math.random()*cand.length)];
    e.x=b.x;e.z=b.z;e.gy=b.gy;e.fire=1;e.life=120;
    e.flames=[];
    const fr=[0xff7f11,0xffd166,0xd7263d];
    for(let i=0;i<7;i++){
      const fl=new THREE.Mesh(new THREE.ConeGeometry(0.5+Math.random()*0.5,1.6+Math.random()*1.6,6),
        new THREE.MeshBasicMaterial({color:fr[i%3],transparent:true,opacity:0.9}));
      fl.position.set(b.x+(Math.random()-0.5)*Math.min(7,b.w),b.gy+2+Math.random()*3.5,b.z+(Math.random()-0.5)*Math.min(6,b.d));
      g.add(fl);e.flames.push(fl);
    }
    /* the water jet (hidden until the truck sprays) */
    e.drops=[];
    for(let i=0;i<12;i++){
      const dr=new THREE.Mesh(new THREE.SphereGeometry(0.16,6,6),
        new THREE.MeshBasicMaterial({color:0x6fc7ff,transparent:true,opacity:0.85}));
      dr.visible=false;g.add(dr);e.drops.push(dr);
    }
    addResponder(e,"fire",3);
    pushNews("\u{1F525} HOUSE FIRE near ("+Math.round(e.x)+", "+Math.round(e.z)+")! The fire truck is racing to the scene.");
    toast("\u{1F525}\u{1F692} A HOUSE caught FIRE near ("+Math.round(e.x)+", "+Math.round(e.z)+") — the fire truck is on its way!");
    scene.add(g);
    EVENTS.list.push(e);
    return;
  }
  if(type==="construction"){
    const p=eventRoadPoint();e.x=p.x;e.z=p.z;e.zone=22;e.cap=8;
    const y=terrainH(p.x,p.z);
    const coneM=new THREE.MeshLambertMaterial({color:0xff7f11});
    for(let i=0;i<6;i++){
      const c=new THREE.Mesh(new THREE.ConeGeometry(0.3,0.85,8),coneM);
      c.position.set(p.x+(p.axis==="z"?((i%2)*3-1.5):i*2.2-5.5),y+0.42,p.z+(p.axis==="z"?i*2.2-5.5:((i%2)*3-1.5)));
      g.add(c);
    }
    const bar=new THREE.Mesh(new THREE.BoxGeometry(4.4,0.5,0.2),new THREE.MeshBasicMaterial({color:0xffd75e}));
    bar.position.set(p.x,y+1.1,p.z);if(p.axis==="x")bar.rotation.y=Math.PI/2;g.add(bar);
    [[-2],[2]].forEach(q=>{const leg=new THREE.Mesh(new THREE.BoxGeometry(0.14,1.1,0.14),darkTrim);
      leg.position.set(p.x+(p.axis==="z"?q[0]:0),y+0.55,p.z+(p.axis==="z"?0:q[0]));g.add(leg);});
    const digger=new THREE.Mesh(new THREE.BoxGeometry(2.4,1.6,3),new THREE.MeshLambertMaterial({color:0xf4d35e}));
    digger.position.set(p.x+(p.axis==="z"?4.5:0),y+0.8,p.z+(p.axis==="z"?0:4.5));g.add(digger);
    toast("\u{1F6A7} ROAD CONSTRUCTION near ("+Math.round(e.x)+", "+Math.round(e.z)+") — slow down to pass!");
  }else if(type==="accident"){
    const p=eventRoadPoint();e.x=p.x;e.z=p.z;e.zone=20;e.cap=6;
    const y=terrainH(p.x,p.z);
    const c1=buildVehicleMesh("car",COLORS[Math.floor(Math.random()*COLORS.length)]);
    c1.position.set(p.x-1.5,y,p.z-2);c1.rotation.y=Math.random()*6.3;c1.rotation.z=0.14;g.add(c1);
    const c2=buildVehicleMesh("car",COLORS[Math.floor(Math.random()*COLORS.length)]);
    c2.position.set(p.x+1.5,y,p.z+2.4);c2.rotation.y=Math.random()*6.3;g.add(c2);
    const pol=buildEmergencyMesh("police");
    pol.position.set(p.x+(p.axis==="z"?0:8),y,p.z+(p.axis==="z"?8:0));g.add(pol);
    e.lights=pol.userData.lights;
    /* the ambulance rushes in to help */
    addResponder(e,"ambulance",4);
    pushNews("\u{1F6A8} Accident near ("+Math.round(e.x)+", "+Math.round(e.z)+") — the ambulance is on its way, drive carefully!");
    toast("\u{1F6A8} ACCIDENT on the road near ("+Math.round(e.x)+", "+Math.round(e.z)+") — police on site, ambulance incoming!");
  }else if(type==="meteor"){
    /* ☄️ METEOR SHOWER: glowing space rocks crash down — drive to them for $250 each! */
    let fx=0,fz=0,ok=false;
    for(let i=0;i<10;i++){
      const a=Math.random()*Math.PI*2,d=200+Math.random()*200;
      fx=player.x+Math.sin(a)*d;fz=player.z+Math.cos(a)*d;
      if(!keepClear(fx,fz)&&rawH(fx,fz)>-1&&rawH(fx,fz)<16){ok=true;break;}
    }
    if(!ok){disposeGroup(g);return;}
    e.x=fx;e.z=fz;e.life=130;e.meteors=[];
    for(let i=0;i<3;i++){
      const mx=fx+(Math.random()-0.5)*60,mz=fz+(Math.random()-0.5)*60;
      const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(0.9,0),
        new THREE.MeshBasicMaterial({color:0xffa040}));
      rock.position.set(mx,240+i*90,mz);g.add(rock);
      const glow=new THREE.Mesh(new THREE.SphereGeometry(1.6,8,8),
        new THREE.MeshBasicMaterial({color:0xff7f11,transparent:true,opacity:0.35}));
      glow.position.copy(rock.position);g.add(glow);
      e.meteors.push({rock,glow,x:mx,z:mz,y:rock.position.y,vy:-(55+i*12),landed:false,got:false});
    }
    pushNews("☄️ METEOR SHOWER near ("+Math.round(fx)+", "+Math.round(fz)+") — the glowing space rocks are worth $250 each!!");
    toast("☄️\u{1F31F} A METEOR SHOWER is falling near ("+Math.round(fx)+", "+Math.round(fz)+") — race there and grab the space rocks: $250 each!");
  }else if(type==="rescue"){
    /* 🆘 EMERGENCY RESCUE: someone's car broke down — be their hero! */
    const p=eventRoadPoint();e.x=p.x;e.z=p.z;e.life=140;e.rescue=true;
    const y=terrainH(p.x,p.z);
    const wreck=buildVehicleMesh("car",COLORS[Math.floor(Math.random()*COLORS.length)]);
    wreck.position.set(p.x,y,p.z);wreck.rotation.y=Math.random()*6.3;wreck.rotation.z=0.06;g.add(wreck);
    const person=makePerson(0.95);
    person.position.set(p.x+2.5,y,p.z);g.add(person);
    e.person=person;
    /* smoke from the dead engine */
    e.smokeT=0;
    pushNews("\u{1F198} Someone is STRANDED near ("+Math.round(p.x)+", "+Math.round(p.z)+") — $500 for the driver who rescues them!");
    toast("\u{1F198}\u{1F697} EMERGENCY! Someone is stranded near ("+Math.round(p.x)+", "+Math.round(p.z)+") — drive there and STOP next to them for $500!");
  }else{
    /* festival: an off-road party — visit it on foot for +$50 */
    let fx=0,fz=0,ok=false;
    for(let i=0;i<10;i++){
      const a=Math.random()*Math.PI*2,d=150+Math.random()*120;
      fx=player.x+Math.sin(a)*d;fz=player.z+Math.cos(a)*d;
      if(!keepClear(fx,fz)&&rawH(fx,fz)<14){ok=true;break;}
    }
    if(!ok){disposeGroup(g);return;}
    e.x=fx;e.z=fz;
    const y=terrainH(fx,fz);
    const stage=new THREE.Mesh(new THREE.BoxGeometry(8,1,5),new THREE.MeshLambertMaterial({color:0x6d28d9}));
    stage.position.set(fx,y+0.5,fz);g.add(stage);
    const back=new THREE.Mesh(new THREE.BoxGeometry(8,4,0.4),new THREE.MeshLambertMaterial({color:0x9b5de5}));
    back.position.set(fx,y+3,fz-2.3);g.add(back);
    const bn=new THREE.Mesh(new THREE.BoxGeometry(6,0.7,0.1),new THREE.MeshBasicMaterial({color:0xffd75e}));
    bn.position.set(fx,y+4.6,fz-2.3);g.add(bn);
    e.balloons=[];
    for(let i=0;i<6;i++){
      const bx=fx-6+i*2.4,bz=fz+4;
      const st=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,2.6),darkTrim);st.position.set(bx,y+1.3,bz);g.add(st);
      const bl=new THREE.Mesh(new THREE.SphereGeometry(0.45,10,10),new THREE.MeshLambertMaterial({color:COLORS[i%COLORS.length]}));
      bl.position.set(bx,y+2.9,bz);bl.userData.y0=y+2.9;g.add(bl);
      e.balloons.push(bl);
    }
    e.peds=[];
    for(let i=0;i<4;i++){
      const pp=spawnPed(fx-5+Math.random()*10,fz+2+Math.random()*5,"wander");
      if(pp)e.peds.push(pp);
    }
    pushNews("\u{1F389} A FESTIVAL is happening near ("+Math.round(fx)+", "+Math.round(fz)+") — free $50 for every visitor!");
    toast("\u{1F389} A FESTIVAL started near ("+Math.round(fx)+", "+Math.round(fz)+") — visit it on foot for $50!");
  }
  scene.add(g);
  EVENTS.list.push(e);
}
function updateEvents(dt){
  if(S.world!=="earth")return;
  EVENTS.timer-=dt;
  if(EVENTS.timer<=0){
    EVENTS.timer=100+Math.random()*140;   // calmer city: events happen less often
    if(EVENTS.list.length<3)spawnEvent();
  }
  const now=performance.now();
  for(let i=EVENTS.list.length-1;i>=0;i--){
    const e=EVENTS.list[i];
    e.life-=dt;
    if(e.lights){const on=Math.floor(now/250)%2===0;e.lights[0].visible=on;e.lights[1].visible=!on;}
    updateResponder(e,dt,now);
    /* burning houses: flames flicker + smoke, until the fire truck sprays them out */
    if(e.fire!==undefined&&e.fire>0){
      e.flames.forEach((fl,fi)=>{
        fl.scale.setScalar(Math.max(0.05,e.fire*(0.75+Math.sin(now/85+fi*2)*0.3)));
      });
      if(Math.random()<dt*5)puffSmoke(e.x+(Math.random()-0.5)*5,e.gy+6,e.z+(Math.random()-0.5)*5);
      if(e.resp&&e.resp.state==="parked"){
        /* WATER ON: an arc of drops from the truck's hose to the flames */
        const r=e.resp;
        e.fire=Math.max(0,e.fire-dt/9);
        e.drops.forEach((dr,di)=>{
          dr.visible=true;
          const t=((now/700)+di/e.drops.length)%1;
          const sx=r.x,sy=terrainH(r.x,r.z)+2.4,sz=r.z;
          const tx=e.x,ty=e.gy+3,tz=e.z;
          dr.position.set(sx+(tx-sx)*t,sy+(ty-sy)*t+Math.sin(t*Math.PI)*3.2,sz+(tz-sz)*t);
        });
        if(e.fire<=0){
          e.flames.forEach(fl=>fl.visible=false);
          e.drops.forEach(dr=>dr.visible=false);
          e.life=Math.min(e.life,10);
          pushNews("\u{1F692} The fire fighters put out the house fire near ("+Math.round(e.x)+", "+Math.round(e.z)+") — everyone is safe!");
          if(Math.hypot(player.x-e.x,player.z-e.z)<260)toast("\u{1F692}\u{1F4A6} FIRE'S OUT! Great work by the fire fighters!");
        }
      }
    }
    if(e.balloons){
      e.balloons.forEach((b,bi)=>{b.position.y=b.userData.y0+Math.sin(now/700+bi)*0.5;});
      if(!e.done&&player.onFoot&&Math.hypot(player.x-e.x,player.z-e.z)<10){
        e.done=true;addMoney(50);
        toast("\u{1F389} You made it to the festival — +$50!");
      }
    }
    /* ☄️ meteors: fall from the sky, then glow on the ground until collected */
    if(e.meteors){
      for(const m of e.meteors){
        if(!m.landed){
          m.y+=m.vy*dt;
          const gy=terrainH(m.x,m.z)+0.7;
          if(m.y<=gy){
            m.y=gy;m.landed=true;
            if(Math.hypot(player.x-m.x,player.z-m.z)<220)toast("☄️\u{1F4A5} A meteor just CRASHED nearby — grab it!");
          }
          m.rock.position.y=m.y;m.glow.position.y=m.y;
        }else if(!m.got){
          m.rock.rotation.y+=dt*2;m.rock.rotation.x+=dt;
          m.glow.scale.setScalar(1+Math.sin(now/240)*0.25);
          if(Math.hypot(player.x-m.x,player.z-m.z)<4.5){
            m.got=true;m.rock.visible=false;m.glow.visible=false;
            addMoney(250);
            toast("☄️\u{1F4B0} SPACE ROCK collected — +$250!"+(e.meteors.every(q=>q.got)?" That's ALL of them — nice driving!":""));
          }
        }
      }
    }
    /* 🆘 rescue: stop next to the stranded driver */
    if(e.rescue&&!e.done){
      if(e.person)e.person.rotation.y=Math.sin(now/400)*0.6;   // waving around, worried
      const stopped=player.drive&&Math.abs(player.drive.speed||0)<2;
      if(stopped&&Math.hypot(player.x-e.x,player.z-e.z)<12){
        e.done=true;e.life=Math.min(e.life,6);
        addMoney(500);
        pushNews("\u{1F9B8} "+mpName()+" rescued the stranded driver — a true Car City hero!");
        toast("\u{1F9B8}\u{1F4B0} RESCUED! They hop in, you drop them at the corner — +$500, hero!");
      }
    }
    if(e.life<=0||Math.hypot(player.x-e.x,player.z-e.z)>900){
      /* the festival is over: the visitors walk off and go home */
      if(e.peds)e.peds.forEach(p=>{p.mode="leave";p.ttl=Math.min(p.ttl,8+Math.random()*5);});
      if(e.balloons&&e.life<=0&&Math.hypot(player.x-e.x,player.z-e.z)<220)
        toast("\u{1F389} The festival is over — everyone is heading home.");
      scene.remove(e.g);disposeGroup(e.g);
      EVENTS.list.splice(i,1);
    }
  }
}
/* ---------- your money & cars follow your USERNAME (saved online in Firebase) ---------- */
const PROF={t:0,dirty:false};
function profileKey(){
  const n=cleanServerName(localStorage.getItem("vc4pname")||"");
  return n?n.toLowerCase().replace(/[^a-z0-9]/g,"_"):null;
}
async function profileLoad(){
  if(!SERVER_READY)return;
  const k=profileKey();if(!k)return;
  try{
    const r=await fetch(SERVER_API+"/profiles/"+k+".json",{cache:"no-store"});
    if(!r.ok)return;
    const d=await r.json();
    if(d&&d.t===myToken()){
      if(typeof d.v==="number"&&d.v>MONEY.v)MONEY.v=d.v;
      if(MONEY.v>=1000)MONEY.rainbow=true;
      (typeof d.own==="string"?d.own.split("|"):[]).forEach(n=>{n=fixVehName(n);if(n&&!OLD_DEFAULTS.includes(n))OWN.add(n);});
      updateMoneyUI();renderMenu();saveGame();
    }
    profileSave(true);
  }catch(e){}
}
function profileSave(force){
  if(!SERVER_READY)return;
  const k=profileKey();if(!k)return;
  const now=Date.now();
  if(!force&&now-PROF.t<10000){PROF.dirty=true;return;}
  PROF.t=now;PROF.dirty=false;
  try{
    fetch(SERVER_API+"/profiles/"+k+".json",{method:"PUT",
      body:JSON.stringify({t:myToken(),name:localStorage.getItem("vc4pname")||"",v:MONEY.v,own:[...OWN].join("|")})
    }).catch(()=>{});
  }catch(e){}
}
/* ---------- dumpling & butter buyers: sell your squishies for money ---------- */
const SELL={sel:new Set(),kind:"dump"};   // kind: "dump" (dumpling buyer) or "butter" (butter buyer)
function sellColl(){return SELL.kind==="butter"?BUTTER.owned:DUMP.owned;}
function sellVal(d){return SELL.kind==="butter"?butterValue(d):dumpValue(d);}
function nearBuyer(){
  for(let i=buyers.length-1;i>=0;i--){
    const b=buyers[i];
    if(offScene(b.g)){buyers.splice(i,1);continue;}
    if(Math.hypot(player.x-b.x,player.z-b.z)<7)return b;
  }
  return null;
}
function nearButterBuyer(){
  for(let i=butterBuyers.length-1;i>=0;i--){
    const b=butterBuyers[i];
    if(offScene(b.g)){butterBuyers.splice(i,1);continue;}
    if(Math.hypot(player.x-b.x,player.z-b.z)<7)return b;
  }
  return null;
}
/* filters COMBINE: a color AND glitter AND (at the butter buyer) a size —
   the list only shows what matches, and matching items get auto-selected */
const FILT={color:null,glit:"all",size:"all"};
function passFilt(d){
  if(FILT.color&&d.color!==FILT.color)return false;
  if(FILT.glit==="glitter"&&!d.glitter)return false;
  if(FILT.glit==="normal"&&d.glitter)return false;
  if(SELL.kind==="butter"&&FILT.size!=="all"&&(d.size||"norm")!==FILT.size)return false;
  return true;
}
function shownItems(){
  const out=[];
  sellColl().forEach((d,i)=>{if(passFilt(d))out.push({d,i});});
  return out;
}
function selectShown(){SELL.sel=new Set(shownItems().map(o=>o.i));renderSell();}
function renderSellChips(){
  const wrap=$("sellColors");wrap.innerHTML="";
  const opts=[["All colors",null,"#5b6b8c"],...DUMP_COLORS.map(c=>[c[0],c[0],c[1]]),["Rainbow","Rainbow",RAINBOW_CSS],["Gold","Gold","#ffd700"]];
  opts.forEach(([label,val,bg])=>{
    const b=document.createElement("button");
    b.innerHTML="<span class='swatch' style='background:"+bg+"'></span>"+label;
    if(FILT.color===val)b.style.cssText="border-color:var(--acc2);color:var(--acc2);font-weight:700";
    b.onclick=()=>{FILT.color=val;selectShown();};
    wrap.appendChild(b);
  });
}
function segOn(ids,onId){ids.forEach(id=>$(id).classList.toggle("on",id===onId));}
function renderSell(){
  const coll=sellColl(),butter=SELL.kind==="butter";
  $("sellSizeRow").style.display=butter?"":"none";
  segOn(["fGlitAll","fGlit","fNorm"],FILT.glit==="glitter"?"fGlit":FILT.glit==="normal"?"fNorm":"fGlitAll");
  segOn(["fSzAll","fSzNorm","fSzMed","fSzMega"],FILT.size==="norm"?"fSzNorm":FILT.size==="med"?"fSzMed":FILT.size==="mega"?"fSzMega":"fSzAll");
  renderSellChips();
  const shown=shownItems();
  const list=$("sellList");list.innerHTML="";
  if(!coll.length){
    const d=document.createElement("div");
    d.style.cssText="color:var(--dim);font-size:13px";
    d.textContent="You have no "+(butter?"butter squishies":"dumplings")+" — buy them at a MEGA MART and open them first!";
    list.appendChild(d);
  }else if(!shown.length){
    const d=document.createElement("div");
    d.style.cssText="color:var(--dim);font-size:13px";
    d.textContent="Nothing matches these filters — you have "+coll.length+" in total. Try \u{1F504} other filters!";
    list.appendChild(d);
  }
  chunkedList(list,shown,o=>{
    const d=o.d,i=o.i;
    const b=document.createElement("button");
    b.className="dumpItem"+(d.glitter?" glitter":"")+(SELL.sel.has(i)?" sel":"");
    b.innerHTML=(SELL.sel.has(i)?"✅ ":"")+"<span class='swatch' style='background:"+d.hex+"'></span>"
      +(d.glitter?"✨ GLITTER ":"")+(butter?butterSizeLabel(d):"")+d.color+" — $"+fmtMoney(sellVal(d));
    b.onclick=()=>{SELL.sel.has(i)?SELL.sel.delete(i):SELL.sel.add(i);renderSell();};
    return b;
  });
  let tot=0,cnt=0;
  SELL.sel.forEach(i=>{const d=coll[i];if(d){tot+=sellVal(d);cnt++;}});
  $("sellDo").textContent="\u{1F4B5} Sell "+cnt+" selected — $"+fmtMoney(tot);
}
function openSell(kind){
  SELL.kind=kind==="butter"?"butter":"dump";
  $("sellTitle").textContent=SELL.kind==="butter"
    ?"\u{1F9C8} Butter buyer — sell your butter squishies"
    :"\u{1F95F} Dumpling buyer — sell your dumplings";
  FILT.color=null;FILT.glit="all";FILT.size="all";
  SELL.sel.clear();renderSell();$("sellModal").classList.add("open");
}
$("selAll").onclick=()=>selectShown();
$("selNone").onclick=()=>{SELL.sel.clear();renderSell();};
$("fGlitAll").onclick=()=>{FILT.glit="all";selectShown();};
$("fGlit").onclick=()=>{FILT.glit="glitter";selectShown();};
$("fNorm").onclick=()=>{FILT.glit="normal";selectShown();};
$("fSzAll").onclick=()=>{FILT.size="all";selectShown();};
$("fSzNorm").onclick=()=>{FILT.size="norm";selectShown();};
$("fSzMed").onclick=()=>{FILT.size="med";selectShown();};
$("fSzMega").onclick=()=>{FILT.size="mega";selectShown();};
$("sellDo").onclick=()=>{
  if(!SELL.sel.size){toast("Select some to sell first!");return;}
  const coll=sellColl(),idx=[...SELL.sel].sort((a,b)=>b-a);
  let tot=0;
  for(const i of idx){
    const d=coll[i];tot+=sellVal(d);
    if(HOLD.d===d){HOLD.d=null;HOLD.mesh.visible=false;}
    coll.splice(i,1);
  }
  SELL.sel.clear();
  addMoney(tot);renderSell();
  toast("\u{1F4B0} Sold! You earned $"+fmtMoney(tot));
};
$("sellClose").onclick=()=>$("sellModal").classList.remove("open");
/* rented rooms overview + teleport */
function renderRooms(){
  const list=$("roomsList");list.innerHTML="";
  if(!RENT.list.length){
    const d=document.createElement("div");
    d.style.cssText="color:var(--dim);font-size:13px";
    d.textContent="No rooms yet — press T at a hotel RECEPTION to rent one (free).";
    list.appendChild(d);return;
  }
  RENT.list.forEach(rm=>{
    const row=document.createElement("div");
    row.style.cssText="display:flex;gap:6px;align-items:stretch";
    const b=document.createElement("button");
    b.style.flex="1";
    b.innerHTML=rm.label+" <span style='color:var(--dim)'>— teleport or route</span>";
    b.onclick=()=>{
      $("roomsModal").classList.remove("open");
      showDest(rm.label,[
        {label:"⚡ TELEPORT — go there right now",value:"tp"},
        {label:"\u{1F9ED} ROUTE — show the way, drive there yourself",value:"route"},
        {label:"❌ Close",value:"x"}
      ],a=>{
        if(a==="tp")gotoRoom(rm);
        else if(a==="route"){setRoute(rm.x,rm.z);toast("\u{1F9ED} Route set to "+rm.label+" — follow the blue line!");}
      });
    };
    row.appendChild(b);
    /* renting? you can switch to buying — the rent you paid counts! */
    if(rm.mode==="rent"){
      const buy=document.createElement("button");
      buy.textContent="\u{1F4B0} Buy";
      buy.title="Switch to BUY — you only pay the rest: $"+fmtMoney(propBuyDue(rm))+" (your items stay!)";
      buy.style.cssText="flex:0 0 auto;border-color:var(--good);color:var(--good)";
      buy.onclick=()=>{$("roomsModal").classList.remove("open");switchToBuy(rm);};
      row.appendChild(buy);
    }
    /* give the place back — your placed items get deleted */
    const u=document.createElement("button");
    u.textContent="\u{1F6AA} Unrent";
    u.title="Give it back — all your placed items get deleted";
    u.style.cssText="flex:0 0 auto;border-color:var(--bad);color:var(--bad)";
    u.onclick=()=>{$("roomsModal").classList.remove("open");askUnrent(rm);};
    row.appendChild(u);
    list.appendChild(row);
  });
}
$("bRooms").onclick=()=>{renderRooms();$("roomsModal").classList.toggle("open");};
$("roomsClose").onclick=()=>$("roomsModal").classList.remove("open");
function eatSelected(){
  if(!MCD.pack.length){toast("\u{1F392} Your food backpack is empty!");return;}
  MCD.sel=Math.max(0,Math.min(MCD.pack.length-1,MCD.sel));
  const it=MCD.pack.splice(MCD.sel,1)[0];
  HUNGER.v=Math.min(100,HUNGER.v+it[1]);HUNGER.starveT=0;
  toast("\u{1F60B} "+it[0]+" — yummy! (+"+it[1]+")");
  renderPack();
}
$("bHunger").onclick=()=>{
  HUNGER.on=!HUNGER.on;
  $("bHunger").innerHTML="\u{1F354} Hunger: "+(HUNGER.on?"ON":"OFF");
  $("bHunger").classList.toggle("on",HUNGER.on);
  if(!HUNGER.on){HUNGER.v=100;HUNGER.starveT=0;}
  toast(HUNGER.on?"\u{1F354} Hunger ON — remember to eat!":"\u{1F6AB} Hunger OFF");
};
function updateHunger(dt){
  $("hungerRow").style.display=HUNGER.on?"flex":"none";
  if(!HUNGER.on)return;
  HUNGER.v=Math.max(0,HUNGER.v-dt*0.18);   // slow: full to hungry takes minutes
  let label;
  if(HUNGER.v>60)label="full";
  else if(HUNGER.v>35)label="little hungry";
  else if(HUNGER.v>15)label="hungry";
  else label="STARVING!";
  /* a big message pops up every time you get hungrier */
  const stage=HUNGER.v>60?0:HUNGER.v>35?1:HUNGER.v>15?2:3;
  if(stage!==HUNGER.stage){
    if(stage===1&&HUNGER.stage<1)toast("\u{1F354} You're a little hungry — grab a snack soon!");
    else if(stage===2&&HUNGER.stage<2)toast("\u{1F354} You're HUNGRY — eat something (\u{1F392} Food + R) or buy food!");
    else if(stage===3)toast("⚠️\u{1F354} You're STARVING! Eat NOW or you pass out in 30 seconds!");
    HUNGER.stage=stage;
  }
  if(HUNGER.v<=15){
    HUNGER.starveT+=dt;
    label="STARVING! "+Math.max(0,Math.ceil(30-HUNGER.starveT))+"s";
    if(HUNGER.starveT>=30){
      HUNGER.v=70;HUNGER.starveT=0;
      MCD.phase="idle";
      goSpawn();
      toast("\u{1F480} You starved! Back at spawn — go get some food!");
    }
  }else HUNGER.starveT=0;
  $("hungerFill").style.width=HUNGER.v+"%";
  $("hungerFill").style.background=HUNGER.v>35?"var(--good)":(HUNGER.v>15?"var(--acc)":"var(--bad)");
  $("hungerTxt").textContent="\u{1F354} "+label;
}
/* auto-drive used by the McDrive lane */
function mcdAutoDrive(v,tx,tz,sp,dt){
  const dx=tx-v.x,dz=tz-v.z,d=Math.hypot(dx,dz);
  if(d<1.3){v.speed=0;return true;}
  const tgt=Math.atan2(dx,dz);
  let dy=tgt-v.yaw;while(dy>Math.PI)dy-=Math.PI*2;while(dy<-Math.PI)dy+=Math.PI*2;
  v.yaw+=Math.max(-1.8*dt,Math.min(1.8*dt,dy));
  const s=Math.min(sp,2.5+d*0.8);
  v.x+=Math.sin(v.yaw)*s*dt;v.z+=Math.cos(v.yaw)*s*dt;
  v.speed=s;v.y=terrainH(v.x,v.z);v.grounded=true;
  v.mesh.position.set(v.x,v.y,v.z);v.mesh.rotation.set(0,v.yaw,0);
  for(const w of v.mesh.userData.wheels)w.spin.rotation.x+=s/w.r*dt;
  player.x=v.x;player.z=v.z;player.y=v.y;
  return false;
}
function updateMcd(dt){
  if(MCD.cd>0)MCD.cd-=dt;
  const v=myVehicle;
  if(S.world!=="earth"||!v)return;
  if(MCD.phase==="idle"){
    if(MCD.cd>0||player.drive!==v)return;
    for(const m of mcds){
      if(offScene(m.g))continue;
      if(Math.hypot(v.x-m.board.x,v.z-m.board.z)<6){
        MCD.phase="ordering";MCD.target=m;MCD.order=[];
        v.speed=0;renderMcdOrder();$("mcdModal").classList.add("open");
        toast("\u{1F354} Welcome to McDrive! Pick your food.");
        break;
      }
    }
  }else if(MCD.phase==="tofood"){
    if(mcdAutoDrive(v,MCD.target.window.x,MCD.target.window.z,5,dt)){
      MCD.phase="pickup";MCD.wait=2.5;
      toast("\u{1F9D1}‍\u{1F373} One moment... your food is coming!");
    }
  }else if(MCD.phase==="pickup"){
    MCD.wait-=dt;
    if(MCD.wait<=0){
      MCD.order.forEach(o=>MCD.pack.push(o));MCD.order=[];
      toast("\u{1F392} Food is in your backpack! Open \u{1F392} Food, pick an item, press R to eat.");
      MCD.phase="out";
    }
  }else if(MCD.phase==="out"){
    if(mcdAutoDrive(v,MCD.target.out.x,MCD.target.out.z,5,dt)){
      MCD.phase="idle";MCD.cd=14;
      toast("\u{1F697} You have the wheel again — enjoy your meal!");
    }
  }
}
/* ---------- hotel: renting, sleeping, sitting ---------- */
const RENT={list:[]};   // rented rooms: {id,x,z,ry,label}
const SIT={on:false,x:0,z:0,y:0,yaw:0};
function rentedAt(id){return RENT.list.find(r=>r.id===id);}
function nearFurn(list,r){
  let best=null,bd=1e9;
  for(let i=list.length-1;i>=0;i--){
    const f=list[i];
    if(offScene(f.g)){list.splice(i,1);continue;}
    if(f.y!==undefined&&Math.abs(player.y-f.y)>2.4)continue;   // right floor only
    const d=Math.hypot(player.x-f.x,player.z-f.z);
    if(d<r&&d<bd){best=f;bd=d;}
  }
  return best;
}
function gotoRoom(rm){
  switchWorld("earth");
  teleportTo(rm.x,rm.z);
  player.y=rm.ry+0.05;player.grounded=true;player.vy=0;
  toast("\u{1F6CE}️ Welcome to your room!");
}
/* jump YOUR clock forward to the next `hour`:00 — works everywhere, even on
   servers (there it moves your personal time-skew instead of the shared clock) */
function skipToMorning(hour){
  if(WORLD.name){
    const fwd=(((hour*60)-CLOCK.min)+1440)%1440||1440;
    CLOCK.skew=(CLOCK.skew||0)+fwd;
    try{localStorage.setItem("vc4skew",String(CLOCK.skew));}catch(e){}
    clockTick(0);   // apply the jump right away
  }else{
    if(CLOCK.min>=hour*60)CLOCK.day++;
    CLOCK.min=hour*60;
  }
}
function sleepNight(){
  skipToMorning(7);
  HUNGER.v=Math.max(HUNGER.v,40);HUNGER.starveT=0;   // breakfast included
  toast("\u{1F634} Zzz... Good morning! It's 07:00 on day "+CLOCK.day+" — the night is GONE!");
}
function tryFurniture(){
  if(!player.onFoot||S.world!=="earth")return false;
  if(SIT.on){SIT.on=false;toast("You stood up.");return true;}
  const dk=nearFurn(hotelDesks,3.2);
  if(dk){
    const mine=rentedAt(dk.id);
    if(mine){
      const opts=[{label:"\u{1F6CE}️ Go to "+(dk.mansion?"your mansion":dk.house?"your house":"your room"),value:"go"}];
      if(mine.mode==="rent")opts.push({label:"\u{1F4B0} SWITCH TO BUY — pay the rest: $"+fmtMoney(propBuyDue(mine))+" (your rent counted!)",value:"buy"});
      opts.push({label:"\u{1F6AA} UNRENT — give it back (your placed items get deleted)",value:"unrent"},
        {label:"❌ Close",value:"x"});
      showDest(mine.label,opts,a=>{
        if(a==="go")gotoRoom(dk.room);
        else if(a==="buy")switchToBuy(mine);
        else if(a==="unrent")askUnrent(mine);
      });
    }
    else openPropertyDesk(dk);
    return true;
  }
  /* the concert tip hat: collect your earnings */
  for(let i=pianos.length-1;i>=0;i--){
    const p2=pianos[i];
    if(offScene(p2.g)){pianos.splice(i,1);continue;}
    if(p2.hat&&(p2.hatMoney||0)>0&&Math.abs(player.y-p2.y)<3&&Math.hypot(player.x-p2.hat.x,player.z-p2.hat.z)<2.4){
      addMoney(p2.hatMoney);
      toast("\u{1F3A9}\u{1F4B5} You collected $"+p2.hatMoney+" from the hat — great show!");
      p2.hatMoney=0;
      ACH.flags.concert=true;saveAch();
      if(p2.hatBills)p2.hatBills.visible=false;
      return true;
    }
  }
  /* the TV: pick a channel */
  if(nearTv()){openTvMenu();return true;}
  /* pianos: sit down and play (computer keyboard or a real MIDI keyboard) */
  const pn=nearFurn(pianos,4.5);
  if(pn){openPiano(pn);return true;}
  const ex=nearFurn(roomExits,2.2);
  if(ex){
    player.x=ex.outX;player.z=ex.outZ;player.y=ex.outY;
    player.grounded=true;player.vy=0;
    toast("\u{1F6AA} Back down at the street.");
    return true;
  }
  const bd=nearFurn(hotelBeds,2.8);
  if(bd){
    if(!rentedAt(bd.id))toast("\u{1F6CE}️ Rent this room first at the RECEPTION downstairs.");
    else if(!isNight())toast("\u{1F31E} It's still daytime — you can only sleep at night!");
    else sleepNight();
    return true;
  }
  const ch=nearFurn(chairs,2.2);
  if(ch){
    SIT.on=true;SIT.x=ch.x;SIT.z=ch.z;SIT.y=ch.y;SIT.yaw=ch.yaw;
    toast("\u{1FA91} Sitting down — press T (or walk) to stand up.");
    return true;
  }
  /* standing in YOUR apartment room: order food to your door! */
  if(player.onFoot&&myRoomHere()){openOrderMenu();return true;}
  return false;
}
/* ================= JOBS: taxi, food delivery & tow truck ================= */
const JOB={type:null,stage:0,t:0,tx:0,tz:0,reward:0,count:0,total:0,label:""};
const jobBeacon=(function(){
  const g=new THREE.Group();
  const cyl=new THREE.Mesh(new THREE.CylinderGeometry(5,5,34,14,1,true),
    new THREE.MeshBasicMaterial({color:0xffb02e,transparent:true,opacity:0.35,side:THREE.DoubleSide}));
  cyl.position.y=17;g.add(cyl);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(5,0.4,8,22),new THREE.MeshBasicMaterial({color:0xffb02e}));
  ring.rotation.x=Math.PI/2;ring.position.y=0.8;g.add(ring);
  g.visible=false;scene.add(g);return g;
})();
let jobPassenger=null;   // the taxi passenger standing at the kerb
function jobTarget(x,z,label){
  JOB.tx=x;JOB.tz=z;JOB.label=label;
  jobBeacon.position.set(x,terrainH(x,z),z);jobBeacon.visible=true;
  setRoute(x,z);
}
function jobRoadPoint(minD,maxD){
  /* a random spot ON a grid road, minD..maxD meters away */
  for(let i=0;i<14;i++){
    const a=Math.random()*Math.PI*2,d=minD+Math.random()*(maxD-minD);
    let x=player.x+Math.sin(a)*d,z=player.z+Math.cos(a)*d;
    if(Math.random()<0.5)x=Math.round((x-30)/120)*120+30+10;   // beside a N-S road
    else z=Math.round((z-30)/120)*120+30+10;                    // beside an E-W road
    if(baseH(x,z)>-1&&baseH(x,z)<15&&!inAirport(x,z))return{x,z};
  }
  return{x:player.x+minD,z:player.z};
}
function endJob(silent){
  JOB.type=null;jobBeacon.visible=false;
  if(jobPassenger){scene.remove(jobPassenger);disposeGroup(jobPassenger);jobPassenger=null;}
  if(JOB.run){scene.remove(JOB.run.mesh);disposeGroup(JOB.run.mesh);JOB.run=null;}
  if(JOB.oldMesh&&myVehicle){
    /* the police cruiser turns back into your own car */
    scene.remove(myVehicle.mesh);disposeGroup(myVehicle.mesh);
    myVehicle.mesh=JOB.oldMesh;
    scene.add(myVehicle.mesh);
    JOB.oldMesh=null;
  }
  navStop(true);
  if(!silent)toast("\u{1F4BC} Job ended. Total earned this shift: $"+fmtMoney(JOB.total));
}
/* every job starts with a DIFFICULTY pick: harder = further away & less time, but MUCH better pay */
function pickJob(type){
  $("jobsModal").classList.remove("open");
  showDest("\u{1F4BC} "+type.toUpperCase()+" — how hard do you want it?",[
    {label:"\u{1F7E2} EASY — normal targets, normal pay",value:"e"},
    {label:"\u{1F7E0} HARD — targets 2x further, PAY x2",value:"h"},
    {label:"\u{1F534} EXPERT — far & fast, PAY x3.5!!",value:"x"},
    {label:"❌ Cancel",value:"cancel"}
  ],v=>{
    if(v==="cancel")return;
    JOB.mult=v==="e"?1:v==="h"?2:3.5;
    JOB.dmul=v==="e"?1:v==="h"?1.7:2.4;
    startJob(type);
  });
}
function startJob(type){
  $("jobsModal").classList.remove("open");
  if(!player.drive||player.drive!==myVehicle||myVehicle.type==="bike"){
    toast("\u{1F697} Get in a car or on a motorcycle first — then start the job!");
    return;
  }
  JOB.mult=JOB.mult||1;JOB.dmul=JOB.dmul||1;
  JOB.type=type;JOB.stage=0;JOB.count=0;JOB.total=0;JOB.t=0;
  if(type==="taxi"){
    const p=jobRoadPoint(120,350);
    jobPassenger=makePerson(0.95);
    jobPassenger.position.set(p.x,terrainH(p.x,p.z),p.z);
    scene.add(jobPassenger);
    jobTarget(p.x,p.z,"\u{1F696} Pick up the passenger");
    toast("\u{1F696} TAXI SHIFT — a passenger is waiting! Follow the route and stop next to them.");
  }else if(type==="deliver"){
    const m=nearestSpot(function(i,j){return mcdSpot(i,j);},MCSP,46,90,5);
    if(!m){toast("No McDrive found nearby!");JOB.type=null;return;}
    JOB.t=Math.round(300/(JOB.dmul||1));   // less time on harder tiers
    jobTarget(m.sp.x,m.sp.z,"\u{1F354} Pick up the food");
    toast("\u{1F354} DELIVERY JOB — pick up 3 meals at the McDrive, then deliver them. "+Math.round(JOB.t/60)+" minutes on the clock!");
  }else if(type==="tow"){
    let acc=EVENTS.list.find(e=>e.type==="accident");
    if(!acc){spawnEvent("accident");acc=EVENTS.list.find(e=>e.type==="accident");}
    if(!acc){toast("No accidents right now — lucky city! Try again in a bit.");JOB.type=null;return;}
    JOB.acc=acc;
    jobTarget(acc.x,acc.z,"\u{1F69B} Drive to the accident");
    toast("\u{1F69B} TOW TRUCK JOB — get to the accident and stop next to the wrecks!");
  }else if(type==="truck"){
    /* your car becomes a big rig with a cargo container */
    JOB.oldMesh=myVehicle.mesh;
    scene.remove(JOB.oldMesh);
    myVehicle.mesh=buildTruckMesh();
    scene.add(myVehicle.mesh);
    const m=nearestSpot(function(i,j){return hugeShopSpot(i,j);},HSP,750,390,3);
    if(!m){toast("No MEGA MART depot found nearby!");endJob(true);return;}
    JOB.stage=0;JOB.damage=0;JOB.lastSp=0;
    jobTarget(m.sp.x,m.sp.z+50,"\u{1F4E6} Pick up the cargo at the MEGA MART depot");
    toast("\u{1F69B}\u{1F4E6} TRUCKER JOB — you've got a BIG RIG now! Collect cargo at the depot. Drive SMOOTHLY: crashes damage the cargo!");
  }else if(type==="police"){
    /* your car transforms into a real police cruiser for the shift */
    JOB.oldMesh=myVehicle.mesh;
    scene.remove(JOB.oldMesh);
    myVehicle.mesh=buildEmergencyMesh("police");
    scene.add(myVehicle.mesh);
    jobBeacon.visible=true;
    spawnRunaway();
    toast("\u{1F46E}\u{1F694} POLICE SHIFT ON — your car is a cruiser now! Chase the getaway car and stay close to BUST it ($200 each)!");
  }
}
/* nearestSpot for jobs (the map sidebar has its own local copy) */
function nearestSpot(spotFn,cell,ox,oz,range){
  const ci=Math.round((player.x-ox)/cell),cj=Math.round((player.z-oz)/cell);
  let best=null;
  for(let i=ci-range;i<=ci+range;i++)for(let j=cj-range;j<=cj+range;j++){
    const sp=spotFn(i,j);
    if(!sp)continue;
    const d=Math.hypot(sp.x-player.x,sp.z-player.z);
    if(!best||d<best.d)best={sp,d};
  }
  return best;
}
function updateJob(dt){
  if(!JOB.type)return;
  if(!player.drive||player.drive!==myVehicle){endJob();return;}
  jobBeacon.rotation.y+=dt*1.4;
  if(JOB.type==="police"){updatePoliceJob(dt);return;}
  /* trucker: hard hits damage the cargo */
  if(JOB.type==="truck"&&JOB.stage===1){
    const sp2=Math.abs(myVehicle.speed);
    if(JOB.lastSp-sp2>11&&JOB.lastSp>14){
      JOB.damage=Math.min(4,(JOB.damage||0)+1);
      toast("\u{1F4A5}\u{1F4E6} OUCH — the cargo got damaged! ("+JOB.damage+"/4 — each dent costs 20% pay)");
    }
    JOB.lastSp=sp2;
  }
  const d=Math.hypot(player.x-JOB.tx,player.z-JOB.tz);
  const stopped=Math.abs(myVehicle.speed)<1.5;
  const el=$("navDist");
  el.style.display="flex";
  if(JOB.type==="deliver"){
    JOB.t-=dt;
    if(JOB.t<=0){toast("⏰ Time's up! The food got cold — delivery job over.");endJob(true);return;}
  }
  $("navTxt").textContent=JOB.label+" · "+(d<1000?Math.round(d)+" m":(d/1000).toFixed(1)+" km")
    +(JOB.type==="deliver"?" · ⏰ "+Math.ceil(JOB.t)+"s":"")+(JOB.total?" · $"+fmtMoney(JOB.total):"");
  if(d>14||!stopped)return;
  /* arrived & stopped */
  /* 🎄 December: every delivery/job payout is DOUBLED — Christmas rush! */
  const jm=x=>Math.round(x*(JOB.mult||1)*(new Date().getMonth()===11?2:1));
  if(JOB.type==="taxi"){
    if(JOB.stage===0){
      if(jobPassenger){scene.remove(jobPassenger);disposeGroup(jobPassenger);jobPassenger=null;}
      const dest=jobRoadPoint(300*(JOB.dmul||1),800*(JOB.dmul||1));
      JOB.fare=Math.max(30,Math.round(Math.hypot(dest.x-player.x,dest.z-player.z)*0.12*(JOB.mult||1)/(JOB.dmul||1)/5)*5);
      JOB.stage=1;
      jobTarget(dest.x,dest.z,"\u{1F696} Drop off — fare $"+JOB.fare);
      toast("\u{1F44B} Passenger aboard! Take them to the blue route's end for $"+JOB.fare+".");
    }else{
      const cm=coopMult();
      addMoney(JOB.fare*cm);JOB.total+=JOB.fare*cm;JOB.count++;
      toast("\u{1F4B0} Fare paid: $"+(JOB.fare*cm)+(cm>1?" \u{1F91D} CO-OP x2!":"")+" Passengers so far: "+JOB.count+". Next one is waiting...");
      const p=jobRoadPoint(120,350);
      jobPassenger=makePerson(0.95);
      jobPassenger.position.set(p.x,terrainH(p.x,p.z),p.z);
      scene.add(jobPassenger);
      JOB.stage=0;
      jobTarget(p.x,p.z,"\u{1F696} Pick up the passenger");
    }
  }else if(JOB.type==="deliver"){
    if(JOB.stage===0){
      JOB.stage=1;JOB.count=0;
      const h=jobRoadPoint(200,500);
      jobTarget(h.x,h.z,"\u{1F3E0} Delivery 1 of 3");
      toast("\u{1F35F} Food loaded! Deliver 3 meals before the clock runs out — $40 each, $80 bonus for all 3!");
    }else{
      JOB.count++;
      const cm=coopMult();
      addMoney(jm(40)*cm);JOB.total+=jm(40)*cm;
      if(JOB.count>=3){
        addMoney(jm(80)*cm);JOB.total+=jm(80)*cm;
        toast("\u{1F3C6} ALL 3 DELIVERED with "+Math.ceil(JOB.t)+"s left — +$"+(jm(80)*cm)+" bonus"+(cm>1?" \u{1F91D} CO-OP x2!":"!")+" Starting a new run...");
        JOB.stage=0;JOB.t=Math.round(300/(JOB.dmul||1));
        const m=nearestSpot(function(i,j){return mcdSpot(i,j);},MCSP,46,90,5);
        if(m)jobTarget(m.sp.x,m.sp.z,"\u{1F354} Pick up the food");else endJob();
      }else{
        toast("\u{1F4E6} Delivered! +$"+jm(40)+" — "+(3-JOB.count)+" to go!");
        const h=jobRoadPoint(200*(JOB.dmul||1),500*(JOB.dmul||1));
        jobTarget(h.x,h.z,"\u{1F3E0} Delivery "+(JOB.count+1)+" of 3");
      }
    }
  }else if(JOB.type==="truck"){
    if(JOB.stage===0){
      /* cargo loaded: haul it to a gas station depot far away */
      const cands=[];
      const ci=Math.round((player.x-286)/GSP),cj=Math.round((player.z-150)/GSP);
      for(let i=ci-3;i<=ci+3;i++)for(let j=cj-3;j<=cj+3;j++){
        const s=gasSpot(i,j);
        if(!s)continue;
        const dd=Math.hypot(s.x-player.x,s.z-player.z);
        if(dd>350&&dd<1600)cands.push({s,dd});
      }
      if(!cands.length){toast("No delivery depot in range — try elsewhere!");endJob(true);return;}
      const pick=cands[Math.floor(Math.random()*cands.length)];
      JOB.stage=1;JOB.damage=0;JOB.lastSp=0;JOB.haul=Math.round(pick.dd*0.15*(JOB.mult||1)/5)*5;
      jobTarget(pick.s.x,pick.s.z,"\u{1F69B} Deliver the cargo — $"+JOB.haul+" ("+fmtDist(pick.dd)+")");
      toast("\u{1F4E6} Cargo loaded! Haul it "+fmtDist(pick.dd)+" for $"+JOB.haul+" — no crashing!");
    }else{
      const cm=coopMult();
      const pay=Math.max(20,Math.round(JOB.haul*(1-0.2*(JOB.damage||0))))*cm;
      addMoney(pay);JOB.total+=pay;JOB.count++;
      toast("\u{1F4B0} Cargo delivered — $"+fmtMoney(pay)+(JOB.damage?" (−"+JOB.damage*20+"% for dents!)":" in PERFECT condition!")+(cm>1?" \u{1F91D} CO-OP x2!":"")+" New load waiting...");
      const m=nearestSpot(function(i,j){return hugeShopSpot(i,j);},HSP,750,390,3);
      if(m){JOB.stage=0;jobTarget(m.sp.x,m.sp.z+50,"\u{1F4E6} Pick up the cargo at the MEGA MART depot");}
      else endJob();
    }
  }else if(JOB.type==="story"){
    const m=STORY_MISSIONS[STORY.step];
    if(!m){endJob(true);return;}
    if(JOB.stage===0){
      if(jobPassenger){scene.remove(jobPassenger);disposeGroup(jobPassenger);jobPassenger=null;}
      JOB.stage=1;
      const dest=jobRoadPoint(400,900);
      jobTarget(dest.x,dest.z,"\u{1F4D6} Take "+m.who+" there — $"+m.pay);
      toast("\u{1F4AC} "+m.who+": \""+m.say+"\"");
    }else{
      addMoney(m.pay);JOB.total+=m.pay;
      STORY.step++;
      try{localStorage.setItem("vc4story",String(STORY.step));}catch(e){}
      if(STORY.step>=STORY_MISSIONS.length){
        addMoney(5000);
        pushNews("\u{1F4D6} "+mpName()+" finished the CABBIE STORY — the Mayor paid a $5,000 hero bonus!");
        toast("\u{1F3C6}\u{1F4D6} THE END! +$"+m.pay+" and the Mayor hands you a $5,000 BONUS — Carl the Cabbie, hero of Car City!");
      }else{
        toast("\u{1F4AC} "+m.who+": \"Thanks, Carl!\" +$"+m.pay+" — Chapter "+(STORY.step+1)+" is waiting in \u{1F4BC} Jobs!");
      }
      endJob(true);
      return;
    }
  }else if(JOB.type==="tow"){
    if(JOB.stage===0){
      /* hook up the wreck: the accident disappears */
      if(JOB.acc){
        const i=EVENTS.list.indexOf(JOB.acc);
        if(i>=0){scene.remove(JOB.acc.g);disposeGroup(JOB.acc.g);EVENTS.list.splice(i,1);}
        JOB.acc=null;
      }
      JOB.stage=1;
      const g=nearestSpot(function(i,j){return gasSpot(i,j);},GSP,286,150,5);
      const t=g?g.sp:{x:player.x+300,z:player.z};
      jobTarget(t.x,t.z,"\u{1F69B} Tow the wreck to the garage");
      toast("\u{1F517} Wreck hooked up! Tow it to the garage (gas station) for $150.");
    }else{
      const cm=coopMult();
      addMoney(jm(150)*cm);JOB.total+=jm(150)*cm;JOB.count++;
      toast("\u{1F4B0} Wreck delivered — +$"+(jm(150)*cm)+(cm>1?" \u{1F91D} CO-OP x2":"")+"! Looking for the next accident...");
      let acc=EVENTS.list.find(e=>e.type==="accident");
      if(!acc){spawnEvent("accident");acc=EVENTS.list.find(e=>e.type==="accident");}
      if(acc){JOB.acc=acc;JOB.stage=0;jobTarget(acc.x,acc.z,"\u{1F69B} Drive to the accident");}
      else endJob();
    }
  }
}
$("bJobs").onclick=()=>{
  if(S.mode!=="game"){toast("Start driving first!");return;}
  if(JOB.type){endJob();return;}
  $("jobsModal").classList.add("open");
};
$("jobsClose").onclick=()=>$("jobsModal").classList.remove("open");
$("jobTaxi").onclick=()=>pickJob("taxi");
$("jobDeliver").onclick=()=>pickJob("deliver");
$("jobTow").onclick=()=>pickJob("tow");
$("jobPolice").onclick=()=>pickJob("police");
$("jobTruck").onclick=()=>pickJob("truck");
$("jobStory").onclick=()=>startStory();
/* ================= 📖 STORY MODE: Carl the Cabbie ================= */
const STORY={step:parseInt(localStorage.getItem("vc4story")||"0",10)||0};
const STORY_MISSIONS=[
  {who:"Grandma Rosie",say:"To the MEGA MART, dearie — my dumpling collection won't grow itself. And step on it!",pay:300},
  {who:"Robo-Bob the inventor",say:"My rocket test is in five minutes!! If we're late the whole thing goes BOOM. Probably. GO GO GO!",pay:500},
  {who:"Popstar Lila",say:"My concert starts soon and 10,000 fans are waiting. Get me there without a single scratch, please!",pay:800},
  {who:"Detective Max",say:"Shhh... I'm following the dumpling smugglers. Drive natural. Act normal. DON'T look at the black car.",pay:1200},
  {who:"The Mayor",say:"Carl, Car City needs heroes like you. Take me to my big speech — the whole city is watching!",pay:2000}
];
function startStory(){
  $("jobsModal").classList.remove("open");
  if(STORY.step>=STORY_MISSIONS.length){
    toast("\u{1F4D6}\u{1F3C6} You already finished Carl's story — what a legend! (More chapters in a future update!)");
    return;
  }
  if(!player.drive||player.drive!==myVehicle||myVehicle.type==="bike"){
    toast("\u{1F697} Get in a car first — Carl the Cabbie needs wheels!");
    return;
  }
  JOB.type="story";JOB.stage=0;JOB.count=0;JOB.total=0;JOB.t=0;JOB.mult=1;JOB.dmul=1;
  const m=STORY_MISSIONS[STORY.step];
  const p=jobRoadPoint(150,400);
  jobPassenger=makePerson(0.95);
  jobPassenger.position.set(p.x,terrainH(p.x,p.z),p.z);
  scene.add(jobPassenger);
  jobTarget(p.x,p.z,"\u{1F4D6} Chapter "+(STORY.step+1)+": pick up "+m.who);
  toast("\u{1F4D6} CHAPTER "+(STORY.step+1)+" of 5 — "+m.who+" is waiting for Carl the Cabbie (that's YOU)!");
}
/* ---------- daily reward + streak (shares the real-world calendar) ---------- */
function dailyReward(){
  let d=null;
  try{d=JSON.parse(localStorage.getItem("vc4daily")||"null");}catch(e){}
  const today=new Date().toISOString().slice(0,10);
  if(d&&d.date===today)return;
  const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
  const streak=(d&&d.date===yesterday)?(d.streak||0)+1:1;
  const reward=Math.min(1000,100*streak);
  addMoney(reward);
  try{localStorage.setItem("vc4daily",JSON.stringify({date:today,streak}));}catch(e){}
  toast("\u{1F381} DAILY REWARD: $"+reward+" — day "+streak+" in a row!"+(streak<10?" Come back tomorrow for more!":" MAX streak!"));
}
/* ---------- scratch cards at the gas station kiosk ---------- */
function scratchCard(){
  if(MONEY.v<50){toast("\u{1F4B0} A scratch card costs $50 — you have $"+fmtMoney(MONEY.v)+".");return;}
  MONEY.v-=50;
  const r=Math.random();
  let win=0;
  if(r<0.02)win=5000;else if(r<0.10)win=500;else if(r<0.30)win=100;else if(r<0.60)win=25;
  if(win>0){addMoney(win);toast(win>=500?"\u{1F3B0}\u{1F929} JACKPOT!! Your scratch card won $"+fmtMoney(win)+"!!":"\u{1F3B0} Scratch scratch... you won $"+win+"!");}
  else{updateMoneyUI();saveGame();toast("\u{1F3B0} Scratch scratch... nothing this time. Better luck next card!");}
}
/* ---------- your pet: puppy, kitten or parrot — with a NAME and TRICKS ---------- */
const PET={type:localStorage.getItem("vc4pet")||null,name:localStorage.getItem("vc4petname")||"",mesh:null,x:0,z:0,trick:null,trickT:0,boneT:30};
function petName(){return PET.name||(PET.type==="dog"?"Puppy":PET.type==="cat"?"Kitten":"Polly");}
function makeParrot(){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.SphereGeometry(0.16,8,7),new THREE.MeshLambertMaterial({color:0xd7263d}));
  body.scale.set(0.8,1.1,1);body.position.y=0.2;g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.1,8,7),new THREE.MeshLambertMaterial({color:0x1b98e0}));
  head.position.set(0,0.4,0.06);g.add(head);
  const beak=new THREE.Mesh(new THREE.ConeGeometry(0.04,0.1,6),new THREE.MeshLambertMaterial({color:0xf4d35e}));
  beak.rotation.x=Math.PI/2;beak.position.set(0,0.39,0.17);g.add(beak);
  [[-0.13],[0.13]].forEach(p=>{
    const w=new THREE.Mesh(new THREE.SphereGeometry(0.1,7,6),new THREE.MeshLambertMaterial({color:0x2ec4b6}));
    w.scale.set(0.4,0.8,1);w.position.set(p[0],0.2,0);g.add(w);
  });
  const tail=new THREE.Mesh(new THREE.ConeGeometry(0.06,0.3,5),new THREE.MeshLambertMaterial({color:0x8ac926}));
  tail.rotation.x=1.9;tail.position.set(0,0.12,-0.2);g.add(tail);
  return g;
}
function openPetMenu(){
  showDest("\u{1F43E} "+petName()+" — your "+(PET.type==="dog"?"puppy":PET.type==="cat"?"kitten":"parrot"),[
    {label:"\u{1FA91} Sit!",value:"sit"},
    {label:"\u{1F300} Spin!",value:"spin"},
    {label:"✋ High-five!",value:"high5"},
    {label:"✏️ Rename "+petName(),value:"rename"},
    {label:"❌ Good "+(PET.type==="dog"?"boy":"buddy")+"!",value:"cancel"}
  ],v=>{
    if(v==="cancel")return;
    if(v==="rename"){
      const s=prompt("What's your pet's name?",PET.name);
      if(s&&s.trim()){
        PET.name=s.trim().slice(0,12);
        try{localStorage.setItem("vc4petname",PET.name);}catch(e){}
        toast("\u{1F49B} From now on: "+PET.name+"!");
      }
      return;
    }
    PET.trick=v;PET.trickT=v==="sit"?4:2.2;
    toast(v==="sit"?"\u{1FA91} "+petName()+" sits like a champion!"
      :v==="spin"?"\u{1F300} "+petName()+" spins around — wheee!"
      :"✋ "+petName()+" jumps up for a HIGH-FIVE! \u{1F389}");
  });
}
function makeDog(){const g=makeQuad(0xc9a35a,0.36,0.32,0.7,0.26,0xb8924a);
  const t=new THREE.Mesh(new THREE.ConeGeometry(0.07,0.4,6),new THREE.MeshLambertMaterial({color:0xc9a35a}));
  t.rotation.x=1.1;t.position.set(0,0.55,-0.45);g.add(t);
  [[-0.1],[0.1]].forEach(p=>{const e=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.16,0.04),new THREE.MeshLambertMaterial({color:0xb8924a}));e.position.set(p[0],0.66,0.32);g.add(e);});
  return g;}
function makeCat(){const g=makeQuad(0x3a3a3a,0.3,0.26,0.6,0.22,0x2c2c2c);
  const t=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.05,0.5),new THREE.MeshLambertMaterial({color:0x3a3a3a}));
  t.rotation.x=1.3;t.position.set(0,0.5,-0.42);g.add(t);
  [[-0.08],[0.08]].forEach(p=>{const e=new THREE.Mesh(new THREE.ConeGeometry(0.06,0.12,4),new THREE.MeshLambertMaterial({color:0x3a3a3a}));e.position.set(p[0],0.56,0.24);g.add(e);});
  return g;}
function spawnPetMesh(){
  if(PET.mesh){scene.remove(PET.mesh);disposeGroup(PET.mesh);PET.mesh=null;}
  if(!PET.type)return;
  PET.mesh=PET.type==="dog"?makeDog():PET.type==="cat"?makeCat():makeParrot();
  PET.x=player.x+2;PET.z=player.z+2;
  scene.add(PET.mesh);
}
function buyPet(type,price){
  if(MONEY.v<price){toast("\u{1F4B0} That costs $"+price+"!");return;}
  MONEY.v-=price;updateMoneyUI();saveGame();
  PET.type=type;
  try{localStorage.setItem("vc4pet",type);}catch(e){}
  spawnPetMesh();
  const s=prompt("What will you name your new "+(type==="dog"?"puppy":type==="cat"?"kitten":"parrot")+"?","");
  if(s&&s.trim()){PET.name=s.trim().slice(0,12);try{localStorage.setItem("vc4petname",PET.name);}catch(e){}}
  toast(type==="dog"?"\u{1F436} WOOF! "+petName()+" will follow you everywhere — press T next to them for TRICKS!"
    :type==="cat"?"\u{1F431} MEOW! "+petName()+" will follow you everywhere — press T next to them for TRICKS!"
    :"\u{1F99C} SQUAWK! "+petName()+" sits on your SHOULDER!");
}
function updatePet(dt){
  if(!PET.type)return;
  if(!PET.mesh||offScene(PET.mesh))spawnPetMesh();
  const m=PET.mesh;
  if(S.world!=="earth"||CAVE.in){m.visible=false;return;}
  m.visible=true;
  const now=performance.now();
  /* the parrot rides on your SHOULDER */
  if(PET.type==="parrot"){
    const yaw=player.yaw;
    PET.x=player.x-Math.sin(yaw+Math.PI/2)*0.34-Math.sin(yaw)*0.1;
    PET.z=player.z-Math.cos(yaw+Math.PI/2)*0.34-Math.cos(yaw)*0.1;
    m.position.set(PET.x,player.y+1.55+Math.sin(now/500)*0.03,PET.z);
    m.rotation.y=yaw+(PET.trick==="spin"?now/80:0);
    if(PET.trick){PET.trickT-=dt;if(PET.trickT<=0)PET.trick=null;}
    return;
  }
  /* tricks! */
  if(PET.trick){
    PET.trickT-=dt;
    if(PET.trick==="spin")m.rotation.y+=dt*11;
    else if(PET.trick==="sit"){m.rotation.x=-0.5;m.position.y=terrainH(PET.x,PET.z)-0.06;}
    else if(PET.trick==="high5")m.position.y=terrainH(PET.x,PET.z)+Math.abs(Math.sin(now/130))*0.7;
    if(PET.trickT<=0){PET.trick=null;m.rotation.x=0;}
    if(PET.trick==="sit")return;   // sitting pets stay put
  }
  const tx=player.x-Math.sin(player.yaw)*2.2+1,tz=player.z-Math.cos(player.yaw)*2.2;
  const dx=tx-PET.x,dz=tz-PET.z,d=Math.hypot(dx,dz);
  if(d>60){PET.x=tx;PET.z=tz;}   // teleported away: pet catches up instantly
  else if(d>1.2){
    const sp=Math.min(14,2+d*1.1);
    PET.x+=dx/d*sp*dt;PET.z+=dz/d*sp*dt;
    m.rotation.y=Math.atan2(dx,dz);
  }
  const bounce=d>1.2?Math.abs(Math.sin(now/120))*0.16:0;
  if(!PET.trick)m.position.set(PET.x,terrainH(PET.x,PET.z)+bounce,PET.z);
  /* dogs & cats DIG UP BONES on island beaches! */
  PET.boneT-=dt;
  if(PET.boneT<=0){
    PET.boneT=50+Math.random()*40;
    const isl=nearIsland(PET.x,PET.z);
    if(isl&&Math.hypot(PET.x-isl.x,PET.z-isl.z)<80&&Math.random()<0.7){
      PET.trick="high5";PET.trickT=1.5;   // digging wiggle
      addMoney(25);
      toast("\u{1F9B4} "+petName()+" dug up a buried bone on the beach — +$25! Good "+(PET.type==="dog"?"dog":"cat")+"!");
    }
  }
}
/* ================= PROPERTY: buy or rent apartments & mansions ================= */
const MANSION_PRICE=2000000,MANSION_RENT=1000;   // $2M to buy, or $1K per game day
const PRENT={on:false};                           // ✈️ rented plane: $250 per game day
const HRENT={on:false};                           // 🚁 rented helicopter: $500 per game day
const APT_PRICE=100000,APT_RENT=100;             // $100K to buy, or $100 per game day
const HOUSE_PRICE=500000,HOUSE_RENT=250;         // 🏡 family house: $500K to buy, or $250 per game day
/* ---- online claims: once a player owns a property, nobody else can buy it ---- */
function fbKey(s){return String(s).replace(/[^a-zA-Z0-9_-]/g,"_");}
async function fbGet(path){
  try{
    const r=await fetch(SERVER_API+path+".json",{cache:"no-store"});
    if(!r.ok)return{ok:false};
    return{ok:true,data:await r.json()};
  }catch(e){return{ok:false};}
}
async function fbPut(path,val){
  try{
    const r=await fetch(SERVER_API+path+".json",{method:"PUT",body:JSON.stringify(val)});
    return r.ok;
  }catch(e){return false;}
}
function claimPath(id){return "/claims/"+mpWorldKey()+"/"+fbKey(id);}
async function checkClaim(id){
  if(!SERVER_READY)return{res:"free"};
  const g=await fbGet(claimPath(id));
  if(g.ok&&g.data&&!g.data.free){
    if(g.data.t===myToken())return{res:"mine"};
    return{res:"taken",name:g.data.n||"another player"};
  }
  return{res:"free"};
}
/* the claim record also carries your mansion's furniture + dumpling shop,
   so other players see your place exactly how you decorated it */
const MYSHOP={};   // mansion id -> dumpling shop price
try{Object.assign(MYSHOP,JSON.parse(localStorage.getItem("vc4shops")||"{}"));}catch(e){}
function saveShops(){try{localStorage.setItem("vc4shops",JSON.stringify(MYSHOP))}catch(e){}}
function claimBody(id){
  const b={t:myToken(),n:mpName(),ts:Date.now()};
  const items=MFURN.get(id);
  if(items){
    const s=JSON.stringify(items.slice(0,80));
    if(s.length<=6000)b.furn=s;
  }
  if(MYSHOP[id])b.shop=MYSHOP[id];
  return b;
}
function syncClaim(id){if(SERVER_READY)fbPut(claimPath(id),claimBody(id));}
async function writeClaim(id){
  if(!SERVER_READY)return true;
  if(await fbPut(claimPath(id),claimBody(id)))return true;
  /* write refused: either another player owns it, or the database still runs old rules */
  const g=await fbGet(claimPath(id));
  if(g.ok&&g.data&&!g.data.free&&g.data.t!==myToken())return false;
  return true;   // old rules — claims can't be stored yet, so allow the purchase locally
}
const CLAIMCACHE=new Map();
async function fetchClaim(id){
  if(CLAIMCACHE.has(id))return CLAIMCACHE.get(id);
  CLAIMCACHE.set(id,null);
  const g=await fbGet(claimPath(id));
  const d=(g.ok&&g.data&&!g.data.free)?g.data:null;
  CLAIMCACHE.set(id,d);
  return d;
}
function releaseClaim(id){
  if(!SERVER_READY)return;
  fbPut(claimPath(id),{t:myToken(),n:mpName(),ts:Date.now(),free:true});
}
function mkRentEntry(dk,mode,rate){
  return{id:dk.id,x:dk.room.x,z:dk.room.z,ry:dk.room.ry,mode,rate,
    label:(dk.mansion?"\u{1F3F0} MEGA MANSION at (":dk.house?"\u{1F3E1} FAMILY HOUSE at (":"\u{1F6CE}️ Room at (")+Math.round(dk.room.x)+", "+Math.round(dk.room.z)+")"
      +(mode==="rent"?" · $"+fmtMoney(rate)+"/day":"")};
}
function openPropertyDesk(dk){
  const buy=dk.mansion?MANSION_PRICE:dk.house?HOUSE_PRICE:APT_PRICE,rate=dk.mansion?MANSION_RENT:dk.house?HOUSE_RENT:APT_RENT;
  showDest(dk.mansion?"\u{1F3F0} MEGA MANSION — buy or rent?":dk.house?"\u{1F3E1} FAMILY HOUSE — buy or rent?":"\u{1F6CE}️ Apartment room — buy or rent?",[
    {label:"\u{1F4B0} BUY — $"+fmtMoney(buy)+" (yours forever)",value:"own"},
    {label:"\u{1F511} RENT — $"+fmtMoney(rate)+" per day",value:"rent"},
    {label:"❌ Cancel",value:"cancel"}
  ],async mode=>{
    if(mode==="cancel")return;
    const price=mode==="own"?buy:rate;
    const claim=await checkClaim(dk.id);
    if(claim.res==="taken"){
      toast("\u{1F512} Sorry — this "+(dk.mansion?"mansion":"room")+" is already owned by "+claim.name+"!");
      return;
    }
    if(claim.res==="mine"){
      RENT.list.push(mkRentEntry(dk,"own",0));
      toast("\u{1F511} This place is already YOURS on this server — welcome back!");
      saveGame();gotoRoom(dk.room);
      return;
    }
    if(MONEY.v<price){
      toast("\u{1F4B0} You need $"+fmtMoney(price)+" — you only have $"+fmtMoney(MONEY.v)+". Sell dumplings, win races, give concerts!");
      return;
    }
    if(!await writeClaim(dk.id)){toast("\u{1F512} Another player claimed it just before you!");return;}
    MONEY.v-=price;updateMoneyUI();profileSave(true);
    const ent=mkRentEntry(dk,mode,mode==="rent"?rate:0);
    if(mode==="rent")ent.paid=rate;   // rent you've paid counts toward buying it later
    RENT.list.push(ent);
    toast(mode==="own"
      ?(dk.mansion?"\u{1F389}\u{1F3F0} SOLD! The MEGA MANSION is yours — press T inside to edit & furnish it!"
        :dk.house?"\u{1F389}\u{1F3E1} SOLD! The FAMILY HOUSE is yours — press T inside to furnish the rooms AND the garden!"
        :"\u{1F389} You BOUGHT this room for $"+fmtMoney(buy)+" — it's yours forever!")
      :"\u{1F511} Rented for $"+fmtMoney(rate)+"/day (first day paid). Keep money on you or you'll lose it!");
    saveGame();
    gotoRoom(dk.room);
  });
}
/* give a place back: it's released for other players and everything YOU placed
   is deleted — only the default furniture stays */
function unrentProperty(rm){
  const i=RENT.list.indexOf(rm);
  if(i>=0)RENT.list.splice(i,1);
  releaseClaim(rm.id);
  if(String(rm.id).startsWith("K:")){   // marketing plot: leftover stock comes back, registry entry goes
    const md=MKT[rm.id];
    if(md)(md.items||[]).forEach(it=>{if(it.q>0)mktGiveGoods(it,it.q);});
    delete MKT[rm.id];saveMkt();
    if(SERVER_READY)fbPut(mktRegPath(rm.id),null);
    const mp2=marketPlots.find(q=>q.id===rm.id);
    if(mp2)renderMarket(mp2);
  }
  MFURN.delete(rm.id);                    // your placed items are gone...
  delete MYSHOP[rm.id];saveShops();       // ...and so is your dumpling shop
  DISPLAYS.delete(rm.id);
  const man=mansions.find(m=>m.id===rm.id);
  if(man){
    if(man.tableG){man.g.remove(man.tableG);disposeGroup(man.tableG);man.tableG=null;}
    buildMansionFurniture(man);           // back to the default bed, chairs & table
  }
  saveGame();profileSave(true);
  toast("\u{1F511} You gave up "+rm.label+" — your items were removed, only the default furniture stays.");
}
function askUnrent(rm){
  showDest("\u{1F6AA} Give up "+rm.label+"?",[
    {label:"⚠️ YES — unrent it (all MY placed items get deleted!)",value:"yes"},
    {label:"❌ No, keep it!",value:"no"}
  ],a=>{if(a==="yes")unrentProperty(rm);});
}
/* switch a RENTED place to OWNED: every dollar of rent you already paid counts,
   so you only pay the rest of the full price — and all your items stay! */
function propBuyPrice(rm){const id=String(rm.id);return id.startsWith("M:")?MANSION_PRICE:id.startsWith("H:")?HOUSE_PRICE:id.startsWith("K:")?MKT_PRICE:APT_PRICE;}
function propBuyDue(rm){return Math.max(0,propBuyPrice(rm)-(rm.paid||0));}
function switchToBuy(rm){
  if(rm.mode!=="rent")return;
  const due=propBuyDue(rm);
  showDest("\u{1F4B0} Switch to BUY "+rm.label+"?",[
    {label:"✅ YES — pay the rest: $"+fmtMoney(due)+" (you already paid $"+fmtMoney(Math.min(rm.paid||0,propBuyPrice(rm)))+" in rent — all your items stay!)",value:"yes"},
    {label:"❌ No, keep renting",value:"no"}
  ],a=>{
    if(a!=="yes")return;
    if(MONEY.v<due){toast("\u{1F4B0} You need $"+fmtMoney(due)+" — you only have $"+fmtMoney(MONEY.v)+". Sell squishies, win races, give concerts!");return;}
    MONEY.v-=due;updateMoneyUI();
    rm.mode="own";rm.rate=0;rm.label=rm.label.replace(/ · \$[^)]+\/day$/,"");
    toast("\u{1F389}\u{1F511} SOLD! "+rm.label+" is yours FOREVER — no more rent, and all your items stayed!");
    saveGame();profileSave(true);
  });
}
/* ================= MARKETING PLOTS: your own player-to-player market =================
   100x100 m plots every ~3 km. BUY $80K or RENT $100/day, choose building or open-air,
   then stock LONG TABLES (with prices & bonus deals) and DISPLAY CASES. Other players
   walk in and buy — the money rides the payments inbox straight to you. */
const MKT_PRICE=80000,MKT_RENT=100;
const MKT={};    // my plots: id -> {b,name,items:[{k,ty,lab,hex,gl,sz,fh,q,p,bb,bf}]}
try{Object.assign(MKT,JSON.parse(localStorage.getItem("vc4mkt")||"{}"));}catch(e){}
function saveMkt(){try{localStorage.setItem("vc4mkt",JSON.stringify(MKT))}catch(e){}}
const MKTR=new Map();   // other players' plots: id -> {n:ownerName, d:data}
function nearMarketPlot(){
  for(let i=marketPlots.length-1;i>=0;i--){
    const p=marketPlots[i];
    if(offScene(p.g)){marketPlots.splice(i,1);continue;}
    if(Math.abs(player.x-p.x)<52&&Math.abs(player.z-p.z)<52)return p;
  }
  return null;
}
function mktItemName(it){
  return (it.gl?"✨ GLITTER ":"")+(it.sz==="mega"?"\u{1F31F} MEGA ":it.sz==="med"?"\u{1F538} MEDIUM ":"")+it.lab
    +(it.ty==="dump"?" dumpling":it.ty==="butter"?" butter squishy":"");
}
function mktSlot(i){return{dx:-36+(i%6)*14.4,dz:-34+Math.floor(i/6)*17};}
function marketData(p){return rentedAt(p.id)?MKT[p.id]:(MKTR.get(p.id)||{}).d;}
function addMktGood(sg,it,x,y,z,r){
  if(it.ty==="food"){
    const bx=new THREE.Mesh(new THREE.BoxGeometry(r*1.6,r*1.3,r*1.6),new THREE.MeshLambertMaterial({color:0xf4d35e}));
    bx.position.set(x,y+r*0.4,z);sg.add(bx);return;
  }
  const mat=it.lab==="Rainbow"?rainbowMat():new THREE.MeshLambertMaterial({color:new THREE.Color(it.hex||"#f2f5f7")});
  if(it.gl&&it.lab!=="Rainbow")mat.emissive=new THREE.Color(it.hex||"#ffffff").multiplyScalar(0.35);
  const s=it.sz==="mega"?1.9:it.sz==="med"?1.35:1;
  const dm=new THREE.Mesh(new THREE.SphereGeometry(r*s,10,8),mat);
  dm.scale.y=0.75;dm.position.set(x,y+r*s*0.4,z);sg.add(dm);
}
function renderMarket(p){
  if(p.stallG){p.g.remove(p.stallG);disposeGroup(p.stallG);p.stallG=null;}
  const mine=rentedAt(p.id),data=marketData(p);
  if(!data)return;
  const sg=new THREE.Group();p.g.add(sg);p.stallG=sg;
  const owner=mine?mpName():(MKTR.get(p.id)||{}).n||"a player";
  /* the market's name floats over the entrance — YOUR name for your deals! */
  const title=(data.name&&String(data.name).trim())?String(data.name).trim():owner+"'s Marketing Plot";
  const lbl=mpMakeLabel("\u{1F3EA} "+title.slice(0,22));
  lbl.scale.set(22,5.5,1);lbl.position.set(p.x,p.y+9,p.z+46);sg.add(lbl);
  /* optional building: walls + a doorway all around the plot */
  if(data.b){
    const wm=new THREE.MeshLambertMaterial({color:0xdfe3ea});
    for(const[bw,bd,px,pz]of[[98,0.6,0,-48.7],[0.6,98,-48.7,0],[0.6,98,48.7,0],[42,0.6,-28,48.7],[42,0.6,28,48.7]]){
      const wl=new THREE.Mesh(new THREE.BoxGeometry(bw,5,bd),wm);
      wl.position.set(p.x+px,p.y+2.5,p.z+pz);wl.castShadow=true;sg.add(wl);
    }
    const hdr=new THREE.Mesh(new THREE.BoxGeometry(14.6,1.2,0.7),wm);
    hdr.position.set(p.x,p.y+4.4,p.z+48.7);sg.add(hdr);
  }
  const woodM=new THREE.MeshLambertMaterial({color:0x8a6f4d}),legM=new THREE.MeshLambertMaterial({color:0x6f4e37});
  (data.items||[]).forEach((it,i)=>{
    const sl=mktSlot(i),tx=p.x+sl.dx,tz=p.z+sl.dz,ty=p.y+0.24;
    if(it.k==="c"){
      /* display case: a pedestal with a glass box — look, don't touch! */
      const ped=new THREE.Mesh(new THREE.BoxGeometry(1.6,1,1.6),woodM);ped.position.set(tx,ty+0.5,tz);sg.add(ped);
      const glass=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.1,1.2),new THREE.MeshLambertMaterial({color:0x9fd8ff,transparent:true,opacity:0.3}));
      glass.position.set(tx,ty+1.6,tz);sg.add(glass);
      addMktGood(sg,it,tx,ty+1.15,tz,0.3);
      const l2=mpMakeLabel(mktItemName(it)+" — just LOOK!");
      l2.scale.set(10,2.5,1);l2.position.set(tx,ty+3.4,tz);sg.add(l2);
    }else{
      /* LONG TABLE with the goods on top + a floating price sign */
      const top=new THREE.Mesh(new THREE.BoxGeometry(7,0.24,2.4),woodM);top.position.set(tx,ty+1,tz);top.castShadow=true;sg.add(top);
      [[-3.1,-0.9],[3.1,-0.9],[-3.1,0.9],[3.1,0.9]].forEach(o=>{
        const lg=new THREE.Mesh(new THREE.BoxGeometry(0.18,1,0.18),legM);
        lg.position.set(tx+o[0],ty+0.5,tz+o[1]);sg.add(lg);
      });
      for(let n=0;n<Math.min(it.q,6);n++)addMktGood(sg,it,tx-2.5+n*1,ty+1.12,tz,0.26);
      const bon=(it.bb&&it.bf)?" · "+it.bb+"+"+it.bf+" FREE!":"";
      const l2=mpMakeLabel(it.q>0?mktItemName(it)+" ×"+it.q+" — $"+fmtMoney(it.p)+bon:mktItemName(it)+" — NO STOCK");
      l2.scale.set(13,3.2,1);l2.position.set(tx,ty+3.6,tz);sg.add(l2);
    }
  });
}
window.onMarketBuilt=p=>{if(rentedAt(p.id)&&MKT[p.id])renderMarket(p);};
function mktRegPath(id){return "/markets/"+mpWorldKey()+"/"+fbKey(id);}
async function syncMarket(id){
  if(!SERVER_READY)return;
  const d=MKT[id];if(!d)return;
  const base={t:myToken(),n:mpName(),ts:Date.now()};
  const body=Object.assign({},base);
  const s=JSON.stringify(d);
  if(s.length<=6000)body.mkt=s;
  if(!await fbPut(claimPath(id),body))await fbPut(claimPath(id),base);   // old database rules: at least keep the claim
  const co=String(id).slice(2).split(",").map(Number);
  fbPut(mktRegPath(id),{n:(d.name||"").slice(0,24),o:mpName(),x:co[0]||0,z:co[1]||0,ts:Date.now()});
}
async function fetchMarketFresh(id){
  const g2=await fbGet(claimPath(id));
  if(g2.ok&&g2.data&&!g2.data.free&&g2.data.t!==myToken()){
    let d={b:0,name:"",items:[]};
    if(typeof g2.data.mkt==="string"){try{const q=JSON.parse(g2.data.mkt);if(q&&typeof q==="object")d=q;}catch(e){}}
    d.items=Array.isArray(d.items)?d.items:[];
    MKTR.set(id,{n:g2.data.n||"a player",d});
    return MKTR.get(id);
  }
  MKTR.delete(id);
  return null;
}
function openMarket(p){
  if(rentedAt(p.id)){openMarketOwner(p);return;}
  (async()=>{
    const rm=await fetchMarketFresh(p.id);
    renderMarket(p);
    if(rm)openMarketShop(p,rm);
    else openMarketDesk(p);
  })();
}
function openMarketDesk(p){
  showDest("\u{1F3EA} MARKETING PLOT (100×100 m) — open your own market!",[
    {label:"\u{1F4B0} BUY — $"+fmtMoney(MKT_PRICE)+" (yours forever)",value:"own"},
    {label:"\u{1F511} RENT — $"+fmtMoney(MKT_RENT)+" per day",value:"rent"},
    {label:"❌ Cancel",value:"cancel"}
  ],async mode=>{
    if(mode==="cancel")return;
    const price=mode==="own"?MKT_PRICE:MKT_RENT;
    const claim=await checkClaim(p.id);
    if(claim.res==="taken"){toast("\u{1F512} Sorry — this plot is already "+claim.name+"'s market!");return;}
    if(claim.res!=="mine"&&MONEY.v<price){toast("\u{1F4B0} You need $"+fmtMoney(price)+" — you only have $"+fmtMoney(MONEY.v)+"!");return;}
    showDest("\u{1F9F1} Do you want a BUILDING on your plot?",[
      {label:"\u{1F3EC} YES — walls and a door all around",value:1},
      {label:"\u{1F33E} NO — leave it open-air",value:0},
      {label:"❌ Cancel",value:"x"}
    ],async b=>{
      if(b==="x")return;
      if(claim.res!=="mine"){
        if(!await writeClaim(p.id)){toast("\u{1F512} Another player claimed it just before you!");return;}
        MONEY.v-=price;updateMoneyUI();profileSave(true);
      }
      const ent={id:p.id,x:p.x,z:p.z,ry:p.y,mode:(claim.res==="mine"||mode==="own")?"own":"rent",rate:mode==="rent"?MKT_RENT:0,
        label:"\u{1F3EA} MARKETING PLOT at ("+Math.round(p.x)+", "+Math.round(p.z)+")"+(mode==="rent"&&claim.res!=="mine"?" · $"+fmtMoney(MKT_RENT)+"/day":"")};
      if(mode==="rent"&&claim.res!=="mine")ent.paid=MKT_RENT;
      RENT.list.push(ent);
      MKT[p.id]=MKT[p.id]||{b:0,name:"",items:[]};
      MKT[p.id].b=b?1:0;
      saveMkt();saveGame();syncMarket(p.id);renderMarket(p);
      toast(mode==="own"
        ?"\u{1F389}\u{1F3EA} The MARKETING PLOT is yours FOREVER — press T on it to set up your tables!"
        :"\u{1F511}\u{1F3EA} Plot rented for $"+fmtMoney(MKT_RENT)+"/day — press T on it to set up your tables!");
    });
  });
}
function openMarketOwner(p){
  const d=MKT[p.id]=MKT[p.id]||{b:0,name:"",items:[]};
  const opts=[];
  if(d.items.length<12){
    opts.push({label:"\u{1FA91} Place a LONG TABLE — sell dumplings, butter or food",value:"table"});
    opts.push({label:"\u{1F5C4} Place a DISPLAY CASE — show something off (look, don't touch)",value:"case"});
  }else opts.push({label:"(Your plot is full — 12 spots max. Remove something first!)",value:"x"});
  opts.push({label:"\u{1F3F7} Name your market"+(d.name?" (now: \""+d.name+"\")":""),value:"name"});
  opts.push({label:d.b?"\u{1F33E} Remove the building (open-air)":"\u{1F3EC} Add a building (walls + door)",value:"bld"});
  if(d.items.length)opts.push({label:"\u{1F5D1} Remove an item (leftover stock comes back)",value:"rm"});
  opts.push({label:"❌ Close",value:"x"});
  showDest("\u{1F3EA} "+(d.name||"Your Marketing Plot")+" — market editor",opts,v=>{
    if(v==="table")mktPickType(p,"t");
    else if(v==="case")mktPickType(p,"c");
    else if(v==="name"){
      const s=prompt("Name your market! (max 20 letters — this is what everyone sees, like SUPER DEAL)",d.name||"");
      if(s===null)return;
      d.name=s.trim().slice(0,20);
      saveMkt();syncMarket(p.id);renderMarket(p);
      toast(d.name?"\u{1F3F7} Your market is now called \""+d.name+"\"!":"\u{1F3F7} Name cleared — it shows your player name again.");
    }else if(v==="bld"){
      d.b=d.b?0:1;saveMkt();syncMarket(p.id);renderMarket(p);
      toast(d.b?"\u{1F3EC} Building added — walls and a door around your plot!":"\u{1F33E} Building removed — open-air market!");
    }else if(v==="rm")mktRemoveItem(p);
  });
}
function mktPickType(p,kind){
  showDest(kind==="t"?"\u{1FA91} Long table — what do you want to SELL?":"\u{1F5C4} Display case — what do you want to SHOW?",[
    {label:"\u{1F95F} A dumpling ("+DUMP.owned.length+" owned)",value:"dump"},
    {label:"\u{1F9C8} A butter squishy ("+BUTTER.owned.length+" owned)",value:"butter"},
    {label:"\u{1F354} Food from your backpack ("+MCD.pack.length+" packed)",value:"food"},
    {label:"❌ Cancel",value:"x"}
  ],ty=>{if(ty!=="x")mktPickItem(p,kind,ty);});
}
function mktGroups(ty){
  const map=new Map();
  if(ty==="food"){
    MCD.pack.forEach(f=>{const k=f[0];const e=map.get(k)||{n:0,lab:f[0],fh:f[1],ty};e.n++;map.set(k,e);});
  }else{
    const coll=ty==="dump"?DUMP.owned:BUTTER.owned;
    coll.forEach(d2=>{
      const k=d2.color+"|"+(d2.glitter?1:0)+"|"+(d2.size||"");
      const e=map.get(k)||{n:0,lab:d2.color,hex:d2.hex,gl:d2.glitter?1:0,sz:d2.size||"",ty};
      e.n++;map.set(k,e);
    });
  }
  return[...map.values()].sort((a,b)=>b.n-a.n);
}
function mktTakeStock(ty,grp,n){
  if(ty==="food"){
    let left=n;
    for(let i=MCD.pack.length-1;i>=0&&left>0;i--)if(MCD.pack[i][0]===grp.lab){MCD.pack.splice(i,1);left--;}
    renderPack();
    return n-left;
  }
  const coll=ty==="dump"?DUMP.owned:BUTTER.owned;
  let left=n;
  for(let i=coll.length-1;i>=0&&left>0;i--){
    const d2=coll[i];
    if(d2.color===grp.lab&&(d2.glitter?1:0)===(grp.gl||0)&&(d2.size||"")===(grp.sz||"")){
      if(HOLD.d===d2){HOLD.d=null;HOLD.mesh.visible=false;}
      coll.splice(i,1);left--;
    }
  }
  renderDump();
  return n-left;
}
function mktGiveGoods(it,n){
  for(let i=0;i<n;i++){
    if(it.ty==="dump")DUMP.owned.push({color:it.lab,hex:it.hex,glitter:!!it.gl});
    else if(it.ty==="butter")BUTTER.owned.push({color:it.lab,hex:it.hex,glitter:!!it.gl,size:it.sz||"norm"});
    else MCD.pack.push([it.lab,it.fh||10]);
  }
  renderDump();renderPack();saveGame();
}
function mktPickItem(p,kind,ty){
  const groups=mktGroups(ty).slice(0,10);
  if(!groups.length){toast("You don't have any of those yet — get some first!");return;}
  const opts=groups.map((g2,i)=>({label:(ty==="food"?g2.lab:mktItemName(g2))+" — you have "+g2.n,value:i}));
  opts.push({label:"❌ Cancel",value:"x"});
  showDest("Pick what goes on the "+(kind==="t"?"table":"display"),opts,v=>{
    if(typeof v!=="number")return;
    const grp=groups[v],d=MKT[p.id];
    if(kind==="c"){
      mktTakeStock(ty,grp,1);
      d.items.push({k:"c",ty,lab:grp.lab,hex:grp.hex||"",gl:grp.gl||0,sz:grp.sz||"",fh:grp.fh||0,q:1,p:0,bb:0,bf:0});
      saveMkt();saveGame();syncMarket(p.id);renderMarket(p);
      toast("\u{1F5C4} Your "+(ty==="food"?grp.lab:mktItemName(grp))+" is on display — everyone can admire it (but nobody can touch)!");
      return;
    }
    const qs=prompt("How many go on the table? (1 - "+grp.n+")","1");
    if(qs===null)return;
    const q=Math.floor(parseInt(qs,10));
    if(!(q>=1)||q>grp.n){toast("Type a number from 1 to "+grp.n+"!");return;}
    const ps=prompt("Price per item? ($1 - $1,000,000)","25");
    if(ps===null)return;
    const pr=Math.floor(parseInt(ps,10));
    if(!(pr>=1)||pr>1000000){toast("Type a price from 1 to 1000000!");return;}
    let bb=0,bf=0;
    const bs=prompt("BONUS deal? Type it like 1+1 (= buy 1, get 1 FREE) or 3+1 — or leave empty for no bonus","");
    if(bs&&bs.trim()){
      const m2=bs.trim().match(/^(\d+)\s*\+\s*(\d+)/);
      if(m2){bb=Math.min(99,parseInt(m2[1],10)||0);bf=Math.min(99,parseInt(m2[2],10)||0);}
      if(!bb||!bf){bb=0;bf=0;toast("Bonus skipped — next time type it like 1+1.");}
    }
    mktTakeStock(ty,grp,q);
    d.items.push({k:"t",ty,lab:grp.lab,hex:grp.hex||"",gl:grp.gl||0,sz:grp.sz||"",fh:grp.fh||0,q,p:pr,bb,bf});
    saveMkt();saveGame();syncMarket(p.id);renderMarket(p);
    toast("\u{1FA91} ON SALE: "+q+"× "+(ty==="food"?grp.lab:mktItemName(grp))+" at $"+fmtMoney(pr)+" each"+(bb?" — "+bb+"+"+bf+" FREE deal!":"")+"!");
  });
}
function mktRemoveItem(p){
  const d=MKT[p.id];
  const opts=d.items.map((it,i)=>({label:(it.k==="c"?"\u{1F5C4} ":"\u{1FA91} ")+mktItemName(it)+(it.k==="t"?" (×"+it.q+" left)":""),value:i}));
  opts.push({label:"❌ Cancel",value:"x"});
  showDest("\u{1F5D1} Remove which item? (leftover stock comes back to you)",opts,v=>{
    if(typeof v!=="number")return;
    const it=d.items.splice(v,1)[0];
    if(it&&it.q>0)mktGiveGoods(it,it.q);
    saveMkt();saveGame();syncMarket(p.id);renderMarket(p);
    toast("\u{1F5D1} Removed"+(it&&it.q>0?" — "+it.q+" came back to your collection!":"!"));
  });
}
function openMarketShop(p,rm){
  const d=rm.d,owner=rm.n;
  const title=(d.name&&String(d.name).trim())?String(d.name).trim():owner+"'s Marketing Plot";
  const opts=[];
  (d.items||[]).forEach((it,i)=>{
    if(it.k!=="t")return;
    opts.push(it.q>0
      ?{label:"\u{1F6D2} "+mktItemName(it)+" — $"+fmtMoney(it.p)+" each (×"+it.q+" left"+(it.bb?" · "+it.bb+"+"+it.bf+" FREE":"")+")",value:i}
      :{label:"❌ "+mktItemName(it)+" — NO STOCK",value:"x"});
  });
  if(!opts.length)opts.push({label:"(No tables here yet — come back later!)",value:"x"});
  opts.push({label:"❌ Leave",value:"x"});
  showDest("\u{1F3EA} "+title+" — by "+owner,opts,v=>{
    if(typeof v!=="number")return;
    const it=d.items[v];
    if(!it||it.q<=0)return;
    const deal=it.bb?"\nBONUS: every "+it.bb+" you buy = "+it.bf+" extra for FREE!":"";
    const qs=prompt("How many do you want to BUY at $"+fmtMoney(it.p)+" each?"+deal+"\n(stock: "+it.q+")","1");
    if(qs===null)return;
    let n=Math.floor(parseInt(qs,10));
    if(!(n>=1)){toast("Type a normal number, like 2!");return;}
    if(n>it.q)n=it.q;
    let free=(it.bb&&it.bf)?Math.floor(n/it.bb)*it.bf:0;
    if(n+free>it.q)free=it.q-n;
    const total=n*it.p;
    (async()=>{
      const ok=await sendMoney(owner,total,{d:("MKT|"+p.id+"|"+v+"|"+(n+free)).slice(0,80)},true);
      if(!ok)return;
      it.q-=n+free;
      mktGiveGoods(it,n+free);
      renderMarket(p);
      toast("\u{1F6D2}\u{1F389} You bought "+n+(free?" (+"+free+" FREE!)":"")+"× "+mktItemName(it)+" for $"+fmtMoney(total)+" — "+owner+" got your money!");
    })();
  });
}
/* walking near someone's market loads their stalls & signs */
let _mvT=0;
function updateMarketVisit(dt){
  _mvT-=dt;if(_mvT>0)return;_mvT=2;
  if(S.world!=="earth"||!SERVER_READY)return;
  const p=nearMarketPlot();
  if(!p||p.visitDone||rentedAt(p.id))return;
  p.visitDone=true;
  fetchMarketFresh(p.id).then(rm=>{
    if(offScene(p.g))return;
    renderMarket(p);
    if(rm)toast("\u{1F3EA} Welcome to "+((rm.d.name&&String(rm.d.name).trim())||rm.n+"'s Marketing Plot")+" — press T to shop!");
  });
}
/* 🔎 find player markets by name — SUPER DEAL, Notch's market, anything */
async function openMarketSearch(filter){
  if(!SERVER_READY){toast("\u{1F534} Searching markets needs the online database.");return;}
  toast("\u{1F50E} Looking for player markets...");
  const g2=await fbGet("/markets/"+mpWorldKey());
  const all=[];
  if(g2.ok&&g2.data)for(const k of Object.keys(g2.data)){
    const m2=g2.data[k];
    if(!m2||typeof m2.x!=="number"||typeof m2.z!=="number")continue;
    all.push({n:(typeof m2.n==="string"&&m2.n.trim())?m2.n.trim():(m2.o||"a player")+"'s Marketing Plot",
      o:m2.o||"?",x:m2.x,z:m2.z,d:Math.hypot(m2.x-player.x,m2.z-player.z)});
  }
  let list=all.sort((a,b)=>a.d-b.d);
  if(filter)list=list.filter(m2=>(m2.n+" "+m2.o).toLowerCase().includes(filter.toLowerCase()));
  const opts=list.slice(0,10).map((m2,i)=>({label:"\u{1F3EA} "+m2.n+" (by "+m2.o+") — "+fmtDist(m2.d),value:i}));
  if(!opts.length)opts.push({label:filter?"No market called \""+filter+"\" found!":"No player markets exist yet — open the FIRST one!",value:"x"});
  opts.push({label:"\u{1F50E} Search by name...",value:"s"});
  opts.push({label:"❌ Close",value:"x"});
  showDest("\u{1F3EA} Player markets"+(filter?" — \""+filter+"\"":""),opts,v=>{
    if(v==="s"){const s=prompt("Market or player name to search for:");if(s&&s.trim())openMarketSearch(s.trim());return;}
    if(typeof v!=="number")return;
    const m2=list[v];
    showDest("\u{1F3EA} "+m2.n+" — "+fmtDist(m2.d)+" away",[
      {label:"⚡ TELEPORT there",value:"tp"},
      {label:"\u{1F9ED} ROUTE — drive there yourself",value:"route"},
      {label:"❌ Close",value:"x"}
    ],a=>{
      if(a==="tp"){switchWorld("earth");teleportTo(m2.x,m2.z+56);}
      else if(a==="route"){setRoute(m2.x,m2.z+56);toast("\u{1F9ED} Route set to "+m2.n+" — follow the blue line!");}
    });
  });
}
/* rent is charged every new game day — run out of money and you lose the place */
let _rentDay=null;
function updateRent(){
  if(_rentDay===null||CLOCK.day<_rentDay){_rentDay=CLOCK.day;return;}
  const delta=CLOCK.day-_rentDay;
  if(delta===0)return;
  _rentDay=CLOCK.day;
  if(delta>3)return;   // clock jump (world switch) — don't back-charge
  let paid=0;
  for(let i=RENT.list.length-1;i>=0;i--){
    const rm=RENT.list[i];
    if(rm.mode!=="rent"||!rm.rate)continue;
    const cost=rm.rate*delta;
    if(MONEY.v>=cost){MONEY.v-=cost;paid+=cost;rm.paid=(rm.paid||0)+cost;}
    else{
      RENT.list.splice(i,1);
      releaseClaim(rm.id);
      if(String(rm.id).startsWith("K:")){   // lost market: your stock comes back at least
        const md=MKT[rm.id];
        if(md)(md.items||[]).forEach(it=>{if(it.q>0)mktGiveGoods(it,it.q);});
        delete MKT[rm.id];saveMkt();
        if(SERVER_READY)fbPut(mktRegPath(rm.id),null);
      }
      toast("\u{1F631} You couldn't pay the rent — you LOST "+rm.label+"!");
    }
  }
  /* the rented helicopter costs $500 per day */
  if(HRENT.on){
    const hc=500*delta;
    if(MONEY.v>=hc){MONEY.v-=hc;paid+=hc;}
    else{
      HRENT.on=false;HELI.active=false;
      if(HELI.mesh&&!player.inHeli)HELI.mesh.visible=false;
      saveGame();
      toast("\u{1F6EC} You couldn't pay the helicopter rental — it flew back home!");
    }
  }
  /* the rented plane costs $250 per day */
  if(PRENT.on){
    const cost=250*delta;
    if(MONEY.v>=cost){MONEY.v-=cost;paid+=cost;}
    else{
      PRENT.on=false;saveGame();
      toast("\u{1F6EC} You couldn't pay the plane rental — it went back to the airport!");
    }
  }
  /* owned apartments earn tenant money every day */
  let income=0;
  for(const rm of RENT.list)if(rm.mode==="own"&&!String(rm.id).startsWith("M:")&&!String(rm.id).startsWith("P:")&&!String(rm.id).startsWith("H:")&&!String(rm.id).startsWith("K:"))income+=25*delta;
  if(income>0){
    MONEY.v+=income;
    toast("\u{1F3E8} Your apartments earned $"+fmtMoney(income)+" from tenants!");
  }
  if(paid>0)toast("\u{1F511} New day — rent paid: $"+fmtMoney(paid));
  if(paid>0||income>0){updateMoneyUI();profileSave();saveGame();}
}
/* ================= MANSIONS: furniture & the T editor ================= */
const MFURN=new Map();      // mansion id -> [{t,dx,dz,r}] placed furniture
const TRAMPS=[];            // trampolines: walk on one to bounce!
/* the furniture & garden shop — indoor and outdoor items */
const FURN=[
  {t:"bed",n:"Bed",e:"\u{1F6CF}",p:500,out:0},
  {t:"chair",n:"Chair",e:"\u{1FA91}",p:100,out:0},
  {t:"couch",n:"Couch",e:"\u{1F6CB}",p:400,out:0},
  {t:"table",n:"Table",e:"\u{1F37D}",p:250,out:0},
  {t:"closet",n:"Closet",e:"\u{1F5C4}",p:350,out:0},
  {t:"piano",n:"Piano",e:"\u{1F3B9}",p:3000,out:0},
  {t:"lamp",n:"Lamp",e:"\u{1F4A1}",p:150,out:0},
  {t:"tv",n:"TV",e:"\u{1F4FA}",p:800,out:0},
  {t:"plant",n:"Plant",e:"\u{1FAB4}",p:60,out:0},
  {t:"rug",n:"Rug",e:"\u{1F7E5}",p:120,out:0},
  {t:"wall",n:"Wall",e:"\u{1F9F1}",p:100,out:2},
  {t:"window",n:"Window wall",e:"\u{1FA9F}",p:150,out:2},
  {t:"doorw",n:"Door wall",e:"\u{1F6AA}",p:150,out:2},
  {t:"roofp",n:"Roof panel",e:"\u{1F6D6}",p:150,out:2},
  {t:"floorp",n:"Floor",e:"⬜",p:80,out:2},
  {t:"tramp",n:"Trampoline",e:"\u{1F938}",p:800,out:1},
  {t:"pool",n:"Pool",e:"\u{1F3CA}",p:1500,out:1},
  {t:"fountain",n:"Fountain",e:"⛲",p:1000,out:1},
  {t:"bbq",n:"BBQ",e:"\u{1F356}",p:300,out:1},
  {t:"bench",n:"Bench",e:"\u{1FA91}",p:150,out:1},
  {t:"tree",n:"Tree",e:"\u{1F333}",p:100,out:1},
  {t:"flower",n:"Flowers",e:"\u{1F338}",p:40,out:1},
  {t:"swing",n:"Swing",e:"\u{1F6DD}",p:400,out:1}
];
const furnDef=t=>FURN.find(f=>f.t===t);
/* build one piece of furniture at world (x,z), on floor y, rotated r */
function buildFurnPiece(t,x,z,y,r,parent,man){
  const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=r||0;parent.add(g);
  const wood=new THREE.MeshLambertMaterial({color:0x6f4e37});
  const wood2=new THREE.MeshLambertMaterial({color:0x8a6f4d});
  function box(w,h,d,px,py,pz,mat){const m=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat||wood));m.position.set(px,py,pz);g.add(m);return m;}
  if(t==="bed"){
    box(3.4,0.5,4.4,0,0.25,0);
    box(3.2,0.3,4.2,0,0.62,0,new THREE.MeshLambertMaterial({color:0xf2f5f7}));
    box(3.24,0.12,2.6,0,0.8,0.8,new THREE.MeshLambertMaterial({color:0x9b5de5}));
    box(2.2,0.18,0.9,0,0.85,-1.5,new THREE.MeshLambertMaterial({color:0x9fd8ff}));
    hotelBeds.push({g,x,z,id:man.id,y:man.baseY});
  }else if(t==="chair"){
    makeChair(0,0,0,g,0);   // chair registers itself (coords are local to g)
    /* re-register with WORLD coords so sitting works */
    chairs[chairs.length-1].x=x;chairs[chairs.length-1].z=z;chairs[chairs.length-1].yaw=r||0;chairs[chairs.length-1].y=y+0.6;
  }else if(t==="couch"){
    const cm=new THREE.MeshLambertMaterial({color:0x2e4a62});
    box(2.6,0.5,1,0,0.4,0,cm);
    box(2.6,0.8,0.28,0,0.85,-0.42,cm);
    box(0.28,0.75,1,-1.2,0.7,0,cm);box(0.28,0.75,1,1.2,0.7,0,cm);
    chairs.push({g,x,z,yaw:r||0,y:y+0.65});
    chairs.push({g,x:x+Math.cos(r||0)*0.8,z:z-Math.sin(r||0)*0.8,yaw:r||0,y:y+0.65});
  }else if(t==="table"){
    box(2,0.1,1.2,0,0.78,0,wood2);
    [[-0.85,-0.45],[0.85,-0.45],[-0.85,0.45],[0.85,0.45]].forEach(p=>box(0.09,0.75,0.09,p[0],0.37,p[1]));
  }else if(t==="closet"){
    box(1.8,2.3,0.7,0,1.15,0,wood2);
    box(0.03,2,0.02,0,1.15,0.36);
    [[-0.35],[0.35]].forEach(p=>{const kn=new THREE.Mesh(new THREE.SphereGeometry(0.05),new THREE.MeshLambertMaterial({color:0xffd75e}));kn.position.set(p[0],1.2,0.38);g.add(kn);});
  }else if(t==="piano"){
    makePiano(x,z,r||0,parent,y);   // builds its own group & registers itself as playable
  }else if(t==="lamp"){
    box(0.5,0.08,0.5,0,0.04,0,darkTrim);
    box(0.07,1.5,0.07,0,0.8,0,darkTrim);
    const sh=new THREE.Mesh(new THREE.ConeGeometry(0.35,0.4,10,1,true),new THREE.MeshLambertMaterial({color:0xf4d35e,emissive:0xffe9a0,emissiveIntensity:0.6,side:THREE.DoubleSide}));
    sh.position.set(0,1.6,0);g.add(sh);
  }else if(t==="tv"){
    box(1.6,0.5,0.5,0,0.25,0,darkTrim);
    box(2.2,1.25,0.12,0,1.2,0,darkTrim);
    /* a REAL TV: press T next to it to pick a channel */
    const scr=new THREE.Mesh(new THREE.PlaneGeometry(2,1.05),newsMat);
    scr.position.set(0,1.2,0.07);g.add(scr);
    TVS.push({g,x,z,y});
  }else if(t==="plant"){
    const pot=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.22,0.45,10),new THREE.MeshLambertMaterial({color:0xb8532b}));
    pot.position.y=0.22;g.add(pot);
    const bl=new THREE.Mesh(new THREE.SphereGeometry(0.42,8,7),new THREE.MeshLambertMaterial({color:0x2f8f46}));
    bl.position.y=0.85;g.add(bl);
  }else if(t==="rug"){
    const rg=new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.6,0.04,20),new THREE.MeshLambertMaterial({color:0xb01e3c}));
    rg.position.y=0.06;g.add(rg);
    const rg2=new THREE.Mesh(new THREE.CylinderGeometry(1,1,0.05,20),new THREE.MeshLambertMaterial({color:0xf4d35e}));
    rg2.position.y=0.07;g.add(rg2);
  }else if(t==="wall"){
    box(4,3,0.26,0,1.5,0,new THREE.MeshLambertMaterial({color:0xe8dcc8}));
  }else if(t==="window"){
    const wm2=new THREE.MeshLambertMaterial({color:0xe8dcc8});
    box(4,1,0.26,0,0.5,0,wm2);
    box(4,0.7,0.26,0,2.65,0,wm2);
    box(0.7,1.65,0.26,-1.65,1.82,0,wm2);
    box(0.7,1.65,0.26,1.65,1.82,0,wm2);
    const gl2=new THREE.Mesh(new THREE.PlaneGeometry(2.6,1.6),glassMat);
    gl2.position.set(0,1.82,0);g.add(gl2);
  }else if(t==="doorw"){
    const dm2=new THREE.MeshLambertMaterial({color:0xe8dcc8});
    box(1.5,3,0.26,-1.25,1.5,0,dm2);
    box(1.5,3,0.26,1.25,1.5,0,dm2);
    box(1,0.6,0.26,0,2.7,0,dm2);
  }else if(t==="roofp"){
    box(4.4,0.22,4.4,0,3.1,0,new THREE.MeshLambertMaterial({color:0x8a3b2e}));
  }else if(t==="floorp"){
    box(4,0.16,4,0,0.08,0,new THREE.MeshLambertMaterial({color:0xcabfa6}));
  }else if(t==="tramp"){
    [[-0.8,-0.8],[0.8,-0.8],[-0.8,0.8],[0.8,0.8]].forEach(p=>box(0.09,0.7,0.09,p[0],0.35,p[1],darkTrim));
    const mat2=new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.3,0.1,16),darkTrim);
    mat2.position.y=0.75;g.add(mat2);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(1.3,0.16,8,18),new THREE.MeshLambertMaterial({color:0x1b98e0}));
    rim.rotation.x=Math.PI/2;rim.position.y=0.8;g.add(rim);
    TRAMPS.push({g,x,z,y:y+0.85});
  }else if(t==="pool"){
    /* an in-ground pool: white rim flush with the lawn — and you can SWIM in it! */
    const rimM=new THREE.MeshLambertMaterial({color:0xf4f7fb});
    box(7,0.3,0.5,0,0.15,-2.75,rimM);box(7,0.3,0.5,0,0.15,2.75,rimM);
    box(0.5,0.3,6,-3.25,0.15,0,rimM);box(0.5,0.3,6,3.25,0.15,0,rimM);
    const wat=new THREE.Mesh(new THREE.BoxGeometry(6,0.22,5),new THREE.MeshLambertMaterial({color:0x1b98e0,transparent:true,opacity:0.8}));
    wat.position.y=0.11;g.add(wat);
    POOLS.push({g,x,z,hw:3,hd:2.5,wy:y+0.12});
    /* a little ladder */
    [[-0.3],[0.3]].forEach(p=>box(0.05,0.7,0.05,3.3,0.35,p[0],hubMat));
    box(0.05,0.05,0.7,3.3,0.55,0,hubMat);
  }else if(t==="fountain"){
    const bas=new THREE.Mesh(new THREE.CylinderGeometry(1.7,1.9,0.6,14),new THREE.MeshLambertMaterial({color:0xb9b2a6}));
    bas.position.y=0.3;g.add(bas);
    const wt=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,0.1,14),new THREE.MeshLambertMaterial({color:0x3fd0ff,transparent:true,opacity:0.85}));
    wt.position.y=0.62;g.add(wt);
    const col=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.2,1.2,10),new THREE.MeshLambertMaterial({color:0xb9b2a6}));
    col.position.y=1.2;g.add(col);
    const spray=new THREE.Mesh(new THREE.ConeGeometry(0.5,0.9,10),new THREE.MeshLambertMaterial({color:0x9fd8ff,transparent:true,opacity:0.6}));
    spray.position.y=2.1;g.add(spray);
  }else if(t==="bbq"){
    box(1.1,0.5,0.7,0,0.85,0,darkTrim);
    [[-0.4,-0.25],[0.4,-0.25],[-0.4,0.25],[0.4,0.25]].forEach(p=>box(0.06,0.65,0.06,p[0],0.3,p[1],darkTrim));
    for(let i=0;i<5;i++)box(1,0.02,0.04,0,1.12,-0.24+i*0.12,hubMat);
    const fl=new THREE.Mesh(new THREE.ConeGeometry(0.12,0.25,7),new THREE.MeshBasicMaterial({color:0xff7f11}));
    fl.position.set(0.2,1.24,0);g.add(fl);
  }else if(t==="bench"){
    box(1.9,0.12,0.55,0,0.5,0,wood2);
    box(1.9,0.6,0.12,0,0.95,-0.26,wood2);
    [[-0.8],[0.8]].forEach(p=>box(0.12,0.5,0.5,p[0],0.25,0,darkTrim));
    chairs.push({g,x,z,yaw:r||0,y:y+0.6});
  }else if(t==="tree"){
    makeTree(0,0,1+((Math.abs(Math.round(x+z))%4)*0.2),g,0);
  }else if(t==="flower"){
    const cols=[0xff5d8f,0xf4d35e,0xef476f,0x9b5de5,0xffffff];
    for(let i=0;i<5;i++){
      const a=i/5*Math.PI*2,fx=Math.cos(a)*0.5,fz=Math.sin(a)*0.5;
      const st=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,0.45),new THREE.MeshLambertMaterial({color:0x2f7a3c}));
      st.position.set(fx,0.28,fz);g.add(st);
      const bl=new THREE.Mesh(new THREE.SphereGeometry(0.12,7,6),new THREE.MeshLambertMaterial({color:cols[i]}));
      bl.position.set(fx,0.56,fz);g.add(bl);
    }
  }else if(t==="swing"){
    box(0.1,2.4,0.1,-1.2,1.2,0,darkTrim);box(0.1,2.4,0.1,1.2,1.2,0,darkTrim);
    box(2.6,0.1,0.1,0,2.4,0,darkTrim);
    [[-0.3],[0.3]].forEach(p=>box(0.03,1.5,0.03,p[0],1.6,0,hubMat));
    box(0.75,0.06,0.3,0,0.85,0,wood2);
    chairs.push({g,x,z,yaw:r||0,y:y+0.85});
  }
  return g;
}
/* default furniture: a bed, three chairs and a table in the great hall */
function mansionItems(id){
  if(!MFURN.has(id))MFURN.set(id,String(id).startsWith("P:")?[]
    :String(id).startsWith("H:")?[   // family house: defaults scaled to the smaller rooms
      {t:"bed",dx:-9,dz:-6,r:0},
      {t:"chair",dx:9,dz:-5,r:Math.PI},{t:"chair",dx:6.5,dz:-5,r:Math.PI},
      {t:"table",dx:7.7,dz:-7.8,r:0}
    ]:[
      {t:"bed",dx:-30,dz:-20,r:0},
      {t:"chair",dx:-33,dz:10,r:Math.PI},{t:"chair",dx:-30,dz:10,r:Math.PI},{t:"chair",dx:-27,dz:10,r:Math.PI},
      {t:"table",dx:-30,dz:6.6,r:0}
    ]);
  return MFURN.get(id);
}
function buildMansionFurniture(man){
  if(man.furnG){man.g.remove(man.furnG);disposeGroup(man.furnG);man.furnG=null;}
  const items=mansionItems(man.id);
  const fg=new THREE.Group();man.g.add(fg);man.furnG=fg;
  for(const it of items){
    const wx=man.x+it.dx,wz=man.z+it.dz;
    const inside=man.plot?false:(man.house?Math.abs(it.dx)<14&&Math.abs(it.dz)<10:Math.abs(it.dx)<49&&Math.abs(it.dz)<37);
    const fy=man.plot?terrainH(wx,wz)+0.14:(inside?man.baseY+0.3:terrainH(wx,wz)+0.12);
    buildFurnPiece(it.t,wx,wz,fy,it.r||0,fg,man);
  }
  if(rentedAt(man.id)&&!man.plot){
    /* YOUR mansion: your 3 fastest owned cars park on the driveway */
    VEHICLES.filter(v=>v.type==="car"&&OWN.has(v.name)).sort((a,b)=>b.top-a.top).slice(0,3)
      .forEach((v,i)=>{
        const c=buildVehicleMesh("car",paintOf(v),v.top,v.name);
        const cx=man.x-24+i*11,cz=man.z+44;
        c.position.set(cx,terrainH(cx,cz)+0.1,cz);c.rotation.y=Math.PI;fg.add(c);
      });
    if(MYSHOP[man.id])buildStall(man,mpName(),MYSHOP[man.id],fg);
  }
}
/* a roadside dumpling stall in the mansion garden */
function buildStall(man,owner,price,parent){
  const g=new THREE.Group();(parent||man.g).add(g);
  const x=man.x+32,z=man.z+44,y=terrainH(x,z);
  const ct=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(3,1.05,1.1),new THREE.MeshLambertMaterial({color:0xff5d8f})));
  ct.position.set(x,y+0.52,z);g.add(ct);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(3.4,0.12,1.6),new THREE.MeshLambertMaterial({color:0xd7263d}));
  roof.position.set(x,y+2.3,z);g.add(roof);
  [[-1.5],[1.5]].forEach(p=>{const pl=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.8),poleMat);pl.position.set(x+p[0],y+1.4,z);g.add(pl);});
  [0xd7263d,0x8ac926,0xf4d35e,0x9b5de5].forEach((dc,i)=>{
    const dm=new THREE.Mesh(new THREE.SphereGeometry(0.16,8,7),new THREE.MeshLambertMaterial({color:dc}));
    dm.scale.y=0.72;dm.position.set(x-1.1+i*0.75,y+1.2,z);g.add(dm);
  });
  const sg=new THREE.Mesh(new THREE.PlaneGeometry(3.6,0.9),shopSignMat((owner||"").toUpperCase().slice(0,9)+"'S \u{1F95F} $"+price));
  sg.position.set(x,y+3,z);g.add(sg);
  man.stall={x,z,price,owner};
}
/* ---------- visiting OTHER players' mansions (their furniture, shop & guest book) ---------- */
let _visitT=0;
function updateVisit(dt){
  _visitT-=dt;
  if(_visitT>0)return;
  _visitT=1.5;
  if(S.world!=="earth"||!SERVER_READY)return;
  const m=nearMansion();
  if(!m||m.visitDone)return;
  m.visitDone=true;
  if(rentedAt(m.id))return;
  fetchClaim(m.id).then(d=>{
    if(!d||d.t===myToken()||offScene(m.g))return;
    m.owner=d.n||"a player";
    /* show their furniture exactly how they placed it */
    if(typeof d.furn==="string"){
      try{
        const items=JSON.parse(d.furn);
        if(Array.isArray(items)){MFURN.set(m.id,items.slice(0,80));buildMansionFurniture(m);}
      }catch(e){}
    }
    const lbl=mpMakeLabel("\u{1F3F0} "+m.owner);
    lbl.scale.set(16,4,1);
    lbl.position.set(m.x,m.baseY+30,m.z+40);
    m.g.add(lbl);
    if(typeof d.shop==="number"&&d.shop>0)buildStall(m,m.owner,d.shop);
    toast("\u{1F3F0} You're visiting "+m.owner+"'s mansion — press T inside for the \u{1F4D6} guest book"+(d.shop?" and \u{1F95F} dumpling shop":"")+"!");
  });
}
function guestbookPath(id){return "/guestbook/"+mpWorldKey()+"/"+fbKey(id);}
async function readGuestbook(id,owner){
  const g=await fbGet(guestbookPath(id));
  const opts=[];
  if(g.ok&&g.data){
    Object.values(g.data).filter(e=>e&&typeof e.m==="string")
      .sort((a,b)=>(b.ts||0)-(a.ts||0)).slice(0,8)
      .forEach(e=>opts.push({label:"\u{1F4DD} "+(e.n||"?")+": "+e.m.slice(0,80),value:"x"}));
  }
  if(!opts.length)opts.push({label:"(The guest book is still empty!)",value:"x"});
  opts.push({label:"✅ Close",value:"x"});
  showDest("\u{1F4D6} Guest book — "+owner+"'s mansion",opts,()=>{});
}
function writeGuestbook(id,owner){
  const msg=prompt("Write something nice in "+owner+"'s guest book:");
  if(!msg||!msg.trim())return;
  fetch(SERVER_API+guestbookPath(id)+".json",{method:"POST",
    body:JSON.stringify({n:mpName(),m:msg.trim().slice(0,100),ts:Date.now()})})
    .then(r=>toast(r.ok?"✍️ Your message is in the guest book!":"\u{1F534} Couldn't write — old database rules?"))
    .catch(()=>toast("\u{1F534} Couldn't reach the guest book."));
}
function openVisitorMenu(m){
  const opts=[];
  if(m.stall)opts.push({label:"\u{1F95F} Buy a dumpling — $"+m.stall.price,value:"buy"});
  opts.push({label:"\u{1F514} Ring the doorbell",value:"bell"});
  opts.push({label:"\u{1F4D6} Read the guest book",value:"read"});
  opts.push({label:"✍️ Write in the guest book",value:"write"});
  opts.push({label:"❌ Leave",value:"cancel"});
  showDest("\u{1F3F0} "+m.owner+"'s mansion",opts,async v=>{
    if(v==="buy"){
      const ok=await sendMoney(m.owner,m.stall.price,null,true);
      if(!ok)return;
      const roll=Math.random();
      let color,hex;
      if(roll<0.03){color="Rainbow";hex=RAINBOW_CSS;}
      else if(roll<0.1){color="Gold";hex="#ffd700";}
      else{const c=DUMP_COLORS[Math.floor(Math.random()*DUMP_COLORS.length)];color=c[0];hex=c[1];}
      DUMP.owned.push({color,hex,glitter:Math.random()<0.08});
      renderDump();saveGame();
      toast("\u{1F95F} Yummy — a "+color+" dumpling from "+m.owner+"'s shop! They got your $"+m.stall.price+".");
    }else if(v==="bell"){
      const home=[...MP.others.values()].some(o=>o.name===m.owner);
      toast("\u{1F514} DING DONG! "+(home?m.owner+" is somewhere in this world — maybe they'll come by!":"Nobody's home right now."));
    }else if(v==="read")readGuestbook(m.id,m.owner);
    else if(v==="write")writeGuestbook(m.id,m.owner);
  });
}
/* ---------- the T editor: buy & place furniture in your mansion + garden ---------- */
const MEDIT={on:false,man:null,sel:null,tool:"place",rot:0};
function renderMeditBar(){
  const w=$("meditItems");w.innerHTML="";
  FURN.forEach(f=>{
    const b=document.createElement("button");
    b.className="fitem"+(MEDIT.sel===f.t&&MEDIT.tool==="place"?" on":"");
    b.innerHTML="<span class='fe'>"+f.e+"</span><span class='fn'>"+f.n+"</span><span class='fp'>"+(f.out?"\u{1F33F} ":"")+"$"+fmtMoney(f.p)+"</span>";
    b.onclick=()=>{MEDIT.sel=f.t;MEDIT.tool="place";renderMeditBar();
      toast((f.out?"\u{1F33F} Garden item — click the LAWN":"\u{1F3E0} Indoor item — click the FLOOR")+" to place your "+f.n+" ($"+fmtMoney(f.p)+")");};
    w.appendChild(b);
  });
  $("meditRemove").classList.toggle("on",MEDIT.tool==="remove");
}
function openMansionEdit(man){
  MEDIT.on=true;MEDIT.man=man;MEDIT.sel=null;MEDIT.tool="place";MEDIT.rot=0;
  renderMeditBar();
  $("meditBar").classList.add("show");
  toast("\u{1F6E0} MANSION EDITOR — pick an item below, then click where to put it. R rotates, T (or ✅ Done) exits.");
}
function closeMansionEdit(){
  const man=MEDIT.man;
  MEDIT.on=false;MEDIT.man=null;
  killGhost();
  $("meditBar").classList.remove("show");
  toast("\u{1F3F0} Mansion saved — enjoy your home!");
  saveGame();
  if(man)syncClaim(man.id);   // visitors see your new layout
}
$("meditBook").onclick=()=>{
  if(MEDIT.man)readGuestbook(MEDIT.man.id,"your");
};
$("meditOrder").onclick=()=>openOrderMenu();
$("meditShop").onclick=()=>{
  const man=MEDIT.man;
  if(!man)return;
  if(MYSHOP[man.id]){
    delete MYSHOP[man.id];saveShops();
    buildMansionFurniture(man);syncClaim(man.id);
    toast("\u{1F6D2} Your dumpling shop is closed.");
    return;
  }
  if(MONEY.v<2000){toast("\u{1F4B0} Opening a dumpling shop costs $2,000 — you have $"+fmtMoney(MONEY.v)+"!");return;}
  const s=prompt("Your dumpling shop is OPEN for $2,000!\nWhat should one dumpling cost? ($5 - $100)","25");
  let price=parseInt(s,10);
  if(!(price>0)){toast("Shop not opened.");return;}
  price=Math.max(5,Math.min(100,price));
  MONEY.v-=2000;updateMoneyUI();saveGame();
  MYSHOP[man.id]=price;saveShops();
  buildMansionFurniture(man);syncClaim(man.id);
  toast("\u{1F6D2}\u{1F95F} Your dumpling shop is OPEN at $"+price+" each — other players' money lands in your inbox!");
};
$("meditDone").onclick=()=>closeMansionEdit();
$("meditRotate").onclick=()=>{MEDIT.rot+=Math.PI/2;toast("\u{1F504} Rotated — next item faces a new way");if(GHOST.lastE)updateGhost(GHOST.lastE);};
$("meditRemove").onclick=()=>{MEDIT.tool=MEDIT.tool==="remove"?"place":"remove";renderMeditBar();killGhost();
  toast(MEDIT.tool==="remove"?"\u{1F5D1} REMOVE mode — click an item to sell it back (full refund)":"Placing items again.");};
/* click on the ground to place / remove */
function meditGroundPoint(e,y){
  const ndc=new THREE.Vector2((e.clientX/innerWidth)*2-1,-(e.clientY/innerHeight)*2+1);
  const rc=new THREE.Raycaster();rc.setFromCamera(ndc,camera);
  if(Math.abs(rc.ray.direction.y)<1e-4)return null;
  const t=(y-rc.ray.origin.y)/rc.ray.direction.y;
  if(t<0)return null;
  return rc.ray.origin.clone().addScaledVector(rc.ray.direction,t);
}
/* 👻 GHOST PREVIEW: a see-through copy of the item follows your mouse and
   shows EXACTLY where (and how, after rotating) it will be placed —
   green = you can place it here, red = not allowed */
const GHOST_OK=keep(new THREE.MeshBasicMaterial({color:0x4ade80,transparent:true,opacity:0.42,depthWrite:false}));
const GHOST_BAD=keep(new THREE.MeshBasicMaterial({color:0xff5c5c,transparent:true,opacity:0.42,depthWrite:false}));
const GHOST={g:null,t:null,rot:null,lastE:null};
function killGhost(){
  if(GHOST.g){scene.remove(GHOST.g);disposeGroup(GHOST.g);GHOST.g=null;GHOST.t=null;}
}
function ghostBuild(man){
  killGhost();
  /* build the real item, but WITHOUT registering beds/chairs/TVs/pools etc. */
  const lens=[hotelBeds.length,chairs.length,TVS.length,TRAMPS.length,POOLS.length,pianos.length];
  const wrap=new THREE.Group();
  try{buildFurnPiece(MEDIT.sel,0,0,0,MEDIT.rot,wrap,man);}catch(e){}
  hotelBeds.length=lens[0];chairs.length=lens[1];TVS.length=lens[2];
  TRAMPS.length=lens[3];POOLS.length=lens[4];pianos.length=lens[5];
  /* footprint square under the item */
  const fp=new THREE.Mesh(new THREE.PlaneGeometry(3,3),GHOST_OK);
  fp.rotation.x=-Math.PI/2;fp.position.y=0.05;wrap.add(fp);
  wrap.traverse(o=>{if(o.isMesh){o.material=GHOST_OK;o.castShadow=false;o.receiveShadow=false;}});
  scene.add(wrap);
  GHOST.g=wrap;GHOST.t=MEDIT.sel;GHOST.rot=MEDIT.rot;
}
function updateGhost(e){
  if(!MEDIT.on||MEDIT.tool!=="place"||!MEDIT.sel||!MEDIT.man||!e||e.target!==renderer.domElement){killGhost();return;}
  const man=MEDIT.man,def=furnDef(MEDIT.sel);
  if(!def){killGhost();return;}
  const pt=meditGroundPoint(e,man.baseY+0.3);
  if(!pt){killGhost();return;}
  if(!GHOST.g||GHOST.t!==MEDIT.sel||GHOST.rot!==MEDIT.rot)ghostBuild(man);
  GHOST.g.position.set(pt.x,pt.y,pt.z);
  /* same rules as really placing it — so the color never lies */
  const dx=pt.x-man.x,dz=pt.z-man.z;
  let ok=true;
  if(man.plot)ok=Math.abs(dx)<=15&&Math.abs(dz)<=15;
  else{
    ok=Math.abs(dx)<=49&&Math.abs(dz)<=49.5;
    if(ok&&def.out!==2){
      const inside=man.house?Math.abs(dx)<14&&Math.abs(dz)<10:Math.abs(dx)<49&&Math.abs(dz)<37;
      if(!def.out&&!inside)ok=false;
      if(def.out===1&&(man.house?inside:Math.abs(dz)<39))ok=false;
    }
  }
  if(MONEY.v<def.p)ok=false;
  const m=ok?GHOST_OK:GHOST_BAD;
  GHOST.g.traverse(o=>{if(o.isMesh)o.material=m;});
}
addEventListener("mousemove",e=>{
  if(!MEDIT.on)return;
  GHOST.lastE=e;
  updateGhost(e);
});
addEventListener("mousedown",e=>{
  if(!MEDIT.on||e.button!==0||e.target!==renderer.domElement)return;
  const man=MEDIT.man;
  const pt=meditGroundPoint(e,man.baseY+0.3);
  if(!pt)return;
  const dx=pt.x-man.x,dz=pt.z-man.z;
  if(man.plot){
    if(Math.abs(dx)>15||Math.abs(dz)>15){toast("\u{1F3D7} That's outside your plot — build inside the white fence!");return;}
  }
  else if(Math.abs(dx)>49||Math.abs(dz)>49.5){toast("That's outside your mansion's block!");return;}
  const items=mansionItems(man.id);
  if(MEDIT.tool==="remove"){
    let bi=-1,bd=3;
    items.forEach((it,i)=>{const d=Math.hypot(it.dx-dx,it.dz-dz);if(d<bd){bd=d;bi=i;}});
    if(bi<0){toast("Click closer to an item to remove it.");return;}
    const it=items.splice(bi,1)[0];
    const def=furnDef(it.t);
    if(def){MONEY.v+=def.p;updateMoneyUI();}
    buildMansionFurniture(man);saveGame();
    toast("\u{1F5D1} "+(def?def.n+" sold back for $"+fmtMoney(def.p):"Removed")+"!");
    return;
  }
  const def=furnDef(MEDIT.sel);
  if(!def){toast("Pick an item from the shop bar first!");return;}
  if(!man.plot&&def.out!==2){
    const inside=man.house?Math.abs(dx)<14&&Math.abs(dz)<10:Math.abs(dx)<49&&Math.abs(dz)<37;
    if(!def.out&&!inside){toast("\u{1F3E0} "+def.n+" is an INDOOR item — place it inside "+(man.house?"the house":"the mansion")+"!");return;}
    if(def.out===1&&(man.house?inside:Math.abs(dz)<39)){toast("\u{1F33F} "+def.n+" is a GARDEN item — place it on the lawn "+(man.house?"around the house":"in FRONT of (or behind) the mansion")+"!");return;}
  }
  if(MONEY.v<def.p){toast("\u{1F4B0} The "+def.n+" costs $"+fmtMoney(def.p)+" — you only have $"+fmtMoney(MONEY.v)+"!");return;}
  MONEY.v-=def.p;updateMoneyUI();profileSave();
  items.push({t:def.t,dx:Math.round(dx*10)/10,dz:Math.round(dz*10)/10,r:MEDIT.rot});
  buildMansionFurniture(man);saveGame();
  toast("✅ "+def.n+" placed! ($"+fmtMoney(def.p)+")");
  if(GHOST.lastE)updateGhost(GHOST.lastE);   // ghost color updates (money changed)
});
/* ================= PIANOS: play them yourself + MIDI + the concert crowd ================= */
const PIANO={open:false,cur:null,midi:false};
const PKEY_START=60;   // C4 — two octaves on screen
const PKEYMAP={a:60,w:61,s:62,e:63,d:64,f:65,t:66,g:67,y:68,h:69,u:70,j:71,k:72,o:73,l:74,p:75,";":76};
function pianoFreq(m){return 440*Math.pow(2,(m-69)/12);}
function playPianoNote(midi,vel){
  ensureAudio();
  if(!audioCtx||!SND.sound)return;
  const t=audioCtx.currentTime,v=(vel===undefined?0.8:vel);
  const g=audioCtx.createGain();
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(0.16*v,t+0.006);
  g.gain.exponentialRampToValueAtTime(0.0008,t+1.6);
  g.connect(audioCtx.destination);
  [[1,"triangle",1],[2,"sine",0.35],[3,"sine",0.12]].forEach(([mult,type,amt])=>{
    const o=audioCtx.createOscillator(),og=audioCtx.createGain();
    o.type=type;o.frequency.value=pianoFreq(midi)*mult;og.gain.value=amt;
    o.connect(og);og.connect(g);o.start(t);o.stop(t+1.7);
  });
  /* light up the key on screen */
  const el=document.querySelector('#pianoKeys [data-m="'+midi+'"]');
  if(el){el.classList.add("on");clearTimeout(el._x);el._x=setTimeout(()=>el.classList.remove("on"),180);}
}
function buildPianoKeys(){
  const w=$("pianoKeys");
  if(w.dataset.done)return;w.dataset.done=1;
  const isBlack=m=>[1,3,6,8,10].includes(m%12);
  const whites=[];
  for(let m=PKEY_START;m<=PKEY_START+24;m++)if(!isBlack(m))whites.push(m);
  whites.forEach(m=>{
    const k=document.createElement("div");k.className="pkey";k.dataset.m=m;
    k.addEventListener("pointerdown",e=>{e.preventDefault();playPianoNote(m);});
    w.appendChild(k);
  });
  const ww=100/whites.length;
  for(let m=PKEY_START;m<=PKEY_START+24;m++){
    if(!isBlack(m))continue;
    const below=whites.filter(x=>x<m).length;   // black key sits between white below-1 and below
    const k=document.createElement("div");k.className="pkeyb";k.dataset.m=m;
    k.style.left=(below*ww-ww*0.3)+"%";k.style.width=(ww*0.6)+"%";
    k.addEventListener("pointerdown",e=>{e.preventDefault();e.stopPropagation();playPianoNote(m);});
    w.appendChild(k);
  }
}
function initMidi(){
  if(PIANO.midi||!navigator.requestMIDIAccess)return;
  PIANO.midi=true;
  navigator.requestMIDIAccess().then(acc=>{
    const hook=inp=>{inp.onmidimessage=msg=>{
      const[st,note,vel]=msg.data;
      if((st&0xf0)===0x90&&vel>0&&PIANO.open)playPianoNote(note,vel/127);
    };};
    acc.inputs.forEach(hook);
    acc.onstatechange=e=>{if(e.port&&e.port.type==="input"&&e.port.state==="connected")hook(e.port);};
    if([...acc.inputs.values()].length)toast("\u{1F3B9} MIDI keyboard connected — play away!");
  }).catch(()=>{});
}
/* ---- concert piano locks: while a player gives a concert, only THEY can play ---- */
const PLOCK_TTL=15*60*1000;   // a crashed player's lock frees itself after 15 min
function pianoLockPath(p){return "/pianolock/"+mpWorldKey()+"/"+fbKey("H:"+Math.round(p.x)+","+Math.round(p.z));}
async function lockPiano(p){
  if(!SERVER_READY)return true;
  if(await fbPut(pianoLockPath(p),{t:myToken(),n:mpName(),ts:Date.now()}))return true;
  const g=await fbGet(pianoLockPath(p));
  if(g.ok&&g.data&&!g.data.free&&g.data.t!==myToken()&&Date.now()-(g.data.ts||0)<PLOCK_TTL)return false;
  return true;   // old rules — locks can't be stored yet, play on
}
function unlockPiano(p){
  if(!SERVER_READY)return;
  fbPut(pianoLockPath(p),{t:myToken(),n:mpName(),ts:Date.now(),free:true});
}
function crowdBtnUI(p){
  $("pianoCrowd").style.display=p&&p.hall?"":"none";
  $("pianoCrowd").innerHTML=p&&p.crowded?"\u{1F51A} End the concert — the crowd claps & pays!":"\u{1F3AD} Play piano — call the crowd!";
}
function reallyOpenPiano(p){
  PIANO.open=true;PIANO.cur=p;
  buildPianoKeys();initMidi();
  crowdBtnUI(p);
  $("pianoModal").classList.add("open");
}
function openPiano(p){
  /* a concert piano someone ELSE is using is locked until they end the concert */
  if(p.hall&&!p.crowded&&SERVER_READY){
    fbGet(pianoLockPath(p)).then(g=>{
      const d=g.ok?g.data:null;
      if(d&&!d.free&&d.t!==myToken()&&Date.now()-(d.ts||0)<PLOCK_TTL){
        toast("\u{1F3B9} "+(d.n||"Another player")+" is giving a concert on this piano — you can play once they end it!");
        return;
      }
      reallyOpenPiano(p);
    });
    return;
  }
  reallyOpenPiano(p);
}
$("pianoClose").onclick=()=>{PIANO.open=false;$("pianoModal").classList.remove("open");};
/* ---------- upload a .MID file and the piano PLAYS it, live ---------- */
function parseMidi(buf){
  const d=new DataView(buf);
  let p=0;
  function str(n){let s="";for(let i=0;i<n;i++)s+=String.fromCharCode(d.getUint8(p++));return s;}
  function u32(){const v=d.getUint32(p);p+=4;return v;}
  function u16(){const v=d.getUint16(p);p+=2;return v;}
  function vlq(){let v=0;for(;;){const b=d.getUint8(p++);v=(v<<7)|(b&0x7f);if(!(b&0x80))return v;}}
  if(str(4)!=="MThd")throw new Error("not midi");
  u32();u16();
  const ntrk=u16(),div=u16();
  const raw=[],tempos=[{tick:0,us:500000}];
  for(let t=0;t<ntrk;t++){
    if(str(4)!=="MTrk")break;
    const len=u32(),end=p+len;
    let tick=0,run=0;
    while(p<end){
      tick+=vlq();
      let st=d.getUint8(p);
      if(st&0x80){p++;run=st;}else st=run;
      const type=st&0xf0,chan=st&0x0f;
      if(type===0x90){
        const note=d.getUint8(p++),vel=d.getUint8(p++);
        if(vel>0&&chan!==9&&note>=21&&note<=108)raw.push({tick,note,vel});   // skip drums
      }
      else if(type===0x80||type===0xa0||type===0xb0||type===0xe0)p+=2;
      else if(type===0xc0||type===0xd0)p+=1;
      else if(st===0xff){
        const mt=d.getUint8(p++),ln=vlq();
        if(mt===0x51&&ln===3)tempos.push({tick,us:(d.getUint8(p)<<16)|(d.getUint8(p+1)<<8)|d.getUint8(p+2)});
        p+=ln;
      }
      else if(st===0xf0||st===0xf7)p+=vlq();
      else break;
    }
    p=end;
  }
  /* ticks → seconds, following every tempo change */
  tempos.sort((a,b)=>a.tick-b.tick);
  raw.sort((a,b)=>a.tick-b.tick);
  const out=[];
  let curT=0,curTick=0,us=500000,ti=0;
  for(const e of raw){
    while(ti<tempos.length&&tempos[ti].tick<=e.tick){
      curT+=(tempos[ti].tick-curTick)*us/div/1e6;
      curTick=tempos[ti].tick;us=tempos[ti].us;ti++;
    }
    out.push({time:curT+(e.tick-curTick)*us/div/1e6,note:e.note,vel:e.vel});
  }
  return out;
}
const MIDIPLAY={events:null,idx:0,start:0,on:false};
$("midiBtn").onclick=()=>$("midiFile").click();
$("midiFile").addEventListener("change",e=>{
  const f=e.target.files[0];
  if(!f)return;
  const rd=new FileReader();
  rd.onload=()=>{
    try{
      const ev=parseMidi(rd.result);
      if(!ev.length)throw new Error("empty");
      MIDIPLAY.events=ev;MIDIPLAY.idx=0;MIDIPLAY.start=performance.now();MIDIPLAY.on=true;
      $("midiStop").style.display="";
      ensureAudio();
      toast("\u{1F3B9}\u{1F4C2} Now playing YOUR song: "+f.name+" ("+ev.length+" notes) — the concert piano performs it live!");
    }catch(err){toast("❌ That doesn't look like a valid .MID file!");}
  };
  rd.readAsArrayBuffer(f);
  e.target.value="";
});
$("midiStop").onclick=()=>{
  MIDIPLAY.on=false;
  $("midiStop").style.display="none";
  toast("⏹ MIDI stopped.");
};
function updateMidi(){
  if(!MIDIPLAY.on)return;
  const t=(performance.now()-MIDIPLAY.start)/1000;
  let played=0;
  while(MIDIPLAY.idx<MIDIPLAY.events.length&&MIDIPLAY.events[MIDIPLAY.idx].time<=t){
    const e=MIDIPLAY.events[MIDIPLAY.idx++];
    if(played<12){playPianoNote(e.note,Math.min(1,e.vel/127));played++;}
  }
  if(MIDIPLAY.idx>=MIDIPLAY.events.length){
    MIDIPLAY.on=false;
    $("midiStop").style.display="none";
    toast("\u{1F3B9} Your MIDI song finished — \u{1F44F}\u{1F44F}!");
  }
}
/* the concert crowd: they walk in through the door and sit down on the seats */
const CROWD=[];
$("pianoCrowd").onclick=async()=>{
  const p=PIANO.cur;
  if(!p||!p.hall)return;
  if(p.crowded){endConcert(p);return;}
  if(!await lockPiano(p)){toast("\u{1F512} Another player just started a concert on this piano!");return;}
  p.crowded=true;
  crowdBtnUI(p);
  const hall=p.hall;
  hall.seats.forEach((s,i)=>{
    const m=makePerson(0.95);
    m.position.set(hall.entrance.x+(Math.random()-0.5)*8,hall.baseY,hall.entrance.z+Math.random()*6);
    p.g.parent.add(m);
    CROWD.push({m,tx:s.x,tz:s.z,ty:hall.baseY,yaw:s.yaw,state:"walk",delay:i*0.35*Math.random()*2});
  });
  toast("\u{1F3AD} Here they come! A whole crowd walks in to hear you play...");
};
function endConcert(p){
  p.crowded=false;
  unlockPiano(p);
  crowdBtnUI(p);
  let n=0;
  CROWD.forEach(c=>{
    if(c.state==="out"||c.state==="clap")return;
    n++;
    c.state="clap";c.t=2+Math.random()*2;
    c.exitX=p.hall.entrance.x+(Math.random()-0.5)*8;
    c.exitZ=p.hall.entrance.z+2+Math.random()*5;
  });
  if(n>0){
    /* REAL players in the audience multiply the tips! */
    let real=0;
    for(const o of MP.others.values())if(Math.hypot(o.x-p.x,o.z-p.z)<26)real++;
    const mult=1+real;
    const tip=n*(4+Math.floor(Math.random()*9))*mult;
    p.hatMoney=(p.hatMoney||0)+tip;
    if(p.hatBills)p.hatBills.visible=true;
    toast("\u{1F44F}\u{1F44F} BRAVO! The crowd claps and drops $"+tip+" in the \u{1F3A9} hat"
      +(real?" — "+real+" REAL player"+(real>1?"s":"")+" watched, tips x"+mult+"!":" on the way out — press T at the hat to collect it!"));
    pushNews("\u{1F3B9} "+mpName()+" gave a concert — the crowd tipped $"+tip+"!");
  }else toast("\u{1F3B5} Concert over — nobody was in the seats this time.");
}
function updateCrowd(dt){
  const now=performance.now();
  for(let i=CROWD.length-1;i>=0;i--){
    const c=CROWD[i];
    if(offScene(c.m)){CROWD.splice(i,1);continue;}
    if(c.state==="sit")continue;
    const L=c.m.userData.limbs;
    if(c.state==="clap"){
      /* standing ovation: arms up, clapping fast */
      c.t-=dt;
      c.m.position.y=c.ty;
      const a=Math.sin(now/80+i)*0.35;
      L.lL.rotation.x=0;L.rL.rotation.x=0;
      L.lA.rotation.x=-2.3+a;L.rA.rotation.x=-2.3-a;
      if(c.t<=0){
        c.state="out";
        c.tx=c.exitX;c.tz=c.exitZ;
        L.lA.rotation.x=0;L.rA.rotation.x=0;
      }
      continue;
    }
    if(c.delay>0){c.delay-=dt;continue;}
    const dx=c.tx-c.m.position.x,dz=c.tz-c.m.position.z,d=Math.hypot(dx,dz);
    if(d<0.35){
      if(c.state==="out"){
        /* reached the door: wave goodbye and vanish */
        if(c.m.parent)c.m.parent.remove(c.m);
        disposeGroup(c.m);
        CROWD.splice(i,1);
        continue;
      }
      c.m.position.set(c.tx,c.ty+0.6,c.tz);
      c.m.rotation.y=c.yaw;
      L.lL.rotation.x=-1.5;L.rL.rotation.x=-1.5;L.lA.rotation.x=-0.4;L.rA.rotation.x=-0.4;
      c.state="sit";
      continue;
    }
    const yaw=Math.atan2(dx,dz);
    c.m.rotation.y=yaw;
    c.m.position.x+=Math.sin(yaw)*2*dt;
    c.m.position.z+=Math.cos(yaw)*2*dt;
    const a=Math.sin(now/160+i)*0.5;
    L.lL.rotation.x=a;L.rL.rotation.x=-a;L.lA.rotation.x=-a*0.7;L.rA.rotation.x=a*0.7;
  }
}
/* ================= DUMPLING MUSEUM: see & buy the rainbow glitter dumpling ================= */
const MUSEUM_PRICE=300;
function nearMuseum(){
  for(let i=museums.length-1;i>=0;i--){
    const m=museums[i];
    if(offScene(m.g)){museums.splice(i,1);continue;}
    if(Math.abs(player.x-m.x)<11&&Math.abs(player.z-m.z)<9)return m;
  }
  return null;
}
function openMuseum(){
  showDest("\u{1F3DB} Dumpling Museum — the RAINBOW GLITTER dumpling!",[
    {label:"\u{1F308}✨ Buy a RAINBOW GLITTER dumpling — $"+MUSEUM_PRICE,value:"buy"},
    {label:"\u{1F440} Just looking, thanks!",value:"no"}
  ],v=>{
    if(v!=="buy")return;
    if(MONEY.v<MUSEUM_PRICE){toast("\u{1F4B0} It costs $"+MUSEUM_PRICE+" — you only have $"+fmtMoney(MONEY.v)+". Sell some dumplings first!");return;}
    MONEY.v-=MUSEUM_PRICE;updateMoneyUI();profileSave();
    DUMP.owned.push({color:"Rainbow",hex:RAINBOW_CSS,glitter:true});
    renderDump();saveGame();
    toast("\u{1F308}✨ A RAINBOW GLITTER DUMPLING is yours — the rarest dumpling, straight from the museum!");
  });
}
function updateMuseums(dt){
  for(let i=museums.length-1;i>=0;i--){
    const m=museums[i];
    if(offScene(m.g)){museums.splice(i,1);continue;}
    m.dump.rotation.y+=dt*0.9;
  }
}
/* ---------- your own world + saving (progress survives refresh) ---------- */
const WORLD={name:"",ox:0,oz:0};
function worldOffset(n){
  let h=0;for(let i=0;i<n.length;i++)h=(h*31+n.charCodeAt(i))>>>0;
  /* every name lands in its own far-away region of the infinite world */
  return{ox:(h%89)*12000,oz:(Math.floor(h/89)%83)*12000};
}
function applyWorldUI(){
  $("worldLabel").textContent=WORLD.name?"\u{1F30D} World: "+WORLD.name+" — pick a vehicle!":"";
  $("worldTxt").textContent=WORLD.name?"\u{1F30D} "+WORLD.name:"";
}
function setWorld(n){
  if(n){const o=worldOffset(n);WORLD.name=n;WORLD.ox=o.ox;WORLD.oz=o.oz;}
  else{WORLD.name="";WORLD.ox=0;WORLD.oz=0;}
  applyWorldUI();renderWorldList();saveGame();
  /* banned players bounce right back out of this world */
  if(n&&SERVER_READY)fetch(SERVER_API+"/mod/"+worldKeyOf(n)+"/"+payKey(mpName())+".json",{cache:"no-store"})
    .then(r=>r.json()).then(d=>{
      if(d&&d.until&&d.until>Date.now()&&WORLD.name===n)
        bootMe(d.until>=BAN_FOREVER
          ?"⛔ You are BANNED FOREVER from \""+n+"\" by the owner!"
          :"⛔ You are banned from \""+n+"\" until "+new Date(d.until).toLocaleString()+"!");
    }).catch(()=>{});
}
/* ---------- world OWNERSHIP: the worlds & servers YOU created ---------- */
const MYWORLDS={list:[]};
try{const d=JSON.parse(localStorage.getItem("vc4myworlds")||"[]");
  if(Array.isArray(d))MYWORLDS.list=d.filter(n=>typeof n==="string"&&n);}catch(e){}
function myWorldsAdd(n){
  if(n&&!MYWORLDS.list.includes(n)){
    MYWORLDS.list.push(n);
    try{localStorage.setItem("vc4myworlds",JSON.stringify(MYWORLDS.list))}catch(e){}
  }
}
/* am I the 👑 owner of the world I'm in? My own city = always mine.
   A listed server = whoever created it. A private world = whoever made it. */
function isOwner(){
  if(!WORLD.name)return true;   // my own city
  const srv=SERVERS.list.find(s=>s&&s.name&&s.name.toLowerCase()===WORLD.name.toLowerCase());
  if(srv&&srv.owner)return payKey(srv.owner)===profileKey();
  return MYWORLDS.list.includes(WORLD.name);
}
/* ---------- your world list (saved in localStorage) ---------- */
const WORLDS={list:[]};
function loadWorlds(){
  try{const d=JSON.parse(localStorage.getItem("vc4worlds")||"[]");
    if(Array.isArray(d))WORLDS.list=d.filter(n=>typeof n==="string"&&n);}catch(e){}
}
function saveWorlds(){try{localStorage.setItem("vc4worlds",JSON.stringify(WORLDS.list))}catch(e){}}
function addWorld(n){
  if(n&&!WORLDS.list.includes(n)){WORLDS.list.push(n);saveWorlds();}
  renderWorldList();
}
function renderWorldList(){
  const w=$("worldList");w.innerHTML="";
  if(!WORLDS.list.length)return;
  const mk=(label,on,click)=>{
    const b=document.createElement("button");
    b.className="wchip"+(on?" on":"");b.textContent=label;b.onclick=click;
    w.appendChild(b);return b;
  };
  mk("\u{1F3E0} My city (private)",!WORLD.name,()=>{setWorld("");toast("\u{1F3E0} Back in YOUR OWN city — no strangers here, pick a vehicle!");});
  WORLDS.list.forEach(n=>{
    const b=mk("\u{1F30D} "+n,WORLD.name===n,()=>{setWorld(n);toast("\u{1F30D} Switched to world \""+n+"\" — pick a vehicle!");});
    const x=document.createElement("i");
    x.textContent="✕";x.title="Forget this world";
    x.onclick=e=>{
      e.stopPropagation();
      WORLDS.list=WORLDS.list.filter(m=>m!==n);saveWorlds();
      if(WORLD.name===n)setWorld("");else renderWorldList();
    };
    b.appendChild(x);
  });
}
$("worldCreate").onclick=()=>{
  const n=$("worldName").value.trim();
  if(!n){toast("Type a world name first!");return;}
  myWorldsAdd(n);
  setWorld(n);addWorld(n);
  toast("\u{1F30D} World \""+n+"\" created — you are the \u{1F451} OWNER! Pick a vehicle and play!");
};
/* ---------- servers tab: shared online list (Firebase Realtime Database) ----------
   paste your own database URL below — see FIREBASE-SETUP.md (free, ~5 minutes) */
const SERVER_API="https://vc4-servers-default-rtdb.europe-west1.firebasedatabase.app";
const SERVER_READY=!SERVER_API.includes("YOUR-PROJECT");
const SERVERS={list:[],q:"",online:false,loaded:false,fetching:false,busy:false};
/* keep names simple: letters, numbers, spaces and a little punctuation */
function cleanServerName(n){return n.replace(/[^\p{L}\p{N} _\-.!?]/gu,"").trim().slice(0,20).trim();}
function cacheServers(){try{localStorage.setItem("vc4servers",JSON.stringify(SERVERS.list))}catch(e){}}
function serverStatus(msg){$("serverStatus").textContent=msg;}
async function refreshServers(){
  if(SERVERS.fetching)return;
  SERVERS.fetching=true;
  serverStatus("⏳ Loading servers...");
  try{
    if(!SERVER_READY)throw 0;
    const r=await fetch(SERVER_API+"/servers.json",{cache:"no-store"});
    if(!r.ok)throw 0;
    const d=await r.json();
    SERVERS.list=d&&typeof d==="object"?Object.values(d).filter(s=>s&&typeof s.name==="string"):[];
    SERVERS.online=true;cacheServers();
  }catch(e){
    SERVERS.online=false;
    try{const c=JSON.parse(localStorage.getItem("vc4servers")||"[]");
      SERVERS.list=Array.isArray(c)?c:[];}catch(_){SERVERS.list=[];}
  }
  SERVERS.fetching=false;SERVERS.loaded=true;
  renderServers();
}
function renderServers(){
  if(!SERVERS.loaded){refreshServers();return;}
  const q=SERVERS.q.toLowerCase();
  const list=SERVERS.list.filter(s=>s&&s.name&&(!q||s.name.toLowerCase().includes(q)));
  serverStatus(SERVERS.online
    ?"\u{1F7E2} Online — "+SERVERS.list.length+" server"+(SERVERS.list.length===1?"":"s")+". Everyone who joins a server plays in the same world!"
    :(SERVER_READY
      ?"\u{1F534} Offline — couldn't reach the server list, showing the last one saved on this device."
      :"\u{1F534} Offline — online servers aren't set up yet: paste your Firebase database URL in js/game.js (see FIREBASE-SETUP.md). Servers save on this device only."));
  const el=$("serverList");el.innerHTML="";
  if(!list.length){
    const d=document.createElement("div");d.className="srvEmpty";
    d.textContent=q?"No servers match \""+SERVERS.q+"\".":"No servers yet — create the first one!";
    el.appendChild(d);return;
  }
  list.forEach(s=>{
    const joined=WORLD.name===s.name;
    const row=document.createElement("div");row.className="srvRow"+(joined?" here":"");
    const nm=document.createElement("div");nm.className="nm";nm.textContent="\u{1F310} "+s.name;
    /* the server creator is always written under the server name */
    const inf=document.createElement("div");inf.className="inf";
    inf.textContent="\u{1F451} by "+(s.owner||"unknown")+(s.created?" · created "+s.created:"");
    const b=document.createElement("button");b.className="btn"+(joined?" on":" warn");
    b.textContent=joined?"✅ Joined":"▶ Join";
    b.onclick=()=>joinServer(s.name);
    row.appendChild(nm);row.appendChild(inf);row.appendChild(b);
    el.appendChild(row);
  });
}
function joinServer(n){
  setWorld(n);addWorld(n);
  renderServers();
  toast("\u{1F310} Joined server \""+n+"\" — pick a vehicle and play!");
}
async function createServer(){
  const n=cleanServerName($("serverNew").value);
  if(!n){toast("Type a server name first!");return;}
  if(SERVERS.busy)return;
  if(SERVERS.list.some(s=>s&&s.name&&s.name.toLowerCase()===n.toLowerCase())){
    toast("That server already exists — joining it instead!");
    joinServer(SERVERS.list.find(s=>s.name.toLowerCase()===n.toLowerCase()).name);
    $("serverNew").value="";
    return;
  }
  SERVERS.busy=true;
  serverStatus("⏳ Creating server...");
  const rec={name:n,created:new Date().toISOString().slice(0,10),owner:mpName()};
  try{
    if(!SERVER_READY)throw 0;
    let r=await fetch(SERVER_API+"/servers.json",{method:"POST",body:JSON.stringify(rec)});
    /* old Firebase rules don't accept the owner field yet — retry without it */
    if(!r.ok)r=await fetch(SERVER_API+"/servers.json",{method:"POST",body:JSON.stringify({name:rec.name,created:rec.created})});
    if(!r.ok)throw 0;
    SERVERS.online=true;
    toast("\u{1F310} Server \""+n+"\" created for everyone — you are the \u{1F451} OWNER!");
  }catch(e){
    SERVERS.online=false;
    toast("\u{1F534} Offline — server only saved on this device for now.");
  }
  SERVERS.list.push(rec);cacheServers();
  SERVERS.busy=false;
  $("serverNew").value="";
  myWorldsAdd(n);
  joinServer(n);
}
$("serverCreate").onclick=createServer;
$("serverRefresh").onclick=()=>{SERVERS.loaded=false;renderServers();};
$("serverSearch").addEventListener("input",()=>{SERVERS.q=$("serverSearch").value.trim();if(SERVERS.loaded)renderServers();});
$("serverNew").addEventListener("keydown",e=>{if(e.key==="Enter")createServer();});
/* ================= 🌍 WORLDS TAB: your worlds, shared worlds & invites =================
   Invites ride the payments inbox (d = "INV|kind|world"), so the moment the
   invited player is online their game collects it and shows a notification. */
const SHARED={list:[]};
function loadShared(){
  try{const d=JSON.parse(localStorage.getItem("vc4shared")||"[]");
    if(Array.isArray(d))SHARED.list=d.filter(s=>s&&typeof s.n==="string");}catch(e){}
}
function saveShared(){try{localStorage.setItem("vc4shared",JSON.stringify(SHARED.list))}catch(e){}}
loadShared();
function addShared(n,from,mc){
  if(SHARED.list.some(s=>s.n===n&&!!s.mc===!!mc))return;
  SHARED.list.push({n,from:from||"",mc:!!mc});saveShared();
  try{renderWorldsTab();}catch(e){}
}
function wtRow(parent,name,info,btnLabel,onGo,onDel){
  const row=document.createElement("div");row.className="srvRow";
  const nm=document.createElement("div");nm.className="nm";nm.textContent=name;
  const inf=document.createElement("div");inf.className="inf";inf.textContent=info;
  const b=document.createElement("button");b.className="btn warn";b.textContent=btnLabel;b.onclick=onGo;
  row.appendChild(nm);row.appendChild(inf);row.appendChild(b);
  if(onDel){
    const x=document.createElement("button");x.className="btn";x.textContent="✕";x.title="Remove";
    x.onclick=onDel;row.appendChild(x);
  }
  parent.appendChild(row);
}
function renderWorldsTab(){
  const mine=$("wtMine");mine.innerHTML="";
  if(!WORLDS.list.length){
    const d=document.createElement("div");d.className="srvEmpty";
    d.textContent="No worlds yet — type a name in the bar at the top and hit \u{1F30D} Create world!";
    mine.appendChild(d);
  }
  WORLDS.list.forEach(n=>{
    wtRow(mine,"\u{1F30D} "+n,WORLD.name===n?"you are here":"",
      WORLD.name===n?"✅ Joined":"▶ Join",
      ()=>{setWorld(n);renderWorldsTab();toast("\u{1F30D} Switched to world \""+n+"\" — pick a vehicle and play!");});
    const row=mine.lastChild;
    const inv=document.createElement("button");inv.className="btn";inv.textContent="\u{1F4E8} Invite";
    inv.onclick=()=>openInviteSearch(n,false);
    row.appendChild(inv);
  });
  const sh=$("wtShared");sh.innerHTML="";
  if(!SHARED.list.length){
    const d=document.createElement("div");d.className="srvEmpty";
    d.textContent="Nothing here yet — when a friend invites you to a world, it appears here!";
    sh.appendChild(d);
  }
  SHARED.list.forEach((s,i)=>{
    wtRow(sh,(s.mc?"⛏️ Minecraft":"\u{1F30D} "+s.n),s.from?"invited by "+s.from:"",
      s.mc?"⛏️ Enter":"▶ Join",
      ()=>{
        if(s.mc){wtEnterMc();return;}
        setWorld(s.n);addWorld(s.n);renderWorldsTab();
        toast("\u{1F30D} Joined "+s.from+"'s world \""+s.n+"\" — pick a vehicle and play!");
      },
      ()=>{SHARED.list.splice(i,1);saveShared();renderWorldsTab();});
  });
}
/* invite search: exact username lookup online + whoever is driving around right now */
let WT_TARGET=null;   // the world the next invite is for (null = ask)
function openInviteSearch(world,mc){
  WT_TARGET={world,mc};
  $("wtSearch").focus();
  toast("\u{1F4E8} Type your friend's username and hit \u{1F50D} Search to invite them to "+(mc?"MINECRAFT":"\""+world+"\"")+"!");
}
async function wtDoSearch(){
  const q=cleanServerName($("wtSearch").value).slice(0,16);
  const out=$("wtResults");out.innerHTML="";
  if(q.length<3){out.innerHTML="<div class='srvEmpty'>Type at least 3 letters of your friend's username.</div>";return;}
  out.innerHTML="<div class='srvEmpty'>⏳ Searching...</div>";
  const found=new Map();
  /* players online right now (substring match) */
  for(const o of MP.others.values())
    if(o.name&&o.name.toLowerCase().includes(q.toLowerCase()))found.set(o.name,"\u{1F7E2} online now");
  /* exact username lookup in the online database */
  try{
    if(SERVER_READY){
      const r=await fetch(SERVER_API+"/usernames/"+payKey(q)+".json",{cache:"no-store"});
      if(r.ok){const d=await r.json();if(d&&d.name&&!found.has(d.name))found.set(d.name,"registered player");}
    }
  }catch(e){}
  out.innerHTML="";
  if(!found.size){
    out.innerHTML="<div class='srvEmpty'>No player called \""+q+"\" found — usernames must match exactly (ask your friend for theirs!).</div>";
    return;
  }
  for(const[name,info]of found){
    if(payKey(name)===profileKey())continue;   // that's you
    wtRow(out,"\u{1F464} "+name,info,"\u{1F4E8} Invite",()=>inviteFlow(name));
  }
  if(!out.children.length)out.innerHTML="<div class='srvEmpty'>\u{1F914} That's you — invite someone else!</div>";
}
function inviteFlow(name){
  const send=(world,mc)=>sendInvite(name,world,mc);
  if(WT_TARGET){const t=WT_TARGET;WT_TARGET=null;send(t.world,t.mc);return;}
  const opts=WORLDS.list.map(n=>({label:"\u{1F30D} "+n,value:"w:"+n}));
  opts.push({label:"⛏️ The MINECRAFT world",value:"mc"});
  opts.push({label:"❌ Cancel",value:"cancel"});
  showDest("\u{1F4E8} Invite "+name+" to which world?",opts,v=>{
    if(v==="cancel")return;
    if(v==="mc")send("Minecraft",true);
    else send(v.slice(2),false);
  });
}
async function sendInvite(name,world,mc){
  const ok=await sendMoney(name,1,{d:"INV|"+(mc?"mc":"w")+"|"+String(world).slice(0,40)},true);
  if(ok)toast("\u{1F4E8} Invite sent! "+name+" gets a notification the moment they play"+(mc?" — MINECRAFT together (each in their own blocky world)!":" and your world appears in their \u{1F30D} Worlds tab!"));
}
$("wtSearchBtn").onclick=wtDoSearch;
$("wtSearch").addEventListener("keydown",e=>{if(e.key==="Enter")wtDoSearch();});
function wtEnterMc(){
  if(S.mode!=="game"){
    /* not playing yet? start the game with your (last) vehicle, then dive in */
    const v=S.selected||VEHICLES.find(x=>OWN.has(x.name))||VEHICLES[VEHICLES.length-1];
    startGame(v);
  }
  enterMc();
}
$("wtMc").onclick=wtEnterMc;
/* ---------- multiplayer presence: see other players in your world (Firebase) ----------
   every player writes their position ~5x/second to players/<world>/<id> and
   listens to everyone else's; other players appear as cars/people with name tags. */
const MP={sdk:false,on:false,id:"p"+Math.random().toString(36).slice(2,10),ref:null,myRef:null,
  others:new Map(),sendT:0,worldKey:null,lastSig:"",lastSendAt:0,
  fallback:"Racer"+Math.floor(100+Math.random()*900)};
function mpName(){
  const n=cleanServerName(localStorage.getItem("vc4pname")||"").slice(0,16);
  return n||MP.fallback;
}
/* ---------- unique usernames: claimed online, first come first served ---------- */
function myToken(){
  let t=localStorage.getItem("vc4ptoken");
  if(!t){t="t"+Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem("vc4ptoken",t);}
  return t;
}
/* simple accounts: just pick a username — first come, first served */
async function claimName(raw){
  const n=cleanServerName(raw||"").slice(0,16);
  if(n.length<3)return{ok:false,msg:"Use at least 3 letters or numbers."};
  if(!SERVER_READY)return{ok:true,offline:true,name:n};
  const key=n.toLowerCase().replace(/[^a-z0-9]/g,"_");
  const url=SERVER_API+"/usernames/"+key+".json";
  try{
    const r=await fetch(url,{cache:"no-store"});
    if(!r.ok)throw 0;
    const d=await r.json();
    if(d&&d.t===myToken())return{ok:true,name:n};          /* already mine */
    if(d)return{ok:false,msg:"\""+n+"\" is already taken — try another!"};
    const w=await fetch(url,{method:"PUT",
      body:JSON.stringify({t:myToken(),name:n,created:new Date().toISOString().slice(0,10)})});
    if(!w.ok)return{ok:false,msg:"\""+n+"\" is already taken — try another!"}; /* lost the race */
    return{ok:true,name:n};
  }catch(e){return{ok:true,offline:true,name:n};}          /* offline: allow for now */
}
async function doClaim(){
  const btn=$("nameClaim");
  btn.disabled=true;
  $("nameStatus").textContent="⏳ Checking if that name is free...";
  const res=await claimName($("nameInput").value);
  btn.disabled=false;
  if(!res.ok){$("nameStatus").textContent="❌ "+res.msg;return;}
  localStorage.setItem("vc4pname",res.name);
  localStorage.setItem("vc4nameok","1");
  $("pName").value=res.name;
  $("nameModal").classList.remove("open");
  profileLoad();
  toast(res.offline
    ?"\u{1F464} You are \""+res.name+"\" (offline — not reserved online yet)"
    :"\u{1F464} Username \""+res.name+"\" is yours!");
}
$("nameClaim").onclick=doClaim;
$("nameInput").addEventListener("keydown",e=>{if(e.key==="Enter")doClaim();});
$("nameInput").addEventListener("input",()=>{$("nameStatus").textContent="";});
$("nameSkip").onclick=()=>{
  localStorage.setItem("vc4nameok","1");
  $("nameModal").classList.remove("open");
  toast("\u{1F464} You are \""+mpName()+"\" for now — pick a real name in ⚙ Settings!");
};
/* pick a username before playing — also shows once for players from before
   this update (their old auto-saved Racer name was never really chosen) */
if(!localStorage.getItem("vc4nameok")){
  $("nameInput").value=localStorage.getItem("vc4pname")||"";
  $("nameModal").classList.add("open");
  setTimeout(()=>{try{$("nameInput").focus();}catch(e){}},100);
}
/* ---------- public chat: one chat room for all players (Firebase) ---------- */
const CHAT={on:false,open:false,unread:0,lastSend:0};
function chatSys(msg){
  const el=$("chatMsgs"),d=document.createElement("div");
  d.className="cmsg sys";d.textContent=msg;el.appendChild(d);
  el.scrollTop=el.scrollHeight;
}
const CHAT_TTL=5*60*1000; // messages disappear after 5 minutes
function chatExpire(key){
  try{firebase.database().ref("chat/"+key).remove();}catch(e){}
  chatRemove(key);
}
function chatRemove(key){
  const row=document.querySelector('#chatMsgs [data-key="'+key+'"]');
  if(row)row.remove();
}
function chatAdd(d,key){
  if(!d||typeof d.m!=="string"||typeof d.n!=="string")return;
  const age=Date.now()-(d.t||0);
  if(age>=CHAT_TTL){chatExpire(key);return;} // already too old — clean it up
  setTimeout(()=>chatExpire(key),CHAT_TTL-age);
  /* 📻 live player-radio packets ride the chat channel — they never show as chat */
  if(d.m.startsWith("\u{1F4FB}|")){try{handleRadioPacket(d);}catch(e){}return;}
  /* 🏆 car-meet votes ride the chat channel too */
  if(d.m.startsWith("\u{1F3C6}|")){try{handleMeetVote(d);}catch(e){}return;}
  const el=$("chatMsgs"),row=document.createElement("div");
  row.dataset.key=key;
  row.className="cmsg"+(d.n===mpName()?" me":"");
  const who=document.createElement("b");who.textContent=d.n.slice(0,16)+": ";
  const txt=document.createElement("span");txt.textContent=d.m.slice(0,200);
  row.appendChild(who);row.appendChild(txt);
  el.appendChild(row);
  while(el.children.length>100)el.removeChild(el.firstChild);
  el.scrollTop=el.scrollHeight;
  /* fresh messages float above the sender's head (old replayed ones don't) */
  if(age<12000)try{chatBubbleFor(d.n,d.m.slice(0,80));}catch(e){}
  if(!CHAT.open){CHAT.unread++;chatBtnUI();}
}
function chatBtnUI(){
  $("bChat").innerHTML="\u{1F4AC} Chat"+(CHAT.unread?" <b style='color:var(--acc)'>"+(CHAT.unread>9?"9+":CHAT.unread)+"</b>":"");
}
function chatStart(){
  if(CHAT.on)return;
  if(!mpInit()){chatSys("\u{1F534} Chat is offline — couldn't reach the database.");return;}
  try{
    const ref=firebase.database().ref("chat");
    ref.limitToLast(50).on("child_added",s=>chatAdd(s.val(),s.key));
    ref.on("child_removed",s=>chatRemove(s.key)); // vanish for everyone as soon as one client deletes it
    CHAT.on=true;
    chatSys("Welcome to the public chat — be nice! \u{1F49B}");
  }catch(e){chatSys("\u{1F534} Chat is offline right now.");}
}
function chatToggle(open){
  CHAT.open=open===undefined?!CHAT.open:open;
  $("chatPanel").classList.toggle("show",CHAT.open);
  if(CHAT.open){
    chatStart();
    CHAT.unread=0;chatBtnUI();
    setTimeout(()=>{try{$("chatInput").focus();}catch(e){}},50);
  }
}
function chatSend(){
  const m=$("chatInput").value.trim().slice(0,200);
  if(!m)return;
  const now=Date.now();
  if(now-CHAT.lastSend<1500){toast("⏳ Slow down a little between messages!");return;}
  if(!CHAT.on){toast("\u{1F534} Chat is offline right now.");return;}
  CHAT.lastSend=now;
  $("chatInput").value="";
  try{
    const p=firebase.database().ref("chat").push({n:mpName(),m,t:Date.now()});
    if(p&&p.catch)p.catch(e=>toast("\u{1F4AC}\u{26A0} Message didn't send: "+(e&&e.message||e)));
  }catch(e){toast("\u{1F4AC}\u{26A0} Message didn't send: "+(e&&e.message||e));}
}
$("bChat").onclick=()=>chatToggle();
$("chatClose").onclick=()=>chatToggle(false);
$("chatSendBtn").onclick=chatSend;
$("chatInput").addEventListener("keydown",e=>{if(e.key==="Enter")chatSend();});
function mpInit(){
  if(MP.sdk)return true;
  if(!SERVER_READY||typeof firebase==="undefined"||!firebase.database)return false;
  try{firebase.initializeApp({databaseURL:SERVER_API});MP.sdk=true;}catch(e){}
  return MP.sdk;
}
function worldKeyOf(n){return n.toLowerCase().replace(/[.#$\[\]\/]/g,"_");}
function localId(){
  let i=localStorage.getItem("vc4localid");
  if(!i){i=Math.random().toString(36).slice(2,10);try{localStorage.setItem("vc4localid",i)}catch(e){}}
  return i;
}
/* the "default city" is NOT a shared server anymore — with no world picked you
   play in your OWN private city (a world key unique to you) */
function mpWorldKey(){return WORLD.name?worldKeyOf(WORLD.name):"home_"+(profileKey()||localId());}
/* ⏰ shared world time set by the 👑 owner (extra minutes on top of the shared clock) */
const WT={skew:0};
function mpJoin(){
  if(!mpInit())return;
  const key=mpWorldKey();
  if(MP.on&&key===MP.worldKey)return;
  mpLeave();
  MP.worldKey=key;
  MP.joinTs=Date.now();
  MP.ref=firebase.database().ref("players/"+key);
  MP.myRef=MP.ref.child(MP.id);
  try{MP.myRef.onDisconnect().remove();}catch(e){}
  const upd=s=>{if(s.key!==MP.id)mpApply(s.key,s.val());};
  MP.ref.on("child_added",upd);
  MP.ref.on("child_changed",upd);
  MP.ref.on("child_removed",s=>mpDrop(s.key));
  /* shared named worlds: listen for the owner's clock + my own kick/ban record */
  if(WORLD.name){
    try{
      MP.wtRef=firebase.database().ref("worldtime/"+key);
      MP.wtRef.on("value",s=>{const d=s.val();WT.skew=(d&&typeof d.skew==="number")?d.skew:0;});
      MP.modRef=firebase.database().ref("mod/"+key+"/"+payKey(mpName()));
      MP.modRef.on("value",s=>applyMod(s.val()));
    }catch(e){}
  }else WT.skew=0;
  MP.on=true;
}
function mpLeave(){
  if(!MP.on)return;
  try{MP.ref.off();MP.myRef.onDisconnect().cancel();MP.myRef.remove();}catch(e){}
  try{if(MP.wtRef)MP.wtRef.off();if(MP.modRef)MP.modRef.off();}catch(e){}
  MP.wtRef=MP.modRef=null;WT.skew=0;
  [...MP.others.keys()].forEach(mpDrop);
  MP.on=false;MP.ref=MP.myRef=null;MP.lastSig="";
}
/* ================= 👑 OWNER POWERS: kick, ban & day/time ================= */
const BAN_FOREVER=9999999999999;
function applyMod(d){
  if(!d||!WORLD.name)return;
  if(d.until&&d.until>Date.now()){
    bootMe(d.until>=BAN_FOREVER
      ?"⛔ You are BANNED FOREVER from \""+WORLD.name+"\" by the owner!"
      :"⛔ You are banned from \""+WORLD.name+"\" until "+new Date(d.until).toLocaleString()+"!");
    return;
  }
  if(d.kick&&d.kick>(MP.joinTs||0))bootMe("\u{1F462} You were KICKED out of \""+WORLD.name+"\" by the owner!");
}
function bootMe(msg){
  if(!WORLD.name)return;
  setWorld("");
  toast(msg);
  if(S.mode==="game"){teleportTo(WORLD.ox+6,WORLD.oz+6);mpJoin();}
}
/* the owner writes a kick (one-time boot) or a ban (until a timestamp) */
async function modPunish(name,until){
  if(!WORLD.name||!isOwner())return;
  const body=until?{until,by:mpName(),ts:Date.now()}:{kick:Date.now(),by:mpName(),ts:Date.now()};
  const ok=await fbPut("/mod/"+mpWorldKey()+"/"+payKey(name),body);
  if(!ok){toast("\u{1F534} Couldn't reach the database — did you paste the NEW Firebase rules? (FIREBASE-SETUP.md)");return;}
  toast(until?(until>=BAN_FOREVER?"\u{1F528} "+name+" is BANNED FOREVER from this world.":"⏳ "+name+" is banned for 1 day.")
             :"\u{1F462} "+name+" was kicked!");
}
/* ⏰ the owner changes the day & time — in a shared world EVERYONE sees it */
function ownerSetTime(min,addDay){
  if(!isOwner()){toast("\u{1F451} Only the OWNER of this world can change the time!");return;}
  if(WORLD.name){
    const delta=addDay?1440:((min-CLOCK.min)+1440)%1440;
    WT.skew=(WT.skew||0)+delta;
    fbPut("/worldtime/"+mpWorldKey(),{skew:WT.skew,by:mpName(),ts:Date.now()}).then(ok=>{
      if(!ok)toast("\u{1F534} Time not shared — paste the NEW Firebase rules (FIREBASE-SETUP.md)");
    });
    clockTick(0);
  }else{
    if(addDay)CLOCK.day++;
    else{if(min<CLOCK.min)CLOCK.day++;CLOCK.min=min;}
  }
  toast(addDay?"\u{1F4C5} A new day begins — day "+CLOCK.day+"!"
              :"⏰ Time set to "+String(Math.floor(min/60)).padStart(2,"0")+":00 for everyone in this world!");
}
function refreshOwnerBox(){
  if(!SERVERS.loaded&&WORLD.name)refreshServers();
  $("ownerBox").style.display=isOwner()?"block":"none";
}
$("otMorn").onclick=()=>ownerSetTime(8*60);
$("otNoon").onclick=()=>ownerSetTime(12*60);
$("otEve").onclick=()=>ownerSetTime(19*60);
$("otNight").onclick=()=>ownerSetTime(23*60);
$("otDay").onclick=()=>ownerSetTime(0,true);
$("ownUnban").onclick=async()=>{
  if(!isOwner())return;
  const n=cleanServerName(prompt("♻ Unban which player? Type their exact username:")||"").slice(0,16);
  if(!n)return;
  if(!WORLD.name){toast("Nobody can be banned from your own private city!");return;}
  const ok=await fbPut("/mod/"+mpWorldKey()+"/"+payKey(n),null);
  toast(ok?"♻ "+n+" is unbanned — they can join again!":"\u{1F534} Couldn't reach the database.");
};
/* 💬 chat bubbles: your message floats above your head for everyone to see */
function makeChatBubble(text){
  const cv=document.createElement("canvas");cv.width=512;cv.height=128;
  const c=cv.getContext("2d");
  c.font="bold 30px 'Segoe UI',sans-serif";
  const t=text.length>42?text.slice(0,41)+"…":text;
  const w=Math.min(496,c.measureText(t).width+40);
  c.fillStyle="rgba(255,255,255,.96)";
  if(c.roundRect){c.beginPath();c.roundRect(256-w/2,14,w,66,18);c.fill();}
  else c.fillRect(256-w/2,14,w,66);
  /* the little tail pointing down at the speaker */
  c.beginPath();c.moveTo(244,78);c.lineTo(268,78);c.lineTo(256,100);c.closePath();c.fill();
  c.fillStyle="#101623";c.textAlign="center";c.fillText(t,256,59);
  const tex=new THREE.CanvasTexture(cv);
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));
  s.scale.set(8.4,2.1,1);
  return s;
}
function showBubbleOver(obj,text,h){
  if(!obj||!text)return;
  const old=obj.userData.bub;
  if(old){obj.remove(old);try{old.material.map.dispose();old.material.dispose();}catch(e){}}
  const s=makeChatBubble(text);
  s.position.y=h;
  obj.add(s);obj.userData.bub=s;
  clearTimeout(obj.userData.bubT);
  obj.userData.bubT=setTimeout(()=>{
    if(obj.userData.bub===s){
      obj.remove(s);obj.userData.bub=null;
      try{s.material.map.dispose();s.material.dispose();}catch(e){}
    }
  },6500);
}
function chatBubbleFor(name,msg){
  if(S.mode!=="game")return;
  if(name===mpName()){
    /* me: above my car (or above my head on foot) */
    const mine=player.onFoot?player.mesh:(player.drive&&player.drive.mesh)||player.mesh;
    showBubbleOver(mine,msg,player.onFoot?3.6:4.1);
    return;
  }
  for(const o of MP.others.values())
    if(o.name===name){showBubbleOver(o.g,msg,(o.kind==="foot"||o.kind==="seat")?3.8:4.2);break;}
}
function mpMakeLabel(name){
  const cv=document.createElement("canvas");cv.width=256;cv.height=64;
  const c=cv.getContext("2d");
  c.font="bold 34px 'Segoe UI',sans-serif";c.textAlign="center";
  const w=Math.min(244,c.measureText(name).width+30);
  c.fillStyle="rgba(13,17,26,.78)";c.fillRect(128-w/2,6,w,46);
  c.fillStyle="#3fd0ff";c.fillText(name,128,40);
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthTest:false}));
  s.scale.set(5.4,1.35,1);
  return s;
}
function mpApply(k,d){
  if(!d||typeof d.x!=="number"||typeof d.z!=="number")return;
  const kind=d.f?"foot":(d.v==="seat"?"seat":(d.v==="heli"?"heli":(d.v==="moto"||d.v==="bike"?d.v:"car")));
  const col=typeof d.c==="number"?(d.c&0xffffff):0x3fd0ff;
  const nm=typeof d.n==="string"?d.n.slice(0,16):"player";
  const av=typeof d.av==="string"?d.av:"";
  let o=MP.others.get(k);
  if(o&&(o.kind!==kind||o.color!==col||o.name!==nm||o.av!==av)){mpDrop(k);o=null;}
  if(!o){
    const g=new THREE.Group();
    const avObj=parseAv(av);
    const body=(kind==="foot"||kind==="seat")?makePerson(1,avObj?avObj.shirt:col,avObj)
      :(kind==="heli"?buildHeliMesh(col):buildVehicleMesh(kind,col));
    if(kind==="seat"){
      /* a passenger sitting in someone's car */
      const L=body.userData.limbs;
      L.lL.rotation.x=-1.5;L.rL.rotation.x=-1.5;L.lA.rotation.x=-0.5;L.rA.rotation.x=-0.5;
      body.position.y=0.42;
    }
    if(body.userData&&body.userData.riderMesh)body.userData.riderMesh.visible=true;
    g.add(body);
    const lbl=mpMakeLabel(nm);
    lbl.position.y=(kind==="foot"||kind==="seat")?2.7:3.1;g.add(lbl);
    scene.add(g);
    o={g,kind,color:col,name:nm,av,k,x:d.x,z:d.z,y:d.y||0,yaw:d.r||0};
    MP.others.set(k,o);
  }
  o.tx=d.x;o.tz=d.z;o.ty=typeof d.y==="number"?d.y:0;o.tyaw=typeof d.r==="number"?d.r:0;
  o.seen=performance.now();
}
function mpDrop(k){const o=MP.others.get(k);if(o){scene.remove(o.g);disposeGroup(o.g);MP.others.delete(k);}}
function mpTick(dt){
  if(!MP.on)return;
  /* glide the other players toward their latest reported spot */
  const now=performance.now();
  for(const[k,o]of[...MP.others]){
    if(o.seen&&now-o.seen>15000){mpDrop(k);continue;}
    const a=Math.min(1,dt*8);
    o.x+=(o.tx-o.x)*a;o.z+=(o.tz-o.z)*a;o.y+=(o.ty-o.y)*a;
    let dy=o.tyaw-o.yaw;while(dy>Math.PI)dy-=2*Math.PI;while(dy<-Math.PI)dy+=2*Math.PI;
    o.yaw+=dy*a;
    o.g.position.set(o.x,o.y,o.z);o.g.rotation.y=o.yaw;
    o.g.visible=S.world==="earth";
    /* 🚗 other players' cars are SOLID — you bump into them, not through them */
    if(S.world==="earth"&&!player.onFoot&&player.drive&&o.kind!=="foot"&&o.kind!=="seat"
       &&(!RIDE.on||RIDE.key!==k)){
      const v=player.drive;
      const dx=v.x-o.x,dz=v.z-o.z,dd=Math.hypot(dx,dz);
      if(dd<2.4&&Math.abs((v.y||0)-(o.y||0))<2.6){
        const push=(2.4-dd)/(dd||0.001);
        v.x+=dx*push;v.z+=dz*push;                 // pushed out of their car
        if(Math.abs(v.speed)>6){playCrash(Math.abs(v.speed));vehDamage(Math.abs(v.speed)*0.5);}
        v.speed*=0.4;
      }
    }
    /* ...and on FOOT you can't walk through their cars either */
    if(S.world==="earth"&&player.onFoot&&!RIDE.on&&o.kind!=="foot"&&o.kind!=="seat"){
      const dx=player.x-o.x,dz=player.z-o.z,dd=Math.hypot(dx,dz);
      if(dd<3&&Math.abs(player.y-(o.y||0))<2.6){
        const push=(3-dd)/(dd||0.001);
        player.x+=dx*push;player.z+=dz*push;
      }
    }
    /* spinning rotors on other players' helicopters */
    if(o.kind==="heli"&&o.g.children[0].userData.rotor)o.g.children[0].userData.rotor.rotation.y+=dt*24;
    /* the weekly champion wears a golden crown */
    if(BOARD.top&&o.name===BOARD.top&&!o.crown){
      o.crown=makeCrown();
      o.crown.position.y=o.kind==="foot"?2.35:2.6;
      o.g.add(o.crown);
    }
  }
  if(S.mode==="game")$("worldTxt").textContent="\u{1F30D} "+(WORLD.name||"My city (private)")+" · \u{1F465} "+(MP.others.size+1);
  /* broadcast my own position ~5x per second (only when it changed) */
  MP.sendT+=dt;
  if(MP.sendT<0.2)return;
  MP.sendT=0;
  /* keep the player dots and sidebar list fresh while the big map is open (~1x/s) */
  if(MP.others.size&&$("mapModal").classList.contains("open")&&now-(MP.mapT||0)>1000){
    MP.mapT=now;requestMap();
    if(document.activeElement!==$("mapSearch"))renderMapList();
  }
  if(S.mode!=="game"||S.world!=="earth"||player.inRocket)return;
  const src=player.drive||player;
  const d={n:mpName(),
    x:Math.round(src.x*10)/10,z:Math.round(src.z*10)/10,y:Math.round((src.y||0)*10)/10,
    r:Math.round((src.yaw||0)*100)/100,
    f:player.onFoot?1:0,
    v:player.inHeli?"heli":(RIDE.on?"seat":(player.drive?player.drive.type:"car")),
    c:RIDE.on?AVATAR.shirt:paintOf(S.selected),
    av:avString(),
    t:Date.now()};
  const sig=[d.x,d.z,d.y,d.r,d.f,d.v,d.n,d.av].join("|");
  if(sig===MP.lastSig&&now-MP.lastSendAt<5000)return;  /* parked: just a heartbeat every 5 s */
  MP.lastSig=sig;MP.lastSendAt=now;
  try{MP.myRef.set(d);}catch(e){}
}
/* player-name field in settings: goes through the same taken-check */
$("pName").value=mpName();
$("pName").addEventListener("change",async()=>{
  const res=await claimName($("pName").value);
  if(!res.ok){toast("❌ "+res.msg);$("pName").value=mpName();return;}
  localStorage.setItem("vc4pname",res.name);
  localStorage.setItem("vc4nameok","1");
  $("pName").value=res.name;
  profileLoad();
  toast(res.offline
    ?"\u{1F464} You are now \""+res.name+"\" (offline — not reserved online yet)"
    :"\u{1F464} Username \""+res.name+"\" is yours!");
});
/* ---------- your avatar: shirt, pants, hair, skin & shoes ---------- */
const AVATAR={shirt:0x2563eb,pants:0x30395c,hair:0x4a2f1d,skin:0xf1c39a,shoes:0x23262b};
try{
  const a=JSON.parse(localStorage.getItem("vc4avatar")||"null");
  if(a)for(const k of["shirt","pants","hair","skin","shoes"])if(typeof a[k]==="number")AVATAR[k]=a[k];
}catch(e){}
function avString(){return[AVATAR.shirt,AVATAR.pants,AVATAR.hair,AVATAR.skin,AVATAR.shoes].map(c=>c.toString(16)).join(",");}
function parseAv(s){
  const a=String(s||"").split(",").map(x=>parseInt(x,16));
  if(a.length<4||a.slice(0,4).some(isNaN))return null;
  return{shirt:a[0],pants:a[1],hair:a[2],skin:a[3],shoes:(a.length>4&&!isNaN(a[4]))?a[4]:0x23262b};
}
function applyAvatar(save){
  /* rebuild your (earth) body with the chosen colors */
  const old=playerEarthMesh;
  const g=makePerson(1,AVATAR.shirt,AVATAR);
  g.traverse(o=>{if(o.castShadow!==undefined)o.castShadow=true;});
  g.position.copy(old.position);g.rotation.y=old.rotation.y;
  g.visible=old.visible;
  scene.add(g);scene.remove(old);disposeGroup(old);
  playerEarthMesh=g;
  if(player.mesh===old){player.mesh=g;player.limbs=g.userData.limbs;}
  if(save){
    try{localStorage.setItem("vc4avatar",JSON.stringify(AVATAR))}catch(e){}
    MP.lastSig="";   // broadcast the new look right away
  }
}
const AV_PALETTES={
  shirt:[0x2563eb,0xd7263d,0xff7f11,0xf4d35e,0x8ac926,0x2ec4b6,0x9b5de5,0xff5d8f,0xefefef,0x111111],
  pants:[0x30395c,0x3a3a3a,0x4a3728,0x24405e,0xd7263d,0x0f7a3d,0xb56576,0x111111,0xefefef,0x6d28d9],
  hair:[0x4a2f1d,0x1c1c1e,0xc9a35a,0x8a4b2a,0xd7263d,0x9b5de5,0x2f8f46,0x1b98e0,0xefefef,0xff5d8f],
  skin:[0xf1c39a,0xd9a06b,0x8c5a2b,0x6b4226,0xffdbac,0xc68642],
  shoes:[0x23262b,0xf4f7fb,0xd7263d,0x2456c4,0x8ac926,0xff5d8f,0xffb02e,0x9b5de5,0x6f4e37,0x111111]
};
const AV_LABELS={shirt:"\u{1F455} Shirt",pants:"\u{1F456} Pants",hair:"\u{1F487} Hair",skin:"\u{1F9CD} Skin",shoes:"\u{1F45F} Shoes"};
function renderAvatarRows(){
  const w=$("avatarRows");w.innerHTML="";
  for(const key of["shirt","pants","hair","skin","shoes"]){
    const row=document.createElement("div");
    row.style.cssText="display:flex;align-items:center;gap:6px;margin-top:6px;flex-wrap:wrap";
    const lab=document.createElement("span");
    lab.style.cssText="font-size:12px;color:var(--dim);width:74px";
    lab.textContent=AV_LABELS[key];
    row.appendChild(lab);
    AV_PALETTES[key].forEach(c=>{
      const b=document.createElement("button");
      b.className="gcol"+(AVATAR[key]===c?" on":"");
      b.style.cssText+=";width:24px;height:24px;background:#"+c.toString(16).padStart(6,"0");
      b.onclick=()=>{AVATAR[key]=c;applyAvatar(true);renderAvatarRows();};
      row.appendChild(b);
    });
    w.appendChild(row);
  }
}
renderAvatarRows();
applyAvatar(false);
/* ---------- pay other players: money lands in their online inbox ---------- */
function payKey(name){return name.toLowerCase().replace(/[^a-z0-9]/g,"_");}
async function sendMoney(name,amt,extra,quiet){
  amt=Math.floor(amt);
  if(!(amt>0))return false;
  if(payKey(name)===profileKey()){toast("\u{1F914} That's you — you can't pay yourself!");return false;}
  if(MONEY.v<amt){toast("\u{1F4B0} You don't have $"+fmtMoney(amt)+"!");return false;}
  if(!SERVER_READY){toast("\u{1F534} Paying players needs the online database.");return false;}
  let ok=false;
  try{
    const body={from:mpName(),amt,ts:Date.now()};
    if(extra)Object.assign(body,extra);
    const r=await fetch(SERVER_API+"/payments/"+payKey(name)+".json",
      {method:"POST",body:JSON.stringify(body)});
    ok=r.ok;
  }catch(e){}
  if(!ok){toast("\u{1F534} Payment failed — the database may still run old rules.");return false;}
  MONEY.v-=amt;updateMoneyUI();profileSave(true);saveGame();
  if(!quiet)toast("\u{1F4B8} You sent $"+fmtMoney(amt)+" to "+name+"!");
  return true;
}
function openPay(name){
  showDest("\u{1F4B8} Send money to "+name,[
    {label:"$10",value:10},{label:"$100",value:100},
    {label:"$1,000",value:1000},{label:"$10,000",value:10000},
    {label:"✏️ Another amount...",value:"custom"},
    {label:"❌ Cancel",value:"cancel"}
  ],v=>{
    if(v==="cancel")return;
    if(v==="custom"){
      const s=prompt("How much money do you want to send to "+name+"?");
      const a=parseInt(s,10);
      if(a>0)sendMoney(name,a);else if(s!==null)toast("Type a normal number, like 250!");
      return;
    }
    sendMoney(name,v);
  });
}
/* check my inbox every few seconds — collect what other players sent me */
async function checkPayments(){
  if(!SERVER_READY)return;
  const k=profileKey();if(!k)return;
  try{
    const r=await fetch(SERVER_API+"/payments/"+k+".json",{cache:"no-store"});
    if(!r.ok)return;
    const d=await r.json();
    if(!d)return;
    for(const id of Object.keys(d)){
      const p=d[id];
      if(!p||typeof p.amt!=="number"||p.amt<=0)continue;
      fetch(SERVER_API+"/payments/"+k+"/"+id+".json",{method:"DELETE"}).catch(()=>{});
      addMoney(Math.floor(p.amt));
      if(typeof p.d==="string"&&p.d.startsWith("MKT|")){
        /* someone bought from my MARKETING PLOT — take the stock off that table */
        const[,mid,idxS,nS]=p.d.split("|");
        const md=MKT[mid],idx=parseInt(idxS,10),n2=Math.max(1,parseInt(nS,10)||1);
        if(md&&md.items[idx]){
          md.items[idx].q=Math.max(0,(md.items[idx].q||0)-n2);
          saveMkt();syncMarket(mid);
          const mp2=marketPlots.find(q=>q.id===mid);
          if(mp2)renderMarket(mp2);
          toast("\u{1F3EA}\u{1F4B0} "+(p.from||"A player")+" bought "+n2+"× "+mktItemName(md.items[idx])+" at your market — $"+fmtMoney(Math.floor(p.amt))+" for you!");
        }else toast("\u{1F3EA}\u{1F4B0} "+(p.from||"A player")+" bought from your market — $"+fmtMoney(Math.floor(p.amt))+"!");
      }else if(typeof p.d==="string"&&p.d.startsWith("INV|")){
        /* a WORLD INVITE rides the inbox: INV|kind|worldname */
        const[,kind,wname]=p.d.split("|");
        const mc=kind==="mc";
        addShared(mc?"Minecraft":(wname||"world"),p.from||"A player",mc);
        toast(mc
          ?"⛏️ "+(p.from||"A player")+" invited you to the MINECRAFT world! Find it under \u{1F30D} Worlds in the garage!"
          :"\u{1F30D} "+(p.from||"A player")+" invited you to world \""+wname+"\"! Find it under \u{1F30D} Worlds in the garage!");
      }else if(typeof p.d==="string"){
        /* a dumpling GIFT rides along with the payment */
        const[color,gl]=p.d.split("|");
        const hex=color==="Rainbow"?RAINBOW_CSS:(color==="Gold"?"#ffd700":((DUMP_COLORS.find(c=>c[0]===color)||["White","#f2f5f7"])[1]));
        DUMP.owned.push({color:color||"White",hex,glitter:gl==="1"});
        renderDump();saveGame();
        toast("\u{1F381} "+(p.from||"A player")+" sent you a "+(gl==="1"?"✨ GLITTER ":"")+color+" dumpling!");
      }else toast("\u{1F4B8} "+(p.from||"A player")+" sent you $"+fmtMoney(Math.floor(p.amt))+"!");
    }
  }catch(e){}
}
setInterval(checkPayments,9000);
/* ---------- friends: star a player — gold on the map, top of the list ---------- */
const FRIENDS=new Set();
try{JSON.parse(localStorage.getItem("vc4friends")||"[]").forEach(n=>{if(typeof n==="string")FRIENDS.add(n);});}catch(e){}
function saveFriends(){try{localStorage.setItem("vc4friends",JSON.stringify([...FRIENDS]))}catch(e){}}
/* ---------- ⭐ the FRIENDS list (in the Actions menu) ---------- */
async function addFriendByName(){
  const s=cleanServerName(prompt("⭐ Type your friend's player name!")||"").slice(0,16);
  if(!s)return;
  if(payKey(s)===payKey(mpName())){toast("\u{1F92D} That's YOU — you can't friend yourself!");return;}
  if(FRIENDS.has(s)){toast("⭐ "+s+" is already your friend!");openFriends();return;}
  let known=false;
  try{
    const r=await fetch(SERVER_API+"/usernames/"+payKey(s)+".json",{cache:"no-store"});
    known=r.ok&&(await r.json())!==null;
  }catch(e){}
  if(!known){toast("\u{1F914} No player called \""+s+"\" exists (yet) — check the spelling!");return;}
  FRIENDS.add(s);saveFriends();requestMap();
  toast("⭐ "+s+" is now your FRIEND — gold on the map when you meet!");
  openFriends();
}
function openFriends(){
  const online=new Map([...MP.others.values()].map(o=>[o.name,o]));
  const opts=[...FRIENDS]
    .sort((a,b)=>((online.has(b)?1:0)-(online.has(a)?1:0))||a.localeCompare(b))
    .map(n=>({
      label:online.has(n)
        ?"\u{1F7E2} "+n+" — HERE! "+fmtDist(Math.hypot(online.get(n).x-player.x,online.get(n).z-player.z))+" away"
        :"⚪ "+n+" — not in this world right now",
      value:"f:"+n
    }));
  if(!FRIENDS.size)opts.push({label:"\u{1F4A1} No friends yet — add one below, or tap a player on the \u{1F5FA} Map!",value:"cancel"});
  opts.push({label:"➕ Add a friend by name...",value:"add"});
  opts.push({label:"❌ Close",value:"cancel"});
  showDest("⭐ MY FRIENDS ("+FRIENDS.size+")",opts,v=>{
    if(v==="cancel")return;
    if(v==="add"){addFriendByName();return;}
    const n=v.slice(2),o=online.get(n);
    if(o){choosePlayer(o);return;}
    /* offline friends: money & gifts land in their inbox for when they play */
    showDest("⚪ "+n+" — not here right now",[
      {label:"\u{1F4B8} Send money (lands in their inbox)",value:"pay"},
      {label:"\u{1F381} Give a dumpling (waits in their inbox)",value:"gift"},
      {label:"\u{1F494} Remove friend",value:"rm"},
      {label:"↩️ Back",value:"back"}
    ],w=>{
      if(w==="pay")openPay(n);
      else if(w==="gift")openGift(n);
      else if(w==="rm"){FRIENDS.delete(n);saveFriends();requestMap();toast("\u{1F494} "+n+" removed from your friends.");openFriends();}
      else if(w==="back")openFriends();
    });
  });
}
$("bFriends").onclick=openFriends;
/* ---------- gift a dumpling to another player (rides the payments inbox) ---------- */
function openGift(name){
  if(!DUMP.owned.length){toast("\u{1F95F} You have no dumplings to give — buy some at a MEGA MART!");return;}
  const opts=DUMP.owned.slice(0,10).map((d,i)=>({
    label:(d.glitter?"✨ GLITTER ":"")+d.color+" dumpling ($"+dumpValue(d)+")",value:i}));
  opts.push({label:"❌ Cancel",value:"cancel"});
  showDest("\u{1F381} Give a dumpling to "+name,opts,async v=>{
    if(v==="cancel")return;
    const d=DUMP.owned[v];
    if(!d)return;
    const ok=await sendMoney(name,1,{d:d.color+"|"+(d.glitter?"1":"0")},true);
    if(!ok)return;
    if(HOLD.d===d){HOLD.d=null;HOLD.mesh.visible=false;}
    DUMP.owned.splice(v,1);
    renderDump();saveGame();
    toast("\u{1F381} You gave your "+(d.glitter?"GLITTER ":"")+d.color+" dumpling to "+name+"!");
  });
}
/* the \u{1F4B0} Money menu lists online players you can pay */
function renderPayList(){
  const w=$("payList");w.innerHTML="";
  const others=[...MP.others.values()];
  if(!others.length){
    w.innerHTML="<div style='color:var(--dim);font-size:12px'>No other players online right now — they appear here so you can pay them.</div>";
    return;
  }
  others.forEach(o=>{
    const b=document.createElement("button");
    b.className="btn";
    b.style.cssText="width:100%;margin-top:6px;text-align:left";
    b.innerHTML="\u{1F4B8} Pay \u{1F464} "+o.name;
    b.onclick=()=>{$("moneyModal").classList.remove("open");openPay(o.name);};
    w.appendChild(b);
  });
}
let _saveT=0;
function autoSave(dt){_saveT+=dt;if(_saveT>5){_saveT=0;saveGame();if(PROF.dirty)profileSave(true);}}
function saveGame(){
  try{
    localStorage.setItem("vc4save",JSON.stringify({
      money:MONEY.v,rainbow:MONEY.rainbow,
      unopened:DUMP.unopened,owned:DUMP.owned,
      bu:BUTTER.unopened,bo:BUTTER.owned,
      rooms:RENT.list,
      displays:[...DISPLAYS.entries()],
      mfurn:[...MFURN.entries()].filter(([k])=>RENT.list.some(r2=>r2.id===k)),
      world:{name:WORLD.name,ox:WORLD.ox,oz:WORLD.oz},km:S.km,
      own:[...OWN],paint:PAINT,fuel:FUEL.km,prent:PRENT.on?1:0,hrent:HRENT.on?1:0,
      mcInv:MCINV,mcTools:MCTOOLS,dmg:Math.round(typeof DMG!=="undefined"?DMG.v:0)
    }));
  }catch(e){}
}
function loadGame(){
  try{
    const d=JSON.parse(localStorage.getItem("vc4save")||"null");
    if(!d)return;
    MONEY.v=d.money||0;MONEY.rainbow=!!d.rainbow;
    DUMP.unopened=d.unopened||0;DUMP.owned=Array.isArray(d.owned)?d.owned:[];
    BUTTER.unopened=d.bu||0;BUTTER.owned=Array.isArray(d.bo)?d.bo:[];
    RENT.list.push(...(Array.isArray(d.rooms)?d.rooms:[]));
    (d.displays||[]).forEach(([k,v])=>DISPLAYS.set(k,v));
    (d.mfurn||[]).forEach(([k,v])=>{if(Array.isArray(v))MFURN.set(k,v);});
    if(d.world&&d.world.name){WORLD.name=d.world.name;WORLD.ox=d.world.ox||0;WORLD.oz=d.world.oz||0;}
    S.km=d.km||0;
    (Array.isArray(d.own)?d.own:[]).forEach(n=>{if(typeof n!=="string")return;n=fixVehName(n);if(!OLD_DEFAULTS.includes(n))OWN.add(n);});
    if(d.paint&&typeof d.paint==="object")for(const k in d.paint)if(typeof d.paint[k]==="number")PAINT[k]=d.paint[k];
    if(typeof d.fuel==="number")FUEL.km=Math.max(0,Math.min(FUEL.cap,d.fuel));
    PRENT.on=d.prent===1;
    HRENT.on=d.hrent===1;
    if(d.mcInv&&typeof d.mcInv==="object")for(const k in MCINV)if(typeof d.mcInv[k]==="number")MCINV[k]=Math.max(0,Math.floor(d.mcInv[k]));
    if(d.mcTools&&typeof d.mcTools==="object")for(const k in MCTOOLS)if(d.mcTools[k])MCTOOLS[k]=1;
    if(typeof d.dmg==="number")window.__dmgLoad=Math.max(0,Math.min(100,d.dmg));   // applied when DMG is created below
  }catch(e){}
}
loadGame();loadWorlds();if(WORLD.name)addWorld(WORLD.name);applyWorldUI();renderWorldList();updateMoneyUI();profileLoad();
addEventListener("beforeunload",saveGame);
/* ---------- stations / stops / calling ---------- */
function nearStationInfo(){
  const rk=railKNear(player.x),sj=Math.round((player.z-STZ)/SCELL);
  let best=null;
  for(let k=rk-1;k<=rk+1;k++)for(let j=sj-1;j<=sj+1;j++){
    const sz=j*SCELL+STZ,cx=railC(k,sz);
    const d=Math.hypot(player.x-(cx+7),player.z-sz);
    if(d<35&&(!best||d<best.d))best={k,j,sz,cx,d};
  }
  return best;
}
function nearBusStop(){
  const lx=Math.round((player.x-30)/120)*120+30,lz=Math.round((player.z-30)/120)*120+30;
  let best=null;
  for(let ax=lx-120;ax<=lx+120;ax+=120)for(let az=lz-120;az<=lz+120;az+=120){
    if((((ax-30)/120)+((az-30)/120))%3!==0)continue;
    const d=Math.hypot(player.x-(ax+11),player.z-(az+11));
    if(d<26&&(!best||d<best.d))best={lx:ax,lz:az,x:ax+11,z:az+11,d};
  }
  return best;
}
function nearTerminal(){
  const as=nearestAirports(player.x,player.z,1);
  const a=as[0];
  return Math.hypot(player.x-a.term.x,player.z-a.term.z)<55?a:null;
}
function tryCall(){
  if(!player.onFoot&&!player.drive)return;
  /* mansion editor open: T closes it */
  if(MEDIT.on){closeMansionEdit();return;}
  /* inside a cave: attack the boss / open the cave menu */
  if(CAVE.in){caveT();return;}
  /* indoor stuff first: reception, beds, chairs */
  if(tryFurniture())return;
  /* cave mouths in the mountains */
  if(S.world==="earth"){
    const cv=nearCaveEntrance();
    if(cv){enterCave(cv);return;}
    /* 🏆 Saturday car meet: vote for the car you're standing next to */
    if(meetActive()&&meetDist()<32&&tryMeetVote())return;
    /* gas stations: fill the tank & the scratch-card kiosk */
    if(nearGasSt()){
      const opts=[];
      if(fuelVehicle()&&FUEL.km<FUEL.cap-1)opts.push({label:"⛽ Fill up the tank",value:"fuel"});
      if(DMG.v>1)opts.push({label:"\u{1F527} Repair the dents ("+Math.round(DMG.v)+"%) — $"+fmtMoney(repairCost()),value:"repair"});
      opts.push({label:"\u{1F3B0} Scratch card — $50 (win up to $5,000!)",value:"card"});
      opts.push({label:"❌ Nothing, thanks",value:"cancel"});
      showDest("⛽ Gas station kiosk",opts,v=>{
        if(v==="fuel")tryRefuel();
        else if(v==="repair"){
          const c=repairCost();
          if(MONEY.v<c){toast("\u{1F4B0} Repairs cost $"+fmtMoney(c)+" — you have $"+fmtMoney(MONEY.v)+"!");return;}
          MONEY.v-=c;DMG.v=0;updateMoneyUI();saveGame();
          toast("\u{1F527}✨ GOOD AS NEW! All dents fixed for $"+fmtMoney(c)+" — full speed unlocked again!");
        }
        else if(v==="card")scratchCard();
      });
      return;
    }
  }
  /* race start flag (works on foot or in your car) */
  if(S.world==="earth"){
    const rf=nearRaceFlag();
    if(rf){
      if(RACE.on){endRace(false);return;}
      if(RACEMP.state==="waiting"){
        toast("\u{1F3C1} The multiplayer race starts in "+Math.max(0,Math.ceil((RACEMP.ts-Date.now())/1000))+"s — stay near the flag!");
        return;
      }
      openRaceMenu(rf);
      return;
    }
  }
  /* the delivery courier at your door: pay & pick up */
  if(player.onFoot&&tryPickupOrder())return;
  /* 🎣 fishing: cast, reel & catch */
  if(castOrReel())return;
  /* 🏗 building plots for sale */
  if(player.onFoot&&S.world==="earth"){
    const pl=nearPlotSign();
    if(pl){openPlotBuy(pl);return;}
  }
  /* shops: walk inside and press T to buy food; buyers: sell dumplings */
  if(player.onFoot&&S.world==="earth"){
    const sh=nearShop();
    if(sh){openShop(sh);return;}
    const by=nearBuyer();
    if(by){openSell();return;}
    const bby=nearButterBuyer();
    if(bby){openSell("butter");return;}
    /* marketing plots: claim it, edit your stalls, or shop at someone else's */
    const mk=nearMarketPlot();
    if(mk){openMarket(mk);return;}
    /* the dumpling museum */
    if(nearMuseum()){openMuseum();return;}
    /* island fun: the beach shop & the buried-treasure X */
    const bsh=nearIslandThing("shop",5);
    if(bsh){openBeachShop(bsh);return;}
    const dg=nearIslandThing("digX",3.5);
    if(dg){digTreasureX(dg);return;}
    /* the sky restaurant on the peaks */
    if(nearSkyRest()){openSkyRest();return;}
    /* the WATERSLIDE at pool parks */
    const psl=nearPoolSlide();
    if(psl){
      SLIDE.on=true;SLIDE.t=0;SLIDE.pts=psl.slidePts;
      toast("\u{1F6DD} WHEEEEEE!!");
      return;
    }
    /* mine LAVA dumplings from a (calm) volcano crater */
    const vol=nearVolcanoCrater();
    if(vol){
      if(volcErupting()){toast("\u{1F30B}\u{1F4A5} IT'S ERUPTING — RUN FOR YOUR LIFE!");return;}
      const lkey="vc4lava:"+Math.round(vol.x)+","+Math.round(vol.z);
      const ts=parseInt(localStorage.getItem(lkey),10);
      if(!isNaN(ts)&&Date.now()-ts<600000){
        toast("\u{1F30B} The lava needs "+Math.ceil((600000-(Date.now()-ts))/60000)+" more minutes to cool — hang on!");
        return;
      }
      try{localStorage.setItem(lkey,String(Date.now()));}catch(e){}
      DUMP.owned.push({color:"Lava",hex:"#ff4400",glitter:Math.random()<0.1});
      renderDump();saveGame();
      toast("\u{1F30B}\u{1F95F} You scooped a molten LAVA dumpling ($120)! The crater refills in 10 minutes.");
      return;
    }
    /* standing in YOUR mansion: T opens the editor. In someone ELSE's: the visitor menu */
    const mn=nearMansion();
    if(mn&&rentedAt(mn.id)){openMansionEdit(mn);return;}
    if(mn&&mn.owner){openVisitorMenu(mn);return;}
    if(mn){toast("\u{1F3F0} Buy this mansion first — press T at the RECEPTION out front ($"+fmtMoney(MANSION_PRICE)+")!");return;}
    /* pet tricks: press T next to your pet (parrots are always with you) */
    if(PET.type==="parrot"||(PET.type&&PET.mesh&&Math.hypot(player.x-PET.x,player.z-PET.z)<2.8)){openPetMenu();return;}
  }
  /* rocket stations work on BOTH worlds */
  const rp=nearestRocketPad(player.x,player.z);
  if(rp.d<46){
    if(rocket.state==="idle"||rocket.state==="parked"){
      rocket.pad={x:rp.x,z:rp.z};
      rocket.x=rp.x+(Math.random()<0.5?-1:1)*450;
      rocket.z=rp.z+350;
      rocket.y=terrainH(rocket.x,rocket.z)+170;
      rocket.vy=0;rocket.t=0;rocket.g.visible=true;rocket.state="inbound";
      toast("\u{1F680} A rocket is on its way — "+Math.round(Math.hypot(rocket.x-player.x,rocket.z-player.z))+" m away, watch the sky!");
    }else if(rocket.state==="landed")toast("\u{1F680} The rocket is already here — press F to get in!");
    else toast("The rocket is busy right now.");
    return;
  }
  if(S.world==="mc"){
    /* fight first, then mine, then trade, then the backpack */
    const mob=player.onFoot?nearMcMob(3.4):null;
    if(mob){mcAttack(mob);return;}
    const t=nearMcThing();
    if(t){mineMc(t);return;}
    if(Math.hypot(player.x-MCTRADER.x,player.z-MCTRADER.z)<8){openMcSell(1.25);return;}
    openMcSell(1);
    return;
  }
  if(S.world!=="earth"){
    const st2=nearestOf(SPST,13);
    if(st2){openSpaceStation(st2);return;}
    const u=nearUfo();
    if(u){openRobUfo(u);return;}
    toast("Find a rocket station to fly back down!");
    return;
  }
  /* 🎄 the Christmas tree present (December only) */
  if(typeof tryXmasGift==="function"&&tryXmasGift())return;
  /* 🎬 the fun district & 👮🚒 emergency stations */
  {
    const ent=nearestOf(ENT,11);
    if(ent){openEnt(ent);return;}
    const civ=nearestOf(CIVIC,11);
    if(civ){openCivic(civ);return;}
  }
  const st=nearStationInfo();
  if(st){
    let best=null;
    for(const t of trains){
      if(t.state!=="cruise"||t.k!==st.k)continue;
      const gap=st.sz-t.z;
      if(gap>25&&gap<2200&&(!best||gap<best.gap))best={t,gap};
    }
    if(best){best.t.state="arriving";best.t.tgtZ=st.sz;
      toast("\u{1F686} Train is coming — "+Math.round(best.gap)+" m away!");}
    else toast("No train available on this line right now — try again in a moment.");
    return;
  }
  const bs=nearBusStop();
  if(bs){
    let best=null;
    for(const b of buses){
      if(b.state!=="drive")continue;
      const p=busPos(b);
      const d=Math.abs(p.x-bs.x)+Math.abs(p.z-bs.z);
      if(!best||d<best.d)best={b,d};
    }
    if(best){best.b.state="called";best.b.stop=bs;best.b.dest={x:bs.lx,z:bs.lz};
      const bp=busPos(best.b);
      toast("\u{1F68C} Bus is on its way — "+Math.round(Math.hypot(bp.x-bs.x,bp.z-bs.z))+" m away!");}
    else toast("All buses are busy right now.");
    return;
  }
  const ap=nearTerminal();
  if(ap){
    showDest("\u2708\uFE0F Airport terminal",[
      {label:"\u{1F4DE} Call a plane to this airport",value:"call"},
      PRENT.on?{label:"\u{1F6EC} Return the rented plane (stop paying $250/day)",value:"unrent"}
        :{label:"\u{1F6E9} RENT a plane \u2014 $250 per day, FLY IT YOURSELF!",value:"rent"},
      {label:"\u274C Cancel",value:"cancel"}
    ],v=>{
      if(v==="cancel")return;
      if(v==="rent"){
        if(MONEY.v<250){toast("\u{1F4B0} Renting costs $250 (per day) \u2014 you have $"+fmtMoney(MONEY.v)+"!");return;}
        MONEY.v-=250;updateMoneyUI();
        PRENT.on=true;saveGame();
        toast("\u{1F6E9}\u{1F5DD} PLANE RENTED! Board any plane (press F) and choose \u{1F9D1}\u200D\u2708\uFE0F 'I'll fly it MYSELF'. $250 is charged every day.");
        return;
      }
      if(v==="unrent"){
        PRENT.on=false;saveGame();
        toast("\u{1F6EC} Rental returned \u2014 no more daily costs. Thanks for flying!");
        return;
      }
      let best=null;
      for(const p of planes){
        if(p.state!=="flying"&&p.state!=="wander"&&p.state!=="wanderfly")continue;
        const d=Math.hypot(p.x-ap.term.x,p.z-ap.term.z);
        if(!best||d<best.d)best={p,d};
      }
      /* autofly navigates to the approach point first, then lands properly */
      if(best){best.p.state="autofly";best.p.dest=ap;
        toast("\u2708\uFE0F A plane is coming in to land \u2014 "+Math.round(best.d)+" m away!");}
      else toast("No plane is free right now.");
    });
    return;
  }
  /* 🚐 your camper: stop it (or walk up to it) and press T — it's your home! */
  if(myVehicle&&myVehicle.camper&&Math.abs(myVehicle.speed||0)<1.5&&Math.hypot(player.x-myVehicle.x,player.z-myVehicle.z)<8){
    openCamper();return;
  }
  toast("Go to a train station, bus stop or airport terminal to call a ride.");
}
/* ================= 🚤 BOATS: press F at a moored boat to SAIL it ================= */
function nearBoat(){
  for(let i=boats.length-1;i>=0;i--){
    const b=boats[i];
    if(offScene(b.g)){boats.splice(i,1);continue;}
    if(Math.hypot(player.x-b.x,player.z-b.z)<7)return b;
  }
  return null;
}
function boardBoat(b){
  player.boat={rec:b,mesh:b.g,x:b.g.position.x,z:b.g.position.z,yaw:b.g.rotation.y,speed:0};
  player.onFoot=false;player.mesh.visible=false;
  $("vehName").textContent="Speedboat";
  toast("\u{1F6A4} ANCHORS AWAY! W/S = throttle, A/D = steer — watch out for the shallows, F = go ashore");
}
function leaveBoat(){
  const bt=player.boat;
  /* find a dry spot next to the boat to step onto */
  let best=null;
  for(let a=0;a<8;a++){
    const th=a/8*Math.PI*2;
    const x=bt.x+Math.sin(th)*5,z=bt.z+Math.cos(th)*5;
    const h=terrainH(x,z);
    if(h>-1.1&&(!best||h>best.h))best={x,z,h};
  }
  if(!best){toast("\u{1F30A} Too deep here — sail closer to the shore, then press F!");return;}
  /* the boat stays right where you left it */
  bt.rec.x=bt.x;bt.rec.z=bt.z;
  bt.mesh.position.set(bt.x,-1.05,bt.z);bt.mesh.rotation.y=bt.yaw;
  player.boat=null;
  player.onFoot=true;player.mesh.visible=true;
  player.x=best.x;player.z=best.z;player.y=Math.max(best.h,terrainH(best.x,best.z));
  player.vy=0;player.grounded=true;
  $("vehName").textContent=S.selected?S.selected.name:"";
  toast("\u{1F3D6} Back on land — the boat waits right here!");
}
function updateBoat(dt){
  const b=player.boat;
  if(!b)return 0;
  if(offScene(b.mesh)){player.boat=null;player.onFoot=true;player.mesh.visible=true;return 0;}
  const maxS=68/3.6;
  const thr=thrInput(),st=steerInput();
  if(thr>0)b.speed=Math.min(maxS,b.speed+9*thr*dt);
  else if(thr<0)b.speed=Math.max(-5,b.speed+12*thr*dt);
  else b.speed*=Math.pow(0.55,dt);
  b.yaw+=st*1.15*Math.max(0.25,Math.abs(b.speed)/maxS)*dt*(b.speed<0?-1:1);
  const nx=b.x+Math.sin(b.yaw)*b.speed*dt,nz=b.z+Math.cos(b.yaw)*b.speed*dt;
  /* running aground: the hull needs water below it */
  if(baseH(nx,nz)<-1.1){b.x=nx;b.z=nz;}
  else{if(Math.abs(b.speed)>4)toast("\u{1F6A4}\u{1F4A5} SCRRRT — shallow water! Steer back to the deep part!");b.speed*=0.3;}
  const now=performance.now();
  b.mesh.position.set(b.x,-1.05+Math.sin(now/620)*0.07+Math.min(0.25,Math.abs(b.speed)/60),b.z);
  b.mesh.rotation.set(Math.sin(now/540)*0.02-b.speed*0.004,b.yaw,st*-0.06*(b.speed/maxS));
  player.x=b.x;player.z=b.z;player.y=0;
  /* splashy wake at speed */
  if(Math.abs(b.speed)>6&&Math.random()<dt*8)puffSmoke(b.x-Math.sin(b.yaw)*3,-0.6,b.z-Math.cos(b.yaw)*3);
  return Math.abs(b.speed);
}
/* ================= 🚐 CAMPER LIFE: your home on wheels ================= */
function openCamper(){
  showDest("\u{1F690} Your camper — home sweet home!",[
    {label:"\u{1F634} Sleep until morning (rest up, tummy full!)",value:"sleep"},
    {label:"\u{1F373} Cook a camper meal",value:"cook"},
    {label:"\u{1F6CB} Chill inside for a bit",value:"chill"},
    {label:"❌ Close",value:"cancel"}
  ],v=>{
    if(v==="sleep"){
      skipToMorning(8);
      HUNGER.v=100;HUNGER.starveT=0;
      toast("\u{1F634}\u{1F31E} Good morning! You slept in your camper — it's 08:00 and you're full of energy!");
      if(typeof PHP!=="undefined"){PHP.v=PHP.max;heartsUI();}
      saveGame();
    }else if(v==="cook"){
      HUNGER.v=100;HUNGER.starveT=0;
      toast("\u{1F373} Mmm — camper pancakes! Your tummy is FULL.");
    }else if(v==="chill"){
      toast("\u{1F6CB}\u{1F3D5} Sooo cozy... your own house on wheels. Life is good!");
    }
  });
}
/* ================= 🎬🕹🎰 ENTERTAINMENT DISTRICT + 👮🚒 STATIONS + 🛰 SPACE STATIONS ================= */
function nearestOf(arr,r){
  for(let i=arr.length-1;i>=0;i--){
    const s=arr[i];
    if(offScene(s.g)){arr.splice(i,1);continue;}
    if(Math.hypot(player.x-s.x,player.z-s.z)<r)return s;
  }
  return null;
}
const MOVIES=["\u{1F996} Dino Drivers 3D","\u{1F680} Rocket Racers 2","\u{1F95F} The Great Dumpling Heist","\u{1F47D} Aliens Ate My Homework","\u{1F9DF} Zombie Road Trip"];
function openEnt(e){
  if(e.kind==="cinema"){
    const mv=MOVIES[Math.floor(Math.random()*MOVIES.length)];
    showDest("\u{1F3AC} MEGA CINEMA — now playing: "+mv,[
      {label:"\u{1F39F} Ticket + \u{1F37F} popcorn — $20",value:"watch"},
      {label:"❌ Maybe later",value:"cancel"}
    ],v=>{
      if(v!=="watch")return;
      if(MONEY.v<20){toast("\u{1F4B0} A ticket costs $20!");return;}
      MONEY.v-=20;updateMoneyUI();
      HUNGER.v=Math.min(100,HUNGER.v+40);
      toast("\u{1F3AC}\u{1F37F} You watched \""+mv+"\" — AWESOME movie, and the popcorn was huge!");
      saveGame();
    });
  }else if(e.kind==="arcade"){
    showDest("\u{1F579} THE ARCADE — beep boop!",[
      {label:"\u{1F9F8} Claw machine — $50 (grab a dumpling!)",value:"claw"},
      {label:"\u{1F3CE} Racing simulator — $30 (win up to $150)",value:"sim"},
      {label:"\u{1F47E} Alien Blaster — $30 (high score = $100!)",value:"blast"},
      {label:"❌ Leave",value:"cancel"}
    ],v=>{
      if(v==="cancel")return;
      const cost=v==="claw"?50:30;
      if(MONEY.v<cost){toast("\u{1F4B0} That game costs $"+cost+"!");return;}
      MONEY.v-=cost;updateMoneyUI();
      if(v==="claw"){
        if(Math.random()<0.45){
          const c=DUMP_COLORS[Math.floor(Math.random()*DUMP_COLORS.length)];
          DUMP.owned.push({color:c[0],hex:c[1],glitter:Math.random()<0.06});
          renderDump();
          toast("\u{1F9F8}\u{1F95F} THE CLAW GRABBED IT — a "+c[0]+" dumpling is yours!");
        }else toast("\u{1F9F8}\u{1F4A8} Sooo close... the claw dropped it! One more try?");
      }else if(v==="sim"){
        const win=[0,0,40,60,90,150][Math.floor(Math.random()*6)];
        toast(win?"\u{1F3CE}\u{1F3C6} NEW LAP RECORD — you won $"+win+"!":"\u{1F3CE} You spun out on the last corner... no prize!");
        if(win)addMoney(win);
      }else{
        const score=100+Math.floor(Math.random()*900);
        const best=parseInt(localStorage.getItem("vc4arcbest")||"0",10);
        if(score>best){
          localStorage.setItem("vc4arcbest",String(score));
          addMoney(100);
          toast("\u{1F47E}\u{1F31F} NEW HIGH SCORE: "+score+" — the arcade pays $100!");
        }else toast("\u{1F47E} Score: "+score+" (your best is "+best+") — so close!");
      }
      saveGame();
    });
  }else if(e.kind==="casino"){
    showDest("\u{1F3B0} LUCKY CASINO — spin the MEGA WHEEL!",[
      {label:"\u{1F3B2} Spin for $100",value:"100"},
      {label:"\u{1F3B2} Spin for $1,000",value:"1000"},
      {label:"\u{1F3B2} Spin for $10,000 (brave!)",value:"10000"},
      {label:"❌ Walk away rich",value:"cancel"}
    ],v=>{
      if(v==="cancel")return;
      const bet=parseInt(v,10);
      if(MONEY.v<bet){toast("\u{1F4B0} You need $"+fmtMoney(bet)+" to spin!");return;}
      MONEY.v-=bet;updateMoneyUI();
      const r=Math.random();
      if(r<0.02){
        addMoney(bet*10);
        pushNews("\u{1F3B0} JACKPOT!! "+mpName()+" hit the MEGA WHEEL for $"+fmtMoney(bet*10)+"!!");
        toast("\u{1F3B0}\u{1F31F}\u{1F31F} JAAACKPOT!!! The wheel lands on x10 — you win $"+fmtMoney(bet*10)+"!!!");
      }else if(r<0.10){addMoney(bet*3);toast("\u{1F3B0}\u{2728} TRIPLE! The wheel pays $"+fmtMoney(bet*3)+"!");}
      else if(r<0.48){addMoney(bet*2);toast("\u{1F3B0} DOUBLE! You win $"+fmtMoney(bet*2)+"!");}
      else toast("\u{1F3B0}\u{1F4A8} The wheel stops on... nothing. The casino keeps your $"+fmtMoney(bet)+". One more spin?");
      saveGame();
    });
  }
}
function openCivic(c){
  if(c.kind==="police"){
    const chased=traffic.some(t=>t.chase);
    showDest("\u{1F46E} POLICE STATION",[
      chased?{label:"\u{1F64F} Pay the fine — $300 (the chase ends!)",value:"fine"}
            :{label:"✅ You're clean — no fines open!",value:"x"},
      {label:"\u{1F694} Join the force — start a POLICE shift",value:"job"},
      {label:"❌ Leave",value:"cancel"}
    ],v=>{
      if(v==="fine"){
        payFine(300,"$300 police fine");   // not enough money? you go into the minus
        for(const t of traffic)if(t.chase)endChase(t);
        toast("\u{1F46E}✅ Fine paid — the police call off the chase. Drive safe out there!");
      }else if(v==="job")pickJob("police");
    });
  }else{
    showDest("\u{1F692} FIRE STATION",[
      {label:"\u{1F198} Ask about EMERGENCIES — start a rescue!",value:"resc"},
      {label:"\u{1F69B} Grab the TOW list — clear an accident",value:"tow"},
      {label:"❌ Leave",value:"cancel"}
    ],v=>{
      if(v==="resc"){
        let ev=EVENTS.list.find(e=>e.rescue&&!e.done);
        if(!ev){spawnEvent("rescue");ev=EVENTS.list.find(e=>e.rescue&&!e.done);}
        if(ev){setRoute(ev.x,ev.z);toast("\u{1F198} The fire chief points at the map — someone's stranded! Follow the route, STOP next to them: $500!");}
        else toast("\u{1F692} All quiet right now — check back in a minute!");
      }else if(v==="tow")pickJob("tow");
    });
  }
}
function openSpaceStation(st){
  const P=curPlanet()||PLANETS.moon;
  const dumpName=S.world==="moon"?"Alien":P.name;
  const price=Math.max(200,Math.round(dumpValue({color:dumpName,glitter:false})*0.8));
  showDest("\u{1F6F0} "+P.name.toUpperCase()+" STATION — welcome, traveler!",[
    {label:"\u{1F95F} Buy a "+dumpName.toUpperCase()+" dumpling — $"+fmtMoney(price)+" (station discount!)",value:"dump"},
    {label:"\u{1F6CC} Rest in the sleeping pod (free!)",value:"rest"},
    {label:"\u{1F4E1} Scan for alien spaceships",value:"scan"},
    {label:"❌ Leave",value:"cancel"}
  ],v=>{
    if(v==="dump"){
      if(MONEY.v<price){toast("\u{1F4B0} That costs $"+fmtMoney(price)+" — rob some aliens first!");return;}
      MONEY.v-=price;updateMoneyUI();
      DUMP.owned.push({color:dumpName,hex:P.alienCss,glitter:Math.random()<0.08});
      renderDump();saveGame();
      toast("\u{1F95F}\u{1F6F0} A "+dumpName.toUpperCase()+" dumpling, fresh from the station shop!");
    }else if(v==="rest"){
      HUNGER.v=100;HUNGER.starveT=0;
      if(typeof PHP!=="undefined"){PHP.v=PHP.max;heartsUI();}
      toast("\u{1F6CC}\u{2728} Zero-gravity nap complete — you feel AMAZING!");
    }else if(v==="scan"){
      const ci=Math.round((player.x-3300)/UFOSP),cj=Math.round((player.z-6600)/UFOSP);
      let best=null;
      for(let i2=ci-1;i2<=ci+1;i2++)for(let j2=cj-1;j2<=cj+1;j2++){
        const s=ufoSpot(i2,j2);if(!s)continue;
        const d=Math.hypot(s.x-player.x,s.z-player.z);
        if(!best||d<best.d)best={s,d};
      }
      if(best){setRoute(best.s.x,best.s.z);toast("\u{1F4E1} Signal found: an alien spaceship "+fmtDist(best.d)+" away — route plotted!");}
      else toast("\u{1F4E1} ...just static. No spaceships nearby.");
    }
  });
}
/* ================= 🕰 TIME PORTALS: drive through to travel through TIME ================= */
const ERA={mode:0,cool:0};
const ERA_DEFS=[
  {name:"Today",filter:"",msg:"\u{1F570} You're back in the PRESENT!"},
  {name:"The 1920s",filter:"sepia(0.75) contrast(1.06)",msg:"\u{1F570}\u{1F3A9} WHOOSH — welcome to THE 1920s! Everything looks old-timey..."},
  {name:"The FUTURE",filter:"saturate(1.7) hue-rotate(18deg) contrast(1.12)",msg:"\u{1F570}\u{1F680} ZAP — welcome to THE FUTURE! Colors are extra shiny here..."}
];
function updatePortals(dt){
  ERA.cool=Math.max(0,ERA.cool-dt);
  const now=performance.now();
  for(let i=PORTALS.length-1;i>=0;i--){
    const p=PORTALS[i];
    if(offScene(p.g)){PORTALS.splice(i,1);continue;}
    p.g.userData.ring.rotation.y+=dt*1.2;
    p.g.userData.glow.material.opacity=0.22+Math.sin(now/300)*0.12;
    if(ERA.cool<=0&&Math.hypot(player.x-p.x,player.z-p.z)<7){
      ERA.cool=4;
      ERA.mode=(ERA.mode+1)%ERA_DEFS.length;
      const e=ERA_DEFS[ERA.mode];
      $("c3d").style.filter=e.filter;
      toast(e.msg+" (drive through any \u{1F570} portal to time-travel again)");
      pushNews("\u{1F570} "+mpName()+" time-traveled to "+e.name+"!");
    }
  }
}
/* ================= 🎄 CHRISTMAS (December): decorated downtown + daily present ================= */
const XMAS={spot:null};
if(new Date().getMonth()===11){
  const g=new THREE.Group(),tx=46,tz=-56,ty=terrainH?0:0;
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.7,2.4),new THREE.MeshLambertMaterial({color:0x6b4a2b}));
  trunk.position.set(tx,1.2,tz);g.add(trunk);
  for(let i=0;i<4;i++){
    const cone=new THREE.Mesh(new THREE.ConeGeometry(4.4-i,3.2,10),new THREE.MeshLambertMaterial({color:0x1e6b30}));
    cone.position.set(tx,3+i*2.1,tz);g.add(cone);
  }
  const star=new THREE.Mesh(new THREE.OctahedronGeometry(0.7),new THREE.MeshBasicMaterial({color:0xffd700}));
  star.position.set(tx,11.6,tz);g.add(star);
  for(let i=0;i<26;i++){
    const a=Math.random()*Math.PI*2,h=2.5+Math.random()*7;
    const r2=(11-h)*0.42;
    const l=new THREE.Mesh(new THREE.SphereGeometry(0.16,6,6),
      new THREE.MeshBasicMaterial({color:[0xff4040,0xffd700,0x40a0ff,0xff80c0][i%4]}));
    l.position.set(tx+Math.cos(a)*r2,h,tz+Math.sin(a)*r2);g.add(l);
  }
  for(let i=0;i<5;i++){
    const gp=new THREE.Mesh(new THREE.BoxGeometry(1,0.8,1),new THREE.MeshLambertMaterial({color:COLORS[i*2%COLORS.length]}));
    gp.position.set(tx-3+i*1.5,0.4,tz+4);g.add(gp);
    const rb=new THREE.Mesh(new THREE.BoxGeometry(1.04,0.2,0.24),new THREE.MeshBasicMaterial({color:0xffd75e}));
    rb.position.set(tx-3+i*1.5,0.72,tz+4);g.add(rb);
  }
  earthStatic.add(g);
  XMAS.spot={x:tx,z:tz+4};
}
function xmasGiftKey(){return "vc4xmas:"+new Date().toISOString().slice(0,10);}
function tryXmasGift(){
  if(!XMAS.spot||S.world!=="earth")return false;
  if(Math.hypot(player.x-XMAS.spot.x,player.z-XMAS.spot.z)>7)return false;
  if(localStorage.getItem(xmasGiftKey())){toast("\u{1F381} You already opened today's present — come back tomorrow! \u{1F384}");return true;}
  try{localStorage.setItem(xmasGiftKey(),"1");}catch(e){}
  addMoney(500);
  DUMP.unopened++;
  renderDump();saveGame();
  toast("\u{1F384}\u{1F381} MERRY CHRISTMAS! Today's present: $500 + a mystery dumpling! (1 per day — and all December, deliveries pay DOUBLE!)");
  return true;
}
/* people stepping out on arrival */
function arrivalPeople(x,z){
  const n=1+Math.floor(Math.random()*3);
  for(let i=0;i<n;i++)spawnPed(x+(Math.random()-0.5)*4,z+(Math.random()-0.5)*4,"leave",14+Math.random()*8);
}
/* ---------- enter / leave ---------- */
function tryEnterLeave(){
  SIT.on=false;   // stand up before getting into anything
  /* riding shotgun in another player's car: F hops out */
  if(RIDE.on){endRide();return;}
  /* the helicopter: land & hop out, or hop in */
  if(player.inHeli){
    const gh=Math.max(terrainH(HELI.x,HELI.z),deckYAt(HELI.x,HELI.z,HELI.y));
    if(HELI.y-gh<3.5){
      HELI.y=gh;HELI.hs=0;
      HELI.mesh.position.y=gh;HELI.mesh.rotation.x=0;
      player.inHeli=false;
      player.onFoot=true;player.mesh.visible=true;
      player.x=HELI.x+3;player.z=HELI.z;
      player.y=gh;player.grounded=true;player.vy=0;
      toast("\u{1F681} Landed — smooth as butter!");
    }else toast("\u{1F681} Get lower first — hold SHIFT to descend, then press F to land!");
    return;
  }
  if(player.onFoot&&HELI.active&&Math.hypot(player.x-HELI.x,player.z-HELI.z)<6){
    player.inHeli=true;player.onFoot=false;player.mesh.visible=false;player.drive=null;
    toast("\u{1F681} Lift off! W/S = speed, A/D = turn, SPACE = up, SHIFT = down, F = land");
    return;
  }
  /* 🚤 boats: sail away, or step ashore */
  if(player.boat){leaveBoat();return;}
  if(player.onFoot&&S.world==="earth"){
    const bt=nearBoat();
    if(bt){boardBoat(bt);return;}
  }
  /* rocket first: leaving */
  if(player.inRocket){
    if(rocket.state==="piloted"){
      const gh=terrainH(rocket.x,rocket.z)+0.6;
      if(rocket.y-gh<5){
        rocket.y=gh;rocket.state="parked";rocket.wait=30;rocket.hs=0;rocket.pad={x:rocket.x,z:rocket.z};
        player.inRocket=false;
        player.x=rocket.x+6;player.z=rocket.z;
        landOnFootOrVehicle();
        toast("\u{1F680} Landed — nice flying!");
      }else toast("\u{1F680} Fly lower first — hold Shift to descend, then press F!");
      return;
    }
    if(rocket.state==="arrived"||rocket.state==="landed"){
      player.inRocket=false;rocket.state="parked";rocket.wait=40;
      player.x=rocket.x+6;player.z=rocket.z;
      landOnFootOrVehicle();
      if(S.world!=="earth")toast("\u{1F31A} One small step... explore "+(curPlanet().name)+"!");
      return;
    }
    toast("\u{1F680} You can't get out during the flight!");
    return;
  }
  /* rocket: boarding (walk up to a landed rocket) — autopilot or fly it yourself */
  if(player.onFoot&&rocket.state==="landed"&&Math.hypot(player.x-rocket.x,player.z-rocket.z)<15){
    player.inRocket=true;player.onFoot=false;player.mesh.visible=false;
    /* destinations: Earth is always FREE, every planet costs $1 per km away */
    const opts=[];
    if(S.world!=="earth")opts.push({label:"\u{1F30D} Fly to EARTH — FREE (going home!)",value:"earth"});
    for(const k in PLANETS){
      if(k===S.world)continue;
      const P=PLANETS[k];
      opts.push({label:P.emoji+" Fly to "+P.name.toUpperCase()+" — "+(P.km>0?"$"+fmtMoney(P.km)+" ("+fmtMoney(P.km)+" km away)":"FREE"),value:k});
    }
    opts.push({label:"\u{1F9D1}‍✈️ I'll fly it MYSELF — up to 2000 km/h!",value:"pilot"});
    opts.push({label:"❌ Never mind",value:"cancel"});
    showDest("\u{1F680} Rocket — where to? ($1 per km!)",opts,v=>{
      if(v==="cancel"){player.inRocket=false;player.onFoot=true;player.mesh.visible=true;return;}
      if(v==="pilot"){
        rocket.state="piloted";rocket.yaw=0;rocket.hs=0;rocket.vy=0;
        toast("\u{1F680} You have the controls! W/S = speed, A/D = turn, Space = up, Shift = down, F = land");
        return;
      }
      const fare=v==="earth"?0:PLANETS[v].km;
      if(fare>MONEY.v){
        player.inRocket=false;player.onFoot=true;player.mesh.visible=true;
        toast("\u{1F4B0} The trip to "+PLANETS[v].name+" costs $"+fmtMoney(fare)+" — you only have $"+fmtMoney(MONEY.v)+". Sell dumplings & win races!");
        return;
      }
      if(fare>0){MONEY.v-=fare;updateMoneyUI();saveGame();}
      rocket.dest=v;
      rocket.state="launch";rocket.t=0;rocket.vy=0;rocket.hs=0;
      toast("\u{1F680} Buckle up! Launching to "+(v==="earth"?"Earth":PLANETS[v].name)+"..."+(fare>0?" (ticket: $"+fmtMoney(fare)+")":"")+(S.admin?" (admin turbo!)":""));
    });
    return;
  }
  /* leaving */
  if(player.inTrain){const t=player.train;player.inTrain=false;player.train=null;
    player.x=railC(t.k,t.z)+6;player.z=t.z;landOnFootOrVehicle();return;}
  if(player.inPlane){const p=player.planeRef;
    if(p.y>terrainH(p.x,p.z)+4){toast("Wait until the plane is on the ground!");return;}
    player.inPlane=false;player.planeRef=null;p.state="parked";p.wait=8;
    player.x=p.x+8;player.z=p.z+6;landOnFootOrVehicle();return;}
  if(player.inBus){const b=player.bus;player.inBus=false;player.bus=null;
    const p=b.controlled?{x:b.x,z:b.z}:busPos(b);
    player.x=p.x+4;player.z=p.z;b.controlled=false;
    if(b.state==="ride")b.state="drive";
    landOnFootOrVehicle();return;}
  if(player.drive&&(player.drive===myVehicle||player.drive.moonCar)){
    const v=player.drive;
    if(Math.abs(v.speed)>3){toast("Slow down before getting out!");return;}
    if(v.moonCar){v.moonCar.x=v.x;v.moonCar.z=v.z;}   // the buggy stays where you parked it
    player.drive=null;player.onFoot=true;
    player.x=v.x+2.2;player.z=v.z;player.mesh.visible=true;
    if(v.mesh.userData.riderMesh)v.mesh.userData.riderMesh.visible=false;
    return;
  }
  /* space buggies: parked at every off-Earth rocket station */
  if(S.world!=="earth"&&player.onFoot){
    for(let i=moonCars.length-1;i>=0;i--){
      const mc=moonCars[i];
      if(offScene(mc.g)){moonCars.splice(i,1);continue;}
      if(Math.hypot(player.x-mc.x,player.z-mc.z)<5){
        player.drive={mesh:mc.g,type:"car",top:200,x:mc.g.position.x,z:mc.g.position.z,yaw:mc.g.rotation.y,speed:0,vy:0,y:mc.g.position.y,grounded:true,roll:0,moonCar:mc};
        player.onFoot=false;player.mesh.visible=false;
        toast(curPlanet().emoji+"\u{1F697} "+curPlanet().name+" buggy! Space driving — F to get out.");
        return;
      }
    }
  }
  /* own vehicle: works on Earth AND in the Minecraft world */
  if((S.world==="earth"||S.world==="mc")&&player.onFoot&&myVehicle&&myVehicle.mesh.visible&&Math.hypot(player.x-myVehicle.x,player.z-myVehicle.z)<5){
    player.drive=myVehicle;player.onFoot=false;player.mesh.visible=false;
    if(myVehicle.mesh.userData.riderMesh)myVehicle.mesh.userData.riderMesh.visible=true;
    return;
  }
  if(S.world!=="earth")return;   // no trains, planes or buses on the moon
  /* boarding: trains */
  for(const t of trains){
    const cx=railC(t.k,t.z);
    if((t.state==="waiting"||Math.abs(t.speed)<0.5)&&Math.hypot(player.x-cx,player.z-t.z)<14){
      board("train",t);return;
    }
  }
  /* planes */
  for(const p of planes){
    if((p.state==="parked"||p.state==="boarding")&&Math.hypot(player.x-p.x,player.z-p.z)<14){
      board("plane",p);return;
    }
  }
  /* buses */
  for(const b of buses){
    const bp=b.controlled?{x:b.x,z:b.z}:busPos(b);
    if((b.state==="waiting"||b.speed<0.5)&&Math.hypot(player.x-bp.x,player.z-bp.z)<10){
      board("bus",b);return;
    }
  }
  /* ...or hop into ANOTHER PLAYER's car as a passenger! */
  if(player.onFoot){
    const r=nearRideableCar();
    if(r){startRide(r.k,r.o);return;}
  }
}
function landOnFootOrVehicle(){
  player.onFoot=true;player.mesh.visible=true;player.vy=0;
}
function board(kind,ref){
  player.onFoot=false;player.mesh.visible=false;
  if(kind==="train"){
    player.inTrain=true;player.train=ref;ref.state="riding";ref.wait=0;
    if(S.admin)toast("You're driving the train! W/S = throttle, Space = brake, F = get off");
    else toast("Riding the train — F = get off at any stop");
  }
  if(kind==="plane"){
    player.inPlane=true;player.planeRef=ref;
    const opts=nearestAirports(player.x,player.z,4).slice(1,4).map(a=>({label:"\u2708\uFE0F Airport at ("+Math.round(a.term.x)+", "+Math.round(a.term.z)+") — "+(a.dist/1000).toFixed(1)+" km",value:{type:"air",a}}));
    opts.push({label:"\u{1F3B2} No destination (fly around randomly)",value:{type:"none"}});
    if(S.admin||PRENT.on)opts.push({label:"\u{1F9D1}\u200D\u2708\uFE0F I'll fly it MYSELF"+(PRENT.on&&!S.admin?" (rented \u{1F6E9})":" (admin)"),value:{type:"pilot"}});
    showDest("Choose your flight destination",opts,v=>{
      if(v.type==="pilot"){ref.state="piloted";toast("You have the controls! W/S speed, A/D turn, Space climb, Shift descend");}
      else if(v.type==="air"){ref.dest=v.a;ref.state="autofly";toast("Autopilot engaged — enjoy the flight (F to exit after landing)");}
      else{ref.dest=null;ref.state="wanderfly";toast("Flying with no destination — F to exit after it lands somewhere");}
    });
  }
  if(kind==="bus"){
    player.inBus=true;player.bus=ref;ref.state="ride";ref.wait=0;
    const opts=[
      {label:"\u{1F3B2} No destination (random turns)",value:{type:"none"}},
      {label:"\u{1F686} Central Station",value:{type:"go",x:-150,z:STZ}},
      {label:"\u2708\uFE0F Nearest airport",value:{type:"air"}},
      {label:"\u{1F981} City Zoo",value:{type:"go",x:-340,z:260}},
      {label:"\u{1F3E0} Spawn",value:{type:"go",x:WORLD.ox+6,z:WORLD.oz+6}}
    ];
    if(S.admin)opts.push({label:"\u{1F68C} I'll drive it myself (admin)",value:{type:"drive"}});
    showDest("Where should the bus go?",opts,v=>{
      if(v.type==="drive"){ref.controlled=true;const p=busPos(ref);ref.x=p.x;ref.z=p.z;ref.yaw=ref.axis==="z"?(ref.dir>0?0:Math.PI):(ref.dir>0?Math.PI/2:-Math.PI/2);toast("You're driving the bus!");}
      else if(v.type==="none"){ref.dest=null;toast("Riding the bus — it takes random turns. F = get off when stopped");}
      else if(v.type==="air"){const a=nearestAirports(player.x,player.z,1)[0];ref.dest={x:a.term.x,z:a.term.z};toast("Bus is heading for the airport!");}
      else{ref.dest={x:v.x,z:v.z};toast("Bus is heading to your destination!");}
    });
  }
}
/* ================= PHYSICS / UPDATES ================= */
const G=9.81;
/* ================= 🔧 DAMAGE & REPAIR: crashes dent your car ================= */
const DMG={v:window.__dmgLoad||0,fineT:0};
function dmgFactor(){return 1-Math.min(0.4,DMG.v*0.004);}   // 100% dents = 40% slower
function vehDamage(strength){
  if(!player.drive||player.drive!==myVehicle)return;
  const before=DMG.v;
  DMG.v=Math.min(100,DMG.v+Math.min(16,Math.max(2,strength*0.3)));
  if(Math.floor(DMG.v/25)>Math.floor(before/25)){
    toast("\u{1F527}\u{1F4A5} Your ride is "+Math.round(DMG.v)+"% dented — it's getting SLOWER! Repair it at any ⛽ gas station.");
  }
  saveGame();
}
function repairCost(){return Math.max(0,Math.round(DMG.v*8));}
/* 📸 SPEED CAMERAS: some crossings flash you above ~95 km/h — $150 fine! */
function nearSpeedCam(x,z){
  const lx=Math.round((x-30)/120)*120+30,lz=Math.round((z-30)/120)*120+30;
  if(Math.abs(x-lx)>14||Math.abs(z-lz)>14)return false;
  return h2i(lx*3+7,lz*5+1)<0.07;   // ~7% of crossings have a camera
}
function updateSpeedCam(v,dt){
  DMG.fineT=Math.max(0,DMG.fineT-dt);
  if(S.world!=="earth"||DMG.fineT>0||v!==myVehicle)return;
  if(Math.abs(v.speed)>26.4&&nearSpeedCam(v.x,v.z)){   // >95 km/h at a camera crossing
    DMG.fineT=25;
    const fine=Math.min(MONEY.v,150);
    MONEY.v-=fine;updateMoneyUI();saveGame();
    pushNews("\u{1F4F8} "+mpName()+" got FLASHED by a speed camera — $"+fine+" fine!");
    toast("\u{1F4F8}\u{26A1} FLASH! Speed camera — $"+fine+" fine! The limit at crossings is 95 km/h.");
  }
}
function driveVehicle(v,dt){
  const limit=limitFor("car")/3.6*(v===myVehicle?dmgFactor():1);
  if(v===myVehicle)updateSpeedCam(v,dt);
  const isBike=v.type==="bike",isMoto=v.type==="moto";
  const accF=isBike?6:(isMoto?16:14+v.top/25);
  const st=steerInput();
  let thr=thrInput();
  /* out of gas: the engine is dead (bicycles never need fuel) */
  if(v===myVehicle&&v.type!=="bike"&&FUEL.km<=0&&thr>0)thr=0;
  /* braking switches the cruise control off */
  if(ACC.on&&(thr<0||spaceInput())){
    ACC.on=false;
    $("accBtn").textContent="OFF";$("accBtn").classList.remove("on");
    toast("Cruise control OFF — you braked");
  }
  /* cruise control */
  if(ACC.on&&thr===0&&v.grounded){
    const tgt=Math.min(accSpeedMS(),limit);
    if(v.speed<tgt-0.5)thr=0.7;else if(v.speed>tgt+0.5)thr=-0.4;
  }
  if(v.grounded){
    if(thr>0)v.speed+=accF*thr*(1-Math.max(0,v.speed)/limit*0.85)*dt;
    else if(thr<0)v.speed+=(v.speed>0?-26:-accF*0.6)*dt*(thr<0?1:0)+(thr<0&&v.speed<=0?thr*accF*0.5*dt:0);
    if(thr===0)v.speed*=Math.pow(0.985,dt*60);
    if(spaceInput())v.speed*=Math.pow(0.94,dt*60);
    v.speed=Math.max(-limit*0.3,Math.min(limit,v.speed));
    /* construction & accident zones force you to crawl past */
    const evc=eventSpeedCap(v.x,v.z);
    if(isFinite(evc)&&v.speed>evc)v.speed+=(evc-v.speed)*Math.min(1,6*dt);
    const grip=(1/(1+Math.abs(v.speed)/45))*wetGrip();   // wet roads = less grip
    const agility=isBike?2.8:(isMoto?2.5:2.1);
    v.yaw+=st*agility*grip*(spaceInput()?1.5:1)*Math.max(-1,Math.min(1,v.speed/9))*dt;
  }
  if(!isFinite(v.speed))v.speed=0;
  const nx=v.x+Math.sin(v.yaw)*v.speed*dt;
  const nz=v.z+Math.cos(v.yaw)*v.speed*dt;
  if(hitBuilding(nx,nz,Math.abs(v.speed))){if(Math.abs(v.speed)>6)vehDamage(Math.abs(v.speed));v.speed*=-0.25;}
  else{v.x=nx;v.z=nz;}
  /* the ground can also be a parking-garage floor or ramp */
  const surf=(px,pz)=>Math.max(terrainH(px,pz),deckYAt(px,pz,v.y));
  const gh=surf(v.x,v.z);
  if(v.grounded){
    if(gh<v.y-1.2){   // drove off a deck/ramp edge: launch if it sloped up, else fall
      const behind=surf(v.x-Math.sin(v.yaw)*2.5,v.z-Math.cos(v.yaw)*2.5);
      const sb=(v.y-behind)/2.5;
      v.grounded=false;
      v.vy=(sb>0.12&&Math.abs(v.speed)>8)?Math.min(15,Math.abs(v.speed)*sb*0.7):0;
    }
    else{
    const ahead=surf(v.x+Math.sin(v.yaw)*2.5,v.z+Math.cos(v.yaw)*2.5);
    const behind=surf(v.x-Math.sin(v.yaw)*2.5,v.z-Math.cos(v.yaw)*2.5);
    const slope=(ahead-gh)/2.5,slopeBack=(gh-behind)/2.5;
    if(slope<-0.55&&Math.abs(v.speed)>14){v.grounded=false;v.vy=Math.abs(v.speed)*Math.max(-0.4,slope)*0.4;v.y=gh;}
    /* stunts: speeding over a crest launches you — but capped, so you jump, not fly */
    else if(slopeBack>0.3&&slope<slopeBack-0.35&&Math.abs(v.speed)>15){
      v.grounded=false;v.vy=Math.min(10,Math.abs(v.speed)*slopeBack*0.5);v.y=gh;
    }
    else v.y=gh;
    }
  }
  if(!v.grounded){
    v.vy-=G*2.4*dt;   // heavy in the air: big air is short air, no floating
    v.y+=v.vy*dt;
    const land=surf(v.x,v.z);
    if(v.y<=land){v.y=land;v.grounded=true;v.vy=0;}
  }
  /* body roll / lean */
  const lean=isMoto||isBike?st*0.32*Math.min(1,Math.abs(v.speed)/16):st*0.05*Math.min(1,Math.abs(v.speed)/25);
  v.roll+=((v.grounded?lean:0)-v.roll)*Math.min(1,8*dt);
  /* wheels */
  for(const w of v.mesh.userData.wheels){
    w.spin.rotation.x+=v.speed/w.r*dt;
    if(w.front)w.pivot.rotation.y=st*0.42;
  }
  const pitch=v.grounded?Math.atan2(terrainH(v.x+Math.sin(v.yaw)*1.6,v.z+Math.cos(v.yaw)*1.6)-terrainH(v.x-Math.sin(v.yaw)*1.6,v.z-Math.cos(v.yaw)*1.6),3.2):Math.atan2(v.vy,Math.abs(v.speed)+4)*0.7;
  v.mesh.position.set(v.x,v.y,v.z);
  v.mesh.rotation.set(0,v.yaw,0);
  v.mesh.rotateX(-pitch);v.mesh.rotateZ(v.roll);
  headLight.intensity=isNight()?1.1:0;
  headLight.position.set(v.x+Math.sin(v.yaw)*6,v.y+1.6,v.z+Math.cos(v.yaw)*6);
  /* realistic lights: brake lights flare red, reverse glows white, beams at night */
  if(v.mesh.userData.tails){
    const braking=(thr<0&&v.speed>0.5)||spaceInput();
    const reversing=v.speed<-0.5;
    v.mesh.userData.tails.forEach(t=>{
      t.material.color.set(reversing?0xffffff:(braking?0xff4040:0x8a1420));
      t.scale.setScalar(braking||reversing?1.5:1);
    });
  }
  if(v.mesh.userData.beams){
    const on=isNight();
    v.mesh.userData.beams.forEach(b=>b.visible=on);
  }
  player.x=v.x;player.z=v.z;player.y=v.y;
  return Math.abs(v.speed);
}
function walkPlayer(dt){
  const inPool=(S.world==="earth"&&!CAVE.in)?poolAt(player.x,player.z,player.y):null;
  const sp=inPool?2.4:(keys.shift?9:4.2);
  const thr=thrInput(),st=steerInput();
  /* sitting on a chair: stay put until you move */
  if(SIT.on){
    if(Math.abs(thr)>0.1||Math.abs(st)>0.1||spaceInput())SIT.on=false;
    else{
      player.x=SIT.x;player.z=SIT.z;player.yaw=SIT.yaw;player.y=SIT.y;
      player.grounded=true;player.vy=0;
      player.mesh.position.set(player.x,player.y,player.z);
      player.mesh.rotation.y=player.yaw;
      const L=player.limbs;
      /* legs bend FORWARD (negative X) — positive used to fold them backwards,
         which made you look like you sat facing the wrong way */
      L.lL.rotation.x=-1.5;L.rL.rotation.x=-1.5;L.lA.rotation.x=-0.4;L.rA.rotation.x=-0.4;
      return 0;
    }
  }
  let mx=0,mz=0;
  if(Math.abs(thr)>0.05){mx=Math.sin(player.yaw)*thr;mz=Math.cos(player.yaw)*thr;}
  player.yaw+=st*2.6*dt;
  const moving=mx||mz;
  const nx=player.x+mx*sp*dt,nz=player.z+mz*sp*dt;
  let blocked=false;
  if(S.world==="earth"&&!CAVE.in)for(const b of buildings){
    if(!b.alive||b.walkThru)continue;
    if(Math.abs(nx-b.x)<b.w/2+0.15&&Math.abs(nz-b.z)<b.d/2+0.15){
      if(!(Math.abs(player.x-b.x)<b.w/2+0.15&&Math.abs(player.z-b.z)<b.d/2+0.15))blocked=true;
    }
  }
  /* REAL WALLS: walk-in buildings can only be entered/left through the doorway */
  if(!blocked&&S.world==="earth"&&!CAVE.in)for(let i=shells.length-1;i>=0;i--){
    const sh=shells[i];
    if(offScene(sh.g)){shells.splice(i,1);continue;}
    if(Math.abs(player.y-sh.y)>3.2)continue;   // only the ground floor has these walls
    const inNow=Math.abs(player.x-sh.x)<sh.hw&&Math.abs(player.z-sh.z)<sh.hd;
    const inNext=Math.abs(nx-sh.x)<sh.hw&&Math.abs(nz-sh.z)<sh.hd;
    if(inNow===inNext)continue;
    let atDoor=false;
    for(const o of sh.open)if(Math.hypot(nx-o.x,nz-o.z)<o.r+0.5){atDoor=true;break;}
    if(!atDoor){blocked=true;break;}
  }
  if(!blocked){player.x=nx;player.z=nz;}
  /* inside a hotel room you can't walk through the walls */
  if(S.world==="earth")for(let i=hotelRooms.length-1;i>=0;i--){
    const rm=hotelRooms[i];
    if(offScene(rm.g)){hotelRooms.splice(i,1);continue;}
    if(player.y>rm.ry-0.6&&player.y<rm.ry+2.4&&Math.abs(player.x-rm.x)<rm.hw+1.4&&Math.abs(player.z-rm.z)<rm.hd+1.4){
      player.x=Math.max(rm.x-rm.hw,Math.min(rm.x+rm.hw,player.x));
      player.z=Math.max(rm.z-rm.hd,Math.min(rm.z+rm.hd,player.z));
    }
  }
  /* inside a cave: flat rock floor, and the walls keep you in */
  if(CAVE.in){
    player.x=Math.max(CAVE.cx-21,Math.min(CAVE.cx+21,player.x));
    player.z=Math.max(CAVE.cz-15,Math.min(CAVE.cz+15,player.z));
  }
  let gh=CAVE.in?CAVE.fy:terrainH(player.x,player.z);
  const py=platformYAt(player.x,player.z);   // stand on station platforms & stairs
  if(py>gh)gh=py;
  const dk=deckYAt(player.x,player.z,player.y);   // parking-garage floors & ramp
  if(dk>gh)gh=dk;
  /* earth: snappy jumps that don't hang in the sky.
     each planet has its OWN gravity: floaty on the Moon & Mercury,
     heavy on Jupiter! */
  const P=curPlanet();
  if(spaceInput()&&player.grounded){player.vy=P?P.jump:6.4;player.grounded=false;}
  if(!player.grounded){player.vy-=(P?P.grav:20)*dt;player.y+=player.vy*dt;
    if(player.y<=gh){player.y=gh;player.grounded=true;player.vy=0;}}
  else if(gh<player.y-1.3){player.grounded=false;player.vy=0;}   // stepped off a deck
  else player.y=gh;
  /* 🏊 REAL SWIMMING: in a pool you float and stroke through the water */
  const pw=(S.world==="earth"&&!CAVE.in)?poolAt(player.x,player.z,player.y):null;
  if(pw){
    if(SWIM.cur!==pw){
      SWIM.cur=pw;
      toast(pw.hw<=4.5?"♨️ Ahhh... the HOT TUB. Sooo warm and bubbly!":"\u{1F3CA} SPLASH — you're SWIMMING! Paddle around!");
    }
    player.y=pw.wy-0.5;player.grounded=true;player.vy=0;
    player.mesh.position.set(player.x,player.y,player.z);
    player.mesh.rotation.y=player.yaw;
    const t2=performance.now()/170;
    const L2=player.limbs;
    L2.lA.rotation.x=Math.sin(t2)*1.7-0.7;
    L2.rA.rotation.x=Math.sin(t2+Math.PI)*1.7-0.7;
    L2.lL.rotation.x=Math.sin(t2*1.5)*0.5;
    L2.rL.rotation.x=-Math.sin(t2*1.5)*0.5;
    return moving?2.4:0;
  }
  if(SWIM.cur)SWIM.cur=null;
  /* trampolines: walk onto one and BOING — way higher than a normal jump */
  if(player.grounded)for(let i=TRAMPS.length-1;i>=0;i--){
    const tr=TRAMPS[i];
    if(offScene(tr.g)){TRAMPS.splice(i,1);continue;}
    if(Math.hypot(player.x-tr.x,player.z-tr.z)<1.5){
      player.y=tr.y;player.vy=10.5;player.grounded=false;break;
    }
  }
  player.mesh.position.set(player.x,player.y,player.z);
  player.mesh.rotation.y=player.yaw;
  player.walkT+=dt*(moving?sp:0);
  const a=moving?Math.sin(player.walkT*2.4)*0.55:0;
  const L=player.limbs;
  L.lL.rotation.x=a;L.rL.rotation.x=-a;L.lA.rotation.x=-a*0.75;L.rA.rotation.x=a*0.75;
  return moving?sp:0;
}
/* nose up/down to follow the slope of the ground in the driving direction */
function slopePitch(x,z,yaw,len){
  const fx=Math.sin(yaw)*len,fz=Math.cos(yaw)*len;
  return Math.atan2(terrainH(x+fx,z+fz)-terrainH(x-fx,z-fz),len*2);
}
/* trains */
function railYaw(k,z){const d=(railC(k,z+2)-railC(k,z-2))/4;return Math.atan2(d,1);}
function updateTrains(dt){
  const pk=railKNear(player.x);
  trains.forEach((t,i)=>{
    const max=limitFor("train")/3.6;
    if(player.inTrain&&player.train===t&&S.admin){
      const thr=thrInput();
      if(thr>0)t.speed=Math.min(max,t.speed+12*thr*dt);
      if(thr<0)t.speed=Math.max(-14,t.speed+14*thr*dt);
      if(spaceInput())t.speed*=Math.pow(0.93,dt*60);
    }else if(player.inTrain&&player.train===t){
      let tgt=Math.min(max,34);
      if(ACC.on)tgt=Math.min(max,accSpeedMS());
      t.speed+=(tgt-t.speed)*Math.min(1,0.6*dt);
    }else if(t.state==="cruise"){
      t.speed+=(Math.min(max,30+i*2)-t.speed)*Math.min(1,0.5*dt);
    }else if(t.state==="arriving"){
      const gap=t.tgtZ-t.z;
      if(gap<=2){t.state="waiting";t.wait=20;t.speed=0;arrivalPeople(railC(t.k,t.z)+7,t.z);toast("\u{1F686} Train arrived — press F to board!");}
      else t.speed=Math.min(Math.min(max,38),Math.max(4,gap*0.25));
    }else if(t.state==="waiting"){
      t.speed=0;t.wait-=dt;
      if(t.wait<=0)t.state="cruise";
    }else if(t.state==="riding"&&!player.inTrain){t.state="cruise";}
    t.z+=t.speed*dt;
    /* recycle far trains onto lines near the player */
    if(!player.inTrain||player.train!==t){
      if(Math.abs(t.z-player.z)>1600||Math.abs(t.k-pk)>1){
        t.k=pk+(i%3)-1;t.z=player.z-900-Math.random()*400;t.state="cruise";
      }
    }
    const cx=railC(t.k,t.z);
    t.g.position.set(cx,terrainH(cx,t.z)+0.5,t.z);
    t.g.rotation.set(0,railYaw(t.k,t.z),0);
    t.g.rotateX(-slopePitch(cx,t.z,0,4));
  });
}
/* planes */
function updatePlanes(dt){
  planes.forEach((p,i)=>{
    const max=limitFor("plane")/3.6;
    const piloted=player.inPlane&&player.planeRef===p&&p.state==="piloted";
    if(piloted){
      const thr=thrInput();
      if(thr>0)p.speed=Math.min(max,p.speed+30*thr*dt);
      if(thr<0)p.speed=Math.max(0,p.speed+40*thr*dt);
      if(ACC.on&&thr===0)p.speed+=(Math.min(max,accSpeedMS())-p.speed)*Math.min(1,0.5*dt);
      const st=steerInput();
      p.yaw+=st*0.9*dt;p.bank+=(st*0.5-p.bank)*Math.min(1,3*dt);
      let climb=0;
      if(spaceInput())climb=18;if(keys.shift)climb=-18;
      p.y+=climb*dt;p.pitch+=(climb/30-p.pitch)*Math.min(1,3*dt);
      const gh=terrainH(p.x,p.z);
      if(p.y<gh+1)p.y=gh+1;
      p.x+=Math.sin(p.yaw)*p.speed*dt;p.z+=Math.cos(p.yaw)*p.speed*dt;
      /* flying low into a building wrecks it */
      if(p.y<gh+24&&hitBuilding(p.x,p.z,p.speed+10))p.speed=Math.max(8,p.speed*0.5);
    }else if(p.state==="autofly"||p.state==="wanderfly"||p.state==="flying"||p.state==="wander"){
      /* climb to cruise + fly */
      const cruiseY=150+i*22;
      p.y+=(cruiseY-p.y)*Math.min(1,0.35*dt);
      let tgtYaw;
      if((p.state==="autofly")&&p.dest){
        const wp={x:p.dest.approachX,z:p.dest.rwz};
        tgtYaw=Math.atan2(wp.x-p.x,wp.z-p.z);
        if(Math.hypot(p.x-wp.x,p.z-wp.z)<90){p.state="approach";}
      }else{
        p.theta+=dt*0.06;
        tgtYaw=Math.atan2(p.circleC.x+Math.cos(p.theta)*400-p.x,p.circleC.z+Math.sin(p.theta)*400-p.z);
      }
      let dy=tgtYaw-p.yaw;while(dy>Math.PI)dy-=Math.PI*2;while(dy<-Math.PI)dy+=Math.PI*2;
      p.yaw+=Math.max(-0.6,Math.min(0.6,dy))*dt;
      p.bank+=(Math.max(-0.5,Math.min(0.5,dy))-p.bank)*Math.min(1,2*dt);
      let tgtSpd=Math.min(max,72);
      if(ACC.on&&player.inPlane&&player.planeRef===p)tgtSpd=Math.min(max,accSpeedMS());
      p.speed+=(tgtSpd-p.speed)*Math.min(1,0.4*dt);
      p.x+=Math.sin(p.yaw)*p.speed*dt;p.z+=Math.cos(p.yaw)*p.speed*dt;
      p.pitch*=0.95;
    }else if(p.state==="approach"){
      const a=p.dest||airportOf(Math.round(p.x/ACELL),Math.round(p.z/ACELL));
      const tgtYaw=Math.atan2(0,1)+ (a.stopX>p.x?Math.PI/2:-Math.PI/2); // fly toward +x along runway
      const wantYaw=Math.PI/2; // runway runs along +x
      let dy=wantYaw-p.yaw;while(dy>Math.PI)dy-=Math.PI*2;while(dy<-Math.PI)dy+=Math.PI*2;
      p.yaw+=Math.max(-0.7,Math.min(0.7,dy))*dt;
      /* line up on z */
      p.z+=(a.rwz-p.z)*Math.min(1,0.5*dt);
      p.y+=(14-p.y)*Math.min(1,0.4*dt);
      p.speed+=(46-p.speed)*Math.min(1,0.5*dt);
      p.x+=Math.sin(p.yaw)*p.speed*dt;
      p.pitch+=(-0.1-p.pitch)*Math.min(1,2*dt);p.bank*=0.9;
      if(Math.abs(dy)<0.15&&p.x>a.approachX)p.state="touchdown";
      if(p.x>a.stopX+140){p.state="autofly";} // overshot, go around
    }else if(p.state==="touchdown"){
      const a=p.dest||airportOf(Math.round(p.x/ACELL),Math.round(p.z/ACELL));
      p.y=Math.max(0.9,p.y-8*dt);
      p.z+=(a.rwz-p.z)*Math.min(1,1.2*dt);
      if(p.y<=1)p.speed=Math.max(9,p.speed-22*dt);
      p.x+=p.speed*dt;p.yaw=Math.PI/2;p.pitch*=0.9;p.bank*=0.9;
      if(p.speed<=9.5&&p.x>a.stopX-40){p.state="taxi";}
    }else if(p.state==="taxi"){
      const a=p.dest||airportOf(Math.round(p.x/ACELL),Math.round(p.z/ACELL));
      const dx=a.apron.x-p.x,dz=a.apron.z-p.z,d=Math.hypot(dx,dz);
      if(d<3){p.state="parked";p.wait=25;p.speed=0;arrivalPeople(p.x+7,p.z+4);
        if(player.inPlane&&player.planeRef===p)toast("\u2708\uFE0F Landed! Press F to step out.");
        else toast("\u2708\uFE0F The plane has parked at the terminal — press F nearby to board!");}
      else{p.yaw=Math.atan2(dx,dz);p.speed=Math.min(7,d);p.x+=Math.sin(p.yaw)*p.speed*dt;p.z+=Math.cos(p.yaw)*p.speed*dt;}
      p.y=0.9;
    }else if(p.state==="parked"||p.state==="boarding"){
      p.speed=0;p.y=0.9;
      if(!(player.inPlane&&player.planeRef===p)){
        p.wait-=dt;
        if(p.wait<=0){p.state="wanderfly";p.dest=null;p.circleC={x:p.x+(Math.random()-0.5)*1600,z:p.z+(Math.random()-0.5)*1600};}
      }
    }else if(p.state==="piloted"&&!(player.inPlane&&player.planeRef===p)){
      p.state="wanderfly";
    }
    /* the world is infinite but there are only 3 planes: wandering planes
       that drift too far away are relocated near the player, so calling
       one at any airport actually works */
    if(!(player.inPlane&&player.planeRef===p)&&(p.state==="flying"||p.state==="wander"||p.state==="wanderfly")){
      if(Math.hypot(p.x-player.x,p.z-player.z)>2600){
        p.x=player.x+(Math.random()-0.5)*2400;
        p.z=player.z+(Math.random()-0.5)*2400;
        p.y=150+i*22;
        p.circleC={x:player.x+(Math.random()-0.5)*900,z:player.z+(Math.random()-0.5)*900};
      }
    }
    /* wanderfly lands eventually if rider chose none & wants out? keep flying; F asks to land? simple: stays flying */
    const gh=terrainH(p.x,p.z);
    if(p.state!=="touchdown"&&p.state!=="taxi"&&p.state!=="parked"&&p.y<gh+2)p.y=gh+2;
    p.g.position.set(p.x,p.y,p.z);
    p.g.rotation.set(0,p.yaw,0);
    p.g.rotateX(-p.pitch);p.g.rotateZ(-p.bank);
  });
}
/* buses */
function updateBuses(dt){
  buses.forEach((b,i)=>{
    const max=limitFor("bus")/3.6;
    /* admin: just press W/S while riding to grab the wheel */
    if(S.admin&&player.inBus&&player.bus===b&&!b.controlled&&(keys.w||keys.s||(TOUCH.on&&(TOUCH.gas>0||TOUCH.brake>0)))){
      b.controlled=true;const p0=busPos(b);b.x=p0.x;b.z=p0.z;
      b.yaw=b.axis==="z"?(b.dir>0?0:Math.PI):(b.dir>0?Math.PI/2:-Math.PI/2);
      toast("\u{1F68C} Admin: you have the wheel! W/S = gas & brake, A/D = steer");
    }
    if(b.controlled&&player.inBus&&player.bus===b){
      /* admin free driving */
      const st=steerInput();
      let thr=thrInput();
      if(ACC.on&&thr===0){const tgt=Math.min(max,accSpeedMS());if(b.speed<tgt-0.5)thr=0.6;else if(b.speed>tgt+0.5)thr=-0.4;}
      if(thr>0)b.speed=Math.min(max,b.speed+7*dt);
      else if(thr<0)b.speed=Math.max(-8,b.speed-12*dt);
      else b.speed*=Math.pow(0.985,dt*60);
      if(spaceInput())b.speed*=Math.pow(0.93,dt*60);
      b.yaw+=st*1.4/(1+Math.abs(b.speed)/25)*Math.max(-1,Math.min(1,b.speed/8))*dt;
      const nbx=b.x+Math.sin(b.yaw)*b.speed*dt,nbz=b.z+Math.cos(b.yaw)*b.speed*dt;
      if(hitBuilding(nbx,nbz,Math.abs(b.speed)))b.speed*=-0.25;   // buses smash buildings too
      else{b.x=nbx;b.z=nbz;}
      b.g.position.set(b.x,terrainH(b.x,b.z),b.z);
      b.g.rotation.set(0,b.yaw,0);
      b.g.rotateX(-slopePitch(b.x,b.z,b.yaw,3));
      for(const w of b.g.userData.wheels){w.spin.rotation.x+=b.speed/w.r*dt;if(w.front)w.pivot.rotation.y=st*0.4;}
      return;
    }
    if(b.controlled)b.controlled=false;
    /* grid driving */
    let tgtSpd=Math.min(max,12);
    if(player.inBus&&player.bus===b&&ACC.on)tgtSpd=Math.min(max,accSpeedMS());
    if(b.state==="waiting"){
      b.speed=0;b.wait-=dt;
      if(b.wait<=0){b.state=(player.inBus&&player.bus===b)?"ride":"drive";}
    }else{
      const phase=lightPhase();
      const redFor=b.axis==="z"?phase===1:phase===0;
      if(redFor&&b.state!=="called"){
        const nxt=b.dir>0?Math.ceil((b.t-30+10)/120)*120+30:Math.floor((b.t-30-10)/120)*120+30;
        const gap=(nxt-b.t)*b.dir-10;
        if(gap>0&&gap<18)tgtSpd*=Math.max(0,gap-2)/16;
      }
      b.speed+=(tgtSpd-b.speed)*Math.min(1,0.8*dt);
      const prev=b.t;
      b.t+=b.speed*dt*b.dir;
      /* intersection handling: lines every 120 offset 30 */
      const li0=Math.floor((prev-30)/120),li1=Math.floor((b.t-30)/120);
      if(li0!==li1){
        const crossLine=(b.dir>0?Math.max(li0,li1):Math.min(li0,li1))*120+30+(b.dir>0?0:120);
        const cl=Math.round((b.dir>0?li1:li1+1))*120+30;
        const cross=cl; // coordinate of crossing along movement axis
        handleBusIntersection(b,cross);
      }
      /* called: arrived at stop? */
      if(b.state==="called"&&b.stop){
        const p=busPos(b);
        if(Math.hypot(p.x-b.stop.x,p.z-b.stop.z)<12){
          b.state="waiting";b.wait=18;b.speed=0;b.dest=null;
          arrivalPeople(b.stop.x,b.stop.z);
          toast("\u{1F68C} The bus is here — press F to hop on!");
        }
      }
    }
    const p=busPos(b);
    b.x=p.x;b.z=p.z;
    const wantYaw=b.axis==="z"?(b.dir>0?0:Math.PI):(b.dir>0?Math.PI/2:-Math.PI/2);
    let dy=wantYaw-b.yaw;while(dy>Math.PI)dy-=Math.PI*2;while(dy<-Math.PI)dy+=Math.PI*2;
    b.yaw+=dy*Math.min(1,6*dt);
    b.g.position.set(p.x,terrainH(p.x,p.z),p.z);
    b.g.rotation.set(0,b.yaw,0);
    b.g.rotateX(-slopePitch(p.x,p.z,b.yaw,3));
    for(const w of b.g.userData.wheels)w.spin.rotation.x+=b.speed/w.r*dt;
    /* recycle far buses */
    if(!(player.inBus&&player.bus===b)&&b.state==="drive"){
      if(Math.hypot(p.x-player.x,p.z-player.z)>900){
        b.axis=Math.random()<0.5?"z":"x";
        const base=Math.round(((b.axis==="z"?player.x:player.z)-30)/120)*120+30;
        b.line=base+(Math.floor(Math.random()*5)-2)*120;
        b.t=(b.axis==="z"?player.z:player.x)+(Math.random()*2-1)*400;
        b.dir=Math.random()<0.5?1:-1;
      }
    }
  });
}
function handleBusIntersection(b,cross){
  const target=b.dest;
  let turn=null; // null straight, or {axis,line,dir}
  if(target){
    /* Manhattan routing toward target */
    const p=busPos(b);
    const wantAxis=Math.abs((b.axis==="z"?target.z-p.z:target.x-p.x))<60?(b.axis==="z"?"x":"z"):b.axis;
    if(wantAxis!==b.axis){
      const newDir=(b.axis==="z"?(target.x>p.x?1:-1):(target.z>p.z?1:-1));
      turn={axis:b.axis==="z"?"x":"z",line:cross,dir:newDir};
    }else{
      const wantDir=b.axis==="z"?(target.z>p.z?1:-1):(target.x>p.x?1:-1);
      if(wantDir!==b.dir)b.dir=wantDir;
    }
  }else if(Math.random()<0.35&&b.state==="drive"||Math.random()<0.35&&b.state==="ride"){
    turn={axis:b.axis==="z"?"x":"z",line:cross,dir:Math.random()<0.5?1:-1};
  }
  if(turn){
    const oldLine=b.line;
    b.axis=turn.axis;b.t=oldLine;b.line=turn.line;b.dir=turn.dir;
  }
}
/* ---------- level-crossing gates: close when a train is near ---------- */
function updateGates(dt){
  for(let i=gates.length-1;i>=0;i--){
    const gt=gates[i];
    if(offScene(gt.p1)){gates.splice(i,1);continue;}
    let close=false;
    for(const t of trains){
      if(t.k===gt.k&&Math.abs(t.z-gt.z)<90){close=true;break;}
    }
    gt.open+=((close?0:1)-gt.open)*Math.min(1,2.5*dt);
    gt.p1.rotation.x=-1.35*gt.open;   // arms swing up when open, down across the road when closed
    gt.p2.rotation.x=1.35*gt.open;
  }
}
/* ---------- races: press T at a RACE START flag (in every stunt park) ---------- */
const RACE={on:false,cp:[],i:0,t:0};
const raceBeacon=(function(){
  const g=new THREE.Group();
  const cyl=new THREE.Mesh(new THREE.CylinderGeometry(7,7,40,16,1,true),
    new THREE.MeshBasicMaterial({color:0x3fd0ff,transparent:true,opacity:0.35,side:THREE.DoubleSide}));
  cyl.position.y=20;g.add(cyl);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(7,0.5,8,24),new THREE.MeshBasicMaterial({color:0x3fd0ff}));
  ring.rotation.x=Math.PI/2;ring.position.y=1;g.add(ring);
  g.visible=false;scene.add(g);return g;
})();
function nearRaceFlag(){
  for(let i=raceFlags.length-1;i>=0;i--){
    const f=raceFlags[i];
    if(offScene(f.g)){raceFlags.splice(i,1);continue;}
    if(Math.hypot(player.x-f.x,player.z-f.z)<9)return f;
  }
  return null;
}
function moveBeacon(){
  const cp=RACE.cp[RACE.i];
  raceBeacon.position.set(cp.x,terrainH(cp.x,cp.z),cp.z);
  raceBeacon.visible=true;
}
function startRace(rand,origin){
  rand=rand||Math.random;
  const snap=v=>Math.round((v-30)/120)*120+30;
  let cx=snap(origin?origin.x:player.x),cz=snap(origin?origin.z:player.z);
  RACE.cp=[];
  let axis=rand()<0.5;
  for(let k=0;k<5;k++){   // 5 checkpoints along the grid roads
    const step=(2+Math.floor(rand()*3))*120*(rand()<0.5?-1:1);
    if(axis)cx+=step;else cz+=step;
    axis=!axis;
    RACE.cp.push({x:cx,z:cz});
  }
  RACE.on=true;RACE.i=0;RACE.t=0;
  RACE.mp=!!origin;
  moveBeacon();
  toast("\u{1F3C1} RACE! Drive through 5 blue checkpoints — GO GO GO!");
}
function endRace(win){
  RACE.on=false;raceBeacon.visible=false;
  if(RACE.mp){
    RACE.mp=false;
    const key=RACEMP.flagKey,ts=RACEMP.ts;
    RACEMP.state=null;
    if(win)claimRaceWin(key,ts);
    else toast("\u{1F3C1} Race over — no prize this time.");
    return;
  }
  if(win){
    const reward=Math.max(50,Math.round(600-RACE.t*4));
    addMoney(reward);
    ACH.flags.race=true;saveAch();
    tourneyWin();
    toast("\u{1F3C6} FINISH in "+RACE.t.toFixed(1)+"s — you won $"+reward+"!");
    pushNews("\u{1F3C1} "+mpName()+" won a checkpoint race in "+RACE.t.toFixed(1)+" seconds!");
  }else toast("\u{1F3C1} Race cancelled.");
}
/* ---------- MULTIPLAYER races: $100 entry, first to finish takes the pot ---------- */
const RACEMP={state:null,flagKey:null,ts:0,seed:0,origin:null};
function raceFlagKey(f){return fbKey("F:"+Math.round(f.x)+","+Math.round(f.z));}
function racerId(){return fbKey(profileKey()||MP.id);}
function openRaceMenu(f){
  showDest("\u{1F3C1} Race start",[
    {label:"\u{1F3CE} Solo race — free, win up to $600",value:"solo"},
    {label:"\u{1F465} MULTIPLAYER race — $100 entry, winner takes the whole pot!",value:"mp"},
    {label:"❌ Cancel",value:"cancel"}
  ],async v=>{
    if(v==="solo"){startRace();return;}
    if(v!=="mp")return;
    if(!SERVER_READY){toast("\u{1F534} Multiplayer races need the online database.");return;}
    if(MONEY.v<100){toast("\u{1F4B0} The entry fee is $100 — you have $"+fmtMoney(MONEY.v)+"!");return;}
    const key=raceFlagKey(f),now=Date.now();
    const g=await fbGet("/races/"+mpWorldKey()+"/"+key);
    const race=g.ok?g.data:null;
    if(race&&race.ts>now){
      /* an upcoming race exists here: JOIN it */
      await fbPut("/raceent/"+mpWorldKey()+"/"+key+"/"+racerId(),{n:mpName(),ts:now});
      MONEY.v-=100;updateMoneyUI();saveGame();
      RACEMP.state="waiting";RACEMP.flagKey=key;RACEMP.ts=race.ts;RACEMP.seed=race.seed||1;RACEMP.origin={x:f.x,z:f.z};
      toast("\u{1F465} You joined "+(race.n||"the")+"'s race — it starts in "+Math.ceil((race.ts-now)/1000)+"s. Stay at the flag!");
      return;
    }
    if(race&&race.ts>now-240000){
      toast("\u{1F3C1} A race just ran here — this flag frees up in a few minutes!");
      return;
    }
    /* HOST a new race, starting in 30 seconds */
    const ts=now+30000,seed=Math.floor(Math.random()*1e9);
    const ok=await fbPut("/races/"+mpWorldKey()+"/"+key,{ts,seed,n:mpName()});
    if(!ok){toast("\u{1F534} Couldn't create the race — are the database rules updated?");return;}
    await fbPut("/raceent/"+mpWorldKey()+"/"+key+"/"+racerId(),{n:mpName(),ts:now});
    MONEY.v-=100;updateMoneyUI();saveGame();
    RACEMP.state="waiting";RACEMP.flagKey=key;RACEMP.ts=ts;RACEMP.seed=seed;RACEMP.origin={x:f.x,z:f.z};
    toast("\u{1F465}\u{1F3C1} RACE CREATED — it starts in 30s! Tell everyone in \u{1F4AC} chat to press T at this flag!");
  });
}
function updateRaceMP(){
  if(RACEMP.state!=="waiting")return;
  const left=RACEMP.ts-Date.now();
  const el=$("navDist");
  el.style.display="flex";
  $("navTxt").textContent="\u{1F3C1} Multiplayer race starts in "+Math.max(0,Math.ceil(left/1000))+"s — pot grows with every racer!";
  if(left<=0){
    RACEMP.state="racing";
    startRace(rng(RACEMP.seed),RACEMP.origin);
  }
}
async function claimRaceWin(key,ts){
  const winPath="/racewin/"+mpWorldKey()+"/"+key+"_"+ts;
  const ok=await fbPut(winPath,{n:mpName(),ts:Date.now()});
  if(ok){
    const g=await fbGet("/raceent/"+mpWorldKey()+"/"+key);
    let cnt=1;
    if(g.ok&&g.data)cnt=Math.max(1,Object.values(g.data).filter(e=>e&&typeof e.ts==="number"&&e.ts>ts-300000).length);
    const pot=100*cnt;
    addMoney(pot);
    ACH.flags.race=true;saveAch();
    tourneyWin();
    toast("\u{1F3C6}\u{1F451} YOU WON THE MULTIPLAYER RACE! The pot is yours: $"+fmtMoney(pot)+" ("+cnt+" racer"+(cnt>1?"s":"")+")!");
  }else{
    const g=await fbGet(winPath);
    if(g.ok&&g.data&&g.data.n)toast("\u{1F3C1} You finished — but "+g.data.n+" was faster and takes the pot!");
    else{addMoney(200);toast("\u{1F3C1} You finished the race — +$200! (The database rules are too old for pots.)");}
  }
}
function updateRace(dt){
  if(!RACE.on)return;
  RACE.t+=dt;
  raceBeacon.rotation.y+=dt*1.5;
  const cp=RACE.cp[RACE.i];
  const d=Math.hypot(player.x-cp.x,player.z-cp.z);
  if(d<16){
    RACE.i++;
    if(RACE.i>=RACE.cp.length){endRace(true);return;}
    toast("✅ Checkpoint "+RACE.i+"/5 — keep going!");
    moveBeacon();
  }
  if(RACE.t>300){endRace(false);return;}
  const el=$("navDist");
  el.style.display="block";
  el.textContent="\u{1F3C1} "+RACE.i+"/5 · "+RACE.t.toFixed(1)+"s · "+(d<1000?Math.round(d)+" m":(d/1000).toFixed(1)+" km");
}
/* ---------- police chases & arrests ---------- */
const SPEED_LIMIT_MS=33.4;   // ~120 km/h: any faster near a cop starts a chase
let arrestCd=0;              // grace period after being released
function startChase(c,reason){
  if(c.chase)return;
  const cp=trafficPos(c);
  c.chase=true;c.siren=true;c.heat=7;c.bustT=0;
  c.x=cp.x;c.z=cp.z;c.cs=Math.max(c.sp,14);
  c.yaw=Math.atan2(player.x-cp.x,player.z-cp.z);
  toast(reason+" \u{1F6A8} The police are chasing you!");
}
function endChase(c){c.chase=false;c.siren=false;c.bustT=0;respawnCar(c);}
function arrestPlayer(){
  for(const c of traffic)if(c.chase)endChase(c);
  if(player.drive)player.drive.speed=0;
  ACC.on=false;$("accBtn").textContent="OFF";$("accBtn").classList.remove("on");
  teleportTo(WORLD.ox+6,WORLD.oz+6);
  payFine(150,"$150 arrest fine");   // charged even if it puts you in the minus
  toast("\u{1F694} BUSTED! You were arrested, fined $150 and released at spawn.");
  pushNews("\u{1F694} "+mpName()+" was caught by the police after a wild chase!");
  arrestCd=6;
}
/* traffic */
function updateTraffic(dt){
  if(!S.traffic)return;
  if(arrestCd>0)arrestCd-=dt;
  const phase=lightPhase(); // 0: NS green
  const playerSpd=player.drive?Math.abs(player.drive.speed):0;
  /* on highways the limit is 150 km/h, elsewhere ~120 */
  const onHwy=Math.abs(player.x-170)<13||Math.abs(player.z+170)<13||Math.abs(player.x-MHX)<22||Math.abs(player.z-MHZ)<22;
  const speeding=playerSpd>(onHwy?150/3.6:SPEED_LIMIT_MS);
  for(const c of traffic){
    if(c.controlled)continue;
    /* police spotting you: speeding nearby, or ramming their car */
    if(S.arrest&&SETTINGS.police&&c.kind==="police"&&!c.chase&&arrestCd<=0&&player.drive===myVehicle&&player.drive){
      const cp=trafficPos(c);
      const d=Math.hypot(cp.x-player.x,cp.z-player.z);
      if(d<3.9&&playerSpd>6)startChase(c,"\u{1F694} You hit a police car!");
      else if(speeding&&d<110)startChase(c,"\u{1F4A8} You were caught speeding!");
    }
    /* active chase: cop leaves its lane and hunts you down */
    if(c.chase){
      if(speeding)c.heat=7;else c.heat-=dt;
      const dx=player.x-c.x,dz=player.z-c.z,d=Math.hypot(dx,dz);
      const tgt=Math.atan2(dx,dz);
      let dy=tgt-c.yaw;while(dy>Math.PI)dy-=Math.PI*2;while(dy<-Math.PI)dy+=Math.PI*2;
      c.yaw+=Math.max(-2.4*dt,Math.min(2.4*dt,dy));
      let want=Math.max(150/3.6,playerSpd*1.12+3);   // never below 150 km/h — and always faster than you
      /* when close, pull up next to you instead of orbiting (their turning
         circle at full speed is wider than the arrest radius) */
      if(d<20)want=Math.min(want,Math.max(2.5,(d-2)*1.6));
      c.cs+=(want-c.cs)*Math.min(1,(d<20?3:0.9)*dt);
      c.x+=Math.sin(c.yaw)*c.cs*dt;c.z+=Math.cos(c.yaw)*c.cs*dt;
      c.mesh.position.set(c.x,terrainH(c.x,c.z),c.z);
      c.mesh.rotation.set(0,c.yaw,0);
      c.mesh.rotateX(-slopePitch(c.x,c.z,c.yaw,1.8));
      if(c.mesh.userData.wheels)for(const w of c.mesh.userData.wheels)w.spin.rotation.x+=c.cs/w.r*dt;
      if(c.mesh.userData.lights){
        const on=Math.floor(performance.now()/140)%2===0;
        c.mesh.userData.lights[0].visible=on;
        c.mesh.userData.lights[1].visible=!on;
      }
      /* staying close for 5 seconds gets you busted — you can still escape */
      if(d<(player.onFoot?4:7)){
        const prev=c.bustT||0;
        c.bustT=prev+dt;
        if(c.bustT>=5)arrestPlayer();
        else if(prev<=0||Math.ceil(5-c.bustT)!==Math.ceil(5-prev))
          toast("\u{1F694} Arrest in "+Math.ceil(5-c.bustT)+"s — GET AWAY!");
      }else{
        c.bustT=Math.max(0,(c.bustT||0)-dt*1.5);
        if(c.heat<=0&&d>130){endChase(c);toast("\u{1F44D} The police gave up the chase.");}
      }
      continue;
    }
    /* siren cycles */
    if(c.kind){
      c.sirenT-=dt;
      if(c.sirenT<=0){c.siren=!c.siren;c.sirenT=c.siren?12+Math.random()*8:18+Math.random()*40;}
      if(c.mesh.userData.lights){
        const on=c.siren&&Math.floor(performance.now()/140)%2===0;
        c.mesh.userData.lights[0].visible=!c.siren||on;
        c.mesh.userData.lights[1].visible=!c.siren||!on;
      }
    }
    let sp=c.sp*(c.siren?1.9:1);
    /* civilians pull over for sirens */
    let tgtDodge=0;
    if(!c.kind){
      for(const e of traffic){
        if(!e.siren)continue;
        const ep=e.chase?{x:e.x,z:e.z}:trafficPos(e),cp=trafficPos(c);
        if(Math.hypot(ep.x-cp.x,ep.z-cp.z)<45){tgtDodge=2.2;sp*=0.6;break;}
      }
    }
    c.dodge+=(tgtDodge-c.dodge)*Math.min(1,3*dt);
    /* stop at red lights (not on highways, sirens run reds) */
    if(!c.lane.hw&&!c.siren){
      const redFor=c.lane.axis==="z"?phase===1:phase===0;
      if(redFor){
        const nxt=c.lane.dir>0?Math.ceil((c.t-30+9)/120)*120+30:Math.floor((c.t-30-9)/120)*120+30;
        const gap=(nxt-c.t)*c.lane.dir-9;
        if(gap>0&&gap<16)sp*=Math.max(0,gap-2)/14;
      }
    }
    /* traffic cars honk by themselves: stuck at a light or squeezing past a siren */
    if(!c.kind&&sp<c.sp*0.3&&Math.random()<dt*0.3){
      const bp=trafficPos(c);
      const bd=Math.hypot(bp.x-player.x,bp.z-player.z);
      if(bd<85)trafficBeep(bd);
    }
    c.t+=sp*dt*c.lane.dir;
    const p=trafficPos(c);
    if(Math.hypot(p.x-player.x,p.z-player.z)>420)respawnCar(c);
    const y=terrainH(p.x,p.z);
    const laneYaw=c.lane.axis==="z"?(c.lane.dir>0?0:Math.PI):(c.lane.dir>0?Math.PI/2:-Math.PI/2);
    c.mesh.position.set(p.x,y,p.z);
    c.mesh.rotation.set(0,laneYaw,0);
    c.mesh.rotateX(-slopePitch(p.x,p.z,laneYaw,1.8));   // follow the hill, don't stay flat
    if(c.mesh.userData.beams){const bOn=isNight();c.mesh.userData.beams.forEach(b=>b.visible=bOn);}
    if(c.mesh.userData.wheels)for(const w of c.mesh.userData.wheels)w.spin.rotation.x+=sp/w.r*dt;
    /* 🚗 SOLID traffic: you bump into cars, never through them (driving OR walking) */
    if(!player.onFoot&&player.drive&&player.drive!==c){
      const v=player.drive;
      const dx=v.x-p.x,dz=v.z-p.z,dd=Math.hypot(dx,dz);
      if(dd<2.4&&Math.abs((v.y||0)-y)<2.6){   // tighter car hitbox — no invisible bumpers
        const push=(2.4-dd)/(dd||0.001);
        v.x+=dx*push;v.z+=dz*push;                 // pushed out — no ghosting through
        if(Math.abs(v.speed)>6){playCrash(Math.abs(v.speed));vehDamage(Math.abs(v.speed)*0.7);}
        v.speed*=0.4;
      }
    }else if(player.onFoot&&!RIDE.on){
      const dx=player.x-p.x,dz=player.z-p.z,dd=Math.hypot(dx,dz);
      if(dd<1.6&&Math.abs(player.y-y)<2.6){
        const push=(1.6-dd)/(dd||0.001);
        player.x+=dx*push;player.z+=dz*push;
      }
    }
  }
}
/* 🅿️ parked cars are SOLID too — every car in the world blocks you now */
function solidParked(){
  if(S.world!=="earth")return;
  const v=(!player.onFoot&&player.drive)?player.drive:null;
  if(!v&&(RIDE.on||!player.onFoot))return;
  const px=v?v.x:player.x,pz=v?v.z:player.z,py=v?(v.y||0):player.y;
  const rad=v?2.4:1.6;   // tighter parked-car hitbox
  for(let i=parkedCars.length-1;i>=0;i--){
    const rec=parkedCars[i];
    if(offScene(rec.g)){parkedCars.splice(i,1);continue;}
    const gp=rec.g.position;
    const dx=px-gp.x,dz=pz-gp.z;
    if(Math.abs(dx)>rad||Math.abs(dz)>rad||Math.abs(py-gp.y)>2.6)continue;
    const dd=Math.hypot(dx,dz);
    if(dd>=rad)continue;
    const push=(rad-dd)/(dd||0.001);
    if(v){
      v.x+=dx*push;v.z+=dz*push;
      if(Math.abs(v.speed)>6){playCrash(Math.abs(v.speed));vehDamage(Math.abs(v.speed)*0.5);}
      v.speed*=0.3;
    }else{player.x+=dx*push;player.z+=dz*push;}
  }
}
/* ================= CAMERA / HUD / MAP / LOOP ================= */
const FPS={frames:0,t:0,val:0};
function camTargetInfo(){
  if(player.inRocket)return{x:rocket.x,y:rocket.y+9,z:rocket.z,yaw:rocket.yaw||0,d:46,h:16};
  if(player.inHeli)return{x:HELI.x,y:HELI.y+3,z:HELI.z,yaw:HELI.yaw,d:17,h:7};
  if(player.boat)return{x:player.boat.x,y:0.6,z:player.boat.z,yaw:player.boat.yaw,d:14,h:5.5};
  if(RIDE.on){
    const o=MP.others.get(RIDE.key);
    if(o)return{x:o.x,y:o.y+1,z:o.z,yaw:o.yaw,d:13,h:5};
  }
  if(player.inTrain){const t=player.train;return{x:t.g.position.x,y:t.g.position.y+3,z:t.z,yaw:t.g.rotation.y+(t.speed<0?Math.PI:0),d:26,h:10};}
  if(player.inPlane){const p=player.planeRef;return{x:p.x,y:p.y+2,z:p.z,yaw:p.yaw,d:30,h:12};}
  if(player.inBus){const b=player.bus;return{x:b.g.position.x,y:b.g.position.y+2,z:b.g.position.z,yaw:b.yaw,d:20,h:8};}
  if(player.drive){const v=player.drive;return{x:v.x,y:v.y+1,z:v.z,yaw:v.yaw,d:v.mesh.userData.camD||13,h:v.mesh.userData.camH||5};}
  return{x:player.x,y:player.y+1.4,z:player.z,yaw:player.yaw,d:9,h:4};
}
function updateCamera(dt){
  const t=camTargetInfo();
  let d=t.d,h=t.h;
  if(S.camMode===1){d*=0.55;h*=0.6;}
  if(S.camMode===3){d=0.001;h=Math.max(60,t.d*6);}
  const yaw=t.yaw+look.yaw;
  if(!look.on){look.yaw*=Math.pow(0.02,dt);look.pitch*=Math.pow(0.02,dt);}
  if(S.camMode===2){
    camera.position.set(t.x+Math.sin(yaw)*0.6,t.y+0.6+look.pitch*2,t.z+Math.cos(yaw)*0.6);
    camera.lookAt(t.x+Math.sin(yaw)*12,t.y+0.6+look.pitch*10,t.z+Math.cos(yaw)*12);
  }else if(S.camMode===3){
    camera.position.set(t.x,t.y+h,t.z);
    camera.lookAt(t.x,t.y,t.z+0.01);
  }else{
    const cx=t.x-Math.sin(yaw)*d,cz=t.z-Math.cos(yaw)*d;
    const cy=Math.max(t.y+h+look.pitch*d,terrainH(cx,cz)+1.6);
    camera.position.lerp(new THREE.Vector3(cx,cy,cz),Math.min(1,7*dt));
    camera.lookAt(t.x,t.y+1.4,t.z);
  }
}
/* map */
const mapView={cx:0,cz:0,scale:0.55};
function mapColor(x,z){
  if(S.world==="mc"){
    const h=mcH(x,z);
    if(h>12)return "#e8ecef";
    if(h>8.7)return "#8a8f96";
    return ((Math.floor(x/3)+Math.floor(z/3))%2+2)%2?"#4f9e3f":"#57ab45";
  }
  if(S.world!=="earth"){
    const P=curPlanet()||PLANETS.moon;
    const h=moonH(x,z);
    if(rocketPadDist(x,z)<20)return "#4a4f57";
    if(h<-1.2)return cssCol(P.dark);                  // holes
    return vnoise(x/60+2.2,z/60+6.6)<0.5?cssCol(P.ground):cssCol(P.ground2);
  }
  if(Math.abs(x)<170&&Math.abs(z)<170)return "#4c6b3c";
  if(inAirport(x,z))return "#3a3f47";
  if(Math.hypot(x+340,z-260)<60)return "#2f8f46";
  if(Math.abs(x-MHX)<20||Math.abs(z-MHZ)<20)return "#23262c";   // the MEGA HIGHWAY
  if(Math.abs(x-170)<12||Math.abs(z+170)<12)return "#30343b";
  if(nearGridLine(x)<8||nearGridLine(z)<8)return "#3b3f46";
  if(Math.abs(x-curveXC(x,z))<7||Math.abs(z-curveZC(x,z))<7)return "#464b53";
  if(nearestRail(x,z).d<5)return "#6b7280";
  const h=baseH(x,z);
  if(h>-1.4&&h<2.4&&seaAt(x,z)>0.55)return "#e6d9a8";  // island beaches
  if(h<-2.5)return "#1d6f9e";                          // the sea
  if(h>85)return "#e8ecef";
  if(h>34)return "#8d8577";
  if(h>16)return "#7c8a5a";
  const m=moist(x,z);
  if(m<0.40)return "#cdb87e";
  if(m>0.60)return "#3e7a33";
  return "#5d924b";
}
let mapDrag=null;
/* the map repaint is expensive — while dragging/zooming, repaint at most
   once per animation frame instead of on every mouse event */
let _mapRaf=false;
function requestMap(){
  if(_mapRaf)return;_mapRaf=true;
  requestAnimationFrame(()=>{_mapRaf=false;drawMap();});
}
function drawMap(){
  const cv=$("mapCv");
  cv.width=cv.clientWidth;cv.height=cv.clientHeight;
  const c=cv.getContext("2d"),sc=mapView.scale;
  const step=4;
  for(let py=0;py<cv.height;py+=step)for(let px=0;px<cv.width;px+=step){
    const wx=(px-cv.width/2)/sc+mapView.cx;
    const wz=-((py-cv.height/2)/sc)+mapView.cz;
    c.fillStyle=mapColor(wx,wz);
    c.fillRect(px,py,step,step);
  }
  function dot(wx,wz,col,rr){
    const px=(wx-mapView.cx)*sc+cv.width/2,py=-(wz-mapView.cz)*sc+cv.height/2;
    if(px<-20||py<-20||px>cv.width+20||py>cv.height+20)return;
    c.fillStyle=col;c.beginPath();c.arc(px,py,rr||5,0,7);c.fill();
    c.strokeStyle="#fff";c.lineWidth=1.5;c.stroke();
  }
  /* mark EVERY airport in view (there is one every 2.4 km, forever) */
  if(S.world==="earth"){
    const halfW=cv.width/2/sc,halfH=cv.height/2/sc;
    const i0=Math.floor((mapView.cx-halfW)/ACELL),i1=Math.ceil((mapView.cx+halfW)/ACELL);
    const j0=Math.floor((mapView.cz-halfH)/ACELL),j1=Math.ceil((mapView.cz+halfH)/ACELL);
    for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){
      const a=airportOf(i,j);
      dot(a.term.x,a.term.z,"#3fd0ff",6);
      const px=(a.term.x-mapView.cx)*sc+cv.width/2,py=-(a.term.z-mapView.cz)*sc+cv.height/2;
      if(px>-20&&py>-20&&px<cv.width+20&&py<cv.height+20){
        c.fillStyle="#7fe0ff";c.font="bold 11px Segoe UI";c.textAlign="center";
        c.fillText("✈",px,py-9);
      }
    }
  }
  /* McDrives: yellow M dots (earth only; hidden when zoomed way out) */
  if(S.world==="earth"&&sc>=0.14){
    const halfW=cv.width/2/sc,halfH=cv.height/2/sc;
    const i0=Math.floor((mapView.cx-46-halfW)/MCSP),i1=Math.ceil((mapView.cx-46+halfW)/MCSP);
    const j0=Math.floor((mapView.cz-90-halfH)/MCSP),j1=Math.ceil((mapView.cz-90+halfH)/MCSP);
    for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){
      const spot=mcdSpot(i,j);
      if(!spot)continue;
      dot(spot.x,spot.z,"#c0392b",5);
      const px=(spot.x-mapView.cx)*sc+cv.width/2,py=-(spot.z-mapView.cz)*sc+cv.height/2;
      if(px>-20&&py>-20&&px<cv.width+20&&py<cv.height+20){
        c.fillStyle="#ffd75e";c.font="bold 11px Segoe UI";c.textAlign="center";
        c.fillText("M",px,py+4);
      }
    }
  }
  /* rocket stations (both worlds, one every ~5 km) */
  {
    const halfW=cv.width/2/sc,halfH=cv.height/2/sc;
    const i0=Math.floor((mapView.cx-2400-halfW)/RCELL),i1=Math.ceil((mapView.cx-2400+halfW)/RCELL);
    const j0=Math.floor((mapView.cz-2400-halfH)/RCELL),j1=Math.ceil((mapView.cz-2400+halfH)/RCELL);
    for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){
      const p=rocketPadPos(i,j);
      dot(p.x,p.z,"#ff5c5c",6);
      const px=(p.x-mapView.cx)*sc+cv.width/2,py=-(p.z-mapView.cz)*sc+cv.height/2;
      if(px>-20&&py>-20&&px<cv.width+20&&py<cv.height+20){
        c.fillStyle="#ffb0a0";c.font="bold 11px Segoe UI";c.textAlign="center";
        c.fillText("\u{1F680}",px,py-9);
      }
    }
  }
  /* alien spaceships (off Earth only, one every ~1000 km) */
  if(S.world!=="earth"){
    const halfW=cv.width/2/sc,halfH=cv.height/2/sc;
    const ui0=Math.floor((mapView.cx-halfW-3300)/UFOSP),ui1=Math.ceil((mapView.cx+halfW-3300)/UFOSP);
    const uj0=Math.floor((mapView.cz-halfH-6600)/UFOSP),uj1=Math.ceil((mapView.cz+halfH-6600)/UFOSP);
    for(let i=ui0;i<=ui1;i++)for(let j=uj0;j<=uj1;j++){
      const s=ufoSpot(i,j);
      if(!s)continue;
      dot(s.x,s.z,(curPlanet()||PLANETS.moon).alienCss,7);
      const px=(s.x-mapView.cx)*sc+cv.width/2,py=-(s.z-mapView.cz)*sc+cv.height/2;
      if(px>-20&&py>-20&&px<cv.width+20&&py<cv.height+20){
        c.fillStyle="#b6ff9e";c.font="bold 11px Segoe UI";c.textAlign="center";
        c.fillText("\u{1F6F8}",px,py-9);
      }
    }
  }
  /* shops: every MEGA MART (deterministic grid), plus nearby loaded small shops */
  if(S.world==="earth"){
    const halfW=cv.width/2/sc,halfH=cv.height/2/sc;
    const i0=Math.floor((mapView.cx-halfW-900)/HSP),i1=Math.ceil((mapView.cx+halfW+100)/HSP);
    const j0=Math.floor((mapView.cz-halfH-500)/HSP),j1=Math.ceil((mapView.cz+halfH+100)/HSP);
    for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){
      const s=hugeShopSpot(i,j);
      if(!s)continue;
      dot(s.x,s.z,"#0f7d4b",8);
      const px=(s.x-mapView.cx)*sc+cv.width/2,py=-(s.z-mapView.cz)*sc+cv.height/2;
      if(px>-20&&py>-20&&px<cv.width+20&&py<cv.height+20){
        c.fillStyle="#7dffb5";c.font="bold 11px Segoe UI";c.textAlign="center";
        c.fillText("\u{1F6D2}",px,py-9);
      }
    }
    if(sc>=0.3)for(const s of shops){
      if(offScene(s.g)||s.huge)continue;
      dot(s.x,s.z,"#2ec4b6",4);
    }
    /* MEGA MANSIONS every ~2 km */
    const mi0=Math.floor((mapView.cx-halfW-1400)/MSP),mi1=Math.ceil((mapView.cx+halfW+100)/MSP);
    const mj0=Math.floor((mapView.cz-halfH-1000)/MSP),mj1=Math.ceil((mapView.cz+halfH+100)/MSP);
    for(let i=mi0;i<=mi1;i++)for(let j=mj0;j<=mj1;j++){
      const s=mansionSpot(i,j);
      if(!s)continue;
      dot(s.x,s.z,"#9b5de5",8);
      const px=(s.x-mapView.cx)*sc+cv.width/2,py=-(s.z-mapView.cz)*sc+cv.height/2;
      if(px>-20&&py>-20&&px<cv.width+20&&py<cv.height+20){
        c.fillStyle="#e3c5ff";c.font="bold 11px Segoe UI";c.textAlign="center";
        c.fillText("\u{1F3F0}",px,py-10);
      }
    }
    /* family houses for sale every ~1.4 km */
    {
      const fi0=Math.floor((mapView.cx-halfW-700)/FHSP),fi1=Math.ceil((mapView.cx+halfW+100)/FHSP);
      const fj0=Math.floor((mapView.cz-halfH-1900)/FHSP),fj1=Math.ceil((mapView.cz+halfH+100)/FHSP);
      for(let i=fi0;i<=fi1;i++)for(let j=fj0;j<=fj1;j++){
        const s=familyHouseSpot(i,j);
        if(!s)continue;
        dot(s.x,s.z,"#4ade80",6);
        const px=(s.x-mapView.cx)*sc+cv.width/2,py=-(s.z-mapView.cz)*sc+cv.height/2;
        if(px>-20&&py>-20&&px<cv.width+20&&py<cv.height+20){
          c.fillStyle="#b7f7cd";c.font="bold 11px Segoe UI";c.textAlign="center";
          c.fillText("\u{1F3E1}",px,py-9);
        }
      }
    }
    /* marketing plots every ~3 km */
    {
      const ki0=Math.floor((mapView.cx-halfW-2300)/MKSP),ki1=Math.ceil((mapView.cx+halfW+100)/MKSP);
      const kj0=Math.floor((mapView.cz-halfH-800)/MKSP),kj1=Math.ceil((mapView.cz+halfH+100)/MKSP);
      for(let i=ki0;i<=ki1;i++)for(let j=kj0;j<=kj1;j++){
        const s=marketPlotSpot(i,j);
        if(!s)continue;
        dot(s.x,s.z,"#c084fc",6);
        const px=(s.x-mapView.cx)*sc+cv.width/2,py=-(s.z-mapView.cz)*sc+cv.height/2;
        if(px>-20&&py>-20&&px<cv.width+20&&py<cv.height+20){
          c.fillStyle="#e3ccff";c.font="bold 11px Segoe UI";c.textAlign="center";
          c.fillText("\u{1F3EA}",px,py-9);
        }
      }
    }
    /* stunt parks every ~3.6 km */
    const si0=Math.floor((mapView.cx-halfW-1900)/3600),si1=Math.ceil((mapView.cx+halfW+100)/3600);
    const sj0=Math.floor((mapView.cz-halfH-700)/3600),sj1=Math.ceil((mapView.cz+halfH+100)/3600);
    for(let i=si0;i<=si1;i++)for(let j=sj0;j<=sj1;j++){
      const s=stuntPos(i,j);
      dot(s.x,s.z,"#e67e22",7);
      const px=(s.x-mapView.cx)*sc+cv.width/2,py=-(s.z-mapView.cz)*sc+cv.height/2;
      if(px>-20&&py>-20&&px<cv.width+20&&py<cv.height+20){
        c.fillStyle="#ffd8a8";c.font="bold 11px Segoe UI";c.textAlign="center";
        c.fillText("\u{1F3A2}",px,py-9);
      }
    }
    /* dumpling buyers (zoom in to see them) */
    if(sc>=0.35){
      const bi0=Math.floor((mapView.cx-halfW-160)/DBSP),bi1=Math.ceil((mapView.cx+halfW+100)/DBSP);
      const bj0=Math.floor((mapView.cz-halfH-400)/DBSP),bj1=Math.ceil((mapView.cz+halfH+100)/DBSP);
      for(let i=bi0;i<=bi1;i++)for(let j=bj0;j<=bj1;j++){
        const s=buyerSpot(i,j);
        if(s)dot(s.x,s.z,"#ff5d8f",4);
        const bs=butterSpot(i,j);
        if(bs)dot(bs.x,bs.z,"#f4d35e",4);
      }
    }
    /* gas stations (zoom in a bit) */
    if(sc>=0.14){
      const gi0=Math.floor((mapView.cx-halfW-300)/GSP),gi1=Math.ceil((mapView.cx+halfW-270)/GSP);
      const gj0=Math.floor((mapView.cz-halfH-170)/GSP),gj1=Math.ceil((mapView.cz+halfH-130)/GSP);
      for(let i=gi0;i<=gi1;i++)for(let j=gj0;j<=gj1;j++){
        const s=gasSpot(i,j);
        if(!s)continue;
        dot(s.x,s.z,"#0f7a3d",5);
        const px=(s.x-mapView.cx)*sc+cv.width/2,py=-(s.z-mapView.cz)*sc+cv.height/2;
        if(px>-20&&py>-20&&px<cv.width+20&&py<cv.height+20){
          c.fillStyle="#7dffb5";c.font="bold 11px Segoe UI";c.textAlign="center";
          c.fillText("⛽",px,py-8);
        }
      }
    }
    /* public pool parks every ~2 km */
    {
      const wi0=Math.floor((mapView.cx-halfW-1830)/PPSP),wi1=Math.ceil((mapView.cx+halfW-1590)/PPSP);
      const wj0=Math.floor((mapView.cz-halfH-550)/PPSP),wj1=Math.ceil((mapView.cz+halfH-310)/PPSP);
      for(let i=wi0;i<=wi1;i++)for(let j=wj0;j<=wj1;j++){
        const s=poolSpot(i,j);
        if(!s)continue;
        dot(s.x,s.z,"#0e7490",7);
        const px=(s.x-mapView.cx)*sc+cv.width/2,py=-(s.z-mapView.cz)*sc+cv.height/2;
        if(px>-20&&py>-20&&px<cv.width+20&&py<cv.height+20){
          c.fillStyle="#7fe0ff";c.font="bold 11px Segoe UI";c.textAlign="center";
          c.fillText("\u{1F3CA}",px,py-9);
        }
      }
    }
    /* building plots for sale every ~1.6 km */
    if(sc>=0.14){
      const pi0=Math.floor((mapView.cx-halfW-500)/PLSP),pi1=Math.ceil((mapView.cx+halfW-360)/PLSP);
      const pj0=Math.floor((mapView.cz-halfH-1220)/PLSP),pj1=Math.ceil((mapView.cz+halfH-1080)/PLSP);
      for(let i=pi0;i<=pi1;i++)for(let j=pj0;j<=pj1;j++){
        const s=plotSpot(i,j);
        if(!s)continue;
        dot(s.x,s.z,"#0f7a3d",5);
        const px=(s.x-mapView.cx)*sc+cv.width/2,py=-(s.z-mapView.cz)*sc+cv.height/2;
        if(px>-20&&py>-20&&px<cv.width+20&&py<cv.height+20){
          c.fillStyle="#7dffb5";c.font="bold 11px Segoe UI";c.textAlign="center";
          c.fillText("\u{1F3D7}",px,py-8);
        }
      }
    }
    /* dumpling museums every ~1 km */
    if(sc>=0.14){
      const ui0=Math.floor((mapView.cx-halfW-600)/DMUS),ui1=Math.ceil((mapView.cx+halfW-440)/DMUS);
      const uj0=Math.floor((mapView.cz-halfH-340)/DMUS),uj1=Math.ceil((mapView.cz+halfH-180)/DMUS);
      for(let i=ui0;i<=ui1;i++)for(let j=uj0;j<=uj1;j++){
        const s=museumSpot(i,j);
        if(!s)continue;
        dot(s.x,s.z,"#d16ba5",6);
        const px=(s.x-mapView.cx)*sc+cv.width/2,py=-(s.z-mapView.cz)*sc+cv.height/2;
        if(px>-20&&py>-20&&px<cv.width+20&&py<cv.height+20){
          c.fillStyle="#ffd0e8";c.font="bold 11px Segoe UI";c.textAlign="center";
          c.fillText("\u{1F3DB}",px,py-9);
        }
      }
    }
    /* concert halls every ~2.4 km */
    {
      const ci0=Math.floor((mapView.cx-halfW-1570)/CHSP),ci1=Math.ceil((mapView.cx+halfW-1490)/CHSP);
      const cj0=Math.floor((mapView.cz-halfH-1090)/CHSP),cj1=Math.ceil((mapView.cz+halfH-1010)/CHSP);
      for(let i=ci0;i<=ci1;i++)for(let j=cj0;j<=cj1;j++){
        const s=concertSpot(i,j);
        if(!s)continue;
        dot(s.x,s.z,"#6d28d9",7);
        const px=(s.x-mapView.cx)*sc+cv.width/2,py=-(s.z-mapView.cz)*sc+cv.height/2;
        if(px>-20&&py>-20&&px<cv.width+20&&py<cv.height+20){
          c.fillStyle="#e3c5ff";c.font="bold 11px Segoe UI";c.textAlign="center";
          c.fillText("\u{1F3B5}",px,py-10);
        }
      }
    }
    /* volcano islands */
    {
      const wi0=Math.floor((mapView.cx-halfW-4350)/VOLC),wi1=Math.ceil((mapView.cx+halfW-4050)/VOLC);
      const wj0=Math.floor((mapView.cz-halfH-7950)/VOLC),wj1=Math.ceil((mapView.cz+halfH-7650)/VOLC);
      for(let i=wi0;i<=wi1;i++)for(let j=wj0;j<=wj1;j++){
        const s=volcanoSpot(i,j);
        if(!s)continue;
        dot(s.x,s.z,"#c0392b",8);
        const px=(s.x-mapView.cx)*sc+cv.width/2,py=-(s.z-mapView.cz)*sc+cv.height/2;
        if(px>-20&&py>-20&&px<cv.width+20&&py<cv.height+20){
          c.fillStyle="#ff9e3d";c.font="bold 11px Segoe UI";c.textAlign="center";
          c.fillText("\u{1F30B}",px,py-10);
        }
      }
    }
    /* sky restaurants on the peaks */
    if(sc>=0.1){
      const ri0=Math.floor((mapView.cx-halfW-2700)/SRSP),ri1=Math.ceil((mapView.cx+halfW-2500)/SRSP);
      const rj0=Math.floor((mapView.cz-halfH-1000)/SRSP),rj1=Math.ceil((mapView.cz+halfH-800)/SRSP);
      for(let i=ri0;i<=ri1;i++)for(let j=rj0;j<=rj1;j++){
        const s=skyRestSpot(i,j);
        if(!s)continue;
        dot(s.x,s.z,"#9fd8ff",6);
        const px=(s.x-mapView.cx)*sc+cv.width/2,py=-(s.z-mapView.cz)*sc+cv.height/2;
        if(px>-20&&py>-20&&px<cv.width+20&&py<cv.height+20){
          c.fillStyle="#dff1ff";c.font="bold 11px Segoe UI";c.textAlign="center";
          c.fillText("☁️",px,py-9);
        }
      }
    }
    /* ferry islands out in the sea */
    {
      const li0=Math.floor((mapView.cx-halfW-1000)/ISP),li1=Math.ceil((mapView.cx+halfW-800)/ISP);
      const lj0=Math.floor((mapView.cz-halfH-1600)/ISP),lj1=Math.ceil((mapView.cz+halfH-1400)/ISP);
      for(let i=li0;i<=li1;i++)for(let j=lj0;j<=lj1;j++){
        const s=islandSpot(i,j);
        if(!s)continue;
        dot(s.x,s.z,"#0e7490",7);
        const px=(s.x-mapView.cx)*sc+cv.width/2,py=-(s.z-mapView.cz)*sc+cv.height/2;
        if(px>-20&&py>-20&&px<cv.width+20&&py<cv.height+20){
          c.fillStyle="#7fe0ff";c.font="bold 11px Segoe UI";c.textAlign="center";
          c.fillText("\u{1F3DD}",px,py-9);
        }
      }
    }
    /* cave openings in the mountains */
    {
      const vi0=Math.floor((mapView.cx-halfW-760)/CVSP),vi1=Math.ceil((mapView.cx+halfW-720)/CVSP);
      const vj0=Math.floor((mapView.cz-halfH-400)/CVSP),vj1=Math.ceil((mapView.cz+halfH-360)/CVSP);
      for(let i=vi0;i<=vi1;i++)for(let j=vj0;j<=vj1;j++){
        const s=caveSpot(i,j);
        if(!s)continue;
        dot(s.x,s.z,"#57534e",6);
        const px=(s.x-mapView.cx)*sc+cv.width/2,py=-(s.z-mapView.cz)*sc+cv.height/2;
        if(px>-20&&py>-20&&px<cv.width+20&&py<cv.height+20){
          c.fillStyle="#d6d3d1";c.font="bold 11px Segoe UI";c.textAlign="center";
          c.fillText("\u{1F573}",px,py-9);
        }
      }
    }
    /* live random events: construction, accidents & festivals */
    for(const e of EVENTS.list){
      const col=e.type==="construction"?"#ffb02e":(e.type==="accident"?"#ff5c5c":(e.type==="fire"?"#ff7f11":"#f472b6"));
      dot(e.x,e.z,col,6);
      const px=(e.x-mapView.cx)*sc+cv.width/2,py=-(e.z-mapView.cz)*sc+cv.height/2;
      if(px>-20&&py>-20&&px<cv.width+20&&py<cv.height+20){
        c.fillStyle=col;c.font="bold 11px Segoe UI";c.textAlign="center";
        c.fillText(e.type==="construction"?"\u{1F6A7}":(e.type==="accident"?"\u{1F6A8}":(e.type==="fire"?"\u{1F525}":"\u{1F389}")),px,py-9);
      }
    }
  }
  if(S.world==="earth"){
    dot(-340,260,"#27ae60",6);
    trains.forEach(t=>dot(railC(t.k,t.z),t.z,"#c0392b",4));
    buses.forEach(b=>{const p=b.controlled?{x:b.x,z:b.z}:busPos(b);dot(p.x,p.z,"#e67e22",4);});
    planes.forEach(p=>dot(p.x,p.z,"#9b5de5",4));
  }
  /* active route: blue line */
  if(NAV.on){
    c.strokeStyle="#2e8bff";c.lineWidth=4;c.lineCap="round";c.lineJoin="round";
    c.beginPath();
    [{x:player.x,z:player.z},...NAV.path].forEach((p,i)=>{
      const px=(p.x-mapView.cx)*sc+cv.width/2,py=-(p.z-mapView.cz)*sc+cv.height/2;
      i?c.lineTo(px,py):c.moveTo(px,py);
    });
    c.stroke();
    dot(NAV.x,NAV.z,"#2e8bff",6);
  }
  /* other players: cyan dots with their names — click one to teleport / route to them */
  if(S.world==="earth"){
    for(const o of MP.others.values()){
      dot(o.x,o.z,FRIENDS.has(o.name)?"#ffd700":"#3fd0ff",FRIENDS.has(o.name)?7:6);
      const px=(o.x-mapView.cx)*sc+cv.width/2,py=-(o.z-mapView.cz)*sc+cv.height/2;
      if(px>-20&&px<cv.width+20&&py>-20&&py<cv.height+20){
        c.font="bold 12px 'Segoe UI',sans-serif";c.textAlign="center";
        c.strokeStyle="rgba(13,17,26,.8)";c.lineWidth=3;c.strokeText(o.name,px,py-10);
        c.fillStyle="#fff";c.fillText(o.name,px,py-10);
      }
    }
  }
  dot(player.x,player.z,"#ffb02e",7);
}
function choosePlayer(o){
  const opts=[
    {label:"⚡ Teleport (instant)",value:"tp"},
    {label:"\u{1F9ED} Follow route — keeps updating while they move",value:"route"},
    {label:"\u{1F4B8} Send money",value:"pay"},
    {label:"\u{1F381} Give a dumpling",value:"gift"},
    {label:FRIENDS.has(o.name)?"\u{1F494} Remove friend":"⭐ Add friend",value:"friend"}
  ];
  /* 👑 owner powers: kick & ban (only in a shared world you own) */
  if(WORLD.name&&isOwner()&&o.name&&payKey(o.name)!==profileKey()){
    opts.push({label:"\u{1F462} \u{1F451} KICK "+o.name+" out of this world",value:"kick"});
    opts.push({label:"⏳ \u{1F451} BAN "+o.name+" for 1 DAY",value:"ban1"});
    opts.push({label:"\u{1F528} \u{1F451} BAN "+o.name+" FOREVER",value:"banx"});
  }
  opts.push({label:"❌ Cancel",value:"cancel"});
  showDest("\u{1F464} "+o.name,opts,v=>{
    if(v==="cancel")return;
    if(v==="pay"){openPay(o.name);return;}
    if(v==="gift"){openGift(o.name);return;}
    if(v==="kick"){modPunish(o.name,0);return;}
    if(v==="ban1"){modPunish(o.name,Date.now()+86400000);return;}
    if(v==="banx"){modPunish(o.name,BAN_FOREVER);return;}
    if(v==="friend"){
      if(FRIENDS.has(o.name)){FRIENDS.delete(o.name);toast("\u{1F494} "+o.name+" removed from your friends.");}
      else{FRIENDS.add(o.name);toast("⭐ "+o.name+" is now your FRIEND — gold on the map!");}
      saveFriends();requestMap();
      return;
    }
    switchWorld("earth");
    if(v==="tp")teleportTo(o.tx!==undefined?o.tx:o.x,o.tz!==undefined?o.tz:o.z);
    else followPlayer(o);
    $("mapModal").classList.remove("open");
  });
}
function toggleMap(){
  const m=$("mapModal");
  if(m.classList.contains("open")){m.classList.remove("open");return;}
  mapView.cx=player.x;mapView.cz=player.z;
  $("mapSearch").value="";
  m.classList.add("open");drawMap();renderMapList();
}
$("bMap").onclick=toggleMap;
/* the topbar is now one "Actions" button that unfolds all the others */
$("bActions").onclick=()=>$("topbar").classList.toggle("open");
$("actionsMenu").addEventListener("click",e=>{
  if(e.target.closest("button"))$("topbar").classList.remove("open");
});
addEventListener("mousedown",e=>{
  if(!e.target.closest("#topbar"))$("topbar").classList.remove("open");
});
$("mapClose").onclick=()=>$("mapModal").classList.remove("open");
{
  const cv=$("mapCv");
  cv.addEventListener("mousedown",e=>{mapDrag={x:e.clientX,y:e.clientY,moved:false};});
  addEventListener("mousemove",e=>{
    if(!mapDrag)return;
    const dx=e.clientX-mapDrag.x,dy=e.clientY-mapDrag.y;
    if(Math.abs(dx)+Math.abs(dy)>4)mapDrag.moved=true;
    mapView.cx-=dx/mapView.scale;mapView.cz+=dy/mapView.scale;
    mapDrag.x=e.clientX;mapDrag.y=e.clientY;
    requestMap();
  });
  addEventListener("mouseup",e=>{
    if(!mapDrag)return;
    const wasDrag=mapDrag.moved;mapDrag=null;
    if(wasDrag||e.target!==cv)return;
    const r=cv.getBoundingClientRect();
    const wx=(e.clientX-r.left-cv.width/2)/mapView.scale+mapView.cx;
    const wz=-((e.clientY-r.top-cv.height/2)/mapView.scale)+mapView.cz;
    /* clicked on (or near) another player's dot? pick them instead of the ground */
    let hit=null;
    if(S.world==="earth")for(const o of MP.others.values()){
      const d=Math.hypot(o.x-wx,o.z-wz)*mapView.scale;
      if(d<14&&(!hit||d<hit.d))hit={o,d};
    }
    if(hit){choosePlayer(hit.o);return;}
    chooseDest("\u{1F4CD} Map point ("+Math.round(wx)+", "+Math.round(wz)+")",wx,wz,false);
  });
  cv.addEventListener("wheel",e=>{
    e.preventDefault();
    mapView.scale=Math.max(0.06,Math.min(4,mapView.scale*(e.deltaY<0?1.25:0.8)));
    requestMap();
  },{passive:false});
}
/* ---------- map sidebar: searchable list of places, players and coordinates ---------- */
const MAP_PLACES=[["\u{1F3E0} Spawn",6,6,1],["⛪ Church · \u{1F3C6} Sat. CAR MEET",450,330],["\u{1F686} Central Station",-140,50],["✈️ Airport Central",330,-70],["✈️ Airport East",1530,-70],["✈️ Airport South",330,1130],["\u{1F981} Zoo",-340,250],["\u{1F6DD} Playground",60,60],["\u{1F680} Rocket Station",2400,2400]];
function fmtDist(d){return d<1000?Math.round(d)+" m":(d/1000).toFixed(1)+" km";}
function mapEntries(q){
  q=(q||"").trim().toLowerCase();
  const out=[];
  /* typed coordinates like "1200 -300" or "1200, -300"? offer to go there */
  const m=q.match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$/);
  if(m)out.push({label:"\u{1F4CD} Go to ("+m[1]+", "+m[2]+")",cls:"warn",
    go:()=>chooseDest("\u{1F4CD} ("+m[1]+", "+m[2]+")",parseFloat(m[1]),parseFloat(m[2]),false)});
  /* online players, nearest first */
  [...MP.others.values()]
    .filter(o=>!q||o.name.toLowerCase().includes(q))
    .map(o=>({o,d:Math.hypot(o.x-player.x,o.z-player.z)}))
    .sort((a,b)=>((FRIENDS.has(b.o.name)?1:0)-(FRIENDS.has(a.o.name)?1:0))||(a.d-b.d))
    .forEach(({o,d})=>out.push({label:(FRIENDS.has(o.name)?"\u{1F49B} ":"\u{1F464} ")+o.name+" — "+fmtDist(d),go:()=>choosePlayer(o)}));
  /* live random events, nearest first */
  EVENTS.list
    .map(e=>({e,d:Math.hypot(e.x-player.x,e.z-player.z),
      label:e.type==="construction"?"\u{1F6A7} Road construction":(e.type==="accident"?"\u{1F6A8} Accident":(e.type==="fire"?"\u{1F525} House fire!":"\u{1F389} Festival ($50!)"))}))
    .filter(x=>!q||x.label.toLowerCase().includes(q))
    .sort((a,b)=>a.d-b.d)
    .forEach(({e,d,label})=>out.push({label:label+" — "+fmtDist(d),go:()=>chooseDest(label,e.x,e.z+12,true)}));
  /* fixed places */
  MAP_PLACES.filter(p=>!q||p[0].toLowerCase().includes(q)).forEach(p=>
    out.push({label:p[0],go:()=>chooseDest(p[0],p[1]+(p[3]?WORLD.ox:0),p[2]+(p[3]?WORLD.oz:0),true)}));
  /* nearest-X finders and world travel */
  /* generic nearest-spot search over a deterministic world grid */
  function nearestSpot(spotFn,cell,ox,oz,range){
    const ci=Math.round((player.x-ox)/cell),cj=Math.round((player.z-oz)/cell);
    let best=null;
    for(let i=ci-range;i<=ci+range;i++)for(let j=cj-range;j<=cj+range;j++){
      const sp=spotFn(i,j);
      if(!sp)continue;
      const d=Math.hypot(sp.x-player.x,sp.z-player.z);
      if(!best||d<best.d)best={sp,d};
    }
    return best;
  }
  function goNearest(label,best,dx,dz){
    if(best)chooseDest(label+" — "+fmtDist(best.d),best.sp.x+(dx||0),best.sp.z+(dz||0),true);
    else toast("None found nearby (too much water or mountains)!");
  }
  const specials=[
    ["\u{1F354} Nearest McDrive",()=>{
      switchWorld("earth");
      goNearest("\u{1F354} Nearest McDrive",nearestSpot(mcdSpot,MCSP,46,90,6),0,-16);
    }],
    ["\u{1F6D2} Nearest MEGA MART",()=>{
      switchWorld("earth");
      goNearest("\u{1F6D2} Nearest MEGA MART",nearestSpot(hugeShopSpot,HSP,750,390,3),0,58);
    }],
    ["\u{1F3F0} Nearest MEGA MANSION",()=>{
      switchWorld("earth");
      goNearest("\u{1F3F0} Nearest MEGA MANSION",nearestSpot(mansionSpot,MSP,1230,870,3),0,40);
    }],
    ["\u{1F3F4}‍☠️ Today's TREASURE hunt",()=>{
      switchWorld("earth");
      setupTreasure();
      $("mapModal").classList.remove("open");
      toast(TREASURE.found?"\u{1F3F4}‍☠️ You already found today's treasure — a new one appears tomorrow!":treasureHintText());
    }],
    ["\u{1F3CA} Nearest SWIMMING POOL park",()=>{
      switchWorld("earth");
      goNearest("\u{1F3CA} Nearest pool park (swim, waterslide & hot tub!)",nearestSpot(poolSpot,PPSP,1710,430,3),0,40);
    }],
    ["\u{1F3D7} Nearest building PLOT for sale",()=>{
      switchWorld("earth");
      goNearest("\u{1F3D7} Nearest building plot ($50K)",nearestSpot(plotSpot,PLSP,430,1150,4),0,16);
    }],
    ["\u{1F3D6} Nearest BEACH (\u{1F6A4} speedboats!)",()=>{
      switchWorld("earth");
      const best=nearestSpot(boatSpot,BOATSP,320,120,8);
      if(best)chooseDest("\u{1F3D6} The beach — "+fmtDist(best.d)+" (press F at the \u{1F6A4} speedboat to SAIL!)",best.sp.x+4,best.sp.z,true);
      else toast("\u{1F3D6} No beach nearby — head toward the big blue sea on the map!");
    }],
    ["\u{1F3AC} Nearest CINEMA",()=>{
      switchWorld("earth");
      goNearest("\u{1F3AC} Mega Cinema (movies & popcorn!)",nearestSpot((i,j)=>{const p=entPos(i,j);return{x:p.x-24,z:p.z};},ENSP,2000,4200,3),0,10);
    }],
    ["\u{1F579} Nearest ARCADE",()=>{
      switchWorld("earth");
      goNearest("\u{1F579} The Arcade (claw machine & high scores!)",nearestSpot(entPos,ENSP,2000,4200,3),0,10);
    }],
    ["\u{1F3B0} Nearest CASINO",()=>{
      switchWorld("earth");
      goNearest("\u{1F3B0} Lucky Casino (spin the MEGA WHEEL!)",nearestSpot((i,j)=>{const p=entPos(i,j);return{x:p.x+24,z:p.z};},ENSP,2000,4200,3),0,10);
    }],
    ["\u{1F3C1} Nearest RACE TRACK (grandstands!)",()=>{
      switchWorld("earth");
      goNearest("\u{1F3C1} Car City Speedway — press T at the flag to race!",nearestSpot(raceTrackPos,RTSP,4800,3400,2),38,6);
    }],
    ["\u{1F46E} Nearest POLICE STATION",()=>{
      switchWorld("earth");
      goNearest("\u{1F46E} Police station (pay fines, join the force!)",nearestSpot((i,j)=>{const p=civicPos(i,j);return{x:p.x-14,z:p.z};},CVSP2,3700,1300,3),0,9);
    }],
    ["\u{1F692} Nearest FIRE STATION",()=>{
      switchWorld("earth");
      goNearest("\u{1F692} Fire station (rescues & tow jobs!)",nearestSpot((i,j)=>{const p=civicPos(i,j);return{x:p.x+14,z:p.z};},CVSP2,3700,1300,3),0,9);
    }],
    ["\u{1F3DC} Nearest OFF-ROAD PARK",()=>{
      switchWorld("earth");
      goNearest("\u{1F3DC} Off-road park (dirt jumps & bumps!)",nearestSpot(offroadPos,ORSP,900,2600,3),0,-8);
    }],
    ["\u{1F3ED} Nearest INDUSTRIAL ZONE",()=>{
      switchWorld("earth");
      goNearest("\u{1F3ED} Car City Industrial",nearestSpot(induPos,INSP,5200,700,2),0,20);
    }],
    ["\u{1F570} Nearest TIME PORTAL (teleporter through TIME!)",()=>{
      switchWorld("earth");
      goNearest("\u{1F570} Time portal — drive through the ring!",nearestSpot(portalPos,TPSP,30,2430,2),0,-14);
    }],
    ["\u{1F30B} Nearest VOLCANO island",()=>{
      switchWorld("earth");
      const best=nearestSpot(volcanoSpot,VOLC,4200,7800,3);
      if(best)chooseDest("\u{1F30B} Volcano island — "+fmtDist(best.d)+" (mine LAVA dumplings!)",best.sp.x+140,best.sp.z,true);
      else toast("No volcanoes near here — look for the big red \u{1F30B} dots when you zoom out!");
    }],
    ["☁️ Nearest SKY RESTAURANT (in the clouds!)",()=>{
      switchWorld("earth");
      const best=nearestSpot(skyRestSpot,SRSP,2600,900,2);
      if(!best)return;
      showDest("☁️ Sky Restaurant — "+fmtDist(best.d)+", floating at 150 m",[
        {label:"⚡ Teleport UP into the clouds",value:"tp"},
        {label:"\u{1F9ED} Route — fly there with your \u{1F681} helicopter",value:"route"},
        {label:"❌ Cancel",value:"cancel"}
      ],v=>{
        if(v==="cancel")return;
        $("mapModal").classList.remove("open");
        if(v==="tp"){
          teleportTo(best.sp.x,best.sp.z);
          player.y=CLOUD_Y+0.1;player.grounded=true;player.vy=0;
          if(player.drive){player.drive.y=CLOUD_Y+0.1;player.drive.vy=0;player.drive.grounded=true;}
          toast("☁️✨ WHOOSH — welcome ABOVE the clouds! Don't step off the edge...");
        }else setRoute(best.sp.x,best.sp.z);
      });
    }],
    ["\u{1F3DD} Nearest FERRY ISLAND",()=>{
      switchWorld("earth");
      const best=nearestSpot(islandSpot,ISP,900,1500,3);
      if(best)chooseDest("\u{1F3DD} Ferry island — "+fmtDist(best.d)+" (or ride the ⛴ ferry!)",best.sp.x,best.sp.z+50,true);
      else toast("No islands near here — drive toward the big blue sea on the map!");
    }],
    ["\u{1F3DB} Nearest dumpling museum",()=>{
      switchWorld("earth");
      goNearest("\u{1F3DB} Nearest dumpling museum",nearestSpot(museumSpot,DMUS,520,260,6),0,10);
    }],
    ["\u{1F3B5} Nearest concert hall",()=>{
      switchWorld("earth");
      goNearest("\u{1F3B5} Nearest concert hall",nearestSpot(concertSpot,CHSP,1530,1050,3),0,18);
    }],
    ["\u{1F95F} Nearest dumpling buyer",()=>{
      switchWorld("earth");
      goNearest("\u{1F95F} Nearest dumpling buyer",nearestSpot(buyerSpot,DBSP,270,330,7),0,4);
    }],
    ["\u{1F9C8} Nearest butter buyer",()=>{
      switchWorld("earth");
      goNearest("\u{1F9C8} Nearest butter buyer",nearestSpot(butterSpot,DBSP,20,80,7),0,4);
    }],
    ["\u{1F3E1} Nearest FAMILY HOUSE for sale",()=>{
      switchWorld("earth");
      goNearest("\u{1F3E1} Nearest family house",nearestSpot(familyHouseSpot,FHSP,510,1710,5),9,18);
    }],
    ["\u{1F3EA} Nearest MARKETING PLOT",()=>{
      switchWorld("earth");
      goNearest("\u{1F3EA} Nearest marketing plot",nearestSpot(marketPlotSpot,MKSP,2070,630,4),0,56);
    }],
    ["\u{1F50E} SEARCH players' markets (by name!)",()=>{
      switchWorld("earth");
      openMarketSearch();
    }],
    ["⛽ Nearest gas station",()=>{
      switchWorld("earth");
      goNearest("⛽ Nearest gas station",nearestSpot(gasSpot,GSP,286,150,5),0,0);
    }],
    ["\u{1F573}️ Nearest cave",()=>{
      switchWorld("earth");
      goNearest("\u{1F573}️ Nearest cave",nearestSpot(caveSpot,CVSP,740,380,5),0,8);
    }],
    ["\u{1F68F} Nearest bus stop",()=>{
      switchWorld("earth");
      const lx0=Math.round((player.x-30)/120),lz0=Math.round((player.z-30)/120);
      let best=null;
      for(let i=lx0-4;i<=lx0+4;i++)for(let j=lz0-4;j<=lz0+4;j++){
        if(((i+j)%3+3)%3!==0)continue;
        const x=i*120+30+11,z=j*120+30+11;
        const d=Math.hypot(x-player.x,z-player.z);
        if(!best||d<best.d)best={sp:{x,z},d};
      }
      goNearest("\u{1F68F} Nearest bus stop",best);
    }],
    ["\u{1F686} Nearest train station",()=>{
      switchWorld("earth");
      const rk=railKNear(player.x),sj=Math.round((player.z-STZ)/SCELL);
      let best=null;
      for(let k=rk-1;k<=rk+1;k++)for(let j=sj-1;j<=sj+1;j++){
        const sz=j*SCELL+STZ,x=railC(k,sz)+7;
        const d=Math.hypot(x-player.x,sz-player.z);
        if(!best||d<best.d)best={sp:{x,z:sz},d};
      }
      goNearest("\u{1F686} Nearest train station",best);
    }],
    ["✈️ Nearest airport",()=>{
      switchWorld("earth");
      const a=nearestAirports(player.x,player.z,1)[0];
      chooseDest("✈️ Nearest airport — "+fmtDist(a.dist),a.term.x,a.term.z,true);
    }],
    ["\u{1F680} Nearest rocket station",()=>{
      const rp=nearestRocketPad(player.x,player.z);
      chooseDest("\u{1F680} Nearest rocket station — "+fmtDist(rp.d),rp.x+8,rp.z,false);
    }],
    ["\u{1F3A2} Stunt Park",()=>{
      const p=stuntPos(Math.round((player.x-1800)/3600),Math.round((player.z-600)/3600));
      chooseDest("\u{1F3A2} Nearest Stunt Park",p.x,p.z+20,true);
    }],
    ["\u{1F6E3}️ Mega Highway",()=>{
      if(Math.abs(player.x-MHX)<Math.abs(player.z-MHZ))chooseDest("\u{1F6E3}️ Mega Highway",MHX,player.z,true);
      else chooseDest("\u{1F6E3}️ Mega Highway",player.x,MHZ,true);
    }],
    ["\u{1F6F8} Nearest ALIEN spaceship (space!)",()=>{
      if(S.world==="earth"){toast("\u{1F6F8} The alien spaceships are on the Moon & the planets — take a \u{1F680} rocket up first!");return;}
      const ci=Math.round((player.x-3300)/UFOSP),cj=Math.round((player.z-6600)/UFOSP);
      let best=null;
      for(let i2=ci-1;i2<=ci+1;i2++)for(let j2=cj-1;j2<=cj+1;j2++){
        const s=ufoSpot(i2,j2);
        if(!s)continue;
        const d=Math.hypot(s.x-player.x,s.z-player.z);
        if(!best||d<best.d)best={s,d};
      }
      if(!best){toast("\u{1F6F8} No spaceship signals nearby...");return;}
      /* NO teleporting to the aliens — they jam it! Route only. */
      setRoute(best.s.x,best.s.z);
      $("mapModal").classList.remove("open");
      toast("\u{1F6F8} Signal locked: "+fmtDist(best.d)+" away! Teleporters are JAMMED near the aliens — fly the rocket yourself and follow the route!");
    }],
    ["\u{1FA90} SPACE TRAVEL — Moon & planets ($1 per km!)",()=>{
      const opts=[];
      for(const k in PLANETS){
        if(k===S.world)continue;
        const P=PLANETS[k];
        opts.push({label:P.emoji+" "+P.name.toUpperCase()+" — "+(P.km>0?"$"+fmtMoney(P.km)+" ("+fmtMoney(P.km)+" km away)":"FREE"),value:k});
      }
      opts.push({label:"❌ Stay here",value:"cancel"});
      showDest("\u{1FA90} Space travel — the further, the pricier (and the better the dumplings!)",opts,v=>{
        if(v==="cancel"||!PLANETS[v])return;
        const fare=PLANETS[v].km;
        if(fare>MONEY.v){toast("\u{1F4B0} The trip to "+PLANETS[v].name+" costs $"+fmtMoney(fare)+" — you only have $"+fmtMoney(MONEY.v)+". Sell dumplings & win races!");return;}
        if(fare>0){MONEY.v-=fare;updateMoneyUI();saveGame();}
        switchWorld(v);
        teleportTo(2400,2400);   // land right at a rocket station
        $("mapModal").classList.remove("open");
        toast(PLANETS[v].emoji+" You're on "+PLANETS[v].name+"!"+(fare>0?" Ticket: $"+fmtMoney(fare)+".":"")+" Try jumping — the gravity is different here!");
      });
    },"warn"],
    ["⛏️ MINECRAFT world (hearts, zombies & mining!)",()=>{
      $("mapModal").classList.remove("open");
      enterMc();
    },"warn"],
    ["\u{1F30D} Back to EARTH",()=>{
      switchWorld("earth");
      teleportTo(6,6);
      $("mapModal").classList.remove("open");
    },"warn"]
  ];
  specials.filter(s=>!q||s[0].toLowerCase().includes(q)).forEach(s=>out.push({label:s[0],go:s[1],cls:s[2]}));
  return out;
}
function renderMapList(){
  const list=$("mapList");list.innerHTML="";
  const es=mapEntries($("mapSearch").value);
  if(!es.length){
    const d=document.createElement("div");d.className="side-note";
    d.textContent="Nothing found — try a place name, a player name or coordinates like \"1200 -300\".";
    list.appendChild(d);return;
  }
  es.forEach(e=>{
    const b=document.createElement("button");b.className="btn"+(e.cls?" "+e.cls:"");
    b.innerHTML=e.label;b.onclick=e.go;
    list.appendChild(b);
  });
}
$("mapSearch").addEventListener("input",renderMapList);
/* ---------- destination chooser: teleport instantly, or set a route ---------- */
function chooseDest(label,x,z,toEarth){
  showDest(label,[
    {label:"⚡ Teleport (instant)",value:"tp"},
    {label:"\u{1F9ED} Route — follow the blue line on the minimap",value:"route"},
    {label:"❌ Cancel",value:"cancel"}
  ],v=>{
    if(v==="cancel")return;
    if(toEarth)switchWorld("earth");
    if(v==="tp")teleportTo(x,z);
    else setRoute(x,z);
    $("mapModal").classList.remove("open");
  });
}
/* ---------- navigation: a route along the grid roads ---------- */
const NAV={on:false,x:0,z:0,path:[],follow:null,followName:""};
function navPathTo(x,z){
  const snap=v=>Math.round((v-30)/120)*120+30;
  NAV.path=[{x:player.x,z:snap(player.z)},{x:snap(x),z:snap(player.z)},{x:snap(x),z},{x,z}];
  NAV.x=x;NAV.z=z;
}
function setRoute(x,z){
  NAV.follow=null;
  navPathTo(x,z);
  NAV.on=true;
  toast("\u{1F9ED} Route set — follow the blue line on the minimap (bottom left)!");
}
function followPlayer(o){
  navPathTo(o.x,o.z);
  NAV.follow=o.k;NAV.followName=o.name;NAV.on=true;
  toast("\u{1F9ED} Following "+o.name+" — the route updates as they move!");
}
function navStop(silent){
  NAV.on=false;NAV.follow=null;NAV.path=[];
  $("navDist").style.display="none";
  if(!silent)toast("\u{1F9ED} Navigation stopped.");
}
function updateNav(){
  const el=$("navDist");
  if(!NAV.on){el.style.display="none";return;}
  /* following a player: retarget the route whenever they move */
  if(NAV.follow){
    const o=MP.others.get(NAV.follow);
    if(!o){toast("\u{1F464} "+NAV.followName+" left the world — navigation stopped.");navStop(true);return;}
    if(Math.hypot(o.x-NAV.x,o.z-NAV.z)>20)navPathTo(o.x,o.z);
  }
  while(NAV.path.length>1&&Math.hypot(player.x-NAV.path[0].x,player.z-NAV.path[0].z)<30)NAV.path.shift();
  if(Math.hypot(player.x-NAV.x,player.z-NAV.z)<30){
    toast(NAV.follow?"\u{1F3C1} You reached "+NAV.followName+"!":"\u{1F3C1} You arrived at your destination!");
    navStop(true);
    return;
  }
  /* how far is it, following the blue route line */
  let dist=Math.hypot(NAV.path[0].x-player.x,NAV.path[0].z-player.z);
  for(let i=0;i<NAV.path.length-1;i++)
    dist+=Math.hypot(NAV.path[i+1].x-NAV.path[i].x,NAV.path[i+1].z-NAV.path[i].z);
  el.style.display="flex";
  $("navTxt").textContent=(NAV.follow?"\u{1F464} "+NAV.followName+" · ":"\u{1F9ED} ")+(dist<1000?Math.round(dist)+" m":(dist/1000).toFixed(1)+" km")+" to go";
}
$("navStopBtn").onclick=()=>navStop();
/* ---------- minimap: a small round map bottom-left with a heading arrow ---------- */
const miniCv=$("miniCv"),miniBg=document.createElement("canvas");
miniBg.width=miniBg.height=212;   // bigger than the circle so rotating never shows empty corners
const MINI_SC=0.5;   // 1 px = 2 m, so you see ~150 m around you
let _miniT=0,_miniCx=1e9,_miniCz=1e9;
function drawMiniBg(){
  _miniCx=player.x;_miniCz=player.z;
  const c=miniBg.getContext("2d"),step=5;
  for(let py=0;py<212;py+=step)for(let px=0;px<212;px+=step){
    const wx=(px-106)/MINI_SC+_miniCx,wz=-((py-106)/MINI_SC)+_miniCz;
    c.fillStyle=mapColor(wx,wz);c.fillRect(px,py,step,step);
  }
}
function playerYaw(){
  if(player.drive)return player.drive.yaw;
  if(player.inBus)return player.bus.yaw;
  if(player.inPlane)return player.planeRef.yaw;
  if(player.inTrain)return player.train.g.rotation.y;
  return player.yaw;
}
function updateMini(dt){
  _miniT-=dt;
  /* the background repaints only every half second (or after a big jump) */
  if(_miniT<=0||Math.hypot(player.x-_miniCx,player.z-_miniCz)>45){_miniT=0.55;drawMiniBg();}
  const yaw=playerYaw();
  const c=miniCv.getContext("2d");
  c.clearRect(0,0,150,150);
  c.save();
  c.beginPath();c.arc(75,75,75,0,7);c.clip();
  /* heading-up: the MAP rotates as you turn, your arrow always points up */
  c.translate(75,75);c.rotate(-yaw);
  c.drawImage(miniBg,-(player.x-_miniCx)*MINI_SC-106,(player.z-_miniCz)*MINI_SC-106);
  const w2r=(wx,wz)=>[(wx-player.x)*MINI_SC,-(wz-player.z)*MINI_SC];
  if(NAV.on){
    /* the blue route line */
    c.strokeStyle="#2e8bff";c.lineWidth=4;c.lineCap="round";c.lineJoin="round";c.globalAlpha=0.9;
    c.beginPath();c.moveTo(0,0);
    for(const p of NAV.path){const m=w2r(p.x,p.z);c.lineTo(m[0],m[1]);}
    c.stroke();c.globalAlpha=1;
    /* destination dot, pinned to the rim while it's far away */
    let[dx,dy]=w2r(NAV.x,NAV.z);
    const vd=Math.hypot(dx,dy);
    if(vd>66){dx=dx/vd*66;dy=dy/vd*66;}
    c.fillStyle="#2e8bff";c.beginPath();c.arc(dx,dy,5,0,7);c.fill();
    c.strokeStyle="#fff";c.lineWidth=1.5;c.stroke();
  }
  if(RACE.on){
    /* the next race checkpoint, pinned to the rim while it's far */
    let[dx,dy]=w2r(RACE.cp[RACE.i].x,RACE.cp[RACE.i].z);
    const vd=Math.hypot(dx,dy);
    if(vd>66){dx=dx/vd*66;dy=dy/vd*66;}
    c.fillStyle="#3fd0ff";c.beginPath();c.arc(dx,dy,5,0,7);c.fill();
    c.strokeStyle="#fff";c.lineWidth=1.5;c.stroke();
  }
  c.rotate(yaw);   // back to screen space: the arrow stays fixed, pointing up
  c.fillStyle="#ffb02e";
  c.beginPath();c.moveTo(0,-9);c.lineTo(6.5,7);c.lineTo(0,3.5);c.lineTo(-6.5,7);c.closePath();
  c.fill();c.strokeStyle="#fff";c.lineWidth=1.6;c.stroke();
  c.restore();
}
/* ---------- the compass: shows where north, east, south & west are ---------- */
const COMPASS={on:localStorage.getItem("vc4compass")==="1"};
$("bCompass").onclick=()=>{
  COMPASS.on=!COMPASS.on;
  try{localStorage.setItem("vc4compass",COMPASS.on?"1":"0");}catch(e){}
  $("bCompass").classList.toggle("on",COMPASS.on);
  toast(COMPASS.on?"\u{1F9ED} Compass ON — the red needle always points NORTH!":"\u{1F9ED} Compass OFF");
};
$("bCompass").classList.toggle("on",COMPASS.on);
function updateCompass(){
  const el=$("compass");
  if(!COMPASS.on||S.mode!=="game"){el.style.display="none";return;}
  el.style.display="block";
  const yaw=playerYaw();   // your heading: 0 = north (+z), east = +x
  const cv=$("compassCv"),c=cv.getContext("2d"),R=66;
  c.clearRect(0,0,132,132);
  /* dial */
  c.beginPath();c.arc(R,R,60,0,7);
  c.fillStyle="rgba(13,17,26,.85)";c.fill();
  c.lineWidth=3;c.strokeStyle="#2a3550";c.stroke();
  /* tick marks every 30 degrees, rotating with your heading */
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6-yaw;
    c.strokeStyle=i%3===0?"#4a5670":"#2a3550";
    c.lineWidth=i%3===0?2.5:1.5;
    c.beginPath();
    c.moveTo(R+Math.sin(a)*52,R-Math.cos(a)*52);
    c.lineTo(R+Math.sin(a)*58,R-Math.cos(a)*58);
    c.stroke();
  }
  /* N / E / S / W rotate so the direction you FACE is at the top */
  const dirs=[["N",0,"#ff5d5d"],["E",Math.PI/2,"#e8edf7"],["S",Math.PI,"#e8edf7"],["W",Math.PI*1.5,"#e8edf7"]];
  c.font="bold 17px Segoe UI";c.textAlign="center";c.textBaseline="middle";
  for(const[t,d,col]of dirs){
    const a=d-yaw;
    c.fillStyle=col;
    c.fillText(t,R+Math.sin(a)*40,R-Math.cos(a)*40);
  }
  /* the needle: red half always points NORTH, white half south */
  const na=-yaw;
  c.beginPath();
  c.moveTo(R+Math.sin(na)*30,R-Math.cos(na)*30);
  c.lineTo(R+Math.sin(na+2.6)*7,R-Math.cos(na+2.6)*7);
  c.lineTo(R+Math.sin(na-2.6)*7,R-Math.cos(na-2.6)*7);
  c.closePath();c.fillStyle="#ff5d5d";c.fill();
  c.beginPath();
  c.moveTo(R-Math.sin(na)*30,R+Math.cos(na)*30);
  c.lineTo(R+Math.sin(na+2.6)*7,R-Math.cos(na+2.6)*7);
  c.lineTo(R+Math.sin(na-2.6)*7,R-Math.cos(na-2.6)*7);
  c.closePath();c.fillStyle="#e8edf7";c.fill();
  c.beginPath();c.arc(R,R,3.4,0,7);c.fillStyle="#ffb02e";c.fill();
  /* your own arrow at the top: you always look "up" */
  c.fillStyle="#3fd0ff";
  c.beginPath();c.moveTo(R,4);c.lineTo(R-5,13);c.lineTo(R+5,13);c.closePath();c.fill();
}
function teleportTo(x,z){
  endRide(true);
  /* the aliens JAM teleporters near their spaceships — you must travel there yourself */
  if(S.world!=="earth"&&S.world!=="mc"){
    const ci=Math.round((x-3300)/UFOSP),cj=Math.round((z-6600)/UFOSP);
    const s=ufoSpot(ci,cj);
    if(s&&Math.hypot(x-s.x,z-s.z)<400){
      setRoute(s.x,s.z);
      toast("\u{1F6F8}\u{26A1} ZZZT! The aliens JAM your teleporter — follow the route and travel there yourself!");
      return;
    }
  }
  SIT.on=false;
  if(player.boat){player.boat=null;player.onFoot=true;player.mesh.visible=true;}
  player.inTrain=player.inPlane=player.inBus=false;player.train=null;player.planeRef=null;player.bus=null;
  player.x=x;player.z=z;player.vy=0;
  if(player.drive){player.drive.x=x;player.drive.z=z;player.drive.speed=0;player.drive.vy=0;player.drive.grounded=true;}
  updateChunks(x,z,true);updateLandmarks(x,z);
  toast("Teleported!");
}
/* ---------- worlds: earth <-> moon ---------- */
function switchWorld(w){
  if(S.world===w)return;
  S.world=w;
  SIT.on=false;endRide(true);
  /* leaving mid McDrive-order? the order is off — normal driving comes back */
  MCD.phase="idle";MCD.target=null;MCD.cd=8;
  if(player.boat){player.boat=null;player.onFoot=true;player.mesh.visible=true;}
  if(player.inHeli){player.inHeli=false;player.onFoot=true;}
  if(HELI.mesh)HELI.mesh.visible=w==="earth"&&HELI.active;
  /* the whole streamed world is rebuilt for the new planet */
  for(const[k,g]of chunks){if(g!=="pending")disposeChunk(g);}
  chunks.clear();buildQueue.length=0;
  for(const[k,g]of landmarks){scene.remove(g);disposeGroup(g);}
  landmarks.clear();
  for(const p of peds)scene.remove(p.m);peds.length=0;
  const earth=w==="earth";
  earthStatic.visible=earth;water.visible=earth;
  trains.forEach(t=>t.g.visible=earth);
  planes.forEach(p=>p.g.visible=earth);
  buses.forEach(b=>b.g.visible=earth);
  traffic.forEach(c=>{c.mesh.visible=earth&&S.traffic&&!c.controlled;if(earth)respawnCar(c);});
  clouds.forEach(c=>c.visible=earth);
  player.inTrain=player.inPlane=player.inBus=false;player.train=null;player.planeRef=null;player.bus=null;
  if(w!=="mc")mcClearBuild();     // placed blocks stay only inside Minecraft
  const wheels=earth||w==="mc";   // your own car works on Earth AND in Minecraft!
  if(!wheels){
    /* your car stays behind — use the space buggies at rocket stations */
    player.drive=null;
    if(myVehicle)myVehicle.mesh.visible=false;
    if(!player.inRocket)player.onFoot=true;
  }else{
    if(player.drive&&player.drive.moonCar)player.drive=null;   // buggies stay on the Moon
    if(myVehicle)myVehicle.mesh.visible=true;
    if(!player.inRocket&&!player.drive)player.onFoot=true;
  }
  setAstro(!earth&&w!=="mc");   // astronaut outfit in space (not in Minecraft!)
  heartsShow(w==="mc");         // hearts while you're in the Minecraft world
  player.mesh.visible=player.onFoot&&!player.inRocket;
  headLight.intensity=0;
  updateChunks(player.x,player.z,true);updateLandmarks(player.x,player.z);
}
/* ---------- the rocket ---------- */
function updateRocket(dt){
  updateSmoke(dt);
  const r=rocket;
  /* if the player bailed out mid-flight (spawn button etc), park the rocket */
  if((r.state==="launch"||r.state==="descend")&&!player.inRocket){
    r.state="parked";r.wait=10;r.vy=0;r.y=terrainH(r.pad.x,r.pad.z)+0.6;
  }
  if(r.state==="piloted"&&!player.inRocket){
    r.state="parked";r.wait=10;r.vy=0;r.hs=0;r.pad={x:r.x,z:r.z};r.y=terrainH(r.x,r.z)+0.6;
  }
  const flame=r.g.userData.flame,flame2=r.g.userData.flame2;
  let fire=false,rumble=0;
  if(r.state==="inbound"){
    const dx=r.pad.x-r.x,dz=r.pad.z-r.z,d=Math.hypot(dx,dz);
    const padY=terrainH(r.pad.x,r.pad.z)+0.6;
    fire=true;rumble=0.05;
    if(d>4){
      const sp=Math.min(85,18+d*0.45);
      r.x+=dx/d*sp*dt;r.z+=dz/d*sp*dt;
      r.y+=((padY+110)-r.y)*Math.min(1,0.6*dt);
      r.hs=sp;
    }else{
      r.hs=0;
      r.y-=Math.max(5,(r.y-padY)*0.9)*dt;
      if(Math.random()<0.6)puffSmoke(r.x+(Math.random()-0.5)*7,padY+0.5,r.z+(Math.random()-0.5)*7);
      if(r.y<=padY){r.y=padY;r.state="landed";toast("\u{1F680} The rocket has landed — press F to get in!");}
    }
  }else if(r.state==="launch"){
    r.t+=dt;fire=true;
    rumble=Math.min(0.16,r.t*0.1);
    const padY=terrainH(r.pad.x,r.pad.z)+0.6;
    for(let i=0;i<3;i++)puffSmoke(r.x+(Math.random()-0.5)*8,Math.max(padY,r.y)+0.4,r.z+(Math.random()-0.5)*8,true);
    if(r.t>2){                                   // 2 s of smoke & fire, then liftoff
      const acc=S.admin?95:26;                   // admin mode = way faster (no steering either way)
      const maxUp=limitFor("rocket")/3.6;        // admin panel: 🚀 target sets this
      r.vy=Math.min(maxUp,r.vy+acc*dt);r.y+=r.vy*dt;
    }
    if(r.y>1000){
      const to=r.dest||(S.world==="earth"?"moon":"earth");
      r.dest=null;
      switchWorld(to);
      r.vy=-45;r.y=1000;r.state="descend";
      toast(to==="earth"?"\u{1F30D} Re-entering Earth...":"\u{1F30C} Space! Coming in over "+(PLANETS[to]?PLANETS[to].name:"the Moon")+"...");
    }
  }else if(r.state==="descend"){
    fire=true;rumble=0.09;
    const padY=terrainH(r.pad.x,r.pad.z)+0.6;
    if(r.y-padY<160)r.vy+=(-7-r.vy)*Math.min(1,2.2*dt);   // retro-burn braking
    else r.vy=Math.max(r.vy-12*dt,-95);
    r.y+=r.vy*dt;
    if(r.y-padY<40&&Math.random()<0.6)puffSmoke(r.x+(Math.random()-0.5)*7,padY+0.5,r.z+(Math.random()-0.5)*7,true);
    if(r.y<=padY){
      r.y=padY;r.vy=0;r.state="arrived";
      toast(S.world==="earth"?"\u{1F30D} Back on Earth! Press F to step out."
        :(curPlanet()||{}).emoji+" Welcome to "+((curPlanet()||{}).name||"the Moon")+"! Press F to step out.");
    }
  }else if(r.state==="piloted"){
    /* you fly it: W/S = speed (up to 2000 km/h), A/D = turn, Space up, Shift down */
    const maxS=2000/3.6;
    const thr=thrInput(),st=steerInput();
    r.yaw=r.yaw||0;r.hs=r.hs||0;
    if(thr>0)r.hs=Math.min(maxS,r.hs+130*thr*dt);
    else if(thr<0)r.hs=Math.max(0,r.hs+180*thr*dt);
    else r.hs*=Math.pow(0.995,dt*60);
    r.yaw+=st*1.6/(1+r.hs/140)*dt;
    let climb=0;
    if(spaceInput())climb=65;else if(keys.shift)climb=-65;
    r.y+=climb*dt;
    r.x+=Math.sin(r.yaw)*r.hs*dt;r.z+=Math.cos(r.yaw)*r.hs*dt;
    const gh=terrainH(r.x,r.z)+0.6;
    if(r.y<gh)r.y=gh;
    fire=r.hs>2||climb!==0;
    rumble=Math.min(0.15,0.03+r.hs/4500);
  }else if(r.state==="parked"){
    r.wait-=dt;
    if(r.wait<=0&&!player.inRocket){r.state="idle";r.g.visible=false;}
  }
  flame.visible=flame2.visible=fire;
  if(fire){const s=0.8+Math.random()*0.5;flame.scale.set(1,s,1);flame2.scale.set(1,s,1);}
  setRocketRumble(player.inRocket?rumble:rumble*0.3);
  r.g.position.set(r.x,r.y,r.z);
  r.g.rotation.set(0,r.yaw||0,0);
  if(r.state==="piloted")r.g.rotateX(Math.min(0.4,(r.hs||0)/556*0.4));   // lean into the flight
  if(player.inRocket){player.x=r.x;player.z=r.z;player.y=r.y+4;}
}
/* hint */
function updateHint(){
  let txt="",showT=false,showF=false;
  if(player.inRocket){
    txt=rocket.state==="arrived"?"Landed — press F to step out"
      :rocket.state==="piloted"?"\u{1F680} Flying! W/S speed, A/D turn, Space up, Shift down — F to land"
      :"\u{1F680} Rocket flight — hold on tight!";
    showF=rocket.state==="arrived"||rocket.state==="piloted";
  }
  else if(player.inTrain){txt=S.admin?"Driving the train (admin) — F to get off":"Riding the train — F to get off";showF=true;}
  else if(player.inPlane){const p=player.planeRef;txt=p.state==="piloted"?"Flying (admin controls)":"On the plane";showF=true;}
  else if(player.inBus){txt="On the bus — F to get off when stopped";showF=true;}
  else if(player.inHeli){
    txt="\u{1F681} Flying! W/S speed · A/D turn · SPACE up · SHIFT down — F to land";showF=true;
  }
  else if(RIDE.on){
    const o=MP.others.get(RIDE.key);
    txt="\u{1F698} Riding along with "+(o?o.name:"a friend")+" — press F to hop out";showF=true;
  }
  else{
    if(CAVE.in){txt=BOSS.on?"\u{1F5FF}⚔️ CAVE BOSS ("+BOSS.hp+" / "+BOSS.max+") — get close and press T to SWING!":"\u{1F573}️ In the cave — grab the $1,000 crystals · press T for the cave menu (boss fight!)";showT=true;}
    else if(SIT.on){txt="Sitting \u{1FA91} — press T or walk to stand up";showT=true;}
    else if(MEDIT.on){txt="\u{1F6E0} EDITING your mansion — click the floor/lawn to place items · R = rotate · T = done";showT=true;}
    else if(player.onFoot&&S.world==="earth"){
      const dk=nearFurn(hotelDesks,3.2),bd=nearFurn(hotelBeds,2.8),ch=nearFurn(chairs,2.2),ex=nearFurn(roomExits,2.2),pn=nearFurn(pianos,4.5);
      if(dk){txt=dk.mansion?(rentedAt(dk.id)?"\u{1F3F0} Your MEGA MANSION — welcome home! (T inside = edit)":"\u{1F3F0} MEGA MANSION — press T: BUY $"+fmtMoney(MANSION_PRICE)+" or RENT $"+fmtMoney(MANSION_RENT)+"/day")
        :dk.house?(rentedAt(dk.id)?"\u{1F3E1} Your FAMILY HOUSE — welcome home! (T inside = edit)":"\u{1F3E1} FAMILY HOUSE with garden — press T: BUY $"+fmtMoney(HOUSE_PRICE)+" or RENT $"+fmtMoney(HOUSE_RENT)+"/day")
        :(rentedAt(dk.id)?"Reception — press T to go up to your room":"Reception — press T: BUY $"+fmtMoney(APT_PRICE)+" or RENT $"+fmtMoney(APT_RENT)+"/day");showT=true;}
      else if(ex){txt="EXIT — press T to go back to the street";showT=true;}
      else if(ORDER.active&&ORDER.stage==="waiting"&&Math.hypot(player.x-ORDER.x,player.z-ORDER.z)<6){txt="\u{1F6F5} Your "+ORDER.label+" — press T to pay $"+fmtMoney(ORDER.cost)+" & take it!";showT=true;}
      else if(nearTv()){txt="\u{1F4FA} The TV — press T to pick a channel (Minecraft, news, fireplace...)";showT=true;}
      else if(myRoomHere()){txt="\u{1F6F5} Your room — press T to ORDER FOOD to your door!";showT=true;}
      else if(nearPlotSign()&&!rentedAt(nearPlotSign().id)){txt="\u{1F3D7} Empty plot FOR SALE — press T to buy it ($50K) and BUILD YOUR OWN HOUSE!";showT=true;}
      else if(ROD.owned&&FISHING.state==="bite"){txt="❗\u{1F3A3} BITE!! PRESS T NOW!!";showT=true;}
      else if(ROD.owned&&FISHING.state==="wait"){txt="\u{1F3A3} Line's in the water... wait for the ❗";}
      else if(ROD.owned&&FISHING.state==="idle"&&atWaterEdge()){txt="\u{1F3A3} Water ahead — press T to cast your line!";showT=true;}
      else if(nearPoolSlide()){txt="\u{1F6DD} The WATERSLIDE — press T to ride it down!";showT=true;}
      else if(SWIM.cur){txt=SWIM.cur.hw<=4.5?"♨️ Bubbling away in the hot tub...":"\u{1F3CA} Swimming! Paddle to the edge to climb out.";}
      else if(pn&&pn.hat&&(pn.hatMoney||0)>0&&Math.hypot(player.x-pn.hat.x,player.z-pn.hat.z)<2.4){txt="\u{1F3A9} The hat is full — press T to collect $"+pn.hatMoney+"!";showT=true;}
      else if(pn){txt=pn.crowded?"\u{1F3B9} Your concert is ON — press T at the piano, then \u{1F51A} End the concert":"\u{1F3B9} Piano — press T to play it (keyboard & MIDI!)";showT=true;}
      else if(bd){
        if(!rentedAt(bd.id))txt="A room's bed — rent it at the reception first";
        else if(!isNight())txt="Your bed — come back at night to sleep";
        else{txt="Your bed — press T to sleep (skips the night)";showT=true;}
      }
      else if(ch){txt="Chair — press T to sit down";showT=true;}
      else{
        const sh=nearShop();
        if(sh){txt=(sh.huge?"\u{1F6D2} MEGA MART":"\u{1F6D2} Shop")+" — press T to buy food";showT=true;}
        else if(nearMuseum()){txt="\u{1F3DB} DUMPLING MUSEUM — press T to see (and buy!) the rainbow glitter dumpling";showT=true;}
        else{
          const by=nearBuyer();
          if(by){txt="\u{1F95F} Dumpling buyer — press T to sell your dumplings";showT=true;}
          else if(nearButterBuyer()){txt="\u{1F9C8} Butter buyer — press T to sell your butter squishies";showT=true;}
          else{
            const mk=nearMarketPlot();
            if(mk){
              txt=rentedAt(mk.id)?"\u{1F3EA} YOUR market — press T to stock tables, name it & more"
                :MKTR.has(mk.id)?"\u{1F3EA} "+((MKTR.get(mk.id).d.name&&String(MKTR.get(mk.id).d.name).trim())||MKTR.get(mk.id).n+"'s market")+" — press T to shop!"
                :"\u{1F3EA} MARKETING PLOT — press T: BUY $"+fmtMoney(MKT_PRICE)+" or RENT $"+fmtMoney(MKT_RENT)+"/day (or shop if it's taken)";
              showT=true;
            }else{
              const mn=nearMansion();
              if(mn&&rentedAt(mn.id)){txt="\u{1F6E0} Your mansion — press T to EDIT it (furniture + garden shop!)";showT=true;}
            }
          }
        }
      }
    }
    if(!txt&&S.world==="earth"&&!CAVE.in){
      const cvE=nearCaveEntrance();
      if(cvE){txt="\u{1F573}️ Cave entrance — press T to go inside!";showT=true;}
      else if(nearGasSt()&&fuelVehicle()){
        txt=FUEL.km>=FUEL.cap-1?"⛽ Gas station — your tank is full":"⛽ Gas station — press T to fill up ("+Math.round(FUEL.km)+" / "+FUEL.cap+" km)";
        showT=FUEL.km<FUEL.cap-1;
      }
    }
    const rp=nearestRocketPad(player.x,player.z);
    if(!txt&&rp.d<46&&(rocket.state==="idle"||rocket.state==="parked")){txt="Rocket station — press T to call a rocket";showT=true;}
    if(rocket.state==="landed"&&Math.hypot(player.x-rocket.x,player.z-rocket.z)<16){txt="Rocket ready — press F to get in!";showF=true;}
    /* live distance of whatever you called */
    if(!txt&&rocket.state==="inbound")
      txt="\u{1F680} Rocket incoming — "+Math.round(Math.hypot(rocket.x-player.x,rocket.z-player.z))+" m away";
    if(!txt&&S.world==="earth"){
      for(const t of trains)if(t.state==="arriving"){
        txt="\u{1F686} Train incoming — "+Math.round(Math.hypot(railC(t.k,t.z)-player.x,t.z-player.z))+" m away";break;}
      if(!txt)for(const b of buses)if(b.state==="called"&&b.stop){
        const bp=busPos(b);
        txt="\u{1F68C} Bus incoming — "+Math.round(Math.hypot(bp.x-player.x,bp.z-player.z))+" m away";break;}
      if(!txt)for(const p of planes)if((p.state==="autofly"||p.state==="approach"||p.state==="touchdown"||p.state==="taxi")&&p.dest&&!player.inPlane){
        txt="✈️ Plane incoming — "+Math.round(Math.hypot(p.x-player.x,p.z-player.z))+" m away";break;}
    }
    if(S.world==="earth"){
    if(!txt&&nearRaceFlag()){txt=RACE.on?"Press T to cancel the race":"\u{1F3C1} RACE START — press T to race!";showT=true;}
    const st=nearStationInfo(),bs=nearBusStop(),ap=nearTerminal();
    if(!txt){
    if(st){txt="Train station — press T to call a train";showT=true;}
    else if(bs){txt="Bus stop — press T to call a bus";showT=true;}
    else if(ap){txt="Airport terminal — press T to call a plane";showT=true;}
    }
    for(const t of trains)if(t.state==="waiting"&&Math.hypot(player.x-railC(t.k,t.z),player.z-t.z)<16){txt="Train waiting — press F to board!";showF=true;}
    for(const p of planes)if(p.state==="parked"&&Math.hypot(player.x-p.x,player.z-p.z)<16){txt="Plane parked — press F to board!";showF=true;}
    for(const b of buses){const bp=busPos(b);if(b.state==="waiting"&&Math.hypot(player.x-bp.x,player.z-bp.z)<12){txt="Bus waiting — press F to board!";showF=true;}}
    if(!txt&&player.onFoot&&myVehicle&&Math.hypot(player.x-myVehicle.x,player.z-myVehicle.z)<5){txt="Press F to get in your "+(S.selected?S.selected.name:"vehicle");showF=true;}
    if(!txt&&player.onFoot){
      const rr=nearRideableCar();
      if(rr){txt="\u{1F698} "+rr.o.name+"'s "+(rr.o.kind==="moto"?"motorcycle":"car")+" — press F to hop in the PASSENGER seat!";showF=true;}
    }
    if(!txt&&player.onFoot&&HELI.active&&Math.hypot(player.x-HELI.x,player.z-HELI.z)<7){txt="\u{1F681} Your helicopter — press F to FLY!";showF=true;}
    if(!txt&&player.onFoot&&S.world==="earth"&&nearBoat()){txt="\u{1F6A4} A SPEEDBOAT — press F to sail the seas!";showF=true;}
    if(!txt&&myVehicle&&myVehicle.camper&&Math.abs(myVehicle.speed||0)<1.5&&Math.hypot(player.x-myVehicle.x,player.z-myVehicle.z)<8){txt="\u{1F690} Your CAMPER — press T to sleep, cook & chill!";showT=true;}
    if(!txt&&player.onFoot&&nearSkyRest()){txt="☁️ SKY RESTAURANT — press T for a meal above the clouds!";showT=true;}
    if(!txt&&player.onFoot&&nearVolcanoCrater()){txt=volcErupting()?"\u{1F30B}\u{1F4A5} ERUPTION — GET AWAY!!":"\u{1F30B} The crater — press T to mine a LAVA dumpling!";showT=!volcErupting();}
    }
    if(!txt&&S.world!=="earth"){
      const uf=nearUfo();
      if(uf)
        txt=uf.angry>0?"\u{1F47D} THE ALIENS ARE ANGRY — RUN!!":"\u{1F6F8} An ALIEN SPACESHIP — press T to rob it ($10K + a "+(S.world==="moon"?"ALIEN":curPlanet().name.toUpperCase())+" dumpling)... if you dare!";
      if(uf)showT=uf.angry<=0;
    }
    if(!txt&&S.world!=="earth"&&S.world!=="mc"&&player.onFoot){
      for(const mc of moonCars){
        if(!offScene(mc.g)&&Math.hypot(player.x-mc.x,player.z-mc.z)<6){txt=curPlanet().emoji+" "+curPlanet().name+" buggy — press F to drive!";showF=true;break;}
      }
    }
    /* ⛏️ Minecraft world hints */
    if(!txt&&S.world==="mc"){
      const mob=player.onFoot?nearMcMob(3.4):null;
      const t=mob?null:nearMcThing();
      if(mob)txt=mob.kind==="pig"?"\u{1F437} A PIG — press T to chop it (porkchops!)":mob.kind==="creeper"?"\u{1F7E9}\u{26A0} A CREEPER — press T to hit it... or RUN!":"\u{1F9DF}⚔️ A ZOMBIE — press T to FIGHT"+(MCTOOLS.sword?" (\u{1F5E1} one hit!)":" (2 hits)")+"!";
      else if(t)txt=t.kind==="tree"?"\u{1FAB5} A TREE — press T to CHOP it!":MC_EMOJI[t.kind]+" A "+t.kind.toUpperCase()+" block — press T to MINE it!"+(MCTOOLS.pick?" (⛏ x2!)":"");
      else if(Math.hypot(player.x-MCTRADER.x,player.z-MCTRADER.z)<8)txt="\u{1F9D1}‍\u{1F33E} TRADER STEVE — press T to sell for +25%!";
      else txt="⛏️ MINECRAFT — chop, mine, craft & build · press T for your \u{1F392} backpack ($"+fmtMoney(mcTotal())+" inside)";
      showT=true;
    }
    /* ⛪ church & the Saturday car meet */
    if(!txt&&S.world==="earth"&&meetDist()<44){
      if(meetActive())txt="\u{1F3C6} SATURDAY CAR MEET — park your coolest car! Walk up to a friend's car & press T to vote \u{1F525}";
      else if(weekday()==="Sunday")txt="⛪ CITY CHURCH — shhh... the organ is playing! (Car meet every Saturday!)";
      else txt="⛪ CITY CHURCH — today is "+weekday().toUpperCase()+" · full organ ALL Sunday (step inside to hear the organist practice!) · \u{1F3C6} CAR MEET Saturday";
      showT=meetActive();
    }
    /* the new city places */
    if(!txt&&S.world==="earth"){
      const ent=nearestOf(ENT,11);
      if(ent){txt=(ent.kind==="cinema"?"\u{1F3AC} MEGA CINEMA — press T for a movie & popcorn!":ent.kind==="arcade"?"\u{1F579} ARCADE — press T to play & win!":"\u{1F3B0} LUCKY CASINO — press T to spin the MEGA WHEEL!");showT=true;}
      else{
        const civ=nearestOf(CIVIC,11);
        if(civ){txt=civ.kind==="police"?"\u{1F46E} POLICE STATION — press T (pay fines, join the force!)":"\u{1F692} FIRE STATION — press T (rescues & tow jobs!)";showT=true;}
        else if(XMAS.spot&&Math.hypot(player.x-XMAS.spot.x,player.z-XMAS.spot.z)<7){txt="\u{1F384} THE CHRISTMAS TREE — press T for today's PRESENT!";showT=true;}
      }
    }
    if(!txt&&S.world!=="earth"&&S.world!=="mc"&&nearestOf(SPST,13)){txt="\u{1F6F0} SPACE STATION — press T to visit!";showT=true;}
    /* the ferry */
    if(!txt&&S.world==="earth"){
      const fy=nearFerry();
      if(fy){
        const onBoard=Math.abs(player.x-fy.x)<fy.fd.hw+0.5&&Math.abs(player.z-fy.z)<fy.fd.hd+0.5&&player.y>0.4;
        if(onBoard&&!fy.docked)txt="⛴ Enjoy the crossing — the sea breeze is lovely!";
        else if(fy.docked)txt="⛴ The ferry is DOCKED — walk or drive onto the deck before it leaves!";
        else txt="⛴ The ferry is sailing — it docks here again in a moment.";
      }
    }
    /* island hints */
    if(!txt&&S.world==="earth"&&player.onFoot){
      if(nearIslandThing("shop",5)){txt="\u{1F3D6} Beach shop — press T for coconut drinks & PEARL dumplings!";showT=true;}
      else if(nearIslandThing("digX",3.5)){txt="⛏️ X marks the spot — press T to DIG!";showT=true;}
    }
    /* treasure hunt: hot & cold */
    if(!txt&&S.world==="earth"&&!TREASURE.found&&TREASURE.key){
      const td=Math.hypot(player.x-TREASURE.x,player.z-TREASURE.z);
      if(td<70)txt="\u{1F3F4}‍☠️\u{1F525} BURNING HOT — the treasure chest is RIGHT HERE somewhere!";
      else if(td<200)txt="\u{1F3F4}‍☠️ HOT! The treasure is very close...";
      else if(td<420)txt="\u{1F3F4}‍☠️ Getting warm... the treasure isn't far.";
    }
  }
  $("hintTxt").textContent=txt;
  $("hint").style.display=txt?"flex":"none";
  $("kT").style.display=showT?"":"none";
  $("kF").style.display=showF?"":"none";
}
$("kT").onclick=()=>tryCall();
$("kF").onclick=()=>tryEnterLeave();
/* ================= FERRY ISLANDS: the car ferry & island fun ================= */
const FERRIES=new Map();
function ferryRoute(s){
  /* find the nearest shore in a straight line — that's where the mainland pier goes.
     The island's DRY land only reaches ~50 m from its center, so the island dock
     sits at 70 m with a pier + boardwalk bridging the shallow water. */
  for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){
    for(let t=160;t<=1400;t+=40){
      const px=s.x+dx*t,pz=s.z+dz*t;
      if(seaAt(px,pz)<0.25&&baseH(px,pz)>0){
        return{ax:s.x+dx*70,az:s.z+dz*70,bx:px-dx*20,bz:pz-dz*20,dx,dz};
      }
    }
  }
  return null;
}
function buildPier(fg,x,z,along,len,top){
  len=len||14;top=top||1.05;
  const pg=new THREE.Group();fg.add(pg);
  const w=along==="x"?len:4,d=along==="x"?4:len;
  const topM=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(w,0.3,d),new THREE.MeshLambertMaterial({color:0x8a6142})));
  topM.position.set(x,top-0.15,z);pg.add(topM);
  for(const ox of[-w/2+0.5,w/2-0.5])for(const oz of[-d/2+0.5,d/2-0.5]){
    const post=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,4.4),new THREE.MeshLambertMaterial({color:0x6f4e37}));
    post.position.set(x+ox,top-2.2,z+oz);pg.add(post);
  }
  decks.push({g:pg,x,z,hw:w/2,hd:d/2,tops:[top],ramp:null});
}
function buildFerry(s,key){
  const route=ferryRoute(s);
  if(!route){FERRIES.set(key,null);return;}
  const g=new THREE.Group();scene.add(g);
  const along=route.dx!==0?"x":"z";
  const ux=route.dx,uz=route.dz;
  /* ISLAND side: boardwalk from the beach (~42 m) out to the pier, pier to ~64 m,
     ferry docks at 70 m — one continuous walk from the sand onto the deck */
  buildPier(g,s.x+ux*47,s.z+uz*47,along,16,0.95);   // boardwalk over the shallows
  buildPier(g,s.x+ux*58,s.z+uz*58,along,14,1.05);   // the pier
  /* SHORE side: pier hugs the beach (dock 20 m out, pier reaches back to ~1 m) */
  buildPier(g,route.bx+ux*12,route.bz+uz*12,along,14,1.05);
  /* the ferry itself: hull, flat car deck, ramps, cabin & funnel */
  const boat=new THREE.Group();g.add(boat);
  const hull=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(9.6,1.5,21),new THREE.MeshPhongMaterial({color:0x1d4e89,shininess:60})));
  hull.position.y=0.2;boat.add(hull);
  const deck=new THREE.Mesh(new THREE.BoxGeometry(9,0.2,20.4),new THREE.MeshLambertMaterial({color:0x9aa0a8}));
  deck.position.y=1.0;boat.add(deck);
  [[-1],[1]].forEach(p=>{
    const ramp=new THREE.Mesh(new THREE.BoxGeometry(7,0.16,2.6),new THREE.MeshLambertMaterial({color:0x7d838c}));
    ramp.position.set(0,0.9,p[0]*11.2);ramp.rotation.x=p[0]*0.12;boat.add(ramp);
    const rail=new THREE.Mesh(new THREE.BoxGeometry(0.16,1,20),new THREE.MeshLambertMaterial({color:0xf4f7fb}));
    rail.position.set(p[0]*4.5,1.6,0);boat.add(rail);
  });
  const cab=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(3.4,2.6,3.4),new THREE.MeshLambertMaterial({color:0xf4f7fb})));
  cab.position.set(0,2.4,-7.5);boat.add(cab);
  const cabGlass=new THREE.Mesh(new THREE.BoxGeometry(3.5,0.9,3.5),glassMat);
  cabGlass.position.set(0,3,-7.5);boat.add(cabGlass);
  const fun=new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.55,1.8,10),new THREE.MeshLambertMaterial({color:0xd7263d}));
  fun.position.set(0,4.4,-7.5);boat.add(fun);
  /* the deck is a REAL surface: drive your car aboard */
  const fd={g,x:route.ax,z:route.az,hw:along==="x"?10.2:4.5,hd:along==="x"?4.5:10.2,tops:[1.1],ramp:null};
  decks.push(fd);
  let off=0;for(let i=0;i<key.length;i++)off+=key.charCodeAt(i);
  const f={g,boat,key,route,along,fd,x:route.ax,z:route.az,px:route.ax,pz:route.az,off:(off%97)/97,docked:1};
  FERRIES.set(key,f);
}
/* the ferry loop follows the shared clock: everyone sees it at the same spot.
   1 real second = 5 game minutes, so 1200 game minutes = a 4-REAL-MINUTE round trip
   (the old value of 20 made the poor ferry cross the sea in 4 seconds!) */
function ferryPhase(f){
  const tm=CLOCK.day*1440+CLOCK.min;
  return ((tm/1200)+f.off)%1;
}
function updateFerries(dt){
  /* make sure ferries exist for the islands around the player */
  const ci=Math.round((player.x-900)/ISP),cj=Math.round((player.z-1500)/ISP);
  for(let i=ci-1;i<=ci+1;i++)for(let j=cj-1;j<=cj+1;j++){
    const key=i+","+j;
    if(FERRIES.has(key))continue;
    const s=islandSpot(i,j);
    if(s)buildFerry(s,key);else FERRIES.set(key,null);
  }
  for(const[key,f]of FERRIES){
    if(!f)continue;
    if(Math.hypot(f.x-player.x,f.z-player.z)>2800){
      scene.remove(f.g);disposeGroup(f.g);FERRIES.delete(key);
      const di=decks.indexOf(f.fd);if(di>=0)decks.splice(di,1);
      continue;
    }
    /* where in the loop are we? dock A (island) → sail → dock B (shore) → sail back */
    const p=ferryPhase(f),r=f.route;
    let k,docked=0;
    if(p<0.12){k=0;docked=1;}
    else if(p<0.5){k=(p-0.12)/0.38;}
    else if(p<0.62){k=1;docked=2;}
    else{k=1-(p-0.62)/0.38;}
    /* ease in & out of the docks */
    const ke=k*k*(3-2*k);
    f.px=f.x;f.pz=f.z;
    f.x=r.ax+(r.bx-r.ax)*ke;
    f.z=r.az+(r.bz-r.az)*ke;
    f.docked=docked;
    f.boat.position.set(f.x,0,f.z);
    f.boat.rotation.y=f.along==="x"?Math.PI/2:0;
    /* gentle bobbing on the waves */
    f.boat.position.y=Math.sin(performance.now()/900+f.off*9)*0.08;
    f.fd.x=f.x;f.fd.z=f.z;
    /* everything standing on the deck sails along */
    const mvx=f.x-f.px,mvz=f.z-f.pz;
    if(mvx||mvz){
      const onDeck=(ex,ez,ey)=>Math.abs(ex-f.x)<f.fd.hw+0.5&&Math.abs(ez-f.z)<f.fd.hd+0.5&&ey>0.4&&ey<3.5;
      if(player.onFoot&&onDeck(player.x,player.z,player.y)){player.x+=mvx;player.z+=mvz;}
      if(myVehicle&&onDeck(myVehicle.x,myVehicle.z,myVehicle.y)){
        myVehicle.x+=mvx;myVehicle.z+=mvz;
        myVehicle.mesh.position.set(myVehicle.x,myVehicle.y,myVehicle.z);
        if(player.drive===myVehicle){player.x=myVehicle.x;player.z=myVehicle.z;}
      }
      if(PET.type&&PET.mesh&&onDeck(PET.x,PET.z,PET.mesh.position.y)){PET.x+=mvx;PET.z+=mvz;}
    }
  }
}
function nearFerry(){
  for(const f of FERRIES.values()){
    if(!f)continue;
    if(Math.hypot(player.x-f.x,player.z-f.z)<26)return f;
  }
  return null;
}
/* lighthouse beams sweep around */
function updateIslands(dt){
  for(let i=islands.length-1;i>=0;i--){
    const isl=islands[i];
    if(offScene(isl.g)){islands.splice(i,1);continue;}
    isl.head.rotation.y+=dt*1.1;
  }
}
function nearIslandThing(list,r){
  for(let i=islands.length-1;i>=0;i--){
    const isl=islands[i];
    if(offScene(isl.g)){islands.splice(i,1);continue;}
    const t=isl[list];
    if(t&&Math.hypot(player.x-t.x,player.z-t.z)<r)return isl;
  }
  return null;
}
/* the 20-piece BEACH DUMPLING collection — only sold on islands */
const BEACH_DUMPS=[
  ["Coral","#ff7e67"],["Wave","#4fc3f7"],["Lagoon","#00bfa5"],["Sunset","#ff8a3d"],
  ["Shell","#ffe9d6"],["Starfish","#ff5d5d"],["Palm","#2f9e44"],["Coconut","#8a6142"],
  ["Sandy","#e6d9a8"],["Ocean","#1d6f9e"],["Seaweed","#3a5f0b"],["Dolphin","#9fb4c7"],
  ["Sunrise","#ffd166"],["Tide","#5c7cfa"],["Reef","#e64980"],["Breeze","#c5f6fa"],
  ["Shark","#66788a"],["Salty","#f1f3f5"],["Tropic","#94d82d"],["Captain","#364fc7"]
];
function beachCollectionCount(){
  return BEACH_DUMPS.filter(b=>DUMP.owned.some(d=>d.color===b[0])).length;
}
function giveBeachDump(free){
  const c=BEACH_DUMPS[Math.floor(Math.random()*BEACH_DUMPS.length)];
  DUMP.owned.push({color:c[0],hex:c[1],glitter:Math.random()<0.08});
  renderDump();saveGame();
  toast((free?"\u{1F381} FREE mystery dumpling: ":"\u{1F41A} ")+"a "+c[0].toUpperCase()+" beach dumpling! Collection: "
    +beachCollectionCount()+" / 20"+(beachCollectionCount()>=20?" — COMPLETE!! \u{1F389}":""));
}
function openBeachShop(isl){
  const mystKey="vc4myst:"+Math.round(isl.x)+","+Math.round(isl.z)+":"+new Date().toISOString().slice(0,10);
  const mystUsed=!!localStorage.getItem(mystKey);
  showDest("\u{1F3D6} Beach shop — collection: "+beachCollectionCount()+" / 20 beach dumplings",[
    {label:"\u{1F381} FREE mystery beach dumpling"+(mystUsed?" (come back tomorrow!)":" — 1 per island per day"),value:"myst"},
    {label:"\u{1F41A} Beach dumpling — $35 (20 different ones to collect!)",value:"beach"},
    {label:"\u{1FAA9} PEARL dumpling — $35 (island exclusive!)",value:"pearl"},
    {label:"\u{1F965} Coconut drink — $15 (goes in your \u{1F392} backpack)",value:"coco"},
    {label:"\u{1F4D6} My fish log",value:"log"},
    {label:"❌ Just enjoying the beach",value:"cancel"}
  ],v=>{
    if(v==="log"){
      const log=fishLog();
      const opts=FISH_TABLE.map(f=>({label:(log[f[0]]?"✅ ":"\u{1F512} ")+f[0]+" — caught "+(log[f[0]]||0)+"x ($"+f[1]+")",value:"x"}));
      opts.push({label:"✅ Close",value:"x"});
      showDest("\u{1F4D6} Your fish log",opts,()=>{});
      return;
    }
    if(v==="myst"){
      if(mystUsed)toast("\u{1F381} You already got today's free mystery dumpling here — visit another island or come back tomorrow!");
      else{
        try{localStorage.setItem(mystKey,"1");}catch(e){}
        giveBeachDump(true);
      }
    }else if(v==="beach"){
      if(MONEY.v<35)toast("\u{1F4B0} That costs $35!");
      else{MONEY.v-=35;updateMoneyUI();giveBeachDump(false);}
    }else if(v==="coco"){
      if(MONEY.v<15)toast("\u{1F4B0} That costs $15!");
      else{
        MONEY.v-=15;updateMoneyUI();saveGame();
        MCD.pack.push(["\u{1F965} Coconut drink",30]);renderPack();
        toast("\u{1F965} Fresh coconut drink in your backpack — press R to drink it!");
      }
    }else if(v==="pearl"){
      if(MONEY.v<35)toast("\u{1F4B0} That costs $35!");
      else{
        MONEY.v-=35;updateMoneyUI();
        DUMP.owned.push({color:"Pearl",hex:"#e9e4f7",glitter:Math.random()<0.08});
        renderDump();saveGame();
        toast("\u{1FAA9} A shimmering PEARL dumpling — you can ONLY get these on islands!");
      }
    }
    openBeachShop(isl);   // the shop stays open so you can keep buying!
  });
}
function digTreasureX(isl){
  const dkey="vc4dig:"+Math.round(isl.x)+","+Math.round(isl.z)+":"+new Date().toISOString().slice(0,10);
  if(localStorage.getItem(dkey)){toast("\u{1F3D6} You already dug here today — the sand refills overnight!");return;}
  try{localStorage.setItem(dkey,"1");}catch(e){}
  addMoney(150);
  if(Math.random()<0.25){
    DUMP.owned.push({color:"Pearl",hex:"#e9e4f7",glitter:Math.random()<0.15});
    renderDump();saveGame();
    toast("⛏️\u{1F4B0} You dug up $150 — AND a buried PEARL dumpling!!");
  }else toast("⛏️\u{1F4B0} You dug at the X and found $150! Come back tomorrow.");
}
/* ================= 🏊 SWIMMING & THE WATERSLIDE ================= */
const SWIM={cur:null};
const SLIDE={on:false,t:0,pts:null};
function nearPoolSlide(){
  for(let i=poolParks.length-1;i>=0;i--){
    const p=poolParks[i];
    if(offScene(p.g)){poolParks.splice(i,1);continue;}
    if(Math.hypot(player.x-p.slideBase.x,player.z-p.slideBase.z)<4.5)return p;
  }
  return null;
}
function updateSlide(dt){
  SLIDE.t+=dt/2.4;
  const pts=SLIDE.pts;
  const raw=Math.min(0.999,SLIDE.t)*(pts.length-1);
  const seg=Math.floor(raw),f=raw-seg;
  const a=pts[seg],b=pts[seg+1];
  player.x=a[0]+(b[0]-a[0])*f;
  player.y=a[1]+(b[1]-a[1])*f-0.35;
  player.z=a[2]+(b[2]-a[2])*f;
  player.mesh.visible=true;
  player.mesh.position.set(player.x,player.y,player.z);
  player.mesh.rotation.y=Math.atan2(b[0]-a[0],b[2]-a[2]);
  const L=player.limbs;
  L.lL.rotation.x=-1.4;L.rL.rotation.x=-1.4;
  L.lA.rotation.x=-2.7;L.rA.rotation.x=-2.7;   // hands in the air, obviously
  if(SLIDE.t>=1){
    SLIDE.on=false;
    player.grounded=true;player.vy=0;
    toast("\u{1F4A6} SPLAAASH!!");
  }
  return 9;
}
/* ================= BUILDING PLOTS: buy land, build your dream house ================= */
const PLOT_PRICE=50000;
function nearPlotSign(){
  for(let i=plots.length-1;i>=0;i--){
    const p=plots[i];
    if(offScene(p.g)){plots.splice(i,1);continue;}
    if(Math.hypot(player.x-p.sign.x,player.z-p.sign.z)<6)return p;
  }
  return null;
}
function openPlotBuy(p){
  if(rentedAt(p.id)){toast("\u{1F3D7} This plot is already YOURS — step inside the fence and press T to BUILD!");return;}
  showDest("\u{1F3D7} Empty building plot — build your OWN house here!",[
    {label:"\u{1F4B0} BUY THE PLOT — $"+fmtMoney(PLOT_PRICE)+" (walls, windows, doors, roofs & all furniture!)",value:"buy"},
    {label:"❌ Not now",value:"cancel"}
  ],async v=>{
    if(v!=="buy")return;
    const claim=await checkClaim(p.id);
    if(claim.res==="taken"){toast("\u{1F512} This plot is already owned by "+claim.name+"!");return;}
    if(claim.res!=="mine"){
      if(MONEY.v<PLOT_PRICE){toast("\u{1F4B0} The plot costs $"+fmtMoney(PLOT_PRICE)+" — you have $"+fmtMoney(MONEY.v)+"!");return;}
      if(!await writeClaim(p.id)){toast("\u{1F512} Another player claimed it just before you!");return;}
      MONEY.v-=PLOT_PRICE;updateMoneyUI();profileSave(true);
    }
    RENT.list.push({id:p.id,x:p.x,z:p.z,ry:terrainH(p.x,p.z),mode:"own",rate:0,
      label:"\u{1F3D7} Building plot at ("+Math.round(p.x)+", "+Math.round(p.z)+")"});
    saveGame();
    if(p.sgMesh)p.sgMesh.visible=false;
    toast("\u{1F389}\u{1F3D7} THE LAND IS YOURS! Step inside the fence, press T, and build with \u{1F9F1} walls, \u{1FA9F} windows, \u{1F6AA} doors & \u{1F6D6} roofs!");
  });
}
/* ================= 🎣 FISHING ================= */
const ROD={owned:localStorage.getItem("vc4rod")==="1"};
const FISHING={state:"idle",t:0};
const FISH_TABLE=[
  ["\u{1F41F} Sardine",8,28],["\u{1F41F} Mackerel",15,24],["\u{1F420} Tropical fish",25,18],
  ["\u{1F363} Salmon",35,12],["\u{1F421} Puffer fish",50,8],["\u{1F5E1} Swordfish",120,5],
  ["\u{1F462} Old boot",1,3],["\u{1F31F} GOLDEN FISH",500,2]
];
function fishLog(){try{return JSON.parse(localStorage.getItem("vc4fishlog")||"{}");}catch(e){return{}}}
function atWaterEdge(){
  if(!player.onFoot||S.world!=="earth"||CAVE.in)return false;
  if(player.y>6)return false;
  for(let d2=5;d2<=14;d2+=4.5){
    const fx=player.x+Math.sin(player.yaw)*d2,fz=player.z+Math.cos(player.yaw)*d2;
    if(baseH(fx,fz)<-1.05)return true;   // real water ahead (below the waves)
  }
  return false;
}
function castOrReel(){
  if(!ROD.owned)return false;
  if(FISHING.state==="bite"){
    /* CATCH! pick a weighted random fish */
    let roll=Math.random()*100,fish=FISH_TABLE[0];
    for(const f of FISH_TABLE){roll-=f[2];if(roll<=0){fish=f;break;}}
    const log=fishLog();
    log[fish[0]]=(log[fish[0]]||0)+1;
    try{localStorage.setItem("vc4fishlog",JSON.stringify(log));}catch(e){}
    FISHING.state="idle";
    const total=Object.values(log).reduce((a,b)=>a+b,0);
    if(fish[0].includes("boot")){
      toast("\u{1F462} You caught... an old boot. Squelch. (total catches: "+total+")");
      return true;
    }
    /* your choice: sell it, or keep it as food */
    const foodVal=Math.max(12,Math.min(60,Math.round(fish[1]/2)+10));
    showDest((fish[0].includes("GOLDEN")?"\u{1F31F}\u{1F929} INCREDIBLE!!! You caught the ":"\u{1F3A3} You caught: ")+fish[0]+"!",[
      {label:"\u{1F4B5} SELL it — $"+fish[1],value:"sell"},
      {label:"\u{1F392} KEEP it — into your food backpack (+"+foodVal+" food, press R to eat)",value:"keep"}
    ],v=>{
      if(v==="keep"){
        MCD.pack.push([fish[0],foodVal]);
        renderPack();saveGame();
        toast("\u{1F392} "+fish[0]+" is in your backpack — fresh fish for dinner! (total catches: "+total+")");
      }else{
        addMoney(fish[1]);
        toast("\u{1F4B5} Sold "+fish[0]+" for $"+fish[1]+"! (total catches: "+total+")");
      }
    });
    return true;
  }
  if(FISHING.state==="wait"){
    FISHING.state="idle";
    toast("\u{1F3A3} Reeled in — nothing on the hook yet. Patience!");
    return true;
  }
  if(atWaterEdge()){
    FISHING.state="wait";
    FISHING.t=2.5+Math.random()*5;
    toast("\u{1F3A3} SPLASH! Line's in the water... wait for the ❗ then press T FAST!");
    return true;
  }
  return false;
}
function updateFishing(dt){
  if(FISHING.state==="wait"){
    FISHING.t-=dt;
    if(!player.onFoot){FISHING.state="idle";return;}
    if(FISHING.t<=0){
      FISHING.state="bite";FISHING.t=1.6;
      toast("❗\u{1F3A3} BITE!! PRESS T NOW!!");
    }
  }else if(FISHING.state==="bite"){
    FISHING.t-=dt;
    if(FISHING.t<=0){
      FISHING.state="idle";
      toast("\u{1F4A8} It got away... cast again!");
    }
  }
}
/* ================= 👮 POLICE CAREER: chase runaways, earn per arrest ================= */
function spawnRunaway(){
  const axis=Math.random()<0.5?"z":"x";
  const p0=axis==="z"?player.x:player.z;
  const line=Math.round((p0-30)/120)*120+30+(Math.floor(Math.random()*3)-1)*120;
  const mesh=buildVehicleMesh("car",0x14161a);
  scene.add(mesh);
  JOB.run={mesh,axis,line,t:(axis==="z"?player.z:player.x)+(Math.random()<0.5?-1:1)*(280+Math.random()*220),dir:Math.random()<0.5?1:-1,sp:26,bustT:0};
  toast("\u{1F4E1} RADIO: a black getaway car is speeding near ("+Math.round(axis==="z"?line:JOB.run.t)+", "+Math.round(axis==="z"?JOB.run.t:line)+") — GO GET 'EM!");
}
function runawayPos(r){
  const off=3.5,c=r.axis==="z"?(r.dir>0?r.line-off:r.line+off):(r.dir>0?r.line+off:r.line-off);
  return r.axis==="z"?{x:c,z:r.t}:{x:r.t,z:c};
}
function updatePoliceJob(dt){
  const r=JOB.run;
  if(!r)return;
  const p=runawayPos(r);
  const d=Math.hypot(player.x-p.x,player.z-p.z);
  /* the thief PANICS when the cops are close — they slow right down */
  r.sp=d<30?15:26;
  /* the runaway races the grid & turns randomly at crossings */
  const prev=r.t;
  r.t+=r.sp*dt*r.dir;
  const li0=Math.floor((prev-30)/120),li1=Math.floor((r.t-30)/120);
  if(li0!==li1&&Math.random()<0.4){
    const cl=(r.dir>0?li1:li0)*120+30;
    const old=r.line;
    r.axis=r.axis==="z"?"x":"z";
    r.t=old;r.line=cl;r.dir=Math.random()<0.5?1:-1;
  }
  const p2=runawayPos(r);
  const y=terrainH(p2.x,p2.z);
  const yaw=r.axis==="z"?(r.dir>0?0:Math.PI):(r.dir>0?Math.PI/2:-Math.PI/2);
  r.mesh.position.set(p2.x,y,p2.z);
  r.mesh.rotation.set(0,yaw,0);
  for(const w of r.mesh.userData.wheels)w.spin.rotation.x+=r.sp/w.r*dt;
  /* the map ROUTE follows the thief — blue line on the minimap & big map */
  JOB.tx=p2.x;JOB.tz=p2.z;
  jobBeacon.position.set(p2.x,y,p2.z);
  r.routeT=(r.routeT||0)-dt;
  if(r.routeT<=0||Math.hypot(NAV.x-p2.x,NAV.z-p2.z)>60){
    navPathTo(p2.x,p2.z);
    NAV.on=true;NAV.follow=null;
    r.routeT=2;
  }
  if(d>900){r.t=(r.axis==="z"?player.z:player.x)+(Math.random()<0.5?-1:1)*350;}   // never lose them completely
  /* get INTO the circle to bust them (1.5 s) */
  if(d<15&&player.drive){
    const prevT=r.bustT;
    r.bustT+=dt;
    const left=Math.ceil(1.5-r.bustT);
    if(r.bustT>=1.5){
      const cm=coopMult(),pj=Math.round(200*(JOB.mult||1));
      addMoney(pj*cm);JOB.total+=pj*cm;JOB.count++;
      toast("\u{1F46E}\u{1F694} BUSTED!! +$"+(pj*cm)+(cm>1?" \u{1F91D} CO-OP x2":"")+" — arrests this shift: "+JOB.count+". \u{1F4E1} Next call incoming...");
      scene.remove(r.mesh);disposeGroup(r.mesh);
      JOB.run=null;
      navStop(true);
      spawnRunaway();
      return;
    }
    if(Math.ceil(1.5-prevT)!==left||prevT<=0)toast("\u{1F6A8} STAY ON THEM — arrest in "+left+"...");
  }else r.bustT=Math.max(0,r.bustT-dt*1.5);
  /* flashing lights on YOUR police car */
  if(myVehicle&&myVehicle.mesh.userData.lights){
    const on=Math.floor(performance.now()/140)%2===0;
    myVehicle.mesh.userData.lights[0].visible=on;
    myVehicle.mesh.userData.lights[1].visible=!on;
  }
}
/* ================= THE HELICOPTER: $500K, fly anywhere, land anywhere ================= */
const HELI_PRICE=500000;
const HELI={active:false,x:0,z:0,y:0,yaw:0,hs:0,mesh:null};
function summonHeli(){
  if(S.world!=="earth"){toast("\u{1F681} The helicopter stays on Earth — take a rocket up there!");return;}
  if(!HELI.mesh){HELI.mesh=buildHeliMesh(0xd7263d);scene.add(HELI.mesh);}
  HELI.active=true;HELI.hs=0;
  HELI.x=player.x+9;HELI.z=player.z;HELI.yaw=player.yaw;
  HELI.y=Math.max(terrainH(HELI.x,HELI.z),deckYAt(HELI.x,HELI.z,player.y+2));
  HELI.mesh.visible=true;
  HELI.mesh.position.set(HELI.x,HELI.y,HELI.z);
  toast("\u{1F681} Your helicopter landed next to you — press F to hop in! (Space = up, Shift = down)");
}
$("bHeli").onclick=()=>{
  if(S.mode!=="game"){toast("Start driving first!");return;}
  if(OWN.has("Helicopter")){summonHeli();return;}
  if(HRENT.on){
    showDest("\u{1F681} Your RENTED helicopter ($500/day)",[
      {label:"\u{1F681} Summon it here!",value:"go"},
      {label:"\u{1F6EC} Return the rental (stop paying $500/day)",value:"stop"},
      {label:"❌ Cancel",value:"cancel"}
    ],v=>{
      if(v==="go")summonHeli();
      else if(v==="stop"){
        HRENT.on=false;HELI.active=false;
        if(HELI.mesh)HELI.mesh.visible=false;
        saveGame();
        toast("\u{1F6EC} Helicopter rental returned — no more daily costs!");
      }
    });
    return;
  }
  showDest("\u{1F681} Your own HELICOPTER?",[
    {label:"\u{1F4B0} BUY — $"+fmtMoney(HELI_PRICE)+" · yours FOREVER, fly & land anywhere!",value:"buy"},
    {label:"\u{1F511} RENT a real helicopter — $500 per day",value:"rent"},
    {label:"❌ Not yet",value:"cancel"}
  ],v=>{
    if(v==="buy"){
      if(MONEY.v<HELI_PRICE){toast("\u{1F4B0} It costs $"+fmtMoney(HELI_PRICE)+" — you have $"+fmtMoney(MONEY.v)+". Keep earning (or RENT one)!");return;}
      MONEY.v-=HELI_PRICE;OWN.add("Helicopter");
      updateMoneyUI();profileSave(true);saveGame();
      summonHeli();
      toast("\u{1F389}\u{1F681} SOLD! The helicopter is YOURS — press F to board!");
    }else if(v==="rent"){
      if(MONEY.v<500){toast("\u{1F4B0} Renting costs $500 (per day) — you have $"+fmtMoney(MONEY.v)+"!");return;}
      MONEY.v-=500;updateMoneyUI();
      HRENT.on=true;saveGame();
      summonHeli();
      toast("\u{1F681}\u{1F511} HELICOPTER RENTED — a REAL one, landing next to you now! $500 is charged every day. Press F to board!");
    }
  });
};
function updateHeli(dt){
  const h=HELI;
  const thr=thrInput(),st=steerInput();
  const maxS=230/3.6;
  if(thr>0)h.hs=Math.min(maxS,h.hs+22*thr*dt);
  else if(thr<0)h.hs=Math.max(0,h.hs+30*thr*dt);
  else h.hs*=Math.pow(0.99,dt*60);
  h.yaw+=st*1.4/(1+h.hs/30)*dt;
  let climb=0;
  if(spaceInput())climb=14;else if(keys.shift)climb=-14;
  h.y+=climb*dt;
  h.x+=Math.sin(h.yaw)*h.hs*dt;
  h.z+=Math.cos(h.yaw)*h.hs*dt;
  const gh=Math.max(terrainH(h.x,h.z),deckYAt(h.x,h.z,h.y));
  if(h.y<gh)h.y=gh;
  h.mesh.position.set(h.x,h.y,h.z);
  h.mesh.rotation.set(0,h.yaw,0);
  h.mesh.rotateX(Math.min(0.3,h.hs/64*0.3));
  h.mesh.userData.rotor.rotation.y+=dt*26;
  h.mesh.userData.tailRotor.rotation.x+=dt*40;
  player.x=h.x;player.z=h.z;player.y=h.y+1.5;
  return h.hs+Math.abs(climb);
}
/* ================= WEEKLY LEADERBOARD & TIMED TOURNAMENT (crown for #1!) ================= */
const BOARD={top:"",denied:false};
function weekKey(){return "wk"+Math.floor((Date.now()-1767225600000)/(7*86400000));}
/* the tournament: your RACE WINS this week (single player + multiplayer) */
function weekWins(){return parseInt(localStorage.getItem("vc4wins:"+weekKey())||"0",10)||0;}
function tourneyWin(){
  try{localStorage.setItem("vc4wins:"+weekKey(),String(weekWins()+1));}catch(e){}
  pushBoard();
  toast("\u{1F3C6} Tournament win recorded — you have "+weekWins()+" race win"+(weekWins()>1?"s":"")+" this week! (\u{1F4B0} Money ▸ \u{1F3C5} Leaderboard)");
}
function tourneyLeft(){
  const end=1767225600000+(Math.floor((Date.now()-1767225600000)/(7*86400000))+1)*7*86400000;
  const ms=end-Date.now(),d=Math.floor(ms/86400000),h=Math.floor(ms%86400000/3600000);
  return d+"d "+h+"h";
}
function pushBoard(){
  if(!SERVER_READY)return;
  const k=profileKey();
  if(!k)return;
  fbPut("/board/"+weekKey()+"/"+fbKey(k),{t:myToken(),n:mpName(),money:MONEY.v,km:Math.round(S.km*10)/10,wins:weekWins(),ts:Date.now()});
}
setInterval(pushBoard,60000);
async function fetchBoard(){
  const g=await fbGet("/board/"+weekKey());
  BOARD.denied=!g.ok;
  const list=(g.ok&&g.data)?Object.values(g.data).filter(e=>e&&typeof e.money==="number"):[];
  list.sort((a,b)=>b.money-a.money);
  BOARD.top=list.length?(list[0].n||""):"";
  return list;
}
setInterval(()=>{if(SERVER_READY)fetchBoard();},300000);
async function openBoard(mode){
  pushBoard();
  const list=await fetchBoard();
  if(mode==="wins")list.sort((a,b)=>(b.wins||0)-(a.wins||0));
  const opts=list.slice(0,10).map((e,i)=>({
    label:(i===0?"\u{1F451} ":"#"+(i+1)+"  ")+(e.n||"?")+(mode==="wins"
      ?" — \u{1F3C1} "+(e.wins||0)+" race win"+((e.wins||0)===1?"":"s")
      :" — $"+fmtMoney(e.money)+" · "+Math.round(e.km||0)+" km"),value:"x"}));
  if(!opts.length)opts.push({label:BOARD.denied
    ?"\u{1F534} Can't read the board — the Firebase rules need the new update (see FIREBASE-SETUP.md)!"
    :"(Empty this week — be the FIRST on the board!)",value:"x"});
  opts.push({label:mode==="wins"?"\u{1F4B0} Show the MONEY board":"\u{1F3C1} Show the RACE TOURNAMENT board",value:"swap"});
  opts.push({label:"✅ Close",value:"x"});
  showDest((mode==="wins"?"\u{1F3C1} WEEKLY RACE TOURNAMENT":"\u{1F3C5} WEEKLY LEADERBOARD")+" — ends in "+tourneyLeft()+"!",opts,v=>{
    if(v==="swap")openBoard(mode==="wins"?undefined:"wins");
  });
}
$("bBoard").onclick=()=>{$("moneyModal").classList.remove("open");openBoard();};
function makeCrown(){
  const g=new THREE.Group();
  const band=new THREE.Mesh(new THREE.CylinderGeometry(0.32,0.32,0.2,8,1,true),new THREE.MeshBasicMaterial({color:0xffd700,side:THREE.DoubleSide}));
  g.add(band);
  for(let i=0;i<5;i++){
    const a=i/5*Math.PI*2;
    const sp=new THREE.Mesh(new THREE.ConeGeometry(0.09,0.3,4),new THREE.MeshBasicMaterial({color:0xffd700}));
    sp.position.set(Math.cos(a)*0.3,0.22,Math.sin(a)*0.3);
    g.add(sp);
  }
  return g;
}
/* ================= CAR CUSTOMIZATION 2.0 ================= */
const CUSTOM={};
try{Object.assign(CUSTOM,JSON.parse(localStorage.getItem("vc4custom")||"{}"));}catch(e){}
function saveCustom(){try{localStorage.setItem("vc4custom",JSON.stringify(CUSTOM))}catch(e){}}
function custOf(n){
  const c=CUSTOM[n]||(CUSTOM[n]={sp:0,neon:0,rim:0,stripe:0,plate:""});
  if(c.tint===undefined)c.tint=0;   // older saves get the new options too
  if(c.spc===undefined)c.spc=0;
  return c;
}
const NEONS=[["OFF",0],["Cyan",0x00ffff],["Pink",0xff00ff],["Green",0x39ff14],["Red",0xff3333]];
const RIMS=[["Standard",0],["Gold",0xffd700],["Red",0xff3333],["Aqua",0x00ffcc],["Black",0x0a0a0a],["White",0xf4f7fb],["Bronze",0xb8862c]];
const STRIPES=[["None",0],["White",0xffffff],["Black",0x111111],["Red",0xff3333],["Blue",0x00cfff]];
const TINTS=[["Factory",null],["Light smoke",0x2a3644],["Dark smoke",0x0b0f14],["Blue",0x1b3f6e],["Green",0x1e4d3a],["Gold",0x6e5a1b],["Purple",0x3a1b5e]];
const SPOILER_COLORS=[["Carbon",0x181a20],["Body color",null],["White",0xf4f7fb],["Red",0xd7263d],["Blue",0x1b98e0],["Gold",0xd4af37]];
/* which customizations each vehicle type supports (campers & bicycles never get a spoiler,
   bicycles have no glass to tint and no license plate) */
const CUST_OPTS={car:{sp:1,neon:1,rim:1,stripe:1,plate:1,tint:1},moto:{sp:1,neon:1,rim:1,stripe:1,plate:1,tint:1},
  camper:{sp:0,neon:1,rim:1,stripe:1,plate:1,tint:1},bike:{sp:0,neon:1,rim:1,stripe:1,plate:0,tint:0}};
function applyCustom(mesh,v,cfg){
  if(!v||!cfg)return;
  const opts=CUST_OPTS[v.type]||CUST_OPTS.car;
  /* the exact body-surface anchors saved by buildVehicleMesh (cars only) */
  const B=mesh.userData.body||{zH:2.3,wid:2.08,cabZ:-0.25,cabL:2.25,hoodY:0.98,hoodA:-0.16,roofY:1.39,deckY:1.05,deckA:0.12,tailY:1.0};
  /* footprint per type, for the neon pool & plate spots */
  const FP=v.type==="camper"?{w:2.3,l:6.4,plateY:0.55,plateZ:3.24}
        :v.type==="moto"?{w:0.9,l:2.6,plateY:1.1,plateZ:-0.98}
        :v.type==="bike"?{w:0.6,l:2.2}
        :{w:B.wid,l:B.zH*2,plateY:0.4,plateZ:B.zH+0.08};
  if(cfg.sp&&opts.sp){
    /* your chosen spoiler color — "Body color" matches the paint, in REAL clear-coated metal */
    const spc=SPOILER_COLORS[cfg.spc||0];
    const wingMat=new THREE.MeshPhysicalMaterial({color:spc[1]===null?paintOf(v):spc[1],
      metalness:0.7,roughness:0.3,clearcoat:0.8,clearcoatRoughness:0.1,envMapIntensity:1.2});
    if(v.type==="moto"){
      /* a sporty little tail wing above the rear light */
      const st=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.22,0.08),darkTrim);
      st.position.set(0,1.3,-0.88);mesh.add(st);
      const wing=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(0.7,0.05,0.26),wingMat));
      wing.position.set(0,1.42,-0.9);mesh.add(wing);
    }else{
      [[-0.7],[0.7]].forEach(p=>{
        const st=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.38,0.1),darkTrim);
        st.position.set(p[0],B.tailY+0.19,-(B.zH-0.25));mesh.add(st);
      });
      const wing=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(1.9,0.07,0.5),wingMat));
      wing.position.set(0,B.tailY+0.38,-(B.zH-0.2));mesh.add(wing);
      /* wing end plates for the full racing look */
      [[-0.92],[0.92]].forEach(p=>{
        const ep=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.16,0.44),darkTrim);
        ep.position.set(p[0],B.tailY+0.42,-(B.zH-0.2));mesh.add(ep);
      });
    }
  }
  if(cfg.tint&&opts.tint&&mesh.userData.glassMeshes&&mesh.userData.glassMeshes.length){
    /* swap every window to your chosen tint */
    const gm=glassTint(TINTS[cfg.tint][1]);
    mesh.userData.glassMeshes.forEach(x=>x.material=gm);
  }
  if(cfg.neon&&opts.neon){
    const nc=NEONS[cfg.neon][1];
    const gl=new THREE.Mesh(new THREE.PlaneGeometry(FP.w+0.5,FP.l+0.3),
      new THREE.MeshBasicMaterial({color:nc,transparent:true,opacity:0.55,depthWrite:false}));
    gl.rotation.x=-Math.PI/2;gl.position.y=0.14;mesh.add(gl);
  }
  if(cfg.rim&&opts.rim){
    /* the WHOLE wheel gets your color now: hub, spokes and outer rings —
       tires stay black, the brake disc & caliper stay real */
    const rm=hubMatFor(RIMS[cfg.rim][1]);
    for(const w of mesh.userData.wheels)
      w.spin.traverse(o=>{if(o.isMesh&&o.material!==tireMat)o.material=rm;});
  }
  if(cfg.stripe&&opts.stripe){
    const sc=new THREE.MeshLambertMaterial({color:STRIPES[cfg.stripe][1]});
    if(v.type==="camper"){
      /* a bold accent band along both sides + across the nose */
      [[-1.18],[1.18]].forEach(p=>{
        const b=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.26,5.9),sc);
        b.position.set(p[0],1.55,-0.3);mesh.add(b);
      });
      const n=new THREE.Mesh(new THREE.BoxGeometry(2.24,0.26,0.04),sc);
      n.position.set(0,1.55,3.11);mesh.add(n);
    }else if(v.type==="moto"){
      /* racing stripe over the tank and the tail */
      const t=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.06,0.72),sc);
      t.position.set(0,1.36,0.35);mesh.add(t);
      const b=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.06,1.0),sc);
      b.position.set(0,1.18,-0.45);mesh.add(b);
    }else if(v.type==="bike"){
      /* colored accents on the frame tubes */
      const f=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.12,0.7),sc);
      f.position.set(0,0.85,0);f.rotation.x=0.12;mesh.add(f);
    }else{
      /* sunk into the body like the factory stripes — a ridge, never floating */
      [[B.hoodY,B.hoodA,B.zH*0.62,1.05],[B.roofY,0,B.cabZ,B.cabL-0.5],[B.deckY,B.deckA,-B.zH*0.72,0.65]].forEach(s=>{
        const b=new THREE.Mesh(new THREE.BoxGeometry(0.44,0.24,s[3]),sc);
        b.position.set(0,s[0]-0.08,s[2]);b.rotation.x=s[1];mesh.add(b);
      });
    }
  }
  if(cfg.plate&&opts.plate){
    const cv=document.createElement("canvas");cv.width=128;cv.height=32;
    const c=cv.getContext("2d");
    c.fillStyle="#f4f7fb";c.fillRect(0,0,128,32);
    c.fillStyle="#1b3f8f";c.fillRect(0,0,12,32);
    c.fillStyle="#14161a";c.font="bold 22px Segoe UI";c.textAlign="center";
    c.fillText(cfg.plate.toUpperCase().slice(0,7),70,24);
    const pm=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv)});
    if(v.type==="moto"){
      const pl=new THREE.Mesh(new THREE.PlaneGeometry(0.34,0.11),pm);
      pl.position.set(0,FP.plateY,FP.plateZ);pl.rotation.y=Math.PI;mesh.add(pl);
    }else{
      /* mounted ON the bumper faces, clearly visible front & back */
      [[FP.plateZ,0],[-FP.plateZ,Math.PI]].forEach(p=>{
        const pl=new THREE.Mesh(new THREE.PlaneGeometry(0.56,0.17),pm);
        pl.position.set(0,FP.plateY,p[0]);pl.rotation.y=p[1];mesh.add(pl);
      });
    }
  }
}
function cuUI(){
  if(!GAR.v)return;
  const c=custOf(GAR.v.name),opts=CUST_OPTS[GAR.v.type]||CUST_OPTS.car;
  $("cuSpoiler").style.display=opts.sp?"":"none";
  $("cuSpc").style.display=(opts.sp&&c.sp)?"":"none";   // spoiler color only when a spoiler is on
  $("cuTint").style.display=opts.tint?"":"none";
  $("cuPlate").style.display=opts.plate?"":"none";
  $("cuSpoiler").innerHTML="\u{1F3CE} Spoiler: "+(c.sp?"ON":"OFF");
  $("cuSpc").innerHTML="\u{1F3A8} Spoiler color: "+SPOILER_COLORS[c.spc][0];
  $("cuNeon").innerHTML="\u{1F4A1} Neon: "+NEONS[c.neon][0];
  $("cuRim").innerHTML="⭕ Wheels: "+RIMS[c.rim][0];
  $("cuStripe").innerHTML="\u{1F3F3} Stripe: "+STRIPES[c.stripe][0];
  $("cuTint").innerHTML="\u{1FA9F} Tint: "+TINTS[c.tint][0];
  $("cuPlate").innerHTML="\u{1F520} Plate: "+(c.plate?c.plate.toUpperCase():"—");
}
["cuSpoiler","cuNeon","cuRim","cuStripe","cuTint","cuSpc"].forEach((id,k)=>{
  $(id).onclick=()=>{
    const c=custOf(GAR.v.name);
    if(k===0)c.sp=c.sp?0:1;
    else if(k===1)c.neon=(c.neon+1)%NEONS.length;
    else if(k===2)c.rim=(c.rim+1)%RIMS.length;
    else if(k===3)c.stripe=(c.stripe+1)%STRIPES.length;
    else if(k===4)c.tint=(c.tint+1)%TINTS.length;
    else c.spc=(c.spc+1)%SPOILER_COLORS.length;
    saveCustom();garageSetMesh();cuUI();
  };
});
$("cuPlate").onclick=()=>{
  const c=custOf(GAR.v.name);
  const s=prompt("License plate text (max 7 letters/numbers):",c.plate||"");
  if(s===null)return;
  c.plate=s.replace(/[^a-zA-Z0-9 ]/g,"").slice(0,7);
  saveCustom();garageSetMesh();cuUI();
};
/* ================= VOLCANOES: eruptions on the shared clock + lava dumplings ================= */
function volcPhase(){
  const tm=CLOCK.day*1440+CLOCK.min;
  return((tm/12000)%1+1)%1;   // a full cycle every ~40 real minutes
}
function volcErupting(){return volcPhase()<0.06;}   // ~2.4 real minutes of chaos
function updateVolcanoes(dt){
  const erupting=volcErupting();
  const now=performance.now();
  for(let i=volcs.length-1;i>=0;i--){
    const v=volcs[i];
    if(offScene(v.g)){volcs.splice(i,1);continue;}
    v.glow.material.opacity=0.5+Math.sin(now/300)*0.18+(erupting?0.3:0);
    v.light.intensity=erupting?2.6+Math.sin(now/90)*0.8:1;
    v.pts.visible=erupting;
    if(erupting){
      const pos=v.pts.geometry.attributes.position;
      for(let k=0;k<pos.count;k++){
        const t=((now/1400)+v.seeds[k])%1;
        const a=v.seeds[k]*97;
        pos.setXYZ(k,v.x+Math.sin(a)*t*28,v.y+t*(1-t)*4*36,v.z+Math.cos(a)*t*28);
      }
      pos.needsUpdate=true;
      if(Math.random()<dt*7)puffSmoke(v.x+(Math.random()-0.5)*10,v.y+22,v.z+(Math.random()-0.5)*10,true);
      if(!v.announced){
        v.announced=true;
        pushNews("\u{1F30B} ERUPTION! The volcano at ("+Math.round(v.x)+", "+Math.round(v.z)+") is blowing its top!");
        if(Math.hypot(player.x-v.x,player.z-v.z)<2500)toast("\u{1F30B}\u{1F4A5} THE VOLCANO IS ERUPTING — stay away from the crater!!");
      }
      /* the blast throws anyone on the cone down to the shore */
      if(!player.inRocket&&!player.inPlane&&!player.inHeli&&Math.hypot(player.x-v.x,player.z-v.z)<55){
        player.x=v.x+150;player.z=v.z;
        player.y=terrainH(player.x,player.z);player.vy=0;player.grounded=true;
        if(player.drive){player.drive.x=player.x;player.drive.z=player.z;player.drive.speed=0;}
        toast("\u{1F30B}\u{1F4A8} WHOOSH!! The eruption blew you down to the shore — that was CLOSE!");
      }
    }else{
      v.announced=false;
      if(Math.random()<dt*1.1)puffSmoke(v.x+(Math.random()-0.5)*6,v.y+18,v.z+(Math.random()-0.5)*6);
    }
  }
}
function nearVolcanoCrater(){
  for(const v of volcs){
    if(offScene(v.g))continue;
    if(Math.hypot(player.x-v.x,player.z-v.z)<30)return v;
  }
  return null;
}
/* ================= SKY RESTAURANT & CO-OP pay ================= */
function nearSkyRest(){
  for(let i=skyRests.length-1;i>=0;i--){
    const s=skyRests[i];
    if(offScene(s.g)){skyRests.splice(i,1);continue;}
    if(Math.abs(player.y-s.y)<8&&Math.hypot(player.x-s.x,player.z-s.z)<14)return s;
  }
  return null;
}
/* the CLOUD dumpling collection — 6 different ones, only sold up here */
const SKY_DUMPS=[
  ["Cloud","#eef6ff"],["Storm cloud","#8a93a6"],["Sunset cloud","#ffb46b"],
  ["Sunrise cloud","#ffd9e8"],["Star cloud","#fff3b0"],["Rainbow cloud","#cdb4ff"]
];
function skyCollectionCount(){return SKY_DUMPS.filter(s=>DUMP.owned.some(d=>d.color===s[0])).length;}
function openSkyRest(){
  showDest("☁️ SKY RESTAURANT — cloud collection: "+skyCollectionCount()+" / 6",[
    {label:"☁️ Mystery CLOUD dumpling — $100 (6 DIFFERENT ones to collect!)",value:"cloud"},
    {label:"\u{1F969} Mountain feast — $60 (+60 food)",value:"feast"},
    {label:"\u{1F370} Cloud cake — $25 (+35 food)",value:"cake"},
    {label:"❌ Done — enjoy the view!",value:"cancel"}
  ],v=>{
    if(v==="cancel")return;
    const price=v==="feast"?60:v==="cake"?25:100;
    if(MONEY.v<price){toast("\u{1F4B0} That costs $"+price+"!");openSkyRest();return;}
    MONEY.v-=price;updateMoneyUI();
    if(v==="cloud"){
      const c=SKY_DUMPS[Math.floor(Math.random()*SKY_DUMPS.length)];
      DUMP.owned.push({color:c[0],hex:c[1],glitter:Math.random()<0.08});
      renderDump();saveGame();
      toast("☁️\u{1F95F} A "+c[0].toUpperCase()+" dumpling! Collection: "+skyCollectionCount()+" / 6"+(skyCollectionCount()>=6?" — COMPLETE!! \u{1F389}":""));
    }else{
      MCD.pack.push(v==="feast"?["\u{1F969} Mountain feast",60]:["\u{1F370} Cloud cake",35]);
      renderPack();saveGame();
      toast("\u{1F37D} In your backpack — press R to enjoy it with this VIEW!");
    }
    openSkyRest();   // the menu stays open so you can keep shopping!
  });
}
/* a REAL friend in your passenger seat doubles all job pay */
function coopMult(){
  for(const o of MP.others.values())
    if(o.kind==="seat"&&Math.hypot(o.x-player.x,o.z-player.z)<6)return 2;
  return 1;
}
/* ================= BIRDS: flocks circling in the daytime sky ================= */
const BIRDS=(function(){
  const g=new THREE.Group();scene.add(g);
  const mat=new THREE.MeshBasicMaterial({color:0x2a2f3a,side:THREE.DoubleSide});
  const list=[];
  for(let i=0;i<10;i++){
    const b=new THREE.Group();
    const l=new THREE.Mesh(new THREE.PlaneGeometry(1.6,0.5),mat);l.position.x=-0.8;b.add(l);
    const r=new THREE.Mesh(new THREE.PlaneGeometry(1.6,0.5),mat);r.position.x=0.8;b.add(r);
    g.add(b);
    list.push({b,l,r,th:Math.random()*7,rr:40+Math.random()*90,h:55+Math.random()*45,sp:0.15+Math.random()*0.2,ph:Math.random()*7});
  }
  return{g,list};
})();
function updateBirds(dt){
  const vis=S.world==="earth"&&!isNight()&&!CAVE.in;
  BIRDS.g.visible=vis;
  if(!vis)return;
  const now=performance.now();
  for(const b of BIRDS.list){
    b.th+=b.sp*dt;
    b.b.position.set(player.x+Math.cos(b.th)*b.rr,b.h+Math.sin(b.th*3)*4,player.z+Math.sin(b.th)*b.rr);
    b.b.rotation.y=-b.th;
    const f=Math.sin(now/120+b.ph)*0.6;
    b.l.rotation.z=f;b.r.rotation.z=-f;
  }
}
/* ================= HOME FOOD DELIVERY: order to your mansion or apartment ================= */
const ORDER={active:false,stage:null,items:[],dumps:0,cost:0,tx:0,tz:0,mesh:null,x:0,z:0,lx:0,lz:0,wait:0,label:"",pend:null};
function myRoomHere(){
  for(let i=hotelRooms.length-1;i>=0;i--){
    const r=hotelRooms[i];
    if(offScene(r.g)){hotelRooms.splice(i,1);continue;}
    if(Math.abs(player.y-r.ry)<2&&Math.abs(player.x-r.x)<r.hw+0.5&&Math.abs(player.z-r.z)<r.hd+0.5){
      const rent=RENT.list.find(e=>Math.abs(e.x-r.x)<3&&Math.abs(e.z-r.z)<3);
      if(rent)return r;
    }
  }
  return null;
}
function homeSpotForOrder(){
  if(MEDIT.on&&MEDIT.man)return{x:MEDIT.man.x-2,z:MEDIT.man.z+47};   // the mansion's front path
  const rm=myRoomHere();
  if(rm)return{x:rm.x-1,z:rm.z+rm.hd+4};                              // outside the apartment door
  return null;
}
function openOrderMenu(){
  if(ORDER.active){toast("\u{1F6F5} Your order is already on its way — listen for the \u{1F514} doorbell!");return;}
  const spot=homeSpotForOrder();
  if(!spot){toast("\u{1F6F5} Order from inside YOUR home (apartment room or mansion)!");return;}
  ORDER.pend=spot;
  showDest("\u{1F6F5} Order food to your home",[
    {label:"\u{1F354} McDrive — burgers, nuggets, drinks & fries",value:"mcd"},
    {label:"\u{1F6D2} MEGA MART — food boxes",value:"mart"},
    {label:"\u{1F95F} Squishy Dumplings — pick an amount ($12 each)",value:"dump"},
    {label:"❌ Cancel",value:"cancel"}
  ],v=>{
    if(v==="cancel")return;
    if(v==="mcd"){
      MCD.delivery=true;MCD.order=[];renderMcdOrder();
      $("mcdModal").classList.add("open");
      toast("\u{1F354} Pick your food, then hit ✅ Done — a courier brings it to your door (+$10 delivery)!");
      return;
    }
    if(v==="mart"){
      showDest("\u{1F6D2} MEGA MART boxes",[
        {label:"\u{1F34E} Fruit box — $30 (4 kinds of fruit)",value:"fruit"},
        {label:"\u{1F950} Breakfast box — $40 (bread, milk, eggs, croissant)",value:"brk"},
        {label:"\u{1F36A} Snack box — $25 (chocolate, cookies, cake, ice cream)",value:"snack"},
        {label:"❌ Cancel",value:"cancel"}
      ],b=>{
        if(b==="cancel")return;
        const boxes={
          fruit:[["\u{1F34E} Apple",12],["\u{1F34C} Banana",11],["\u{1F347} Grapes",12],["\u{1F353} Strawberries",13]],
          brk:[["\u{1F35E} Bread",22],["\u{1F95B} Milk",14],["\u{1F95A} Eggs",16],["\u{1F950} Croissant",15]],
          snack:[["\u{1F36B} Chocolate",14],["\u{1F36A} Cookies",12],["\u{1F382} Cake",28],["\u{1F366} Ice cream",16]]
        };
        startOrder(spot,boxes[b],0,{fruit:30,brk:40,snack:25}[b],"\u{1F6D2} MEGA MART box");
      });
      return;
    }
    const s=prompt("How many Squishy Dumplings do you want?\n(1 - 50, $12 each + $10 delivery)","5");
    let n=parseInt(s,10);
    if(!(n>0)){if(s!==null)toast("Type a number like 5!");return;}
    n=Math.min(50,n);
    startOrder(spot,[],n,n*12+10,"\u{1F95F} "+n+" Squishy Dumplings");
  });
}
function startOrder(spot,items,dumps,cost,label){
  ORDER.active=true;ORDER.stage="driving";
  ORDER.items=items;ORDER.dumps=dumps;ORDER.cost=cost;ORDER.label=label;
  ORDER.tx=spot.x;ORDER.tz=spot.z;
  const a=Math.random()*Math.PI*2;
  ORDER.x=spot.x+Math.sin(a)*230;ORDER.z=spot.z+Math.cos(a)*230;
  if(ORDER.mesh){scene.remove(ORDER.mesh);disposeGroup(ORDER.mesh);}
  ORDER.mesh=buildVehicleMesh("moto",0xff5d8f);
  if(ORDER.mesh.userData.riderMesh)ORDER.mesh.userData.riderMesh.visible=true;
  ORDER.mesh.position.set(ORDER.x,terrainH(ORDER.x,ORDER.z),ORDER.z);
  scene.add(ORDER.mesh);
  toast("\u{1F6F5} Order placed: "+ORDER.label+" — $"+fmtMoney(cost)+" (pay at the door). The courier is on the way!");
}
function dingdong(){
  ensureAudio();
  if(!audioCtx||!SND.sound)return;
  const t=audioCtx.currentTime;
  [[660,0],[524,0.4]].forEach(([f,off])=>{
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.type="sine";o.frequency.value=f;
    g.gain.setValueAtTime(0,t+off);
    g.gain.linearRampToValueAtTime(0.25,t+off+0.02);
    g.gain.exponentialRampToValueAtTime(0.001,t+off+0.9);
    o.connect(g);g.connect(audioCtx.destination);
    o.start(t+off);o.stop(t+off+1);
  });
}
function leaveOrder(){
  ORDER.stage="leaving";
  const a=Math.random()*7;
  ORDER.lx=ORDER.x+Math.sin(a)*280;ORDER.lz=ORDER.z+Math.cos(a)*280;
}
function endOrder(){
  ORDER.active=false;ORDER.stage=null;
  if(ORDER.mesh){scene.remove(ORDER.mesh);disposeGroup(ORDER.mesh);ORDER.mesh=null;}
}
function tryPickupOrder(){
  if(!ORDER.active||ORDER.stage!=="waiting")return false;
  if(Math.hypot(player.x-ORDER.x,player.z-ORDER.z)>4.5)return false;
  if(MONEY.v<ORDER.cost){
    toast("\u{1F4B0} The courier wants $"+fmtMoney(ORDER.cost)+" — you only have $"+fmtMoney(MONEY.v)+"!");
    return true;
  }
  MONEY.v-=ORDER.cost;updateMoneyUI();
  ORDER.items.forEach(it=>MCD.pack.push(it));
  if(ORDER.dumps){DUMP.unopened+=ORDER.dumps;renderDump();}
  renderPack();saveGame();
  toast("\u{1F389} Paid $"+fmtMoney(ORDER.cost)+" — "+ORDER.label+" is yours! "
    +(ORDER.dumps?"Open them in the \u{1F95F} Dumplings menu!":"The food is in your \u{1F392} backpack (press R to eat)."));
  leaveOrder();
  return true;
}
function updateOrder(dt){
  if(!ORDER.active||S.world!=="earth")return;
  const m=ORDER.mesh;
  if(ORDER.stage==="driving"||ORDER.stage==="leaving"){
    const tx=ORDER.stage==="driving"?ORDER.tx:ORDER.lx;
    const tz=ORDER.stage==="driving"?ORDER.tz:ORDER.lz;
    const dx=tx-ORDER.x,dz=tz-ORDER.z,d=Math.hypot(dx,dz);
    if(d<3){
      if(ORDER.stage==="driving"){
        ORDER.stage="waiting";ORDER.wait=180;
        dingdong();
        setRoute(ORDER.x,ORDER.z);
        toast("\u{1F514} DING DONG! Your "+ORDER.label+" is at the front door — go out, pay & pick it up!");
      }else{endOrder();return;}
    }else{
      const yaw=Math.atan2(dx,dz);
      ORDER.x+=dx/d*15*dt;ORDER.z+=dz/d*15*dt;
      m.rotation.set(0,yaw,0);
      for(const w of m.userData.wheels)w.spin.rotation.x+=15/w.r*dt;
    }
    m.position.set(ORDER.x,terrainH(ORDER.x,ORDER.z),ORDER.z);
  }else if(ORDER.stage==="waiting"){
    ORDER.wait-=dt;
    if(ORDER.wait<=0){
      toast("\u{1F6F5} The courier waited and waited... and drove off with your "+ORDER.label+"!");
      leaveOrder();
    }
  }
}
/* ================= RIDE ALONG: hop into another player's car as a PASSENGER ================= */
const RIDE={on:false,key:null,px:0,pz:0};
function nearRideableCar(){
  let best=null,bd=4.5;
  for(const[k,o]of MP.others){
    if(o.kind!=="car"&&o.kind!=="moto")continue;
    const d=Math.hypot(player.x-o.x,player.z-o.z);
    if(d<bd){bd=d;best={k,o};}
  }
  return best;
}
function startRide(k,o){
  RIDE.on=true;RIDE.key=k;RIDE.px=o.x;RIDE.pz=o.z;
  player.onFoot=false;player.drive=null;
  MP.lastSig="";   // broadcast the new seat right away
  toast("\u{1F698}\u{1F44B} You hopped into "+o.name+"'s passenger seat — enjoy the ride! (F = hop out)");
}
function endRide(silent){
  if(!RIDE.on)return;
  const o=MP.others.get(RIDE.key);
  RIDE.on=false;RIDE.key=null;
  player.onFoot=true;player.mesh.visible=true;
  if(o){
    const right=o.yaw+Math.PI/2;
    player.x=o.x+Math.sin(right)*2.4;
    player.z=o.z+Math.cos(right)*2.4;
  }
  player.y=Math.max(terrainH(player.x,player.z),deckYAt(player.x,player.z,player.y));
  player.grounded=true;player.vy=0;
  MP.lastSig="";
  if(!silent)toast("\u{1F44B} You hopped out — thanks for the ride!");
}
function updateRide(dt){
  const o=MP.others.get(RIDE.key);
  if(!o){endRide(true);toast("\u{1F698} The driver left — you're back on your feet!");return 0;}
  /* sit on the passenger side of their car */
  const right=o.yaw+Math.PI/2;
  player.x=o.x+Math.sin(right)*0.72;
  player.z=o.z+Math.cos(right)*0.72;
  player.y=o.y+0.42;
  player.yaw=o.yaw;
  player.mesh.visible=true;
  player.mesh.position.set(player.x,player.y,player.z);
  player.mesh.rotation.y=o.yaw;
  const L=player.limbs;
  L.lL.rotation.x=-1.5;L.rL.rotation.x=-1.5;L.lA.rotation.x=-0.5;L.rA.rotation.x=-0.5;
  const sp=Math.hypot(o.x-RIDE.px,o.z-RIDE.pz)/Math.max(dt,0.001);
  RIDE.px=o.x;RIDE.pz=o.z;
  return Math.min(sp,140);
}
/* ================= ALIENS ON THE MOON: spaceships you can ROB ================= */
function nearUfo(){
  for(let i=ufos.length-1;i>=0;i--){
    const u=ufos[i];
    if(offScene(u.g)){ufos.splice(i,1);continue;}
    if(Math.hypot(player.x-u.x,player.z-u.z)<15)return u;
  }
  return null;
}
const UFO_COOLDOWN=30*60*1000;   // after a robbery the vault re-locks for 30 real minutes
function ufoKey(u){return "vc4ufo:"+Math.round(u.x)+","+Math.round(u.z);}
function ufoLockLeft(u){
  const ts=parseInt(localStorage.getItem(ufoKey(u)),10);
  if(isNaN(ts))return 0;   // never robbed (or an old save): unlocked
  return Math.max(0,UFO_COOLDOWN-(Date.now()-ts));
}
function openRobUfo(u){
  const left=ufoLockLeft(u);
  if(left>0){
    toast("\u{1F6F8}\u{1F512} The vault is LOCKED — the aliens reset it in "+Math.ceil(left/60000)+" minute"+(Math.ceil(left/60000)>1?"s":"")+"!");
    return;
  }
  /* each planet's aliens carry that planet's OWN dumpling — worth $1 per km
     of the planet's distance, so the Neptune one is the jackpot! */
  const P=curPlanet()||PLANETS.moon;
  const dumpName=S.world==="moon"?"Alien":P.name;
  const dumpVal=dumpValue({color:dumpName,glitter:false});
  showDest("\u{1F6F8} The alien spaceship...",[
    {label:"\u{1F4B0} ROB IT! ($10,000 + a "+dumpName.toUpperCase()+" dumpling worth $"+fmtMoney(dumpVal)+"... if you dare)",value:"rob"},
    {label:"\u{1F44B} Just wave at the aliens",value:"wave"},
    {label:"❌ Back away slowly",value:"cancel"}
  ],v=>{
    if(v==="wave"){toast("\u{1F44B}\u{1F47D} The aliens wave back with all four fingers. Beep boop!");return;}
    if(v!=="rob")return;
    try{localStorage.setItem(ufoKey(u),String(Date.now()));}catch(e){}
    addMoney(10000);
    DUMP.owned.push({color:dumpName,hex:P.alienCss,glitter:Math.random()<0.08});
    renderDump();saveGame();
    u.angry=22;u.loot=true;
    pushNews("\u{1F6F8} BREAKING: "+mpName()+" robbed an alien spaceship on "+P.name.toUpperCase()+" — $10,000 and a "+dumpName.toUpperCase()+" dumpling!");
    toast("\u{1F4B0}\u{1F47D} YOU ROBBED THE ALIENS — $10,000 + a "+dumpName.toUpperCase()+" dumpling ($"+fmtMoney(dumpVal)+")! Now RUN, they're chasing you!!");
  });
}
function updateUfos(dt){
  if(S.world==="earth")return;
  const now=performance.now();
  for(let i=ufos.length-1;i>=0;i--){
    const u=ufos[i];
    if(offScene(u.g)){ufos.splice(i,1);continue;}
    /* blinking rim lights */
    u.lights.forEach((l,li)=>{l.visible=Math.floor(now/240+li)%2===0;});
    /* crystals spin — walk into one for $100 */
    for(const cr of u.crystals){
      if(cr.got)continue;
      cr.mesh.rotation.y+=dt*1.6;
      if(player.onFoot&&Math.hypot(player.x-cr.x,player.z-cr.z)<2.2){
        cr.got=true;cr.mesh.visible=false;
        /* crystals on far-away planets are worth more too! */
        const cv2=Math.max(100,Math.round((curPlanet()||PLANETS.moon).km/10));
        addMoney(cv2);
        toast("\u{1F48E} A glowing "+(curPlanet()||PLANETS.moon).name.toUpperCase()+" CRYSTAL — +$"+fmtMoney(cv2)+"!");
      }
    }
    /* the alien crew: wander around the ship, CHASE you after a robbery */
    u.angry=Math.max(0,u.angry-dt);
    for(const a of u.aliens){
      a.t-=dt;
      if(u.angry>0){
        const dx=player.x-a.x,dz=player.z-a.z,d=Math.hypot(dx,dz);
        if(d<2.2&&u.loot){
          u.loot=false;
          MONEY.v=Math.max(0,MONEY.v-5000);updateMoneyUI();saveGame();
          toast("\u{1F47D} An alien CAUGHT you and zapped back $5,000! You keep the dumpling — now GO!");
        }
        if(d>1&&d<90){
          a.yaw=Math.atan2(dx,dz);
          a.x+=dx/d*5.2*dt;a.z+=dz/d*5.2*dt;
        }
      }else{
        if(a.t<=0){a.t=2+Math.random()*3;a.yaw+=(Math.random()-0.5)*2.5;}
        const nx=a.x+Math.sin(a.yaw)*1.2*dt,nz=a.z+Math.cos(a.yaw)*1.2*dt;
        if(Math.hypot(nx-u.x,nz-u.z)<28){a.x=nx;a.z=nz;}
        else{a.yaw+=Math.PI/2+Math.random();a.t=2;}
      }
      /* aliens hop-float in the low gravity */
      a.m.position.set(a.x,moonH(a.x,a.z)+Math.abs(Math.sin(now/300+a.x))*0.25,a.z);
      a.m.rotation.y=a.yaw;
    }
  }
}
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
    toast("✨ Graphics: "+(q==="low"?"FAST (no shadows)":q==="high"?"BEAUTIFUL":"NORMAL"));
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
/* ================= UPDATE LOG (garage &#128220; Update button) ================= */
const UPDATE_PAGES=[
{t:"Round 1 — Mobile, sea, sound, mountains, rockets & the Moon",h:`
<h4>\u{1F4F1} TABLET / MOBILE MODE</h4><ul>
<li>New <b>T &middot; CALL</b> button (calls train / bus / plane / rocket).</li>
<li>New <b>F &middot; IN/OUT</b> button (enter &amp; exit anything).</li></ul>
<h4>\u{1F30A} SEA WITH FISH</h4><ul>
<li>Big seas out in the world — never downtown, at airports or rocket pads.</li>
<li>Blue water surface that follows you + sandy sea floor.</li>
<li>Colorful fish that swim in circles and sometimes leap out of the water.</li>
<li>Roads crossing the sea become causeways just above the waves.</li></ul>
<h4>\u{1F50A} ENGINE SOUND FIXED</h4><ul>
<li>The ugly "vrm vrm" sawtooth is gone — now a deep smooth hum that follows your speed.</li></ul>
<h4>⛰️ MOUNTAINS + TUNNELS</h4><ul>
<li>Big ridged mountains are back (up to ~85 m).</li>
<li>Roads never climb over the peaks — they go through gray tunnel tubes.</li></ul>
<h4>\u{1F938} STUNTS + JUMP FIX</h4><ul>
<li>Speeding over a crest launches your car — capped, so you jump, not fly.</li>
<li>Stronger air gravity: no more hanging in the sky (car and on foot).</li></ul>
<h4>\u{1F680} ROCKETS &amp; THE MOON</h4><ul>
<li>Rocket stations every ~5 km in BOTH worlds. T calls a rocket — it flies in with fire.</li>
<li>F to board: huge smoke + fire, liftoff, world switch at 1000 m, retro-burn landing.</li>
<li>The Moon: endless yellow-gray dust, small holes, rocks, black starry sky, Earth above.</li>
<li>Astronaut suit with gold visor on the Moon. Low gravity — slow floaty jumps.</li>
<li>No vehicles on the Moon; your car stays on Earth.</li>
<li>Map buttons: \u{1F319} Go to the MOON / \u{1F30D} Back to EARTH; \u{1F680} pads on the map.</li></ul>
<h4>\u{1F3B5} BETTER MUSIC</h4><ul>
<li>8-bar C&ndash;G&ndash;Am&ndash;F progression: warm pad, soft bass, plucky arpeggio melody.</li></ul>`},
{t:"Round 2 — Louder, no water spawns, garage, McDrive, hunger",h:`
<h4>\u{1F50A} EVERYTHING LOUDER</h4><ul>
<li>Engine ~2.5&times;, music ~3&times;, horn, crash, siren and rocket rumble all turned up.</li></ul>
<h4>\u{1F30A} NOTHING SPAWNS IN WATER</h4><ul>
<li>Houses, shops, garages, containers, trees, cactuses, deer and camels all avoid the sea.</li></ul>
<h4>\u{1F17F}️ PARKING GARAGE FIXED</h4><ul>
<li>The ramp and floor are REAL surfaces — drive or walk up, drive underneath, fall off edges properly.</li></ul>
<h4>\u{1F354} McDRIVE EVERY ~500 M</h4><ul>
<li>Red building, yellow M sign, ORDER HERE board and its own little lane (never on the road).</li>
<li>Drive up &rarr; menu opens: nuggets (6/9/20), hamburger, cheeseburger, Big Mac, Coca Cola, Pepsi, apple juice, fries (S/M/L).</li>
<li>After ordering the car drives itself to the window, gets the food, and drives out — then you take over.</li></ul>
<h4>\u{1F392} FOOD BACKPACK</h4><ul>
<li>\u{1F392} Food button &rarr; pick an item &rarr; press <b>R</b> to eat (R &middot; EAT button in tablet mode).</li></ul>
<h4>\u{1F354} HUNGER BAR</h4><ul>
<li>Drains slowly: full &rarr; little hungry &rarr; hungry &rarr; STARVING!</li>
<li>Starving = 30-second countdown &rarr; you die and wake up at spawn.</li>
<li>Admin panel switch: \u{1F354} Hunger ON/OFF.</li></ul>`},
{t:"Round 3 — McDonald's on the map",h:`
<h4>\u{1F5FA}️ MAP MARKERS</h4><ul>
<li>Every McDrive shows as a red dot with a yellow <b>M</b> (zoom in a bit to see them).</li>
<li>The dots use the same rules as the world — every M on the map really exists.</li></ul>
<h4>\u{1F354} NEAREST McDRIVE BUTTON</h4><ul>
<li>New quick-travel button on the map that teleports you straight to the lane entrance of the closest McDrive.</li></ul>`},
{t:"Round 4 — Tunnel fix #1 + hotel apartments",h:`
<h4>\u{1F573}️ TUNNEL FIX #1</h4><ul>
<li>Tunnel pieces from neighbouring chunks now line up exactly — no more flickering double walls.</li>
<li>Long tunnels are built from short pieces that follow the road.</li></ul>
<h4>\u{1F3E8} APARTMENTS BECAME HOTELS</h4><ul>
<li>Walk into the ground-floor lobby through the front door.</li>
<li>Reception desk with a receptionist — press <b>T</b> to rent a room (free).</li>
<li>A bed to sleep in (skips the night + breakfast) and chairs you can really sit on (press T).</li></ul>`},
{t:"Round 5 — Tunnel fix #2, real rooms, Rented Rooms button",h:`
<h4>\u{1F573}️ TUNNEL FIX #2 (the big one)</h4><ul>
<li>Tunnels now BREAK at every road crossing — no more tunnels running through each other.</li>
<li>Curvy country roads don't get tubes anymore (those snaked through the others).</li></ul>
<h4>\u{1F6CF}️ REAL HOTEL ROOMS</h4><ul>
<li>The lobby now has ONLY the reception; bed, chairs and a table moved to a real room on the 1st floor.</li>
<li>Renting <b>teleports you up into your room</b>. You can't walk through the room walls.</li>
<li>Red EXIT mat: press T to go back down to the street.</li>
<li>Sleeping only works at night (after ~19:30).</li></ul>
<h4>\u{1F6CF} RENTED ROOMS BUTTON</h4><ul>
<li>Top-bar \u{1F6CF} Rooms button lists all your rooms and teleports you to them from anywhere.</li></ul>`},
{t:"Round 6 — Distances, destruction & rocket speed",h:`
<h4>\u{1F4CF} CALL DISTANCE</h4><ul>
<li>Calling a train / bus / plane / rocket shows how many meters away it is.</li>
<li>Live countdown in the hint bar while it comes: "\u{1F680} Rocket incoming — 312 m away".</li></ul>
<h4>\u{1F4A5} PLANES &amp; BUSES BREAK BUILDINGS</h4><ul>
<li>Drive the bus into a building &rarr; it collapses (bus bounces back).</li>
<li>Fly the plane low into a building &rarr; it collapses (plane smashes through at half speed).</li></ul>
<h4>\u{1F680} ADMIN ROCKET SPEED</h4><ul>
<li>New \u{1F680} target in the admin MAX SPEED panel — set how fast the rocket climbs (default 400 km/h).</li>
<li>The speedo's "limit" shows the rocket limit while you're aboard.</li></ul>`},
{t:"Round 7 — Minimap & routes, shop food, Squishy Dumplings, new animals",h:`
<h4>\u{1F9ED} MINIMAP + ROUTES</h4><ul>
<li>A round minimap in the bottom-left corner — the arrow is YOU and points where you're heading.</li>
<li>Click anywhere on the big map (or a quick button) and choose: ⚡ Teleport or \u{1F9ED} Route.</li>
<li>Routes are a blue line on the minimap and the big map — follow it to your destination!</li></ul>
<h4>\u{1F6D2} SHOPS SELL FOOD</h4><ul>
<li>Walk into any shop and press <b>T</b>: fruit, bread, milk, cereal, cheese, eggs and more.</li>
<li>Everything goes straight into your \u{1F392} food backpack (press R to eat).</li></ul>
<h4>\u{1F6D2} GIANT MEGA MARTS (one every ~3 km)</h4><ul>
<li>They fill a WHOLE CITY BLOCK — 100 m wide, 12 m tall, with 8 long shelf aisles.</li>
<li>Two entrances, checkout counters, roof pillars and TWO Squishy Dumpling stands.</li>
<li>Shops and MEGA MARTs now show on the map.</li></ul>
<h4>\u{1F95F} SQUISHY DUMPLINGS</h4><ul>
<li>MEGA MARTs sell Squishy Dumplings — surprise collectibles!</li>
<li>Open them in the \u{1F95F} Dumplings menu (next to \u{1F392} Food): 8 colors + RARE ✨ glitter ones.</li></ul>
<h4>\u{1F43E} MORE ANIMALS</h4><ul>
<li>Forest: deer, rabbits, foxes and bears. Plains: sheep, cows and horses. Desert: camels and rabbits.</li>
<li>The zoo got a giraffe pen.</li></ul>
<h4>\u{1F693} FASTER POLICE</h4><ul>
<li>Chasing police never drop below 150 km/h — and always go faster than you.</li></ul>
<h4>\u{1F4F7} AND MORE</h4><ul>
<li>Tablet mode: new \u{1F4F7} camera button (works like Q).</li>
<li>No more intersections or traffic lights inside tunnels and mountains.</li>
<li>The music is louder (sound effects unchanged).</li></ul>`},
{t:"Round 8 — Mansions, money, holding dumplings, your own world & more",h:`
<h4>\u{1F3F0} MEGA MANSIONS (one every ~2 km)</h4><ul>
<li>Giant houses with towers — walk in, press <b>T</b> at the reception to rent one for FREE.</li>
<li>Your mansion appears in the \u{1F6CF} Rooms menu, and on the map as a purple \u{1F3F0}.</li></ul>
<h4>\u{1F95F} HOLD &amp; DISPLAY DUMPLINGS</h4><ul>
<li>Click a dumpling in the \u{1F95F} Dumplings menu to hold it in your hands!</li>
<li>New button: display your dumplings on a table outside your mansion for everyone to see.</li></ul>
<h4>\u{1F4B0} MONEY + DUMPLING BUYERS</h4><ul>
<li>New \u{1F4B0} Money menu — don't worry, EVERYTHING is still free.</li>
<li>A dumpling buyer every ~500 m (pink dots on the map): press T to sell.</li>
<li>Quick-select: all / glitter only / normal only / by color (colors don't grab your glitters).</li>
<li>Normal $15 · Glitter $100 · Rainbow $30 · Gold $30 · Gold glitter $20 · GLITTER RAINBOW $250!</li>
<li>Reach $1,000 and your money text turns \u{1F308} RAINBOW forever!</li></ul>
<h4>\u{1F308} NEW DUMPLINGS</h4><ul>
<li>Rare RAINBOW and shiny GOLD dumplings — glitter rainbow is the rarest thing in the game.</li></ul>
<h4>\u{1F30D} CREATE YOUR OWN WORLD</h4><ul>
<li>Type a name in the garage and press Create — every name is its own world, far far away.</li></ul>
<h4>\u{1F4BE} YOUR PROGRESS IS SAVED</h4><ul>
<li>Money, dumplings, rooms, displays and your world survive a page refresh.</li></ul>
<h4>\u{1F680} FLY THE ROCKET YOURSELF</h4><ul>
<li>Board a rocket and choose "I'll fly it MYSELF" — up to 2000 km/h! F to land anywhere.</li></ul>
<h4>\u{1F319} DRIVE ON THE MOON</h4><ul>
<li>Moon buggies parked at every moon rocket station — press F to drive in low gravity.</li></ul>
<h4>\u{1F686} RAIL GATES</h4><ul>
<li>Level crossings got red-white gates that close when a train comes by.</li></ul>
<h4>\u{1F438} AND MORE</h4><ul>
<li>The minimap now rotates with you — your arrow always points up.</li>
<li>All animals have faces now; wild giraffes &amp; elephants roam the plains and forests.</li>
<li>Frogs and tadpoles swim in the sea. Tablet mode got a SHIFT pedal (plane descend).</li></ul>`},
{t:"Round 9 — Big money, buildings grow back, route distance",h:`
<h4>\u{1F4B0} BIG MONEY NUMBERS</h4><ul>
<li>Money now shows as K, M, B, T, QA, QI, SX and SP — get rich beyond counting!</li></ul>
<h4>\u{1F3D7}️ BUILDINGS GROW BACK</h4><ul>
<li>A smashed building pops back up 20 seconds after it collapses.</li></ul>
<h4>\u{1F9ED} DISTANCE TO GO</h4><ul>
<li>With a route set, a blue box above the minimap shows how far it is — in meters, then km.</li></ul>`},
{t:"Round 10 — Races, stunt parks, mega highway & big fixes",h:`
<h4>\u{1F3C1} RACES</h4><ul>
<li>Press <b>T</b> at the checkered RACE START flag (in every stunt park) — on foot or in your car.</li>
<li>Drive through 5 glowing blue checkpoints as fast as you can. The bottom-left box shows checkpoint, time and distance; the minimap points the way.</li>
<li>Finish fast = more money (up to $600)! Press T at the flag again to cancel.</li></ul>
<h4>\u{1F3A2} STUNT PARKS (one every ~3.6 km — on the map!)</h4><ul>
<li>Three launch ramps (small, medium, MEGA), a golden ring to jump through and containers to clear.</li>
<li>Ramps are REAL: drive up at speed and you actually launch into the air now.</li>
<li>Orange \u{1F3A2} markers on the map + a quick-travel button.</li></ul>
<h4>\u{1F6E3}️ THE MEGA HIGHWAY</h4><ul>
<li>A real 8-lane highway — 4 lanes each side with a double-yellow median.</li>
<li>One runs north–south, one east–west; lots of fast traffic; dark lines on the map + quick button.</li>
<li>Highway speed limit is 150 km/h (city stays ~120) — no more instant arrests.</li></ul>
<h4>\u{1F3F0} MANSION FIX</h4><ul>
<li>MEGA MANSIONS (and MEGA MARTS) got a solid stone foundation — no more floating.</li>
<li>The floor is a real surface now: you stand ON it instead of sinking through.</li></ul>
<h4>\u{1F354} HUNGER WARNINGS</h4><ul>
<li>Big pop-up messages when you get a little hungry, hungry, and STARVING.</li></ul>
<h4>\u{1F698} CRUISE CONTROL</h4><ul>
<li>Braking (S or Space) now switches the cruise control off, like in a real car.</li></ul>`},
{t:"Round 11 — Buy cars, garage & paint, gas, caves & random events",h:`
<h4>\u{1F4B0} CARS ARE LIMITED NOW — BUY THEM!</h4><ul>
<li>You start with a <b>Mazda MX-5</b>, a <b>KTM 390 Duke</b> and a <b>Gazelle CityGo</b>.</li>
<li>Every other car, motorcycle and bicycle has a price — earn money with dumplings, races, crystals and festivals.</li>
<li>Your money and your bought cars are saved <b>online on your username</b> — log in anywhere, keep everything.</li></ul>
<h4>\u{1F3ED} THE GARAGE SHOWCASE</h4><ul>
<li>Pick a car you own and you enter a showcase room — the car spins on a lit platform.</li>
<li>Paint it any of 16 colors, then hit <b>\u{1F697} DRIVE</b>. Your paint job is saved (other players see it too).</li></ul>
<h4>⛽ GAS STATIONS + FUEL</h4><ul>
<li>Cars &amp; motorcycles have a <b>699 km tank</b> — a fuel bar sits under the speedometer.</li>
<li>Run dry and the engine dies! Gas stations (green ⛽ sign, every ~840 m): stop and press <b>T</b> to fill up.</li></ul>
<h4>\u{1F573}️ CAVES</h4><ul>
<li>Cave mouths on the mountains — walk up and press <b>T</b> to step inside.</li>
<li>Stalagmites, torches and 3 glowing crystals worth $25 each. Press T to go back out.</li></ul>
<h4>\u{1F6A7} RANDOM EVENTS</h4><ul>
<li><b>Road construction</b>: cones, a digger and a barrier — you must slow down to pass.</li>
<li><b>Accidents</b>: crashed cars with flashing police on site — crawl past carefully.</li>
<li><b>Festivals</b>: a stage with balloons pops up nearby — visit on foot for <b>$50</b>!</li></ul>
<h4>\u{1F697} REALISTIC VEHICLES</h4><ul>
<li>Cars: wheel arches, skirts, splitters, exhausts — supercars get a rear wing.</li>
<li>Motorcycles got fairings &amp; windscreens, bikes real frames &amp; pedals, buses AC units &amp; stripes, trains a pantograph, planes winglets and rockets landing legs + grid fins.</li></ul>`},
{t:"Round 12 — The big realism glow-up",h:`
<h4>\u{1F333} REAL TREES &amp; BUSHES</h4><ul>
<li>Leafy trees now have lumpy multi-blob crowns in 5 shades of green, dark triple-cone pines, tapered trunks — and every tree is rotated differently.</li>
<li>Bushes are proper shrubs made of overlapping blobs in two shades.</li></ul>
<h4>\u{1F9CD} REAL PEOPLE</h4><ul>
<li>Everyone has a face now: eyes and a nose, plus a neck, rounded shoulders, sleeves, swinging hands and real shoes.</li>
<li>More pants and hair colors for variety.</li></ul>
<h4>\u{1F3E0} REAL HOUSES &amp; SHOPS</h4><ul>
<li>Houses got framed cross-bar windows (front and sides), a brick chimney, a doorstep and varied roof colors.</li>
<li>Shops got glass storefronts and a colored awning over the door.</li></ul>
<h4>\u{1F697} REAL WHEELS</h4><ul>
<li>Every wheel has a six-spoke rim, a center cap and a rim ring — and you can see them spin.</li>
<li>Cars gained roof pillars around the glass cabin, license plates and door handles.</li></ul>
<h4>\u{1F305} SOFTER LIGHT</h4><ul>
<li>Soft-edged shadows (PCF soft shadow maps) make everything look less \"cut out\".</li></ul>`},
{t:"Round 13 — Museums, concerts, pianos & YOUR mansion",h:`
<h4>\u{1F3DB} DUMPLING MUSEUMS (one every ~1 km — on the map!)</h4><ul>
<li>Walk in and admire the legendary <b>RAINBOW GLITTER dumpling</b> spinning in its glass case.</li>
<li>Press <b>T</b> inside to buy one for <b>$300</b> — the rarest dumpling, guaranteed.</li></ul>
<h4>\u{1F3B5} CONCERT HALLS (one every ~2.4 km — on the map!)</h4><ul>
<li>A real stage with red curtains, spotlights, rows of seats and a <b>piano on the podium</b>.</li>
<li>Press T at the piano, then hit <b>\u{1F3AD} Play piano</b> — a whole crowd walks in and sits down to hear you!</li></ul>
<h4>\u{1F3B9} REAL PIANOS + MIDI</h4><ul>
<li>Play with your mouse, your computer keyboard (A W S E D F T G Y H U J K...) or plug in a real <b>MIDI keyboard</b>!</li></ul>
<h4>\u{1F3F0} MANSIONS ARE YOURS NOW — $2M</h4><ul>
<li>The reception moved <b>outside</b>, in front of the entrance — a mansion costs <b>$2,000,000</b>.</li>
<li>Every mansion got a <b>garden</b>: lawn, hedges, a stone path and flowers.</li></ul>
<h4>\u{1F6E0} MANSION EDITOR (press T inside your mansion)</h4><ul>
<li>A furniture shop appears at the bottom of your screen — click an item, then click where to put it. R rotates, \u{1F5D1} removes (full refund).</li>
<li>Indoors: beds, chairs, couches, tables, closets, lamps, TVs, plants, rugs — and <b>pianos you can really play</b>.</li>
<li>In the garden: <b>trampolines</b> (walk on = BOING!), <b>in-ground swimming pools</b>, fountains, BBQs, benches, swings, trees &amp; flowers.</li>
<li>You can move or replace your bed and chairs too — everything is saved.</li></ul>
<h4>\u{1FA91} SITTING FIXED</h4><ul>
<li>You no longer sit facing the wrong way — legs bend forward like a real person.</li></ul>`},
{t:"Round 14 — Concert money, buy OR rent, one owner per house & shared time",h:`
<h4>\u{1F51A} END THE CONCERT — AND GET PAID!</h4><ul>
<li>Press T at the concert piano and hit <b>\u{1F51A} End the concert</b>: the whole crowd stands up, CLAPS, drops money in the \u{1F3A9} hat next to the piano and walks out.</li>
<li>Press <b>T</b> at the hat to collect your earnings — bigger crowd, bigger tips!</li></ul>
<h4>\u{1F3B9} CONCERT PIANOS LOCK</h4><ul>
<li>While a player gives a concert, <b>nobody else can play that piano</b> — it unlocks the moment they end the concert.</li></ul>
<h4>\u{1F4B0} BUY <i>OR</i> RENT YOUR HOME</h4><ul>
<li>Apartment room: <b>BUY $100K</b> (forever) or <b>RENT $100 per day</b>.</li>
<li>MEGA MANSION: <b>BUY $2M</b> or <b>RENT $1K per day</b>.</li>
<li>Rent is charged every new game day — run out of money and you LOSE the place!</li></ul>
<h4>\u{1F512} ONE OWNER PER HOUSE (online)</h4><ul>
<li>On servers, claiming an apartment or mansion locks it for everyone else — the reception tells you who owns it.</li>
<li>Your claims follow your username, so the same place is yours on any device.</li></ul>
<h4>⏰ SHARED SERVER TIME</h4><ul>
<li>On a server, every player sees the exact same clock, day and night — sunset happens for everyone at once.</li>
<li>(That also means sleeping can't skip the night on servers — you still get breakfast!)</li></ul>
<h4>\u{1F389} FESTIVALS END PROPERLY</h4><ul>
<li>When a festival is over, the visitors walk off and go home instead of partying forever.</li></ul>`},
{t:"Round 15 — Accounts with passwords, paying players & your avatar",h:`
<h4>\u{1F511} REAL ACCOUNTS: USERNAME + PASSWORD</h4><ul>
<li>Choosing a username now needs a <b>password</b> — click <b>\u{1F195} Register</b> to create a new account or <b>▶ Log in</b> on any device.</li>
<li>Your money, cars and houses follow your account everywhere. Passwords are stored online as a secure hash, never as plain text.</li>
<li>In ⚙ <b>Settings</b> you can view your password (\u{1F441} eye button) and change it (Save).</li>
<li>Old accounts from before passwords: open the game on the original device and set a password in Settings.</li></ul>
<h4>\u{1F4B8} PAY OTHER PLAYERS</h4><ul>
<li>Click a player on the map (or open the \u{1F4B0} Money menu) and choose <b>\u{1F4B8} Send money</b>: $10, $100, $1K, $10K or any amount.</li>
<li>The money lands in their online inbox — they get it within seconds, even mid-game, with a message saying who sent it.</li></ul>
<h4>\u{1F9CD} AVATAR EDITOR</h4><ul>
<li>In ⚙ Settings: pick your <b>shirt, pants, hair and skin</b> colors — your character updates instantly.</li>
<li>Other players see your look too: your avatar is broadcast along with your position.</li></ul>`},
{t:"Round 16 — Jobs, pets, multiplayer races & visiting mansions",h:`
<h4>\u{1F4BC} JOBS (new top-bar button!)</h4><ul>
<li>\u{1F696} <b>Taxi driver</b>: pick up passengers, drop them at the beacon — fare grows with distance.</li>
<li>\u{1F35F} <b>Food delivery</b>: grab 3 meals at a McDrive, deliver them in 5 minutes — $40 each + $80 bonus.</li>
<li>\u{1F69B} <b>Tow truck</b>: hook up crashed cars at accidents and tow them to the garage — $150 per wreck.</li>
<li>Follow the blue route to the orange beacon; press \u{1F4BC} Jobs again to end your shift.</li></ul>
<h4>\u{1F465}\u{1F3C1} MULTIPLAYER RACES</h4><ul>
<li>Press T at a race flag → <b>MULTIPLAYER race</b>: $100 entry, starts 30 s later, everyone at the flag can join.</li>
<li>Same checkpoints for everyone — <b>first to finish takes the whole pot!</b></li></ul>
<h4>\u{1F3F0} VISIT OTHER PLAYERS' MANSIONS</h4><ul>
<li>Walk into a claimed mansion and see the owner's <b>real furniture</b>, exactly how they placed it.</li>
<li>\u{1F514} Ring the doorbell, \u{1F4D6} read &amp; ✍️ write in the <b>guest book</b>.</li>
<li>\u{1F6D2} Open a <b>dumpling shop</b> at your mansion ($2,000, you set the price) — buyers' money lands in YOUR inbox!</li>
<li>Your 3 fastest cars park on your driveway for everyone to admire.</li></ul>
<h4>\u{1F436} PETS</h4><ul>
<li>MEGA MARTs sell puppies ($500) and kittens ($400) — they follow you everywhere, bouncing along.</li></ul>
<h4>\u{1F4B0} MORE ECONOMY</h4><ul>
<li>\u{1F381} <b>Daily reward</b>: $100 × your streak (up to $1,000) — come back every day!</li>
<li>\u{1F3B0} <b>Scratch cards</b> at gas station kiosks: $50 a card, win up to $5,000.</li>
<li>\u{1F4B5} <b>Sell cars back</b> for 70% in the garage (starter cars excluded).</li>
<li>\u{1F3E8} Owned apartments earn <b>$25/day</b> from tenants.</li>
<li>\u{1F381} <b>Gift dumplings</b> to other players; concerts pay <b>double, triple, more</b> when real players watch!</li>
<li>⭐ <b>Friends</b>: star a player — gold on the map, top of the list.</li></ul>`},
{t:"Round 17 — Big graphics glow-up, real music, weather & auto-drive",h:`
<h4>\u{1F31F} MUCH NICER GRAPHICS</h4><ul>
<li>Filmic tone mapping + sRGB colors: richer light, warmer sunsets, deeper shadows.</li>
<li><b>Real grass</b>: a detailed grass texture on the ground + thousands of little 3D grass tufts.</li>
<li><b>Shinier cars</b>: real specular paint and glossy glass instead of flat plastic.</li>
<li>Graphics quality setting: ⚡ Fast (no shadows, great for slow devices) / Normal / ✨ Beautiful.</li></ul>
<h4>\u{1F3B5} REAL MUSIC</h4><ul>
<li>The game now plays the real songs from the Music folder in a random shuffle (\u{1F3B5} toggle in Settings).</li></ul>
<h4>\u{1F327} WEATHER</h4><ul>
<li>Rain (wet roads = less grip!), fog banks, and ❄️ SNOW in December — everyone on a server gets the same weather.</li></ul>
<h4>\u{1F916} AUTO-DRIVE</h4><ul>
<li>New \u{1F916} Auto button: your car drives itself at ~50 km/h and stops at red lights.</li>
<li>Every 3rd crossing it asks <b>⬅ ⬆ ➡</b> (it even talks!) — don't choose and it picks itself. Steer to take over.</li></ul>
<h4>\u{1F3F4}‍☠️ DAILY TREASURE HUNT</h4><ul>
<li>Every day a treasure chest hides somewhere — same spot for everyone on a server.</li>
<li>Use the map hint, follow the HOT/COLD messages — first finder gets <b>$2,000</b>, later finders $250.</li></ul>
<h4>\u{1F3C6} ACHIEVEMENTS</h4><ul>
<li>15 achievements worth $250 each — from "Road tripper" to the glitter rainbow dumpling.</li></ul>
<h4>\u{1F50A} BETTER SOUNDS</h4><ul>
<li>New smooth two-tone \u{1F693} siren (no more screech), softer deeper crash, rounder horn.</li>
<li>Every car honks a little differently — and <b>traffic cars now honk by themselves</b> in jams!</li></ul>
<h4>⚙️ EFFECT SWITCHES</h4><ul>
<li>Settings: turn police, crash sound, honks, engine sound, sirens and weather ON/OFF separately.</li></ul>
<h4>\u{1F4F7} PHOTO MODE + \u{1F383} SEASONS</h4><ul>
<li>\u{1F4F7} Photo button: hides the HUD and saves a screenshot to your downloads.</li>
<li>\u{1F383} Pumpkin dumplings in October, ❄️ Snowy dumplings in December (worth $40!).</li></ul>
<h4>\u{1F41B} BUG FIXES</h4><ul>
<li>Animals & people no longer twitch/spin at road edges — they turn smoothly and commit to a direction.</li>
<li>Glitching/flickering roads fixed: every road layer got its own height.</li>
<li>Faster: quality setting reduces load, fewer freeze spikes.</li></ul>`},
{t:"Round 18 — FERRY ISLANDS \u{1F3DD}⛴",h:`
<h4>\u{1F3DD} REAL ISLANDS IN THE SEA</h4><ul>
<li>The deep sea now has <b>islands</b> — sandy beaches, palm trees with coconuts, beach chairs & parasols, and \u{1F980} crabs scuttling on the sand.</li>
<li>Every island has a <b>LIGHTHOUSE</b> with a rotating light beam you can spot from the mainland at night.</li>
<li>Cyan \u{1F3DD} markers on the map + a "Nearest FERRY ISLAND" quick button.</li></ul>
<h4>⛴ THE CAR FERRY</h4><ul>
<li>A real ferry sails between every island and the nearest shore — wooden piers on both sides.</li>
<li><b>Walk or DRIVE YOUR CAR onto the deck</b> while it's docked, and sail across with it. The deck even bobs on the waves!</li>
<li>The ferry runs on the shared clock: on a server, everyone sees it at the exact same spot.</li></ul>
<h4>\u{1FAA9} PEARL DUMPLINGS (island exclusive!)</h4><ul>
<li>The \u{1F3D6} beach shop sells shimmering <b>PEARL dumplings</b> ($35, worth $60 — glitter pearls $180!) and \u{1F965} coconut drinks.</li>
<li>You can ONLY get pearls on islands — show them off on your mansion display table!</li></ul>
<h4>⛏️ X MARKS THE SPOT</h4><ul>
<li>Every island hides a buried-treasure <b>X</b> on the beach — press T to dig: $150 + a chance of a buried pearl. The sand refills every night!</li></ul>`},
{t:"Round 19 — Beach dumpling collection & REAL walls",h:`
<h4>\u{1F41A} 20 BEACH DUMPLINGS TO COLLECT</h4><ul>
<li>The island beach shop now sells <b>beach dumplings</b> — 20 different ones: Coral, Wave, Lagoon, Sunset, Shell, Starfish, Palm, Coconut, Sandy, Ocean, Seaweed, Dolphin, Sunrise, Tide, Reef, Breeze, Shark, Salty, Tropic and Captain!</li>
<li>\u{1F381} A <b>FREE mystery beach dumpling</b> — one per island per day. Island-hop to fill your collection!</li>
<li>The shop shows your progress: collect all <b>20 / 20</b>!</li></ul>
<h4>\u{1F4B0} MONEY GLITCH FIXED</h4><ul>
<li>Pearl (and beach) dumplings now sell for $25 — <b>below</b> the $35 shop price, so buying-and-selling no longer prints money. Glitter ones still sell for $90!</li></ul>
<h4>\u{1F9F1} REAL WALLS</h4><ul>
<li>You can't walk through the walls of shops, MEGA MARTs, museums, concert halls, mansions and hotel lobbies anymore — use the door like a normal person!</li></ul>`},
{t:"Round 20 — House fires, ambulances & LIVE TV news",h:`
<h4>\u{1F525}\u{1F692} HOUSE FIRES + FIRE TRUCKS</h4><ul>
<li>New random event: a house catches <b>FIRE</b> — flickering flames and smoke pouring from the roof (\u{1F525} on the map).</li>
<li>A <b>fire truck races to the scene</b>, parks, and sprays a real arc of water onto the flames until the fire is out.</li></ul>
<h4>\u{1F691} AMBULANCES AT ACCIDENTS</h4><ul>
<li>Every accident now gets an <b>ambulance</b> that drives in with flashing lights and takes care of the patients.</li></ul>
<h4>\u{1F4FA} LIVE CITY NEWS ON YOUR TV</h4><ul>
<li>The TV in your mansion <b>actually broadcasts the news</b> — real, live stories from your world:</li>
<li>\u{1F389} festivals starting · \u{1F6A8} accidents · \u{1F525} house fires (and when they're put out) · \u{1F308}✨ players opening rainbow glitter dumplings · \u{1F3F4}‍☠️ treasure finds · \u{1F3C1} race wins · \u{1F3B9} concerts · \u{1F694} police arrests!</li>
<li>Headlines rotate every few seconds with a proper news banner and ticker. Buy a TV ($800) in the mansion editor and stay informed!</li></ul>`},
{t:"Round 21 — \u{1F47D} ALIENS ON THE MOON",h:`
<h4>\u{1F6F8} ALIEN SPACESHIPS (one every ~1000 km!)</h4><ul>
<li>Somewhere on the endless Moon, alien saucers have landed: shiny metal, a glowing green dome, blinking rim lights and a landing ramp.</li>
<li>A crew of \u{1F47D} little green aliens with big black eyes moonwalks around the ship.</li>
<li>Glowing green <b>moon crystals</b> near every ship — walk into them for $100 each.</li></ul>
<h4>\u{1F4B0} ROB THE SPACESHIP</h4><ul>
<li>Press <b>T</b> at a spaceship: rob the vault for <b>$10,000</b> + a rare <b>ALIEN dumpling worth $1,000</b> (glitter aliens: $2,500!).</li>
<li>But beware: the aliens get ANGRY and <b>chase you</b> — get caught and they zap back $5,000! After a robbery the vault re-locks for <b>30 minutes</b>.</li></ul>
<h4>\u{1F6AB} NO TELEPORTING</h4><ul>
<li>The aliens JAM teleporters near their ships — the map's "\u{1F6F8} Nearest ALIEN spaceship" button only sets a <b>route</b>. Fly your rocket and follow the line: a true expedition!</li></ul>
<h4>\u{1F698} RIDE ALONG WITH FRIENDS</h4><ul>
<li>Walk up to another player's car (or motorcycle) and press <b>F</b> — you hop into the <b>passenger seat</b> and ride wherever they drive!</li>
<li>They see you sitting in the car, name tag and all. Press F anytime to hop out.</li></ul>`},
{t:"Round 22 — A REAL TV with channels & videos \u{1F4FA}",h:`
<h4>\u{1F4FA} PRESS T AT YOUR TV — PICK A CHANNEL!</h4><ul>
<li><b>⛏ Channel 1 — 3 Minute Minecraft (3MM)</b>: 8 real videos! Pick one and watch it ON the TV in your mansion — when it ends, the next one plays automatically. The sound gets louder as you walk closer.</li>
<li><b>\u{1F4F0} Channel 2 — CITY NEWS</b>: live stories from your world.</li>
<li><b>\u{1F525} Channel 3 — The Cozy Fireplace</b>: crackling animated flames.</li>
<li><b>\u{1F420} Channel 4 — The Aquarium</b>: fish, seaweed and bubbles.</li>
<li><b>⏻ Turn the TV OFF</b> when it's bedtime.</li></ul>
<h4>\u{1F4F0} SMARTER NEWS</h4><ul>
<li>News stories don't repeat anymore — each story plays exactly <b>once, for 5 seconds</b>.</li>
<li>No news? The TV shows real black &amp; white <b>static</b>, just like an old telly.</li></ul>`},
{t:"Round 23 — Food delivery, YOUR music at concerts & next-level looks",h:`
<h4>\u{1F6F5} ORDER FOOD TO YOUR HOME</h4><ul>
<li>In your apartment room (press T) or mansion (T → \u{1F354} Order food): choose <b>McDrive</b> (the full menu!), <b>MEGA MART boxes</b> or <b>Squishy Dumplings by amount</b> ($12 each).</li>
<li>A courier on a pink moped drives to your front door and <b>\u{1F514} RINGS THE DOORBELL</b> — go out, pay, and take your order!</li>
<li>Take too long (3 minutes) and the courier drives off with your food...</li></ul>
<h4>\u{1F3B9}\u{1F4C2} PLAY YOUR OWN .MID FILES</h4><ul>
<li>At any piano: <b>\u{1F4C2} Play a .MID file</b> — upload a real MIDI song and the piano performs it live, tempo changes and all!</li>
<li>Combine it with a concert: call the crowd, play your favourite song, collect the tips. ⏹ Stop anytime.</li></ul>
<h4>\u{1F306} NEXT-LEVEL GRAPHICS</h4><ul>
<li>A real <b>gradient sky dome</b>: deep blue overhead melting into a glowing horizon — sunsets are now stunning.</li>
<li>The sea <b>glints in the sunlight</b> (real specular water).</li>
<li><b>Realistic car lights</b>: brake lights flare bright red, reverse lights glow white, and at night every car (traffic too!) casts visible <b>headlight beams</b>.</li>
<li>Cars got <b>interiors</b>: seats and a steering wheel you can see through the glass.</li>
<li>All of it is light on the GPU — smooth on the ⚡ Fast setting too.</li></ul>`},
{t:"Round 24 — Helicopters, volcanoes, leaderboards & tuning \u{1F681}\u{1F30B}",h:`
<h4>\u{1F681} YOUR OWN HELICOPTER — $500,000</h4><ul>
<li>New \u{1F681} Heli button: buy it once, summon it anywhere on Earth. W/S speed, A/D turn, SPACE up, SHIFT down, F to land — <b>land it anywhere</b>, even on rooftops and decks.</li>
<li>Other players see you flying it, spinning rotors and all!</li></ul>
<h4>☁️ SKY RESTAURANTS</h4><ul>
<li>On the tallest mountain peaks: a platform with a helipad, tables with a VIEW, fancy meals — and the exclusive <b>☁️ CLOUD dumpling</b> ($100, worth $80 / glitter $240).</li></ul>
<h4>\u{1F30B} VOLCANO ISLANDS</h4><ul>
<li>Rare smoking volcano islands out at sea — and they <b>ERUPT on the shared clock</b>: lava fountains, glowing crater, smoke, breaking news!</li>
<li>Get caught on the cone during an eruption and the blast throws you to the shore.</li>
<li>Between eruptions: press T at the crater to mine <b>LAVA dumplings</b> ($120, glitter $300) — one scoop per 10 minutes.</li></ul>
<h4>\u{1F3C5} WEEKLY LEADERBOARD</h4><ul>
<li>\u{1F4B0} Money menu → <b>WEEKLY LEADERBOARD</b>: the top 10 richest players, resets every week.</li>
<li>The #1 player wears a <b>\u{1F451} golden crown</b> that everyone can see in the world!</li></ul>
<h4>\u{1F3CE} CAR TUNING 2.0</h4><ul>
<li>In the garage: add a <b>spoiler</b>, glowing <b>neon underglow</b> (4 colors), colored <b>rims</b>, <b>racing stripes</b> and your own <b>license plate text</b>!</li></ul>
<h4>\u{1F91D} CO-OP JOBS</h4><ul>
<li>Take a REAL player along in your passenger seat while working — <b>every job pays DOUBLE</b>!</li></ul>
<h4>\u{1F54A} EVEN MORE REALISTIC</h4><ul>
<li>Birds circle in the daytime sky · golden-hour sunlight turns warm and orange at sunrise & sunset.</li>
<li>The camera <b>widens at speed</b> and the <b>wind rushes</b> louder the faster you go.</li></ul>`},
{t:"Round 25 — ⚽ WORLD CUP on TV & pick-your-news",h:`
<h4>⚽ NEW CHANNEL: WORLD CUP SOCCER</h4><ul>
<li><b>7 matches</b> to choose from: Spain (LAMINE YAMAL) vs Portugal (RONALDO), France (MBAPPÉ) vs Argentina (MESSI), Brazil (NEYMAR) vs England (KANE), Germany (MUSIALA) vs Netherlands (GAKPO)... and the \u{1F3C6} <b>FINAL</b>!</li>
<li>Live on your TV: a real animated pitch, both teams in their country colors, the star player with a golden ring, passes, shots, <b>SAVES and GOOOALS</b> with crowd cheers!</li>
<li>90 minutes of match in ~2.5 real minutes — full time shows the result, then the next match kicks off automatically.</li></ul>
<h4>\u{1F4F0} PICK YOUR NEWS</h4><ul>
<li>Choosing the news channel now shows a <b>list of stories</b> — pick the one YOU want on screen, or \u{1F4E1} LIVE mode for the newest.</li>
<li>Every story stays available for <b>5 real minutes</b> before it expires.</li></ul>
<h4>\u{1F304} A CALMER CITY</h4><ul>
<li>Random events (house fires, road construction, accidents, festivals) happen <b>less often</b> — special, not constant.</li></ul>
<h4>\u{1F6E9} RENT A PLANE — $250/DAY</h4><ul>
<li>At any ✈️ airport terminal: <b>RENT a plane</b> and fly it YOURSELF (no admin needed) — W/S speed, A/D turn, Space climb, Shift descend.</li>
<li>$250 is charged every game day; return the rental at any terminal.</li></ul>
<h4>✨ REALISM PACK</h4><ul>
<li><b>Reflective car paint</b>: metallic bodywork and glass now mirror the sky around them.</li>
<li><b>License plates fixed</b> — they sit ON the bumpers now instead of hiding inside them (your custom plate too!).</li>
<li>The sun got a real <b>glare halo</b>, every vehicle casts a soft <b>contact shadow</b>, and roads got a detailed surface with wheel-wear tracks and cracks.</li></ul>`},
{t:"Round 26 — Clouds, fishing, build-your-house & police career",h:`
<h4>☁️ SKY RESTAURANTS FLOAT ON CLOUDS NOW</h4><ul>
<li>They're no longer stuck on rare mountain peaks — every ~5 km a restaurant floats on a <b>fluffy cloud at 150 m</b>, so there's ALWAYS one near you.</li>
<li>The map button lets you <b>⚡ teleport straight up into the clouds</b> — or set a route and fly there with your \u{1F681}. Just don't step off the edge!</li></ul>
<h4>\u{1F3A3} FISHING</h4><ul>
<li>Buy a <b>fishing rod ($200)</b> at any MEGA MART. Stand at the water's edge, press T to cast, wait for the ❗ and press T FAST!</li>
<li>8 catches from Sardine to Swordfish, a soggy \u{1F462} old boot... and the legendary <b>\u{1F31F} GOLDEN FISH worth $500</b>.</li>
<li>Check your \u{1F4D6} fish log at any island beach shop.</li></ul>
<h4>\u{1F3D7} BUILD YOUR OWN HOUSE</h4><ul>
<li>Empty fenced plots FOR SALE every ~1.6 km — <b>$50,000</b> and the land is yours!</li>
<li>Press T inside your fence: the editor now sells \u{1F9F1} <b>walls, \u{1FA9F} window walls, \u{1F6AA} door walls, \u{1F6D6} roof panels and floors</b> — design any house you like, plus all the normal furniture!</li>
<li>Your build is saved online — friends can visit it, exactly how you made it.</li></ul>
<h4>\u{1F46E} POLICE CAREER</h4><ul>
<li>New job: <b>POLICE OFFICER</b> — your car transforms into a real cruiser with flashing lights!</li>
<li>Radio callouts send you after black getaway cars racing through the city — stay close to <b>BUST</b> them: $200 per arrest (co-op x2!).</li></ul>
<h4>\u{1F681} RENT A HELICOPTER — $500/DAY</h4><ul>
<li>The \u{1F681} Heli button now offers a REAL rental helicopter for $500 a day if $500K is too steep — summon it and fly, just like an owned one.</li></ul>
<h4>\u{1F3DC} PRETTIER WORLD & SIMPLER LOGIN</h4><ul>
<li>The desert got wind-rippled sand, golden dry grass and red rocks; grasslands got natural light-and-dark patches.</li>
<li>Passwords are GONE — just pick a username and play!</li></ul>`},
{t:"Round 27 — Cloud collection, keep your fish & better police chases",h:`
<h4>☁️ SIX CLOUD DUMPLINGS TO COLLECT</h4><ul>
<li>Sky restaurants now sell <b>mystery cloud dumplings</b> — 6 different ones: Cloud, Storm, Sunset, Sunrise, Star and \u{1F308} Rainbow cloud!</li>
<li>Shop menus at the ☁️ sky restaurant and \u{1F3D6} beach shop <b>stay open</b> while you buy — shop till you drop.</li></ul>
<h4>\u{1F3A3} KEEP YOUR CATCH</h4><ul>
<li>Catching a fish now gives you the choice: \u{1F4B5} <b>SELL it</b> for money, or \u{1F392} <b>KEEP it</b> in your food backpack and eat it later (press R). Fresh fish fills you up!</li></ul>
<h4>\u{1F46E} POLICE CHASES THAT WORK</h4><ul>
<li>The blue <b>map route now follows the thief live</b> on the minimap and big map.</li>
<li>Thieves <b>panic and slow down</b> when you get close — drive into the circle and a 3-2-1 arrest countdown busts them properly.</li></ul>
<h4>\u{1F3D7} PLOTS ON THE MAP</h4><ul>
<li>Building plots now show as green \u{1F3D7} dots on the map, plus a "Nearest building PLOT for sale" quick button.</li></ul>`},
{t:"Round 28 — POOL PARKS, trucking, pet tricks & a living city",h:`
<h4>\u{1F3CA} PUBLIC POOL PARKS (every ~2 km, on the map!)</h4><ul>
<li>Mega-mansion-sized parks with a giant pool you can <b>REALLY SWIM in</b> — jump in and your player paddles with real swim strokes!</li>
<li>A twisting \u{1F6DD} <b>WATERSLIDE</b> (press T at the tower — hands in the air, SPLASH into the pool), a bubbling <b>♨️ hot tub</b>, a kiddie pool, a diving board and sun loungers.</li>
<li>Garden pools at your mansion are swimmable now too!</li></ul>
<h4>\u{1F4E6} NEW JOB: TRUCKER</h4><ul>
<li>Your car becomes a <b>BIG RIG with a cargo container</b> — collect at MEGA MART depots, haul across the city, longer routes pay more.</li>
<li>Drive smoothly: every crash <b>dents the cargo</b> and costs 20% of the pay!</li></ul>
<h4>\u{1F43E} PET TRICKS & THE PARROT</h4><ul>
<li><b>Name your pet</b>, and press T next to it for tricks: \u{1FA91} Sit, \u{1F300} Spin and ✋ High-five!</li>
<li>Dogs & cats <b>dig up bones ($25)</b> on island beaches. New pet: the \u{1F99C} <b>PARROT ($600)</b> — it rides on your SHOULDER!</li></ul>
<h4>\u{1F694} POLICE SIREN AUTO-ON</h4><ul>
<li>The moment the radio calls out a speeder on your police shift, <b>YOUR siren wails automatically</b> — wee-woo all the way!</li></ul>
<h4>\u{1F3D9} A LIVING, REALISTIC CITY</h4><ul>
<li>A real <b>downtown skyline</b>: tall towers with antennas and blinking warning lights.</li>
<li><b>Street furniture everywhere</b>: fire hydrants, mailboxes and trash bins — plus <b>cars parked along the curbs</b>.</li>
<li>Houses got wooden <b>siding texture</b> instead of flat plastic walls.</li>
<li><b>Living sound</b>: a soft city hum, \u{1F426} birdsong in the day, \u{1F997} crickets at night.</li></ul>`},
{t:"Round 29 — SOLID cars, \u{1F451} world owners, kick & ban, your own private city",h:`
<h4>\u{1F697} EVERY CAR IS SOLID NOW</h4><ul>
<li>Traffic cars, other players' cars and even the parked cars along the curb — you <b>bump into them, never through them</b>, whether you're driving or walking.</li></ul>
<h4>\u{1F3E0} YOUR OWN PRIVATE CITY</h4><ul>
<li>The default city is <b>not a shared server anymore</b> — it's automatically YOUR own private world. Nobody else spawns there; join a \u{1F310} server or a friend's world to play together.</li></ul>
<h4>\u{1F451} WORLD OWNERS</h4><ul>
<li>Every server in the \u{1F310} Servers tab now shows <b>who created it</b>, right under the name.</li>
<li>The creator is the OWNER — and you're always the owner of your own city and the worlds you create.</li>
<li>Owners can <b>change the DAY &amp; TIME for everyone</b> in the ⚙ Rules panel (\u{1F305} morning, ☀️ noon, \u{1F307} evening, \u{1F319} night, \u{1F4C5} next day).</li>
<li>Owners can <b>\u{1F462} KICK</b> players, <b>⏳ BAN them for a day</b> or <b>\u{1F528} BAN FOREVER</b> — open the \u{1F5FA} map and click their name. Unban from the Rules panel.</li></ul>
<h4>\u{1F6E0} ADMIN REMOVED</h4><ul>
<li>The old admin panel (speed boosts, driving the train/plane/bus, traffic count) is gone.</li>
<li>Only two switches remain in the ⚙ Rules panel: \u{1F46E} <b>Police chases ON/OFF</b> and \u{1F354} <b>Hunger ON/OFF</b>.</li></ul>`},
{t:"Round 30 — 200+ new vehicles, tune EVERYTHING, light theme & unrenting",h:`
<h4>\u{1F697} 200+ NEW VEHICLES</h4><ul>
<li><b>50+ new cars</b> — from the Bugatti Tourbillon and Koenigsegg Regera to the Toyota AE86.</li>
<li><b>50+ new motorcycles</b> (BMW M1000RR, Ducati Superleggera V4, Vespa GTS...) and <b>50+ new bicycles</b>.</li>
<li>Campers are <b>real models from real brands</b> now: Volkswagen California, Hymer, Airstream, Winnebago, Morelo... 60+ of them! (Your old campers automatically became their real-brand versions.)</li></ul>
<h4>\u{1F527} TUNE EVERY VEHICLE</h4><ul>
<li>The garage customization isn't just for cars anymore: <b>motorcycles, bicycles and campers</b> get neon, colored rims, stripes and (where it makes sense) a license plate.</li>
<li>The <b>spoiler works on EVERY car</b> now — and motorcycles can get one too. Campers and bicycles stay spoiler-free (sorry).</li></ul>
<h4>☀️ LIGHT &amp; DARK THEME</h4><ul>
<li>New <b>Theme switch in ⚙ Settings</b>: the whole UI in \u{1F319} dark (as always) or a fresh ☀️ light look. Your choice is remembered.</li></ul>
<h4>\u{1F6AA} UNRENT YOUR PLACE</h4><ul>
<li>You can <b>give back a rented or bought mansion / apartment</b>: press T at the reception, or use the \u{1F6AA} Unrent button in \u{1F6CF} Rooms.</li>
<li>Everything YOU placed gets deleted — only the default furniture stays.</li></ul>
<h4>\u{1F4B8} FINES GO INTO THE MINUS</h4><ul>
<li>Can't afford a fine? It gets paid anyway — your money can go <b>negative</b> now (it shows red). Earn it back!</li></ul>
<h4>\u{1F3AF} TIGHTER HITBOXES</h4><ul>
<li>Cars, houses, apartments and mansions have <b>much tighter hitboxes</b> — no more crashing into invisible walls a meter from the building.</li></ul>
<h4>\u{1F6EB} NEW STARTER VEHICLES</h4><ul>
<li>You now start with the <b>SLOWEST</b> of each type: the Toyota AE86, Vespa GTS 300, Cortina U4 Transport — and a free Citroen Type H WildCamp camper!</li>
<li>The Mazda MX-5, KTM 390 Duke and Gazelle CityGo aren't free anymore — earn money and buy them!</li></ul>
<h4>\u{1F6CF} ROOMS MENU</h4><ul>
<li>Clicking a room in \u{1F6CF} Rooms now asks: <b>⚡ TELEPORT</b> right there, or <b>\u{1F9ED} ROUTE</b> — follow the blue line and drive there yourself.</li></ul>`},
{t:"Round 31 — WAY more realistic cars, next-level tuning & a real avatar",h:`
<h4>\u{1F697} CARS LOOK REAL NOW</h4><ul>
<li>Every car got a <b>detail pass</b>: windshield wipers, a shark-fin antenna, a chrome nose badge, orange turn signals, fog lights, a third brake light, a fuel filler cap, a rear diffuser with fins and visible door seams.</li>
<li><b>Real brakes</b>: steel brake discs and red calipers peek through the spokes of every wheel — and the calipers steer with the front wheels.</li></ul>
<h4>\u{1F527} NEXT-LEVEL GARAGE TUNING</h4><ul>
<li><b>\u{1FA9F} Glass tint</b>: factory, light smoke, dark smoke, blue, green, gold or purple — every window changes.</li>
<li><b>⭕ Wheel color</b>: the WHOLE wheel (hub, spokes &amp; rings) gets your color now, in 6 finishes — tires stay black, brakes stay real.</li>
<li><b>\u{1F3A8} Spoiler color</b>: carbon, body color, white, red, blue or gold — in real clear-coated metal paint, with racing end plates.</li></ul>
<h4>\u{1F9CD} A REAL AVATAR</h4><ul>
<li>Your character has a real face now: white eyes with pupils, eyebrows, ears, a mouth, fuller hair down the back of the head — plus a chest, a belt and <b>real sneakers with rubber soles</b>.</li>
<li>New <b>\u{1F45F} Shoes color</b> row in the ⚙ Settings avatar editor — other players see your kicks too!</li></ul>`},
{t:"Round 32 — \u{1F9C8} BUTTER SQUISHIES & rent-to-buy your home",h:`
<h4>\u{1F9C8} BUTTER SQUISHIES</h4><ul>
<li>The \u{1F95F} Dumplings button is now <b>\u{1F95F} Squishies</b> — with TWO tabs: your dumplings and your NEW <b>butter squishies</b>!</li>
<li>Buy Butter Squishy surprises at any \u{1F6D2} MEGA MART. Same 8 colors, GOLD, RAINBOW and ✨ glitter as dumplings...</li>
<li>...but butter also comes in <b>SIZES</b>: \u{1F538} MEDIUM is rare (<b>1 in 200</b>, worth 6x) and \u{1F31F} MEGA is ultra rare (<b>1 in 600</b>, worth 20x)! A glitter rainbow MEGA is the rarest butter in the universe.</li>
<li>Open one or open ALL in the Butter tab — and hold them in your hands (MEGA ones are HUGE).</li>
<li>Sell them at the new <b>\u{1F9C8} BUTTER BUYERS</b> — one every ~500 m (yellow dots on the map, and in \u{1F5FA} map routes).</li></ul>
<h4>\u{1F511}→\u{1F4B0} SWITCH FROM RENT TO BUY</h4><ul>
<li>Renting an apartment or MEGA MANSION? You can now <b>switch to BUYING it</b> — at the reception (press T) or with the new \u{1F4B0} Buy button in the \u{1F6CF} Rooms menu.</li>
<li><b>Every dollar of rent you already paid counts!</b> Rented a $2M mansion for 100 days ($100K paid)? You only pay the remaining $1.9M.</li>
<li>Your furniture, dumpling shop and displays <b>all stay exactly where they are</b> — nothing resets.</li></ul>`},
{t:"Round 33 — \u{1F3E1} Family houses, \u{1F525} ULTRA graphics, nicer cars & smart buyer filters",h:`
<h4>\u{1F3E1} FAMILY HOUSES — BUY $500K or RENT $250/day</h4><ul>
<li>A big new home every ~1.4 km (\u{1F3E1} on the map): a real walk-in house with a gabled roof, chimney and framed windows — MUCH bigger than the little street houses.</li>
<li>Every family house sits in its own <b>fenced GARDEN</b> with a lawn, flowers, trees and a stone path.</li>
<li>Press T inside to <b>place items in the rooms AND all over the garden</b> — same editor as the mansion, and rent counts toward buying here too!</li>
<li>The little suburb houses also grew a size bigger.</li></ul>
<h4>\u{1F525} ULTRA GRAPHICS (⚙ Settings)</h4><ul>
<li>New switch under Graphics quality: <b>\u{1F525} ULTRA</b>.</li>
<li><b>\u{1F33F} Living grass</b>: hundreds of real grass blades around you that WAVE in the wind — and bend harder in storms.</li>
<li><b>\u{1F3DC} Flying sand</b>: in the desert, sand grains blow past with the wind (and the wind slowly changes direction).</li>
<li><b>Richer world</b>: fuller tree crowns with low branches, ~60% more vegetation, window shutters &amp; flower boxes on houses, real balconies on apartment towers and glowing garden lanterns at mansions.</li></ul>
<h4>\u{1F697} NICER CARS</h4><ul>
<li>Every silhouette is now drawn through a <b>smooth spline</b> — bodies curve like real sheet metal instead of angular facets, with rounder edges.</li>
<li><b>Rounded wheel-arch flares</b> that follow each wheel's circle, replacing the old flat blocks.</li>
<li>Brighter, deeper <b>clear-coat paint</b> that reflects the sky more.</li></ul>
<h4>\u{1F95F}\u{1F9C8} SMART BUYER FILTERS</h4><ul>
<li>At the dumpling &amp; butter buyers, filters now <b>hide everything that doesn't match</b> — and they COMBINE: pick a color AND glitter, and at the butter buyer also a size (small / \u{1F538} medium / \u{1F31F} mega) at once.</li>
<li>Whatever matches gets selected for you — one click on \u{1F4B5} Sell and it's money.</li></ul>`},
{t:"Round 34 — \u{1F3EA} MARKETING PLOTS: trade with real players!",h:`
<h4>\u{1F3EA} YOUR OWN MARKET — every ~3 km</h4><ul>
<li>Huge <b>100×100 m MARKETING PLOTS</b> all over the map (\u{1F3EA} on the map): <b>BUY $80K</b> or <b>RENT $100/day</b>.</li>
<li>Every plot is completely <b>EMPTY — just a big wooden plank floor</b>. No trees, houses or anything else spawn on it.</li>
<li>When you claim one you choose: <b>\u{1F3EC} a building</b> (walls + a door all around) or <b>\u{1F33E} open-air</b> — and you can switch later.</li>
<li><b>Name your market!</b> Instead of "Notch's Marketing Plot" the big sign can say <b>SUPER DEAL</b> — or anything you like.</li></ul>
<h4>\u{1FA91} LONG TABLES &amp; \u{1F5C4} DISPLAY CASES</h4><ul>
<li>Press T on your plot for the special market editor with <b>LONG TABLES</b> and <b>DISPLAY CASES</b>.</li>
<li>A table sells <b>dumplings, butter squishies or food</b>: pick the item, type the amount (max = what you own — it leaves your collection), set a price per item...</li>
<li>...and add a <b>BONUS deal</b> like <b>1+1</b> (buy 1, get 1 FREE) or 3+1 — the sign shows it to everyone!</li>
<li>The table shows the goods, the stock and the price. Sold out? The sign says <b>NO STOCK</b> and you can remove it (leftover stock always comes back to you).</li>
<li>A display case shows off ONE item — everyone can look, nobody can touch.</li></ul>
<h4>\u{1F6D2} SHOPPING AT OTHER PLAYERS</h4><ul>
<li>Walk onto someone's plot and their whole market loads — press T to buy! Stock drops with every sale and the money lands straight in the owner's inbox (works even while they're offline).</li>
<li>On the \u{1F5FA} map: <b>\u{1F3EA} Nearest MARKETING PLOT</b> and <b>\u{1F50E} SEARCH players' markets</b> — type a name like SUPER DEAL and teleport or route straight to it.</li></ul>
<li>⚠️ Server owners: the Firebase rules need a small update for markets — see FIREBASE-SETUP.md (new "mkt" field + "markets" section).</li>`}
];
let updPage=0;
function renderUpdate(){
  const p=UPDATE_PAGES[updPage];
  $("updTitle").innerHTML="\u{1F4DC} "+p.t;
  $("updContent").innerHTML=p.h;
  $("updPage").textContent="Page "+(updPage+1)+" / "+UPDATE_PAGES.length;
  $("updPrev").disabled=updPage===0;
  $("updNext").disabled=updPage===UPDATE_PAGES.length-1;
  $("updContent").scrollTop=0;
}
$("mUpdate").onclick=()=>{updPage=0;renderUpdate();$("updModal").classList.add("open");};
$("updPrev").onclick=()=>{if(updPage>0){updPage--;renderUpdate();}};
$("updNext").onclick=()=>{if(updPage<UPDATE_PAGES.length-1){updPage++;renderUpdate();}};
$("updClose").onclick=()=>$("updModal").classList.remove("open");
/* ================= MAIN LOOP ================= */
let last=performance.now();
setTrafficCount(24);
updateChunks(6,6,true);updateLandmarks(6,6);
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min(0.05,(now-last)/1000);last=now;
  pollGamepad();
  if(S.mode!=="game"){
    setHorn(false);setRocketRumble(0);
    if(S.mode==="garage")updateGarage(dt);
    renderer.render(scene,camera);return;
  }
  setHorn(keys.h||(TOUCH.on&&TOUCH.honk>0)||(GP.active&&GP.honk));
  clockTick(dt);
  updateRent();
  let speedMS=0;
  if(player.inRocket)speedMS=Math.abs(rocket.vy)+Math.abs(rocket.hs||0);
  else if(player.inTrain)speedMS=Math.abs(player.train.speed);
  else if(player.inPlane)speedMS=Math.abs(player.planeRef.speed);
  else if(player.inBus)speedMS=Math.abs(player.bus.speed);
  else if(player.inHeli)speedMS=updateHeli(dt);
  else if(RIDE.on)speedMS=updateRide(dt);
  else if(player.boat)speedMS=updateBoat(dt);
  else if(player.drive){
    const mcdBusy=player.drive===myVehicle&&MCD.phase!=="idle";
    speedMS=mcdBusy?Math.abs(myVehicle.speed)
      :(AUTO.on&&player.drive===myVehicle?updateAuto(dt):driveVehicle(player.drive,dt));   // McDrive lane / auto-drive
  }
  else{speedMS=SLIDE.on?updateSlide(dt):walkPlayer(dt);headLight.intensity=0;}
  if(player.inTrain){const t=player.train;player.x=railC(t.k,t.z);player.z=t.z;player.y=t.g.position.y;}
  if(player.inPlane){const p=player.planeRef;player.x=p.x;player.z=p.z;player.y=p.y;}
  if(player.inBus){const b=player.bus;player.x=b.g.position.x;player.z=b.g.position.z;player.y=b.g.position.y;}
  S.km+=speedMS*dt/1000;
  /* speed FEEL: the view widens as you go faster + wind rushes past */
  const tgtFov=62+Math.min(13,Math.max(0,speedMS-8)*0.11);
  if(Math.abs(camera.fov-tgtFov)>0.15){
    camera.fov+=(tgtFov-camera.fov)*Math.min(1,3*dt);
    camera.updateProjectionMatrix();
  }
  setWind(speedMS);
  updateFuel(dt,speedMS);
  updateCave();
  updateEngine(speedMS,!!player.drive&&player.drive.type!=="bike"&&FUEL.km>0);
  if(S.world==="earth"){
    updateEvents(dt);updatePortals(dt);
    updateTrains(dt);updatePlanes(dt);updateBuses(dt);updateTraffic(dt);solidParked();
    updatePeds(dt);updateAnimals(dt);updateDoors(dt);updateCollapses(dt);
    updateTrafficLights();updateGates(dt);
    updateCrowd(dt);updateMuseums(dt);
    updateFerries(dt);updateIslands(dt);updateOrder(dt);
    updateVolcanoes(dt);updateBirds(dt);
    if(HELI.active&&!player.inHeli&&HELI.mesh)HELI.mesh.userData.rotor.rotation.y+=dt*1.5;
    water.position.x=player.x;water.position.z=player.z;   // the sea follows you
    updateFish(dt);
    clouds.forEach(c=>{
      c.position.x+=dt*2.2;
      if(c.position.x-player.x>800)c.position.x-=1600;
      if(player.x-c.position.x>800)c.position.x+=1600;
      if(c.position.z-player.z>800)c.position.z-=1600;
      if(player.z-c.position.z>800)c.position.z+=1600;
    });
  }
  updateRocket(dt);updateUfos(dt);updateMc(dt);
  updateJob(dt);updatePet(dt);updateRaceMP();updateVisit(dt);updateMarketVisit(dt);updateFishing(dt);
  updateHunger(dt);updateMcd(dt);
  updateSiren(dt);updateTouch(dt);
  updateSky(player.x,player.z);
  updateWeather(dt);updateGrass(now);updateSand(dt,now);updateTreasure(dt);updateAch(dt);updateTv(dt);updateMidi();
  updateChunks(player.x,player.z);
  updateLandmarks(player.x,player.z);
  updateCamera(dt);
  /* HUD */
  const hh=Math.floor(CLOCK.min/60),mm=Math.floor(CLOCK.min%60);
  $("clockTime").textContent=(hh<10?"0":"")+hh+":"+(mm<10?"0":"")+mm+(isNight()?" \u{1F319}":" \u2600\uFE0F");
  $("clockDay").textContent=weekday()+" \u00b7 Day "+CLOCK.day+" \u00b7 5 min / real second";
  $("odoKm").textContent="total "+S.km.toFixed(2)+" km";
  $("spdVal").textContent=Math.round(uConv(speedMS*3.6));
  const limT=player.inRocket?"rocket":(player.inTrain?"train":(player.inPlane?"plane":(player.inBus?"bus":"car")));
  $("spdLim").textContent="limit "+Math.round(uConv(limitFor(limT)))+" "+uLabel();
  /* fuel gauge (cars & motorcycles only) */
  if(fuelVehicle()){
    $("fuelWrap").style.display="flex";
    const f=FUEL.km/FUEL.cap;
    $("fuelFill").style.width=Math.round(f*100)+"%";
    $("fuelFill").style.background=f<0.1?"#ff5d5d":(f<0.3?"#ffb02e":"#4ade80");
    $("fuelTxt").textContent="⛽ "+Math.round(FUEL.km)+" km";
  }else $("fuelWrap").style.display="none";
  if(player.inPlane){$("spdAlt").style.display="block";$("spdAlt").textContent="alt "+Math.round(player.planeRef.y)+" m";}
  else if(player.inRocket){$("spdAlt").style.display="block";$("spdAlt").textContent="alt "+Math.round(rocket.y)+" m";}
  else $("spdAlt").style.display="none";
  FPS.frames++;FPS.t+=dt;
  if(FPS.t>=0.5){FPS.val=Math.round(FPS.frames/FPS.t);FPS.frames=0;FPS.t=0;}
  $("fpsCoord").textContent=(FPS.val?FPS.val:"–")+" fps · \u{1F4CD} "+Math.round(player.x)+", "+Math.round(player.z);
  updateHint();
  updateNav();updateRace(dt);updateMini(dt);updateHeld();updateCompass();
  mpTick(dt);
  autoSave(dt);
  renderer.render(scene,camera);
}
/* ================= AUTO-UPDATE: everyone always plays the newest version =================
   every minute we peek at index.html on the server — if the version number
   went up, show "Refresh for new update" and auto-refresh after 30 seconds */
/* GAME_V lives in core.js — it's also shown in the menu header */
let _updSeen=false;
async function checkUpdate(){
  if(_updSeen)return;
  try{
    const r=await fetch("index.html",{cache:"no-store"});
    if(!r.ok)return;
    const m=(await r.text()).match(/js\/core\.js\?v=(\d+)/);
    if(m&&parseInt(m[1],10)>GAME_V){
      _updSeen=true;
      toast("\u{1F195} NEW UPDATE! Refresh for new update — auto-refreshing in 30 seconds...");
      setTimeout(()=>{
        try{saveGame();}catch(e){}
        location.reload();
      },30000);
    }
  }catch(e){}
}
setTimeout(checkUpdate,15000);
setInterval(checkUpdate,60000);
renderMenu();
requestAnimationFrame(frame);
