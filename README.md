# Last Dividend

A short, browser-playable demo of Last Dividend, a dark satirical turn-based roguelite. You play a corporate executive who profits from ecological collapse while funding a private shelter.

This repository publishes only the standalone web build. It is a short demo, not a Play Store app, and it does not require a server.

Play: https://gothrian-creator.github.io/last-dividend/

You can also open `index.html` directly in a browser from a local copy (keep the `assets/` folder next to it).

## The Fiscal Year

Every run is one fiscal year: 3 acts of 4 quarters.

- **Boss quarters.** Each act ends in a boss quarter, drawn per run: Q4 is the Earnings Call or a Short-Seller Report; Q8 is a General Strike, a Hostile Takeover Bid or a Market Crash; Q12 is The Reckoning (Superstorm season, Heat Dome or Sea Wall). A banner announces the boss quarter, and a boss card warns you before you end it.
- **Quarterly acquisitions.** After each quarter, pick 1 of 3 Assets for free, or skip it for cash. 36 Assets come in four rarities and form sets. Your Portfolio holds 5; a full Portfolio means divesting one. Some drafts carry a Liability rider. The Portfolio chip forecasts what your Assets do at quarter close.
- **Board Memos.** About once per act the board sends a memo with two options, each with a price.
- **Go private.** Converting keeps 70% of deal cash (Cassius keeps 80%) and lifts the surcharges on public works.
- **Sealing.** The bunker can be sealed from Q9, after the Act II boss.
- **Credit ratings.** Each tier from AAA to D adds one rule. Wins pay ×(1 + 0.3 × tier) Dividends, plus a one-time bonus on the first clear of each rating.
- **Executive levels.** Each executive earns XP and levels up, unlocking small passive perks.
- **Sound.** Generated WebAudio effects and a low ambient bed start after your first tap. Toggle them on the title screen or in the in-run Menu; the choice is remembered.

## Fonts

This build embeds subsets of Playfair Display, Zilla Slab, and Source Sans Pro, licensed under the SIL Open Font License 1.1. See `FONT-LICENSES.txt` and `OFL-1.1.txt`.

World-map proof: region outlines are derived from Natural Earth 1:110m (public domain) via the world-atlas package (ISC).

Art: `assets/oasis-island.webp` (bunker island backdrop) and `assets/desk-penthouse.webp` (desk backdrop) are generated concept art for the "Brighter Tomorrow" deco look.
