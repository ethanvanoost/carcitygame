/* ================= INPUT / ADMIN / CRUISE / FLOW ================= */
const keys={};
addEventListener("keydown",e=>{
  if(e.target.tagName==="INPUT")return;
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
  if(e.key.toLowerCase()==="r")eatSelected();
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
$("bAdmin").onclick=()=>{
  S.admin=!S.admin;
  $("bAdmin").innerHTML=S.admin?"&#128736; Admin: ON":"&#128736; Admin";
  $("bAdmin").classList.toggle("on",S.admin);
  $("adminPanel").classList.toggle("show",S.admin);
  toast(S.admin?"Admin mode ON — speed boosts + manual control of train/plane/bus":"Admin mode OFF");
  updateLimitUI();
};
document.querySelectorAll("#admTgt button").forEach(b=>b.onclick=()=>{
  document.querySelectorAll("#admTgt button").forEach(x=>x.classList.remove("on"));
  b.classList.add("on");admTarget=b.dataset.t;updateLimitUI();
});
function baseLimitFor(t){
  if(t==="car")return S.selected?S.selected.top:200;
  if(t==="train")return 140;
  if(t==="plane")return 950;
  if(t==="rocket")return 400;   // climb speed of the rocket (km/h)
  return 90; // bus
}
function limitFor(t){return baseLimitFor(t)+BONUS[t];}
function updateLimitUI(){
  $("limVal").textContent=Math.max(5,Math.round(uConv(limitFor(admTarget))))+" "+uLabel();
}
function bump(d){BONUS[admTarget]=Math.max(5-baseLimitFor(admTarget),BONUS[admTarget]+d);updateLimitUI();}
$("aMM").onclick=()=>bump(-50);$("aM").onclick=()=>bump(-10);
$("aP").onclick=()=>bump(10);$("aPP").onclick=()=>bump(50);
$("tMinus").onclick=()=>setTrafficCount(traffic.length-4);
$("tPlus").onclick=()=>setTrafficCount(traffic.length+4);
$("bArrest").onclick=()=>{
  S.arrest=!S.arrest;
  $("bArrest").innerHTML="\u{1F46E} Arrests: "+(S.arrest?"ON":"OFF");
  $("bArrest").classList.toggle("on",S.arrest);
  if(!S.arrest)for(const c of traffic)if(c.chase)endChase(c);
  toast(S.arrest?"\u{1F46E} Police arrests ON":"\u{1F60E} Police arrests OFF — the cops will ignore you");
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
  if(musicGain)musicGain.gain.setTargetAtTime(SND.music?0.4:0,audioCtx.currentTime,0.1);
};
/* spawn / start */
function goSpawn(){
  switchWorld("earth");
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
  const m=buildVehicleMesh(GAR.v.type,GAR.color,GAR.v.top);
  if(m.userData.riderMesh)m.userData.riderMesh.visible=false;
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
function startGame(v){
  switchWorld("earth");
  player.inRocket=false;
  if(CAVE.in)exitCave(true);
  S.selected=v;S.mode="game";
  $("menu").style.display="none";$("hud").classList.add("show");
  $("vehName").textContent=v.name;
  if(myVehicle)scene.remove(myVehicle.mesh);
  const sx=WORLD.ox+6,sz=WORLD.oz+6;
  const mesh=buildVehicleMesh(v.type,paintOf(v),v.top);scene.add(mesh);
  myVehicle={mesh,type:v.type,top:v.top,x:sx,z:sz,yaw:Math.PI,speed:0,vy:0,y:0,grounded:true,roll:0};
  if(mesh.userData.riderMesh)mesh.userData.riderMesh.visible=true;
  player.drive=myVehicle;player.onFoot=false;
  player.inTrain=player.inPlane=player.inBus=false;player.train=null;player.planeRef=null;player.bus=null;
  player.mesh.visible=false;
  updateLimitUI();updateChunks(sx,sz,true);updateLandmarks(sx,sz);
  mpJoin();chatStart();
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
    b.onclick=()=>{DUMP.unopened++;toast("\u{1F95F} Squishy Dumpling bought! Open it in the \u{1F95F} Dumplings menu.");};
    list.appendChild(b);
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
  return d.glitter?100:15;
}
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
    toast("You put the dumpling away.");
  }else{
    HOLD.d=d;
    if(d.color!=="Rainbow")HOLD.mat.color.set(d.hex);
    HOLD.stars.visible=!!d.glitter;
    toast("✋\u{1F95F} You're holding your "+(d.glitter?"GLITTER ":"")+d.color+" dumpling!"+(player.onFoot?"":" (step out of your vehicle to see it)"));
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
let _rainbowMat=null;
function rainbowMat(){
  if(_rainbowMat)return _rainbowMat;
  const cv=document.createElement("canvas");cv.width=64;cv.height=16;
  const c=cv.getContext("2d");const gr=c.createLinearGradient(0,0,64,0);
  ["#ff004c","#ff9e00","#ffee00","#37ff00","#00cfff","#9b5de5"].forEach((cc,i)=>gr.addColorStop(i/5,cc));
  c.fillStyle=gr;c.fillRect(0,0,64,16);
  _rainbowMat=new THREE.MeshLambertMaterial({map:new THREE.CanvasTexture(cv)});
  return _rainbowMat;
}
function nearMansion(){
  for(let i=mansions.length-1;i>=0;i--){
    const m=mansions[i];
    if(offScene(m.g)){mansions.splice(i,1);continue;}
    if(Math.abs(player.x-m.x)<56&&Math.abs(player.z-m.z)<46)return m;
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
window.onMansionBuilt=m=>{if(DISPLAYS.has(m.id))buildDumpTable(m);};
function renderDump(){
  $("dumpInfo").textContent=DUMP.unopened
    ?"You have "+DUMP.unopened+" unopened dumpling"+(DUMP.unopened>1?"s":"")+" — open one!"
    :"No unopened dumplings — buy them at a \u{1F6D2} MEGA MART (one every ~3 km, see the map).";
  const list=$("dumpList");list.innerHTML="";
  if(!DUMP.owned.length){
    const d=document.createElement("div");
    d.style.cssText="color:var(--dim);font-size:13px";
    d.textContent="Your collection is empty.";
    list.appendChild(d);
  }
  DUMP.owned.forEach(d=>{
    const el=document.createElement("button");
    el.className="dumpItem"+(d.glitter?" glitter":"")+(HOLD.d===d?" held":"");
    el.innerHTML="<span class='swatch' style='background:"+d.hex+"'></span>"
      +(d.glitter?"✨ GLITTER ":"")+d.color+" dumpling"
      +" <span style='color:var(--dim)'>$"+dumpValue(d)+"</span>"
      +(HOLD.d===d?" ✋ holding":"");
    el.onclick=()=>holdDump(d);
    list.appendChild(el);
  });
  const m=nearMansion();
  $("dumpDisplay").textContent=m&&DISPLAYS.has(m.id)?"\u{1F3F0} Remove the dumpling display":"\u{1F3F0} Display your dumplings at your mansion";
  $("dumpOpen").style.display=DUMP.unopened?"":"none";
}
$("bDump").onclick=()=>{renderDump();$("dumpModal").classList.toggle("open");};
$("dumpClose").onclick=()=>$("dumpModal").classList.remove("open");
$("dumpOpen").onclick=()=>{
  if(!DUMP.unopened)return;
  DUMP.unopened--;
  const roll=Math.random();
  let color,hex;
  if(roll<0.02){color="Rainbow";hex=RAINBOW_CSS;}             // rare!
  else if(roll<0.08){color="Gold";hex="#ffd700";}
  else{const c=DUMP_COLORS[Math.floor(Math.random()*DUMP_COLORS.length)];color=c[0];hex=c[1];}
  const glitter=Math.random()<0.08;   // rainbow + glitter = VERY rare
  DUMP.owned.push({color,hex,glitter});
  if(color==="Rainbow"&&glitter)toast("\u{1F308}✨ NO WAY!!! A GLITTER RAINBOW DUMPLING — the rarest of all! ($250)");
  else if(color==="Rainbow")toast("\u{1F308}\u{1F95F} WOW — a rare RAINBOW dumpling! ($30)");
  else if(color==="Gold")toast("\u{1F947}\u{1F95F} Shiny — a GOLD"+(glitter?" GLITTER":"")+" dumpling!");
  else toast(glitter?"✨\u{1F95F} WOW — a RARE GLITTER "+color+" dumpling!!":"\u{1F95F} You got a "+color+" dumpling!");
  renderDump();saveGame();
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
  const t="$"+fmtMoney(MONEY.v);
  $("moneyTxt").textContent=t;
  $("moneyTxt").classList.toggle("rainbow",MONEY.rainbow);
  $("mmVal").textContent=t;
  $("mmVal").classList.toggle("rainbow",MONEY.rainbow);
}
function addMoney(n){
  MONEY.v+=n;
  if(MONEY.v>=1000&&!MONEY.rainbow){
    MONEY.rainbow=true;
    toast("\u{1F308} $1,000! Your money text is RAINBOW forever!!");
  }
  updateMoneyUI();saveGame();profileSave();
}
$("bMoney").onclick=()=>{updateMoneyUI();$("moneyModal").classList.toggle("open");};
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
  /* glowing crystals — walk into them to collect ($25 each) */
  CAVE.crystals=[];
  const cols=[0x7df9ff,0xb388ff,0x7cff9e];
  for(let i=0;i<3;i++){
    const a=i*2.1+0.6,d=8+i*3;
    const px=cx+Math.sin(a)*d,pz=cz+Math.cos(a)*d*0.6;
    const cr=new THREE.Mesh(new THREE.OctahedronGeometry(0.7),new THREE.MeshBasicMaterial({color:cols[i]}));
    cr.position.set(px,y+0.9,pz);g.add(cr);
    const lt=new THREE.PointLight(cols[i],0.8,14);lt.position.set(px,y+2,pz);g.add(lt);
    CAVE.crystals.push({mesh:cr,x:px,z:pz,got:false});
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
  if(CAVE.room){scene.remove(CAVE.room);disposeGroup(CAVE.room);CAVE.room=null;}
  player.x=CAVE.rx;player.z=CAVE.rz;
  player.y=terrainH(player.x,player.z);player.vy=0;player.grounded=true;
  if(!silent)toast("\u{1F31E} Back outside — the cave stays right here.");
}
function updateCave(){
  if(!CAVE.in)return;
  for(const cr of CAVE.crystals){
    if(cr.got)continue;
    cr.mesh.rotation.y+=0.03;
    if(Math.hypot(player.x-cr.x,player.z-cr.z)<2){
      cr.got=true;cr.mesh.visible=false;
      addMoney(25);
      toast("\u{1F48E} Crystal collected — +$25!");
    }
  }
}
/* ---------- random events: road construction, accidents & festivals ---------- */
const EVENTS={list:[],timer:25};
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
function spawnEvent(){
  const type=["construction","accident","festival"][Math.floor(Math.random()*3)];
  const g=new THREE.Group();
  const e={type,g,life:150,x:0,z:0};
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
    toast("\u{1F6A8} ACCIDENT on the road near ("+Math.round(e.x)+", "+Math.round(e.z)+") — police on site, drive slowly!");
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
    for(let i=0;i<4;i++)spawnPed(fx-5+Math.random()*10,fz+2+Math.random()*5,"wander");
    toast("\u{1F389} A FESTIVAL started near ("+Math.round(fx)+", "+Math.round(fz)+") — visit it on foot for $50!");
  }
  scene.add(g);
  EVENTS.list.push(e);
}
function updateEvents(dt){
  if(S.world!=="earth")return;
  EVENTS.timer-=dt;
  if(EVENTS.timer<=0){
    EVENTS.timer=50+Math.random()*70;
    if(EVENTS.list.length<4)spawnEvent();
  }
  const now=performance.now();
  for(let i=EVENTS.list.length-1;i>=0;i--){
    const e=EVENTS.list[i];
    e.life-=dt;
    if(e.lights){const on=Math.floor(now/250)%2===0;e.lights[0].visible=on;e.lights[1].visible=!on;}
    if(e.balloons){
      e.balloons.forEach((b,bi)=>{b.position.y=b.userData.y0+Math.sin(now/700+bi)*0.5;});
      if(!e.done&&player.onFoot&&Math.hypot(player.x-e.x,player.z-e.z)<10){
        e.done=true;addMoney(50);
        toast("\u{1F389} You made it to the festival — +$50!");
      }
    }
    if(e.life<=0||Math.hypot(player.x-e.x,player.z-e.z)>900){
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
      (typeof d.own==="string"?d.own.split("|"):[]).forEach(n=>{if(n)OWN.add(n);});
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
/* ---------- dumpling buyers: sell your dumplings for money ---------- */
const SELL={sel:new Set()};
function nearBuyer(){
  for(let i=buyers.length-1;i>=0;i--){
    const b=buyers[i];
    if(offScene(b.g)){buyers.splice(i,1);continue;}
    if(Math.hypot(player.x-b.x,player.z-b.z)<7)return b;
  }
  return null;
}
function renderSell(){
  const list=$("sellList");list.innerHTML="";
  if(!DUMP.owned.length){
    const d=document.createElement("div");
    d.style.cssText="color:var(--dim);font-size:13px";
    d.textContent="You have no dumplings — buy them at a MEGA MART and open them first!";
    list.appendChild(d);
  }
  DUMP.owned.forEach((d,i)=>{
    const b=document.createElement("button");
    b.className="dumpItem"+(d.glitter?" glitter":"")+(SELL.sel.has(i)?" sel":"");
    b.innerHTML=(SELL.sel.has(i)?"✅ ":"")+"<span class='swatch' style='background:"+d.hex+"'></span>"
      +(d.glitter?"✨ GLITTER ":"")+d.color+" — $"+dumpValue(d);
    b.onclick=()=>{SELL.sel.has(i)?SELL.sel.delete(i):SELL.sel.add(i);renderSell();};
    list.appendChild(b);
  });
  let tot=0;SELL.sel.forEach(i=>tot+=dumpValue(DUMP.owned[i]));
  $("sellDo").textContent="\u{1F4B5} Sell selected — $"+tot;
}
function buildColorChips(){
  const wrap=$("sellColors");
  if(wrap.dataset.done)return;wrap.dataset.done=1;
  const opts=[...DUMP_COLORS.map(c=>[c[0],c[1]]),["Rainbow",RAINBOW_CSS],["Gold","#ffd700"]];
  opts.forEach(([name,bg])=>{
    const b=document.createElement("button");
    b.innerHTML="<span class='swatch' style='background:"+bg+"'></span>"+name;
    b.onclick=()=>{   // all of that color, NOT the glitter ones
      SELL.sel=new Set(DUMP.owned.map((d,i)=>(!d.glitter&&d.color===name)?i:-1).filter(i=>i>=0));
      renderSell();
    };
    wrap.appendChild(b);
  });
}
function openSell(){SELL.sel.clear();buildColorChips();renderSell();$("sellModal").classList.add("open");}
$("selAll").onclick=()=>{SELL.sel=new Set(DUMP.owned.map((_,i)=>i));renderSell();};
$("selGlit").onclick=()=>{SELL.sel=new Set(DUMP.owned.map((d,i)=>d.glitter?i:-1).filter(i=>i>=0));renderSell();};
$("selNorm").onclick=()=>{SELL.sel=new Set(DUMP.owned.map((d,i)=>d.glitter?-1:i).filter(i=>i>=0));renderSell();};
$("selNone").onclick=()=>{SELL.sel.clear();renderSell();};
$("sellDo").onclick=()=>{
  if(!SELL.sel.size){toast("Select some dumplings to sell first!");return;}
  const idx=[...SELL.sel].sort((a,b)=>b-a);
  let tot=0;
  for(const i of idx){
    const d=DUMP.owned[i];tot+=dumpValue(d);
    if(HOLD.d===d){HOLD.d=null;HOLD.mesh.visible=false;}
    DUMP.owned.splice(i,1);
  }
  SELL.sel.clear();
  addMoney(tot);renderSell();
  toast("\u{1F4B0} Sold! You earned $"+tot);
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
    const b=document.createElement("button");
    b.innerHTML=rm.label+" <span style='color:var(--dim)'>— teleport</span>";
    b.onclick=()=>{$("roomsModal").classList.remove("open");gotoRoom(rm);};
    list.appendChild(b);
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
  toast(HUNGER.on?"\u{1F354} Hunger ON — remember to eat!":"\u{1F6AB} Hunger OFF (admin)");
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
function sleepNight(){
  if(CLOCK.min>=7*60)CLOCK.day++;
  CLOCK.min=7*60;
  HUNGER.v=Math.max(HUNGER.v,40);HUNGER.starveT=0;   // breakfast included
  toast("\u{1F634} Zzz... Good morning! It's 07:00 on day "+CLOCK.day+".");
}
function tryFurniture(){
  if(!player.onFoot||S.world!=="earth")return false;
  if(SIT.on){SIT.on=false;toast("You stood up.");return true;}
  const dk=nearFurn(hotelDesks,3.2);
  if(dk){
    if(!rentedAt(dk.id)){
      RENT.list.push({id:dk.id,x:dk.room.x,z:dk.room.z,ry:dk.room.ry,
        label:(dk.mansion?"\u{1F3F0} MEGA MANSION at (":"\u{1F6CE}️ Room at (")+Math.round(dk.room.x)+", "+Math.round(dk.room.z)+")"});
      toast(dk.mansion?"\u{1F3F0} MEGA MANSION rented for FREE! Find it in your \u{1F6CF} Rooms menu.":"\u{1F511} Room rented for free! Taking you upstairs...");
      saveGame();
    }
    gotoRoom(dk.room);
    return true;
  }
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
  return false;
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
  mk("\u{1F3D9}️ Default city",!WORLD.name,()=>{setWorld("");toast("\u{1F3D9}️ Back in the default city — pick a vehicle!");});
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
  setWorld(n);addWorld(n);
  toast("\u{1F30D} World \""+n+"\" created — pick a vehicle and play!");
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
    const inf=document.createElement("div");inf.className="inf";inf.textContent=s.created?"created "+s.created:"";
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
  const rec={name:n,created:new Date().toISOString().slice(0,10)};
  try{
    if(!SERVER_READY)throw 0;
    const r=await fetch(SERVER_API+"/servers.json",{method:"POST",body:JSON.stringify(rec)});
    if(!r.ok)throw 0;
    SERVERS.online=true;
    toast("\u{1F310} Server \""+n+"\" created for everyone!");
  }catch(e){
    SERVERS.online=false;
    toast("\u{1F534} Offline — server only saved on this device for now.");
  }
  SERVERS.list.push(rec);cacheServers();
  SERVERS.busy=false;
  $("serverNew").value="";
  joinServer(n);
}
$("serverCreate").onclick=createServer;
$("serverRefresh").onclick=()=>{SERVERS.loaded=false;renderServers();};
$("serverSearch").addEventListener("input",()=>{SERVERS.q=$("serverSearch").value.trim();if(SERVERS.loaded)renderServers();});
$("serverNew").addEventListener("keydown",e=>{if(e.key==="Enter")createServer();});
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
  const el=$("chatMsgs"),row=document.createElement("div");
  row.dataset.key=key;
  row.className="cmsg"+(d.n===mpName()?" me":"");
  const who=document.createElement("b");who.textContent=d.n.slice(0,16)+": ";
  const txt=document.createElement("span");txt.textContent=d.m.slice(0,200);
  row.appendChild(who);row.appendChild(txt);
  el.appendChild(row);
  while(el.children.length>100)el.removeChild(el.firstChild);
  el.scrollTop=el.scrollHeight;
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
  try{firebase.database().ref("chat").push({n:mpName(),m,t:Date.now()});}catch(e){}
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
function mpWorldKey(){return (WORLD.name||"default-city").toLowerCase().replace(/[.#$\[\]\/]/g,"_");}
function mpJoin(){
  if(!mpInit())return;
  const key=mpWorldKey();
  if(MP.on&&key===MP.worldKey)return;
  mpLeave();
  MP.worldKey=key;
  MP.ref=firebase.database().ref("players/"+key);
  MP.myRef=MP.ref.child(MP.id);
  try{MP.myRef.onDisconnect().remove();}catch(e){}
  const upd=s=>{if(s.key!==MP.id)mpApply(s.key,s.val());};
  MP.ref.on("child_added",upd);
  MP.ref.on("child_changed",upd);
  MP.ref.on("child_removed",s=>mpDrop(s.key));
  MP.on=true;
}
function mpLeave(){
  if(!MP.on)return;
  try{MP.ref.off();MP.myRef.onDisconnect().cancel();MP.myRef.remove();}catch(e){}
  [...MP.others.keys()].forEach(mpDrop);
  MP.on=false;MP.ref=MP.myRef=null;MP.lastSig="";
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
  const kind=d.f?"foot":(d.v==="moto"||d.v==="bike"?d.v:"car");
  const col=typeof d.c==="number"?(d.c&0xffffff):0x3fd0ff;
  const nm=typeof d.n==="string"?d.n.slice(0,16):"player";
  let o=MP.others.get(k);
  if(o&&(o.kind!==kind||o.color!==col||o.name!==nm)){mpDrop(k);o=null;}
  if(!o){
    const g=new THREE.Group();
    const body=kind==="foot"?makePerson(1,col):buildVehicleMesh(kind,col);
    if(body.userData&&body.userData.riderMesh)body.userData.riderMesh.visible=true;
    g.add(body);
    const lbl=mpMakeLabel(nm);
    lbl.position.y=kind==="foot"?2.7:3.1;g.add(lbl);
    scene.add(g);
    o={g,kind,color:col,name:nm,k,x:d.x,z:d.z,y:d.y||0,yaw:d.r||0};
    MP.others.set(k,o);
  }
  o.tx=d.x;o.tz=d.z;o.ty=typeof d.y==="number"?d.y:0;o.tyaw=typeof d.r==="number"?d.r:0;
  o.seen=performance.now();
}
function mpDrop(k){const o=MP.others.get(k);if(o){scene.remove(o.g);MP.others.delete(k);}}
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
  }
  if(S.mode==="game")$("worldTxt").textContent="\u{1F30D} "+(WORLD.name||"Default city")+" · \u{1F465} "+(MP.others.size+1);
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
    v:player.drive?player.drive.type:"car",
    c:paintOf(S.selected),
    t:Date.now()};
  const sig=[d.x,d.z,d.y,d.r,d.f,d.v,d.n].join("|");
  if(sig===MP.lastSig&&now-MP.lastSendAt<5000)return;  /* parked: just a heartbeat every 5 s */
  MP.lastSig=sig;MP.lastSendAt=now;
  try{MP.myRef.set(d);}catch(e){}
}
/* player-name field in settings: goes through the same taken-check */
$("pName").value=mpName();
$("pName").addEventListener("change",async()=>{
  const res=await claimName($("pName").value);
  if(!res.ok){toast("❌ "+res.msg);$("pName").value=mpName();return;}
  if(res.name===mpName()){$("pName").value=res.name;return;}
  localStorage.setItem("vc4pname",res.name);
  localStorage.setItem("vc4nameok","1");
  $("pName").value=res.name;
  profileLoad();
  toast(res.offline
    ?"\u{1F464} You are now \""+res.name+"\" (offline — not reserved online yet)"
    :"\u{1F464} Username \""+res.name+"\" is yours!");
});
let _saveT=0;
function autoSave(dt){_saveT+=dt;if(_saveT>5){_saveT=0;saveGame();if(PROF.dirty)profileSave(true);}}
function saveGame(){
  try{
    localStorage.setItem("vc4save",JSON.stringify({
      money:MONEY.v,rainbow:MONEY.rainbow,
      unopened:DUMP.unopened,owned:DUMP.owned,
      rooms:RENT.list,
      displays:[...DISPLAYS.entries()],
      world:{name:WORLD.name,ox:WORLD.ox,oz:WORLD.oz},km:S.km,
      own:[...OWN],paint:PAINT,fuel:FUEL.km
    }));
  }catch(e){}
}
function loadGame(){
  try{
    const d=JSON.parse(localStorage.getItem("vc4save")||"null");
    if(!d)return;
    MONEY.v=d.money||0;MONEY.rainbow=!!d.rainbow;
    DUMP.unopened=d.unopened||0;DUMP.owned=Array.isArray(d.owned)?d.owned:[];
    RENT.list.push(...(Array.isArray(d.rooms)?d.rooms:[]));
    (d.displays||[]).forEach(([k,v])=>DISPLAYS.set(k,v));
    if(d.world&&d.world.name){WORLD.name=d.world.name;WORLD.ox=d.world.ox||0;WORLD.oz=d.world.oz||0;}
    S.km=d.km||0;
    (Array.isArray(d.own)?d.own:[]).forEach(n=>{if(typeof n==="string")OWN.add(n);});
    if(d.paint&&typeof d.paint==="object")for(const k in d.paint)if(typeof d.paint[k]==="number")PAINT[k]=d.paint[k];
    if(typeof d.fuel==="number")FUEL.km=Math.max(0,Math.min(FUEL.cap,d.fuel));
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
  /* inside a cave: T brings you back outside */
  if(CAVE.in){exitCave();return;}
  /* indoor stuff first: reception, beds, chairs */
  if(tryFurniture())return;
  /* cave mouths in the mountains */
  if(S.world==="earth"){
    const cv=nearCaveEntrance();
    if(cv){enterCave(cv);return;}
    /* gas stations: fill the tank */
    if(nearGasSt()&&fuelVehicle()){tryRefuel();return;}
  }
  /* race start flag (works on foot or in your car) */
  if(S.world==="earth"&&nearRaceFlag()){
    if(RACE.on)endRace(false);else startRace();
    return;
  }
  /* shops: walk inside and press T to buy food; buyers: sell dumplings */
  if(player.onFoot&&S.world==="earth"){
    const sh=nearShop();
    if(sh){openShop(sh);return;}
    const by=nearBuyer();
    if(by){openSell();return;}
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
  if(S.world==="moon"){toast("Find a rocket station to fly back down!");return;}
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
    return;
  }
  toast("Go to a train station, bus stop or airport terminal to call a ride.");
}
/* people stepping out on arrival */
function arrivalPeople(x,z){
  const n=1+Math.floor(Math.random()*3);
  for(let i=0;i<n;i++)spawnPed(x+(Math.random()-0.5)*4,z+(Math.random()-0.5)*4,"leave",14+Math.random()*8);
}
/* ---------- enter / leave ---------- */
function tryEnterLeave(){
  SIT.on=false;   // stand up before getting into anything
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
      if(S.world==="moon")toast("\u{1F31A} One small step... explore the Moon!");
      return;
    }
    toast("\u{1F680} You can't get out during the flight!");
    return;
  }
  /* rocket: boarding (walk up to a landed rocket) — autopilot or fly it yourself */
  if(player.onFoot&&rocket.state==="landed"&&Math.hypot(player.x-rocket.x,player.z-rocket.z)<15){
    player.inRocket=true;player.onFoot=false;player.mesh.visible=false;
    showDest("\u{1F680} Rocket — where to?",[
      {label:(S.world==="earth"?"\u{1F319} Fly to the MOON":"\u{1F30D} Fly to EARTH")+" (autopilot)",value:"auto"},
      {label:"\u{1F9D1}‍✈️ I'll fly it MYSELF — up to 2000 km/h!",value:"pilot"}
    ],v=>{
      if(v==="pilot"){
        rocket.state="piloted";rocket.yaw=0;rocket.hs=0;rocket.vy=0;
        toast("\u{1F680} You have the controls! W/S = speed, A/D = turn, Space = up, Shift = down, F = land");
      }else{
        rocket.state="launch";rocket.t=0;rocket.vy=0;rocket.hs=0;
        toast("\u{1F680} Buckle up! Launching..."+(S.admin?" (admin turbo!)":""));
      }
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
  /* moon buggies: parked at every moon rocket station */
  if(S.world==="moon"&&player.onFoot){
    for(let i=moonCars.length-1;i>=0;i--){
      const mc=moonCars[i];
      if(offScene(mc.g)){moonCars.splice(i,1);continue;}
      if(Math.hypot(player.x-mc.x,player.z-mc.z)<5){
        player.drive={mesh:mc.g,type:"car",top:200,x:mc.g.position.x,z:mc.g.position.z,yaw:mc.g.rotation.y,speed:0,vy:0,y:mc.g.position.y,grounded:true,roll:0,moonCar:mc};
        player.onFoot=false;player.mesh.visible=false;
        toast("\u{1F319}\u{1F697} Moon buggy! Low gravity driving — F to get out.");
        return;
      }
    }
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
  /* own vehicle */
  if(player.onFoot&&myVehicle&&Math.hypot(player.x-myVehicle.x,player.z-myVehicle.z)<5){
    player.drive=myVehicle;player.onFoot=false;player.mesh.visible=false;
    if(myVehicle.mesh.userData.riderMesh)myVehicle.mesh.userData.riderMesh.visible=true;
    return;
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
    if(S.admin)opts.push({label:"\u{1F9D1}\u200D\u2708\uFE0F I'll fly it myself (admin)",value:{type:"pilot"}});
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
function driveVehicle(v,dt){
  const limit=limitFor("car")/3.6*(player.drive===myVehicle?1:1);
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
    const grip=1/(1+Math.abs(v.speed)/45);
    const agility=isBike?2.8:(isMoto?2.5:2.1);
    v.yaw+=st*agility*grip*(spaceInput()?1.5:1)*Math.max(-1,Math.min(1,v.speed/9))*dt;
  }
  if(!isFinite(v.speed))v.speed=0;
  const nx=v.x+Math.sin(v.yaw)*v.speed*dt;
  const nz=v.z+Math.cos(v.yaw)*v.speed*dt;
  if(hitBuilding(nx,nz,Math.abs(v.speed))){v.speed*=-0.25;}
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
  player.x=v.x;player.z=v.z;player.y=v.y;
  return Math.abs(v.speed);
}
function walkPlayer(dt){
  const sp=keys.shift?9:4.2;
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
      L.lL.rotation.x=1.5;L.rL.rotation.x=1.5;L.lA.rotation.x=-0.4;L.rA.rotation.x=-0.4;
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
    if(Math.abs(nx-b.x)<b.w/2+0.4&&Math.abs(nz-b.z)<b.d/2+0.4){
      if(!(Math.abs(player.x-b.x)<b.w/2+0.4&&Math.abs(player.z-b.z)<b.d/2+0.4))blocked=true;
    }
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
     moon: big jumps and a slow, floaty fall */
  const moon=S.world==="moon";
  if(spaceInput()&&player.grounded){player.vy=moon?5:6.4;player.grounded=false;}
  if(!player.grounded){player.vy-=(moon?2.4:20)*dt;player.y+=player.vy*dt;
    if(player.y<=gh){player.y=gh;player.grounded=true;player.vy=0;}}
  else if(gh<player.y-1.3){player.grounded=false;player.vy=0;}   // stepped off a deck
  else player.y=gh;
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
function startRace(){
  const snap=v=>Math.round((v-30)/120)*120+30;
  let cx=snap(player.x),cz=snap(player.z);
  RACE.cp=[];
  let axis=Math.random()<0.5;
  for(let k=0;k<5;k++){   // 5 checkpoints along the grid roads
    const step=(2+Math.floor(Math.random()*3))*120*(Math.random()<0.5?-1:1);
    if(axis)cx+=step;else cz+=step;
    axis=!axis;
    RACE.cp.push({x:cx,z:cz});
  }
  RACE.on=true;RACE.i=0;RACE.t=0;
  moveBeacon();
  toast("\u{1F3C1} RACE! Drive through 5 blue checkpoints — GO GO GO!");
}
function endRace(win){
  RACE.on=false;raceBeacon.visible=false;
  if(win){
    const reward=Math.max(50,Math.round(600-RACE.t*4));
    addMoney(reward);
    toast("\u{1F3C6} FINISH in "+RACE.t.toFixed(1)+"s — you won $"+reward+"!");
  }else toast("\u{1F3C1} Race cancelled.");
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
  toast("\u{1F694} BUSTED! You were arrested and released at spawn.");
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
    if(S.arrest&&c.kind==="police"&&!c.chase&&arrestCd<=0&&player.drive===myVehicle&&player.drive){
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
    c.t+=sp*dt*c.lane.dir;
    const p=trafficPos(c);
    if(Math.hypot(p.x-player.x,p.z-player.z)>420)respawnCar(c);
    const y=terrainH(p.x,p.z);
    const laneYaw=c.lane.axis==="z"?(c.lane.dir>0?0:Math.PI):(c.lane.dir>0?Math.PI/2:-Math.PI/2);
    c.mesh.position.set(p.x,y,p.z);
    c.mesh.rotation.set(0,laneYaw,0);
    c.mesh.rotateX(-slopePitch(p.x,p.z,laneYaw,1.8));   // follow the hill, don't stay flat
    if(c.mesh.userData.wheels)for(const w of c.mesh.userData.wheels)w.spin.rotation.x+=sp/w.r*dt;
    /* player collision nudge */
    if(!player.onFoot&&player.drive&&Math.hypot(p.x-player.x,p.z-player.z)<3.4){
      if(Math.abs(player.drive.speed)>6)playCrash(Math.abs(player.drive.speed));
      player.drive.speed*=0.4;
    }
  }
}
/* ================= CAMERA / HUD / MAP / LOOP ================= */
const FPS={frames:0,t:0,val:0};
function camTargetInfo(){
  if(player.inRocket)return{x:rocket.x,y:rocket.y+9,z:rocket.z,yaw:rocket.yaw||0,d:46,h:16};
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
  if(S.world==="moon"){
    const h=moonH(x,z);
    if(rocketPadDist(x,z)<20)return "#4a4f57";
    if(h<-1.2)return "#6f6a5e";                       // holes
    return vnoise(x/60+2.2,z/60+6.6)<0.5?"#cfc07a":"#b3ab8e";  // yellow + a bit of gray
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
      const col=e.type==="construction"?"#ffb02e":(e.type==="accident"?"#ff5c5c":"#f472b6");
      dot(e.x,e.z,col,6);
      const px=(e.x-mapView.cx)*sc+cv.width/2,py=-(e.z-mapView.cz)*sc+cv.height/2;
      if(px>-20&&py>-20&&px<cv.width+20&&py<cv.height+20){
        c.fillStyle=col;c.font="bold 11px Segoe UI";c.textAlign="center";
        c.fillText(e.type==="construction"?"\u{1F6A7}":(e.type==="accident"?"\u{1F6A8}":"\u{1F389}"),px,py-9);
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
      dot(o.x,o.z,"#3fd0ff",6);
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
  showDest("\u{1F464} "+o.name,[
    {label:"⚡ Teleport (instant)",value:"tp"},
    {label:"\u{1F9ED} Follow route — keeps updating while they move",value:"route"},
    {label:"❌ Cancel",value:"cancel"}
  ],v=>{
    if(v==="cancel")return;
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
const MAP_PLACES=[["\u{1F3E0} Spawn",6,6,1],["\u{1F686} Central Station",-140,50],["✈️ Airport Central",330,-70],["✈️ Airport East",1530,-70],["✈️ Airport South",330,1130],["\u{1F981} Zoo",-340,250],["\u{1F6DD} Playground",60,60],["\u{1F680} Rocket Station",2400,2400]];
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
    .sort((a,b)=>a.d-b.d)
    .forEach(({o,d})=>out.push({label:"\u{1F464} "+o.name+" — "+fmtDist(d),go:()=>choosePlayer(o)}));
  /* live random events, nearest first */
  EVENTS.list
    .map(e=>({e,d:Math.hypot(e.x-player.x,e.z-player.z),
      label:e.type==="construction"?"\u{1F6A7} Road construction":(e.type==="accident"?"\u{1F6A8} Accident":"\u{1F389} Festival ($50!)")}))
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
    ["\u{1F95F} Nearest dumpling buyer",()=>{
      switchWorld("earth");
      goNearest("\u{1F95F} Nearest dumpling buyer",nearestSpot(buyerSpot,DBSP,270,330,7),0,4);
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
    ["\u{1F319} Go to the MOON",()=>{
      switchWorld("moon");
      teleportTo(2400,2400);   // land right at a moon rocket station
      $("mapModal").classList.remove("open");
      toast("\u{1F319} You're on the Moon! Low gravity — try jumping!");
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
function teleportTo(x,z){
  SIT.on=false;
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
  SIT.on=false;
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
  if(!earth){
    /* your car stays on Earth — use the moon buggies at rocket stations */
    player.drive=null;
    if(myVehicle)myVehicle.mesh.visible=false;
    if(!player.inRocket)player.onFoot=true;
  }else{
    if(player.drive&&player.drive.moonCar)player.drive=null;   // buggies stay on the Moon
    if(myVehicle)myVehicle.mesh.visible=true;
    if(!player.inRocket&&!player.drive)player.onFoot=true;
  }
  setAstro(!earth);   // astronaut outfit on the moon
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
      const to=S.world==="earth"?"moon":"earth";
      switchWorld(to);
      r.vy=-45;r.y=1000;r.state="descend";
      toast(to==="moon"?"\u{1F30C} Space! Coming in over the Moon...":"\u{1F30D} Re-entering Earth...");
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
      toast(S.world==="moon"?"\u{1F319} Welcome to the Moon! Press F to step out.":"\u{1F30D} Back on Earth! Press F to step out.");
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
  else{
    if(CAVE.in){txt="\u{1F573}️ In the cave — grab the glowing crystals · press T to go back outside";showT=true;}
    else if(SIT.on){txt="Sitting \u{1FA91} — press T or walk to stand up";showT=true;}
    else if(player.onFoot&&S.world==="earth"){
      const dk=nearFurn(hotelDesks,3.2),bd=nearFurn(hotelBeds,2.8),ch=nearFurn(chairs,2.2),ex=nearFurn(roomExits,2.2);
      if(dk){txt=dk.mansion?(rentedAt(dk.id)?"Your MEGA MANSION — press T at the reception":"\u{1F3F0} MEGA MANSION — press T to rent it (FREE!)"):(rentedAt(dk.id)?"Reception — press T to go up to your room":"Reception — press T to rent a room");showT=true;}
      else if(ex){txt="EXIT — press T to go back to the street";showT=true;}
      else if(bd){
        if(!rentedAt(bd.id))txt="A room's bed — rent it at the reception first";
        else if(!isNight())txt="Your bed — come back at night to sleep";
        else{txt="Your bed — press T to sleep (skips the night)";showT=true;}
      }
      else if(ch){txt="Chair — press T to sit down";showT=true;}
      else{
        const sh=nearShop();
        if(sh){txt=(sh.huge?"\u{1F6D2} MEGA MART":"\u{1F6D2} Shop")+" — press T to buy food";showT=true;}
        else{const by=nearBuyer();if(by){txt="\u{1F95F} Dumpling buyer — press T to sell your dumplings";showT=true;}}
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
    if(!txt&&player.onFoot&&myVehicle&&Math.hypot(player.x-myVehicle.x,player.z-myVehicle.z)<5){txt="Press F to get in your "+S.selected.name;showF=true;}
    }
    if(!txt&&S.world==="moon"&&player.onFoot){
      for(const mc of moonCars){
        if(!offScene(mc.g)&&Math.hypot(player.x-mc.x,player.z-mc.z)<6){txt="\u{1F319} Moon buggy — press F to drive!";showF=true;break;}
      }
    }
  }
  $("hintTxt").textContent=txt;
  $("hint").style.display=txt?"flex":"none";
  $("kT").style.display=showT?"":"none";
  $("kF").style.display=showF?"":"none";
}
$("kT").onclick=()=>tryCall();
$("kF").onclick=()=>tryEnterLeave();
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
<li>Motorcycles got fairings &amp; windscreens, bikes real frames &amp; pedals, buses AC units &amp; stripes, trains a pantograph, planes winglets and rockets landing legs + grid fins.</li></ul>`}
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
  let speedMS=0;
  if(player.inRocket)speedMS=Math.abs(rocket.vy)+Math.abs(rocket.hs||0);
  else if(player.inTrain)speedMS=Math.abs(player.train.speed);
  else if(player.inPlane)speedMS=Math.abs(player.planeRef.speed);
  else if(player.inBus)speedMS=Math.abs(player.bus.speed);
  else if(player.drive){
    const mcdBusy=player.drive===myVehicle&&MCD.phase!=="idle";
    speedMS=mcdBusy?Math.abs(myVehicle.speed):driveVehicle(player.drive,dt);   // McDrive lane drives for you
  }
  else{speedMS=walkPlayer(dt);headLight.intensity=0;}
  if(player.inTrain){const t=player.train;player.x=railC(t.k,t.z);player.z=t.z;player.y=t.g.position.y;}
  if(player.inPlane){const p=player.planeRef;player.x=p.x;player.z=p.z;player.y=p.y;}
  if(player.inBus){const b=player.bus;player.x=b.g.position.x;player.z=b.g.position.z;player.y=b.g.position.y;}
  S.km+=speedMS*dt/1000;
  updateFuel(dt,speedMS);
  updateCave();
  updateEngine(speedMS,!!player.drive&&player.drive.type!=="bike"&&FUEL.km>0);
  if(S.world==="earth"){
    updateEvents(dt);
    updateTrains(dt);updatePlanes(dt);updateBuses(dt);updateTraffic(dt);
    updatePeds(dt);updateAnimals(dt);updateDoors(dt);updateCollapses(dt);
    updateTrafficLights();updateGates(dt);
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
  updateRocket(dt);
  updateHunger(dt);updateMcd(dt);
  updateSiren(dt);updateTouch(dt);
  updateSky(player.x,player.z);
  updateChunks(player.x,player.z);
  updateLandmarks(player.x,player.z);
  updateCamera(dt);
  /* HUD */
  const hh=Math.floor(CLOCK.min/60),mm=Math.floor(CLOCK.min%60);
  $("clockTime").textContent=(hh<10?"0":"")+hh+":"+(mm<10?"0":"")+mm+(isNight()?" \u{1F319}":" \u2600\uFE0F");
  $("clockDay").textContent="Day "+CLOCK.day+" \u00b7 5 min / real second";
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
  updateNav();updateRace(dt);updateMini(dt);updateHeld();
  mpTick(dt);
  autoSave(dt);
  renderer.render(scene,camera);
}
renderMenu();
requestAnimationFrame(frame);
