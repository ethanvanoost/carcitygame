/* Car City Game — game-worlds.js (part 10/16, split from the old game.js).
   Plain JS, ONE shared global scope across all scripts — the load order in index.html MUST stay: core, world, vehicles, then game-* parts in numbered order. */
/* ================= 🌍 WORLDS TAB: your worlds, shared worlds & invites =================
   Invites ride the payments inbox (d = "INV|kind|world"), so the moment the
   invited player is online their game collects it and shows a notification. */
const SHARED={list:[]};
function loadShared(){
  try{const d=JSON.parse(localStorage.getItem("vc4shared")||"[]");
    if(Array.isArray(d))SHARED.list=d.filter(s=>s&&typeof s.n==="string");}catch(e){}
}
function saveShared(){try{localStorage.setItem("vc4shared",JSON.stringify(SHARED.list))}catch(e){}}
loadShared();
function addShared(n,from,mc){
  if(SHARED.list.some(s=>s.n===n&&!!s.mc===!!mc))return;
  SHARED.list.push({n,from:from||"",mc:!!mc});saveShared();
  try{renderWorldsTab();}catch(e){}
}
function wtRow(parent,name,info,btnLabel,onGo,onDel){
  const row=document.createElement("div");row.className="srvRow";
  const nm=document.createElement("div");nm.className="nm";nm.textContent=name;
  const inf=document.createElement("div");inf.className="inf";inf.textContent=info;
  const b=document.createElement("button");b.className="btn warn";b.textContent=btnLabel;b.onclick=onGo;
  row.appendChild(nm);row.appendChild(inf);row.appendChild(b);
  if(onDel){
    const x=document.createElement("button");x.className="btn";x.textContent="✕";x.title="Remove";
    x.onclick=onDel;row.appendChild(x);
  }
  parent.appendChild(row);
}
function renderWorldsTab(){
  const mine=$("wtMine");mine.innerHTML="";
  if(!WORLDS.list.length){
    const d=document.createElement("div");d.className="srvEmpty";
    d.textContent="No worlds yet — type a name in the bar at the top and hit \u{1F30D} Create world!";
    mine.appendChild(d);
  }
  WORLDS.list.forEach(n=>{
    wtRow(mine,"\u{1F30D} "+n,WORLD.name===n?"you are here":"",
      WORLD.name===n?"✅ Joined":"▶ Join",
      ()=>{setWorld(n);renderWorldsTab();toast("\u{1F30D} Switched to world \""+n+"\" — pick a vehicle and play!");});
    const row=mine.lastChild;
    const inv=document.createElement("button");inv.className="btn";inv.textContent="\u{1F4E8} Invite";
    inv.onclick=()=>openInviteSearch(n,false);
    row.appendChild(inv);
  });
  const sh=$("wtShared");sh.innerHTML="";
  if(!SHARED.list.length){
    const d=document.createElement("div");d.className="srvEmpty";
    d.textContent="Nothing here yet — when a friend invites you to a world, it appears here!";
    sh.appendChild(d);
  }
  SHARED.list.forEach((s,i)=>{
    wtRow(sh,(s.mc?"⛏️ Minecraft":"\u{1F30D} "+s.n),s.from?"invited by "+s.from:"",
      s.mc?"⛏️ Enter":"▶ Join",
      ()=>{
        if(s.mc){wtEnterMc();return;}
        setWorld(s.n);addWorld(s.n);renderWorldsTab();
        toast("\u{1F30D} Joined "+s.from+"'s world \""+s.n+"\" — pick a vehicle and play!");
      },
      ()=>{SHARED.list.splice(i,1);saveShared();renderWorldsTab();});
  });
}
/* invite search: exact username lookup online + whoever is driving around right now */
let WT_TARGET=null;   // the world the next invite is for (null = ask)
function openInviteSearch(world,mc){
  WT_TARGET={world,mc};
  $("wtSearch").focus();
  toast("\u{1F4E8} Type your friend's username and hit \u{1F50D} Search to invite them to "+(mc?"MINECRAFT":"\""+world+"\"")+"!");
}
async function wtDoSearch(){
  const q=cleanServerName($("wtSearch").value).slice(0,16);
  const out=$("wtResults");out.innerHTML="";
  if(q.length<3){out.innerHTML="<div class='srvEmpty'>Type at least 3 letters of your friend's username.</div>";return;}
  out.innerHTML="<div class='srvEmpty'>⏳ Searching...</div>";
  const found=new Map();
  /* players online right now (substring match) */
  for(const o of MP.others.values())
    if(o.name&&o.name.toLowerCase().includes(q.toLowerCase()))found.set(o.name,"\u{1F7E2} online now");
  /* exact username lookup in the online database */
  try{
    if(SERVER_READY){
      const r=await fetch(SERVER_API+"/usernames/"+payKey(q)+".json",{cache:"no-store"});
      if(r.ok){const d=await r.json();if(d&&d.name&&!found.has(d.name))found.set(d.name,"registered player");}
    }
  }catch(e){}
  out.innerHTML="";
  if(!found.size){
    out.innerHTML="<div class='srvEmpty'>No player called \""+q+"\" found — usernames must match exactly (ask your friend for theirs!).</div>";
    return;
  }
  for(const[name,info]of found){
    if(payKey(name)===profileKey())continue;   // that's you
    wtRow(out,"\u{1F464} "+name,info,"\u{1F4E8} Invite",()=>inviteFlow(name));
  }
  if(!out.children.length)out.innerHTML="<div class='srvEmpty'>\u{1F914} That's you — invite someone else!</div>";
}
function inviteFlow(name){
  const send=(world,mc)=>sendInvite(name,world,mc);
  if(WT_TARGET){const t=WT_TARGET;WT_TARGET=null;send(t.world,t.mc);return;}
  const opts=WORLDS.list.map(n=>({label:"\u{1F30D} "+n,value:"w:"+n}));
  opts.push({label:"⛏️ The MINECRAFT world",value:"mc"});
  opts.push({label:"❌ Cancel",value:"cancel"});
  showDest("\u{1F4E8} Invite "+name+" to which world?",opts,v=>{
    if(v==="cancel")return;
    if(v==="mc")send("Minecraft",true);
    else send(v.slice(2),false);
  });
}
async function sendInvite(name,world,mc){
  const ok=await sendMoney(name,1,{d:"INV|"+(mc?"mc":"w")+"|"+String(world).slice(0,40)},true);
  if(ok)toast("\u{1F4E8} Invite sent! "+name+" gets a notification the moment they play"+(mc?" — MINECRAFT together (each in their own blocky world)!":" and your world appears in their \u{1F30D} Worlds tab!"));
}
$("wtSearchBtn").onclick=wtDoSearch;
$("wtSearch").addEventListener("keydown",e=>{if(e.key==="Enter")wtDoSearch();});
function wtEnterMc(){
  if(S.mode!=="game"){
    /* not playing yet? start the game with your (last) vehicle, then dive in */
    const v=S.selected||VEHICLES.find(x=>OWN.has(x.name))||VEHICLES[VEHICLES.length-1];
    startGame(v);
  }
  enterMc();
}
$("wtMc").onclick=wtEnterMc;
/* ---------- multiplayer presence: see other players in your world (Firebase) ----------
   every player writes their position ~5x/second to players/<world>/<id> and
   listens to everyone else's; other players appear as cars/people with name tags. */
const MP={sdk:false,on:false,id:"p"+Math.random().toString(36).slice(2,10),ref:null,myRef:null,
  others:new Map(),sendT:0,worldKey:null,lastSig:"",lastSendAt:0,
  fallback:"Racer"+Math.floor(100+Math.random()*900)};
function mpName(){
  const n=cleanServerName(localStorage.getItem("vc4pname")||"").slice(0,16);
  return n||MP.fallback;
}
/* ---------- unique usernames: claimed online, first come first served ---------- */
function myToken(){
  let t=localStorage.getItem("vc4ptoken");
  if(!t){t="t"+Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem("vc4ptoken",t);}
  return t;
}
/* simple accounts: just pick a username — first come, first served */
async function claimName(raw){
  const n=cleanServerName(raw||"").slice(0,16);
  if(n.length<3)return{ok:false,msg:"Use at least 3 letters or numbers."};
  if(!SERVER_READY)return{ok:true,offline:true,name:n};
  const key=n.toLowerCase().replace(/[^a-z0-9]/g,"_");
  const url=SERVER_API+"/usernames/"+key+".json";
  try{
    const r=await fetch(url,{cache:"no-store"});
    if(!r.ok)throw 0;
    const d=await r.json();
    if(d&&d.t===myToken())return{ok:true,name:n};          /* already mine */
    if(d)return{ok:false,msg:"\""+n+"\" is already taken — try another!"};
    const w=await fetch(url,{method:"PUT",
      body:JSON.stringify({t:myToken(),name:n,created:new Date().toISOString().slice(0,10)})});
    if(!w.ok)return{ok:false,msg:"\""+n+"\" is already taken — try another!"}; /* lost the race */
    return{ok:true,name:n};
  }catch(e){return{ok:true,offline:true,name:n};}          /* offline: allow for now */
}
async function doClaim(){
  const btn=$("nameClaim");
  btn.disabled=true;
  $("nameStatus").textContent="⏳ Checking if that name is free...";
  const res=await claimName($("nameInput").value);
  btn.disabled=false;
  if(!res.ok){$("nameStatus").textContent="❌ "+res.msg;return;}
  localStorage.setItem("vc4pname",res.name);
  localStorage.setItem("vc4nameok","1");
  $("pName").value=res.name;
  $("nameModal").classList.remove("open");
  profileLoad();
  toast(res.offline
    ?"\u{1F464} You are \""+res.name+"\" (offline — not reserved online yet)"
    :"\u{1F464} Username \""+res.name+"\" is yours!");
}
$("nameClaim").onclick=doClaim;
$("nameInput").addEventListener("keydown",e=>{if(e.key==="Enter")doClaim();});
$("nameInput").addEventListener("input",()=>{$("nameStatus").textContent="";});
$("nameSkip").onclick=()=>{
  localStorage.setItem("vc4nameok","1");
  $("nameModal").classList.remove("open");
  toast("\u{1F464} You are \""+mpName()+"\" for now — pick a real name in ⚙ Settings!");
};
/* pick a username before playing — also shows once for players from before
   this update (their old auto-saved Racer name was never really chosen) */
if(!localStorage.getItem("vc4nameok")){
  $("nameInput").value=localStorage.getItem("vc4pname")||"";
  $("nameModal").classList.add("open");
  setTimeout(()=>{try{$("nameInput").focus();}catch(e){}},100);
}
/* ---------- public chat: one chat room for all players (Firebase) ---------- */
const CHAT={on:false,open:false,unread:0,lastSend:0};
function chatSys(msg){
  const el=$("chatMsgs"),d=document.createElement("div");
  d.className="cmsg sys";d.textContent=msg;el.appendChild(d);
  el.scrollTop=el.scrollHeight;
}
const CHAT_TTL=5*60*1000; // messages disappear after 5 minutes
function chatExpire(key){
  try{firebase.database().ref("chat/"+key).remove();}catch(e){}
  chatRemove(key);
}
function chatRemove(key){
  const row=document.querySelector('#chatMsgs [data-key="'+key+'"]');
  if(row)row.remove();
}
function chatAdd(d,key){
  if(!d||typeof d.m!=="string"||typeof d.n!=="string")return;
  const age=Date.now()-(d.t||0);
  if(age>=CHAT_TTL){chatExpire(key);return;} // already too old — clean it up
  setTimeout(()=>chatExpire(key),CHAT_TTL-age);
  /* 📻 live player-radio packets ride the chat channel — they never show as chat */
  if(d.m.startsWith("\u{1F4FB}|")){try{handleRadioPacket(d);}catch(e){}return;}
  /* 🏆 car-meet votes ride the chat channel too */
  if(d.m.startsWith("\u{1F3C6}|")){try{handleMeetVote(d);}catch(e){}return;}
  const el=$("chatMsgs"),row=document.createElement("div");
  row.dataset.key=key;
  row.className="cmsg"+(d.n===mpName()?" me":"");
  const who=document.createElement("b");who.textContent=d.n.slice(0,16)+": ";
  const txt=document.createElement("span");txt.textContent=d.m.slice(0,200);
  row.appendChild(who);row.appendChild(txt);
  el.appendChild(row);
  while(el.children.length>100)el.removeChild(el.firstChild);
  el.scrollTop=el.scrollHeight;
  /* fresh messages float above the sender's head (old replayed ones don't) */
  if(age<12000)try{chatBubbleFor(d.n,d.m.slice(0,80));}catch(e){}
  if(!CHAT.open){CHAT.unread++;chatBtnUI();}
}
function chatBtnUI(){
  $("bChat").innerHTML="\u{1F4AC} Chat"+(CHAT.unread?" <b style='color:var(--acc)'>"+(CHAT.unread>9?"9+":CHAT.unread)+"</b>":"");
}
function chatStart(){
  if(CHAT.on)return;
  if(!mpInit()){chatSys("\u{1F534} Chat is offline — couldn't reach the database.");return;}
  try{
    const ref=firebase.database().ref("chat");
    ref.limitToLast(50).on("child_added",s=>chatAdd(s.val(),s.key));
    ref.on("child_removed",s=>chatRemove(s.key)); // vanish for everyone as soon as one client deletes it
    CHAT.on=true;
    chatSys("Welcome to the public chat — be nice! \u{1F49B}");
  }catch(e){chatSys("\u{1F534} Chat is offline right now.");}
}
function chatToggle(open){
  CHAT.open=open===undefined?!CHAT.open:open;
  $("chatPanel").classList.toggle("show",CHAT.open);
  if(CHAT.open){
    chatStart();
    CHAT.unread=0;chatBtnUI();
    setTimeout(()=>{try{$("chatInput").focus();}catch(e){}},50);
  }
}
function chatSend(){
  const m=$("chatInput").value.trim().slice(0,200);
  if(!m)return;
  const now=Date.now();
  if(now-CHAT.lastSend<1500){toast("⏳ Slow down a little between messages!");return;}
  if(!CHAT.on){toast("\u{1F534} Chat is offline right now.");return;}
  CHAT.lastSend=now;
  $("chatInput").value="";
  try{
    const p=firebase.database().ref("chat").push({n:mpName(),m,t:Date.now()});
    if(p&&p.catch)p.catch(e=>toast("\u{1F4AC}\u{26A0} Message didn't send: "+(e&&e.message||e)));
  }catch(e){toast("\u{1F4AC}\u{26A0} Message didn't send: "+(e&&e.message||e));}
}
$("bChat").onclick=()=>chatToggle();
$("chatClose").onclick=()=>chatToggle(false);
$("chatSendBtn").onclick=chatSend;
$("chatInput").addEventListener("keydown",e=>{if(e.key==="Enter")chatSend();});
function mpInit(){
  if(MP.sdk)return true;
  if(!SERVER_READY||typeof firebase==="undefined"||!firebase.database)return false;
  try{firebase.initializeApp({databaseURL:SERVER_API});MP.sdk=true;}catch(e){}
  return MP.sdk;
}
function worldKeyOf(n){return n.toLowerCase().replace(/[.#$\[\]\/]/g,"_");}
function localId(){
  let i=localStorage.getItem("vc4localid");
  if(!i){i=Math.random().toString(36).slice(2,10);try{localStorage.setItem("vc4localid",i)}catch(e){}}
  return i;
}
/* the "default city" is NOT a shared server anymore — with no world picked you
   play in your OWN private city (a world key unique to you) */
function mpWorldKey(){return WORLD.name?worldKeyOf(WORLD.name):"home_"+(profileKey()||localId());}
/* ⏰ shared world time set by the 👑 owner (extra minutes on top of the shared clock) */
const WT={skew:0};
function mpJoin(){
  if(!mpInit())return;
  const key=mpWorldKey();
  if(MP.on&&key===MP.worldKey)return;
  mpLeave();
  MP.worldKey=key;
  MP.joinTs=Date.now();
  MP.ref=firebase.database().ref("players/"+key);
  MP.myRef=MP.ref.child(MP.id);
  try{MP.myRef.onDisconnect().remove();}catch(e){}
  const upd=s=>{if(s.key!==MP.id)mpApply(s.key,s.val());};
  MP.ref.on("child_added",upd);
  MP.ref.on("child_changed",upd);
  MP.ref.on("child_removed",s=>mpDrop(s.key));
  /* shared named worlds: listen for the owner's clock + my own kick/ban record */
  if(WORLD.name){
    try{
      MP.wtRef=firebase.database().ref("worldtime/"+key);
      MP.wtRef.on("value",s=>{const d=s.val();WT.skew=(d&&typeof d.skew==="number")?d.skew:0;});
      MP.modRef=firebase.database().ref("mod/"+key+"/"+payKey(mpName()));
      MP.modRef.on("value",s=>applyMod(s.val()));
    }catch(e){}
  }else WT.skew=0;
  MP.on=true;
}
function mpLeave(){
  if(!MP.on)return;
  try{MP.ref.off();MP.myRef.onDisconnect().cancel();MP.myRef.remove();}catch(e){}
  try{if(MP.wtRef)MP.wtRef.off();if(MP.modRef)MP.modRef.off();}catch(e){}
  MP.wtRef=MP.modRef=null;WT.skew=0;
  [...MP.others.keys()].forEach(mpDrop);
  MP.on=false;MP.ref=MP.myRef=null;MP.lastSig="";
}
/* ================= 👑 OWNER POWERS: kick, ban & day/time ================= */
const BAN_FOREVER=9999999999999;
function applyMod(d){
  if(!d||!WORLD.name)return;
  if(d.until&&d.until>Date.now()){
    bootMe(d.until>=BAN_FOREVER
      ?"⛔ You are BANNED FOREVER from \""+WORLD.name+"\" by the owner!"
      :"⛔ You are banned from \""+WORLD.name+"\" until "+new Date(d.until).toLocaleString()+"!");
    return;
  }
  if(d.kick&&d.kick>(MP.joinTs||0))bootMe("\u{1F462} You were KICKED out of \""+WORLD.name+"\" by the owner!");
}
function bootMe(msg){
  if(!WORLD.name)return;
  setWorld("");
  toast(msg);
  if(S.mode==="game"){teleportTo(WORLD.ox+6,WORLD.oz+6);mpJoin();}
}
/* the owner writes a kick (one-time boot) or a ban (until a timestamp) */
async function modPunish(name,until){
  if(!WORLD.name||!isOwner())return;
  const body=until?{until,by:mpName(),ts:Date.now()}:{kick:Date.now(),by:mpName(),ts:Date.now()};
  const ok=await fbPut("/mod/"+mpWorldKey()+"/"+payKey(name),body);
  if(!ok){toast("\u{1F534} Couldn't reach the database — did you paste the NEW Firebase rules? (FIREBASE-SETUP.md)");return;}
  toast(until?(until>=BAN_FOREVER?"\u{1F528} "+name+" is BANNED FOREVER from this world.":"⏳ "+name+" is banned for 1 day.")
             :"\u{1F462} "+name+" was kicked!");
}
/* ⏰ the owner changes the day & time — in a shared world EVERYONE sees it */
function ownerSetTime(min,addDay){
  if(!isOwner()){toast("\u{1F451} Only the OWNER of this world can change the time!");return;}
  if(WORLD.name){
    const delta=addDay?1440:((min-CLOCK.min)+1440)%1440;
    WT.skew=(WT.skew||0)+delta;
    fbPut("/worldtime/"+mpWorldKey(),{skew:WT.skew,by:mpName(),ts:Date.now()}).then(ok=>{
      if(!ok)toast("\u{1F534} Time not shared — paste the NEW Firebase rules (FIREBASE-SETUP.md)");
    });
    clockTick(0);
  }else{
    if(addDay)CLOCK.day++;
    else{if(min<CLOCK.min)CLOCK.day++;CLOCK.min=min;}
  }
  toast(addDay?"\u{1F4C5} A new day begins — day "+CLOCK.day+"!"
              :"⏰ Time set to "+String(Math.floor(min/60)).padStart(2,"0")+":00 for everyone in this world!");
}
function refreshOwnerBox(){
  if(!SERVERS.loaded&&WORLD.name)refreshServers();
  $("ownerBox").style.display=isOwner()?"block":"none";
}
$("otMorn").onclick=()=>ownerSetTime(8*60);
$("otNoon").onclick=()=>ownerSetTime(12*60);
$("otEve").onclick=()=>ownerSetTime(19*60);
$("otNight").onclick=()=>ownerSetTime(23*60);
$("otDay").onclick=()=>ownerSetTime(0,true);
$("ownUnban").onclick=async()=>{
  if(!isOwner())return;
  const n=cleanServerName(prompt("♻ Unban which player? Type their exact username:")||"").slice(0,16);
  if(!n)return;
  if(!WORLD.name){toast("Nobody can be banned from your own private city!");return;}
  const ok=await fbPut("/mod/"+mpWorldKey()+"/"+payKey(n),null);
  toast(ok?"♻ "+n+" is unbanned — they can join again!":"\u{1F534} Couldn't reach the database.");
};
/* 💬 chat bubbles: your message floats above your head for everyone to see */
function makeChatBubble(text){
  const cv=document.createElement("canvas");cv.width=512;cv.height=128;
  const c=cv.getContext("2d");
  c.font="bold 30px 'Segoe UI',sans-serif";
  const t=text.length>42?text.slice(0,41)+"…":text;
  const w=Math.min(496,c.measureText(t).width+40);
  c.fillStyle="rgba(255,255,255,.96)";
  if(c.roundRect){c.beginPath();c.roundRect(256-w/2,14,w,66,18);c.fill();}
  else c.fillRect(256-w/2,14,w,66);
  /* the little tail pointing down at the speaker */
  c.beginPath();c.moveTo(244,78);c.lineTo(268,78);c.lineTo(256,100);c.closePath();c.fill();
  c.fillStyle="#101623";c.textAlign="center";c.fillText(t,256,59);
  const tex=new THREE.CanvasTexture(cv);
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));
  s.scale.set(8.4,2.1,1);
  return s;
}
function showBubbleOver(obj,text,h){
  if(!obj||!text)return;
  const old=obj.userData.bub;
  if(old){obj.remove(old);try{old.material.map.dispose();old.material.dispose();}catch(e){}}
  const s=makeChatBubble(text);
  s.position.y=h;
  obj.add(s);obj.userData.bub=s;
  clearTimeout(obj.userData.bubT);
  obj.userData.bubT=setTimeout(()=>{
    if(obj.userData.bub===s){
      obj.remove(s);obj.userData.bub=null;
      try{s.material.map.dispose();s.material.dispose();}catch(e){}
    }
  },6500);
}
function chatBubbleFor(name,msg){
  if(S.mode!=="game")return;
  if(name===mpName()){
    /* me: above my car (or above my head on foot) */
    const mine=player.onFoot?player.mesh:(player.drive&&player.drive.mesh)||player.mesh;
    showBubbleOver(mine,msg,player.onFoot?3.6:4.1);
    return;
  }
  for(const o of MP.others.values())
    if(o.name===name){showBubbleOver(o.g,msg,(o.kind==="foot"||o.kind==="seat")?3.8:4.2);break;}
}
function mpMakeLabel(name){
  const cv=document.createElement("canvas");cv.width=256;cv.height=64;
  const c=cv.getContext("2d");
  c.font="bold 34px 'Segoe UI',sans-serif";c.textAlign="center";
  const w=Math.min(244,c.measureText(name).width+30);
  c.fillStyle="rgba(13,17,26,.78)";c.fillRect(128-w/2,6,w,46);
  c.fillStyle="#3fd0ff";c.fillText(name,128,40);
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthTest:false}));
  s.scale.set(5.4,1.35,1);
  return s;
}
function mpApply(k,d){
  if(!d||typeof d.x!=="number"||typeof d.z!=="number")return;
  const kind=d.f?"foot":(d.v==="seat"?"seat":(d.v==="heli"?"heli":(d.v==="moto"||d.v==="bike"?d.v:"car")));
  const col=typeof d.c==="number"?(d.c&0xffffff):0x3fd0ff;
  const nm=typeof d.n==="string"?d.n.slice(0,16):"player";
  const av=typeof d.av==="string"?d.av:"";
  let o=MP.others.get(k);
  if(o&&(o.kind!==kind||o.color!==col||o.name!==nm||o.av!==av)){mpDrop(k);o=null;}
  if(!o){
    const g=new THREE.Group();
    const avObj=parseAv(av);
    const body=(kind==="foot"||kind==="seat")?makePerson(1,avObj?avObj.shirt:col,avObj)
      :(kind==="heli"?buildHeliMesh(col):buildVehicleMesh(kind,col));
    if(kind==="seat"){
      /* a passenger sitting in someone's car */
      const L=body.userData.limbs;
      L.lL.rotation.x=-1.5;L.rL.rotation.x=-1.5;L.lA.rotation.x=-0.5;L.rA.rotation.x=-0.5;
      body.position.y=0.42;
    }
    if(body.userData&&body.userData.riderMesh)body.userData.riderMesh.visible=true;
    g.add(body);
    const lbl=mpMakeLabel(nm);
    lbl.position.y=(kind==="foot"||kind==="seat")?2.7:3.1;g.add(lbl);
    scene.add(g);
    o={g,kind,color:col,name:nm,av,k,x:d.x,z:d.z,y:d.y||0,yaw:d.r||0};
    MP.others.set(k,o);
  }
  o.tx=d.x;o.tz=d.z;o.ty=typeof d.y==="number"?d.y:0;o.tyaw=typeof d.r==="number"?d.r:0;
  o.seen=performance.now();
}
function mpDrop(k){const o=MP.others.get(k);if(o){scene.remove(o.g);disposeGroup(o.g);MP.others.delete(k);}}
function mpTick(dt){
  if(!MP.on)return;
  /* glide the other players toward their latest reported spot */
  const now=performance.now();
  for(const[k,o]of[...MP.others]){
    if(o.seen&&now-o.seen>15000){mpDrop(k);continue;}
    const a=Math.min(1,dt*8);
    o.x+=(o.tx-o.x)*a;o.z+=(o.tz-o.z)*a;o.y+=(o.ty-o.y)*a;
    let dy=o.tyaw-o.yaw;while(dy>Math.PI)dy-=2*Math.PI;while(dy<-Math.PI)dy+=2*Math.PI;
    o.yaw+=dy*a;
    o.g.position.set(o.x,o.y,o.z);o.g.rotation.y=o.yaw;
    o.g.visible=S.world==="earth";
    /* 🚗 other players' cars are SOLID — you bump into them, not through them */
    if(S.world==="earth"&&!player.onFoot&&player.drive&&o.kind!=="foot"&&o.kind!=="seat"
       &&(!RIDE.on||RIDE.key!==k)){
      const v=player.drive;
      const dx=v.x-o.x,dz=v.z-o.z,dd=Math.hypot(dx,dz);
      if(dd<2.4&&Math.abs((v.y||0)-(o.y||0))<2.6){
        const push=(2.4-dd)/(dd||0.001);
        v.x+=dx*push;v.z+=dz*push;                 // pushed out of their car
        if(Math.abs(v.speed)>6){playCrash(Math.abs(v.speed));vehDamage(Math.abs(v.speed)*0.5);}
        v.speed*=0.4;
      }
    }
    /* ...and on FOOT you can't walk through their cars either */
    if(S.world==="earth"&&player.onFoot&&!RIDE.on&&o.kind!=="foot"&&o.kind!=="seat"){
      const dx=player.x-o.x,dz=player.z-o.z,dd=Math.hypot(dx,dz);
      if(dd<3&&Math.abs(player.y-(o.y||0))<2.6){
        const push=(3-dd)/(dd||0.001);
        player.x+=dx*push;player.z+=dz*push;
      }
    }
    /* spinning rotors on other players' helicopters */
    if(o.kind==="heli"&&o.g.children[0].userData.rotor)o.g.children[0].userData.rotor.rotation.y+=dt*24;
    /* the weekly champion wears a golden crown */
    if(BOARD.top&&o.name===BOARD.top&&!o.crown){
      o.crown=makeCrown();
      o.crown.position.y=o.kind==="foot"?2.35:2.6;
      o.g.add(o.crown);
    }
  }
  if(S.mode==="game")$("worldTxt").textContent="\u{1F30D} "+(WORLD.name||"My city (private)")+" · \u{1F465} "+(MP.others.size+1);
  /* broadcast my own position ~5x per second (only when it changed) */
  MP.sendT+=dt;
  if(MP.sendT<0.2)return;
  MP.sendT=0;
  /* keep the player dots and sidebar list fresh while the big map is open (~1x/s) */
  if(MP.others.size&&$("mapModal").classList.contains("open")&&now-(MP.mapT||0)>1000){
    MP.mapT=now;requestMap();
    if(document.activeElement!==$("mapSearch"))renderMapList();
  }
  if(S.mode!=="game"||S.world!=="earth"||player.inRocket)return;
  const src=player.drive||player;
  const d={n:mpName(),
    x:Math.round(src.x*10)/10,z:Math.round(src.z*10)/10,y:Math.round((src.y||0)*10)/10,
    r:Math.round((src.yaw||0)*100)/100,
    f:player.onFoot?1:0,
    v:player.inHeli?"heli":(RIDE.on?"seat":(player.drive?player.drive.type:"car")),
    c:RIDE.on?AVATAR.shirt:paintOf(S.selected),
    av:avString(),
    t:Date.now()};
  const sig=[d.x,d.z,d.y,d.r,d.f,d.v,d.n,d.av].join("|");
  if(sig===MP.lastSig&&now-MP.lastSendAt<5000)return;  /* parked: just a heartbeat every 5 s */
  MP.lastSig=sig;MP.lastSendAt=now;
  try{MP.myRef.set(d);}catch(e){}
}
/* player-name field in settings: goes through the same taken-check */
$("pName").value=mpName();
$("pName").addEventListener("change",async()=>{
  const res=await claimName($("pName").value);
  if(!res.ok){toast("❌ "+res.msg);$("pName").value=mpName();return;}
  localStorage.setItem("vc4pname",res.name);
  localStorage.setItem("vc4nameok","1");
  $("pName").value=res.name;
  profileLoad();
  toast(res.offline
    ?"\u{1F464} You are now \""+res.name+"\" (offline — not reserved online yet)"
    :"\u{1F464} Username \""+res.name+"\" is yours!");
});
/* ---------- your avatar: shirt, pants, hair, skin & shoes ---------- */
const AVATAR={shirt:0x2563eb,pants:0x30395c,hair:0x4a2f1d,skin:0xf1c39a,shoes:0x23262b};
try{
  const a=JSON.parse(localStorage.getItem("vc4avatar")||"null");
  if(a)for(const k of["shirt","pants","hair","skin","shoes"])if(typeof a[k]==="number")AVATAR[k]=a[k];
}catch(e){}
function avString(){return[AVATAR.shirt,AVATAR.pants,AVATAR.hair,AVATAR.skin,AVATAR.shoes].map(c=>c.toString(16)).join(",");}
function parseAv(s){
  const a=String(s||"").split(",").map(x=>parseInt(x,16));
  if(a.length<4||a.slice(0,4).some(isNaN))return null;
  return{shirt:a[0],pants:a[1],hair:a[2],skin:a[3],shoes:(a.length>4&&!isNaN(a[4]))?a[4]:0x23262b};
}
function applyAvatar(save){
  /* rebuild your (earth) body with the chosen colors */
  const old=playerEarthMesh;
  const g=makePerson(1,AVATAR.shirt,AVATAR);
  g.traverse(o=>{if(o.castShadow!==undefined)o.castShadow=true;});
  g.position.copy(old.position);g.rotation.y=old.rotation.y;
  g.visible=old.visible;
  scene.add(g);scene.remove(old);disposeGroup(old);
  playerEarthMesh=g;
  if(player.mesh===old){player.mesh=g;player.limbs=g.userData.limbs;}
  if(save){
    try{localStorage.setItem("vc4avatar",JSON.stringify(AVATAR))}catch(e){}
    MP.lastSig="";   // broadcast the new look right away
  }
}
const AV_PALETTES={
  shirt:[0x2563eb,0xd7263d,0xff7f11,0xf4d35e,0x8ac926,0x2ec4b6,0x9b5de5,0xff5d8f,0xefefef,0x111111],
  pants:[0x30395c,0x3a3a3a,0x4a3728,0x24405e,0xd7263d,0x0f7a3d,0xb56576,0x111111,0xefefef,0x6d28d9],
  hair:[0x4a2f1d,0x1c1c1e,0xc9a35a,0x8a4b2a,0xd7263d,0x9b5de5,0x2f8f46,0x1b98e0,0xefefef,0xff5d8f],
  skin:[0xf1c39a,0xd9a06b,0x8c5a2b,0x6b4226,0xffdbac,0xc68642],
  shoes:[0x23262b,0xf4f7fb,0xd7263d,0x2456c4,0x8ac926,0xff5d8f,0xffb02e,0x9b5de5,0x6f4e37,0x111111]
};
const AV_LABELS={shirt:"\u{1F455} Shirt",pants:"\u{1F456} Pants",hair:"\u{1F487} Hair",skin:"\u{1F9CD} Skin",shoes:"\u{1F45F} Shoes"};
function renderAvatarRows(){
  const w=$("avatarRows");w.innerHTML="";
  for(const key of["shirt","pants","hair","skin","shoes"]){
    const row=document.createElement("div");
    row.style.cssText="display:flex;align-items:center;gap:6px;margin-top:6px;flex-wrap:wrap";
    const lab=document.createElement("span");
    lab.style.cssText="font-size:12px;color:var(--dim);width:74px";
    lab.textContent=AV_LABELS[key];
    row.appendChild(lab);
    AV_PALETTES[key].forEach(c=>{
      const b=document.createElement("button");
      b.className="gcol"+(AVATAR[key]===c?" on":"");
      b.style.cssText+=";width:24px;height:24px;background:#"+c.toString(16).padStart(6,"0");
      b.onclick=()=>{AVATAR[key]=c;applyAvatar(true);renderAvatarRows();};
      row.appendChild(b);
    });
    w.appendChild(row);
  }
}
renderAvatarRows();
applyAvatar(false);
/* ---------- pay other players: money lands in their online inbox ---------- */
function payKey(name){return name.toLowerCase().replace(/[^a-z0-9]/g,"_");}
async function sendMoney(name,amt,extra,quiet){
  amt=Math.floor(amt);
  if(!(amt>0))return false;
  if(payKey(name)===profileKey()){toast("\u{1F914} That's you — you can't pay yourself!");return false;}
  if(MONEY.v<amt){toast("\u{1F4B0} You don't have $"+fmtMoney(amt)+"!");return false;}
  if(!SERVER_READY){toast("\u{1F534} Paying players needs the online database.");return false;}
  let ok=false;
  try{
    const body={from:mpName(),amt,ts:Date.now()};
    if(extra)Object.assign(body,extra);
    const r=await fetch(SERVER_API+"/payments/"+payKey(name)+".json",
      {method:"POST",body:JSON.stringify(body)});
    ok=r.ok;
  }catch(e){}
  if(!ok){toast("\u{1F534} Payment failed — the database may still run old rules.");return false;}
  MONEY.v-=amt;updateMoneyUI();profileSave(true);saveGame();
  if(!quiet)toast("\u{1F4B8} You sent $"+fmtMoney(amt)+" to "+name+"!");
  return true;
}
function openPay(name){
  showDest("\u{1F4B8} Send money to "+name,[
    {label:"$10",value:10},{label:"$100",value:100},
    {label:"$1,000",value:1000},{label:"$10,000",value:10000},
    {label:"✏️ Another amount...",value:"custom"},
    {label:"❌ Cancel",value:"cancel"}
  ],v=>{
    if(v==="cancel")return;
    if(v==="custom"){
      const s=prompt("How much money do you want to send to "+name+"?");
      const a=parseInt(s,10);
      if(a>0)sendMoney(name,a);else if(s!==null)toast("Type a normal number, like 250!");
      return;
    }
    sendMoney(name,v);
  });
}
/* check my inbox every few seconds — collect what other players sent me */
async function checkPayments(){
  if(!SERVER_READY)return;
  const k=profileKey();if(!k)return;
  try{
    const r=await fetch(SERVER_API+"/payments/"+k+".json",{cache:"no-store"});
    if(!r.ok)return;
    const d=await r.json();
    if(!d)return;
    for(const id of Object.keys(d)){
      const p=d[id];
      if(!p||typeof p.amt!=="number"||p.amt<=0)continue;
      fetch(SERVER_API+"/payments/"+k+"/"+id+".json",{method:"DELETE"}).catch(()=>{});
      addMoney(Math.floor(p.amt));
      if(typeof p.d==="string"&&p.d.startsWith("MKT|")){
        /* someone bought from my MARKETING PLOT — take the stock off that table */
        const[,mid,idxS,nS]=p.d.split("|");
        const md=MKT[mid],seg=String(idxS).split("."),n2=Math.max(1,parseInt(nS,10)||1);
        const pit=md&&md.items[parseInt(seg[0],10)];
        const off=pit&&pit.o&&pit.o[parseInt(seg[1],10)||0];
        if(off&&off.ty){
          off.q=Math.max(0,(off.q||0)-n2);
          saveMkt();syncMarket(mid);
          const mp2=marketPlots.find(q=>q.id===mid);
          if(mp2)renderMarket(mp2);
          toast("\u{1F3EA}\u{1F4B0} "+(p.from||"A player")+" bought "+n2+"× "+mktItemName(off)+" at your market — $"+fmtMoney(Math.floor(p.amt))+" for you!");
        }else toast("\u{1F3EA}\u{1F4B0} "+(p.from||"A player")+" bought from your market — $"+fmtMoney(Math.floor(p.amt))+"!");
      }else if(typeof p.d==="string"&&p.d.startsWith("INV|")){
        /* a WORLD INVITE rides the inbox: INV|kind|worldname */
        const[,kind,wname]=p.d.split("|");
        const mc=kind==="mc";
        addShared(mc?"Minecraft":(wname||"world"),p.from||"A player",mc);
        toast(mc
          ?"⛏️ "+(p.from||"A player")+" invited you to the MINECRAFT world! Find it under \u{1F30D} Worlds in the garage!"
          :"\u{1F30D} "+(p.from||"A player")+" invited you to world \""+wname+"\"! Find it under \u{1F30D} Worlds in the garage!");
      }else if(typeof p.d==="string"){
        /* a dumpling GIFT rides along with the payment */
        const[color,gl]=p.d.split("|");
        const hex=color==="Rainbow"?RAINBOW_CSS:(color==="Gold"?"#ffd700":((DUMP_COLORS.find(c=>c[0]===color)||["White","#f2f5f7"])[1]));
        DUMP.owned.push({color:color||"White",hex,glitter:gl==="1"});
        renderDump();saveGame();
        toast("\u{1F381} "+(p.from||"A player")+" sent you a "+(gl==="1"?"✨ GLITTER ":"")+color+" dumpling!");
      }else toast("\u{1F4B8} "+(p.from||"A player")+" sent you $"+fmtMoney(Math.floor(p.amt))+"!");
    }
  }catch(e){}
}
setInterval(checkPayments,9000);
/* ---------- friends: star a player — gold on the map, top of the list ---------- */
const FRIENDS=new Set();
try{JSON.parse(localStorage.getItem("vc4friends")||"[]").forEach(n=>{if(typeof n==="string")FRIENDS.add(n);});}catch(e){}
function saveFriends(){try{localStorage.setItem("vc4friends",JSON.stringify([...FRIENDS]))}catch(e){}}
/* ---------- ⭐ the FRIENDS list (in the Actions menu) ---------- */
async function addFriendByName(){
  const s=cleanServerName(prompt("⭐ Type your friend's player name!")||"").slice(0,16);
  if(!s)return;
  if(payKey(s)===payKey(mpName())){toast("\u{1F92D} That's YOU — you can't friend yourself!");return;}
  if(FRIENDS.has(s)){toast("⭐ "+s+" is already your friend!");openFriends();return;}
  let known=false;
  try{
    const r=await fetch(SERVER_API+"/usernames/"+payKey(s)+".json",{cache:"no-store"});
    known=r.ok&&(await r.json())!==null;
  }catch(e){}
  if(!known){toast("\u{1F914} No player called \""+s+"\" exists (yet) — check the spelling!");return;}
  FRIENDS.add(s);saveFriends();requestMap();
  toast("⭐ "+s+" is now your FRIEND — gold on the map when you meet!");
  openFriends();
}
function openFriends(){
  const online=new Map([...MP.others.values()].map(o=>[o.name,o]));
  const opts=[...FRIENDS]
    .sort((a,b)=>((online.has(b)?1:0)-(online.has(a)?1:0))||a.localeCompare(b))
    .map(n=>({
      label:online.has(n)
        ?"\u{1F7E2} "+n+" — HERE! "+fmtDist(Math.hypot(online.get(n).x-player.x,online.get(n).z-player.z))+" away"
        :"⚪ "+n+" — not in this world right now",
      value:"f:"+n
    }));
  if(!FRIENDS.size)opts.push({label:"\u{1F4A1} No friends yet — add one below, or tap a player on the \u{1F5FA} Map!",value:"cancel"});
  opts.push({label:"➕ Add a friend by name...",value:"add"});
  opts.push({label:"❌ Close",value:"cancel"});
  showDest("⭐ MY FRIENDS ("+FRIENDS.size+")",opts,v=>{
    if(v==="cancel")return;
    if(v==="add"){addFriendByName();return;}
    const n=v.slice(2),o=online.get(n);
    if(o){choosePlayer(o);return;}
    /* offline friends: money & gifts land in their inbox for when they play */
    showDest("⚪ "+n+" — not here right now",[
      {label:"\u{1F4B8} Send money (lands in their inbox)",value:"pay"},
      {label:"\u{1F381} Give a dumpling (waits in their inbox)",value:"gift"},
      {label:"\u{1F494} Remove friend",value:"rm"},
      {label:"↩️ Back",value:"back"}
    ],w=>{
      if(w==="pay")openPay(n);
      else if(w==="gift")openGift(n);
      else if(w==="rm"){FRIENDS.delete(n);saveFriends();requestMap();toast("\u{1F494} "+n+" removed from your friends.");openFriends();}
      else if(w==="back")openFriends();
    });
  });
}
$("bFriends").onclick=openFriends;
/* ---------- gift a dumpling to another player (rides the payments inbox) ---------- */
function openGift(name){
  if(!DUMP.owned.length){toast("\u{1F95F} You have no dumplings to give — buy some at a MEGA MART!");return;}
  const opts=DUMP.owned.slice(0,10).map((d,i)=>({
    label:(d.glitter?"✨ GLITTER ":"")+d.color+" dumpling ($"+dumpValue(d)+")",value:i}));
  opts.push({label:"❌ Cancel",value:"cancel"});
  showDest("\u{1F381} Give a dumpling to "+name,opts,async v=>{
    if(v==="cancel")return;
    const d=DUMP.owned[v];
    if(!d)return;
    const ok=await sendMoney(name,1,{d:d.color+"|"+(d.glitter?"1":"0")},true);
    if(!ok)return;
    if(HOLD.d===d){HOLD.d=null;HOLD.mesh.visible=false;}
    DUMP.owned.splice(v,1);
    renderDump();saveGame();
    toast("\u{1F381} You gave your "+(d.glitter?"GLITTER ":"")+d.color+" dumpling to "+name+"!");
  });
}
/* the \u{1F4B0} Money menu lists online players you can pay */
function renderPayList(){
  const w=$("payList");w.innerHTML="";
  const others=[...MP.others.values()];
  if(!others.length){
    w.innerHTML="<div style='color:var(--dim);font-size:12px'>No other players online right now — they appear here so you can pay them.</div>";
    return;
  }
  others.forEach(o=>{
    const b=document.createElement("button");
    b.className="btn";
    b.style.cssText="width:100%;margin-top:6px;text-align:left";
    b.innerHTML="\u{1F4B8} Pay \u{1F464} "+o.name;
    b.onclick=()=>{$("moneyModal").classList.remove("open");openPay(o.name);};
    w.appendChild(b);
  });
}
let _saveT=0;
function autoSave(dt){_saveT+=dt;if(_saveT>5){_saveT=0;saveGame();if(PROF.dirty)profileSave(true);}}
function saveGame(){
  try{
    localStorage.setItem("vc4save",JSON.stringify({
      money:MONEY.v,rainbow:MONEY.rainbow,
      unopened:DUMP.unopened,owned:DUMP.owned,
      bu:BUTTER.unopened,bo:BUTTER.owned,
      phu:PHONE.unopened,pho:PHONE.owned,
      cu:CONSOLE.unopened,co:CONSOLE.owned,
      tbu:TABLET.unopened,pcu:COMPUTER.unopened,
      craft:CRAFT.designs,
      rooms:RENT.list,
      displays:[...DISPLAYS.entries()],
      mfurn:[...MFURN.entries()].filter(([k])=>RENT.list.some(r2=>r2.id===k)),
      world:{name:WORLD.name,ox:WORLD.ox,oz:WORLD.oz},km:S.km,
      own:[...OWN],paint:PAINT,fuel:FUEL.km,prent:PRENT.on?1:0,hrent:HRENT.on?1:0,
      mcInv:MCINV,mcTools:MCTOOLS,dmg:Math.round(typeof DMG!=="undefined"?DMG.v:0)
    }));
  }catch(e){}
}
function loadGame(){
  try{
    const d=JSON.parse(localStorage.getItem("vc4save")||"null");
    if(!d)return;
    MONEY.v=d.money||0;MONEY.rainbow=!!d.rainbow;
    DUMP.unopened=d.unopened||0;DUMP.owned=Array.isArray(d.owned)?d.owned:[];
    BUTTER.unopened=d.bu||0;BUTTER.owned=Array.isArray(d.bo)?d.bo:[];
    PHONE.unopened=d.phu||0;PHONE.owned=Array.isArray(d.pho)?d.pho:[];
    CONSOLE.unopened=d.cu||0;CONSOLE.owned=Array.isArray(d.co)?d.co:[];
    TABLET.unopened=d.tbu||0;COMPUTER.unopened=d.pcu||0;
    if(Array.isArray(d.craft))CRAFT.designs=d.craft.filter(x=>x&&typeof x.name==="string");
    RENT.list.push(...(Array.isArray(d.rooms)?d.rooms:[]));
    (d.displays||[]).forEach(([k,v])=>DISPLAYS.set(k,v));
    (d.mfurn||[]).forEach(([k,v])=>{if(Array.isArray(v))MFURN.set(k,v);});
    if(d.world&&d.world.name){WORLD.name=d.world.name;WORLD.ox=d.world.ox||0;WORLD.oz=d.world.oz||0;}
    S.km=d.km||0;
    (Array.isArray(d.own)?d.own:[]).forEach(n=>{if(typeof n!=="string")return;n=fixVehName(n);if(!OLD_DEFAULTS.includes(n))OWN.add(n);});
    if(d.paint&&typeof d.paint==="object")for(const k in d.paint)if(typeof d.paint[k]==="number")PAINT[k]=d.paint[k];
    if(typeof d.fuel==="number")FUEL.km=Math.max(0,Math.min(FUEL.cap,d.fuel));
    PRENT.on=d.prent===1;
    HRENT.on=d.hrent===1;
    if(d.mcInv&&typeof d.mcInv==="object")for(const k in MCINV)if(typeof d.mcInv[k]==="number")MCINV[k]=Math.max(0,Math.floor(d.mcInv[k]));
    if(d.mcTools&&typeof d.mcTools==="object")for(const k in MCTOOLS)if(d.mcTools[k])MCTOOLS[k]=1;
    if(typeof d.dmg==="number")window.__dmgLoad=Math.max(0,Math.min(100,d.dmg));   // applied when DMG is created below
  }catch(e){}
}
loadGame();loadWorlds();if(WORLD.name)addWorld(WORLD.name);applyWorldUI();renderWorldList();updateMoneyUI();profileLoad();
addEventListener("beforeunload",saveGame);
/* ---------- stations / stops / calling ---------- */
function nearStationInfo(){
  const rk=railKNear(player.x),sj=Math.round((player.z-STZ)/SCELL);
  let best=null;
  for(let k=rk-1;k<=rk+1;k++)for(let j=sj-1;j<=sj+1;j++){
    const sz=j*SCELL+STZ,cx=railC(k,sz);
    const d=Math.hypot(player.x-(cx+7),player.z-sz);
    if(d<35&&(!best||d<best.d))best={k,j,sz,cx,d};
  }
  return best;
}
function nearBusStop(){
  const lx=Math.round((player.x-30)/120)*120+30,lz=Math.round((player.z-30)/120)*120+30;
  let best=null;
  for(let ax=lx-120;ax<=lx+120;ax+=120)for(let az=lz-120;az<=lz+120;az+=120){
    if((((ax-30)/120)+((az-30)/120))%3!==0)continue;
    const d=Math.hypot(player.x-(ax+11),player.z-(az+11));
    if(d<26&&(!best||d<best.d))best={lx:ax,lz:az,x:ax+11,z:az+11,d};
  }
  return best;
}
function nearTerminal(){
  const as=nearestAirports(player.x,player.z,1);
  const a=as[0];
  return Math.hypot(player.x-a.term.x,player.z-a.term.z)<55?a:null;
}
function tryCall(){
  if(!player.onFoot&&!player.drive)return;
  /* mansion editor open: T closes it */
  if(MEDIT.on){closeMansionEdit();return;}
  /* inside a cave: attack the boss / open the cave menu */
  if(CAVE.in){caveT();return;}
  /* indoor stuff first: reception, beds, chairs */
  if(tryFurniture())return;
  /* cave mouths in the mountains */
  if(S.world==="earth"){
    const cv=nearCaveEntrance();
    if(cv){enterCave(cv);return;}
    /* 🏆 Saturday car meet: vote for the car you're standing next to */
    if(meetActive()&&meetDist()<32&&tryMeetVote())return;
    /* gas stations: fill the tank & the scratch-card kiosk */
    if(nearGasSt()){
      const opts=[];
      if(fuelVehicle()&&FUEL.km<FUEL.cap-1)opts.push({label:"⛽ Fill up the tank",value:"fuel"});
      if(DMG.v>1)opts.push({label:"\u{1F527} Repair the dents ("+Math.round(DMG.v)+"%) — $"+fmtMoney(repairCost()),value:"repair"});
      opts.push({label:"\u{1F3B0} Scratch card — $50 (win up to $5,000!)",value:"card"});
      opts.push({label:"❌ Nothing, thanks",value:"cancel"});
      showDest("⛽ Gas station kiosk",opts,v=>{
        if(v==="fuel")tryRefuel();
        else if(v==="repair"){
          const c=repairCost();
          if(MONEY.v<c){toast("\u{1F4B0} Repairs cost $"+fmtMoney(c)+" — you have $"+fmtMoney(MONEY.v)+"!");return;}
          MONEY.v-=c;DMG.v=0;updateMoneyUI();saveGame();
          toast("\u{1F527}✨ GOOD AS NEW! All dents fixed for $"+fmtMoney(c)+" — full speed unlocked again!");
        }
        else if(v==="card")scratchCard();
      });
      return;
    }
  }
  /* race start flag (works on foot or in your car) */
  if(S.world==="earth"){
    const rf=nearRaceFlag();
    if(rf){
      if(RACE.on){endRace(false);return;}
      if(RACEMP.state==="waiting"){
        toast("\u{1F3C1} The multiplayer race starts in "+Math.max(0,Math.ceil((RACEMP.ts-Date.now())/1000))+"s — stay near the flag!");
        return;
      }
      openRaceMenu(rf);
      return;
    }
  }
  /* the delivery courier at your door: pay & pick up */
  if(player.onFoot&&tryPickupOrder())return;
  /* 🎣 fishing: cast, reel & catch */
  if(castOrReel())return;
  /* 🏗 building plots for sale */
  if(player.onFoot&&S.world==="earth"){
    const pl=nearPlotSign();
    if(pl){openPlotBuy(pl);return;}
  }
  /* shops: walk inside and press T to buy food; buyers: sell dumplings */
  if(player.onFoot&&S.world==="earth"){
    const sh=nearShop();
    if(sh){openShop(sh);return;}
    const by=nearBuyer();
    if(by){openSell();return;}
    const bby=nearButterBuyer();
    if(bby){openSell("butter");return;}
    const pby=nearPhoneBuyer();
    if(pby){openSell("phone");return;}
    const cnb=nearConsoleBuyer();
    if(cnb){openSell("cons");return;}
    const tbb=nearTabletBuyer();
    if(tbb){openSell("tab");return;}
    const pcb=nearComputerBuyer();
    if(pcb){openSell("pc");return;}
    /* CoolBlue: surprise phone boxes! */
    const cb2=nearCoolBlue();
    if(cb2){openCoolBlue();return;}
    /* marketing plots: claim it, edit your stalls, or shop at someone else's */
    const mk=nearMarketPlot();
    if(mk){openMarket(mk);return;}
    /* the dumpling museum */
    if(nearMuseum()){openMuseum();return;}
    /* island fun: the beach shop & the buried-treasure X */
    const bsh=nearIslandThing("shop",5);
    if(bsh){openBeachShop(bsh);return;}
    const dg=nearIslandThing("digX",3.5);
    if(dg){digTreasureX(dg);return;}
    /* the sky restaurant on the peaks */
    if(nearSkyRest()){openSkyRest();return;}
    /* the WATERSLIDE at pool parks */
    const psl=nearPoolSlide();
    if(psl){
      SLIDE.on=true;SLIDE.t=0;SLIDE.pts=psl.slidePts;
      toast("\u{1F6DD} WHEEEEEE!!");
      return;
    }
    /* mine LAVA dumplings from a (calm) volcano crater */
    const vol=nearVolcanoCrater();
    if(vol){
      if(volcErupting()){toast("\u{1F30B}\u{1F4A5} IT'S ERUPTING — RUN FOR YOUR LIFE!");return;}
      const lkey="vc4lava:"+Math.round(vol.x)+","+Math.round(vol.z);
      const ts=parseInt(localStorage.getItem(lkey),10);
      if(!isNaN(ts)&&Date.now()-ts<600000){
        toast("\u{1F30B} The lava needs "+Math.ceil((600000-(Date.now()-ts))/60000)+" more minutes to cool — hang on!");
        return;
      }
      try{localStorage.setItem(lkey,String(Date.now()));}catch(e){}
      DUMP.owned.push({color:"Lava",hex:"#ff4400",glitter:Math.random()<0.1});
      renderDump();saveGame();
      toast("\u{1F30B}\u{1F95F} You scooped a molten LAVA dumpling ($120)! The crater refills in 10 minutes.");
      return;
    }
    /* standing in YOUR mansion: T opens the editor. In someone ELSE's: the visitor menu */
    const mn=nearMansion();
    if(mn&&rentedAt(mn.id)){openMansionEdit(mn);return;}
    if(mn&&mn.owner){openVisitorMenu(mn);return;}
    if(mn){toast("\u{1F3F0} Buy this mansion first — press T at the RECEPTION out front ($"+fmtMoney(MANSION_PRICE)+")!");return;}
    /* pet tricks: press T next to your pet (parrots are always with you) */
    if(PET.type==="parrot"||(PET.type&&PET.mesh&&Math.hypot(player.x-PET.x,player.z-PET.z)<2.8)){openPetMenu();return;}
  }
  /* rocket stations work on BOTH worlds */
  const rp=nearestRocketPad(player.x,player.z);
  if(rp.d<46){
    if(rocket.state==="idle"||rocket.state==="parked"){
      rocket.pad={x:rp.x,z:rp.z};
      rocket.x=rp.x+(Math.random()<0.5?-1:1)*450;
      rocket.z=rp.z+350;
      rocket.y=terrainH(rocket.x,rocket.z)+170;
      rocket.vy=0;rocket.t=0;rocket.g.visible=true;rocket.state="inbound";
      toast("\u{1F680} A rocket is on its way — "+Math.round(Math.hypot(rocket.x-player.x,rocket.z-player.z))+" m away, watch the sky!");
    }else if(rocket.state==="landed")toast("\u{1F680} The rocket is already here — press F to get in!");
    else toast("The rocket is busy right now.");
    return;
  }
  if(S.world==="mc"){
    /* fight first, then mine, then trade, then the backpack */
    const mob=player.onFoot?nearMcMob(3.4):null;
    if(mob){mcAttack(mob);return;}
    const t=nearMcThing();
    if(t){mineMc(t);return;}
    if(Math.hypot(player.x-MCTRADER.x,player.z-MCTRADER.z)<8){openMcSell(1.25);return;}
    openMcSell(1);
    return;
  }
  if(S.world!=="earth"){
    const st2=nearestOf(SPST,13);
    if(st2){openSpaceStation(st2);return;}
    const u=nearUfo();
    if(u){openRobUfo(u);return;}
    toast("Find a rocket station to fly back down!");
    return;
  }
  /* 🎄 the Christmas tree present (December only) */
  if(typeof tryXmasGift==="function"&&tryXmasGift())return;
  /* 🎬 the fun district & 👮🚒 emergency stations */
  {
    const ent=nearestOf(ENT,11);
    if(ent){openEnt(ent);return;}
    const civ=nearestOf(CIVIC,11);
    if(civ){openCivic(civ);return;}
  }
  const st=nearStationInfo();
  if(st){
    let best=null;
    for(const t of trains){
      if(t.state!=="cruise"||t.k!==st.k)continue;
      const gap=st.sz-t.z;
      if(gap>25&&gap<2200&&(!best||gap<best.gap))best={t,gap};
    }
    if(best){best.t.state="arriving";best.t.tgtZ=st.sz;
      toast("\u{1F686} Train is coming — "+Math.round(best.gap)+" m away!");}
    else toast("No train available on this line right now — try again in a moment.");
    return;
  }
  const bs=nearBusStop();
  if(bs){
    let best=null;
    for(const b of buses){
      if(b.state!=="drive")continue;
      const p=busPos(b);
      const d=Math.abs(p.x-bs.x)+Math.abs(p.z-bs.z);
      if(!best||d<best.d)best={b,d};
    }
    if(best){best.b.state="called";best.b.stop=bs;best.b.dest={x:bs.lx,z:bs.lz};
      const bp=busPos(best.b);
      toast("\u{1F68C} Bus is on its way — "+Math.round(Math.hypot(bp.x-bs.x,bp.z-bs.z))+" m away!");}
    else toast("All buses are busy right now.");
    return;
  }
  const ap=nearTerminal();
  if(ap){
    showDest("\u2708\uFE0F Airport terminal",[
      {label:"\u{1F4DE} Call a plane to this airport",value:"call"},
      PRENT.on?{label:"\u{1F6EC} Return the rented plane (stop paying $250/day)",value:"unrent"}
        :{label:"\u{1F6E9} RENT a plane \u2014 $250 per day, FLY IT YOURSELF!",value:"rent"},
      {label:"\u274C Cancel",value:"cancel"}
    ],v=>{
      if(v==="cancel")return;
      if(v==="rent"){
        if(MONEY.v<250){toast("\u{1F4B0} Renting costs $250 (per day) \u2014 you have $"+fmtMoney(MONEY.v)+"!");return;}
        MONEY.v-=250;updateMoneyUI();
        PRENT.on=true;saveGame();
        toast("\u{1F6E9}\u{1F5DD} PLANE RENTED! Board any plane (press F) and choose \u{1F9D1}\u200D\u2708\uFE0F 'I'll fly it MYSELF'. $250 is charged every day.");
        return;
      }
      if(v==="unrent"){
        PRENT.on=false;saveGame();
        toast("\u{1F6EC} Rental returned \u2014 no more daily costs. Thanks for flying!");
        return;
      }
      let best=null;
      for(const p of planes){
        if(p.state!=="flying"&&p.state!=="wander"&&p.state!=="wanderfly")continue;
        const d=Math.hypot(p.x-ap.term.x,p.z-ap.term.z);
        if(!best||d<best.d)best={p,d};
      }
      /* autofly navigates to the approach point first, then lands properly */
      if(best){best.p.state="autofly";best.p.dest=ap;
        toast("\u2708\uFE0F A plane is coming in to land \u2014 "+Math.round(best.d)+" m away!");}
      else toast("No plane is free right now.");
    });
    return;
  }
  /* 🚐 your camper: stop it (or walk up to it) and press T — it's your home! */
  if(myVehicle&&myVehicle.camper&&Math.abs(myVehicle.speed||0)<1.5&&Math.hypot(player.x-myVehicle.x,player.z-myVehicle.z)<8){
    openCamper();return;
  }
  toast("Go to a train station, bus stop or airport terminal to call a ride.");
}
