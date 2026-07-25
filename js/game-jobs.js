/* Car City Game — game-jobs.js (part 7/16, split from the old game.js).
   Plain JS, ONE shared global scope across all scripts — the load order in index.html MUST stay: core, world, vehicles, then game-* parts in numbered order. */
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
  /* ring-by-ring, widening until found — water & mountains can't hide them all */
  const ci=Math.round((player.x-ox)/cell),cj=Math.round((player.z-oz)/cell);
  let best=null,foundRing=-1;
  const MAXR=Math.max(range,Math.ceil(200000/cell));
  for(let r=0;r<=MAXR;r++){
    for(let i=ci-r;i<=ci+r;i++)for(let j=cj-r;j<=cj+r;j++){
      if(Math.max(Math.abs(i-ci),Math.abs(j-cj))!==r)continue;
      const sp=spotFn(i,j);
      if(!sp)continue;
      const d=Math.hypot(sp.x-player.x,sp.z-player.z);
      if(!best||d<best.d)best={sp,d};
    }
    if(best&&foundRing<0)foundRing=r;
    if(foundRing>=0&&r>=foundRing+1)break;
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
    if(md)(md.items||[]).forEach(it=>(it.o||[]).forEach(o=>{if(o.ty&&o.q>0)mktGiveGoods(o,o.q);}));
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
