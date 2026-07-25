/* Car City Game — game-tv.js (part 5/16, split from the old game.js).
   Plain JS, ONE shared global scope across all scripts — the load order in index.html MUST stay: core, world, vehicles, then game-* parts in numbered order. */
/* ================= THE TV: real channels! ================= */
const TVS=[];   // every placed TV
const TV3MM=[
  "100% Lossless Simple Kelp Farm! [3MM] - Tainro (720p).mp4",
  "How to Build a Starter House in Minecraft [3MM] - Tainro (720p).mp4",
  "How to Build a Water Elevator in Minecraft! [3MM] - Tainro (720p).mp4",
  "How to Use a Conduit in Minecraft! [3MM] - Tainro (720p).mp4",
  "How to Use a Lectern in Minecraft! [3MM] - Tainro (720p).mp4",
  "Let's Grow Some Food! [3MM] - Tainro (720p).mp4",
  "Minecraft Super Simple Item Sorter! [3MM] - Tainro (720p).mp4",
  "Simple Cobblestone Generator! [3MM] - Tainro (720p).mp4"
];
const TV={channel:"news",idx:0,videoEl:null,videoTex:null};
/* 📼 MY VIDEOS: upload your own MP4 from your computer — it plays on every TV */
const MYVID={url:null,name:""};
function tvVideoName(i){return TV3MM[i].replace(" [3MM] - Tainro (720p).mp4","");}
function ensureTvVideo(){
  if(TV.videoEl)return;
  const v=document.createElement("video");
  v.playsInline=true;v.setAttribute("playsinline","");
  v.addEventListener("ended",()=>{
    if(TV.channel!=="3mm")return;     // your own MP4s loop instead
    TV.idx=(TV.idx+1)%TV3MM.length;   // when a video ends, the next one plays
    playTvVideo();
    toast("\u{1F4FA} Next up: "+tvVideoName(TV.idx));
  });
  v.addEventListener("error",()=>{   // a video that won't load skips to the next
    if(TV.channel!=="3mm")return;
    TV.idx=(TV.idx+1)%TV3MM.length;
    setTimeout(playTvVideo,3000);
  });
  TV.videoEl=v;
  TV.videoTex=new THREE.VideoTexture(v);
  KEEP.add(TV.videoTex);
}
function playTvVideo(){
  ensureTvVideo();
  TV.videoEl.loop=false;
  TV.videoEl.src="Videos/3MM/"+encodeURIComponent(TV3MM[TV.idx]);
  TV.videoEl.play().catch(()=>{});
}
function setTvChannel(ch){
  TV.channel=ch;
  if(ch!=="3mm"&&ch!=="myvid"&&TV.videoEl)TV.videoEl.pause();
  if(ch==="3mm"){ensureTvVideo();newsMat.map=TV.videoTex;newsMat.color.set(0xffffff);playTvVideo();}
  else if(ch==="myvid"){
    ensureTvVideo();
    newsMat.map=TV.videoTex;newsMat.color.set(0xffffff);
    TV.videoEl.loop=true;                     // your video loops until you switch channels
    TV.videoEl.src=MYVID.url;
    TV.videoEl.play().catch(()=>{});
  }
  else if(ch==="off"){newsMat.map=null;newsMat.color.set(0x05070a);}
  else{newsMat.map=newsTex;newsMat.color.set(0xffffff);}
  if(ch==="soccer"&&SOC.idx<0)startSoccer(0);
  newsMat.needsUpdate=true;
}
function nearTv(){
  for(let i=TVS.length-1;i>=0;i--){
    const t=TVS[i];
    if(offScene(t.g)){TVS.splice(i,1);continue;}
    if(Math.abs(player.y-t.y)<3&&Math.hypot(player.x-t.x,player.z-t.z)<3.2)return t;
  }
  return null;
}
function openNewsMenu(){
  pruneNews();
  const opts=[{label:"\u{1F4E1} LIVE — always show the NEWEST story",value:"auto"}];
  NEWS.slice().reverse().slice(0,8).forEach(n=>{
    opts.push({label:"\u{1F4F0} "+n.t.slice(0,48)+(n.t.length>48?"…":""),value:n});
  });
  opts.push({label:"❌ Cancel",value:"cancel"});
  showDest("\u{1F4F0} CITY NEWS — pick a story (each stays 5 minutes)",opts,v=>{
    if(v==="cancel")return;
    TV.newsPick=v==="auto"?null:v;
    setTvChannel("news");
    toast(v==="auto"?"\u{1F4F0} LIVE mode — the newest story is always on screen!":"\u{1F4F0} That story stays on screen while it's fresh (5 min)!");
  });
}
function openTvMenu(){
  showDest("\u{1F4FA} TV — pick a channel",[
    {label:"⛏ Channel 1 — 3 Minute Minecraft (3MM)",value:"3mm"},
    {label:"\u{1F4F0} Channel 2 — CITY NEWS (pick a story!)",value:"news"},
    {label:"⚽ Channel 3 — WORLD CUP soccer (7 matches!)",value:"soccer"},
    {label:"\u{1F525} Channel 4 — The Cozy Fireplace",value:"fire"},
    {label:"\u{1F420} Channel 5 — The Aquarium",value:"aqua"},
    {label:"\u{1F4FC} Channel 6 — MY VIDEOS (upload your own MP4!)"+(MYVID.url?" · now: "+MYVID.name.slice(0,20):""),value:"myvid"},
    {label:"⏻ Turn the TV OFF",value:"off"},
    {label:"❌ Cancel",value:"cancel"}
  ],v=>{
    if(v==="cancel")return;
    if(v==="myvid"){
      const opts=[];
      if(MYVID.url)opts.push({label:"▶ Play again: "+MYVID.name,value:"play"});
      opts.push({label:"\u{1F4E4} UPLOAD an MP4 from your computer",value:"up"});
      opts.push({label:"❌ Cancel",value:"cancel"});
      showDest("\u{1F4FC} MY VIDEOS — your own MP4 on every TV in the game",opts,a=>{
        if(a==="play"){setTvChannel("myvid");toast("\u{1F4FC} Now playing: "+MYVID.name+" — it loops until you change channels!");}
        else if(a==="up")$("tvFile").click();
      });
      return;
    }
    if(v==="3mm"){
      const opts=TV3MM.map((f,i)=>({label:"▶ "+tvVideoName(i),value:i}));
      opts.push({label:"❌ Cancel",value:"cancel"});
      showDest("⛏ 3 Minute Minecraft — pick a video",opts,vi=>{
        if(vi==="cancel")return;
        TV.idx=vi;
        setTvChannel("3mm");
        toast("\u{1F4FA}⛏ Now playing: "+tvVideoName(vi)+" — when it ends, the next video starts!");
      });
      return;
    }
    if(v==="news"){openNewsMenu();return;}
    if(v==="soccer"){
      const opts=WC.map((mt,i)=>({label:(i===6?"\u{1F3C6} FINAL: ":"▶ Match "+(i+1)+": ")+mt[0][0]+" ("+mt[0][2]+") vs "+mt[1][0]+" ("+mt[1][2]+")",value:i}));
      if(SOC.idx>=0)opts.unshift({label:"\u{1F4FA} Keep watching the current match",value:"cur"});
      opts.push({label:"❌ Cancel",value:"cancel"});
      showDest("⚽ WORLD CUP — pick a match",opts,vi=>{
        if(vi==="cancel")return;
        if(vi!=="cur")startSoccer(vi);
        setTvChannel("soccer");
        toast("⚽\u{1F4FA} KICK-OFF! "+WC[SOC.idx][0][0]+" vs "+WC[SOC.idx][1][0]+" — when it ends, the next match starts!");
      });
      return;
    }
    setTvChannel(v);
    toast(v==="off"?"\u{1F4FA}⏻ TV is OFF — good night!"
      :v==="fire"?"\u{1F525} The cozy fireplace channel... so warm."
      :"\u{1F420} The aquarium channel — blub blub!");
  });
}
/* the hidden MP4 picker: choose a video file and it starts on every TV */
$("tvFile").addEventListener("change",()=>{
  const f=$("tvFile").files&&$("tvFile").files[0];
  $("tvFile").value="";
  if(!f)return;
  if(MYVID.url){try{URL.revokeObjectURL(MYVID.url);}catch(e){}}
  MYVID.url=URL.createObjectURL(f);
  MYVID.name=f.name.replace(/\.(mp4|webm|mov|m4v|mkv)$/i,"");
  setTvChannel("myvid");
  toast("\u{1F4FC}\u{1F4FA} Now playing on every TV: "+MYVID.name+" — it loops until you change channels! (Your video stays on YOUR computer — it isn't uploaded anywhere.)");
});
/* ================= ⚽ THE WORLD CUP CHANNEL: 7 generated matches ================= */
const WC=[
  [["SPAIN","#c60b1e","LAMINE YAMAL"],["PORTUGAL","#0a5c36","RONALDO"]],
  [["FRANCE","#0055a4","MBAPPÉ"],["ARGENTINA","#6faedb","MESSI"]],
  [["BRAZIL","#ffdc02","NEYMAR"],["ENGLAND","#e8edf7","KANE"]],
  [["GERMANY","#d9d9d9","MUSIALA"],["NETHERLANDS","#ff7f00","GAKPO"]],
  [["SPAIN","#c60b1e","LAMINE YAMAL"],["FRANCE","#0055a4","MBAPPÉ"]],
  [["ARGENTINA","#6faedb","MESSI"],["PORTUGAL","#0a5c36","RONALDO"]],
  [["SPAIN","#c60b1e","LAMINE YAMAL"],["ARGENTINA","#6faedb","MESSI"]]
];
const SOC={idx:-1,t:0,score:[0,0],ball:{x:128,y:70,tx:128,ty:70},players:[],banner:"",bannerT:0,ft:false};
function startSoccer(i){
  SOC.idx=i;SOC.t=0;SOC.score=[0,0];SOC.banner="";SOC.bannerT=0;SOC.ft=false;
  SOC.ball={x:128,y:72,tx:128,ty:72};
  SOC.players=[];
  for(let s=0;s<2;s++)for(let k=0;k<6;k++){
    SOC.players.push({s,bx:s?160+(k%3)*28:40+(k%3)*28,by:48+Math.floor(k/3)*36,ph:Math.random()*7,star:k===1});
  }
}
function cheer(){
  if(!audioCtx||!SND.sound)return;
  const t=audioCtx.currentTime,dur=0.8;
  const buf=audioCtx.createBuffer(1,audioCtx.sampleRate*dur,audioCtx.sampleRate);
  const d=buf.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.sin(i/d.length*Math.PI);
  const src=audioCtx.createBufferSource();src.buffer=buf;
  const f=audioCtx.createBiquadFilter();f.type="bandpass";f.frequency.value=900;f.Q.value=0.5;
  const g=audioCtx.createGain();g.gain.value=0.12;
  src.connect(f);f.connect(g);g.connect(audioCtx.destination);src.start();
}
function drawSoccer(dt){
  const mt=WC[SOC.idx],A=mt[0],B=mt[1];
  SOC.t+=dt;
  const minute=Math.min(90,Math.floor(SOC.t/150*90));
  const now=performance.now();
  /* the ball travels between players — and sometimes goes for GOAL */
  const b=SOC.ball;
  const bd=Math.hypot(b.tx-b.x,b.ty-b.y);
  if(bd<3&&!SOC.ft){
    if(b.goal!==undefined){
      /* the shot arrived at a goal mouth! */
      const scoringSide=b.goal;   // 0 = team A scored (right goal), 1 = team B
      if(Math.random()<0.6){
        SOC.score[scoringSide]++;
        const T=scoringSide?B:A;
        const scorer=Math.random()<0.65?T[2]:"No. "+(2+Math.floor(Math.random()*9));
        SOC.banner="⚽ GOOOAL! "+scorer+" ("+T[0]+")";
        SOC.bannerT=3.2;
        cheer();
      }else{SOC.banner="\u{1F9E4} SAVED!";SOC.bannerT=1.4;}
      b.goal=undefined;
      b.tx=128;b.ty=72;
    }else if(Math.random()<0.22){
      /* shoot! aim at a goal mouth */
      const side=Math.random()<0.5?0:1;
      b.goal=side;
      b.tx=side?12:244;b.ty=62+Math.random()*20;
    }else{
      const p=SOC.players[Math.floor(Math.random()*SOC.players.length)];
      b.tx=p.bx+Math.sin(now/700+p.ph)*8;
      b.ty=p.by+Math.cos(now/900+p.ph)*7;
    }
  }
  const bs=64*dt;
  if(bd>0.5){b.x+=(b.tx-b.x)/bd*Math.min(bs,bd);b.y+=(b.ty-b.y)/bd*Math.min(bs,bd);}
  /* full time → show the result, then the next match kicks off */
  if(SOC.t>=150&&!SOC.ft){
    SOC.ft=true;
    SOC.banner="\u{1F3C1} FULL TIME "+SOC.score[0]+" - "+SOC.score[1];
    SOC.bannerT=6;
  }
  if(SOC.ft&&SOC.bannerT<=0){startSoccer((SOC.idx+1)%WC.length);return;}
  SOC.bannerT-=dt;
  /* --- draw the match --- */
  const c=newsCv.getContext("2d");
  c.fillStyle="#1e7a34";c.fillRect(0,0,256,136);
  for(let i=0;i<6;i++){c.fillStyle=i%2?"#1e8038":"#1c7431";c.fillRect(i*43,26,43,110);}
  c.strokeStyle="rgba(255,255,255,.7)";c.lineWidth=1.5;
  c.strokeRect(8,32,240,98);
  c.beginPath();c.moveTo(128,32);c.lineTo(128,130);c.stroke();
  c.beginPath();c.arc(128,81,16,0,7);c.stroke();
  c.strokeRect(8,58,22,46);c.strokeRect(226,58,22,46);
  /* players wiggle around their formation spots (the star wears a ring) */
  for(const p of SOC.players){
    const px=p.bx+Math.sin(now/700+p.ph)*8,py=p.by+Math.cos(now/900+p.ph)*7+26;
    c.fillStyle=p.s?B[1]:A[1];
    c.beginPath();c.arc(px,py,3.4,0,7);c.fill();
    c.strokeStyle="#08131f";c.lineWidth=1;c.stroke();
    if(p.star){c.strokeStyle="#ffd75e";c.lineWidth=1.4;c.beginPath();c.arc(px,py,5.4,0,7);c.stroke();}
  }
  /* the ball */
  c.fillStyle="#ffffff";c.beginPath();c.arc(b.x,b.y+26,2.4,0,7);c.fill();
  c.strokeStyle="#08131f";c.lineWidth=0.8;c.stroke();
  /* scoreboard */
  c.fillStyle="#08131f";c.fillRect(0,0,256,26);
  c.fillStyle=A[1];c.fillRect(4,5,16,16);
  c.fillStyle=B[1];c.fillRect(236,5,16,16);
  c.fillStyle="#fff";c.font="bold 13px Segoe UI";c.textAlign="center";
  c.fillText(A[0].slice(0,3)+"  "+SOC.score[0]+" - "+SOC.score[1]+"  "+B[0].slice(0,3),128,17);
  c.font="bold 11px Segoe UI";c.textAlign="left";
  c.fillStyle="#ffd75e";c.fillText((SOC.ft?"FT":minute+"'"),24,17);
  c.textAlign="right";c.fillStyle="#9fd8ff";c.fillText(SOC.idx===6?"\u{1F3C6} FINAL":"WORLD CUP",232,17);
  /* goal / full-time banner */
  if(SOC.bannerT>0&&SOC.banner){
    c.fillStyle="rgba(8,19,31,.85)";c.fillRect(0,56,256,30);
    c.fillStyle="#ffd75e";c.font="bold 15px Segoe UI";c.textAlign="center";
    c.fillText(SOC.banner,128,76);
  }
  newsTex.needsUpdate=true;
}
/* --- CITY NEWS: each story shows ONCE for 5 seconds, then B&W static --- */
let _newsCur=null,_newsTimer=0,_staticT=0,_animT=0;
function drawHeadline(t){
  const c=newsCv.getContext("2d");
  c.fillStyle="#08131f";c.fillRect(0,0,256,136);
  c.fillStyle="#c0392b";c.fillRect(0,0,256,26);
  c.fillStyle="#fff";c.font="bold 16px Segoe UI";c.textAlign="left";
  c.fillText("\u{1F4FA} CITY NEWS · LIVE",8,19);
  c.font="13px Segoe UI";c.fillStyle="#e8edf7";
  const words=String(t).split(" ");
  let line="",y=48;
  for(const w of words){
    if((line+" "+w).length>32){c.fillText(line,8,y);y+=17;line=w;}
    else line=line?line+" "+w:w;
    if(y>110)break;
  }
  if(line&&y<=110)c.fillText(line,8,y);
  c.fillStyle="#1a2438";c.fillRect(0,118,256,18);
  c.fillStyle="#ffd75e";c.font="bold 11px Segoe UI";
  c.fillText("BREAKING NEWS · live from your world",8,131);
  newsTex.needsUpdate=true;
}
function drawStatic(){
  /* no news right now: black & white square static, like a real old TV */
  const c=newsCv.getContext("2d");
  for(let y=0;y<136;y+=8)for(let x=0;x<256;x+=8){
    const v=Math.random()<0.45?8:Math.floor(120+Math.random()*135);
    c.fillStyle="rgb("+v+","+v+","+v+")";
    c.fillRect(x,y,8,8);
  }
  newsTex.needsUpdate=true;
}
/* --- the generated channels: fireplace & aquarium --- */
const aquaFish=[];
for(let i=0;i<5;i++)aquaFish.push({x:Math.random()*256,y:30+i*20,sp:12+Math.random()*22,dir:Math.random()<0.5?1:-1,col:["#ff7f11","#f4d35e","#ff5d8f","#4fc3f7","#94d82d"][i]});
function drawFireplace(){
  const c=newsCv.getContext("2d");
  c.fillStyle="#160c06";c.fillRect(0,0,256,136);
  c.fillStyle="#4a3728";c.fillRect(48,104,160,14);   // logs
  c.fillStyle="#5a4430";c.fillRect(70,96,120,10);
  for(let i=0;i<14;i++){
    const x=70+Math.random()*116,h=18+Math.random()*52,w=8+Math.random()*14;
    c.fillStyle=["#ff7f11","#ffd166","#d7263d","#ff9e3d"][i%4];
    c.beginPath();
    c.moveTo(x-w/2,104);c.quadraticCurveTo(x,104-h*1.3,x+w/2,104);
    c.closePath();c.fill();
  }
  for(let i=0;i<6;i++){c.fillStyle="#ffd166";c.fillRect(80+Math.random()*100,30+Math.random()*60,2,2);}
  newsTex.needsUpdate=true;
}
function drawAquarium(){
  const c=newsCv.getContext("2d");
  const gr=c.createLinearGradient(0,0,0,136);
  gr.addColorStop(0,"#0e4d78");gr.addColorStop(1,"#062b47");
  c.fillStyle=gr;c.fillRect(0,0,256,136);
  c.fillStyle="#2f9e44";
  for(const wx of[30,120,215]){c.fillRect(wx,96,5,40);c.fillRect(wx+8,106,4,30);}
  for(const f of aquaFish){
    c.save();
    c.translate(f.x,f.y+Math.sin(performance.now()/400+f.x)*4);
    c.scale(f.dir,1);
    c.fillStyle=f.col;
    c.beginPath();c.ellipse(0,0,11,6,0,0,7);c.fill();
    c.beginPath();c.moveTo(-10,0);c.lineTo(-17,-5);c.lineTo(-17,5);c.closePath();c.fill();
    c.fillStyle="#08131f";c.beginPath();c.arc(5,-1.5,1.6,0,7);c.fill();
    c.restore();
  }
  c.fillStyle="rgba(255,255,255,.5)";
  for(let i=0;i<5;i++)c.beginPath(),c.arc((i*53+performance.now()/40)%256,(136-(performance.now()/14+i*40)%136),2,0,7),c.fill();
  newsTex.needsUpdate=true;
}
function updateTv(dt){
  /* video sound follows how close you stand to a TV */
  if((TV.channel==="3mm"||TV.channel==="myvid")&&TV.videoEl){
    let d=1e9;
    for(let i=TVS.length-1;i>=0;i--){
      const t=TVS[i];
      if(offScene(t.g)){TVS.splice(i,1);continue;}
      d=Math.min(d,Math.hypot(player.x-t.x,player.z-t.z));
    }
    TV.videoEl.volume=SND.sound?Math.max(0,Math.min(0.75,1.1-d/26)):0;
    /* the browser blocked autoplay earlier? keep trying — the next tap unblocks it */
    if(TV.videoEl.paused&&!TV.videoEl.error)TV.videoEl.play().catch(()=>{});
    return;
  }
  if(TV.channel==="off")return;
  if(TV.channel==="soccer"){drawSoccer(dt);return;}
  if(TV.channel==="news"){
    pruneNews();
    /* show the story you picked (while it's fresh), otherwise the newest one */
    const cur=(TV.newsPick&&NEWS.includes(TV.newsPick))?TV.newsPick:(NEWS.length?NEWS[NEWS.length-1]:null);
    if(cur!==_newsCur){
      _newsCur=cur;
      if(cur)drawHeadline(cur.t);
    }
    if(!cur){
      _staticT-=dt;
      if(_staticT<=0){_staticT=0.12;drawStatic();}
    }
    return;
  }
  _animT-=dt;
  if(_animT>0)return;
  _animT=0.1;
  if(TV.channel==="fire")drawFireplace();
  else if(TV.channel==="aqua"){
    for(const f of aquaFish){
      f.x+=f.sp*f.dir*0.1;
      if(f.x>270){f.dir=-1;f.x=270;}
      if(f.x<-14){f.dir=1;f.x=-14;}
    }
    drawAquarium();
  }
}
/* ---------- random events: construction, accidents (+ambulance), fires (+fire truck) & festivals ---------- */
const EVENTS={list:[],timer:25};
/* an emergency vehicle that drives in and parks at the scene */
function addResponder(e,kind,delay){
  const mesh=buildEmergencyMesh(kind);
  const a=Math.random()*Math.PI*2;
  const r={kind,mesh,x:e.x+Math.sin(a)*220,z:e.z+Math.cos(a)*220,
    ox:(Math.random()-0.5)*10,oz:8+Math.random()*4,state:"drive",delay:delay||0};
  mesh.position.set(r.x,terrainH(r.x,r.z),r.z);
  mesh.visible=false;
  e.g.add(mesh);
  e.resp=r;
}
function updateResponder(e,dt,now){
  const r=e.resp;
  if(!r)return;
  if(r.delay>0){r.delay-=dt;return;}
  r.mesh.visible=true;
  if(r.state==="drive"){
    const tx=e.x+r.ox,tz=e.z+r.oz;
    const dx=tx-r.x,dz=tz-r.z,d=Math.hypot(dx,dz);
    if(d<3){
      r.state="parked";
      if(r.kind==="fire")toast("\u{1F692} The fire truck arrived — water ON!");
      else if(r.kind==="ambulance")toast("\u{1F691} The ambulance is on scene — the patients are in good hands!");
    }else{
      const yaw=Math.atan2(dx,dz);
      r.x+=dx/d*17*dt;r.z+=dz/d*17*dt;
      r.mesh.rotation.set(0,yaw,0);
      if(r.mesh.userData.wheels)for(const w of r.mesh.userData.wheels)w.spin.rotation.x+=17/w.r*dt;
    }
    r.mesh.position.set(r.x,terrainH(r.x,r.z),r.z);
  }
  if(r.mesh.userData.lights){
    const on=Math.floor(now/160)%2===0;
    r.mesh.userData.lights[0].visible=on;
    r.mesh.userData.lights[1].visible=!on;
  }
}
function eventSpeedCap(x,z){
  let cap=Infinity;
  for(const e of EVENTS.list)if(e.cap&&Math.hypot(x-e.x,z-e.z)<e.zone)cap=Math.min(cap,e.cap);
  return cap;
}
function eventRoadPoint(){
  const axis=Math.random()<0.5?"z":"x";
  const p=axis==="z"?player.x:player.z;
  const line=Math.round((p-30)/120)*120+30+120*(Math.floor(Math.random()*3)-1);
  const along=(axis==="z"?player.z:player.x)+(Math.random()<0.5?-1:1)*(180+Math.random()*180);
  const off=Math.random()<0.5?3.5:-3.5;
  return axis==="z"?{x:line+off,z:along,axis}:{x:along,z:line+off,axis};
}
function spawnEvent(forceType){
  const pool=["construction","accident","festival","fire","rescue",isNight()?"meteor":"accident"];
  const type=forceType||pool[Math.floor(Math.random()*pool.length)];
  const g=new THREE.Group();
  const e={type,g,life:150,x:0,z:0};
  if(type==="fire"){
    /* a HOUSE FIRE: flames on a nearby building until the fire truck puts it out */
    const cand=buildings.filter(b=>{
      if(!b.alive||b.walkThru)return false;
      const d=Math.hypot(b.x-player.x,b.z-player.z);
      return d>70&&d<340;
    });
    if(!cand.length){disposeGroup(g);return;}
    const b=cand[Math.floor(Math.random()*cand.length)];
    e.x=b.x;e.z=b.z;e.gy=b.gy;e.fire=1;e.life=120;
    e.flames=[];
    const fr=[0xff7f11,0xffd166,0xd7263d];
    for(let i=0;i<7;i++){
      const fl=new THREE.Mesh(new THREE.ConeGeometry(0.5+Math.random()*0.5,1.6+Math.random()*1.6,6),
        new THREE.MeshBasicMaterial({color:fr[i%3],transparent:true,opacity:0.9}));
      fl.position.set(b.x+(Math.random()-0.5)*Math.min(7,b.w),b.gy+2+Math.random()*3.5,b.z+(Math.random()-0.5)*Math.min(6,b.d));
      g.add(fl);e.flames.push(fl);
    }
    /* the water jet (hidden until the truck sprays) */
    e.drops=[];
    for(let i=0;i<12;i++){
      const dr=new THREE.Mesh(new THREE.SphereGeometry(0.16,6,6),
        new THREE.MeshBasicMaterial({color:0x6fc7ff,transparent:true,opacity:0.85}));
      dr.visible=false;g.add(dr);e.drops.push(dr);
    }
    addResponder(e,"fire",3);
    pushNews("\u{1F525} HOUSE FIRE near ("+Math.round(e.x)+", "+Math.round(e.z)+")! The fire truck is racing to the scene.");
    toast("\u{1F525}\u{1F692} A HOUSE caught FIRE near ("+Math.round(e.x)+", "+Math.round(e.z)+") — the fire truck is on its way!");
    scene.add(g);
    EVENTS.list.push(e);
    return;
  }
  if(type==="construction"){
    const p=eventRoadPoint();e.x=p.x;e.z=p.z;e.zone=22;e.cap=8;
    const y=terrainH(p.x,p.z);
    const coneM=new THREE.MeshLambertMaterial({color:0xff7f11});
    for(let i=0;i<6;i++){
      const c=new THREE.Mesh(new THREE.ConeGeometry(0.3,0.85,8),coneM);
      c.position.set(p.x+(p.axis==="z"?((i%2)*3-1.5):i*2.2-5.5),y+0.42,p.z+(p.axis==="z"?i*2.2-5.5:((i%2)*3-1.5)));
      g.add(c);
    }
    const bar=new THREE.Mesh(new THREE.BoxGeometry(4.4,0.5,0.2),new THREE.MeshBasicMaterial({color:0xffd75e}));
    bar.position.set(p.x,y+1.1,p.z);if(p.axis==="x")bar.rotation.y=Math.PI/2;g.add(bar);
    [[-2],[2]].forEach(q=>{const leg=new THREE.Mesh(new THREE.BoxGeometry(0.14,1.1,0.14),darkTrim);
      leg.position.set(p.x+(p.axis==="z"?q[0]:0),y+0.55,p.z+(p.axis==="z"?0:q[0]));g.add(leg);});
    const digger=new THREE.Mesh(new THREE.BoxGeometry(2.4,1.6,3),new THREE.MeshLambertMaterial({color:0xf4d35e}));
    digger.position.set(p.x+(p.axis==="z"?4.5:0),y+0.8,p.z+(p.axis==="z"?0:4.5));g.add(digger);
    toast("\u{1F6A7} ROAD CONSTRUCTION near ("+Math.round(e.x)+", "+Math.round(e.z)+") — slow down to pass!");
  }else if(type==="accident"){
    const p=eventRoadPoint();e.x=p.x;e.z=p.z;e.zone=20;e.cap=6;
    const y=terrainH(p.x,p.z);
    const c1=buildVehicleMesh("car",COLORS[Math.floor(Math.random()*COLORS.length)]);
    c1.position.set(p.x-1.5,y,p.z-2);c1.rotation.y=Math.random()*6.3;c1.rotation.z=0.14;g.add(c1);
    const c2=buildVehicleMesh("car",COLORS[Math.floor(Math.random()*COLORS.length)]);
    c2.position.set(p.x+1.5,y,p.z+2.4);c2.rotation.y=Math.random()*6.3;g.add(c2);
    const pol=buildEmergencyMesh("police");
    pol.position.set(p.x+(p.axis==="z"?0:8),y,p.z+(p.axis==="z"?8:0));g.add(pol);
    e.lights=pol.userData.lights;
    /* the ambulance rushes in to help */
    addResponder(e,"ambulance",4);
    pushNews("\u{1F6A8} Accident near ("+Math.round(e.x)+", "+Math.round(e.z)+") — the ambulance is on its way, drive carefully!");
    toast("\u{1F6A8} ACCIDENT on the road near ("+Math.round(e.x)+", "+Math.round(e.z)+") — police on site, ambulance incoming!");
  }else if(type==="meteor"){
    /* ☄️ METEOR SHOWER: glowing space rocks crash down — drive to them for $250 each! */
    let fx=0,fz=0,ok=false;
    for(let i=0;i<10;i++){
      const a=Math.random()*Math.PI*2,d=200+Math.random()*200;
      fx=player.x+Math.sin(a)*d;fz=player.z+Math.cos(a)*d;
      if(!keepClear(fx,fz)&&rawH(fx,fz)>-1&&rawH(fx,fz)<16){ok=true;break;}
    }
    if(!ok){disposeGroup(g);return;}
    e.x=fx;e.z=fz;e.life=130;e.meteors=[];
    for(let i=0;i<3;i++){
      const mx=fx+(Math.random()-0.5)*60,mz=fz+(Math.random()-0.5)*60;
      const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(0.9,0),
        new THREE.MeshBasicMaterial({color:0xffa040}));
      rock.position.set(mx,240+i*90,mz);g.add(rock);
      const glow=new THREE.Mesh(new THREE.SphereGeometry(1.6,8,8),
        new THREE.MeshBasicMaterial({color:0xff7f11,transparent:true,opacity:0.35}));
      glow.position.copy(rock.position);g.add(glow);
      e.meteors.push({rock,glow,x:mx,z:mz,y:rock.position.y,vy:-(55+i*12),landed:false,got:false});
    }
    pushNews("☄️ METEOR SHOWER near ("+Math.round(fx)+", "+Math.round(fz)+") — the glowing space rocks are worth $250 each!!");
    toast("☄️\u{1F31F} A METEOR SHOWER is falling near ("+Math.round(fx)+", "+Math.round(fz)+") — race there and grab the space rocks: $250 each!");
  }else if(type==="rescue"){
    /* 🆘 EMERGENCY RESCUE: someone's car broke down — be their hero! */
    const p=eventRoadPoint();e.x=p.x;e.z=p.z;e.life=140;e.rescue=true;
    const y=terrainH(p.x,p.z);
    const wreck=buildVehicleMesh("car",COLORS[Math.floor(Math.random()*COLORS.length)]);
    wreck.position.set(p.x,y,p.z);wreck.rotation.y=Math.random()*6.3;wreck.rotation.z=0.06;g.add(wreck);
    const person=makePerson(0.95);
    person.position.set(p.x+2.5,y,p.z);g.add(person);
    e.person=person;
    /* smoke from the dead engine */
    e.smokeT=0;
    pushNews("\u{1F198} Someone is STRANDED near ("+Math.round(p.x)+", "+Math.round(p.z)+") — $500 for the driver who rescues them!");
    toast("\u{1F198}\u{1F697} EMERGENCY! Someone is stranded near ("+Math.round(p.x)+", "+Math.round(p.z)+") — drive there and STOP next to them for $500!");
  }else{
    /* festival: an off-road party — visit it on foot for +$50 */
    let fx=0,fz=0,ok=false;
    for(let i=0;i<10;i++){
      const a=Math.random()*Math.PI*2,d=150+Math.random()*120;
      fx=player.x+Math.sin(a)*d;fz=player.z+Math.cos(a)*d;
      if(!keepClear(fx,fz)&&rawH(fx,fz)<14){ok=true;break;}
    }
    if(!ok){disposeGroup(g);return;}
    e.x=fx;e.z=fz;
    const y=terrainH(fx,fz);
    const stage=new THREE.Mesh(new THREE.BoxGeometry(8,1,5),new THREE.MeshLambertMaterial({color:0x6d28d9}));
    stage.position.set(fx,y+0.5,fz);g.add(stage);
    const back=new THREE.Mesh(new THREE.BoxGeometry(8,4,0.4),new THREE.MeshLambertMaterial({color:0x9b5de5}));
    back.position.set(fx,y+3,fz-2.3);g.add(back);
    const bn=new THREE.Mesh(new THREE.BoxGeometry(6,0.7,0.1),new THREE.MeshBasicMaterial({color:0xffd75e}));
    bn.position.set(fx,y+4.6,fz-2.3);g.add(bn);
    e.balloons=[];
    for(let i=0;i<6;i++){
      const bx=fx-6+i*2.4,bz=fz+4;
      const st=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,2.6),darkTrim);st.position.set(bx,y+1.3,bz);g.add(st);
      const bl=new THREE.Mesh(new THREE.SphereGeometry(0.45,10,10),new THREE.MeshLambertMaterial({color:COLORS[i%COLORS.length]}));
      bl.position.set(bx,y+2.9,bz);bl.userData.y0=y+2.9;g.add(bl);
      e.balloons.push(bl);
    }
    e.peds=[];
    for(let i=0;i<4;i++){
      const pp=spawnPed(fx-5+Math.random()*10,fz+2+Math.random()*5,"wander");
      if(pp)e.peds.push(pp);
    }
    pushNews("\u{1F389} A FESTIVAL is happening near ("+Math.round(fx)+", "+Math.round(fz)+") — free $50 for every visitor!");
    toast("\u{1F389} A FESTIVAL started near ("+Math.round(fx)+", "+Math.round(fz)+") — visit it on foot for $50!");
  }
  scene.add(g);
  EVENTS.list.push(e);
}
function updateEvents(dt){
  if(S.world!=="earth")return;
  EVENTS.timer-=dt;
  if(EVENTS.timer<=0){
    EVENTS.timer=100+Math.random()*140;   // calmer city: events happen less often
    if(EVENTS.list.length<3)spawnEvent();
  }
  const now=performance.now();
  for(let i=EVENTS.list.length-1;i>=0;i--){
    const e=EVENTS.list[i];
    e.life-=dt;
    if(e.lights){const on=Math.floor(now/250)%2===0;e.lights[0].visible=on;e.lights[1].visible=!on;}
    updateResponder(e,dt,now);
    /* burning houses: flames flicker + smoke, until the fire truck sprays them out */
    if(e.fire!==undefined&&e.fire>0){
      e.flames.forEach((fl,fi)=>{
        fl.scale.setScalar(Math.max(0.05,e.fire*(0.75+Math.sin(now/85+fi*2)*0.3)));
      });
      if(Math.random()<dt*5)puffSmoke(e.x+(Math.random()-0.5)*5,e.gy+6,e.z+(Math.random()-0.5)*5);
      if(e.resp&&e.resp.state==="parked"){
        /* WATER ON: an arc of drops from the truck's hose to the flames */
        const r=e.resp;
        e.fire=Math.max(0,e.fire-dt/9);
        e.drops.forEach((dr,di)=>{
          dr.visible=true;
          const t=((now/700)+di/e.drops.length)%1;
          const sx=r.x,sy=terrainH(r.x,r.z)+2.4,sz=r.z;
          const tx=e.x,ty=e.gy+3,tz=e.z;
          dr.position.set(sx+(tx-sx)*t,sy+(ty-sy)*t+Math.sin(t*Math.PI)*3.2,sz+(tz-sz)*t);
        });
        if(e.fire<=0){
          e.flames.forEach(fl=>fl.visible=false);
          e.drops.forEach(dr=>dr.visible=false);
          e.life=Math.min(e.life,10);
          pushNews("\u{1F692} The fire fighters put out the house fire near ("+Math.round(e.x)+", "+Math.round(e.z)+") — everyone is safe!");
          if(Math.hypot(player.x-e.x,player.z-e.z)<260)toast("\u{1F692}\u{1F4A6} FIRE'S OUT! Great work by the fire fighters!");
        }
      }
    }
    if(e.balloons){
      e.balloons.forEach((b,bi)=>{b.position.y=b.userData.y0+Math.sin(now/700+bi)*0.5;});
      if(!e.done&&player.onFoot&&Math.hypot(player.x-e.x,player.z-e.z)<10){
        e.done=true;addMoney(50);
        toast("\u{1F389} You made it to the festival — +$50!");
      }
    }
    /* ☄️ meteors: fall from the sky, then glow on the ground until collected */
    if(e.meteors){
      for(const m of e.meteors){
        if(!m.landed){
          m.y+=m.vy*dt;
          const gy=terrainH(m.x,m.z)+0.7;
          if(m.y<=gy){
            m.y=gy;m.landed=true;
            if(Math.hypot(player.x-m.x,player.z-m.z)<220)toast("☄️\u{1F4A5} A meteor just CRASHED nearby — grab it!");
          }
          m.rock.position.y=m.y;m.glow.position.y=m.y;
        }else if(!m.got){
          m.rock.rotation.y+=dt*2;m.rock.rotation.x+=dt;
          m.glow.scale.setScalar(1+Math.sin(now/240)*0.25);
          if(Math.hypot(player.x-m.x,player.z-m.z)<4.5){
            m.got=true;m.rock.visible=false;m.glow.visible=false;
            addMoney(250);
            toast("☄️\u{1F4B0} SPACE ROCK collected — +$250!"+(e.meteors.every(q=>q.got)?" That's ALL of them — nice driving!":""));
          }
        }
      }
    }
    /* 🆘 rescue: stop next to the stranded driver */
    if(e.rescue&&!e.done){
      if(e.person)e.person.rotation.y=Math.sin(now/400)*0.6;   // waving around, worried
      const stopped=player.drive&&Math.abs(player.drive.speed||0)<2;
      if(stopped&&Math.hypot(player.x-e.x,player.z-e.z)<12){
        e.done=true;e.life=Math.min(e.life,6);
        addMoney(500);
        pushNews("\u{1F9B8} "+mpName()+" rescued the stranded driver — a true Car City hero!");
        toast("\u{1F9B8}\u{1F4B0} RESCUED! They hop in, you drop them at the corner — +$500, hero!");
      }
    }
    if(e.life<=0||Math.hypot(player.x-e.x,player.z-e.z)>900){
      /* the festival is over: the visitors walk off and go home */
      if(e.peds)e.peds.forEach(p=>{p.mode="leave";p.ttl=Math.min(p.ttl,8+Math.random()*5);});
      if(e.balloons&&e.life<=0&&Math.hypot(player.x-e.x,player.z-e.z)<220)
        toast("\u{1F389} The festival is over — everyone is heading home.");
      scene.remove(e.g);disposeGroup(e.g);
      EVENTS.list.splice(i,1);
    }
  }
}
/* ---------- your money & cars follow your USERNAME (saved online in Firebase) ---------- */
const PROF={t:0,dirty:false};
function profileKey(){
  const n=cleanServerName(localStorage.getItem("vc4pname")||"");
  return n?n.toLowerCase().replace(/[^a-z0-9]/g,"_"):null;
}
async function profileLoad(){
  if(!SERVER_READY)return;
  const k=profileKey();if(!k)return;
  try{
    const r=await fetch(SERVER_API+"/profiles/"+k+".json",{cache:"no-store"});
    if(!r.ok)return;
    const d=await r.json();
    if(d&&d.t===myToken()){
      if(typeof d.v==="number"&&d.v>MONEY.v)MONEY.v=d.v;
      if(MONEY.v>=1000)MONEY.rainbow=true;
      (typeof d.own==="string"?d.own.split("|"):[]).forEach(n=>{n=fixVehName(n);if(n&&!OLD_DEFAULTS.includes(n))OWN.add(n);});
      updateMoneyUI();renderMenu();saveGame();
    }
    profileSave(true);
  }catch(e){}
}
function profileSave(force){
  if(!SERVER_READY)return;
  const k=profileKey();if(!k)return;
  const now=Date.now();
  if(!force&&now-PROF.t<10000){PROF.dirty=true;return;}
  PROF.t=now;PROF.dirty=false;
  try{
    fetch(SERVER_API+"/profiles/"+k+".json",{method:"PUT",
      body:JSON.stringify({t:myToken(),name:localStorage.getItem("vc4pname")||"",v:MONEY.v,own:[...OWN].join("|")})
    }).catch(()=>{});
  }catch(e){}
}
