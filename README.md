# SpotSense

Solar-powered IoT parking spot monitor built for UTSA. An ESP32 reads an HC-SR04
ultrasonic rangefinder, pushes occupancy + telemetry to Firebase Realtime Database,
and a live dashboard renders it in real time. Includes a simulated full-lot demo view.

**Live demo:** [bashthaman.github.io/SpotSense](https://bashthaman.github.io/SpotSense/)
## Why This Project Exists

Anyone who's circled UTSA'S commuter lots during during the peak hours knows the
problem: dozens of open spots exist somewhere in the lot, but there's no way
to see where without driving every row yourself. UTSA's commuter population
is huge, parking supply is tight during peak hours, and the only real-time
information available to a driver is what they can see through the
windshield.

That "circling" isn't just an inconvenience, it's measurable waste.
Research on this problem goes back decades, and estimates vary by location
and method, but a 2023 Federal Highway Administration study using GPS
data found that cruising for a parking spot accounts for close to 10% of
urban traffic during peak hours, with older intercept-survey studies in
dense downtown areas finding figures as high as 30-70% depending on how
crowded the area is. Every minute spent circling is a minute of unnecessary
idling, fuel burned, and emissions released for a trip that's already
finished except for the parking itself.

SpotSense is a small-scale attempt at closing that information gap: a
low-cost, solar-powered sensor that reports whether a single spot is
occupied in real time, instead of asking a driver to guess. It's built and
tested on one spot at UTSA right now, but the approach doesn't require
university-specific infrastructure — the same ESP32 + ultrasonic sensor +
Firebase pattern could scale to a parking garage, a hospital lot, a
downtown block, or any space where drivers currently have to search
blind.

This isn't a claim that one sensor solves campus parking. It's a working
proof of concept for a cheap, deployable piece of infrastructure that
could be part of that solution and a demonstration that I can take a real,
observable problem and build something that actually works against it,
not just describe it.
## Hardware

| Component | Purpose |
|---|---|
| ESP32 dev board | Wi‑Fi + main controller |
| HC-SR04 ultrasonic sensor | Distance measurement → occupancy detection |
| Solar panel (in progress) | Off-grid power |
| 18650 battery pack | Battery buffer for panel |

## How it works

1. The ESP32 pings the HC-SR04 on an interval, converts distance to an
   `occupied` boolean, and writes a small JSON payload to Firebase Realtime
   Database.
2. The dashboard subscribes to that data with the Firebase JS SDK and updates
   live — no backend of its own.
3. A second "Lot Demo" tab shows a simulated full-lot view (not connected to
   real sensors) to illustrate what a full deployment could look like.

## Running locally

```bash
git clone https://github.com/bashthaman/SpotSense.git
cd SpotSense
cp firebase-config.example.js firebase-config.js
# edit firebase-config.js with your own Firebase project values
```

Then open `parking.html` in a browser, or serve the folder with a static
file server.

## Roadmap

- [x] Live occupancy readout via Firebase
- [x] Simulated full-lot demo view
- [ ] Battery + solar telemetry fully wired
- [ ] Solar/battery enclosure deployed in the field
- [ ] GitHub Pages live deployment

## Stack

ESP32 (Arduino) · HC-SR04 · Firebase Realtime Database · vanilla HTML/CSS/JS

---

Built by Sebastian, UTSA — mechanical engineering, O&G-track student project.