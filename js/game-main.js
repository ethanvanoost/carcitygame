/* Car City Game — game-main.js (part 16/16, split from the old game.js).
   Plain JS, ONE shared global scope across all scripts — the load order in index.html MUST stay: core, world, vehicles, then game-* parts in numbered order. */
/* ================= UPDATE LOG (garage &#128220; Update button) ================= */
const UPDATE_PAGES=[
{t:"Round 1 — Mobile, sea, sound, mountains, rockets & the Moon",h:`
<h4>\u{1F4F1} TABLET / MOBILE MODE</h4><ul>
<li>New <b>T &middot; CALL</b> button (calls train / bus / plane / rocket).</li>
<li>New <b>F &middot; IN/OUT</b> button (enter &amp; exit anything).</li></ul>
<h4>\u{1F30A} SEA WITH FISH</h4><ul>
<li>Big seas out in the world — never downtown, at airports or rocket pads.</li>
<li>Blue water surface that follows you + sandy sea floor.</li>
<li>Colorful fish that swim in circles and sometimes leap out of the water.</li>
<li>Roads crossing the sea become causeways just above the waves.</li></ul>
<h4>\u{1F50A} ENGINE SOUND FIXED</h4><ul>
<li>The ugly "vrm vrm" sawtooth is gone — now a deep smooth hum that follows your speed.</li></ul>
<h4>⛰️ MOUNTAINS + TUNNELS</h4><ul>
<li>Big ridged mountains are back (up to ~85 m).</li>
<li>Roads never climb over the peaks — they go through gray tunnel tubes.</li></ul>
<h4>\u{1F938} STUNTS + JUMP FIX</h4><ul>
<li>Speeding over a crest launches your car — capped, so you jump, not fly.</li>
<li>Stronger air gravity: no more hanging in the sky (car and on foot).</li></ul>
<h4>\u{1F680} ROCKETS &amp; THE MOON</h4><ul>
<li>Rocket stations every ~5 km in BOTH worlds. T calls a rocket — it flies in with fire.</li>
<li>F to board: huge smoke + fire, liftoff, world switch at 1000 m, retro-burn landing.</li>
<li>The Moon: endless yellow-gray dust, small holes, rocks, black starry sky, Earth above.</li>
<li>Astronaut suit with gold visor on the Moon. Low gravity — slow floaty jumps.</li>
<li>No vehicles on the Moon; your car stays on Earth.</li>
<li>Map buttons: \u{1F319} Go to the MOON / \u{1F30D} Back to EARTH; \u{1F680} pads on the map.</li></ul>
<h4>\u{1F3B5} BETTER MUSIC</h4><ul>
<li>8-bar C&ndash;G&ndash;Am&ndash;F progression: warm pad, soft bass, plucky arpeggio melody.</li></ul>`},
{t:"Round 2 — Louder, no water spawns, garage, McDrive, hunger",h:`
<h4>\u{1F50A} EVERYTHING LOUDER</h4><ul>
<li>Engine ~2.5&times;, music ~3&times;, horn, crash, siren and rocket rumble all turned up.</li></ul>
<h4>\u{1F30A} NOTHING SPAWNS IN WATER</h4><ul>
<li>Houses, shops, garages, containers, trees, cactuses, deer and camels all avoid the sea.</li></ul>
<h4>\u{1F17F}️ PARKING GARAGE FIXED</h4><ul>
<li>The ramp and floor are REAL surfaces — drive or walk up, drive underneath, fall off edges properly.</li></ul>
<h4>\u{1F354} McDRIVE EVERY ~500 M</h4><ul>
<li>Red building, yellow M sign, ORDER HERE board and its own little lane (never on the road).</li>
<li>Drive up &rarr; menu opens: nuggets (6/9/20), hamburger, cheeseburger, Big Mac, Coca Cola, Pepsi, apple juice, fries (S/M/L).</li>
<li>After ordering the car drives itself to the window, gets the food, and drives out — then you take over.</li></ul>
<h4>\u{1F392} FOOD BACKPACK</h4><ul>
<li>\u{1F392} Food button &rarr; pick an item &rarr; press <b>R</b> to eat (R &middot; EAT button in tablet mode).</li></ul>
<h4>\u{1F354} HUNGER BAR</h4><ul>
<li>Drains slowly: full &rarr; little hungry &rarr; hungry &rarr; STARVING!</li>
<li>Starving = 30-second countdown &rarr; you die and wake up at spawn.</li>
<li>Admin panel switch: \u{1F354} Hunger ON/OFF.</li></ul>`},
{t:"Round 3 — McDonald's on the map",h:`
<h4>\u{1F5FA}️ MAP MARKERS</h4><ul>
<li>Every McDrive shows as a red dot with a yellow <b>M</b> (zoom in a bit to see them).</li>
<li>The dots use the same rules as the world — every M on the map really exists.</li></ul>
<h4>\u{1F354} NEAREST McDRIVE BUTTON</h4><ul>
<li>New quick-travel button on the map that teleports you straight to the lane entrance of the closest McDrive.</li></ul>`},
{t:"Round 4 — Tunnel fix #1 + hotel apartments",h:`
<h4>\u{1F573}️ TUNNEL FIX #1</h4><ul>
<li>Tunnel pieces from neighbouring chunks now line up exactly — no more flickering double walls.</li>
<li>Long tunnels are built from short pieces that follow the road.</li></ul>
<h4>\u{1F3E8} APARTMENTS BECAME HOTELS</h4><ul>
<li>Walk into the ground-floor lobby through the front door.</li>
<li>Reception desk with a receptionist — press <b>T</b> to rent a room (free).</li>
<li>A bed to sleep in (skips the night + breakfast) and chairs you can really sit on (press T).</li></ul>`},
{t:"Round 5 — Tunnel fix #2, real rooms, Rented Rooms button",h:`
<h4>\u{1F573}️ TUNNEL FIX #2 (the big one)</h4><ul>
<li>Tunnels now BREAK at every road crossing — no more tunnels running through each other.</li>
<li>Curvy country roads don't get tubes anymore (those snaked through the others).</li></ul>
<h4>\u{1F6CF}️ REAL HOTEL ROOMS</h4><ul>
<li>The lobby now has ONLY the reception; bed, chairs and a table moved to a real room on the 1st floor.</li>
<li>Renting <b>teleports you up into your room</b>. You can't walk through the room walls.</li>
<li>Red EXIT mat: press T to go back down to the street.</li>
<li>Sleeping only works at night (after ~19:30).</li></ul>
<h4>\u{1F6CF} RENTED ROOMS BUTTON</h4><ul>
<li>Top-bar \u{1F6CF} Rooms button lists all your rooms and teleports you to them from anywhere.</li></ul>`},
{t:"Round 6 — Distances, destruction & rocket speed",h:`
<h4>\u{1F4CF} CALL DISTANCE</h4><ul>
<li>Calling a train / bus / plane / rocket shows how many meters away it is.</li>
<li>Live countdown in the hint bar while it comes: "\u{1F680} Rocket incoming — 312 m away".</li></ul>
<h4>\u{1F4A5} PLANES &amp; BUSES BREAK BUILDINGS</h4><ul>
<li>Drive the bus into a building &rarr; it collapses (bus bounces back).</li>
<li>Fly the plane low into a building &rarr; it collapses (plane smashes through at half speed).</li></ul>
<h4>\u{1F680} ADMIN ROCKET SPEED</h4><ul>
<li>New \u{1F680} target in the admin MAX SPEED panel — set how fast the rocket climbs (default 400 km/h).</li>
<li>The speedo's "limit" shows the rocket limit while you're aboard.</li></ul>`},
{t:"Round 7 — Minimap & routes, shop food, Squishy Dumplings, new animals",h:`
<h4>\u{1F9ED} MINIMAP + ROUTES</h4><ul>
<li>A round minimap in the bottom-left corner — the arrow is YOU and points where you're heading.</li>
<li>Click anywhere on the big map (or a quick button) and choose: ⚡ Teleport or \u{1F9ED} Route.</li>
<li>Routes are a blue line on the minimap and the big map — follow it to your destination!</li></ul>
<h4>\u{1F6D2} SHOPS SELL FOOD</h4><ul>
<li>Walk into any shop and press <b>T</b>: fruit, bread, milk, cereal, cheese, eggs and more.</li>
<li>Everything goes straight into your \u{1F392} food backpack (press R to eat).</li></ul>
<h4>\u{1F6D2} GIANT MEGA MARTS (one every ~3 km)</h4><ul>
<li>They fill a WHOLE CITY BLOCK — 100 m wide, 12 m tall, with 8 long shelf aisles.</li>
<li>Two entrances, checkout counters, roof pillars and TWO Squishy Dumpling stands.</li>
<li>Shops and MEGA MARTs now show on the map.</li></ul>
<h4>\u{1F95F} SQUISHY DUMPLINGS</h4><ul>
<li>MEGA MARTs sell Squishy Dumplings — surprise collectibles!</li>
<li>Open them in the \u{1F95F} Dumplings menu (next to \u{1F392} Food): 8 colors + RARE ✨ glitter ones.</li></ul>
<h4>\u{1F43E} MORE ANIMALS</h4><ul>
<li>Forest: deer, rabbits, foxes and bears. Plains: sheep, cows and horses. Desert: camels and rabbits.</li>
<li>The zoo got a giraffe pen.</li></ul>
<h4>\u{1F693} FASTER POLICE</h4><ul>
<li>Chasing police never drop below 150 km/h — and always go faster than you.</li></ul>
<h4>\u{1F4F7} AND MORE</h4><ul>
<li>Tablet mode: new \u{1F4F7} camera button (works like Q).</li>
<li>No more intersections or traffic lights inside tunnels and mountains.</li>
<li>The music is louder (sound effects unchanged).</li></ul>`},
{t:"Round 8 — Mansions, money, holding dumplings, your own world & more",h:`
<h4>\u{1F3F0} MEGA MANSIONS (one every ~2 km)</h4><ul>
<li>Giant houses with towers — walk in, press <b>T</b> at the reception to rent one for FREE.</li>
<li>Your mansion appears in the \u{1F6CF} Rooms menu, and on the map as a purple \u{1F3F0}.</li></ul>
<h4>\u{1F95F} HOLD &amp; DISPLAY DUMPLINGS</h4><ul>
<li>Click a dumpling in the \u{1F95F} Dumplings menu to hold it in your hands!</li>
<li>New button: display your dumplings on a table outside your mansion for everyone to see.</li></ul>
<h4>\u{1F4B0} MONEY + DUMPLING BUYERS</h4><ul>
<li>New \u{1F4B0} Money menu — don't worry, EVERYTHING is still free.</li>
<li>A dumpling buyer every ~500 m (pink dots on the map): press T to sell.</li>
<li>Quick-select: all / glitter only / normal only / by color (colors don't grab your glitters).</li>
<li>Normal $15 · Glitter $100 · Rainbow $30 · Gold $30 · Gold glitter $20 · GLITTER RAINBOW $250!</li>
<li>Reach $1,000 and your money text turns \u{1F308} RAINBOW forever!</li></ul>
<h4>\u{1F308} NEW DUMPLINGS</h4><ul>
<li>Rare RAINBOW and shiny GOLD dumplings — glitter rainbow is the rarest thing in the game.</li></ul>
<h4>\u{1F30D} CREATE YOUR OWN WORLD</h4><ul>
<li>Type a name in the garage and press Create — every name is its own world, far far away.</li></ul>
<h4>\u{1F4BE} YOUR PROGRESS IS SAVED</h4><ul>
<li>Money, dumplings, rooms, displays and your world survive a page refresh.</li></ul>
<h4>\u{1F680} FLY THE ROCKET YOURSELF</h4><ul>
<li>Board a rocket and choose "I'll fly it MYSELF" — up to 2000 km/h! F to land anywhere.</li></ul>
<h4>\u{1F319} DRIVE ON THE MOON</h4><ul>
<li>Moon buggies parked at every moon rocket station — press F to drive in low gravity.</li></ul>
<h4>\u{1F686} RAIL GATES</h4><ul>
<li>Level crossings got red-white gates that close when a train comes by.</li></ul>
<h4>\u{1F438} AND MORE</h4><ul>
<li>The minimap now rotates with you — your arrow always points up.</li>
<li>All animals have faces now; wild giraffes &amp; elephants roam the plains and forests.</li>
<li>Frogs and tadpoles swim in the sea. Tablet mode got a SHIFT pedal (plane descend).</li></ul>`},
{t:"Round 9 — Big money, buildings grow back, route distance",h:`
<h4>\u{1F4B0} BIG MONEY NUMBERS</h4><ul>
<li>Money now shows as K, M, B, T, QA, QI, SX and SP — get rich beyond counting!</li></ul>
<h4>\u{1F3D7}️ BUILDINGS GROW BACK</h4><ul>
<li>A smashed building pops back up 20 seconds after it collapses.</li></ul>
<h4>\u{1F9ED} DISTANCE TO GO</h4><ul>
<li>With a route set, a blue box above the minimap shows how far it is — in meters, then km.</li></ul>`},
{t:"Round 10 — Races, stunt parks, mega highway & big fixes",h:`
<h4>\u{1F3C1} RACES</h4><ul>
<li>Press <b>T</b> at the checkered RACE START flag (in every stunt park) — on foot or in your car.</li>
<li>Drive through 5 glowing blue checkpoints as fast as you can. The bottom-left box shows checkpoint, time and distance; the minimap points the way.</li>
<li>Finish fast = more money (up to $600)! Press T at the flag again to cancel.</li></ul>
<h4>\u{1F3A2} STUNT PARKS (one every ~3.6 km — on the map!)</h4><ul>
<li>Three launch ramps (small, medium, MEGA), a golden ring to jump through and containers to clear.</li>
<li>Ramps are REAL: drive up at speed and you actually launch into the air now.</li>
<li>Orange \u{1F3A2} markers on the map + a quick-travel button.</li></ul>
<h4>\u{1F6E3}️ THE MEGA HIGHWAY</h4><ul>
<li>A real 8-lane highway — 4 lanes each side with a double-yellow median.</li>
<li>One runs north–south, one east–west; lots of fast traffic; dark lines on the map + quick button.</li>
<li>Highway speed limit is 150 km/h (city stays ~120) — no more instant arrests.</li></ul>
<h4>\u{1F3F0} MANSION FIX</h4><ul>
<li>MEGA MANSIONS (and MEGA MARTS) got a solid stone foundation — no more floating.</li>
<li>The floor is a real surface now: you stand ON it instead of sinking through.</li></ul>
<h4>\u{1F354} HUNGER WARNINGS</h4><ul>
<li>Big pop-up messages when you get a little hungry, hungry, and STARVING.</li></ul>
<h4>\u{1F698} CRUISE CONTROL</h4><ul>
<li>Braking (S or Space) now switches the cruise control off, like in a real car.</li></ul>`},
{t:"Round 11 — Buy cars, garage & paint, gas, caves & random events",h:`
<h4>\u{1F4B0} CARS ARE LIMITED NOW — BUY THEM!</h4><ul>
<li>You start with a <b>Mazda MX-5</b>, a <b>KTM 390 Duke</b> and a <b>Gazelle CityGo</b>.</li>
<li>Every other car, motorcycle and bicycle has a price — earn money with dumplings, races, crystals and festivals.</li>
<li>Your money and your bought cars are saved <b>online on your username</b> — log in anywhere, keep everything.</li></ul>
<h4>\u{1F3ED} THE GARAGE SHOWCASE</h4><ul>
<li>Pick a car you own and you enter a showcase room — the car spins on a lit platform.</li>
<li>Paint it any of 16 colors, then hit <b>\u{1F697} DRIVE</b>. Your paint job is saved (other players see it too).</li></ul>
<h4>⛽ GAS STATIONS + FUEL</h4><ul>
<li>Cars &amp; motorcycles have a <b>699 km tank</b> — a fuel bar sits under the speedometer.</li>
<li>Run dry and the engine dies! Gas stations (green ⛽ sign, every ~840 m): stop and press <b>T</b> to fill up.</li></ul>
<h4>\u{1F573}️ CAVES</h4><ul>
<li>Cave mouths on the mountains — walk up and press <b>T</b> to step inside.</li>
<li>Stalagmites, torches and 3 glowing crystals worth $25 each. Press T to go back out.</li></ul>
<h4>\u{1F6A7} RANDOM EVENTS</h4><ul>
<li><b>Road construction</b>: cones, a digger and a barrier — you must slow down to pass.</li>
<li><b>Accidents</b>: crashed cars with flashing police on site — crawl past carefully.</li>
<li><b>Festivals</b>: a stage with balloons pops up nearby — visit on foot for <b>$50</b>!</li></ul>
<h4>\u{1F697} REALISTIC VEHICLES</h4><ul>
<li>Cars: wheel arches, skirts, splitters, exhausts — supercars get a rear wing.</li>
<li>Motorcycles got fairings &amp; windscreens, bikes real frames &amp; pedals, buses AC units &amp; stripes, trains a pantograph, planes winglets and rockets landing legs + grid fins.</li></ul>`},
{t:"Round 12 — The big realism glow-up",h:`
<h4>\u{1F333} REAL TREES &amp; BUSHES</h4><ul>
<li>Leafy trees now have lumpy multi-blob crowns in 5 shades of green, dark triple-cone pines, tapered trunks — and every tree is rotated differently.</li>
<li>Bushes are proper shrubs made of overlapping blobs in two shades.</li></ul>
<h4>\u{1F9CD} REAL PEOPLE</h4><ul>
<li>Everyone has a face now: eyes and a nose, plus a neck, rounded shoulders, sleeves, swinging hands and real shoes.</li>
<li>More pants and hair colors for variety.</li></ul>
<h4>\u{1F3E0} REAL HOUSES &amp; SHOPS</h4><ul>
<li>Houses got framed cross-bar windows (front and sides), a brick chimney, a doorstep and varied roof colors.</li>
<li>Shops got glass storefronts and a colored awning over the door.</li></ul>
<h4>\u{1F697} REAL WHEELS</h4><ul>
<li>Every wheel has a six-spoke rim, a center cap and a rim ring — and you can see them spin.</li>
<li>Cars gained roof pillars around the glass cabin, license plates and door handles.</li></ul>
<h4>\u{1F305} SOFTER LIGHT</h4><ul>
<li>Soft-edged shadows (PCF soft shadow maps) make everything look less \"cut out\".</li></ul>`},
{t:"Round 13 — Museums, concerts, pianos & YOUR mansion",h:`
<h4>\u{1F3DB} DUMPLING MUSEUMS (one every ~1 km — on the map!)</h4><ul>
<li>Walk in and admire the legendary <b>RAINBOW GLITTER dumpling</b> spinning in its glass case.</li>
<li>Press <b>T</b> inside to buy one for <b>$300</b> — the rarest dumpling, guaranteed.</li></ul>
<h4>\u{1F3B5} CONCERT HALLS (one every ~2.4 km — on the map!)</h4><ul>
<li>A real stage with red curtains, spotlights, rows of seats and a <b>piano on the podium</b>.</li>
<li>Press T at the piano, then hit <b>\u{1F3AD} Play piano</b> — a whole crowd walks in and sits down to hear you!</li></ul>
<h4>\u{1F3B9} REAL PIANOS + MIDI</h4><ul>
<li>Play with your mouse, your computer keyboard (A W S E D F T G Y H U J K...) or plug in a real <b>MIDI keyboard</b>!</li></ul>
<h4>\u{1F3F0} MANSIONS ARE YOURS NOW — $2M</h4><ul>
<li>The reception moved <b>outside</b>, in front of the entrance — a mansion costs <b>$2,000,000</b>.</li>
<li>Every mansion got a <b>garden</b>: lawn, hedges, a stone path and flowers.</li></ul>
<h4>\u{1F6E0} MANSION EDITOR (press T inside your mansion)</h4><ul>
<li>A furniture shop appears at the bottom of your screen — click an item, then click where to put it. R rotates, \u{1F5D1} removes (full refund).</li>
<li>Indoors: beds, chairs, couches, tables, closets, lamps, TVs, plants, rugs — and <b>pianos you can really play</b>.</li>
<li>In the garden: <b>trampolines</b> (walk on = BOING!), <b>in-ground swimming pools</b>, fountains, BBQs, benches, swings, trees &amp; flowers.</li>
<li>You can move or replace your bed and chairs too — everything is saved.</li></ul>
<h4>\u{1FA91} SITTING FIXED</h4><ul>
<li>You no longer sit facing the wrong way — legs bend forward like a real person.</li></ul>`},
{t:"Round 14 — Concert money, buy OR rent, one owner per house & shared time",h:`
<h4>\u{1F51A} END THE CONCERT — AND GET PAID!</h4><ul>
<li>Press T at the concert piano and hit <b>\u{1F51A} End the concert</b>: the whole crowd stands up, CLAPS, drops money in the \u{1F3A9} hat next to the piano and walks out.</li>
<li>Press <b>T</b> at the hat to collect your earnings — bigger crowd, bigger tips!</li></ul>
<h4>\u{1F3B9} CONCERT PIANOS LOCK</h4><ul>
<li>While a player gives a concert, <b>nobody else can play that piano</b> — it unlocks the moment they end the concert.</li></ul>
<h4>\u{1F4B0} BUY <i>OR</i> RENT YOUR HOME</h4><ul>
<li>Apartment room: <b>BUY $100K</b> (forever) or <b>RENT $100 per day</b>.</li>
<li>MEGA MANSION: <b>BUY $2M</b> or <b>RENT $1K per day</b>.</li>
<li>Rent is charged every new game day — run out of money and you LOSE the place!</li></ul>
<h4>\u{1F512} ONE OWNER PER HOUSE (online)</h4><ul>
<li>On servers, claiming an apartment or mansion locks it for everyone else — the reception tells you who owns it.</li>
<li>Your claims follow your username, so the same place is yours on any device.</li></ul>
<h4>⏰ SHARED SERVER TIME</h4><ul>
<li>On a server, every player sees the exact same clock, day and night — sunset happens for everyone at once.</li>
<li>(That also means sleeping can't skip the night on servers — you still get breakfast!)</li></ul>
<h4>\u{1F389} FESTIVALS END PROPERLY</h4><ul>
<li>When a festival is over, the visitors walk off and go home instead of partying forever.</li></ul>`},
{t:"Round 15 — Accounts with passwords, paying players & your avatar",h:`
<h4>\u{1F511} REAL ACCOUNTS: USERNAME + PASSWORD</h4><ul>
<li>Choosing a username now needs a <b>password</b> — click <b>\u{1F195} Register</b> to create a new account or <b>▶ Log in</b> on any device.</li>
<li>Your money, cars and houses follow your account everywhere. Passwords are stored online as a secure hash, never as plain text.</li>
<li>In ⚙ <b>Settings</b> you can view your password (\u{1F441} eye button) and change it (Save).</li>
<li>Old accounts from before passwords: open the game on the original device and set a password in Settings.</li></ul>
<h4>\u{1F4B8} PAY OTHER PLAYERS</h4><ul>
<li>Click a player on the map (or open the \u{1F4B0} Money menu) and choose <b>\u{1F4B8} Send money</b>: $10, $100, $1K, $10K or any amount.</li>
<li>The money lands in their online inbox — they get it within seconds, even mid-game, with a message saying who sent it.</li></ul>
<h4>\u{1F9CD} AVATAR EDITOR</h4><ul>
<li>In ⚙ Settings: pick your <b>shirt, pants, hair and skin</b> colors — your character updates instantly.</li>
<li>Other players see your look too: your avatar is broadcast along with your position.</li></ul>`},
{t:"Round 16 — Jobs, pets, multiplayer races & visiting mansions",h:`
<h4>\u{1F4BC} JOBS (new top-bar button!)</h4><ul>
<li>\u{1F696} <b>Taxi driver</b>: pick up passengers, drop them at the beacon — fare grows with distance.</li>
<li>\u{1F35F} <b>Food delivery</b>: grab 3 meals at a McDrive, deliver them in 5 minutes — $40 each + $80 bonus.</li>
<li>\u{1F69B} <b>Tow truck</b>: hook up crashed cars at accidents and tow them to the garage — $150 per wreck.</li>
<li>Follow the blue route to the orange beacon; press \u{1F4BC} Jobs again to end your shift.</li></ul>
<h4>\u{1F465}\u{1F3C1} MULTIPLAYER RACES</h4><ul>
<li>Press T at a race flag → <b>MULTIPLAYER race</b>: $100 entry, starts 30 s later, everyone at the flag can join.</li>
<li>Same checkpoints for everyone — <b>first to finish takes the whole pot!</b></li></ul>
<h4>\u{1F3F0} VISIT OTHER PLAYERS' MANSIONS</h4><ul>
<li>Walk into a claimed mansion and see the owner's <b>real furniture</b>, exactly how they placed it.</li>
<li>\u{1F514} Ring the doorbell, \u{1F4D6} read &amp; ✍️ write in the <b>guest book</b>.</li>
<li>\u{1F6D2} Open a <b>dumpling shop</b> at your mansion ($2,000, you set the price) — buyers' money lands in YOUR inbox!</li>
<li>Your 3 fastest cars park on your driveway for everyone to admire.</li></ul>
<h4>\u{1F436} PETS</h4><ul>
<li>MEGA MARTs sell puppies ($500) and kittens ($400) — they follow you everywhere, bouncing along.</li></ul>
<h4>\u{1F4B0} MORE ECONOMY</h4><ul>
<li>\u{1F381} <b>Daily reward</b>: $100 × your streak (up to $1,000) — come back every day!</li>
<li>\u{1F3B0} <b>Scratch cards</b> at gas station kiosks: $50 a card, win up to $5,000.</li>
<li>\u{1F4B5} <b>Sell cars back</b> for 70% in the garage (starter cars excluded).</li>
<li>\u{1F3E8} Owned apartments earn <b>$25/day</b> from tenants.</li>
<li>\u{1F381} <b>Gift dumplings</b> to other players; concerts pay <b>double, triple, more</b> when real players watch!</li>
<li>⭐ <b>Friends</b>: star a player — gold on the map, top of the list.</li></ul>`},
{t:"Round 17 — Big graphics glow-up, real music, weather & auto-drive",h:`
<h4>\u{1F31F} MUCH NICER GRAPHICS</h4><ul>
<li>Filmic tone mapping + sRGB colors: richer light, warmer sunsets, deeper shadows.</li>
<li><b>Real grass</b>: a detailed grass texture on the ground + thousands of little 3D grass tufts.</li>
<li><b>Shinier cars</b>: real specular paint and glossy glass instead of flat plastic.</li>
<li>Graphics quality setting: ⚡ Fast (no shadows, great for slow devices) / Normal / ✨ Beautiful.</li></ul>
<h4>\u{1F3B5} REAL MUSIC</h4><ul>
<li>The game now plays the real songs from the Music folder in a random shuffle (\u{1F3B5} toggle in Settings).</li></ul>
<h4>\u{1F327} WEATHER</h4><ul>
<li>Rain (wet roads = less grip!), fog banks, and ❄️ SNOW in December — everyone on a server gets the same weather.</li></ul>
<h4>\u{1F916} AUTO-DRIVE</h4><ul>
<li>New \u{1F916} Auto button: your car drives itself at ~50 km/h and stops at red lights.</li>
<li>Every 3rd crossing it asks <b>⬅ ⬆ ➡</b> (it even talks!) — don't choose and it picks itself. Steer to take over.</li></ul>
<h4>\u{1F3F4}‍☠️ DAILY TREASURE HUNT</h4><ul>
<li>Every day a treasure chest hides somewhere — same spot for everyone on a server.</li>
<li>Use the map hint, follow the HOT/COLD messages — first finder gets <b>$2,000</b>, later finders $250.</li></ul>
<h4>\u{1F3C6} ACHIEVEMENTS</h4><ul>
<li>15 achievements worth $250 each — from "Road tripper" to the glitter rainbow dumpling.</li></ul>
<h4>\u{1F50A} BETTER SOUNDS</h4><ul>
<li>New smooth two-tone \u{1F693} siren (no more screech), softer deeper crash, rounder horn.</li>
<li>Every car honks a little differently — and <b>traffic cars now honk by themselves</b> in jams!</li></ul>
<h4>⚙️ EFFECT SWITCHES</h4><ul>
<li>Settings: turn police, crash sound, honks, engine sound, sirens and weather ON/OFF separately.</li></ul>
<h4>\u{1F4F7} PHOTO MODE + \u{1F383} SEASONS</h4><ul>
<li>\u{1F4F7} Photo button: hides the HUD and saves a screenshot to your downloads.</li>
<li>\u{1F383} Pumpkin dumplings in October, ❄️ Snowy dumplings in December (worth $40!).</li></ul>
<h4>\u{1F41B} BUG FIXES</h4><ul>
<li>Animals & people no longer twitch/spin at road edges — they turn smoothly and commit to a direction.</li>
<li>Glitching/flickering roads fixed: every road layer got its own height.</li>
<li>Faster: quality setting reduces load, fewer freeze spikes.</li></ul>`},
{t:"Round 18 — FERRY ISLANDS \u{1F3DD}⛴",h:`
<h4>\u{1F3DD} REAL ISLANDS IN THE SEA</h4><ul>
<li>The deep sea now has <b>islands</b> — sandy beaches, palm trees with coconuts, beach chairs & parasols, and \u{1F980} crabs scuttling on the sand.</li>
<li>Every island has a <b>LIGHTHOUSE</b> with a rotating light beam you can spot from the mainland at night.</li>
<li>Cyan \u{1F3DD} markers on the map + a "Nearest FERRY ISLAND" quick button.</li></ul>
<h4>⛴ THE CAR FERRY</h4><ul>
<li>A real ferry sails between every island and the nearest shore — wooden piers on both sides.</li>
<li><b>Walk or DRIVE YOUR CAR onto the deck</b> while it's docked, and sail across with it. The deck even bobs on the waves!</li>
<li>The ferry runs on the shared clock: on a server, everyone sees it at the exact same spot.</li></ul>
<h4>\u{1FAA9} PEARL DUMPLINGS (island exclusive!)</h4><ul>
<li>The \u{1F3D6} beach shop sells shimmering <b>PEARL dumplings</b> ($35, worth $60 — glitter pearls $180!) and \u{1F965} coconut drinks.</li>
<li>You can ONLY get pearls on islands — show them off on your mansion display table!</li></ul>
<h4>⛏️ X MARKS THE SPOT</h4><ul>
<li>Every island hides a buried-treasure <b>X</b> on the beach — press T to dig: $150 + a chance of a buried pearl. The sand refills every night!</li></ul>`},
{t:"Round 19 — Beach dumpling collection & REAL walls",h:`
<h4>\u{1F41A} 20 BEACH DUMPLINGS TO COLLECT</h4><ul>
<li>The island beach shop now sells <b>beach dumplings</b> — 20 different ones: Coral, Wave, Lagoon, Sunset, Shell, Starfish, Palm, Coconut, Sandy, Ocean, Seaweed, Dolphin, Sunrise, Tide, Reef, Breeze, Shark, Salty, Tropic and Captain!</li>
<li>\u{1F381} A <b>FREE mystery beach dumpling</b> — one per island per day. Island-hop to fill your collection!</li>
<li>The shop shows your progress: collect all <b>20 / 20</b>!</li></ul>
<h4>\u{1F4B0} MONEY GLITCH FIXED</h4><ul>
<li>Pearl (and beach) dumplings now sell for $25 — <b>below</b> the $35 shop price, so buying-and-selling no longer prints money. Glitter ones still sell for $90!</li></ul>
<h4>\u{1F9F1} REAL WALLS</h4><ul>
<li>You can't walk through the walls of shops, MEGA MARTs, museums, concert halls, mansions and hotel lobbies anymore — use the door like a normal person!</li></ul>`},
{t:"Round 20 — House fires, ambulances & LIVE TV news",h:`
<h4>\u{1F525}\u{1F692} HOUSE FIRES + FIRE TRUCKS</h4><ul>
<li>New random event: a house catches <b>FIRE</b> — flickering flames and smoke pouring from the roof (\u{1F525} on the map).</li>
<li>A <b>fire truck races to the scene</b>, parks, and sprays a real arc of water onto the flames until the fire is out.</li></ul>
<h4>\u{1F691} AMBULANCES AT ACCIDENTS</h4><ul>
<li>Every accident now gets an <b>ambulance</b> that drives in with flashing lights and takes care of the patients.</li></ul>
<h4>\u{1F4FA} LIVE CITY NEWS ON YOUR TV</h4><ul>
<li>The TV in your mansion <b>actually broadcasts the news</b> — real, live stories from your world:</li>
<li>\u{1F389} festivals starting · \u{1F6A8} accidents · \u{1F525} house fires (and when they're put out) · \u{1F308}✨ players opening rainbow glitter dumplings · \u{1F3F4}‍☠️ treasure finds · \u{1F3C1} race wins · \u{1F3B9} concerts · \u{1F694} police arrests!</li>
<li>Headlines rotate every few seconds with a proper news banner and ticker. Buy a TV ($800) in the mansion editor and stay informed!</li></ul>`},
{t:"Round 21 — \u{1F47D} ALIENS ON THE MOON",h:`
<h4>\u{1F6F8} ALIEN SPACESHIPS (one every ~1000 km!)</h4><ul>
<li>Somewhere on the endless Moon, alien saucers have landed: shiny metal, a glowing green dome, blinking rim lights and a landing ramp.</li>
<li>A crew of \u{1F47D} little green aliens with big black eyes moonwalks around the ship.</li>
<li>Glowing green <b>moon crystals</b> near every ship — walk into them for $100 each.</li></ul>
<h4>\u{1F4B0} ROB THE SPACESHIP</h4><ul>
<li>Press <b>T</b> at a spaceship: rob the vault for <b>$10,000</b> + a rare <b>ALIEN dumpling worth $1,000</b> (glitter aliens: $2,500!).</li>
<li>But beware: the aliens get ANGRY and <b>chase you</b> — get caught and they zap back $5,000! After a robbery the vault re-locks for <b>30 minutes</b>.</li></ul>
<h4>\u{1F6AB} NO TELEPORTING</h4><ul>
<li>The aliens JAM teleporters near their ships — the map's "\u{1F6F8} Nearest ALIEN spaceship" button only sets a <b>route</b>. Fly your rocket and follow the line: a true expedition!</li></ul>
<h4>\u{1F698} RIDE ALONG WITH FRIENDS</h4><ul>
<li>Walk up to another player's car (or motorcycle) and press <b>F</b> — you hop into the <b>passenger seat</b> and ride wherever they drive!</li>
<li>They see you sitting in the car, name tag and all. Press F anytime to hop out.</li></ul>`},
{t:"Round 22 — A REAL TV with channels & videos \u{1F4FA}",h:`
<h4>\u{1F4FA} PRESS T AT YOUR TV — PICK A CHANNEL!</h4><ul>
<li><b>⛏ Channel 1 — 3 Minute Minecraft (3MM)</b>: 8 real videos! Pick one and watch it ON the TV in your mansion — when it ends, the next one plays automatically. The sound gets louder as you walk closer.</li>
<li><b>\u{1F4F0} Channel 2 — CITY NEWS</b>: live stories from your world.</li>
<li><b>\u{1F525} Channel 3 — The Cozy Fireplace</b>: crackling animated flames.</li>
<li><b>\u{1F420} Channel 4 — The Aquarium</b>: fish, seaweed and bubbles.</li>
<li><b>⏻ Turn the TV OFF</b> when it's bedtime.</li></ul>
<h4>\u{1F4F0} SMARTER NEWS</h4><ul>
<li>News stories don't repeat anymore — each story plays exactly <b>once, for 5 seconds</b>.</li>
<li>No news? The TV shows real black &amp; white <b>static</b>, just like an old telly.</li></ul>`},
{t:"Round 23 — Food delivery, YOUR music at concerts & next-level looks",h:`
<h4>\u{1F6F5} ORDER FOOD TO YOUR HOME</h4><ul>
<li>In your apartment room (press T) or mansion (T → \u{1F354} Order food): choose <b>McDrive</b> (the full menu!), <b>MEGA MART boxes</b> or <b>Squishy Dumplings by amount</b> ($12 each).</li>
<li>A courier on a pink moped drives to your front door and <b>\u{1F514} RINGS THE DOORBELL</b> — go out, pay, and take your order!</li>
<li>Take too long (3 minutes) and the courier drives off with your food...</li></ul>
<h4>\u{1F3B9}\u{1F4C2} PLAY YOUR OWN .MID FILES</h4><ul>
<li>At any piano: <b>\u{1F4C2} Play a .MID file</b> — upload a real MIDI song and the piano performs it live, tempo changes and all!</li>
<li>Combine it with a concert: call the crowd, play your favourite song, collect the tips. ⏹ Stop anytime.</li></ul>
<h4>\u{1F306} NEXT-LEVEL GRAPHICS</h4><ul>
<li>A real <b>gradient sky dome</b>: deep blue overhead melting into a glowing horizon — sunsets are now stunning.</li>
<li>The sea <b>glints in the sunlight</b> (real specular water).</li>
<li><b>Realistic car lights</b>: brake lights flare bright red, reverse lights glow white, and at night every car (traffic too!) casts visible <b>headlight beams</b>.</li>
<li>Cars got <b>interiors</b>: seats and a steering wheel you can see through the glass.</li>
<li>All of it is light on the GPU — smooth on the ⚡ Fast setting too.</li></ul>`},
{t:"Round 24 — Helicopters, volcanoes, leaderboards & tuning \u{1F681}\u{1F30B}",h:`
<h4>\u{1F681} YOUR OWN HELICOPTER — $500,000</h4><ul>
<li>New \u{1F681} Heli button: buy it once, summon it anywhere on Earth. W/S speed, A/D turn, SPACE up, SHIFT down, F to land — <b>land it anywhere</b>, even on rooftops and decks.</li>
<li>Other players see you flying it, spinning rotors and all!</li></ul>
<h4>☁️ SKY RESTAURANTS</h4><ul>
<li>On the tallest mountain peaks: a platform with a helipad, tables with a VIEW, fancy meals — and the exclusive <b>☁️ CLOUD dumpling</b> ($100, worth $80 / glitter $240).</li></ul>
<h4>\u{1F30B} VOLCANO ISLANDS</h4><ul>
<li>Rare smoking volcano islands out at sea — and they <b>ERUPT on the shared clock</b>: lava fountains, glowing crater, smoke, breaking news!</li>
<li>Get caught on the cone during an eruption and the blast throws you to the shore.</li>
<li>Between eruptions: press T at the crater to mine <b>LAVA dumplings</b> ($120, glitter $300) — one scoop per 10 minutes.</li></ul>
<h4>\u{1F3C5} WEEKLY LEADERBOARD</h4><ul>
<li>\u{1F4B0} Money menu → <b>WEEKLY LEADERBOARD</b>: the top 10 richest players, resets every week.</li>
<li>The #1 player wears a <b>\u{1F451} golden crown</b> that everyone can see in the world!</li></ul>
<h4>\u{1F3CE} CAR TUNING 2.0</h4><ul>
<li>In the garage: add a <b>spoiler</b>, glowing <b>neon underglow</b> (4 colors), colored <b>rims</b>, <b>racing stripes</b> and your own <b>license plate text</b>!</li></ul>
<h4>\u{1F91D} CO-OP JOBS</h4><ul>
<li>Take a REAL player along in your passenger seat while working — <b>every job pays DOUBLE</b>!</li></ul>
<h4>\u{1F54A} EVEN MORE REALISTIC</h4><ul>
<li>Birds circle in the daytime sky · golden-hour sunlight turns warm and orange at sunrise & sunset.</li>
<li>The camera <b>widens at speed</b> and the <b>wind rushes</b> louder the faster you go.</li></ul>`},
{t:"Round 25 — ⚽ WORLD CUP on TV & pick-your-news",h:`
<h4>⚽ NEW CHANNEL: WORLD CUP SOCCER</h4><ul>
<li><b>7 matches</b> to choose from: Spain (LAMINE YAMAL) vs Portugal (RONALDO), France (MBAPPÉ) vs Argentina (MESSI), Brazil (NEYMAR) vs England (KANE), Germany (MUSIALA) vs Netherlands (GAKPO)... and the \u{1F3C6} <b>FINAL</b>!</li>
<li>Live on your TV: a real animated pitch, both teams in their country colors, the star player with a golden ring, passes, shots, <b>SAVES and GOOOALS</b> with crowd cheers!</li>
<li>90 minutes of match in ~2.5 real minutes — full time shows the result, then the next match kicks off automatically.</li></ul>
<h4>\u{1F4F0} PICK YOUR NEWS</h4><ul>
<li>Choosing the news channel now shows a <b>list of stories</b> — pick the one YOU want on screen, or \u{1F4E1} LIVE mode for the newest.</li>
<li>Every story stays available for <b>5 real minutes</b> before it expires.</li></ul>
<h4>\u{1F304} A CALMER CITY</h4><ul>
<li>Random events (house fires, road construction, accidents, festivals) happen <b>less often</b> — special, not constant.</li></ul>
<h4>\u{1F6E9} RENT A PLANE — $250/DAY</h4><ul>
<li>At any ✈️ airport terminal: <b>RENT a plane</b> and fly it YOURSELF (no admin needed) — W/S speed, A/D turn, Space climb, Shift descend.</li>
<li>$250 is charged every game day; return the rental at any terminal.</li></ul>
<h4>✨ REALISM PACK</h4><ul>
<li><b>Reflective car paint</b>: metallic bodywork and glass now mirror the sky around them.</li>
<li><b>License plates fixed</b> — they sit ON the bumpers now instead of hiding inside them (your custom plate too!).</li>
<li>The sun got a real <b>glare halo</b>, every vehicle casts a soft <b>contact shadow</b>, and roads got a detailed surface with wheel-wear tracks and cracks.</li></ul>`},
{t:"Round 26 — Clouds, fishing, build-your-house & police career",h:`
<h4>☁️ SKY RESTAURANTS FLOAT ON CLOUDS NOW</h4><ul>
<li>They're no longer stuck on rare mountain peaks — every ~5 km a restaurant floats on a <b>fluffy cloud at 150 m</b>, so there's ALWAYS one near you.</li>
<li>The map button lets you <b>⚡ teleport straight up into the clouds</b> — or set a route and fly there with your \u{1F681}. Just don't step off the edge!</li></ul>
<h4>\u{1F3A3} FISHING</h4><ul>
<li>Buy a <b>fishing rod ($200)</b> at any MEGA MART. Stand at the water's edge, press T to cast, wait for the ❗ and press T FAST!</li>
<li>8 catches from Sardine to Swordfish, a soggy \u{1F462} old boot... and the legendary <b>\u{1F31F} GOLDEN FISH worth $500</b>.</li>
<li>Check your \u{1F4D6} fish log at any island beach shop.</li></ul>
<h4>\u{1F3D7} BUILD YOUR OWN HOUSE</h4><ul>
<li>Empty fenced plots FOR SALE every ~1.6 km — <b>$50,000</b> and the land is yours!</li>
<li>Press T inside your fence: the editor now sells \u{1F9F1} <b>walls, \u{1FA9F} window walls, \u{1F6AA} door walls, \u{1F6D6} roof panels and floors</b> — design any house you like, plus all the normal furniture!</li>
<li>Your build is saved online — friends can visit it, exactly how you made it.</li></ul>
<h4>\u{1F46E} POLICE CAREER</h4><ul>
<li>New job: <b>POLICE OFFICER</b> — your car transforms into a real cruiser with flashing lights!</li>
<li>Radio callouts send you after black getaway cars racing through the city — stay close to <b>BUST</b> them: $200 per arrest (co-op x2!).</li></ul>
<h4>\u{1F681} RENT A HELICOPTER — $500/DAY</h4><ul>
<li>The \u{1F681} Heli button now offers a REAL rental helicopter for $500 a day if $500K is too steep — summon it and fly, just like an owned one.</li></ul>
<h4>\u{1F3DC} PRETTIER WORLD & SIMPLER LOGIN</h4><ul>
<li>The desert got wind-rippled sand, golden dry grass and red rocks; grasslands got natural light-and-dark patches.</li>
<li>Passwords are GONE — just pick a username and play!</li></ul>`},
{t:"Round 27 — Cloud collection, keep your fish & better police chases",h:`
<h4>☁️ SIX CLOUD DUMPLINGS TO COLLECT</h4><ul>
<li>Sky restaurants now sell <b>mystery cloud dumplings</b> — 6 different ones: Cloud, Storm, Sunset, Sunrise, Star and \u{1F308} Rainbow cloud!</li>
<li>Shop menus at the ☁️ sky restaurant and \u{1F3D6} beach shop <b>stay open</b> while you buy — shop till you drop.</li></ul>
<h4>\u{1F3A3} KEEP YOUR CATCH</h4><ul>
<li>Catching a fish now gives you the choice: \u{1F4B5} <b>SELL it</b> for money, or \u{1F392} <b>KEEP it</b> in your food backpack and eat it later (press R). Fresh fish fills you up!</li></ul>
<h4>\u{1F46E} POLICE CHASES THAT WORK</h4><ul>
<li>The blue <b>map route now follows the thief live</b> on the minimap and big map.</li>
<li>Thieves <b>panic and slow down</b> when you get close — drive into the circle and a 3-2-1 arrest countdown busts them properly.</li></ul>
<h4>\u{1F3D7} PLOTS ON THE MAP</h4><ul>
<li>Building plots now show as green \u{1F3D7} dots on the map, plus a "Nearest building PLOT for sale" quick button.</li></ul>`},
{t:"Round 28 — POOL PARKS, trucking, pet tricks & a living city",h:`
<h4>\u{1F3CA} PUBLIC POOL PARKS (every ~2 km, on the map!)</h4><ul>
<li>Mega-mansion-sized parks with a giant pool you can <b>REALLY SWIM in</b> — jump in and your player paddles with real swim strokes!</li>
<li>A twisting \u{1F6DD} <b>WATERSLIDE</b> (press T at the tower — hands in the air, SPLASH into the pool), a bubbling <b>♨️ hot tub</b>, a kiddie pool, a diving board and sun loungers.</li>
<li>Garden pools at your mansion are swimmable now too!</li></ul>
<h4>\u{1F4E6} NEW JOB: TRUCKER</h4><ul>
<li>Your car becomes a <b>BIG RIG with a cargo container</b> — collect at MEGA MART depots, haul across the city, longer routes pay more.</li>
<li>Drive smoothly: every crash <b>dents the cargo</b> and costs 20% of the pay!</li></ul>
<h4>\u{1F43E} PET TRICKS & THE PARROT</h4><ul>
<li><b>Name your pet</b>, and press T next to it for tricks: \u{1FA91} Sit, \u{1F300} Spin and ✋ High-five!</li>
<li>Dogs & cats <b>dig up bones ($25)</b> on island beaches. New pet: the \u{1F99C} <b>PARROT ($600)</b> — it rides on your SHOULDER!</li></ul>
<h4>\u{1F694} POLICE SIREN AUTO-ON</h4><ul>
<li>The moment the radio calls out a speeder on your police shift, <b>YOUR siren wails automatically</b> — wee-woo all the way!</li></ul>
<h4>\u{1F3D9} A LIVING, REALISTIC CITY</h4><ul>
<li>A real <b>downtown skyline</b>: tall towers with antennas and blinking warning lights.</li>
<li><b>Street furniture everywhere</b>: fire hydrants, mailboxes and trash bins — plus <b>cars parked along the curbs</b>.</li>
<li>Houses got wooden <b>siding texture</b> instead of flat plastic walls.</li>
<li><b>Living sound</b>: a soft city hum, \u{1F426} birdsong in the day, \u{1F997} crickets at night.</li></ul>`},
{t:"Round 29 — SOLID cars, \u{1F451} world owners, kick & ban, your own private city",h:`
<h4>\u{1F697} EVERY CAR IS SOLID NOW</h4><ul>
<li>Traffic cars, other players' cars and even the parked cars along the curb — you <b>bump into them, never through them</b>, whether you're driving or walking.</li></ul>
<h4>\u{1F3E0} YOUR OWN PRIVATE CITY</h4><ul>
<li>The default city is <b>not a shared server anymore</b> — it's automatically YOUR own private world. Nobody else spawns there; join a \u{1F310} server or a friend's world to play together.</li></ul>
<h4>\u{1F451} WORLD OWNERS</h4><ul>
<li>Every server in the \u{1F310} Servers tab now shows <b>who created it</b>, right under the name.</li>
<li>The creator is the OWNER — and you're always the owner of your own city and the worlds you create.</li>
<li>Owners can <b>change the DAY &amp; TIME for everyone</b> in the ⚙ Rules panel (\u{1F305} morning, ☀️ noon, \u{1F307} evening, \u{1F319} night, \u{1F4C5} next day).</li>
<li>Owners can <b>\u{1F462} KICK</b> players, <b>⏳ BAN them for a day</b> or <b>\u{1F528} BAN FOREVER</b> — open the \u{1F5FA} map and click their name. Unban from the Rules panel.</li></ul>
<h4>\u{1F6E0} ADMIN REMOVED</h4><ul>
<li>The old admin panel (speed boosts, driving the train/plane/bus, traffic count) is gone.</li>
<li>Only two switches remain in the ⚙ Rules panel: \u{1F46E} <b>Police chases ON/OFF</b> and \u{1F354} <b>Hunger ON/OFF</b>.</li></ul>`},
{t:"Round 30 — 200+ new vehicles, tune EVERYTHING, light theme & unrenting",h:`
<h4>\u{1F697} 200+ NEW VEHICLES</h4><ul>
<li><b>50+ new cars</b> — from the Bugatti Tourbillon and Koenigsegg Regera to the Toyota AE86.</li>
<li><b>50+ new motorcycles</b> (BMW M1000RR, Ducati Superleggera V4, Vespa GTS...) and <b>50+ new bicycles</b>.</li>
<li>Campers are <b>real models from real brands</b> now: Volkswagen California, Hymer, Airstream, Winnebago, Morelo... 60+ of them! (Your old campers automatically became their real-brand versions.)</li></ul>
<h4>\u{1F527} TUNE EVERY VEHICLE</h4><ul>
<li>The garage customization isn't just for cars anymore: <b>motorcycles, bicycles and campers</b> get neon, colored rims, stripes and (where it makes sense) a license plate.</li>
<li>The <b>spoiler works on EVERY car</b> now — and motorcycles can get one too. Campers and bicycles stay spoiler-free (sorry).</li></ul>
<h4>☀️ LIGHT &amp; DARK THEME</h4><ul>
<li>New <b>Theme switch in ⚙ Settings</b>: the whole UI in \u{1F319} dark (as always) or a fresh ☀️ light look. Your choice is remembered.</li></ul>
<h4>\u{1F6AA} UNRENT YOUR PLACE</h4><ul>
<li>You can <b>give back a rented or bought mansion / apartment</b>: press T at the reception, or use the \u{1F6AA} Unrent button in \u{1F6CF} Rooms.</li>
<li>Everything YOU placed gets deleted — only the default furniture stays.</li></ul>
<h4>\u{1F4B8} FINES GO INTO THE MINUS</h4><ul>
<li>Can't afford a fine? It gets paid anyway — your money can go <b>negative</b> now (it shows red). Earn it back!</li></ul>
<h4>\u{1F3AF} TIGHTER HITBOXES</h4><ul>
<li>Cars, houses, apartments and mansions have <b>much tighter hitboxes</b> — no more crashing into invisible walls a meter from the building.</li></ul>
<h4>\u{1F6EB} NEW STARTER VEHICLES</h4><ul>
<li>You now start with the <b>SLOWEST</b> of each type: the Toyota AE86, Vespa GTS 300, Cortina U4 Transport — and a free Citroen Type H WildCamp camper!</li>
<li>The Mazda MX-5, KTM 390 Duke and Gazelle CityGo aren't free anymore — earn money and buy them!</li></ul>
<h4>\u{1F6CF} ROOMS MENU</h4><ul>
<li>Clicking a room in \u{1F6CF} Rooms now asks: <b>⚡ TELEPORT</b> right there, or <b>\u{1F9ED} ROUTE</b> — follow the blue line and drive there yourself.</li></ul>`},
{t:"Round 31 — WAY more realistic cars, next-level tuning & a real avatar",h:`
<h4>\u{1F697} CARS LOOK REAL NOW</h4><ul>
<li>Every car got a <b>detail pass</b>: windshield wipers, a shark-fin antenna, a chrome nose badge, orange turn signals, fog lights, a third brake light, a fuel filler cap, a rear diffuser with fins and visible door seams.</li>
<li><b>Real brakes</b>: steel brake discs and red calipers peek through the spokes of every wheel — and the calipers steer with the front wheels.</li></ul>
<h4>\u{1F527} NEXT-LEVEL GARAGE TUNING</h4><ul>
<li><b>\u{1FA9F} Glass tint</b>: factory, light smoke, dark smoke, blue, green, gold or purple — every window changes.</li>
<li><b>⭕ Wheel color</b>: the WHOLE wheel (hub, spokes &amp; rings) gets your color now, in 6 finishes — tires stay black, brakes stay real.</li>
<li><b>\u{1F3A8} Spoiler color</b>: carbon, body color, white, red, blue or gold — in real clear-coated metal paint, with racing end plates.</li></ul>
<h4>\u{1F9CD} A REAL AVATAR</h4><ul>
<li>Your character has a real face now: white eyes with pupils, eyebrows, ears, a mouth, fuller hair down the back of the head — plus a chest, a belt and <b>real sneakers with rubber soles</b>.</li>
<li>New <b>\u{1F45F} Shoes color</b> row in the ⚙ Settings avatar editor — other players see your kicks too!</li></ul>`},
{t:"Round 32 — \u{1F9C8} BUTTER SQUISHIES & rent-to-buy your home",h:`
<h4>\u{1F9C8} BUTTER SQUISHIES</h4><ul>
<li>The \u{1F95F} Dumplings button is now <b>\u{1F95F} Squishies</b> — with TWO tabs: your dumplings and your NEW <b>butter squishies</b>!</li>
<li>Buy Butter Squishy surprises at any \u{1F6D2} MEGA MART. Same 8 colors, GOLD, RAINBOW and ✨ glitter as dumplings...</li>
<li>...but butter also comes in <b>SIZES</b>: \u{1F538} MEDIUM is rare (<b>1 in 200</b>, worth 6x) and \u{1F31F} MEGA is ultra rare (<b>1 in 600</b>, worth 20x)! A glitter rainbow MEGA is the rarest butter in the universe.</li>
<li>Open one or open ALL in the Butter tab — and hold them in your hands (MEGA ones are HUGE).</li>
<li>Sell them at the new <b>\u{1F9C8} BUTTER BUYERS</b> — one every ~500 m (yellow dots on the map, and in \u{1F5FA} map routes).</li></ul>
<h4>\u{1F511}→\u{1F4B0} SWITCH FROM RENT TO BUY</h4><ul>
<li>Renting an apartment or MEGA MANSION? You can now <b>switch to BUYING it</b> — at the reception (press T) or with the new \u{1F4B0} Buy button in the \u{1F6CF} Rooms menu.</li>
<li><b>Every dollar of rent you already paid counts!</b> Rented a $2M mansion for 100 days ($100K paid)? You only pay the remaining $1.9M.</li>
<li>Your furniture, dumpling shop and displays <b>all stay exactly where they are</b> — nothing resets.</li></ul>`},
{t:"Round 33 — \u{1F3E1} Family houses, \u{1F525} ULTRA graphics, nicer cars & smart buyer filters",h:`
<h4>\u{1F3E1} FAMILY HOUSES — BUY $500K or RENT $250/day</h4><ul>
<li>A big new home every ~1.4 km (\u{1F3E1} on the map): a real walk-in house with a gabled roof, chimney and framed windows — MUCH bigger than the little street houses.</li>
<li>Every family house sits in its own <b>fenced GARDEN</b> with a lawn, flowers, trees and a stone path.</li>
<li>Press T inside to <b>place items in the rooms AND all over the garden</b> — same editor as the mansion, and rent counts toward buying here too!</li>
<li>The little suburb houses also grew a size bigger.</li></ul>
<h4>\u{1F525} ULTRA GRAPHICS (⚙ Settings)</h4><ul>
<li>New switch under Graphics quality: <b>\u{1F525} ULTRA</b>.</li>
<li><b>\u{1F33F} Living grass</b>: hundreds of real grass blades around you that WAVE in the wind — and bend harder in storms.</li>
<li><b>\u{1F3DC} Flying sand</b>: in the desert, sand grains blow past with the wind (and the wind slowly changes direction).</li>
<li><b>Richer world</b>: fuller tree crowns with low branches, ~60% more vegetation, window shutters &amp; flower boxes on houses, real balconies on apartment towers and glowing garden lanterns at mansions.</li></ul>
<h4>\u{1F697} NICER CARS</h4><ul>
<li>Every silhouette is now drawn through a <b>smooth spline</b> — bodies curve like real sheet metal instead of angular facets, with rounder edges.</li>
<li><b>Rounded wheel-arch flares</b> that follow each wheel's circle, replacing the old flat blocks.</li>
<li>Brighter, deeper <b>clear-coat paint</b> that reflects the sky more.</li></ul>
<h4>\u{1F95F}\u{1F9C8} SMART BUYER FILTERS</h4><ul>
<li>At the dumpling &amp; butter buyers, filters now <b>hide everything that doesn't match</b> — and they COMBINE: pick a color AND glitter, and at the butter buyer also a size (small / \u{1F538} medium / \u{1F31F} mega) at once.</li>
<li>Whatever matches gets selected for you — one click on \u{1F4B5} Sell and it's money.</li></ul>`},
{t:"Round 34 — \u{1F3EA} MARKETING PLOTS: trade with real players!",h:`
<h4>\u{1F3EA} YOUR OWN MARKET — every ~3 km</h4><ul>
<li>Huge <b>100×100 m MARKETING PLOTS</b> all over the map (\u{1F3EA} on the map): <b>BUY $80K</b> or <b>RENT $100/day</b>.</li>
<li>Every plot is completely <b>EMPTY — just a big wooden plank floor</b>. No trees, houses or anything else spawn on it.</li>
<li>When you claim one you choose: <b>\u{1F3EC} a building</b> (walls + a door all around) or <b>\u{1F33E} open-air</b> — and you can switch later.</li>
<li><b>Name your market!</b> Instead of "Notch's Marketing Plot" the big sign can say <b>SUPER DEAL</b> — or anything you like.</li></ul>
<h4>\u{1FA91} LONG TABLES &amp; \u{1F5C4} DISPLAY CASES</h4><ul>
<li>Press T on your plot for the special market editor with <b>LONG TABLES</b> and <b>DISPLAY CASES</b>.</li>
<li>A table sells <b>dumplings, butter squishies or food</b>: pick the item, type the amount (max = what you own — it leaves your collection), set a price per item...</li>
<li>...and add a <b>BONUS deal</b> like <b>1+1</b> (buy 1, get 1 FREE) or 3+1 — the sign shows it to everyone!</li>
<li>The table shows the goods, the stock and the price. Sold out? The sign says <b>NO STOCK</b> and you can remove it (leftover stock always comes back to you).</li>
<li>A display case shows off ONE item — everyone can look, nobody can touch.</li></ul>
<h4>\u{1F6D2} SHOPPING AT OTHER PLAYERS</h4><ul>
<li>Walk onto someone's plot and their whole market loads — press T to buy! Stock drops with every sale and the money lands straight in the owner's inbox (works even while they're offline).</li>
<li>On the \u{1F5FA} map: <b>\u{1F3EA} Nearest MARKETING PLOT</b> and <b>\u{1F50E} SEARCH players' markets</b> — type a name like SUPER DEAL and teleport or route straight to it.</li></ul>
<li>⚠️ Server owners: the Firebase rules need a small update for markets — see FIREBASE-SETUP.md (new "mkt" field + "markets" section).</li>`},
{t:"Round 35 — Market editor 2.0 & the server fix",h:`
<h4>\u{1F6E0} THE REAL MARKET EDITOR</h4><ul>
<li>Your marketing plot now uses <b>the SAME editor as mansions</b>: press T → \u{1F6E0} EDIT MODE, pick a long table or display case, see the green ghost, click the floor to place it, R rotates, \u{1F5D1} Remove deletes. Place up to 16, anywhere you like.</li>
<li>Tables are placed <b>EMPTY</b>. Walk up to one, press <b>T</b>, and pick what goes on it — dumplings, butter or food.</li>
<li>Stocking uses a real window now: amount, price, and the bonus as two little boxes — <b>[1] + [1] FREE</b> — no more browser popups.</li>
<li>Table signs <b>shrink the text to fit</b> — long deals aren't cut off anymore.</li>
<li>The plot's BIG front sign is repainted the moment someone rents or buys it: it shows the <b>market's name</b> (or "&lt;player&gt;'s Marketing Plot") with a <b>subtitle line underneath</b> — set your own with ✏️ Sign subtitle, or it says "by &lt;owner&gt;". Free plots show BUY/RENT again.</li>
<li>Shoppers can walk up to ONE table and press T to buy just that — or press T anywhere else on the plot for the full list.</li></ul>
<h4>\u{1F527} SERVER FIX (IMPORTANT!)</h4><ul>
<li>If players stopped seeing each other after updating the database rules: the old rules limited the avatar to 32 letters, but avatars have 5 colors (34 letters) since the shoes update. FIREBASE-SETUP.md now says <b>av ≤ 64</b> (and own ≤ 12000) — re-publish the rules and everyone reappears instantly.</li></ul>
<h4>\u{1F504} LIVE UPDATES — no more refreshing!</h4><ul>
<li>Standing on someone's <b>marketing plot</b>? It re-checks every 5 seconds — new tables, prices, stock, names and the building appear for you live.</li>
<li>Visiting someone's <b>mansion, house or plot</b>? Same thing every 6 seconds — their new furniture and dumpling shop pop in while you watch.</li></ul>
<h4>\u{1F446} THE BOX PICKER</h4><ul>
<li>Stocking a table or display case with dumplings/butter now opens a <b>box picker</b>: turn ✨ GLITTER on or off, pick a size (butter: Small / \u{1F538} Medium / \u{1F31F} Mega) and click a color — sell exactly <b>GLITTER MEGA PURPLE</b> if you want!</li>
<li>The color chips always show how many of that exact combo you own, and impossible combos say so.</li></ul>`},
{t:"Round 36 — \u{1F4F1} CoolBlue phone stores & the Unbox menu",h:`
<h4>\u{1F4F1} COOLBLUE — every ~500 m</h4><ul>
<li>A mid-blue store with orange trim every ~500 m (\u{1F4F1} on the map): walk in, press T, and grab <b>FREE surprise phone boxes</b> — the menu stays open so you can take a whole stack.</li>
<li><b>\u{1F4F1} PHONE BUYERS</b> every ~500 m (little blue stands): press T to sell your phones — with the same color filters as the other buyers. New Pro Max / Ultra and \u{1F308} rainbow phones pay the most!</li>
<li>The phone buyer has FULL filters that combine: a <b>color</b>, a <b>brand</b> (\u{1F34E} iPhone / Pixel / Galaxy S / Galaxy A) and the exact <b>version</b> — Pro or Pro Max for iPhone, + Plus or Ultra for Galaxy S, a or Pro for Pixel. Sell all your black iPhone Pro Maxes in two clicks!</li>
<li>\u{1FA91} Long tables now hold up to <b>5 DIFFERENT deals</b> side by side, each with its own price sign — and the new <b>\u{1F6D2} STORE SHELF</b> (in the market editor) has 3 rows with 5 spots each: a 15-deal mega rack!</li>
<li>✨ <b>GENERATE SHOP</b> (market editor): pick phones / dumplings / butter / food / ALL, and it auto-builds shelves, tables and a display case with your <b>most valuable</b> items — then choose \u{1F4B0} EXPENSIVE (+$20 over worth), ⚖️ NORMAL or \u{1F525} CHEAP (−$20). It replaces your whole shop (it warns you, and old stock returns to you first).</li>
<li>\u{1F4BE} <b>SAVE / LOAD shop designs</b>: 2 online slots on your account (3rd slot: $2M). Loading restocks the design straight from your collection. ⚠️ Server owners: add the small "shopdesigns" section from FIREBASE-SETUP.md to the database rules.</li></ul>
<h4>\u{1F3AE} GAME CONSOLES (CoolBlue)</h4><ul>
<li>CoolBlue now also hands out <b>FREE console boxes</b>: PlayStation 1-5 (+Pro), Xbox Original to Series X, and Nintendo Switch, Switch Lite, OLED &amp; <b>Switch 2</b> — random colors, \u{1F308} rainbow rarest, new Unbox tab \u{1F3AE} Consoles.</li>
<li>Place one at home: mansion, family house or build-plot editor → <b>\u{1F3AE} My console + TV</b> (free — it uses a console YOU own). Walk up, press <b>T</b>, and pick a game: \u{1F344} Parkour Mario, \u{1F3CE} Turbo Kart Racers, ⚽ Football Stars &amp; more! In your apartment room, press T to game right from the couch.</li>
<li>Consoles can be sold at your MARKETING PLOT too, and removing a placed console puts it back in your collection.</li></ul>
<h4>\u{1F3EA} MARKET EXTRAS</h4><ul>
<li><b>➕ Empty stands</b> (market editor): type how many store shelves, long tables and display cases you want — they get placed empty in a neat grid, ready to stock.</li>
<li><b>\u{1F3A8} Building colors</b>: pick a PRIMARY (walls) and SECONDARY (roof + trim) color for your market hall.</li>
<li>\u{1F9C8} Butter squishies now actually LOOK like butter — a golden stick with a pale top — in your hands and on market tables.</li>
<li>The little version badge at the bottom of the screen was stuck on v63 forever — it now always shows the real version.</li>
<li>The ☁️ SKY RESTAURANT menu <b>stays open</b> while you shop now — no more closing and reopening after every bite.</li></ul>
<h4>\u{1F381} THE UNBOX MENU</h4><ul>
<li>The Squishies button is now <b>\u{1F381} Unbox</b> with THREE tabs: \u{1F95F} Dumplings, \u{1F9C8} Butter and \u{1F4F1} Phones.</li>
<li>Unbox one or ALL your phone boxes. You can pull the REAL line-ups: <b>iPhone 4-17</b> (Pro &amp; Pro Max from 11 up — and no iPhone 9, Apple really skipped it; number 10 is the iPhone X!), <b>Google Pixel 1-10</b> (Pro from 6, the smaller cheaper "a" models 3a-9a) and <b>Samsung Galaxy S1-S26</b> (S11-S19 never existed — Samsung jumped from S10 to S20!) plus 29 Galaxy A models, Plus &amp; Ultra included.</li>
<li>Phones come in all the colors — <b>\u{1F308} RAINBOW is the rarest</b> (worth 4x), and new Pro Max / Ultra models are the jackpot pulls.</li></ul>
<h4>\u{1F4F1} A PHONE THAT WORKS</h4><ul>
<li>Click a phone in the Unbox menu to <b>hold it</b> — a \u{1F4F1} VIEW PHONE button appears.</li>
<li>On the screen: \u{1F310} a browser that really searches (opens a new tab), ℹ️ info about your exact model, \u{1F9EE} a working calculator, ⏲️ timers and ⏰ alarms that ring even with the phone in your pocket, ⏱️ a stopwatch and \u{1F550} a clock with the real AND in-game time.</li></ul>`},
{t:"Round 37 — ✨ Sharper graphics, smoother cars, market bonuses & your own TV channel",h:`
<h4>✨ GRAPHICS THAT REALLY CHANGE</h4><ul>
<li>The three settings finally DO something different: <b>⚡ Fast</b> = 1x pixels, no shadows, short view (great on slow devices) · <b>Normal</b> = 2x pixels + 2K shadows · <b>✨ Beautiful</b> = your screen's FULL pixel density (up to 3x!), razor-sharp 4K shadows and a much deeper view distance.</li>
<li>The whole game renders at up to <b>2x pixels by default</b> now — noticeably crisper on phones and 4K screens.</li></ul>
<h4>\u{1F697} SMOOTHER, UN-GLITCHED CARS</h4><ul>
<li>Body shells are much smoother: nearly double the curve points and a rounder bevel — real sheet-metal curves.</li>
<li>Fixed the classic glitch where <b>headlights, grilles, badges, plates &amp; exhausts sat half-SUNK inside the nose</b> — every detail now sits exactly ON the body surface.</li>
<li>Rounder tires, rims, brake discs and wheel arches (way more segments).</li></ul>
<h4>\u{1F3EA} MARKET: EDIT PRICES & TIMED BONUSES</h4><ul>
<li>Press T at your table and pick a deal — you can now <b>✏️ change its price</b> any time, change the buy-X-get-Y-FREE deal, or take it off.</li>
<li>New <b>\u{1F381} TIMED BONUS</b>: put 10 / 25 / 50 / 75% OFF on a deal for 1 hour, 6 hours, <b>1 real day</b>, 3 days or a week — REAL time, it keeps counting while you sleep. Buyers see the discount and a countdown on the price signs, and pay the bonus price automatically. When it runs out, the price snaps back.</li></ul>
<h4>\u{1F4FC} YOUR OWN TV CHANNEL</h4><ul>
<li>Every TV has a new <b>Channel 6 — MY VIDEOS</b>: upload an MP4 straight from your computer and it plays on every TV in the game, looping until you change channels. (The video stays on YOUR computer — nothing is uploaded anywhere.)</li></ul>
<h4>\u{1F4F2}\u{1F4BB} COOLBLUE: TABLET & COMPUTER BOXES — ALL FREE</h4><ul>
<li>Two NEW surprise boxes at every CoolBlue, each with its own button: the <b>\u{1F4F2} TABLET box</b> (iPad, iPad mini, iPad Air, iPad Pro 11″/13″, Samsung Galaxy Tab A9 / S9 / S10 Ultra) and the <b>\u{1F4BB} COMPUTER box</b> (MacBook Neo / Air / Pro 14″ / Pro 16″, iMac, Mac mini, Samsung Galaxy Book4 &amp; Book4 Ultra). Both FREE — and they rip open right there in the store!</li>
<li>You never pick the model — the box decides. Cheap ones are common, the expensive ones are the jackpot: an <b>iMac is worth $4,000</b>, a <b>Mac mini $2,000</b>, a MacBook Pro 16″ even $4,500!</li>
<li>Random colors — \u{1F308} rainbow is the rarest and worth 4x. You open the boxes YOURSELF in \u{1F381} Unbox, in two brand-new tabs: <b>\u{1F4F2} Tablets</b> and <b>\u{1F4BB} Computers</b> — each with its own "Open a box" and "Open ALL" buttons.</li>
<li>New \u{1F381}\u{1F389} <b>OPEN ALL BOXES</b> button in the Unbox menu: one tap opens EVERY unopened box you own — dumplings, butter squishies, phones, consoles, tablets AND computers — and tells you your best pull of everything. (Since v117 the Open ALL buttons rip through boxes 100 at a time, so the counter ticks up nice and smooth.)</li>
<li>New buyers at the roadside every ~500 m: the purple <b>\u{1F4F2} TABLET BUYER</b> and the white <b>\u{1F4BB} COMPUTER BUYER</b> — press T to sell your iPads, Galaxy Tabs, MacBooks, iMacs, Mac minis &amp; Galaxy Books for their real worth (the phone buyer sticks to phones now). You can also hold them or sell them at your own MARKETING PLOT.</li>
<li>Both buyers are <b>on the \u{1F5FA} map</b> now (purple &amp; white dots), with <b>\u{1F4F2}/\u{1F4BB} Nearest buyer</b> teleport/route buttons — and both have an <b>advanced selector</b>: filter by kind (\u{1F34E} iPad / Samsung Galaxy Tab · MacBook / iMac &amp; Mac mini / Galaxy Book) plus the color chips, and sell a whole selection in two clicks.</li>
<li>The market stand picker got the same upgrade: <b>\u{1F4F2} A tablet</b> and <b>\u{1F4BB} A computer</b> are their own categories now with the same kind filters — no more digging through your phones.</li>
<li>\u{1F41B} FIXED: <b>market stock never went down</b> for buyers when the seller was offline — the shelves magically refilled every 5 seconds. Purchases now land in a shared SOLD ledger, so bought stock is GONE instantly for everyone, and the owner's stock count catches up the moment they collect the payment. ⚠️ Server owners: publish the updated firebase-rules.json (new "sold" section, also in FIREBASE-SETUP.md).</li></ul>
<h4>\u{1F9F0} CREATED ITEMS: YOU'RE IN CHARGE</h4><ul>
<li>Created items <b>don't activate by themselves anymore</b>: every copy you create (or buy at a market) waits as stock. Nothing happens until YOU press <b>▶️ USE</b> (or the ▶️ Do button) — and food only goes into your backpack when you \u{1F392} pack it yourself.</li></ul>
<h4>\u{1F50E} v118: SEARCH EVERYTHING + THE ⭐ ALL TAB</h4><ul>
<li>Every \u{1F381} Unbox tab has a <b>\u{1F50E} search bar</b> now — type "rainbow imac" or "glitter gold" and only the matching items show.</li>
<li>New <b>⭐ All</b> tab in Unbox: your WHOLE collection — dumplings, butter squishies, phones, consoles, tablets AND computers — in one list, perfect for searching across everything.</li>
<li>The <b>buyers got the same \u{1F50E} search bar</b>: at any dumpling / butter / phone / console / tablet / computer buyer, search an item and it gets selected for you — combine it with the filters!</li>
<li>New \u{26A1} <b>Open 1000 at a time</b> button in the Unbox menu: like OPEN ALL BOXES but it rips through 1000 boxes per batch instead of 100 — way faster on huge piles, but you need a fast computer or it will crash.</li></ul>
<h4>\u{2728} v119: THE LUXURY UPDATE</h4><ul>
<li>The ⚡ Actions button is now a <b>☰ rollable menu</b> that rolls out from the LEFT side of the screen — with its own \u{1F50E} search bar, so you find any button instantly.</li>
<li>\u{1F6CF} Bought &amp; rented places <b>stop saying FOR SALE</b>: apartments, mega mansions, family houses and building plots that belong to someone now show a golden <b>"&lt;player&gt;'s Room"</b> plaque on their sign, in the walk-up text AND at the reception.</li>
<li>New \u{1F6CF} <b>ROOMS</b> button on the \u{1F5FA} map: see EVERY player's rooms on the server — grouped per player, with a \u{1F50E} search bar — and teleport or route straight to any of them.</li>
<li>\u{2728} The whole game got a LUXURY polish: golden accents, deeper glass panels, slim gold scrollbars and a richer look on every menu.</li></ul>`},
{t:"Round 38 — ⚓🛶🚋🚇 The HARBOR, the CANAL, the TRAM & the METRO",h:`
<h4>\u{2693} v120: REAL HARBORS</h4><ul>
<li>Big <b>cargo harbors</b> where the land meets the deep sea (every ~2.6 km along the coast): a concrete quay you can walk AND drive onto, two orange gantry cranes, stacked containers, a warehouse and a big ⚓ HARBOR sign.</li>
<li>A chunky blue <b>\u{1F6A2} CARGO BOAT</b> is moored at every harbor (plus a speedboat) — press <b>F</b> to sail it!</li>
<li><b>LOAD &amp; UNLOAD cargo</b>: sail to the dock, press <b>T</b> to load up to 24 crates (they visibly stack in the cargo bay!), sail to a DIFFERENT harbor and press T to unload — <b>the farther you ship, the more you earn</b>. Your cargo is saved, even if you close the game.</li>
<li>Every harbor shows as a ⚓ dot on the \u{1F5FA} map, with a new <b>\u{2693} Nearest HARBOR</b> button.</li></ul>
<h4>\u{1F6F6} THE CANAL</h4><ul>
<li>Calm <b>canals</b> now wind east-west through the land every ~1.8 km — dug just below the water, with soft grassy banks. You can just drive (or fall) in anywhere!</li>
<li><b>Little arched stone bridges</b>: every road, highway and railway that crosses a canal rises over a small bridge with stone parapets — and your boat floats right under the arch.</li>
<li>Small boats are <b>moored along the canal</b> between the bridges — press F and float the whole canal from bridge to bridge.</li>
<li>The canal is drawn in blue on the \u{1F5FA} map &amp; minimap, and there's a <b>\u{1F6F6} Nearest CANAL</b> button.</li></ul>
<h4>\u{1F68B} THE TRAM</h4><ul>
<li>Every 6th east-west street is a <b>tram street</b>: real rails in the asphalt, overhead wire poles, and red-and-cream trams gliding up and down on the shared clock — every player sees them at the same spot!</li>
<li><b>Tram stops every 420 m</b> with a red shelter, bench and \u{1F68B} TRAM sign. When the tram waits at a stop, press <b>F</b> to hop on — it drives itself (you RIDE it, you don't drive it), and F hops off again.</li>
<li>Tram streets show as an orange line on the map, live trams as moving dots, plus a <b>\u{1F68B} Nearest TRAM stop</b> button.</li></ul>
<h4>\u{1F687} THE METRO</h4><ul>
<li>A silver <b>METRO</b> races along an <b>elevated viaduct</b> on pillars, high above the city, every ~1.9 km running north-south.</li>
<li><b>Stations every 960 m</b>: a platform at track height with a purple roof, a glowing \u{1F687} METRO sign and a long ramp you can walk OR DRIVE up (yes, you can park your car on the platform, we won't judge).</li>
<li>Press <b>F</b> when the metro stops at the platform to ride it — and F again to get off at the next station... or between stations, if you're brave enough for the jump!</li>
<li>The viaduct is drawn in purple on the map with station dots and a <b>\u{1F687} Nearest METRO station</b> button — and live metros move on the map in real time.</li></ul>`}
];
let updPage=0;
function renderUpdate(){
  const p=UPDATE_PAGES[updPage];
  $("updTitle").innerHTML="\u{1F4DC} "+p.t;
  $("updContent").innerHTML=p.h;
  $("updPage").textContent="Page "+(updPage+1)+" / "+UPDATE_PAGES.length;
  $("updPrev").disabled=updPage===0;
  $("updNext").disabled=updPage===UPDATE_PAGES.length-1;
  $("updContent").scrollTop=0;
}
$("mUpdate").onclick=()=>{updPage=0;renderUpdate();$("updModal").classList.add("open");};
$("updPrev").onclick=()=>{if(updPage>0){updPage--;renderUpdate();}};
$("updNext").onclick=()=>{if(updPage<UPDATE_PAGES.length-1){updPage++;renderUpdate();}};
$("updClose").onclick=()=>$("updModal").classList.remove("open");
/* ================= MAIN LOOP ================= */
let last=performance.now();
setTrafficCount(24);
updateChunks(6,6,true);updateLandmarks(6,6);
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min(0.05,(now-last)/1000);last=now;
  pollGamepad();
  if(S.mode!=="game"){
    setHorn(false);setRocketRumble(0);
    if(S.mode==="garage")updateGarage(dt);
    renderer.render(scene,camera);return;
  }
  setHorn(keys.h||(TOUCH.on&&TOUCH.honk>0)||(GP.active&&GP.honk));
  clockTick(dt);
  updateRent();
  let speedMS=0;
  if(player.inRocket)speedMS=Math.abs(rocket.vy)+Math.abs(rocket.hs||0);
  else if(player.inTrain)speedMS=Math.abs(player.train.speed);
  else if(player.inPlane)speedMS=Math.abs(player.planeRef.speed);
  else if(player.inBus)speedMS=Math.abs(player.bus.speed);
  else if(player.inHeli)speedMS=updateHeli(dt);
  else if(RIDE.on)speedMS=updateRide(dt);
  else if(player.transit)speedMS=player.transit.spd||0;
  else if(player.boat)speedMS=updateBoat(dt);
  else if(player.drive){
    const mcdBusy=player.drive===myVehicle&&MCD.phase!=="idle";
    speedMS=mcdBusy?Math.abs(myVehicle.speed)
      :(AUTO.on&&player.drive===myVehicle?updateAuto(dt):driveVehicle(player.drive,dt));   // McDrive lane / auto-drive
  }
  else{speedMS=SLIDE.on?updateSlide(dt):walkPlayer(dt);headLight.intensity=0;}
  if(player.inTrain){const t=player.train;player.x=railC(t.k,t.z);player.z=t.z;player.y=t.g.position.y;}
  if(player.inPlane){const p=player.planeRef;player.x=p.x;player.z=p.z;player.y=p.y;}
  if(player.inBus){const b=player.bus;player.x=b.g.position.x;player.z=b.g.position.z;player.y=b.g.position.y;}
  S.km+=speedMS*dt/1000;
  /* speed FEEL: the view widens as you go faster + wind rushes past */
  const tgtFov=62+Math.min(13,Math.max(0,speedMS-8)*0.11);
  if(Math.abs(camera.fov-tgtFov)>0.15){
    camera.fov+=(tgtFov-camera.fov)*Math.min(1,3*dt);
    camera.updateProjectionMatrix();
  }
  setWind(speedMS);
  updateFuel(dt,speedMS);
  updateCave();
  updateEngine(speedMS,!!player.drive&&player.drive.type!=="bike"&&FUEL.km>0);
  if(S.world==="earth"){
    updateEvents(dt);updatePortals(dt);
    updateTrains(dt);updatePlanes(dt);updateBuses(dt);updateTraffic(dt);solidParked();
    updatePeds(dt);updateAnimals(dt);updateDoors(dt);updateCollapses(dt);
    updateTrafficLights();updateGates(dt);
    updateCrowd(dt);updateMuseums(dt);
    updateFerries(dt);updateIslands(dt);updateOrder(dt);
    updateTransit(dt);
    updateVolcanoes(dt);updateBirds(dt);
    if(HELI.active&&!player.inHeli&&HELI.mesh)HELI.mesh.userData.rotor.rotation.y+=dt*1.5;
    water.position.x=player.x;water.position.z=player.z;   // the sea follows you
    updateFish(dt);
    clouds.forEach(c=>{
      c.position.x+=dt*2.2;
      if(c.position.x-player.x>800)c.position.x-=1600;
      if(player.x-c.position.x>800)c.position.x+=1600;
      if(c.position.z-player.z>800)c.position.z-=1600;
      if(player.z-c.position.z>800)c.position.z+=1600;
    });
  }
  updateRocket(dt);updateUfos(dt);updateMc(dt);
  updateJob(dt);updatePet(dt);updateRaceMP();updateVisit(dt);updateMarketVisit(dt);updateFishing(dt);
  updateHunger(dt);updateMcd(dt);
  updateSiren(dt);updateTouch(dt);
  updateSky(player.x,player.z);
  updateWeather(dt);updateGrass(now);updateSand(dt,now);updateTreasure(dt);updateAch(dt);updateTv(dt);updateMidi();
  updateChunks(player.x,player.z);
  updateLandmarks(player.x,player.z);
  updateCamera(dt);
  /* HUD */
  const hh=Math.floor(CLOCK.min/60),mm=Math.floor(CLOCK.min%60);
  $("clockTime").textContent=(hh<10?"0":"")+hh+":"+(mm<10?"0":"")+mm+(isNight()?" \u{1F319}":" \u2600\uFE0F");
  $("clockDay").textContent=weekday()+" \u00b7 Day "+CLOCK.day+" \u00b7 5 min / real second";
  $("odoKm").textContent="total "+S.km.toFixed(2)+" km";
  $("spdVal").textContent=Math.round(uConv(speedMS*3.6));
  const limT=player.inRocket?"rocket":(player.inTrain?"train":(player.inPlane?"plane":(player.inBus?"bus":"car")));
  $("spdLim").textContent="limit "+Math.round(uConv(limitFor(limT)))+" "+uLabel();
  /* fuel gauge (cars & motorcycles only) */
  if(fuelVehicle()){
    $("fuelWrap").style.display="flex";
    const f=FUEL.km/FUEL.cap;
    $("fuelFill").style.width=Math.round(f*100)+"%";
    $("fuelFill").style.background=f<0.1?"#ff5d5d":(f<0.3?"#ffb02e":"#4ade80");
    $("fuelTxt").textContent="⛽ "+Math.round(FUEL.km)+" km";
  }else $("fuelWrap").style.display="none";
  if(player.inPlane){$("spdAlt").style.display="block";$("spdAlt").textContent="alt "+Math.round(player.planeRef.y)+" m";}
  else if(player.inRocket){$("spdAlt").style.display="block";$("spdAlt").textContent="alt "+Math.round(rocket.y)+" m";}
  else $("spdAlt").style.display="none";
  FPS.frames++;FPS.t+=dt;
  if(FPS.t>=0.5){FPS.val=Math.round(FPS.frames/FPS.t);FPS.frames=0;FPS.t=0;}
  $("fpsCoord").textContent=(FPS.val?FPS.val:"–")+" fps · \u{1F4CD} "+Math.round(player.x)+", "+Math.round(player.z);
  updateHint();
  updateNav();updateRace(dt);updateMini(dt);updateHeld();updateCompass();
  mpTick(dt);
  autoSave(dt);
  renderer.render(scene,camera);
}
/* ================= AUTO-UPDATE: everyone always plays the newest version =================
   every minute we peek at index.html on the server — if the version number
   went up, show "Refresh for new update" and auto-refresh after 30 seconds */
/* GAME_V lives in core.js — it's also shown in the menu header */
let _updSeen=false;
async function checkUpdate(){
  if(_updSeen)return;
  try{
    const r=await fetch("index.html",{cache:"no-store"});
    if(!r.ok)return;
    const m=(await r.text()).match(/js\/core\.js\?v=(\d+)/);
    if(m&&parseInt(m[1],10)>GAME_V){
      _updSeen=true;
      toast("\u{1F195} NEW UPDATE! Refresh for new update — auto-refreshing in 30 seconds...");
      setTimeout(()=>{
        try{saveGame();}catch(e){}
        location.reload();
      },30000);
    }
  }catch(e){}
}
setTimeout(checkUpdate,15000);
setInterval(checkUpdate,60000);
renderMenu();
requestAnimationFrame(frame);
