# Vipps Quest

An original, dependency-free JavaScript platform game inspired by the supplied Vipps game reference.

## Run it

Open `index.html` in a modern browser, or serve this folder locally:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Controls

- Move: Arrow keys or `A` / `D`
- Jump: Up arrow, `W`, or Space (press again in the air for a double jump)
- Choose a suit: `1` Tap to Pay, `2` Scan QR, `3` Money Gifts
- Use suit ability: `E` or Shift (the ✦ button on touch devices)
  - Tap to Pay: a short invincible dash that sends Appla away
  - Scan QR: a seven-second coin magnet
  - Money Gifts: a nine-second shield that blocks one hit
- Restart: `R`

`oslo-parallax.png`, `vippsi-running.png`, and `vipps-coin.png` are generated game assets. `appla-reference.png` is the supplied Appla artwork used directly in-game; its sky/ground screenshot pixels are made transparent at runtime. The remaining visual language is drawn directly on the Canvas.
