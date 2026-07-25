/* Car City Game — game-market.js (part 8/16, split from the old game.js).
   Plain JS, ONE shared global scope across all scripts — the load order in index.html MUST stay: core, world, vehicles, then game-* parts in numbered order. */
/* ================= MARKETING PLOTS: your own player-to-player market =================
   100x100 m plots every ~3 km. BUY $80K or RENT $100/day, choose building or open-air,
   then stock LONG TABLES (with prices & bonus deals) and DISPLAY CASES. Other players
   walk in and buy — the money rides the payments inbox straight to you. */
const MKT_PRICE=80000,MKT_RENT=100;
const MKT={};    // my plots: id -> {b,name,sub,items:[{k,dx,dz,r,o:[offers]}]}
try{Object.assign(MKT,JSON.parse(localStorage.getItem("vc4mkt")||"{}"));}catch(e){}
/* pieces hold MULTIPLE offers now: table = 5, store shelf = 15 (3 rows x 5), case = 1.
   Old saves had ONE offer glued onto the piece — move it into the o[] list. */
function mktCap(it){return it.k==="c"?1:it.k==="s"?15:5;}
function mktMigrate(d){
  if(!d||!Array.isArray(d.items))return d;
  d.items.forEach(it=>{
    if(!Array.isArray(it.o)){
      it.o=[];
      if(it.ty)it.o.push({ty:it.ty,lab:it.lab,hex:it.hex||"",gl:it.gl||0,sz:it.sz||"",fh:it.fh||0,
        pm:it.pm||"",br:it.br||"",tier:it.tier||0,yr:it.yr||0,q:it.q||0,p:it.p||0,bb:it.bb||0,bf:it.bf||0});
      delete it.ty;
    }
  });
  return d;
}
for(const k of Object.keys(MKT))mktMigrate(MKT[k]);
function mkOffer(ty,grp,q,pr,bb,bf){
  /* slim offers: empty fields are left out so MANY more deals fit in the
     database's 100 KB market slot */
  const o={ty,lab:grp.lab,q,p:pr||0};
  if(grp.hex)o.hex=grp.hex;
  if(grp.gl)o.gl=1;
  if(grp.sz&&grp.sz!=="norm")o.sz=grp.sz;
  if(grp.fh)o.fh=grp.fh;
  if(grp.pm)o.pm=grp.pm;
  if(grp.br)o.br=grp.br;
  if(grp.tier)o.tier=grp.tier;
  if(grp.yr)o.yr=grp.yr;
  if(grp.does)o.does=String(grp.does).slice(0,60);
  if(grp.look)o.look=String(grp.look).slice(0,60);
  if(bb&&bf){o.bb=bb;o.bf=bf;}
  return o;
}
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
  if(it.ty==="mc")return (MC_EMOJI[it.lab]||"⛏️")+" "+it.lab.charAt(0).toUpperCase()+it.lab.slice(1)+(it.lab==="diamond"?"":" block");
  if(it.ty==="custom")return "\u{1F9F0} "+it.lab+(it.does?" ("+it.does+")":"");
  if(it.ty==="phone"||it.ty==="console")return (it.lab==="Rainbow"?"\u{1F308} RAINBOW ":it.lab+" ")+(it.pm||(it.ty==="phone"?"phone":"console"));
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
  if(it.ty==="phone"){
    const mat=it.lab==="Rainbow"?rainbowMat():new THREE.MeshLambertMaterial({color:new THREE.Color(it.hex||"#1c1c1e")});
    const ph=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.44,0.04),mat);
    ph.position.set(x,y+0.22,z);ph.rotation.x=-0.35;sg.add(ph);return;
  }
  if(it.ty==="mc"){
    /* a minecraft block, in its block color (diamonds get a sparkly tint) */
    const MC_HEX={wood:"#8a6f4d",stone:"#9a9a9a",coal:"#26262a",iron:"#c8ccd4",gold:"#ffd75e",diamond:"#7fe3ff"};
    const mat=new THREE.MeshLambertMaterial({color:new THREE.Color(MC_HEX[it.lab]||"#9a9a9a")});
    if(it.lab==="diamond"||it.lab==="gold")mat.emissive=new THREE.Color(MC_HEX[it.lab]).multiplyScalar(0.3);
    const bk=new THREE.Mesh(new THREE.BoxGeometry(r*1.2,r*1.2,r*1.2),mat);
    bk.position.set(x,y+r*0.6,z);sg.add(bk);
    return;
  }
  if(it.ty==="custom"){
    /* a created item: a glowing gift-ish box in the inventor's chosen color */
    const mat=new THREE.MeshLambertMaterial({color:new THREE.Color(it.hex||"#9b5de5")});
    mat.emissive=new THREE.Color(it.hex||"#9b5de5").multiplyScalar(0.25);
    const bx=new THREE.Mesh(new THREE.BoxGeometry(r*1.3,r*1.3,r*1.3),mat);
    bx.position.set(x,y+r*0.65,z);bx.rotation.y=0.6;sg.add(bx);
    const lid=new THREE.Mesh(new THREE.BoxGeometry(r*1.45,r*0.22,r*1.45),new THREE.MeshLambertMaterial({color:0xffffff}));
    lid.position.set(x,y+r*1.3,z);lid.rotation.y=0.6;sg.add(lid);
    return;
  }
  if(it.ty==="console"){
    const mat=it.lab==="Rainbow"?rainbowMat():new THREE.MeshLambertMaterial({color:new THREE.Color(it.hex||"#1c1c1e")});
    const cb3=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.14,0.3),mat);
    cb3.position.set(x,y+0.07,z);sg.add(cb3);return;
  }
  if(it.ty==="butter"){
    /* butter squishies look like BUTTER: a golden stick with a pale top */
    const s=it.sz==="mega"?1.9:it.sz==="med"?1.35:1;
    const mat=it.lab==="Rainbow"?rainbowMat():new THREE.MeshLambertMaterial({color:new THREE.Color(it.hex||"#f4d35e")});
    if(it.gl&&it.lab!=="Rainbow")mat.emissive=new THREE.Color(it.hex||"#ffffff").multiplyScalar(0.35);
    const bt=new THREE.Mesh(new THREE.BoxGeometry(r*1.9*s,r*0.85*s,r*1.1*s),mat);
    bt.position.set(x,y+r*0.43*s,z);sg.add(bt);
    const top=new THREE.Mesh(new THREE.BoxGeometry(r*2*s,r*0.16*s,r*1.2*s),new THREE.MeshLambertMaterial({color:0xfdf0c2}));
    top.position.set(x,y+r*0.9*s,z);sg.add(top);
    return;
  }
  const mat=it.lab==="Rainbow"?rainbowMat():new THREE.MeshLambertMaterial({color:new THREE.Color(it.hex||"#f2f5f7")});
  if(it.gl&&it.lab!=="Rainbow")mat.emissive=new THREE.Color(it.hex||"#ffffff").multiplyScalar(0.35);
  const s=it.sz==="mega"?1.9:it.sz==="med"?1.35:1;
  const dm=new THREE.Mesh(new THREE.SphereGeometry(r*s,10,8),mat);
  dm.scale.y=0.75;dm.position.set(x,y+r*s*0.4,z);sg.add(dm);
}
/* the plot's big front sign, repainted with the market's NAME + a subtitle */
function mktOwnedSignMat(name,sub){
  const cv=document.createElement("canvas");cv.width=512;cv.height=96;
  const c=cv.getContext("2d");
  c.fillStyle="#7a3ce8";c.fillRect(0,0,512,96);
  c.fillStyle="#fff";c.textAlign="center";
  const nm="\u{1F3EA} "+name;
  let fs=44;c.font="bold "+fs+"px Segoe UI";
  while(fs>18&&c.measureText(nm).width>492){fs-=2;c.font="bold "+fs+"px Segoe UI";}
  c.fillText(nm,256,sub?44:60);
  if(sub){
    let ss=24;c.font="bold "+ss+"px Segoe UI";
    while(ss>12&&c.measureText(sub).width>492){ss-=2;c.font="bold "+ss+"px Segoe UI";}
    c.fillStyle="#e3ccff";c.fillText(sub,256,80);
  }
  return new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv),side:THREE.DoubleSide});
}
function renderMarket(p){
  if(p.stallG){p.g.remove(p.stallG);disposeGroup(p.stallG);p.stallG=null;}
  const mine=rentedAt(p.id),data=marketData(p);
  const owner=mine?mpName():(MKTR.get(p.id)||{}).n||"a player";
  const title=(data&&data.name&&String(data.name).trim())?String(data.name).trim():owner+"'s Marketing Plot";
  /* claimed? the front sign shows the market's name + subtitle. Free? back to BUY/RENT. */
  if(p.signMesh){
    if(p.signMat){if(p.signMat.map)p.signMat.map.dispose();p.signMat.dispose();p.signMat=null;}
    if(data){
      p.signMat=mktOwnedSignMat(title,(data.sub&&String(data.sub).trim())||"by "+owner);
      p.signMesh.material=p.signMat;
    }else p.signMesh.material=mktSignMat();
  }
  if(!data)return;
  const sg=new THREE.Group();p.g.add(sg);p.stallG=sg;
  /* the market's name floats over the entrance too */
  const lbl=mpMakeLabel("\u{1F3EA} "+title.slice(0,22));
  lbl.scale.set(22,5.5,1);lbl.position.set(p.x,p.y+9,p.z+46);sg.add(lbl);
  /* optional building: TALL walls, a doorway, and a big pointy roof — in the
     owner's PRIMARY (walls) and SECONDARY (roof + trim) colors */
  if(data.b){
    const c1=(typeof data.c1==="number")?data.c1:0xdfe3ea;
    const c2=(typeof data.c2==="number")?data.c2:0x7a3ce8;
    const wm=new THREE.MeshLambertMaterial({color:c1});
    const tm=new THREE.MeshLambertMaterial({color:c2});
    const WH=8;   // wall height
    for(const[bw,bd,px,pz]of[[98,0.6,0,-48.7],[0.6,98,-48.7,0],[0.6,98,48.7,0],[42,0.6,-28,48.7],[42,0.6,28,48.7]]){
      const wl=new THREE.Mesh(new THREE.BoxGeometry(bw,WH,bd),wm);
      wl.position.set(p.x+px,p.y+WH/2,p.z+pz);wl.castShadow=true;sg.add(wl);
    }
    const hdr=new THREE.Mesh(new THREE.BoxGeometry(14.6,2.2,0.7),tm);
    hdr.position.set(p.x,p.y+WH-1.1,p.z+48.7);sg.add(hdr);
    /* the pointy spire roof covering the whole hall */
    const roof=new THREE.Mesh(new THREE.ConeGeometry(69,16,4),tm);
    roof.rotation.y=Math.PI/4;
    roof.position.set(p.x,p.y+WH+8,p.z);roof.castShadow=true;sg.add(roof);
    const tip=new THREE.Mesh(new THREE.SphereGeometry(0.9,8,8),new THREE.MeshBasicMaterial({color:0xffd700}));
    tip.position.set(p.x,p.y+WH+16.4,p.z);sg.add(tip);
  }
  (data.items||[]).forEach((it,i)=>{
    const sl=(typeof it.dx==="number")?it:mktSlot(i);   // old items fall back to the grid
    const tx=p.x+sl.dx,tz=p.z+sl.dz,ty=p.y,r=it.r||0;
    const offers=Array.isArray(it.o)?it.o:[];
    const rx=o=>tx+Math.cos(r)*o,rz=o=>tz-Math.sin(r)*o;
    buildFurnPiece(it.k==="c"?"mcase":it.k==="s"?"mshelf":"mtable",tx,tz,ty,r,sg,null);
    if(it.k==="c"){
      const o=offers[0];
      if(o&&o.ty)addMktGood(sg,o,tx,ty+1.15,tz,0.3);
      const l2=mktMakeLabel(o&&o.ty?mktItemName(o)+" — just LOOK!":(mine?"Empty case — press T here!":"Empty display case"),7);
      l2.position.set(tx,ty+3.1,tz);sg.add(l2);
    }else if(it.k==="s"){
      /* STORE SHELF: 3 rows x 5 spots, the goods sit right on the boards */
      offers.forEach((o,oi)=>{
        if(!o.ty)return;
        const row=Math.floor(oi/5),col=oi%5;
        addMktGood(sg,o,rx(-1.8+col*0.9),ty+0.62+row*0.8,rz(-1.8+col*0.9),0.17);
      });
      const inStock=offers.filter(o=>o.ty&&o.q>0).length;
      const l2=mktMakeLabel(offers.length
        ?"\u{1F6D2} STORE SHELF — "+inStock+" deal"+(inStock===1?"":"s")+" in stock (press T!)"
        :(mine?"Empty shelf — press T to stock it!":"Empty store shelf"),9);
      l2.position.set(tx,ty+3.6,tz);sg.add(l2);
    }else{
      /* LONG TABLE: up to 5 different offers side by side + stacked price signs */
      offers.forEach((o,oi)=>{
        if(o.ty&&o.q>0)addMktGood(sg,o,rx(-2.8+oi*1.4),ty+1.12,rz(-2.8+oi*1.4),0.24);
        const bon=((o.bb&&o.bf)?" · "+o.bb+"+"+o.bf+" FREE!":"")+mktBonusTag(o);
        const l2=mktMakeLabel(o.ty
          ?(o.q>0?mktItemName(o)+" ×"+o.q+" — $"+fmtMoney(mktPriceNow(o))+bon:mktItemName(o)+" — NO STOCK")
          :"(empty spot)",8);
        l2.position.set(tx,ty+2.9+oi*0.75,tz);sg.add(l2);
      });
      if(!offers.length){
        const l2=mktMakeLabel(mine?"Empty table — press T here to stock it!":"Empty table",9);
        l2.position.set(tx,ty+3.3,tz);sg.add(l2);
      }
    }
  });
}
/* small fitted sign: the text SHRINKS to fit instead of getting cut off */
function mktMakeLabel(text,w){
  const cv=document.createElement("canvas");cv.width=512;cv.height=64;
  const c=cv.getContext("2d");
  let fs=30;
  c.font="bold "+fs+"px 'Segoe UI',sans-serif";
  while(fs>13&&c.measureText(text).width>488){fs-=2;c.font="bold "+fs+"px 'Segoe UI',sans-serif";}
  const tw=Math.min(506,c.measureText(text).width+22);
  c.fillStyle="rgba(13,17,26,.8)";c.fillRect(256-tw/2,8,tw,48);
  c.fillStyle="#ffd75e";c.textAlign="center";c.textBaseline="middle";c.fillText(text,256,33);
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthTest:false}));
  s.scale.set(w,w/8,1);
  return s;
}
window.onMarketBuilt=p=>{if(rentedAt(p.id)&&MKT[p.id])renderMarket(p);};
function mktRegPath(id){return "/markets/"+mpWorldKey()+"/"+fbKey(id);}
let _mktWarnRules=false,_mktWarnClaim=false;
async function syncMarket(id){
  if(!SERVER_READY)return;
  const d=MKT[id];if(!d)return;
  const base={t:myToken(),n:mpName(),ts:Date.now()};
  const body=Object.assign({},base);
  const s=JSON.stringify(d);
  if(s.length<=100000)body.mkt=s;   // the rules allow up to 100 KB per market
  let ok=await fbPut(claimPath(id),body);
  if(!ok){
    ok=await fbPut(claimPath(id),base);   // old database rules: at least keep the claim
    if(ok&&!_mktWarnRules){
      _mktWarnRules=true;
      toast("⚠️ Your market's TABLES can't be stored online yet — the database rules need the update from FIREBASE-SETUP.md. Other players see an EMPTY market!");
    }
  }
  if(!ok&&!_mktWarnClaim){
    _mktWarnClaim=true;
    toast("⚠️ Your market couldn't be stored ONLINE — other players still see the plot FOR SALE! (Database rules or connection problem.)");
  }
  const co=String(id).slice(2).split(",").map(Number);
  fbPut(mktRegPath(id),{n:(d.name||"").slice(0,24),o:mpName(),x:co[0]||0,z:co[1]||0,ts:Date.now()});
}
/* self-healing: shortly after joining, re-store every market you own online —
   fixes plots that were claimed while offline or before the rules update */
setTimeout(()=>{
  RENT.list.forEach(rm=>{if(String(rm.id).startsWith("K:")&&MKT[rm.id])syncMarket(rm.id);});
},15000);
function soldPath(id){return "/sold/"+mpWorldKey()+"/"+fbKey(id);}
async function fetchMarketFresh(id){
  const g2=await fbGet(claimPath(id));
  if(g2.ok&&g2.data&&!g2.data.free&&g2.data.t!==myToken()){
    let d={b:0,name:"",items:[]};
    if(typeof g2.data.mkt==="string"){try{const q=JSON.parse(g2.data.mkt);if(q&&typeof q==="object")d=q;}catch(e){}}
    d.items=Array.isArray(d.items)?d.items:[];
    mktMigrate(d);
    /* the SOLD ledger: purchases the owner hasn't processed yet get subtracted
       from the stock everyone sees — so bought stock is GONE immediately, even
       while the owner is offline (entries older than the owner's last sync are
       already baked into the data, so only newer ones count) */
    const baseTs=(typeof g2.data.ts==="number")?g2.data.ts:0;
    try{
      const sl=await fbGet(soldPath(id));
      if(sl.ok&&sl.data)for(const sk of Object.keys(sl.data)){
        const e=sl.data[sk];
        if(!e||typeof e.n!=="number"||typeof e.ts!=="number"||e.ts<=baseTs)continue;
        const seg=String(e.r||"").split(".");
        const it2=d.items[parseInt(seg[0],10)];
        const o2=it2&&it2.o&&it2.o[parseInt(seg[1],10)||0];
        if(o2&&o2.ty)o2.q=Math.max(0,(o2.q||0)-Math.max(1,Math.floor(e.n)));
      }
    }catch(e){}
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
    if(!rm){openMarketDesk(p);return;}
    /* standing right next to one table/shelf? show JUST its deals */
    const ni=mktNearItem(p,3.4);
    const it=ni>=0?rm.d.items[ni]:null;
    if(it&&it.k!=="c"&&(it.o||[]).some(o=>o.ty))openMarketShop(p,rm,ni);
    else openMarketShop(p,rm);
  })();
}
/* which of the plot's tables/cases is the player standing next to? */
function mktNearItem(p,r){
  const d=marketData(p);
  if(!d||!d.items)return -1;
  let bi=-1,bd=r;
  d.items.forEach((it,i)=>{
    const sl=(typeof it.dx==="number")?it:mktSlot(i);
    const ds=Math.hypot(p.x+sl.dx-player.x,p.z+sl.dz-player.z);
    if(ds<bd){bd=ds;bi=i;}
  });
  return bi;
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
  /* standing next to one of your tables? manage THAT table */
  const ni=mktNearItem(p,3.4);
  if(ni>=0){openMyTable(p,ni);return;}
  showDest("\u{1F3EA} "+(d.name||"Your Marketing Plot")+" — market menu",[
    {label:"\u{1F6E0} EDIT MODE — place & remove long tables and display cases",value:"edit"},
    {label:"\u{1F3F7} Name your market"+(d.name?" (now: \""+d.name+"\")":""),value:"name"},
    {label:"✏️ Sign subtitle"+(d.sub?" (now: \""+d.sub+"\")":" — the line UNDER the name"),value:"sub"},
    {label:d.b?"\u{1F33E} Remove the building (open-air)":"\u{1F3EC} Add a building (walls + door)",value:"bld"},
    {label:"\u{1F3A8} Building colors (primary + secondary)",value:"col"},
    {label:"\u{1F50E} CHECK: can other players see my shop?",value:"chk"},
    {label:"❌ Close",value:"x"}
  ],v=>{
    if(v==="chk"){
      (async()=>{
        if(!SERVER_READY){toast("\u{1F534} No database connection — NOBODY can see your shop right now.");return;}
        const g2=await fbGet(claimPath(p.id));
        if(!g2.ok||!g2.data||g2.data.free){
          toast("\u{1F534} Your plot is NOT stored online yet — others see it FOR SALE! Re-syncing now, check again in a minute.");
          syncMarket(p.id);return;
        }
        if(typeof g2.data.mkt!=="string"){
          toast("\u{1F7E0} The plot IS yours online, but your TABLES are blocked — the database rules still refuse 'mkt'. Publish firebase-rules.json in the Firebase console, then check again!");
          syncMarket(p.id);return;
        }
        let n2=0;
        try{const q=JSON.parse(g2.data.mkt);(q.items||[]).forEach(it=>n2+=((it.o&&it.o.length)||0));}catch(e){}
        toast("✅ ALL GOOD — other players (in THIS world) see your shop with "+n2+" deal"+(n2===1?"":"s")+"!");
      })();
      return;
    }
    if(v==="edit")openMarketEdit(p);
    else if(v==="name"){
      const s=prompt("Name your market! (max 20 letters — this goes BIG on the sign, like SUPER DEAL)",d.name||"");
      if(s===null)return;
      d.name=s.trim().slice(0,20);
      saveMkt();syncMarket(p.id);renderMarket(p);
      toast(d.name?"\u{1F3F7} The sign now says \""+d.name+"\"!":"\u{1F3F7} Name cleared — the sign shows your player name again.");
    }else if(v==="sub"){
      const s=prompt("Subtitle under the name! (max 30 letters — like: Best deals in town!)",d.sub||"");
      if(s===null)return;
      d.sub=s.trim().slice(0,30);
      saveMkt();syncMarket(p.id);renderMarket(p);
      toast(d.sub?"✏️ The sign now says \""+d.sub+"\" under the name!":"✏️ Subtitle cleared — it shows \"by "+mpName()+"\".");
    }else if(v==="bld"){
      d.b=d.b?0:1;saveMkt();syncMarket(p.id);renderMarket(p);
      toast(d.b?"\u{1F3EC} Building added — walls and a door around your plot!":"\u{1F33E} Building removed — open-air market!");
    }else if(v==="col"){
      const pal=[["⚪ White",0xf2f5f7],["⚫ Black",0x14161c],["\u{1F534} Red",0xd7263d],["\u{1F535} Blue",0x1b98e0],
        ["\u{1F7E1} Yellow",0xf4d35e],["\u{1F7E2} Green",0x8ac926],["\u{1F7E0} Orange",0xff7f11],["\u{1F7E3} Purple",0x9b5de5],
        ["\u{1F338} Pink",0xff5d8f],["\u{1F30A} Teal",0x2ec4b6]];
      const pick=(title,cb2)=>showDest(title,pal.map(c2=>({label:c2[0],value:c2[1]})).concat([{label:"❌ Cancel",value:"x"}]),cb2);
      pick("\u{1F3A8} PRIMARY color — the walls",c1=>{
        if(typeof c1!=="number")return;
        pick("\u{1F3A8} SECONDARY color — roof + trim",c2=>{
          if(typeof c2!=="number")return;
          d.c1=c1;d.c2=c2;
          saveMkt();syncMarket(p.id);renderMarket(p);
          toast("\u{1F3A8} Building repainted!"+(d.b?"":" Turn the \u{1F3EC} building ON to see it!"));
        });
      });
    }
  });
}
/* ➕ GENERATE EMPTY STANDS: pick how many shelves / tables / cases, they appear empty */
function openGenEmpty(p){
  $("genEmptyModal").classList.add("open");
}
$("geCancel").onclick=()=>$("genEmptyModal").classList.remove("open");
$("geOk").onclick=()=>{
  const p=MEDIT.mkt;
  if(!p){$("genEmptyModal").classList.remove("open");return;}
  const d=MKT[p.id]=MKT[p.id]||{b:0,name:"",items:[]};
  const nS=Math.max(0,Math.min(16,Math.floor(parseInt($("geS").value,10))||0));
  const nT=Math.max(0,Math.min(16,Math.floor(parseInt($("geT").value,10))||0));
  const nC=Math.max(0,Math.min(16,Math.floor(parseInt($("geC").value,10))||0));
  if(nS+nT+nC<1){toast("Type at least ONE number bigger than 0!");return;}
  const grid=[];
  for(const gz of[34,16,0,-16,-32])for(const gx of[-32,-16,0,16,32])grid.push([gx,gz]);
  const used=pos=>d.items.some(it=>Math.abs((it.dx||0)-pos[0])<7&&Math.abs((it.dz||0)-pos[1])<7);
  let placed=0;
  const place=k=>{
    if(d.items.length>=16)return;
    const pos=grid.find(g2=>!used(g2))||[0,-42];
    d.items.push({k,dx:pos[0],dz:pos[1],r:0,o:[]});
    placed++;
  };
  for(let i=0;i<nC;i++)place("c");
  for(let i=0;i<nS;i++)place("s");
  for(let i=0;i<nT;i++)place("t");
  $("genEmptyModal").classList.remove("open");
  saveMkt();renderMarket(p);
  toast("➕ "+placed+" empty stand"+(placed===1?"":"s")+" placed"
    +(placed<nS+nT+nC?" — the plot is FULL (16 pieces max)!":" — walk to each one and press T to stock it!"));
};
/* clicking the floor in the market editor: place an EMPTY table/case, or remove one */
function mktEditClick(e){
  const p=MEDIT.mkt,d=MKT[p.id];
  if(!d)return;
  const pt=meditGroundPoint(e,p.y);
  if(!pt)return;
  const dx=pt.x-p.x,dz=pt.z-p.z;
  if(Math.abs(dx)>48||Math.abs(dz)>48){toast("That's outside your plot — stay on the wooden floor!");return;}
  d.items=d.items||[];
  if(MEDIT.tool==="remove"){
    let bi=-1,bd=4;
    d.items.forEach((it,i)=>{
      const sl=(typeof it.dx==="number")?it:mktSlot(i);
      const ds=Math.hypot(sl.dx-dx,sl.dz-dz);
      if(ds<bd){bd=ds;bi=i;}
    });
    if(bi<0){toast("Click closer to a table to remove it.");return;}
    const it=d.items.splice(bi,1)[0];
    let back=0;
    if(it&&Array.isArray(it.o))it.o.forEach(o=>{if(o.ty&&o.q>0){mktGiveGoods(o,o.q);back+=o.q;}});
    saveMkt();renderMarket(p);
    toast("\u{1F5D1} Removed"+(back?" — ×"+back+" stock came back to you!":"!"));
    return;
  }
  const def=furnDef(MEDIT.sel);
  if(!def){toast("Pick a table or display case from the bar first!");return;}
  if(d.items.length>=16){toast("Your plot is full — 16 pieces max!");return;}
  d.items.push({k:def.t==="mcase"?"c":def.t==="mshelf"?"s":"t",dx:Math.round(dx*10)/10,dz:Math.round(dz*10)/10,r:MEDIT.rot,o:[]});
  saveMkt();renderMarket(p);
  toast("✅ "+def.n+" placed — stand next to it and press T to "+(def.t==="mcase"?"put something inside!":"stock it!"));
  if(GHOST.lastE)updateGhost(GHOST.lastE);
}
/* ---- 🎁 TIMED BONUS deals: a % off that runs on REAL time (like 25% for 1 day) ---- */
function mktBonusOn(o){return !!(o&&o.dp&&o.du&&Date.now()<o.du);}
function mktPriceNow(o){return mktBonusOn(o)?Math.max(1,Math.round(o.p*(100-o.dp)/100)):(o.p||0);}
function mktBonusLeft(o){
  if(!mktBonusOn(o))return "";
  const ms=o.du-Date.now();
  if(ms>=86400000)return Math.round(ms/86400000*10)/10+" days left";
  if(ms>=3600000)return Math.round(ms/3600000)+" h left";
  return Math.max(1,Math.round(ms/60000))+" min left";
}
function mktBonusTag(o){return mktBonusOn(o)?" \u{1F381} "+o.dp+"% OFF ("+mktBonusLeft(o)+")":"";}
/* expired timed bonuses quietly clean themselves off MY offers */
function mktSweepBonuses(d){
  let ch=false;
  (d&&d.items||[]).forEach(it=>(it.o||[]).forEach(o=>{
    if(o.dp&&o.du&&Date.now()>=o.du){delete o.dp;delete o.du;ch=true;}
  }));
  return ch;
}
/* T next to one of YOUR pieces: add items (table 5, shelf 15, case 1) or manage them */
function openMyTable(p,i){
  const d=MKT[p.id],it=d.items[i];
  if(!it)return;
  it.o=it.o||[];
  if(mktSweepBonuses(d))saveMkt();
  const cap=mktCap(it);
  /* empty case/table: jump straight to picking */
  if(!it.o.length){mktPickType(p,it.k==="c"?"c":"t",i);return;}
  const name=it.k==="c"?"\u{1F5C4} Display case":it.k==="s"?"\u{1F6D2} Store shelf":"\u{1FA91} Long table";
  const opts=[];
  if(it.o.length<cap)opts.push({label:"➕ Add another item ("+it.o.length+" / "+cap+" spots used)",value:"add"});
  it.o.forEach((o,oi)=>opts.push({
    label:"\u{1F6E0} "+mktItemName(o)+(it.k==="c"?"":" — ×"+o.q+" at $"+fmtMoney(mktPriceNow(o))+(o.bb?" ("+o.bb+"+"+o.bf+" FREE)":"")+mktBonusTag(o)),
    value:oi
  }));
  opts.push({label:"❌ Close",value:"x"});
  showDest(name+" ("+it.o.length+" / "+cap+")",opts,v=>{
    if(v==="add"){mktPickType(p,it.k==="c"?"c":"t",i);return;}
    if(typeof v!=="number")return;
    openMyOffer(p,i,v);
  });
}
/* one offer's own menu: change the price, put a TIMED BONUS on it, or take it off */
function openMyOffer(p,i,oi){
  const d=MKT[p.id],it=d&&d.items[i],o=it&&it.o&&it.o[oi];
  if(!o)return;
  const done=()=>{saveMkt();saveGame();syncMarket(p.id);renderMarket(p);};
  const opts=[];
  if(it.k!=="c"){
    opts.push({label:"✏️ Change the PRICE (now $"+fmtMoney(o.p)+" each"+(mktBonusOn(o)?" → $"+fmtMoney(mktPriceNow(o))+" with the bonus":"")+")",value:"price"});
    opts.push({label:mktBonusOn(o)
      ?"\u{1F381} TIMED BONUS: "+o.dp+"% OFF, "+mktBonusLeft(o)+" — change or stop it"
      :"\u{1F381} TIMED BONUS — % off for real hours/days (buyers see a countdown!)",value:"bonus"});
    opts.push({label:"➕ "+(o.bb?"Change the "+o.bb+"+"+o.bf+" FREE deal":"Add a buy-X-get-Y-FREE deal"),value:"free"});
  }
  opts.push({label:"\u{1F5D1} Take it off the "+(it.k==="c"?"display case":"table")+(o.q>0?" (×"+o.q+" comes back to you)":""),value:"del"});
  opts.push({label:"⬅ Back",value:"back"});
  showDest("\u{1F6E0} "+mktItemName(o)+(it.k==="c"?"":" — ×"+o.q+" in stock"),opts,v=>{
    if(v==="back"){openMyTable(p,i);return;}
    if(v==="del"){
      it.o.splice(oi,1);
      if(o.ty&&o.q>0)mktGiveGoods(o,o.q);
      done();
      toast("\u{1F5D1} Taken off"+(o.q>0?" — ×"+o.q+" came back to your collection!":"!"));
      return;
    }
    if(v==="price"){
      const s=prompt("New price per item for "+mktItemName(o)+"? (now $"+fmtMoney(o.p)+", worth $"+fmtMoney(mkpWorth(o))+")",String(o.p));
      if(s===null)return;
      const pr=Math.floor(parseInt(s,10));
      if(!(pr>=1)||pr>1000000){toast("Price: type $1 to $1,000,000!");return;}
      o.p=pr;done();
      toast("✏️ New price: $"+fmtMoney(pr)+" each"+(mktBonusOn(o)?" (buyers pay $"+fmtMoney(mktPriceNow(o))+" while the "+o.dp+"% bonus runs)":"")+"!");
      return;
    }
    if(v==="free"){
      const bs=prompt("The deal: buy HOW MANY... (like 2 — or 0 to remove the deal)",String(o.bb||1));
      if(bs===null)return;
      let bb=Math.floor(parseInt(bs,10));
      if(!(bb>=0)){toast("Type a normal number, like 2!");return;}
      if(bb===0){delete o.bb;delete o.bf;done();toast("➕ FREE deal removed.");return;}
      const fs2=prompt("...and get HOW MANY for FREE? (like 1)",String(o.bf||1));
      if(fs2===null)return;
      const bf=Math.floor(parseInt(fs2,10));
      if(!(bf>=1)){toast("Type a normal number, like 1!");return;}
      o.bb=Math.min(99,bb);o.bf=Math.min(99,bf);done();
      toast("➕ Deal set: every "+o.bb+" bought = "+o.bf+" FREE!");
      return;
    }
    if(v==="bonus"){
      const pcts=[10,25,50,75].map(pc=>({label:"\u{1F381} "+pc+"% OFF (buyers pay $"+fmtMoney(Math.max(1,Math.round(o.p*(100-pc)/100)))+" instead of $"+fmtMoney(o.p)+")",value:pc}));
      if(mktBonusOn(o))pcts.push({label:"\u{1F6D1} STOP the bonus — back to the normal price",value:"stop"});
      pcts.push({label:"❌ Cancel",value:"x"});
      showDest("\u{1F381} How big is the bonus on "+mktItemName(o)+"?",pcts,pc=>{
        if(pc==="stop"){delete o.dp;delete o.du;done();toast("\u{1F6D1} Bonus stopped — back to $"+fmtMoney(o.p)+" each.");return;}
        if(typeof pc!=="number")return;
        showDest("⏰ How long does the "+pc+"% bonus run? (REAL time — it keeps counting while you play or sleep!)",[
          {label:"⏰ 1 hour",value:3600000},
          {label:"⏰ 6 hours",value:21600000},
          {label:"\u{1F4C5} 1 real day (24 h)",value:86400000},
          {label:"\u{1F4C5} 3 real days",value:259200000},
          {label:"\u{1F4C5} A whole week",value:604800000},
          {label:"❌ Cancel",value:"x"}
        ],ms=>{
          if(typeof ms!=="number")return;
          o.dp=pc;o.du=Date.now()+ms;done();
          toast("\u{1F381} BONUS ON: "+pc+"% OFF "+mktItemName(o)+" — buyers pay $"+fmtMoney(mktPriceNow(o))+" for the next "+mktBonusLeft(o).replace(" left","")+"!");
        });
      });
      return;
    }
  });
}
/* ---------- \u{1F9F0} CREATE ITEM: invent your OWN items — $1,000 per copy ----------
   A design is saved forever (name + what it does + how it looks). Copies cost
   $1,000 each, go on sale at your market plot, and when they're sold out you
   simply create more from the same design. */
const CRAFT={designs:[]};   // {name,does,look,hex,stock,made}
const CRAFT_COST=1000;
function craftColorFor(txt){
  const words={red:"#d7263d",blue:"#1b98e0",green:"#8ac926",yellow:"#f4d35e",pink:"#ff5d8f",
    purple:"#9b5de5",orange:"#ff7f11",white:"#f2f5f7",black:"#22262b",gold:"#ffd75e",
    silver:"#c8ccd4",brown:"#8a6f4d",rainbow:"#ff5d8f"};
  const low=(txt||"").toLowerCase();
  for(const w in words)if(low.includes(w))return words[w];
  let h=0;for(let i=0;i<low.length;i++)h=(h*31+low.charCodeAt(i))>>>0;
  return "hsl("+(h%360)+",70%,55%)";
}
function craftFind(name){return CRAFT.designs.find(d=>d.name===name);}
function craftStockTotal(){return CRAFT.designs.reduce((s,d)=>s+(d.stock||0),0);}
/* your typed description really WORKS: the game reads it and gives the item a power.
   "sushi that gives +80 food" → eat it for +80 hunger (or put it in your backpack).
   fuel words → refills your tank · repair words → fixes your car's damage */
function craftEffect(d){
  const t=((d.name||"")+" "+(d.does||"")).toLowerCase();
  if(/fuel|petrol|gasoline|benzine|\bgas\b/.test(t))return{k:"fuel"};
  if(/repair|\bfix\b|damage|mechanic/.test(t))return{k:"repair"};
  if(/teleport|warp|portal|\bspawn\b|beam/.test(t))return{k:"tp"};
  if(/food|eat|hunger|backpack|snack|meal|sushi|pizza|burger|candy|cake|cookie|drink|soup|fruit|yum/.test(t)){
    const m=t.match(/\+?\s*(\d+)\s*(?:food|hunger)/)||t.match(/(?:food|hunger)\s*\+?\s*(\d+)/)||t.match(/\+\s*(\d+)/);
    const n=Math.max(1,Math.min(100,m?parseInt(m[1],10):25));
    return{k:"food",n};
  }
  return null;
}
function craftEffectLabel(fx){
  if(!fx)return null;
  if(fx.k==="food")return "⚡ It WORKS: eat it for +"+fx.n+" food!";
  if(fx.k==="fuel")return "⚡ It WORKS: use it to FILL your fuel tank!";
  if(fx.k==="tp")return "⚡ It WORKS: use it to TELEPORT to spawn!";
  return "⚡ It WORKS: use it to REPAIR your car!";
}
function craftApply(d,fx){
  if(fx.k==="food"){HUNGER.v=Math.min(100,HUNGER.v+fx.n);HUNGER.starveT=0;toast("\u{1F60B} You used a "+d.name+" — +"+fx.n+" food!");}
  else if(fx.k==="fuel"){FUEL.km=FUEL.cap;FUEL.warned=false;toast("⛽ Your "+d.name+" filled the tank to "+FUEL.cap+" km!");}
  else if(fx.k==="tp"){goSpawn();toast("\u{1F300} Your "+d.name+" teleported you to spawn!");}
  else{if(typeof DMG!=="undefined")DMG.v=0;toast("\u{1F527} Your "+d.name+" repaired the car — good as new!");}
}
function craftUse(d,fx){
  if(!d.stock){toast("You have 0 "+d.name+" — create one first ($"+fmtMoney(CRAFT_COST)+")!");return;}
  d.stock--;
  craftApply(d,fx);
  saveGame();openCraftDesign(d);
}
function craftToPack(d,fx){
  const qs=prompt("How many "+d.name+" go into your backpack? (you have "+d.stock+")",String(Math.min(5,d.stock)));
  if(qs===null)return;
  let n=Math.floor(parseInt(qs,10));
  if(!(n>=1)){toast("Type a normal number, like 5!");return;}
  n=Math.min(n,d.stock);
  d.stock-=n;
  for(let i=0;i<n;i++)MCD.pack.push(["\u{1F9F0} "+d.name,fx.n]);
  renderPack();saveGame();
  toast("\u{1F392} "+n+"× "+d.name+" packed — eat them with the \u{1F392} Food menu (or R while driving)!");
  openCraftDesign(d);
}
function craftMake(d){
  const qs=prompt("How many "+d.name+" do you want to CREATE at $"+fmtMoney(CRAFT_COST)+" each?\n(so 20 items = $"+fmtMoney(CRAFT_COST*20)+")","1");
  if(qs===null)return;
  const n=Math.floor(parseInt(qs,10));
  if(!(n>=1)){toast("Type a normal number, like 20!");return;}
  const cost=n*CRAFT_COST;
  if(MONEY.v<cost){toast("Creating "+n+"× costs $"+fmtMoney(cost)+" — you only have $"+fmtMoney(Math.max(0,MONEY.v))+"!");return;}
  addMoney(-cost);
  d.made=(d.made||0)+n;
  /* nothing activates by itself anymore — every copy waits as stock until
     YOU press ▶️ USE (or \u{1F392} pack food into your backpack) */
  d.stock=(d.stock||0)+n;
  saveGame();
  const fx=craftEffect(d);
  toast("\u{1F9F0} Created "+n+"× "+d.name+" for $"+fmtMoney(cost)+" — "+d.stock+" in stock!"
    +(fx&&fx.k==="food"?" Eat one with ▶️ USE, or \u{1F392} pack some into your backpack (+"+fx.n+" food each)."
    :fx?" Press ▶️ USE (or the ▶️ Do button) whenever you want one to do its thing."
    :" Sell them at your market! (Tip: food / fuel / repair / teleport words give items real POWERS.)"));
  openCraftDesign(d);
}
function openCraftDesign(d){
  const fx=craftEffect(d);
  const opts=[
    {label:"ℹ️ It does: "+(d.does||"nobody knows...").slice(0,60),value:"i"},
    {label:"\u{1F440} It looks: "+(d.look||"a mystery").slice(0,60),value:"i"}
  ];
  if(fx)opts.push({label:craftEffectLabel(fx),value:"i"});
  if(fx)opts.push({label:"▶️ USE one now ("+(d.stock||0)+" left)",value:"use"});
  if(fx&&fx.k==="food")opts.push({label:"\u{1F392} Put some in your BACKPACK (+"+fx.n+" food each)",value:"pack"});
  opts.push(
    {label:"➕ CREATE more — $"+fmtMoney(CRAFT_COST)+" each",value:"make"},
    {label:"✏️ Change what it does / how it looks",value:"edit"},
    {label:"\u{1F5D1} Forget this design",value:"del"},
    {label:"⬅ Back to the list",value:"back"}
  );
  showDest("\u{1F9F0} "+d.name+" — you have "+(d.stock||0)+" (created "+(d.made||0)+" ever)",opts,v=>{
    if(v==="use"&&fx)craftUse(d,fx);
    else if(v==="pack"&&fx&&fx.k==="food"){
      if(!d.stock){toast("You have 0 "+d.name+" — create some first!");return;}
      craftToPack(d,fx);
    }
    else if(v==="make")craftMake(d);
    else if(v==="edit"){
      const does=prompt("What does the "+d.name+" DO?",d.does||"");
      if(does!==null&&does.trim())d.does=does.trim().slice(0,90);
      const look=prompt("How does the "+d.name+" LOOK?",d.look||"");
      if(look!==null&&look.trim()){d.look=look.trim().slice(0,90);d.hex=craftColorFor(d.look+" "+d.name);}
      saveGame();openCraftDesign(d);
    }else if(v==="del"){
      showDest("\u{1F5D1} Really forget the "+d.name+"?"+(d.stock?" You still have "+d.stock+" — they disappear too!":" (The design is gone forever.)"),[
        {label:"✅ Yes, forget it",value:"y"},{label:"❌ No, keep it!",value:"n"}
      ],a=>{
        if(a==="y"){CRAFT.designs=CRAFT.designs.filter(x=>x!==d);saveGame();toast("\u{1F5D1} Design forgotten.");openCraftMenu();}
        else openCraftDesign(d);
      });
    }else if(v==="back")openCraftMenu();
    else if(v==="i")openCraftDesign(d);
  });
}
function craftNew(){
  const name=prompt("Name your new item! (like: Magic Sword)","");
  if(name===null)return;
  const nm=name.trim().slice(0,24);
  if(!nm){toast("Your item needs a name!");return;}
  if(craftFind(nm)){toast("You already have a design called "+nm+"!");openCraftDesign(craftFind(nm));return;}
  const does=(prompt("What does the "+nm+" DO?","")||"").trim().slice(0,90);
  const look=(prompt("How does the "+nm+" LOOK?","")||"").trim().slice(0,90);
  const d={name:nm,does:does||"nobody knows...",look:look||"a mystery",hex:craftColorFor(look+" "+nm),stock:0,made:0};
  CRAFT.designs.push(d);
  saveGame();
  const fx=craftEffect(d);
  toast("\u{1F9F0} "+nm+" designed!"+(fx?" "+craftEffectLabel(fx):"")+" Now create copies — $"+fmtMoney(CRAFT_COST)+" each.");
  craftMake(d);
}
function openCraftMenu(){
  const opts=CRAFT.designs.map(d=>({label:"\u{1F9F0} "+d.name+" — you have "+(d.stock||0),value:d}));
  opts.push({label:"➕ NEW item design (copies: $"+fmtMoney(CRAFT_COST)+" each)",value:"new"});
  if(craftDoList().length)opts.push({label:"▶️ DO — use an item's power right now",value:"do"});
  opts.push({label:"❌ Close",value:"x"});
  showDest("\u{1F9F0} CREATE ITEM — your inventions ("+craftStockTotal()+" ready to sell)",opts,v=>{
    if(v==="new")craftNew();
    else if(v==="do")openDoMenu();
    else if(v&&v!=="x")openCraftDesign(v);
  });
}
$("bCreate").onclick=()=>openCraftMenu();
/* ▶️ DO: one button that makes your items do their thing — eat your created
   food from the backpack, fill the tank, repair the car, teleport... */
function craftDoList(){
  const opts=[];
  CRAFT.designs.forEach(d=>{
    const fx=craftEffect(d);
    if(!fx)return;
    if(fx.k==="food"){
      const packN=MCD.pack.filter(p=>p[0]==="\u{1F9F0} "+d.name).length;
      if(packN>0)opts.push({label:"\u{1F60B} "+d.name+" — eat one (+"+fx.n+" food, "+packN+" in your backpack)",value:{d,fx,food:true}});
    }
    if(d.stock>0)opts.push({label:"▶️ "+d.name+" — "+craftEffectLabel(fx).replace("⚡ It WORKS: ","")+" ("+d.stock+" in stock)",value:{d,fx}});
  });
  return opts;
}
function openDoMenu(){
  const opts=craftDoList();
  if(!opts.length){
    toast("Nothing to DO yet — create an item with a POWER first (food / fuel / repair / teleport words)!");
    openCraftMenu();
    return;
  }
  opts.push({label:"❌ Close",value:"x"});
  showDest("▶️ DO — which item does its thing?",opts,v=>{
    if(!v||v==="x")return;
    if(v.food){
      const i=MCD.pack.findIndex(p2=>p2[0]==="\u{1F9F0} "+v.d.name);
      if(i<0)return;
      MCD.pack.splice(i,1);renderPack();
    }else v.d.stock--;
    craftApply(v.d,v.fx);
    saveGame();
  });
}
$("bDo").onclick=()=>openDoMenu();
function mktPickType(p,kind,idx){
  showDest(kind==="t"?"\u{1FA91} Long table — what do you want to SELL?":"\u{1F5C4} Display case — what do you want to SHOW?",[
    {label:"\u{1F95F} A dumpling ("+DUMP.owned.length+" owned)",value:"dump"},
    {label:"\u{1F9C8} A butter squishy ("+BUTTER.owned.length+" owned)",value:"butter"},
    {label:"\u{1F4F1} A phone ("+PHONE.owned.filter(ph=>!isTabletM(ph.m)&&!isComputerM(ph.m)).length+" owned)",value:"phone"},
    {label:"\u{1F4F2} A tablet ("+PHONE.owned.filter(ph=>isTabletM(ph.m)).length+" owned)",value:"tab"},
    {label:"\u{1F4BB} A computer ("+PHONE.owned.filter(ph=>isComputerM(ph.m)).length+" owned)",value:"pc"},
    {label:"\u{1F3AE} A game console ("+CONSOLE.owned.length+" owned)",value:"console"},
    {label:"\u{1F354} Food from your backpack ("+MCD.pack.length+" packed)",value:"food"},
    {label:"\u{1F9F0} An item YOU created ("+craftStockTotal()+" ready)",value:"custom"},
    {label:"⛏️ Minecraft stuff ("+Object.values(MCINV).reduce((a,b)=>a+b,0)+" mined)",value:"mc"},
    {label:"❌ Cancel",value:"x"}
  ],ty=>{
    if(ty==="x")return;
    if(ty==="food"||ty==="custom"||ty==="mc")mktPickItem(p,kind,ty,idx);   // food, created & minecraft items: a simple list
    else openMktPicker(p,kind,ty,idx);           // squishies, phones & consoles: the BOX PICKER!
  });
}
function mktGroups(ty){
  const map=new Map();
  if(ty==="custom"){
    CRAFT.designs.forEach(d=>{if(d.stock>0)map.set(d.name,{n:d.stock,lab:d.name,hex:d.hex,does:d.does,look:d.look,ty});});
  }else if(ty==="mc"){
    for(const k in MCINV)if(MCINV[k]>0)map.set(k,{n:MCINV[k],lab:k,ty});
  }else if(ty==="food"){
    MCD.pack.forEach(f=>{const k=f[0];const e=map.get(k)||{n:0,lab:f[0],fh:f[1],ty};e.n++;map.set(k,e);});
  }else if(ty==="phone"||ty==="console"){
    (ty==="phone"?PHONE.owned:CONSOLE.owned).forEach(ph=>{
      const k=ph.m+"|"+ph.color;
      const e=map.get(k)||{n:0,lab:ph.color,hex:ph.hex,pm:ph.m,br:ph.br,tier:ph.tier,yr:ph.yr,ty};
      e.n++;map.set(k,e);
    });
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
  if(ty==="custom"){
    const d=craftFind(grp.lab);
    if(!d)return 0;
    const take=Math.min(n,d.stock||0);
    d.stock-=take;
    return take;
  }
  if(ty==="mc"){
    if(!(grp.lab in MCINV))return 0;
    const take=Math.min(n,MCINV[grp.lab]);
    MCINV[grp.lab]-=take;
    return take;
  }
  if(ty==="food"){
    let left=n;
    for(let i=MCD.pack.length-1;i>=0&&left>0;i--)if(MCD.pack[i][0]===grp.lab){MCD.pack.splice(i,1);left--;}
    renderPack();
    return n-left;
  }
  if(ty==="phone"||ty==="console"){
    const coll2=ty==="phone"?PHONE.owned:CONSOLE.owned;
    let left=n;
    for(let i=coll2.length-1;i>=0&&left>0;i--){
      const ph=coll2[i];
      if(ph.m===grp.pm&&ph.color===grp.lab){
        if(HOLD.d===ph)HOLD.d=null;
        coll2.splice(i,1);left--;
      }
    }
    renderDump();
    return n-left;
  }
  const coll=ty==="dump"?DUMP.owned:BUTTER.owned;
  let left=n;
  for(let i=coll.length-1;i>=0&&left>0;i--){
    const d2=coll[i];
    if(d2.color===grp.lab&&(d2.glitter?1:0)===(grp.gl||0)&&(d2.size||"norm")===(grp.sz||"norm")){
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
    else if(it.ty==="phone")PHONE.owned.push({m:it.pm||"iPhone 4",br:it.br||"Apple",tier:it.tier||1,yr:it.yr||2010,color:it.lab,hex:it.hex||"#1c1c1e"});
    else if(it.ty==="console")CONSOLE.owned.push({m:it.pm||"PlayStation 1",br:it.br||"Sony",tier:it.tier||1,yr:it.yr||2000,color:it.lab,hex:it.hex||"#1c1c1e"});
    else if(it.ty==="custom"){
      /* created items: the buyer gets the DESIGN too, so they can craft more —
         copies wait as stock, nothing activates until the buyer USES one */
      let d=craftFind(it.lab);
      if(!d){d={name:it.lab,does:it.does||"nobody knows...",look:it.look||"a mystery",hex:it.hex||craftColorFor(it.lab),stock:0,made:0};CRAFT.designs.push(d);}
      d.stock=(d.stock||0)+1;
    }
    else if(it.ty==="mc"){if(it.lab in MCINV)MCINV[it.lab]++;}
    else MCD.pack.push([it.lab,it.fh||10]);
  }
  renderDump();renderPack();saveGame();
}
/* selection made (box picker or food list): display it, or open the price window */
function mktTotalOffers(d){return (d.items||[]).reduce((s,it)=>s+((it.o&&it.o.length)||0),0);}
function mktApplyPick(p,kind,idx,ty,grp){
  const d=MKT[p.id],it=d&&d.items[idx];
  if(!it)return;
  it.o=it.o||[];
  if(it.o.length>=mktCap(it)){toast("That one is FULL ("+mktCap(it)+" spots) — take something off first!");return;}
  if(mktTotalOffers(d)>=240){toast("Your market is PACKED — 240 deals max across the whole plot!");return;}
  if(kind==="c"){
    if(mktTakeStock(ty,grp,1)<1){toast("You don't have that one anymore!");return;}
    it.o.push(mkOffer(ty,grp,1,0,0,0));
    saveMkt();saveGame();syncMarket(p.id);renderMarket(p);
    toast("\u{1F5C4} On display — everyone can admire it (but nobody can touch)!");
    return;
  }
  openStockModal(p,idx,ty,grp);
}
function mktPickItem(p,kind,ty,idx){
  const groups=mktGroups(ty).slice(0,10);
  if(!groups.length){toast("You don't have any of those yet — get some first!");return;}
  const opts=groups.map((g2,i)=>({label:(ty==="food"?g2.lab:mktItemName(g2))+" — you have "+g2.n,value:i}));
  opts.push({label:"❌ Cancel",value:"x"});
  showDest("Pick what goes "+(kind==="t"?"on the table":"in the display case"),opts,v=>{
    if(typeof v!=="number")return;
    mktApplyPick(p,kind,idx,ty,groups[v]);
  });
}
/* the BOX PICKER: turn boxes on — ✨ Glitter, a color and (butter) a size —
   and sell EXACTLY that one, like GLITTER MEGA PURPLE */
const MKP={p:null,kind:"t",ty:"dump",idx:0,gl:0,sz:"norm",brand:"all",pvar:"all",color:null};
function mkpVariants(){
  const map=new Map();
  if(MKP.ty==="phone"){
    /* phones: group by exact model + color, filtered by brand & version
       (tablets & computers have their OWN picker categories) */
    PHONE.owned.forEach(ph=>{
      if(isTabletM(ph.m)||isComputerM(ph.m))return;
      if(!phoneFiltPass(ph.m,MKP.brand,MKP.pvar))return;
      const k=ph.m+"|"+ph.color;
      const e=map.get(k)||{lab:ph.color,hex:ph.hex,pm:ph.m,br:ph.br,tier:ph.tier,yr:ph.yr,n:0,ty:"phone"};
      e.n++;map.set(k,e);
    });
    return map;
  }
  if(MKP.ty==="tab"||MKP.ty==="pc"){
    /* tablets & computers: group by exact model + color, filtered by KIND */
    const pc=MKP.ty==="pc";
    PHONE.owned.forEach(ph=>{
      if(!(pc?isComputerM:isTabletM)(ph.m))return;
      if(!gadBrandPass(ph.m,MKP.brand))return;
      const k=ph.m+"|"+ph.color;
      const e=map.get(k)||{lab:ph.color,hex:ph.hex,pm:ph.m,br:ph.br,tier:ph.tier,yr:ph.yr,n:0,ty:"phone"};
      e.n++;map.set(k,e);
    });
    return map;
  }
  if(MKP.ty==="console"){
    /* consoles: group by exact model + color, filtered by TYPE (PS / Xbox / Nintendo) */
    CONSOLE.owned.forEach(cs=>{
      if(!consBrandPass(cs.m,MKP.brand))return;
      const k=cs.m+"|"+cs.color;
      const e=map.get(k)||{lab:cs.color,hex:cs.hex,pm:cs.m,br:cs.br,tier:cs.tier,yr:cs.yr,n:0,ty:"console"};
      e.n++;map.set(k,e);
    });
    return map;
  }
  const coll=MKP.ty==="dump"?DUMP.owned:BUTTER.owned;
  coll.forEach(d2=>{
    if((d2.glitter?1:0)!==MKP.gl)return;
    if(MKP.ty==="butter"&&(d2.size||"norm")!==MKP.sz)return;
    const e=map.get(d2.color)||{lab:d2.color,hex:d2.hex,n:0,gl:MKP.gl,sz:MKP.ty==="butter"?MKP.sz:"",ty:MKP.ty};
    e.n++;map.set(d2.color,e);
  });
  return map;
}
/* what an item is WORTH (the buyer price) — shown while stocking, so you can price it right */
function mkpWorth(g2){
  if(g2.ty==="mc")return MC_PRICES[g2.lab]||1;
  if(g2.ty==="custom")return CRAFT_COST;   // a created item cost $1,000 to make
  if(g2.ty==="phone")return phoneValue({tier:g2.tier||0,color:g2.lab});
  if(g2.ty==="console")return consoleValue({tier:g2.tier||0,color:g2.lab});
  if(g2.ty==="butter")return butterValue({color:g2.lab,glitter:!!g2.gl,size:g2.sz||"norm"});
  if(g2.ty==="dump")return dumpValue({color:g2.lab,glitter:!!g2.gl});
  return 0;
}
function renderMkp(){
  const butter=MKP.ty==="butter",phone=MKP.ty==="phone",cons=MKP.ty==="console",gad=MKP.ty==="tab"||MKP.ty==="pc";
  $("mkpTitle").textContent=phone?"\u{1F4F1} Pick your phone"
    :cons?"\u{1F3AE} Pick your console"
    :MKP.ty==="tab"?"\u{1F4F2} Pick your tablet"
    :MKP.ty==="pc"?"\u{1F4BB} Pick your computer"
    :(butter?"\u{1F9C8}":"\u{1F95F}")+" Pick your "+(butter?"butter squishy":"dumpling");
  $("mkpGlitRow").style.display=(phone||cons||gad)?"none":"";
  $("mkpSizeRow").style.display=butter?"":"none";
  $("mkpBrandRow").style.display=phone?"":"none";
  if(cons)consBrandRow($("mkpVarRow"),MKP.brand,v=>{MKP.brand=v;MKP.color=null;renderMkp();});
  else if(gad)gadBrandRow($("mkpVarRow"),MKP.ty==="pc",MKP.brand,v=>{MKP.brand=v;MKP.color=null;renderMkp();});
  $("mkpGlitOn").classList.toggle("on",MKP.gl===1);
  $("mkpGlitOff").classList.toggle("on",MKP.gl===0);
  $("mkpSzN").classList.toggle("on",MKP.sz==="norm");
  $("mkpSzM").classList.toggle("on",MKP.sz==="med");
  $("mkpSzX").classList.toggle("on",MKP.sz==="mega");
  if(phone){
    segOn(["kBrAll","kBrI","kBrP","kBrS","kBrA"],
      MKP.brand==="iphone"?"kBrI":MKP.brand==="pixel"?"kBrP":MKP.brand==="gs"?"kBrS":MKP.brand==="ga"?"kBrA":"kBrAll");
    const vw=$("mkpVarRow"),vops=phoneVarOpts(MKP.brand);
    if(vops){
      vw.style.display="";vw.innerHTML="";
      vops.forEach(([v,l])=>{
        const b=document.createElement("button");
        b.textContent=l;
        if(MKP.pvar===v)b.className="on";
        b.onclick=()=>{MKP.pvar=v;MKP.color=null;renderMkp();};
        vw.appendChild(b);
      });
    }else vw.style.display="none";
  }else if(!cons&&!gad)$("mkpVarRow").style.display="none";
  const vars=mkpVariants();
  if(MKP.color&&!vars.has(MKP.color))MKP.color=null;   // that combo ran out — unpick it
  const wrap=$("mkpColors");wrap.innerHTML="";
  if(!vars.size){
    const d2=document.createElement("div");
    d2.style.cssText="color:var(--dim);font-size:13px;margin-top:8px";
    d2.textContent="You have NONE with these boxes — try other ones!";
    wrap.appendChild(d2);
  }
  [...vars.entries()].sort((a,b)=>b[1].n-a[1].n).slice(0,24).forEach(([key,g2])=>{
    const b=document.createElement("button");
    b.innerHTML="<span class='swatch' style='background:"+g2.hex+"'></span>"
      +((phone||cons||gad)?(g2.lab==="Rainbow"?"\u{1F308} RAINBOW ":g2.lab+" ")+g2.pm:g2.lab)+" ("+g2.n+")"
      +" <span style='color:var(--acc2)'>$"+fmtMoney(mkpWorth(g2))+"</span>";
    if(MKP.color===key)b.style.cssText="border-color:var(--acc2);color:var(--acc2);font-weight:700";
    b.onclick=()=>{MKP.color=key;renderMkp();};
    wrap.appendChild(b);
  });
  const sel=MKP.color?vars.get(MKP.color):null;
  $("mkpCount").textContent=sel
    ?"Your pick: "+mktItemName(sel)+" — you have "+sel.n+", worth $"+fmtMoney(mkpWorth(sel))+" each"
    :"\u{1F446} Now pick "+(phone?"a phone!":cons?"a console!":MKP.ty==="tab"?"a tablet!":MKP.ty==="pc"?"a computer!":"a color!");
}
function openMktPicker(p,kind,ty,idx){
  MKP.p=p;MKP.kind=kind;MKP.ty=ty;MKP.idx=idx;MKP.gl=0;MKP.sz="norm";MKP.brand="all";MKP.pvar="all";MKP.color=null;
  renderMkp();
  $("mktPickModal").classList.add("open");
}
$("kBrAll").onclick=()=>{MKP.brand="all";MKP.pvar="all";MKP.color=null;renderMkp();};
$("kBrI").onclick=()=>{MKP.brand="iphone";MKP.pvar="all";MKP.color=null;renderMkp();};
$("kBrP").onclick=()=>{MKP.brand="pixel";MKP.pvar="all";MKP.color=null;renderMkp();};
$("kBrS").onclick=()=>{MKP.brand="gs";MKP.pvar="all";MKP.color=null;renderMkp();};
$("kBrA").onclick=()=>{MKP.brand="ga";MKP.pvar="all";MKP.color=null;renderMkp();};
$("mkpGlitOn").onclick=()=>{MKP.gl=1;renderMkp();};
$("mkpGlitOff").onclick=()=>{MKP.gl=0;renderMkp();};
$("mkpSzN").onclick=()=>{MKP.sz="norm";renderMkp();};
$("mkpSzM").onclick=()=>{MKP.sz="med";renderMkp();};
$("mkpSzX").onclick=()=>{MKP.sz="mega";renderMkp();};
$("mkpCancel").onclick=()=>$("mktPickModal").classList.remove("open");
$("mkpOk").onclick=()=>{
  const grp=MKP.color?mkpVariants().get(MKP.color):null;
  if(!grp||!grp.n){toast("\u{1F446} Pick a color first — with boxes you actually own!");return;}
  $("mktPickModal").classList.remove("open");
  /* tablets & computers live in the phone/device collection — the offer type stays "phone" */
  mktApplyPick(MKP.p,MKP.kind,MKP.idx,(MKP.ty==="tab"||MKP.ty==="pc")?"phone":MKP.ty,grp);
};
/* the STOCK THE TABLE window: amount, price and the <field> + <field> FREE bonus */
const MKTM={p:null,idx:0,ty:null,grp:null};
function openStockModal(p,idx,ty,grp){
  MKTM.p=p;MKTM.idx=idx;MKTM.ty=ty;MKTM.grp=grp;
  $("mktTitle").textContent="\u{1FA91} "+(ty==="food"?grp.lab
    :mktItemName(grp)+" (worth $"+fmtMoney(mkpWorth(grp))+" each)");
  $("mktMax").textContent=grp.n;
  $("mktQty").value=1;$("mktQty").max=grp.n;
  $("mktPrice").value=25;
  $("mktBb").value="";$("mktBf").value="";
  $("mktModal").classList.add("open");
}
$("mktCancel").onclick=()=>$("mktModal").classList.remove("open");
$("mktOk").onclick=()=>{
  const p=MKTM.p,grp=MKTM.grp,ty=MKTM.ty;
  if(!p||!grp)return;
  const d=MKT[p.id],it=d&&d.items[MKTM.idx];
  if(!it){$("mktModal").classList.remove("open");return;}
  const q=Math.floor(parseInt($("mktQty").value,10));
  if(!(q>=1)||q>grp.n){toast("Amount: type a number from 1 to "+grp.n+"!");return;}
  const pr=Math.floor(parseInt($("mktPrice").value,10));
  if(!(pr>=1)||pr>1000000){toast("Price: type $1 to $1,000,000!");return;}
  let bb=Math.floor(parseInt($("mktBb").value,10))||0,bf=Math.floor(parseInt($("mktBf").value,10))||0;
  if(bb<0)bb=0;if(bf<0)bf=0;
  if((bb&&!bf)||(!bb&&bf)){toast("\u{1F381} Bonus: fill BOTH boxes (like 1 + 1) — or leave both empty.");return;}
  bb=Math.min(99,bb);bf=Math.min(99,bf);
  it.o=it.o||[];
  if(it.o.length>=mktCap(it)||mktTotalOffers(d)>=240){toast("That one is FULL — take something off first!");$("mktModal").classList.remove("open");return;}
  const got=mktTakeStock(ty,grp,q);   // only what REALLY leaves your collection goes on sale
  if(got<1){toast("You don't have those anymore!");$("mktModal").classList.remove("open");return;}
  it.o.push(mkOffer(ty,grp,got,pr,bb,bf));
  $("mktModal").classList.remove("open");
  saveMkt();saveGame();syncMarket(p.id);renderMarket(p);
  toast("\u{1FA91} ON SALE: "+q+"× "+(ty==="food"?grp.lab:mktItemName(grp))+" at $"+fmtMoney(pr)+" each"+(bb?" — "+bb+"+"+bf+" FREE deal!":"")+"!");
};
function openMarketShop(p,rm,onlyPi){
  const d=rm.d,owner=rm.n;
  const title=(d.name&&String(d.name).trim())?String(d.name).trim():owner+"'s Marketing Plot";
  const opts=[];
  (d.items||[]).forEach((it,pi)=>{
    if(it.k==="c"||(onlyPi!==undefined&&pi!==onlyPi))return;
    (it.o||[]).forEach((o,oi)=>{
      if(!o.ty)return;
      opts.push(o.q>0
        ?{label:"\u{1F6D2} "+mktItemName(o)+" — $"+fmtMoney(mktPriceNow(o))+" each (×"+o.q+" left"+(o.bb?" · "+o.bb+"+"+o.bf+" FREE":"")+mktBonusTag(o)+")",value:pi+"."+oi}
        :{label:"❌ "+mktItemName(o)+" — NO STOCK",value:"x"});
    });
  });
  if(!opts.length)opts.push({label:"(Nothing for sale here yet — come back later!)",value:"x"});
  opts.push({label:"❌ Leave",value:"x"});
  showDest("\u{1F3EA} "+title+" — by "+owner,opts,v=>{
    if(typeof v!=="string"||v.indexOf(".")<0)return;
    mktBuyFrom(p,rm,v);
  });
}
/* buying ONE offer (walk up to its table/shelf and press T, or pick from the list) */
function mktBuyFrom(p,rm,ref){
  const owner=rm.n,seg=String(ref).split(".");
  const it=rm.d.items[parseInt(seg[0],10)];
  const o=it&&it.o&&it.o[parseInt(seg[1],10)||0];
  if(!o||!o.ty||o.q<=0)return;
  const pNow=mktPriceNow(o);
  const deal=(o.bb?"\nBONUS: every "+o.bb+" you buy = "+o.bf+" extra for FREE!":"")
    +(mktBonusOn(o)?"\n\u{1F381} TIMED BONUS: "+o.dp+"% OFF right now — $"+fmtMoney(pNow)+" instead of $"+fmtMoney(o.p)+" ("+mktBonusLeft(o)+")!":"");
  const qs=prompt("How many "+mktItemName(o)+" do you want to BUY at $"+fmtMoney(pNow)+" each?"+deal+"\n(stock: "+o.q+")","1");
  if(qs===null)return;
  let n=Math.floor(parseInt(qs,10));
  if(!(n>=1)){toast("Type a normal number, like 2!");return;}
  if(n>o.q)n=o.q;
  let free=(o.bb&&o.bf)?Math.floor(n/o.bb)*o.bf:0;
  if(n+free>o.q)free=o.q-n;
  const total=n*pNow;
  (async()=>{
    const ok=await sendMoney(owner,total,{d:("MKT|"+p.id+"|"+ref+"|"+(n+free)).slice(0,80)},true);
    if(!ok)return;
    o.q-=n+free;
    /* record it in the SOLD ledger too — the 5-second live refresh (and every
       other player) now sees the stock really GONE, not magically back */
    fbPut(soldPath(p.id)+"/s"+Date.now().toString(36)+Math.floor(Math.random()*46656).toString(36),
      {r:String(ref).slice(0,20),n:n+free,ts:Date.now()});
    mktGiveGoods(o,n+free);
    renderMarket(p);
    toast("\u{1F6D2}\u{1F389} You bought "+n+(free?" (+"+free+" FREE!)":"")+"× "+mktItemName(o)+" for $"+fmtMoney(total)+" — "+owner+" got your money!");
  })();
}
/* ✨ GENERATE SHOP: auto-builds shelves, tables & a display case with your best stuff */
function mktGenerate(p){
  showDest("⚠️ GENERATE SHOP — this will REPLACE your WHOLE shop!",[
    {label:"✅ YES, continue — my old stands come off (all stock returns to me first)",value:"go"},
    {label:"❌ No, keep my shop as it is",value:"x"}
  ],a=>{
    if(a!=="go")return;
    mktGenPick(p,new Set());
  });
}
/* multi-pick: tick as many kinds as you like, then CONTINUE */
function mktGenPick(p,sel){
  const row=(key,label)=>({label:(sel.has(key)?"✅ ":"⬜ ")+label,value:key});
  showDest("\u{1F3EA} What should your shop sell? Tick boxes, then CONTINUE!",[
    row("phone","\u{1F4F1} Phones"),
    row("console","\u{1F3AE} Game consoles"),
    row("dump","\u{1F95F} Dumplings"),
    row("butter","\u{1F9C8} Butter squishies"),
    row("food","\u{1F354} Food"),
    row("mc","⛏️ Minecraft items"),
    {label:"\u{1F31F} ALL of it (everything at once)",value:"all"},
    {label:"▶️ CONTINUE"+(sel.size?" — "+sel.size+" kind"+(sel.size>1?"s":"")+" ticked":""),value:"go"},
    {label:"❌ Cancel",value:"x"}
  ],v=>{
    if(v==="x")return;
    if(v==="all"){mktGenPrice(p,["phone","console","dump","butter","food","mc"]);return;}
    if(v==="go"){
      if(!sel.size){toast("Tick at least ONE box first!");mktGenPick(p,sel);return;}
      mktGenPrice(p,[...sel]);
      return;
    }
    sel.has(v)?sel.delete(v):sel.add(v);
    mktGenPick(p,sel);
  });
}
function mktGenPrice(p,cats){
  showDest("\u{1F4B2} How should it be priced?",[
    {label:"\u{1F4B0} EXPENSIVE shop — everything $20 ABOVE its worth",value:20},
    {label:"⚖️ NORMAL shop — exactly what it's worth",value:0},
    {label:"\u{1F525} CHEAP shop — everything $20 BELOW its worth (deal magnet!)",value:-20},
    {label:"❌ Cancel",value:"x"}
  ],adj=>{
    if(typeof adj!=="number")return;
    mktDoGenerate(p,cats,adj);
  });
}
function mktDoGenerate(p,cat,adj){
  const d=MKT[p.id]=MKT[p.id]||{b:0,name:"",items:[]};
  /* old shop comes off — every bit of stock returns to your collection */
  (d.items||[]).forEach(it=>(it.o||[]).forEach(o=>{if(o.ty&&o.q>0)mktGiveGoods(o,o.q);}));
  d.items=[];
  const cats=Array.isArray(cat)?cat:cat==="all"?["phone","console","dump","butter","food"]:[cat];
  const worth=g2=>g2.ty==="food"?Math.max(1,g2.fh||10):Math.max(1,mkpWorth(g2));
  /* FAIR MIX: each ticked kind is sorted by worth, then they take turns —
     so phones can never hog every stand and push the other kinds out */
  const perCat=cats.map(ty=>mktGroups(ty).sort((a,b)=>worth(b)-worth(a)));
  const groups=[];
  for(let r2=0;perCat.some(l=>r2<l.length);r2++)
    perCat.forEach(l=>{if(r2<l.length)groups.push(l[r2]);});
  if(!groups.length){
    saveMkt();saveGame();syncMarket(p.id);renderMarket(p);
    toast("You own NOTHING in those categories — go collect some first! (Your plot is empty now.)");
    return;
  }
  /* the crown jewel (most valuable of everything) goes in a display case at the entrance */
  const jewel=groups.reduce((a,b)=>worth(b)>worth(a)?b:a,groups[0]);
  if(mktTakeStock(jewel.ty,jewel,1)>0)
    d.items.push({k:"c",dx:0,dz:34,r:0,o:[mkOffer(jewel.ty,jewel,1,0,0,0)]});
  /* EVERYTHING goes on sale — it keeps adding deals until your collection is
     out, or the plot / 100 KB database slot is full. ONLY what really leaves
     your collection lands on the tables, never more. */
  const sell=groups.map(g2=>({g2,count:g2.n-(g2===jewel?1:0)})).filter(x=>x.count>0);
  const grid=[];
  for(const gz of[16,0,-16,-32])for(const gx of[-32,-16,0,16,32])grid.push([gx,gz]);
  let gi=0,slot=0,stocked=0,deals=0,full=false;
  while(gi<sell.length&&d.items.length<16&&!full){
    const remaining=sell.length-gi;
    const k=remaining>7?"s":"t";                 // lots left → a big shelf, tail → tables
    const cap=k==="s"?15:5;
    const pos=grid[slot++]||[0,-40];
    const piece={k,dx:pos[0],dz:pos[1],r:0,o:[]};
    for(let c2=0;c2<cap&&gi<sell.length;c2++){
      const{g2,count}=sell[gi];
      const price=Math.max(1,worth(g2)+adj);
      /* stop BEFORE the database slot overflows — the rest stays with you */
      const test=mkOffer(g2.ty,g2,count,price,0,0);
      if(JSON.stringify(d).length+JSON.stringify(piece).length+JSON.stringify(test).length+24>98000){full=true;break;}
      gi++;
      const got=mktTakeStock(g2.ty,g2,count);   // whatever REALLY left your collection
      if(got>0){piece.o.push(mkOffer(g2.ty,g2,got,price,0,0));stocked+=got;deals++;}
    }
    if(piece.o.length)d.items.push(piece);
  }
  saveMkt();saveGame();syncMarket(p.id);renderMarket(p);
  const leftover=sell.length-gi;
  toast("✨\u{1F3EA} SHOP GENERATED: "+(d.items.length-1)+" stand"+(d.items.length-1===1?"":"s")+" + a display case with your rarest treasure — "
    +deals+" deals, "+(stocked+1)+" items from YOUR collection, priced "+(adj>0?"$20 ABOVE":adj<0?"$20 BELOW":"exactly AT")+" worth!"
    +(leftover>0?" ("+leftover+" kinds didn't fit — the plot/database is full, they stayed with you.)":""));
}
/* \u{1F4BE} SAVE / LOAD shop designs — stored online, 2 slots (a 3rd costs $2M) */
function openShopDesigns(p){
  const extra=localStorage.getItem("vc4slot3")==="1";
  const opts=[];
  for(let s=1;s<=(extra?3:2);s++){
    opts.push({label:"\u{1F4BE} SAVE my current shop → slot "+s,value:"s"+s});
    opts.push({label:"\u{1F4C2} LOAD slot "+s,value:"l"+s});
  }
  if(!extra)opts.push({label:"\u{1F513} Buy a 3rd slot — $"+fmtMoney(2000000),value:"buy"});
  opts.push({label:"❌ Close",value:"x"});
  showDest("\u{1F4BE} Shop designs — saved ONLINE, on your account",opts,async v=>{
    if(v==="x")return;
    if(v==="buy"){
      if(MONEY.v<2000000){toast("\u{1F4B0} The 3rd slot costs $2M — you have $"+fmtMoney(MONEY.v)+"!");return;}
      MONEY.v-=2000000;updateMoneyUI();saveGame();profileSave(true);
      try{localStorage.setItem("vc4slot3","1");}catch(e){}
      toast("\u{1F513} 3rd design slot unlocked!");
      openShopDesigns(p);
      return;
    }
    if(!SERVER_READY){toast("\u{1F534} Shop designs live in the online database — no connection right now.");return;}
    const slot=v.slice(1);
    if(v[0]==="s"){
      const d=MKT[p.id]||{b:0,name:"",items:[]};
      const s2=JSON.stringify({b:d.b||0,name:d.name||"",sub:d.sub||"",items:d.items||[]});
      if(s2.length>100000){toast("Your shop is too big to save — take a few deals off first!");return;}
      const ok=await fbPut("/shopdesigns/"+profileKey()+"/"+slot,{t:myToken(),ts:Date.now(),data:s2});
      toast(ok?"\u{1F4BE} Shop saved to slot "+slot+"!":"\u{1F534} Couldn't save — the database rules need the small update in FIREBASE-SETUP.md.");
      return;
    }
    const g2=await fbGet("/shopdesigns/"+profileKey()+"/"+slot);
    if(!g2.ok||!g2.data||typeof g2.data.data!=="string"){toast("\u{1F4C2} Slot "+slot+" is empty!");return;}
    let sv=null;
    try{sv=JSON.parse(g2.data.data);}catch(e){}
    if(!sv||!Array.isArray(sv.items)){toast("\u{1F4C2} That design is broken — save a new one!");return;}
    const d=MKT[p.id]=MKT[p.id]||{b:0,name:"",items:[]};
    /* current stock comes back to you, then the design restocks from your collection */
    (d.items||[]).forEach(it=>(it.o||[]).forEach(o=>{if(o.ty&&o.q>0)mktGiveGoods(o,o.q);}));
    d.b=sv.b?1:0;
    if(typeof sv.name==="string")d.name=sv.name;
    if(typeof sv.sub==="string")d.sub=sv.sub;
    d.items=[];
    let missing=0;
    sv.items.slice(0,16).forEach(it=>{
      const piece={k:it.k==="c"?"c":it.k==="s"?"s":"t",dx:+it.dx||0,dz:+it.dz||0,r:+it.r||0,o:[]};
      (Array.isArray(it.o)?it.o:[]).slice(0,mktCap(piece)).forEach(o=>{
        if(!o||!o.ty)return;
        const grp={lab:o.lab,hex:o.hex,gl:o.gl,sz:o.sz,fh:o.fh,pm:o.pm,br:o.br,tier:o.tier,yr:o.yr};
        const want=Math.max(0,Math.min(9999,o.q|0));
        const got=mktTakeStock(o.ty,grp,want);
        if(got<want)missing+=want-got;
        piece.o.push(mkOffer(o.ty,grp,got,o.p,o.bb,o.bf));
      });
      d.items.push(piece);
    });
    saveMkt();saveGame();syncMarket(p.id);renderMarket(p);
    toast("\u{1F4C2} Shop design loaded!"+(missing?" ("+missing+" items were missing from your collection — those deals start low on stock.)":""));
  });
}
/* walking near someone's market loads their stalls & signs */
let _mvT=0;
function updateMarketVisit(dt){
  _mvT-=dt;if(_mvT>0)return;_mvT=2;
  if(S.world!=="earth"||!SERVER_READY)return;
  const p=nearMarketPlot();
  if(!p)return;
  if(rentedAt(p.id)){
    /* YOUR plot: re-store it online once a minute while you're here, so other
       players always find your market (heals failed earlier syncs) */
    const now2=performance.now();
    if(!p._osNext||now2>=p._osNext){p._osNext=now2+60000;if(MKT[p.id])syncMarket(p.id);}
    return;
  }
  /* LIVE market: while you're on the plot we re-check every 5 s — new tables,
     stock and prices appear for you WITHOUT a refresh */
  const now=performance.now();
  if(p._mvNext&&now<p._mvNext)return;
  p._mvNext=now+5000;
  const first=!p.visitDone;
  p.visitDone=true;
  fetchMarketFresh(p.id).then(rm=>{
    if(offScene(p.g))return;
    const sig=rm?JSON.stringify(rm.d)+"|"+rm.n:"free";
    if(!first&&p._mvSig===sig)return;   // nothing changed since last look
    p._mvSig=sig;
    renderMarket(p);
    if(first&&rm)toast("\u{1F3EA} Welcome to "+((rm.d.name&&String(rm.d.name).trim())||rm.n+"'s Marketing Plot")+" — press T to shop!");
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
        if(md)(md.items||[]).forEach(it=>(it.o||[]).forEach(o=>{if(o.ty&&o.q>0)mktGiveGoods(o,o.q);}));
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
