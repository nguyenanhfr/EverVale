# 83 — M1.8 Blocked Road Authority

Status: **IMPLEMENTED / CI PENDING**

Date: 2026-09-22

## Goal

Make authoritative world blockers affect the same road graph used by citizen and construction-worker presentation.

A blocker that overlaps a road must not be cosmetic. It must close the occupied road interval until the blocker is actually removed.

## Geometry contract

The server-owned blocker definition provides a radius.

The world view receives that radius through the blocker catalog. It does not invent a client-only collision size.

Routing represents each active blocker as a circle:

- center = blocker world X/Z
- radius = blocker definition radius

For every road segment:

1. solve segment/circle intersections
2. add circle entry/exit points as graph breakpoints
3. split the road at those points
4. omit graph edges whose midpoint lies inside the blocker circle

This closes only the occupied interval rather than disabling the entire road.

The graph may therefore use another connected road as a deterministic detour.

## Blocker lifecycle

Both `BLOCKING` and `CLEARING` blockers remain road obstacles.

The road reconnects only when `advanceBlockers` removes the blocker after its clear timer reaches zero.

This matches the visual/runtime state: a tree or rubble pile being cleared is still physically present until the task completes.

## Actor behavior

### Citizens

Citizen daily routes are rebuilt from:

- authoritative roads
- authoritative blocker positions
- authoritative blocker radii

If the daily route chain is incomplete, the citizen remains at Home with presentation activity `ROUTE_BLOCKED`.

Citizens do not teleport to Work, School, Park or Home across a blocked graph.

Combat shelter routing remains independently evaluated and already falls back to Home when blocked.

### Builders

Construction builders use the same blocker-aware road graph.

If their route is disconnected, they remain at their source instead of walking directly off-road through the obstruction.

## Placement preview

Client building/prop placement preview now uses the same blocker radius catalog rather than a fixed approximate blocker radius.

Final placement remains server-authoritative.

## Tests

Pure road-routing tests cover:

- a blocker disconnecting a single road
- a blocked interval choosing an available detour
- an off-road blocker not changing the route
- blocker removal reconnecting the road graph

Existing browser routing telemetry remains:

- routed citizen count
- disconnected route count
- `Road routing X/Y`

## Weather integration

The follow-up weather-authority slice now uses this contract.

- `fallen_tree` creates a clearable `fallen_tree` blocker on an eligible dirt road.
- `road_blockage` creates a clearable `rubble` blocker on an eligible dirt road.
- deterministic blocker placement is derived from the weather episode seed.
- the blocker immediately participates in citizen/builder routing.
- `CLEAR_BLOCKER` keeps the road blocked during `CLEARING` and reconnects it after removal.

Bridge/lift fault tags remain deferred because M1 has no authoritative bridge/lift runtime objects.
