/* Car City Game — game-hud.js (part 13/16, split from the old game.js).
   Plain JS, ONE shared global scope across all scripts — the load order in index.html MUST stay: core, world, vehicles, then game-* parts in numbered order. */
/* ================= CAMERA / HUD / MAP / LOOP ================= */
const FPS={frames:0,t:0,val:0};
function camTargetInfo(){
  if(player.inRocket)return{x:rocket.x,y:rocket.y+9,z:rocket.z,yaw:rocket.yaw||0,d:46,h:16};
  if(player.inHeli)return{x:HELI.x,y:HELI.y+3,z:HELI.z,yaw:HELI.yaw,d:17,h:7};
  if(player.boat)return{x:player.boat.x,y:0.6,z:player.boat.z,yaw:player.boat.yaw,d:14,h:5.5};
  if(player.transit){const t=player.transit;return{x:t.x,y:t.y+2.5,z:t.z,yaw:t.yaw,d:t.kind==="metro"?24:18,h:t.kind==="metro"?9:7};}
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
  if(Math.abs(z-tramZ(tramKNear(z)))<2.6)return "#c96f2e";        // 🚋 tram rails in the street
  if(nearGridLine(x)<8||nearGridLine(z)<8)return "#3b3f46";
  if(Math.abs(x-curveXC(x,z))<7||Math.abs(z-curveZC(x,z))<7)return "#464b53";
  if(nearestRail(x,z).d<5)return "#6b7280";
  if(Math.abs(x-metroX(metroKNear(x)))<3)return "#7b6bd8";        // 🚇 the metro viaduct
  if(canalDist(x,z)<CANW+1&&baseH(x,z)<-1.4)return "#2478b8";     // 🛶 the canal
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
    /* CoolBlue phone stores every ~500 m (zoom in to see them) */
    if(sc>=0.35){
      const yi0=Math.floor((mapView.cx-halfW-1700)/CBSP),yi1=Math.ceil((mapView.cx+halfW+100)/CBSP);
      const yj0=Math.floor((mapView.cz-halfH-2400)/CBSP),yj1=Math.ceil((mapView.cz+halfH+100)/CBSP);
      for(let i=yi0;i<=yi1;i++)for(let j=yj0;j<=yj1;j++){
        const s=cbSpot(i,j);
        if(!s)continue;
        dot(s.x,s.z,"#1d7fd6",6);
        const px=(s.x-mapView.cx)*sc+cv.width/2,py=-(s.z-mapView.cz)*sc+cv.height/2;
        if(px>-20&&py>-20&&px<cv.width+20&&py<cv.height+20){
          c.fillStyle="#ffb27a";c.font="bold 11px Segoe UI";c.textAlign="center";
          c.fillText("\u{1F4F1}",px,py-9);
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
        const ps=phoneBuyerSpot(i,j);
        if(ps)dot(ps.x,ps.z,"#3fa2ff",4);
        const cbs2=consoleBuyerSpot(i,j);
        if(cbs2)dot(cbs2.x,cbs2.z,"#8ac926",4);
        const tbs=tabletBuyerSpot(i,j);
        if(tbs)dot(tbs.x,tbs.z,"#9b5de5",4);
        const pcs=computerBuyerSpot(i,j);
        if(pcs)dot(pcs.x,pcs.z,"#e8e8ec",4);
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
    /* ⚓ every HARBOR in view (with its anchor), 🚇 metro stations, plus the LIVE trams & metros */
    {
      const sc2=mapView.scale,halfW=cv.width/2/sc2,halfH=cv.height/2/sc2;
      const hi0=Math.floor((mapView.cx-halfW-700)/HBSP),hi1=Math.ceil((mapView.cx+halfW-700)/HBSP);
      const hj0=Math.floor((mapView.cz-halfH-1900)/HBSP),hj1=Math.ceil((mapView.cz+halfH-1900)/HBSP);
      for(let i=hi0;i<=hi1;i++)for(let j=hj0;j<=hj1;j++){
        const s=harborSpot(i,j);
        if(!s)continue;
        dot(s.x,s.z,"#0d5c8f",6);
        const px=(s.x-mapView.cx)*sc2+cv.width/2,py=-(s.z-mapView.cz)*sc2+cv.height/2;
        if(px>-20&&py>-20&&px<cv.width+20&&py<cv.height+20){
          c.fillStyle="#7fe0ff";c.font="bold 11px Segoe UI";c.textAlign="center";c.fillText("⚓",px,py-9);
        }
      }
      if(sc2>=0.09){
        const mi0=Math.floor((mapView.cx-halfW-390)/METSP),mi1=Math.ceil((mapView.cx+halfW-390)/METSP);
        const sj0=Math.floor((mapView.cz-halfH-150)/MET_STSP),sj1=Math.ceil((mapView.cz+halfH-150)/MET_STSP);
        for(let m=mi0;m<=mi1;m++)for(let s2=sj0;s2<=sj1;s2++)dot(metroX(m),s2*MET_STSP+150,"#5e60ce",4);
      }
      if(typeof TRAMS!=="undefined"){
        TRAMS.forEach(t=>dot(t.x,t.z,"#e0a72e",4));
        METROS.forEach(t=>dot(t.x,t.z,"#8f7bff",4));
      }
    }
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
/* ☰ the rollable menu: rolls out from the LEFT, with its own search bar */
$("bActions").onclick=()=>{
  const opening=!$("topbar").classList.contains("open");
  if(opening){$("actSearch").value="";filterActMenu();}
  $("topbar").classList.toggle("open");
};
function filterActMenu(){
  const q=$("actSearch").value.trim().toLowerCase();
  $("actionsMenu").querySelectorAll("button").forEach(b=>{
    b.style.display=(!q||qMatch(q,b.textContent))?"":"none";
  });
}
$("actSearch").oninput=filterActMenu;
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
    /* search ring by ring and KEEP WIDENING until something is found —
       oceans and mountains can't hide every spot in a 200 km circle! */
    const ci=Math.round((player.x-ox)/cell),cj=Math.round((player.z-oz)/cell);
    let best=null,foundRing=-1;
    const MAXR=Math.max(range,Math.ceil(200000/cell));
    for(let r=0;r<=MAXR;r++){
      for(let i=ci-r;i<=ci+r;i++)for(let j=cj-r;j<=cj+r;j++){
        if(Math.max(Math.abs(i-ci),Math.abs(j-cj))!==r)continue;   // only this ring
        const sp=spotFn(i,j);
        if(!sp)continue;
        const d=Math.hypot(sp.x-player.x,sp.z-player.z);
        if(!best||d<best.d)best={sp,d};
      }
      if(best&&foundRing<0)foundRing=r;
      if(foundRing>=0&&r>=foundRing+1)break;   // one extra ring so it's really the nearest
    }
    return best;
  }
  function goNearest(label,best,dx,dz){
    if(best)chooseDest(label+" — "+fmtDist(best.d),best.sp.x+(dx||0),best.sp.z+(dz||0),true);
    else toast("Hmm, none found — try again from another spot!");
  }
  const specials=[
    ["\u{1F6CF} ROOMS — every player's rooms (who owns what!)",()=>openRoomsBrowser(),"warn"],
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
    ["\u{2693} Nearest HARBOR (\u{1F6A2} cargo boats!)",()=>{
      switchWorld("earth");
      goNearest("\u{2693} The HARBOR — sail the cargo boat, T at the dock to LOAD & UNLOAD!",nearestSpot(harborSpot,HBSP,700,1900,4),-20,-20);
    }],
    ["\u{1F6F6} Nearest CANAL (little bridges!)",()=>{
      switchWorld("earth");
      goNearest("\u{1F6F6} The canal — hop in a small boat and float under the bridges!",nearestSpot((i,j)=>({x:i*CANSP,z:canalZ(j,i*CANSP)}),CANSP,0,810,3),0,CANW+7);
    }],
    ["\u{1F68B} Nearest TRAM stop",()=>{
      switchWorld("earth");
      goNearest("\u{1F68B} The tram stop — press F when the tram waits there!",nearestSpot((i,j)=>({x:i*TRAMSP+90,z:tramZ(j)}),TRAMSP,90,270,3),0,10);
    }],
    ["\u{1F687} Nearest METRO station",()=>{
      switchWorld("earth");
      goNearest("\u{1F687} The METRO station — walk up the ramp, F when it stops!",nearestSpot((i,j)=>({x:metroX(i),z:j*METSP+150}),METSP,390,150,3),8,0);
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
    ["\u{1F4F1} Nearest CoolBlue (phone store)",()=>{
      switchWorld("earth");
      goNearest("\u{1F4F1} Nearest CoolBlue",nearestSpot(cbSpot,CBSP,1488,2190,4),0,10);
    }],
    ["\u{1F4F1} Nearest PHONE buyer",()=>{
      switchWorld("earth");
      goNearest("\u{1F4F1} Nearest phone buyer",nearestSpot(phoneBuyerSpot,DBSP,370,430,7),0,4);
    }],
    ["\u{1F3AE} Nearest CONSOLE buyer",()=>{
      switchWorld("earth");
      goNearest("\u{1F3AE} Nearest console buyer",nearestSpot(consoleBuyerSpot,DBSP,120,280,7),0,4);
    }],
    ["\u{1F4F2} Nearest TABLET buyer",()=>{
      switchWorld("earth");
      goNearest("\u{1F4F2} Nearest tablet buyer",nearestSpot(tabletBuyerSpot,DBSP,490,90,7),0,4);
    }],
    ["\u{1F4BB} Nearest COMPUTER buyer",()=>{
      switchWorld("earth");
      goNearest("\u{1F4BB} Nearest computer buyer",nearestSpot(computerBuyerSpot,DBSP,230,610,7),0,4);
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
/* ---------- 🛏 ROOMS browser: every bought/rented place on this server ---------- */
const PROOMS={data:null};
function roomKindInfo(key){
  const m=/^([MHPK]?)_?(-?\d+)_(-?\d+)$/.exec(key);
  if(!m)return null;
  const t=m[1];
  return{x:+m[2],z:+m[3],
    em:t==="M"?"\u{1F3F0}":t==="H"?"\u{1F3E1}":t==="P"?"\u{1F3D7}":t==="K"?"\u{1F3EA}":"\u{1F6CE}️",
    ty:t==="M"?"Mega mansion":t==="H"?"Family house":t==="P"?"Building plot":t==="K"?"Marketing plot":"Apartment room"};
}
async function openRoomsBrowser(){
  $("mapModal").classList.remove("open");
  $("proomsSearch").value="";
  $("proomsList").innerHTML="<div style='color:var(--dim);font-size:13px;padding:6px'>Loading rooms…</div>";
  $("proomsModal").classList.add("open");
  const out=[];
  if(SERVER_READY){
    const g=await fbGet("/claims/"+mpWorldKey());
    if(g.ok&&g.data)for(const k in g.data){
      const d=g.data[k];
      if(!d||d.free||!d.n)continue;
      const info=roomKindInfo(k);
      if(info)out.push({n:d.n,ts:d.ts||0,x:info.x,z:info.z,em:info.em,ty:info.ty});
    }
  }else{
    /* offline: at least show your OWN rooms */
    RENT.list.forEach(rm=>{
      const info=roomKindInfo(fbKey(rm.id));
      if(info)out.push({n:mpName(),ts:0,x:info.x,z:info.z,em:info.em,ty:info.ty});
    });
  }
  PROOMS.data=out;renderProoms();
}
function renderProoms(){
  const q=$("proomsSearch").value.trim().toLowerCase();
  const list=$("proomsList");list.innerHTML="";
  let rooms=PROOMS.data||[];
  if(q)rooms=rooms.filter(r=>qMatch(q,r.n+" "+r.ty+" "+Math.round(r.x)+" "+Math.round(r.z)));
  if(!rooms.length){
    const d=document.createElement("div");
    d.style.cssText="color:var(--dim);font-size:13px;padding:6px";
    d.textContent=q?"No rooms match “"+$("proomsSearch").value.trim()+"” — try a player name or a place type!"
      :"Nobody owns a room on this server yet — be the FIRST: buy an apartment, mansion, family house or plot!";
    list.appendChild(d);return;
  }
  const by=new Map();
  rooms.forEach(r=>{if(!by.has(r.n))by.set(r.n,[]);by.get(r.n).push(r);});
  [...by.keys()].sort((a,b)=>a.localeCompare(b)).forEach(n=>{
    const rs=by.get(n);
    const h=document.createElement("div");
    h.style.cssText="margin-top:10px;font-weight:800;color:var(--gold2,#ffd76a);font-size:13px;letter-spacing:.5px;border-bottom:1px solid rgba(212,175,55,.25);padding-bottom:3px";
    h.textContent="\u{1F464} "+n+" — "+rs.length+" room"+(rs.length>1?"s":"");
    list.appendChild(h);
    rs.forEach(r=>{
      const b=document.createElement("button");
      b.className="btn";b.style.cssText="width:100%;text-align:left;margin-top:5px;font-size:13px";
      b.innerHTML=r.em+" <b>"+n+"'s Room</b> <span style='color:var(--dim)'>— "+r.ty+" at ("+Math.round(r.x)+", "+Math.round(r.z)+")</span>";
      b.onclick=()=>{
        $("proomsModal").classList.remove("open");
        chooseDest(r.em+" "+n+"'s Room — "+r.ty,r.x,r.z,true);
      };
      list.appendChild(b);
    });
  });
}
$("proomsSearch").oninput=renderProoms;
$("proomsClose").onclick=()=>$("proomsModal").classList.remove("open");
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
  if(player.transit)return player.transit.yaw;
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
  if(player.transit){player.transit=null;player.onFoot=true;player.mesh.visible=true;}
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
  if(typeof clearTransit==="function")clearTransit();   // trams & metros only run on Earth
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
  else if(player.transit){
    txt=player.transit.dock>=0
      ?(player.transit.kind==="tram"?"\u{1F68B} The tram waits at the stop — press F to hop off!":"\u{1F687} The metro is at a station — press F to step onto the platform!")
      :(player.transit.kind==="tram"?"\u{1F68B} Riding the tram — it stops at every \u{1F68F} stop":"\u{1F687} Riding the metro above the city — next station coming up!");
    showF=true;
  }
  else if(player.boat){
    const hb=nearHarborDock(30);
    if(hb){txt=CARGO.n>0?"\u{2693} Harbor dock — press T to UNLOAD your "+CARGO.n+" crates!":"\u{2693} Harbor dock — press T to LOAD cargo crates!";showT=true;}
    else txt=(player.boat.rec&&player.boat.rec.cargo?"\u{1F6A2} Cargo boat":"\u{1F6A4} Sailing")+(CARGO.n>0?" — \u{1F4E6} "+CARGO.n+" crates aboard, deliver them to another ⚓ harbor!":" — W/S throttle · A/D steer · F = go ashore");
  }
  else{
    if(CAVE.in){txt=BOSS.on?"\u{1F5FF}⚔️ CAVE BOSS ("+BOSS.hp+" / "+BOSS.max+") — get close and press T to SWING!":"\u{1F573}️ In the cave — grab the $1,000 crystals · press T for the cave menu (boss fight!)";showT=true;}
    else if(SIT.on){txt="Sitting \u{1FA91} — press T or walk to stand up";showT=true;}
    else if(MEDIT.on){txt="\u{1F6E0} EDITING your mansion — click the floor/lawn to place items · R = rotate · T = done";showT=true;}
    else if(player.onFoot&&S.world==="earth"){
      const dk=nearFurn(hotelDesks,3.2),bd=nearFurn(hotelBeds,2.8),ch=nearFurn(chairs,2.2),ex=nearFurn(roomExits,2.2),pn=nearFurn(pianos,4.5);
      if(dk){const owner=claimedName(dk.id);
        txt=dk.mansion?(rentedAt(dk.id)?"\u{1F3F0} Your MEGA MANSION — welcome home! (T inside = edit)":owner?"\u{1F6CF} "+owner+"'s Room — this MEGA MANSION is privately owned":"\u{1F3F0} MEGA MANSION — press T: BUY $"+fmtMoney(MANSION_PRICE)+" or RENT $"+fmtMoney(MANSION_RENT)+"/day")
        :dk.house?(rentedAt(dk.id)?"\u{1F3E1} Your FAMILY HOUSE — welcome home! (T inside = edit)":owner?"\u{1F6CF} "+owner+"'s Room — this family house is privately owned":"\u{1F3E1} FAMILY HOUSE with garden — press T: BUY $"+fmtMoney(HOUSE_PRICE)+" or RENT $"+fmtMoney(HOUSE_RENT)+"/day")
        :(rentedAt(dk.id)?"Reception — press T to go up to your room":owner?"\u{1F6CF} "+owner+"'s Room — this apartment is privately owned":"Reception — press T: BUY $"+fmtMoney(APT_PRICE)+" or RENT $"+fmtMoney(APT_RENT)+"/day");showT=true;}
      else if(ex){txt="EXIT — press T to go back to the street";showT=true;}
      else if(ORDER.active&&ORDER.stage==="waiting"&&Math.hypot(player.x-ORDER.x,player.z-ORDER.z)<6){txt="\u{1F6F5} Your "+ORDER.label+" — press T to pay $"+fmtMoney(ORDER.cost)+" & take it!";showT=true;}
      else if(nearTv()){txt="\u{1F4FA} The TV — press T to pick a channel (Minecraft, news, fireplace...)";showT=true;}
      else if(myRoomHere()){txt="\u{1F6F5} Your room — press T to ORDER FOOD to your door!";showT=true;}
      else if(nearPlotSign()&&!rentedAt(nearPlotSign().id)){
        const po=claimedName(nearPlotSign().id);
        txt=po?"\u{1F6CF} "+po+"'s Room — this plot is privately owned":"\u{1F3D7} Empty plot FOR SALE — press T to buy it ($50K) and BUILD YOUR OWN HOUSE!";showT=!po;}
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
          else if(nearPhoneBuyer()){txt="\u{1F4F1} Phone buyer — press T to sell your phones";showT=true;}
          else if(nearConsoleBuyer()){txt="\u{1F3AE} Console buyer — press T to sell your consoles";showT=true;}
          else if(nearTabletBuyer()){txt="\u{1F4F2} Tablet buyer — press T to sell your iPads & Galaxy Tabs";showT=true;}
          else if(nearComputerBuyer()){txt="\u{1F4BB} Computer buyer — press T to sell your MacBooks & iMacs";showT=true;}
          else if(nearCoolBlue()){txt="\u{1F4F1} CoolBlue — press T for FREE phone, \u{1F3AE} console, \u{1F4F2} tablet & \u{1F4BB} computer boxes!";showT=true;}
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
    if(!txt&&player.onFoot){
      const tr2=nearTransit();
      if(tr2){txt=tr2.kind==="tram"?"\u{1F68B} The TRAM is at the stop — press F to hop on!":"\u{1F687} The METRO is at the platform — press F to hop on!";showF=true;}
    }
    if(!txt&&player.onFoot){
      const hb2=nearHarborDock(50);
      if(hb2)txt="\u{2693} THE HARBOR — press F at the \u{1F6A2} cargo boat to sail, then T at any harbor dock to LOAD & UNLOAD!";
    }
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
