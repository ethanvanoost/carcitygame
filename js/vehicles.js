/* ================= VEHICLE MESHES (realistic cars, buses, emergency) ================= */
const tireMat=keep(new THREE.MeshLambertMaterial({color:0x1c1c1e}));
const hubMat=keep(new THREE.MeshPhongMaterial({color:0xc9cfd8,shininess:80,specular:0x888888}));
const glassMat=keep(new THREE.MeshPhongMaterial({color:0x9fd8ff,transparent:true,opacity:0.85,shininess:120,specular:0xaaddff}));
const darkTrim=keep(new THREE.MeshLambertMaterial({color:0x23262b}));
/* shiny car paint: real specular highlights instead of flat plastic */
function paintMat(color){return new THREE.MeshPhongMaterial({color,shininess:65,specular:0x666666});}
function addWheel(g,x,z,r,w,front){
  const pivot=new THREE.Group();pivot.position.set(x,r,z);
  const spin=new THREE.Group();pivot.add(spin);
  const tire=new THREE.Mesh(new THREE.CylinderGeometry(r,r,w,18),tireMat);tire.rotation.z=Math.PI/2;tire.castShadow=true;spin.add(tire);
  /* real rim: center cap + six spokes that visibly rotate */
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(r*0.2,r*0.2,w+0.03,8),hubMat);hub.rotation.z=Math.PI/2;spin.add(hub);
  for(let i=0;i<3;i++){
    const sp=new THREE.Mesh(new THREE.BoxGeometry(w+0.02,r*1.16,r*0.14),hubMat);
    sp.rotation.x=i*Math.PI/3;spin.add(sp);
  }
  const ring=new THREE.Mesh(new THREE.TorusGeometry(r*0.6,r*0.07,6,18),hubMat);
  ring.rotation.y=Math.PI/2;spin.add(ring);
  g.add(pivot);
  (g.userData.wheels=g.userData.wheels||[]).push({pivot,spin,r,front:!!front});
}
function buildVehicleMesh(type,color,top){
  const g=new THREE.Group();g.userData.wheels=[];
  const mat=paintMat(color);
  if(type==="car"){
    const base=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(2.08,0.5,4.6),mat));base.position.y=0.62;g.add(base);
    const hood=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(2,0.26,1.2),mat));hood.position.set(0,0.98,1.55);g.add(hood);
    const trunk=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(2,0.28,0.85),mat));trunk.position.set(0,0.98,-1.8);g.add(trunk);
    const cabin=new THREE.Mesh(new THREE.BoxGeometry(1.86,0.5,2.25),glassMat);cabin.position.set(0,1.32,-0.25);g.add(cabin);
    const roof=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(1.9,0.1,2),mat));roof.position.set(0,1.6,-0.25);g.add(roof);
    const ws=new THREE.Mesh(new THREE.PlaneGeometry(1.8,0.72),glassMat);ws.position.set(0,1.28,0.95);ws.rotation.x=-0.55;g.add(ws);
    [[-2.32,0x23262b],[2.32,0x23262b]].forEach(p=>{const b=new THREE.Mesh(new THREE.BoxGeometry(2.16,0.22,0.24),darkTrim);b.position.set(0,0.42,p[0]);g.add(b);});
    const grille=new THREE.Mesh(new THREE.BoxGeometry(1.1,0.2,0.06),darkTrim);grille.position.set(0,0.72,2.32);g.add(grille);
    g.userData.tails=[];g.userData.beams=[];
    [[-0.72],[0.72]].forEach(p=>{
      const h=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.16,0.08),new THREE.MeshBasicMaterial({color:0xfff2b0}));
      h.position.set(p[0],0.82,2.33);g.add(h);
      /* tail lights: dim when cruising, BRIGHT red when braking, white in reverse */
      const t=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.14,0.08),new THREE.MeshBasicMaterial({color:0x8a1420}));
      t.position.set(p[0],0.82,-2.33);g.add(t);
      g.userData.tails.push(t);
      /* visible headlight BEAMS at night */
      const beam=new THREE.Mesh(new THREE.ConeGeometry(1.5,10,10,1,true),
        new THREE.MeshBasicMaterial({color:0xfff2b0,transparent:true,opacity:0.09,depthWrite:false,side:THREE.DoubleSide}));
      beam.rotation.x=-Math.PI/2;
      beam.position.set(p[0],0.8,7.3);
      beam.visible=false;g.add(beam);
      g.userData.beams.push(beam);
    });
    /* a real interior: two seats and a steering wheel, visible through the glass */
    const seatM=new THREE.MeshLambertMaterial({color:0x2a2f3a});
    [[-0.45],[0.45]].forEach(p=>{
      const seat=new THREE.Mesh(new THREE.BoxGeometry(0.58,0.22,0.6),seatM);
      seat.position.set(p[0],1.04,-0.4);g.add(seat);
      const back=new THREE.Mesh(new THREE.BoxGeometry(0.58,0.5,0.14),seatM);
      back.position.set(p[0],1.32,-0.72);g.add(back);
    });
    const sw=new THREE.Mesh(new THREE.TorusGeometry(0.17,0.035,6,14),darkTrim);
    sw.position.set(-0.45,1.18,0.3);sw.rotation.x=-0.55;g.add(sw);
    [[-1.02],[1.02]].forEach(p=>{const m=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.12,0.24),mat);m.position.set(p[0],1.22,0.75);g.add(m);});
    /* roof pillars framing the glass cabin */
    [[-0.9,0.85],[0.9,0.85],[-0.92,-1.32],[0.92,-1.32]].forEach(p=>{
      const pil=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.52,0.12),darkTrim);
      pil.position.set(p[0],1.32,p[1]);pil.rotation.x=p[1]>0?0.28:-0.22;g.add(pil);});
    /* license plates + door handles */
    [[2.345,0],[-2.345,Math.PI]].forEach(p=>{
      const pl=new THREE.Mesh(new THREE.BoxGeometry(0.52,0.15,0.03),new THREE.MeshLambertMaterial({color:0xf4f7fb}));
      pl.position.set(0,0.52,p[0]);pl.rotation.y=p[1];g.add(pl);});
    [[-1.05],[1.05]].forEach(p=>{const dh=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.05,0.3),hubMat);
      dh.position.set(p[0],1.02,-0.15);g.add(dh);});
    /* wheel arches + side skirts */
    [[-1.06,1.5],[1.06,1.5],[-1.06,-1.5],[1.06,-1.5]].forEach(p=>{
      const a=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.24,1.18),darkTrim);a.position.set(p[0],0.72,p[1]);g.add(a);});
    [[-1.07],[1.07]].forEach(p=>{const sk=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.14,2.6),darkTrim);sk.position.set(p[0],0.36,-0.1);g.add(sk);});
    /* front splitter + twin exhausts */
    const spl=new THREE.Mesh(new THREE.BoxGeometry(1.9,0.08,0.3),darkTrim);spl.position.set(0,0.32,2.28);g.add(spl);
    [[-0.5],[0.5]].forEach(p=>{const ex=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,0.24,8),hubMat);
      ex.rotation.x=Math.PI/2;ex.position.set(p[0],0.42,-2.34);g.add(ex);});
    /* supercars get a rear wing */
    if((top||0)>=340){
      [[-0.7],[0.7]].forEach(p=>{const st=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.3,0.1),darkTrim);st.position.set(p[0],1.22,-2.05);g.add(st);});
      const wing=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(1.9,0.07,0.5),mat));wing.position.set(0,1.4,-2.1);g.add(wing);
    }
    addWheel(g,-0.95,1.5,0.42,0.3,true);addWheel(g,0.95,1.5,0.42,0.3,true);
    addWheel(g,-0.95,-1.5,0.42,0.3,false);addWheel(g,0.95,-1.5,0.42,0.3,false);
    g.userData.camD=13;g.userData.camH=5;
  }else if(type==="moto"){
    const body=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(0.5,0.42,1.9),mat));body.position.y=0.95;g.add(body);
    const tank=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(0.48,0.3,0.7),mat));tank.position.set(0,1.2,0.35);g.add(tank);
    const seat=new THREE.Mesh(new THREE.BoxGeometry(0.44,0.14,0.8),darkTrim);seat.position.set(0,1.22,-0.5);g.add(seat);
    const bar=new THREE.Mesh(new THREE.BoxGeometry(0.86,0.07,0.07),darkTrim);bar.position.set(0,1.4,0.85);g.add(bar);
    const fork=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1),hubMat);fork.rotation.x=0.35;fork.position.set(0,0.85,0.95);g.add(fork);
    const exh=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.09,1),hubMat);exh.rotation.x=Math.PI/2;exh.position.set(0.26,0.55,-0.7);g.add(exh);
    /* fairing nose, windscreen, front fender, headlight & tail light */
    const fair=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(0.46,0.36,0.5),mat));fair.position.set(0,1.28,0.78);fair.rotation.x=-0.25;g.add(fair);
    const scr=new THREE.Mesh(new THREE.PlaneGeometry(0.4,0.3),glassMat);scr.position.set(0,1.52,0.86);scr.rotation.x=-0.6;g.add(scr);
    const fen=new THREE.Mesh(new THREE.BoxGeometry(0.24,0.1,0.7),mat);fen.position.set(0,1.02,1);g.add(fen);
    const hl=new THREE.Mesh(new THREE.SphereGeometry(0.08,8,8),new THREE.MeshBasicMaterial({color:0xfff2b0}));hl.position.set(0,1.3,1.05);g.add(hl);
    const tl=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.08,0.06),new THREE.MeshBasicMaterial({color:0xd7263d}));tl.position.set(0,1.16,-0.94);g.add(tl);
    addWheel(g,0,1,0.42,0.16,true);addWheel(g,0,-1,0.42,0.2,false);
    g.userData.camD=11;g.userData.camH=4.4;g.userData.rider=true;
  }else{
    const fr=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.1,1.6),mat);fr.position.y=0.85;fr.rotation.x=0.12;g.add(fr);
    const st=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.045,0.5),mat);st.position.set(0,1.05,-0.55);g.add(st);
    const seat=new THREE.Mesh(new THREE.BoxGeometry(0.28,0.09,0.42),darkTrim);seat.position.set(0,1.3,-0.55);g.add(seat);
    const bar=new THREE.Mesh(new THREE.BoxGeometry(0.66,0.05,0.05),darkTrim);bar.position.set(0,1.35,0.7);g.add(bar);
    /* real frame tubes, pedals and fenders */
    const t1=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,1),mat);t1.position.set(0,0.85,0.1);t1.rotation.x=1.0;g.add(t1);
    const t2=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,0.85),mat);t2.position.set(0,0.75,-0.3);t2.rotation.x=-0.9;g.add(t2);
    const crank=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,0.16,10),darkTrim);crank.rotation.z=Math.PI/2;crank.position.set(0,0.5,-0.05);g.add(crank);
    [[0.12,0.32],[-0.12,-0.32]].forEach(p=>{const pd=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.03,0.1),darkTrim);pd.position.set(p[0],0.5+p[1]*0.3,-0.05+p[1]*0.2);g.add(pd);});
    [[0.75],[-0.75]].forEach(p=>{const f=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.05,0.5),darkTrim);f.position.set(0,1.28,p[0]);g.add(f);});
    addWheel(g,0,0.75,0.38,0.08,true);addWheel(g,0,-0.75,0.38,0.08,false);
    g.userData.camD=9;g.userData.camH=3.8;g.userData.rider=true;
  }
  if(g.userData.rider){ // you can see yourself on motorcycles & bikes
    const rider=makePerson(0.9,0x2563eb);
    rider.position.set(0,type==="moto"?0.62:0.7,-0.45);
    rider.rotation.x=0;rider.visible=false;
    const L=rider.userData.limbs;
    L.lL.rotation.x=1.1;L.rL.rotation.x=1.1;L.lA.rotation.x=-0.9;L.rA.rotation.x=-0.9;
    g.add(rider);g.userData.riderMesh=rider;
  }
  return g;
}
function buildEmergencyMesh(kind){
  const g=buildVehicleMesh("car",kind==="police"?0xf0f4f8:(kind==="ambulance"?0xffffff:0xd7263d));
  if(kind==="ambulance"){const boxy=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(2.1,1.2,2.6),new THREE.MeshLambertMaterial({color:0xffffff})));
    boxy.position.set(0,1.5,-1);g.add(boxy);
    const cross=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.7,0.06),new THREE.MeshBasicMaterial({color:0xd7263d}));cross.position.set(1.06,1.5,-1);cross.rotation.y=Math.PI/2;g.add(cross);}
  if(kind==="fire"){const lad=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.16,3.4),new THREE.MeshLambertMaterial({color:0xc9cfd8}));lad.position.set(0,1.85,-0.6);g.add(lad);}
  const lb1=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.16,0.3),new THREE.MeshBasicMaterial({color:0xff2222}));lb1.position.set(-0.4,1.72,-0.2);g.add(lb1);
  const lb2=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.16,0.3),new THREE.MeshBasicMaterial({color:0x2266ff}));lb2.position.set(0.4,1.72,-0.2);g.add(lb2);
  g.userData.lights=[lb1,lb2];g.userData.emergency=kind;
  return g;
}
parkedCarBuilder=c=>buildVehicleMesh("car",c);
function buildBusMesh(color){
  const g=new THREE.Group();g.userData.wheels=[];
  const mat=new THREE.MeshLambertMaterial({color});
  const body=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(2.6,2.6,10.5),mat));body.position.y=1.9;g.add(body);
  const win=new THREE.Mesh(new THREE.BoxGeometry(2.64,0.9,9.6),glassMat);win.position.y=2.6;g.add(win);
  const ws=new THREE.Mesh(new THREE.PlaneGeometry(2.4,1.2),glassMat);ws.position.set(0,2.4,5.28);g.add(ws);
  const bump=new THREE.Mesh(new THREE.BoxGeometry(2.7,0.3,0.3),darkTrim);bump.position.set(0,0.55,5.3);g.add(bump);
  [[-0.86],[0.86]].forEach(p=>{const h=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.2,0.08),new THREE.MeshBasicMaterial({color:0xfff2b0}));h.position.set(p[0],0.9,5.32);g.add(h);});
  const door=new THREE.Mesh(new THREE.BoxGeometry(0.06,1.9,1),darkTrim);door.position.set(1.32,1.4,2.4);g.add(door);
  addWheel(g,-1.1,3.4,0.5,0.35,true);addWheel(g,1.1,3.4,0.5,0.35,true);
  addWheel(g,-1.1,-3.2,0.5,0.35,false);addWheel(g,1.1,-3.2,0.5,0.35,false);
  const cv=document.createElement("canvas");cv.width=128;cv.height=32;
  const c=cv.getContext("2d");c.fillStyle="#111";c.fillRect(0,0,128,32);
  c.fillStyle="#ffd75e";c.font="bold 20px Segoe UI";c.textAlign="center";c.fillText("CITY BUS",64,23);
  const sg=new THREE.Mesh(new THREE.PlaneGeometry(1.8,0.45),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv)}));
  sg.position.set(0,3.05,5.28);g.add(sg);
  /* roof AC unit, side stripe, mirrors & tail lights */
  const ac=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.35,3),darkTrim);ac.position.set(0,3.4,-1);g.add(ac);
  [[1.33],[-1.33]].forEach(p=>{const st=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.3,9.6),new THREE.MeshLambertMaterial({color:0xf4f7fb}));st.position.set(p[0],1.15,0);g.add(st);});
  [[1.5],[-1.5]].forEach(p=>{const m=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.3,0.16),darkTrim);m.position.set(p[0],2.9,5.1);g.add(m);});
  [[-0.9],[0.9]].forEach(p=>{const t=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.2,0.08),new THREE.MeshBasicMaterial({color:0xd7263d}));t.position.set(p[0],0.9,-5.28);g.add(t);});
  g.userData.camD=18;g.userData.camH=7;
  return g;
}
const TRAIN_COLORS=[0xc0392b,0x1d6fd1,0x27ae60,0xe67e22,0x9b5de5,0x2ec4b6];
function buildTrainMesh(color){
  const body=new THREE.MeshLambertMaterial({color}),grey=new THREE.MeshLambertMaterial({color:0xdfe4ea}),dark=new THREE.MeshLambertMaterial({color:0x2f3542});
  const G=new THREE.Group();
  function unit(len,mat,front){
    const u=new THREE.Group();
    const b=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(3,3.2,len),mat));b.position.y=2.2;u.add(b);
    const roofM=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(3,0.4,len),dark));roofM.position.y=4;u.add(roofM);
    const und=new THREE.Mesh(new THREE.BoxGeometry(2.6,0.9,len-1),dark);und.position.y=0.75;u.add(und);
    for(let z=-len/2+2;z<len/2-1;z+=4){
      const win=new THREE.Mesh(new THREE.PlaneGeometry(2.2,1),glassMat);
      win.position.set(1.52,2.7,z);win.rotation.y=Math.PI/2;u.add(win);
      const w2=win.clone();w2.position.x=-1.52;w2.rotation.y=-Math.PI/2;u.add(w2);
    }
    if(front){const nose=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(3,2.2,1.4),mat));nose.position.set(0,1.7,len/2+0.6);u.add(nose);
      const lamp=new THREE.Mesh(new THREE.SphereGeometry(0.2),new THREE.MeshBasicMaterial({color:0xfff2b0}));lamp.position.set(0,1.7,len/2+1.35);u.add(lamp);}
    return u;
  }
  const loco=unit(12,body,true);loco.position.z=10;G.add(loco);
  { /* pantograph on the locomotive + a yellow warning nose stripe */
    const a1=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,2.4),dark);a1.position.set(0,4.9,2);a1.rotation.z=0.5;loco.add(a1);
    const a2=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,2.4),dark);a2.position.set(0,5.9,2);a2.rotation.z=-0.5;loco.add(a2);
    const cb=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.08,0.3),dark);cb.position.set(0,6.7,2);loco.add(cb);
    const stripe=new THREE.Mesh(new THREE.BoxGeometry(3.02,0.5,1.42),new THREE.MeshLambertMaterial({color:0xf4d35e}));stripe.position.set(0,1.1,6.6);loco.add(stripe);
  }
  const c1=unit(11,grey,false);c1.position.z=-3;G.add(c1);
  const c2=unit(11,body,false);c2.position.z=-15.5;G.add(c2);
  return G;
}
const PLANE_COLORS=[0x1c4d8f,0xc0392b,0x27ae60];
function buildPlaneMesh(color){
  const G=new THREE.Group();
  const white=new THREE.MeshLambertMaterial({color:0xf4f7fb}),blue=new THREE.MeshLambertMaterial({color}),dark=new THREE.MeshLambertMaterial({color:0x2f3542});
  const fus=shadowBox(new THREE.Mesh(new THREE.CylinderGeometry(1.35,1.1,15,12),white));
  fus.rotation.x=Math.PI/2;fus.position.y=2.4;G.add(fus);
  const nose=shadowBox(new THREE.Mesh(new THREE.SphereGeometry(1.32,12,12),white));nose.position.set(0,2.4,7.6);G.add(nose);
  const cock=new THREE.Mesh(new THREE.SphereGeometry(0.95,10,10),glassMat);cock.position.set(0,3,5.9);G.add(cock);
  const wing=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(19,0.3,3.4),blue));wing.position.set(0,2.2,0.6);G.add(wing);
  const tail=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(7,0.25,2),blue));tail.position.set(0,3,-7);G.add(tail);
  const fin=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(0.25,3,2.4),blue));fin.position.set(0,4.3,-7);G.add(fin);
  [-4.6,4.6].forEach(o=>{const eng=new THREE.Mesh(new THREE.CylinderGeometry(0.65,0.65,2.2,10),dark);eng.rotation.x=Math.PI/2;eng.position.set(o,1.6,1.4);G.add(eng);});
  [[-2.2,0.9],[2.2,0.9],[0,6.4]].forEach(p=>{const gl=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,1.4),dark);gl.position.set(p[0],0.9,p[1]);G.add(gl);
    const w=new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.35,0.3,12),tireMat);w.rotation.z=Math.PI/2;w.position.set(p[0],0.35,p[1]);G.add(w);});
  /* winglets, cabin window band and a tail beacon */
  [[-9.4],[9.4]].forEach(p=>{const wl=new THREE.Mesh(new THREE.BoxGeometry(0.15,1.1,1.2),blue);wl.position.set(p[0],2.8,0.5);G.add(wl);});
  [[1.36],[-1.36]].forEach(p=>{const band=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.5,11),dark);band.position.set(p[0],2.9,0);G.add(band);});
  const beacon=new THREE.Mesh(new THREE.SphereGeometry(0.12,8,8),new THREE.MeshBasicMaterial({color:0xff4444}));beacon.position.set(0,5.9,-7);G.add(beacon);
  return G;
}
/* ================= FLEETS: player, trains, planes, buses, traffic ================= */
const player={mesh:null,limbs:{},x:6,y:0,z:6,vy:0,grounded:true,yaw:Math.PI,onFoot:true,inTrain:false,inPlane:false,inBus:false,inRocket:false,train:null,planeRef:null,bus:null,drive:null,walkT:0};
let playerEarthMesh=null,astroMesh=null;
{
  const g=makePerson(1,0x2563eb);
  g.traverse(o=>{if(o.castShadow!==undefined)o.castShadow=true;});
  player.mesh=g;player.limbs=g.userData.limbs;scene.add(g);
  playerEarthMesh=g;
  /* astronaut outfit for the moon: white suit, gold visor, backpack */
  const a=makePerson(1,0xf0f4f8);
  const suit=new THREE.MeshLambertMaterial({color:0xf0f4f8});
  a.traverse(o=>{if(o.isMesh)o.material=suit;});
  const helm=new THREE.Mesh(new THREE.SphereGeometry(0.33,12,12),new THREE.MeshLambertMaterial({color:0xffffff,transparent:true,opacity:0.5}));
  helm.position.y=1.9;a.add(helm);
  const visor=new THREE.Mesh(new THREE.SphereGeometry(0.24,10,10),new THREE.MeshLambertMaterial({color:0xd9a520}));
  visor.position.set(0,1.9,0.14);a.add(visor);
  const pack=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.7,0.3),new THREE.MeshLambertMaterial({color:0xc9cfd8}));
  pack.position.set(0,1.35,-0.32);a.add(pack);
  a.visible=false;scene.add(a);
  astroMesh=a;
}
function setAstro(on){
  const cur=on?astroMesh:playerEarthMesh;
  if(player.mesh===cur)return;
  const old=player.mesh;
  cur.position.copy(old.position);cur.rotation.y=old.rotation.y;
  cur.visible=old.visible;old.visible=false;
  player.mesh=cur;player.limbs=cur.userData.limbs;
}
/* ---------- the HELICOPTER ---------- */
function buildHeliMesh(color){
  const G=new THREE.Group();
  const mat=paintMat(color||0xd7263d);
  const cab=shadowBox(new THREE.Mesh(new THREE.SphereGeometry(1.5,12,10),mat));
  cab.scale.set(1,0.85,1.35);cab.position.y=1.7;G.add(cab);
  const glass=new THREE.Mesh(new THREE.SphereGeometry(1.2,10,8,0,Math.PI),glassMat);
  glass.rotation.y=-Math.PI/2;glass.scale.set(1,0.8,1.1);glass.position.set(0,1.8,0.7);G.add(glass);
  const boom=shadowBox(new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.4,4.4,8),mat));
  boom.rotation.x=Math.PI/2;boom.position.set(0,1.9,-3.2);G.add(boom);
  const fin=new THREE.Mesh(new THREE.BoxGeometry(0.12,1.2,0.8),mat);
  fin.position.set(0,2.5,-5.2);G.add(fin);
  /* skids */
  [[-0.9],[0.9]].forEach(p=>{
    const sk=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,3.4),darkTrim);
    sk.rotation.x=Math.PI/2;sk.position.set(p[0],0.25,0);G.add(sk);
    [[-1],[1]].forEach(q=>{
      const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.9),darkTrim);
      leg.position.set(p[0],0.7,q[0]*0.9);leg.rotation.z=p[0]*0.3;G.add(leg);
    });
  });
  /* main rotor + tail rotor (they really spin) */
  const rotor=new THREE.Group();rotor.position.y=2.9;G.add(rotor);
  const hub2=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.14,0.5,8),darkTrim);rotor.add(hub2);
  [0,Math.PI/2].forEach(a=>{
    const bl=new THREE.Mesh(new THREE.BoxGeometry(9,0.06,0.36),darkTrim);
    bl.rotation.y=a;rotor.add(bl);
  });
  const tail=new THREE.Group();tail.position.set(0.28,2.5,-5.2);G.add(tail);
  const tb=new THREE.Mesh(new THREE.BoxGeometry(0.05,1.6,0.2),darkTrim);tail.add(tb);
  G.userData.rotor=rotor;G.userData.tailRotor=tail;
  G.userData.camD=17;G.userData.camH=7;
  return G;
}
/* ---------- the rocket ---------- */
function buildRocketMesh(){
  const G=new THREE.Group();
  const white=new THREE.MeshLambertMaterial({color:0xf4f7fb}),red=new THREE.MeshLambertMaterial({color:0xd7263d});
  const body=shadowBox(new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.2,16,14),white));body.position.y=9;G.add(body);
  const nose=shadowBox(new THREE.Mesh(new THREE.ConeGeometry(2.2,5.5,14),red));nose.position.y=19.7;G.add(nose);
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2;
    const fin=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(0.3,5,2.8),red));
    fin.position.set(Math.sin(a)*2.9,3.2,Math.cos(a)*2.9);fin.rotation.y=a;G.add(fin);
  }
  for(let i=0;i<3;i++){
    const w=new THREE.Mesh(new THREE.SphereGeometry(0.42,8,8),glassMat);
    w.position.set(0,12.5-i*2.6,2.1);G.add(w);
  }
  /* landing legs + grid fins, like a real booster */
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2+Math.PI/4;
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.16,4.6),new THREE.MeshLambertMaterial({color:0x2f3542}));
    leg.position.set(Math.sin(a)*2.9,1.6,Math.cos(a)*2.9);leg.rotation.z=Math.cos(a)*0.5;leg.rotation.x=-Math.sin(a)*0.5;G.add(leg);
    const fin=new THREE.Mesh(new THREE.BoxGeometry(1.1,0.9,0.08),new THREE.MeshLambertMaterial({color:0x9aa0a8}));
    fin.position.set(Math.sin(a)*2.35,16.4,Math.cos(a)*2.35);fin.rotation.y=a;G.add(fin);
  }
  const flame=new THREE.Mesh(new THREE.ConeGeometry(1.7,7,10),new THREE.MeshBasicMaterial({color:0xff9c33,transparent:true,opacity:0.9}));
  flame.rotation.x=Math.PI;flame.position.y=-3;flame.visible=false;G.add(flame);
  const flame2=new THREE.Mesh(new THREE.ConeGeometry(0.9,4.5,8),new THREE.MeshBasicMaterial({color:0xfff2b0,transparent:true,opacity:0.9}));
  flame2.rotation.x=Math.PI;flame2.position.y=-1.9;flame2.visible=false;G.add(flame2);
  G.userData.flame=flame;G.userData.flame2=flame2;
  return G;
}
const rocket={g:buildRocketMesh(),state:"idle",x:0,y:0,z:0,vy:0,hs:0,t:0,pad:null,wait:0};
rocket.g.visible=false;scene.add(rocket.g);
/* smoke: a small pool of recycled puffs (lots of smoke + fire at liftoff) */
const smoke=[];
for(let i=0;i<34;i++){
  const m=new THREE.Mesh(new THREE.SphereGeometry(1,7,6),
    new THREE.MeshLambertMaterial({color:0xd4d8dd,transparent:true,opacity:0}));
  m.visible=false;scene.add(m);
  smoke.push({m,life:0});
}
function puffSmoke(x,y,z,big){
  for(const p of smoke){
    if(p.life>0)continue;
    p.life=1;p.m.visible=true;
    p.m.position.set(x+(Math.random()-0.5)*3,y,z+(Math.random()-0.5)*3);
    p.m.scale.setScalar(big?2.4+Math.random()*1.4:1+Math.random()*0.8);
    return;
  }
}
function updateSmoke(dt){
  for(const p of smoke){
    if(p.life<=0)continue;
    p.life-=dt*0.45;
    p.m.position.y+=dt*2.4;
    p.m.scale.multiplyScalar(1+dt*1.1);
    p.m.material.opacity=Math.max(0,p.life)*0.55;
    if(p.life<=0)p.m.visible=false;
  }
}
let myVehicle=null;
const headLight=new THREE.PointLight(0xfff2c0,0,42);scene.add(headLight);
/* trains: 6, on the 3 nearest lines */
const trains=[];
for(let i=0;i<6;i++){
  const g=buildTrainMesh(TRAIN_COLORS[i]);scene.add(g);
  trains.push({g,k:(i%3)-1,z:-700+i*300,speed:34+i*2,state:"cruise",wait:0,tgtZ:0});
}
/* planes: 3 */
const planes=[];
for(let i=0;i<3;i++){
  const g=buildPlaneMesh(PLANE_COLORS[i]);scene.add(g);
  planes.push({g,x:i*500,y:150,z:i*300,yaw:0,speed:65,theta:i*2,state:"flying",bank:0,pitch:0,wait:0,
    home:{i:0,j:0},dest:null,circleC:{x:i*800,z:i*500}});
}
/* buses: 4 */
const BUS_COLORS=[0xe67e22,0x1d6fd1,0x27ae60,0xd7263d];
const buses=[];
for(let i=0;i<4;i++){
  const g=buildBusMesh(BUS_COLORS[i]);scene.add(g);
  buses.push({g,axis:"z",line:30+i*120,t:i*130,dir:1,speed:0,state:"drive",wait:0,stop:null,dest:null,yaw:0,x:0,z:0});
}
function busLaneC(b){const off=3.5;return b.axis==="z"?(b.dir>0?b.line-off:b.line+off):(b.dir>0?b.line+off:b.line-off);}
function busPos(b){const c=busLaneC(b);return b.axis==="z"?{x:c,z:b.t}:{x:b.t,z:c};}
/* traffic incl. emergency vehicles */
const traffic=[];
function addTrafficCar(){
  const r=Math.random();
  let mesh,kind=null,vtype="car";
  if(r<0.06){kind="police";mesh=buildEmergencyMesh("police");}
  else if(r<0.1){kind="ambulance";mesh=buildEmergencyMesh("ambulance");}
  else if(r<0.13){kind="fire";mesh=buildEmergencyMesh("fire");}
  else{
    const t=Math.random();
    vtype=t<0.16?"moto":(t<0.3?"bike":"car");
    mesh=buildVehicleMesh(vtype,COLORS[Math.floor(Math.random()*COLORS.length)]);
    if(mesh.userData.riderMesh)mesh.userData.riderMesh.visible=true;
  }
  mesh.visible=S.traffic;scene.add(mesh);
  const c={mesh,lane:null,t:0,sp:15,controlled:false,kind,vtype,siren:false,sirenT:10+Math.random()*30,dodge:0};
  if(S.traffic)respawnCar(c);
  traffic.push(c);
}
function setTrafficCount(n){
  n=Math.max(0,Math.min(60,n));
  while(traffic.length<n)addTrafficCar();
  while(traffic.length>n){const c=traffic.pop();if(player.drive===c){traffic.push(c);break;}scene.remove(c.mesh);disposeGroup(c.mesh);}
  $("tCount").textContent=traffic.length;
}
function trafficPos(c){const l=c.lane;const cc=l.c+(c.dodge||0);return l.axis==="z"?{x:cc,z:c.t}:{x:c.t,z:cc};}
function respawnCar(c){
  const rr=Math.random;
  let axis=rr()<0.5?"z":"x",line=null,hw=false,mega=false;
  const bike=c.vtype==="bike";
  if(!bike&&axis==="z"&&Math.abs(player.x-MHX)<400&&rr()<0.4){line=MHX;hw=true;mega=true;}   // the 8-lane MEGA HIGHWAY
  else if(!bike&&axis==="x"&&Math.abs(player.z-MHZ)<400&&rr()<0.4){line=MHZ;hw=true;mega=true;}
  else if(!bike&&axis==="z"&&Math.abs(player.x-170)<350&&rr()<0.3){line=170;hw=true;}      // no bicycles on the highway
  else if(!bike&&axis==="x"&&Math.abs(player.z+170)<350&&rr()<0.3){line=-170;hw=true;}
  else{
    const p=axis==="z"?player.x:player.z;
    const base=Math.round((p-30)/120)*120+30;
    const opts=[base-240,base-120,base,base+120,base+240];
    line=opts[Math.floor(rr()*opts.length)];
  }
  const dir=rr()<0.5?1:-1;
  const off=mega?[3,6.6,10.2,13.8][Math.floor(rr()*4)]:hw?(rr()<0.5?2.75:8.25):3.5;
  const cc=axis==="z"?(dir>0?line-off:line+off):(dir>0?line+off:line-off);
  c.lane={axis,c:cc,dir,hw};
  c.sp=(mega?36:hw?31:13)*(0.8+rr()*0.5);
  if(c.vtype==="bike")c.sp*=0.42;else if(c.vtype==="moto")c.sp*=1.15;
  const along=axis==="z"?player.z:player.x;
  c.t=along+(rr()*2-1)*320;
}
/* ---------- game audio: siren, engine, crashes, background music ---------- */
const SND={sound:true,music:true};
let audioCtx=null,sirenOsc=null,sirenGain=null;
let engOsc=null,engOsc2=null,engFilt=null,engGain=null,musicGain=null,musicTimer=null,_lastCrash=0,hornGain=null;
let rocketNoise=null,rocketGain=null,windGain=null;
function setWind(speedMS){
  if(!audioCtx||!windGain)return;
  const v=(SND.sound&&S.mode==="game")?Math.min(0.13,Math.max(0,speedMS-14)*0.0016):0;
  windGain.gain.setTargetAtTime(v,audioCtx.currentTime,0.25);
}
function setHorn(on){
  if(!audioCtx||!hornGain)return;
  const allow=SND.sound&&(typeof SETTINGS==="undefined"||SETTINGS.honk);
  hornGain.gain.setTargetAtTime(on&&allow?0.12:0,audioCtx.currentTime,0.015);
}
let hornOscs=[];
function setHornPitch(base){
  /* every car honks a little differently — fast cars sound deeper */
  hornOscs.forEach((o,i)=>{try{o.frequency.setTargetAtTime(base*(i?1.26:1),audioCtx.currentTime,0.02);}catch(e){}});
}
/* short polite "beep beep" from traffic cars */
let _beepT=0;
function trafficBeep(dist){
  if(!audioCtx||!SND.sound)return;
  if(typeof SETTINGS!=="undefined"&&!SETTINGS.honk)return;
  const now=performance.now();
  if(now-_beepT<900)return;
  _beepT=now;
  const t=audioCtx.currentTime,vol=Math.max(0.02,0.09*(1-dist/90));
  [0,0.16].forEach(off=>{
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.type="triangle";o.frequency.value=430+Math.random()*140;
    g.gain.setValueAtTime(0,t+off);
    g.gain.linearRampToValueAtTime(vol,t+off+0.015);
    g.gain.exponentialRampToValueAtTime(0.001,t+off+0.13);
    o.connect(g);g.connect(audioCtx.destination);
    o.start(t+off);o.stop(t+off+0.15);
  });
}
function ensureAudio(){
  if(audioCtx)return;
  try{
    audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    /* a much nicer siren: soft triangle through a bandpass — smooth "wee-woo",
       not the old piercing sine screech */
    sirenOsc=audioCtx.createOscillator();sirenGain=audioCtx.createGain();
    sirenGain.gain.value=0;sirenOsc.type="triangle";sirenOsc.frequency.value=660;
    const sirenBP=audioCtx.createBiquadFilter();
    sirenBP.type="bandpass";sirenBP.frequency.value=900;sirenBP.Q.value=1.4;
    sirenOsc.connect(sirenBP);sirenBP.connect(sirenGain);sirenGain.connect(audioCtx.destination);sirenOsc.start();
    /* engine: a soft two-layer hum through a lowpass filter — pitch and
       volume follow your speed without the harsh sawtooth buzz */
    engOsc=audioCtx.createOscillator();engOsc.type="triangle";engOsc.frequency.value=60;
    engOsc2=audioCtx.createOscillator();engOsc2.type="sine";engOsc2.frequency.value=30;
    engFilt=audioCtx.createBiquadFilter();engFilt.type="lowpass";engFilt.frequency.value=240;engFilt.Q.value=0.5;
    engGain=audioCtx.createGain();engGain.gain.value=0;
    engOsc.connect(engFilt);engOsc2.connect(engFilt);engFilt.connect(engGain);
    engGain.connect(audioCtx.destination);engOsc.start();engOsc2.start();
    /* wind rush at speed: soft filtered noise that grows as you go faster */
    {
      const len=audioCtx.sampleRate*2,buf=audioCtx.createBuffer(1,len,audioCtx.sampleRate);
      const d=buf.getChannelData(0);
      for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
      const src=audioCtx.createBufferSource();src.buffer=buf;src.loop=true;
      const wf=audioCtx.createBiquadFilter();wf.type="bandpass";wf.frequency.value=600;wf.Q.value=0.4;
      windGain=audioCtx.createGain();windGain.gain.value=0;
      src.connect(wf);wf.connect(windGain);windGain.connect(audioCtx.destination);
      src.start();
    }
    /* rocket rumble: filtered noise, silent until a launch */
    {
      const len=audioCtx.sampleRate*2,buf=audioCtx.createBuffer(1,len,audioCtx.sampleRate);
      const d=buf.getChannelData(0);
      for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
      rocketNoise=audioCtx.createBufferSource();rocketNoise.buffer=buf;rocketNoise.loop=true;
      const rf=audioCtx.createBiquadFilter();rf.type="lowpass";rf.frequency.value=140;
      rocketGain=audioCtx.createGain();rocketGain.gain.value=0;
      rocketNoise.connect(rf);rf.connect(rocketGain);rocketGain.connect(audioCtx.destination);
      rocketNoise.start();
    }
    /* two-tone car horn — triangle waves through a lowpass: full but not harsh */
    hornGain=audioCtx.createGain();hornGain.gain.value=0;
    const hornLP=audioCtx.createBiquadFilter();hornLP.type="lowpass";hornLP.frequency.value=1500;
    hornGain.connect(hornLP);hornLP.connect(audioCtx.destination);
    hornOscs=[390,494].map(f=>{
      const o=audioCtx.createOscillator();o.type="triangle";o.frequency.value=f;
      const g=audioCtx.createGain();g.gain.value=0.55;
      o.connect(g);g.connect(hornGain);o.start();
      return o;
    });
    /* music bus */
    musicGain=audioCtx.createGain();musicGain.gain.value=0.4;musicGain.connect(audioCtx.destination);   // music louder (sound effects unchanged)
    startMusic();
  }catch(e){}
}
/* REAL music: the mp3s from the Music folder play in a random shuffle */
const MUSIC_FILES=[
  "Music/orbit-d0d-main-version-29627-02-39.mp3",
  "Music/rainy-window-avbe-main-version-18796-01-21.mp3",
  "Music/soft-mist-movement-tranquilium-main-version-25768-04-42.mp3"
];
let musicAudio=null,musicIdx=-1;
function nextTrack(){
  if(!musicAudio)return;
  let i;
  do{i=Math.floor(Math.random()*MUSIC_FILES.length);}while(MUSIC_FILES.length>1&&i===musicIdx);
  musicIdx=i;
  musicAudio.src=MUSIC_FILES[i];
  if(SND.music)musicAudio.play().catch(()=>{});
}
function startMusic(){
  if(musicAudio)return;
  try{
    musicAudio=new Audio();
    musicAudio.volume=0.45;
    musicAudio.addEventListener("ended",nextTrack);
    musicAudio.addEventListener("error",()=>setTimeout(nextTrack,4000));
    nextTrack();
  }catch(e){}
}
function setMusicOn(on){
  if(!musicAudio)return;
  if(on)musicAudio.play().catch(()=>{});
  else musicAudio.pause();
}
function playCrash(strength){
  if(!audioCtx||!SND.sound)return;
  if(typeof SETTINGS!=="undefined"&&!SETTINGS.crash)return;
  const now=performance.now();
  if(now-_lastCrash<350)return;_lastCrash=now;
  const t=audioCtx.currentTime,dur=0.32;
  /* softer, deeper crunch + a low "thump" — less like white-noise static */
  const buf=audioCtx.createBuffer(1,audioCtx.sampleRate*dur,audioCtx.sampleRate);
  const d=buf.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2.6);
  const src=audioCtx.createBufferSource();src.buffer=buf;
  const f=audioCtx.createBiquadFilter();f.type="lowpass";f.frequency.value=520;
  const g=audioCtx.createGain();g.gain.value=Math.min(0.7,0.22+(strength||10)*0.01);
  src.connect(f);f.connect(g);g.connect(audioCtx.destination);src.start();
  const th=audioCtx.createOscillator(),tg=audioCtx.createGain();
  th.type="sine";th.frequency.setValueAtTime(90,t);th.frequency.exponentialRampToValueAtTime(38,t+0.22);
  tg.gain.setValueAtTime(0.4,t);tg.gain.exponentialRampToValueAtTime(0.001,t+0.26);
  th.connect(tg);tg.connect(audioCtx.destination);th.start(t);th.stop(t+0.3);
}
function updateEngine(speedMS,driving){
  if(!audioCtx||!engOsc)return;
  const on=SND.sound&&driving&&S.mode==="game"&&(typeof SETTINGS==="undefined"||SETTINGS.engine);
  engGain.gain.setTargetAtTime(on?Math.min(0.13,0.032+speedMS*0.0009):0,audioCtx.currentTime,0.15);
  const f=38+Math.min(115,speedMS*0.9);   // deep smooth hum, never screechy
  engOsc.frequency.setTargetAtTime(f,audioCtx.currentTime,0.15);
  engOsc2.frequency.setTargetAtTime(f/2,audioCtx.currentTime,0.15);
  engFilt.frequency.setTargetAtTime(180+speedMS*1.6,audioCtx.currentTime,0.2);
}
function setRocketRumble(v){
  if(!audioCtx||!rocketGain)return;
  rocketGain.gain.setTargetAtTime(SND.sound?v:0,audioCtx.currentTime,0.15);
}
addEventListener("pointerdown",ensureAudio,{once:true});
addEventListener("keydown",ensureAudio,{once:true});
function updateSiren(dt){
  if(!audioCtx)return;
  let nearest=1e9,any=false;
  for(const c of traffic){
    if(!c.siren||!c.mesh.visible)continue;any=true;
    const p=(c.controlled||c.chase)?{x:c.x,z:c.z}:trafficPos(c);
    nearest=Math.min(nearest,Math.hypot(p.x-player.x,p.z-player.z));
  }
  const allow=SND.sound&&(typeof SETTINGS==="undefined"||SETTINGS.siren);
  const vol=(allow&&any&&nearest<120)?0.13*(1-nearest/120):0;
  sirenGain.gain.setTargetAtTime(vol,audioCtx.currentTime,0.1);
  /* real European two-tone: it STEPS between the notes instead of screeching */
  const hi=Math.floor(performance.now()/620)%2===0;
  sirenOsc.frequency.setTargetAtTime(hi?880:660,audioCtx.currentTime,0.03);
}
