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
4. Open the **Rules** tab of the database, replace everything with this, and click **Publish**:

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
           "$other": { ".validate": false }
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
             "t": { ".validate": "newData.isNumber()" },
             "$other": { ".validate": false }
           }
         }
       },
       "usernames": {
         "$name": {
           ".read": true,
           ".write": "!data.exists()",
           ".validate": "newData.hasChildren(['t','name'])",
           "t": { ".validate": "newData.isString() && newData.val().length <= 40" },
           "name": { ".validate": "newData.isString() && newData.val().length >= 3 && newData.val().length <= 16" },
           "created": { ".validate": "newData.isString() && newData.val().length <= 10" },
           "$other": { ".validate": false }
         }
       }
     }
   }
   ```

   These rules mean: anyone can read the server list and add a server, but **nobody can
   edit or delete existing servers**, and names are capped at 20 characters. The `players`
   part is what lets players **see each other driving around**: everyone in a world
   broadcasts their position there a few times per second. The `usernames` part makes
   usernames **unique**: the first player to claim a name owns it (each device saves a
   secret token, so nobody can take a name that's already claimed).

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
