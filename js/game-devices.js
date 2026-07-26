/* Car City Game — game-devices.js (part 2/16, split from the old game.js).
   Plain JS, ONE shared global scope across all scripts — the load order in index.html MUST stay: core, world, vehicles, then game-* parts in numbered order. */
/* ---------- PHONES: surprise boxes from the COOLBLUE store ----------
   The real line-ups, with the real gaps: no iPhone 9 (Apple skipped it, iPhone X = 10),
   Samsung jumped from S10 straight to S20, and Pixel "a" phones exist for 3a-9a. */
const PHONE={unopened:0,owned:[]};
const PHONE_MODELS=(function(){
  const L=[];
  const yrI={4:2010,5:2012,6:2014,7:2016,8:2017,10:2017,11:2019,12:2020,13:2021,14:2022,15:2023,16:2024,17:2025};
  for(let i=4;i<=17;i++){
    if(i===9)continue;   // Apple really skipped the iPhone 9!
    const nm=i===10?"iPhone X":"iPhone "+i;
    L.push({m:nm,br:"Apple",tier:i-3,yr:yrI[i]});
    if(i>=11){
      L.push({m:nm+" Pro",br:"Apple",tier:i-1.5,yr:yrI[i]});
      L.push({m:nm+" Pro Max",br:"Apple",tier:i-1,yr:yrI[i]});
    }
  }
  for(let i=1;i<=10;i++){
    L.push({m:"Google Pixel "+i,br:"Google",tier:i+2,yr:2015+i});
    if(i>=3&&i<=9)L.push({m:"Google Pixel "+i+"a",br:"Google",tier:i+1,yr:2016+i});   // the cheaper, smaller one
    if(i>=6)L.push({m:"Google Pixel "+i+" Pro",br:"Google",tier:i+4,yr:2015+i});
  }
  [1,2,3,4,5,6,7,8,9,10,20,21,22,23,24,25,26].forEach(s=>{   // S11-S19 never existed!
    const t=s>=20?s-9:s,yr=s>=20?2000+s:2009+s;
    L.push({m:"Samsung Galaxy S"+s,br:"Samsung",tier:t,yr});
    if(s>=8)L.push({m:"Samsung Galaxy S"+s+"+",br:"Samsung",tier:t+0.6,yr});
    if(s>=20)L.push({m:"Samsung Galaxy S"+s+" Ultra",br:"Samsung",tier:t+1.4,yr});
  });
  [["A3",2015],["A5",2015],["A7",2015],["A8",2018],["A9",2018],["A10",2019],["A20",2019],["A30",2019],
   ["A40",2019],["A50",2019],["A70",2019],["A90",2019],["A12",2020],["A32",2021],["A52",2021],["A72",2021],
   ["A13",2022],["A33",2022],["A53",2022],["A73",2022],["A14",2023],["A34",2023],["A54",2023],
   ["A15",2024],["A35",2024],["A55",2024],["A16",2025],["A36",2025],["A56",2025]]
    .forEach(([a,yr],i)=>L.push({m:"Samsung Galaxy "+a,br:"Samsung",tier:2+i*0.35,yr}));
  return L;
})();
const PHONE_COLORS=[...DUMP_COLORS,["Black","#1c1c1e"],["Gold","#ffd700"]];
function phoneValue(ph){return Math.round((200+ph.tier*95)*(ph.color==="Rainbow"?4:1));}
function rollPhone(){
  PHONE.unopened--;
  /* weighted: old cheap phones are common, new Ultras/Pro Maxes are the jackpot */
  let tot=0;
  const ws=PHONE_MODELS.map(M=>{const w=Math.pow(0.87,M.tier);tot+=w;return w;});
  let r2=Math.random()*tot,mi=0;
  for(;mi<ws.length-1&&r2>ws[mi];r2-=ws[mi],mi++);
  const M=PHONE_MODELS[mi];
  let color,hex;
  if(Math.random()<0.015){color="Rainbow";hex=RAINBOW_CSS;}   // 🌈 the rarest!
  else{const c=PHONE_COLORS[Math.floor(Math.random()*PHONE_COLORS.length)];color=c[0];hex=c[1];}
  const ph={m:M.m,br:M.br,tier:M.tier,yr:M.yr||2020,color,hex};
  PHONE.owned.push(ph);
  if(color==="Rainbow")pushNews("\u{1F4F1}\u{1F308} BREAKING: "+mpName()+" unboxed a RAINBOW "+M.m+" — the rarest phone in the world!");
  return ph;
}
/* ---------- GAME CONSOLES: surprise boxes from CoolBlue too! ---------- */
const CONSOLE={unopened:0,owned:[]};
const CONSOLE_MODELS=[
  {m:"PlayStation 1",br:"Sony",tier:1,yr:1994},{m:"PlayStation 2",br:"Sony",tier:2,yr:2000},
  {m:"PlayStation 3",br:"Sony",tier:4,yr:2006},{m:"PlayStation 4",br:"Sony",tier:6,yr:2013},
  {m:"PlayStation 4 Pro",br:"Sony",tier:7,yr:2016},{m:"PlayStation 5",br:"Sony",tier:9,yr:2020},
  {m:"PlayStation 5 Pro",br:"Sony",tier:11,yr:2024},
  {m:"Xbox Original",br:"Microsoft",tier:2,yr:2001},{m:"Xbox 360",br:"Microsoft",tier:4,yr:2005},
  {m:"Xbox One",br:"Microsoft",tier:6,yr:2013},{m:"Xbox One X",br:"Microsoft",tier:7,yr:2017},
  {m:"Xbox Series S",br:"Microsoft",tier:8,yr:2020},{m:"Xbox Series X",br:"Microsoft",tier:10,yr:2020},
  {m:"Nintendo Switch",br:"Nintendo",tier:6,yr:2017},{m:"Nintendo Switch Lite",br:"Nintendo",tier:5,yr:2019},
  {m:"Nintendo Switch OLED",br:"Nintendo",tier:7,yr:2021},{m:"Nintendo Switch 2",br:"Nintendo",tier:10,yr:2025}
];
function consoleValue(c2){return Math.round((150+(c2.tier||1)*80)*(c2.color==="Rainbow"?4:1));}
function rollConsole(){
  CONSOLE.unopened--;
  let tot=0;
  const ws=CONSOLE_MODELS.map(M=>{const w=Math.pow(0.85,M.tier);tot+=w;return w;});
  let r2=Math.random()*tot,mi=0;
  for(;mi<ws.length-1&&r2>ws[mi];r2-=ws[mi],mi++);
  const M=CONSOLE_MODELS[mi];
  let color,hex;
  if(Math.random()<0.015){color="Rainbow";hex=RAINBOW_CSS;}
  else{const c2=PHONE_COLORS[Math.floor(Math.random()*PHONE_COLORS.length)];color=c2[0];hex=c2[1];}
  const cs={m:M.m,br:M.br,tier:M.tier,yr:M.yr,color,hex};
  CONSOLE.owned.push(cs);
  if(color==="Rainbow")pushNews("\u{1F3AE}\u{1F308} BREAKING: "+mpName()+" unboxed a RAINBOW "+M.m+"!");
  return cs;
}
/* ---------- 📲💻 TABLET & COMPUTER SURPRISE BOXES at CoolBlue ----------
   Two separate FREE boxes — one for tablets, one for computers. You never
   pick the model: the box decides, cheap ones common, an iMac ($4,000!) is
   the jackpot. Random colors (\u{1F308} rainbow rarest, worth 4x). They join
   your device collection (Unbox → \u{1F4F1} Phones), so you can hold them,
   sell them to phone buyers, or sell them at your own market. Each model's
   real worth in $ is set below (tier is derived from it, so the market and
   the buyers price them exactly right). */
function gadgetDef(m,br,val,yr){return{m,br,tier:(val-200)/95,yr};}   // phoneValue(tier) === val
const TABLET_MODELS=[
  gadgetDef("iPad","Apple",1000,2022),
  gadgetDef("iPad mini","Apple",800,2024),
  gadgetDef("iPad Air","Apple",1300,2025),
  gadgetDef("iPad Pro 11″","Apple",1800,2024),
  gadgetDef("iPad Pro 13″","Apple",2400,2024),
  gadgetDef("Samsung Galaxy Tab A9","Samsung",500,2023),
  gadgetDef("Samsung Galaxy Tab S9","Samsung",1200,2023),
  gadgetDef("Samsung Galaxy Tab S10 Ultra","Samsung",1800,2024)
];
const COMPUTER_MODELS=[
  gadgetDef("MacBook Neo","Apple",3000,2026),
  gadgetDef("MacBook Air","Apple",2200,2025),
  gadgetDef("MacBook Pro 14″","Apple",3500,2024),
  gadgetDef("MacBook Pro 16″","Apple",4500,2024),
  gadgetDef("iMac","Apple",4000,2024),
  gadgetDef("Mac mini","Apple",2000,2024),
  gadgetDef("Samsung Galaxy Book4 (Windows)","Samsung",1500,2024),
  gadgetDef("Samsung Galaxy Book4 Ultra (Windows)","Samsung",3000,2024)
];
function gadgetEmoji(m){return (m.indexOf("iPad")===0||m.indexOf("Samsung Galaxy Tab")===0)?"\u{1F4F2}":m.indexOf("iMac")===0?"\u{1F5A5}":"\u{1F4BB}";}
/* unopened box counters — you open them YOURSELF in \u{1F381} Unbox */
const TABLET={unopened:0},COMPUTER={unopened:0};
const _TABSET=new Set(TABLET_MODELS.map(M=>M.m)),_PCSET=new Set(COMPUTER_MODELS.map(M=>M.m));
function isTabletM(m){return _TABSET.has(m);}
function isComputerM(m){return _PCSET.has(m);}
/* weighted roll — expensive = rare */
function rollGadget(list){
  let tot=0;
  const ws=list.map(M=>{const w=Math.pow(0.5,phoneValue({tier:M.tier,color:""})/1500);tot+=w;return w;});
  let r2=Math.random()*tot,mi=0;
  for(;mi<ws.length-1&&r2>ws[mi];r2-=ws[mi],mi++);
  const M=list[mi];
  let color,hex;
  if(Math.random()<0.015){color="Rainbow";hex=RAINBOW_CSS;}
  else{const c2=PHONE_COLORS[Math.floor(Math.random()*PHONE_COLORS.length)];color=c2[0];hex=c2[1];}
  const gd={m:M.m,br:M.br,tier:M.tier,yr:M.yr,color,hex};
  PHONE.owned.push(gd);
  if(color==="Rainbow")pushNews(gadgetEmoji(M.m)+"\u{1F308} BREAKING: "+mpName()+" unboxed a RAINBOW "+M.m+" — worth $"+fmtMoney(phoneValue(gd))+"!");
  return gd;
}
function rollTablet(){TABLET.unopened--;return rollGadget(TABLET_MODELS);}
function rollComputer(){COMPUTER.unopened--;return rollGadget(COMPUTER_MODELS);}
/* placed consoles at your home: walk up, press T, pick a game! */
const GCONS=[];
const GFI={it:null};   // side-channel: which furniture item is being built right now
/* REAL mini-games on a pop-up screen! All our own little heroes. */
const GM={on:false,raf:0,id:null,cm:"console",st:null,keys:{},last:0};
const GMDEF={
  panda:{n:"\u{1F43C} Parkour Panda",tip:"SPACE or tap = JUMP over the crates!"},
  kart:{n:"\u{1F3CE} Turbo Kart Racers",tip:"← → (or tap left/right) to dodge the traffic!"},
  foot:{n:"⚽ Football Stars",tip:"SPACE or tap to SHOOT when the arrow points where you want — 5 shots!"},
  zombie:{n:"\u{1F9DF} Zombie Chase",tip:"SPACE or tap = JUMP the graves — the zombie is right behind you!"},
  stack:{n:"\u{1F9F1} Blocky Builder",tip:"SPACE or tap to DROP the block — build the highest tower!"},
  space:{n:"\u{1F680} Space Blasters",tip:"← → to fly, SPACE or tap to BLAST the asteroids!"}
};
function openConsoleGames(cm){
  const ids=["panda","kart","foot","zombie","stack","space"];
  const opts=ids.map(id=>({label:GMDEF[id].n,value:id}));
  opts.push({label:"❌ Turn it off",value:"x"});
  showDest("\u{1F3AE} "+cm+" — pick a game!",opts,v=>{
    if(typeof v!=="string"||v==="x")return;
    gmStart(v,cm);
  });
}
function gmStart(id,cm){
  GM.on=true;GM.id=id;GM.cm=cm||GM.cm;GM.keys={};
  $("gmTitle").textContent=GMDEF[id].n+" — on your "+GM.cm;
  $("gmInfo").textContent=GMDEF[id].tip;
  const W=520;
  if(id==="panda"||id==="zombie")GM.st={y:0,vy:0,obs:[],t:0,sp:210,score:0,over:false,next:1};
  else if(id==="kart")GM.st={lane:1,cars:[],t:0,sp:230,score:0,over:false,next:0.75};
  else if(id==="foot")GM.st={ang:0,t:0,shots:0,goals:0,phase:"aim",ballT:0,zone:0,keep:0,msg:"",over:false};
  else if(id==="stack")GM.st={rows:[[W/2-70,140]],x:0,w:140,dir:1,score:0,over:false,sp:170};
  else GM.st={x:W/2,shots:[],rocks:[],t:0,score:0,lives:3,over:false,next:1,cool:0};
  $("gameModal").classList.add("open");
  cancelAnimationFrame(GM.raf);
  GM.last=performance.now();
  GM.raf=requestAnimationFrame(gmLoop);
}
function gmStop(){GM.on=false;cancelAnimationFrame(GM.raf);}
$("gmClose").onclick=()=>{gmStop();$("gameModal").classList.remove("open");};
$("gmRestart").onclick=()=>{if(GM.id)gmStart(GM.id,GM.cm);};
function gmPress(px){
  const s=GM.st;
  if(!GM.on||!s)return;
  if(s.over){gmStart(GM.id,GM.cm);return;}   // tap after game over = instant restart
  if(GM.id==="panda"||GM.id==="zombie"){if(s.y<=0){s.vy=560;}}
  else if(GM.id==="kart"){
    if(px!==undefined)s.lane=Math.max(0,Math.min(2,s.lane+(px<260?-1:1)));
  }
  else if(GM.id==="foot"&&s.phase==="aim"){
    s.phase="fly";s.ballT=0;
    s.zone=s.ang<-20?0:s.ang>20?2:1;
    s.keep=Math.floor(Math.random()*3);
  }
  else if(GM.id==="stack"){
    const top=s.rows[s.rows.length-1];
    const nx=Math.max(s.x,top[0]),xe=Math.min(s.x+s.w,top[0]+top[1]);
    if(xe-nx<8){s.over=true;return;}
    s.rows.push([nx,xe-nx]);
    s.x=0;s.w=xe-nx;s.dir=1;s.sp+=12;s.score++;
  }
  else if(GM.id==="space"&&s.cool<=0){s.shots.push({x:s.x,y:270});s.cool=0.22;}
}
addEventListener("keydown",e=>{
  if(!GM.on)return;
  GM.keys[e.key]=true;
  if(e.key===" "||e.key==="ArrowUp")gmPress();
  if(GM.id==="kart"&&e.key==="ArrowLeft")GM.st.lane=Math.max(0,GM.st.lane-1);
  if(GM.id==="kart"&&e.key==="ArrowRight")GM.st.lane=Math.min(2,GM.st.lane+1);
  if([" ","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key))e.preventDefault();
});
addEventListener("keyup",e=>{if(GM.on)GM.keys[e.key]=false;});
$("gmCv").addEventListener("pointerdown",e=>{
  const r2=$("gmCv").getBoundingClientRect();
  gmPress((e.clientX-r2.left)/r2.width*520);
});
$("gmCv").addEventListener("pointermove",e=>{
  if(GM.on&&GM.id==="space"&&!GM.st.over){
    const r2=$("gmCv").getBoundingClientRect();
    GM.st.x=Math.max(20,Math.min(500,(e.clientX-r2.left)/r2.width*520));
  }
});
function gmLoop(now){
  if(!GM.on)return;
  const dt=Math.min(0.05,(now-GM.last)/1000);GM.last=now;
  const cv=$("gmCv"),c=cv.getContext("2d"),W=520,H=320,s=GM.st;
  c.clearRect(0,0,W,H);
  c.textAlign="center";c.textBaseline="middle";
  if(GM.id==="panda"||GM.id==="zombie"){
    const zm=GM.id==="zombie";
    if(!s.over){
      s.sp+=dt*9;s.score+=s.sp*dt/10;
      s.vy-=1500*dt;s.y=Math.max(0,s.y+s.vy*dt);
      if(s.y===0)s.vy=0;
      s.t-=dt;
      if(s.t<=0){s.t=s.next=Math.max(0.55,(s.next||1)*0.985);s.obs.push({x:W+30,h:26+Math.random()*26});}
      for(let i=s.obs.length-1;i>=0;i--){
        const o=s.obs[i];o.x-=s.sp*dt;
        if(o.x<-40)s.obs.splice(i,1);
        else if(o.x<96&&o.x>44&&s.y<o.h)s.over=true;
      }
    }
    c.fillStyle="#16324a";c.fillRect(0,0,W,240);
    c.fillStyle=zm?"#2b3a2e":"#3e7d3a";c.fillRect(0,240,W,80);
    c.font="30px serif";
    s.obs.forEach(o=>c.fillText(zm?"\u{1FAA6}":"\u{1F4E6}",o.x,238-o.h/2));
    c.fillText(zm?"\u{1F3C3}":"\u{1F43C}",70,232-s.y);
    if(zm)c.fillText("\u{1F9DF}",20,234);
    c.fillStyle="#fff";c.font="bold 18px Segoe UI";c.textAlign="left";
    c.fillText("Score: "+Math.floor(s.score),12,20);
  }else if(GM.id==="kart"){
    const lx=l=>130+l*130;
    if(!s.over){
      s.sp+=dt*10;s.score+=s.sp*dt/10;
      s.t-=dt;
      if(s.t<=0){s.t=s.next=Math.max(0.42,(s.next||0.75)*0.98);s.cars.push({l:Math.floor(Math.random()*3),y:-40});}
      for(let i=s.cars.length-1;i>=0;i--){
        const o=s.cars[i];o.y+=s.sp*dt;
        if(o.y>H+40)s.cars.splice(i,1);
        else if(o.l===s.lane&&o.y>236&&o.y<304)s.over=true;
      }
    }
    c.fillStyle="#2e3440";c.fillRect(60,0,400,H);
    c.strokeStyle="#f4d35e";c.setLineDash([16,18]);
    [195,325].forEach(x2=>{c.beginPath();c.moveTo(x2,0);c.lineTo(x2,H);c.stroke();});
    c.setLineDash([]);
    c.font="30px serif";
    s.cars.forEach(o=>c.fillText("\u{1F699}",lx(o.l),o.y));
    c.fillText("\u{1F3CE}",lx(s.lane),270);
    c.fillStyle="#fff";c.font="bold 18px Segoe UI";c.textAlign="left";
    c.fillText("Score: "+Math.floor(s.score),12,20);
  }else if(GM.id==="foot"){
    if(s.phase==="aim"){s.t+=dt;s.ang=Math.sin(s.t*2.6)*55;}
    else if(s.phase==="fly"){
      s.ballT+=dt*2.2;
      if(s.ballT>=1){
        const goal=s.zone!==s.keep;
        if(goal)s.goals++;
        s.msg=goal?"⚽ GOOOAL!":"\u{1F9E4} SAVED!";
        s.shots++;s.phase=s.shots>=5?"done":"msg";s.t=0;
        if(s.shots>=5)s.over=true;
      }
    }else if(s.phase==="msg"){s.t+=dt;if(s.t>0.9){s.phase="aim";s.t=0;}}
    c.fillStyle="#3e7d3a";c.fillRect(0,0,W,H);
    c.strokeStyle="#fff";c.lineWidth=4;c.strokeRect(110,40,300,110);
    c.font="34px serif";
    const kx=170+s.keep*90;
    c.fillText("\u{1F9E4}",s.phase==="aim"?260:kx,120);
    if(s.phase==="fly"){
      const tx=170+s.zone*90;
      c.fillText("⚽",260+(tx-260)*s.ballT,290-190*s.ballT);
    }else c.fillText("⚽",260,290);
    if(s.phase==="aim"){
      c.save();c.translate(260,260);c.rotate(s.ang*Math.PI/180);
      c.strokeStyle="#f4d35e";c.lineWidth=5;
      c.beginPath();c.moveTo(0,0);c.lineTo(0,-70);c.stroke();
      c.beginPath();c.moveTo(-8,-58);c.lineTo(0,-72);c.lineTo(8,-58);c.stroke();
      c.restore();
    }
    if(s.phase==="msg")c.fillStyle="#fff",c.font="bold 30px Segoe UI",c.fillText(s.msg,260,200);
    c.fillStyle="#fff";c.font="bold 18px Segoe UI";c.textAlign="left";
    c.fillText("Goals: "+s.goals+" / 5   Shot "+Math.min(5,s.shots+1)+" of 5",12,20);
  }else if(GM.id==="stack"){
    if(!s.over){
      s.x+=s.dir*s.sp*dt;
      if(s.x<0){s.x=0;s.dir=1;}
      if(s.x+s.w>W){s.x=W-s.w;s.dir=-1;}
    }
    c.fillStyle="#16324a";c.fillRect(0,0,W,H);
    const base=H-24,rh=22,show=Math.max(0,s.rows.length-11);
    c.fillStyle="#8a6f4d";
    s.rows.slice(show).forEach((r3,i)=>{c.fillRect(r3[0],base-(i+1)*rh,r3[1],rh-3);});
    if(!s.over){
      c.fillStyle="#f4d35e";
      c.fillRect(s.x,base-(s.rows.length-show+1)*rh,s.w,rh-3);
    }
    c.fillStyle="#fff";c.font="bold 18px Segoe UI";c.textAlign="left";
    c.fillText("Tower: "+s.score+" blocks",12,20);
  }else{   // space blasters
    if(!s.over){
      s.cool-=dt;s.t-=dt;
      if(GM.keys.ArrowLeft)s.x=Math.max(20,s.x-320*dt);
      if(GM.keys.ArrowRight)s.x=Math.min(500,s.x+320*dt);
      if(GM.keys[" "])gmPress();
      if(s.t<=0){s.t=s.next=Math.max(0.4,(s.next||1)*0.975);s.rocks.push({x:30+Math.random()*460,y:-20,sp:70+Math.random()*90});}
      s.shots.forEach(sh=>sh.y-=460*dt);
      s.shots=s.shots.filter(sh=>sh.y>-20);
      for(let i=s.rocks.length-1;i>=0;i--){
        const o=s.rocks[i];o.y+=o.sp*dt;
        let hit=false;
        for(let j=s.shots.length-1;j>=0;j--){
          if(Math.abs(s.shots[j].x-o.x)<24&&Math.abs(s.shots[j].y-o.y)<24){s.shots.splice(j,1);hit=true;break;}
        }
        if(hit){s.rocks.splice(i,1);s.score+=10;continue;}
        if(o.y>H-45&&Math.abs(o.x-s.x)<28){s.rocks.splice(i,1);s.lives--;if(s.lives<=0)s.over=true;continue;}
        if(o.y>H+20)s.rocks.splice(i,1);
      }
    }
    c.fillStyle="#0b0f16";c.fillRect(0,0,W,H);
    c.fillStyle="#fff";
    for(let i=0;i<26;i++)c.fillRect((i*97)%W,(i*61)%H,2,2);
    c.font="28px serif";
    s.rocks.forEach(o=>c.fillText("\u{1FAA8}",o.x,o.y));
    c.fillStyle="#3fd0ff";
    s.shots.forEach(sh=>c.fillRect(sh.x-2,sh.y-10,4,12));
    c.font="30px serif";c.fillText("\u{1F680}",s.x,H-30);
    c.fillStyle="#fff";c.font="bold 18px Segoe UI";c.textAlign="left";
    c.fillText("Score: "+s.score+"   "+"❤️".repeat(Math.max(0,s.lives)),12,20);
  }
  if(s.over){
    c.fillStyle="rgba(11,15,22,0.72)";c.fillRect(0,0,W,H);
    c.fillStyle="#f4d35e";c.font="bold 34px Segoe UI";c.textAlign="center";
    c.fillText(GM.id==="foot"?(s.goals>=3?"\u{1F3C6} YOU WIN — "+s.goals+" / 5!":"Final: "+s.goals+" / 5 goals"):"GAME OVER",260,140);
    c.fillStyle="#fff";c.font="bold 20px Segoe UI";
    c.fillText((GM.id==="stack"?"Tower: "+s.score+" blocks":GM.id==="foot"?"":"Score: "+Math.floor(s.score))+"",260,180);
    c.font="16px Segoe UI";
    c.fillText("Tap the screen (or \u{1F504} Restart) to play again!",260,214);
  }
  GM.raf=requestAnimationFrame(gmLoop);
}
/* ---------- the PHONE SCREEN: browser, info, calculator, timer, alarm & more ---------- */
const PHAPP={timers:[],alarms:[],swT0:0,swAcc:0,swOn:false,expr:""};
function fmt2(n){return String(n).padStart(2,"0");}
function phoneOpen(){
  const ph=HOLD.d;
  if(!ph||!ph.m)return;
  $("phModelTop").textContent=ph.m;
  phoneHome();
  $("phoneModal").classList.add("open");
}
function phoneHome(){
  $("phScreen").innerHTML=
    "<div style='text-align:center;font-size:26px;font-weight:800;margin:6px 0' id='phBigTime'></div>"+
    "<div style='display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:10px'>"+
    [["browser","\u{1F310}","Browser"],["info","ℹ️","Info"],["calc","\u{1F9EE}","Calc"],
     ["timer","⏲️","Timer"],["alarm","⏰","Alarm"],["stop","⏱️","Stopwatch"],["clock","\u{1F550}","Clock"]]
      .map(a=>"<button class='btn' data-app='"+a[0]+"' style='padding:12px 4px;font-size:13px'>"+a[1]+"<br>"+a[2]+"</button>").join("")+
    "</div>";
  $("phScreen").querySelectorAll("[data-app]").forEach(b=>b.onclick=()=>phoneApp(b.dataset.app));
  phTick();
}
function phoneApp(app){
  const s=$("phScreen"),ph=HOLD.d||{};
  if(app==="browser"){
    s.innerHTML="<b>\u{1F310} Browser</b><div style='display:flex;gap:6px;margin-top:8px'>"+
      "<input id='phQ' placeholder='search the internet...' style='flex:1;min-width:0;background:#1a2233;border:1px solid #2a3448;border-radius:8px;color:#e8edf7;padding:8px'>"+
      "<button class='btn warn' id='phGo'>Go</button></div>"+
      "<div id='phRes' style='margin-top:10px;color:#8ea2c0;font-size:13px'>Type something and press Go — the results open in a new tab!</div>";
    $("phGo").onclick=()=>{
      const q=$("phQ").value.trim();
      if(!q)return;
      $("phRes").textContent="\u{1F50E} Searching for \""+q+"\" — check the new tab!";
      window.open("https://www.google.com/search?q="+encodeURIComponent(q),"_blank");
    };
    $("phQ").addEventListener("keydown",e=>{if(e.key==="Enter")$("phGo").click();});
  }else if(app==="info"){
    const scr=Math.min(6.9,3.5+ph.tier*0.22).toFixed(1);
    const gb=Math.min(1024,Math.pow(2,Math.floor(3+ph.tier/2.2)));
    s.innerHTML="<b>ℹ️ About this phone</b><div style='margin-top:8px;line-height:1.9'>"+
      "\u{1F4F1} <b>"+ph.m+"</b><br>\u{1F3ED} Brand: "+ph.br+"<br>\u{1F4C5} Year: "+(ph.yr||"?")+
      "<br>\u{1F3A8} Color: "+(ph.color==="Rainbow"?"\u{1F308} RAINBOW (the rarest!)":ph.color)+
      "<br>\u{1F4D0} Screen: "+scr+"\"<br>\u{1F4BE} Storage: "+(gb>=1024?"1 TB":gb+" GB")+
      "<br>\u{1F4B0} Worth: $"+fmtMoney(phoneValue(ph))+"</div>";
  }else if(app==="calc"){
    PHAPP.expr="";
    s.innerHTML="<b>\u{1F9EE} Calculator</b><div id='phCd' style='background:#1a2233;border-radius:8px;padding:10px;text-align:right;font-size:20px;min-height:28px;margin:8px 0'>0</div>"+
      "<div style='display:grid;grid-template-columns:repeat(4,1fr);gap:6px'>"+
      ["7","8","9","÷","4","5","6","×","1","2","3","−","0",".","C","+","="]
        .map(k=>"<button class='btn"+(k==="="?" warn":"")+"' data-k='"+k+"' style='padding:10px 0"+(k==="="?";grid-column:span 4":"")+"'>"+k+"</button>").join("")+"</div>";
    s.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{
      const k=b.dataset.k;
      if(k==="C")PHAPP.expr="";
      else if(k==="="){
        const e2=PHAPP.expr.replace(/÷/g,"/").replace(/×/g,"*").replace(/−/g,"-");
        if(/^[0-9+\-*/. ]+$/.test(e2)){
          try{const r2=Function('"use strict";return('+e2+")")();PHAPP.expr=String(Math.round(r2*1e6)/1e6);}catch(err){PHAPP.expr="oops";}
        }
      }else PHAPP.expr=(PHAPP.expr==="oops"?"":PHAPP.expr)+k;
      $("phCd").textContent=PHAPP.expr||"0";
    });
  }else if(app==="timer"){
    s.innerHTML="<b>⏲️ Timer</b><div style='display:flex;gap:6px;margin-top:8px;align-items:center'>"+
      "<input id='phTm' type='number' min='1' value='5' style='width:80px;background:#1a2233;border:1px solid #2a3448;border-radius:8px;color:#e8edf7;padding:8px'> minutes "+
      "<button class='btn warn' id='phTgo'>Start!</button></div><div id='phTlist' style='margin-top:10px;color:#8ea2c0'></div>";
    $("phTgo").onclick=()=>{
      const m2=parseFloat($("phTm").value);
      if(!(m2>0))return;
      PHAPP.timers.push({end:Date.now()+m2*60000,min:m2});
      toast("⏲️ Timer set — "+m2+" minute"+(m2>1?"s":"")+"! It rings even with the phone in your pocket.");
      phTick();
    };
    phTick();
  }else if(app==="alarm"){
    s.innerHTML="<b>⏰ Alarm (real time)</b><div style='display:flex;gap:6px;margin-top:8px;align-items:center'>"+
      "<input id='phAl' type='time' style='background:#1a2233;border:1px solid #2a3448;border-radius:8px;color:#e8edf7;padding:8px'>"+
      "<button class='btn warn' id='phAgo'>Set!</button></div><div id='phAlist' style='margin-top:10px;color:#8ea2c0'></div>";
    const list=()=>{$("phAlist").innerHTML=PHAPP.alarms.map(a=>"⏰ "+fmt2(a.h)+":"+fmt2(a.mi)).join("<br>")||"No alarms set.";};
    $("phAgo").onclick=()=>{
      const v=$("phAl").value;
      if(!v)return;
      const parts=v.split(":");
      PHAPP.alarms.push({h:+parts[0],mi:+parts[1],day:-1});
      toast("⏰ Alarm set for "+v+"!");list();
    };
    list();
  }else if(app==="stop"){
    s.innerHTML="<b>⏱️ Stopwatch</b><div id='phSw' style='text-align:center;font-size:30px;font-weight:800;margin:12px 0'>0.0 s</div>"+
      "<div style='display:flex;gap:6px'><button class='btn warn' id='phSs' style='flex:1'>Start</button><button class='btn' id='phSr' style='flex:1'>Reset</button></div>";
    const upd=()=>{
      const t=PHAPP.swAcc+(PHAPP.swOn?Date.now()-PHAPP.swT0:0);
      $("phSw").textContent=(t/1000).toFixed(1)+" s";
      $("phSs").textContent=PHAPP.swOn?"Stop":"Start";
    };
    $("phSs").onclick=()=>{
      if(PHAPP.swOn){PHAPP.swAcc+=Date.now()-PHAPP.swT0;PHAPP.swOn=false;}
      else{PHAPP.swT0=Date.now();PHAPP.swOn=true;}
      upd();
    };
    $("phSr").onclick=()=>{PHAPP.swAcc=0;PHAPP.swOn=false;upd();};
    upd();
  }else if(app==="clock"){
    s.innerHTML="<b>\u{1F550} Clock</b><div id='phCk' style='text-align:center;font-size:34px;font-weight:800;margin:14px 0'></div>"+
      "<div id='phCk2' style='text-align:center;color:#8ea2c0'></div>";
    phTick();
  }
  /* typing in phone inputs must never drive the car */
  s.querySelectorAll("input").forEach(inp=>inp.addEventListener("keydown",e=>e.stopPropagation()));
}
function phTick(){
  const n=new Date(),t=fmt2(n.getHours())+":"+fmt2(n.getMinutes());
  $("phClock").textContent=t;
  const bt=$("phBigTime");if(bt)bt.textContent=t+":"+fmt2(n.getSeconds());
  const ck=$("phCk");
  if(ck){ck.textContent=t+":"+fmt2(n.getSeconds());$("phCk2").textContent="\u{1F3AE} In-game: day "+CLOCK.day+" · "+$("clockTime").textContent;}
  const sw=$("phSw");
  if(sw&&PHAPP.swOn)sw.textContent=((PHAPP.swAcc+Date.now()-PHAPP.swT0)/1000).toFixed(1)+" s";
  const tl=$("phTlist");
  if(tl)tl.innerHTML=PHAPP.timers.map(t2=>"⏲️ "+Math.max(0,Math.ceil((t2.end-Date.now())/1000))+" s left").join("<br>")||"No timers running.";
}
setInterval(()=>{
  /* timers & alarms ring even with the phone in your pocket */
  const now=Date.now(),n=new Date();
  for(let i=PHAPP.timers.length-1;i>=0;i--)if(PHAPP.timers[i].end<=now){
    toast("⏲️\u{1F514} DRRRING — your "+PHAPP.timers[i].min+" minute timer is DONE!");
    PHAPP.timers.splice(i,1);
  }
  const key=n.getDate();
  PHAPP.alarms.forEach(a=>{
    if(a.day!==key&&n.getHours()===a.h&&n.getMinutes()===a.mi){
      a.day=key;
      toast("⏰\u{1F514} DRRRING DRRRING — ALARM! It's "+fmt2(a.h)+":"+fmt2(a.mi)+"!");
    }
  });
  if($("phoneModal").classList.contains("open"))phTick();
},500);
$("bViewPhone").onclick=phoneOpen;
$("phHome").onclick=phoneHome;
$("phClose").onclick=()=>$("phoneModal").classList.remove("open");
/* ---------- COOLBLUE: walk in and buy surprise phone boxes ---------- */
function nearCoolBlue(){
  for(let i=coolblues.length-1;i>=0;i--){
    const c2=coolblues[i];
    if(offScene(c2.g)){coolblues.splice(i,1);continue;}
    if(Math.abs(player.x-c2.x)<12&&Math.abs(player.z-c2.z)<9)return c2;
  }
  return null;
}
function openCoolBlue(){
  $("cbMsg").textContent=PHONE.unopened?"You already have "+PHONE.unopened+" unopened box"+(PHONE.unopened>1?"es":"")+" waiting in \u{1F381} Unbox!":"";
  $("cbModal").classList.add("open");
}
$("cbBuy").onclick=()=>{
  PHONE.unopened++;saveGame();   // phone boxes are FREE!
  $("cbMsg").textContent="\u{1F4E6} FREE phone box grabbed! You have "+PHONE.unopened+" to unbox (\u{1F381} Unbox menu). Take another?";
};
$("cbBuy2").onclick=()=>{
  CONSOLE.unopened++;saveGame();   // console boxes are FREE too!
  $("cbMsg").textContent="\u{1F3AE} FREE console box grabbed! You have "+CONSOLE.unopened+" to unbox (\u{1F381} Unbox menu, \u{1F3AE} Consoles tab). Take another?";
};
$("cbBuy3").onclick=()=>{   // 📲 tablet box — open it yourself in 🎁 Unbox!
  TABLET.unopened++;saveGame();
  $("cbMsg").textContent="\u{1F4F2} FREE tablet box grabbed! You have "+TABLET.unopened+" to open (\u{1F381} Unbox menu, \u{1F4F2} Tablets tab). Take another?";
};
$("cbBuy4").onclick=()=>{   // 💻 computer box
  COMPUTER.unopened++;saveGame();
  $("cbMsg").textContent="\u{1F4BB} FREE computer box grabbed! You have "+COMPUTER.unopened+" to open (\u{1F381} Unbox menu, \u{1F4BB} Computers tab). Take another?";
};
$("cbClose").onclick=()=>$("cbModal").classList.remove("open");
/* little white stars sprinkled on every glitter dumpling */
const _starGeo=new THREE.OctahedronGeometry(1,0);
const _starMat=new THREE.MeshBasicMaterial({color:0xffffff});
function addDumpStars(target,r){
  for(let i=0;i<10;i++){
    const th=i*2.399963,y=1-(i+0.5)/5;   // golden spiral over the sphere
    const rad=Math.sqrt(Math.max(0,1-y*y));
    const s=new THREE.Mesh(_starGeo,_starMat);
    s.scale.setScalar(r*0.2);
    s.position.set(Math.cos(th)*rad*r,y*r,Math.sin(th)*rad*r);
    s.rotation.set(i,i*2,0);
    target.add(s);
  }
}
/* holding a dumpling in your hands */
const HOLD={d:null,mesh:null,mat:null,stars:null};
{
  const mat=new THREE.MeshLambertMaterial({color:0xffffff});
  const m=new THREE.Mesh(new THREE.SphereGeometry(0.26,10,8),mat);
  m.scale.y=0.75;m.visible=false;scene.add(m);
  const st=new THREE.Group();addDumpStars(st,0.27);st.visible=false;m.add(st);
  HOLD.mesh=m;HOLD.mat=mat;HOLD.stars=st;
}
function holdDump(d){
  if(HOLD.d===d){
    HOLD.d=null;HOLD.mesh.visible=false;
    toast("You put the "+(d.size?"butter squishy":"dumpling")+" away.");
  }else{
    HOLD.d=d;
    if(d.color!=="Rainbow")HOLD.mat.color.set(d.hex);
    HOLD.stars.visible=!!d.glitter;
    const sc=d.size==="mega"?2.3:d.size==="med"?1.5:1;   // butter squishies come in sizes
    HOLD.mesh.scale.set(sc,0.75*sc,sc);
    toast("✋"+(d.size?"\u{1F9C8}":"\u{1F95F}")+" You're holding your "+(d.glitter?"GLITTER ":"")+(d.size?butterSizeLabel(d):"")+d.color+" "+(d.size?"butter squishy":"dumpling")+"!"+(player.onFoot?"":" (step out of your vehicle to see it)"));
  }
  renderDump();
}
/* holding a PHONE: a little slab with a glowing screen, plus the View Phone button */
const PHMESH=(function(){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.32,0.022),new THREE.MeshLambertMaterial({color:0x1c1c1e}));
  g.add(body);
  const scr=new THREE.Mesh(new THREE.PlaneGeometry(0.13,0.27),new THREE.MeshBasicMaterial({color:0x9fd8ff}));
  scr.position.z=0.013;g.add(scr);
  g.visible=false;scene.add(g);
  return{g,mat:body.material};
})();
/* held BUTTER looks like real butter: a golden stick with a pale top slab */
const BUTMESH=(function(){
  const g=new THREE.Group();
  const mat=new THREE.MeshLambertMaterial({color:0xf4d35e});
  const stick=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.18,0.2),mat);
  g.add(stick);
  const top=new THREE.Mesh(new THREE.BoxGeometry(0.36,0.05,0.22),new THREE.MeshLambertMaterial({color:0xfdf0c2}));
  top.position.y=0.11;g.add(top);
  g.visible=false;scene.add(g);
  return{g,mat};
})();
function holdPhone(ph){
  if(HOLD.d===ph){
    HOLD.d=null;
    toast("You put the phone away.");
  }else{
    HOLD.d=ph;
    if(ph.color!=="Rainbow")PHMESH.mat.color.set(ph.hex);
    toast("✋\u{1F4F1} You're holding your "+ph.color+" "+ph.m+" — tap the \u{1F4F1} VIEW PHONE button!");
  }
  renderDump();
}
function updateHeld(){
  const isPhone=!!(HOLD.d&&HOLD.d.m);
  const isButter=!!(HOLD.d&&!isPhone&&HOLD.d.size);   // butter squishies carry a size
  const btn=$("bViewPhone"),want=isPhone?"":"none";
  if(btn.style.display!==want)btn.style.display=want;
  const show=HOLD.d&&player.onFoot&&player.mesh.visible;
  HOLD.mesh.visible=!!show&&!isPhone&&!isButter;
  PHMESH.g.visible=!!show&&isPhone;
  BUTMESH.g.visible=!!show&&isButter;
  if(!show)return;
  const yaw=player.yaw;
  const px=player.x+Math.sin(yaw)*0.5+Math.sin(yaw+Math.PI/2)*0.3,
        py=player.y+1.12,
        pz=player.z+Math.cos(yaw)*0.5+Math.cos(yaw+Math.PI/2)*0.3;
  if(isPhone){
    PHMESH.g.position.set(px,py+0.05,pz);
    PHMESH.g.rotation.y=yaw;
    if(HOLD.d.color==="Rainbow")PHMESH.mat.color.setHSL((performance.now()/1500)%1,0.9,0.55);
    return;
  }
  if(isButter){
    const sc=HOLD.d.size==="mega"?2.3:HOLD.d.size==="med"?1.5:1;
    BUTMESH.g.scale.setScalar(sc);
    BUTMESH.g.position.set(px,py,pz);
    BUTMESH.g.rotation.y=yaw;
    if(HOLD.d.color==="Rainbow")BUTMESH.mat.color.setHSL((performance.now()/1500)%1,0.9,0.55);
    else BUTMESH.mat.color.set(HOLD.d.hex);
    if(HOLD.d.glitter)BUTMESH.mat.emissive.setHSL((performance.now()/300)%1,0.8,0.3);
    else BUTMESH.mat.emissive.setRGB(0,0,0);
    return;
  }
  const m=HOLD.mesh;
  m.position.set(px,py,pz);
  if(HOLD.d.color==="Rainbow")HOLD.mat.color.setHSL((performance.now()/1500)%1,0.9,0.55);
  if(HOLD.d.glitter)HOLD.mat.emissive.setHSL((performance.now()/300)%1,0.8,0.3);
  else HOLD.mat.emissive.setRGB(0,0,0);
}
/* displaying your dumplings on a table at your MEGA MANSION */
const DISPLAYS=new Map();   // mansion id -> dumplings on the table
/* rainbowMat() lives in world.js now (the museum uses it too) */
function nearMansion(){
  for(let i=mansions.length-1;i>=0;i--){
    const m=mansions[i];
    if(offScene(m.g)){mansions.splice(i,1);continue;}
    const r=m.plot?17:56,r2=m.plot?17:46;
    if(Math.abs(player.x-m.x)<r&&Math.abs(player.z-m.z)<r2)return m;
  }
  return null;
}
function buildDumpTable(m){
  if(m.tableG){m.g.remove(m.tableG);disposeGroup(m.tableG);m.tableG=null;}
  const items=DISPLAYS.get(m.id);
  if(!items||!items.length)return;
  const tg=new THREE.Group();
  const tx=m.x+20,tz=m.z+40;   // ~2 m outside the front wall
  const ty=terrainH(tx,tz);
  const cols=Math.ceil(items.length/2);
  const top=new THREE.Mesh(new THREE.BoxGeometry(Math.max(3,cols*0.9+1),0.14,2.2),new THREE.MeshLambertMaterial({color:0x8a6f4d}));
  top.position.set(tx,ty+0.85,tz);tg.add(top);
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(o=>{
    const l=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.85),new THREE.MeshLambertMaterial({color:0x6f4e37}));
    l.position.set(tx+o[0]*(Math.max(3,cols*0.9+1)/2-0.3),ty+0.42,tz+o[1]*0.8);tg.add(l);
  });
  items.forEach((d,i)=>{
    const mat=d.color==="Rainbow"?rainbowMat():new THREE.MeshLambertMaterial({color:new THREE.Color(d.hex)});
    if(d.glitter&&d.color!=="Rainbow")mat.emissive=new THREE.Color(d.hex).multiplyScalar(0.4);
    const dm=new THREE.Mesh(new THREE.SphereGeometry(0.22,10,8),mat);
    dm.scale.y=0.75;
    dm.position.set(tx-(cols-1)*0.45+Math.floor(i/2)*0.9,ty+1.05,tz-0.45+(i%2)*0.9);
    if(d.glitter)addDumpStars(dm,0.23);
    tg.add(dm);
  });
  m.g.add(tg);m.tableG=tg;
}
window.onMansionBuilt=m=>{if(DISPLAYS.has(m.id))buildDumpTable(m);buildMansionFurniture(m);};
/* build a HUGE list in chunks of 1000 so the page never freezes —
   the first 1000 show right away, the rest keep loading by themselves */
function chunkedList(list,items,makeEl,chunk=1000){
  const token=(list._chunkToken=(list._chunkToken||0)+1);
  let i=0;
  (function step(){
    if(token!==list._chunkToken)return;   // a newer render started — stop this one
    const frag=document.createDocumentFragment(),end=Math.min(items.length,i+chunk);
    for(;i<end;i++)frag.appendChild(makeEl(items[i],i));
    list.appendChild(frag);
    if(i<items.length){
      const more=document.createElement("div");
      more.style.cssText="color:var(--dim);font-size:13px;padding:4px";
      more.textContent="Loading more… "+i+" / "+items.length;
      list.appendChild(more);
      setTimeout(()=>{if(token===list._chunkToken)more.remove();step();},0);
    }
  })();
}
const SQTAB={v:"dump"};   // which Unbox tab is open: dumplings, butter or phones
/* 🔎 search — every word you type must appear somewhere in the item's label */
function qMatch(q,label){
  if(!q)return true;
  label=label.toLowerCase();
  return q.split(/\s+/).every(w=>label.indexOf(w)>=0);
}
function unboxQ(){return $("dumpSearch").value.trim().toLowerCase();}
/* filter a tab's items by the search bar; shows a hint when nothing matches */
function unboxFilter(list,arr,txt){
  const q=unboxQ();
  if(!q)return arr;
  const out=arr.filter(d=>qMatch(q,txt(d)));
  if(arr.length&&!out.length){
    const d=document.createElement("div");
    d.style.cssText="color:var(--dim);font-size:13px";
    d.textContent="\u{1F50E} Nothing here matches “"+$("dumpSearch").value.trim()+"” — try the ⭐ All tab!";
    list.appendChild(d);
  }
  return out;
}
function gadSearchText(d){return d.color+" "+d.m;}
function renderPhoneTab(){
  $("dumpInfo").textContent=PHONE.unopened
    ?"You have "+PHONE.unopened+" unopened phone box"+(PHONE.unopened>1?"es":"")+" — unbox one!"
    :"No phone boxes — buy them at a \u{1F4F1} CoolBlue (the blue & orange store, one every ~500 m)!";
  $("dumpOpen").textContent="\u{1F4F1} Unbox a phone!";
  $("dumpOpenAll").textContent="\u{1F389} Unbox ALL phone boxes!";
  $("dumpOpen").style.display=PHONE.unopened?"":"none";
  $("dumpDisplay").style.display="none";
  const list=$("dumpList");list.innerHTML="";
  if(!PHONE.owned.length){
    const d=document.createElement("div");
    d.style.cssText="color:var(--dim);font-size:13px";
    d.textContent="No phones yet — the newest Pro Max & Ultra models are the rarest pulls!";
    list.appendChild(d);
  }
  chunkedList(list,unboxFilter(list,PHONE.owned.filter(ph=>!isTabletM(ph.m)&&!isComputerM(ph.m)),gadSearchText),ph=>{
    const el=document.createElement("button");
    el.className="dumpItem"+(ph.color==="Rainbow"?" glitter":"")+(HOLD.d===ph?" held":"");
    el.innerHTML="<span class='swatch' style='background:"+ph.hex+"'></span>"
      +(ph.color==="Rainbow"?"\u{1F308} RAINBOW ":ph.color+" ")+ph.m
      +" <span style='color:var(--dim)'>$"+fmtMoney(phoneValue(ph))+"</span>"
      +(HOLD.d===ph?" ✋ holding":"");
    el.onclick=()=>holdPhone(ph);
    return el;
  });
}
/* the 📲 Tablets and 💻 Computers tabs — boxes from CoolBlue, opened HERE */
function renderGadgetTab(pc){
  const C=pc?COMPUTER:TABLET,one=pc?"computer":"tablet",em=pc?"\u{1F4BB}":"\u{1F4F2}";
  $("dumpInfo").textContent=C.unopened
    ?"You have "+C.unopened+" unopened "+one+" box"+(C.unopened>1?"es":"")+" — open one!"
    :"No "+one+" boxes — grab them FREE at a \u{1F4F1} CoolBlue (one every ~500 m)!";
  $("dumpOpen").textContent=em+" Open a "+one+" box!";
  $("dumpOpenAll").textContent="\u{1F389} Open ALL "+one+" boxes!";
  $("dumpOpen").style.display=C.unopened?"":"none";
  $("dumpDisplay").style.display="none";
  const owned=PHONE.owned.filter(ph=>(pc?isComputerM:isTabletM)(ph.m));
  const list=$("dumpList");list.innerHTML="";
  if(!owned.length){
    const d=document.createElement("div");
    d.style.cssText="color:var(--dim);font-size:13px";
    d.textContent=pc?"No computers yet — the iMac ($4,000) and MacBook Pro 16″ ($4,500) are the jackpot pulls!"
      :"No tablets yet — the iPad Pro 13″ ($2,400) is the jackpot pull!";
    list.appendChild(d);
  }
  chunkedList(list,unboxFilter(list,owned,gadSearchText),ph=>{
    const el=document.createElement("button");
    el.className="dumpItem"+(ph.color==="Rainbow"?" glitter":"")+(HOLD.d===ph?" held":"");
    el.innerHTML="<span class='swatch' style='background:"+ph.hex+"'></span>"
      +(ph.color==="Rainbow"?"\u{1F308} RAINBOW ":ph.color+" ")+ph.m
      +" <span style='color:var(--dim)'>$"+fmtMoney(phoneValue(ph))+"</span>"
      +(HOLD.d===ph?" ✋ holding":"");
    el.onclick=()=>holdPhone(ph);
    return el;
  });
}
function renderConsoleTab(){
  $("dumpInfo").textContent=CONSOLE.unopened
    ?"You have "+CONSOLE.unopened+" unopened console box"+(CONSOLE.unopened>1?"es":"")+" — unbox one!"
    :"No console boxes — grab them FREE at a \u{1F4F1} CoolBlue (one every ~500 m)!";
  $("dumpOpen").textContent="\u{1F3AE} Unbox a console!";
  $("dumpOpenAll").textContent="\u{1F389} Unbox ALL console boxes!";
  $("dumpOpen").style.display=CONSOLE.unopened?"":"none";
  $("dumpDisplay").style.display="none";
  const list=$("dumpList");list.innerHTML="";
  if(!CONSOLE.owned.length){
    const d=document.createElement("div");
    d.style.cssText="color:var(--dim);font-size:13px";
    d.textContent="No consoles yet — place one at your home (mansion editor: \u{1F3AE} My console + TV) and PLAY!";
    list.appendChild(d);
  }
  chunkedList(list,unboxFilter(list,CONSOLE.owned,gadSearchText),cs=>{
    const el=document.createElement("button");
    el.className="dumpItem"+(cs.color==="Rainbow"?" glitter":"");
    el.innerHTML="<span class='swatch' style='background:"+cs.hex+"'></span>"
      +(cs.color==="Rainbow"?"\u{1F308} RAINBOW ":cs.color+" ")+cs.m
      +" <span style='color:var(--dim)'>$"+fmtMoney(consoleValue(cs))+"</span>";
    el.onclick=()=>toast("\u{1F3AE} "+cs.m+" ("+cs.yr+") — place it at your home with the mansion editor, or sell it at your market!");
    return el;
  });
}
/* ⭐ the ALL tab: every category in ONE list — made for the 🔎 search bar */
function renderAllTab(){
  const totalUn=DUMP.unopened+BUTTER.unopened+PHONE.unopened+CONSOLE.unopened+TABLET.unopened+COMPUTER.unopened;
  $("dumpInfo").textContent=totalUn
    ?"You have "+totalUn+" unopened box"+(totalUn>1?"es":"")+" across all categories — OPEN ALL BOXES rips through every one!"
    :"Everything you own in one list — type in the \u{1F50E} search bar to find any item!";
  $("dumpOpen").style.display="none";
  $("dumpOpenAll").style.display="none";
  $("dumpDisplay").style.display="none";
  const items=[];
  DUMP.owned.forEach(d=>items.push({em:"\u{1F95F}",txt:(d.glitter?"✨ GLITTER ":"")+d.color+" dumpling",s:(d.glitter?"glitter ":"")+d.color+" dumpling",v:dumpValue(d),d,click:()=>holdDump(d)}));
  BUTTER.owned.forEach(d=>items.push({em:"\u{1F9C8}",txt:(d.glitter?"✨ GLITTER ":"")+butterSizeLabel(d)+d.color+" butter squishy",s:(d.glitter?"glitter ":"")+butterSizeLabel(d)+d.color+" butter squishy",v:butterValue(d),d,click:()=>holdDump(d)}));
  PHONE.owned.forEach(ph=>{
    const em=isComputerM(ph.m)?gadgetEmoji(ph.m):isTabletM(ph.m)?"\u{1F4F2}":"\u{1F4F1}";
    items.push({em,txt:(ph.color==="Rainbow"?"\u{1F308} RAINBOW ":ph.color+" ")+ph.m,s:ph.color+" "+ph.m,v:phoneValue(ph),d:ph,click:()=>holdPhone(ph)});
  });
  CONSOLE.owned.forEach(cs=>items.push({em:"\u{1F3AE}",txt:(cs.color==="Rainbow"?"\u{1F308} RAINBOW ":cs.color+" ")+cs.m,s:cs.color+" "+cs.m,v:consoleValue(cs),d:cs,
    click:()=>toast("\u{1F3AE} "+cs.m+" ("+cs.yr+") — place it at your home with the mansion editor, or sell it at your market!")}));
  const list=$("dumpList");list.innerHTML="";
  if(!items.length){
    const d=document.createElement("div");
    d.style.cssText="color:var(--dim);font-size:13px";
    d.textContent="You own nothing yet — grab boxes at a \u{1F6D2} MEGA MART or \u{1F4F1} CoolBlue and open them!";
    list.appendChild(d);
  }
  chunkedList(list,unboxFilter(list,items,o=>o.s),o=>{
    const el=document.createElement("button");
    el.className="dumpItem"+((o.d.glitter||o.d.color==="Rainbow")?" glitter":"")+(HOLD.d===o.d?" held":"");
    el.innerHTML=o.em+" <span class='swatch' style='background:"+o.d.hex+"'></span>"+o.txt
      +" <span style='color:var(--dim)'>$"+fmtMoney(o.v)+"</span>"+(HOLD.d===o.d?" ✋ holding":"");
    el.onclick=o.click;
    return el;
  });
}
function renderDump(){
  const butter=SQTAB.v==="butter";
  $("dumpTabAll").classList.toggle("on",SQTAB.v==="all");
  $("dumpOpenAll").style.display="";
  $("dumpTabD").classList.toggle("on",SQTAB.v==="dump");
  $("dumpTabB").classList.toggle("on",butter);
  $("dumpTabP").classList.toggle("on",SQTAB.v==="phone");
  $("dumpTabC").classList.toggle("on",SQTAB.v==="console");
  $("dumpTabT").classList.toggle("on",SQTAB.v==="tablet");
  $("dumpTabPC").classList.toggle("on",SQTAB.v==="computer");
  if(SQTAB.v==="all"){renderAllTab();return;}
  if(SQTAB.v==="phone"){renderPhoneTab();return;}
  if(SQTAB.v==="console"){renderConsoleTab();return;}
  if(SQTAB.v==="tablet"){renderGadgetTab(false);return;}
  if(SQTAB.v==="computer"){renderGadgetTab(true);return;}
  const C=butter?BUTTER:DUMP,one=butter?"butter squishy":"dumpling",many=butter?"butter squishies":"dumplings";
  $("dumpInfo").textContent=C.unopened
    ?"You have "+C.unopened+" unopened "+(C.unopened>1?many:one)+" — open one!"
    :"No unopened "+many+" — buy them at a \u{1F6D2} MEGA MART (one every ~3 km, see the map).";
  $("dumpOpen").textContent=(butter?"\u{1F9C8} Open a butter squishy!":"\u{1F95F} Open a dumpling!");
  $("dumpOpenAll").textContent="\u{1F389} Open ALL "+many+"!";
  const list=$("dumpList");list.innerHTML="";
  if(!C.owned.length){
    const d=document.createElement("div");
    d.style.cssText="color:var(--dim);font-size:13px";
    d.textContent=butter
      ?"Your butter collection is empty — MEDIUM ones are 1/200 and MEGA ones 1/600!"
      :"Your collection is empty.";
    list.appendChild(d);
  }
  chunkedList(list,unboxFilter(list,C.owned,d=>(d.glitter?"glitter ":"")+(butter?butterSizeLabel(d):"")+d.color+" "+one),d=>{
    const el=document.createElement("button");
    el.className="dumpItem"+(d.glitter?" glitter":"")+(HOLD.d===d?" held":"");
    el.innerHTML="<span class='swatch' style='background:"+d.hex+"'></span>"
      +(d.glitter?"✨ GLITTER ":"")+(butter?butterSizeLabel(d):"")+d.color+" "+one
      +" <span style='color:var(--dim)'>$"+fmtMoney(butter?butterValue(d):dumpValue(d))+"</span>"
      +(HOLD.d===d?" ✋ holding":"");
    el.onclick=()=>holdDump(d);
    return el;
  });
  const m=nearMansion();
  $("dumpDisplay").style.display=butter?"none":"";
  $("dumpDisplay").textContent=m&&DISPLAYS.has(m.id)?"\u{1F3F0} Remove the dumpling display":"\u{1F3F0} Display your dumplings at your mansion";
  $("dumpOpen").style.display=C.unopened?"":"none";
}
$("dumpTabAll").onclick=()=>{SQTAB.v="all";renderDump();};
$("dumpSearch").oninput=()=>renderDump();
$("dumpTabD").onclick=()=>{SQTAB.v="dump";renderDump();};
$("dumpTabB").onclick=()=>{SQTAB.v="butter";renderDump();};
$("dumpTabP").onclick=()=>{SQTAB.v="phone";renderDump();};
$("dumpTabC").onclick=()=>{SQTAB.v="console";renderDump();};
$("dumpTabT").onclick=()=>{SQTAB.v="tablet";renderDump();};
$("dumpTabPC").onclick=()=>{SQTAB.v="computer";renderDump();};
$("bDump").onclick=()=>{$("dumpSearch").value="";renderDump();$("dumpModal").classList.toggle("open");};
$("dumpClose").onclick=()=>$("dumpModal").classList.remove("open");
function rollDump(){
  DUMP.unopened--;
  const roll=Math.random(),month=new Date().getMonth();
  let color,hex;
  if(month===9&&Math.random()<0.15){color="Pumpkin";hex="#ff7518";}        // 🎃 October special!
  else if(month===11&&Math.random()<0.15){color="Snowy";hex="#eafcff";}    // ❄️ December special!
  else if(roll<0.02){color="Rainbow";hex=RAINBOW_CSS;}             // rare!
  else if(roll<0.08){color="Gold";hex="#ffd700";}
  else{const c=DUMP_COLORS[Math.floor(Math.random()*DUMP_COLORS.length)];color=c[0];hex=c[1];}
  const glitter=Math.random()<0.08;   // rainbow + glitter = VERY rare
  const d={color,hex,glitter};
  DUMP.owned.push(d);
  if(color==="Rainbow"&&glitter)
    pushNews("\u{1F308}✨ BREAKING: "+mpName()+" just opened the LEGENDARY GLITTER RAINBOW dumpling — the rarest in the world!!");
  else if(color==="Rainbow")
    pushNews("\u{1F308} "+mpName()+" opened a rare RAINBOW dumpling!");
  return d;
}
/* butter squishies roll the same colors + glitter, PLUS a size:
   MEDIUM = rare (1/200), MEGA = ultra rare (1/600) */
function rollButter(){
  BUTTER.unopened--;
  const roll=Math.random();
  let color,hex;
  if(roll<0.02){color="Rainbow";hex=RAINBOW_CSS;}
  else if(roll<0.08){color="Gold";hex="#ffd700";}
  else{const c=DUMP_COLORS[Math.floor(Math.random()*DUMP_COLORS.length)];color=c[0];hex=c[1];}
  const glitter=Math.random()<0.08;
  const sr=Math.random();
  const size=sr<1/600?"mega":sr<1/600+1/200?"med":"norm";
  const d={color,hex,glitter,size};
  BUTTER.owned.push(d);
  if(size==="mega"&&color==="Rainbow"&&glitter)
    pushNews("\u{1F9C8}\u{1F308}✨ BREAKING: "+mpName()+" opened a GLITTER RAINBOW MEGA butter squishy — the rarest butter in the universe!!");
  else if(size==="mega")
    pushNews("\u{1F9C8}\u{1F31F} "+mpName()+" opened an ULTRA RARE MEGA butter squishy (1/600)!");
  return d;
}
$("dumpOpen").onclick=()=>{
  if(SQTAB.v==="tablet"||SQTAB.v==="computer"){
    const pc=SQTAB.v==="computer",C=pc?COMPUTER:TABLET;
    if(!C.unopened)return;
    const gd=pc?rollComputer():rollTablet();
    const v=phoneValue(gd);
    if(gd.color==="Rainbow")toast("\u{1F308}"+gadgetEmoji(gd.m)+" NO WAY — a RAINBOW "+gd.m+"!! ($"+fmtMoney(v)+")");
    else if(v>=3500)toast("\u{1F929}"+gadgetEmoji(gd.m)+" JACKPOT — a "+gd.color+" "+gd.m+"! ($"+fmtMoney(v)+")");
    else toast(gadgetEmoji(gd.m)+" You unboxed a "+gd.color+" "+gd.m+"! ($"+fmtMoney(v)+")");
    renderDump();saveGame();return;
  }
  if(SQTAB.v==="console"){
    if(!CONSOLE.unopened)return;
    const cs=rollConsole();
    if(cs.color==="Rainbow")toast("\u{1F308}\u{1F3AE} NO WAY — a RAINBOW "+cs.m+"!! ($"+fmtMoney(consoleValue(cs))+")");
    else if(cs.tier>=9)toast("\u{1F929}\u{1F3AE} JACKPOT — a "+cs.color+" "+cs.m+"! ($"+fmtMoney(consoleValue(cs))+")");
    else toast("\u{1F3AE} You unboxed a "+cs.color+" "+cs.m+"! ($"+fmtMoney(consoleValue(cs))+")");
    renderDump();saveGame();return;
  }
  if(SQTAB.v==="phone"){
    if(!PHONE.unopened)return;
    const ph=rollPhone();
    if(ph.color==="Rainbow")toast("\u{1F308}\u{1F4F1} NO WAY — a RAINBOW "+ph.m+"!! The rarest color! ($"+fmtMoney(phoneValue(ph))+")");
    else if(ph.tier>=13)toast("\u{1F929}\u{1F4F1} JACKPOT — a "+ph.color+" "+ph.m+"! ($"+fmtMoney(phoneValue(ph))+")");
    else toast("\u{1F4F1} You unboxed a "+ph.color+" "+ph.m+"! ($"+fmtMoney(phoneValue(ph))+")");
    renderDump();saveGame();return;
  }
  if(SQTAB.v==="butter"){
    if(!BUTTER.unopened)return;
    const d=rollButter();
    if(d.size==="mega")toast("\u{1F31F}\u{1F9C8} NO WAY — an ULTRA RARE MEGA "+(d.glitter?"GLITTER ":"")+d.color+" butter squishy (1/600)!! ($"+fmtMoney(butterValue(d))+")");
    else if(d.size==="med")toast("\u{1F538}\u{1F9C8} RARE — a MEDIUM "+(d.glitter?"GLITTER ":"")+d.color+" butter squishy (1/200)! ($"+fmtMoney(butterValue(d))+")");
    else if(d.color==="Rainbow"&&d.glitter)toast("\u{1F308}✨ WOW — a GLITTER RAINBOW butter squishy!");
    else toast(d.glitter?"✨\u{1F9C8} A RARE GLITTER "+d.color+" butter squishy!":"\u{1F9C8} You got a "+d.color+" butter squishy!");
    renderDump();saveGame();return;
  }
  if(!DUMP.unopened)return;
  const d=rollDump(),{color,glitter}=d;
  if(color==="Rainbow"&&glitter)toast("\u{1F308}✨ NO WAY!!! A GLITTER RAINBOW DUMPLING — the rarest of all! ($250)");
  else if(color==="Rainbow")toast("\u{1F308}\u{1F95F} WOW — a rare RAINBOW dumpling! ($30)");
  else if(color==="Gold")toast("\u{1F947}\u{1F95F} Shiny — a GOLD"+(glitter?" GLITTER":"")+" dumpling!");
  else toast(glitter?"✨\u{1F95F} WOW — a RARE GLITTER "+color+" dumpling!!":"\u{1F95F} You got a "+color+" dumpling!");
  renderDump();saveGame();
};
/* open EVERY unopened dumpling at once — in batches of 100 so the page
   never freezes, with one big summary at the end */
let OPENALL_BUSY=false;
$("dumpOpenAll").onclick=()=>{
  if(OPENALL_BUSY)return;
  const phone=SQTAB.v==="phone",butter=SQTAB.v==="butter",cons=SQTAB.v==="console",
        tab=SQTAB.v==="tablet",pc=SQTAB.v==="computer";
  const C=phone?PHONE:cons?CONSOLE:tab?TABLET:pc?COMPUTER:butter?BUTTER:DUMP;
  const roll=phone?rollPhone:cons?rollConsole:tab?rollTablet:pc?rollComputer:butter?rollButter:rollDump;
  const val=(phone||tab||pc)?phoneValue:cons?consoleValue:butter?butterValue:dumpValue;
  const many=phone?"phone boxes":cons?"console boxes":tab?"tablet boxes":pc?"computer boxes":butter?"butter squishies":"dumplings";
  if(!C.unopened){toast("No unopened "+many+" — "+((phone||cons||tab||pc)?"grab them FREE at a \u{1F4F1} CoolBlue!":"buy them at a \u{1F6D2} MEGA MART!"));return;}
  OPENALL_BUSY=true;
  const total=C.unopened;
  let opened=0,glit=0,mega=0,best=null,bestVal=-1;
  (function step(){
    let n=0;
    while(C.unopened>0&&n<100){
      const d=roll();n++;opened++;
      if(d.glitter)glit++;
      if(d.size==="mega")mega++;
      const v=val(d);
      if(v>bestVal){bestVal=v;best=d;}
    }
    if(C.unopened>0){
      toast((phone?"\u{1F4F1}":cons?"\u{1F3AE}":tab?"\u{1F4F2}":pc?"\u{1F4BB}":butter?"\u{1F9C8}":"\u{1F95F}")+" Opening "+many+"… "+opened+" / "+total);
      setTimeout(step,0);
    }else{
      OPENALL_BUSY=false;
      toast("\u{1F389} You opened "+opened+" "+many+(glit?" ("+glit+" ✨ GLITTER!)":"")+(mega?" ("+mega+" \u{1F31F} MEGA!!)":"")
        +" — best pull: "+(best.m?best.color+" "+best.m:(best.glitter?"✨ GLITTER ":"")+(butter?butterSizeLabel(best):"")+best.color)+" ($"+fmtMoney(bestVal)+")!");
      renderDump();saveGame();
    }
  })();
};
/* 🎁🎉 OPEN ALL BOXES: rips open EVERY unopened box you own — dumplings,
   butter squishies, phones, consoles, tablets AND computers — in one go.
   batch = boxes per breath: 100 is safe everywhere, 1000 is TURBO mode
   for fast computers (bigger batches block the page longer per step) */
function openEveryBox(batch){
  if(OPENALL_BUSY)return;
  const cats=[
    {C:DUMP,roll:rollDump,val:dumpValue,em:"\u{1F95F}",n:"dumplings"},
    {C:BUTTER,roll:rollButter,val:butterValue,em:"\u{1F9C8}",n:"butter squishies"},
    {C:PHONE,roll:rollPhone,val:phoneValue,em:"\u{1F4F1}",n:"phones"},
    {C:CONSOLE,roll:rollConsole,val:consoleValue,em:"\u{1F3AE}",n:"consoles"},
    {C:TABLET,roll:rollTablet,val:phoneValue,em:"\u{1F4F2}",n:"tablets"},
    {C:COMPUTER,roll:rollComputer,val:phoneValue,em:"\u{1F4BB}",n:"computers"}
  ];
  const total=cats.reduce((s,c)=>s+c.C.unopened,0);
  if(!total){toast("\u{1F381} No unopened boxes ANYWHERE — get more at a \u{1F6D2} MEGA MART or \u{1F4F1} CoolBlue!");return;}
  OPENALL_BUSY=true;
  let opened=0,best=null,bestVal=-1,bestEm="";
  (function step(){
    let n=0;
    while(n<batch){
      const cat=cats.find(c=>c.C.unopened>0);
      if(!cat)break;
      while(cat.C.unopened>0&&n<batch){
        const d=cat.roll();n++;opened++;
        const v=cat.val(d);
        if(v>bestVal){bestVal=v;best=d;bestEm=cat.em;}
      }
    }
    if(cats.some(c=>c.C.unopened>0)){
      toast("\u{1F381} Opening ALL boxes… "+opened+" / "+total);
      setTimeout(step,0);
    }else{
      OPENALL_BUSY=false;
      toast("\u{1F381}\u{1F389} ALL "+opened+" boxes opened! Best pull of everything: "+bestEm+" "
        +(best.m?best.color+" "+best.m:(best.glitter?"✨ GLITTER ":"")+(best.size?butterSizeLabel(best):"")+best.color)
        +" ($"+fmtMoney(bestVal)+")!");
      renderDump();saveGame();
    }
  })();
}
$("dumpOpenEvery").onclick=()=>openEveryBox(100);
$("dumpOpenTurbo").onclick=()=>openEveryBox(1000);
$("dumpDisplay").onclick=()=>{
  const m=nearMansion();
  if(!m){toast("\u{1F3F0} Go to your MEGA MANSION first — there's one every ~2 km (see the map)!");return;}
  if(!rentedAt(m.id)){toast("Rent this mansion first — press T at the RECEPTION inside!");return;}
  if(DISPLAYS.has(m.id)){DISPLAYS.delete(m.id);buildDumpTable(m);toast("Dumplings packed up — display removed.");renderDump();saveGame();return;}
  if(!DUMP.owned.length){toast("You have no dumplings to display — buy some at a MEGA MART!");return;}
  DISPLAYS.set(m.id,DUMP.owned.map(d=>({color:d.color,hex:d.hex,glitter:d.glitter})));
  buildDumpTable(m);
  toast("\u{1F95F} Your dumplings are on a table outside your mansion!");
  renderDump();saveGame();
};
/* ---------- money (everything is still free — it's just for bragging) ---------- */
const MONEY={v:0,rainbow:false};
/* big-number format: K, M, B, T, QA, QI, SX, SP */
function fmtMoney(v){
  if(v<0)return "-"+fmtMoney(-v);   // fines can push you into the red
  const units=[[1e24,"SP"],[1e21,"SX"],[1e18,"QI"],[1e15,"QA"],[1e12,"T"],[1e9,"B"],[1e6,"M"],[1e3,"K"]];
  for(const[m,s]of units)if(v>=m){
    const n=v/m;
    let str=n>=100?String(Math.round(n)):n>=10?n.toFixed(1):n.toFixed(2);
    str=str.replace(/\.0+$/,"").replace(/(\.\d*[1-9])0+$/,"$1");
    return str+s;
  }
  return String(v);
}
function updateMoneyUI(){
  const t="$"+fmtMoney(MONEY.v),red=MONEY.v<0;
  $("moneyTxt").textContent=t;
  $("moneyTxt").classList.toggle("rainbow",MONEY.rainbow&&!red);
  $("moneyTxt").style.color=red?"var(--bad)":"";
  $("mmVal").textContent=t;
  $("mmVal").classList.toggle("rainbow",MONEY.rainbow&&!red);
  $("mmVal").style.color=red?"var(--bad)":"";
}
/* fines ALWAYS get paid — not enough money means you go into the MINUS */
function payFine(amount,label){
  MONEY.v-=amount;
  updateMoneyUI();saveGame();profileSave();
  if(MONEY.v<0)toast("\u{1F4B8} "+label+" — you didn't have enough, so you're at $"+fmtMoney(MONEY.v)+" now. Earn it back!");
}
function addMoney(n){
  MONEY.v+=n;
  if(MONEY.v>=1000&&!MONEY.rainbow){
    MONEY.rainbow=true;
    toast("\u{1F308} $1,000! Your money text is RAINBOW forever!!");
  }
  updateMoneyUI();saveGame();profileSave();
}
$("bMoney").onclick=()=>{updateMoneyUI();renderPayList();$("moneyModal").classList.toggle("open");};
$("moneyClose").onclick=()=>$("moneyModal").classList.remove("open");
/* ---------- fuel: cars & motorcycles run dry after 699 km — fill up at ⛽ gas stations ---------- */
const FUEL={cap:699,km:699,warned:false};
function fuelVehicle(){return myVehicle&&myVehicle.type!=="bike";}
function nearGasSt(){
  for(let i=gasStations.length-1;i>=0;i--){
    const s=gasStations[i];
    if(offScene(s.g)){gasStations.splice(i,1);continue;}
    if(Math.hypot(player.x-s.x,player.z-s.z)<18)return s;
  }
  return null;
}
function updateFuel(dt,speedMS){
  if(player.drive!==myVehicle||!fuelVehicle()||S.world!=="earth")return;
  const before=FUEL.km;
  FUEL.km=Math.max(0,FUEL.km-speedMS*dt/1000);
  if(FUEL.km===0&&before>0)toast("⛽ OUT OF GAS! Your engine died — get to a gas station and press T.");
  else if(FUEL.km<50&&!FUEL.warned){FUEL.warned=true;toast("⛽ Low fuel — less than 50 km left! Find a GAS station (one every ~840 m).");}
  if(FUEL.km>50)FUEL.warned=false;
}
function tryRefuel(){
  const gs=nearGasSt();
  if(!gs||!fuelVehicle())return false;
  if(Math.hypot(player.x-myVehicle.x,player.z-myVehicle.z)>25){toast("⛽ Bring your car to the pumps first!");return true;}
  if(FUEL.km>=FUEL.cap-1){toast("⛽ Your tank is already full ("+FUEL.cap+" km)!");return true;}
  const missing=FUEL.cap-FUEL.km;
  const cost=Math.min(MONEY.v,Math.ceil(missing*0.05));
  FUEL.km=FUEL.cap;
  if(cost>0){MONEY.v-=cost;updateMoneyUI();profileSave();}
  saveGame();
  toast("⛽ Filled up +"+Math.round(missing)+" km"+(cost>0?" — paid $"+cost:" — on the house!"));
  return true;
}
/* ---------- caves: walk up to a mountain cave mouth and press T to go inside ---------- */
const CAVE={in:false,rx:0,rz:0,cx:0,cz:0,fy:-648,room:null,crystals:[]};
function nearCaveEntrance(){
  for(let i=caves.length-1;i>=0;i--){
    const c=caves[i];
    if(offScene(c.g)){caves.splice(i,1);continue;}
    if(Math.hypot(player.x-c.x,player.z-c.z)<10)return c;
  }
  return null;
}
function buildCaveRoom(){
  const g=new THREE.Group(),y=CAVE.fy,cx=CAVE.cx,cz=CAVE.cz;
  const rock=new THREE.MeshLambertMaterial({color:0x3f3a35});
  const rock2=new THREE.MeshLambertMaterial({color:0x55504a});
  const floor=new THREE.Mesh(new THREE.BoxGeometry(46,1,34),rock2);floor.position.set(cx,y-0.5,cz);g.add(floor);
  const ceil=new THREE.Mesh(new THREE.BoxGeometry(46,1,34),rock);ceil.position.set(cx,y+7.5,cz);g.add(ceil);
  [[0,-17.5,46,1],[0,17.5,46,1],[-23.5,0,1,36],[23.5,0,1,36]].forEach(p=>{
    const w=new THREE.Mesh(new THREE.BoxGeometry(p[2],9,p[3]),rock);
    w.position.set(cx+p[0],y+3.5,cz+p[1]);g.add(w);});
  /* stalagmites & stalactites */
  const sr=rng(Math.round(cx*13+cz*7));
  for(let i=0;i<14;i++){
    const sx=cx+(sr()-0.5)*38,sz2=cz+(sr()-0.5)*26;
    if(Math.hypot(sx-cx,sz2-cz)<4)continue;
    const up=sr()<0.5;
    const cone=new THREE.Mesh(new THREE.ConeGeometry(0.4+sr()*0.5,1.4+sr()*2.4,7),rock2);
    if(up)cone.position.set(sx,y+0.7,sz2);
    else{cone.rotation.x=Math.PI;cone.position.set(sx,y+6.4,sz2);}
    g.add(cone);
  }
  /* glowing crystals — walk into them to collect ($1,000 each!). Each cave
     remembers which crystals were taken; they respawn after 30 minutes. */
  CAVE.crystals=[];
  const taken=caveTaken();
  const cols=[0x7df9ff,0xb388ff,0x7cff9e];
  for(let i=0;i<3;i++){
    const a=i*2.1+0.6,d=8+i*3;
    const px=cx+Math.sin(a)*d,pz=cz+Math.cos(a)*d*0.6;
    const gone=taken[i]&&Date.now()-taken[i]<CAVE_RESPAWN;
    const cr=new THREE.Mesh(new THREE.OctahedronGeometry(0.7),new THREE.MeshBasicMaterial({color:cols[i]}));
    cr.position.set(px,y+0.9,pz);cr.visible=!gone;g.add(cr);
    const lt=new THREE.PointLight(cols[i],gone?0:0.8,14);lt.position.set(px,y+2,pz);g.add(lt);
    CAVE.crystals.push({mesh:cr,x:px,z:pz,got:gone,idx:i});
  }
  const lamp=new THREE.PointLight(0xffc38a,0.9,44);lamp.position.set(cx,y+5,cz);g.add(lamp);
  /* glowing exit mat */
  const mat=new THREE.Mesh(new THREE.PlaneGeometry(3,3),new THREE.MeshBasicMaterial({color:0x4ade80}));
  mat.rotation.x=-Math.PI/2;mat.position.set(cx,y+0.06,cz+14);g.add(mat);
  scene.add(g);
  CAVE.room=g;
}
function enterCave(c){
  if(player.drive){
    if(player.drive===myVehicle&&Math.abs(myVehicle.speed)>3){toast("Slow down before entering the cave!");return;}
    player.drive=null;
  }
  CAVE.rx=c.x;CAVE.rz=c.z+7;
  CAVE.cx=Math.round(c.x);CAVE.cz=Math.round(c.z);
  if(CAVE.room){scene.remove(CAVE.room);disposeGroup(CAVE.room);CAVE.room=null;}
  buildCaveRoom();
  CAVE.in=true;
  player.onFoot=true;player.mesh.visible=true;player.vy=0;player.grounded=true;
  player.x=CAVE.cx;player.z=CAVE.cz+10;player.y=CAVE.fy;
  toast("\u{1F573}️ You entered the cave — grab the glowing crystals! Press T to go back outside.");
}
function exitCave(silent){
  CAVE.in=false;
  if(BOSS.on)endBoss();
  if(CAVE.room){scene.remove(CAVE.room);disposeGroup(CAVE.room);CAVE.room=null;}
  player.x=CAVE.rx;player.z=CAVE.rz;
  player.y=terrainH(player.x,player.z);player.vy=0;player.grounded=true;
  if(!silent)toast("\u{1F31E} Back outside — the cave stays right here.");
}
/* which crystals of THIS cave were taken (and when) — respawn after 30 min */
const CAVE_RESPAWN=30*60*1000;
function caveKey(){return "vc4cavec:"+CAVE.cx+","+CAVE.cz;}
function caveTaken(){
  try{const d=JSON.parse(localStorage.getItem(caveKey())||"{}");return d&&typeof d==="object"?d:{};}catch(e){return{};}
}
function markCaveTaken(i){
  const d=caveTaken();d[i]=Date.now();
  try{localStorage.setItem(caveKey(),JSON.stringify(d));}catch(e){}
}
function updateCave(){
  if(!CAVE.in)return;
  for(const cr of CAVE.crystals){
    if(cr.got)continue;
    cr.mesh.rotation.y+=0.03;
    if(Math.hypot(player.x-cr.x,player.z-cr.z)<2){
      cr.got=true;cr.mesh.visible=false;
      markCaveTaken(cr.idx);
      addMoney(1000);
      toast("\u{1F48E} Crystal collected — +$1,000! (it grows back in 30 minutes)");
    }
  }
  updateBoss();
}
