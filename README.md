# SpotSense

Solar-powered IoT parking spot monitor built for UTSA. An ESP32 reads an HC-SR04
ultrasonic rangefinder, pushes occupancy + telemetry to Firebase Realtime Database,
and a live dashboard renders it in real time. Includes a simulated full-lot demo view.

**Live demo:** [bashthaman.github.io/SpotSense](https://bashthaman.github.io/SpotSense/)

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