/* ================= DATA ================= */
const $=id=>document.getElementById(id);
function rng(seed){let a=seed;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const COLORS=[0xd7263d,0x1b98e0,0xf4d35e,0x2ec4b6,0xff7f11,0x9b5de5,0xefefef,0x3a3a3a,0x8ac926,0xff5d8f,0x0f4c81,0xb56576];
const EMOJI={car:"\u{1F697}",moto:"\u{1F3CD}\uFE0F",bike:"\u{1F6B2}",camper:"\u{1F690}"};
/* campers: your home on wheels \u2014 sleep & live in them! [name, top speed, price] */
const CAMPERS=[["Cozy Camper",110,50000],["Beach Bus",115,70000],["Family Roadhome",120,95000],
  ["Adventure Rig",128,130000],["Snow Explorer",134,170000],["Royal Cruiser",140,210000],
  ["Star Voyager",148,255000],["MEGA MANSION RV",155,300000]];
const CAMPER_PRICE={};CAMPERS.forEach(c=>CAMPER_PRICE[c[0]]=c[2]);
const CARS=[["Koenigsegg Jesko Absolut",500],["Bugatti Chiron Super Sport",490],["Hennessey Venom F5",484],["SSC Tuatara",474],["Koenigsegg Agera RS",447],["Bugatti Veyron Super Sport",431],["Rimac Nevera",412],["McLaren Speedtail",403],["Aston Martin Valkyrie",402],["Tesla Roadster",400],["Koenigsegg Gemera",400],["Pagani Huayra",383],["Lamborghini Aventador SVJ",352],["Mercedes-AMG One",352],["Ferrari LaFerrari",350],["Lamborghini Revuelto",350],["McLaren P1",350],["Ferrari Enzo",350],["Ferrari SF90 Stradale",340],["McLaren 720S",341],["Ferrari 488 Pista",340],["Ferrari F8 Tributo",340],["Aston Martin DBS Superleggera",340],["Bentley Continental GT Speed",335],["Porsche Carrera GT",334],["Audi R8 V10 Performance",331],["Porsche 911 Turbo S",330],["Dodge Challenger SRT Hellcat",327],["Lamborghini Huracan Evo",325],["Mercedes-AMG GT Black Series",325],["Lexus LFA",325],["Maserati MC20",325],["Tesla Model S Plaid",322],["Cadillac CT5-V Blackwing",322],["Lotus Evija",320],["Dodge Charger SRT",320],["Chevrolet Camaro ZL1",318],["Nissan GT-R Nismo",315],["Aston Martin Vantage",314],["Chevrolet Corvette Z06",312],["Honda NSX",307],["BMW M5 CS",305],["Audi RS6 Avant",305],["Jaguar F-Type R",300],["Ford Mustang Shelby GT500",290],["Mercedes-AMG C63 S",290],["BMW M3 Competition",290],["Lotus Emira",290],["Honda Civic Type R",272],["Volkswagen Golf R",270],["Ford Focus RS",266],["Kia EV6 GT",260],["Renault Megane RS Trophy",260],["Porsche Taycan Turbo S",260],["Subaru WRX STI",255],["Toyota GR Supra",250],["Alpine A110",250],["Hyundai i30 N",250],["Mini John Cooper Works",246],["Mazda MX-5",219]];
const MOTOS=[["Kawasaki Ninja H2R",400],["Kawasaki Ninja H2",337],["Suzuki Hayabusa",312],["Aprilia RSV4 Factory",305],["BMW S1000RR",303],["MV Agusta F4",302],["Ducati Panigale V4 R",299],["Honda CBR1000RR-R Fireblade",299],["Yamaha YZF-R1",299],["Suzuki GSX-R1000",299],["Kawasaki ZX-10R",299],["Ducati Streetfighter V4",290],["KTM 1290 Super Duke R",289],["Aprilia Tuono V4",270],["Triumph Speed Triple RS",260],["Ducati Monster",250],["Triumph Rocket 3",250],["Yamaha MT-09",230],["Yamaha YZF-R7",222],["BMW R1250GS",219],["Honda Africa Twin",214],["Harley-Davidson Sportster S",190],["Honda Gold Wing",180],["Harley-Davidson Fat Boy",180],["KTM 390 Duke",167]];
const BIKES=[["Trek Madone SLR 9",48],["Specialized S-Works Tarmac",47],["Pinarello Dogma F",47],["Cervelo S5",47],["Canyon Aeroad CFR",46],["Bianchi Oltre RC",46],["Cannondale SuperSix Evo",46],["Giant TCR Advanced",45],["Scott Foil RC",45],["BMC Teammachine",44],["Santa Cruz Hightower",38],["Trek Marlin 8",32],["Giant Talon 1",30],["VanMoof S5",27],["Gazelle CityGo",25]];
const VEHICLES=[];
{const r=rng(5);
 CARS.forEach((c,i)=>VEHICLES.push({type:"car",name:c[0],top:c[1],color:i===0?0xffb02e:COLORS[Math.floor(r()*COLORS.length)]}));
 MOTOS.forEach(c=>VEHICLES.push({type:"moto",name:c[0],top:c[1],color:COLORS[Math.floor(r()*COLORS.length)]}));
 BIKES.forEach(c=>VEHICLES.push({type:"bike",name:c[0],top:c[1],color:COLORS[Math.floor(r()*COLORS.length)]}));
 CAMPERS.forEach(c=>VEHICLES.push({type:"camper",name:c[0],top:c[1],color:COLORS[Math.floor(r()*COLORS.length)]}));}
const TYPE_LABEL={car:"Car",moto:"Motorcycle",bike:"Bicycle",camper:"Camper — live & sleep in it!"};
/* ---- vehicle ownership: you start with one of each, the rest cost money ---- */
const DEFAULT_OWNED=["Mazda MX-5","KTM 390 Duke","Gazelle CityGo"];
const OWN=new Set(DEFAULT_OWNED);
const PAINT={};   // vehicle name -> the paint color you chose in the garage
/* car prices scale with top speed: slowest car $20K ... fastest car $300K */
const CAR_TOP_MIN=Math.min(...CARS.map(c=>c[1])),CAR_TOP_MAX=Math.max(...CARS.map(c=>c[1]));
function vehPrice(v){
  if(v.type==="camper")return CAMPER_PRICE[v.name]||50000;
  if(v.type==="car"){
    const f=(v.top-CAR_TOP_MIN)/(CAR_TOP_MAX-CAR_TOP_MIN);
    return Math.round((20000+f*280000)/100)*100;
  }
  const d=v.type==="moto"?40:8;
  return Math.max(50,Math.round(v.top*v.top/d/10)*10);
}
function paintOf(v){return v&&PAINT[v.name]!==undefined?PAINT[v.name]:(v?v.color:0x3fd0ff);}
const S={unit:"kmh",mode:"menu",filter:"all",traffic:true,admin:false,arrest:true,camMode:0,selected:null,km:0,world:"earth"};
const BONUS={car:0,train:0,plane:0,bus:0,rocket:0};
const ACC={on:false,target:100}; // cruise control (km/h)
let admTarget="car";
const CAM_NAMES=["Chase","Close","First person","Top down"];
function uConv(k){return S.unit==="kmh"?k:k*0.621371}
function uLabel(){return S.unit==="kmh"?"km/h":"mph"}

/* ================= GAME TIME (1 real second = 5 game minutes) ================= */
const CLOCK={min:8*60,day:1};
/* on a SERVER (named world) everyone shares the same clock: game time is
   derived from the real-world clock, so all players see the same day & night */
const SHARED_T0=1767225600000;   // 2026-01-01 — shared time starts counting here
function clockTick(dt){
  if(typeof WORLD!=="undefined"&&WORLD.name){
    const tm=(Date.now()-SHARED_T0)/200;   // 1 real second = 5 game minutes
    CLOCK.day=Math.floor(tm/1440)+1;
    CLOCK.min=((tm%1440)+1440)%1440;
    return;
  }
  CLOCK.min+=dt*300/60; if(CLOCK.min>=1440){CLOCK.min-=1440;CLOCK.day++;}
}
function dayFrac(){return CLOCK.min/1440;}
function isNight(){const f=dayFrac();return f<0.23||f>0.81;}
/* traffic-light phase: 40 game-minutes = 8 real seconds per green, so the
   lights no longer strobe (they used to flip every 0.3 real seconds) */
function lightPhase(){return Math.floor(CLOCK.min/40)%2;}

/* ================= MENU / BASIC UI ================= */
function renderMenu(){
  const g=$("grid"),srv=S.filter==="servers",wrl=S.filter==="worlds";
  $("serverPanel").classList.toggle("show",srv);
  $("worldsPanel").classList.toggle("show",wrl);
  g.style.display=(srv||wrl)?"none":"grid";
  if(srv){if(window.renderServers)renderServers();return;}
  if(wrl){if(window.renderWorldsTab)renderWorldsTab();return;}
  g.innerHTML="";
  VEHICLES.filter(v=>S.filter==="all"||v.type===S.filter).forEach(v=>{
    const b=document.createElement("button");
    const owned=OWN.has(v.name);
    b.className="card"+(v.top===500?" fastest":"")+(owned?"":" locked");
    b.innerHTML=`<div class="icon">${EMOJI[v.type]}</div>
      <div class="nm"><span class="swatch" style="background:#${paintOf(v).toString(16).padStart(6,"0")}"></span>${v.name}</div>
      <div class="ty">${TYPE_LABEL[v.type]}</div>
      <div class="sp">&#9889; ${Math.round(uConv(v.top))} ${uLabel()} top speed</div>
      <div class="pr ${owned?"own":"buy"}">${owned?"✅ OWNED — tap to open your garage":"\u{1F4B0} $"+fmtMoney(vehPrice(v))+" — tap to buy"}</div>`;
    b.onclick=()=>selectVehicle(v);
    g.appendChild(b);
  });
}
document.querySelectorAll("#tabs .tab").forEach(t=>t.onclick=()=>{
  document.querySelectorAll("#tabs .tab").forEach(x=>x.classList.remove("on"));
  t.classList.add("on");S.filter=t.dataset.f;renderMenu();
});
$("mSettings").onclick=$("bSettings").onclick=()=>$("settings").classList.add("open");
$("setClose").onclick=()=>$("settings").classList.remove("open");
$("bControls").onclick=()=>$("controls").classList.add("open");
$("ctrClose").onclick=()=>$("controls").classList.remove("open");
$("uKmh").onclick=()=>setUnit("kmh");$("uMph").onclick=()=>setUnit("mph");
function setUnit(u){S.unit=u;$("uKmh").classList.toggle("on",u==="kmh");$("uMph").classList.toggle("on",u==="mph");
  $("spdUnit").textContent=uLabel().toUpperCase();renderMenu();updateLimitUI();}
function toast(msg){const t=$("toast");t.textContent=msg;t.style.opacity=1;clearTimeout(t._x);t._x=setTimeout(()=>t.style.opacity=0,2400);}
