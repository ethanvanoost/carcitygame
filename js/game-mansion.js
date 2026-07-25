/* Car City Game — game-mansion.js (part 9/16, split from the old game.js).
   Plain JS, ONE shared global scope across all scripts — the load order in index.html MUST stay: core, world, vehicles, then game-* parts in numbered order. */
/* ================= MANSIONS: furniture & the T editor ================= */
const MFURN=new Map();      // mansion id -> [{t,dx,dz,r}] placed furniture
const TRAMPS=[];            // trampolines: walk on one to bounce!
/* the furniture & garden shop — indoor and outdoor items */
const FURN=[
  {t:"gcons",n:"My console + TV",e:"\u{1F3AE}",p:0,out:0},
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
/* the MARKETING PLOT editor sells exactly two things — both free to place */
const FURN_MKT=[
  {t:"mtable",n:"Long table",e:"\u{1FA91}",p:0,out:2},
  {t:"mshelf",n:"Store shelf",e:"\u{1F6D2}",p:0,out:2},
  {t:"mcase",n:"Display case",e:"\u{1F5C4}",p:0,out:2}
];
const furnDef=t=>FURN.find(f=>f.t===t)||FURN_MKT.find(f=>f.t===t);
/* build one piece of furniture at world (x,z), on floor y, rotated r */
function buildFurnPiece(t,x,z,y,r,parent,man){
  const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=r||0;parent.add(g);
  if(t==="gcons"){   // 🎮 your console hooked up to a TV — press T to play!
    const stand=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.5,0.5),new THREE.MeshLambertMaterial({color:0x3a3f4a}));
    stand.position.y=0.25;g.add(stand);
    const scr=new THREE.Mesh(new THREE.BoxGeometry(1.7,1,0.08),new THREE.MeshLambertMaterial({color:0x0b0f16}));
    scr.position.y=1.1;g.add(scr);
    const glow=new THREE.Mesh(new THREE.PlaneGeometry(1.5,0.8),new THREE.MeshBasicMaterial({color:0x3fd0ff}));
    glow.position.set(0,1.1,0.05);g.add(glow);
    const it2=GFI.it;
    const cb3=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.14,0.38),
      new THREE.MeshLambertMaterial({color:new THREE.Color((it2&&it2.chx)||"#1c1c1e")}));
    cb3.position.set(0.5,0.57,0.1);g.add(cb3);
    if(it2)GCONS.push({g,x,z,y,cm:it2.cm||"game console"});   // real pieces only, never the ghost
    return;
  }
  if(t==="mtable"){   // the market's LONG TABLE
    const top=new THREE.Mesh(new THREE.BoxGeometry(7,0.24,2.4),new THREE.MeshLambertMaterial({color:0x8a6f4d}));
    top.position.y=1;top.castShadow=true;g.add(top);
    const legM=new THREE.MeshLambertMaterial({color:0x6f4e37});
    [[-3.1,-0.9],[3.1,-0.9],[-3.1,0.9],[3.1,0.9]].forEach(o=>{
      const lg=new THREE.Mesh(new THREE.BoxGeometry(0.18,1,0.18),legM);
      lg.position.set(o[0],0.5,o[1]);g.add(lg);
    });
    return;
  }
  if(t==="mshelf"){   // the market's STORE SHELF: 3 rows, 5 spots each
    const wood=new THREE.MeshLambertMaterial({color:0x8a6f4d});
    const back=new THREE.Mesh(new THREE.BoxGeometry(4.6,2.6,0.08),wood);
    back.position.set(0,1.3,-0.5);g.add(back);
    [[-2.3],[2.3]].forEach(o=>{
      const side=new THREE.Mesh(new THREE.BoxGeometry(0.1,2.6,1.1),wood);
      side.position.set(o[0],1.3,0);g.add(side);
    });
    [0.5,1.3,2.1].forEach(h2=>{
      const board=new THREE.Mesh(new THREE.BoxGeometry(4.6,0.09,1.05),wood);
      board.position.set(0,h2,0);board.castShadow=true;g.add(board);
    });
    return;
  }
  if(t==="mcase"){   // the market's DISPLAY CASE
    const ped=new THREE.Mesh(new THREE.BoxGeometry(1.6,1,1.6),new THREE.MeshLambertMaterial({color:0x8a6f4d}));
    ped.position.y=0.5;g.add(ped);
    const glass=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.1,1.2),new THREE.MeshLambertMaterial({color:0x9fd8ff,transparent:true,opacity:0.3}));
    glass.position.y=1.6;g.add(glass);
    return;
  }
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
    GFI.it=it;   // gcons pieces read their console model & color from here
    buildFurnPiece(it.t,wx,wz,fy,it.r||0,fg,man);
    GFI.it=null;
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
  if(!parent)man.shopG=g;   // visitor view: remembered so live updates can rebuild it
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
  if(!m||rentedAt(m.id))return;
  /* LIVE visiting: while you're here we re-check every 6 s, so the owner's
     new furniture & shop appear for you WITHOUT a refresh */
  const now=performance.now();
  if(m._vNext&&now<m._vNext)return;
  m._vNext=now+6000;
  fbGet(claimPath(m.id)).then(g2=>{
    if(!g2.ok||offScene(m.g))return;
    const d=(g2.data&&!g2.data.free)?g2.data:null;
    if(!d||d.t===myToken())return;
    const sig=(d.furn||"")+"|"+(d.shop||0)+"|"+(d.n||"");
    const first=!m.visitDone;
    if(!first&&m._vSig===sig)return;   // nothing changed since last look
    m._vSig=sig;m.visitDone=true;
    m.owner=d.n||"a player";
    /* show their furniture exactly how they placed it — always the LATEST */
    if(typeof d.furn==="string"){
      try{
        const items=JSON.parse(d.furn);
        if(Array.isArray(items))MFURN.set(m.id,items.slice(0,80));
      }catch(e){}
    }
    buildMansionFurniture(m);
    if(m.ownerLbl){m.g.remove(m.ownerLbl);m.ownerLbl=null;}
    const lbl=mpMakeLabel("\u{1F3F0} "+m.owner);
    lbl.scale.set(16,4,1);
    lbl.position.set(m.x,m.baseY+30,m.z+40);
    m.g.add(lbl);m.ownerLbl=lbl;
    if(m.shopG){m.g.remove(m.shopG);disposeGroup(m.shopG);m.shopG=null;m.stall=null;}
    if(typeof d.shop==="number"&&d.shop>0)buildStall(m,m.owner,d.shop);
    if(first)toast("\u{1F3F0} You're visiting "+m.owner+"'s "+(m.house?"house":"mansion")+" — press T inside for the \u{1F4D6} guest book"+(d.shop?" and \u{1F95F} dumpling shop":"")+"!");
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
const MEDIT={on:false,man:null,mkt:null,sel:null,tool:"place",rot:0};
function renderMeditBar(){
  const w=$("meditItems");w.innerHTML="";
  (MEDIT.mkt?FURN_MKT:FURN).forEach(f=>{
    const b=document.createElement("button");
    b.className="fitem"+(MEDIT.sel===f.t&&MEDIT.tool==="place"?" on":"");
    b.innerHTML="<span class='fe'>"+f.e+"</span><span class='fn'>"+f.n+"</span><span class='fp'>"+(f.out&&!MEDIT.mkt?"\u{1F33F} ":"")+(f.p?"$"+fmtMoney(f.p):"FREE")+"</span>";
    b.onclick=()=>{MEDIT.sel=f.t;MEDIT.tool="place";renderMeditBar();
      toast(MEDIT.mkt?"\u{1F3EA} Click anywhere on your wooden floor to place the "+f.n+"!"
        :(f.out?"\u{1F33F} Garden item — click the LAWN":"\u{1F3E0} Indoor item — click the FLOOR")+" to place your "+f.n+" ($"+fmtMoney(f.p)+")");};
    w.appendChild(b);
  });
  ["meditShop","meditOrder","meditBook"].forEach(id=>$(id).style.display=MEDIT.mkt?"none":"");
  ["meditGen","meditGenEmpty","meditSaves"].forEach(id=>$(id).style.display=MEDIT.mkt?"":"none");
  $("meditRemove").classList.toggle("on",MEDIT.tool==="remove");
}
$("meditGen").onclick=()=>{if(MEDIT.mkt)mktGenerate(MEDIT.mkt);};
$("meditGenEmpty").onclick=()=>{if(MEDIT.mkt)openGenEmpty(MEDIT.mkt);};
$("meditSaves").onclick=()=>{if(MEDIT.mkt)openShopDesigns(MEDIT.mkt);};
function openMansionEdit(man){
  MEDIT.on=true;MEDIT.man=man;MEDIT.mkt=null;MEDIT.sel=null;MEDIT.tool="place";MEDIT.rot=0;
  renderMeditBar();
  $("meditBar").classList.add("show");
  toast("\u{1F6E0} MANSION EDITOR — pick an item below, then click where to put it. R rotates, T (or ✅ Done) exits.");
}
/* the MARKET editor is the SAME editor — just with long tables & display cases */
function openMarketEdit(p){
  MEDIT.on=true;MEDIT.man=null;MEDIT.mkt=p;MEDIT.sel=null;MEDIT.tool="place";MEDIT.rot=0;
  renderMeditBar();
  $("meditBar").classList.add("show");
  toast("\u{1F3EA} MARKET EDITOR — pick below, click the floor to place. R rotates, \u{1F5D1} Remove deletes, T (or ✅ Done) exits.");
}
function closeMansionEdit(){
  const man=MEDIT.man,mk=MEDIT.mkt;
  MEDIT.on=false;MEDIT.man=null;MEDIT.mkt=null;
  killGhost();
  $("meditBar").classList.remove("show");
  if(mk){
    saveMkt();saveGame();syncMarket(mk.id);renderMarket(mk);
    toast("\u{1F3EA} Market saved — walk to a table and press T to stock it!");
    return;
  }
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
  if(!MEDIT.on||MEDIT.tool!=="place"||!MEDIT.sel||(!MEDIT.man&&!MEDIT.mkt)||!e||e.target!==renderer.domElement){killGhost();return;}
  const man=MEDIT.man,mk=MEDIT.mkt,def=furnDef(MEDIT.sel);
  if(!def){killGhost();return;}
  const pt=meditGroundPoint(e,mk?mk.y:man.baseY+0.3);
  if(!pt){killGhost();return;}
  if(!GHOST.g||GHOST.t!==MEDIT.sel||GHOST.rot!==MEDIT.rot)ghostBuild(man);
  GHOST.g.position.set(pt.x,pt.y,pt.z);
  /* same rules as really placing it — so the color never lies */
  let ok=true;
  if(mk){
    const dx=pt.x-mk.x,dz=pt.z-mk.z;
    ok=Math.abs(dx)<=48&&Math.abs(dz)<=48&&(MKT[mk.id]&&(MKT[mk.id].items||[]).length<16);
  }else{
    const dx=pt.x-man.x,dz=pt.z-man.z;
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
  }
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
  if(MEDIT.mkt){mktEditClick(e);return;}
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
    if(it&&it.t==="gcons"&&it.cm){   // your console comes back to your collection
      CONSOLE.owned.push({m:it.cm,br:it.cbr||"?",tier:it.cti||1,yr:it.cyr||2000,color:it.cc||"Black",hex:it.chx||"#1c1c1e"});
      renderDump();
    }
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
  if(def.t==="gcons"){
    /* placing YOUR console: pick one from your collection — it moves onto the TV stand */
    if(!CONSOLE.owned.length){toast("\u{1F3AE} You don't own a console yet — grab a FREE box at CoolBlue and unbox it!");return;}
    const groups=mktGroups("console").slice(0,10);
    const opts=groups.map((g2,i)=>({label:(g2.lab==="Rainbow"?"\u{1F308} RAINBOW ":g2.lab+" ")+g2.pm+" ("+g2.n+")",value:i}));
    opts.push({label:"❌ Cancel",value:"x"});
    const pdx=Math.round(dx*10)/10,pdz=Math.round(dz*10)/10,rot=MEDIT.rot;
    showDest("\u{1F3AE} Which console goes on the TV stand?",opts,v=>{
      if(typeof v!=="number")return;
      const grp=groups[v];
      if(mktTakeStock("console",grp,1)<1){toast("That console is gone!");return;}
      items.push({t:"gcons",dx:pdx,dz:pdz,r:rot,cm:grp.pm,cc:grp.lab,chx:grp.hex||"#1c1c1e",cbr:grp.br||"",cti:grp.tier||1,cyr:grp.yr||2000});
      buildMansionFurniture(man);saveGame();
      toast("\u{1F3AE} "+grp.pm+" is hooked up — walk to it and press T to PLAY!");
    });
    return;
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
/* ---------- upload a .MID file and the piano PLAYS it, live ----------
   NOTE: named parsePianoMidi — a second "parseMidi" here used to shadow the
   church organ's parser (function hoisting), which silenced the organ forever. */
function parsePianoMidi(buf){
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
      const ev=parsePianoMidi(rd.result);
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
