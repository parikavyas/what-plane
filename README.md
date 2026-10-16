# What Plane

Open it on your phone and see which planes are flying around and above you.

The app asks for your location and shows a street map (OpenStreetMap) with you at
the centre, a 20 km ring, and every plane inside it as an arrow pointing the way
it's flying. Above the map: where you are, your coordinates, which way your phone
is facing (tap to turn on the compass) and the time. Below it, a folding "Nearby"
list ranks the planes by how high they are in your sky. Each row shows the flight
number, the airline and aircraft type, origin and destination, take-off and
landing times (when FlightAware is set up), and where to look. It refreshes every
10 seconds and pauses when the tab is hidden.

## How the data flows

Browsers can't read the flight feeds directly (they send no CORS headers), so the
app talks only to its own small server functions in `api/`, which Vercel runs:

- `GET /api/aircraft` asks adsb.lol, then adsb.fi, then airplanes.live for planes
  near you. Like God's Eye View's proxy, it caches answers for a few seconds,
  backs off from a feed that says "slow down", and serves the last good answer if
  every feed is down.
- `POST /api/routes` asks adsb.lol's route database for origin and destination.
- `GET /api/flight` asks FlightAware AeroAPI for take-off and landing times. It
  only works when the `FLIGHTAWARE_API_KEY` environment variable is set; without
  it the rows simply show no times.
- `GET /api/place` turns your coordinates into a place name with OpenStreetMap's
  Nominatim.

## Host it on Vercel

1. Sign in at https://vercel.com with GitHub, choose Add New > Project, and
   import this repository. Vercel detects Vite and the `api/` functions; keep
   the defaults and deploy.
2. Optional, for take-off and landing times: create a personal AeroAPI key at
   https://www.flightaware.com/aeroapi/ and add it in the Vercel project under
   Settings > Environment Variables as `FLIGHTAWARE_API_KEY`, then redeploy.

Every push to `main` redeploys, and each pull request gets its own preview link.

## Run it locally

```sh
npm install
npx vercel dev   # runs the site and the api/ functions together
npm test         # unit tests
npm run build    # static site in dist/
```

Plain `npm run dev` serves the page but not the `api/` functions, so no planes load.
Browsers only share location over HTTPS or on localhost.

## Layout

- `api/aircraft.ts`, `api/routes.ts`, `api/flight.ts`, `api/place.ts` the server functions
- `api/_lib/feeds.ts` feed order, caching and back-off for live aircraft
- `api/_lib/flight.ts` picks the airborne leg out of FlightAware's answer
- `src/main.ts` location, polling, header and the Nearby list
- `src/map.ts` the Leaflet street map with you and the planes
- `src/compass.ts` which way the phone is facing
- `src/feed.ts` asks `/api/aircraft` for planes
- `src/aircraft.ts` turns raw records into sorted sightings
- `src/geo.ts` distance, bearing and elevation-angle maths
- `src/airlines.ts` airline names from callsign prefixes (DAL123 is Delta)
- `src/types.ts` plain names for aircraft type codes (B38M is a Boeing 737 MAX 8)
- `src/routes.ts` looks up and caches flight routes
- `src/flights.ts` looks up and caches take-off and landing times
- `src/radar.ts` compass heading maths (and the older radar drawing)
