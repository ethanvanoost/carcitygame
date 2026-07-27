/* Car City Game — game-extras.js (part 14/16, split from the old game.js).
   Plain JS, ONE shared global scope across all scripts — the load order in index.html MUST stay: core, world, vehicles, then game-* parts in numbered order. */
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
  const owner=claimedName(p.id);
  if(owner){toast("\u{1F6CF} "+owner+"'s Room — this plot is privately owned!");return;}
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
  /* a real STAY-OPEN menu (no more closing & reopening after every buy) */
  const title=()=>$("shopTitle").textContent="☁️ SKY RESTAURANT — cloud collection: "+skyCollectionCount()+" / 6";
  title();
  const list=$("shopList");list.innerHTML="";
  const mk=(html,fn)=>{const b=document.createElement("button");b.innerHTML=html;b.onclick=fn;list.appendChild(b);};
  mk("☁️ Mystery CLOUD dumpling <span style='color:var(--dim)'>$100 — 6 DIFFERENT ones to collect!</span>",()=>{
    if(MONEY.v<100){toast("\u{1F4B0} That costs $100!");return;}
    MONEY.v-=100;updateMoneyUI();
    const c=SKY_DUMPS[Math.floor(Math.random()*SKY_DUMPS.length)];
    DUMP.owned.push({color:c[0],hex:c[1],glitter:Math.random()<0.08});
    renderDump();saveGame();title();
    toast("☁️\u{1F95F} A "+c[0].toUpperCase()+" dumpling! Collection: "+skyCollectionCount()+" / 6"+(skyCollectionCount()>=6?" — COMPLETE!! \u{1F389}":""));
  });
  mk("\u{1F969} Mountain feast <span style='color:var(--dim)'>$60 — +60 food</span>",()=>{
    if(MONEY.v<60){toast("\u{1F4B0} That costs $60!");return;}
    MONEY.v-=60;updateMoneyUI();
    MCD.pack.push(["\u{1F969} Mountain feast",60]);renderPack();saveGame();
    toast("\u{1F37D} In your backpack — press R to enjoy it with this VIEW!");
  });
  mk("\u{1F370} Cloud cake <span style='color:var(--dim)'>$25 — +35 food</span>",()=>{
    if(MONEY.v<25){toast("\u{1F4B0} That costs $25!");return;}
    MONEY.v-=25;updateMoneyUI();
    MCD.pack.push(["\u{1F370} Cloud cake",35]);renderPack();saveGame();
    toast("\u{1F37D} In your backpack — press R to enjoy it with this VIEW!");
  });
  $("shopModal").classList.add("open");
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
