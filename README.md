# Daily — personal dashboard

A one-page start-of-the-day dashboard with pastel accents, light/dark mode, and four tabs.
It's plain HTML, CSS and JavaScript with no build step and no dependencies. Your data stays in your browser's local storage.

| Tab | What's on it |
|---|---|
| **Home** | Greeting, date, ISO week, live clock, sunrise/sunset, year progress · weather for Westerlo (now, a rain tip, 24 h hourly, 7-day forecast) · news feed (VRT NWS, HLN, Sporza, BBC World; add your own RSS feeds) · snapshot tiles (calories, steps, Strava this week, water) · "Today's focus" task list (unfinished tasks carry over) · "Up next" from the calendar |
| **Health** | **Strava**: this week's totals, year-to-date totals, a 12-week distance chart, recent activities with pace/HR, and sport filters · **Samsung Health**: CSV import (steps, weight, sleep, heart rate) · manual log · step and weight goals · 14-day steps chart and 90-day weight trend |
| **Calendar** | Month view with events, tasks (checkable) and birthdays (yearly, shows the age) · weekly, monthly and yearly repeats · Belgian public holidays · `.ics` import (e.g. a Google Calendar export) · next 30 days and upcoming birthdays |
| **Diet** | Calorie and macro counter per day (breakfast, lunch, dinner, snacks) · built-in list of ~90 common (Belgian) foods · **Open Food Facts** online search, including by barcode · quick add · "my foods" · recent foods · copy a meal from yesterday · water · targets with a BMR/TDEE calculator · 7/14/30-day chart with a target line · averages and a logging streak · full history and CSV export |

## Running it

**Simplest: GitHub Pages.** Go to the repo's *Settings → Pages* and pick this branch with `/ (root)`.
The dashboard is then at `https://<user>.github.io/<repo>/`. Set that page as your browser's home page or new-tab page.

**Locally:**

```bash
python3 -m http.server 8080   # then open http://localhost:8080
```

Opening `index.html` directly (`file://`) works too, but Strava login needs http(s).

## Connecting Strava

1. Create a free API app at <https://www.strava.com/settings/api>.
2. Set **Authorization Callback Domain** to the host you serve the dashboard from: `<user>.github.io`, or `localhost` when running it locally.
3. In the Health tab, paste the Client ID and Client Secret and press **Connect with Strava**.

Tokens refresh automatically. The dashboard re-syncs when you open the Health tab and the last sync is more than 30 minutes old. Credentials stay in this browser and are never written to backups.

## Samsung Health

Samsung Health has no public web API. To get your data in:

1. In the Samsung Health app, open **⋮ → Settings → Download personal data**.
2. Copy the CSV files to your computer.
3. Drop them on the Health tab.

The dashboard recognises step, weight, sleep and heart-rate files. You can also log values by hand.
(A live sync would need an Android app that reads Health Connect, which a web page can't do.)

## Data and backups

Everything lives in `localStorage` in the browser you use. Use **Settings → Download backup** to save it, and **Restore backup** to move it to another device or browser.

## Roadmap ideas

- Live sync with Google Calendar (OAuth) instead of `.ics` import
- Cloud sync between devices
- A barcode scanner using the phone camera

## Data sources

- Weather and place search: [Open-Meteo](https://open-meteo.com) (no API key needed)
- Food database: [Open Food Facts](https://world.openfoodfacts.org)
- News: RSS fetched through public CORS proxies (rss2json, allorigins, corsproxy.io, tried in that order), with a 20-minute cache
