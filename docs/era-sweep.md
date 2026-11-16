# Last Dividend: Era Sweep (double pass)

Goal: every screen, string and asset is marked **era-variant** (swaps per act: 1978 / 2008 / now),
**lore rewrite** (rewritten once to fit the Port Calder story) or **timeless** (stays as is).
Rule: the Boardroom and all meta menus stay timeless Art Deco. Run screens (desk, bunker, fights, rewards, calls) wear the era.

Two independent passes were made: **Pass A by screen** (walk the UI top to bottom) and **Pass B by data source** (walk every table in the code).
Items found by only one pass are flagged *(B only)* or *(A only)*; both were fixed. A final **Pass C** ran against the live build after deploy.

Legend: ✅ done · ➖ timeless by design · ⚠ known issue (see bottom)

## Pass A: by screen

| ✓ | Screen / element | Class | What changed |
|---|---|---|---|
| ➖ | Title screen, wordmark, seed field, footer | timeless | Meta screen: canonical Art Deco, `applyEra(0)` on entry |
| ➖ | Rulebook / tutorial pages | lore rewrite | "The Fiscal Year" page now names the three eras and the remember-who-you-paid mechanic |
| ➖ | Executive picker (6 execs, firms, traits) | timeless | Canonical. Lore notes: Julian Crowe is Victor Crowe's younger brother; Imani's Yield & Residue is the firm Bea Harrow was pushed out of |
| ➖ | Boardroom (seats, packs, cosmetics, balance) | timeless | Canonical names, `applyEra(0)` |
| ➖ | History / end screen / Shareholder Letter | timeless | Canonical names |
| ✅ | Desk header tagline | era-variant | "Port Calder, 1978 · The Street" / "2008 · The Middle" / "now · The Top" |
| ✅ | Quarter chip (Act chip) | era-variant | "Act I · 1978" etc.; chip palette per era |
| ✅ | Dossier act line + next boss | era-variant | "Act I · The Street · 1978" |
| ✅ | Desk background (hub painting) | era-variant | room-hub-1 (1978 office, smokestacks) / room-hub-2 (2008 glass office) / room-hub (now) |
| ✅ | Map / globe | era-variant | 1978 sepia paper atlas + red string; 2008 wall screen in a bezel, blue tint, scanlines; now hologram globe |
| ✅ | Lens chips, rail, phase pill | era-variant | Typewriter (1978) / early-web sans (2008) on pill, chips |
| ✅ | Office panel background | era-variant | Same hub paintings as the desk |
| ✅ | Office window (city SVG) | era-variant | 1978 smokestacks + ON STRIKE banner; 2008 cranes, jumbotron ▼, FORECLOSED sign; now sea wall + drones, island |
| ✅ | Wall trophies (Assets) | era-variant | Frames: gold record (1978), magazine cover (2008), glowing token screen (now); asset names/icons per era |
| ✅ | Phone button + call card header | era-variant | ☎️ "The rotary phone rings" / 📟 "Your Berry buzzes" / 💍 "Your smart ring pings" (fictional devices) |
| ✅ | News ticker | era-variant | Fictional era headlines interleaved with your log (10 per era) |
| ✅ | Rivals panel | timeless | Rival firms are the other executives' companies; lore only |
| ✅ | Bunker card + bunker view title | era-variant | "Fallout Shelter · 1978" / "Prepper Vault · 2008" / "Resilience Estate · now" |
| ✅ | Bunker surface art | era-variant | bunker-1 (1978 HQ over a shelter), bunker-2 (2008 tower, helipad), exec island (now) |
| ✅ | Bunker room props | era-variant | 1978 hand-crank vent, CD water drums, diesel set, canned-goods shelves · 2008 HVAC, bottled water, server rack, wine wall, panic room · now fans, tanks, batteries, hydroponics + house-AI eye |
| ✅ | Bunker upgrade names | era-variant | table below |
| ✅ | Fight header, faction plate | lore rewrite | Opponent name + role (per act cast); base encounter only drives balance |
| ✅ | Fight room (away) | lore rewrite | Per-opponent plate: precinct, tenement, diner, alley, stoop, City Hall, newsroom, the Calder Club, police HQ (+ existing Act III rooms) |
| ✅ | Fight room (home) | era-variant | room-home-1 (1978), room-home-2 (2008), room-home (now) |
| ✅ | Opponent cutouts | lore rewrite | 9 new 6-pose sets (idle, attack, hit, block, defeated, paid). Okafor redrawn, dark-skinned |
| ✅ | Speech bubbles | new | Opening line, named-move line, hit/block reactions, ending line |
| ✅ | Intent bubble | lore rewrite | Named moves with twists (see opponents table) |
| ✅ | Callback banner | new | "★ A FAMILIAR FACE ★" with inset art, line, effect |
| ✅ | Fight result | new | PAID OFF / CRUSHED / THEY WALKED stamp, "They'll remember this." |
| ✅ | Reward header | lore rewrite | "Paid off · Officer Frank Dunn · Q2" |
| ✅ | Boss card + bosses explainer | lore rewrite | Shows who leads each boss and the year; June can take over the strike |
| ✅ | Door screen backdrop | era-variant | Sepia board (1978), navy (2008), teal (now) |
| ➖ | Cards (frames, gems, ribbons) | timeless | Card names per era (table below); art timeless |
| ➖ | Deck view, shred/upgrade | timeless | Uses era names via data swap |
| ✅ | Reduced motion | checked | New animations (bubble pop, banner, LEDs, puffs) disabled under `prefers-reduced-motion` |
| ✅ | No scroll, portrait + landscape | checked | Era tour asserts no page scroll at 800×1280 and 1280×800 |

## Pass B: by data source

### Assets (wall trophies) (39)

| ✓ | id | canonical (Act III) | 1978 | 2008 | class |
|---|---|---|---|---|---|
| ✅ | shell | Shell Company | Shell Company | Offshore Shell | era-variant |
| ✅ | lobby | Friendly Lobbyist | – | – | timeless |
| ✅ | creative | Creative Accounting | – | – | timeless |
| ✅ | vertical | Vertical Integration | – | – | timeless |
| ✅ | regcap | Regulatory Capture | – | – | timeless |
| ✅ | press | Press Office | Press Office | Press Office | era-variant |
| ✅ | thoughts | Thoughts & Prayers | – | – | timeless |
| ✅ | astro | Astroturf Network | Letter-Writing Campaign | Astroturf Blog Network | era-variant |
| ✅ | philan | Philanthropy Foundation | – | – | timeless |
| ✅ | narrative | Narrative Control | Friendly Editor | Message Discipline | era-variant |
| ✅ | bulk | Bulk Concrete | – | – | timeless |
| ✅ | prefab | Prefab Supplier | – | – | timeless |
| ✅ | oncall | On-Call Contractor | – | – | timeless |
| ✅ | redund | Redundancy Consultant | – | – | timeless |
| ✅ | easement | Pipeline Easement | – | – | timeless |
| ✅ | plantmgr | Plant Manager | – | – | timeless |
| ✅ | utility | Utility Board Seat | – | – | timeless |
| ✅ | toll | Toll Road | – | – | timeless |
| ✅ | hedge | Hedge Desk | – | – | timeless |
| ✅ | chaser | Ambulance Chaser | – | – | timeless |
| ✅ | short | Short Position | Short Position | Short Position | era-variant |
| ✅ | offsets | Carbon Offsets | Tree-Planting Ad | Carbon Offsets | era-variant |
| ✅ | geo | Geoengineering Pilot | Cloud-Seeding Pilot | Carbon Capture Pilot | era-variant |
| ✅ | consult | Management Consultants | – | – | timeless |
| ✅ | buyback | Stock Buyback | Special Dividend | Stock Buyback | era-variant |
| ✅ | loyalty | Board Loyalty | – | – | timeless |
| ✅ | toobig | Too Big To Fail | Friends at the Treasury | Too Big To Fail | era-variant |
| ✅ | overtime | Overtime Crew | – | – | timeless |
| ✅ | penthouse | Penthouse Suite | Penthouse Suite | Penthouse Suite | era-variant |
| ✅ | surge | Surge Pricing AI | Price-Gouging Desk | Dynamic Pricing Software | era-variant |
| ✅ | influencer | Influencer Retainer | Radio Jingle Retainer | Blogger Retainer | era-variant |
| ✅ | brine | Brine Partner | – | – | timeless |
| ✅ | privgrid | Private Grid | Private Diesel Plant | Private Substation | era-variant |
| ✅ | disfut | Disaster Futures | Disaster Insurance Book | Disaster Futures | era-variant |
| ✅ | futures | Futures Desk | Commodities Desk | Futures Desk | era-variant |
| ✅ | rolodex | Golden Rolodex | Golden Rolodex | Golden Berry | era-variant |
| ✅ | chief | Chief of Staff | – | – | timeless |
| ✅ | soundproof | Soundproofed Door | – | – | timeless |
| ✅ | holo | Holo-Window | Painted Window Blind | Flat-Screen 'Window' | era-variant |

### Office items (briefcase) (11)

| ✓ | id | canonical (Act III) | 1978 | 2008 | class |
|---|---|---|---|---|---|
| ✅ | doorman | Bribe the Doorman | – | – | timeless |
| ✅ | prblitz | PR Blitz | Newspaper Ad Blitz | Cable News Blitz | era-variant |
| ✅ | gala | Charity Gala | – | – | timeless |
| ✅ | hotline | Lobbyist Hotline | Lobbyist on Retainer | Lobbyist on Speed-Dial | era-variant |
| ✅ | contract | Exclusive Contract | – | – | timeless |
| ✅ | rush | Rush Order | – | – | timeless |
| ✅ | cloud | Cloud Seeding | Cloud Seeding | Cloud Seeding | era-variant |
| ✅ | security | Private Security | Night Watchmen | Private Security | era-variant |
| ✅ | liquidity | Emergency Liquidity | Bridge Loan | Emergency Liquidity | era-variant |
| ✅ | hush | Hush Money | – | – | timeless |
| ✅ | pod | Prefab Pod | Prefab Shelter Kit | Prefab Panic Room | era-variant |

### Fixers (role line) (11)

| ✓ | id | canonical (Act III) | 1978 | 2008 | class |
|---|---|---|---|---|---|
| ✅ | hollis | water-rights lawyer | – | – | timeless |
| ✅ | chip | ex-utility commissioner | ex-utility commissioner | (same) | era-variant |
| ✅ | pike | Institute for Abundant Futures | Institute for Free Enterprise | Institute for Abundant Futures | era-variant |
| ✅ | ines | customs counsel | – | – | timeless |
| ✅ | tamsin | Chief Listening Officer | public relations counsel | head of social media | era-variant |
| ✅ | bryce | ex-Treasury | – | – | timeless |
| ✅ | dex | K Street lobbyist | Capitol Row lobbyist | Capitol Row lobbyist | era-variant |
| ✅ | priya | litigator, never loses | – | – | timeless |
| ✅ | gus | spin doctor | ad man | cable-news spin doctor | era-variant |
| ✅ | lorne | Center for Balanced Climate | Council for Balanced Energy | Center for Balanced Climate | era-variant |
| ✅ | margo | fixer-at-large | fixer-at-large | (same) | era-variant |

### Cards (incl. 6 curses) (42)

| ✓ | id | canonical (Act III) | 1978 | 2008 | class |
|---|---|---|---|---|---|
| ✅ | talking | Talking Points | – | – | timeless |
| ✅ | nocomment | No Comment | – | – | timeless |
| ✅ | externalize | Externalize | – | – | timeless |
| ✅ | codb | Cost of Doing Business | – | – | timeless |
| ✅ | synergy | Synergy Memo | Interoffice Memo | Synergy Memo | era-variant |
| ✅ | golden | Golden Handshake | – | – | timeless |
| ✅ | presence | Executive Presence | – | – | timeless |
| ✅ | backup | Backup Generator | – | – | timeless |
| ✅ | cutcorners | Cut Corners | – | – | timeless |
| ✅ | privsec | Private Security | Strikebreaker Detail | Private Security | era-variant |
| ✅ | carveout | Carve-out | – | – | timeless |
| ✅ | campaign | Campaign Contribution | – | – | timeless |
| ✅ | zoning | Zoning Variance | – | – | timeless |
| ✅ | stall | Stall the Rival | – | – | timeless |
| ✅ | whisper | Guidance Whisper | – | – | timeless |
| ✅ | fasttrack | Fast-Track Permit | – | – | timeless |
| ✅ | revolving | Revolving Door | Revolving Door | Revolving Door | era-variant |
| ✅ | darkmoney | Dark Money | Bag Money | Soft Money | era-variant |
| ✅ | objection | Objection | – | – | timeless |
| ✅ | buryit | Bury It | – | – | timeless |
| ✅ | billable | Billable Hours | – | – | timeless |
| ✅ | nda | Non-Disclosure | – | – | timeless |
| ✅ | discovery | Discovery Delay | – | – | timeless |
| ✅ | injunction | Injunction | – | – | timeless |
| ✅ | settle | Settle Quietly | – | – | timeless |
| ✅ | countersue | Countersue | – | – | timeless |
| ✅ | astro | Astroturf Rally | Paid Letter Campaign | Astroturf Rally | era-variant |
| ✅ | oped | Op-ed | – | – | timeless |
| ✅ | spin | Spin Cycle | – | – | timeless |
| ✅ | tnp | Thoughts and Prayers | – | – | timeless |
| ✅ | photoop | Photo Op | Ribbon Cutting | Photo Op | era-variant |
| ✅ | crisiscomms | Crisis Comms | Crisis Comms | Crisis Comms | era-variant |
| ✅ | study | Commission a Study | – | – | timeless |
| ✅ | funded | Industry-Funded Study | – | – | timeless |
| ✅ | unsettled | Unsettled Science | Further Study Needed | Unsettled Science | era-variant |
| ✅ | longterm | Long-Term Outlook | – | – | timeless |
| ✅ | c_class | Class Action | – | – | timeless |
| ✅ | c_subpoena | Subpoena | – | – | timeless |
| ✅ | c_whistle | Whistleblower | – | – | timeless |
| ✅ | c_leak | Leak | – | – | timeless |
| ✅ | c_crack | Crack | – | – | timeless |
| ✅ | c_stranded | Stranded Asset | – | – | timeless |

### Phone calls / memos (15)

| ✓ | id | canonical | 1978 | 2008 | class |
|---|---|---|---|---|---|
| ✅ | leak | Leaked Memo | (body only) | (body only) | era-variant |
| ✅ | celebrity | Celebrity Visit | – | – | timeless (device line is era-variant) |
| ✅ | troll | Patent Troll | The Shakedown Lawyer | Patent Troll | era-variant |
| ✅ | wedding | The Engineer's Wedding | – | – | timeless (device line is era-variant) |
| ✅ | summit | Climate Summit | Energy Crisis Summit | Climate Summit | era-variant |
| ✅ | union | Union Drive | – | – | timeless (device line is era-variant) |
| ✅ | activist | Activist Investor | – | – | timeless (device line is era-variant) |
| ✅ | space | Space Billionaire | The Shipping Magnate | The Dot-Com Billionaire | era-variant |
| ✅ | collab | Influencer Collab | Talk-Show Appearance | Viral Video Collab | era-variant |
| ✅ | taxholiday | Tax Holiday | – | – | timeless (device line is era-variant) |
| ✅ | pension | The Pension Fund | – | – | timeless (device line is era-variant) |
| ✅ | drought | Drought Emergency Powers | – | – | timeless (device line is era-variant) |
| ✅ | headhunter | The Headhunter | – | – | timeless (device line is era-variant) |
| ✅ | distressed | Distressed Sale | – | – | timeless (device line is era-variant) |
| ✅ | oldfriend | An Old Friend at the Agency | – | – | timeless (device line is era-variant) |

### Deals (48)

| ✓ | id | title | class |
|---|---|---|---|
| ✅ | water-rights | Buy the town’s water rights | timeless (checked for anachronisms) |
| ✅ | quiet-inspector | Quiet the river inspector | timeless (checked for anachronisms) |
| ✅ | dump-grain | Dump surplus grain abroad | timeless (checked for anachronisms) |
| ✅ | sell-reserves | Sell emergency water reserves | timeless (checked for anachronisms) |
| ✅ | accelerate-permits | Accelerate extractive permits | timeless (checked for anachronisms) |
| ✅ | offshore-pensions | Offshore the pension fund | timeless (checked for anachronisms) |
| ✅ | fuel-futures | Corner diesel futures | timeless (checked for anachronisms) |
| ✅ | crisis-kits | Sell the government its own crisis kits | timeless (checked for anachronisms) |
| ✅ | rezoning-clinic | Rezone the clinic lot | timeless (checked for anachronisms) |
| ✅ | cut-safety | Cut the safety staff | timeless (checked for anachronisms) |
| ✅ | blackout-insurance | Sell rolling-blackout insurance | timeless (checked for anachronisms) |
| ✅ | lobby-relief | Weaken the drought-relief bill | timeless (checked for anachronisms) |
| ✅ | cloud-seeding | Sell cloud-seeding contracts | timeless (checked for anachronisms) |
| ✅ | farm-rollups | Acquire the failing farms | timeless (checked for anachronisms) |
| ✅ | media-buy | Buy the local news hour | timeless (checked for anachronisms) |
| ✅ | charity-filters | Fund municipal filters | timeless (checked for anachronisms) |
| ✅ | well-repairs | Pay for community well repairs | timeless (checked for anachronisms) |
| ✅ | seed-vault | Buy a distressed seed vault | timeless (checked for anachronisms) |
| ✅ | settle-action | Settle the class action quietly | timeless (checked for anachronisms) |
| ✅ | calm-quarterly | Publish a reassuring quarterly | timeless (checked for anachronisms) |
| ✅ | solar-writeoff | Take a solar write-off | timeless (checked for anachronisms) |
| ✅ | open-books | Publish the real reserve numbers | timeless (checked for anachronisms) |
| ✅ | retention-bonus | Pay plant retention bonuses | timeless (checked for anachronisms) |
| ✅ | charter-freight | Charter the last freight | timeless (checked for anachronisms) |
| ✅ | aquifer-tap | Quietly tap a sealed aquifer | timeless (checked for anachronisms) |
| ✅ | divert-filters | Divert a public filtration shipment | timeless (checked for anachronisms) |
| ✅ | poach-engineers | Poach the public utility engineers | timeless (checked for anachronisms) |
| ✅ | crisis-strike | The plant walks out | timeless (checked for anachronisms) |
| ✅ | crisis-inquiry | A select committee writes | timeless (checked for anachronisms) |
| ✅ | crisis-dust | Dust season arrives early | timeless (checked for anachronisms) |
| ✅ | crisis-smoke | Wildfire smoke rolls in | era-variant (choice label) |
| ✅ | crisis-bread | Bread queues turn ugly | era-variant (choice label) |
| ✅ | crisis-blackout | Rolling blackouts | era-variant (choice label) |
| ✅ | crisis-flood | The river forgets its banks | timeless (checked for anachronisms) |
| ✅ | esg-offset | Plant a carbon offset forest | era-variant (choice label) |
| ✅ | esg-water-pledge | Pledge net-zero water use | timeless (checked for anachronisms) |
| ✅ | esg-rewild | Rebrand the strip mine as rewilding | timeless (checked for anachronisms) |
| ✅ | esg-solar-glass | Solar glass for the town hall | timeless (checked for anachronisms) |
| ✅ | esg-badge | Buy a sustainability badge | timeless (checked for anachronisms) |
| ✅ | dc-surge | Surge-price the evacuation buses | timeless (checked for anachronisms) |
| ✅ | dc-rebuild | Win the no-bid rebuild contract | timeless (checked for anachronisms) |
| ✅ | dc-insure | Cancel the flood insurance pool | timeless (checked for anachronisms) |
| ✅ | dc-ration | Ration-card exclusivity deal | timeless (checked for anachronisms) |
| ✅ | dc-heatwave | Heat dome over the capital | timeless (checked for anachronisms) |
| ✅ | ht-desal | Buy the competitor's desalination plant | timeless (checked for anachronisms) |
| ✅ | ht-poison | Poison-pill a rival's port | timeless (checked for anachronisms) |
| ✅ | ht-greenmail | Greenmail a regional utility | timeless (checked for anachronisms) |
| ✅ | ht-merge | Merge with a struggling grid | timeless (checked for anachronisms) |

### Bunker upgrade names

| ✓ | room | Act III | 1978 | 2008 |
|---|---|---|---|---|
| ✅ | air | Intake fans / Filtration stack / Redundant scrubbers | Hand-crank vent / Blast filter / Twin scrubbers | HVAC intake / HEPA stack / Redundant scrubbers |
| ✅ | water | Cistern / Recycling plant / Deep well tap | Water drums / Cistern / Deep-well tap | Bottled reserve / Recycling plant / Deep-well tap |
| ✅ | power | Diesel reserve / Generator hall / Battery vault | Diesel reserve / Generator hall / Battery bank | Diesel reserve / Server-grade UPS / Battery vault |
| ✅ | food | Dry stockpile / Hydroponics / Sky garden | Canned goods / Ration store / Root cellar | Freeze-dried stock / Wine wall & pantry / Hydroponics trial |

### Opponents (21 incl. boss variants)

| ✓ | id | who | act | plays as | moves | room |
|---|---|---|---|---|---|---|
| ✅ | dunn | Officer Frank Dunn | 1 | regulator | Lost Paperwork, The Price Goes Up | precinct |
| ✅ | moretti | Sal Moretti | 1 | rival | Rent Hike, Eviction Notice | tenement |
| ✅ | june | June Park | 1 | journalist | Grievance, Wildcat Walkout | diner |
| ✅ | mickey | Mickey 'the Nail' Russo | 1 | regulator | The Vig, A Little Fire | alley |
| ✅ | odell | Ma Odell | 1 | protest | Petition, Block Meeting | stoop |
| ✅ | delacroix | Councilman Ray Delacroix | 2 | regulator | Zoning Hold, Campaign Ask, Recount | cityhall |
| ✅ | okafor | Dev Okafor | 2 | journalist | Front Page, Follow-up Question, It Went Viral | newsroom |
| ✅ | hale | Agnes Hale | 2 | regulator | Consent Decree, Comment Period | regulator |
| ✅ | harrow | Bea Harrow | 2 | rival | Undercut, Poach the Contract, Bet Against You | club |
| ✅ | gray | Commissioner Gray | 2 | protest | Kettle, Overtime Invoice | policehq |
| ✅ | crowe | Victor Crowe | 3 | rival | Platform Fee, Acquire & Shut Down | rival |
| ✅ | rosa | Rosa Lind | 3 | protest | Chant, Occupy the Lobby | protest |
| ✅ | sorel | Lena Sorel | 3 | journalist | Short Interest, Footnote 47 | garage |
| ✅ | ashby | Gail Ashby | 3 | regulator | Downgrade, Guidance? | earnings |
| ✅ | brennan | Sen. Walt Brennan | 3 | hearing | Contempt, Under Oath, Sound Bite | senate |
| ✅ | ashby_b | Gail Ashby | 1 | earnings | Guidance?, Miss the Number, Analyst Pile-on | earnings |
| ✅ | sorel_b | Lena Sorel | 1 | shortseller | The Report, Expose, Borrowed Shares | garage |
| ✅ | varga_b | Tomas Varga | 2 | strike | Down Tools, Picket Line, General Strike | union |
| ✅ | june_b | June Park | 2 | strike | Nothing Left to Lose, Picket Line, General Strike | union |
| ✅ | crowe_b | Victor Crowe | 2 | bid | Greenmail, Asset Strip | rival |
| ✅ | ticker_b | The Ticker | 2 | crash | Flash Crash, Margin Call, Liquidity Drain | crash |

### Other sources checked (Pass B)

| ✓ | Source | Class | Note |
|---|---|---|---|
| ✅ | `LD.ACTS` | lore rewrite | Seed Round / Growth / Exit → The Street (1978) / The Middle (2008) / The Top (now) |
| ✅ | `LD.TUTORIAL` "The Fiscal Year" | lore rewrite | Names the eras and the remember mechanic |
| ✅ | `LD.ENCOUNTERS` | timeless (engine) | Kept as balance types; faces come from `LD.OPPONENTS` |
| ✅ | `LD.INTENTS` | lore rewrite | +51 named moves, each with a line and a twist |
| ✅ | `LD.BOSSES` | timeless + lore | Boss slots unchanged (Q4/Q8, Reckoning Q12); faces per act |
| ✅ | Crisis bodies (*B only*) | era-variant | "Someone has a drone" / "The algorithm insists" got 1978 + 2008 versions |
| ✅ | ESG pack deal "on everyone's feed" (*B only*) | era-variant | Paper / blog versions |
| ✅ | `crisis-smoke` "Tweet a sunset photo" | era-variant | Press release (1978) / blog post (2008) |
| ✅ | Forecast list hard-coded "Holo-Window" (*B only*) | fixed | Now reads the era name |
| ✅ | Exec blurbs (6) | timeless | Fiction checked: no real people or companies |
| ✅ | Rival firms, rival events | timeless | |
| ✅ | Region names (world map) | timeless | Real continents only, no real politicians/parties/companies |
| ✅ | `LD.DOOR_NAMES`, rating names, meta shop | timeless | |
| ✅ | Fixer names (11) | timeless; roles era-variant | Lore: Ines Varga is Tomas Varga's daughter |
| ✅ | Fixer "K Street lobbyist" (*B only*) | lore rewrite | Now the fictional "Capitol Row lobbyist" (all eras) |

## Pass C: final sweep against the live build

Run Sat 14 Nov 2026, about 20:30 CET, against https://gothrian-creator.github.io/last-dividend/ (commit `2ad3967`).

| ✓ | Check | Result |
|---|---|---|
| ✅ | Live `index.html` byte-identical to local build | IDENTICAL (1,226,633 bytes) |
| ✅ | All fight art and bunker plates served (`assets/fight/*.webp` + `bunker-1/2.webp`) | 134/134 HTTP 200 |
| ✅ | External requests from the page | None (offline single page; only the `w3.org` SVG namespace strings) |
| ✅ | `era-shots.js` with `LIVE=` (13 scenes × 800x1280 + 1280x800, no-scroll asserted) | ERA SHOTS OK, 26 shots in `mockups/eras-2026-11-14/live/` |
| ✅ | Act I/II/III hubs and bunkers wear their era; Boardroom/menus stay canonical | Checked visually |
| ✅ | Callbacks show the A FAMILIAR FACE banner live (Dunn, June, Mickey) | Checked visually |
| ✅ | Local suites before deploy: run-tests (33), smoke, shots.js, sim-eras (5,668 checks, 36 runs) | All OK |

No new gaps found, so no fixes were needed after deploy.

## Known issues

- ⚠ Delacroix's and Bea Harrow's *paid* poses show part of a stranger's handshake hand at the right edge (masked, a sliver may remain).
- ⚠ The precinct desk plate has a slight glossy sheen compared with the matte style.
- ⚠ Older Act III cutouts (Ashby, Brennan, Crowe, Hale, Rosa, Sorel, Ticker, Varga) have no 6th "paid" pose: paid endings show their idle pose.
