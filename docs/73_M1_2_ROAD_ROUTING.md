# 73 — M1.2 Road Routing Runtime Contract

Status: **IMPLEMENTED / RUNTIME-GATED**

Date: 2026-09-21

## Goal

Citizens must visibly use the road network that the player actually built.

M1.2 removes the temporary presentation shortcut:

`home -> one nearest road point -> hard-coded town center -> target`

That shortcut is no longer canonical.

## Road graph

Pure routing authority:

`packages/domain/src/road-routing.ts`

The M1 graph is deterministic and derived from authoritative `WorldState.roads`.

Graph construction:
1. read road segments
2. keep every segment endpoint
3. detect geometric segment intersections
4. split roads at intersections
5. project trip origin onto nearest road
6. project destination onto nearest road
7. split those access points into the graph
8. calculate shortest weighted route
9. return a road polyline

Road edge weight in M1:
- physical segment distance

## Critical intersection rule

Two roads that visually cross are connected even when neither original road segment has an explicit endpoint at the crossing.

This is required for the starter cross-road layout.

A future overpass/bridge system must explicitly mark grade-separated crossings so they do not auto-connect.

## Disconnected road islands

The router must never invent an off-road shortcut between disconnected road islands.

Result:
- `connected: false`
- actor presentation remains at its safe/fallback location
- runtime exposes route-health telemetry

## Citizen routes

Each presented citizen receives independent routes for:
- Home -> Work / School
- Work / School -> Leisure / Play
- Leisure -> Home
- Home -> Shelter

Citizens sample distance along the resulting polyline.

They no longer interpolate by number of waypoints.

## Actor presentation

Client responsibilities:
- sample route position
- smooth visual movement
- turn the actor toward movement direction
- add tiny deterministic crowd offsets
- animate body bob/idle

Road topology remains derived from authoritative world state.

The client does not create roads or invent connectivity.

## Runtime telemetry

WorldView exposes:
- routed citizen count
- disconnected route count

M1 HUD shows:

`Road routing X/Y`

Starter runtime gate:
- 12 citizens
- 12 routed
- 0 disconnected

## Automated tests

Pure domain:
`packages/domain/src/road-routing.test.ts`

Covers:
- crossing segments create a real junction
- L-shaped shortest routing
- disconnected road islands
- arbitrary access points on one road
- polyline sampling by physical distance

Browser:
`tests/e2e/m1-runtime.spec.ts`

Requires:
- `data-disconnected-routes = 0`
- HUD contains `12/12`

## Architecture decision

M1 uses a small deterministic pure-TypeScript graph builder because the current road network is tiny and this keeps domain tests simple.

Approved production architecture still allows Graphology for larger server mobility/logistics graphs.

Do not introduce a second route authority.

If Graphology replaces the internal implementation later, it must preserve this contract and tests.

## Blocker-aware routing extension

Implemented in `docs/83_M1_8_BLOCKED_ROAD_AUTHORITY.md`.

Active authoritative blocker circles now split and close occupied road intervals. Citizens use safe Home fallback when their daily route chain is disconnected, and construction builders wait at source rather than crossing a blocked road off-network.

Clearing reconnects the graph only after the blocker is removed.

## Deferred after M1.2

- road deletion/editing
- weighted congestion
- vehicle lane offsets
- service vehicle logical trips
- Recast local walkability around obstacles
- bridges / tunnels / grade-separated intersections
- traffic lights
- parking simulation

## Decision

**M1.2 ROAD ROUTING: IMPLEMENTED**

Citizens must not return to the hard-coded center-waypoint presentation model.
