/* ================= THREE / SKY ================= */
const renderer=new THREE.WebGLRenderer({canvas:$("c3d"),antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
/* filmic tone mapping + sRGB output = much richer, more realistic light & colors */
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.12;
/* graphics quality: low = fast (no shadows), high = extra sharp */
function setQuality(q){
  renderer.setPixelRatio(q==="low"?1:Math.min(devicePixelRatio,q==="high"?1.75:1.5));
  sun.castShadow=q!=="low";
  const sz=q==="high"?2048:1024;
  sun.shadow.mapSize.set(sz,sz);
  if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}
}
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x8ec9f0);
scene.fog=new THREE.Fog(0x9fd0f0,200,640);
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,0.1,3200);
camera.position.set(0,30,40);
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
resize();addEventListener("resize",resize);
renderer.domElement.addEventListener("webglcontextlost",e=>{e.preventDefault();location.reload();});
const hemi=new THREE.HemisphereLight(0xcfe8ff,0x5a7d4a,0.9);scene.add(hemi);
/* a simple sky/ground environment map: metallic car paint & glass REFLECT it */
{
  const faces=[];
  for(let i=0;i<6;i++){
    const cv=document.createElement("canvas");cv.width=cv.height=64;
    const c=cv.getContext("2d");
    if(i===2){c.fillStyle="#7fb8e8";c.fillRect(0,0,64,64);}          // up: blue sky
    else if(i===3){c.fillStyle="#5b6b52";c.fillRect(0,0,64,64);}     // down: ground
    else{
      const gr=c.createLinearGradient(0,0,0,64);
      gr.addColorStop(0,"#8ec9f0");gr.addColorStop(0.6,"#e8f2fa");
      gr.addColorStop(0.62,"#77876b");gr.addColorStop(1,"#55624e");
      c.fillStyle=gr;c.fillRect(0,0,64,64);
    }
    faces.push(cv);
  }
  const envTex=new THREE.CubeTexture(faces);
  envTex.needsUpdate=true;
  scene.environment=envTex;   // lives on the scene itself — never chunk-disposed
}
/* the sun gets a real GLARE halo */
const sunFlare=(function(){
  const cv=document.createElement("canvas");cv.width=cv.height=128;
  const c=cv.getContext("2d");
  const g=c.createRadialGradient(64,64,2,64,64,64);
  g.addColorStop(0,"rgba(255,246,220,1)");
  g.addColorStop(0.22,"rgba(255,232,170,0.5)");
  g.addColorStop(1,"rgba(255,220,130,0)");
  c.fillStyle=g;c.fillRect(0,0,128,128);
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthWrite:false,depthTest:false}));
  s.scale.set(280,280,1);
  scene.add(s);
  return s;
})();
const sun=new THREE.DirectionalLight(0xfff3d6,1.15);
sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-260,right:260,top:260,bottom:-260,far:1400});
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias=-0.0004;sun.shadow.normalBias=0.6;
scene.add(sun);
const sunTarget=new THREE.Object3D();scene.add(sunTarget);sun.target=sunTarget;
const sunBall=new THREE.Mesh(new THREE.SphereGeometry(26,16,16),new THREE.MeshBasicMaterial({color:0xffe08a,fog:false}));scene.add(sunBall);
const moonBall=new THREE.Mesh(new THREE.SphereGeometry(18,16,16),new THREE.MeshBasicMaterial({color:0xe8ecf5,fog:false}));scene.add(moonBall);
/* stars */
const stars=(function(){
  const n=900,pos=new Float32Array(n*3),r=rng(31);
  for(let i=0;i<n;i++){
    const th=r()*Math.PI*2,ph=Math.acos(r()*0.95);
    pos[i*3]=Math.sin(ph)*Math.cos(th)*1500;
    pos[i*3+1]=Math.cos(ph)*1500;
    pos[i*3+2]=Math.sin(ph)*Math.sin(th)*1500;
  }
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.BufferAttribute(pos,3));
  const m=new THREE.Points(g,new THREE.PointsMaterial({color:0xffffff,size:2.4,transparent:true,opacity:0,fog:false,sizeAttenuation:false}));
  scene.add(m);return m;
})();
/* clouds */
const clouds=[];
{
  const cm=new THREE.MeshLambertMaterial({color:0xffffff,transparent:true,opacity:0.85});
  const r=rng(77);
  for(let i=0;i<12;i++){
    const g=new THREE.Group();
    for(let j=0;j<4;j++){
      const s=new THREE.Mesh(new THREE.SphereGeometry(10+r()*14,8,8),cm);
      s.scale.y=0.45;s.position.set((r()-0.5)*40,(r()-0.5)*6,(r()-0.5)*22);g.add(s);
    }
    g.position.set((r()-0.5)*1400,150+r()*90,(r()-0.5)*1400);
    scene.add(g);clouds.push(g);
  }
}
const skyDay=new THREE.Color(0x8ec9f0),skyNight=new THREE.Color(0x0a1028),skyDusk=new THREE.Color(0xf2a35e);
const _sunLow=new THREE.Color(0xffb46b),_sunHigh=new THREE.Color(0xfff6e0);
const fogDay=new THREE.Color(0x9fd0f0),fogNight=new THREE.Color(0x0c1226);
/* a real gradient SKY DOME: deep blue overhead melting into a bright horizon —
   sunsets now glow like the real thing instead of one flat color */
const skyDome=(function(){
  const mat=new THREE.ShaderMaterial({
    side:THREE.BackSide,fog:false,depthWrite:false,
    uniforms:{top:{value:new THREE.Color(0x6fb4e8)},bot:{value:new THREE.Color(0xe8f2fa)}},
    vertexShader:"varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader:"uniform vec3 top;uniform vec3 bot;varying vec3 vP;void main(){float h=normalize(vP).y*0.5+0.5;gl_FragColor=vec4(mix(bot,top,pow(max(h,0.0),0.55)),1.0);}"
  });
  const m=new THREE.Mesh(new THREE.SphereGeometry(2400,20,14),mat);
  m.renderOrder=-10;m.frustumCulled=false;
  scene.add(m);
  return m;
})();
function updateSky(px,pz){
  if(S.world!=="earth"&&S.world!=="mc"){
    /* no atmosphere: dark sky in the planet's own tint, stars always out */
    const P=curPlanet()||PLANETS.moon;
    scene.background=new THREE.Color(P.sky);
    skyDome.position.set(px,0,pz);
    skyDome.material.uniforms.top.value.set(P.sky);
    skyDome.material.uniforms.bot.value.set(P.sky2);
    scene.fog.color.set(P.sky);scene.fog.near=900;scene.fog.far=2600;
    stars.material.opacity=0.95;
    sun.intensity=1.25;hemi.intensity=0.4;
    sun.position.set(px+400,520,pz+140);
    sunTarget.position.set(px,0,pz);
    sunBall.position.set(px+900,700,pz+280);sunBall.visible=true;
    moonBall.visible=false;
    earthBall.visible=true;earthBall.position.set(px-750,640,pz-520);
    return;
  }
  scene.fog.near=200;scene.fog.far=640;
  earthBall.visible=false;
  const f=dayFrac();
  const ang=(f-0.25)*Math.PI*2;                 // 06:00 sunrise, 18:00 sunset
  const sy=Math.sin(ang),sx=Math.cos(ang);
  const dist=600;
  sun.position.set(px+sx*dist,sy*dist,pz+120);
  sunTarget.position.set(px,0,pz);
  sunBall.position.set(px+sx*1400,sy*1400,pz+300);
  moonBall.position.set(px-sx*1400,-sy*1400,pz-300);
  const dayness=THREE.MathUtils.clamp(sy*2.2+0.25,0,1);
  const duskness=THREE.MathUtils.clamp(1-Math.abs(sy)*5,0,1)*dayness;
  sun.intensity=0.15+dayness*1.05;
  /* golden-hour light: the sun goes warm & orange when it sits low */
  sun.color.copy(_sunLow).lerp(_sunHigh,THREE.MathUtils.clamp(sy*3,0,1));
  hemi.intensity=0.25+dayness*0.7;
  const sky=skyNight.clone().lerp(skyDay,dayness).lerp(skyDusk,duskness*0.55);
  scene.background=sky;
  /* the gradient dome: darker zenith, glowing horizon (orange at dusk) */
  skyDome.position.set(px,0,pz);
  skyDome.material.uniforms.top.value.copy(sky).multiplyScalar(0.8);
  skyDome.material.uniforms.bot.value.copy(sky)
    .lerp(new THREE.Color(0xfff1d6),0.35+duskness*0.45)
    .lerp(skyDusk,duskness*0.4);
  scene.fog.color.copy(fogNight.clone().lerp(fogDay,dayness));
  stars.material.opacity=THREE.MathUtils.clamp(1-dayness*1.8,0,0.95);
  sunBall.visible=sy>-0.08;moonBall.visible=sy<0.12;
  sunFlare.position.copy(sunBall.position);
  sunFlare.material.opacity=THREE.MathUtils.clamp(dayness,0,1)*0.9;
  sunFlare.visible=sy>-0.05;
}
/* ================= TERRAIN, BIOMES, ROAD NETWORK ================= */
function h2i(ix,iz){let n=ix*374761393+iz*668265263;n=(n^(n>>>13))*1274126177;return((n^(n>>>16))>>>0)/4294967295;}
function vnoise(x,z){const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz;
  const a=h2i(ix,iz),b=h2i(ix+1,iz),c=h2i(ix,iz+1),d=h2i(ix+1,iz+1);
  const u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);
  return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function fbm(x,z){return vnoise(x,z)*0.55+vnoise(x*2.13+11.7,z*2.13+5.9)*0.28+vnoise(x*4.31+3.3,z*4.31+8.1)*0.17;}
function sstep(e0,e1,v){const t=Math.min(1,Math.max(0,(v-e0)/(e1-e0)));return t*t*(3-2*t);}
const STZ=50,ACELL=1200,SCELL=1200,RAILSP=960;   // an airport every 1.2 km, forever
function airportLocal(x,z){const i=Math.round(x/ACELL),j=Math.round(z/ACELL);return{lx:x-i*ACELL,lz:z-j*ACELL,i,j};}
function inAirport(x,z){const a=airportLocal(x,z);return a.lx>250&&a.lx<580&&Math.abs(a.lz+40)<70;}
/* ---- stunt parks: one every ~3.6 km, on a flattened block ---- */
function stuntPos(i,j){
  return{x:Math.round((i*3600+1800-90)/120)*120+90,z:Math.round((j*3600+600-90)/120)*120+90};
}
function stuntDist(x,z){
  const p=stuntPos(Math.round((x-1800)/3600),Math.round((z-600)/3600));
  return Math.hypot(x-p.x,z-p.z);
}
function flatMask(x,z){
  let f=1-sstep(190,330,Math.max(Math.abs(x),Math.abs(z)));                               // downtown
  const a=airportLocal(x,z);                                                               // airports repeat
  f=Math.max(f,(1-sstep(50,80,Math.abs(a.lz+40)))*(1-sstep(0,1,Math.max(0,260-a.lx)))*(1-sstep(560,595,a.lx)));
  f=Math.max(f,1-sstep(60,95,Math.hypot(x+340,z-260)));                                    // zoo
  f=Math.max(f,1-sstep(44,62,Math.hypot(x-450,z-330)));                                    // church square
  f=Math.max(f,1-sstep(34,70,rocketPadDist(x,z)));                                         // rocket pads
  f=Math.max(f,1-sstep(48,84,stuntDist(x,z)));                                             // stunt parks
  return Math.min(1,f);
}
/* ---- rocket stations: one every ~5 km, in BOTH worlds at the same spots ---- */
const RCELL=4800;
function rocketPadPos(i,j){return{x:i*RCELL+2400,z:j*RCELL+2400};}
function rocketPadDist(x,z){
  const i=Math.round((x-2400)/RCELL),j=Math.round((z-2400)/RCELL);
  return Math.hypot(x-(i*RCELL+2400),z-(j*RCELL+2400));
}
function nearestRocketPad(x,z){
  const i=Math.round((x-2400)/RCELL),j=Math.round((z-2400)/RCELL);
  const p=rocketPadPos(i,j);p.d=Math.hypot(x-p.x,z-p.z);return p;
}
/* the sea: big soft patches of open water (never downtown / airports) */
function seaAt(x,z){return sstep(0.64,0.76,fbm(x/1500+71.3,z/1500+42.7));}
/* ---- FERRY ISLANDS: real islands out in the deep sea, one candidate every ~2.2 km ---- */
const ISP=2200;
const _islCache=new Map();
function islandSpot(i,j){
  const k=i+","+j;
  if(_islCache.has(k))return _islCache.get(k);
  let s=null;
  const x=i*ISP+900,z=j*ISP+1500;
  if(seaAt(x,z)>0.9){
    s={x,z};
    for(const[ox,oz]of[[-95,0],[95,0],[0,-95],[0,95]])
      if(seaAt(x+ox,z+oz)<0.7){s=null;break;}
  }
  _islCache.set(k,s);
  return s;
}
function nearIsland(x,z){
  return islandSpot(Math.round((x-900)/ISP),Math.round((z-1500)/ISP));
}
/* ---- VOLCANO ISLANDS: rare, tall, smoking — they ERUPT on the shared clock ---- */
const VOLC=9000;
const _volCache=new Map();
function volcanoSpot(i,j){
  const k=i+","+j;
  if(_volCache.has(k))return _volCache.get(k);
  let s=null;
  const x=i*VOLC+4200,z=j*VOLC+7800;
  if(seaAt(x,z)>0.9){
    s={x,z};
    for(const[ox,oz]of[[-135,0],[135,0],[0,-135],[0,135]])
      if(seaAt(x+ox,z+oz)<0.7){s=null;break;}
  }
  _volCache.set(k,s);
  return s;
}
function nearVolcano(x,z){
  return volcanoSpot(Math.round((x-4200)/VOLC),Math.round((z-7800)/VOLC));
}
function moist(x,z){return fbm(x/900+51.7,z/900+23.9);}
function biomeAt(x,z){const m=moist(x,z);return m<0.40?"desert":(m>0.60?"forest":"plains");}
/* two-generation cache: when full, the old generation is dropped instead of
   wiping everything, so there is never a full-recompute freeze spike */
let _bhNew=new Map(),_bhOld=new Map();
function baseH(x,z){
  const key=Math.round(x*2)*131072+Math.round(z*2);
  let v=_bhNew.get(key);
  if(v!==undefined)return v;
  v=_bhOld.get(key);
  if(v===undefined)v=baseH_(Math.round(x*2)/2,Math.round(z*2)/2);
  if(_bhNew.size>130000){_bhOld=_bhNew;_bhNew=new Map();}
  _bhNew.set(key,v);
  return v;
}
function baseH_(x,z){
  let h=(fbm(x/150,z/150)-0.5)*16;   // gentle rolling hills
  if(h<0)h*=0.35;
  /* mountains are back: big ridged peaks out in the wild */
  const mm=fbm(x/620+31.4,z/620+17.8);
  const mtn=sstep(0.58,0.85,mm);
  if(mtn>0){
    const ridge=1-Math.abs(2*vnoise(x/240+5.1,z/240+9.7)-1);
    h+=mtn*(26+ridge*58);
  }
  /* the sea: terrain dips below the water plane */
  const se=seaAt(x,z);
  if(se>0)h=h*(1-se)+se*-9;
  /* islands rise back out of the deep sea: a soft dome with a sandy rim */
  if(se>0.4){
    const s=nearIsland(x,z);
    if(s){
      const d=Math.hypot(x-s.x,z-s.z);
      if(d<85){
        const t=1-d/85;
        const ih=-1.2+t*t*(7+vnoise(x/26+9.1,z/26+4.7)*2);
        if(ih>h)h=ih;
      }
    }
    /* volcano islands: a tall cone with a crater bowl at the top */
    const v2=nearVolcano(x,z);
    if(v2){
      const d=Math.hypot(x-v2.x,z-v2.z);
      if(d<125){
        const t=1-d/125;
        let vh=-1.2+t*t*48;
        const crater=Math.max(0,1-d/22);
        vh-=crater*crater*28;
        if(vh>h)h=vh;
      }
    }
  }
  h*=1-flatMask(x,z);
  return h;
}
/* ================= THE PLANETS =================
   km = how far away it is — the rocket costs $1 per km (Earth is always FREE
   to fly back to). Each planet has its own ground colors, its own color
   aliens + spaceship, its own gravity, and its own dumpling worth exactly
   its distance in km — so NEPTUNE dumplings are the most valuable of all! */
const PLANETS={
  moon:   {name:"Moon",   emoji:"\u{1F319}",km:0,    ground:0xd8c878,ground2:0x9c9788,dark:0x6f6a5e,rock:0x8f8a80,
           sky:0x04060f,sky2:0x0a0f1e,alien:0x7dff4f,alienCss:"#7dff4f",ship:0x9aa4b2,glow:0x2f6a1f,
           grav:2.4,jump:5,rough:1,holes:0.8},
  mercury:{name:"Mercury",emoji:"\u{1FAA8}",km:920,  ground:0xb8b0a4,ground2:0x8a8378,dark:0x55504a,rock:0x7a746c,
           sky:0x07070c,sky2:0x14121a,alien:0xc9cfd8,alienCss:"#c9cfd8",ship:0x5d5a6e,glow:0x3a3a4a,
           grav:2.2,jump:5.2,rough:1.1,holes:0.68},
  venus:  {name:"Venus",  emoji:"\u{1F7E1}",km:410,  ground:0xe8b45e,ground2:0xc98f3a,dark:0x8f6222,rock:0xb07f36,
           sky:0x1c1206,sky2:0x3a2410,alien:0xffb02e,alienCss:"#ffb02e",ship:0xd4a017,glow:0x6a4a10,
           grav:16,jump:6.2,rough:0.7,holes:0.92},
  mars:   {name:"Mars",   emoji:"\u{1F534}",km:780,  ground:0xc96a3c,ground2:0x9e4a28,dark:0x6a2f18,rock:0x8a3f22,
           sky:0x0e0605,sky2:0x261009,alien:0xff5040,alienCss:"#ff5040",ship:0x8a3324,glow:0x5a1c12,
           grav:7.5,jump:5.6,rough:1.2,holes:0.72},
  jupiter:{name:"Jupiter",emoji:"\u{1F7E0}",km:6280, ground:0xd9a066,ground2:0xa8763e,dark:0x74522a,rock:0x9a6a38,
           sky:0x0c0804,sky2:0x241708,alien:0xff8c42,alienCss:"#ff8c42",ship:0xb87333,glow:0x66401a,
           grav:40,jump:7.5,rough:0.6,holes:0.95},
  saturn: {name:"Saturn", emoji:"\u{1FA90}",km:12750,   /* it gets a RING on its spaceship too! */ground:0xe6d29a,ground2:0xc4a95e,dark:0x8c7840,rock:0xb09a58,
           sky:0x0a0906,sky2:0x1e1a0e,alien:0xffd75e,alienCss:"#ffd75e",ship:0xd4bd6a,glow:0x6a5a20,
           grav:21,jump:6.3,rough:0.8,holes:0.9,ring:true},
  uranus: {name:"Uranus", emoji:"\u{1F535}",km:27240,ground:0x9adbe8,ground2:0x6fb4c4,dark:0x3f7482,rock:0x5c98a8,
           sky:0x040a0e,sky2:0x0c1d24,alien:0x4fd8ff,alienCss:"#4fd8ff",ship:0x3f8ea0,glow:0x1a4a5a,
           grav:17,jump:6.1,rough:0.9,holes:0.85},
  neptune:{name:"Neptune",emoji:"\u{1F52E}",km:43510,ground:0x5a7fd4,ground2:0x3a5aa8,dark:0x24356a,rock:0x33487e,
           sky:0x03040e,sky2:0x0a0f2a,alien:0x4f7dff,alienCss:"#4f7dff",ship:0x2a3f9e,glow:0x14226a,
           grav:22,jump:6.4,rough:1,holes:0.82}
};
function curPlanet(){return PLANETS[S.world]||null;}
function offEarth(){return S.world!=="earth";}
function cssCol(n){return "#"+n.toString(16).padStart(6,"0");}
/* planet dust: rolling ground with small holes/craters, flat at rocket pads —
   every planet gets its own roughness & crater amount */
function moonH(x,z){
  const P=curPlanet()||PLANETS.moon;
  let h=(fbm(x/110+9.2,z/110+4.4)-0.5)*9*(P.rough||1);
  const c=vnoise(x/26+3.7,z/26+8.9),hl=P.holes||0.8;
  if(c>hl)h-=(c-hl)*24;                   // small holes / mini craters
  h*=sstep(30,64,rocketPadDist(x,z));     // flat around rocket stations
  return h;
}
/* --- curvy country roads --- */
const CSP=960,CHF=480,CAMP=130,CW2=55,CWIN=CAMP+CW2+40; // one per ~1 km, real bends
/* big sweep + a tighter second wave = proper S-curves */
function curveCX(k,z){return CSP*k+CHF+CAMP*Math.sin(z/210+k*2.1)+CW2*Math.sin(z/70+k*3.7);}
function curveCZ(k,x){return CSP*k+CHF+CAMP*Math.sin(x/210+k*1.3)+CW2*Math.sin(x/70+k*2.9);}
function curveXC(x,z){const k0=Math.round((x-CHF)/CSP);let best=1e9;
  for(let k=k0-1;k<=k0+1;k++){const c=curveCX(k,z);
    if(Math.abs(x-c)<Math.abs(x-best))best=c;}return best;}
function curveZC(x,z){const k0=Math.round((z-CHF)/CSP);let best=1e9;
  for(let k=k0-1;k<=k0+1;k++){const c=curveCZ(k,x);
    if(Math.abs(z-c)<Math.abs(z-best))best=c;}return best;}
/* --- curvy infinite railways every 960 m --- */
function railC(k,z){
  const base=-150+RAILSP*k;
  const ramp=k===0?sstep(450,650,Math.abs(z-STZ)):1;
  /* amplitude 40 keeps the track centered between road lines (120 m grid),
     so rails can never swing onto a road */
  return base+40*Math.sin(z/300+k*1.7)*ramp;
}
function railKNear(x){return Math.round((x+150)/RAILSP);}
function nearestRail(x,z){
  const k0=railKNear(x);let bk=k0,bd=1e9,bc=0;
  for(let k=k0-1;k<=k0+1;k++){const c=railC(k,z),d=Math.abs(x-c);if(d<bd){bd=d;bk=k;bc=c;}}
  return{k:bk,c:bc,d:bd};
}
/* city grid: one road every 120 m (was 60 — half the roads) */
function nearGridLine(v){const m=((v-30)%120+120)%120;return Math.min(m,120-m);}
function roadLinesIn(a,b){const out=[];let l=Math.ceil((a-30)/120)*120+30;for(;l<=b;l+=120)out.push(l);return out;}
/* the part of the street cars drive on (no sidewalks, no rails) —
   pedestrians and animals are not allowed here */
function onCarRoad(x,z){
  if(nearGridLine(x)<7.2||nearGridLine(z)<7.2)return true;
  if(Math.abs(x-170)<11.5||Math.abs(z+170)<11.5)return true;
  if(Math.abs(x-MHX)<19.5||Math.abs(z-MHZ)<19.5)return true;
  if(Math.abs(x-curveXC(x,z))<6.5||Math.abs(z-curveZC(x,z))<6.5)return true;
  return false;
}
/* one fast pass: roads grade smoothly over ALL terrain, mountains included */
function gradeAt(x,z){
  const h=baseH(x,z);
  let wsum=0,tsum=0,M=0;
  function cand(d,h0,h1,tx,tz){
    if(d>=h1)return;
    let t=baseH(tx,tz);
    /* roads never climb over the peaks (tunnels instead) and never sink
       into the sea (they become causeways just above the water) */
    if(t>16)t=16;
    if(t<-1)t=0.6;
    const m=1-sstep(h0,h1,d);
    wsum+=m;tsum+=m*t;if(m>M)M=m;
  }
  const lv=Math.round((x-30)/120)*120+30,lh=Math.round((z-30)/120)*120+30;
  const dv=Math.abs(x-lv),dh=Math.abs(z-lh);
  cand(dv,8,15,lv,z);
  cand(dh,8,15,x,lh);
  if(dv<15&&dh<15)cand(Math.max(dv,dh),8,15,lv,lh);
  if(Math.abs(x-170)<19)cand(Math.abs(x-170),12,19,170,z);
  if(Math.abs(z+170)<19)cand(Math.abs(z+170),12,19,x,-170);
  if(Math.abs(x-MHX)<34)cand(Math.abs(x-MHX),22,34,MHX,z);   // mega highway
  if(Math.abs(z-MHZ)<34)cand(Math.abs(z-MHZ),22,34,x,MHZ);
  const kx=Math.round((x-CHF)/CSP);
  if(Math.abs(x-(CSP*kx+CHF))<CWIN){const cx=curveXC(x,z);cand(Math.abs(x-cx),7,14,cx,z);}
  const kz=Math.round((z-CHF)/CSP);
  if(Math.abs(z-(CSP*kz+CHF))<CWIN){const cz=curveZC(x,z);cand(Math.abs(z-cz),7,14,x,cz);}
  const rk=railKNear(x);
  if(Math.abs(x-(-150+RAILSP*rk))<92){const rl=nearestRail(x,z);cand(rl.d,4,11,rl.c,z);}
  if(!wsum)return h;
  return h*(1-M)+(tsum/wsum)*M;
}
/* ⛏️ the MINECRAFT world: blocky terraced hills, flat at the spawn */
function mcH(x,z){
  let h=Math.floor((fbm(x/130+5.5,z/130+2.2)-0.40)*15);
  if(h<0)h=0;
  const d=Math.hypot(x-6,z-6);
  if(d<60)h=Math.floor(h*sstep(18,60,d));   // flat spawn area
  return h*1.1;
}
function rawH(x,z){return S.world==="mc"?mcH(x,z):S.world!=="earth"?moonH(x,z):gradeAt(x,z);}
function terrainH(x,z){return S.world==="mc"?mcH(x,z):S.world!=="earth"?moonH(x,z):gradeAt(x,z);}
function onAnyRoad(x,z){
  if(inAirport(x,z))return true;
  if(nearGridLine(x)<9||nearGridLine(z)<9)return true;
  if(Math.abs(x-170)<13||Math.abs(z+170)<13)return true;
  if(Math.abs(x-MHX)<22||Math.abs(z-MHZ)<22)return true;
  if(Math.abs(x-curveXC(x,z))<8||Math.abs(z-curveZC(x,z))<8)return true;
  if(nearestRail(x,z).d<7)return true;
  if(Math.abs(z-50)<9&&x<-105&&x>-160)return true;
  return false;
}
/* how far to sink the visual terrain under a road so it can never poke
   up through the ribbon between vertices (smoothed so there is no hard lip) */
function roadCut(x,z){
  if(inAirport(x,z))return 0;
  let c=0;
  const dg=Math.min(nearGridLine(x),nearGridLine(z));
  c=Math.max(c,1-sstep(5.5,8.5,dg));
  c=Math.max(c,1-sstep(7,10.5,Math.min(Math.abs(x-170),Math.abs(z+170))));
  c=Math.max(c,1-sstep(15,20.5,Math.min(Math.abs(x-MHX),Math.abs(z-MHZ))));
  c=Math.max(c,1-sstep(3.5,5.8,Math.abs(x-curveXC(x,z))));
  c=Math.max(c,1-sstep(3.5,5.8,Math.abs(z-curveZC(x,z))));
  return c*0.35;
}

/* ================= MATERIALS / SMALL BUILDERS ================= */
const KEEP=new Set();
function keep(o){KEEP.add(o);if(o.map)KEEP.add(o.map);return o;}
function disposeGroup(g){
  g.traverse(o=>{
    if(o.geometry&&!KEEP.has(o.geometry))o.geometry.dispose();
    if(o.material){
      (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{
        if(KEEP.has(m))return;
        if(m.map&&!KEEP.has(m.map))m.map.dispose();
        m.dispose();
      });
    }
  });
}
const shadowBox=m=>{m.castShadow=true;m.receiveShadow=true;return m};
function makeRoadTex(lanes){
  /* higher-res asphalt with speckle, cracks & darker wheel-wear tracks */
  const cv=document.createElement("canvas");cv.width=256;cv.height=256;
  const c=cv.getContext("2d");
  c.scale(2,2);
  c.fillStyle="#3b3f46";c.fillRect(0,0,128,128);
  c.fillStyle="#33373d";for(let i=0;i<220;i++)c.fillRect(Math.random()*128,Math.random()*128,1.4,1.4);
  c.fillStyle="#43474e";for(let i=0;i<140;i++)c.fillRect(Math.random()*128,Math.random()*128,1,1);
  /* wheel-wear: soft dark tracks where tires roll */
  c.fillStyle="rgba(0,0,0,0.08)";
  for(const wx of[22,42,84,104]){c.fillRect(wx-5,0,10,128);c.fillRect(wx-3,0,6,128);}
  /* faint cracks */
  c.strokeStyle="rgba(20,22,26,0.35)";c.lineWidth=0.7;
  for(let i=0;i<7;i++){
    let x=Math.random()*128,y=Math.random()*128;
    c.beginPath();c.moveTo(x,y);
    for(let k2=0;k2<4;k2++){x+=(Math.random()-0.5)*22;y+=Math.random()*14;c.lineTo(x,y);}
    c.stroke();
  }
  if(lanes===8){
    /* the MEGA HIGHWAY: 4 lanes each side + a center median */
    c.fillStyle="#f7e08b";c.fillRect(60,0,3,128);c.fillRect(65,0,3,128);   // double yellow median
    c.fillStyle="#e8edf0";
    for(const lx of[15,30,45,82,97,112]){c.fillRect(lx,6,2,40);c.fillRect(lx,70,2,40);}
    c.fillRect(2,0,3,128);c.fillRect(123,0,3,128);
  }else if(lanes===4){
    c.fillStyle="#f7e08b";c.fillRect(62,0,4,128);                 // center line
    c.fillStyle="#e8edf0";c.fillRect(30,6,3,44);c.fillRect(30,70,3,44);
    c.fillRect(95,6,3,44);c.fillRect(95,70,3,44);
    c.fillRect(2,0,3,128);c.fillRect(123,0,3,128);
  }else{
    c.fillStyle="#f7e08b";c.fillRect(60,8,5,44);                  // dashed center
    c.fillStyle="#e8edf0";c.fillRect(3,0,3,128);c.fillRect(122,0,3,128);
  }
  const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t;
}
const roadRibMat=keep(new THREE.MeshLambertMaterial({map:makeRoadTex(2),polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
const hwyRibMat=keep(new THREE.MeshLambertMaterial({map:makeRoadTex(4),polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
const megaRibMat=keep(new THREE.MeshLambertMaterial({map:makeRoadTex(8),polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
/* the MEGA HIGHWAY: 4 lanes each way — one runs north-south, one east-west */
const MHX=-270,MHZ=910;
const asphMat=keep(new THREE.MeshLambertMaterial({color:0x3b3f46,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}));
const sideMat=keep(new THREE.MeshLambertMaterial({map:(function(){
  const cv=document.createElement("canvas");cv.width=64;cv.height=64;
  const c=cv.getContext("2d");c.fillStyle="#b9b2a6";c.fillRect(0,0,64,64);
  c.strokeStyle="#a49d90";c.lineWidth=2;
  for(let y=0;y<=64;y+=16){c.beginPath();c.moveTo(0,y);c.lineTo(64,y);c.stroke();}
  c.fillStyle="#7d838c";c.fillRect(0,0,7,64);c.fillRect(57,0,7,64);   // curb stones on the edges
  const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,40);
  t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t;
})(),polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));
const curbMat=keep(new THREE.MeshLambertMaterial({color:0x7d838c}));
const bedMat=keep(new THREE.MeshLambertMaterial({color:0x9a9186,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));
const railMat=keep(new THREE.MeshLambertMaterial({color:0x6b7280}));
const lotMat=(function(){
  const cv=document.createElement("canvas");cv.width=128;cv.height=128;
  const c=cv.getContext("2d");c.fillStyle="#464b53";c.fillRect(0,0,128,128);
  c.strokeStyle="#dfe4ea";c.lineWidth=3;
  for(let x=8;x<128;x+=24){c.beginPath();c.moveTo(x,10);c.lineTo(x,60);c.stroke();}
  c.beginPath();c.moveTo(8,60);c.lineTo(120,60);c.stroke();
  const t=new THREE.CanvasTexture(cv);
  return keep(new THREE.MeshLambertMaterial({map:t,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
})();
/* ---- the sea surface: one big water plane that follows the player ---- */
const waterMat=keep(new THREE.MeshPhongMaterial({color:0x1d6f9e,transparent:true,opacity:0.72,shininess:140,specular:0x9fd0e8}));
const water=new THREE.Mesh(new THREE.PlaneGeometry(3200,3200),waterMat);
water.rotation.x=-Math.PI/2;water.position.y=-1.25;scene.add(water);
/* ---- tunnels: grey tubes where roads pass through mountains ---- */
const tunnelMat=keep(new THREE.MeshLambertMaterial({color:0x555b64,side:THREE.DoubleSide}));
/* ---- Earth seen from the moon ---- */
const earthBall=(function(){
  const cv=document.createElement("canvas");cv.width=128;cv.height=64;
  const c=cv.getContext("2d");c.fillStyle="#2f6fd1";c.fillRect(0,0,128,64);
  c.fillStyle="#3f9a4c";
  for(let i=0;i<9;i++){c.beginPath();c.arc(Math.random()*128,Math.random()*64,5+Math.random()*11,0,7);c.fill();}
  c.fillStyle="rgba(255,255,255,.65)";
  for(let i=0;i<7;i++){c.beginPath();c.arc(Math.random()*128,Math.random()*64,4+Math.random()*8,0,7);c.fill();}
  const m=new THREE.Mesh(new THREE.SphereGeometry(55,20,20),
    keep(new THREE.MeshBasicMaterial({map:keep(new THREE.CanvasTexture(cv)),fog:false})));
  m.visible=false;scene.add(m);return m;
})();
/* ---- fish that swim (and jump!) in the sea ---- */
const fishes=[];
const fishMats=[0xff7f11,0x3fd0ff,0xf4d35e,0x9b5de5].map(c=>keep(new THREE.MeshLambertMaterial({color:c})));
function makeFish(mat){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.SphereGeometry(0.42,8,7),mat);body.scale.set(0.6,0.7,1.4);g.add(body);
  const tail=new THREE.Mesh(new THREE.ConeGeometry(0.3,0.6,6),mat);tail.rotation.x=Math.PI/2;tail.position.z=-0.75;g.add(tail);
  const fin=new THREE.Mesh(new THREE.ConeGeometry(0.16,0.4,5),mat);fin.position.y=0.4;g.add(fin);
  return g;
}
function spawnFish(cx,cz,parent){
  const m=makeFish(fishMats[Math.floor(Math.random()*fishMats.length)]);
  parent.add(m);
  fishes.push({m,cx,cz,r:3+Math.random()*9,th:Math.random()*7,sp:0.5+Math.random()*0.9,ph:Math.random()*7,base:-2.6,amp:2.1});
}
/* frogs float near the surface and hop; tadpoles wiggle just below */
function makeFrog(){
  const g=new THREE.Group(),gm=new THREE.MeshLambertMaterial({color:0x3fae4a});
  const b=new THREE.Mesh(new THREE.SphereGeometry(0.34,8,7),gm);b.scale.set(1,0.75,1.15);g.add(b);
  [[-0.14],[0.14]].forEach(p=>{
    const w=new THREE.Mesh(new THREE.SphereGeometry(0.1,6,6),new THREE.MeshLambertMaterial({color:0xffffff}));
    w.position.set(p[0],0.26,0.2);g.add(w);
    const pu=new THREE.Mesh(new THREE.SphereGeometry(0.05,6,6),new THREE.MeshLambertMaterial({color:0x14161a}));
    pu.position.set(p[0],0.27,0.28);g.add(pu);
  });
  [[-0.3],[0.3]].forEach(p=>{const l=new THREE.Mesh(new THREE.SphereGeometry(0.11,6,6),gm);l.scale.set(1,0.5,1.6);l.position.set(p[0],-0.12,-0.15);g.add(l);});
  g.scale.setScalar(1.6);   // big enough to actually spot from the shore
  return g;
}
function makeTadpole(){
  const g=new THREE.Group(),m=new THREE.MeshLambertMaterial({color:0x2b3a20});
  const b=new THREE.Mesh(new THREE.SphereGeometry(0.13,7,6),m);g.add(b);
  const t=new THREE.Mesh(new THREE.ConeGeometry(0.05,0.36,5),m);
  t.rotation.x=Math.PI/2;t.position.z=-0.24;g.add(t);
  [[-0.05],[0.05]].forEach(p=>{const e=new THREE.Mesh(new THREE.SphereGeometry(0.025,5,5),new THREE.MeshLambertMaterial({color:0x14161a}));e.position.set(p[0],0.05,0.11);g.add(e);});
  return g;
}
function spawnFrog(cx,cz,parent){
  const m=makeFrog();parent.add(m);
  fishes.push({m,cx,cz,r:2+Math.random()*5,th:Math.random()*7,sp:0.35+Math.random()*0.5,ph:Math.random()*7,base:-0.95,amp:1.3});
}
function spawnTad(cx,cz,parent){
  const m=makeTadpole();parent.add(m);
  fishes.push({m,cx,cz,r:1.5+Math.random()*3,th:Math.random()*7,sp:0.8+Math.random()*0.8,ph:Math.random()*7,base:-1.3,amp:0.3});
}
function updateFish(dt){
  for(let i=fishes.length-1;i>=0;i--){
    const f=fishes[i];
    if(offScene(f.m)){fishes.splice(i,1);continue;}
    f.th+=f.sp*dt;
    const x=f.cx+Math.cos(f.th)*f.r,z=f.cz+Math.sin(f.th)*f.r;
    const y=f.base+Math.max(0,Math.sin(f.th*3+f.ph))*f.amp;   // sometimes leaps above the water
    f.m.position.set(x,y,z);
    f.m.rotation.y=-f.th;                                  // face along the swim circle
    f.m.rotation.x=-Math.cos(f.th*3+f.ph)*0.5;
  }
}
function ribbon(axis,c,a0,a1,w,yOff,mat,uvLen,centerFn){
  const len=a1-a0,segs=Math.max(6,Math.round(len/6));
  const geo=new THREE.PlaneGeometry(w,len,2,segs);geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position,mid=(a0+a1)/2;
  for(let i=0;i<pos.count;i++){
    const u=pos.getX(i),v=pos.getZ(i),t=mid+v;
    const cc=centerFn?centerFn(t):c;
    let wx,wz;
    if(axis==="z"){wx=cc+u;wz=t;}else{wx=t;wz=cc+u;}
    pos.setXYZ(i,wx,terrainH(wx,wz)+yOff,wz);
  }
  if(uvLen){const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setY(i,uv.getY(i)*len/uvLen);}
  geo.computeVertexNormals();
  const m=new THREE.Mesh(geo,mat);m.receiveShadow=true;return m;
}
/* real intersection: asphalt connecting both roads, sidewalk corners, crosswalks */
const interMat=(function(){
  const cv=document.createElement("canvas");cv.width=128;cv.height=128;
  const c=cv.getContext("2d");
  c.fillStyle="#b9b2a6";c.fillRect(0,0,128,128);                        // sidewalk corners
  c.fillStyle="#3b3f46";c.fillRect(19,0,90,128);c.fillRect(0,19,128,90); // the two roads joining
  c.fillStyle="#33373d";for(let i=0;i<60;i++)c.fillRect(19+Math.random()*90,19+Math.random()*90,2,2);
  c.fillStyle="#e8edf0";
  for(let x=26;x<=98;x+=12){c.fillRect(x,5,7,11);c.fillRect(x,112,7,11);} // crosswalks N + S
  for(let y=26;y<=98;y+=12){c.fillRect(5,y,11,7);c.fillRect(112,y,11,7);} // crosswalks W + E
  const t=new THREE.CanvasTexture(cv);
  t.anisotropy=renderer.capabilities.getMaxAnisotropy();
  return keep(new THREE.MeshLambertMaterial({map:t,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}));
})();
function crossingPatch(lx,lz,size){
  const geo=new THREE.PlaneGeometry(size,size,2,2);geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++){
    const wx=lx+pos.getX(i),wz=lz+pos.getZ(i);
    pos.setXYZ(i,wx,terrainH(wx,wz)+0.36,wz);
  }
  geo.computeVertexNormals();
  const m=new THREE.Mesh(geo,interMat);m.receiveShadow=true;return m;
}
/* trees / cactus / bush — realistic variety: leafy trees with lumpy crowns,
   dark conifers, tapered trunks, per-tree rotation & shade variation */
const treeGeoT=new THREE.CylinderGeometry(0.24,0.52,3.2,7),treeGeoL=new THREE.ConeGeometry(1.9,4,8);
KEEP.add(treeGeoT);KEEP.add(treeGeoL);
const treeMatT=keep(new THREE.MeshLambertMaterial({color:0x6f4e37}));
const treeMatT2=keep(new THREE.MeshLambertMaterial({color:0x55402c}));
const treeMatL=keep(new THREE.MeshLambertMaterial({color:0x2f8f46}));
const leafMats=[0x2f8f46,0x47a34f,0x246b39,0x6aa84f,0x3c9155].map(c=>keep(new THREE.MeshLambertMaterial({color:c})));
const conifMat=keep(new THREE.MeshLambertMaterial({color:0x1e5f33}));
const leafGeo=new THREE.SphereGeometry(1,8,7);KEEP.add(leafGeo);
const cactusMat=keep(new THREE.MeshLambertMaterial({color:0x3d8b4f}));
const bushGeo=new THREE.SphereGeometry(1,7,6);KEEP.add(bushGeo);
function makeTree(x,z,s,parent,y){
  const t=new THREE.Group();
  const h=Math.abs(Math.sin(x*0.37+z*1.71+x*z*0.001));   // deterministic per-spot variety
  const tr=new THREE.Mesh(treeGeoT,h>0.5?treeMatT:treeMatT2);
  tr.scale.setScalar(s);tr.position.y=1.6*s;tr.castShadow=true;t.add(tr);
  if(h<0.32){
    /* conifer: three stacked cones, dark green */
    [[3.2,1.15],[4.5,0.85],[5.6,0.55]].forEach(p=>{
      const c=new THREE.Mesh(treeGeoL,conifMat);
      c.scale.setScalar(s*p[1]);c.position.y=p[0]*s;c.castShadow=true;t.add(c);});
  }else{
    /* leafy tree: a lumpy crown of 4 blobs in a per-tree shade of green */
    const lm=leafMats[Math.floor(h*13)%leafMats.length];
    [[0,4.4,0,1.55],[1.0,3.8,0.45,1.0],[-0.95,3.9,-0.4,0.95],[0.15,3.5,-0.95,0.85]].forEach(p=>{
      const b=new THREE.Mesh(leafGeo,lm);
      b.position.set(p[0]*s,p[1]*s,p[2]*s);
      b.scale.set(p[3]*s*1.25,p[3]*s*1.05,p[3]*s*1.25);
      b.castShadow=true;t.add(b);});
  }
  t.rotation.y=h*6.28;
  t.position.set(x,y!==undefined?y:terrainH(x,z),z);(parent||scene).add(t);
}
function makeCactus(x,z,s,parent,y){
  const g=new THREE.Group();
  const b=new THREE.Mesh(new THREE.CylinderGeometry(0.4*s,0.45*s,3.2*s,8),cactusMat);b.position.y=1.6*s;b.castShadow=true;g.add(b);
  [-1,1].forEach(o=>{const a=new THREE.Mesh(new THREE.CylinderGeometry(0.22*s,0.24*s,1.4*s,7),cactusMat);
    a.position.set(o*0.62*s,1.9*s,0);g.add(a);
    const e=new THREE.Mesh(new THREE.CylinderGeometry(0.22*s,0.22*s,0.7*s,7),cactusMat);
    e.rotation.z=o*Math.PI/2;e.position.set(o*0.42*s,1.25*s,0);g.add(e);});
  g.position.set(x,y,z);parent.add(g);
}
function makeBush(x,z,s,parent,y){
  /* three overlapping blobs in two shades read as a real shrub */
  const g=new THREE.Group();
  const lm=leafMats[(Math.abs(Math.round(x+z))%leafMats.length)];
  [[0,0.4,0,1],[0.55,0.3,0.25,0.7],[-0.5,0.32,-0.2,0.65]].forEach(p=>{
    const m=new THREE.Mesh(bushGeo,p[3]===1?lm:treeMatL);
    m.scale.set(s*p[3],s*0.7*p[3],s*p[3]);m.position.set(x+p[0]*s,y+p[1]*s,z+p[2]*s);
    m.castShadow=true;g.add(m);});
  parent.add(g);
}
/* ================= PEOPLE / ANIMALS / DOORS ================= */
const eyeMat=keep(new THREE.MeshLambertMaterial({color:0x1c1c1e}));
const shoeMat=keep(new THREE.MeshLambertMaterial({color:0x23262b}));
function makePerson(scale,shirtColor,av){
  /* av = optional avatar colors {skin,pants,hair} — random when not given */
  const g=new THREE.Group(),s=scale||1;
  const skin=new THREE.MeshLambertMaterial({color:av&&av.skin!==undefined?av.skin:[0xf1c39a,0xd9a06b,0x8c5a2b][Math.floor(Math.random()*3)]});
  const shirt=new THREE.MeshLambertMaterial({color:shirtColor!==undefined&&shirtColor!==null?shirtColor:COLORS[Math.floor(Math.random()*COLORS.length)]});
  const pants=new THREE.MeshLambertMaterial({color:av&&av.pants!==undefined?av.pants:[0x30395c,0x3a3a3a,0x4a3728,0x24405e][Math.floor(Math.random()*4)]});
  const torso=new THREE.Mesh(new THREE.BoxGeometry(0.56*s,0.72*s,0.3*s),shirt);torso.position.y=1.28*s;torso.castShadow=true;g.add(torso);
  /* shoulders round the silhouette a little */
  [[-0.28],[0.28]].forEach(p=>{const sh=new THREE.Mesh(new THREE.SphereGeometry(0.11*s,7,7),shirt);sh.position.set(p[0]*s,1.56*s,0);g.add(sh);});
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(0.07*s,0.08*s,0.12*s,7),skin);neck.position.y=1.68*s;g.add(neck);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.23*s,10,10),skin);head.position.y=1.9*s;g.add(head);
  const hair=new THREE.Mesh(new THREE.SphereGeometry(0.24*s,10,10,0,Math.PI*2,0,Math.PI/2),new THREE.MeshLambertMaterial({color:av&&av.hair!==undefined?av.hair:[0x4a2f1d,0x1c1c1e,0xc9a35a,0x8a4b2a][Math.floor(Math.random()*4)]}));
  hair.position.y=1.95*s;g.add(hair);
  /* a real face: two eyes + a tiny nose */
  [[-0.08],[0.08]].forEach(p=>{const e=new THREE.Mesh(new THREE.SphereGeometry(0.028*s,6,6),eyeMat);e.position.set(p[0]*s,1.93*s,0.2*s);g.add(e);});
  const nose=new THREE.Mesh(new THREE.SphereGeometry(0.035*s,6,6),skin);nose.position.set(0,1.87*s,0.225*s);g.add(nose);
  function limb(mat,len,r){const p=new THREE.Group();
    const m=new THREE.Mesh(new THREE.CylinderGeometry(r*s,r*0.85*s,len*s,7),mat);m.position.y=-len*s/2;p.add(m);return p;}
  const lA=limb(shirt,0.6,0.085);lA.position.set(-0.38*s,1.56*s,0);g.add(lA);
  const rA=limb(shirt,0.6,0.085);rA.position.set(0.38*s,1.56*s,0);g.add(rA);
  /* hands swing with the arms, shoes with the legs */
  [lA,rA].forEach(a=>{const h=new THREE.Mesh(new THREE.SphereGeometry(0.07*s,6,6),skin);h.position.y=-0.64*s;a.add(h);});
  const lL=limb(pants,0.76,0.1);lL.position.set(-0.16*s,0.76*s,0);g.add(lL);
  const rL=limb(pants,0.76,0.1);rL.position.set(0.16*s,0.76*s,0);g.add(rL);
  [lL,rL].forEach(l=>{const f=new THREE.Mesh(new THREE.BoxGeometry(0.17*s,0.1*s,0.32*s),shoeMat);f.position.set(0,-0.76*s,0.07*s);l.add(f);});
  g.userData.limbs={lA,rA,lL,rL};
  return g;
}
const peds=[]; // wandering / leaving people
function spawnPed(x,z,mode,ttl){
  if(peds.length>34)return null;
  const m=makePerson(0.95);m.position.set(x,terrainH(x,z),z);
  scene.add(m);
  const p={m,x,z,yaw:Math.random()*7,t:Math.random()*9,ttl:ttl||9999,mode:mode||"wander",hx:x,hz:z};
  peds.push(p);
  return p;
}
function updatePeds(dt){
  for(let i=peds.length-1;i>=0;i--){
    const p=peds[i];p.ttl-=dt;p.t+=dt;
    if(p.ttl<=0||Math.hypot(p.x-player.x,p.z-player.z)>380){scene.remove(p.m);peds.splice(i,1);continue;}
    if(p.t>3){p.t=0;p.yaw=p.mode==="wander"?Math.atan2(p.hx-p.x,p.hz-p.z)+(Math.random()-0.5)*2.4:p.yaw+(Math.random()-0.5)*1.4;}
    const sp=1.3;
    const nx=p.x+Math.sin(p.yaw)*sp*dt,nz=p.z+Math.cos(p.yaw)*sp*dt;
    /* road ahead: pick ONE new direction and commit (no more frantic twitching) */
    if(onCarRoad(nx,nz)){p.yaw+=Math.PI*0.75+Math.random()*Math.PI*0.5;p.t=-1.5;}
    else{p.x=nx;p.z=nz;}
    p.m.position.set(p.x,terrainH(p.x,p.z),p.z);
    let pdy=p.yaw-p.m.rotation.y;
    while(pdy>Math.PI)pdy-=Math.PI*2;while(pdy<-Math.PI)pdy+=Math.PI*2;
    p.m.rotation.y+=pdy*Math.min(1,7*dt);
    const a=Math.sin(performance.now()/180)*0.5;
    const L=p.m.userData.limbs;L.lL.rotation.x=a;L.rL.rotation.x=-a;L.lA.rotation.x=-a*0.7;L.rA.rotation.x=a*0.7;
  }
}
/* animals (right biome, right animal) */
const animals=[];
function makeDeer(){const g=new THREE.Group();
  const b=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.7,1.4),new THREE.MeshLambertMaterial({color:0x8b5a2b}));b.position.y=0.95;b.castShadow=true;g.add(b);
  const h=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.4,0.5),new THREE.MeshLambertMaterial({color:0x9c6b3c}));h.position.set(0,1.55,0.85);g.add(h);
  [[-0.09],[0.09]].forEach(p=>{const e=new THREE.Mesh(new THREE.SphereGeometry(0.05,6,6),new THREE.MeshLambertMaterial({color:0x14161a}));e.position.set(p[0],1.62,1.12);g.add(e);});
  [[0.2,0.5],[-0.2,0.5],[0.2,-0.5],[-0.2,-0.5]].forEach(p=>{const l=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.9),new THREE.MeshLambertMaterial({color:0x6f4423}));l.position.set(p[0],0.45,p[1]);g.add(l);});
  return g;}
function makeCamel(){const g=new THREE.Group();
  const b=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.8,1.8),new THREE.MeshLambertMaterial({color:0xc9a35a}));b.position.y=1.25;b.castShadow=true;g.add(b);
  const hump=new THREE.Mesh(new THREE.SphereGeometry(0.4,8,8),new THREE.MeshLambertMaterial({color:0xb8924a}));hump.position.set(0,1.85,-0.1);g.add(hump);
  const n=new THREE.Mesh(new THREE.BoxGeometry(0.26,0.7,0.3),new THREE.MeshLambertMaterial({color:0xc9a35a}));n.position.set(0,1.9,0.95);g.add(n);
  const h=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.26,0.5),new THREE.MeshLambertMaterial({color:0xc9a35a}));h.position.set(0,2.3,1.1);g.add(h);
  [[-0.08],[0.08]].forEach(p=>{const e=new THREE.Mesh(new THREE.SphereGeometry(0.045,6,6),new THREE.MeshLambertMaterial({color:0x14161a}));e.position.set(p[0],2.36,1.37);g.add(e);});
  [[0.24,0.6],[-0.24,0.6],[0.24,-0.6],[-0.24,-0.6]].forEach(p=>{const l=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,1.3),new THREE.MeshLambertMaterial({color:0xb8924a}));l.position.set(p[0],0.65,p[1]);g.add(l);});
  return g;}
/* generic four-legged animal body — every wild animal starts from this */
function makeQuad(col,bw,bh,bl,legH,headCol){
  const g=new THREE.Group(),m=new THREE.MeshLambertMaterial({color:col});
  const b=new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bl),m);b.position.y=legH+bh/2;b.castShadow=true;g.add(b);
  const h=new THREE.Mesh(new THREE.BoxGeometry(bw*0.6,bh*0.6,bl*0.3),new THREE.MeshLambertMaterial({color:headCol||col}));
  h.position.set(0,legH+bh+bh*0.15,bl*0.55);g.add(h);
  const lm=new THREE.MeshLambertMaterial({color:headCol||col});
  [[bw*0.32,bl*0.33],[-bw*0.32,bl*0.33],[bw*0.32,-bl*0.33],[-bw*0.32,-bl*0.33]].forEach(p=>{
    const l=new THREE.Mesh(new THREE.CylinderGeometry(Math.max(0.04,bw*0.1),Math.max(0.04,bw*0.1),legH),lm);
    l.position.set(p[0],legH/2,p[1]);g.add(l);});
  /* a face: two eyes on the front of the head */
  const em=new THREE.MeshLambertMaterial({color:0x14161a});
  [[-1],[1]].forEach(s=>{
    const e=new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.035,bw*0.08),6,6),em);
    e.position.set(s[0]*bw*0.16,legH+bh+bh*0.18,bl*0.55+bl*0.16);g.add(e);
  });
  return g;
}
function makeRabbit(){const g=makeQuad(0xbfb8ae,0.34,0.3,0.55,0.22);
  [[-0.08],[0.08]].forEach(p=>{const e=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.3,0.05),new THREE.MeshLambertMaterial({color:0xbfb8ae}));e.position.set(p[0],0.78,0.28);g.add(e);});
  const t=new THREE.Mesh(new THREE.SphereGeometry(0.08,6,6),new THREE.MeshLambertMaterial({color:0xffffff}));t.position.set(0,0.42,-0.32);g.add(t);
  return g;}
function makeFox(){const g=makeQuad(0xd35400,0.4,0.36,0.85,0.3);
  const tl=new THREE.Mesh(new THREE.ConeGeometry(0.14,0.7,6),new THREE.MeshLambertMaterial({color:0xd35400}));
  tl.rotation.x=1.2;tl.position.set(0,0.55,-0.75);g.add(tl);
  const tip=new THREE.Mesh(new THREE.SphereGeometry(0.09,6,6),new THREE.MeshLambertMaterial({color:0xffffff}));tip.position.set(0,0.42,-1.05);g.add(tip);
  return g;}
function makeBear(){return makeQuad(0x5b4232,0.95,0.9,1.6,0.45,0x4a3628);}
function makeSheep(){const g=makeQuad(0xe8e4da,0.6,0.55,1,0.38,0x3a3a3a);
  const w=new THREE.Mesh(new THREE.SphereGeometry(0.42,8,7),new THREE.MeshLambertMaterial({color:0xf2efe6}));
  w.scale.set(0.85,0.75,1.25);w.position.y=0.75;g.add(w);return g;}
function makeCow(){const g=makeQuad(0xf0f0f0,0.75,0.8,1.7,0.55,0xe8b4b8);
  for(let i=0;i<3;i++){const sp=new THREE.Mesh(new THREE.BoxGeometry(0.77,0.4,0.4),new THREE.MeshLambertMaterial({color:0x222222}));
    sp.position.set(0,1+((i%2)*0.25),-0.55+i*0.5);g.add(sp);}
  return g;}
function makeHorse(){const g=makeQuad(0x7a4a21,0.6,0.75,1.7,0.8,0x5e3a17);
  const nk=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.9,0.3),new THREE.MeshLambertMaterial({color:0x7a4a21}));
  nk.position.set(0,1.75,0.85);nk.rotation.x=-0.4;g.add(nk);
  const hd=new THREE.Mesh(new THREE.BoxGeometry(0.28,0.3,0.6),new THREE.MeshLambertMaterial({color:0x5e3a17}));
  hd.position.set(0,2.2,1.15);g.add(hd);
  return g;}
function makeZooAnimal(kind){
  const col=kind==="elephant"?0x9aa0a8:kind==="lion"?0xd9a83c:kind==="giraffe"?0xe9b84c:0xf0f0f0;
  const g=new THREE.Group();
  const sc=kind==="elephant"?1.6:1;
  const b=new THREE.Mesh(new THREE.BoxGeometry(0.8*sc,0.8*sc,1.6*sc),new THREE.MeshLambertMaterial({color:col}));b.position.y=0.9*sc;b.castShadow=true;g.add(b);
  const h=new THREE.Mesh(new THREE.BoxGeometry(0.44*sc,0.44*sc,0.5*sc),new THREE.MeshLambertMaterial({color:col}));h.position.set(0,1.35*sc,0.95*sc);g.add(h);
  const em=new THREE.MeshLambertMaterial({color:0x14161a});
  [[-1],[1]].forEach(s=>{const e=new THREE.Mesh(new THREE.SphereGeometry(0.06*sc,6,6),em);e.position.set(s[0]*0.12*sc,1.44*sc,1.22*sc);g.add(e);});
  if(kind==="elephant"){const tr=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.12,1),new THREE.MeshLambertMaterial({color:col}));tr.position.set(0,1*sc,1.3*sc);tr.rotation.x=0.5;g.add(tr);}
  if(kind==="zebra"){for(let i=0;i<4;i++){const st=new THREE.Mesh(new THREE.BoxGeometry(0.82,0.82,0.1),new THREE.MeshLambertMaterial({color:0x222222}));st.position.set(0,0.9,-0.6+i*0.4);g.add(st);}}
  if(kind==="giraffe"){
    const neck=new THREE.Mesh(new THREE.BoxGeometry(0.26,1.7,0.3),new THREE.MeshLambertMaterial({color:col}));
    neck.position.set(0,2.15,0.85);neck.rotation.x=-0.22;g.add(neck);
    const gh=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.28,0.55),new THREE.MeshLambertMaterial({color:col}));
    gh.position.set(0,3.05,1.1);g.add(gh);
    [[-0.08],[0.08]].forEach(p=>{const e=new THREE.Mesh(new THREE.SphereGeometry(0.045,6,6),em);e.position.set(p[0],3.1,1.4);g.add(e);});
    for(let i=0;i<5;i++){const spt=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.22,0.22),new THREE.MeshLambertMaterial({color:0x9c6b1f}));
      spt.position.set(i%2?0.34:-0.34,0.85+(i%3)*0.2,-0.55+i*0.3);g.add(spt);}
  }
  [[0.26,0.6],[-0.26,0.6],[0.26,-0.6],[-0.26,-0.6]].forEach(p=>{const l=new THREE.Mesh(new THREE.CylinderGeometry(0.08*sc,0.08*sc,0.9*sc),new THREE.MeshLambertMaterial({color:col}));l.position.set(p[0]*sc,0.45*sc,p[1]*sc);g.add(l);});
  return g;
}
function regAnimal(g,x,z,parent,speed){
  parent.add(g);
  const a={m:g,x,z,yaw:Math.random()*7,t:0,sp:speed||0.9};
  g.position.set(x,terrainH(x,z),z);
  animals.push(a);g.userData.anim=a;
  return a;
}
function updateAnimals(dt){
  for(let i=animals.length-1;i>=0;i--){
    const a=animals[i];
    if(offScene(a.m)){animals.splice(i,1);continue;}   // chunk was unloaded
    a.t-=dt;
    if(a.t<=0){a.t=2+Math.random()*4;a.yaw+=(Math.random()-0.5)*2;}
    if(a.pen){ // stay inside zoo pen
      const nx=a.x+Math.sin(a.yaw)*a.sp*dt,nz=a.z+Math.cos(a.yaw)*a.sp*dt;
      if(Math.hypot(nx-a.pen.x,nz-a.pen.z)<a.pen.r){a.x=nx;a.z=nz;}
      else{a.yaw=Math.atan2(a.pen.x-a.x,a.pen.z-a.z)+(Math.random()-0.5);a.t=2+Math.random()*2;}
    }else{
      const nx=a.x+Math.sin(a.yaw)*a.sp*dt,nz=a.z+Math.cos(a.yaw)*a.sp*dt;
      /* blocked by a road: pick ONE new direction and keep it for a while —
         flipping 180° every frame made animals spin like crazy at road edges */
      if(onCarRoad(nx,nz)){a.yaw+=Math.PI*0.75+Math.random()*Math.PI*0.5;a.t=2+Math.random()*2;}
      else{a.x=nx;a.z=nz;}
    }
    /* the body turns smoothly toward the walking direction, never snaps */
    let dy=a.yaw-a.m.rotation.y;
    while(dy>Math.PI)dy-=Math.PI*2;while(dy<-Math.PI)dy+=Math.PI*2;
    a.m.rotation.y+=dy*Math.min(1,6*dt);
    a.m.position.set(a.x,terrainH(a.x,a.z),a.z);
  }
}
/* an object whose chunk was unloaded keeps its (detached) group as parent,
   so checking `.parent` alone never detects removal — climb to the root */
function offScene(o){let p=o;while(p.parent)p=p.parent;return p!==scene;}
/* doors that open when you walk up */
const doors=[];
function makeDoor(x,z,yaw,parent,baseY,color){
  const pivot=new THREE.Group();pivot.position.set(x,baseY,z);pivot.rotation.y=yaw;
  const d=new THREE.Mesh(new THREE.BoxGeometry(0.1,2.3,1.15),new THREE.MeshLambertMaterial({color:color||0x8b5a2b}));
  d.position.set(0,1.15,0.57);d.castShadow=true;pivot.add(d);
  const knob=new THREE.Mesh(new THREE.SphereGeometry(0.06),new THREE.MeshLambertMaterial({color:0xffd75e}));
  knob.position.set(0.08,1.15,1);pivot.add(knob);
  parent.add(pivot);
  doors.push({pivot,x,z,open:0});
  return pivot;
}
function updateDoors(dt){
  for(let i=doors.length-1;i>=0;i--){
    const d=doors[i];
    if(offScene(d.pivot)){doors.splice(i,1);continue;}
    const near=Math.hypot(player.x-d.x,player.z-d.z)<4&&player.onFoot;
    d.open=THREE.MathUtils.lerp(d.open,near?1:0,Math.min(1,5*dt));
    d.pivot.rotation.y=d.pivot.userData.baseYaw!==undefined?d.pivot.userData.baseYaw+d.open*1.9:(d.pivot.userData.baseYaw=d.pivot.rotation.y);
  }
}
/* ================= BUILDINGS (destructible) / SHOPS / STREET FURNITURE ================= */
const buildings=[],collapses=[];
function windowTexture(base){
  const cv=document.createElement("canvas");cv.width=128;cv.height=256;
  const c=cv.getContext("2d");c.fillStyle=base;c.fillRect(0,0,128,256);
  for(let y=10;y<246;y+=22)for(let x=10;x<118;x+=20){
    c.fillStyle=Math.random()<.35?"#ffe9a8":"#20303f";c.fillRect(x,y,12,13);
  }
  return new THREE.CanvasTexture(cv);
}
const winTexes=["#5f6f81","#7d8a99","#8f7f74","#6d7f6e"].map(windowTexture);
winTexes.forEach(t=>KEEP.add(t));
function regBuilding(x,z,w,d,parts,gy){
  parts.forEach(p=>p.userData.oy=p.position.y);
  const rec={x,z,w,d,parts,gy:gy||0,alive:true};
  buildings.push(rec);return rec;
}
/* interactive hotel furniture (reception desks, beds, chairs, rooms) */
const hotelDesks=[],hotelBeds=[],chairs=[],hotelRooms=[],roomExits=[];
/* walk-in buildings register their WALLS here: you can only pass at the doorways */
const shells=[];
function regShell(g,x,z,hw,hd,y,open){shells.push({g,x,z,hw,hd,y,open});}
function makeChair(cx,cz,yaw,parent,baseY){
  const cm=new THREE.MeshLambertMaterial({color:0x8a4f2d});
  const seat=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.1,0.6),cm);
  seat.position.set(cx,baseY+0.55,cz);parent.add(seat);
  const back=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.75,0.1),cm);
  back.position.set(cx-Math.sin(yaw)*0.26,baseY+0.95,cz-Math.cos(yaw)*0.26);back.rotation.y=yaw;parent.add(back);
  [[-0.24,-0.24],[0.24,-0.24],[-0.24,0.24],[0.24,0.24]].forEach(o=>{
    const l=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,0.55),cm);
    l.position.set(cx+o[0],baseY+0.27,cz+o[1]);parent.add(l);
  });
  chairs.push({g:parent,x:cx,z:cz,yaw,y:baseY+0.6});
}
/* ---- pianos you can really play (computer keyboard + MIDI) ---- */
const pianos=[];
function makePiano(px,pz,yaw,parent,baseY,hall){
  const g=new THREE.Group();g.position.set(px,baseY,pz);g.rotation.y=yaw;
  const blk=new THREE.MeshLambertMaterial({color:0x17181c});
  const body=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(1.7,1.25,0.55),blk));
  body.position.set(0,0.75,-0.28);g.add(body);
  const shelf=new THREE.Mesh(new THREE.BoxGeometry(1.7,0.09,0.42),blk);
  shelf.position.set(0,0.78,0.12);g.add(shelf);
  const keysW=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.05,0.32),new THREE.MeshLambertMaterial({color:0xf4f7fb}));
  keysW.position.set(0,0.85,0.12);g.add(keysW);
  for(let i=0;i<10;i++){
    const bk=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.03,0.18),blk);
    bk.position.set(-0.66+i*0.147,0.885,0.05);g.add(bk);
  }
  [[-0.78],[0.78]].forEach(p=>{const l=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.72,0.09),blk);l.position.set(p[0],0.36,0.22);g.add(l);});
  /* bench */
  const bn=new THREE.Mesh(new THREE.BoxGeometry(1,0.09,0.4),blk);bn.position.set(0,0.5,0.85);g.add(bn);
  [[-0.4,0.7],[0.4,0.7],[-0.4,1],[0.4,1]].forEach(p=>{
    const l=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.5,0.07),blk);l.position.set(p[0],0.25,p[1]);g.add(l);});
  parent.add(g);
  /* concert pianos get a tip hat next to them — the crowd drops money in */
  let hat=null,hatBills=null;
  if(hall){
    const hx=px+1.9,hz=pz+0.9;
    const hm=new THREE.MeshLambertMaterial({color:0x23262b,side:THREE.DoubleSide});
    const cup=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.34,0.34,12,1,true),hm);
    cup.position.set(hx,baseY+0.17,hz);parent.add(cup);
    const brim=new THREE.Mesh(new THREE.TorusGeometry(0.4,0.055,8,16),hm);
    brim.rotation.x=Math.PI/2;brim.position.set(hx,baseY+0.04,hz);parent.add(brim);
    hatBills=new THREE.Mesh(new THREE.CylinderGeometry(0.26,0.26,0.09,10),new THREE.MeshLambertMaterial({color:0x2f9e44}));
    hatBills.position.set(hx,baseY+0.3,hz);hatBills.visible=false;parent.add(hatBills);
    hat={x:hx,z:hz};
  }
  pianos.push({g,x:px,z:pz,y:baseY,hall:hall||null,hat,hatBills,hatMoney:0});
  return g;
}
/* apartments are little hotels: walk in, rent a room at the reception,
   sleep in the bed (skips the night), sit on the chairs */
function apartment(x,z,rand,parent,baseY){
  baseY=baseY||0;
  const w=13+rand()*4,d=11+rand()*3,h=22+rand()*26,LH=3.6;
  const parts=[];
  const tower=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({map:winTexes[Math.floor(rand()*4)]})));
  tower.position.set(x,baseY+LH+h/2,z);parent.add(tower);parts.push(tower);
  const r=new THREE.Mesh(new THREE.BoxGeometry(w*0.6,1.4,d*0.6),new THREE.MeshLambertMaterial({color:0x3d444d}));
  r.position.set(x,baseY+LH+h+0.7,z);parent.add(r);parts.push(r);
  /* ground-floor lobby: open shell you can walk into */
  const lm=new THREE.MeshLambertMaterial({color:0xd8d2c4});
  function wallBox(bw,bh,bd,px,py,pz){const m=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd),lm));
    m.position.set(x+px,baseY+py,z+pz);parent.add(m);parts.push(m);return m;}
  wallBox(w,LH,0.35,0,LH/2,-d/2);                       // back
  wallBox(0.35,LH,d,-w/2,LH/2,0);wallBox(0.35,LH,d,w/2,LH/2,0);
  wallBox(w/2-1.1,LH,0.35,-(w/4+0.55),LH/2,d/2);        // front, doorway in the middle
  wallBox(w/2-1.1,LH,0.35,(w/4+0.55),LH/2,d/2);
  const floor=new THREE.Mesh(new THREE.BoxGeometry(w-0.3,0.1,d-0.3),new THREE.MeshLambertMaterial({color:0xcabfa6}));
  floor.position.set(x,baseY+0.05,z);parent.add(floor);
  makeDoor(x-1,z+d/2+0.05,0,parent,baseY,0x30395c);
  const id=Math.round(x)+","+Math.round(z);
  /* lobby: ONLY the reception (desk + receptionist + sign) */
  const dx=x+w/4-0.5,dz=z-d/2+2.4;
  const desk=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(2.8,1.1,0.8),new THREE.MeshLambertMaterial({color:0x8a6f4d})));
  desk.position.set(dx,baseY+0.55,dz);parent.add(desk);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(3.4,0.9),shopSignMat("RECEPTION"));
  sign.position.set(dx,baseY+2.6,dz-0.5);parent.add(sign);
  const rp=makePerson(0.92);rp.position.set(dx,baseY,dz-1.1);parent.add(rp);
  /* YOUR ROOM: a real furnished room on the 1st floor — renting teleports you up */
  const RY=baseY+LH+0.25,RH=2.7;
  const rfloor=new THREE.Mesh(new THREE.BoxGeometry(w-0.8,0.25,d-0.8),new THREE.MeshLambertMaterial({color:0xcabfa6}));
  rfloor.position.set(x,RY-0.12,z);parent.add(rfloor);
  const rwall=new THREE.MeshLambertMaterial({color:0xe8e2d4});
  [[w-0.9,0.3,0,-d/2+0.6],[w-0.9,0.3,0,d/2-0.6],[0.3,d-0.9,-w/2+0.6,0],[0.3,d-0.9,w/2-0.6,0]].forEach(a=>{
    const m=new THREE.Mesh(new THREE.BoxGeometry(a[0],RH,a[1]),rwall);
    m.position.set(x+a[2],RY+RH/2,z+a[3]);parent.add(m);
  });
  const ceil=new THREE.Mesh(new THREE.BoxGeometry(w-0.8,0.2,d-0.8),new THREE.MeshLambertMaterial({color:0xd8d2c4}));
  ceil.position.set(x,RY+RH+0.1,z);parent.add(ceil);
  decks.push({g:parent,x,z,hw:(w-1)/2,hd:(d-1)/2,tops:[RY],ramp:null});
  hotelRooms.push({g:parent,x,z,hw:(w-2)/2,hd:(d-2)/2,ry:RY});
  /* bed */
  const bx=x-w/4,bz=z-d/4;
  const frame=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(1.7,0.4,2.9),new THREE.MeshLambertMaterial({color:0x6f4e37})));
  frame.position.set(bx,RY+0.2,bz);parent.add(frame);
  const matt=new THREE.Mesh(new THREE.BoxGeometry(1.55,0.28,2.75),new THREE.MeshLambertMaterial({color:0xf2f5f7}));
  matt.position.set(bx,RY+0.5,bz);parent.add(matt);
  const pil=new THREE.Mesh(new THREE.BoxGeometry(1.1,0.18,0.6),new THREE.MeshLambertMaterial({color:0x9fd8ff}));
  pil.position.set(bx,RY+0.7,bz-1);parent.add(pil);
  const blank=new THREE.Mesh(new THREE.BoxGeometry(1.58,0.1,1.7),new THREE.MeshLambertMaterial({color:0xd7263d}));
  blank.position.set(bx,RY+0.66,bz+0.5);parent.add(blank);
  hotelBeds.push({g:parent,x:bx,z:bz,id,y:RY});
  /* two chairs + a little table in the room */
  makeChair(x+w/4-0.4,z-d/4,Math.PI,parent,RY);
  makeChair(x+w/4-1.9,z-d/4,Math.PI,parent,RY);
  const tab=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.08,0.8),new THREE.MeshLambertMaterial({color:0x8a6f4d}));
  tab.position.set(x+w/4-1.15,RY+0.72,z-d/4-1);parent.add(tab);
  const tleg=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.7),new THREE.MeshLambertMaterial({color:0x6f4e37}));
  tleg.position.set(x+w/4-1.15,RY+0.35,z-d/4-1);parent.add(tleg);
  /* exit mat: press T here to go back down to the street */
  const ex=x,ez=z+d/4+1;
  const mat2=new THREE.Mesh(new THREE.BoxGeometry(1.4,0.06,1.4),new THREE.MeshLambertMaterial({color:0xd7263d}));
  mat2.position.set(ex,RY+0.03,ez);parent.add(mat2);
  const esign=new THREE.Mesh(new THREE.PlaneGeometry(1.6,0.5),shopSignMat("EXIT"));
  esign.position.set(ex,RY+1.9,ez+0.4);parent.add(esign);
  roomExits.push({g:parent,x:ex,z:ez,y:RY,id,outX:x-1,outZ:z+d/2+2,outY:baseY});
  hotelDesks.push({g:parent,x:dx,z:dz+1,id,y:baseY,room:{x,z,ry:RY}});
  regShell(parent,x,z,w/2,d/2,baseY,[{x:x-1,z:z+d/2,r:1.8}]);
  const rec=regBuilding(x,z,w,d,parts,baseY);rec.walkThru=true;
  return rec;
}
/* one shared framed-window material for every house (glass + white frame + warm light) */
let _houseWin=null;
function houseWinMat(){
  if(_houseWin)return _houseWin;
  const cv=document.createElement("canvas");cv.width=64;cv.height=64;
  const c=cv.getContext("2d");
  c.fillStyle="#f4f7fb";c.fillRect(0,0,64,64);                 // frame
  c.fillStyle="#2b4a63";c.fillRect(6,6,52,52);                 // glass
  c.fillStyle="#8fb6d0";c.beginPath();c.moveTo(6,40);c.lineTo(40,6);c.lineTo(58,6);c.lineTo(6,58);c.fill(); // sky reflection
  c.fillStyle="#f4f7fb";c.fillRect(29,6,6,52);c.fillRect(6,29,52,6); // cross bars
  _houseWin=keep(new THREE.MeshLambertMaterial({map:keep(new THREE.CanvasTexture(cv)),side:THREE.DoubleSide}));
  return _houseWin;
}
const roofMats=[0xa0522d,0x7a4a3a,0x5b6470,0x8a3b2e].map(c=>keep(new THREE.MeshLambertMaterial({color:c})));
/* wooden siding texture: houses stop looking like plastic blocks */
let _siding=null;
function sidingTex(){
  if(_siding)return _siding;
  const cv=document.createElement("canvas");cv.width=64;cv.height=64;
  const c=cv.getContext("2d");
  c.fillStyle="#ffffff";c.fillRect(0,0,64,64);
  c.strokeStyle="rgba(0,0,0,0.14)";c.lineWidth=1;
  for(let y=6;y<64;y+=7){c.beginPath();c.moveTo(0,y);c.lineTo(64,y);c.stroke();}
  c.fillStyle="rgba(0,0,0,0.05)";
  for(let i=0;i<50;i++)c.fillRect(Math.random()*64,Math.random()*64,2.5,1);
  _siding=keep(new THREE.CanvasTexture(cv));
  _siding.wrapS=_siding.wrapT=THREE.RepeatWrapping;
  _siding.repeat.set(2,1.6);
  return _siding;
}
function house(x,z,rand,parent,baseY){
  baseY=baseY||0;
  const cols=[0xf2e8cf,0xe8b4b8,0xcde3d0,0xf3d9a4,0xdbe7f5];
  const w=7+rand()*3,d=7+rand()*3,h=4+rand()*1.5;
  const m=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color:cols[Math.floor(rand()*cols.length)],map:sidingTex()})));
  m.position.set(x,baseY+h/2-0.3,z);parent.add(m);
  const roof=shadowBox(new THREE.Mesh(new THREE.ConeGeometry(Math.max(w,d)*0.75,3,4),roofMats[Math.floor(rand()*roofMats.length)]));
  roof.position.set(x,baseY+h+1.2,z);roof.rotation.y=Math.PI/4;parent.add(roof);
  /* framed windows on the front and both sides + a brick chimney */
  const wm=houseWinMat();
  [[-w/4,d/2+0.03,0],[w/4,d/2+0.03,0]].forEach(p=>{
    const win=new THREE.Mesh(new THREE.PlaneGeometry(1.3,1.2),wm);
    win.position.set(x+p[0],baseY+h/2+0.2,z+p[1]);parent.add(win);});
  [[-w/2-0.03,-Math.PI/2],[w/2+0.03,Math.PI/2]].forEach(p=>{
    const win=new THREE.Mesh(new THREE.PlaneGeometry(1.3,1.2),wm);
    win.position.set(x+p[0],baseY+h/2+0.2,z);win.rotation.y=p[1];parent.add(win);});
  const chim=new THREE.Mesh(new THREE.BoxGeometry(0.7,1.8,0.7),new THREE.MeshLambertMaterial({color:0x9c5a4a}));
  chim.position.set(x+w/4,baseY+h+1.6,z-d/4);parent.add(chim);
  /* doorstep */
  const step=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.18,0.9),new THREE.MeshLambertMaterial({color:0xb9b2a6}));
  step.position.set(x,baseY+0.09,z+d/2+0.45);parent.add(step);
  makeDoor(x,z+d/2+0.05,0,parent,baseY);
  return regBuilding(x,z,Math.max(w,d),Math.max(w,d),[m,roof],baseY);
}
const SHOP_NAMES=["MART 24","FRESH & GO","MEGA SHOP","SNACK BOX","SUPER SAVE","CORNER STORE"];
const shops=[];   // every shop you can walk into and buy food (press T inside)
const signCache=new Map();
let _parkSign=null;
function parkSignMat(){
  if(_parkSign)return _parkSign;
  const cv=document.createElement("canvas");cv.width=256;cv.height=64;
  const c2=cv.getContext("2d");c2.fillStyle="#1c4d8f";c2.fillRect(0,0,256,64);
  c2.fillStyle="#fff";c2.font="bold 40px Segoe UI";c2.textAlign="center";c2.fillText("P  PARKING",128,46);
  _parkSign=keep(new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv)}));
  return _parkSign;
}
function shopSignMat(name){
  if(signCache.has(name))return signCache.get(name);
  const cv=document.createElement("canvas");cv.width=256;cv.height=64;
  const c=cv.getContext("2d");c.fillStyle="#c0392b";c.fillRect(0,0,256,64);
  c.fillStyle="#fff";c.font="bold 34px Segoe UI";c.textAlign="center";c.fillText(name,128,44);
  const m=keep(new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv)}));
  signCache.set(name,m);return m;
}
function shop(x,z,rand,parent,baseY){
  const w=16,d=12,h=4.6,wall=0.35;
  const mat=new THREE.MeshLambertMaterial({color:[0xe8e2d4,0xd9c8b4,0xcfd8dc][Math.floor(rand()*3)]});
  const parts=[];
  function wallBox(bw,bh,bd,px,py,pz){const m=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd),mat));
    m.position.set(x+px,baseY+py,z+pz);parent.add(m);parts.push(m);return m;}
  wallBox(w,h,wall,0,h/2,-d/2);                    // back
  wallBox(wall,h,d,-w/2,h/2,0);wallBox(wall,h,d,w/2,h/2,0);
  wallBox(w/2-1.2,h,wall,-(w/4+0.6),h/2,d/2);      // front left of the doorway
  wallBox(w/2-1.2,h,wall,(w/4+0.6),h/2,d/2);       // front right
  wallBox(w,0.6,wall*2,0,h-0.3,d/2);
  const roof=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(w+0.6,0.5,d+0.6),new THREE.MeshLambertMaterial({color:0x3d444d})));
  roof.position.set(x,baseY+h+0.25,z);parent.add(roof);parts.push(roof);
  const floor=new THREE.Mesh(new THREE.BoxGeometry(w-0.4,0.12,d-0.4),new THREE.MeshLambertMaterial({color:0xd8d2c4}));
  floor.position.set(x,baseY+0.06,z);parent.add(floor);
  for(let i=0;i<2;i++){                             // shelves you can walk between
    const sh=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(1.4,1.5,7),new THREE.MeshLambertMaterial({color:0x8a6f4d})));
    sh.position.set(x-3+i*6,baseY+0.75,z-1);parent.add(sh);parts.push(sh);
    for(let j=0;j<5;j++){const it=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.4,0.5),new THREE.MeshLambertMaterial({color:COLORS[Math.floor(rand()*COLORS.length)]}));
      it.position.set(x-3+i*6,baseY+1.7,z-4+j*1.5);parent.add(it);}
  }
  makeDoor(x-1.15,z+d/2,0,parent,baseY,0x2e4a62);
  /* glass storefront windows either side of the door + a striped awning */
  [[-(w/4+0.6)],[w/4+0.6]].forEach(p=>{
    const win=new THREE.Mesh(new THREE.PlaneGeometry(w/2-2.4,2.4),glassMat);
    win.position.set(x+p[0],baseY+1.9,z+d/2+0.05);parent.add(win);});
  const awn=new THREE.Mesh(new THREE.BoxGeometry(w*0.85,0.14,1.5),new THREE.MeshLambertMaterial({color:[0xd7263d,0x1d6fd1,0x0f7a3d][Math.floor(rand()*3)]}));
  awn.position.set(x,baseY+3.3,z+d/2+0.8);awn.rotation.x=0.24;parent.add(awn);
  const name=SHOP_NAMES[Math.floor(rand()*SHOP_NAMES.length)];
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(9,2.2),shopSignMat(name));
  sign.position.set(x,baseY+h+1.6,z+d/2+0.05);parent.add(sign);
  shops.push({g:parent,x,z,huge:false});
  regShell(parent,x,z,w/2,d/2,baseY,[{x:x-1.15,z:z+d/2,r:1.9}]);
  const rec=regBuilding(x,z,w,d,parts,baseY);rec.walkThru=true;
  return rec;
}
/* ---- MEGA MART: a huge shop with lots of shelves + Squishy Dumplings ---- */
const HUGE_NAMES=["MEGA MART","GIGA STORE","SUPER CENTER"];
let _dumpSign=null;
function dumpSignMat(){
  if(_dumpSign)return _dumpSign;
  const cv=document.createElement("canvas");cv.width=256;cv.height=64;
  const c=cv.getContext("2d");c.fillStyle="#ff5d8f";c.fillRect(0,0,256,64);
  c.fillStyle="#fff";c.font="bold 24px Segoe UI";c.textAlign="center";c.fillText("SQUISHY DUMPLINGS",128,41);
  _dumpSign=keep(new THREE.MeshBasicMaterial({map:keep(new THREE.CanvasTexture(cv)),side:THREE.DoubleSide}));
  return _dumpSign;
}
function hugeShop(x,z,rand,parent,baseY){
  /* GIANT: fills a whole city block (100 x 76 m, 12 m tall) */
  const w=100,d=76,h=12,wall=0.5;
  const mat=new THREE.MeshLambertMaterial({color:0xdfe3ea});
  const parts=[];
  function wallBox(bw,bh,bd,px,py,pz){const m=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd),mat));
    m.position.set(x+px,baseY+py,z+pz);parent.add(m);parts.push(m);return m;}
  wallBox(w,h,wall,0,h/2,-d/2);                      // back
  wallBox(wall,h,d,-w/2,h/2,0);wallBox(wall,h,d,w/2,h/2,0);
  /* front: two 6 m doorways at x-25 and x+25 */
  wallBox(22,h,wall,-39,h/2,d/2);
  wallBox(44,h,wall,0,h/2,d/2);
  wallBox(22,h,wall,39,h/2,d/2);
  wallBox(w,1.6,wall*2,0,h-0.8,d/2);                 // header above the doors
  const roof=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(w+1.2,0.8,d+1.2),new THREE.MeshLambertMaterial({color:0x3d444d})));
  roof.position.set(x,baseY+h+0.4,z);parent.add(roof);parts.push(roof);
  /* foundation + real walkable floor (no floating, no sinking) */
  const found=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(w+1.2,5,d+1.2),new THREE.MeshLambertMaterial({color:0x8d8577})));
  found.position.set(x,baseY-2.4,z);parent.add(found);
  const floor=new THREE.Mesh(new THREE.BoxGeometry(w-0.6,0.3,d-0.6),new THREE.MeshLambertMaterial({color:0xd8d2c4}));
  floor.position.set(x,baseY+0.15,z);parent.add(floor);
  decks.push({g:parent,x,z,hw:w/2-0.5,hd:d/2-0.5,tops:[baseY+0.3],ramp:null});
  /* roof-support pillars */
  const pilM=new THREE.MeshLambertMaterial({color:0xb9bfc9});
  for(const px of[-25,0,25])for(const pz of[-20,20]){
    const p=new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.6,h),pilM);
    p.position.set(x+px,baseY+h/2,z+pz);parent.add(p);parts.push(p);
  }
  for(let i=0;i<8;i++){                               // 8 LONG shelf aisles
    const shx=x-38.5+i*11;
    const sh=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(2,2.4,46),new THREE.MeshLambertMaterial({color:0x8a6f4d})));
    sh.position.set(shx,baseY+1.2,z-4);parent.add(sh);parts.push(sh);
    for(let j=0;j<12;j++){const it=new THREE.Mesh(new THREE.BoxGeometry(0.75,0.6,0.75),new THREE.MeshLambertMaterial({color:COLORS[Math.floor(rand()*COLORS.length)]}));
      it.position.set(shx,baseY+2.7,z-26+j*4);parent.add(it);}
  }
  /* checkout counters near the doors */
  for(let i=0;i<3;i++){
    const ck=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(4.5,1.05,1.6),new THREE.MeshLambertMaterial({color:0x2e4a62})));
    ck.position.set(x-30+i*14,baseY+0.52,z+28);parent.add(ck);parts.push(ck);
  }
  /* TWO Squishy Dumpling stands */
  for(const sx of[-42,42]){
    const st=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(4.2,1.1,1.6),new THREE.MeshLambertMaterial({color:0xff5d8f})));
    st.position.set(x+sx,baseY+0.55,z+27);parent.add(st);parts.push(st);
    [0xd7263d,0x1b98e0,0x8ac926,0xf4d35e,0x9b5de5].forEach((dc,i)=>{
      const dmp=new THREE.Mesh(new THREE.SphereGeometry(0.3,10,8),new THREE.MeshLambertMaterial({color:dc}));
      dmp.scale.y=0.72;dmp.position.set(x+sx-1.5+i*0.75,baseY+1.3,z+27);parent.add(dmp);
    });
    const dsg=new THREE.Mesh(new THREE.PlaneGeometry(4.4,1.1),dumpSignMat());
    dsg.position.set(x+sx,baseY+3,z+27);parent.add(dsg);
  }
  makeDoor(x-27.5,z+d/2,0,parent,baseY,0x2e4a62);
  makeDoor(x+22.5,z+d/2,0,parent,baseY,0x2e4a62);
  const name=HUGE_NAMES[Math.floor(rand()*HUGE_NAMES.length)];
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(44,10),shopSignMat(name));
  sign.position.set(x,baseY+h+5.6,z+d/2+0.1);parent.add(sign);
  const sign2=new THREE.Mesh(new THREE.PlaneGeometry(30,7),shopSignMat(name));
  sign2.position.set(x-w/2-0.1,baseY+h+4,z);sign2.rotation.y=-Math.PI/2;parent.add(sign2);
  for(let i=0;i<3;i++)spawnQueue.push([x-20+rand()*40,z+d/2+4+rand()*5]);
  shops.push({g:parent,x,z,huge:true});
  regShell(parent,x,z,w/2,d/2,baseY,[{x:x-25,z:z+d/2,r:3.6},{x:x+25,z:z+d/2,r:3.6}]);
  const rec=regBuilding(x,z,w,d,parts,baseY);rec.walkThru=true;
  return rec;
}
/* one MEGA MART every ~3 km — the same rule draws them on the map.
   It fills a whole city block, so it sits centered between the grid roads. */
const HSP=3000;
function hugeShopSpot(i,j){
  const x=Math.round((i*HSP+750-90)/120)*120+90;   // block centers are at 90 + k*120
  const z=Math.round((j*HSP+390-90)/120)*120+90;
  if(Math.abs(x)<320&&Math.abs(z)<320)return null;                 // not downtown
  if(Math.abs(x-170)<70||Math.abs(z+170)<70)return null;           // not on the highways
  if(inAirport(x,z)||inAirport(x-50,z)||inAirport(x+50,z))return null;
  const h=baseH(x,z);
  if(h<-1||h>14)return null;
  /* the whole 100 x 76 footprint must be dry and roughly flat */
  for(const[ox,oz]of[[-45,-33],[45,-33],[-45,33],[45,33]]){
    const ch=baseH(x+ox,z+oz);
    if(ch<-1||Math.abs(ch-h)>3.5)return null;
  }
  if(nearestRail(x,z).d<70)return null;
  if(Math.abs(x-curveXC(x,z))<70||Math.abs(z-curveZC(x,z))<70)return null;
  if(rocketPadDist(x,z)<110)return null;
  /* keep McDrives out of the store */
  const mi=Math.round((x-62)/MCSP),mj=Math.round((z-90)/MCSP);
  for(let a=mi-1;a<=mi+1;a++)for(let b=mj-1;b<=mj+1;b++){
    const m=mcdSpot(a,b);
    if(m&&Math.abs(m.x-x)<75&&Math.abs(m.z-z)<62)return null;
  }
  return{x,z};
}
/* ---- MEGA MANSIONS: a giant rentable house every ~2 km, fills a whole block ---- */
const mansions=[];
const MSP=2000;
function mansionSpot(i,j){
  const x=Math.round((i*MSP+1230-90)/120)*120+90;   // block-centered, like the MEGA MART
  const z=Math.round((j*MSP+870-90)/120)*120+90;
  if(Math.abs(x)<320&&Math.abs(z)<320)return null;
  if(Math.abs(x-170)<70||Math.abs(z+170)<70)return null;
  if(inAirport(x,z)||inAirport(x-50,z)||inAirport(x+50,z))return null;
  const h=baseH(x,z);
  if(h<-1||h>14)return null;
  for(const[ox2,oz2]of[[-45,-33],[45,-33],[-45,33],[45,33]]){
    const ch=baseH(x+ox2,z+oz2);
    if(ch<-1||Math.abs(ch-h)>3.5)return null;
  }
  if(nearestRail(x,z).d<70)return null;
  if(Math.abs(x-curveXC(x,z))<70||Math.abs(z-curveZC(x,z))<70)return null;
  if(rocketPadDist(x,z)<110)return null;
  const hs=hugeShopSpot(Math.round((x-750)/HSP),Math.round((z-390)/HSP));
  if(hs&&Math.abs(hs.x-x)<130&&Math.abs(hs.z-z)<110)return null;   // never share a block with a MEGA MART
  return{x,z};
}
function mansion(x,z,rand,parent,baseY){
  const w=100,d=76,H=9,wall=0.5;
  const mat=new THREE.MeshLambertMaterial({color:0xf2ecdc});
  const parts=[];
  function wallBox(bw,bh,bd,px,py,pz){const m=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd),mat));
    m.position.set(x+px,baseY+py,z+pz);parent.add(m);parts.push(m);return m;}
  /* grand ground-floor hall you can walk into */
  wallBox(w,H,wall,0,H/2,-d/2);
  wallBox(wall,H,d,-w/2,H/2,0);wallBox(wall,H,d,w/2,H/2,0);
  wallBox(w/2-4,H,wall,-(w/4+2),H/2,d/2);   // front: one 8 m grand doorway
  wallBox(w/2-4,H,wall,(w/4+2),H/2,d/2);
  wallBox(w,1.6,wall*2,0,H-0.8,d/2);
  /* solid foundation so the mansion never floats over dips in the ground */
  const found=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(w+1.2,5,d+1.2),new THREE.MeshLambertMaterial({color:0x8d8577})));
  found.position.set(x,baseY-2.4,z);parent.add(found);
  const floor=new THREE.Mesh(new THREE.BoxGeometry(w-0.6,0.3,d-0.6),new THREE.MeshLambertMaterial({color:0xcabfa6}));
  floor.position.set(x,baseY+0.15,z);parent.add(floor);
  /* the floor is a REAL surface you can stand and drive on */
  decks.push({g:parent,x,z,hw:w/2-0.5,hd:d/2-0.5,tops:[baseY+0.3],ramp:null});
  /* two upper storeys with windows */
  const up=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(w,20,d),new THREE.MeshLambertMaterial({map:winTexes[Math.floor(rand()*4)]})));
  up.position.set(x,baseY+H+10,z);parent.add(up);parts.push(up);
  const roof=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(w+2,1,d+2),new THREE.MeshLambertMaterial({color:0x7a2c1a})));
  roof.position.set(x,baseY+H+20.5,z);parent.add(roof);parts.push(roof);
  /* towers on the front corners */
  for(const sx of[-1,1]){
    const tw=shadowBox(new THREE.Mesh(new THREE.CylinderGeometry(6,6,38,10),mat));
    tw.position.set(x+sx*(w/2-4),baseY+19,z+d/2-4);parent.add(tw);parts.push(tw);
    const cone=shadowBox(new THREE.Mesh(new THREE.ConeGeometry(7,8,10),new THREE.MeshLambertMaterial({color:0x7a2c1a})));
    cone.position.set(x+sx*(w/2-4),baseY+42,z+d/2-4);parent.add(cone);parts.push(cone);
  }
  /* white entrance pillars */
  for(const sx of[-6,6]){
    const p=new THREE.Mesh(new THREE.CylinderGeometry(0.8,0.9,H),new THREE.MeshLambertMaterial({color:0xffffff}));
    p.position.set(x+sx,baseY+H/2,z+d/2+1.6);parent.add(p);parts.push(p);
  }
  makeDoor(x-2,z+d/2,0,parent,baseY,0x6b3b16);
  /* golden sign */
  const cv=document.createElement("canvas");cv.width=512;cv.height=96;
  const c2=cv.getContext("2d");c2.fillStyle="#1a1030";c2.fillRect(0,0,512,96);
  c2.fillStyle="#ffd700";c2.font="bold 56px Segoe UI";c2.textAlign="center";c2.fillText("MEGA MANSION",256,66);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(30,5.6),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv)}));
  sign.position.set(x,baseY+H+22.6,z+d/2+0.1);parent.add(sign);
  const id="M:"+Math.round(x)+","+Math.round(z);
  /* reception OUTSIDE, in front of the entrance: buy the mansion here ($2M, press T) */
  const dx=x+11,dz=z+d/2+7;
  const dy=terrainH(dx,dz);
  const desk=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(3.4,1.1,1),new THREE.MeshLambertMaterial({color:0x8a6f4d})));
  desk.position.set(dx,dy+0.55,dz);parent.add(desk);
  const rsign=new THREE.Mesh(new THREE.PlaneGeometry(5,1),shopSignMat("RECEPTION · $2M"));
  rsign.position.set(dx,dy+2.8,dz-0.6);parent.add(rsign);
  const rp=makePerson(0.92);rp.position.set(dx,dy,dz-1.4);parent.add(rp);
  hotelDesks.push({g:parent,x:dx,z:dz+1.2,id,y:dy,room:{x,z,ry:baseY},mansion:true});
  /* every mansion has a GARDEN in front: lawn, hedges, a stone path & flowers */
  {
    /* two lawn strips: front (with the reception) and back — the block leaves ~11 m each */
    for(const side of[1,-1]){
      const lg=new THREE.PlaneGeometry(100,11,10,2);lg.rotateX(-Math.PI/2);
      const lp=lg.attributes.position;
      for(let i=0;i<lp.count;i++){
        const wx=x+lp.getX(i),wz=z+side*(d/2+6.2)+lp.getZ(i);
        lp.setXYZ(i,wx,terrainH(wx,wz)+0.14,wz);
      }
      lg.computeVertexNormals();
      const lawn=new THREE.Mesh(lg,new THREE.MeshLambertMaterial({color:0x5da24a}));
      lawn.receiveShadow=true;parent.add(lawn);
    }
    /* stone path from the door through the front garden */
    parent.add(ribbon("z",x-2,z+d/2+1,z+d/2+11.5,3,0.2,sideMat));
    const hedgeM=new THREE.MeshLambertMaterial({color:0x2f7a3c});
    for(let hx=-48;hx<=48;hx+=8){
      if(Math.abs(hx-(-2))<4)continue;   // gap for the path
      const h=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(6,1.2,1.2),hedgeM));
      const hz=z+d/2+11;
      h.position.set(x+hx,terrainH(x+hx,hz)+0.7,hz);parent.add(h);
    }
    const flowerCols=[0xff5d8f,0xf4d35e,0xef476f,0x9b5de5,0xffffff];
    for(let i=0;i<10;i++){
      const fx=x-46+i*10.2,fz=z+d/2+(i%2?3:9);
      const fy=terrainH(fx,fz);
      const st=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.5),new THREE.MeshLambertMaterial({color:0x2f7a3c}));
      st.position.set(fx,fy+0.35,fz);parent.add(st);
      const bl=new THREE.Mesh(new THREE.SphereGeometry(0.14,7,6),new THREE.MeshLambertMaterial({color:flowerCols[i%flowerCols.length]}));
      bl.position.set(fx,fy+0.66,fz);parent.add(bl);
    }
  }
  regShell(parent,x,z,w/2,d/2,baseY,[{x:x,z:z+d/2,r:4.6}]);
  const rec=regBuilding(x,z,w,d,parts,baseY);rec.walkThru=true;
  const man={g:parent,x,z,id,baseY,tableG:null,furnG:null};
  mansions.push(man);
  if(window.onMansionBuilt)onMansionBuilt(man);   // rebuilds the dumpling display table
  return rec;
}
/* ---- dumpling buyers: a friendly buyer at the roadside every ~500 m ---- */
const buyers=[];
let _buySign=null;
function buySignMat(){
  if(_buySign)return _buySign;
  const cv=document.createElement("canvas");cv.width=256;cv.height=64;
  const c=cv.getContext("2d");c.fillStyle="#ff5d8f";c.fillRect(0,0,256,64);
  c.fillStyle="#fff";c.font="bold 22px Segoe UI";c.textAlign="center";
  c.fillText("DUMPLING BUYER",128,28);c.font="bold 18px Segoe UI";c.fillText("\u{1F95F} SELL HERE \u{1F4B5}",128,52);
  _buySign=keep(new THREE.MeshBasicMaterial({map:keep(new THREE.CanvasTexture(cv)),side:THREE.DoubleSide}));
  return _buySign;
}
const DBSP=500;
function buyerSpot(i,j){
  const lx=Math.round((i*DBSP+270-30)/120)*120+30;   // on the sidewalk beside a road
  const x=lx+12,z=j*DBSP+330;
  if(nearGridLine(z)<16)return null;
  if(Math.abs(x)<200&&Math.abs(z)<200)return null;
  if(inAirport(x,z))return null;
  const h=baseH(x,z);
  if(h<-1||h>14)return null;
  if(nearestRail(x,z).d<14)return null;
  if(Math.abs(x-curveXC(x,z))<14||Math.abs(z-curveZC(x,z))<14)return null;
  if(rocketPadDist(x,z)<60)return null;
  const hs=hugeShopSpot(Math.round((x-750)/HSP),Math.round((z-390)/HSP));
  if(hs&&Math.abs(x-hs.x)<62&&Math.abs(z-hs.z)<50)return null;
  const ms=mansionSpot(Math.round((x-1230)/MSP),Math.round((z-870)/MSP));
  if(ms&&Math.abs(x-ms.x)<62&&Math.abs(z-ms.z)<50)return null;
  return{x,z};
}
function buildBuyer(x,z,g){
  const y=terrainH(x,z);
  const ct=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(2.6,1.05,1),new THREE.MeshLambertMaterial({color:0xff5d8f})));
  ct.position.set(x,y+0.52,z);g.add(ct);
  [0xd7263d,0x8ac926,0xf4d35e].forEach((dc,i)=>{
    const dmp=new THREE.Mesh(new THREE.SphereGeometry(0.16,8,7),new THREE.MeshLambertMaterial({color:dc}));
    dmp.scale.y=0.72;dmp.position.set(x-0.7+i*0.7,y+1.14,z);g.add(dmp);
  });
  const man=makePerson(0.95,0xff5d8f);man.position.set(x,y,z-1.3);g.add(man);
  const sp=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,2.6),poleMat);sp.position.set(x+1.9,y+1.3,z);g.add(sp);
  const sg=new THREE.Mesh(new THREE.PlaneGeometry(3.4,1),buySignMat());sg.position.set(x+1.9,y+3,z);g.add(sg);
  buyers.push({g,x,z});
}
/* ---- McDrive: a drive-through restaurant every ~500 m, right beside a road ---- */
const mcds=[];
let _mcdSign=null,_mcdBoard=null;
function mcdSignMat(){
  if(_mcdSign)return _mcdSign;
  const cv=document.createElement("canvas");cv.width=256;cv.height=128;
  const c=cv.getContext("2d");c.fillStyle="#c0392b";c.fillRect(0,0,256,128);
  c.fillStyle="#ffd75e";c.font="bold 92px Segoe UI";c.textAlign="center";c.fillText("M",128,92);
  c.font="bold 22px Segoe UI";c.fillText("McDrive",128,118);
  _mcdSign=keep(new THREE.MeshBasicMaterial({map:keep(new THREE.CanvasTexture(cv)),side:THREE.DoubleSide}));
  return _mcdSign;
}
function mcdBoardMat(){
  if(_mcdBoard)return _mcdBoard;
  const cv=document.createElement("canvas");cv.width=256;cv.height=256;
  const c=cv.getContext("2d");c.fillStyle="#1c4d2e";c.fillRect(0,0,256,256);
  c.fillStyle="#fff";c.font="bold 34px Segoe UI";c.textAlign="center";
  c.fillText("ORDER",128,64);c.fillText("HERE",128,106);
  c.font="26px Segoe UI";c.fillText("\u{1F354} \u{1F35F} \u{1F964}",128,166);
  c.font="20px Segoe UI";c.fillText("stop your car",128,212);
  _mcdBoard=keep(new THREE.MeshBasicMaterial({map:keep(new THREE.CanvasTexture(cv)),side:THREE.DoubleSide}));
  return _mcdBoard;
}
const MCSP=480;   // one McDrive candidate every ~500 m
/* one shared check, so the map shows exactly the McDrives that really exist */
function mcdSpot(i,j){
  const ax=i*MCSP+30,az=j*MCSP+90;
  if(Math.abs(ax)<200&&Math.abs(az)<200)return null;
  if(inAirport(ax+16,az)||inAirport(ax+30,az))return null;
  if(baseH(ax+16,az)<-1||baseH(ax+30,az)<-1)return null;
  if(gradeAt(ax+16,az)>14)return null;
  if(nearestRail(ax+16,az).d<14)return null;
  if(Math.abs(ax+16-curveXC(ax+16,az))<14||Math.abs(az-curveZC(ax+16,az))<14)return null;
  if(rocketPadDist(ax+16,az)<60)return null;
  return{ax,az,x:ax+16,z:az};
}
function buildMcd(ax,az,g){
  /* lane runs north beside the road: order board first, then the window */
  g.add(ribbon("z",ax+16,az-20,az+20,6,0.14,asphMat));
  const bx=ax+27,by=terrainH(bx,az+2);
  const bmat=new THREE.MeshLambertMaterial({color:0xb8452b});
  const b=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(12,5,11),bmat));
  b.position.set(bx,by+2.5,az+2);g.add(b);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(12.6,0.5,11.6),new THREE.MeshLambertMaterial({color:0x7a2c1a}));
  roof.position.set(bx,by+5.25,az+2);g.add(roof);
  const win=new THREE.Mesh(new THREE.BoxGeometry(0.2,1.6,2.6),glassMat);
  win.position.set(bx-6.1,by+2.2,az+4);g.add(win);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(6,3),mcdSignMat());
  sign.position.set(bx,by+8.6,az+2);g.add(sign);
  const sp=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.26,3.5),poleMat);
  sp.position.set(bx,by+6.9,az+2);g.add(sp);
  const bdy=terrainH(ax+19.6,az-8);
  const bd=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),mcdBoardMat());
  bd.position.set(ax+19.6,bdy+1.9,az-8);bd.rotation.y=-Math.PI/2;g.add(bd);
  const bp=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,1.6),poleMat);
  bp.position.set(ax+19.6,bdy+0.8,az-8);g.add(bp);
  const rec=regBuilding(bx,az+2,12,11,[b,roof],by);
  g.userData.recs.push(rec);
  mcds.push({g,board:{x:ax+16,z:az-8},window:{x:ax+16,z:az+4},out:{x:ax+16,z:az+19}});
}
/* ---------- gas stations: fill your tank (cars run dry after 699 km) ---------- */
const gasStations=[];
let _gasSign=null;
function gasSignMat(){
  if(_gasSign)return _gasSign;
  const cv=document.createElement("canvas");cv.width=256;cv.height=128;
  const c=cv.getContext("2d");c.fillStyle="#0f7a3d";c.fillRect(0,0,256,128);
  c.fillStyle="#fff";c.font="bold 58px Segoe UI";c.textAlign="center";c.fillText("⛽ GAS",128,62);
  c.font="bold 26px Segoe UI";c.fillText("stop & press T",128,104);
  _gasSign=keep(new THREE.MeshBasicMaterial({map:keep(new THREE.CanvasTexture(cv)),side:THREE.DoubleSide}));
  return _gasSign;
}
const GSP=840;   // a gas station candidate every ~840 m (offset from the McDrive grid)
function gasSpot(i,j){
  const ax=i*GSP+270,az=j*GSP+150;
  if(Math.abs(ax)<200&&Math.abs(az)<200)return null;
  if(inAirport(ax+16,az)||inAirport(ax+30,az))return null;
  if(baseH(ax+16,az)<-1||baseH(ax+30,az)<-1)return null;
  if(gradeAt(ax+16,az)>14)return null;
  if(nearestRail(ax+16,az).d<14)return null;
  if(Math.abs(ax+16-curveXC(ax+16,az))<14||Math.abs(az-curveZC(ax+16,az))<14)return null;
  if(rocketPadDist(ax+16,az)<60)return null;
  return{ax,az,x:ax+16,z:az};
}
function buildGas(ax,az,g){
  const fx=ax+16,fy=terrainH(fx,az);
  /* forecourt beside the road */
  g.add(ribbon("z",fx,az-14,az+14,10,0.14,asphMat));
  /* canopy on four poles */
  const cmat=new THREE.MeshLambertMaterial({color:0xf4f7fb});
  const roof=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(12,0.5,16),cmat));
  roof.position.set(fx+3,fy+5,az);g.add(roof);
  const band=new THREE.Mesh(new THREE.BoxGeometry(12.1,0.6,16.1),new THREE.MeshLambertMaterial({color:0x0f7a3d}));
  band.position.set(fx+3,fy+4.6,az);g.add(band);
  [[-4,-6],[-4,6],[9,-6],[9,6]].forEach(p=>{
    const pl=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.18,4.6),poleMat);
    pl.position.set(fx+p[0]+1,fy+2.3,az+p[1]);g.add(pl);});
  /* two pump islands */
  [[-3.4],[3.4]].forEach(p=>{
    const isl=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.24,4.6),new THREE.MeshLambertMaterial({color:0x9aa0a8}));
    isl.position.set(fx+4,fy+0.12,az+p[0]);g.add(isl);
    const pump=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(0.8,1.6,0.6),new THREE.MeshLambertMaterial({color:0xd7263d})));
    pump.position.set(fx+4,fy+0.9,az+p[0]);g.add(pump);
    const scrn=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.4,0.04),new THREE.MeshBasicMaterial({color:0xbfe8ff}));
    scrn.position.set(fx+4,fy+1.25,az+p[0]+0.33);g.add(scrn);
  });
  /* little kiosk + the tall price sign */
  const kio=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(7,3.2,6),new THREE.MeshLambertMaterial({color:0xdfe4ea})));
  kio.position.set(ax+27,terrainH(ax+27,az)+1.6,az);g.add(kio);
  const sp=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,7),poleMat);
  sp.position.set(fx,fy+3.5,az-12);g.add(sp);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(4.4,2.2),gasSignMat());
  sign.position.set(fx,fy+7.6,az-12);g.add(sign);
  const rec=regBuilding(ax+27,az,7,6,[kio],terrainH(ax+27,az));
  g.userData.recs.push(rec);
  gasStations.push({g,x:fx+4,z:az});
}
/* ---------- cave openings on the mountains — press T to walk inside ---------- */
const caves=[];
const CVSP=1500;   // a cave candidate every ~1.5 km, only where there is a real mountain
function caveSpot(i,j){
  const x=i*CVSP+740,z=j*CVSP+380;
  if(baseH(x,z)<24)return null;                 // only on proper mountains
  if(onAnyRoad(x,z))return null;
  if(rocketPadDist(x,z)<80)return null;
  return{x,z};
}
function buildCaveMouth(x,z,g){
  const y=terrainH(x,z);
  const rock=new THREE.MeshLambertMaterial({color:0x6d6a66});
  const p1=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(2.6,7,3.4),rock));p1.position.set(x-3.2,y+3,z);p1.rotation.z=0.12;g.add(p1);
  const p2=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(2.6,7,3.4),rock));p2.position.set(x+3.2,y+3,z);p2.rotation.z=-0.12;g.add(p2);
  const top=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(9.4,2.8,3.4),rock));top.position.set(x,y+6.6,z);g.add(top);
  const dark=new THREE.Mesh(new THREE.PlaneGeometry(4.6,5.4),new THREE.MeshBasicMaterial({color:0x07070c,side:THREE.DoubleSide}));
  dark.position.set(x,y+2.7,z);g.add(dark);
  [[-2.4],[2.4]].forEach(p=>{
    const tor=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.5,0.16),new THREE.MeshBasicMaterial({color:0xffb02e}));
    tor.position.set(x+p[0],y+3.6,z+1.72);g.add(tor);});
  caves.push({g,x,z});
}
/* ---------- DUMPLING MUSEUMS: one every ~1 km — see (and buy!) the rainbow glitter dumpling ---------- */
const museums=[];
const DMUS=1000;
let _musSign=null;
function museumSignMat(){
  if(_musSign)return _musSign;
  const cv=document.createElement("canvas");cv.width=512;cv.height=96;
  const c=cv.getContext("2d");
  const gr=c.createLinearGradient(0,0,512,0);
  ["#ff004c","#ff9e00","#ffee00","#37ff00","#00cfff","#9b5de5"].forEach((cc,i)=>gr.addColorStop(i/5,cc));
  c.fillStyle="#2a1030";c.fillRect(0,0,512,96);
  c.fillStyle=gr;c.font="bold 44px Segoe UI";c.textAlign="center";
  c.fillText("\u{1F3DB} DUMPLING MUSEUM",256,62);
  _musSign=keep(new THREE.MeshBasicMaterial({map:keep(new THREE.CanvasTexture(cv)),side:THREE.DoubleSide}));
  return _musSign;
}
function museumSpot(i,j){
  /* snapped to a block center, so it always sits nicely between the grid roads */
  const x=Math.round((i*DMUS+520-90)/120)*120+90;
  const z=Math.round((j*DMUS+260-90)/120)*120+90;
  if(Math.abs(x)<220&&Math.abs(z)<220)return null;
  if(inAirport(x,z)||inAirport(x-14,z)||inAirport(x+14,z))return null;
  const h=baseH(x,z);
  if(h<-1||h>14)return null;
  for(const[ox,oz]of[[-10,-8],[10,-8],[-10,8],[10,8]]){
    const ch=baseH(x+ox,z+oz);
    if(ch<-1||Math.abs(ch-h)>2.5)return null;
  }
  if(nearestRail(x,z).d<20)return null;
  if(Math.abs(x-curveXC(x,z))<20||Math.abs(z-curveZC(x,z))<20)return null;
  if(rocketPadDist(x,z)<70)return null;
  const hs=hugeShopSpot(Math.round((x-750)/HSP),Math.round((z-390)/HSP));
  if(hs&&Math.abs(hs.x-x)<70&&Math.abs(hs.z-z)<58)return null;
  const ms=mansionSpot(Math.round((x-1230)/MSP),Math.round((z-870)/MSP));
  if(ms&&Math.abs(ms.x-x)<70&&Math.abs(ms.z-z)<58)return null;
  const ch2=concertSpot(Math.round((x-1530)/CHSP),Math.round((z-1050)/CHSP));
  if(ch2&&Math.abs(ch2.x-x)<40&&Math.abs(ch2.z-z)<34)return null;
  return{x,z};
}
/* the rainbow texture also lives here so the museum can use it (game.js reuses it) */
let _rainbowMat=null;
function rainbowMat(){
  if(_rainbowMat)return _rainbowMat;
  const cv=document.createElement("canvas");cv.width=64;cv.height=16;
  const c=cv.getContext("2d");const gr=c.createLinearGradient(0,0,64,0);
  ["#ff004c","#ff9e00","#ffee00","#37ff00","#00cfff","#9b5de5"].forEach((cc,i)=>gr.addColorStop(i/5,cc));
  c.fillStyle=gr;c.fillRect(0,0,64,16);
  _rainbowMat=keep(new THREE.MeshLambertMaterial({map:keep(new THREE.CanvasTexture(cv))}));
  return _rainbowMat;
}
function buildMuseum(x,z,rand,parent,baseY){
  const w=18,d=14,h=5,wall=0.35;
  const mat=new THREE.MeshLambertMaterial({color:0xf3d7e8});
  const parts=[];
  function wallBox(bw,bh,bd,px,py,pz){const m=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd),mat));
    m.position.set(x+px,baseY+py,z+pz);parent.add(m);parts.push(m);return m;}
  wallBox(w,h,wall,0,h/2,-d/2);
  wallBox(wall,h,d,-w/2,h/2,0);wallBox(wall,h,d,w/2,h/2,0);
  wallBox(w/2-1.2,h,wall,-(w/4+0.6),h/2,d/2);
  wallBox(w/2-1.2,h,wall,(w/4+0.6),h/2,d/2);
  wallBox(w,0.6,wall*2,0,h-0.3,d/2);
  const roof=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(w+0.8,0.5,d+0.8),new THREE.MeshLambertMaterial({color:0x6d28d9})));
  roof.position.set(x,baseY+h+0.25,z);parent.add(roof);parts.push(roof);
  const floor=new THREE.Mesh(new THREE.BoxGeometry(w-0.4,0.12,d-0.4),new THREE.MeshLambertMaterial({color:0xe8e2f0}));
  floor.position.set(x,baseY+0.06,z);parent.add(floor);
  /* marble pedestal + THE rainbow glitter dumpling in a glass case */
  const ped=shadowBox(new THREE.Mesh(new THREE.CylinderGeometry(0.9,1.1,1.3,12),new THREE.MeshLambertMaterial({color:0xf4f7fb})));
  ped.position.set(x,baseY+0.65,z-2.5);parent.add(ped);
  const dump=new THREE.Mesh(new THREE.SphereGeometry(0.6,12,10),rainbowMat());
  dump.scale.y=0.75;dump.position.set(x,baseY+1.95,z-2.5);parent.add(dump);
  for(let i=0;i<10;i++){
    const th=i*2.399963,yy=1-(i+0.5)/5,rad=Math.sqrt(Math.max(0,1-yy*yy));
    const s=new THREE.Mesh(new THREE.OctahedronGeometry(0.11,0),new THREE.MeshBasicMaterial({color:0xffffff}));
    s.position.set(Math.cos(th)*rad*0.62,yy*0.47,Math.sin(th)*rad*0.62);s.rotation.set(i,i*2,0);
    dump.add(s);
  }
  const caseG=new THREE.Mesh(new THREE.BoxGeometry(2.2,1.8,2.2),glassMat);
  caseG.position.set(x,baseY+2.2,z-2.5);parent.add(caseG);
  /* little side exhibits: one dumpling of every color on small stands */
  [0xd7263d,0x1b98e0,0x8ac926,0xf4d35e,0xff5d8f,0x9b5de5].forEach((dc,i)=>{
    const sx=x-6+(i%3)*6,sz=z+2.5+(i<3?0:2.8);
    const st=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.9,0.8),new THREE.MeshLambertMaterial({color:0xd8d2e4}));
    st.position.set(sx,baseY+0.45,sz);parent.add(st);
    const dm=new THREE.Mesh(new THREE.SphereGeometry(0.24,10,8),new THREE.MeshLambertMaterial({color:dc}));
    dm.scale.y=0.75;dm.position.set(sx,baseY+1.1,sz);parent.add(dm);
  });
  makeDoor(x-1.15,z+d/2,0,parent,baseY,0x6d28d9);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(12,2.4),museumSignMat());
  sign.position.set(x,baseY+h+1.7,z+d/2+0.05);parent.add(sign);
  museums.push({g:parent,x,z,dump});
  regShell(parent,x,z,w/2,d/2,baseY,[{x:x-1.15,z:z+d/2,r:1.9}]);
  const rec=regBuilding(x,z,w,d,parts,baseY);rec.walkThru=true;
  return rec;
}
/* ---------- CONCERT HALLS: a stage, a real playable piano and a crowd ---------- */
const concertHalls=[];
const CHSP=2400;
let _chSign=null;
function chSignMat(){
  if(_chSign)return _chSign;
  const cv=document.createElement("canvas");cv.width=512;cv.height=96;
  const c=cv.getContext("2d");c.fillStyle="#1a1030";c.fillRect(0,0,512,96);
  c.fillStyle="#e3c5ff";c.font="bold 52px Segoe UI";c.textAlign="center";
  c.fillText("\u{1F3B5} CONCERT HALL",256,64);
  _chSign=keep(new THREE.MeshBasicMaterial({map:keep(new THREE.CanvasTexture(cv)),side:THREE.DoubleSide}));
  return _chSign;
}
function concertSpot(i,j){
  const x=i*CHSP+1530,z=j*CHSP+1050;   // block-centered: always 60 m from the grid roads
  if(Math.abs(x)<260&&Math.abs(z)<260)return null;
  if(inAirport(x,z)||inAirport(x-22,z)||inAirport(x+22,z))return null;
  if(nearGridLine(x)<34||nearGridLine(z)<30)return null;
  const h=baseH(x,z);
  if(h<-1||h>14)return null;
  for(const[ox,oz]of[[-18,-13],[18,-13],[-18,13],[18,13]]){
    const ch=baseH(x+ox,z+oz);
    if(ch<-1||Math.abs(ch-h)>3)return null;
  }
  if(nearestRail(x,z).d<30)return null;
  if(Math.abs(x-curveXC(x,z))<30||Math.abs(z-curveZC(x,z))<30)return null;
  if(rocketPadDist(x,z)<80)return null;
  const hs=hugeShopSpot(Math.round((x-750)/HSP),Math.round((z-390)/HSP));
  if(hs&&Math.abs(hs.x-x)<90&&Math.abs(hs.z-z)<70)return null;
  const ms=mansionSpot(Math.round((x-1230)/MSP),Math.round((z-870)/MSP));
  if(ms&&Math.abs(ms.x-x)<90&&Math.abs(ms.z-z)<70)return null;
  return{x,z};
}
function buildConcertHall(x,z,rand,parent,baseY){
  const w=40,d=30,h=8,wall=0.45;
  const mat=new THREE.MeshLambertMaterial({color:0x5b2333});
  const parts=[];
  function wallBox(bw,bh,bd,px,py,pz){const m=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd),mat));
    m.position.set(x+px,baseY+py,z+pz);parent.add(m);parts.push(m);return m;}
  wallBox(w,h,wall,0,h/2,-d/2);
  wallBox(wall,h,d,-w/2,h/2,0);wallBox(wall,h,d,w/2,h/2,0);
  wallBox(w/2-5,h,wall,-(w/4+2.5),h/2,d/2);   // 10 m doorway in the middle
  wallBox(w/2-5,h,wall,(w/4+2.5),h/2,d/2);
  wallBox(w,1.4,wall*2,0,h-0.7,d/2);
  const roof=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(w+1,0.7,d+1),new THREE.MeshLambertMaterial({color:0x2a1020})));
  roof.position.set(x,baseY+h+0.35,z);parent.add(roof);parts.push(roof);
  const floor=new THREE.Mesh(new THREE.BoxGeometry(w-0.6,0.2,d-0.6),new THREE.MeshLambertMaterial({color:0x6b4a3a}));
  floor.position.set(x,baseY+0.1,z);parent.add(floor);
  decks.push({g:parent,x,z,hw:w/2-0.5,hd:d/2-0.5,tops:[baseY+0.2],ramp:null});
  /* the podium (stage) with red curtains behind it */
  const stage=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(22,0.7,8),new THREE.MeshLambertMaterial({color:0x8a5a2d})));
  stage.position.set(x,baseY+0.35,z-10);parent.add(stage);
  const curt=new THREE.Mesh(new THREE.BoxGeometry(22,6.4,0.3),new THREE.MeshLambertMaterial({color:0xb01e3c}));
  curt.position.set(x,baseY+3.9,z-13.8);parent.add(curt);
  /* spotlights over the stage */
  [[-6],[0],[6]].forEach(p=>{
    const sp=new THREE.Mesh(new THREE.SphereGeometry(0.28,8,8),new THREE.MeshBasicMaterial({color:0xfff2b0}));
    sp.position.set(x+p[0],baseY+h-0.8,z-10);parent.add(sp);
  });
  /* the piano on the podium, facing the audience */
  makePiano(x,z-10,0,parent,baseY+0.7,{
    entrance:{x:x,z:z+d/2+2},
    seats:(function(){
      const seats=[];
      for(let r2=0;r2<4;r2++)for(let cix=0;cix<7;cix++)seats.push({x:x-12+cix*4,z:z-2+r2*3.4,yaw:Math.PI});
      return seats;
    })(),
    baseY
  });
  /* rows of seats for the crowd (you can sit on them too) */
  for(let r2=0;r2<4;r2++)for(let cix=0;cix<7;cix++)makeChair(x-12+cix*4,z-2+r2*3.4,Math.PI,parent,baseY);
  makeDoor(x-4.5,z+d/2,0,parent,baseY,0x2a1020);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(18,3.4),chSignMat());
  sign.position.set(x,baseY+h+2.2,z+d/2+0.06);parent.add(sign);
  concertHalls.push({g:parent,x,z});
  regShell(parent,x,z,w/2,d/2,baseY,[{x:x-4.5,z:z+d/2,r:5.6}]);
  const rec=regBuilding(x,z,w,d,parts,baseY);rec.walkThru=true;
  return rec;
}
/* ---------- FERRY ISLANDS: lighthouse, palms, crabs, beach shop & buried treasure ---------- */
const islands=[];
let _beachSign=null;
function beachSignMat(){
  if(_beachSign)return _beachSign;
  const cv=document.createElement("canvas");cv.width=256;cv.height=64;
  const c=cv.getContext("2d");c.fillStyle="#0e7490";c.fillRect(0,0,256,64);
  c.fillStyle="#fff";c.font="bold 30px Segoe UI";c.textAlign="center";
  c.fillText("\u{1F3D6} BEACH SHOP",128,42);
  _beachSign=keep(new THREE.MeshBasicMaterial({map:keep(new THREE.CanvasTexture(cv)),side:THREE.DoubleSide}));
  return _beachSign;
}
function makePalm(x,z,parent,y,r){
  const g=new THREE.Group();
  const tm=new THREE.MeshLambertMaterial({color:0x8a6142});
  /* a curved trunk from stacked, offset segments */
  let px2=0,py=0,lean=(r()-0.5)*0.9;
  for(let i=0;i<5;i++){
    const seg=new THREE.Mesh(new THREE.CylinderGeometry(0.14-i*0.012,0.17-i*0.012,1.1,7),tm);
    px2+=lean*0.24;py+=1;
    seg.position.set(px2,py-0.5,0);
    seg.rotation.z=-lean*0.24;
    g.add(seg);
  }
  const fm=new THREE.MeshLambertMaterial({color:0x2f9e44,side:THREE.DoubleSide});
  for(let i=0;i<6;i++){
    const a=i/6*Math.PI*2;
    const fr=new THREE.Mesh(new THREE.ConeGeometry(0.34,2.6,4),fm);
    fr.scale.y=0.32;
    fr.position.set(px2+Math.cos(a)*1.1,py+0.15,Math.sin(a)*1.1);
    fr.rotation.z=Math.PI/2-Math.cos(a)*0.7;
    fr.rotation.y=-a;
    g.add(fr);
  }
  /* coconuts */
  for(let i=0;i<3;i++){
    const co=new THREE.Mesh(new THREE.SphereGeometry(0.13,7,6),tm);
    co.position.set(px2+(r()-0.5)*0.5,py-0.15,(r()-0.5)*0.5);g.add(co);
  }
  g.position.set(x,y,z);
  g.rotation.y=r()*6.28;
  parent.add(g);
}
function makeCrab(){
  const g=makeQuad(0xd7263d,0.3,0.16,0.34,0.1,0xc0392b);
  [[-0.22],[0.22]].forEach(p=>{
    const cl=new THREE.Mesh(new THREE.SphereGeometry(0.09,6,6),new THREE.MeshLambertMaterial({color:0xd7263d}));
    cl.scale.set(1,0.7,1.3);cl.position.set(p[0],0.14,0.24);g.add(cl);
  });
  return g;
}
function buildIsland(s,g){
  const y0=terrainH(s.x,s.z);
  /* LIGHTHOUSE on the hilltop: white-red striped tower + rotating light beam */
  const lh=new THREE.Group();lh.position.set(s.x,y0,s.z);g.add(lh);
  for(let i=0;i<5;i++){
    const band=shadowBox(new THREE.Mesh(new THREE.CylinderGeometry(1.5-i*0.14,1.6-i*0.14,2.6,12),
      new THREE.MeshLambertMaterial({color:i%2?0xd7263d:0xf4f7fb})));
    band.position.y=1.3+i*2.6;lh.add(band);
  }
  const cab=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.1,1.6,10),glassMat);
  cab.position.y=13.9;lh.add(cab);
  const cap=shadowBox(new THREE.Mesh(new THREE.ConeGeometry(1.4,1.2,10),new THREE.MeshLambertMaterial({color:0xd7263d})));
  cap.position.y=15.3;lh.add(cap);
  const head=new THREE.Group();head.position.y=13.9;lh.add(head);
  const lampBall=new THREE.Mesh(new THREE.SphereGeometry(0.5,10,10),new THREE.MeshBasicMaterial({color:0xfff2b0}));
  head.add(lampBall);
  [1,-1].forEach(d=>{
    const beam=new THREE.Mesh(new THREE.ConeGeometry(2.2,26,8,1,true),
      new THREE.MeshBasicMaterial({color:0xfff2b0,transparent:true,opacity:0.16,side:THREE.DoubleSide,depthWrite:false}));
    beam.rotation.z=d*Math.PI/2;
    beam.position.x=d*13;
    head.add(beam);
  });
  const r=rng(Math.round(s.x*13+s.z*7)+3);
  /* palm trees around the beach ring */
  for(let i=0;i<9;i++){
    const a=r()*Math.PI*2,d=34+r()*36;
    const px2=s.x+Math.cos(a)*d,pz=s.z+Math.sin(a)*d;
    const py=terrainH(px2,pz);
    if(py>-0.4)makePalm(px2,pz,g,py,r);
  }
  /* beach chairs + parasol on the south beach */
  for(let i=0;i<3;i++){
    const bx=s.x-10+i*7,bz=s.z+48;
    makeChair(bx,bz,Math.PI,g,terrainH(bx,bz));
  }
  const paraY=terrainH(s.x-3,s.z+50);
  const pp=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,2.6),poleMat);
  pp.position.set(s.x-3,paraY+1.3,s.z+50);g.add(pp);
  const para=new THREE.Mesh(new THREE.ConeGeometry(2,0.8,10),new THREE.MeshLambertMaterial({color:0xff5d8f,side:THREE.DoubleSide}));
  para.position.set(s.x-3,paraY+2.8,s.z+50);g.add(para);
  /* crabs scuttle on the beach (penned in so they never swim away) */
  for(let i=0;i<4;i++){
    const an=regAnimal(makeCrab(),s.x+(r()-0.5)*60,s.z+(r()-0.5)*60,g,0.6);
    an.pen={x:s.x,z:s.z,r:62};
  }
  /* the BEACH SHOP: coconut drinks + the island-only PEARL dumpling */
  const shx=s.x+20,shz=s.z+40,shy=terrainH(shx,shz);
  const ct=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(3,1.05,1.1),new THREE.MeshLambertMaterial({color:0x0e7490})));
  ct.position.set(shx,shy+0.52,shz);g.add(ct);
  const sroof=new THREE.Mesh(new THREE.BoxGeometry(3.6,0.14,1.8),new THREE.MeshLambertMaterial({color:0xf4d35e}));
  sroof.position.set(shx,shy+2.4,shz);g.add(sroof);
  [[-1.6],[1.6]].forEach(p=>{const pl=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.9),poleMat);pl.position.set(shx+p[0],shy+1.45,shz);g.add(pl);});
  const pearl=new THREE.Mesh(new THREE.SphereGeometry(0.2,10,8),new THREE.MeshLambertMaterial({color:0xe9e4f7,emissive:0x9a90c0,emissiveIntensity:0.35}));
  pearl.scale.y=0.75;pearl.position.set(shx,shy+1.25,shz);g.add(pearl);
  const ssign=new THREE.Mesh(new THREE.PlaneGeometry(3.4,0.85),beachSignMat());
  ssign.position.set(shx,shy+3,shz);g.add(ssign);
  const keeper=makePerson(0.95,0x0e7490);keeper.position.set(shx,shy,shz-1.2);g.add(keeper);
  /* the buried-treasure X on the west beach */
  const xx=s.x-46,xz=s.z+14,xy=terrainH(xx,xz);
  const xm=new THREE.MeshLambertMaterial({color:0x7a2c1a});
  [[0.6],[-0.6]].forEach(p=>{
    const bar=new THREE.Mesh(new THREE.BoxGeometry(2.4,0.06,0.5),xm);
    bar.position.set(xx,xy+0.16,xz);bar.rotation.y=p[0];g.add(bar);
  });
  islands.push({g,x:s.x,z:s.z,head,shop:{x:shx,z:shz},digX:{x:xx,z:xz}});
}
/* ---------- VOLCANOES: glowing crater, smoke, lava fountains during eruptions ---------- */
const volcs=[];
function buildVolcano(s,g){
  const y=terrainH(s.x,s.z);   // the crater floor
  const glow=new THREE.Mesh(new THREE.CylinderGeometry(15,15,1.4,20),
    new THREE.MeshBasicMaterial({color:0xff4400,transparent:true,opacity:0.75}));
  glow.position.set(s.x,y+0.8,s.z);g.add(glow);
  const light=new THREE.PointLight(0xff5522,1.1,140);
  light.position.set(s.x,y+16,s.z);g.add(light);
  /* the lava fountain (only visible while erupting) */
  const n=140,pos=new Float32Array(n*3),seeds=new Float32Array(n);
  for(let i=0;i<n;i++){pos[i*3]=s.x;pos[i*3+1]=y;pos[i*3+2]=s.z;seeds[i]=Math.random();}
  const geo=new THREE.BufferGeometry();
  geo.setAttribute("position",new THREE.BufferAttribute(pos,3));
  const pts=new THREE.Points(geo,new THREE.PointsMaterial({color:0xff7733,size:1.8,transparent:true,opacity:0.95}));
  pts.visible=false;pts.frustumCulled=false;g.add(pts);
  /* a warning sign down at the beach */
  const cv=document.createElement("canvas");cv.width=256;cv.height=64;
  const c=cv.getContext("2d");c.fillStyle="#7a1010";c.fillRect(0,0,256,64);
  c.fillStyle="#ffd75e";c.font="bold 26px Segoe UI";c.textAlign="center";
  c.fillText("\u{1F30B} DANGER: VOLCANO",128,42);
  const sg=new THREE.Mesh(new THREE.PlaneGeometry(6,1.5),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv),side:THREE.DoubleSide}));
  const sy=terrainH(s.x,s.z+118);
  sg.position.set(s.x,sy+2.4,s.z+118);g.add(sg);
  const sp2=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,2.4),poleMat);
  sp2.position.set(s.x,sy+1.2,s.z+118);g.add(sp2);
  volcs.push({g,x:s.x,z:s.z,y,glow,pts,seeds,light,announced:false});
}
/* ---------- SKY RESTAURANTS: floating on CLOUDS, 150 m up in the sky ---------- */
const skyRests=[];
const SRSP=5200,CLOUD_Y=150;
function skyRestSpot(i,j){
  /* they float on clouds now, so there's ALWAYS one every ~5 km */
  return{x:i*SRSP+2600,z:j*SRSP+900};
}
function buildSkyRest(s,g){
  const y=CLOUD_Y-1;
  /* the fluffy cloud that carries the whole restaurant */
  const cm=new THREE.MeshLambertMaterial({color:0xffffff,transparent:true,opacity:0.92});
  const core=new THREE.Mesh(new THREE.SphereGeometry(9,9,8),cm);
  core.scale.y=0.5;core.position.set(s.x,y-3.4,s.z);g.add(core);
  for(let i=0;i<6;i++){
    const a=i/6*Math.PI*2;
    const p=new THREE.Mesh(new THREE.SphereGeometry(4.5+(i%3)*2,8,7),cm);
    p.scale.y=0.55;
    p.position.set(s.x+Math.cos(a)*8,y-3.8,s.z+Math.sin(a)*8);
    g.add(p);
  }
  const disc=shadowBox(new THREE.Mesh(new THREE.CylinderGeometry(13,14,1,22),new THREE.MeshLambertMaterial({color:0x9aa0a8})));
  disc.position.set(s.x,y+0.5,s.z);g.add(disc);
  decks.push({g,x:s.x,z:s.z,hw:12.5,hd:12.5,tops:[y+1],ramp:null});
  /* the little restaurant hut */
  const hut=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(7,3.4,5),new THREE.MeshLambertMaterial({color:0xe8e2d4})));
  hut.position.set(s.x-6,y+2.7,s.z-5);g.add(hut);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(7.8,0.4,5.8),new THREE.MeshLambertMaterial({color:0xd7263d}));
  roof.position.set(s.x-6,y+4.6,s.z-5);g.add(roof);
  const win=new THREE.Mesh(new THREE.PlaneGeometry(5.5,1.6),glassMat);
  win.position.set(s.x-6,y+2.9,s.z-2.45);g.add(win);
  /* tables with parasols + the helipad H */
  for(const[tx,tz]of[[3,-5],[6,1],[1,3]]){
    const tb=new THREE.Mesh(new THREE.CylinderGeometry(0.9,0.9,0.1,10),new THREE.MeshLambertMaterial({color:0xf4f7fb}));
    tb.position.set(s.x+tx,y+1.7,s.z+tz);g.add(tb);
    const lg=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.09,0.7),poleMat);
    lg.position.set(s.x+tx,y+1.35,s.z+tz);g.add(lg);
    makeChair(s.x+tx-1.2,s.z+tz,Math.PI/2,g,y+1);
    makeChair(s.x+tx+1.2,s.z+tz,-Math.PI/2,g,y+1);
  }
  const hcv=document.createElement("canvas");hcv.width=64;hcv.height=64;
  const hc=hcv.getContext("2d");hc.fillStyle="#2e4a62";hc.beginPath();hc.arc(32,32,30,0,7);hc.fill();
  hc.fillStyle="#fff";hc.font="bold 40px Segoe UI";hc.textAlign="center";hc.fillText("H",32,46);
  const pad=new THREE.Mesh(new THREE.CircleGeometry(4.5,18),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(hcv)}));
  pad.rotation.x=-Math.PI/2;pad.position.set(s.x+5,y+1.06,s.z-7);g.add(pad);
  const cv=document.createElement("canvas");cv.width=512;cv.height=96;
  const c=cv.getContext("2d");c.fillStyle="#1a1030";c.fillRect(0,0,512,96);
  c.fillStyle="#9fd8ff";c.font="bold 46px Segoe UI";c.textAlign="center";
  c.fillText("☁️ SKY RESTAURANT",256,62);
  const sg=new THREE.Mesh(new THREE.PlaneGeometry(11,2.2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv),side:THREE.DoubleSide}));
  sg.position.set(s.x-6,y+6.4,s.z-5);g.add(sg);
  skyRests.push({g,x:s.x,z:s.z,y:CLOUD_Y});
}
/* ---------- PUBLIC SWIMMING POOL PARKS: swim, slide & soak every ~2 km ---------- */
const POOLS=[];        // rectangles of REAL swimmable water {g,x,z,hw,hd,wy}
const poolParks=[];    // the parks (slide, hot tub...)
const PPSP=2000;
function poolAt(x,z,y){
  for(let i=POOLS.length-1;i>=0;i--){
    const p=POOLS[i];
    if(offScene(p.g)){POOLS.splice(i,1);continue;}
    if(Math.abs(x-p.x)<p.hw&&Math.abs(z-p.z)<p.hd&&Math.abs(y-p.wy)<2.2)return p;
  }
  return null;
}
function poolSpot(i,j){
  const x=Math.round((i*PPSP+1710-90)/120)*120+90;
  const z=Math.round((j*PPSP+430-90)/120)*120+90;
  if(Math.abs(x)<320&&Math.abs(z)<320)return null;
  if(Math.abs(x-170)<70||Math.abs(z+170)<70)return null;
  if(inAirport(x,z)||inAirport(x-50,z)||inAirport(x+50,z))return null;
  const h=baseH(x,z);
  if(h<-1||h>14)return null;
  for(const[ox,oz]of[[-45,-33],[45,-33],[-45,33],[45,33]]){
    const ch=baseH(x+ox,z+oz);
    if(ch<-1||Math.abs(ch-h)>3.5)return null;
  }
  if(nearestRail(x,z).d<70)return null;
  if(Math.abs(x-curveXC(x,z))<70||Math.abs(z-curveZC(x,z))<70)return null;
  if(rocketPadDist(x,z)<110)return null;
  const hs=hugeShopSpot(Math.round((x-750)/HSP),Math.round((z-390)/HSP));
  if(hs&&Math.abs(hs.x-x)<130&&Math.abs(hs.z-z)<110)return null;
  const ms=mansionSpot(Math.round((x-1230)/MSP),Math.round((z-870)/MSP));
  if(ms&&Math.abs(ms.x-x)<130&&Math.abs(ms.z-z)<110)return null;
  return{x,z};
}
function regPool(g,x,z,hw,hd,wy,depth,rimCol){
  /* white rim + glowing blue water you can REALLY swim in */
  const rimM=new THREE.MeshLambertMaterial({color:rimCol||0xf4f7fb});
  const rim=new THREE.Mesh(new THREE.BoxGeometry(hw*2+1.6,0.5,hd*2+1.6),rimM);
  rim.position.set(x,wy-0.1,z);g.add(rim);
  const basin=new THREE.Mesh(new THREE.BoxGeometry(hw*2,depth,hd*2),new THREE.MeshLambertMaterial({color:0x7fd4e8}));
  basin.position.set(x,wy-depth/2+0.05,z);g.add(basin);
  const wat=new THREE.Mesh(new THREE.BoxGeometry(hw*2,0.16,hd*2),
    new THREE.MeshPhongMaterial({color:0x36b6e0,transparent:true,opacity:0.72,shininess:130,specular:0xbfeaff}));
  wat.position.set(x,wy+0.12,z);g.add(wat);
  POOLS.push({g,x,z,hw,hd,wy});
}
let _poolSign=null;
function poolSignMat(){
  if(_poolSign)return _poolSign;
  const cv=document.createElement("canvas");cv.width=512;cv.height=96;
  const c=cv.getContext("2d");c.fillStyle="#0e7490";c.fillRect(0,0,512,96);
  c.fillStyle="#fff";c.font="bold 52px Segoe UI";c.textAlign="center";
  c.fillText("\u{1F3CA} CITY POOL PARK",256,64);
  _poolSign=keep(new THREE.MeshBasicMaterial({map:keep(new THREE.CanvasTexture(cv)),side:THREE.DoubleSide}));
  return _poolSign;
}
function buildPoolPark(s,g){
  const y=terrainH(s.x,s.z);
  /* a mega-mansion-sized paved lot */
  const pave=new THREE.Mesh(new THREE.BoxGeometry(100,0.3,76),new THREE.MeshLambertMaterial({color:0xd8d2c4}));
  pave.position.set(s.x,y+0.15,s.z);g.add(pave);
  decks.push({g,x:s.x,z:s.z,hw:50,hd:38,tops:[y+0.3],ramp:null});
  const wy=y+0.3;
  /* the BIG pool you can swim in */
  regPool(g,s.x-15,s.z,20,12,wy,1.8);
  /* the round kiddie pool outside the main area */
  regPool(g,s.x+30,s.z+22,7,7,wy,0.9,0xffd75e);
  /* the HOT TUB: warm, bubbly */
  regPool(g,s.x+32,s.z-20,4,4,wy,1,0xb56576);
  const tubGlow=new THREE.PointLight(0xffb46b,0.6,18);
  tubGlow.position.set(s.x+32,wy+2,s.z-20);g.add(tubGlow);
  for(let i=0;i<6;i++){
    const bub=new THREE.Mesh(new THREE.SphereGeometry(0.09,6,6),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.7}));
    bub.position.set(s.x+32+(Math.random()-0.5)*5,wy+0.25,s.z-20+(Math.random()-0.5)*5);
    g.add(bub);
  }
  /* the WATERSLIDE: tower + cyan flume curving into the big pool */
  const tow=[s.x+18,s.z+10];
  const tm2=new THREE.MeshLambertMaterial({color:0x9aa0a8});
  for(const[ox,oz]of[[-1.4,-1.4],[1.4,-1.4],[-1.4,1.4],[1.4,1.4]]){
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.16,9),tm2);
    leg.position.set(tow[0]+ox,wy+4.5,tow[1]+oz);g.add(leg);
  }
  const deck2=new THREE.Mesh(new THREE.BoxGeometry(4,0.3,4),tm2);
  deck2.position.set(tow[0],wy+9,tow[1]);g.add(deck2);
  const slideM=new THREE.MeshPhongMaterial({color:0x22c3e6,shininess:90,side:THREE.DoubleSide});
  /* flume segments from the tower down into the pool */
  const pts=[[tow[0],wy+9,tow[1]],[s.x+8,wy+6.4,s.z+4],[s.x-2,wy+3.4,s.z-2],[s.x-10,wy+0.6,s.z]];
  for(let i2=0;i2<pts.length-1;i2++){
    const a=pts[i2],b=pts[i2+1];
    const len=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
    const seg=new THREE.Mesh(new THREE.CylinderGeometry(0.9,0.9,len,10,1,true),slideM);
    seg.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);
    seg.lookAt(b[0],b[1],b[2]);
    seg.rotateX(Math.PI/2);
    g.add(seg);
  }
  /* diving board + sun loungers + palm-ish trees */
  const board=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.12,3.4),new THREE.MeshLambertMaterial({color:0xf4f7fb}));
  board.position.set(s.x-15,wy+1.4,s.z-14.5);g.add(board);
  const bp=new THREE.Mesh(new THREE.BoxGeometry(0.5,1.3,0.5),tm2);
  bp.position.set(s.x-15,wy+0.65,s.z-15.6);g.add(bp);
  for(let i=0;i<4;i++){
    const lounge=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.25,2.2),new THREE.MeshLambertMaterial({color:[0xd7263d,0x1b98e0,0xf4d35e,0x2ec4b6][i]}));
    lounge.position.set(s.x+2+i*4,wy+0.35,s.z+26);g.add(lounge);
    makeChair(s.x+2+i*4,s.z+30,0,g,wy);
  }
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(16,3),poolSignMat());
  sign.position.set(s.x,wy+7,s.z+37);g.add(sign);
  [-7,7].forEach(o=>{const pl=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,7),poleMat);pl.position.set(s.x+o,wy+3.5,s.z+37);g.add(pl);});
  poolParks.push({g,x:s.x,z:s.z,wy,slideBase:{x:tow[0]+2.5,z:tow[1]},slidePts:pts,tub:{x:s.x+32,z:s.z-20}});
}
const plots=[];
const PLSP=1600;
function plotSpot(i,j){
  const x=Math.round((i*PLSP+430-90)/120)*120+90;
  const z=Math.round((j*PLSP+1150-90)/120)*120+90;
  if(Math.abs(x)<320&&Math.abs(z)<320)return null;
  if(inAirport(x,z))return null;
  const h=baseH(x,z);
  if(h<-1||h>14)return null;
  for(const[ox,oz]of[[-14,-14],[14,-14],[-14,14],[14,14]]){
    const ch=baseH(x+ox,z+oz);
    if(ch<-1||Math.abs(ch-h)>2.5)return null;
  }
  if(nearestRail(x,z).d<25)return null;
  if(Math.abs(x-curveXC(x,z))<25||Math.abs(z-curveZC(x,z))<25)return null;
  if(rocketPadDist(x,z)<70)return null;
  const hs=hugeShopSpot(Math.round((x-750)/HSP),Math.round((z-390)/HSP));
  if(hs&&Math.abs(hs.x-x)<75&&Math.abs(hs.z-z)<60)return null;
  const ms=mansionSpot(Math.round((x-1230)/MSP),Math.round((z-870)/MSP));
  if(ms&&Math.abs(ms.x-x)<75&&Math.abs(ms.z-z)<60)return null;
  const pp3=poolSpot(Math.round((x-1710)/PPSP),Math.round((z-430)/PPSP));
  if(pp3&&Math.abs(pp3.x-x)<75&&Math.abs(pp3.z-z)<60)return null;
  const mu=museumSpot(Math.round((x-520)/DMUS),Math.round((z-260)/DMUS));
  if(mu&&Math.abs(mu.x-x)<36&&Math.abs(mu.z-z)<32)return null;
  const ch2=concertSpot(Math.round((x-1530)/CHSP),Math.round((z-1050)/CHSP));
  if(ch2&&Math.abs(ch2.x-x)<45&&Math.abs(ch2.z-z)<40)return null;
  return{x,z};
}
let _plotSign=null;
function plotSignMat(){
  if(_plotSign)return _plotSign;
  const cv=document.createElement("canvas");cv.width=256;cv.height=96;
  const c=cv.getContext("2d");c.fillStyle="#0f7a3d";c.fillRect(0,0,256,96);
  c.fillStyle="#fff";c.font="bold 30px Segoe UI";c.textAlign="center";
  c.fillText("\u{1F3D7} FOR SALE",128,40);
  c.font="bold 24px Segoe UI";c.fillText("$50K · press T",128,76);
  _plotSign=keep(new THREE.MeshBasicMaterial({map:keep(new THREE.CanvasTexture(cv)),side:THREE.DoubleSide}));
  return _plotSign;
}
function buildPlot(s,g){
  const y=terrainH(s.x,s.z);
  /* a tidy lawn with a little white fence */
  const lg=new THREE.PlaneGeometry(30,30,6,6);lg.rotateX(-Math.PI/2);
  const lp=lg.attributes.position;
  for(let i=0;i<lp.count;i++){
    const wx=s.x+lp.getX(i),wz=s.z+lp.getZ(i);
    lp.setXYZ(i,wx,terrainH(wx,wz)+0.13,wz);
  }
  lg.computeVertexNormals();
  const lawn=new THREE.Mesh(lg,new THREE.MeshLambertMaterial({color:0x63a852}));
  lawn.receiveShadow=true;g.add(lawn);
  const fm=new THREE.MeshLambertMaterial({color:0xf4f7fb});
  for(let k=-15;k<=15;k+=5)for(const[fx,fz]of[[k,-15],[k,15],[-15,k],[15,k]]){
    const p=new THREE.Mesh(new THREE.BoxGeometry(0.16,1,0.16),fm);
    p.position.set(s.x+fx,terrainH(s.x+fx,s.z+fz)+0.5,s.z+fz);g.add(p);
  }
  const sp2=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,2.6),poleMat);
  sp2.position.set(s.x,y+1.3,s.z+16.5);g.add(sp2);
  const sg=new THREE.Mesh(new THREE.PlaneGeometry(4,1.5),plotSignMat());
  sg.position.set(s.x,y+3,s.z+16.5);g.add(sg);
  const man={g,x:s.x,z:s.z,id:"P:"+Math.round(s.x)+","+Math.round(s.z),baseY:y,tableG:null,furnG:null,plot:true};
  mansions.push(man);
  plots.push({g,x:s.x,z:s.z,id:man.id,sign:{x:s.x,z:s.z+16.5},sgMesh:sg});
  if(window.onMansionBuilt)onMansionBuilt(man);
}
function hitBuilding(x,z,speed){
  if(S.world!=="earth")return false;   // no invisible Earth buildings on the Moon
  if(speed<8)return false;
  for(const b of buildings){
    if(!b.alive)continue;
    if(Math.abs(x-b.x)<b.w/2+1.3&&Math.abs(z-b.z)<b.d/2+1.3){
      b.alive=false;collapses.push({b,t:0});rebuilds.push({b,t:20});
      if(typeof playCrash==="function")playCrash(speed);
      toast("\u{1F4A5} You crashed into a building — it's coming down!");
      return true;
    }
  }
  return false;
}
const rebuilds=[];   // smashed buildings grow back after 20 seconds
function updateCollapses(dt){
  for(let i=collapses.length-1;i>=0;i--){
    const c=collapses[i];c.t+=dt;
    if(!c.b.parts[0]||!c.b.parts[0].parent){collapses.splice(i,1);continue;}
    const k=Math.min(1,c.t/1.2),e=k*k,gy=c.b.gy;
    c.b.parts.forEach(p=>{
      p.scale.y=Math.max(0.06,1-e*0.94);
      p.position.y=gy+(p.userData.oy-gy)*(1-e*0.94);
    });
    if(k>=1)collapses.splice(i,1);
  }
  for(let i=rebuilds.length-1;i>=0;i--){
    const r=rebuilds[i];r.t-=dt;
    if(!r.b.parts[0]||offScene(r.b.parts[0])){rebuilds.splice(i,1);continue;}   // chunk unloaded
    if(r.t>0)continue;
    r.b.parts.forEach(p=>{p.scale.y=1;p.position.y=p.userData.oy;});
    r.b.alive=true;
    rebuilds.splice(i,1);
  }
}
/* street lights + traffic lights (shared night materials) */
const lampMat=keep(new THREE.MeshLambertMaterial({color:0xfff2c0,emissive:0xffe9a0,emissiveIntensity:0}));
const poleMat=keep(new THREE.MeshLambertMaterial({color:0x596069}));
const tlNS_R=keep(new THREE.MeshLambertMaterial({color:0x550000,emissive:0xff2222,emissiveIntensity:1}));
const tlNS_G=keep(new THREE.MeshLambertMaterial({color:0x004400,emissive:0x22ff44,emissiveIntensity:0}));
const tlEW_R=keep(new THREE.MeshLambertMaterial({color:0x550000,emissive:0xff2222,emissiveIntensity:0}));
const tlEW_G=keep(new THREE.MeshLambertMaterial({color:0x004400,emissive:0x22ff44,emissiveIntensity:1}));
function lightPole(x,z,parent){
  const y=terrainH(x,z);
  const p=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.12,6.4),poleMat);p.position.set(x,y+3.2,z);p.castShadow=true;parent.add(p);
  const arm=new THREE.Mesh(new THREE.BoxGeometry(1.4,0.09,0.09),poleMat);arm.position.set(x-0.7,y+6.3,z);parent.add(arm);
  const lamp=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.16,0.26),lampMat);lamp.position.set(x-1.3,y+6.25,z);parent.add(lamp);
}
function trafficLight(lx,lz,parent){
  const px=lx+8.4,pz=lz+8.4,y=terrainH(px,pz);
  const p=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.12,5),poleMat);p.position.set(px,y+2.5,pz);parent.add(p);
  function head(off,rot,mR,mG){
    /* each head hangs on its own side of the pole so the two boxes never clip */
    const hx=px+Math.sin(rot)*0.34,hz=pz+Math.cos(rot)*0.34;
    const h=new THREE.Mesh(new THREE.BoxGeometry(0.5,1.1,0.3),new THREE.MeshLambertMaterial({color:0x23262b}));
    h.position.set(hx,y+4.6,hz);h.rotation.y=rot;parent.add(h);
    const r=new THREE.Mesh(new THREE.SphereGeometry(0.14),mR);r.position.set(hx+Math.sin(rot)*0.18,y+4.95,hz+Math.cos(rot)*0.18);parent.add(r);
    const g=new THREE.Mesh(new THREE.SphereGeometry(0.14),mG);g.position.set(hx+Math.sin(rot)*0.18,y+4.3,hz+Math.cos(rot)*0.18);parent.add(g);
  }
  head(0,0,tlNS_R,tlNS_G);
  head(0,Math.PI/2,tlEW_R,tlEW_G);
}
function updateTrafficLights(){
  const phase=lightPhase();
  tlNS_G.emissiveIntensity=phase===0?1:0;tlNS_R.emissiveIntensity=phase===0?0:1;
  tlEW_G.emissiveIntensity=phase===1?1:0;tlEW_R.emissiveIntensity=phase===1?0:1;
  lampMat.emissiveIntensity=isNight()?1:0;
}
/* ================= CHUNKS ================= */
const CS=220,SEG=28,chunks=new Map();
/* real-looking ground: a grass detail texture multiplied with the biome colors */
const groundTex=(function(){
  const cv=document.createElement("canvas");cv.width=cv.height=128;
  const c=cv.getContext("2d");
  c.fillStyle="#f2f2f2";c.fillRect(0,0,128,128);
  /* speckle */
  for(let i=0;i<900;i++){
    const v=200+Math.floor(Math.random()*56);
    c.fillStyle="rgb("+v+","+v+","+v+")";
    c.fillRect(Math.random()*128,Math.random()*128,1.6,1.6);
  }
  /* little grass-blade strokes */
  c.strokeStyle="rgba(160,180,150,0.5)";c.lineWidth=1;
  for(let i=0;i<240;i++){
    const x=Math.random()*128,y=Math.random()*128;
    c.beginPath();c.moveTo(x,y);c.lineTo(x+(Math.random()-0.5)*2,y-2-Math.random()*3);c.stroke();
  }
  const t=new THREE.CanvasTexture(cv);
  t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.anisotropy=renderer.capabilities.getMaxAnisotropy();
  return keep(t);
})();
const groundMat=keep(new THREE.MeshLambertMaterial({map:groundTex,vertexColors:true}));
/* DESERT ground: wind-blown sand ripples instead of grass strokes */
const sandTex=(function(){
  const cv=document.createElement("canvas");cv.width=cv.height=128;
  const c=cv.getContext("2d");
  c.fillStyle="#f5efe2";c.fillRect(0,0,128,128);
  for(let i=0;i<500;i++){
    const v=225+Math.floor(Math.random()*30);
    c.fillStyle="rgb("+v+","+(v-6)+","+(v-18)+")";
    c.fillRect(Math.random()*128,Math.random()*128,1.5,1.5);
  }
  /* soft ripple waves */
  c.strokeStyle="rgba(160,140,100,0.35)";c.lineWidth=1.6;
  for(let y=4;y<128;y+=9){
    c.beginPath();
    for(let x=0;x<=128;x+=8)c.lineTo(x,y+Math.sin(x/17+y)*2.4);
    c.stroke();
  }
  const t=new THREE.CanvasTexture(cv);
  t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.anisotropy=renderer.capabilities.getMaxAnisotropy();
  return keep(t);
})();
const sandMat=keep(new THREE.MeshLambertMaterial({map:sandTex,vertexColors:true}));
const dryTuftMat=keep(new THREE.MeshLambertMaterial({color:0xbfa964}));
const desertRockMat=keep(new THREE.MeshLambertMaterial({color:0xc09a6a}));
/* tufts of real 3D grass, scattered as one InstancedMesh per chunk */
const tuftGeo=new THREE.ConeGeometry(0.06,0.55,3);tuftGeo.translate(0,0.26,0);KEEP.add(tuftGeo);
const tuftMat=keep(new THREE.MeshLambertMaterial({color:0x4e8f3a}));
function addGrassTufts(g,ox,oz,r,dense,mat){
  const n=dense;
  const im=new THREE.InstancedMesh(tuftGeo,mat||tuftMat,n);
  const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),V=new THREE.Vector3(),SC=new THREE.Vector3();
  let placed=0;
  for(let i=0;i<n*2&&placed<n;i++){
    const x=ox+(r()-0.5)*CS,z=oz+(r()-0.5)*CS;
    if(onAnyRoad(x,z)||keepClear(x,z))continue;
    const h=rawH(x,z);
    if(h<0||h>40)continue;
    V.set(x,h,z);
    Q.setFromAxisAngle(new THREE.Vector3(0,1,0),r()*6.28);
    const s=0.7+r()*1.3;SC.set(s,s*(0.7+r()*0.9),s);
    M.compose(V,Q,SC);
    im.setMatrixAt(placed++,M);
  }
  im.count=placed;
  g.add(im);
}
function keepClear(x,z){
  if(Math.abs(x)<160&&Math.abs(z)<160)return true;
  if(onAnyRoad(x,z))return true;
  if(Math.hypot(x+340,z-260)<95)return true;         // zoo
  if(Math.hypot(x-450,z-330)<56)return true;         // church & car-meet square
  if(baseH(x,z)<-1)return true;                      // nothing spawns in the water
  if(rocketPadDist(x,z)<40)return true;              // keep rocket pads clear
  /* nothing spawns inside a giant MEGA MART's or MEGA MANSION's block */
  const hs=hugeShopSpot(Math.round((x-750)/HSP),Math.round((z-390)/HSP));
  if(hs&&Math.abs(x-hs.x)<60&&Math.abs(z-hs.z)<48)return true;
  const ms=mansionSpot(Math.round((x-1230)/MSP),Math.round((z-870)/MSP));
  if(ms&&Math.abs(x-ms.x)<60&&Math.abs(z-ms.z)<48)return true;
  const mu=museumSpot(Math.round((x-520)/DMUS),Math.round((z-260)/DMUS));
  if(mu&&Math.abs(x-mu.x)<16&&Math.abs(z-mu.z)<14)return true;
  const chh=concertSpot(Math.round((x-1530)/CHSP),Math.round((z-1050)/CHSP));
  if(chh&&Math.abs(x-chh.x)<26&&Math.abs(z-chh.z)<22)return true;
  const isl=nearIsland(x,z);
  if(isl&&Math.hypot(x-isl.x,z-isl.z)<100)return true;   // islands get their own decor
  const pl2=plotSpot(Math.round((x-430)/PLSP),Math.round((z-1150)/PLSP));
  if(pl2&&Math.abs(x-pl2.x)<19&&Math.abs(z-pl2.z)<19)return true;   // building plots stay empty
  const pp2=poolSpot(Math.round((x-1710)/PPSP),Math.round((z-430)/PPSP));
  if(pp2&&Math.abs(x-pp2.x)<60&&Math.abs(z-pp2.z)<48)return true;   // pool parks too
  const vc2=nearVolcano(x,z);
  if(vc2&&Math.hypot(x-vc2.x,z-vc2.z)<140)return true;   // volcanoes too
  return false;
}
/* ---- drivable decks (parking garage floors + ramp) ---- */
const decks=[];
const gates=[];      // level-crossing gates at rail/road crossings
const moonCars=[];   // moon buggies parked at moon rocket stations
function deckYAt(x,z,y){
  let best=-1e9;
  for(let i=decks.length-1;i>=0;i--){
    const d=decks[i];
    if(offScene(d.g)){decks.splice(i,1);continue;}
    if(Math.abs(x-d.x)<(d.hw||19.5)&&Math.abs(z-d.z)<(d.hd||13)){
      for(const t of d.tops)if(t<=y+1.5&&t>best)best=t;  // only floors you can reach
    }
    const r=d.ramp;
    if(r&&Math.abs(x-r.x)<3.4&&z>r.z0-1.5&&z<r.z1+1.5){
      const f=Math.max(0,Math.min(1,(z-r.z0)/(r.z1-r.z0)));
      const t=r.y0+f*(r.y1-r.y0);
      if(t<=y+1.8&&t>best)best=t;
    }
  }
  return best;
}
let parkedCarBuilder=null; // set later (needs vehicle mesh builder)
/* ---- ALIEN SPACESHIPS: one every ~1000 km on the MOON — a real expedition! ---- */
const UFOSP=1000000;
const ufos=[];
function ufoSpot(i,j){
  const x=i*UFOSP+3300,z=j*UFOSP+6600;
  if(rocketPadDist(x,z)<130)return null;
  return{x,z};
}
function makeAlien(col){
  const g=new THREE.Group();
  const gm=new THREE.MeshLambertMaterial({color:col||0x7dff4f});
  const body=new THREE.Mesh(new THREE.SphereGeometry(0.32,9,8),gm);
  body.scale.set(0.8,1.15,0.7);body.position.y=0.75;body.castShadow=true;g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.34,10,9),gm);
  head.scale.set(1,1.25,0.95);head.position.y=1.5;g.add(head);
  /* huge black alien eyes */
  const em=new THREE.MeshLambertMaterial({color:0x0a0a12});
  [[-0.14],[0.14]].forEach(p=>{
    const e=new THREE.Mesh(new THREE.SphereGeometry(0.12,8,7),em);
    e.scale.set(0.8,1.4,0.6);e.position.set(p[0],1.56,0.26);g.add(e);
  });
  /* antennae with glowing tips */
  [[-0.12],[0.12]].forEach(p=>{
    const st=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.4),gm);
    st.position.set(p[0],2.05,0);st.rotation.z=-p[0]*1.4;g.add(st);
    const tip=new THREE.Mesh(new THREE.SphereGeometry(0.05,6,6),new THREE.MeshBasicMaterial({color:col||0x7dff4f}));
    tip.position.set(p[0]*2.2,2.25,0);g.add(tip);
  });
  /* skinny arms & legs */
  [[-0.3],[0.3]].forEach(p=>{
    const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.04,0.6),gm);
    arm.position.set(p[0],0.85,0);arm.rotation.z=p[0]*1.2;g.add(arm);
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.05,0.5),gm);
    leg.position.set(p[0]*0.4,0.25,0);g.add(leg);
  });
  return g;
}
function buildUfo(s,g){
  const P=curPlanet()||PLANETS.moon;
  const y=moonH(s.x,s.z);
  const u=new THREE.Group();u.position.set(s.x,y,s.z);g.add(u);
  const metal=new THREE.MeshPhongMaterial({color:P.ship,shininess:90,specular:0xaaaaaa});
  /* the saucer on landing legs — every planet flies its own colors */
  const saucer=shadowBox(new THREE.Mesh(new THREE.SphereGeometry(7.5,18,10),metal));
  saucer.scale.y=0.28;saucer.position.y=3.4;u.add(saucer);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(3,14,10,0,Math.PI*2,0,Math.PI/2),
    new THREE.MeshPhongMaterial({color:P.alien,transparent:true,opacity:0.5,emissive:P.glow,shininess:100}));
  dome.position.y=5;u.add(dome);
  /* Saturn's spaceships even have their own little ring! */
  if(P.ring){
    const rg=new THREE.Mesh(new THREE.TorusGeometry(9.6,0.35,8,32),new THREE.MeshPhongMaterial({color:P.alien,shininess:80}));
    rg.rotation.x=Math.PI/2;rg.position.y=3.4;u.add(rg);
  }
  for(let i=0;i<3;i++){
    const a=i/3*Math.PI*2;
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.22,3.4),metal);
    leg.position.set(Math.cos(a)*5,1.6,Math.sin(a)*5);
    leg.rotation.z=Math.cos(a)*0.35;leg.rotation.x=-Math.sin(a)*0.35;u.add(leg);
    const foot=new THREE.Mesh(new THREE.CylinderGeometry(0.7,0.8,0.2,8),metal);
    foot.position.set(Math.cos(a)*5.8,0.1,Math.sin(a)*5.8);u.add(foot);
  }
  /* a ramp down + blinking rim lights */
  const ramp=new THREE.Mesh(new THREE.BoxGeometry(2,0.14,5),metal);
  ramp.position.set(0,1.6,7);ramp.rotation.x=0.5;u.add(ramp);
  const lights=[];
  for(let i=0;i<10;i++){
    const a=i/10*Math.PI*2;
    const l=new THREE.Mesh(new THREE.SphereGeometry(0.26,7,7),
      new THREE.MeshBasicMaterial({color:i%2?P.alien:0xff5d8f}));
    l.position.set(Math.cos(a)*7.1,3.4,Math.sin(a)*7.1);u.add(l);
    lights.push(l);
  }
  /* the alien crew, out for a spacewalk — in this planet's own color */
  const aliens=[];
  for(let i=0;i<4;i++){
    const m=makeAlien(P.alien);
    const a={m,x:s.x+(Math.random()-0.5)*24,z:s.z+10+(Math.random()-0.5)*14,yaw:Math.random()*7,t:0};
    m.position.set(a.x,moonH(a.x,a.z),a.z);
    g.add(m);
    aliens.push(a);
  }
  /* glowing crystals near the ship — grab them for money! */
  const crystals=[];
  for(let i=0;i<3;i++){
    const a=i*2.2+0.8,d=16+i*5;
    const cx=s.x+Math.sin(a)*d,cz=s.z+Math.cos(a)*d;
    const cr=new THREE.Mesh(new THREE.OctahedronGeometry(0.7),new THREE.MeshBasicMaterial({color:P.alien}));
    cr.position.set(cx,moonH(cx,cz)+0.9,cz);g.add(cr);
    crystals.push({mesh:cr,x:cx,z:cz,got:false});
  }
  ufos.push({g,x:s.x,z:s.z,lights,aliens,crystals,angry:0,loot:false});
}
/* ---- planet chunks: colored dust, holes, rocks — no roads, no buildings ---- */
const planetRockMats={};
function planetRockMat(P){
  if(!planetRockMats[P.name])planetRockMats[P.name]=keep(new THREE.MeshLambertMaterial({color:P.rock}));
  return planetRockMats[P.name];
}
function buildMoonChunk(cx,cz){
  const P=curPlanet()||PLANETS.moon;
  const g=new THREE.Group();g.userData.recs=[];
  const ox=cx*CS,oz=cz*CS;
  const geo=new THREE.PlaneGeometry(CS,CS,SEG,SEG);geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position,cols=[];
  const cYel=new THREE.Color(P.ground),cGry=new THREE.Color(P.ground2),cDark=new THREE.Color(P.dark);
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i)+ox,z=pos.getZ(i)+oz,h=moonH(x,z);
    pos.setY(i,h);
    const n=vnoise(x/18+2.2,z/18+6.6);
    const c=cYel.clone().lerp(cGry,0.22+n*0.5);           // yellow with a bit of gray
    if(h<-1.2)c.lerp(cDark,Math.min(1,-h/4));             // holes look darker
    cols.push(c.r,c.g,c.b);
  }
  geo.setAttribute("color",new THREE.Float32BufferAttribute(cols,3));
  geo.computeVertexNormals();
  const tm=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({vertexColors:true}));
  tm.position.set(ox,0,oz);tm.receiveShadow=true;g.add(tm);
  const r=rng(cx*911+cz*7349+5);
  for(let i=0;i<6;i++){
    const x=ox+(r()-0.5)*CS,z=oz+(r()-0.5)*CS,s=0.4+r()*1.7;
    const rock=shadowBox(new THREE.Mesh(new THREE.DodecahedronGeometry(s,0),planetRockMat(P)));
    rock.position.set(x,moonH(x,z)+s*0.4,z);rock.rotation.set(r()*3,r()*3,r()*3);g.add(rock);
  }
  /* an ALIEN SPACESHIP every ~1000 km */
  for(let i=Math.floor((ox-CS/2-3400)/UFOSP);i<=Math.ceil((ox+CS/2-3200)/UFOSP);i++)
  for(let j=Math.floor((oz-CS/2-6700)/UFOSP);j<=Math.ceil((oz+CS/2-6500)/UFOSP);j++){
    const sp=ufoSpot(i,j);
    if(!sp)continue;
    if(sp.x<ox-CS/2||sp.x>=ox+CS/2||sp.z<oz-CS/2||sp.z>=oz+CS/2)continue;
    buildUfo(sp,g);
  }
  scene.add(g);
  return g;
}
/* ---- 🚤 BOATS: speedboats moored in shallow water — press F to SAIL ---- */
const boats=[];
const BOATSP=640;
function boatSpot(i,j){
  const x=i*BOATSP+320+Math.round((h2i(i,j)-0.5)*180),z=j*BOATSP+120+Math.round((h2i(j,i*3+1)-0.5)*180);
  const h=baseH(x,z);
  if(h>-1.6||h<-3.4)return null;   // only in SHALLOW water near the shore
  return{x,z};
}
function makeBoatMesh(col){
  const g=new THREE.Group();
  const hullM=new THREE.MeshPhongMaterial({color:col,shininess:70});
  const hull=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(2,0.75,5.2),hullM));hull.position.y=0.42;g.add(hull);
  const bow=new THREE.Mesh(new THREE.ConeGeometry(1,1.6,4),hullM);
  bow.rotation.x=Math.PI/2;bow.rotation.y=Math.PI/4;bow.scale.set(1,1,0.56);bow.position.set(0,0.42,3.35);g.add(bow);
  const deck=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.1,4.9),new THREE.MeshLambertMaterial({color:0xe8dcc0}));deck.position.y=0.84;g.add(deck);
  const ws=new THREE.Mesh(new THREE.PlaneGeometry(1.5,0.55),glassMat);ws.position.set(0,1.25,1.1);ws.rotation.x=-0.45;g.add(ws);
  const seatM=new THREE.MeshLambertMaterial({color:0x2a2f3a});
  [[-0.45],[0.45]].forEach(p=>{const s=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.3,0.6),seatM);s.position.set(p[0],1,0.2);g.add(s);});
  const motor=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.7,0.4),darkTrim);motor.position.set(0,0.75,-2.6);g.add(motor);
  const flag=new THREE.Mesh(new THREE.PlaneGeometry(0.5,0.34),new THREE.MeshBasicMaterial({color:0xffd75e,side:THREE.DoubleSide}));
  flag.position.set(0,1.9,-2.2);g.add(flag);
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,1.1),darkTrim);pole.position.set(0,1.4,-2.35);g.add(pole);
  return g;
}
/* ---- ⛏️ MINECRAFT chunks: blocky grass, trees to chop, ores to mine ---- */
const mcThings=[];   // every mineable thing currently in the world
const MC_ORES=[
  ["stone",0x8a8f96,0.50],["coal",0x2b2b30,0.25],["iron",0xd8b58a,0.13],
  ["gold",0xffd700,0.08],["diamond",0x4fd8ff,0.04]
];
function buildMcTree(x,z,g){
  const y=mcH(x,z);
  const t=new THREE.Group();t.position.set(x,y,z);
  const trunkM=new THREE.MeshLambertMaterial({color:0x6b4a2b});
  const leafM=new THREE.MeshLambertMaterial({color:0x2f8f2f});
  const trunk=new THREE.Mesh(new THREE.BoxGeometry(0.9,3.4,0.9),trunkM);trunk.position.y=1.7;t.add(trunk);
  const l1=new THREE.Mesh(new THREE.BoxGeometry(3.4,2,3.4),leafM);l1.position.y=4.2;t.add(l1);
  const l2=new THREE.Mesh(new THREE.BoxGeometry(2,1.4,2),leafM);l2.position.y=5.7;t.add(l2);
  g.add(t);
  mcThings.push({kind:"tree",x,z,g:t});
}
function buildMcOre(x,z,kind,col,g){
  const y=mcH(x,z);
  const t=new THREE.Group();t.position.set(x,y,z);
  const rock=new THREE.Mesh(new THREE.BoxGeometry(1.7,1.5,1.7),new THREE.MeshLambertMaterial({color:0x7d838c}));
  rock.position.y=0.75;t.add(rock);
  if(kind!=="stone"){
    const m=kind==="diamond"||kind==="gold"?new THREE.MeshBasicMaterial({color:col}):new THREE.MeshLambertMaterial({color:col});
    for(let i=0;i<5;i++){
      const s=new THREE.Mesh(new THREE.BoxGeometry(0.32,0.32,0.32),m);
      s.position.set((i%2-0.5)*0.9,0.5+(i%3)*0.42,(i<2?0.78:i<4?-0.78:0)*(i===4?0:1));
      if(i===4)s.position.z=0.78;
      t.add(s);
    }
  }
  g.add(t);
  mcThings.push({kind,x,z,g:t});
}
function buildMcChunk(cx,cz){
  const g=new THREE.Group();g.userData.recs=[];
  const ox=cx*CS,oz=cz*CS;
  const geo=new THREE.PlaneGeometry(CS,CS,SEG,SEG);geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position,cols=[];
  const g1=new THREE.Color(0x4f9e3f),g2=new THREE.Color(0x5aab48),rk=new THREE.Color(0x8a8f96),sn=new THREE.Color(0xf2f5f7);
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i)+ox,z=pos.getZ(i)+oz,h=mcH(x,z);
    pos.setY(i,h);
    /* blocky checker grass; high hills turn to stone, peaks to snow */
    let c=((Math.floor(x/3)+Math.floor(z/3))%2+2)%2?g1:g2;
    if(h>8.7)c=rk;
    if(h>12)c=sn;
    cols.push(c.r,c.g,c.b);
  }
  geo.setAttribute("color",new THREE.Float32BufferAttribute(cols,3));
  geo.computeVertexNormals();
  const tm=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true}));
  tm.position.set(ox,0,oz);tm.receiveShadow=true;g.add(tm);
  /* trees & ores — not right on the spawn pad */
  const r=rng(cx*4241+cz*659+77);
  for(let i=0;i<9;i++){
    const x=ox+(r()-0.5)*CS,z=oz+(r()-0.5)*CS;
    if(Math.hypot(x-6,z-6)<14)continue;
    if(mcH(x,z)>8.7)continue;   // no trees on the stone tops
    buildMcTree(Math.round(x),Math.round(z),g);
  }
  for(let i=0;i<7;i++){
    const x=ox+(r()-0.5)*CS,z=oz+(r()-0.5)*CS;
    if(Math.hypot(x-6,z-6)<14)continue;
    const roll=r();let acc=0,pick=MC_ORES[0];
    for(const o of MC_ORES){acc+=o[2];if(roll<acc){pick=o;break;}}
    buildMcOre(Math.round(x),Math.round(z),pick[0],pick[1],g);
  }
  /* Trader Steve lives at the spawn */
  if(MCTRADER.x>=ox-CS/2&&MCTRADER.x<ox+CS/2&&MCTRADER.z>=oz-CS/2&&MCTRADER.z<oz+CS/2)buildMcTraderHut(g);
  scene.add(g);
  return g;
}
/* 🟩 a blocky CREEPER: four little legs, no arms... and it goes BOOM */
function makeMcCreeper(){
  const g=new THREE.Group();
  const skin=new THREE.MeshLambertMaterial({color:0x3fae4a});
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.95,0.4),skin);body.position.y=1;g.add(body);
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.55,0.55),skin);head.position.y=1.75;g.add(head);
  const face=new THREE.MeshBasicMaterial({color:0x111111});
  [[-0.13],[0.13]].forEach(p=>{const e=new THREE.Mesh(new THREE.BoxGeometry(0.13,0.13,0.05),face);e.position.set(p[0],1.85,0.29);g.add(e);});
  const mouth=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.22,0.05),face);mouth.position.set(0,1.62,0.29);g.add(mouth);
  [[-0.16,0.25],[0.16,0.25],[-0.16,-0.25],[0.16,-0.25]].forEach(p=>{
    const l=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.5,0.22),skin);l.position.set(p[0],0.25,p[1]);g.add(l);
  });
  return g;
}
/* 🐷 a blocky pig — chop it for porkchops! */
function makeMcPig(){
  const g=new THREE.Group();
  const pink=new THREE.MeshLambertMaterial({color:0xf0a0a8});
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.55,1.1),pink);body.position.y=0.65;g.add(body);
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.45),pink);head.position.set(0,0.75,0.72);g.add(head);
  const snout=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.16,0.1),new THREE.MeshLambertMaterial({color:0xd87f88}));
  snout.position.set(0,0.68,0.97);g.add(snout);
  const eyeM=new THREE.MeshBasicMaterial({color:0x111111});
  [[-0.13],[0.13]].forEach(p=>{const e=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.08,0.04),eyeM);e.position.set(p[0],0.85,0.95);g.add(e);});
  [[-0.22,0.35],[0.22,0.35],[-0.22,-0.35],[0.22,-0.35]].forEach(p=>{
    const l=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.4,0.2),pink);l.position.set(p[0],0.2,p[1]);g.add(l);
  });
  return g;
}
/* 🧑‍🌾 TRADER STEVE's hut at the Minecraft spawn — he pays 25% MORE */
const MCTRADER={x:20,z:-8};
function buildMcTraderHut(g){
  const hx=MCTRADER.x,hz=MCTRADER.z,y=mcH(hx,hz);
  const wood=new THREE.MeshLambertMaterial({color:0x8a6b42});
  const plank=new THREE.MeshLambertMaterial({color:0xa8874f});
  [[0,-3,10,0.6],[0,3,10,0.6],[-4.7,0,0.6,5.4],[4.7,0,0.6,5.4]].forEach(p=>{
    const w=new THREE.Mesh(new THREE.BoxGeometry(p[2],3,p[3]),wood);
    w.position.set(hx+p[0],y+1.5,hz+p[1]);g.add(w);
  });
  const roof=new THREE.Mesh(new THREE.BoxGeometry(11,0.5,7.5),plank);roof.position.set(hx,y+3.4,hz);g.add(roof);
  /* the doorway gap */
  const counter=new THREE.Mesh(new THREE.BoxGeometry(3,1,0.8),plank);counter.position.set(hx,y+0.5,hz+3);g.add(counter);
  /* Trader Steve himself */
  const steve=new THREE.Group();
  const robe=new THREE.Mesh(new THREE.BoxGeometry(0.7,1.1,0.4),new THREE.MeshLambertMaterial({color:0x7a5a3a}));robe.position.y=0.95;steve.add(robe);
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.5),new THREE.MeshLambertMaterial({color:0xe8b88a}));head.position.y=1.75;steve.add(head);
  const nose=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.25,0.12),new THREE.MeshLambertMaterial({color:0xd8a070}));nose.position.set(0,1.68,0.28);steve.add(nose);
  steve.position.set(hx,y,hz+1.2);g.add(steve);
  const sign=bigSign("\u{1F9D1}‍\u{1F33E} TRADER STEVE — +25%!","#3a2a10","#ffd75e",10);
  sign.position.set(hx,y+5,hz+3.4);g.add(sign);
}
/* a blocky zombie for the Minecraft world */
function makeMcMob(){
  const g=new THREE.Group();
  const skin=new THREE.MeshLambertMaterial({color:0x3e8f4a});
  const shirt=new THREE.MeshLambertMaterial({color:0x2a6cae});
  const pants=new THREE.MeshLambertMaterial({color:0x3a3a6e});
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.85,0.4),shirt);body.position.y=1.15;g.add(body);
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.6,0.6),skin);head.position.y=1.9;g.add(head);
  const eyeM=new THREE.MeshBasicMaterial({color:0x111111});
  [[-0.14],[0.14]].forEach(p=>{const e=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.12,0.05),eyeM);e.position.set(p[0],1.95,0.31);g.add(e);});
  /* zombie arms straight forward! */
  [[-0.45],[0.45]].forEach(p=>{const a=new THREE.Mesh(new THREE.BoxGeometry(0.24,0.24,0.8),skin);a.position.set(p[0],1.35,0.45);g.add(a);});
  [[-0.18],[0.18]].forEach(p=>{const l=new THREE.Mesh(new THREE.BoxGeometry(0.26,0.75,0.3),pants);l.position.set(p[0],0.4,0);g.add(l);});
  return g;
}
function buildChunk(cx,cz){
  if(S.world==="mc")return buildMcChunk(cx,cz);
  if(S.world!=="earth")return buildMoonChunk(cx,cz);
  const g=new THREE.Group();g.userData.recs=[];
  const ox=cx*CS,oz=cz*CS,x0=ox-CS/2,x1=ox+CS/2,z0=oz-CS/2,z1=oz+CS/2;
  const biome=biomeAt(ox,oz);
  /* terrain */
  const geo=new THREE.PlaneGeometry(CS,CS,SEG,SEG);geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position,cols=[];
  const cGrass=new THREE.Color(0x6aa84f),cRock=new THREE.Color(0x8d8577),cSnow=new THREE.Color(0xf2f5f7),
        cCity=new THREE.Color(0x7cb05c),cSand=new THREE.Color(0xcbbd9a),cDesert=new THREE.Color(0xd9c184),
        cForest=new THREE.Color(0x4e8a3c);
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i)+ox,z=pos.getZ(i)+oz,h=rawH(x,z)-roadCut(x,z);
    pos.setY(i,h);
    let c;
    const mo=moist(x,z);
    if(Math.abs(x)<160&&Math.abs(z)<160)c=cCity.clone();
    else if(inAirport(x,z))c=cSand.clone();
    else if(h>-1.4&&h<2.4&&seaAt(x,z)>0.55)c=new THREE.Color(0xe6d9a8);   // island beach sand
    else if(mo<0.40)c=cDesert.clone();
    else if(mo>0.60)c=cForest.clone();
    else c=cGrass.clone();
    if(h>20)c.lerp(cRock,Math.min(1,(h-20)/34));
    if(h>85)c.lerp(cSnow,Math.min(1,(h-85)/40));
    if(h<-1)c.lerp(new THREE.Color(0x8a7f5e),Math.min(1,-h/5));   // sandy sea floor
    /* natural patchiness: light & dark blotches make the ground look alive */
    c.multiplyScalar(0.9+vnoise(x/47+13.1,z/47+7.7)*0.2);
    cols.push(c.r,c.g,c.b);
  }
  geo.setAttribute("color",new THREE.Float32BufferAttribute(cols,3));
  /* tile the grass detail texture ~28x across the chunk (uv 0..1 → 0..28) */
  {const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*28,uv.getY(i)*28);}
  geo.computeVertexNormals();
  const tm=new THREE.Mesh(geo,biome==="desert"?sandMat:groundMat);
  tm.position.set(ox,0,oz);tm.receiveShadow=true;g.add(tm);
  const r=rng(cx*7349+cz*911+13);
  /* 3D grass tufts — even the desert gets dry golden ones */
  if(biome==="desert")addGrassTufts(g,ox,oz,r,40,dryTuftMat);
  else addGrassTufts(g,ox,oz,r,biome==="forest"?120:80);
  /* 🚤 boats moored in shallow water — walk to the shore and press F to sail */
  for(let i=Math.floor((ox-CS/2-500)/BOATSP);i<=Math.ceil((ox+CS/2+500)/BOATSP);i++)
  for(let j=Math.floor((oz-CS/2-300)/BOATSP);j<=Math.ceil((oz+CS/2+300)/BOATSP);j++){
    const sp=boatSpot(i,j);
    if(!sp||sp.x<ox-CS/2||sp.x>=ox+CS/2||sp.z<oz-CS/2||sp.z>=oz+CS/2)continue;
    const bm=makeBoatMesh(COLORS[Math.floor(h2i(i*7,j*3)*COLORS.length)]);
    bm.position.set(sp.x,-1.05,sp.z);
    bm.rotation.y=h2i(i,j)*6.28;
    g.add(bm);
    boats.push({g:bm,x:sp.x,z:sp.z});
  }
  /* --- tunnels: where a road was cut through a mountain, cover it with a tube.
     Samples sit on an ABSOLUTE 12 m grid so tube pieces from neighbouring
     chunks meet exactly end-to-end (no overlapping walls = no flickering),
     and long runs are split into short pieces that follow curvy roads. --- */
  function addTunnels(axis,c,a0,a1,breakFn){
    const step=12;
    const s0=Math.ceil(a0/step)*step,s1=Math.floor(a1/step)*step;
    let run=null;
    const emit=()=>{
      /* one long horizontal pipe used to float over (or sink into) sloping
         roads — now the tube is laid in short 36 m pieces that each sit on
         the road grade, with a tiny overlap so the joints never show gaps */
      if(run&&run[1]-run[0]>=24){
        for(let p0=run[0];p0<run[1];p0+=36){
          const p1=Math.min(run[1],p0+36);
          const mid=(p0+p1)/2,len=(p1-p0)+1.5;
          const mx=axis==="z"?c:mid,mz=axis==="z"?mid:c;
          const tg=new THREE.CylinderGeometry(8,8,len,12,1,true);
          if(axis==="z")tg.rotateX(Math.PI/2);else tg.rotateZ(Math.PI/2);
          const tub=new THREE.Mesh(tg,tunnelMat);
          tub.position.set(mx,terrainH(mx,mz)+2.6,mz);
          /* lean each piece along the road slope so the tube follows it */
          const ha=terrainH(axis==="z"?c:p0,axis==="z"?p0:c);
          const hb=terrainH(axis==="z"?c:p1,axis==="z"?p1:c);
          const slope=Math.atan2(hb-ha,p1-p0);
          if(axis==="z")tub.rotation.x=-slope;else tub.rotation.z=slope;
          g.add(tub);
        }
      }
      run=null;
    };
    for(let t=s0;t<=s1+step;t+=step){
      const inside=t<=s1;
      const wx=axis==="z"?c:t,wz=axis==="z"?t:c;
      /* a tube NEVER continues across a crossing road — tunnels used to run
         straight through each other there */
      const high=inside&&baseH(wx,wz)>24&&!(breakFn&&breakFn(t));
      if(high){if(!run)run=[t,t];else run[1]=t;}
      else emit();
    }
  }
  /* --- fish live in the deep sea; frogs & tadpoles in ALL sea water --- */
  if(baseH(ox,oz)<-5){
    for(let i=0;i<3;i++)spawnFish(ox+(r()-0.5)*(CS-40),oz+(r()-0.5)*(CS-40),g);
  }
  if(baseH(ox,oz)<-2){
    for(let i=0;i<3;i++){
      const fx=ox+(r()-0.5)*(CS-40),fz=oz+(r()-0.5)*(CS-40);
      if(baseH(fx,fz)<-1.5)spawnFrog(fx,fz,g);
    }
    for(let i=0;i<4;i++){
      const tx2=ox+(r()-0.5)*(CS-40),tz2=oz+(r()-0.5)*(CS-40);
      if(baseH(tx2,tz2)<-1.5)spawnTad(tx2,tz2,g);
    }
  }
  /* --- grid roads + sidewalks + curbs ---
     near an airport the road is CLIPPED to the airport fence instead of the
     whole strip being thrown away, so streets always connect to each other */
  for(const lx of roadLinesIn(x0,x1)){
    const alx=airportLocal(lx,oz);
    const Acz=Math.round(oz/ACELL)*ACELL;
    let segs=[[z0,z1]];
    if(alx.lx>250&&alx.lx<580){
      segs=[];
      if(z0<Acz-110)segs.push([z0,Math.min(z1,Acz-110)]);
      if(z1>Acz+30)segs.push([Math.max(z0,Acz+30),z1]);
    }
    for(const[a,b]of segs){
      if(b-a<10)continue;
      g.add(ribbon("z",lx,a,b,14,0.12,roadRibMat,18));
      addTunnels("z",lx,a,b,t=>nearGridLine(t)<15||Math.abs(t+170)<17);
      g.add(ribbon("z",lx-8.15,a,b,2.7,0.20,sideMat));
      g.add(ribbon("z",lx+8.15,a,b,2.7,0.20,sideMat));
      if(oz-40>=a&&oz-40<=b)lightPole(lx+9.9,oz-40,g);
      if(oz+50>=a&&oz+50<=b)lightPole(lx+9.9,oz+50,g);
      /* street furniture: hydrants, bins & mailboxes make it a real city */
      if(oz+14>=a&&oz+14<=b&&!inAirport(lx,oz+14)&&baseH(lx+9.6,oz+14)>-1&&baseH(lx+9.6,oz+14)<15){
        const hy=terrainH(lx+9.6,oz+14);
        const hyd=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.2,0.6,8),new THREE.MeshLambertMaterial({color:0xd7263d}));
        hyd.position.set(lx+9.6,hy+0.3,oz+14);g.add(hyd);
        const hc2=new THREE.Mesh(new THREE.SphereGeometry(0.14,7,6),new THREE.MeshLambertMaterial({color:0xb01e2e}));
        hc2.position.set(lx+9.6,hy+0.66,oz+14);g.add(hc2);
      }
      if(oz-52>=a&&oz-52<=b&&!inAirport(lx,oz-52)&&baseH(lx-9.6,oz-52)>-1&&baseH(lx-9.6,oz-52)<15){
        const by2=terrainH(lx-9.6,oz-52);
        const bin=new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.3,0.9,9),new THREE.MeshLambertMaterial({color:0x2f5d3a}));
        bin.position.set(lx-9.6,by2+0.45,oz-52);g.add(bin);
      }
      if(oz+62>=a&&oz+62<=b&&!inAirport(lx,oz+62)&&baseH(lx+9.6,oz+62)>-1&&baseH(lx+9.6,oz+62)<15){
        const my2=terrainH(lx+9.6,oz+62);
        const mp=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,1),poleMat);
        mp.position.set(lx+9.6,my2+0.5,oz+62);g.add(mp);
        const mb=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.4,0.34),new THREE.MeshLambertMaterial({color:0x1d6fd1}));
        mb.position.set(lx+9.6,my2+1.15,oz+62);g.add(mb);
      }
      /* parked cars along the curb — cities live on street parking */
      if(parkedCarBuilder&&Math.abs(lx)>200){
        for(const pz of[oz-84,oz+36]){
          if(pz<a||pz>b)continue;
          if(h2i(Math.round(lx),Math.round(pz))<0.55)continue;
          if(inAirport(lx,pz)||baseH(lx+5.85,pz)<-1||baseH(lx+5.85,pz)>14)continue;
          const pc=parkedCarBuilder(COLORS[Math.floor(h2i(Math.round(pz),Math.round(lx))*COLORS.length)]);
          pc.position.set(lx+5.85,terrainH(lx+5.85,pz),pz);
          pc.rotation.y=h2i(Math.round(lx+pz),7)<0.5?0:Math.PI;
          g.add(pc);
        }
      }
    }
  }
  for(const lz of roadLinesIn(z0,z1)){
    const alz=airportLocal(ox,lz);
    const Acx=Math.round(ox/ACELL)*ACELL;
    let segs=[[x0,x1]];
    if(Math.abs(alz.lz+40)<110){
      segs=[];
      if(x0<Acx+250)segs.push([x0,Math.min(x1,Acx+250)]);
      if(x1>Acx+580)segs.push([Math.max(x0,Acx+580),x1]);
    }
    for(const[a,b]of segs){
      if(b-a<10)continue;
      g.add(ribbon("x",lz,a,b,14,0.16,roadRibMat,18));
      addTunnels("x",lz,a,b,t=>nearGridLine(t)<15||Math.abs(t-170)<17);
      g.add(ribbon("x",lz-8.15,a,b,2.7,0.22,sideMat));
      g.add(ribbon("x",lz+8.15,a,b,2.7,0.22,sideMat));
    }
  }
  /* intersections: patch + traffic lights (not inside the airport fence) */
  for(const lx of roadLinesIn(x0,x1))for(const lz of roadLinesIn(z0,z1)){
    const ai=airportLocal(lx,lz);
    if(ai.lx>230&&ai.lx<600&&Math.abs(ai.lz+40)<110)continue;
    if(baseH(lx,lz)>24)continue;   // no intersections/traffic lights inside mountains & tunnels
    g.add(crossingPatch(lx,lz,20));
    if((((lx-30)/120|0)+((lz-30)/120|0))%2===0)trafficLight(lx,lz,g);
    /* bus stop shelters on every 3rd crossing */
    if((((lx-30)/120)+((lz-30)/120))%3===0){
      const bx=lx+11,bz=lz+11,by=terrainH(bx,bz);
      const back=new THREE.Mesh(new THREE.BoxGeometry(3.4,2.2,0.15),new THREE.MeshLambertMaterial({color:0x2e4a62}));
      back.position.set(bx,by+1.3,bz+0.8);g.add(back);
      const rf=new THREE.Mesh(new THREE.BoxGeometry(3.8,0.15,1.8),new THREE.MeshLambertMaterial({color:0xffd75e}));
      rf.position.set(bx,by+2.5,bz);g.add(rf);
      const bench=new THREE.Mesh(new THREE.BoxGeometry(3,0.15,0.5),new THREE.MeshLambertMaterial({color:0x8a6f4d}));
      bench.position.set(bx,by+0.6,bz+0.4);g.add(bench);
      const sg=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.06),new THREE.MeshLambertMaterial({color:0xffd75e}));
      sg.position.set(bx-2,by+2.2,bz);g.add(sg);
      const sp=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,2.2),poleMat);sp.position.set(bx-2,by+1.1,bz);g.add(sp);
    }
  }
  /* highways (4 lanes) */
  if(x0<=170&&x1>=170){g.add(ribbon("z",170,z0,z1,22,0.24,hwyRibMat,24));
    addTunnels("z",170,z0,z1,t=>nearGridLine(t)<15||Math.abs(t+170)<17);}
  if(z0<=-170&&z1>=-170){g.add(ribbon("x",-170,x0,x1,22,0.26,hwyRibMat,24));
    addTunnels("x",-170,x0,x1,t=>nearGridLine(t)<15||Math.abs(t-170)<17);}
  /* the MEGA HIGHWAY (8 lanes: 4 each side) */
  if(x0<=MHX&&x1>=MHX){g.add(ribbon("z",MHX,z0,z1,38,0.30,megaRibMat,40));
    addTunnels("z",MHX,z0,z1,t=>nearGridLine(t)<15||Math.abs(t-MHZ)<24);}
  if(z0<=MHZ&&z1>=MHZ){g.add(ribbon("x",MHZ,x0,x1,38,0.32,megaRibMat,40));
    addTunnels("x",MHZ,x0,x1,t=>nearGridLine(t)<15||Math.abs(t-MHX)<24);}
  /* curvy country roads */
  const dwn=x1>-190&&x0<190&&z1>-190&&z0<190;
  const aL=airportLocal(ox,oz);
  const nearAir=aL.lx>200&&aL.lx<640&&Math.abs(aL.lz+40)<130;
  if(!dwn&&!nearAir){
    const kx0=Math.round((ox-CHF)/CSP);
    for(let k=kx0-1;k<=kx0+1;k++){
      const cAt=zz=>curveCX(k,zz);
      if(Math.abs(cAt(oz)-ox)<CS/2+CWIN)g.add(ribbon("z",0,z0,z1,12,0.27,roadRibMat,18,cAt));
    }
    const kz0=Math.round((oz-CHF)/CSP);
    for(let k=kz0-1;k<=kz0+1;k++){
      const cAt=xx=>curveCZ(k,xx);
      if(Math.abs(cAt(ox)-oz)<CS/2+CWIN)g.add(ribbon("x",0,x0,x1,12,0.29,roadRibMat,18,cAt));
    }
  }
  /* curved railways */
  const rk0=railKNear(ox);
  for(let k=rk0-1;k<=rk0+1;k++){
    const cAt=zz=>railC(k,zz);
    if(Math.abs(cAt(oz)-ox)<CS/2+120){
      /* raised track bed: sits ABOVE road surfaces so crossings look like
         level crossings instead of rails clipping through the asphalt */
      g.add(ribbon("z",0,z0,z1,6,0.40,bedMat,0,cAt));
      g.add(ribbon("z",0,z0,z1,0.24,0.56,railMat,0,zz=>cAt(zz)-0.85));
      g.add(ribbon("z",0,z0,z1,0.24,0.56,railMat,0,zz=>cAt(zz)+0.85));
      const n=Math.floor(CS/4);
      const sl=new THREE.InstancedMesh(new THREE.BoxGeometry(3,0.16,0.7),new THREE.MeshLambertMaterial({color:0x5a4634}),n);
      const M=new THREE.Matrix4();
      for(let i=0;i<n;i++){const z=z0+2+i*4;M.setPosition(cAt(z),terrainH(cAt(z),z)+0.46,z);sl.setMatrixAt(i,M);}
      g.add(sl);
      /* level-crossing gates where roads cross the rails — they close for trains */
      for(const lz of roadLinesIn(z0,z1)){
        const gcx=cAt(lz),gy=terrainH(gcx,lz);
        const armM=new THREE.MeshLambertMaterial({color:0xd7263d});
        const mkGate=(px,pz,dir)=>{
          const post=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.14,1.5),poleMat);
          post.position.set(px,gy+0.75,pz);g.add(post);
          const piv=new THREE.Group();piv.position.set(px,gy+1.25,pz);g.add(piv);
          const arm=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.16,7),armM);
          arm.position.z=dir*3.5;piv.add(arm);
          for(let s=0;s<3;s++){const ws=new THREE.Mesh(new THREE.BoxGeometry(0.19,0.19,0.8),new THREE.MeshLambertMaterial({color:0xffffff}));
            ws.position.z=dir*(1+s*2.2);piv.add(ws);}
          return piv;
        };
        const p1=mkGate(gcx-9,lz-7,1),p2=mkGate(gcx+9,lz+7,-1);
        gates.push({k,z:lz,p1,p2,open:1});
      }
    }
  }
  /* suburbs + shops + parking + garages + containers */
  if(!dwn&&biome!=="desert"){
    const nb=2+Math.floor(r()*3);
    for(let i=0;i<nb;i++){
      const x=ox+(r()-0.5)*(CS-30),z=oz+(r()-0.5)*(CS-30);
      if(keepClear(x,z))continue;
      const h=rawH(x,z);if(h>16)continue;
      const sl=Math.abs(rawH(x+5,z)-rawH(x-5,z))+Math.abs(rawH(x,z+5)-rawH(x,z-5));
      if(sl>3)continue;
      const rec=r()<0.3?apartment(x,z,r,g,h):house(x,z,r,g,h);
      g.userData.recs.push(rec);
    }
    /* parking lot + shop against a road */
    if(r()<0.55){
      const lx=roadLinesIn(x0,x1)[0];
      if(lx!==undefined){
        const px=lx+9.5+12,pz=oz+(r()-0.5)*60;
        if(!keepClear(px,pz)&&rawH(px,pz)<12){
          const py=terrainH(px,pz);
          const lot=new THREE.Mesh(new THREE.PlaneGeometry(24,16),lotMat);
          lot.rotation.x=-Math.PI/2;lot.position.set(px,py+0.12,pz);lot.receiveShadow=true;g.add(lot);
          for(let i=0;i<3;i++)if(r()<0.75&&parkedCarBuilder){
            const pc=parkedCarBuilder(COLORS[Math.floor(r()*COLORS.length)]);
            pc.position.set(px-8+i*7,py+0.12,pz-3.5);pc.rotation.y=Math.PI;g.add(pc);
          }
          /* register the shop for cleanup too — before this, every shop ever
             built stayed in the global buildings list forever and the
             per-frame collision scan got slower and slower (random freezes) */
          g.userData.recs.push(shop(px,pz+13,r,g,terrainH(px,pz+13)));
          for(let i=0;i<2;i++)spawnQueue.push([px-4+r()*8,pz+4+r()*6]);
        }
      }
    }
    /* multi-storey parking garage */
    if(((cx*31+cz*17)%23+23)%23===4){
      const gx=ox+30,gz=oz-30;
      if(!keepClear(gx,gz)&&rawH(gx,gz)<10){
        const gy=terrainH(gx,gz);
        const slabM=new THREE.MeshLambertMaterial({color:0x9aa0a8});
        for(let f=1;f<=3;f++){
          const s=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(38,0.5,26),slabM));
          s.position.set(gx,gy+f*3.4,gz);g.add(s);
        }
        for(const dx of[-17,0,17])for(const dz of[-11,11]){
          for(let f=0;f<3;f++){
            const p=new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.35,3.4),slabM);
            p.position.set(gx+dx,gy+f*3.4+1.7,gz+dz);g.add(p);
          }
        }
        const ramp=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(6,0.4,14),slabM));
        ramp.position.set(gx+22,gy+1.7,gz);ramp.rotation.x=-0.25;g.add(ramp);
        /* the floors and the ramp are REAL surfaces you can drive & walk on */
        decks.push({g,x:gx,z:gz,tops:[gy+3.65,gy+7.05,gy+10.45],
          ramp:{x:gx+22,z0:gz-7,z1:gz+7,y0:gy,y1:gy+3.65}});
        if(parkedCarBuilder)for(let i=0;i<3;i++){
          const pc=parkedCarBuilder(COLORS[Math.floor(r()*COLORS.length)]);
          pc.position.set(gx-12+i*10,gy+0.05,gz+6);g.add(pc);
        }
        const sign=new THREE.Mesh(new THREE.PlaneGeometry(10,2.4),parkSignMat());
        sign.position.set(gx,gy+11.4,gz+13.1);g.add(sign);
      }
    }
    /* containers */
    if(((cx*13+cz*7)%17+17)%17===6){
      const ix=ox-40,iz=oz+40;
      if(!keepClear(ix,iz)&&rawH(ix,iz)<10){
        const iy=terrainH(ix,iz);
        for(let i=0;i<7;i++){
          const c=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(6,2.6,2.4),new THREE.MeshLambertMaterial({color:COLORS[Math.floor(r()*COLORS.length)]})));
          c.position.set(ix+(i%3)*6.4,iy+1.3+Math.floor(i/3)*2.7,iz+(i%2)*2.8);g.add(c);
        }
      }
    }
  }
  /* McDrive every ~500 m (off the road, never in water / mountains / airports) */
  for(let i=Math.floor((x0-46)/MCSP);i<=Math.ceil((x1-46)/MCSP);i++)
  for(let j=Math.floor((z0-90)/MCSP);j<=Math.ceil((z1-90)/MCSP);j++){
    const sp=mcdSpot(i,j);
    if(!sp)continue;
    if(sp.x<x0||sp.x>=x1||sp.z<z0||sp.z>=z1)continue;
    buildMcd(sp.ax,sp.az,g);
  }
  /* a gas station every ~840 m */
  for(let i=Math.floor((x0-300)/GSP);i<=Math.ceil((x1-270)/GSP);i++)
  for(let j=Math.floor((z0-170)/GSP);j<=Math.ceil((z1-130)/GSP);j++){
    const sp=gasSpot(i,j);
    if(!sp)continue;
    if(sp.x<x0||sp.x>=x1||sp.z<z0||sp.z>=z1)continue;
    buildGas(sp.ax,sp.az,g);
  }
  /* cave openings in the mountains */
  for(let i=Math.floor((x0-760)/CVSP);i<=Math.ceil((x1-720)/CVSP);i++)
  for(let j=Math.floor((z0-400)/CVSP);j<=Math.ceil((z1-360)/CVSP);j++){
    const sp=caveSpot(i,j);
    if(!sp)continue;
    if(sp.x<x0||sp.x>=x1||sp.z<z0||sp.z>=z1)continue;
    buildCaveMouth(sp.x,sp.z,g);
  }
  /* a huge MEGA MART every ~3 km */
  for(let i=Math.floor((x0-900)/HSP);i<=Math.ceil((x1+100)/HSP);i++)
  for(let j=Math.floor((z0-500)/HSP);j<=Math.ceil((z1+100)/HSP);j++){
    const sp=hugeShopSpot(i,j);
    if(!sp)continue;
    if(sp.x<x0||sp.x>=x1||sp.z<z0||sp.z>=z1)continue;
    g.userData.recs.push(hugeShop(sp.x,sp.z,r,g,terrainH(sp.x,sp.z)));
  }
  /* a MEGA MANSION every ~2 km */
  for(let i=Math.floor((x0-1400)/MSP);i<=Math.ceil((x1+100)/MSP);i++)
  for(let j=Math.floor((z0-1000)/MSP);j<=Math.ceil((z1+100)/MSP);j++){
    const sp=mansionSpot(i,j);
    if(!sp)continue;
    if(sp.x<x0||sp.x>=x1||sp.z<z0||sp.z>=z1)continue;
    g.userData.recs.push(mansion(sp.x,sp.z,r,g,terrainH(sp.x,sp.z)));
  }
  /* VOLCANOES: built by the chunk with the crater */
  for(let i=Math.floor((x0-4350)/VOLC);i<=Math.ceil((x1-4050)/VOLC);i++)
  for(let j=Math.floor((z0-7950)/VOLC);j<=Math.ceil((z1-7650)/VOLC);j++){
    const sp=volcanoSpot(i,j);
    if(!sp)continue;
    if(sp.x<x0||sp.x>=x1||sp.z<z0||sp.z>=z1)continue;
    buildVolcano(sp,g);
  }
  /* SKY RESTAURANTS floating on their clouds */
  for(let i=Math.floor((x0-2700)/SRSP);i<=Math.ceil((x1-2500)/SRSP);i++)
  for(let j=Math.floor((z0-1000)/SRSP);j<=Math.ceil((z1-800)/SRSP);j++){
    const sp=skyRestSpot(i,j);
    if(!sp)continue;
    if(sp.x<x0||sp.x>=x1||sp.z<z0||sp.z>=z1)continue;
    buildSkyRest(sp,g);
  }
  /* PUBLIC POOL PARKS every ~2 km */
  for(let i=Math.floor((x0-1830)/PPSP);i<=Math.ceil((x1-1590)/PPSP);i++)
  for(let j=Math.floor((z0-550)/PPSP);j<=Math.ceil((z1-310)/PPSP);j++){
    const sp=poolSpot(i,j);
    if(!sp)continue;
    if(sp.x<x0||sp.x>=x1||sp.z<z0||sp.z>=z1)continue;
    buildPoolPark(sp,g);
  }
  /* BUILDING PLOTS for sale every ~1.6 km */
  for(let i=Math.floor((x0-500)/PLSP);i<=Math.ceil((x1-360)/PLSP);i++)
  for(let j=Math.floor((z0-1220)/PLSP);j<=Math.ceil((z1-1080)/PLSP);j++){
    const sp=plotSpot(i,j);
    if(!sp)continue;
    if(sp.x<x0||sp.x>=x1||sp.z<z0||sp.z>=z1)continue;
    buildPlot(sp,g);
  }
  /* FERRY ISLANDS: decor is built by the chunk that holds the island's center */
  for(let i=Math.floor((x0-1000)/ISP);i<=Math.ceil((x1-800)/ISP);i++)
  for(let j=Math.floor((z0-1600)/ISP);j<=Math.ceil((z1-1400)/ISP);j++){
    const sp=islandSpot(i,j);
    if(!sp)continue;
    if(sp.x<x0||sp.x>=x1||sp.z<z0||sp.z>=z1)continue;
    buildIsland(sp,g);
  }
  /* a DUMPLING MUSEUM every ~1 km */
  for(let i=Math.floor((x0-600)/DMUS);i<=Math.ceil((x1-440)/DMUS);i++)
  for(let j=Math.floor((z0-340)/DMUS);j<=Math.ceil((z1-180)/DMUS);j++){
    const sp=museumSpot(i,j);
    if(!sp)continue;
    if(sp.x<x0||sp.x>=x1||sp.z<z0||sp.z>=z1)continue;
    g.userData.recs.push(buildMuseum(sp.x,sp.z,r,g,terrainH(sp.x,sp.z)));
  }
  /* a CONCERT HALL every ~2.4 km */
  for(let i=Math.floor((x0-1570)/CHSP);i<=Math.ceil((x1-1490)/CHSP);i++)
  for(let j=Math.floor((z0-1090)/CHSP);j<=Math.ceil((z1-1010)/CHSP);j++){
    const sp=concertSpot(i,j);
    if(!sp)continue;
    if(sp.x<x0||sp.x>=x1||sp.z<z0||sp.z>=z1)continue;
    g.userData.recs.push(buildConcertHall(sp.x,sp.z,r,g,terrainH(sp.x,sp.z)));
  }
  /* a dumpling buyer every ~500 m */
  for(let i=Math.floor((x0-160)/DBSP);i<=Math.ceil((x1+100)/DBSP);i++)
  for(let j=Math.floor((z0-400)/DBSP);j<=Math.ceil((z1+100)/DBSP);j++){
    const sp=buyerSpot(i,j);
    if(!sp)continue;
    if(sp.x<x0||sp.x>=x1||sp.z<z0||sp.z>=z1)continue;
    buildBuyer(sp.x,sp.z,g);
  }
  /* vegetation + wildlife by biome */
  const dense=biome==="forest"?22:(biome==="desert"?5:10);
  for(let i=0;i<dense;i++){
    const x=ox+(r()-0.5)*CS,z=oz+(r()-0.5)*CS;
    if(keepClear(x,z))continue;
    const h=rawH(x,z);if(h>55)continue;
    if(biome==="desert"){
      const dr=r();
      if(dr<0.45)makeCactus(x,z,0.8+r()*0.8,g,h);
      else if(dr<0.7)makeBush(x,z,0.6+r()*0.5,g,h);
      else{
        /* red desert rocks give the dunes some drama */
        const rk=shadowBox(new THREE.Mesh(new THREE.DodecahedronGeometry(0.5+r()*1.6,0),desertRockMat));
        rk.position.set(x,h+0.35,z);
        rk.rotation.set(r()*3,r()*3,r()*3);
        g.add(rk);
      }
    }else{
      if(r()<0.25)makeBush(x,z,0.7+r()*0.9,g,h);
      else makeTree(x,z,r()<0.15?2.4+r()*1.3:0.8+r()*0.9,g,h);
    }
  }
  /* wildlife: a different animal mix in every biome (animals can't swim) */
  if(r()<0.7){
    const wax=ox+(r()-0.5)*150,waz=oz+(r()-0.5)*150;
    if(baseH(wax,waz)>-1){
      const p=r();
      if(biome==="forest")regAnimal(p<0.35?makeDeer():p<0.55?makeRabbit():p<0.75?makeFox():p<0.9?makeBear():makeZooAnimal("elephant"),wax,waz,g,p<0.75?0.9:0.6);
      else if(biome==="desert"){if(p<0.85)regAnimal(p<0.55?makeCamel():makeRabbit(),wax,waz,g,0.7);}
      else regAnimal(p<0.3?makeSheep():p<0.55?makeCow():p<0.75?makeHorse():p<0.9?makeZooAnimal("giraffe"):makeZooAnimal("elephant"),wax,waz,g,p<0.75?0.5:0.7);
    }
  }
  scene.add(g);
  return g;
}
const spawnQueue=[]; // shopper pedestrians created after chunk build
function flushSpawnQueue(){
  while(spawnQueue.length){const [x,z]=spawnQueue.pop();spawnPed(x,z,"wander");}
}
function disposeChunk(g){
  scene.remove(g);
  for(const rec of g.userData.recs){const i=buildings.indexOf(rec);if(i>=0)buildings.splice(i,1);}
  disposeGroup(g);
}
const buildQueue=[];
let _lastChunkBuild=0;
function updateChunks(px,pz,force){
  const ccx=Math.round(px/CS),ccz=Math.round(pz/CS),need=new Set();
  for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++){
    if(dx*dx+dz*dz>9)continue;
    const k=(ccx+dx)+","+(ccz+dz);need.add(k);
    if(!chunks.has(k)){
      /* teleport/start: only the ground right under you is built instantly,
         the rest streams in over the next frames — no multi-second freeze */
      if(force&&dx*dx+dz*dz<=2){chunks.set(k,buildChunk(ccx+dx,ccz+dz));}
      else{chunks.set(k,"pending");buildQueue.push([k,ccx+dx,ccz+dz]);}
    }
  }
  for(const[k,g]of chunks){
    if(!need.has(k)){
      if(g!=="pending")disposeChunk(g);
      chunks.delete(k);
    }
  }
  /* build queued chunks nearest-first. Ground close to the player builds
     right away; the distant ring trickles in at most one chunk every 45 ms,
     so streaming never causes back-to-back slow frames */
  if(buildQueue.length){
    buildQueue.sort((a,b)=>((a[1]-ccx)*(a[1]-ccx)+(a[2]-ccz)*(a[2]-ccz))-((b[1]-ccx)*(b[1]-ccx)+(b[2]-ccz)*(b[2]-ccz)));
    const q=buildQueue[0],near=(q[1]-ccx)*(q[1]-ccx)+(q[2]-ccz)*(q[2]-ccz)<=2;
    const now=performance.now();
    if(near||now-_lastChunkBuild>45){
      while(buildQueue.length){
        const [k,cx,cz]=buildQueue.shift();
        if(chunks.get(k)!=="pending")continue;
        chunks.set(k,buildChunk(cx,cz));break;
      }
      _lastChunkBuild=now;
    }
  }
  flushSpawnQueue();
}
/* ================= LANDMARK CACHE (airports, stations, zoo, downtown) ================= */
const landmarks=new Map();
function lmKey(t,a,b){return t+":"+a+","+b;}
function buildAirport(i,j){
  const ox=i*ACELL,oz=j*ACELL,g=new THREE.Group();
  const X0=ox+300,X1=ox+530,Z=oz-40;
  const rw=new THREE.Mesh(new THREE.PlaneGeometry(X1-X0+40,26),new THREE.MeshLambertMaterial({color:0x2f3338}));
  rw.rotation.x=-Math.PI/2;rw.position.set((X0+X1)/2,0.06,Z);rw.receiveShadow=true;g.add(rw);
  for(let x=X0;x<X1;x+=18){
    const s=new THREE.Mesh(new THREE.PlaneGeometry(9,0.6),new THREE.MeshBasicMaterial({color:0xffffff}));
    s.rotation.x=-Math.PI/2;s.rotation.z=Math.PI/2;s.position.set(x,0.08,Z);g.add(s);
  }
  const apron=new THREE.Mesh(new THREE.PlaneGeometry(120,50),new THREE.MeshLambertMaterial({color:0x43484f}));
  apron.rotation.x=-Math.PI/2;apron.position.set(ox+330,0.055,oz-65);apron.receiveShadow=true;g.add(apron);
  const term=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(60,10,16),new THREE.MeshLambertMaterial({color:0xd8dee8})));
  term.position.set(ox+320,5,oz-88);g.add(term);
  const glass=new THREE.Mesh(new THREE.BoxGeometry(60.4,4,16.4),new THREE.MeshLambertMaterial({color:0x7fc4e8}));
  glass.position.set(ox+320,6.5,oz-88);g.add(glass);
  const tower=shadowBox(new THREE.Mesh(new THREE.CylinderGeometry(2.4,3,22,10),new THREE.MeshLambertMaterial({color:0xc9cfd8})));
  tower.position.set(ox+365,11,oz-90);g.add(tower);
  const cab=shadowBox(new THREE.Mesh(new THREE.CylinderGeometry(4.4,4.4,3.6,10),new THREE.MeshLambertMaterial({color:0x2e4a62})));
  cab.position.set(ox+365,23,oz-90);g.add(cab);
  const cv=document.createElement("canvas");cv.width=512;cv.height=128;
  const c2=cv.getContext("2d");c2.fillStyle="#123";c2.fillRect(0,0,512,128);
  c2.fillStyle="#7fe0ff";c2.font="bold 52px Segoe UI";c2.textAlign="center";
  c2.fillText("AIRPORT "+(i===0&&j===0?"CENTRAL":String.fromCharCode(65+(((i*3+j)%26)+26)%26)+Math.abs(j)),256,84);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(24,6),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv)}));
  sign.position.set(ox+320,12.5,oz-79.5);g.add(sign);
  scene.add(g);return g;
}
function airportOf(i,j){return{i,j,ox:i*ACELL,oz:j*ACELL,
  approachX:i*ACELL+300-240,rwz:j*ACELL-40,stopX:i*ACELL+340,apron:{x:i*ACELL+338,z:j*ACELL-58},
  term:{x:i*ACELL+330,z:j*ACELL-65}};}
function nearestAirports(x,z,n){
  const i0=Math.round(x/ACELL),j0=Math.round(z/ACELL),list=[];
  for(let i=i0-1;i<=i0+1;i++)for(let j=j0-1;j<=j0+1;j++){
    const a=airportOf(i,j);
    a.dist=Math.hypot(a.term.x-x,a.term.z-z);list.push(a);
  }
  list.sort((a,b)=>a.dist-b.dist);return list.slice(0,n||3);
}
/* station platforms you can actually stand on (walkPlayer checks these) */
const platforms=[];
function platformYAt(x,z){
  let best=-1e9;
  for(let i=platforms.length-1;i>=0;i--){
    const p=platforms[i];
    if(offScene(p.g)){platforms.splice(i,1);continue;}
    if(Math.abs(x-p.x)>p.w/2)continue;
    const dz=z-p.z;
    if(Math.abs(dz)<=p.d/2)best=Math.max(best,p.top);
    else if(dz>p.d/2&&dz<p.d/2+6)                       // stairs: smooth ramp down
      best=Math.max(best,p.gy+(p.top-p.gy)*(1-(dz-p.d/2)/6));
  }
  return best;
}
function buildStation(k,j){
  const sz=j*SCELL+STZ,cx=railC(k,sz),g=new THREE.Group(),y=terrainH(cx,sz);
  const plat=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(8,1.1,56),new THREE.MeshLambertMaterial({color:0xb9b2a6})));
  plat.position.set(cx+7,y+0.55,sz);g.add(plat);
  platforms.push({g,x:cx+7,z:sz,w:8,d:56,top:y+1.1,gy:y});
  /* stairs down from the platform's south end */
  const stairMat=new THREE.MeshLambertMaterial({color:0xa8a196});
  for(let s=0;s<5;s++){
    const st=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(8,0.22,1.2),stairMat));
    st.position.set(cx+7,y+0.99-s*0.22,sz+28+0.6+s*1.2);g.add(st);
  }
  const roof=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(8,0.4,44),new THREE.MeshLambertMaterial({color:0x2e4a62})));
  roof.position.set(cx+7,y+5.6,sz);g.add(roof);
  for(let z=-18;z<=18;z+=9){
    const p=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,4.5),poleMat);
    p.position.set(cx+7,y+3.2,sz+z);g.add(p);
  }
  const cv=document.createElement("canvas");cv.width=512;cv.height=128;
  const c=cv.getContext("2d");c.fillStyle="#123";c.fillRect(0,0,512,128);
  c.fillStyle="#ffd75e";c.font="bold 54px Segoe UI";c.textAlign="center";
  c.fillText((k===0&&j===0?"CENTRAL":"LINE "+k+" \u00b7 ST "+j)+" STATION",256,84);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(13,3.2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv)}));
  sign.position.set(cx+11.2,y+6.2,sz);sign.rotation.y=Math.PI/2;g.add(sign);
  scene.add(g);return g;
}
function buildZoo(){
  const g=new THREE.Group(),zx=-340,zz=260,y=0;
  const pens=[["elephant",-24,-14],["lion",0,-14],["zebra",24,-14],["elephant",-24,16],["giraffe",0,16],["zebra",24,16]];
  const fenceM=new THREE.MeshLambertMaterial({color:0x8a6f4d});
  for(const[kind,dx,dz]of pens){
    for(let a=0;a<12;a++){
      const th=a/12*Math.PI*2;
      const p=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,1.6),fenceM);
      p.position.set(zx+dx+Math.cos(th)*9,y+0.8,zz+dz+Math.sin(th)*9);g.add(p);
    }
    const rail1=new THREE.Mesh(new THREE.TorusGeometry(9,0.06,6,20),fenceM);
    rail1.rotation.x=Math.PI/2;rail1.position.set(zx+dx,y+1.3,zz+dz);g.add(rail1);
    for(let i=0;i<2;i++){
      const an=regAnimal(makeZooAnimal(kind),zx+dx+(Math.random()-0.5)*6,zz+dz+(Math.random()-0.5)*6,g,0.5);
      an.pen={x:zx+dx,z:zz+dz,r:7.5};
    }
  }
  const cv=document.createElement("canvas");cv.width=512;cv.height=128;
  const c=cv.getContext("2d");c.fillStyle="#27ae60";c.fillRect(0,0,512,128);
  c.fillStyle="#fff";c.font="bold 72px Segoe UI";c.textAlign="center";c.fillText("CITY ZOO",256,90);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(20,5),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv)}));
  sign.position.set(zx,y+6,zz+40);g.add(sign);
  [-8,8].forEach(o=>{const p=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,6),poleMat);p.position.set(zx+o,y+3,zz+40);g.add(p);});
  for(let i=0;i<4;i++)spawnQueue.push([zx-20+Math.random()*40,zz+25+Math.random()*10]);
  scene.add(g);return g;
}
/* ⛪ the CITY CHURCH & Saturday car-meet square — one per city, like the zoo */
const CHURCH={x:464,z:330,meetX:428,meetZ:330};
function buildChurch(){
  const g=new THREE.Group(),cx=CHURCH.x,cz=CHURCH.z,y=terrainH(cx,cz);
  const stone=new THREE.MeshLambertMaterial({color:0xcfc6b8});
  const roofM=new THREE.MeshLambertMaterial({color:0x7a4a2f});
  /* the nave is a REAL walk-in hall: floor, hollow walls & a ceiling */
  const floor=new THREE.Mesh(new THREE.BoxGeometry(10,0.3,20),new THREE.MeshLambertMaterial({color:0xbfb6a6}));
  floor.position.set(cx,y+0.15,cz);floor.receiveShadow=true;g.add(floor);
  const wallE=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(0.4,7,20),stone));
  wallE.position.set(cx+5,y+3.5,cz);g.add(wallE);
  /* west wall has the doorway in the middle */
  [-6,6].forEach(oz=>{
    const w=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(0.4,7,8),stone));
    w.position.set(cx-5,y+3.5,cz+oz);g.add(w);
  });
  const lintel=new THREE.Mesh(new THREE.BoxGeometry(0.4,3,4),stone);
  lintel.position.set(cx-5,y+5.5,cz);g.add(lintel);
  [-10,10].forEach(oz=>{
    const w=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(10,7,0.4),stone));
    w.position.set(cx,y+3.5,cz+oz);g.add(w);
  });
  const ceil=new THREE.Mesh(new THREE.BoxGeometry(10.6,0.3,20.6),new THREE.MeshLambertMaterial({color:0xe8e2d4}));
  ceil.position.set(cx,y+7.15,cz);g.add(ceil);
  /* you can only walk in & out through the doorway */
  regShell(g,cx,cz,5,10,y,[{x:cx-5,z:cz,r:2.2}]);
  /* pitched roof: two slanted panels meeting at the ridge */
  [-1,1].forEach(s=>{
    const r=new THREE.Mesh(new THREE.BoxGeometry(6.6,0.4,20.6),roofM);
    r.position.set(cx+s*2.3,y+8.1,cz);r.rotation.z=s*0.72;g.add(r);
  });
  /* 🎹 THE ORGAN: silver pipes on a base + a console you can REALLY play */
  const pipeM=new THREE.MeshLambertMaterial({color:0xb9c0cc});
  const base=new THREE.Mesh(new THREE.BoxGeometry(4.8,1,1.2),new THREE.MeshLambertMaterial({color:0x5a3a22}));
  base.position.set(cx,y+0.8,cz+9.2);g.add(base);
  [2,2.6,3.2,3.9,4.6,3.9,3.2,2.6,2].forEach((h,i)=>{
    const p2=new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.17,h,8),pipeM);
    p2.position.set(cx-1.9+i*0.475,y+1.3+h/2,cz+9.2);g.add(p2);
  });
  /* organ console — just for show: the organ plays ITSELF (it's not a piano!) */
  const conM=new THREE.MeshLambertMaterial({color:0x4a3320});
  const con=new THREE.Mesh(new THREE.BoxGeometry(2.2,1.05,0.8),conM);
  con.position.set(cx,y+0.85,cz+7.6);g.add(con);
  const keys=new THREE.Mesh(new THREE.BoxGeometry(1.7,0.06,0.3),new THREE.MeshLambertMaterial({color:0xf2efe6}));
  keys.position.set(cx,y+1.15,cz+7.35);g.add(keys);
  const bench=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.12,0.5),conM);
  bench.position.set(cx,y+0.78,cz+6.6);g.add(bench);
  [[-0.7,-0.15],[0.7,-0.15],[-0.7,0.15],[0.7,0.15]].forEach(o=>{
    const l=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.45,0.1),conM);
    l.position.set(cx+o[0],y+0.5,cz+6.6+o[1]);g.add(l);
  });
  /* red carpet down the aisle */
  const carpet=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.06,16),new THREE.MeshLambertMaterial({color:0x9e2b2b}));
  carpet.position.set(cx,y+0.34,cz-1);g.add(carpet);
  /* rows of chairs (you can SIT on them!) facing the organ, aisle in the middle */
  for(let row=0;row<5;row++){
    const rz=cz-7.5+row*2.1;
    [-3.2,-1.9,1.9,3.2].forEach(ox=>makeChair(cx+ox,rz,0,g,y+0.3));
  }
  /* bell tower with a spire and a golden cross */
  const tow=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(4.6,13,4.6),stone));
  tow.position.set(cx,y+6.5,cz-12.2);g.add(tow);
  const sp=new THREE.Mesh(new THREE.ConeGeometry(3.4,5,4),roofM);
  sp.position.set(cx,y+15.5,cz-12.2);sp.rotation.y=Math.PI/4;g.add(sp);
  const crossM=new THREE.MeshBasicMaterial({color:0xffd75e});
  const c1=new THREE.Mesh(new THREE.BoxGeometry(0.22,2.2,0.22),crossM);c1.position.set(cx,y+19.1,cz-12.2);g.add(c1);
  const c2=new THREE.Mesh(new THREE.BoxGeometry(1.3,0.22,0.22),crossM);c2.position.set(cx,y+19.4,cz-12.2);g.add(c2);
  /* glowing windows set into the walls (visible inside AND outside) */
  const winM=new THREE.MeshBasicMaterial({color:0x9fd8ff});
  for(const dz of[-6,-2,2,6]){
    const w1=new THREE.Mesh(new THREE.BoxGeometry(0.5,2.6,1.1),winM);
    w1.position.set(cx-5,y+4,cz+dz);g.add(w1);
    const w2=w1.clone();w2.position.x=cx+5;g.add(w2);
  }
  /* the CAR MEET square: asphalt pad, white lines & a banner */
  const mx=CHURCH.meetX,mz=CHURCH.meetZ;
  const pad=new THREE.Mesh(new THREE.PlaneGeometry(34,26),new THREE.MeshLambertMaterial({color:0x3a3f47}));
  pad.rotation.x=-Math.PI/2;pad.position.set(mx,y+0.08,mz);pad.receiveShadow=true;g.add(pad);
  const lineM=new THREE.MeshBasicMaterial({color:0xf7f7f7});
  [-1,1].forEach(s=>{
    const l=new THREE.Mesh(new THREE.PlaneGeometry(34,0.5),lineM);
    l.rotation.x=-Math.PI/2;l.position.set(mx,y+0.1,mz+s*12.7);g.add(l);
  });
  const cv=document.createElement("canvas");cv.width=512;cv.height=96;
  const c=cv.getContext("2d");c.fillStyle="#1a1030";c.fillRect(0,0,512,96);
  c.fillStyle="#ffd75e";c.font="bold 42px Segoe UI";c.textAlign="center";
  c.fillText("\u{1F3C6} SATURDAY CAR MEET",256,62);
  const ban=new THREE.Mesh(new THREE.PlaneGeometry(18,3.4),
    new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv),side:THREE.DoubleSide}));
  ban.position.set(mx,y+5.4,mz-13.5);g.add(ban);
  [-8.4,8.4].forEach(o=>{const p2=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,5.6),poleMat);p2.position.set(mx+o,y+2.8,mz-13.5);g.add(p2);});
  /* church sign by the road */
  const cv2=document.createElement("canvas");cv2.width=512;cv2.height=96;
  const sc=cv2.getContext("2d");sc.fillStyle="#f4f1ea";sc.fillRect(0,0,512,96);
  sc.fillStyle="#333";sc.font="bold 34px Segoe UI";sc.textAlign="center";
  sc.fillText("⛪ CITY CHURCH · organ every Sunday",256,60);
  const sg=new THREE.Mesh(new THREE.PlaneGeometry(14,2.6),
    new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv2),side:THREE.DoubleSide}));
  sg.position.set(cx-4,y+2.6,cz+13.5);g.add(sg);
  [-6.4,6.4].forEach(o=>{const p2=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.14,3),poleMat);p2.position.set(cx-4+o,y+1.5,cz+13.5);g.add(p2);});
  scene.add(g);return g;
}
function buildRocketStation(i,j){
  const p=rocketPadPos(i,j),g=new THREE.Group(),y=terrainH(p.x,p.z);
  const pad=new THREE.Mesh(new THREE.CylinderGeometry(13,14,0.6,20),new THREE.MeshLambertMaterial({color:0x4a4f57}));
  pad.position.set(p.x,y+0.3,p.z);pad.receiveShadow=true;g.add(pad);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(10,0.25,8,28),new THREE.MeshBasicMaterial({color:0xffd75e}));
  ring.rotation.x=Math.PI/2;ring.position.set(p.x,y+0.65,p.z);g.add(ring);
  for(let a=0;a<8;a++){
    const th=a/8*Math.PI*2;
    const l=new THREE.Mesh(new THREE.SphereGeometry(0.3),new THREE.MeshBasicMaterial({color:0xff5c5c}));
    l.position.set(p.x+Math.cos(th)*12.6,y+0.8,p.z+Math.sin(th)*12.6);g.add(l);
  }
  const cv=document.createElement("canvas");cv.width=512;cv.height=128;
  const c=cv.getContext("2d");c.fillStyle="#1a1030";c.fillRect(0,0,512,128);
  c.fillStyle="#ffb02e";c.font="bold 52px Segoe UI";c.textAlign="center";
  c.fillText("\u{1F680} ROCKET STATION",256,84);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(16,4),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv),side:THREE.DoubleSide}));
  sign.position.set(p.x,y+5.5,p.z-15);g.add(sign);
  [-6,6].forEach(o=>{const pl=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,5.6),poleMat);pl.position.set(p.x+o,y+2.8,p.z-15);g.add(pl);});
  /* off Earth: a few space buggies parked at every rocket station (F = drive) */
  if(S.world!=="earth"&&parkedCarBuilder){
    for(let i=0;i<3;i++){
      const mc=parkedCarBuilder([0xc9cfd8,0xff7f11,0x3fd0ff][i]);
      const mx=p.x+18+i*6,mz=p.z+10;
      mc.position.set(mx,terrainH(mx,mz),mz);mc.rotation.y=Math.PI/2;g.add(mc);
      moonCars.push({g:mc,x:mx,z:mz});
    }
  }
  /* 🛰 SPACE STATION: a glowing dome base next to every off-Earth rocket station */
  if(S.world!=="earth"&&S.world!=="mc"){
    const P=curPlanet()||PLANETS.moon;
    const sx=p.x-26,sz=p.z-8,sy2=terrainH(sx,sz);
    const dome=new THREE.Mesh(new THREE.SphereGeometry(7,16,10,0,Math.PI*2,0,Math.PI/2),
      new THREE.MeshPhongMaterial({color:0xd8e2ec,transparent:true,opacity:0.55,shininess:90}));
    dome.position.set(sx,sy2,sz);g.add(dome);
    const base=new THREE.Mesh(new THREE.CylinderGeometry(7.4,7.8,0.8,16),new THREE.MeshLambertMaterial({color:0x5d6470}));
    base.position.set(sx,sy2+0.4,sz);g.add(base);
    /* solar wings + a blinking antenna in the planet's color */
    [[-9],[9]].forEach(o=>{
      const sw=new THREE.Mesh(new THREE.BoxGeometry(5,0.14,3),new THREE.MeshPhongMaterial({color:0x1a3a6e,shininess:120}));
      sw.position.set(sx+o[0],sy2+2,sz);g.add(sw);
    });
    const ant=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,4),poleMat);ant.position.set(sx,sy2+8.6,sz);g.add(ant);
    const blip=new THREE.Mesh(new THREE.SphereGeometry(0.3,8,8),new THREE.MeshBasicMaterial({color:P.alien}));
    blip.position.set(sx,sy2+10.8,sz);g.add(blip);
    const sign=bigSign("\u{1F6F0} "+P.name.toUpperCase()+" STATION","#0a0f1e","#9fd8ff",14);
    sign.position.set(sx,sy2+6,sz+8);g.add(sign);
    SPST.push({g,x:sx,z:sz,planet:S.world});
  }
  scene.add(g);return g;
}
/* ---- stunt ramps park: real drivable ramps + a race start flag ---- */
const raceFlags=[];
let _stuntSign=null,_raceSign=null;
function stuntSignMat(){
  if(_stuntSign)return _stuntSign;
  const cv=document.createElement("canvas");cv.width=512;cv.height=128;
  const c=cv.getContext("2d");c.fillStyle="#1a1030";c.fillRect(0,0,512,128);
  c.fillStyle="#e67e22";c.font="bold 60px Segoe UI";c.textAlign="center";c.fillText("\u{1F3A2} STUNT PARK",256,84);
  _stuntSign=keep(new THREE.MeshBasicMaterial({map:keep(new THREE.CanvasTexture(cv)),side:THREE.DoubleSide}));
  return _stuntSign;
}
function raceSignMat(){
  if(_raceSign)return _raceSign;
  const cv=document.createElement("canvas");cv.width=256;cv.height=128;
  const c=cv.getContext("2d");
  for(let y=0;y<4;y++)for(let x=0;x<8;x++){c.fillStyle=(x+y)%2?"#111":"#fff";c.fillRect(x*32,y*16,32,16);}
  c.fillStyle="#d7263d";c.fillRect(0,64,256,64);
  c.fillStyle="#fff";c.font="bold 30px Segoe UI";c.textAlign="center";
  c.fillText("RACE START",128,104);
  _raceSign=keep(new THREE.MeshBasicMaterial({map:keep(new THREE.CanvasTexture(cv)),side:THREE.DoubleSide}));
  return _raceSign;
}
function buildStuntPark(i,j){
  const p=stuntPos(i,j),g=new THREE.Group(),y=terrainH(p.x,p.z);
  const pad=new THREE.Mesh(new THREE.PlaneGeometry(92,92),new THREE.MeshLambertMaterial({color:0x464b53}));
  pad.rotation.x=-Math.PI/2;pad.position.set(p.x,y+0.1,p.z);pad.receiveShadow=true;g.add(pad);
  const rampM=new THREE.MeshLambertMaterial({color:0xe67e22});
  /* three launch ramps — drive in from the sign side (north) heading SOUTH,
     up the slope, and fly off the high end — small, medium, MEGA */
  [[-24,3.2],[0,5],[24,7.5]].forEach(([dx,h])=>{
    const len=17,zHigh=p.z+8,zLow=p.z+8+len;   // low end faces the entrance
    const ang=Math.atan2(h,len);
    const rmp=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(6.5,0.4,Math.hypot(h,len)),rampM));
    rmp.position.set(p.x+dx,y+h/2,(zHigh+zLow)/2);rmp.rotation.x=ang;g.add(rmp);
    decks.push({g,x:p.x+dx,z:p.z,hw:0.1,hd:0.1,tops:[],ramp:{x:p.x+dx,z0:zHigh,z1:zLow,y0:y+h,y1:y+0.1}});
    /* side rails so you can see the ramp from far away */
    [[-3.4],[3.4]].forEach(o=>{const rl=new THREE.Mesh(new THREE.BoxGeometry(0.25,0.7,len),new THREE.MeshLambertMaterial({color:0xf4d35e}));
      rl.position.set(p.x+dx+o[0],y+h/2+0.5,(zHigh+zLow)/2);rl.rotation.x=ang;g.add(rl);});
  });
  /* a big ring to fly through — AFTER the MEGA ramp's launch edge */
  const ring=new THREE.Mesh(new THREE.TorusGeometry(5,0.5,8,24),new THREE.MeshLambertMaterial({color:0xffd75e}));
  ring.position.set(p.x+24,y+8.5,p.z-4);g.add(ring);
  /* containers to jump over — after the medium ramp */
  for(let k=0;k<3;k++){
    const ct=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(6,2.6,2.4),new THREE.MeshLambertMaterial({color:COLORS[k*3%COLORS.length]})));
    ct.position.set(p.x,y+1.3,p.z-2-k*3);g.add(ct);
  }
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(22,5.5),stuntSignMat());
  sign.position.set(p.x,y+7,p.z+42);g.add(sign);
  [-9,9].forEach(o=>{const pl=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.22,7),poleMat);pl.position.set(p.x+o,y+3.5,p.z+42);g.add(pl);});
  /* race start flag: press T here to race! */
  const fx=p.x+38,fz=p.z+34;
  const fp=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,5),poleMat);fp.position.set(fx,y+2.5,fz);g.add(fp);
  const fs=new THREE.Mesh(new THREE.PlaneGeometry(4,2),raceSignMat());fs.position.set(fx+2,y+4,fz);g.add(fs);
  raceFlags.push({g,x:fx,z:fz});
  scene.add(g);return g;
}
/* ================= NEW CITY PLACES: race track, fun district, stations & more ================= */
const ENT=[];     // cinema / arcade / casino spots (press T)
const CIVIC=[];   // police & fire stations (press T)
const SPST=[];    // space stations on the Moon & planets (press T)
const PORTALS=[]; // time-travel portals (drive through!)
function bigSign(text,bg,fg,w){
  const cv=document.createElement("canvas");cv.width=512;cv.height=128;
  const c=cv.getContext("2d");c.fillStyle=bg;c.fillRect(0,0,512,128);
  c.fillStyle=fg;c.font="bold 46px Segoe UI";c.textAlign="center";c.fillText(text,256,82);
  return new THREE.Mesh(new THREE.PlaneGeometry(w||16,4),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv),side:THREE.DoubleSide}));
}
function boxPerson(col){
  const g=new THREE.Group();
  const b=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.62,0.26),new THREE.MeshLambertMaterial({color:col}));b.position.y=0.75;g.add(b);
  const h=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.3,0.28),new THREE.MeshLambertMaterial({color:0xe8b88a}));h.position.y=1.22;g.add(h);
  return g;
}
/* 🏁 RACE TRACK: a big oval with grandstands full of fans + a race start flag */
const RTSP=9600;
function raceTrackPos(i,j){return{x:i*RTSP+4800,z:j*RTSP+3400};}
function buildRaceTrack(i,j){
  const p=raceTrackPos(i,j),g=new THREE.Group(),y=terrainH(p.x,p.z);
  /* the oval: a wide flat ring you can drive on */
  const ring=new THREE.Mesh(new THREE.RingGeometry(28,44,40),new THREE.MeshLambertMaterial({color:0x2e3238,side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2;ring.position.set(p.x,y+0.15,p.z);ring.receiveShadow=true;g.add(ring);
  const inner=new THREE.Mesh(new THREE.CircleGeometry(28,32),new THREE.MeshLambertMaterial({color:0x4c8a3c}));
  inner.rotation.x=-Math.PI/2;inner.position.set(p.x,y+0.12,p.z);g.add(inner);
  /* start/finish line */
  const sf=new THREE.Mesh(new THREE.PlaneGeometry(16,3),new THREE.MeshBasicMaterial({color:0xffffff}));
  sf.rotation.x=-Math.PI/2;sf.position.set(p.x+36,y+0.18,p.z);g.add(sf);
  /* GRANDSTAND: three tiers packed with little fans */
  const standM=new THREE.MeshLambertMaterial({color:0x3a4254});
  const r=rng(i*31+j*77+9);
  for(let t=0;t<3;t++){
    const tier=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(26,1.1,3),standM));
    tier.position.set(p.x,y+0.55+t*1.15,p.z-52-t*3);g.add(tier);
    for(let s=0;s<9;s++){
      const fan=boxPerson(COLORS[Math.floor(r()*COLORS.length)]);
      fan.position.set(p.x-12+s*3+r()*1.4,y+1.1+t*1.15,p.z-52-t*3);
      g.add(fan);
    }
  }
  const roof=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(28,0.3,10),new THREE.MeshLambertMaterial({color:0xd7263d})));
  roof.position.set(p.x,y+6.4,p.z-55);g.add(roof);
  [[-13],[13]].forEach(o=>{const pl=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,6),poleMat);pl.position.set(p.x+o[0],y+3.2,p.z-55);g.add(pl);});
  const sign=bigSign("\u{1F3C1} CAR CITY SPEEDWAY","#141821","#ffd75e",22);
  sign.position.set(p.x,y+8.6,p.z-55);g.add(sign);
  /* a real race flag: press T here to start a (multiplayer) race on the spot */
  const fx=p.x+38,fz=p.z+6;
  const fp=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,5),poleMat);fp.position.set(fx,y+2.5,fz);g.add(fp);
  const fs=new THREE.Mesh(new THREE.PlaneGeometry(4,2),raceSignMat());fs.position.set(fx+2,y+4,fz);g.add(fs);
  raceFlags.push({g,x:fx,z:fz});
  scene.add(g);return g;
}
/* 🎬 ENTERTAINMENT DISTRICT: cinema, arcade & casino side by side */
const ENSP=6000;
function entPos(i,j){return{x:i*ENSP+2000,z:j*ENSP+4200};}
function buildEnt(i,j){
  const p=entPos(i,j),g=new THREE.Group(),y=terrainH(p.x,p.z);
  const defs=[
    ["cinema","\u{1F3AC} MEGA CINEMA","#141821","#7fd0ff",0x1e2a3a],
    ["arcade","\u{1F579} ARCADE","#2a0e3a","#ff5d8f",0x3a1650],
    ["casino","\u{1F3B0} LUCKY CASINO","#2e1c05","#ffd700",0x4a3208]
  ];
  defs.forEach((d,k)=>{
    const bx=p.x+(k-1)*24,bz=p.z;
    const bld=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(18,10,14),new THREE.MeshLambertMaterial({color:d[4]})));
    bld.position.set(bx,y+5,bz);g.add(bld);
    const sign=bigSign(d[1],d[2],d[3],16);
    sign.position.set(bx,y+11.6,bz+7.2);g.add(sign);
    const door=new THREE.Mesh(new THREE.BoxGeometry(3.4,3.4,0.2),new THREE.MeshLambertMaterial({color:0x10131a}));
    door.position.set(bx,y+1.7,bz+7.05);g.add(door);
    /* neon strip lights */
    const neon=new THREE.Mesh(new THREE.BoxGeometry(18.2,0.3,0.3),new THREE.MeshBasicMaterial({color:d[3]}));
    neon.position.set(bx,y+10.1,bz+7.1);g.add(neon);
    ENT.push({kind:d[0],x:bx,z:bz+8,g});
  });
  scene.add(g);return g;
}
/* 👮🚒 POLICE & FIRE STATION — the emergency block */
const CVSP2=4800;
function civicPos(i,j){return{x:i*CVSP2+3700,z:j*CVSP2+1300};}
function buildCivic(i,j){
  const p=civicPos(i,j),g=new THREE.Group(),y=terrainH(p.x,p.z);
  [["police","\u{1F46E} POLICE STATION","#0a1a3a","#7fb8ff",0x22406e,0x3fd0ff],
   ["fire","\u{1F692} FIRE STATION","#3a0a0a","#ff9b8a",0x8a1c14,0xff5c5c]].forEach((d,k)=>{
    const bx=p.x+(k*2-1)*14,bz=p.z;
    const bld=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(16,7,12),new THREE.MeshLambertMaterial({color:d[3]})));
    bld.position.set(bx,y+3.5,bz);g.add(bld);
    const sign=bigSign(d[1],d[2] ,"#ffffff",15);
    sign.position.set(bx,y+8.4,bz+6.2);g.add(sign);
    const garage=new THREE.Mesh(new THREE.BoxGeometry(6,4,0.2),new THREE.MeshLambertMaterial({color:0x2a2f3a}));
    garage.position.set(bx,y+2,bz+6.05);g.add(garage);
    const light=new THREE.Mesh(new THREE.SphereGeometry(0.35,8,8),new THREE.MeshBasicMaterial({color:d[4]}));
    light.position.set(bx,y+7.4,bz+6.1);g.add(light);
    CIVIC.push({kind:d[0],x:bx,z:bz+7.5,g});
    /* a parked emergency vehicle out front */
    const veh=buildEmergencyMesh?buildEmergencyMesh(d[0]==="police"?"police":"fire"):null;
    if(veh){veh.position.set(bx+5,y,bz+10);veh.rotation.y=Math.PI/2;g.add(veh);}
  });
  scene.add(g);return g;
}
/* 🏜 OFF-ROAD PARK: dirt ramps, bumps & flags out in the wild (desert & hills) */
const ORSP=5200;
function offroadPos(i,j){
  const x=i*ORSP+900,z=j*ORSP+2600;
  /* only out in rough country — never in the city center */
  if(Math.abs(x)<600&&Math.abs(z)<600)return null;
  return{x,z};
}
function buildOffroad(i,j){
  const p=offroadPos(i,j),g=new THREE.Group();
  if(!p){scene.add(g);return g;}
  const y=terrainH(p.x,p.z);
  const dirtM=new THREE.MeshLambertMaterial({color:0x8a6b42});
  const pad=new THREE.Mesh(new THREE.CircleGeometry(46,26),dirtM);
  pad.rotation.x=-Math.PI/2;pad.position.set(p.x,y+0.1,p.z);pad.receiveShadow=true;g.add(pad);
  const r=rng(i*17+j*59+3);
  /* dirt ramps you can actually jump (registered as drivable ramps) */
  for(let k=0;k<3;k++){
    const a=k/3*Math.PI*2+0.5,d=20+k*7;
    const rx=p.x+Math.sin(a)*d,rz=p.z+Math.cos(a)*d,h=2.6+k*1.6,len=13;
    const rmp=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(6,0.4,Math.hypot(h,len)),dirtM));
    rmp.position.set(rx,y+h/2,rz+len/2);rmp.rotation.x=Math.atan2(h,len);g.add(rmp);
    decks.push({g,x:rx,z:rz,hw:0.1,hd:0.1,tops:[],ramp:{x:rx,z0:rz,z1:rz+len,y0:y+h,y1:y+0.1}});
  }
  /* whoop bumps */
  for(let k=0;k<8;k++){
    const bx=p.x+(r()-0.5)*70,bz=p.z+(r()-0.5)*70;
    const bump=new THREE.Mesh(new THREE.SphereGeometry(2.2,10,8,0,Math.PI*2,0,Math.PI/2),dirtM);
    bump.scale.y=0.35;bump.position.set(bx,y+0.1,bz);g.add(bump);
  }
  for(let k=0;k<6;k++){
    const a=k/6*Math.PI*2;
    const fl=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.6),new THREE.MeshBasicMaterial({color:0xff7f11,side:THREE.DoubleSide}));
    fl.position.set(p.x+Math.sin(a)*46,y+2,p.z+Math.cos(a)*46);g.add(fl);
    const po=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,2.4),poleMat);
    po.position.set(p.x+Math.sin(a)*46,y+1.2,p.z+Math.cos(a)*46);g.add(po);
  }
  const sign=bigSign("\u{1F3DC} OFF-ROAD PARK","#3a2a10","#ffd75e",18);
  sign.position.set(p.x,y+6,p.z-48);g.add(sign);
  [[-8],[8]].forEach(o=>{const pl=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.18,5),poleMat);pl.position.set(p.x+o[0],y+2.5,p.z-48);g.add(pl);});
  scene.add(g);return g;
}
/* 🏭 INDUSTRIAL ZONE: warehouses, chimneys & container stacks */
const INSP=8000;
function induPos(i,j){return{x:i*INSP+5200,z:j*INSP+700};}
function buildIndu(i,j){
  const p=induPos(i,j),g=new THREE.Group(),y=terrainH(p.x,p.z);
  const r=rng(i*13+j*29+21);
  for(let k=0;k<3;k++){
    const wx=p.x+(k-1)*26,wz=p.z;
    const wh=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(20,8,14),new THREE.MeshLambertMaterial({color:[0x8a8f96,0x6e7680,0x9aa0a8][k]})));
    wh.position.set(wx,y+4,wz);g.add(wh);
    const roof2=new THREE.Mesh(new THREE.CylinderGeometry(7,7,20,3,1,false,0,Math.PI),new THREE.MeshLambertMaterial({color:0x4a4f57}));
    roof2.rotation.z=Math.PI/2;roof2.position.set(wx,y+8,wz);g.add(roof2);
  }
  const chim=new THREE.Mesh(new THREE.CylinderGeometry(1.4,2,18,10),new THREE.MeshLambertMaterial({color:0xb0483a}));
  chim.position.set(p.x+30,y+9,p.z-10);g.add(chim);
  for(let k=0;k<8;k++){
    const cx2=p.x-30+r()*24,cz2=p.z+14+r()*8;
    const ct=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(6,2.5,2.4),new THREE.MeshLambertMaterial({color:COLORS[Math.floor(r()*COLORS.length)]})));
    ct.position.set(cx2,y+1.25+(k%2)*2.5,cz2);g.add(ct);
  }
  const sign=bigSign("\u{1F3ED} CAR CITY INDUSTRIAL","#1a1e26","#9aa0a8",20);
  sign.position.set(p.x,y+10.5,p.z+9);g.add(sign);
  scene.add(g);return g;
}
/* 🕰 TIME PORTALS: glowing rings on the road — drive through to change ERA! */
const TPSP=7680;
function portalPos(i,j){return{x:i*TPSP+30,z:j*TPSP+2430};}
function buildPortal(i,j){
  const p=portalPos(i,j),g=new THREE.Group(),y=terrainH(p.x,p.z);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(6,0.5,10,32),
    new THREE.MeshBasicMaterial({color:0x9b5de5}));
  ring.position.set(p.x,y+6,p.z);g.add(ring);
  const glow=new THREE.Mesh(new THREE.CircleGeometry(5.4,24),
    new THREE.MeshBasicMaterial({color:0x6d28d9,transparent:true,opacity:0.3,side:THREE.DoubleSide}));
  glow.position.set(p.x,y+6,p.z);g.add(glow);
  const sign=bigSign("\u{1F570} TIME PORTAL — drive through!","#1c0a33","#d8b4fe",16);
  sign.position.set(p.x,y+11,p.z);g.add(sign);
  g.userData.ring=ring;g.userData.glow=glow;
  PORTALS.push({g,x:p.x,z:p.z,y:y});
  scene.add(g);return g;
}
function updateLandmarks(px,pz){
  const need=new Set();
  /* build at most ONE new landmark per frame — this runs every frame, so a
     new area fills in within a few frames without a single big hitch */
  let built=0;
  /* rocket stations exist on Earth, the Moon and all planets — not in Minecraft */
  if(S.world!=="mc"){
    const ri=Math.round((px-2400)/RCELL),rj=Math.round((pz-2400)/RCELL);
    for(let i=ri-1;i<=ri+1;i++)for(let j=rj-1;j<=rj+1;j++){
      const k=lmKey("rkt",i,j);need.add(k);
      if(!landmarks.has(k)&&built<1){landmarks.set(k,buildRocketStation(i,j));built++;}
    }
  }
  if(S.world==="earth"){
  const i0=Math.round(px/ACELL),j0=Math.round(pz/ACELL);
  for(let i=i0-1;i<=i0+1;i++)for(let j=j0-1;j<=j0+1;j++){
    const k=lmKey("air",i,j);need.add(k);
    if(!landmarks.has(k)&&built<1){landmarks.set(k,buildAirport(i,j));built++;}
  }
  const rk=railKNear(px),sj=Math.round((pz-STZ)/SCELL);
  for(let k=rk-1;k<=rk+1;k++)for(let j=sj-1;j<=sj+1;j++){
    const kk=lmKey("sta",k,j);need.add(kk);
    if(!landmarks.has(kk)&&built<1){landmarks.set(kk,buildStation(k,j));built++;}
  }
  if(Math.hypot(px+340,pz-260)<700){const k="zoo:0,0";need.add(k);
    if(!landmarks.has(k)&&built<1){landmarks.set(k,buildZoo());built++;}}
  if(Math.hypot(px-450,pz-330)<700){const k="church:0,0";need.add(k);
    if(!landmarks.has(k)&&built<1){landmarks.set(k,buildChurch());built++;}}
  /* stunt parks every ~3.6 km */
  const spi=Math.round((px-1800)/3600),spj=Math.round((pz-600)/3600);
  for(let i=spi-1;i<=spi+1;i++)for(let j=spj-1;j<=spj+1;j++){
    const k=lmKey("stunt",i,j);need.add(k);
    if(!landmarks.has(k)&&built<1){landmarks.set(k,buildStuntPark(i,j));built++;}
  }
  /* the new city places */
  const lmDefs=[["rtrk",RTSP,4800,3400,buildRaceTrack],["ent",ENSP,2000,4200,buildEnt],
    ["civ",CVSP2,3700,1300,buildCivic],["offr",ORSP,900,2600,buildOffroad],
    ["indu",INSP,5200,700,buildIndu],["port",TPSP,30,2430,buildPortal]];
  for(const[tag,cell,ox2,oz2,fn]of lmDefs){
    const ci=Math.round((px-ox2)/cell),cj=Math.round((pz-oz2)/cell);
    for(let i=ci-1;i<=ci+1;i++)for(let j=cj-1;j<=cj+1;j++){
      const k=lmKey(tag,i,j);need.add(k);
      if(!landmarks.has(k)&&built<1){landmarks.set(k,fn(i,j));built++;}
    }
  }
  }
  for(const[k,g]of landmarks){
    if(!need.has(k)){scene.remove(g);disposeGroup(g);landmarks.delete(k);}
  }
}
/* downtown static (built once, hidden while you're on the moon) */
const earthStatic=new THREE.Group();scene.add(earthStatic);
function playground(cx,cz){
  const pad=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.MeshLambertMaterial({color:0xd9b38c}));
  pad.rotation.x=-Math.PI/2;pad.position.set(cx,0.06,cz);pad.receiveShadow=true;earthStatic.add(pad);
  const tower=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(3,4,3),new THREE.MeshLambertMaterial({color:0xef476f})));
  tower.position.set(cx-8,2,cz-6);earthStatic.add(tower);
  const slide=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(2,0.3,9),new THREE.MeshLambertMaterial({color:0xffd166})));
  slide.position.set(cx-8,2.1,cz-0.5);slide.rotation.x=0.5;earthStatic.add(slide);
  const barM=new THREE.MeshLambertMaterial({color:0x118ab2});
  const bar=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(9,0.3,0.3),barM));bar.position.set(cx+7,3.6,cz-6);earthStatic.add(bar);
  [-4,4].forEach(o=>{const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,3.7),barM);leg.position.set(cx+7+o,1.85,cz-6);earthStatic.add(leg);});
  [-2,0,2].forEach(o=>{const seat=new THREE.Mesh(new THREE.BoxGeometry(1,0.15,0.4),new THREE.MeshLambertMaterial({color:0x06d6a0}));seat.position.set(cx+7+o,0.9,cz-6);earthStatic.add(seat);});
  const sand=new THREE.Mesh(new THREE.CylinderGeometry(4,4,0.4,16),new THREE.MeshLambertMaterial({color:0xf5e6b3}));
  sand.position.set(cx-6,0.2,cz+9);earthStatic.add(sand);
}
{
  const rand=rng(7),blocks=[-120,-60,0,60,120];
  for(const bx of blocks)for(const bz of blocks){
    if(bx===0&&bz===0)continue;
    if(bx===60&&bz===60)continue;
    const n=bz<0?1+Math.floor(rand()*2):2+Math.floor(rand()*2);
    for(let i=0;i<n;i++){
      const x=bx-15+rand()*30,z=bz-15+rand()*30;
      if(onAnyRoad(x,z))continue;
      bz<0?apartment(x,z,rand,earthStatic,0):house(x,z,rand,earthStatic,0);
    }
    if(rand()<.7)makeTree(bx+(rand()*30-15),bz+(rand()*30-15),0.8+rand()*0.6,earthStatic,0);
  }
  playground(60,60);
  for(let i=0;i<7;i++){const a=i/7*Math.PI*2;makeTree(Math.cos(a)*14,Math.sin(a)*14,2.4+rand()*0.9,earthStatic,0);}
  makeTree(0,0,3.4,earthStatic,0);
  /* the DOWNTOWN SKYLINE: real tall towers with antennas & warning lights */
  [[-105,-105,64],[105,-105,82],[-105,105,58],[105,107,74],[-63,-118,90],[-118,63,52],[118,63,68]].forEach((t,i)=>{
    const[tx,tz,th]=t;
    if(onAnyRoad(tx,tz))return;
    const tw=shadowBox(new THREE.Mesh(new THREE.BoxGeometry(16,th,14),new THREE.MeshLambertMaterial({map:winTexes[i%4]})));
    tw.position.set(tx,th/2,tz);earthStatic.add(tw);
    const cap=new THREE.Mesh(new THREE.BoxGeometry(10,2,9),new THREE.MeshLambertMaterial({color:0x3d444d}));
    cap.position.set(tx,th+1,tz);earthStatic.add(cap);
    const ant=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.16,9),poleMat);
    ant.position.set(tx,th+6.5,tz);earthStatic.add(ant);
    const bl=new THREE.Mesh(new THREE.SphereGeometry(0.32),new THREE.MeshBasicMaterial({color:0xff4444}));
    bl.position.set(tx,th+11,tz);earthStatic.add(bl);
    regBuilding(tx,tz,16,14,[tw],0);
  });
}
