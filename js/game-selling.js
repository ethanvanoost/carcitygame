/* Car City Game — game-selling.js (part 6/16, split from the old game.js).
   Plain JS, ONE shared global scope across all scripts — the load order in index.html MUST stay: core, world, vehicles, then game-* parts in numbered order. */
/* ---------- dumpling & butter buyers: sell your squishies for money ---------- */
const SELL={sel:new Set(),kind:"dump"};   // kind: "dump", "butter", "phone", "cons", "tab" or "pc"
function sellGadKind(){return SELL.kind==="tab"||SELL.kind==="pc";}
function sellColl(){return SELL.kind==="butter"?BUTTER.owned:(SELL.kind==="phone"||sellGadKind())?PHONE.owned:SELL.kind==="cons"?CONSOLE.owned:DUMP.owned;}
function sellVal(d){return SELL.kind==="butter"?butterValue(d):(SELL.kind==="phone"||sellGadKind())?phoneValue(d):SELL.kind==="cons"?consoleValue(d):dumpValue(d);}
function nearTabletBuyer(){
  for(let i=tabletBuyers.length-1;i>=0;i--){
    const b=tabletBuyers[i];
    if(offScene(b.g)){tabletBuyers.splice(i,1);continue;}
    if(Math.hypot(player.x-b.x,player.z-b.z)<7)return b;
  }
  return null;
}
function nearComputerBuyer(){
  for(let i=computerBuyers.length-1;i>=0;i--){
    const b=computerBuyers[i];
    if(offScene(b.g)){computerBuyers.splice(i,1);continue;}
    if(Math.hypot(player.x-b.x,player.z-b.z)<7)return b;
  }
  return null;
}
function nearConsoleBuyer(){
  for(let i=consoleBuyers.length-1;i>=0;i--){
    const b=consoleBuyers[i];
    if(offScene(b.g)){consoleBuyers.splice(i,1);continue;}
    if(Math.hypot(player.x-b.x,player.z-b.z)<7)return b;
  }
  return null;
}
function nearPhoneBuyer(){
  for(let i=phoneBuyers.length-1;i>=0;i--){
    const b=phoneBuyers[i];
    if(offScene(b.g)){phoneBuyers.splice(i,1);continue;}
    if(Math.hypot(player.x-b.x,player.z-b.z)<7)return b;
  }
  return null;
}
function nearBuyer(){
  for(let i=buyers.length-1;i>=0;i--){
    const b=buyers[i];
    if(offScene(b.g)){buyers.splice(i,1);continue;}
    if(Math.hypot(player.x-b.x,player.z-b.z)<7)return b;
  }
  return null;
}
function nearButterBuyer(){
  for(let i=butterBuyers.length-1;i>=0;i--){
    const b=butterBuyers[i];
    if(offScene(b.g)){butterBuyers.splice(i,1);continue;}
    if(Math.hypot(player.x-b.x,player.z-b.z)<7)return b;
  }
  return null;
}
/* filters COMBINE: a color AND glitter AND (at the butter buyer) a size —
   the list only shows what matches, and matching items get auto-selected */
const FILT={color:null,glit:"all",size:"all",brand:"all",pvar:"all",q:""};
/* shared phone filters: brand + exact version (used by the buyer AND the market picker) */
function phoneFiltPass(m,brand,pvar){
  m=m||"";
  if(brand==="iphone"&&m.indexOf("iPhone")!==0)return false;
  if(brand==="pixel"&&m.indexOf("Pixel")<0)return false;
  if(brand==="gs"&&!/Galaxy S\d/.test(m))return false;
  if(brand==="ga"&&!/Galaxy A\d/.test(m))return false;
  if(pvar!=="all"){
    const promax=/Pro Max$/.test(m),pro=/Pro$/.test(m),plus=/\+$/.test(m),ultra=/Ultra$/.test(m),aV=/\da$/.test(m);
    if(pvar==="base"&&(promax||pro||plus||ultra||aV))return false;
    if(pvar==="pro"&&!pro)return false;
    if(pvar==="promax"&&!promax)return false;
    if(pvar==="plus"&&!plus)return false;
    if(pvar==="ultra"&&!ultra)return false;
    if(pvar==="a"&&!aV)return false;
  }
  return true;
}
/* shared console filters: PlayStation / Xbox / Nintendo (used by buyer AND market picker) */
function consBrandPass(m,brand){
  m=m||"";
  if(brand==="ps")return m.indexOf("PlayStation")===0;
  if(brand==="xbox")return m.indexOf("Xbox")===0;
  if(brand==="nin")return m.indexOf("Nintendo")===0;
  return true;
}
/* shared tablet/computer filters: pick EXACTLY the kind — iPad vs Galaxy Tab,
   MacBook vs iMac/Mac mini vs Galaxy Book (used by the buyers AND the market picker) */
function gadBrandPass(m,brand){
  m=m||"";
  if(brand==="ipad")return m.indexOf("iPad")===0;
  if(brand==="stab")return m.indexOf("Samsung Galaxy Tab")===0;
  if(brand==="mb")return m.indexOf("MacBook")===0;
  if(brand==="mac")return m==="iMac"||m==="Mac mini";
  if(brand==="sbook")return m.indexOf("Samsung Galaxy Book")===0;
  return true;
}
function gadBrandRow(wrap,pc,cur,setFn){
  wrap.style.display="";wrap.innerHTML="";
  (pc?[["all","All computers"],["mb","\u{1F34E} MacBook"],["mac","\u{1F5A5} iMac & Mac mini"],["sbook","Samsung Galaxy Book"]]
     :[["all","All tablets"],["ipad","\u{1F34E} iPad"],["stab","Samsung Galaxy Tab"]]).forEach(([v,l])=>{
    const b=document.createElement("button");
    b.textContent=l;
    if(cur===v)b.className="on";
    b.onclick=()=>setFn(v);
    wrap.appendChild(b);
  });
}
function consBrandRow(wrap,cur,setFn){
  wrap.style.display="";wrap.innerHTML="";
  [["all","All consoles"],["ps","\u{1F3AE} PlayStation"],["xbox","Xbox"],["nin","Nintendo"]].forEach(([v,l])=>{
    const b=document.createElement("button");
    b.textContent=l;
    if(cur===v)b.className="on";
    b.onclick=()=>setFn(v);
    wrap.appendChild(b);
  });
}
function phoneVarOpts(brand){
  return brand==="iphone"?[["all","All versions"],["base","Base"],["pro","Pro"],["promax","Pro Max"]]
    :brand==="pixel"?[["all","All versions"],["base","Base"],["a","a (small)"],["pro","Pro"]]
    :brand==="gs"?[["all","All versions"],["base","Base"],["plus","+ Plus"],["ultra","Ultra"]]
    :null;
}
function passFilt(d){
  /* the tablet/computer buyers only take THEIR devices out of your collection */
  if(SELL.kind==="tab"&&!isTabletM(d.m))return false;
  if(SELL.kind==="pc"&&!isComputerM(d.m))return false;
  if(SELL.kind==="phone"&&(isTabletM(d.m)||isComputerM(d.m)))return false;
  if(FILT.color&&d.color!==FILT.color)return false;
  if(SELL.kind!=="phone"&&!sellGadKind()){   // phones & gadgets have no glitter
    if(FILT.glit==="glitter"&&!d.glitter)return false;
    if(FILT.glit==="normal"&&d.glitter)return false;
  }
  if(SELL.kind==="butter"&&FILT.size!=="all"&&(d.size||"norm")!==FILT.size)return false;
  if(SELL.kind==="phone"&&!phoneFiltPass(d.m,FILT.brand,FILT.pvar))return false;
  if(SELL.kind==="cons"&&!consBrandPass(d.m,FILT.brand))return false;
  if(sellGadKind()&&!gadBrandPass(d.m,FILT.brand))return false;
  if(FILT.q&&!qMatch(FILT.q,sellSearchText(d)))return false;   // 🔎 the search bar
  return true;
}
/* what the 🔎 search bar matches against — color + model (or size for butter) */
function sellSearchText(d){
  if(d.m)return d.color+" "+d.m;
  return (d.glitter?"glitter ":"")+(d.size?butterSizeLabel(d):"")+d.color;
}
function shownItems(){
  const out=[];
  sellColl().forEach((d,i)=>{if(passFilt(d))out.push({d,i});});
  return out;
}
function selectShown(){SELL.sel=new Set(shownItems().map(o=>o.i));renderSell();}
function renderSellChips(){
  const wrap=$("sellColors");wrap.innerHTML="";
  const opts=[["All colors",null,"#5b6b8c"],...DUMP_COLORS.map(c=>[c[0],c[0],c[1]]),["Rainbow","Rainbow",RAINBOW_CSS],["Gold","Gold","#ffd700"]];
  if(SELL.kind==="phone"||SELL.kind==="cons"||sellGadKind())opts.push(["Black","Black","#1c1c1e"]);
  opts.forEach(([label,val,bg])=>{
    const b=document.createElement("button");
    b.innerHTML="<span class='swatch' style='background:"+bg+"'></span>"+label;
    if(FILT.color===val)b.style.cssText="border-color:var(--acc2);color:var(--acc2);font-weight:700";
    b.onclick=()=>{FILT.color=val;selectShown();};
    wrap.appendChild(b);
  });
}
function segOn(ids,onId){ids.forEach(id=>$(id).classList.toggle("on",id===onId));}
function renderSell(){
  const coll=sellColl(),butter=SELL.kind==="butter",phone=SELL.kind==="phone",cons=SELL.kind==="cons",gad=sellGadKind();
  $("sellSizeRow").style.display=butter?"":"none";
  $("sellGlitRow").style.display=(phone||cons||gad)?"none":"";
  /* phones: filter by brand AND the exact version (Pro / Pro Max / + / Ultra / a) */
  $("sellBrandRow").style.display=phone?"":"none";
  if(cons){
    /* consoles: filter by TYPE (PlayStation / Xbox / Nintendo) + the color chips */
    consBrandRow($("sellVarRow"),FILT.brand,v=>{FILT.brand=v;selectShown();});
  }else if(gad){
    /* tablets & computers: filter by KIND — iPad / Galaxy Tab, MacBook / iMac / Galaxy Book */
    gadBrandRow($("sellVarRow"),SELL.kind==="pc",FILT.brand,v=>{FILT.brand=v;selectShown();});
  }
  if(phone){
    segOn(["fBrAll","fBrI","fBrP","fBrS","fBrA"],
      FILT.brand==="iphone"?"fBrI":FILT.brand==="pixel"?"fBrP":FILT.brand==="gs"?"fBrS":FILT.brand==="ga"?"fBrA":"fBrAll");
    const vw=$("sellVarRow");
    const vops=phoneVarOpts(FILT.brand);
    if(vops){
      vw.style.display="";vw.innerHTML="";
      vops.forEach(([v,l])=>{
        const b=document.createElement("button");
        b.textContent=l;
        if(FILT.pvar===v)b.className="on";
        b.onclick=()=>{FILT.pvar=v;selectShown();};
        vw.appendChild(b);
      });
    }else vw.style.display="none";
  }else if(!cons&&!gad)$("sellVarRow").style.display="none";
  segOn(["fGlitAll","fGlit","fNorm"],FILT.glit==="glitter"?"fGlit":FILT.glit==="normal"?"fNorm":"fGlitAll");
  segOn(["fSzAll","fSzNorm","fSzMed","fSzMega"],FILT.size==="norm"?"fSzNorm":FILT.size==="med"?"fSzMed":FILT.size==="mega"?"fSzMega":"fSzAll");
  renderSellChips();
  const shown=shownItems();
  const list=$("sellList");list.innerHTML="";
  if(!coll.length||(gad&&!shown.length&&!FILT.color)){
    const d=document.createElement("div");
    d.style.cssText="color:var(--dim);font-size:13px";
    d.textContent=phone?"You have no phones — get boxes at a \u{1F4F1} CoolBlue and unbox them first!"
      :cons?"You have no consoles — get FREE boxes at a \u{1F4F1} CoolBlue and unbox them first!"
      :SELL.kind==="tab"?"You have no tablets — grab FREE \u{1F4F2} tablet boxes at a CoolBlue and open them in \u{1F381} Unbox!"
      :SELL.kind==="pc"?"You have no computers — grab FREE \u{1F4BB} computer boxes at a CoolBlue and open them in \u{1F381} Unbox!"
      :"You have no "+(butter?"butter squishies":"dumplings")+" — buy them at a MEGA MART and open them first!";
    list.appendChild(d);
  }else if(!shown.length){
    const d=document.createElement("div");
    d.style.cssText="color:var(--dim);font-size:13px";
    d.textContent="Nothing matches these filters — you have "+coll.length+" in total. Try \u{1F504} other filters!";
    list.appendChild(d);
  }
  chunkedList(list,shown,o=>{
    const d=o.d,i=o.i;
    const b=document.createElement("button");
    b.className="dumpItem"+((d.glitter||d.color==="Rainbow")?" glitter":"")+(SELL.sel.has(i)?" sel":"");
    b.innerHTML=(SELL.sel.has(i)?"✅ ":"")+"<span class='swatch' style='background:"+d.hex+"'></span>"
      +((phone||cons||gad)?(d.color==="Rainbow"?"\u{1F308} RAINBOW ":d.color+" ")+d.m
        :(d.glitter?"✨ GLITTER ":"")+(butter?butterSizeLabel(d):"")+d.color)
      +" — $"+fmtMoney(sellVal(d));
    b.onclick=()=>{SELL.sel.has(i)?SELL.sel.delete(i):SELL.sel.add(i);renderSell();};
    return b;
  });
  let tot=0,cnt=0;
  SELL.sel.forEach(i=>{const d=coll[i];if(d){tot+=sellVal(d);cnt++;}});
  $("sellDo").textContent="\u{1F4B5} Sell "+cnt+" selected — $"+fmtMoney(tot);
}
function openSell(kind){
  SELL.kind=kind==="butter"?"butter":kind==="phone"?"phone":kind==="cons"?"cons":kind==="tab"?"tab":kind==="pc"?"pc":"dump";
  $("sellTitle").textContent=SELL.kind==="butter"?"\u{1F9C8} Butter buyer — sell your butter squishies"
    :SELL.kind==="phone"?"\u{1F4F1} Phone buyer — sell your phones"
    :SELL.kind==="cons"?"\u{1F3AE} Console buyer — sell your consoles"
    :SELL.kind==="tab"?"\u{1F4F2} Tablet buyer — sell your iPads & Galaxy Tabs"
    :SELL.kind==="pc"?"\u{1F4BB} Computer buyer — sell your MacBooks, iMacs & Galaxy Books"
    :"\u{1F95F} Dumpling buyer — sell your dumplings";
  FILT.color=null;FILT.glit="all";FILT.size="all";FILT.brand="all";FILT.pvar="all";
  FILT.q="";$("sellSearch").value="";
  SELL.sel.clear();renderSell();$("sellModal").classList.add("open");
}
$("sellSearch").oninput=()=>{FILT.q=$("sellSearch").value.trim().toLowerCase();selectShown();};
$("fBrAll").onclick=()=>{FILT.brand="all";FILT.pvar="all";selectShown();};
$("fBrI").onclick=()=>{FILT.brand="iphone";FILT.pvar="all";selectShown();};
$("fBrP").onclick=()=>{FILT.brand="pixel";FILT.pvar="all";selectShown();};
$("fBrS").onclick=()=>{FILT.brand="gs";FILT.pvar="all";selectShown();};
$("fBrA").onclick=()=>{FILT.brand="ga";FILT.pvar="all";selectShown();};
$("selAll").onclick=()=>selectShown();
$("selNone").onclick=()=>{SELL.sel.clear();renderSell();};
$("fGlitAll").onclick=()=>{FILT.glit="all";selectShown();};
$("fGlit").onclick=()=>{FILT.glit="glitter";selectShown();};
$("fNorm").onclick=()=>{FILT.glit="normal";selectShown();};
$("fSzAll").onclick=()=>{FILT.size="all";selectShown();};
$("fSzNorm").onclick=()=>{FILT.size="norm";selectShown();};
$("fSzMed").onclick=()=>{FILT.size="med";selectShown();};
$("fSzMega").onclick=()=>{FILT.size="mega";selectShown();};
$("sellDo").onclick=()=>{
  if(!SELL.sel.size){toast("Select some to sell first!");return;}
  const coll=sellColl(),idx=[...SELL.sel].sort((a,b)=>b-a);
  let tot=0;
  for(const i of idx){
    const d=coll[i];tot+=sellVal(d);
    if(HOLD.d===d){HOLD.d=null;HOLD.mesh.visible=false;}
    coll.splice(i,1);
  }
  SELL.sel.clear();
  addMoney(tot);renderSell();
  toast("\u{1F4B0} Sold! You earned $"+fmtMoney(tot));
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
    const row=document.createElement("div");
    row.style.cssText="display:flex;gap:6px;align-items:stretch";
    const b=document.createElement("button");
    b.style.flex="1";
    b.innerHTML=rm.label+" <span style='color:var(--dim)'>— teleport or route</span>";
    b.onclick=()=>{
      $("roomsModal").classList.remove("open");
      showDest(rm.label,[
        {label:"⚡ TELEPORT — go there right now",value:"tp"},
        {label:"\u{1F9ED} ROUTE — show the way, drive there yourself",value:"route"},
        {label:"❌ Close",value:"x"}
      ],a=>{
        if(a==="tp")gotoRoom(rm);
        else if(a==="route"){setRoute(rm.x,rm.z);toast("\u{1F9ED} Route set to "+rm.label+" — follow the blue line!");}
      });
    };
    row.appendChild(b);
    /* renting? you can switch to buying — the rent you paid counts! */
    if(rm.mode==="rent"){
      const buy=document.createElement("button");
      buy.textContent="\u{1F4B0} Buy";
      buy.title="Switch to BUY — you only pay the rest: $"+fmtMoney(propBuyDue(rm))+" (your items stay!)";
      buy.style.cssText="flex:0 0 auto;border-color:var(--good);color:var(--good)";
      buy.onclick=()=>{$("roomsModal").classList.remove("open");switchToBuy(rm);};
      row.appendChild(buy);
    }
    /* give the place back — your placed items get deleted */
    const u=document.createElement("button");
    u.textContent="\u{1F6AA} Unrent";
    u.title="Give it back — all your placed items get deleted";
    u.style.cssText="flex:0 0 auto;border-color:var(--bad);color:var(--bad)";
    u.onclick=()=>{$("roomsModal").classList.remove("open");askUnrent(rm);};
    row.appendChild(u);
    list.appendChild(row);
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
  toast(HUNGER.on?"\u{1F354} Hunger ON — remember to eat!":"\u{1F6AB} Hunger OFF");
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
/* jump YOUR clock forward to the next `hour`:00 — works everywhere, even on
   servers (there it moves your personal time-skew instead of the shared clock) */
function skipToMorning(hour){
  if(WORLD.name){
    const fwd=(((hour*60)-CLOCK.min)+1440)%1440||1440;
    CLOCK.skew=(CLOCK.skew||0)+fwd;
    try{localStorage.setItem("vc4skew",String(CLOCK.skew));}catch(e){}
    clockTick(0);   // apply the jump right away
  }else{
    if(CLOCK.min>=hour*60)CLOCK.day++;
    CLOCK.min=hour*60;
  }
}
function sleepNight(){
  skipToMorning(7);
  HUNGER.v=Math.max(HUNGER.v,40);HUNGER.starveT=0;   // breakfast included
  toast("\u{1F634} Zzz... Good morning! It's 07:00 on day "+CLOCK.day+" — the night is GONE!");
}
function tryFurniture(){
  if(!player.onFoot||S.world!=="earth")return false;
  if(SIT.on){SIT.on=false;toast("You stood up.");return true;}
  const dk=nearFurn(hotelDesks,3.2);
  if(dk){
    const mine=rentedAt(dk.id);
    if(mine){
      const opts=[{label:"\u{1F6CE}️ Go to "+(dk.mansion?"your mansion":dk.house?"your house":"your room"),value:"go"}];
      if(mine.mode==="rent")opts.push({label:"\u{1F4B0} SWITCH TO BUY — pay the rest: $"+fmtMoney(propBuyDue(mine))+" (your rent counted!)",value:"buy"});
      opts.push({label:"\u{1F6AA} UNRENT — give it back (your placed items get deleted)",value:"unrent"},
        {label:"❌ Close",value:"x"});
      showDest(mine.label,opts,a=>{
        if(a==="go")gotoRoom(dk.room);
        else if(a==="buy")switchToBuy(mine);
        else if(a==="unrent")askUnrent(mine);
      });
    }
    else openPropertyDesk(dk);
    return true;
  }
  /* the concert tip hat: collect your earnings */
  for(let i=pianos.length-1;i>=0;i--){
    const p2=pianos[i];
    if(offScene(p2.g)){pianos.splice(i,1);continue;}
    if(p2.hat&&(p2.hatMoney||0)>0&&Math.abs(player.y-p2.y)<3&&Math.hypot(player.x-p2.hat.x,player.z-p2.hat.z)<2.4){
      addMoney(p2.hatMoney);
      toast("\u{1F3A9}\u{1F4B5} You collected $"+p2.hatMoney+" from the hat — great show!");
      p2.hatMoney=0;
      ACH.flags.concert=true;saveAch();
      if(p2.hatBills)p2.hatBills.visible=false;
      return true;
    }
  }
  /* the TV: pick a channel */
  if(nearTv()){openTvMenu();return true;}
  /* pianos: sit down and play (computer keyboard or a real MIDI keyboard) */
  const pn=nearFurn(pianos,4.5);
  if(pn){openPiano(pn);return true;}
  /* 🎮 your placed console: press T to pick a game */
  const gcn=nearFurn(GCONS,2.8);
  if(gcn){openConsoleGames(gcn.cm);return true;}
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
  /* standing in YOUR apartment room: order food — or game on your console! */
  if(player.onFoot&&myRoomHere()){
    if(CONSOLE.owned.length){
      const best=CONSOLE.owned.reduce((a,b)=>consoleValue(b)>consoleValue(a)?b:a,CONSOLE.owned[0]);
      showDest("\u{1F6CE}️ Your room",[
        {label:"\u{1F354} Order food to your door",value:"food"},
        {label:"\u{1F3AE} Play on your "+best.m,value:"game"},
        {label:"❌ Close",value:"x"}
      ],v=>{
        if(v==="food")openOrderMenu();
        else if(v==="game")openConsoleGames(best.m);
      });
    }else openOrderMenu();
    return true;
  }
  return false;
}
