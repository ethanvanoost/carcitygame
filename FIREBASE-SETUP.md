# Online server list with Firebase — one-time setup (free, ~5 minutes)

The game's 🌐 Servers tab stores its shared server list in a free Firebase database.
Until you finish these steps the tab shows "🔴 Offline" and servers only save on your own device.

Firebase is Google's free database. The **Spark plan is $0, needs no credit card, and never
upgrades itself** — you only need a normal Google account (a Gmail login works).

## Steps

1. Go to https://console.firebase.google.com and sign in with your Google account.
2. Click **Create a project** (or "Add project"). Name it e.g. `vc4-servers`.
   You can turn **off** Google Analytics when it asks — you don't need it. Wait for it to finish.
3. In the left menu: **Build → Realtime Database → Create database**.
   - Location: pick `europe-west1` (Belgium — closest to you).
   - Security rules: choose **locked mode** (we replace the rules next).
4. Open the **Rules** tab of the database, replace everything with this, and click **Publish**.
   (Tip: the exact same rules are also in the file `firebase-rules.json` — copy the whole file!)

   ```json
   {
     "rules": {
       "servers": {
         ".read": true,
         "$id": {
           ".write": "!data.exists()",
           ".validate": "newData.hasChildren(['name','created'])",
           "name": { ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 20" },
           "created": { ".validate": "newData.isString() && newData.val().length <= 10" },
           "owner": { ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 16" },
           "$other": { ".validate": false }
         }
       },
       "worldtime": {
         "$world": {
           ".read": true,
           ".write": true,
           ".validate": "newData.hasChildren(['skew'])",
           "skew": { ".validate": "newData.isNumber()" },
           "by": { ".validate": "newData.isString() && newData.val().length <= 16" },
           "ts": { ".validate": "newData.isNumber()" },
           "$other": { ".validate": false }
         }
       },
       "mod": {
         "$world": {
           "$player": {
             ".read": true,
             ".write": true,
             ".validate": "newData.hasChildren(['ts'])",
             "kick": { ".validate": "newData.isNumber()" },
             "until": { ".validate": "newData.isNumber()" },
             "by": { ".validate": "newData.isString() && newData.val().length <= 16" },
             "ts": { ".validate": "newData.isNumber()" },
             "$other": { ".validate": false }
           }
         }
       },
       "players": {
         "$world": {
           ".read": true,
           "$id": {
             ".write": true,
             ".validate": "newData.hasChildren(['x','z','n'])",
             "n": { ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 16" },
             "x": { ".validate": "newData.isNumber()" },
             "y": { ".validate": "newData.isNumber()" },
             "z": { ".validate": "newData.isNumber()" },
             "r": { ".validate": "newData.isNumber()" },
             "f": { ".validate": "newData.isNumber()" },
             "v": { ".validate": "newData.isString() && newData.val().length <= 8" },
             "c": { ".validate": "newData.isNumber()" },
             "av": { ".validate": "newData.isString() && newData.val().length <= 64" },
             "t": { ".validate": "newData.isNumber()" },
             "$other": { ".validate": false }
           }
         }
       },
       "usernames": {
         "$name": {
           ".read": true,
           ".write": "!data.exists() || data.child('t').val() === newData.child('t').val()",
           ".validate": "newData.hasChildren(['t','name'])",
           "t": { ".validate": "newData.isString() && newData.val().length <= 40" },
           "name": { ".validate": "newData.isString() && newData.val().length >= 3 && newData.val().length <= 16" },
           "created": { ".validate": "newData.isString() && newData.val().length <= 10" },
           "p": { ".validate": "newData.isString() && newData.val().length <= 64" },
           "$other": { ".validate": false }
         }
       },
       "profiles": {
         "$name": {
           ".read": true,
           ".write": "!data.exists() || data.child('t').val() === newData.child('t').val()",
           ".validate": "newData.hasChildren(['t','v'])",
           "t": { ".validate": "newData.isString() && newData.val().length <= 40" },
           "name": { ".validate": "newData.isString() && newData.val().length <= 16" },
           "v": { ".validate": "newData.isNumber()" },
           "own": { ".validate": "newData.isString() && newData.val().length <= 12000" },
           "$other": { ".validate": false }
         }
       },
       "chat": {
         ".read": true,
         "$id": {
           ".write": "!data.exists() || (!newData.exists() && data.child('t').val() < now - 300000)",
           ".validate": "newData.hasChildren(['n','m','t'])",
           "n": { ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 16" },
           "m": { ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 200" },
           "t": { ".validate": "newData.isNumber()" },
           "$other": { ".validate": false }
         }
       },
       "claims": {
         "$world": {
           "$prop": {
             ".read": true,
             ".write": "!data.exists() || data.child('t').val() === newData.child('t').val() || data.child('free').val() === true",
             ".validate": "newData.hasChildren(['t','n','ts'])",
             "t": { ".validate": "newData.isString() && newData.val().length <= 40" },
             "n": { ".validate": "newData.isString() && newData.val().length <= 16" },
             "ts": { ".validate": "newData.isNumber()" },
             "free": { ".validate": "newData.isBoolean()" },
             "furn": { ".validate": "newData.isString() && newData.val().length <= 6000" },
             "shop": { ".validate": "newData.isNumber() && newData.val() >= 1 && newData.val() <= 100" },
             "mkt": { ".validate": "newData.isString() && newData.val().length <= 100000" },
             "$other": { ".validate": false }
           }
         }
       },
       "shopdesigns": {
         "$name": {
           ".read": true,
           "$slot": {
             ".write": "!data.exists() || data.child('t').val() === newData.child('t').val()",
             ".validate": "newData.hasChildren(['t','ts'])",
             "t": { ".validate": "newData.isString() && newData.val().length <= 40" },
             "ts": { ".validate": "newData.isNumber()" },
             "data": { ".validate": "newData.isString() && newData.val().length <= 100000" },
             "$other": { ".validate": false }
           }
         }
       },
       "markets": {
         "$world": {
           ".read": true,
           "$prop": {
             ".write": true,
             ".validate": "newData.hasChildren(['o','x','z','ts'])",
             "n": { ".validate": "newData.isString() && newData.val().length <= 24" },
             "o": { ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 16" },
             "x": { ".validate": "newData.isNumber()" },
             "z": { ".validate": "newData.isNumber()" },
             "ts": { ".validate": "newData.isNumber()" },
             "$other": { ".validate": false }
           }
         }
       },
       "pianolock": {
         "$world": {
           "$piano": {
             ".read": true,
             ".write": "!data.exists() || data.child('t').val() === newData.child('t').val() || data.child('free').val() === true || data.child('ts').val() < now - 900000",
             ".validate": "newData.hasChildren(['t','n','ts'])",
             "t": { ".validate": "newData.isString() && newData.val().length <= 40" },
             "n": { ".validate": "newData.isString() && newData.val().length <= 16" },
             "ts": { ".validate": "newData.isNumber()" },
             "free": { ".validate": "newData.isBoolean()" },
             "$other": { ".validate": false }
           }
         }
       },
       "payments": {
         "$name": {
           ".read": true,
           "$id": {
             ".write": "!data.exists() || !newData.exists()",
             ".validate": "newData.hasChildren(['from','amt','ts'])",
             "from": { ".validate": "newData.isString() && newData.val().length <= 16" },
             "amt": { ".validate": "newData.isNumber() && newData.val() >= 1 && newData.val() <= 1000000000" },
             "ts": { ".validate": "newData.isNumber()" },
             "d": { ".validate": "newData.isString() && newData.val().length <= 80" },
             "$other": { ".validate": false }
           }
         }
       },
       "guestbook": {
         "$world": {
           "$prop": {
             ".read": true,
             "$id": {
               ".write": "!data.exists()",
               ".validate": "newData.hasChildren(['n','m','ts'])",
               "n": { ".validate": "newData.isString() && newData.val().length <= 16" },
               "m": { ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 100" },
               "ts": { ".validate": "newData.isNumber()" },
               "$other": { ".validate": false }
             }
           }
         }
       },
       "races": {
         "$world": {
           "$flag": {
             ".read": true,
             ".write": "!data.exists() || data.child('ts').val() < now - 240000",
             ".validate": "newData.hasChildren(['ts','seed','n'])",
             "ts": { ".validate": "newData.isNumber()" },
             "seed": { ".validate": "newData.isNumber()" },
             "n": { ".validate": "newData.isString() && newData.val().length <= 16" },
             "$other": { ".validate": false }
           }
         }
       },
       "raceent": {
         "$world": {
           "$flag": {
             ".read": true,
             "$p": {
               ".write": "!data.exists() || data.child('ts').val() < now - 240000",
               ".validate": "newData.hasChildren(['n','ts'])",
               "n": { ".validate": "newData.isString() && newData.val().length <= 16" },
               "ts": { ".validate": "newData.isNumber()" },
               "$other": { ".validate": false }
             }
           }
         }
       },
       "racewin": {
         "$world": {
           "$id": {
             ".read": true,
             ".write": "!data.exists()",
             ".validate": "newData.hasChildren(['n','ts'])",
             "n": { ".validate": "newData.isString() && newData.val().length <= 16" },
             "ts": { ".validate": "newData.isNumber()" },
             "$other": { ".validate": false }
           }
         }
       },
       "treasure": {
         "$world": {
           "$day": {
             ".read": true,
             ".write": "!data.exists()",
             ".validate": "newData.hasChildren(['n','ts'])",
             "n": { ".validate": "newData.isString() && newData.val().length <= 16" },
             "ts": { ".validate": "newData.isNumber()" },
             "$other": { ".validate": false }
           }
         }
       },
       "board": {
         "$week": {
           ".read": true,
           "$id": {
             ".write": "!data.exists() || data.child('t').val() === newData.child('t').val()",
             ".validate": "newData.hasChildren(['t','n','money'])",
             "t": { ".validate": "newData.isString() && newData.val().length <= 40" },
             "n": { ".validate": "newData.isString() && newData.val().length <= 16" },
             "money": { ".validate": "newData.isNumber()" },
             "km": { ".validate": "newData.isNumber()" },
             "wins": { ".validate": "newData.isNumber()" },
             "ts": { ".validate": "newData.isNumber()" },
             "$other": { ".validate": false }
           }
         }
       }
     }
   }
   ```

   These rules mean: anyone can read the server list and add a server, but **nobody can
   edit or delete existing servers**, and names are capped at 20 characters. Servers now
   also record their **creator** (`owner`) — the game shows it under every server and the
   creator gets the 👑 owner powers. The `worldtime` part stores the **owner's day & time**
   for a world so everyone in it sees the same clock jump; the `mod` part stores **kicks
   and bans** (`until` = timestamp the ban ends, a far-future value = banned forever) —
   the game only shows the kick/ban buttons to the world owner. ⚠️ If you pasted an older
   version of these rules, paste this new version and hit **Publish** — otherwise server
   creators, kicks/bans and the owner clock won't work. The `players`
   part is what lets players **see each other driving around**: everyone in a world
   broadcasts their position there a few times per second. The `usernames` part makes
   usernames **unique**: the first player to claim a name owns it (each device saves a
   secret token, so nobody can take a name that's already claimed). The `profiles` part
   stores each player's **money and bought vehicles on their username**, so your progress
   follows you to any device where you claim your name: only the device that owns the
   username's secret token can update its profile (everyone may read it, nobody else can
   write it). The `chat` part is
   the **public chat**: anyone can post (max 200 characters), nobody can edit
   other people's messages, and messages **auto-delete after 5 minutes** (the game
   cleans up any message older than that; the rules only allow deleting old messages,
   never fresh ones). The `claims` part makes every **apartment and mansion have ONE
   owner per world**: whoever buys or rents it first claims it with their device's
   secret token, and only that owner can ever change or release the claim (a claim
   is freed automatically when a renter can't pay the rent anymore). The `pianolock`
   part locks a **concert piano while a player is giving a concert** — only the
   concert giver can play until they end the concert; a lock left behind by a
   crashed game frees itself after 15 minutes. (The `p` field in `usernames` is a
   leftover from an old password system that has been removed — the rules keep
   accepting it so old accounts stay valid, but the game no longer uses it.)
   The `payments` part is the **pay-a-player inbox**:
   anyone can drop a payment into someone's inbox (amount 1 to 1 billion), and the
   game collects and deletes them within seconds — a payment can also carry a
   **dumpling gift** (`d`), or a **world invite** (`d` = `INV|kind|worldname`, sent
   from the 🌍 Worlds tab): the invited player gets a notification the moment they
   play and the world appears in their "Shared with me" list. Invites reuse this
   existing inbox, so **no rules change is needed** for them. Claims now also carry the mansion's **furniture layout**
   (`furn`) and **dumpling shop price** (`shop`), so other players see your mansion
   exactly how you decorated it and can buy from your stall. The `guestbook` part
   lets visitors write one-line messages at a mansion (create-only, max 100
   characters). The `races` / `raceent` / `racewin` parts run **multiplayer races**:
   a race per flag (replaceable after 4 minutes), an entrant list, and a
   create-only winner record — the first player to write it takes the pot.
   The `treasure` part records the **first finder of each daily treasure**
   (create-only, one record per world per day). The `board` part is the
   **weekly leaderboard & tournament**: each player updates their own row (guarded
   by their token) with their money, kilometers and race wins; a new week starts a
   fresh board, and the #1 player gets a golden crown in the game.
   ⚠️ **IMPORTANT (leaderboard fix):** the `".read": true` line must sit at the
   `$week` level (as shown above), NOT inside `$id` — otherwise the game cannot
   read the list and the leaderboard always looks empty. If your leaderboard is
   empty, re-paste these rules and hit **Publish**.

   > Already pasted an older version of the rules? Paste this new version over the old
   > ones and hit **Publish** again — otherwise multiplayer and username claiming
   > won't work.

5. Go to the **Data** tab and copy the database URL shown at the top. It looks like:
   `https://vc4-servers-default-rtdb.europe-west1.firebasedatabase.app`
6. Open `js/game.js`, find this line near the "servers tab" comment:

   ```js
   const SERVER_API="https://vc4-servers.YOUR-PROJECT.firebasedatabase.app";
   ```

   Replace the URL with yours (no slash at the end). Upload / push the game. Done!

## Test it

Open `YOUR-DATABASE-URL/servers.json` in a browser — you should see `null` (empty list).
Then open the game's 🌐 Servers tab: it should say "🟢 Online". Create a server and
refresh that browser tab — your server appears in the database.

Free (Spark) plan limits — far more than this game needs: 1 GB storage, 10 GB download/month,
100 simultaneous connections.
