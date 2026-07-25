/* Car City Game — game-audio.js (part 4/16, split from the old game.js).
   Plain JS, ONE shared global scope across all scripts — the load order in index.html MUST stay: core, world, vehicles, then game-* parts in numbered order. */
/* ================= 📻 CITY NEWS RADIO: a live AI DJ voice =================
   Reads real things happening in YOUR game: accidents, fires, weather,
   the leaderboard and breaking news — via the browser's built-in voice. */
function cleanTTS(t){return String(t).replace(/[^\x20-\x7E]/g," ").replace(/\s+/g," ").trim();}
function djSay(txt){
  if(!("speechSynthesis" in window))return;
  try{
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(txt);
    u.rate=1.05;u.pitch=1.12;u.volume=0.95;u.lang="en-US";
    speechSynthesis.speak(u);
  }catch(e){}
}
const DJ_NAMES=["DJ Nova","DJ Turbo","MC Dumpling"];
function djReport(){
  const bits=[];
  /* live traffic: real events happening right now */
  const evs=EVENTS.list.filter(e=>["accident","fire","construction","festival","meteor","rescue"].includes(e.type));
  if(evs.length){
    const e=evs[Math.floor(Math.random()*evs.length)];
    const at="near "+Math.round(e.x)+", "+Math.round(e.z);
    if(e.type==="accident")bits.push("Traffic alert! A crash "+at+". Police and ambulance are on the scene — slow down out there!");
    else if(e.type==="fire")bits.push("A house is on FIRE "+at+"! The fire truck is racing over — give it space!");
    else if(e.type==="construction")bits.push("Road works "+at+" — expect delays and drive slowly past the cones.");
    else if(e.type==="festival")bits.push("Party time! A festival is happening "+at+" — free 50 dollars for every visitor!");
    else if(e.type==="meteor")bits.push("Look at the sky! A METEOR SHOWER is coming down "+at+" — the glowing space rocks are worth big money!");
    else if(e.type==="rescue")bits.push("Emergency! Someone is stranded "+at+" and needs a hero with a car. Reward for the rescue!");
  }
  /* weather */
  if(WEATHER.state==="rain")bits.push("Weather update: it's raining — the roads are slippery, take those corners easy.");
  else if(WEATHER.state==="snow")bits.push("Weather update: SNOW on the roads! Grip is way down — drive like a pro.");
  else if(WEATHER.state==="fog")bits.push("Weather update: thick fog out there. Lights on and eyes open!");
  /* the leaderboard champion */
  if(BOARD.top&&Math.random()<0.4)bits.push("This week's tournament leader is "+cleanTTS(BOARD.top)+" — can anybody catch them?");
  /* fallback + latest news */
  const n=NEWS[NEWS.length-1];
  if(!bits.length&&n)bits.push(cleanTTS(n.t));
  if(!bits.length)bits.push("All quiet in Car City right now... perfect weather for a cruise. Stay tuned!");
  const dj=DJ_NAMES[Math.floor(Math.random()*DJ_NAMES.length)];
  djSay("You're on City News Radio with "+dj+". "+bits[Math.floor(Math.random()*bits.length)]);
}
setInterval(()=>{
  try{if(S.mode==="game"&&SND.music&&radioStation().dj&&!speechSynthesis.speaking)djReport();}catch(e){}
},22000);
/* ================= 🚗 THE CAR SCREEN =================
   In your car the round mini map becomes ONE wide rounded screen:
   the map on the left, the song list on the right — tap a song to play it. */
const CAR_TRACKS=[
  {name:"\u{1F5DE} CITY NEWS RADIO — live AI DJ",dj:true},
  {name:"\u{1F3B5} Dai Dai — Shakira & Burna Boy",src:"Music/radio/Shakira & Burna Boy - Dai Dai (Lyrics) World Cup Song 2026.mp3"},
  {name:"\u{1F3B5} Beat It — Michael Jackson",src:"Music/radio/Beat It - Michael Jackson (Lyrics).mp3"},
  {name:"\u{1F3B5} Billie Jean — Michael Jackson",src:"Music/radio/Billie Jean - Michael Jackson (Lyrics).mp3"},
  {name:"\u{1F3B5} Smooth Criminal — Michael Jackson",src:"Music/radio/Michael Jackson - Smooth Criminal [Lyrics].mp3"},
  {name:"\u{1F3B5} World Cup (Champions) — IShowSpeed",src:"Music/radio/IShowSpeed - World Cup (Champions) (Lyrics).mp3"},
  {name:"\u{1F3B5} Gut Genug — KitschKrieg & Shirin David",src:"Music/radio/KITSCHKRIEG feat. BLUMENGARTEN & SHIRIN DAVID - Gut Genug (Lyrics).mp3"},
  {name:"\u{1F3B5} Indian meme song",src:"Music/radio/Indian meme song (Original).mp3"},
  {name:"\u{1F3B5} Subway Surfers (Bass Boosted)",src:"Music/radio/Subway Surfers Bass Boosted.mp3"},
  {name:"\u{1F30A} Orbit — chill",src:"Music/orbit-d0d-main-version-29627-02-39.mp3"},
  {name:"\u{1F327} Rainy Window — chill",src:"Music/rainy-window-avbe-main-version-18796-01-21.mp3"},
  {name:"\u{1F32B} Soft Mist — chill",src:"Music/soft-mist-movement-tranquilium-main-version-25768-04-42.mp3"},
  {name:"\u{1F4F4} Radio OFF",off:true}
];
let TUNES_SEL=-1;
function musicOnUI(){
  if(!SND.music){
    SND.music=true;
    $("musTgl").classList.add("on");
    $("musTgl").innerHTML="\u{1F3B5} Music ON";
  }
}
function renderCarTunes(){
  const w=$("carTunes");
  w.innerHTML="<div class='tuneHead'>\u{1F4FB} CAR RADIO</div>";
  /* your OWN station shows first — so you can SEE that you're on air */
  if(MYRADIO.on){
    const b=document.createElement("button");
    b.className="tune on";
    b.textContent="\u{1F534} "+MYRADIO.name+" — YOU are ON AIR!";
    b.onclick=()=>toast("\u{1F534} That's YOUR station — everyone else can tune in. Talk away!");
    w.appendChild(b);
  }
  /* 🔴 live player radios on top — like "Notch's radio" */
  for(const[k,r]of LIVERADIOS){
    if(Date.now()-r.ts>120000){LIVERADIOS.delete(k);continue;}
    if(payKey(r.owner||"")===payKey(mpName()))continue;   // your own station is drawn above
    const b=document.createElement("button");
    b.className="tune"+(LISTEN.key===k?" on":"");
    b.textContent="\u{1F534} "+r.name+" — LIVE";
    b.onclick=()=>tuneLiveRadio(k);
    w.appendChild(b);
  }
  CAR_TRACKS.forEach((t,i)=>{
    const b=document.createElement("button");
    b.className="tune"+(i===TUNES_SEL&&!LISTEN.key?" on":"");
    b.textContent=t.name;
    b.onclick=()=>{
      TUNES_SEL=i;LISTEN.key=null;
      if(t.off){setStation(0);toast("\u{1F4F4} Radio off.");}
      else if(t.dj){
        musicOnUI();ensureAudio();
        setStation(RADIO_STATIONS.findIndex(s=>s.dj));
        djSay("You are listening to City News Radio — live traffic, live news, live everything! Stay tuned.");
        toast("\u{1F5DE} CITY NEWS RADIO — the DJ is live!");
      }else{
        musicOnUI();ensureAudio();
        playTrackFile(t.src);
        toast("\u{1F3B6} Now playing: "+t.name.replace(/^\S+\s/,""));
      }
      renderCarTunes();
    };
    w.appendChild(b);
  });
}
/* the mini map morphs into the car screen whenever you sit in YOUR vehicle */
let _carScreenOn=false,_tunesT=0;
setInterval(()=>{
  const inCar=S.mode==="game"&&!!myVehicle&&player.drive===myVehicle;
  if(inCar!==_carScreenOn){
    _carScreenOn=inCar;
    $("miniWrap").classList.toggle("car",inCar);
    if(inCar){renderCarTunes();_tunesT=Date.now();}
  }else if(inCar&&(LIVERADIOS.size||MYRADIO.on)&&Date.now()-_tunesT>5000){
    /* live stations come & go — keep the list fresh */
    renderCarTunes();_tunesT=Date.now();
  }
},350);
/* ================= 🎤 THE MICROPHONE: one shared speech listener ================= */
/* tiny version badge — always shows the REAL game version (from core.js) */
const verBadge=document.createElement("div");
verBadge.style.cssText="position:fixed;right:6px;bottom:4px;z-index:60;font:600 10px 'Segoe UI',sans-serif;color:#7d8aa5;opacity:.6;pointer-events:none";
verBadge.textContent="v"+GAME_V;
document.body.appendChild(verBadge);
/* live caption bar: shows EVERYTHING the mic hears, while it hears it */
const micCap=document.createElement("div");
micCap.style.cssText="position:fixed;left:50%;bottom:96px;transform:translateX(-50%);background:rgba(13,17,26,.9);color:#3fd0ff;font:600 15px 'Segoe UI',sans-serif;padding:7px 14px;border-radius:12px;z-index:99;display:none;max-width:80vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none";
document.body.appendChild(micCap);
let micCapT=0;
function micCaption(t){
  micCap.textContent="\u{1F3A4} "+t;
  micCap.style.display="block";
  clearTimeout(micCapT);
  micCapT=setTimeout(()=>{micCap.style.display="none";},3500);
}
const MIC={rec:null,mode:null};
function micSupported(){return !!(window.SpeechRecognition||window.webkitSpeechRecognition);}
function micStop(){
  const r=MIC.rec;
  MIC.rec=null;MIC.mode=null;
  if(r){try{r.onend=null;r.stop();}catch(e){}}
  micUI();
}
function micStart(mode,onResult){
  if(!micSupported()){toast("\u{1F3A4} This browser has no speech support — use Chrome (or Edge)!");return false;}
  micStop();
  const R=window.SpeechRecognition||window.webkitSpeechRecognition;
  const rec=new R();
  /* the assistant listens for ENGLISH commands; your radio speaks YOUR language */
  rec.lang=mode==="assistant"?"en-US":(navigator.language||"en-US");
  rec.continuous=true;rec.interimResults=true;
  rec.onresult=e=>{
    for(let i=e.resultIndex;i<e.results.length;i++){
      const txt=e.results[i][0].transcript.trim();
      if(txt)micCaption(txt);            // LIVE captions — you see what it hears
      if(e.results[i].isFinal)onResult(txt);
    }
  };
  rec.onstart=()=>micCaption(mode==="assistant"?'Listening... say "HEY GOOGLE"!':"ON AIR — everything you say goes out live!");
  rec.onerror=e=>{
    if(e.error==="not-allowed"||e.error==="service-not-allowed"){
      toast("\u{1F3A4}\u{1F6AB} Microphone BLOCKED — click the \u{1F512} next to the address bar, allow the Microphone, then try again!");
      if(MYRADIO.on)stopMyRadio();else micStop();
    }else if(e.error==="audio-capture"){
      toast("\u{1F3A4}\u{274C} No microphone found — plug one in (or check Windows sound settings)!");
      if(MYRADIO.on)stopMyRadio();else micStop();
    }else if(e.error==="network"){
      toast("\u{1F3A4}\u{26A0} The speech service can't be reached — speech only works in Chrome/Edge with internet.");
    }else if(e.error!=="no-speech"&&e.error!=="aborted"){
      /* anything unexpected: SHOW it instead of failing silently */
      toast("\u{1F3A4}\u{26A0} Microphone problem: \""+e.error+"\"");
    }
    /* "no-speech" and "aborted" are normal — the mic just restarts */
  };
  rec.onend=()=>{if(MIC.rec===rec){try{rec.start();}catch(e){}}};   // keep listening
  try{rec.start();}catch(e){toast("\u{1F3A4} Couldn't start the microphone!");return false;}
  MIC.rec=rec;MIC.mode=mode;
  micUI();
  return true;
}
function micUI(){
  $("bGoogle").classList.toggle("on",MIC.mode==="assistant");
  $("bGoogle").innerHTML=MIC.mode==="assistant"?"\u{1F3A4} Google AI \u{1F534}":"\u{1F3A4} Google AI";
  $("bMyRadio").classList.toggle("on",MIC.mode==="radio");
  $("bMyRadio").innerHTML=MIC.mode==="radio"?"\u{1F534} Stop Radio":"\u{1F4FB} Create Radio";
}
/* ================= 🎤 GOOGLE AI: say "Hey Google, ..." ================= */
const GA={awake:0};
function gSay(txt){
  if(!("speechSynthesis" in window))return;
  try{
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(txt);
    u.rate=1.05;u.pitch=1.0;u.volume=1;u.lang="en-US";
    speechSynthesis.speak(u);
  }catch(e){}
}
/* where can the assistant take you? every big place in the game */
function resolveDest(s){
  s=" "+s.toLowerCase().replace(/[^a-z0-9 ,.-]/g,"").trim()+" ";
  const c=s.match(/(-?\d+)[,\s]+(-?\d+)/);
  if(c)return{x:parseFloat(c[1]),z:parseFloat(c[2]),say:"coordinates "+c[1]+", "+c[2]};
  const un=b=>b?{x:b.sp.x,z:b.sp.z}:null;
  const T=[
    [["airport","airfield","plane"],()=>{const a=nearestAirports(player.x,player.z,1)[0];return{x:a.term.x,z:a.term.z};},"the nearest airport"],
    [["gas station","gas","fuel"],()=>un(nearestSpot(gasSpot,GSP,286,150,5)),"the nearest gas station"],
    [["mcdrive","mcdonald","burger"],()=>un(nearestSpot(mcdSpot,MCSP,46,90,6)),"the nearest McDrive"],
    [["mega mart","megamart","market","shop","store"],()=>un(nearestSpot(hugeShopSpot,HSP,750,390,3)),"the nearest MEGA MART"],
    [["mansion"],()=>un(nearestSpot(mansionSpot,MSP,1230,870,3)),"the nearest mega mansion"],
    [["beach","boat","sea"],()=>un(nearestSpot(boatSpot,BOATSP,320,120,8)),"the beach"],
    [["cinema","movie"],()=>un(nearestSpot((i,j)=>{const p=entPos(i,j);return{x:p.x-24,z:p.z};},ENSP,2000,4200,3)),"the nearest cinema"],
    [["arcade"],()=>un(nearestSpot(entPos,ENSP,2000,4200,3)),"the nearest arcade"],
    [["casino"],()=>un(nearestSpot((i,j)=>{const p=entPos(i,j);return{x:p.x+24,z:p.z};},ENSP,2000,4200,3)),"the nearest casino"],
    [["race track","racetrack","speedway"],()=>{const b=nearestSpot(raceTrackPos,RTSP,4800,3400,2);return b?{x:b.sp.x+38,z:b.sp.z+6}:null;},"the nearest race track"],
    [["police"],()=>{const b=nearestSpot(civicPos,CVSP2,3700,1300,3);return b?{x:b.sp.x-14,z:b.sp.z}:null;},"the nearest police station"],
    [["fire station","fire"],()=>{const b=nearestSpot(civicPos,CVSP2,3700,1300,3);return b?{x:b.sp.x+14,z:b.sp.z}:null;},"the nearest fire station"],
    [["off-road","offroad","off road","dirt"],()=>un(nearestSpot(offroadPos,ORSP,900,2600,3)),"the off-road park"],
    [["industrial","factory"],()=>un(nearestSpot(induPos,INSP,5200,700,2)),"the industrial zone"],
    [["portal","time"],()=>un(nearestSpot(portalPos,TPSP,30,2430,2)),"the time portal"],
    [["cave"],()=>un(nearestSpot(caveSpot,CVSP,740,380,5)),"the nearest cave"],
    [["rocket","space"],()=>nearestRocketPad(player.x,player.z),"the nearest rocket station"],
    [["stunt"],()=>un(nearestSpot(stuntPos,3600,1800,600,2)),"the stunt park"],
    [["museum"],()=>un(nearestSpot(museumSpot,DMUS,520,260,6)),"the dumpling museum"],
    [["pool","swimming"],()=>un(nearestSpot(poolSpot,PPSP,1710,430,3)),"the pool park"],
    [["volcano"],()=>un(nearestSpot(volcanoSpot,VOLC,4200,7800,3)),"the volcano island"],
    [["train station","station"],()=>{const st=nearStationInfo();return st?{x:st.cx+7,z:st.sz}:{x:railC(0,50)+7,z:50};},"the train station"],
    [["spawn","home"],()=>({x:WORLD.ox+6,z:WORLD.oz+6}),"spawn"]
  ];
  for(const[keys,fn,say]of T){
    if(keys.some(k=>s.includes(k))){
      let p=null;try{p=fn();}catch(e){}
      if(p)return{x:p.x,z:p.z,say};
      return null;
    }
  }
  return null;
}
function playByName(q){
  q=q.toLowerCase().replace(/\bthe\b/g,"").trim();
  /* live player radios first ("play notch's radio") */
  for(const[k,r]of LIVERADIOS){
    if(r.name.toLowerCase().includes(q.replace(/ radio$/,""))||q.includes(r.name.toLowerCase())){
      tuneLiveRadio(k);gSay("Tuned to "+r.name+".");return;
    }
  }
  const t=CAR_TRACKS.find(t=>!t.off&&t.name.toLowerCase().replace(/[^a-z0-9 ]/g,"").includes(q.replace(/[^a-z0-9 ]/g,"")));
  if(!t){gSay("Sorry, that is not possible.");return;}
  TUNES_SEL=CAR_TRACKS.indexOf(t);LISTEN.key=null;
  if(t.dj){
    musicOnUI();ensureAudio();
    setStation(RADIO_STATIONS.findIndex(s=>s.dj));
    gSay("Playing City News Radio.");
    setTimeout(djReport,2500);
  }else{
    musicOnUI();ensureAudio();
    playTrackFile(t.src);
    gSay("Playing "+t.name.replace(/^\S+\s/,"").split("—")[0]+".");
  }
  if(_carScreenOn)renderCarTunes();
}
function gaCommand(cmd){
  let m=cmd.match(/^(?:please )?(?:navigate|route|drive|go|bring me|take me) (?:me )?to (.+)$/);
  if(m){
    const d=resolveDest(m[1]);
    if(d){setRoute(d.x,d.z);gSay("Navigating to "+d.say+".");toast("\u{1F9ED} Google: navigating to "+d.say+"!");}
    else gSay("Sorry, that is not possible.");
    return;
  }
  m=cmd.match(/^teleport (?:me )?to (.+)$/);
  if(m){
    const d=resolveDest(m[1]);
    if(d){teleportTo(d.x,d.z);gSay("Teleported to "+d.say+".");toast("✨ Google: teleported to "+d.say+"!");}
    else gSay("Sorry, that is not possible.");
    return;
  }
  m=cmd.match(/^play (.+)$/);
  if(m){playByName(m[1]);return;}
  if(/^(stop|radio off|stop (the )?(music|radio|song))/.test(cmd)){
    setStation(0);LISTEN.key=null;
    if(_carScreenOn)renderCarTunes();
    gSay("Radio off.");
    return;
  }
  gSay("Sorry, that is not possible.");
}
function gaHear(raw){
  const t=raw.toLowerCase();
  /* forgiving wake word: any "google"-ish sound counts ("hey google",
     "he google", "a googol", ... — accents & mishearings welcome!) */
  const woke=/goo?gle|googol|googly|koogle|cugle/.test(t);
  let cmd=woke?t.replace(/.*?(goo?gle|googol|googly|koogle|cugle)[,!.?]?\s*/,"").trim():t.trim();
  if(!woke&&performance.now()>GA.awake){
    /* the mic DID hear you — show it, so it never feels broken */
    if(performance.now()-(GA.hintAt||0)>4000){
      GA.hintAt=performance.now();
      toast("\u{1F3A4} I heard: \""+raw.slice(0,60)+"\" — start with \"HEY GOOGLE\"!");
    }
    return;
  }
  if(!cmd||cmd.length<3){
    GA.awake=performance.now()+9000;
    gSay("Yes?");
    toast("\u{1F3A4} Google: \"Yes?\" — say: NAVIGATE TO ..., TELEPORT TO ..., or PLAY <song>");
    return;
  }
  GA.awake=0;
  toast("\u{1F3A4} You said: \""+cmd+"\"");
  gaCommand(cmd);
}
$("bGoogle").onclick=()=>{
  if(MIC.mode==="assistant"){micStop();toast("\u{1F3A4} Google AI is OFF.");return;}
  if(micStart("assistant",gaHear))
    toast("\u{1F3A4} Google AI is LISTENING! Say: \"Hey Google\" ... then \"navigate to the nearest airport\", \"teleport to 1200, 300\" or \"play Billie Jean\"!");
};
/* ================= 🔴 CREATE RADIO: your own live voice station =================
   Your speech is turned into text, broadcast over the shared chat channel
   (auto-deletes after 5 min), and read aloud on every listener's car radio. */
const MYRADIO={on:false,name:"",key:""};
const LIVERADIOS=new Map();   // key -> {name, owner, ts}
const LISTEN={key:null};
function radioPacket(text){
  try{
    const p=firebase.database().ref("chat").push({
      n:mpName(),
      m:("\u{1F4FB}|"+MYRADIO.key+"|"+MYRADIO.name+"|"+(text||"~")).slice(0,200),
      t:Date.now()
    });
    /* if the database says NO, show it — never fail silently */
    if(p&&p.catch)p.catch(e=>toast("\u{1F534}\u{26A0} Radio couldn't broadcast: "+(e&&e.message||e)));
  }catch(e){toast("\u{1F534}\u{26A0} Radio couldn't broadcast: "+(e&&e.message||e));}
}
function stopMyRadio(){
  MYRADIO.on=false;
  micStop();
  toast("\u{1F4FB} Your radio is off the air. Thanks for the show!");
}
$("bMyRadio").onclick=()=>{
  if(MYRADIO.on||MIC.mode==="radio"){stopMyRadio();return;}
  if(S.mode!=="game"){toast("Start driving first!");return;}
  if(!mpInit()){toast("\u{1F534} Your radio needs the online database.");return;}
  const nm=cleanServerName(prompt("\u{1F4FB} Name your radio station!",mpName()+"'s radio")||"").slice(0,18);
  if(!nm)return;
  MYRADIO.name=nm;MYRADIO.key=payKey(mpName());
  if(!micStart("radio",txt=>{
    if(!txt||!MYRADIO.on)return;
    radioPacket(txt);
    /* live feedback so you SEE that your voice went out */
    toast("\u{1F534}\u{1F4E1} ON AIR: \""+txt.slice(0,90)+"\"");
  }))return;
  MYRADIO.on=true;
  micUI();
  chatStart();
  radioPacket("");
  pushNews("\u{1F4FB}\u{1F534} \""+nm+"\" is ON AIR — tune in on your car radio!");
  toast("\u{1F534} ON AIR! Everything you SAY goes out live on \""+nm+"\" — press the button again to stop.");
};
/* stay discoverable while on air */
setInterval(()=>{if(MYRADIO.on)radioPacket("");},45000);
function handleRadioPacket(d){
  const parts=(d.m||"").split("|");
  if(parts.length<4)return;
  const rkey=parts[1],rname=parts[2],text=parts.slice(3).join("|");
  if(!rkey||!rname)return;
  if((Date.now()-(d.t||0))>120000)return;
  /* a brand-new station? tell this player about it (news is local, so
     the announcement has to happen HERE, on the listener's side) */
  const isNew=!LIVERADIOS.has(rkey);
  const mine=payKey(d.n||"")===payKey(mpName());
  LIVERADIOS.set(rkey,{name:rname,owner:d.n||"",ts:Date.now()});
  if(isNew&&!mine&&S.mode==="game"){
    toast("\u{1F4FB}\u{1F534} \""+rname+"\" by "+(d.n||"a player")+" is ON AIR — hop in your car and tap it in the song list!");
    NEWS.push({t:"\u{1F4FB}\u{1F534} \""+rname+"\" by "+(d.n||"a player")+" is ON AIR — tune in on your car radio!",ts:Date.now()});
    if(NEWS.length>12)NEWS.shift();
  }
  /* tuned in? the radio voice reads it out (never your own echo) */
  /* the live voice only plays while you're actually sitting in your car */
  if(LISTEN.key===rkey&&text&&text!=="~"&&!mine&&SND.music&&S.mode==="game"&&_carScreenOn){
    try{
      const u=new SpeechSynthesisUtterance(text);
      u.rate=1.02;u.pitch=1.0;u.volume=1;
      u.lang=navigator.language||"en-US";   // read it out in YOUR language's voice
      speechSynthesis.speak(u);
    }catch(e){}
  }
  if(_carScreenOn)renderCarTunes();
}
function tuneLiveRadio(k){
  const r=LIVERADIOS.get(k);
  if(!r)return;
  LISTEN.key=k;TUNES_SEL=-1;
  setStation(0);           // pause the music — the live voice takes over
  musicOnUI();
  chatStart();
  toast("\u{1F534}\u{1F4FB} Tuned in to \""+r.name+"\" by "+r.owner+" — you'll hear everything they say!");
  if(_carScreenOn)renderCarTunes();
}
/* ================= ⛪ THE CHURCH ORGAN: real Bach from the Midi/ folder =================
   Every game SUNDAY the organ plays, all game day long. The music position
   follows the shared game clock, so players near the church hear the SAME spot. */
function parseMidi(buf){
  const d=new DataView(buf);let p=0;
  const u8=()=>d.getUint8(p++);
  const u16=()=>{const v=d.getUint16(p);p+=2;return v;};
  const u32=()=>{const v=d.getUint32(p);p+=4;return v;};
  const tag=()=>String.fromCharCode(u8(),u8(),u8(),u8());
  if(tag()!=="MThd")return null;
  const hl=u32();u16();const ntr=u16(),div=u16();p+=hl-6;
  if(div&0x8000)return null;   // SMPTE timing — not used by these files
  const tempos=[],raw=[];
  for(let t=0;t<ntr;t++){
    if(tag()!=="MTrk")return null;
    const len=u32(),end=p+len;let tick=0,run=0;
    while(p<end){
      let dt=0,b;do{b=u8();dt=(dt<<7)|(b&127);}while(b&128);
      tick+=dt;
      let st=d.getUint8(p);
      if(st&128){p++;run=st;}else st=run;
      if(st===0xff){
        const ty=u8();let ln=0;do{b=u8();ln=(ln<<7)|(b&127);}while(b&128);
        if(ty===0x51&&ln>=3)tempos.push({tick,us:(d.getUint8(p)<<16)|(d.getUint8(p+1)<<8)|d.getUint8(p+2)});
        p+=ln;
      }else if(st===0xf0||st===0xf7){
        let ln=0;do{b=u8();ln=(ln<<7)|(b&127);}while(b&128);p+=ln;
      }else{
        const hi=st&0xf0;
        if(hi===0xc0||hi===0xd0)u8();
        else{
          const a=u8(),v=u8();
          if(hi===0x90)raw.push({tick,n:a,v});
          else if(hi===0x80)raw.push({tick,n:a,v:0});
        }
      }
    }
    p=end;
  }
  tempos.sort((a,b)=>a.tick-b.tick);
  raw.sort((a,b)=>a.tick-b.tick||b.v-a.v);
  const t2s=tk=>{
    let sec=0,lt=0,us=500000;
    for(let i=0;i<tempos.length&&tempos[i].tick<=tk;i++){sec+=(tempos[i].tick-lt)*us/1e6/div;lt=tempos[i].tick;us=tempos[i].us;}
    return sec+(tk-lt)*us/1e6/div;
  };
  const notes=[],onMap={};
  for(const e of raw){
    if(e.v>0)(onMap[e.n]=onMap[e.n]||[]).push(e);
    else{
      const st=(onMap[e.n]||[]).shift();
      if(st){const t0=t2s(st.tick),t1=t2s(e.tick);if(t1>t0)notes.push({t:t0,d:t1-t0,n:e.n,v:st.v});}
    }
  }
  notes.sort((a,b)=>a.t-b.t);
  let dur=0;for(const n of notes)dur=Math.max(dur,n.t+n.d);
  return notes.length?{notes,dur:dur+2}:null;
}
const ORGAN={files:["Prelude1","Fugue1","Prelude2","Fugue2","Prelude3","Fugue3"],
  pieces:null,loading:false,total:0,gain:null,on:false,anchorC:0,anchorP:0,schedTo:0};
function organLoad(){
  if(ORGAN.loading)return;
  ORGAN.loading=true;
  Promise.all(ORGAN.files.map(f=>fetch("Midi/"+f+".mid").then(r=>r.arrayBuffer()).then(parseMidi).catch(()=>null)))
    .then(ps=>{
      ORGAN.pieces=ps.filter(Boolean);
      ORGAN.total=ORGAN.pieces.reduce((s,q)=>s+q.dur+4,0);
      if(!ORGAN.pieces.length){ORGAN.pieces=null;ORGAN.loading=false;}   // retry later
    }).catch(()=>{ORGAN.loading=false;});
}
/* one organ note: layered sine partials = churchy pipe sound */
function organNote(when,dur,midi,vel){
  const now=audioCtx.currentTime;
  if(when<now-0.05)return;
  when=Math.max(when,now+0.01);
  const f=440*Math.pow(2,(midi-69)/12);
  const g=audioCtx.createGain();
  const amp=0.035+vel/127*0.045;
  const relStart=when+Math.max(0.07,dur-0.02);
  g.gain.setValueAtTime(0,when);
  g.gain.linearRampToValueAtTime(amp,when+0.05);
  g.gain.setValueAtTime(amp,relStart);
  g.gain.linearRampToValueAtTime(0,relStart+0.14);
  g.connect(ORGAN.gain);
  [[1,1],[2,0.45],[3,0.22],[4,0.1]].forEach(([m,a])=>{
    if(f*m>5500)return;
    const o=audioCtx.createOscillator();
    o.type="sine";o.frequency.value=f*m;
    const og=audioCtx.createGain();og.gain.value=a;
    o.connect(og);og.connect(g);
    o.start(when);o.stop(relStart+0.16);
  });
}
function organSchedule(from,to,base){
  let off=0;
  for(const q of ORGAN.pieces){
    if(to>off&&from<off+q.dur)
      for(const n of q.notes)
        if(n.t>=from-off&&n.t<to-off)organNote(base+off+n.t,Math.min(n.d,8),n.n,n.v);
    off+=q.dur+4;
  }
  if(to>ORGAN.total&&from<=ORGAN.total)organSchedule(0,to-ORGAN.total,base+ORGAN.total);
}
function organTick(){
  const d=Math.hypot(player.x-CHURCH.x,player.z-CHURCH.z);
  const sunday=weekday()==="Sunday";
  /* SUNDAY: the organ fills the whole square, all game day.
     Other days: the organist practices — you hear it when you step INSIDE. */
  const want=S.mode==="game"&&S.world==="earth"&&SND.sound&&(sunday?d<180:d<11);
  if(!want){
    if(ORGAN.on){ORGAN.on=false;if(ORGAN.gain)ORGAN.gain.gain.setTargetAtTime(0,audioCtx?audioCtx.currentTime:0,0.15);}
    return;
  }
  if(!ORGAN.pieces){organLoad();return;}
  ensureAudio();
  if(!audioCtx)return;
  try{if(audioCtx.state==="suspended")audioCtx.resume();}catch(e){}
  if(!ORGAN.gain){ORGAN.gain=audioCtx.createGain();ORGAN.gain.gain.value=0;ORGAN.gain.connect(audioCtx.destination);}
  ORGAN.gain.gain.setTargetAtTime(sunday?Math.max(0,1-d/180)*0.6:0.32,audioCtx.currentTime,0.25);
  if(sunday&&ORGAN.toastDay!==CLOCK.day&&d<130){
    ORGAN.toastDay=CLOCK.day;
    toast("⛪\u{1F3B6} It's SUNDAY — the church organ plays all day long!");
  }
  /* a different piece opens the service each week; position follows the game clock */
  const week=Math.floor((CLOCK.day-1)/7)%ORGAN.pieces.length;
  let base=0;for(let i=0;i<week;i++)base+=ORGAN.pieces[i].dur+4;
  const pos=(base+CLOCK.min/5)%ORGAN.total;   // 1 real second per playlist second
  const now=audioCtx.currentTime;
  const playPos=ORGAN.anchorP+(now-ORGAN.anchorC);
  if(!ORGAN.on||Math.abs(playPos-pos)>1.5){   // (re)start or resync after a time jump
    ORGAN.on=true;ORGAN.anchorC=now;ORGAN.anchorP=pos;ORGAN.schedTo=pos;
  }
  const cur=ORGAN.anchorP+(now-ORGAN.anchorC);
  const horizon=cur+1.6;
  if(ORGAN.schedTo<horizon){
    organSchedule(ORGAN.schedTo,horizon,now-cur);
    ORGAN.schedTo=horizon;
  }
}
/* ================= 🏆 SATURDAY CAR MEET at the church square =================
   Every game Saturday: park your coolest car on the pad, walk to a friend's
   car and press T to vote 🔥. When Saturday ends the winner gets $500 and a
   golden crown above their car all Sunday. Votes ride the chat channel. */
const MEET={votes:new Map(),voters:new Set(),voteDay:0,lastDay:0,announcedDay:0,
  glowDay:parseInt(localStorage.getItem("vc4meetglow")||"0",10)||0,glowSpr:null};
function meetActive(){return weekday()==="Saturday"&&S.world==="earth"&&S.mode==="game";}
function meetDist(){return Math.hypot(player.x-CHURCH.meetX,player.z-CHURCH.meetZ);}
function tryMeetVote(){
  if(MEET.voteDay===CLOCK.day){toast("\u{1F5F3} You already voted today — one vote per Saturday!");return true;}
  let best=null;
  for(const o of MP.others.values()){
    if(o.kind==="foot"||o.kind==="seat")continue;
    if(Math.hypot(o.x-CHURCH.meetX,o.z-CHURCH.meetZ)>30)continue;   // car must be AT the meet
    const dd=Math.hypot(o.x-player.x,o.z-player.z);
    if(dd<8&&(!best||dd<best.dd))best={o,dd};
  }
  if(!best)return false;
  MEET.voteDay=CLOCK.day;
  chatStart();
  try{
    const pr=firebase.database().ref("chat").push({n:mpName(),m:"\u{1F3C6}|"+best.o.name,t:Date.now()});
    if(pr&&pr.catch)pr.catch(()=>{});
  }catch(e){}
  toast("\u{1F525} You voted for "+best.o.name+"'s car! The winner is crowned when Saturday ends.");
  return true;
}
function handleMeetVote(d){
  const target=(d.m||"").split("|")[1];
  if(!target||weekday()!=="Saturday")return;
  if(payKey(d.n||"")===payKey(target))return;   // no voting for yourself
  if(MEET.voters.has(payKey(d.n||"")))return;   // one vote per player
  MEET.voters.add(payKey(d.n||""));
  MEET.votes.set(target,(MEET.votes.get(target)||0)+1);
  if(payKey(target)===payKey(mpName())&&S.mode==="game")
    toast("\u{1F525}\u{1F3C6} "+d.n+" voted for YOUR car! ("+MEET.votes.get(target)+" vote"+(MEET.votes.get(target)>1?"s":"")+")");
}
function meetTick(){
  /* the day flipped? crown yesterday's winner */
  if(MEET.lastDay&&CLOCK.day!==MEET.lastDay){
    const wasSat=(((MEET.lastDay-1)%7)+7)%7===5;
    if(wasSat&&MEET.votes.size){
      let win=null;
      for(const[n,v]of MEET.votes)if(!win||v>win.v)win={n,v};
      pushNews("\u{1F3C6} "+win.n+" WON the Saturday Car Meet with "+win.v+" vote"+(win.v>1?"s":"")+"!");
      if(payKey(win.n)===payKey(mpName())){
        addMoney(500);
        MEET.glowDay=CLOCK.day;
        try{localStorage.setItem("vc4meetglow",""+CLOCK.day);}catch(e){}
        toast("\u{1F3C6}\u{1F451} YOUR car won the SATURDAY CAR MEET — $500 and a golden crown all Sunday!");
        saveGame();
      }
    }
    MEET.votes.clear();MEET.voters.clear();
  }
  MEET.lastDay=CLOCK.day;
  /* tell everyone when Saturday starts */
  if(meetActive()&&MEET.announcedDay!==CLOCK.day){
    MEET.announcedDay=CLOCK.day;
    pushNews("\u{1F3C6} It's SATURDAY — CAR MEET at the ⛪ church square (428, 330)! Park your coolest car & vote \u{1F525}");
  }
  /* the winner's golden crown above their car */
  const want=MEET.glowDay===CLOCK.day&&!!myVehicle&&S.mode==="game"&&S.world==="earth";
  if(want&&!MEET.glowSpr){
    const cv=document.createElement("canvas");cv.width=128;cv.height=128;
    const c=cv.getContext("2d");c.font="100px serif";c.textAlign="center";c.fillText("\u{1F451}",64,100);
    MEET.glowSpr=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthTest:false}));
    MEET.glowSpr.scale.set(2.4,2.4,1);MEET.glowSpr.position.y=3.4;
    myVehicle.mesh.add(MEET.glowSpr);
  }else if(!want&&MEET.glowSpr){
    if(MEET.glowSpr.parent)MEET.glowSpr.parent.remove(MEET.glowSpr);
    try{MEET.glowSpr.material.map.dispose();MEET.glowSpr.material.dispose();}catch(e){}
    MEET.glowSpr=null;
  }else if(want&&MEET.glowSpr&&MEET.glowSpr.parent!==myVehicle.mesh){
    myVehicle.mesh.add(MEET.glowSpr);   // you picked a new car — the crown moves along
  }
}
setInterval(()=>{try{meetTick();organTick();}catch(e){}},400);
/* every story stays available for 5 REAL minutes */
function pruneNews(){
  const now=Date.now();
  for(let i=NEWS.length-1;i>=0;i--)if(now-NEWS[i].ts>300000)NEWS.splice(i,1);
}
const newsCv=document.createElement("canvas");newsCv.width=256;newsCv.height=136;
const newsTex=new THREE.CanvasTexture(newsCv);
const newsMat=new THREE.MeshBasicMaterial({map:newsTex});
KEEP.add(newsMat);KEEP.add(newsTex);
