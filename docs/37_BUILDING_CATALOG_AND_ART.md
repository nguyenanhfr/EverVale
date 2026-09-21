# 37 — Building Catalog & Art Identity

Status: **CANONICAL CONTENT BASELINE v0.2**

Every buildable structure must have:
1. stable definition ID
2. authored player-facing name
3. clear silhouette
4. art/material identity
5. visible activity anchors
6. gameplay function
7. operating requirements
8. incident vulnerabilities
9. upgrade hooks

No anonymous gray-box production buildings in production content.

## Catalog scale and authority

Machine-readable planned catalog:
- `data/content/v0.1/building_catalog.yaml`
- `data/content/v0.1/decor_catalog.yaml`

Current planned functional/access buildables: **78**.

Target for the first broad content set:
- **70–85 functional buildables**
- **80–150 decor definitions**
- several visual variants for common homes/workplaces

Important: dozens of buildables do **not** mean dozens of unrelated mechanics.

Most definitions reuse a small mechanics kernel:
- Housing
- Money workplace
- Power producer/storage
- Water producer/storage
- Tech/Education
- Happiness/service
- Varum
- construction/maintenance
- defense
- access graph

Variants and upgrades should reuse these systems instead of creating bespoke code.

# Building families

## Civic / Core

### Hearth Hall
ID: `town_center`
Role: settlement anchor, Treasury capacity, base maintenance, civic events.
Art: warm stone, cream plaster, timber beams, bell/clock, copper roof accents, notice board.
Visible life: citizens entering, notices, delivery cart, evening lamps.

### Builder's Yard
ID: `builders_yard`
Role: adds construction slot and repair capacity.
Art: timber sheds, scaffolding, stacked stone/wood, cranes/hoists.
Visible life: workers carrying planks, carts, saw/hammer animation.

### Storehouse
ID: `storehouse`
Role: increases Varum/storage capacity and supports advanced production buffers.
Art: broad timber warehouse, loading doors, crates, covered awning.

## Residential

### Hearth Cottage
ID: `house_small`
Role: +4 Housing.
Art: plaster/timber, chimney, tiny garden, seeded exterior props.

### Willow House
ID: `house_medium`
Role: +8 Housing, higher Power/Water demand.
Art: two-storey house, balconies, garden, bike rack.

### Lantern Row
ID: `row_housing`
Role: +16 Housing, denser urban footprint.
Art: contiguous townhouses, shared courtyard, laundry, lamps.

### Garden Residence
ID: `garden_residence`
Role: +6 Housing + local Happiness.
Art: premium cottage, hedges, flowers, conservatory.

## Money / Commerce

### Copperwheel Workshop
ID: `workshop`
Role: primary Money workplace.
Art: timber/brick workshop, loading yard, moving mechanisms.

### Honeybell Kitchen
ID: `restaurant`
Role: Money + Happiness; lunch/evening social destination.
Art: warm facade, awning, terrace, chimney, hanging sign.

### Market Square
ID: `market`
Role: Money + Happiness + civic activity density.
Art: stalls, cloth awnings, crates, fountain/signpost.

### Sunleaf Café
ID: `cafe`
Role: small Money + Happiness, compact footprint.
Art: terrace, parasols, window counter, flower pots.

### Crafts Boutique
ID: `boutique`
Role: medium Money, low worker count, Tech-gated upgrade potential.
Art: shopfront, display windows, artisan sign.

### Hearthside Inn
ID: `inn`
Role: Money + Happiness + visitor/event destination.
Art: larger timber lodge, porch, lanterns, stable/service yard.

## Utilities

### Sunwheel Power Works
ID: `power_plant`
Role: Power production + reserve.
Art: brick industrial hall, copper flywheel/turbine, short stacks, amber status lights.
Incidents: overload, generator fault, fire, rare recoverable explosion.

### Clearbrook Water Works
ID: `water_plant`
Role: Water production + reserve; consumes Power.
Art: pale masonry, round tanks/pools, visible pumps, decorative pipework.
Incidents: pump failure, contamination, internal burst, electrical fault.

### Hilltop Battery House
ID: `power_storage`
Role: increases Power reserve, smooths shortages.
Art: compact masonry station, visible coil/battery modules.

### Bluebell Cistern
ID: `water_storage`
Role: increases Water reserve.
Art: elevated tank/cistern, stone base, gauges, water-level visual.

### Cloudglass Weather House
ID: `weather_station`
Role: improves forecast horizon/confidence and severe-weather warning.
Art: small stone/timber observatory, brass instruments, wind vane, rain gauge, compact mast.
Visible life: observer checks instruments, roof vane rotates, warning lantern activates before severe weather.
Incidents: equipment fault, storm damage.

## Education / Tech

### Willowbell School
ID: `school`
Role: Tech + Education coverage.
Art: warm brick/plaster, bell/clock, yard, bike rack.
Visible life: school arrivals, recess, afternoon dispersal.

### Alder Academy
ID: `academy`
Role: stronger Tech output; higher upkeep and staffing.
Art: larger civic campus, observatory/classroom wing.

### Varum Research House
ID: `research_lab`
Role: advanced Tech, Varum efficiency/advanced unlocks.
Art: cozy scientific hall rather than sterile sci-fi; brass instruments + restrained teal Varum elements.

## Happiness / Civic life

### Lantern Grove
ID: `park`
Role: Recreation/Happiness.
Art: curved paths, pond/fountain variant, mature trees, benches, playground.
Visible life: children, seniors, dogs, ducks, picnic.

### Roseglass Garden
ID: `botanical_garden`
Role: stronger Happiness, expensive footprint/upkeep.
Art: greenhouse, flower beds, decorative pond.

### Little Theatre
ID: `theatre`
Role: Happiness + scheduled civic events.
Art: small opera/playhouse facade, posters, evening lights.

### Bath House
ID: `bath_house`
Role: Happiness, utility-heavy leisure.
Art: stone/wood spa, steam, small pools.

### Sports Green
ID: `sports_green`
Role: Happiness + youth activity.
Art: open grass, simple stands, sports props.

## Rural

### Greenpatch Farm
ID: `farm`
Role: Money + rural Happiness; no mandatory Food resource in core.
Art: barn, farmhouse, fenced plots, orchard, animals.
Visible life: farmer, cart/tractor, chickens, ducks, sheep/cows.
Incidents: rats, animal escape, barn fire, storm damage.

### Orchard House
ID: `orchard`
Role: Money + visual seasonal identity.
Art: fruit rows, shed, baskets, bees/birds.

### Windmill Meadow
ID: `windmill_farm`
Role: Money + Happiness; decorative rural landmark.
Art: rotating windmill, fields, small storage barn.

## Varum / Industry

### Starroot Varum Mine
ID: `varum_mine`
Role: direct Varum production.
Art: rock cut, timber portal, lift/winch, mine carts, subtle teal Varum glow.
Incidents: cave-in, jam, energy vent, anomaly, localized explosion.

### Varum Depot
ID: `varum_storage`
Role: increases Varum cap.
Art: reinforced warehouse, sealed canisters/crates, teal warning lights.

### Ironleaf Motor Works
ID: `vehicle_factory`
Role: builds advanced ground vehicles.
Art: assembly shed, large doors, chassis props, overhead hoist.

### Skyforge Works
ID: `advanced_factory`
Role: advanced military/utility upgrades at higher Tech.
Art: heavy industrial but still stylized/cozy-readable.

## Safety / Service

### Hearth Shelter
ID: `civic_shelter`
Role: civilian shelter during severe threat/weather.
Art: stone cellar-like civic refuge, warm lamps, reinforced door, benches/supply alcoves.

### Oakwatch Guardhouse
ID: `guard_post`
Role: baseline Safety + guards.
Art: stone/timber lodge, training yard, bell, banner.

### Northlight Watchtower
ID: `watchtower`
Role: static ground defense + spotting.
Art: timber/stone tower, lantern/searchlight, flag.

### Emberwatch Brigade
ID: `fire_station`
Role: reduces fire severity, dispatches response crew.
Art: brick hall, big doors, bell tower, hose racks, compact fire vehicle.

### Meadow Clinic
ID: `clinic`
Role: improves recovery and resilience to minor incidents.
Art: bright plaster, green cross-like original iconography, garden.

### Civic Service Yard
ID: `service_yard`
Role: maintenance speed + pest/cleanup response.
Art: sheds, utility carts, ladders, bins, tools.

## Military / Threat

### Skylark Radar Station
ID: `radar`
Role: earlier/better warning; air/UFO detection.
Art: bunker, rotating dish, antennas.

### Ironleaf Garage
ID: `armored_depot`
Role: stores/repairs armored vehicles.
Art: reinforced shed, repair pit, fuel-like decorative equipment without adding fuel resource.

### Cloudstep Airfield
ID: `airfield`
Role: aircraft operations.
Art: compact runway, hangar, windsock, service carts.

### Stonebolt Battery
ID: `heavy_turret`
Role: fixed heavy ground defense.
Art: low stone base, chunky copper-mechanical turret, slow readable recoil.

### Skyshield Battery
ID: `anti_air`
Role: anti-air.
Art: tracking emplacement + small sensor.

### Aurora Ward
ID: `varum_shield`
Role: reduces advanced attack structure damage.
Art: ringed pylons, central Varum core, subtle arcs.

### Border Gate
ID: `gate`
Role: road defense chokepoint.
Art: gatehouse, barrier, flag, guard booth.

### Stonewall Section
ID: `wall`
Role: slows ground attackers and shapes attack paths.
Art: modular stone/timber fortification.

## Transport / Access

### Road
IDs:
- `road_dirt`
- `road_stone`
- `road_main`

Role: canonical settlement connectivity.

### Footpath
ID: `footpath`
Role: pedestrian access, cheap decorative/functional path.

### Bridge
ID: `bridge`
Role: crosses water/gaps.

### Hill Lift
ID: `hill_lift`
Role: connects different elevation terraces/levels when road ramps are impossible.
Art: stylized lift tower, cable/cage platform, timber/metal station.

### Service Tunnel
ID: `service_tunnel`
Role: late-game shortcut through blocked ridge/rock.
Art: carved tunnel portals, lights.

# Visual state contract

Every operating building supports:
- CONSTRUCTING
- ACTIVE
- IDLE_NO_WORKERS
- LOW_POWER
- LOW_WATER
- MAINTENANCE
- INCIDENT
- DAMAGED
- REPAIRING
- NIGHT

The state should alter some combination of:
- props
- lights
- particles
- sound
- worker presence
- machine animation
- signage/status lamp

# Activity anchors

Building assets export authored anchors:
- entrance
- worker_station
- visitor_seat
- loading_bay
- service_point
- emergency_point
- parking
- animal_zone
- chimney
- vfx_origin
- child_play_zone
- patrol_origin

This keeps world behavior data-driven instead of hardcoded into scene coordinates.


## Authored variant authority

Repeated building instances must follow the anti-clone and world-dialect rules in:

- `docs/78_VISUAL_IDENTITY_VARIATION_SYSTEM.md`
- `data/presentation/v0.1/visual_identities.yaml`

The art tags in this catalog define family identity. Doc 78 defines how multiple instances of the same family become distinct without changing gameplay authority.
