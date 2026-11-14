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

## The office, the briefcase and loot

- **The office.** Your executive sits at a desk on screen and reacts: confident, nervous or panicking as unrest and collapse rise, and gleeful or shocked after big deals. The old meter bar is gone. The three numbers live in the room:
  - **Cash:** a ticker on the desk.
  - **Unrest:** a gauge by the door. The knocks go from a polite tap to pounding, then shaking with voices and a sign outside, and get louder and more frequent. The sound respects the mute toggle, and reduced motion turns the shaking off.
  - **Collapse:** a gauge on the window frame. The mainland across the water decays in 5 stages (Clear skies → Haze → Smog alerts → Fires → Blackout). Collapse and your choices both drive it: Squeeze deals and unpaid crises add smog and fires, and Soothe deals bring repairs and lights. From Smog alerts on, the city adds unrest every quarter.
  - Tap the room to get the full explanation.
- **The briefcase.** It holds 5 Asset slots with rarity glow and lit set bonuses, plus a desk drawer for office items (3 slots, 4 at executive Lv10).
- **Office items (13).**
  - Active items work once per act or once per run: Bribe the Doorman, PR Blitz, Charity Gala, Lobbyist Hotline, Exclusive Contract, Rush Order, Cloud Seeding, Private Security, Emergency Liquidity, Hush Money and Prefab Pod.
  - Fixtures are always on and have a hidden cost: the Soundproofed Door makes crisis pay-offs dearer and silences the warning, and the Holo-Window fakes a calm view while the gauge stays true.
- **Loot.** Loot drops from boss wins, Board Memos, crises and some deals, and shows a reveal card. You can keep it, swap it for a drawer item (the old one is sold) or sell it.
- **Asset Prospectus.** Opened from the title screen, it records every Asset, item and Liability you have seen and held, across runs.

## Fonts

This build embeds subsets of Playfair Display, Zilla Slab, and Source Sans Pro, licensed under the SIL Open Font License 1.1. See `FONT-LICENSES.txt` and `OFL-1.1.txt`.

World-map proof: region outlines are derived from Natural Earth 1:110m (public domain) via the world-atlas package (ISC).

Art: `assets/oasis-island.webp` (bunker island backdrop) and `assets/desk-penthouse.webp` (desk backdrop) are generated concept art for the "Brighter Tomorrow" deco look.
