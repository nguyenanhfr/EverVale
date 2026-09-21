# 78 — Visual Identity, Authored Variants & World Diversity

Status: **CANONICAL VISUAL IDENTITY BASELINE v0.1**

This document closes a gap between the existing art bible and runtime presentation.

Existing authorities already define:
- world art direction: `docs/02_WORLD_ART.md`
- building families/art tags: `docs/37_BUILDING_CATALOG_AND_ART.md`
- citizen visual roster: `docs/46_CITIZEN_VISUAL_ROSTER.md`
- citizen actor roles: `docs/47_CITIZEN_ACTOR_CATALOG.md`
- decor/district language: `docs/43_DECOR_AND_WORLD_DRESSING.md`

Those documents define **what a thing is**. This document defines **how repeated instances avoid looking cloned**.

## 1. Core rule

EverVale must not create visual variety by random recoloring alone.

Every visible entity is resolved from:

```
world visual dialect
+ authored family variant
+ stable entity seed
+ role/activity context
+ local dressing set
```

The result must be:
- deterministic
- screenshot-regression friendly
- visually coherent within one settlement
- different across different world seeds
- mechanically irrelevant

Visual identity never changes economy, combat, pathfinding, collision, protocol, persistence outcomes or balance.

## 2. World visual dialects

A world seed selects one settlement-wide visual dialect. The dialect changes palette emphasis and detail language while preserving EverVale's shared cozy miniature identity.

### Hearthstone
- cream plaster
- warm stone
- dark timber
- weathered brown/slate roofs
- copper civic accents
- dense flower boxes and warm lamps

### Willowbrook
- pale sage plaster
- lighter timber
- green-grey slate
- mossy stone
- copper/brass trim
- garden-heavy residential edges

### Amberfield
- ochre/cream plaster
- warm brick
- rust-brown roofs
- dark timber
- brass accents
- rural crates, baskets and dry-stone details

### Bluebell
- cool cream/plaster
- blue-grey slate
- pale masonry
- medium timber
- restrained copper
- cleaner civic edges and blue-green planting

A world should feel related to another EverVale world, but not like the same town recolored uniformly.

## 3. Building authored-variant requirement

Common/repeated buildings require more variants than landmarks.

Minimum production target:
- common housing: **6+**
- common workplaces/services: **3–4**
- utilities: **3**
- civic landmarks: **2–3**
- parks/farms: **4+**
- late-game hero buildings: at least **2**, preferably authored GLB variants

Variants must change at least **two structural or dressing dimensions**, not only color:
- door placement
- roof profile / dormer / ridge treatment
- porch / lean-to / annex
- chimney location
- window grouping
- yard composition
- sign/awning
- equipment arrangement
- garden/fence/stacking
- visible interior hint

### Current M1 families

#### Hearth Cottage — `house_small` — 6 variants
1. **Flower Gable** — centered door, twin flower boxes, left chimney.
2. **Side Porch** — offset entrance, covered side porch, woodpile.
3. **Dormer Cottage** — front dormer, taller roof, narrow front garden.
4. **Stone-End Cottage** — masonry end wall, side chimney, bicycle/mailbox.
5. **Craft Cottage** — shallow lean-to work shed, crate/tool dressing.
6. **Laundry Garden** — rear/side laundry line, planter, bench, lighter frontage.

Adjacent cottages should avoid the same variant when another authored variant is available.

#### Hearth Hall — `town_center` — 3 variants
1. **Clock Hall** — central clock tower.
2. **Bell Porch Hall** — offset bell tower + deep civic porch.
3. **Twin-Gable Hall** — split frontage, lower central civic lantern/notice zone.

#### Copperwheel Workshop — `workshop` — 4 variants
1. **Wheel Yard**
2. **Forge Stack**
3. **Loading Shed**
4. **Saw Court**

Each changes machinery/stack/awning/loading composition.

#### Sunwheel Power Works — `power_plant` — 3 variants
1. **Twin Stack**
2. **Turbine Hall**
3. **Generator Annex**

#### Clearbrook Water Works — `water_plant` — 3 variants
1. **Twin Cistern**
2. **Pump Court**
3. **Filter House**

#### Willowbell School — `school` — 3 variants
1. **Bell Gable**
2. **Courtyard School**
3. **Classroom Annex**

#### Lantern Grove — `park` — 4 variants
1. **Fountain Grove**
2. **Duck Pond**
3. **Play Lawn**
4. **Reading Garden**

#### Oakwatch Guardhouse — `guard_post` — 3 variants
1. **Lodge Yard**
2. **Watch Court**
3. **Gate Lodge**

#### Greenpatch Farm — `farm` — 4 variants
1. **Barnyard**
2. **Silo Farm**
3. **Orchard Edge**
4. **Animal Court**

#### Honeybell Kitchen — `restaurant` — 4 variants
1. **Awning Terrace**
2. **Courtyard Kitchen**
3. **Corner Café Front**
4. **Lantern Dining Porch**

#### Builder's Yard — `builders_yard` — 4 variants
1. **Hoist Yard**
2. **Saw Shed**
3. **Stone Yard**
4. **Scaffold Court**

## 4. Building dressing grammar

Dressing is family-specific.

Residential:
- flower box
- mailbox
- bicycle
- bench
- laundry
- woodpile
- small planter
- garden tools

Civic:
- notice board
- banner
- lamp
- bench
- planter
- delivery handcart

Industrial:
- crates
- pallets
- pipe bundle
- wheel/gear
- tool bench
- covered materials

Rural:
- fence
- hay
- trough
- basket
- cart
- animal prop/zone
- orchard or crop edge

Safety:
- bell
- banner
- training dummy
- barrier
- lamp
- equipment rack

Automatic dressing is presentation-only and must not pretend to be authoritative collision.

## 5. Citizen identity contract

The actor catalog already defines roles. Runtime presentation must actually expose them.

A citizen visual identity contains:

```
CitizenVisualIdentity {
  ageBand
  role
  bodyVariant
  hairVariant
  skinVariant
  paletteVariant
  headwearVariant
  accessoryVariant
  carriedPropVariant
}
```

Stable source:
`worldSeed + citizen presentation index/id + role`.

### Minimum role silhouettes for M1

School child:
- backpack
- brighter coat
- cap/no-cap variation

Workshop worker:
- apron or vest
- rolled-sleeve silhouette
- tool pouch / crate prop

Utility technician:
- dark overalls
- utility cap/helmet
- tool bag

Teacher:
- tidy coat/cardigan
- book/tablet prop

Guard:
- padded vest
- compact cap/helmet
- dark/warm uniform palette

Builder:
- hard hat/cap
- vest
- hammer/tool belt

Casual resident:
- coat/shirt variants
- satchel / hat / no accessory

Future roles use the definitions already present in docs 46/47 and `data/actors/v0.1/citizens.yaml`.

## 6. Character repetition rule

At management zoom, neighboring citizens must not share all of:
- same coat color
- same hair silhouette
- same headwear
- same accessory

At diorama zoom, role must be recognizable before facial detail.

Do not attach economic success, personality or social value to skin tone/body appearance.

## 7. World-level anti-clone rules

For repeated buildings:
- resolve variants deterministically
- if two nearby same-family buildings resolve to the same variant, rotate to the next legal authored variant
- preserve stable result for the same world seed

For props:
- use seeded cluster composition, not uniform spacing
- vary scale/rotation within art-safe bounds
- prefer clusters and negative space over even scatter

For districts:
- residential, civic, industrial, rural and safety areas use the dressing rules from doc 43
- repeated props should reinforce district identity, not global noise

## 8. Runtime implementation

Current runtime resolver:
- `apps/client/src/world/visual-identity.ts`

Presentation consumers:
- `building-visual.ts`
- `actor-visual.ts`
- `environment-visual.ts`
- `WorldView.tsx`

The resolver is client presentation only.

## 9. Quality gate for the 6/10 milestone

A 6/10 EverVale screenshot should satisfy all of the following:

- three Hearth Cottages visible together do not look cloned
- Town Center reads as a landmark without UI
- Workshop, Power and Water buildings are recognizable by silhouette
- at least four citizen roles are visually distinguishable at diorama zoom
- world seed changes coherent palette/dressing dialect
- roads/vegetation frame buildings instead of appearing uniformly scattered
- close zoom reveals authored frontage detail
- starter scene remains under M1 performance budgets
- no visual change modifies authoritative gameplay

The target is not Whistlevale parity yet. The target is to cross from procedural prototype into an authored miniature town with repeatable identity.
