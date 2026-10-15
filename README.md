# What Plane

Point your phone at the sky and see which plane is passing above you.

The app asks for your location, pulls live aircraft within 15 nm from a free,
keyless ADS-B feed ([airplanes.live](https://airplanes.live), falling back to
[adsb.lol](https://adsb.lol)), and lists them by how high they are in your sky.
Each card shows the callsign, the airline and aircraft type in plain words
(for example "Delta Air Lines · Airbus A321neo"), the route when it's known
("New York (JFK) → Los Angeles (LAX)", from adsb.lol's route database), where to look (compass
direction and degrees above the horizon), distance, altitude and speed. It
refreshes every 10 seconds and pauses when the tab is hidden.

Above the list, a sky view plots every plane on a radar around you (north up,
distance as radius, arrows showing which way each is flying). On a phone, tap
"Turn with my phone" and the radar rotates with your compass so the top is the
way you're facing.

## Run it

```sh
npm install
npm run dev      # open the printed URL; on a phone use `npm run dev -- --host`
npm test         # unit tests for the geometry and feed handling
npm run build    # static site in dist/
```

Browsers only share location over HTTPS or on localhost, so to try it on a
phone use the hosted copy at https://parikavyas.github.io/what-plane/. Every
push to `main` redeploys it through `.github/workflows/deploy.yml` (repo
Settings > Pages > Source must be set to "GitHub Actions").

## Feed relay

The ADS-B feeds don't send CORS headers, so a browser on the hosted site can't
read them directly ("Couldn't reach the flight feed"). `relay/worker.js` is a
small Cloudflare Worker (free plan) that forwards only the requests the app
makes and adds those headers. To set it up once:

1. In the Cloudflare dashboard, go to Workers & Pages > Create > Create Worker,
   name it `what-plane-relay`, deploy, then Edit code, paste in
   `relay/worker.js` and deploy again.
2. In this repo, add an Actions variable `FEED_RELAY_URL` set to the worker's
   URL (for example `https://what-plane-relay.<you>.workers.dev`) under
   Settings > Secrets and variables > Actions > Variables, then re-run the
   "Deploy to GitHub Pages" workflow.

For local development, put `VITE_FEED_RELAY=<worker URL>` in `.env.local`.

## Layout

- `src/geo.ts` distance, bearing and elevation-angle maths
- `src/feed.ts` fetches aircraft from the ADS-B feeds
- `src/relay.ts` points feed requests at the relay; `relay/worker.js` is the relay itself
- `src/aircraft.ts` turns raw records into sorted sightings
- `src/radar.ts` radar geometry, compass heading and the SVG drawing
- `src/sky.ts` puts the radar on the page and follows the phone's compass
- `src/airlines.ts` airline names from callsign prefixes (DAL123 is Delta)
- `src/types.ts` plain names for aircraft type codes (B38M is a Boeing 737 MAX 8)
- `src/routes.ts` looks up and caches flight routes
- `src/main.ts` geolocation, polling and the UI
