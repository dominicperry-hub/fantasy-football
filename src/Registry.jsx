import { useState, useEffect } from "react";

const MANAGERS = [
  "Dom", "Matt", "Gary", "Martin", "Phil",
  "Ry", "Dan", "Paul", "Will", "Simmons", "Fish", "Joe"
];

const BUDGET = 100;
const POSITIONS = { 1: "GK", 2: "DEF", 3: "MID", 4: "FWD" };
const POSITION_ORDER = { 1: 0, 2: 1, 3: 2, 4: 3 };
const posColor = { GK: "#f59e0b", DEF: "#3b82f6", MID: "#10b981", FWD: "#ef4444" };

export default function Registry() {
  const [players, setPlayers] = useState([]);
  const [registry, setRegistry] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPos, setFilterPos] = useState("ALL");
  const [filterManager, setFilterManager] = useState("ALL");
  const [status, setStatus] = useState("");
  const [showSpend, setShowSpend] = useState(false);
  const [confirmReveal, setConfirmReveal] = useState(false);
  const [activeTab, setActiveTab] = useState("unsold");
  const [currentPlayerId, setCurrentPlayerId] = useState(null);
  const [currentManager, setCurrentManager] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");

  useEffect(() => { loadData(); }, []);

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

      const playerList = sorted.map(p => ({
        id: p.id,
        name: p.web_name,
        fullName: `${p.first_name} ${p.second_name}`,
        position: POSITIONS[p.element_type],
        positionId: p.element_type,
        team: bootstrap.teams.find(t => t.id === p.team)?.name || "",
        teamId: p.team,
      }));

      setPlayers(playerList);
      setRegistry(reg || {});

      // Set current player to first unsold
      const firstUnsold = playerList.find(p => !(reg || {})[p.id]);
      if (firstUnsold) setCurrentPlayerId(firstUnsold.id);

    } catch (err) {
      setStatus("Error loading data: " + err.message);
    }
    setLoading(false);
  }

  async function saveRegistry(newRegistry) {
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
  }

  function handleSold() {
    if (!currentPlayerId) return;
    const isShit = currentManager === "shit";
    const entry = isShit
      ? { status: "shit", soldAt: Date.now() }
      : { manager: currentManager, price: currentPrice, status: "sold", soldAt: Date.now() };

    const newRegistry = { ...registry, [currentPlayerId]: entry };
    setRegistry(newRegistry);
    saveRegistry(newRegistry);

    // Advance to next unsold
    const unsoldIds = players
      .filter(p => !newRegistry[p.id])
      .map(p => p.id);
    setCurrentPlayerId(unsoldIds[0] || null);
    setCurrentManager("");
    setCurrentPrice("");
  }

  function updateSoldEntry(playerId, field, value) {
    const current = registry[playerId] || {};
    const updated = { ...current, [field]: value };
    const newRegistry = { ...registry, [playerId]: updated };
    setRegistry(newRegistry);
    saveRegistry(newRegistry);
  }

  // Categorise players
  const unsoldPlayers = players.filter(p => !registry[p.id]);
  const soldPlayers = players
    .filter(p => registry[p.id]?.status === "sold")
    .sort((a, b) => (registry[b.id]?.soldAt || 0) - (registry[a.id]?.soldAt || 0));
  const shitPlayers = players
    .filter(p => registry[p.id]?.status === "shit")
    .sort((a, b) => (registry[b.id]?.soldAt || 0) - (registry[a.id]?.soldAt || 0));

  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const isShitSelected = currentManager === "shit";

  // Manager stats
  const managerStats = {};
  MANAGERS.forEach(m => { managerStats[m] = { players: 0, spent: 0 }; });
  soldPlayers.forEach(p => {
    const entry = registry[p.id];
    if (entry?.manager && managerStats[entry.manager]) {
      managerStats[entry.manager].players++;
      managerStats[entry.manager].spent += parseFloat(entry.price || 0);
    }
  });

  // Filtered unsold list
  const filteredUnsold = unsoldPlayers.filter(p => {
    const matchesSearch = search === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.team.toLowerCase().includes(search.toLowerCase());
    const matchesPos = filterPos === "ALL" || p.position === filterPos;
    return matchesSearch && matchesPos;
  });

  const canSold = isShitSelected || (currentManager && currentPrice);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0a0f0a", display: "flex", alignItems: "center", justifyContent: "center", color: "#4a8a4a", fontFamily: "Georgia, serif" }}>
      Loading player registry...
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f0a", color: "#e8f5e9", fontFamily: "'Georgia', serif" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1a3a1a, #0a1f0a)", borderBottom: "2px solid #2d5a2d", padding: "16px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "11px", letterSpacing: "4px", color: "#4a8a4a", marginBottom: "4px", textTransform: "uppercase" }}>Fantasy League · Auction</div>
        <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "normal", color: "#c8e6c9" }}>2025/26 Season</h1>
        {status && <div style={{ marginTop: "6px", fontSize: "12px", color: "#66bb6a" }}>{status}</div>}
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "12px 16px" }}>

        {/* Current Player */}
        {activeTab === "unsold" && currentPlayer ? (
          <div style={{ background: "linear-gradient(135deg, #1a3a1a, #0d2b0d)", border: "2px solid #4a8a4a", borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#4a8a4a", textTransform: "uppercase", marginBottom: "10px" }}>Current Player</div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "6px", flexShrink: 0,
                background: posColor[currentPlayer.position] + "33", border: `2px solid ${posColor[currentPlayer.position]}66`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11px", fontWeight: "bold", color: posColor[currentPlayer.position],
              }}>{currentPlayer.position}</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#c8e6c9", fontSize: "18px" }}>{currentPlayer.name}</div>
                <div style={{ color: "#4a8a4a", fontSize: "12px" }}>{currentPlayer.team}</div>
              </div>
              <select
                value={currentManager}
                onChange={e => { setCurrentManager(e.target.value); setCurrentPrice(""); }}
                style={{
                  background: "#0d150d", border: "1px solid #4a8a4a", borderRadius: "4px",
                  padding: "6px 10px", color: "#c8e6c9", fontSize: "13px", cursor: "pointer"
                }}>
                <option value="">— Select —</option>
                {MANAGERS.map(m => <option key={m} value={m}>{m}</option>)}
                <option value="shit">⚡ The Shit</option>
              </select>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ fontSize: "12px", color: isShitSelected ? "#3a5a3a" : "#4a8a4a" }}>£</span>
                <input
                  type="number"
                  min="0"
                  step="0.05"
                  placeholder="0.00"
                  value={currentPrice}
                  disabled={isShitSelected}
                  onChange={e => setCurrentPrice(e.target.value)}
                  style={{
                    width: "80px", background: isShitSelected ? "#0a0f0a" : "#0d150d",
                    border: `1px solid ${isShitSelected ? "#1a2a1a" : currentPrice ? "#4a8a4a" : "#2d3a2d"}`,
                    borderRadius: "4px", padding: "6px 8px",
                    color: isShitSelected ? "#2a3a2a" : "#81c784",
                    fontSize: "13px", outline: "none",
                    cursor: isShitSelected ? "not-allowed" : "text"
                  }}
                />
                <span style={{ fontSize: "12px", color: isShitSelected ? "#3a5a3a" : "#4a8a4a" }}>m</span>
              </div>
              <button
                onClick={handleSold}
                disabled={!canSold}
                style={{
                  padding: "8px 20px",
                  background: canSold ? "linear-gradient(135deg, #2d5a2d, #1a4a1a)" : "#0d150d",
                  border: `1px solid ${canSold ? "#4a8a4a" : "#1a2a1a"}`,
                  borderRadius: "4px", color: canSold ? "#c8e6c9" : "#2a3a2a",
                  fontSize: "13px", letterSpacing: "2px", textTransform: "uppercase",
                  cursor: canSold ? "pointer" : "not-allowed", fontFamily: "Georgia, serif"
                }}>
                {isShitSelected ? "SOLD! 💩" : "SOLD! ✓"}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background: "#111a11", border: "1px solid #2d5a2d", borderRadius: "8px", padding: "20px", marginBottom: "16px", textAlign: "center", color: "#4a8a4a" }}>
            🎉 Auction complete — all players assigned!
          </div>
        )}

        {/* Progress */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "16px" }}>
          <div style={{ background: "#111a11", border: "1px solid #2d5a2d", borderRadius: "6px", padding: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "20px", color: "#f59e0b" }}>{unsoldPlayers.length}</div>
            <div style={{ fontSize: "10px", color: "#4a8a4a", textTransform: "uppercase", letterSpacing: "1px" }}>Unsold</div>
          </div>
          <div style={{ background: "#111a11", border: "1px solid #2d5a2d", borderRadius: "6px", padding: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "20px", color: "#81c784" }}>{soldPlayers.length}</div>
            <div style={{ fontSize: "10px", color: "#4a8a4a", textTransform: "uppercase", letterSpacing: "1px" }}>Sold</div>
          </div>
          <div style={{ background: "#111a11", border: "1px solid #2d5a2d", borderRadius: "6px", padding: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "20px", color: "#ef9a9a" }}>{shitPlayers.length}</div>
            <div style={{ fontSize: "10px", color: "#4a8a4a", textTransform: "uppercase", letterSpacing: "1px" }}>The Shit</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
          {[
            { key: "unsold", label: `Unsold (${unsoldPlayers.length})` },
            { key: "sold", label: `Sold (${soldPlayers.length})` },
            { key: "shit", label: `The Shit (${shitPlayers.length})` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: "6px 14px",
              background: activeTab === tab.key ? "linear-gradient(135deg, #2d5a2d, #1a4a1a)" : "transparent",
              border: `1px solid ${activeTab === tab.key ? "#4a8a4a" : "#2d3a2d"}`,
              borderRadius: "4px", color: activeTab === tab.key ? "#c8e6c9" : "#4a8a4a",
              fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase", cursor: "pointer"
            }}>{tab.label}</button>
          ))}
        </div>

        {/* Unsold tab */}
        {activeTab === "unsold" && (
          <>
            <div style={{ display: "flex", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Search player or club..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, minWidth: "160px", background: "#111a11", border: "1px solid #2d5a2d", borderRadius: "6px", padding: "7px 12px", color: "#c8e6c9", fontSize: "13px", outline: "none" }}
              />
              <select value={filterPos} onChange={e => setFilterPos(e.target.value)}
                style={{ background: "#111a11", border: "1px solid #2d5a2d", borderRadius: "6px", padding: "7px 12px", color: "#c8e6c9", fontSize: "13px" }}>
                <option value="ALL">All Positions</option>
                <option value="GK">GK</option>
                <option value="DEF">DEF</option>
                <option value="MID">MID</option>
                <option value="FWD">FWD</option>
              </select>
            </div>
            <div style={{ fontSize: "11px", color: "#4a8a4a", marginBottom: "8px" }}>{filteredUnsold.length} players remaining</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              {filteredUnsold.map(p => (
                <div key={p.id} onClick={() => { setCurrentPlayerId(p.id); setCurrentManager(""); setCurrentPrice(""); }}
                  style={{
                    background: p.id === currentPlayerId ? "#1a3a1a" : "#111a11",
                    border: `1px solid ${p.id === currentPlayerId ? "#4a8a4a" : "#1a2a1a"}`,
                    borderRadius: "6px", padding: "8px 12px",
                    display: "flex", alignItems: "center", gap: "10px", cursor: "pointer"
                  }}>
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "4px", flexShrink: 0,
                    background: posColor[p.position] + "22", border: `1px solid ${posColor[p.position]}44`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "9px", fontWeight: "bold", color: posColor[p.position],
                  }}>{p.position}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#c8e6c9", fontSize: "13px" }}>{p.name}</div>
                    <div style={{ color: "#4a8a4a", fontSize: "10px" }}>{p.team}</div>
                  </div>
                  {p.id === currentPlayerId && (
                    <span style={{ fontSize: "10px", color: "#4a8a4a", letterSpacing: "1px" }}>CURRENT</span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Sold tab */}
        {activeTab === "sold" && (
  <div>
    {/* Manager spend panel */}
    <div style={{ background: "#111a11", border: "1px solid #2d5a2d", borderRadius: "6px", padding: "12px", marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div style={{ fontSize: "10px", color: "#4a8a4a", textTransform: "uppercase", letterSpacing: "2px" }}>Manager Budgets</div>
        {!showSpend ? (
          !confirmReveal ? (
            <button onClick={() => setConfirmReveal(true)} style={{ background: "#1a2a1a", border: "1px solid #3a5a3a", borderRadius: "4px", color: "#66bb6a", fontSize: "11px", padding: "4px 10px", cursor: "pointer" }}>Reveal Spend</button>
          ) : (
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "#f59e0b" }}>Reveal to everyone?</span>
              <button onClick={() => { setShowSpend(true); setConfirmReveal(false); }} style={{ background: "#3a1a1a", border: "1px solid #8a4a4a", borderRadius: "4px", color: "#ef9a9a", fontSize: "11px", padding: "4px 10px", cursor: "pointer" }}>Yes, reveal</button>
              <button onClick={() => setConfirmReveal(false)} style={{ background: "#1a2a1a", border: "1px solid #3a5a3a", borderRadius: "4px", color: "#66bb6a", fontSize: "11px", padding: "4px 10px", cursor: "pointer" }}>Cancel</button>
            </div>
          )
        ) : (
          <button onClick={() => setShowSpend(false)} style={{ background: "#1a2a1a", border: "1px solid #3a5a3a", borderRadius: "4px", color: "#66bb6a", fontSize: "11px", padding: "4px 10px", cursor: "pointer" }}>Hide Spend</button>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "6px" }}>
        {MANAGERS.map(m => {
          const stats = managerStats[m];
          const remaining = BUDGET - stats.spent;
          const overspent = remaining < 0;
          return (
            <div key={m} style={{ background: "#0d150d", border: `1px solid ${overspent && showSpend ? "#8a2a2a" : "#1e3a1e"}`, borderRadius: "4px", padding: "8px 10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#c8e6c9", fontSize: "13px" }}>{m}</span>
                <span style={{ color: "#4a8a4a", fontSize: "10px" }}>{stats.players}p</span>
              </div>
              {showSpend ? (
                <div style={{ marginTop: "3px" }}>
                  <div style={{ fontSize: "11px", color: "#81c784" }}>£{stats.spent.toFixed(2)}m spent</div>
                  <div style={{ fontSize: "11px", color: overspent ? "#ef9a9a" : "#66bb6a" }}>
                    {overspent ? `⚠ Over by £${Math.abs(remaining).toFixed(2)}m` : `£${remaining.toFixed(2)}m left`}
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: "3px", fontSize: "11px", color: "#2d4a2d" }}>••••••••</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {soldPlayers.length === 0 && <div style={{ color: "#4a8a4a", fontSize: "13px", padding: "16px", textAlign: "center" }}>No players sold yet</div>}
            {soldPlayers.map(p => {
              const entry = registry[p.id] || {};
              return (
                <div key={p.id} style={{ background: "#111a11", border: "1px solid #2d5a2d", borderRadius: "6px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "4px", flexShrink: 0,
                    background: posColor[p.position] + "22", border: `1px solid ${posColor[p.position]}44`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "9px", fontWeight: "bold", color: posColor[p.position],
                  }}>{p.position}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#c8e6c9", fontSize: "13px" }}>{p.name}</div>
                    <div style={{ color: "#4a8a4a", fontSize: "10px" }}>{p.team}</div>
                  </div>
                  <select value={entry.manager || ""} onChange={e => updateSoldEntry(p.id, "manager", e.target.value)}
                    style={{ background: "#1a3a1a", border: "1px solid #4a8a4a", borderRadius: "4px", padding: "4px 8px", color: "#81c784", fontSize: "12px", cursor: "pointer" }}>
                    {MANAGERS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ fontSize: "11px", color: "#4a8a4a" }}>£</span>
                    <input type="number" min="0" step="0.05" value={entry.price || ""}
                      onChange={e => updateSoldEntry(p.id, "price", e.target.value)}
                      style={{ width: "70px", background: "#0d150d", border: "1px solid #4a8a4a", borderRadius: "4px", padding: "4px 6px", color: "#81c784", fontSize: "12px", outline: "none" }} />
                    <span style={{ fontSize: "11px", color: "#4a8a4a" }}>m</span>
                  </div>
                </div>
              );
            })}
          </div>
    </div>
        )}

        {/* Shit tab */}
        {activeTab === "shit" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            {shitPlayers.length === 0 && <div style={{ color: "#4a8a4a", fontSize: "13px", padding: "16px", textAlign: "center" }}>No players in The Shit yet</div>}
            {shitPlayers.map(p => (
              <div key={p.id} style={{ background: "#111a11", border: "1px solid #1a2a1a", borderRadius: "6px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "28px", height: "28px", borderRadius: "4px", flexShrink: 0,
                  background: posColor[p.position] + "11", border: `1px solid ${posColor[p.position]}22`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "9px", fontWeight: "bold", color: posColor[p.position] + "88",
                }}>{p.position}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#4a6a4a", fontSize: "13px" }}>{p.name}</div>
                  <div style={{ color: "#2a4a2a", fontSize: "10px" }}>{p.team}</div>
                </div>
                <span style={{ fontSize: "10px", color: "#3a5a3a" }}>💩 The Shit</span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
