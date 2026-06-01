import { useState, useEffect } from "react";

const MANAGERS = [
  "Dom", "Matt", "Gary", "Martin", "Phil",
  "Ry", "Dan", "Paul", "Will", "Simmons", "Fish", "Joe"
];

const BUDGET = 100;
const POSITIONS = { 1: "GK", 2: "DEF", 3: "MID", 4: "FWD" };
const POSITION_ORDER = { 1: 0, 2: 1, 3: 2, 4: 3 };
const posColor = { GK: "#f59e0b", DEF: "#3b82f6", MID: "#10b981", FWD: "#ef4444" };

export default function Registry({ theme }) {
  const [players, setPlayers] = useState([]);
  const [registry, setRegistry] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPos, setFilterPos] = useState("ALL");
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

    const unsoldIds = players.filter(p => !newRegistry[p.id]).map(p => p.id);
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

  const unsoldPlayers = players.filter(p => !registry[p.id]);
  const soldPlayers = players
    .filter(p => registry[p.id]?.status === "sold")
    .sort((a, b) => (registry[b.id]?.soldAt || 0) - (registry[a.id]?.soldAt || 0));
  const shitPlayers = players
    .filter(p => registry[p.id]?.status === "shit")
    .sort((a, b) => (registry[b.id]?.soldAt || 0) - (registry[a.id]?.soldAt || 0));

  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const isShitSelected = currentManager === "shit";

  const managerStats = {};
  MANAGERS.forEach(m => { managerStats[m] = { players: 0, spent: 0 }; });
  soldPlayers.forEach(p => {
    const entry = registry[p.id];
    if (entry?.manager && managerStats[entry.manager]) {
      managerStats[entry.manager].players++;
      managerStats[entry.manager].spent += parseFloat(entry.price || 0);
    }
  });

  const filteredUnsold = unsoldPlayers.filter(p => {
    const matchesSearch = search === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.team.toLowerCase().includes(search.toLowerCase());
    const matchesPos = filterPos === "ALL" || p.position === filterPos;
    return matchesSearch && matchesPos;
  });

  const canSold = isShitSelected || (currentManager && currentPrice);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: theme.bg, display: "flex", alignItems: "center", justifyContent: "center", color: theme.textMuted, fontFamily: "Georgia, serif" }}>
      Loading player registry...
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text, fontFamily: "'Georgia', serif" }}>

      <div style={{ background: theme.bgHeader, borderBottom: `2px solid ${theme.border}`, padding: "16px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "11px", letterSpacing: "4px", color: "#a5d6a7", marginBottom: "4px", textTransform: "uppercase" }}>Fantasy League · Auction</div>
        <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "normal", color: "#ffffff" }}>2025/26 Season</h1>
        {status && <div style={{ marginTop: "6px", fontSize: "12px", color: "#a5d6a7" }}>{status}</div>}
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "12px 16px" }}>

        {/* Current Player */}
        {activeTab === "unsold" && currentPlayer ? (
          <div style={{ background: theme.bgHeader, border: `2px solid ${theme.borderActive}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#a5d6a7", textTransform: "uppercase", marginBottom: "10px" }}>Current Player</div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "6px", flexShrink: 0,
                background: posColor[currentPlayer.position] + "33", border: `2px solid ${posColor[currentPlayer.position]}66`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11px", fontWeight: "bold", color: posColor[currentPlayer.position],
              }}>{currentPlayer.position}</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#ffffff", fontSize: "18px" }}>{currentPlayer.name}</div>
                <div style={{ color: "#a5d6a7", fontSize: "12px" }}>{currentPlayer.team}</div>
              </div>
              <select
                value={currentManager}
                onChange={e => { setCurrentManager(e.target.value); setCurrentPrice(""); }}
                style={{ background: theme.bgInput, border: `1px solid ${theme.borderActive}`, borderRadius: "4px", padding: "6px 10px", color: theme.text, fontSize: "13px", cursor: "pointer" }}>
                <option value="">— Select —</option>
                {MANAGERS.map(m => <option key={m} value={m}>{m}</option>)}
                <option value="shit">⚡ The Shit</option>
              </select>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ fontSize: "12px", color: isShitSelected ? theme.textDim : theme.textMuted }}>£</span>
                <input
                  type="number" min="0" step="0.05" placeholder="0.00"
                  value={currentPrice}
                  disabled={isShitSelected}
                  onChange={e => setCurrentPrice(e.target.value)}
                  style={{
                    width: "80px", background: isShitSelected ? theme.bg : theme.bgInput,
                    border: `1px solid ${isShitSelected ? theme.borderSubtle : currentPrice ? theme.borderActive : theme.border}`,
                    borderRadius: "4px", padding: "6px 8px",
                    color: isShitSelected ? theme.textDim : theme.textBright,
                    fontSize: "13px", outline: "none",
                    cursor: isShitSelected ? "not-allowed" : "text"
                  }}
                />
                <span style={{ fontSize: "12px", color: isShitSelected ? theme.textDim : theme.textMuted }}>m</span>
              </div>
              <button onClick={handleSold} disabled={!canSold} style={{
                padding: "8px 20px",
                background: canSold ? theme.buttonBg : theme.buttonDisabled,
                border: `1px solid ${canSold ? theme.borderActive : theme.borderSubtle}`,
                borderRadius: "4px", color: canSold ? "#ffffff" : theme.textDim,
                fontSize: "13px", letterSpacing: "2px", textTransform: "uppercase",
                cursor: canSold ? "pointer" : "not-allowed", fontFamily: "Georgia, serif"
              }}>
                {isShitSelected ? "SOLD! 💩" : "SOLD! ✓"}
              </button>
            </div>
          </div>
        ) : activeTab === "unsold" ? (
          <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: "8px", padding: "20px", marginBottom: "16px", textAlign: "center", color: theme.textMuted }}>
            🎉 Auction complete — all players assigned!
          </div>
        ) : null}

        {/* Progress */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "16px" }}>
          {[
            { label: "Unsold", value: unsoldPlayers.length, color: theme.warning },
            { label: "Sold", value: soldPlayers.length, color: theme.textBright },
            { label: "The Shit", value: shitPlayers.length, color: theme.danger },
          ].map(item => (
            <div key={item.label} style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: "6px", padding: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "20px", color: item.color }}>{item.value}</div>
              <div style={{ fontSize: "10px", color: theme.textMuted, textTransform: "uppercase", letterSpacing: "1px" }}>{item.label}</div>
            </div>
          ))}
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
              background: activeTab === tab.key ? theme.buttonBg : "transparent",
              border: `1px solid ${activeTab === tab.key ? theme.borderActive : theme.borderSubtle}`,
              borderRadius: "4px", color: activeTab === tab.key ? "#ffffff" : theme.textMuted,
              fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase", cursor: "pointer"
            }}>{tab.label}</button>
          ))}
        </div>

        {/* Unsold tab */}
        {activeTab === "unsold" && (
          <>
            <div style={{ display: "flex", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
              <input type="text" placeholder="Search player or club..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, minWidth: "160px", background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: "6px", padding: "7px 12px", color: theme.text, fontSize: "13px", outline: "none" }}
              />
              <select value={filterPos} onChange={e => setFilterPos(e.target.value)}
                style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: "6px", padding: "7px 12px", color: theme.text, fontSize: "13px" }}>
                <option value="ALL">All Positions</option>
                <option value="GK">GK</option>
                <option value="DEF">DEF</option>
                <option value="MID">MID</option>
                <option value="FWD">FWD</option>
              </select>
            </div>
            <div style={{ fontSize: "11px", color: theme.textMuted, marginBottom: "8px" }}>{filteredUnsold.length} players remaining</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              {filteredUnsold.map(p => (
                <div key={p.id} onClick={() => { setCurrentPlayerId(p.id); setCurrentManager(""); setCurrentPrice(""); }}
                  style={{
                    background: p.id === currentPlayerId ? theme.bgHeader : theme.bgCard,
                    border: `1px solid ${p.id === currentPlayerId ? theme.borderActive : theme.borderSubtle}`,
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
                    <div style={{ color: p.id === currentPlayerId ? "#ffffff" : theme.text, fontSize: "13px" }}>{p.name}</div>
                    <div style={{ color: p.id === currentPlayerId ? "#a5d6a7" : theme.textMuted, fontSize: "10px" }}>{p.team}</div>
                  </div>
                  {p.id === currentPlayerId && (
                    <span style={{ fontSize: "10px", color: "#a5d6a7", letterSpacing: "1px" }}>CURRENT</span>
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
            <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: "6px", padding: "12px", marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ fontSize: "10px", color: theme.textMuted, textTransform: "uppercase", letterSpacing: "2px" }}>Manager Budgets</div>
                {!showSpend ? (
                  !confirmReveal ? (
                    <button onClick={() => setConfirmReveal(true)} style={{ background: "transparent", border: `1px solid ${theme.border}`, borderRadius: "4px", color: theme.accent, fontSize: "11px", padding: "4px 10px", cursor: "pointer" }}>Reveal Spend</button>
                  ) : (
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", color: theme.warning }}>Reveal to everyone?</span>
                      <button onClick={() => { setShowSpend(true); setConfirmReveal(false); }} style={{ background: "transparent", border: `1px solid ${theme.danger}`, borderRadius: "4px", color: theme.danger, fontSize: "11px", padding: "4px 10px", cursor: "pointer" }}>Yes, reveal</button>
                      <button onClick={() => setConfirmReveal(false)} style={{ background: "transparent", border: `1px solid ${theme.border}`, borderRadius: "4px", color: theme.accent, fontSize: "11px", padding: "4px 10px", cursor: "pointer" }}>Cancel</button>
                    </div>
                  )
                ) : (
                  <button onClick={() => setShowSpend(false)} style={{ background: "transparent", border: `1px solid ${theme.border}`, borderRadius: "4px", color: theme.accent, fontSize: "11px", padding: "4px 10px", cursor: "pointer" }}>Hide Spend</button>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "6px" }}>
                {MANAGERS.map(m => {
                  const stats = managerStats[m];
                  const remaining = BUDGET - stats.spent;
                  const overspent = remaining < 0;
                  return (
                    <div key={m} style={{ background: theme.bgInput, border: `1px solid ${overspent && showSpend ? theme.danger : theme.borderSubtle}`, borderRadius: "4px", padding: "8px 10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: theme.text, fontSize: "13px" }}>{m}</span>
                        <span style={{ color: theme.textMuted, fontSize: "10px" }}>{stats.players}p</span>
                      </div>
                      {showSpend ? (
                        <div style={{ marginTop: "3px" }}>
                          <div style={{ fontSize: "11px", color: theme.textBright }}>£{stats.spent.toFixed(2)}m spent</div>
                          <div style={{ fontSize: "11px", color: overspent ? theme.danger : theme.accent }}>
                            {overspent ? `⚠ Over by £${Math.abs(remaining).toFixed(2)}m` : `£${remaining.toFixed(2)}m left`}
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginTop: "3px", fontSize: "11px", color: theme.borderSubtle }}>••••••••</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {soldPlayers.length === 0 && <div style={{ color: theme.textMuted, fontSize: "13px", padding: "16px", textAlign: "center" }}>No players sold yet</div>}
              {soldPlayers.map(p => {
                const entry = registry[p.id] || {};
                return (
                  <div key={p.id} style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: "6px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <div style={{
                      width: "28px", height: "28px", borderRadius: "4px", flexShrink: 0,
                      background: posColor[p.position] + "22", border: `1px solid ${posColor[p.position]}44`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "9px", fontWeight: "bold", color: posColor[p.position],
                    }}>{p.position}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: theme.text, fontSize: "13px" }}>{p.name}</div>
                      <div style={{ color: theme.textMuted, fontSize: "10px" }}>{p.team}</div>
                    </div>
                    <select value={entry.manager || ""} onChange={e => updateSoldEntry(p.id, "manager", e.target.value)}
                      style={{ background: theme.bgInput, border: `1px solid ${theme.borderActive}`, borderRadius: "4px", padding: "4px 8px", color: theme.textBright, fontSize: "12px", cursor: "pointer" }}>
                      {MANAGERS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ fontSize: "11px", color: theme.textMuted }}>£</span>
                      <input type="number" min="0" step="0.05" value={entry.price || ""}
                        onChange={e => updateSoldEntry(p.id, "price", e.target.value)}
                        style={{ width: "70px", background: theme.bgInput, border: `1px solid ${theme.borderActive}`, borderRadius: "4px", padding: "4px 6px", color: theme.textBright, fontSize: "12px", outline: "none" }} />
                      <span style={{ fontSize: "11px", color: theme.textMuted }}>m</span>
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
            {shitPlayers.length === 0 && <div style={{ color: theme.textMuted, fontSize: "13px", padding: "16px", textAlign: "center" }}>No players in The Shit yet</div>}
            {shitPlayers.map(p => (
              <div key={p.id} style={{ background: theme.bgCard, border: `1px solid ${theme.borderSubtle}`, borderRadius: "6px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "28px", height: "28px", borderRadius: "4px", flexShrink: 0,
                  background: posColor[p.position] + "11", border: `1px solid ${posColor[p.position]}22`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "9px", fontWeight: "bold", color: posColor[p.position] + "88",
                }}>{p.position}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: theme.textMuted, fontSize: "13px" }}>{p.name}</div>
                  <div style={{ color: theme.textDim, fontSize: "10px" }}>{p.team}</div>
                </div>
                <span style={{ fontSize: "10px", color: theme.textMuted }}>💩 The Shit</span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
