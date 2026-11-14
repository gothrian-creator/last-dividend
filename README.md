# Last Dividend

A short, browser-playable demo of Last Dividend, a dark satirical turn-based roguelite. You play a corporate executive who profits from ecological collapse while funding a private shelter.

This repository publishes only the standalone web build. It is a short demo, not a Play Store app, and it does not require a server.

Play: https://gothrian-creator.github.io/last-dividend/

You can also open `index.html` directly in a browser from a local copy (keep the `assets/` folder next to it).

## The Fiscal Year

Every run is one fiscal year: 3 acts of 4 quarters.

- **Boss quarters.** Q4 (the Earnings Call or a Short-Seller Report) and Q8 (a General Strike, a Hostile Takeover Bid or a Market Crash) are 3-round card fights at the door (4 rounds at D). The year ends with The Reckoning (Superstorm season, Heat Dome or Sea Wall), which stays a bunker check.
- **Go private.** Converting keeps 70% of deal cash (Cassius keeps 80%) and lifts the surcharges on public works. It also adds 2 Private Security cards to your deck and 3 free shreds.
- **Sealing.** You can seal the bunker from Q9.
- **Credit ratings.** Each tier from AAA to D adds one rule, and the door fights get harder through those rules. Wins pay ×(1 + 0.3 × tier) Dividends, plus a one-time bonus on the first clear of each rating.
- **Executive levels.** XP unlocks small perks: an extra signature card, an upgraded starter, and others.

## Card fights at the door (Drop 1)

Every deal you sign sends someone to the door:

| Deal | Encounter | Its intents | A win gives |
|---|---|---|---|
| Squeeze | The Regulator | Fine, Audit | +10% on the deal |
| Acquire | Rival Bid | Undercut, Outbid | the rival's seal slips a quarter |
| Crisis | The Protest | Chant, Swell | unrest −3 |
| Soothe | The Journalist | Question, Expose | an upgrade token |

A fixer at Heat 3 brings the Senate Hearing, an elite fight.

- **The fight.**
  - Each round you get 3 Influence (◆) and 5 cards.
  - Ordinary fights last 2 rounds; Q1 is a 1-round tutorial.
  - Pressure lowers Scrutiny, and at 0 you win.
  - The intent badge shows what lands when you end the round, and on which meter (cash, unrest, collapse at half, or Heat). Deniability blocks it point for point. Some intents have riders, such as a Subpoena or a Leak curse, or losing a claim.
  - Settling costs $0.5M per Scrutiny point left.
  - Losing still signs the deal, but the region takes stress.
  - `LD.DOOR.ONE_ROUND` switches ordinary fights to 1 round if quarters run long.
  - On short phones the desk monitor keeps its height, the forecast rail goes to one line per chip, and the "Pick a deal" pill is hidden (the End Quarter button says it).
- **The deck.**
  - You start with 4 Talking Points, 4 No Comment and your executive's signature fixer, who brings 2 cards.
  - Fixers (Lobbyists, Lawyers, PR people and Fellows) are card packages with a quarterly retainer. Hire them when the Headhunter calls, at most 4 on the roster. Letting one go removes their cards.
  - A bunker room at Lv 2 adds a room card.
  - Liabilities are now curse cards: Class Action, Subpoena, Whistleblower, Leak, Crack, Stranded Asset.
- **Rewards.** After each fight you pick 1 of 3 cards (2 after a loss), or shred a card (starts at $6M, +$3M each time), or skip it for $3M. Cards can be upgraded once each, using tokens won from the Journalist. Loot items also ride on rewards.
- **Assets.** Assets are rarer now, about 3 to 5 a run. They come from boss wins, the Hearing, act openings (after Q1, Q4 and Q8) and calls. They hang as trophies on the office wall, which holds 5. Set bonuses are gone.
- **Calls.** Board memos are now phone calls: the phone on the desk rings. New calls: the Headhunter, a Distressed Sale and an Old Friend at the Agency.
- **Scaling.** Scrutiny and intents grow with:
  - the act;
  - the rating tier (via its rules: bosses +6% from AA+, curse riders from AA, louder Protests from BB, a 4th boss round at D);
  - city decay;
  - unrest at the door, which makes Protests louder;
  - holding a lot of cash, which brings Regulator scrutiny.

## The office

- **The office is the hub.**
  - The map is the desk monitor.
  - Encounters knock at the door; the window shows the city collapsing.
  - Assets hang as wall trophies.
  - The briefcase holds 3 items.
  - The phone rings with calls, and the deck button shows your cards and fixers.
  - The bunker is under the floor hatch.
- **The executive.** Your executive reacts to unrest and collapse: confident, nervous or panicking.
- **Office items.** Active items work once per act or once per run. The Soundproofed Door and the Holo-Window are now wall Assets.
- **Asset Prospectus.** Opened from the title screen, it records everything you have seen and held, across runs.
- **Saves.** Saves from older builds convert on load:
  - Liabilities become curses.
  - A pending draft becomes skip cash.
  - Pending loot moves to the next reward.
  - A briefcase over 3 items is sold down.

## Fonts

This build embeds subsets of Playfair Display, Zilla Slab, and Source Sans Pro, licensed under the SIL Open Font License 1.1. See `FONT-LICENSES.txt` and `OFL-1.1.txt`.

World-map proof: region outlines are derived from Natural Earth 1:110m (public domain) via the world-atlas package (ISC).

Art: `assets/oasis-island.webp` (bunker island backdrop) and `assets/desk-penthouse.webp` (desk backdrop) are generated concept art for the "Brighter Tomorrow" deco look.
