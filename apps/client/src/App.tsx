import { useCallback, useEffect, useMemo, useState } from "react";
import type { WorldSpeed } from "@evervale/domain/world.types";
import type {
  BuildCatalogEntryDto,
  PropCatalogEntryDto,
  WorldCommand,
  WorldViewDto,
} from "@evervale/protocol/world";
import { devLogin, getWorld, sendCommand } from "./api";
import { WorldView, type RuntimeMetrics } from "./world/WorldView";
import { constructionVisualState } from "./world/construction-visual";

type Mode = "SELECT" | "BUILD" | "ROAD" | "DECOR" | "MOVE_PROP";
type CatalogTab = "BUILD" | "DECOR";

function Login({ onLogin }: { onLogin(ownerId: string): void }) {
  const [handle, setHandle] = useState("builder");
  const [error, setError] = useState("");

  return (
    <div className="login-shell">
      <form
        className="login-card"
        onSubmit={async (event) => {
          event.preventDefault();
          try {
            const session = await devLogin(handle);
            localStorage.setItem("evervale.owner", session.ownerId);
            onLogin(session.ownerId);
          } catch (e) {
            setError(e instanceof Error ? e.message : "LOGIN_FAILED");
          }
        }}
      >
        <div className="eyebrow">M1 VERTICAL SLICE</div>
        <h1>EverVale</h1>
        <p>Your town keeps moving while you are away.</p>
        <input value={handle} onChange={(e) => setHandle(e.target.value)} aria-label="Builder name" />
        <button type="submit">Enter the Vale</button>
        {error && <div className="error">{error}</div>}
      </form>
    </div>
  );
}

export default function App() {
  const stressCitizens = useMemo(() => {
    if (!import.meta.env.DEV) return null;
    const raw = new URLSearchParams(window.location.search).get("stressCitizens");
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? Math.max(1, Math.min(40, Math.floor(value))) : null;
  }, []);

  const [ownerId, setOwnerId] = useState(() => localStorage.getItem("evervale.owner") ?? "");
  const [view, setView] = useState<WorldViewDto | null>(null);
  const [mode, setMode] = useState<Mode>("SELECT");
  const [catalogTab, setCatalogTab] = useState<CatalogTab>("BUILD");
  const [buildCategory, setBuildCategory] = useState("all");
  const [selectedBuild, setSelectedBuild] = useState<BuildCatalogEntryDto | null>(null);
  const [selectedProp, setSelectedProp] = useState<PropCatalogEntryDto | null>(null);
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [movingPropId, setMovingPropId] = useState<string | null>(null);
  const [propRotation, setPropRotation] = useState(0);
  const [propGroup, setPropGroup] = useState("vegetation");
  const [roadStart, setRoadStart] = useState<{x:number;z:number} | null>(null);
  const [message, setMessage] = useState("Loading world...");
  const [metrics, setMetrics] = useState<RuntimeMetrics | null>(null);
  const [routingHealth, setRoutingHealth] = useState({ routed: 0, disconnected: 0 });
  const [dismissedCombatId, setDismissedCombatId] = useState<string | null>(null);
  const [alertsOpen, setAlertsOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!ownerId) return;
    try {
      const next = await getWorld(ownerId);
      setView(next);
      setMessage("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "WORLD_LOAD_FAILED");
    }
  }, [ownerId]);

  useEffect(() => {
    if (!ownerId) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 1000);
    return () => window.clearInterval(timer);
  }, [ownerId, refresh]);

  const command = useCallback(async (input: Omit<WorldCommand, "commandId" | "expectedRevision">) => {
    if (!view) return;
    const cmd = {
      ...input,
      commandId: crypto.randomUUID(),
      expectedRevision: view.world.revision,
    } as WorldCommand;
    try {
      await sendCommand(ownerId, cmd);
      await refresh();
      setMessage("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "COMMAND_FAILED");
      await refresh();
    }
  }, [ownerId, refresh, view]);

  const propGroups = useMemo(
    () => Array.from(new Set(view?.propCatalog.map((p) => p.group) ?? [])),
    [view],
  );

  const filteredProps = useMemo(
    () => view?.propCatalog.filter((p) => p.group === propGroup) ?? [],
    [view, propGroup],
  );

  const unlockedCatalog = useMemo(
    () => view?.buildCatalog.filter((b) => b.techTier <= view.world.resources.techTier) ?? [],
    [view],
  );

  const buildCategories = useMemo(
    () => Array.from(new Set(unlockedCatalog.map((item) => item.category))).sort(),
    [unlockedCatalog],
  );

  const visibleBuildCatalog = useMemo(
    () => buildCategory === "all"
      ? unlockedCatalog
      : unlockedCatalog.filter((item) => item.category === buildCategory),
    [buildCategory, unlockedCatalog],
  );

  const movingPropMeta = useMemo(() => {
    if (!view || !movingPropId) return null;
    const instance = view.world.props.find((p) => p.id === movingPropId);
    if (!instance) return null;
    return view.propCatalog.find((p) => p.id === instance.definitionId) ?? null;
  }, [movingPropId, view]);

  const movingPropInstance = useMemo(
    () => view?.world.props.find((p) => p.id === movingPropId) ?? null,
    [movingPropId, view],
  );

  const selectedPropInstance = useMemo(
    () => view?.world.props.find((p) => p.id === selectedPropId) ?? null,
    [selectedPropId, view],
  );

  const selectedPropMeta = useMemo(() => {
    if (!view || !selectedPropInstance) return null;
    return view.propCatalog.find((p) => p.id === selectedPropInstance.definitionId) ?? null;
  }, [selectedPropInstance, view]);

  const selectedBuildingInstance = useMemo(
    () => view?.world.buildings.find((building) => building.id === selectedBuildingId) ?? null,
    [selectedBuildingId, view],
  );

  const selectedBuildingMeta = useMemo(() => {
    if (!view || !selectedBuildingInstance) return null;
    return view.buildCatalog.find((item) => item.id === selectedBuildingInstance.definitionId) ?? null;
  }, [selectedBuildingInstance, view]);

  const recentEvents = useMemo(
    () => [...(view?.world.events ?? [])].slice(-4).reverse(),
    [view],
  );

  const workforceByCategory = useMemo(() => {
    if (!view) return [];
    const totals = new Map<string, { assigned: number; demand: number }>();
    for (const building of view.world.buildings) {
      if (building.constructionState !== "COMPLETE") continue;
      const meta = view.buildCatalog.find((item) => item.id === building.definitionId);
      const category = meta?.jobCategory;
      if (!category || !meta || meta.workers <= 0) continue;
      const current = totals.get(category) ?? { assigned: 0, demand: 0 };
      current.assigned += building.workersAssigned;
      current.demand += meta.workers;
      totals.set(category, current);
    }
    return [...totals.entries()]
      .map(([category, value]) => ({ category, ...value }))
      .sort((a, b) => b.assigned - a.assigned || a.category.localeCompare(b.category));
  }, [view]);

  const activePreviewProp = mode === "MOVE_PROP" ? movingPropMeta : selectedProp;
  const activePreviewRotation =
    mode === "MOVE_PROP" ? (movingPropInstance?.rotationY ?? 0) : propRotation;

  const enterSelect = useCallback(() => {
    setMode("SELECT");
    setSelectedBuild(null);
    setSelectedProp(null);
    setSelectedBuildingId(null);
    setMovingPropId(null);
    setRoadStart(null);
  }, []);

  const groundClick = useCallback((p: {x:number;z:number}) => {
    if (!view) return;

    if (mode === "BUILD" && selectedBuild) {
      void command({
        type: "PLACE_BUILDING",
        payload: { definitionId: selectedBuild.id, x: p.x, z: p.z },
      });
      return;
    }

    if (mode === "DECOR" && selectedProp) {
      void command({
        type: "PLACE_PROP",
        payload: {
          definitionId: selectedProp.id,
          x: p.x,
          z: p.z,
          rotationY: propRotation,
        },
      });
      return;
    }

    if (mode === "MOVE_PROP" && movingPropId) {
      void command({
        type: "MOVE_PROP",
        payload: { propId: movingPropId, x: p.x, z: p.z },
      });
      setSelectedPropId(movingPropId);
      setMovingPropId(null);
      setMode("SELECT");
      return;
    }

    if (mode === "ROAD") {
      if (!roadStart) {
        setRoadStart(p);
        setMessage("Road start selected. Click an end point.");
      } else {
        void command({
          type: "DRAW_ROAD",
          payload: { fromX: roadStart.x, fromZ: roadStart.z, toX: p.x, toZ: p.z },
        });
        setRoadStart(null);
      }
    }
  }, [
    command,
    mode,
    movingPropId,
    propRotation,
    roadStart,
    selectedBuild,
    selectedProp,
    view,
  ]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        enterSelect();
        return;
      }
      if (mode === "DECOR" && (event.key.toLowerCase() === "q" || event.key.toLowerCase() === "e")) {
        const direction = event.key.toLowerCase() === "q" ? -1 : 1;
        setPropRotation((value) => value + direction * Math.PI / 4);
      }
      if (mode === "SELECT" && selectedPropInstance && event.key.toLowerCase() === "r") {
        void command({
          type: "ROTATE_PROP",
          payload: {
            propId: selectedPropInstance.id,
            rotationY: selectedPropInstance.rotationY + Math.PI / 4,
          },
        });
      }
      if (mode === "SELECT" && selectedPropInstance && event.key === "Delete") {
        void command({ type: "DELETE_PROP", payload: { propId: selectedPropInstance.id } });
        setSelectedPropId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [command, enterSelect, mode, selectedPropInstance]);

  if (!ownerId) return <Login onLogin={setOwnerId} />;
  if (!view) return <div className="loading">{message || "Loading EverVale..."}</div>;

  const w = view.world;
  const combatLabel = w.combat && w.combat.status !== "RESOLVED"
    ? w.combat.status === "WARNING"
      ? "⚠ Strange movement — contact soon"
      : "⚔ Threat contact"
    : w.combat?.outcome
      ? `${w.combat.outcome} — ${w.combat.summary ?? ""}`
      : "";

  const damaged = w.buildings.filter((b) => b.damageState !== "HEALTHY");
  const constructing = w.buildings.filter((b) => b.constructionState === "BUILDING");
  const activeCombat = w.combat && w.combat.status !== "RESOLVED" ? w.combat : null;
  const combatResult =
    w.combat && w.combat.status === "RESOLVED" && w.combat.outcome && dismissedCombatId !== w.combat.id
      ? w.combat
      : null;
  const enemyActors = activeCombat?.actors.filter((actor) => actor.side === "ENEMY") ?? [];
  const defenderActors = activeCombat?.actors.filter((actor) => actor.side === "DEFENDER") ?? [];
  const hpRatio = (actors: typeof enemyActors) => {
    const max = actors.reduce((sum, actor) => sum + Math.max(1, actor.maxHp), 0);
    if (max <= 0) return 0;
    return Math.max(0, Math.min(1, actors.reduce((sum, actor) => sum + Math.max(0, actor.hp), 0) / max));
  };
  const hostileIntegrity = hpRatio(enemyActors);
  const defenseIntegrity = hpRatio(defenderActors);
  const worldMinute = Math.floor(w.simulationSeconds % 1440);
  const worldHour = Math.floor(worldMinute / 60);
  const worldClock = `${String(worldHour).padStart(2, "0")}:${String(worldMinute % 60).padStart(2, "0")}`;

  return (
    <div className="game-shell">
      <WorldView
        world={w}
        mode={mode}
        selectedBuild={selectedBuild}
        buildCatalog={view.buildCatalog}
        selectedProp={activePreviewProp}
        propCatalog={view.propCatalog}
        propRotation={activePreviewRotation}
        selectedPropId={selectedPropId}
        selectedBuildingId={selectedBuildingId}
        movingPropId={movingPropId}
        roadStart={roadStart}
        visualPopulationOverride={stressCitizens}
        onGroundClick={groundClick}
        onRouting={(routed, disconnected) => setRoutingHealth({ routed, disconnected })}
        onPropSelect={(propId) => {
          setSelectedPropId(propId);
          if (propId) setSelectedBuildingId(null);
          setMovingPropId(null);
          setSelectedBuild(null);
          setSelectedProp(null);
          setMode("SELECT");
        }}
        onBuildingSelect={(buildingId) => {
          setSelectedBuildingId(buildingId);
          if (buildingId) setSelectedPropId(null);
          setMovingPropId(null);
          setSelectedBuild(null);
          setSelectedProp(null);
          setMode("SELECT");
        }}
        onMetrics={setMetrics}
      />

      <header className="topbar hud-panel">
        <div className="brand">EVERVALE <span>M1</span></div>
        <div className="resources">
          <b className={w.resources.money < 200 ? "resource-chip warning" : "resource-chip"}>¤ {Math.floor(w.resources.money)}/{Math.floor(w.resources.moneyCap)}</b>
          <b className={w.resources.powerCap > 0 && w.resources.power / w.resources.powerCap < 0.2 ? "resource-chip critical" : "resource-chip"}>⚡ {Math.floor(w.resources.power)}/{Math.floor(w.resources.powerCap)}</b>
          <b className={w.resources.waterCap > 0 && w.resources.water / w.resources.waterCap < 0.2 ? "resource-chip critical" : "resource-chip"}>💧 {Math.floor(w.resources.water)}/{Math.floor(w.resources.waterCap)}</b>
          <b className="resource-chip">◇ {Math.floor(w.resources.varum)}/{Math.floor(w.resources.varumCap)}</b>
          <b className={w.society.population >= w.society.housingCapacity ? "resource-chip warning" : "resource-chip"}>👥 {w.society.population}/{w.society.housingCapacity}</b>
          <b className={w.society.happiness < 55 ? "resource-chip warning" : "resource-chip"}>☺ {Math.round(w.society.happiness)}</b>
          <b title="Town beauty from decor">✦ {w.society.beauty.toFixed(1)}</b>
          <b>T{w.resources.techTier} · {Math.floor(w.resources.techPoints)}</b>
          <b data-testid="world-clock">🕒 {worldClock}</b>
        </div>
        <div className="speed">
          {([0,1,2,4] as WorldSpeed[]).map((speed) => (
            <button
              key={speed}
              className={w.speed === speed ? "active" : ""}
              onClick={() => void command({ type:"SET_SPEED", payload:{speed} })}
            >
              {speed === 0 ? "Ⅱ" : `${speed}×`}
            </button>
          ))}
          <button
            className={alertsOpen ? "active alerts-toggle" : "alerts-toggle"}
            aria-expanded={alertsOpen}
            onClick={() => setAlertsOpen((value) => !value)}
          >
            Alerts {w.events.length > 0 ? `(${Math.min(99, w.events.length)})` : ""}
          </button>
        </div>
      </header>

      {combatLabel && <div className="combat-banner" data-testid="combat-status">{combatLabel}</div>}

      {activeCombat?.status === "ACTIVE" && (
        <section className="combat-hud hud-panel" aria-label="Active combat status">
          <div className="combat-hud-title">
            <span className="eyebrow">ACTIVE CONTACT</span>
            <strong>Town Defense</strong>
          </div>
          <div className="combat-meter-row">
            <span>Hostile strength</span>
            <div className="combat-meter hostile"><i style={{ width: `${Math.round(hostileIntegrity * 100)}%` }} /></div>
          </div>
          <div className="combat-meter-row">
            <span>Defense integrity</span>
            <div className="combat-meter defender"><i style={{ width: `${Math.round(defenseIntegrity * 100)}%` }} /></div>
          </div>
          <div className="combat-hud-foot">
            <span>{enemyActors.filter((actor) => actor.hp > 0).length} hostiles active</span>
            <span>{defenderActors.filter((actor) => actor.hp > 0).length} defenders active</span>
          </div>
        </section>
      )}

      {combatResult && (
        <section className="battle-result hud-panel" data-testid="battle-result">
          <span className="eyebrow">AFTER ACTION</span>
          <h2>{combatResult.outcome === "CLEAN" ? "Repelled — Clean" : combatResult.outcome === "COSTLY" ? "Repelled — Costly" : "Breached"}</h2>
          <p>{combatResult.summary ?? "The town has returned to recovery operations."}</p>
          <div className="battle-result-grid">
            <div><small>Structures affected</small><b>{damaged.length}</b></div>
            <div><small>Defenders standing</small><b>{combatResult.actors.filter((actor) => actor.side === "DEFENDER" && actor.hp > 0).length}</b></div>
            <div><small>Hostiles remaining</small><b>{combatResult.actors.filter((actor) => actor.side === "ENEMY" && actor.hp > 0).length}</b></div>
          </div>
          <div className="battle-result-note">
            Rewards are server-authoritative and are not shown until the runtime reward ledger is implemented.
          </div>
          <button className="inspector-primary" onClick={() => setDismissedCombatId(combatResult.id)}>
            Return to Town
          </button>
        </section>
      )}

      {alertsOpen && (
        <aside className="alerts-center hud-panel" data-testid="alerts-center">
          <div className="alerts-center-heading">
            <div>
              <span className="eyebrow">ALERTS</span>
              <strong>Town Log</strong>
            </div>
            <button onClick={() => setAlertsOpen(false)} aria-label="Close alerts">×</button>
          </div>
          {w.events.length === 0 ? (
            <p>No alerts yet.</p>
          ) : (
            <div className="alerts-history">
              {[...w.events].slice(-12).reverse().map((event) => (
                <div key={event.id} className="alerts-history-row">
                  <span className={`event-dot severity-${Math.max(0, Math.min(3, Math.floor(event.severity)))}`} />
                  <div>
                    <strong>{event.type.replaceAll("_", " ")}</strong>
                    <small>{event.summary}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      )}

      {recentEvents.length > 0 && (
        <aside className="event-stack" aria-label="Town events">
          {recentEvents.map((event, index) => (
            <div
              key={event.id}
              className={`event-card severity-${Math.max(0, Math.min(3, Math.floor(event.severity)))}`}
            >
              <span className="event-dot" />
              <div>
                <strong>{event.type.replaceAll("_", " ")}</strong>
                <small data-testid={index === 0 ? "event-summary" : undefined}>{event.summary}</small>
              </div>
            </div>
          ))}
        </aside>
      )}

      <aside className="build-panel hud-panel">
        <div className="tool-tabs">
          <button
            className={catalogTab === "BUILD" ? "active" : ""}
            onClick={() => {
              setCatalogTab("BUILD");
              setSelectedProp(null);
              setMode("SELECT");
            }}
          >
            Build
          </button>
          <button
            className={catalogTab === "DECOR" ? "active" : ""}
            onClick={() => {
              setCatalogTab("DECOR");
              setSelectedBuild(null);
              setMode("SELECT");
            }}
          >
            Decor
          </button>
        </div>

        <div className="primary-tools">
          <button className={mode === "SELECT" ? "active" : ""} onClick={enterSelect}>Select</button>
          <button
            className={mode === "ROAD" ? "active" : ""}
            onClick={() => {
              setMode("ROAD");
              setSelectedBuild(null);
              setSelectedProp(null);
              setRoadStart(null);
            }}
          >
            Road
          </button>
        </div>

        <div className="divider" />

        {catalogTab === "BUILD" ? (
          <>
            <div className="group-chips build-category-chips" data-testid="build-categories">
              <button
                className={buildCategory === "all" ? "active" : ""}
                onClick={() => setBuildCategory("all")}
              >
                all
              </button>
              {buildCategories.map((category) => (
                <button
                  key={category}
                  className={buildCategory === category ? "active" : ""}
                  onClick={() => setBuildCategory(category)}
                >
                  {category.replaceAll("_", " ")}
                </button>
              ))}
            </div>
            <div className="catalog-list" data-testid="build-catalog">
              {visibleBuildCatalog.map((item) => (
              <button
                key={item.id}
                className={mode === "BUILD" && selectedBuild?.id === item.id ? "active catalog-card" : "catalog-card"}
                onClick={() => {
                  setMode("BUILD");
                  setSelectedBuild(item);
                  setSelectedProp(null);
                  setSelectedPropId(null);
                  setSelectedBuildingId(null);
                  setRoadStart(null);
                }}
              >
                <span className="build-title">{item.name}</span>
                <small>{item.sizeTitle}</small>
                <small>¤{item.moneyCost} · {item.buildCycles} cycles</small>
              </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="group-chips" data-testid="prop-groups">
              {propGroups.map((group) => (
                <button
                  key={group}
                  className={propGroup === group ? "active" : ""}
                  onClick={() => setPropGroup(group)}
                >
                  {group}
                </button>
              ))}
            </div>
            <div className="catalog-list prop-catalog" data-testid="prop-catalog">
              {filteredProps.map((item) => (
                <button
                  key={item.id}
                  className={mode === "DECOR" && selectedProp?.id === item.id ? "active catalog-card" : "catalog-card"}
                  onClick={() => {
                    setMode("DECOR");
                    setSelectedProp(item);
                    setSelectedBuild(null);
                    setSelectedPropId(null);
                    setSelectedBuildingId(null);
                    setMovingPropId(null);
                    setPropRotation(0);
                  }}
                >
                  <span className="prop-card-title">
                    <span>{item.title}</span>
                    <em>{item.decorClass === "beauty" ? "✦" : item.decorClass === "activity_anchor" ? "●" : "○"}</em>
                  </span>
                  <small>{item.sizeTitle} · snap {item.snapMeters}m</small>
                  <small>
                    ¤{item.moneyCost}
                    {item.beauty > 0 ? ` · +${item.beauty.toFixed(2)} beauty` : ""}
                  </small>
                </button>
              ))}
            </div>
            {mode === "DECOR" && selectedProp && (
              <div className="decor-rotate">
                <button onClick={() => setPropRotation((r) => r - Math.PI / 4)}>↶ 45°</button>
                <span>{Math.round((((propRotation * 180 / Math.PI) % 360) + 360) % 360)}°</span>
                <button onClick={() => setPropRotation((r) => r + Math.PI / 4)}>45° ↷</button>
              </div>
            )}
          </>
        )}
      </aside>

      <aside className="status-panel hud-panel">
        <div className="town-overview-heading">
          <span className="eyebrow">TOWN OVERVIEW</span>
          <strong>Settlement Health</strong>
        </div>

        <div className="overview-workforce">
          <span>Workforce</span>
          <b>{w.society.assignedWorkers}/{w.society.workforce}</b>
          <small>{Math.max(0, w.society.workforce - w.society.assignedWorkers)} available</small>
        </div>

        <div className="overview-meter-row">
          <span>Education</span>
          <div className="overview-meter"><i style={{ width: `${Math.round(w.society.educationCoverage * 100)}%` }} /></div>
          <b>{Math.round(w.society.educationCoverage * 100)}%</b>
        </div>
        <div className="overview-meter-row">
          <span>Recreation</span>
          <div className="overview-meter"><i style={{ width: `${Math.round(w.society.recreationCoverage * 100)}%` }} /></div>
          <b>{Math.round(w.society.recreationCoverage * 100)}%</b>
        </div>
        <div className="overview-meter-row">
          <span>Safety</span>
          <div className="overview-meter"><i style={{ width: `${Math.round(w.society.safety * 100)}%` }} /></div>
          <b>{Math.round(w.society.safety * 100)}%</b>
        </div>

        <div className="overview-stats">
          <div data-testid="building-count"><small>Buildings</small><b>{w.buildings.length}</b></div>
          <div data-testid="prop-count"><small>Props</small><b>{w.props.length}</b></div>
          <div><small>Beauty</small><b>{w.society.beauty.toFixed(2)}</b></div>
        </div>

        {workforceByCategory.length > 0 && (
          <div className="workforce-allocation" data-testid="workforce-allocation">
            <strong>Workforce allocation</strong>
            {workforceByCategory.map((row) => {
              const ratio = row.demand > 0 ? Math.min(1, row.assigned / row.demand) : 0;
              return (
                <div key={row.category} className="workforce-row">
                  <span>{row.category.replaceAll("_", " ")}</span>
                  <div className="workforce-meter"><i style={{ width: `${Math.round(ratio * 100)}%` }} /></div>
                  <b>{row.assigned}/{row.demand}</b>
                </div>
              );
            })}
          </div>
        )}

        <div className="routing-card" data-testid="routing-status">
          <span>Road routing</span>
          <b>
            {routingHealth.routed > 0
              ? `${routingHealth.routed - routingHealth.disconnected}/${routingHealth.routed}`
              : "measuring…"}
          </b>
        </div>

        <div className="debug-stat" data-testid="simulation-seconds">
          <strong>Sim</strong> {Math.floor(w.simulationSeconds)}s
        </div>

        <div
          className="perf-probe debug-stat"
          data-testid="runtime-metrics"
          data-fps={metrics?.fps ?? 0}
          data-frame-p95={metrics?.frameMsP95 ?? 0}
          data-draw-calls={metrics?.drawCalls ?? 0}
          data-triangles={metrics?.triangles ?? 0}
          data-citizens={metrics?.animatedCitizens ?? 0}
        >
          <strong>Runtime</strong>
          <small>
            {metrics
              ? `${metrics.fps} FPS · p95 ${metrics.frameMsP95}ms · ${metrics.drawCalls} calls · ${metrics.triangles} tris`
              : "measuring…"}
          </small>
        </div>

        {constructing.length > 0 && (
          <div className="construction-list" data-testid="construction-list">
            <strong>Construction</strong>
            {constructing.map((building) => {
              const meta = view.buildCatalog.find((item) => item.id === building.definitionId);
              const state = constructionVisualState(building);
              return (
                <div key={building.id} className="construction-row">
                  <span>
                    {meta?.name ?? building.definitionId.replaceAll("_", " ")}
                    <small>{state.stage.toLowerCase()} · {Math.round(state.progress * 100)}%</small>
                  </span>
                  <small>{Math.ceil(building.constructionRemainingSeconds)}s</small>
                </div>
              );
            })}
          </div>
        )}

        {w.blockers.length > 0 && (
          <div className="blocker-list" data-testid="blocker-list">
            <strong>Expansion blockers</strong>
            {w.blockers.map((blocker) => {
              const meta = view.blockerCatalog.find((item) => item.id === blocker.definitionId);
              const label = blocker.definitionId.replaceAll("_", " ");
              return (
                <div key={blocker.id} className="blocker-row">
                  <span>
                    {label}
                    {meta ? <small> · ¤{meta.moneyCost} · {meta.clearCycles} cycles</small> : null}
                  </span>
                  {blocker.state === "CLEARING" ? (
                    <small>{Math.ceil(blocker.clearRemainingSeconds)}s</small>
                  ) : (
                    <button onClick={() => void command({ type:"CLEAR_BLOCKER", payload:{blockerId:blocker.id} })}>
                      Clear
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {damaged.length > 0 && (
          <div className="repair-list">
            <strong>Repairs</strong>
            {damaged.map((b) => (
              <div key={b.id} className="repair-row">
                <span>{b.definitionId} · {Math.round(b.condition)}%</span>
                {b.damageState === "REPAIRING" ? (
                  <small>{Math.ceil(b.repairRemainingSeconds)}s</small>
                ) : (
                  <button onClick={() => void command({ type:"REPAIR_BUILDING", payload:{buildingId:b.id} })}>
                    Repair
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <button
          className="danger"
          disabled={!!w.combat && w.combat.status !== "RESOLVED"}
          onClick={() => void command({ type:"TRIGGER_TEST_WAVE", payload:{} })}
        >
          Test surprise wave
        </button>
      </aside>

      {selectedBuildingInstance && mode === "SELECT" && (
        <aside className="building-inspector hud-panel" data-testid="building-inspector">
          <div className="inspector-heading">
            <div>
              <span className="eyebrow">BUILDING</span>
              <strong>{selectedBuildingMeta?.name ?? selectedBuildingInstance.definitionId.replaceAll("_", " ")}</strong>
            </div>
            <button onClick={() => setSelectedBuildingId(null)} aria-label="Close building inspector">×</button>
          </div>
          <div className="inspector-state">
            <span className={`state-pill ${selectedBuildingInstance.damageState.toLowerCase()}`}>
              {selectedBuildingInstance.damageState}
            </span>
            <span>{Math.round(selectedBuildingInstance.condition)}% condition</span>
          </div>
          <div className="inspector-grid">
            <div><small>Workers</small><b>{selectedBuildingInstance.workersAssigned}/{selectedBuildingMeta?.workers ?? "—"}</b></div>
            <div><small>Priority</small><b>{selectedBuildingInstance.priority}</b></div>
            <div><small>Upkeep</small><b>¤{selectedBuildingMeta?.upkeep ?? 0}/cycle</b></div>
            <div><small>Role</small><b>{selectedBuildingMeta?.jobCategory?.replaceAll("_", " ") ?? "support"}</b></div>
          </div>
          {selectedBuildingInstance.constructionState === "BUILDING" ? (
            <div className="inspector-callout">
              Construction · {Math.max(0, Math.ceil(selectedBuildingInstance.constructionRemainingSeconds))}s remaining
            </div>
          ) : (
            <div className="inspector-output">
              {(selectedBuildingMeta?.moneyPerWorker ?? 0) > 0 && <span>¤ +{selectedBuildingMeta!.moneyPerWorker}/worker</span>}
              {(selectedBuildingMeta?.powerProduction ?? 0) > 0 && <span>⚡ +{selectedBuildingMeta!.powerProduction}</span>}
              {(selectedBuildingMeta?.powerUse ?? 0) > 0 && <span>⚡ −{selectedBuildingMeta!.powerUse}</span>}
              {(selectedBuildingMeta?.waterProduction ?? 0) > 0 && <span>💧 +{selectedBuildingMeta!.waterProduction}</span>}
              {(selectedBuildingMeta?.waterUse ?? 0) > 0 && <span>💧 −{selectedBuildingMeta!.waterUse}</span>}
              {(selectedBuildingMeta?.techProduction ?? 0) > 0 && <span>Tech +{selectedBuildingMeta!.techProduction}</span>}
              {(selectedBuildingMeta?.housingAdd ?? 0) > 0 && <span>Housing +{selectedBuildingMeta!.housingAdd}</span>}
              {(selectedBuildingMeta?.safetyAdd ?? 0) > 0 && <span>Safety +{Math.round(selectedBuildingMeta!.safetyAdd * 100)}%</span>}
            </div>
          )}
          {selectedBuildingInstance.damageState !== "HEALTHY" && selectedBuildingInstance.damageState !== "REPAIRING" && (
            <button
              className="inspector-primary"
              onClick={() => void command({ type:"REPAIR_BUILDING", payload:{buildingId:selectedBuildingInstance.id} })}
            >
              Repair building
            </button>
          )}
        </aside>
      )}

      {selectedPropInstance && selectedPropMeta && mode === "SELECT" && (
        <div className="prop-inspector hud-panel" data-testid="prop-inspector">
          <div>
            <strong>{selectedPropMeta.title}</strong>
            <small>{selectedPropMeta.sizeTitle} · {Math.round(selectedPropInstance.rotationY * 180 / Math.PI)}°</small>
          </div>
          <div className="prop-actions">
            <button
              onClick={() => void command({
                type: "ROTATE_PROP",
                payload: {
                  propId: selectedPropInstance.id,
                  rotationY: selectedPropInstance.rotationY - Math.PI / 4,
                },
              })}
            >
              ↶
            </button>
            <button
              onClick={() => void command({
                type: "ROTATE_PROP",
                payload: {
                  propId: selectedPropInstance.id,
                  rotationY: selectedPropInstance.rotationY + Math.PI / 4,
                },
              })}
            >
              ↷
            </button>
            <button
              onClick={() => {
                setMovingPropId(selectedPropInstance.id);
                setPropRotation(selectedPropInstance.rotationY);
                setMode("MOVE_PROP");
              }}
            >
              Move
            </button>
            <button
              className="delete-prop"
              onClick={() => {
                void command({ type: "DELETE_PROP", payload: { propId: selectedPropInstance.id } });
                setSelectedPropId(null);
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      <footer className="bottom-hint hud-panel">
        {mode === "BUILD" && selectedBuild
          ? `${selectedBuild.name} · ${selectedBuild.sizeTitle} · snap ${selectedBuild.gridCellMeters}m — click a green footprint near a road.`
          : mode === "DECOR" && selectedProp
            ? `${selectedProp.title} · ${selectedProp.sizeTitle} · snap ${selectedProp.snapMeters}m · Q/E rotate — click a green footprint.`
            : mode === "MOVE_PROP" && activePreviewProp
              ? `Move ${activePreviewProp.title} · click a green position · Esc cancels.`
              : mode === "ROAD"
                ? (roadStart ? "Click road end point." : "Click an existing road end, then its destination.")
                : "Build, decorate, connect and watch the town live."}
        {message && <span className="error"> · {message}</span>}
      </footer>

      <button
        className="logout"
        onClick={() => {
          localStorage.removeItem("evervale.owner");
          setOwnerId("");
          setView(null);
        }}
      >
        Logout
      </button>
    </div>
  );
}
