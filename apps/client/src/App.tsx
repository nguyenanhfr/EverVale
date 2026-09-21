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
  const [selectedBuild, setSelectedBuild] = useState<BuildCatalogEntryDto | null>(null);
  const [selectedProp, setSelectedProp] = useState<PropCatalogEntryDto | null>(null);
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null);
  const [movingPropId, setMovingPropId] = useState<string | null>(null);
  const [propRotation, setPropRotation] = useState(0);
  const [propGroup, setPropGroup] = useState("vegetation");
  const [roadStart, setRoadStart] = useState<{x:number;z:number} | null>(null);
  const [message, setMessage] = useState("Loading world...");
  const [metrics, setMetrics] = useState<RuntimeMetrics | null>(null);
  const [routingHealth, setRoutingHealth] = useState({ routed: 0, disconnected: 0 });

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

  const activePreviewProp = mode === "MOVE_PROP" ? movingPropMeta : selectedProp;
  const activePreviewRotation =
    mode === "MOVE_PROP" ? (movingPropInstance?.rotationY ?? 0) : propRotation;

  const enterSelect = useCallback(() => {
    setMode("SELECT");
    setSelectedBuild(null);
    setSelectedProp(null);
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
        movingPropId={movingPropId}
        roadStart={roadStart}
        visualPopulationOverride={stressCitizens}
        onGroundClick={groundClick}
        onRouting={(routed, disconnected) => setRoutingHealth({ routed, disconnected })}
        onPropSelect={(propId) => {
          setSelectedPropId(propId);
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
          <b>¤ {Math.floor(w.resources.money)}</b>
          <b>⚡ {Math.floor(w.resources.power)}/{Math.floor(w.resources.powerCap)}</b>
          <b>💧 {Math.floor(w.resources.water)}/{Math.floor(w.resources.waterCap)}</b>
          <b>◇ {Math.floor(w.resources.varum)}</b>
          <b>👥 {w.society.population}/{w.society.housingCapacity}</b>
          <b>☺ {Math.round(w.society.happiness)}</b>
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
        </div>
      </header>

      {combatLabel && <div className="combat-banner" data-testid="combat-status">{combatLabel}</div>}

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
          <div className="catalog-list" data-testid="build-catalog">
            {unlockedCatalog.map((item) => (
              <button
                key={item.id}
                className={mode === "BUILD" && selectedBuild?.id === item.id ? "active catalog-card" : "catalog-card"}
                onClick={() => {
                  setMode("BUILD");
                  setSelectedBuild(item);
                  setSelectedProp(null);
                  setSelectedPropId(null);
                  setRoadStart(null);
                }}
              >
                <span className="build-title">{item.name}</span>
                <small>{item.sizeTitle}</small>
                <small>¤{item.moneyCost} · {item.buildCycles} cycles</small>
              </button>
            ))}
          </div>
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
        <div data-testid="building-count"><strong>Buildings</strong> {w.buildings.length}</div>
        <div data-testid="prop-count"><strong>Props</strong> {w.props.length}</div>
        <div data-testid="simulation-seconds"><strong>Sim</strong> {Math.floor(w.simulationSeconds)}s</div>
        <div><strong>Workforce</strong> {w.society.assignedWorkers}/{w.society.workforce}</div>
        <div><strong>Education</strong> {Math.round(w.society.educationCoverage * 100)}%</div>
        <div><strong>Recreation</strong> {Math.round(w.society.recreationCoverage * 100)}%</div>
        <div><strong>Safety</strong> {Math.round(w.society.safety * 100)}%</div>
        <div><strong>Beauty</strong> {w.society.beauty.toFixed(2)} / 5</div>
        <div data-testid="routing-status">
          <strong>Road routing</strong>{" "}
          {routingHealth.routed > 0
            ? `${routingHealth.routed - routingHealth.disconnected}/${routingHealth.routed}`
            : "measuring…"}
        </div>

        <div
          className="perf-probe"
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

        {w.events.length > 0 && (
          <div className="event-log">
            <strong>Last event</strong>
            <small data-testid="event-summary">{w.events[w.events.length - 1]?.summary}</small>
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
