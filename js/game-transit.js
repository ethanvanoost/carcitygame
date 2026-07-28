/* Car City Game — game-transit.js (part 14b/16, new in v120).
   Plain JS, ONE shared global scope across all scripts — the load order in index.html MUST stay: core, world, vehicles, then game-* parts in numbered order.
   🚋 TRAM + 🚇 METRO you can RIDE (but not drive) and the ⚓ HARBOR cargo runs. */
/* ================= 🚋🚇 TRAM & METRO — clock-synced, hop on at a stop ================= */
const TRAMS=new Map(),METROS=new Map();
function buildTramMesh(){
  const g=new THREE.Group();
  const body=new THREE.MeshLambertMaterial({color:0xd7263d}),cream=new THREE.MeshLambertMaterial({color:0xf4ead2}),dark=new THREE.MeshLambertMaterial({color:0x2f3542});
  [[2.6],[-2.6]].forEach(p=>{
    const seg=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(2.4,2.5,4.6),body));seg.position.set(0,1.65,p[0]);g.add(seg);
    const band=new THREE.Mesh(new THREE.BoxGeometry(2.44,0.9,4.4),cream);band.position.set(0,1.35,p[0]);g.add(band);
    const win=new THREE.Mesh(new THREE.BoxGeometry(2.46,0.8,4.1),glassMat);win.position.set(0,2.35,p[0]);g.add(win);
    const und=new THREE.Mesh(new THREE.BoxGeometry(2,0.5,4.2),dark);und.position.set(0,0.35,p[0]);g.add(und);
  });
  const joint=new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.15,2.2,10),dark);joint.rotation.x=Math.PI/2;joint.position.set(0,1.7,0);g.add(joint);
  /* pantograph */
  const a1=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,1.8),dark);a1.position.set(0,3.5,2.6);a1.rotation.z=0.5;g.add(a1);
  const a2=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,1.8),dark);a2.position.set(0,4.2,2.6);a2.rotation.z=-0.5;g.add(a2);
  const cb=new THREE.Mesh(new THREE.BoxGeometry(1.3,0.06,0.24),dark);cb.position.set(0,4.8,2.6);g.add(cb);
  /* front sign + lamp on both ends */
  const cv=document.createElement("canvas");cv.width=128;cv.height=32;
  const c=cv.getContext("2d");c.fillStyle="#3a0d0d";c.fillRect(0,0,128,32);
  c.fillStyle="#ffd75e";c.font="bold 20px Segoe UI";c.textAlign="center";c.fillText("TRAM",64,23);
  const st=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv)});
  [[4.92,0],[-4.92,Math.PI]].forEach(p=>{
    const sg=new THREE.Mesh(new THREE.PlaneGeometry(1.5,0.4),st);sg.position.set(0,2.75,p[0]);sg.rotation.y=p[1];g.add(sg);
    const lamp=new THREE.Mesh(new THREE.SphereGeometry(0.13),new THREE.MeshBasicMaterial({color:0xfff2b0}));lamp.position.set(0,1,p[0]);g.add(lamp);
  });
  addBlobShadow(g,3,10.4);
  return g;
}
function buildMetroMesh(){
  const g=new THREE.Group();
  const body=new THREE.MeshLambertMaterial({color:0xc9cfd8}),trim=new THREE.MeshLambertMaterial({color:0x5e60ce}),dark=new THREE.MeshLambertMaterial({color:0x2f3542});
  [[4.6],[-4.6]].forEach(p=>{
    const seg=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(2.7,2.7,8.6),body));seg.position.set(0,1.75,p[0]);g.add(seg);
    const stripe=new THREE.Mesh(new THREE.BoxGeometry(2.74,0.5,8.4),trim);stripe.position.set(0,1.05,p[0]);g.add(stripe);
    const win=new THREE.Mesh(new THREE.BoxGeometry(2.74,0.75,8),glassMat);win.position.set(0,2.45,p[0]);g.add(win);
    const und=new THREE.Mesh(new THREE.BoxGeometry(2.2,0.5,8),dark);und.position.set(0,0.3,p[0]);g.add(und);
  });
  /* rounded noses */
  [[9.1,0],[-9.1,Math.PI]].forEach(p=>{
    const nose=shadowBox(new THREE.Mesh(new THREE.SphereGeometry(1.35,10,8),body));
    nose.scale.set(1,1.15,0.7);nose.position.set(0,1.75,p[0]);g.add(nose);
    const lamp=new THREE.Mesh(new THREE.SphereGeometry(0.14),new THREE.MeshBasicMaterial({color:0xfff2b0}));lamp.position.set(0,1.1,p[0]+(p[1]?-0.6:0.6));g.add(lamp);
  });
  const cv=document.createElement("canvas");cv.width=128;cv.height=32;
  const c=cv.getContext("2d");c.fillStyle="#2b2d64";c.fillRect(0,0,128,32);
  c.fillStyle="#7fe0ff";c.font="bold 19px Segoe UI";c.textAlign="center";c.fillText("METRO",64,23);
  const st=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv)});
  [[1.38,Math.PI/2],[-1.38,-Math.PI/2]].forEach(p=>{
    const sg=new THREE.Mesh(new THREE.PlaneGeometry(1.6,0.4),st);sg.position.set(p[0],2.95,0);sg.rotation.y=p[1];g.add(sg);
  });
  return g;
}
/* the shared-clock shuttle: dwell at each stop, glide between them.
   p = phase 0..1, N stops, D = dwell fraction, M = move fraction (per leg) */
function shuttlePos(p,N,D,M){
  const dir=p<0.5?1:-1;
  const q=p<0.5?p:1-p;
  let acc=0;
  for(let i=0;i<N;i++){
    if(q<acc+D)return{f:i/(N-1),dock:i,dir};
    acc+=D;
    if(i<N-1){
      if(q<acc+M){
        const t=(q-acc)/M,e=t*t*(3-2*t);
        return{f:(i+e)/(N-1),dock:-1,dir};
      }
      acc+=M;
    }
  }
  return{f:1,dock:N-1,dir};
}
function transitOff(key){let o=0;for(let i=0;i<key.length;i++)o+=key.charCodeAt(i)*7;return(o%89)/89;}
function transitPhase(off){return(((CLOCK.day*1440+CLOCK.min)/960)+off)%1;}
function buildTramCar(n,c,key){
  const g=buildTramMesh();scene.add(g);
  return{kind:"tram",key,g,n,c,x0:c*TRAM_CELL+90,z:tramZ(n),x:c*TRAM_CELL+90,y:0,yaw:Math.PI/2,spd:0,dock:-1,off:transitOff(key)};
}
function buildMetroCar(m,c,key){
  const g=buildMetroMesh();scene.add(g);
  return{kind:"metro",key,g,m,c,z0:c*MET_CELL+150,x:metroX(m),z:c*MET_CELL+150,y:0,yaw:0,spd:0,dock:-1,off:transitOff(key)};
}
function updateTransit(dt){
  if(S.world!=="earth")return;
  /* make sure trams & metros exist around the player */
  const tn=tramKNear(player.z),tc=Math.floor((player.x-90)/TRAM_CELL);
  for(let n=tn-1;n<=tn+1;n++)for(let c=tc-1;c<=tc+1;c++){
    const key="t"+n+","+c;
    if(TRAMS.has(key))continue;
    if(Math.abs(tramZ(n)-player.z)<1500&&Math.abs(c*TRAM_CELL+90+TRAM_CELL/2-player.x)<1900)TRAMS.set(key,buildTramCar(n,c,key));
  }
  const mn=metroKNear(player.x),mc=Math.floor((player.z-150)/MET_CELL);
  for(let m=mn-1;m<=mn+1;m++)for(let c=mc-1;c<=mc+1;c++){
    const key="m"+m+","+c;
    if(METROS.has(key))continue;
    if(Math.abs(metroX(m)-player.x)<1700&&Math.abs(c*MET_CELL+150+MET_CELL/2-player.z)<2400)METROS.set(key,buildMetroCar(m,c,key));
  }
  /* move the trams */
  for(const[key,t]of TRAMS){
    if(Math.hypot(t.x-player.x,t.z-player.z)>2300&&player.transit!==t){
      scene.remove(t.g);disposeGroup(t.g);TRAMS.delete(key);continue;
    }
    const s=shuttlePos(transitPhase(t.off),4,0.06,0.0866667);
    const nx=t.x0+s.f*(TRAM_CELL-0);   // stops 420 m apart, 4 stops = 1260 m
    const ny=terrainH(nx,t.z)+0.35;
    t.spd=dt>0?Math.hypot(nx-t.x,0)/dt:0;
    t.x=nx;t.y=ny;t.dock=s.dock;
    t.yaw=s.dir>0?Math.PI/2:-Math.PI/2;
    t.g.position.set(t.x,ny,t.z);
    t.g.rotation.y=t.yaw;
  }
  /* move the metros along their viaduct */
  for(const[key,t]of METROS){
    if(Math.hypot(t.x-player.x,t.z-player.z)>2800&&player.transit!==t){
      scene.remove(t.g);disposeGroup(t.g);METROS.delete(key);continue;
    }
    const s=shuttlePos(transitPhase(t.off),3,0.07,0.145);
    const nz=t.z0+s.f*(MET_CELL-MET_STSP);   // 3 stations 960 m apart = 1920 m span
    const ny=metroY(t.m,nz)+0.35;
    t.spd=dt>0?Math.abs(nz-t.z)/dt:0;
    t.z=nz;t.y=ny;t.dock=s.dock;
    t.yaw=s.dir>0?0:Math.PI;
    t.g.position.set(t.x,ny,t.z);
    t.g.rotation.y=t.yaw;
  }
  /* the rider goes wherever the tram/metro goes */
  if(player.transit){
    const t=player.transit;
    player.x=t.x;player.z=t.z;player.y=t.y+1;
  }
}
function nearTransit(){
  for(const t of TRAMS.values())
    if(t.dock>=0&&Math.hypot(player.x-t.x,player.z-t.z)<10&&Math.abs(player.y-t.y)<4)return t;
  for(const t of METROS.values())
    if(t.dock>=0&&Math.hypot(player.x-t.x,player.z-t.z)<12&&Math.abs(player.y-t.y)<5)return t;
  return null;
}
function boardTransit(t){
  player.transit=t;player.onFoot=false;player.mesh.visible=false;
  $("vehName").textContent=t.kind==="tram"?"Tram":"Metro";
  toast(t.kind==="tram"
    ?"\u{1F68B} DING DING! Riding the tram — it stops every 420 m, press F to hop off at a stop"
    :"\u{1F687} Riding the METRO high above the streets — press F to get off at a station!");
}
function leaveTransit(){
  const t=player.transit;
  player.transit=null;player.onFoot=true;player.mesh.visible=true;
  if(t.kind==="tram"){
    player.x=t.x;player.z=t.z+6;
    player.y=terrainH(player.x,player.z);
  }else{
    player.x=t.x+6.4;player.z=t.z;   // step onto the station platform (or take the drop!)
    player.y=t.y+0.4;
  }
  player.vy=0;player.grounded=false;
  $("vehName").textContent=S.selected?S.selected.name:"";
  toast(t.dock>=0?"\u{1F6B6} Hopped off — thanks for riding!":"\u{1F92F} You jumped out between stops!");
}
function clearTransit(){
  player.transit=null;
  for(const[key,t]of TRAMS){scene.remove(t.g);disposeGroup(t.g);}
  TRAMS.clear();
  for(const[key,t]of METROS){scene.remove(t.g);disposeGroup(t.g);}
  METROS.clear();
}
/* ================= ⚓ HARBOR CARGO: load crates, sail, get paid ================= */
const CARGO={n:0,x:0,z:0};
if(window.__cargoLoad){
  const c0=window.__cargoLoad;
  CARGO.n=Math.max(0,Math.floor(c0.n||0));CARGO.x=c0.x||0;CARGO.z=c0.z||0;
  delete window.__cargoLoad;
}
function nearHarborDock(r){
  for(let i=HARBORS.length-1;i>=0;i--){
    const h=HARBORS[i];
    if(offScene(h.g)){HARBORS.splice(i,1);continue;}
    if(Math.hypot(player.x-h.x,player.z-h.z)<r)return h;
  }
  return null;
}
function boatCap(){return player.boat&&player.boat.rec&&player.boat.rec.cargo?24:8;}
function setBoatCrates(n){
  const b=player.boat;
  if(!b||!b.mesh)return;
  if(b.crateG){b.mesh.remove(b.crateG);b.crateG=null;}
  if(n<=0)return;
  const cg=new THREE.Group();
  const cm=new THREE.MeshLambertMaterial({color:0x8a6f4d}),cm2=new THREE.MeshLambertMaterial({color:0xa8895e});
  const cargo=b.rec&&b.rec.cargo;
  const s=cargo?0.95:0.5,cols=cargo?2:2,rows=cargo?4:3;
  let placed=0;
  for(let f=0;f<3&&placed<n;f++)for(let r=0;r<rows&&placed<n;r++)for(let c=0;c<cols&&placed<n;c++){
    const crate=new THREE.Mesh(new THREE.BoxGeometry(s,s,s),(placed%2)?cm:cm2);
    crate.position.set((c-(cols-1)/2)*(s+0.12),(cargo?1.6:0.95)+s/2+f*(s+0.05),(cargo?-0.6:0.1)+(r-(rows-1)/2)*(s+0.12));
    crate.rotation.y=(placed*0.37)%0.3;
    cg.add(crate);placed++;
  }
  b.mesh.add(cg);b.crateG=cg;
}
function harborAction(){
  const h=nearHarborDock(30);
  if(!h){toast("\u{2693} Sail up to a HARBOR dock (the big cranes!) to load & unload cargo.");return;}
  if(Math.abs(player.boat.speed)>3){toast("\u{2693} Slow down at the dock first!");return;}
  if(CARGO.n>0){
    const dm=Math.hypot(h.x-CARGO.x,h.z-CARGO.z);
    if(dm<250){toast("\u{1F4E6} This is where you LOADED — deliver the crates to a DIFFERENT harbor (check the ⚓ dots on the map)!");return;}
    const pay=Math.round(CARGO.n*(12+dm/1000*25));
    addMoney(pay);
    CARGO.n=0;setBoatCrates(0);saveGame();
    toast("\u{2693}\u{1F4B0} UNLOADED! The cranes lift your crates ashore — you earned $"+fmtMoney(pay)+" ("+(dm/1000).toFixed(1)+" km shipped). Load up again for another run!");
  }else{
    const cap=boatCap();
    CARGO.n=cap;CARGO.x=h.x;CARGO.z=h.z;
    setBoatCrates(cap);saveGame();
    toast("\u{2693}\u{1F4E6} LOADED "+cap+" crates"+(cap>=24?" — a FULL cargo boat!":"!")+" Sail them to another harbor — the farther you ship, the more you earn (press T at the dock).");
  }
}
