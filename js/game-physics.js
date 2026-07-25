/* Car City Game — game-physics.js (part 12/16, split from the old game.js).
   Plain JS, ONE shared global scope across all scripts — the load order in index.html MUST stay: core, world, vehicles, then game-* parts in numbered order. */
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
