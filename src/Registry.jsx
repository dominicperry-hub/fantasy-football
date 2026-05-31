import { useState, useEffect } from "react";

const MANAGERS = [
  "Dom", "Matt", "Gary", "Martin", "Phil",
  "Ry", "Dan", "Paul", "Will", "Simmons", "Fish", "Joe"
];

const POSITIONS = { 1: "GK", 2: "DEF", 3: "MID", 4: "FWD" };
const POSITION_ORDER = { 1: 0, 2: 1, 3: 2, 4: 3 };
const posColor = { GK: "#f59e0b", DEF: "#3b82f6", MID: "#10b981", FWD: "#ef4444" };

export default function Registry() {
  const [players, setPlayers] = useState([]);
  const [registry, setRegistry] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterPos, setFilterPos] = useState("ALL");
  const [filterManager, setFilterManager] = useState("ALL");
  const [status, setStatus] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [bootstrapRes, registryRes] = await Promise.all([
        fetch("/api/fpl?endpoint=bootstrap-static"),
        fetch("/api/registry"),
      ]);
      const bootstrap = await bootstrapRes.json();
      const reg = await registryRes.json();

      const sorted = bootstrap.elements.sort((a, b) => {
        if (POSITION_ORDER[a.element_type] !== POSITION_ORDER[b.element_type]) {
          return POSITION_ORDER[a.element_type] - POSITION_ORDER[b.element_type];
        }
        const teamA = bootstrap.teams.find(t => t.id === a.team)?.name || "";
        const teamB = bootstrap.teams.find(t => t.id === b.team)?.name || "";
        return teamA.localeCompare(teamB);
      });

      setPlayers(sorted.map(p => ({
        id: p.id,
        name: p.web_name,
        fullName: `${p.first_name} ${p.second_name}`,
        position: POSITIONS[p.element_type],
        positionId: p.element_type,
        team: bootstrap.teams.find(t => t.id === p.team)?.name || "",
        teamId: p.team,
      })));

      setRegistry(reg || {});
    } catch (err) {
      setStatus("Error loading data: " + err.message);
    }
    setLoading(false);
  }

  async function saveRegistry(newRegistry) {
    setSaving(true);
    try {
      await fetch("/api/registry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRegistry),
      });
      setStatus("Saved ✓");
      setTimeout(() => setStatus(""), 2000);
    } catch (err) {
      setStatus("Save failed: " + err.message);
    }
    setSaving(false);
  }

  function assignManager(playerId, manager) {
    const newRegistry = { ...registry, [playerId]: manager || null };
    if (!manager) delete newRegistry[playerId];
    setRegistry(newRegistry);
    saveRegistry(newRegistry);
  }

  const filtered = players.filter(p => {
    const matchesSearch = search === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.team.toLowerCase().includes(search.toLowerCase());
    const matchesPos = filterPos === "ALL" || p.position === filterPos;
    const matchesManager = filterManager === "ALL" ||
      (filterManager === "UNOWNED" && !registry[p.id]) ||
      registry[p.id] === filterManager;
    return matchesSearch && matchesPos && matchesManager;
  });

  const managerCounts = {};
  MANAGERS.forEach(m => { managerCounts[m] = 0; });
  Object.values(registry).forEach(m => {
    if (m && managerCounts[m] !== undefined) managerCounts[m]++;
  });
  const totalOwned = Object.values(registry).filter(Boolean).length;

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0a0f0a", display: "flex", alignItems: "center", justifyContent: "center", color: "#4a8a4a", fontFamily: "Georgia, serif" }}>
      Loading player registry...
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f0a", color: "#e8f5e9", fontFamily: "'Georgia', serif" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1a3a1a, #0a1f0a)", borderBottom: "2px solid #2d5a2d", padding: "20px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "11px", letterSpacing: "4px", color: "#4a8a4a", marginBottom: "6px", textTransform: "uppercase" }}>Fantasy League · Player Registry</div>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "normal", color: "#c8e6c9" }}>2025/26 Season</h1>
        {status && <div style={{ marginTop: "8px", fontSize: "12px", color: "#66bb6a" }}>{status}</div>}
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "16px" }}>

        {/* Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "8px", marginBottom: "16px" }}>
          <div style={{ background: "#111a11", border: "1px solid #2d5a2d", borderRadius: "6px", padding: "10px", textAlign: "center" }}>
            <div style={{ fontSize: "22px", color: "#c8e6c9" }}>{players.length}</div>
            <div style={{ fontSize: "10px", color: "#4a8a4a", textTransform: "uppercase", letterSpacing: "1px" }}>Total Players</div>
          </div>
          <div style={{ background: "#111a11", border: "1px solid #2d5a2d", borderRadius: "6px", padding: "10px", textAlign: "center" }}>
            <div style={{ fontSize: "22px", color: "#81c784" }}>{totalOwned}</div>
            <div style={{ fontSize: "10px", color: "#4a8a4a", textTransform: "uppercase", letterSpacing: "1px" }}>Owned</div>
          </div>
          <div style={{ background: "#111a11", border: "1px solid #2d5a2d", borderRadius: "6px", padding: "10px", textAlign: "center" }}>
            <div style={{ fontSize: "22px", color: "#ef9a9a" }}>{players.length - totalOwned}</div>
            <div style={{ fontSize: "10px", color: "#4a8a4a", textTransform: "uppercase", letterSpacing: "1px" }}>The Shit</div>
          </div>
        </div>

        {/* Manager counts */}
        <div style={{ background: "#111a11", border: "1px solid #2d5a2d", borderRadius: "6px", padding: "12px", marginBottom: "16px" }}>
          <div style={{ fontSize: "10px", color: "#4a8a4a", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>Squad Sizes</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {MANAGERS.map(m => (
              <div key={m} style={{ background: "#0d150d", borderRadius: "4px", padding: "4px 10px", fontSize: "12px", color: "#c8e6c9" }}>
                {m} <span style={{ color: "#66bb6a" }}>{managerCounts[m]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Search player or club..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: "160px", background: "#111a11", border: "1px solid #2d5a2d", borderRadius: "6px", padding: "8px 12px", color: "#c8e6c9", fontSize: "13px", outline: "none" }}
          />
          <select value={filterPos} onChange={e => setFilterPos(e.target.value)}
            style={{ background: "#111a11", border: "1px solid #2d5a2d", borderRadius: "6px", padding: "8px 12px", color: "#c8e6c9", fontSize: "13px" }}>
            <option value="ALL">All Positions</option>
            <option value="GK">GK</option>
            <option value="DEF">DEF</option>
            <option value="MID">MID</option>
            <option value="FWD">FWD</option>
          </select>
          <select value={filterManager} onChange={e => setFilterManager(e.target.value)}
            style={{ background: "#111a11", border: "1px solid #2d5a2d", borderRadius: "6px", padding: "8px 12px", color: "#c8e6c9", fontSize: "13px" }}>
            <option value="ALL">All Managers</option>
            <option value="UNOWNED">The Shit</option>
            {MANAGERS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Player count */}
        <div style={{ fontSize: "11px", color: "#4a8a4a", marginBottom: "8px" }}>
          Showing {filtered.length} of {players.length} players
        </div>

        {/* Player list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {filtered.map(p => (
            <div key={p.id} style={{
              background: "#111a11",
              border: `1px solid ${registry[p.id] ? "#2d5a2d" : "#1a2a1a"}`,
              borderRadius: "6px", padding: "8px 12px",
              display: "flex", alignItems: "center", gap: "10px"
            }}>
              <div style={{
                width: "30px", height: "30px", borderRadius: "4px", flexShrink: 0,
                background: posColor[p.position] + "22", border: `1px solid ${posColor[p.position]}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "9px", fontWeight: "bold", color: posColor[p.position],
              }}>{p.position}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#c8e6c9", fontSize: "13px" }}>{p.name}</div>
                <div style={{ color: "#4a8a4a", fontSize: "10px" }}>{p.team}</div>
              </div>
              <div style={{ fontSize: "10px", color: "#3a5a3a", flexShrink: 0 }}>#{p.id}</div>
              <select
                value={registry[p.id] || ""}
                onChange={e => assignManager(p.id, e.target.value)}
                style={{
                  background: registry[p.id] ? "#1a3a1a" : "#0d150d",
                  border: `1px solid ${registry[p.id] ? "#4a8a4a" : "#2d3a2d"}`,
                  borderRadius: "4px", padding: "4px 8px",
                  color: registry[p.id] ? "#81c784" : "#4a6a4a",
                  fontSize: "12px", flexShrink: 0, cursor: "pointer"
                }}>
                <option value="">— Unowned —</option>
                {MANAGERS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
