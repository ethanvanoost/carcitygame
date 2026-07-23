/* ================= DATA ================= */
const GAME_V=94;   // the game version — shown in the menu & used by the auto-updater
const $=id=>document.getElementById(id);
{const vt=document.querySelector("#menu .tag");if(vt)vt.textContent+=" · v"+GAME_V;}
function rng(seed){let a=seed;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const COLORS=[0xd7263d,0x1b98e0,0xf4d35e,0x2ec4b6,0xff7f11,0x9b5de5,0xefefef,0x3a3a3a,0x8ac926,0xff5d8f,0x0f4c81,0xb56576];
const EMOJI={car:"\u{1F697}",moto:"\u{1F3CD}\uFE0F",bike:"\u{1F6B2}",camper:"\u{1F690}"};
/* campers: your home on wheels \u2014 sleep & live in them! [name, top speed, price, color]
   every camper is a REAL model from a real camper / van brand now */
const CAMPERS=[
  ["Volkswagen California Beach",110,50000,0xf2f5f7],["Volkswagen Grand California",115,70000,0xdfe4ea],
  ["Mercedes-Benz Marco Polo",120,95000,0x9aa0a8],["Hymer B-Class MasterLine",128,130000,0xeef2f7],
  ["Winnebago Revel",134,170000,0x8a8f98],["Airstream Interstate 24X",140,210000,0xc9cfd8],
  ["Concorde Liner Plus",148,255000,0xf4f7fb],["Morelo Grand Empire",155,300000,0x14161c],
  ["Volkswagen T2 Westfalia",95,45000,0x2ec4b6],["Volkswagen T3 Vanagon",100,42000,0xf4d35e],
  ["Volkswagen Caddy California",112,38000,0x1b98e0],["Ford Transit Custom Nugget",118,52000,0xff7f11],
  ["Ford Transit Trail",120,48000,0xefefef],["Fiat Ducato Roller Team",118,46000,0xf2f5f7],
  ["Citroen Type H WildCamp",90,40000,0x8ac926],["Citroen SpaceTourer Crosscamp",118,44000,0xd7263d],
  ["Toyota Alphard Campervan",125,54000,0x3a3a3a],["Toyota Hiace Camper",110,36000,0xefefef],
  ["Nissan NV350 Caravan Camp",112,38000,0x2f6bd8],["Renault Trafic SpaceNomad",115,45000,0x9b5de5],
  ["Peugeot Boxer Camperline",112,41000,0xb56576],["Opel Zafira Life Crosscamp",116,43000,0x0f4c81],
  ["Mercedes-Benz Sprinter Hymer Grand Canyon",128,88000,0x9aa4b2],["Mercedes-Benz V-Class Horizon",125,78000,0x14161a],
  ["Hymer Venture S",132,160000,0x2f3542],["Hymer Exsis-i",126,98000,0xeef2f7],
  ["Knaus BoxStar 600",120,62000,0xdfe4ea],["Knaus Sky Ti",124,84000,0xf2f5f7],
  ["Dethleffs Globebus",122,76000,0xe8ecf2],["Dethleffs Trend A",120,72000,0xf4f7fb],
  ["Adria Twin Supreme",121,58000,0xc9cfd8],["Adria Coral XL",124,82000,0xeef2f7],
  ["Burstner Lyseo TD",123,79000,0xf2f5f7],["Burstner Elegance",130,120000,0xdfe4ea],
  ["Hobby Optima OnTour",119,68000,0xefefef],["Hobby Vantana",118,60000,0xf4f7fb],
  ["Carthago Chic C-Line",132,150000,0xe8ecf2],["Carthago Liner-for-two",136,190000,0x9aa0a8],
  ["Niesmann+Bischoff Flair",138,220000,0x14161c],["Niesmann+Bischoff iSmove",130,140000,0xc9cfd8],
  ["Frankia Titan",128,135000,0xf2f5f7],["Rapido M96",126,110000,0xdfe4ea],
  ["Pilote Galaxy",124,92000,0xeef2f7],["Chausson X550",120,64000,0x8a8f98],
  ["Challenger Graphite",121,66000,0x3a3a3a],["Benimar Tessoro",119,63000,0xf4f7fb],
  ["Laika Kosmo",125,86000,0xefefef],["Laika Ecovip H",129,115000,0xe8ecf2],
  ["Rimor Evo Sound",117,56000,0xf2f5f7],["McLouis Fusion",118,59000,0xdfe4ea],
  ["Elddis Autoquest",116,55000,0xeef2f7],["Swift Kon-tiki",126,94000,0xf4f7fb],
  ["Bailey Adamo",118,61000,0xc9cfd8],["Auto-Trail Grande Frontier",127,105000,0xefefef],
  ["Winnebago Solis",122,70000,0x8ac926],["Winnebago View",128,102000,0xf2f5f7],
  ["Airstream Atlas",136,185000,0xc0c6cf],["Thor Palazzo",134,175000,0x1a1c20],
  ["Jayco Melbourne",126,96000,0xdfe4ea],["Tiffin Allegro Bay",133,168000,0x123524],
  ["Newmar King Aire",145,290000,0x14161a],["Prevost Le Mirage",150,298000,0x0f4c81],
  ["Fleetwood Discovery",131,145000,0x9aa4b2],["Coachmen Galleria",125,89000,0xeef2f7],
  ["Storyteller Overland MODE",124,85000,0x2b4a3e],["Outdoorsy Nomad One",114,47000,0xff5d8f]
];
const CAMPER_PRICE={};CAMPERS.forEach(c=>CAMPER_PRICE[c[0]]=c[2]);
/* old fantasy camper names live on in saved games \u2014 map them to the real brands */
const CAMPER_MIGRATE={"Cozy Camper":"Volkswagen California Beach","Beach Bus":"Volkswagen Grand California",
  "Family Roadhome":"Mercedes-Benz Marco Polo","Adventure Rig":"Hymer B-Class MasterLine",
  "Snow Explorer":"Winnebago Revel","Royal Cruiser":"Airstream Interstate 24X",
  "Star Voyager":"Concorde Liner Plus","MEGA MANSION RV":"Morelo Grand Empire"};
function fixVehName(n){return CAMPER_MIGRATE[n]||n;}
const CARS=[["Koenigsegg Jesko Absolut",500],["Bugatti Chiron Super Sport",490],["Hennessey Venom F5",484],["SSC Tuatara",474],["Koenigsegg Agera RS",447],["Bugatti Veyron Super Sport",431],["Rimac Nevera",412],["McLaren Speedtail",403],["Aston Martin Valkyrie",402],["Tesla Roadster",400],["Koenigsegg Gemera",400],["Pagani Huayra",383],["Lamborghini Aventador SVJ",352],["Mercedes-AMG One",352],["Ferrari LaFerrari",350],["Lamborghini Revuelto",350],["McLaren P1",350],["Ferrari Enzo",350],["Ferrari SF90 Stradale",340],["McLaren 720S",341],["Ferrari 488 Pista",340],["Ferrari F8 Tributo",340],["Aston Martin DBS Superleggera",340],["Bentley Continental GT Speed",335],["Porsche Carrera GT",334],["Audi R8 V10 Performance",331],["Porsche 911 Turbo S",330],["Dodge Challenger SRT Hellcat",327],["Lamborghini Huracan Evo",325],["Mercedes-AMG GT Black Series",325],["Lexus LFA",325],["Maserati MC20",325],["Tesla Model S Plaid",322],["Cadillac CT5-V Blackwing",322],["Lotus Evija",320],["Dodge Charger SRT",320],["Chevrolet Camaro ZL1",318],["Nissan GT-R Nismo",315],["Aston Martin Vantage",314],["Chevrolet Corvette Z06",312],["Honda NSX",307],["BMW M5 CS",305],["Audi RS6 Avant",305],["Jaguar F-Type R",300],["Ford Mustang Shelby GT500",290],["Mercedes-AMG C63 S",290],["BMW M3 Competition",290],["Lotus Emira",290],["Honda Civic Type R",272],["Volkswagen Golf R",270],["Ford Focus RS",266],["Kia EV6 GT",260],["Renault Megane RS Trophy",260],["Porsche Taycan Turbo S",260],["Subaru WRX STI",255],["Toyota GR Supra",250],["Alpine A110",250],["Hyundai i30 N",250],["Mini John Cooper Works",246],["Mazda MX-5",219],
["Bugatti Tourbillon",445],["Koenigsegg Regera",410],["Bugatti Bolide",380],["Gordon Murray T.50",360],
["Pagani Utopia",350],["Ford GT",348],["Porsche 918 Spyder",345],["Ferrari 812 Superfast",340],
["Lucid Air Sapphire",330],["McLaren 765LT",330],["McLaren Artura",330],["Aston Martin DB12",325],
["Zenvo TSR-S",325],["Ferrari F40",324],["Jaguar XE SV Project 8",322],["Ferrari Roma",320],
["Porsche Panamera Turbo S",315],["Mercedes-AMG SL63",315],["Porsche Cayman GT4 RS",315],
["Ferrari Purosangue",310],["BMW M4 CSL",307],["Alfa Romeo Giulia QV",307],["Lamborghini Urus Performante",306],
["Maserati GranTurismo Trofeo",302],["Chevrolet Corvette Stingray",296],["Lamborghini Countach",295],
["Audi RS3",290],["Dodge Viper ACR",285],["Acura Integra Type S",272],["Hyundai Ioniq 5 N",260],
["Toyota GR Corolla",258],["Nissan 350Z",250],["Mazda RX-7",250],["BMW M2",250],
["Volkswagen Golf GTI",250],["Skoda Octavia RS",250],["Volvo V60 Polestar",250],["Rolls-Royce Wraith",250],
["Peugeot 508 PSE",250],["Seat Leon Cupra",250],["Audi e-tron GT",245],["Mitsubishi Lancer Evo X",242],
["Lotus Elise",240],["Honda S2000",240],["Mercedes-AMG G63",240],["Renault Clio RS",235],
["Opel Corsa OPC",230],["Subaru BRZ",226],["BMW i4 M50",225],["Fiat 500 Abarth",225],["Toyota AE86",195]];
const MOTOS=[["Kawasaki Ninja H2R",400],["Kawasaki Ninja H2",337],["Suzuki Hayabusa",312],["Aprilia RSV4 Factory",305],["BMW S1000RR",303],["MV Agusta F4",302],["Ducati Panigale V4 R",299],["Honda CBR1000RR-R Fireblade",299],["Yamaha YZF-R1",299],["Suzuki GSX-R1000",299],["Kawasaki ZX-10R",299],["Ducati Streetfighter V4",290],["KTM 1290 Super Duke R",289],["Aprilia Tuono V4",270],["Triumph Speed Triple RS",260],["Ducati Monster",250],["Triumph Rocket 3",250],["Yamaha MT-09",230],["Yamaha YZF-R7",222],["BMW R1250GS",219],["Honda Africa Twin",214],["Harley-Davidson Sportster S",190],["Honda Gold Wing",180],["Harley-Davidson Fat Boy",180],["KTM 390 Duke",167],
["BMW M1000RR",314],["Ducati Superleggera V4",300],["MV Agusta Brutale 1000 RR",300],
["Kawasaki ZX-6R",262],["Ducati Diavel V4",270],["Yamaha YZF-R6",262],["Triumph Daytona 675",258],
["Aprilia RS660",230],["Honda CBR600RR",257],["Suzuki GSX-8S",210],["Kawasaki Z900",240],
["Yamaha MT-10",250],["KTM 890 Duke R",235],["Ducati Multistrada V4",250],["BMW K1600GT",250],
["Ducati Monster SP",240],["Triumph Street Triple RS",240],["MV Agusta Dragster 800",245],
["Honda CB1000R",238],["Kawasaki Versys 1000",220],["Suzuki V-Strom 1050",195],["Suzuki Katana",240],
["BMW F900R",215],["BMW R nineT",200],["Yamaha MT-07",193],["Yamaha XSR900",230],
["Yamaha Tenere 700",180],["Honda Africa Twin Adventure Sports",214],["Honda CB650R",225],
["Kawasaki Z650",192],["Kawasaki Ninja 650",211],["Kawasaki W800",170],["Suzuki SV650",200],
["KTM 1290 Super Adventure",220],["KTM RC390",179],["Triumph Bonneville T120",185],
["Triumph Tiger 900",200],["Harley-Davidson Road Glide",180],["Harley-Davidson Street Glide",175],
["Harley-Davidson Iron 883",160],["Harley-Davidson Pan America",220],["Aprilia Tuareg 660",190],
["Moto Guzzi V100 Mandello",230],["Moto Guzzi V7",175],["Indian FTR 1200",190],
["Indian Chief Dark Horse",185],["Indian Scout Bobber",180],["Royal Enfield Interceptor 650",170],
["Royal Enfield Himalayan",130],["Zero SR/F",200],["Vespa GTS 300",118],["Honda Rebel 500",153]];
const BIKES=[["Trek Madone SLR 9",48],["Specialized S-Works Tarmac",47],["Pinarello Dogma F",47],["Cervelo S5",47],["Canyon Aeroad CFR",46],["Bianchi Oltre RC",46],["Cannondale SuperSix Evo",46],["Giant TCR Advanced",45],["Scott Foil RC",45],["BMC Teammachine",44],["Santa Cruz Hightower",38],["Trek Marlin 8",32],["Giant Talon 1",30],["VanMoof S5",27],["Gazelle CityGo",25],
["Colnago V4Rs",47],["Wilier Filante SLR",46],["Cervelo R5",46],["Factor Ostro VAM",46],["Ridley Noah Fast",46],
["Trek Emonda SLR",45],["Specialized S-Works Venge",46],["Pinarello Prince",44],["De Rosa Merak",44],
["Focus Izalco Max",44],["Merida Reacto Team",45],["Orbea Orca Aero",45],["Cube Litening Aero",44],
["Cannondale SystemSix",46],["Giant Propel Advanced",45],["Scott Addict RC",44],["BMC Roadmachine",43],
["Canyon Ultimate CF SLX",45],["Canyon Endurace",42],["Trek Domane SLR",43],["Specialized Roubaix",42],
["Cannondale Synapse",41],["Bianchi Infinito",41],["Wilier Cento10",43],["Look 795 Blade",44],
["Canyon Grizl",36],["Specialized Diverge",37],["Cannondale Topstone",36],["Merida Silex",35],
["Santa Cruz Nomad",34],["Santa Cruz Bronson",35],["Specialized Stumpjumper",36],["Trek Fuel EX",35],
["Giant Reign",34],["Scott Genius",35],["Cube Stereo 150",34],["Orbea Occam",35],["Canyon Spectral",35],
["YT Capra",34],["Commencal Meta AM",33],["Propain Tyee",33],["Kona Process 153",33],["Marin Rift Zone",32],
["Ghost Lector",37],["Scott Spark RC",38],["Specialized Turbo Levo",40],["Gazelle Ultimate C380",29],
["Gazelle Orange C310",26],["Cortina U4 Transport",22],["Batavus Finez",23],["VanMoof S4",26]];
/* ---- REAL-CAR LOOKS: every car gets its real body style, its real-life
   signature paint color and its signature details.
   s: hyper | super | gt | muscle | sedan | wagon | hatch | roadster | ev
   c: signature paint — stripeC: racing stripes — sideC: side stripe
   roofC: two-tone roof — hub: rim color — fin: dorsal fin — scoop: hood scoop
   wing: none | lip | gt | hyper — nose:false = smooth EV nose ---- */
const CAR_LOOKS={
"Koenigsegg Jesko Absolut":{s:"hyper",c:0xf4f7fb,wing:"none",fin:true},
"Bugatti Chiron Super Sport":{s:"hyper",c:0x14161c,sideC:0xff7f11,wing:"none"},
"Hennessey Venom F5":{s:"hyper",c:0x8a2232},
"SSC Tuatara":{s:"hyper",c:0xe8ecf2,fin:true},
"Koenigsegg Agera RS":{s:"hyper",c:0xf4f7fb,stripeC:0xff7f11},
"Bugatti Veyron Super Sport":{s:"hyper",c:0x17181d,sideC:0xff7f11,wing:"lip"},
"Rimac Nevera":{s:"hyper",c:0x2e6f62,nose:false,wing:"lip"},
"McLaren Speedtail":{s:"hyper",c:0x39485e,wing:"none"},
"Aston Martin Valkyrie":{s:"hyper",c:0x1d5c46},
"Tesla Roadster":{s:"hyper",c:0xb01f2e,nose:false,wing:"none"},
"Koenigsegg Gemera":{s:"hyper",c:0x5a1f28,wing:"none"},
"Pagani Huayra":{s:"hyper",c:0x9aa4b2,wing:"lip"},
"Lamborghini Aventador SVJ":{s:"super",c:0x3fae4a},
"Mercedes-AMG One":{s:"hyper",c:0xb8bec7,fin:true,stripeC:0x00a19b},
"Ferrari LaFerrari":{s:"super",c:0xd0202a,wing:"none"},
"Lamborghini Revuelto":{s:"super",c:0xe0742a},
"McLaren P1":{s:"super",c:0xf7c948},
"Ferrari Enzo":{s:"super",c:0xd0202a,wing:"none"},
"Ferrari SF90 Stradale":{s:"super",c:0xd0202a,wing:"none"},
"McLaren 720S":{s:"super",c:0xff8000,wing:"lip"},
"Ferrari 488 Pista":{s:"super",c:0xd0202a,stripeC:0x2456c4},
"Ferrari F8 Tributo":{s:"super",c:0xd0202a,wing:"lip"},
"Aston Martin DBS Superleggera":{s:"gt",c:0x123524},
"Bentley Continental GT Speed":{s:"gt",c:0x1e4d2b},
"Porsche Carrera GT":{s:"roadster",c:0xc9cfd8,len:4.6,wid:2.08,wing:"gt"},
"Audi R8 V10 Performance":{s:"super",c:0x6b7280,wing:"lip"},
"Porsche 911 Turbo S":{s:"gt",c:0xc9cfd8,len:4.55,wing:"lip"},
"Dodge Challenger SRT Hellcat":{s:"muscle",c:0x4b4f55},
"Lamborghini Huracan Evo":{s:"super",c:0xff8c1a,wing:"lip"},
"Mercedes-AMG GT Black Series":{s:"gt",c:0xff7f2a,wing:"gt"},
"Lexus LFA":{s:"super",c:0xf4f7fb,wing:"lip"},
"Maserati MC20":{s:"super",c:0xeef2f7,wing:"none"},
"Tesla Model S Plaid":{s:"ev",c:0xb01f2e},
"Cadillac CT5-V Blackwing":{s:"sedan",c:0x1a1c20,wing:"lip"},
"Lotus Evija":{s:"hyper",c:0xaed136,nose:false},
"Dodge Charger SRT":{s:"sedan",c:0x14161a,len:5.05,scoop:true,wing:"lip"},
"Chevrolet Camaro ZL1":{s:"muscle",c:0xf7c700,stripeC:0x17181d},
"Nissan GT-R Nismo":{s:"gt",c:0xf4f7fb,sideC:0xd7263d,wing:"gt"},
"Aston Martin Vantage":{s:"gt",c:0x9ecb3a,len:4.5},
"Chevrolet Corvette Z06":{s:"super",c:0xd0342a,wing:"lip"},
"Honda NSX":{s:"super",c:0xc42433,wing:"none"},
"BMW M5 CS":{s:"sedan",c:0x2b4a3e},
"Audi RS6 Avant":{s:"wagon",c:0x9aa0a6},
"Jaguar F-Type R":{s:"gt",c:0x1a4736,len:4.5},
"Ford Mustang Shelby GT500":{s:"muscle",c:0x1d4ed8,stripeC:0xf4f7fb},
"Mercedes-AMG C63 S":{s:"sedan",c:0xb8bec7},
"BMW M3 Competition":{s:"sedan",c:0x0e7a4f},
"Lotus Emira":{s:"super",c:0x2456a8,len:4.4,wing:"none"},
"Honda Civic Type R":{s:"hatch",c:0xf4f7fb,sideC:0xd7263d,wing:"gt"},
"Volkswagen Golf R":{s:"hatch",c:0x2b5fd9,wing:"lip"},
"Ford Focus RS":{s:"hatch",c:0x2384c4,wing:"gt"},
"Kia EV6 GT":{s:"ev",c:0x7d838c,len:4.7},
"Renault Megane RS Trophy":{s:"hatch",c:0xf7d117},
"Porsche Taycan Turbo S":{s:"ev",c:0xeef2f7,len:4.95},
"Subaru WRX STI":{s:"sedan",c:0x1a4fc4,hub:0xd4af37,wing:"gt",scoop:true},
"Toyota GR Supra":{s:"gt",c:0xc22a33,len:4.4,wing:"lip"},
"Alpine A110":{s:"super",c:0x2f7dd1,len:4.2,wing:"none"},
"Hyundai i30 N":{s:"hatch",c:0x2775b8,wing:"lip"},
"Mini John Cooper Works":{s:"hatch",c:0x1e4d2b,roofC:0xf4f7fb,len:3.9,wid:1.9,wing:"none"},
"Mazda MX-5":{s:"roadster",c:0xa32638},
"Bugatti Tourbillon":{s:"hyper",c:0x1a2a4f,sideC:0x14161c,wing:"none"},
"Koenigsegg Regera":{s:"hyper",c:0x8a2232,wing:"lip"},
"Bugatti Bolide":{s:"hyper",c:0x14161c,stripeC:0xf7d117,wing:"hyper"},
"Gordon Murray T.50":{s:"hyper",c:0xeef2f7,wing:"none"},
"Pagani Utopia":{s:"hyper",c:0x2e5f8a,wing:"lip"},
"Ford GT":{s:"super",c:0x1d4ed8,stripeC:0xf4f7fb},
"Porsche 918 Spyder":{s:"hyper",c:0xc9cfd8,sideC:0xd7263d,wing:"lip"},
"Ferrari 812 Superfast":{s:"gt",c:0xd0202a,wing:"none"},
"Lucid Air Sapphire":{s:"ev",c:0x1e3a5f,len:4.95},
"McLaren 765LT":{s:"super",c:0xff8000,wing:"gt"},
"McLaren Artura":{s:"super",c:0x2456c4,wing:"none"},
"Aston Martin DB12":{s:"gt",c:0x1d5c46},
"Zenvo TSR-S":{s:"hyper",c:0xd0342a,wing:"hyper"},
"Ferrari F40":{s:"super",c:0xd0202a,wing:"gt"},
"Jaguar XE SV Project 8":{s:"sedan",c:0x2384c4,wing:"gt"},
"Ferrari Roma":{s:"gt",c:0x39485e,wing:"none"},
"Porsche Panamera Turbo S":{s:"sedan",c:0x1a1c20,len:5.05},
"Mercedes-AMG SL63":{s:"roadster",c:0xb8bec7,len:4.6,wid:2.05},
"Porsche Cayman GT4 RS":{s:"super",c:0xf7c700,wing:"gt"},
"Ferrari Purosangue":{s:"wagon",c:0xd0202a,wing:"none"},
"BMW M4 CSL":{s:"gt",c:0x2b4a3e,stripeC:0xd7263d,wing:"lip"},
"Alfa Romeo Giulia QV":{s:"sedan",c:0x1e4d2b},
"Lamborghini Urus Performante":{s:"wagon",c:0xf7c700,wing:"none"},
"Maserati GranTurismo Trofeo":{s:"gt",c:0x123a6b},
"Chevrolet Corvette Stingray":{s:"super",c:0xd7263d,wing:"none"},
"Lamborghini Countach":{s:"super",c:0xf4f7fb,wing:"gt"},
"Audi RS3":{s:"sedan",c:0x3fae4a,len:4.5},
"Dodge Viper ACR":{s:"muscle",c:0xd0202a,stripeC:0xf4f7fb,wing:"gt"},
"Acura Integra Type S":{s:"hatch",c:0xeef2f7,wing:"lip"},
"Hyundai Ioniq 5 N":{s:"ev",c:0x9ecb3a,len:4.65},
"Toyota GR Corolla":{s:"hatch",c:0xf4f7fb,sideC:0xd7263d,wing:"lip"},
"Nissan 350Z":{s:"gt",c:0xff7f11,len:4.35,wing:"lip"},
"Mazda RX-7":{s:"gt",c:0xf7d117,len:4.3,wing:"gt"},
"BMW M2":{s:"gt",c:0x2775b8,len:4.5,wing:"lip"},
"Volkswagen Golf GTI":{s:"hatch",c:0xd7263d,sideC:0x14161a,wing:"none"},
"Skoda Octavia RS":{s:"wagon",c:0x3fae4a},
"Volvo V60 Polestar":{s:"wagon",c:0x2f7dd1,hub:0xd4af37},
"Rolls-Royce Wraith":{s:"gt",c:0x14161a,roofC:0xeef2f7,len:5.1,wing:"none"},
"Peugeot 508 PSE":{s:"sedan",c:0x2b5fd9},
"Seat Leon Cupra":{s:"hatch",c:0xb8862c,wing:"lip"},
"Audi e-tron GT":{s:"ev",c:0x7d838c,len:4.95},
"Mitsubishi Lancer Evo X":{s:"sedan",c:0xd0202a,scoop:true,wing:"gt"},
"Lotus Elise":{s:"roadster",c:0x8ac926,len:3.85,wid:1.85},
"Honda S2000":{s:"roadster",c:0xf4f7fb,len:4.15},
"Mercedes-AMG G63":{s:"wagon",c:0x14161a,len:4.7,wing:"none"},
"Renault Clio RS":{s:"hatch",c:0xf7d117,len:4.05,wing:"none"},
"Opel Corsa OPC":{s:"hatch",c:0x2f6bd8,len:4.05,wing:"lip"},
"Subaru BRZ":{s:"gt",c:0x1a4fc4,len:4.25,wing:"lip"},
"BMW i4 M50":{s:"ev",c:0x39485e,len:4.8},
"Fiat 500 Abarth":{s:"hatch",c:0xefefef,sideC:0xd7263d,len:3.65,wid:1.75,wing:"none"},
"Toyota AE86":{s:"hatch",c:0xf4f7fb,sideC:0x14161a,len:4.2,wing:"lip"}
};
/* real brand colors for motorcycles & bicycles (Kawasaki green, KTM orange...) */
const BRAND_COLORS=[["Kawasaki",0x33b04a],["Ducati",0xd7263d],["Yamaha",0x2456c4],
 ["Suzuki",0x2f6bd8],["BMW",0xeef2f7],["Honda",0xd0202a],["Aprilia",0x17181d],
 ["KTM",0xff7f11],["Harley",0x14161a],["MV Agusta",0xc22a33],["Triumph",0x2f3542],
 ["Trek",0xc22a33],["Specialized",0x17181d],["Pinarello",0x101216],["Cervelo",0xd7263d],
 ["Canyon",0x8a8f98],["Bianchi",0x2ec4b6],["Cannondale",0x2ec46a],["Giant",0x2456c4],
 ["Scott",0xf4d35e],["BMC",0xd7263d],["Santa Cruz",0x2ec4b6],["VanMoof",0x3a3a3a],["Gazelle",0xd7263d],
 ["Moto Guzzi",0x2f7a3c],["Indian",0x8a2232],["Royal Enfield",0x1e4d2b],["Zero",0x17181d],["Vespa",0x9fd8ff],
 ["Colnago",0xd7263d],["Wilier",0xc22a33],["Factor",0x14161a],["Ridley",0x2456c4],["De Rosa",0x1e3a5f],
 ["Focus",0xefefef],["Merida",0x2ec46a],["Orbea",0xff7f11],["Cube",0x2f6bd8],["Look",0xf4d35e],
 ["YT",0x17181d],["Commencal",0x8a8f98],["Propain",0x9b5de5],["Kona",0x0f4c81],["Marin",0x2ec4b6],
 ["Ghost",0x14161a],["Cortina",0xb56576],["Batavus",0x2b4a3e]];
function brandColor(n){for(const[b,c]of BRAND_COLORS)if(n.startsWith(b))return c;return null;}
const VEHICLES=[];
{const r=rng(5);
 CARS.forEach((c,i)=>VEHICLES.push({type:"car",name:c[0],top:c[1],
   color:(CAR_LOOKS[c[0]]&&CAR_LOOKS[c[0]].c!==undefined)?CAR_LOOKS[c[0]].c:(i===0?0xffb02e:COLORS[Math.floor(r()*COLORS.length)])}));
 MOTOS.forEach(c=>{const bc=brandColor(c[0]);VEHICLES.push({type:"moto",name:c[0],top:c[1],color:bc!==null?bc:COLORS[Math.floor(r()*COLORS.length)]});});
 BIKES.forEach(c=>{const bc=brandColor(c[0]);VEHICLES.push({type:"bike",name:c[0],top:c[1],color:bc!==null?bc:COLORS[Math.floor(r()*COLORS.length)]});});
 CAMPERS.forEach(c=>VEHICLES.push({type:"camper",name:c[0],top:c[1],color:c[3]!==undefined?c[3]:COLORS[Math.floor(r()*COLORS.length)]}));}
{const t=document.querySelector('#tabs .tab[data-f="all"]');if(t)t.textContent="All "+VEHICLES.length;}
const TYPE_LABEL={car:"Car",moto:"Motorcycle",bike:"Bicycle",camper:"Camper — live & sleep in it!"};
/* ---- vehicle ownership: you start with the SLOWEST of each type, the rest cost money ---- */
const DEFAULT_OWNED=["car","moto","bike","camper"].map(t=>
  VEHICLES.filter(v=>v.type===t).reduce((a,b)=>a.top<=b.top?a:b).name);
/* the old starters (Mazda MX-5 & friends) are not free anymore — strip them from saves */
const OLD_DEFAULTS=["Mazda MX-5","KTM 390 Duke","Gazelle CityGo"];
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
const CLOCK={min:8*60,day:1,skew:parseInt(localStorage.getItem("vc4skew")||"0",10)||0};
/* on a SERVER (named world) everyone shares the same clock: game time is
   derived from the real-world clock. CLOCK.skew is YOUR personal time-jump
   (in game minutes) — sleeping adds to it, so the night skips for you too. */
const SHARED_T0=1767225600000;   // 2026-01-01 — shared time starts counting here
function clockTick(dt){
  if(typeof WORLD!=="undefined"&&WORLD.name){
    /* shared clock + your sleep skew + the 👑 owner's world-time skew */
    const wt=(typeof WT!=="undefined"&&WT.skew)||0;
    const tm=(Date.now()-SHARED_T0)/200+(CLOCK.skew||0)+wt;   // 1 real second = 5 game minutes
    CLOCK.day=Math.floor(tm/1440)+1;
    CLOCK.min=((tm%1440)+1440)%1440;
    return;
  }
  CLOCK.min+=dt*300/60; if(CLOCK.min>=1440){CLOCK.min-=1440;CLOCK.day++;}
}
/* game weekdays: Day 1 is a Monday — Saturday = car meet, Sunday = church organ */
const WEEKDAYS=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
function weekday(){return WEEKDAYS[((CLOCK.day-1)%7+7)%7];}
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
/* ---- light / dark theme for the whole UI ---- */
function setTheme(t){
  document.body.classList.toggle("light",t==="light");
  $("thDark").classList.toggle("on",t!=="light");
  $("thLight").classList.toggle("on",t==="light");
  try{localStorage.setItem("vc4theme",t);}catch(e){}
}
$("thDark").onclick=()=>setTheme("dark");
$("thLight").onclick=()=>setTheme("light");
setTheme(localStorage.getItem("vc4theme")||"dark");
function toast(msg){const t=$("toast");t.textContent=msg;t.style.opacity=1;clearTimeout(t._x);t._x=setTimeout(()=>t.style.opacity=0,10000);}   // messages stay 10 s
