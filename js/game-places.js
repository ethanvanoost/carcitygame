/* Car City Game — game-places.js (part 11/16, split from the old game.js).
   Plain JS, ONE shared global scope across all scripts — the load order in index.html MUST stay: core, world, vehicles, then game-* parts in numbered order. */
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
