# What Plane

Point your phone at the sky and see which plane is passing above you.

The app asks for your location, pulls live aircraft within 15 nm from a free,
keyless ADS-B feed ([airplanes.live](https://airplanes.live), falling back to
[adsb.lol](https://adsb.lol)), and lists them by how high they are in your sky.
Each card shows the callsign, aircraft type, operator, where to look (compass
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
phone deploy `dist/` to any static host (GitHub Pages, Netlify, Vercel).

## Layout

- `src/geo.ts` distance, bearing and elevation-angle maths
- `src/feed.ts` fetches aircraft from the ADS-B feeds
- `src/aircraft.ts` turns raw records into sorted sightings
- `src/radar.ts` radar geometry, compass heading and the SVG drawing
- `src/sky.ts` puts the radar on the page and follows the phone's compass
- `src/main.ts` geolocation, polling and the UI
