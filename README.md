# Daily — personal dashboard

A one-page start-of-the-day dashboard with six tabs, colour schemes (Aurora, Volt, Sunset, Ocean, Pastel, plus seasonal themes), light/dark mode and smooth animations.
It's plain HTML, CSS and JavaScript with no build step and no dependencies. Your data stays in your browser's local storage.

| Tab | What's on it |
|---|---|
| **Home** | **Air & pollen** for your town (European air-quality index, birch/alder/grass/mugwort/ragweed/olive pollen with a 3-day outlook, warnings for *your* allergies) · Greeting, date, ISO week, live clock, sunrise/sunset, year progress · weather for Westerlo (now, a rain tip, 24 h hourly, 7-day forecast) · news feed (5 headlines at a time from VRT NWS, HLN, Sporza, BBC World; add your own RSS feeds) · snapshot tiles (calories, steps, active minutes this week from workouts + Strava, water) · "Today's focus" task list (unfinished tasks carry over) · "Up next" from the calendar (including Google Calendar and planned workouts) |
| **Health** | **Home workouts** (from My workout): weekly sessions vs goal, minutes, calories, total active minutes incl. Strava, 12-week chart, session history · **Strava**: this week's totals, year-to-date totals, a 12-week distance chart, recent activities with pace/HR, and sport filters · **Samsung Health**: CSV import (steps, weight, sleep, heart rate) · manual log · step and weight goals · 14-day steps chart and 90-day weight trend |
| **My workout** | 90 home exercises (bodyweight, resistance band, chair, wall, dumbbells) for every muscle group — filter the library by category, equipment or **muscle** (chest, back, shoulders, arms, abs, obliques, glutes, quads, hamstrings, inner/outer thighs, calves & shins, hips), each with an animated figure, steps, tips and a video link (or your own YouTube/GIF link) · ready-made routines (7-Minute Classic, HIIT, Core, Lower body, Upper body, Band Strength, Head to Toe, Mobility) · **🎲 Random workout**: pick a duration, focus (body part or muscle), level, style and the equipment you have, and get a balanced routine that fits the time — shuffle again, start it or save it · a routine builder (rounds, rest, time or reps per exercise, each side, drag to reorder) · custom exercises · a full-screen guided player with countdown ring, rest timers, beeps, voice coach, pause/skip/+10 s, keyboard shortcuts and screen wake-lock · a finish screen with calories, a rating and optional Strava upload · weekly goal and streak · **multi-week programmes** (Bodyweight Basics, Strength Builder, Core 30, HIIT Burn, Band Builder, or build your own from your routines, or let **🎲 Random programme** create one from a session length, split, level and your equipment) with weekly progression, your own training days, a week-by-week plan and calendar integration |
| **Board** | **Kanban board**: columns you can add, rename, colour and reorder; drag cards with the mouse or (long-press) on your phone; labels, notes and checklists; due dates appear in the calendar in the card's label colour (click to open the card), and overdue cards show first under "Up next" · **Notes**: pinned and coloured notes with search, headings, lists and tick-able checklists, autosaved |
| **Calendar** | Month view with events, tasks (checkable) and birthdays (yearly, shows the age) · weekly, monthly and yearly repeats · Belgian public holidays · **live Google Calendar** (all your calendars, incl. birthdays, in their own colours) · `.ics` import · next 30 days and upcoming birthdays |
| **Diet** | Calorie and macro counter per day (breakfast, lunch, dinner, snacks) · built-in list of ~90 common (Belgian) foods · **Open Food Facts** online search · **barcode scanning with your phone camera** · quick add · "my foods" · recent foods · copy a meal from yesterday · water · targets with a BMR/TDEE calculator · 7/14/30-day chart with a target line · averages and a logging streak · full history and CSV export |

## Running it

**Simplest: GitHub Pages.** Go to the repo's *Settings → Pages* and pick this branch with `/ (root)`.
The dashboard is then at `https://<user>.github.io/<repo>/`. Set that page as your browser's home page or new-tab page.

**Locally:**

```bash
python3 -m http.server 8080   # then open http://localhost:8080
```

Opening `index.html` directly (`file://`) works too, but Strava login needs http(s).

## Everyday extras

- **Morning briefing** on the Home header: weather, events, birthdays, planned workouts, pollen and open tasks in a few sentences. Press 🔊 to have it read aloud.
- **Customise home** (▦ button on the header): show, hide and reorder every card, and choose left or right column.
- **Habits & mood**: daily check-ins with streaks (water and "workout or 10k steps" tick themselves), a mood picker with a one-line note, and 15-week heatmaps plus a mood trend in Health.
- **Focus timer** (Pomodoro) linked to your tasks, with a floating timer pill on other tabs and the time in the browser tab.
- **Intermittent fasting** timer in Diet (12:12 to 24 h), with recent fasts.
- **Daily dose**: quote of the day (incl. Dutch proverbs) and "On this day" from Wikipedia.
- **Your week** (📊 on the header): a story-style weekly review across workouts, food, body, habits, mood and focus — shareable.
- **Quick actions**: press <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>K</kbd> or <kbd>/</kbd> (or the 🔍 button) to jump anywhere, start a routine, log water or weight, check a habit, start focus/fasting — or just type “call mum” to add it as a task. Press <kbd>?</kbd> for all shortcuts.
- **Reminders** (Settings): events, planned workouts, water, fasting goal and focus/break ends as notifications while the app is open or in the background.
- **Dark after sunset** theme, haptic feedback, swipe between tabs (and months in the calendar), pull down on Home to refresh, smooth page transitions and an offline indicator.
- **Integrations**: a 🎵 button in the workout player opens your Spotify/YouTube Music/Apple Music playlist; planned workouts and events can be copied to Google Calendar in one tap.

## Game: XP, levels and badges

Everything you log earns XP: workouts (more for longer workouts and programme sessions), Strava activities, habits, food and water days, focus sessions, fasts and finished tasks/cards. Your level and title (Rookie → Mover → … → Legend) show on the Home header and at the top of *My workout*, together with 147 badges in bronze, silver, gold and epic — from *First sweat* and *Early bird* to *Habit master* and *Iron will*. New badges and level-ups pop up with a little celebration; the 🏆 button shows all badges with your progress.

XP is calculated from your data, so it also counts everything you did before this feature, and it's the same on every synced device.

### 🎁 Rewards (the Locker)

Every badge unlocks a reward you can switch on in the **Locker** (🎁 button in *My workout*, or <kbd>Ctrl</kbd>+<kbd>K</kbd> → "Locker"):

| Type | Rewards (badge that unlocks it) |
|---|---|
| Site themes | Neon (Ten down) · Ember (On a roll) · Forest (Habit week) · Lagoon (Hydration hero) · Candy (Goal getter) · Midnight (Half century) · Zen (Steady faster) · Royal (Royalty) · Gold Rush (Centurion) · Obsidian (Iron will) |
| Celebrations | Emoji burst (First sweat) · Shooting stars (Early bird) · Fireworks (Unstoppable) · Hearts (Perfect day) · Fruit salad (Nutrition nerd) |
| Header effects | Night sky (Night owl) · Bubbles (Deep work) · Fireflies (Sixteen) · Sparkles (Rising star) · Aurora (Graduate) · Digital rain (Flow state) · Meteor shower (Long haul) |
| Workout player skins | Galaxy (Hour power) · Lava (Furnace) · Deep ocean (Time served) · Synthwave (Road warrior) |
| Cursor trails | Sparkle (Food logger) · Rainbow (Perfect ten) · Comet (Shipper) |
| Level frames | Flame (Habit master) · Legend (Legend) |
| Mole outfits | Superhero cape (Double century) · Sweatband (Weekend warrior) · Cool shades (Lunch break) · Headphones (In the zone) · Party hat (Note taker) · Crown (Hero) · Wizard hat (Collector) |
| Sound packs | 8-bit (Mix it up) · Arcade (Tracked) · Wind chimes (Whale) |
| Fonts | Rounded (Planner) · Monospace (Productivity machine) · Editorial serif (Food historian) |
| Card styles | Glass (In touch) · Outline (Night fast) · Clay (Triple graduate) |
| Titles | Inferno (Inferno) · Habit Legend (Diamond habit) · Mythic Mole (Mythic) — shown next to your name and level |
| More of the above | Sunrise theme (Morning person) · Lightning confetti (Lightning streak) · Borealis player skin (Explorer) · Heart trail (Centred) |

**Third wave: milestone ladders.** Badges now come in short steps — e.g. workouts at 1, 5, 10, 25, 50, 75, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 750 and 1,000; levels 2, 3, 5, 7, 10, 12, 15, 20, 25, 30, 35, 40 and 50; plus ladders for streaks, minutes, calories, weekly goals, Strava, habits, perfect days, mood, food, water, focus, fasting, the board and badge collecting. Each one unlocks something new:

| Type | Rewards (badge that unlocks it) |
|---|---|
| Ester’s costumes | Cosy beanie (Getting started) · Top hat (150 club) · Viking helmet (Spartan) · Space helmet (750 club) · Hard hat (Habit formed) · Little horns (Supernova) · Graduation cap (Consistent) · Cowboy hat (Explorer) · Daisy (Seedling) · Flower crown (Two weeks strong) · Bow tie (Bullseye month) · Chef hat (Meal tracker) · Detective hat (Spotlight) · Monocle & moustache (Wise owl) · Cat ears (Patience) · Bunny ears (Done & dusted) · Ninja band (Delivery) · Pirate hat (Author) · Scarf (Organiser) · Halo (Oracle) |
| Site themes | Mint (Quarter century) · Cyberpunk (250 club) · Coffee (Clockwork) · Citrus (Steam engine) · Arctic (Half a year) · Deep Sea (Thousand km) · Sakura (Deep roots) · Grape (Self-aware) · Slate (Discipline) · Rose (Hoarder) |
| Backgrounds (new) | Topographic (350 club) · Diagonal stripes (Double goal) · Blueprint grid (Globetrotter) · Waves (Dolphin) · Paw pattern (First focus) · Confetti dots (Archivist) · Polka dots (Sprout) · Starfield (Orbit) |
| XP bars (new) | Candy stripes (Seventy-five) · Rainbow bar (Hundred minutes) · Neon bar (Flawless fifty) · Gold bar (Month of meals) · Fire bar (Volcanic) |
| Ester’s jokebooks (new) | Drill sergeant (Pizza burner) · Deep thoughts (Check-in) · Mole facts (Bookworm) · Pun-derground (Hatched) · Pirate talk (Starter pack) |
| Celebrations | Balloons (Ten-day fuse) · Snowflakes (High five) · Autumn leaves (Fortnight fed) · Gold coins (Lucky seven) |
| Header effects | Bokeh lights (450 club) · Snowfall (Satellite) · Balloons (Second semester) · Gentle rain (Rainmaker) · Lanterns (Twenty hours) |
| Workout player skins | Enchanted forest (600 club) · Beach sunset (Feature length) · Cosmos (Century ride) |
| Cursor trails | Paw prints (Warming up) · Fire trail (Kindling) · Star trail (Road tripper) · Bubble trail (Splash) |
| Level frames | Diamond frame (400 club) · Neon frame (Full moon) · Rainbow frame (Solar flare) · Laurel frame (Hundred tracked) · Ice frame (Full-day fast) |
| Fonts | Handwritten (Food diary) · Retro (Hundred hours) · Grotesk (Climber) |
| Card styles | Paper (A quarter) · Neon edges (Big brain) · Soft gradient (Writer) |
| Sound packs | Marimba (Time keeper) · Bubbles (Signal strong) |
| Titles | Iron Mole (Five hundred) · Immortal (One thousand) · Unbreakable (Comet streak) · Time Lord (Ten thousand) · Year-Rounder (Full year) · Professor Mole (Professor) · Monk (Mountain habit) · Living Legend (Every single day) · Perfectionist (Perfectionist) · Gourmet (Year of meals) · Aquamole (Ocean) · Zen Master (Master of fasting) · Architect (Builder) · Grandmaster (Grandmaster) · Curator (Curator) · Keymaster (Keymaster) |

The Locker has filter chips (per type, or *✓ Unlocked* only) and the 🏆 Achievements list can show *Unlocked* or *To do* badges.

147 badges and 147 rewards in total. When you earn a badge, its popup has a **Use it** button. Unlocked themes also appear in *Settings → Colour scheme*; locked ones show how to earn them.

## Ester the Child Mole 🐾

**Guided tour.** On your first visit Ester climbs out of the ground and walks you through the dashboard: a spotlight on each part (tabs, the Home header, weather, tasks, habits, Health, XP & the Locker, workouts, the Board, Calendar, Diet, Settings and the molehill), with *Back*, *Next* and **Skip tour** (or <kbd>Esc</kbd>, arrow keys). Between stops Ester turns around — yes, you get to see the butt, with a wiggle and a wagging tail — and waddles to the next spot; at the end Ester dives back into the molehill. Take it again from Ester's menu (🧭 Take the tour), <kbd>Ctrl</kbd>+<kbd>K</kbd> or *Settings → Phone app*.

Ester lives in the bottom-right corner, peeking out of the molehill, breathing and blinking, following your mouse with both eyes, waving when you hover, digging when you switch pages, cheering when you celebrate, now and then burrowing into the molehill and popping right back out, and sleeping at night (23:00–06:00). Once a day Ester greets you with the first line of your briefing.

Tap Ester for the menu (“Child Mole Ester”): your status for today, a search box (pages, routines, exercises, habits and typed commands like “call mum”), buttons for every page and quick actions — +1 water, add a task, start focus, start your workout or next programme session, new note, scan food, read the briefing, your week and the Locker. Dress Ester up with outfits from the Locker; on Christmas, Halloween and your birthday Ester dresses up without any help.

Every few minutes Ester says something — “Holy Mole-y!”, puns and more; tap **💬 Say something** in the menu for one on demand. Unlock jokebooks (Pun-derground, Drill sergeant, Deep thoughts, Mole facts, Pirate talk) in the Locker to add more lines. 31 costumes, from a Viking helmet to a space helmet.

Don't tap Ester five times in a row… grumpy moles throw mud at your screen (it washes off after a few seconds).

## Spotify

The *Spotify* card on Home shows what's playing (cover, progress, device) with shuffle / previous / play-pause / next, and a mini player appears in the workout player.
Setup: create an app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard), add the dashboard's address as Redirect URI, tick *Web API*, and paste the **Client ID** in *Settings → Spotify* (no secret needed). Controlling playback requires Spotify Premium; showing what's playing works with any account.

## Seasonal themes

Pick *Seasonal (auto)* in *Settings → Colour scheme* to follow the seasons (autumn, winter, spring, summer — or pick one yourself). The header gets falling leaves, snow, petals or summer sparkles, and special days get a touch of their own: Sinterklaas, Christmas, New Year, Valentine's Day, Easter, the Belgian National Day, Halloween — and your birthday (*Settings → Your birthday*).

## Updates

*Settings → Phone app* shows the **app version** (now v14) and a **↻ Check for update** button. After a push it takes GitHub Pages a minute or two to publish, and up to 10 minutes before every device sees the new files; the button fetches a fresh copy straight away.

## Install it as an app on your phone

Open the dashboard's https address on your phone, then:

- **Android (Chrome):** menu ⋮ → **Install app** (or use *Settings → Phone app → Install* in the dashboard).
- **iPhone (Safari):** Share button → **Add to Home Screen**.

It then opens full-screen with a bottom tab bar, has its own icon and shortcuts, and works offline (weather/news need a connection).

## Google Calendar + sync between laptop and phone

One Google connection gives you both:

- your **Google Calendar** events and birthdays in the Calendar tab and under "Up next";
- **sync**: everything you log (food, workouts, programmes, health, tasks, events, settings) is kept in a private, hidden *app data* file in **your own Google Drive**. Only this app with your login can read it. Changes sync a few seconds after you make them, when you reopen the app, and every 5 minutes. If both devices changed the same thing, the versions are merged so nothing gets lost.

Strava, Google and Spotify credentials are never synced — connect each device once.

One-time setup (about 5 minutes; the same steps are in *Settings → Google Calendar & sync*):

1. Create a project in the [Google Cloud Console](https://console.cloud.google.com/projectcreate).
2. Enable the **Google Calendar API** and the **Google Drive API**.
3. *Google Auth Platform → Branding / Audience*: choose **External**, enter an app name and your email, then **Publish app**. (In "testing" mode Google signs you out every 7 days.) When you sign in you'll see an "unverified app" warning — it's your own app, so choose *Advanced → Go to …*.
4. *Clients → Create client → Web application*, with **Authorised redirect URI** = the dashboard's exact address (shown in Settings, e.g. `https://<you>.pages.dev/`).
5. Paste the Client ID and Client secret in *Settings → Google Calendar & sync* and press **Connect Google**. Repeat the Connect step on your phone.

## Connecting Strava

1. Create a free API app at <https://www.strava.com/settings/api>.
2. Set **Authorization Callback Domain** to the host you serve the dashboard from: `<user>.github.io`, or `localhost` when running it locally.
3. In the Health tab, paste the Client ID and Client Secret and press **Connect with Strava**.

Tokens refresh automatically. If you want finished home workouts uploaded to Strava, connect (or reconnect) after this update so the app gets permission to write activities. The dashboard re-syncs when you open the Health tab and the last sync is more than 30 minutes old. Credentials stay in this browser and are never written to backups.

## Samsung Health

Samsung Health has no public web API. To get your data in:

1. In the Samsung Health app, open **⋮ → Settings → Download personal data**.
2. Copy the CSV files to your computer.
3. Drop them on the Health tab.

The dashboard recognises step, weight, sleep and heart-rate files. You can also log values by hand.
(A live sync would need an Android app that reads Health Connect, which a web page can't do.)

## How the tabs connect

- Finished workouts appear in **Health**, the **Home** "Active this week" tile, the **Calendar** (as completed entries), and **Diet** (calories burned that day).
- From a routine you can **plan** a workout in the calendar (once or weekly). On that day it shows a ▶ Start button in the calendar and appears under "Up next" on Home.

## Data and backups

Everything lives in `localStorage` in the browser you use. Use **Settings → Download backup** to save it, and **Restore backup** to move it to another device or browser.

## Roadmap ideas

- Real push notifications when the app is closed (needs a small push server)
- Recipes and meal plans with a shopping list
- Body measurements and progress photos

## Data sources

- Weather and place search: [Open-Meteo](https://open-meteo.com) (no API key needed)
- "On this day": [Wikipedia REST API](https://en.wikipedia.org/api/rest_v1/)
- Air quality & pollen: [Open-Meteo Air Quality](https://open-meteo.com/en/docs/air-quality-api) (Copernicus CAMS)
- Food database: [Open Food Facts](https://world.openfoodfacts.org) · barcode reading: the browser's BarcodeDetector or [ZXing](https://github.com/zxing-js/library)
- News: RSS fetched through public CORS proxies (rss2json, allorigins, corsproxy.io, tried in that order), with a 20-minute cache
