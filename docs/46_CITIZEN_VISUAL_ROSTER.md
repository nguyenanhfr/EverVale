# 46 — Citizen Visual Roster

Status: **CANONICAL VISUAL CAST v0.1**

## Principle

Citizens do not need authored personal names to feel alive.

EverVale uses:
- stable visual seeds
- age bands
- job outfits
- activity props
- routine animation
- household/pet context

The goal is that a street feels populated by different people even when the player never opens a character sheet.

## Visual grammar

Style:
- stylized miniature proportions
- slightly oversized head/hands for readability
- simple expressive faces
- warm cloth/wood/leather materials
- restrained Varum accents for advanced roles
- no photoreal military uniforms
- silhouettes readable from isometric camera

Citizens share a modular body system:
- body archetype
- head/hair
- outfit
- hat/accessory
- carried prop
- palette
- animation set

This allows dozens of combinations without dozens of unique rigs.

## Civilian archetypes

### Children
1. School child — backpack, book, bright jacket
2. School child with bicycle/scooter
3. Playground child — cap, toy/ball
4. Farm child — boots, simple rural clothes

Automation:
- home
- school commute
- schoolyard
- park/play
- return home

### Adults — ordinary life
5. Casual resident
6. Parent / caregiver
7. Dog walker
8. Cyclist
9. Shopper
10. Café visitor
11. Park jogger
12. Festival / civic visitor

These are presentation archetypes rather than economic jobs.

### Income workers
13. Workshop craft worker — apron, gloves
14. Market vendor — apron/crate
15. Farmer — boots, hat, tool
16. Café/restaurant worker — apron/tray
17. Shop clerk — vest/bag
18. Office worker — coat/satchel
19. Builder — helmet/tool belt
20. Mechanic — coveralls/wrench

### Utility / service
21. Power worker — insulated gloves, amber accents
22. Water worker — blue-grey utility gear
23. Maintenance worker — tool bag
24. Fire crew — chunky stylized protective suit
25. Clinic worker — clean light uniform/medical bag
26. Street/service worker — broom/cart/tool kit

### Education / Tech
27. Teacher — books/tablet
28. Researcher — coat, brass instrument, small teal Varum device
29. Observatory/weather worker — binocular/instrument case

### Varum
30. Varum miner — helmet lamp, heavy boots
31. Varum engineer — goggles, teal tool module

### Defense
32. Town Guard — compact carbine, warm coat/armor plates
33. Shield Guard — broad portable shield, short weapon
34. Rocket Ranger — light shoulder launcher, goggles
35. Vehicle Crew — padded helmet/coveralls
36. Pilot — flight jacket, helmet under arm
37. Radar Operator — headset/tablet

### Seniors
38. Senior resident — cane/book
39. Senior gardener — basket/tool
40. Senior park walker — hat, small bag

## Diversity system

Visual diversity comes from deterministic combinations:
- skin tone
- hair tone/style
- body proportions within stylized bounds
- outfit palette
- hat/accessory
- glasses
- carried item
- walking speed band
- idle animation preference

Do not tie appearance to economic ability or personality.

## Outfit switching

A persistent citizen may visually change by context:

Home:
- casual

Work:
- job outfit

Threat:
- civilian coat / shelter state
- guards equip defense gear

Rain:
- umbrella/raincoat variant

Festival:
- optional civic outfit/prop

The server stores role/context; client resolves visual outfit.

## Animation minimum

Shared locomotion:
- idle
- walk
- brisk walk
- run
- sit
- carry
- wave/talk
- look around

Context clips:
- read
- sweep
- hammer
- repair
- farm
- teach
- mine
- guard aim
- salute/alert
- panic/shelter

Do not create a unique skeleton per occupation.

## Crowd rule

At close camera:
- full rig + contextual prop

Mid:
- lower animation update rate

Far:
- simplified rig, impostor, static cluster or cull

The town can visually show fewer citizens than total Population while preserving believable density.

## No-name rule

Default UI does not need personal names.

Optional inspector can show:
- role
- home
- workplace/school
- current activity
- household
- Happiness icon

without inventing lore for every person.


## Runtime visual identity authority

The role/archetype roster in this document is resolved into deterministic runtime appearance by:

- `docs/78_VISUAL_IDENTITY_VARIATION_SYSTEM.md`
- `data/presentation/v0.1/visual_identities.yaml`
- `apps/client/src/world/visual-identity.ts`

A visible citizen should expose role silhouette and seeded variation instead of falling back to one generic civilian mesh.
