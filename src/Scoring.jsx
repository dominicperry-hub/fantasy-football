import { useState, useEffect } from "react";

const SCORING_RULES = {
  GK:  { goal: 20, hatTrick: 100, cleanSheet: 4, concede: -1, assist: 2, ownGoal: -5, redCard: -5 },
  DEF: { goal: 5,  hatTrick: 20,  cleanSheet: 4, concede: -1, assist: 2, ownGoal: -5, redCard: -5 },
  MID: { goal: 4,  hatTrick: 15,  cleanSheet: 0, concede: 0,  assist: 2, ownGoal: -5, redCard: -5 },
  FWD: { goal: 3,  hatTrick: 10,  cleanSheet: 0, concede: 0,  assist: 2, ownGoal: -5, redCard: -5 },
};

const FPL_POSITIONS = { 1: "GK", 2: "DEF", 3: "MID", 4: "FWD" };
const posColor = { GK: "#f59e0b", DEF: "#3b82f6", MID: "#10b981", FWD: "#ef4444" };

// Normalise a string for fuzzy matching
function normalise(str) {
  return str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[a.length][b.length];
}

function findPlayer(playerName, club, allPlayers, teams) {
  const normName = normalise(playerName);
  const normClub = normalise(club);

  const team = teams.find(t =>
    normalise(t.name).includes(normClub) ||
    normClub.includes(normalise(t.name))
  );
  const teamId = team?.id;

  const candidates = teamId
    ? allPlayers.filter(p => p.team === teamId)
    : allPlayers;

  // Exact web_name match
  const exact = candidates.find(p => normalise(p.web_name) === normName);
  if (exact) return exact;

  // Exact second_name match
  const secondExact = candidates.find(p => normalise(p.second_name) === normName);
  if (secondExact) return secondExact;

  // Partial match
  const partial = candidates.find(p =>
    normalise(p.web_name).includes(normName) ||
    normName.includes(normalise(p.web_name)) ||
    normalise(p.second_name).includes(normName) ||
    normName.includes(normalise(p.second_name))
  );
  if (partial) return partial;

  // Fuzzy match using Levenshtein — threshold of 3 changes
  const THRESHOLD = 3;
  let bestMatch = null;
  let bestDistance = THRESHOLD + 1;

  for (const p of candidates) {
    const webDist = levenshtein(normName, normalise(p.web_name));
    const secondDist = levenshtein(normName, normalise(p.second_name));
    const dist = Math.min(webDist, secondDist);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestMatch = p;
    }
  }

  if (bestMatch) return bestMatch;

  // Last resort — fuzzy match across all players if team not found
  if (teamId) return findPlayer(playerName, "", allPlayers, teams);

  return null;
}

// Parse a raw WhatsApp team submission
function parseTeam(raw) {
  const lines = raw.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 4) return null;

  // Line 1: manager name + gameweek
  const line1 = lines[0];
  const gwMatch = line1.match(/(\d+)/);
  const gameweek = gwMatch ? parseInt(gwMatch[1]) : null;
  const managerName = line1.replace(/game\s*week\s*\d+/i, "").replace(/gw\s*\d+/i, "").trim();

  // Line 2: team name
  const teamName = lines[1];

  // Line 3: formation
  const formationLine = lines.find(l => l.match(/formation[:\s]*([\d-]+)/i) || l.match(/^[\d]-[\d]-[\d]/));
  const formationMatch = formationLine?.match(/([\d]-[\d]-[\d])/);
  const formation = formationMatch ? formationMatch[1] : null;

  // Remaining lines: players
  const players = [];
  const playerLineRegex = /^(.+?)\s*-\s*(.+?)(\s*\(c\))?$/i;

  for (const line of lines) {
    if (line.match(/game\s*week/i) || line.match(/^gw\s*\d+/i)) continue;
    if (line.match(/formation/i)) continue;
    if (line === teamName) continue;
    if (line === lines[0]) continue;

    const match = line.match(playerLineRegex);
    if (match) {
      const playerName = match[1].trim();
      const club = match[2].replace(/\(c\)/i, "").trim();
      const isCaptain = !!match[3] || line.toLowerCase().includes("(c)");
      players.push({ name: playerName, club, isCaptain, raw: line });
    }
  }

  return { managerName, gameweek, teamName, formation, players, raw };
}

// Find a player in the FPL bootstrap by name + club
function normalise(str) {
  return str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[a.length][b.length];
}

function findPlayer(playerName, club, allPlayers, teams) {
  const normName = normalise(playerName);
  const normClub = normalise(club);

  const team = teams.find(t =>
    normalise(t.name).includes(normClub) ||
    normClub.includes(normalise(t.name))
  );
  const teamId = team?.id;

  const candidates = teamId
    ? allPlayers.filter(p => p.team === teamId)
    : allPlayers;

  // Exact web_name match
  const exact = candidates.find(p => normalise(p.web_name) === normName);
  if (exact) return exact;

  // Exact second_name match
  const secondExact = candidates.find(p => normalise(p.second_name) === normName);
  if (secondExact) return secondExact;

  // Partial match
  const partial = candidates.find(p =>
    normalise(p.web_name).includes(normName) ||
    normName.includes(normalise(p.web_name)) ||
    normalise(p.second_name).includes(normName) ||
    normName.includes(normalise(p.second_name))
  );
  if (partial) return partial;

  // Fuzzy match using Levenshtein — threshold of 3 changes
  const THRESHOLD = 3;
  let bestMatch = null;
  let bestDistance = THRESHOLD + 1;

  for (const p of candidates) {
    const webDist = levenshtein(normName, normalise(p.web_name));
    const secondDist = levenshtein(normName, normalise(p.second_name));
    const dist = Math.min(webDist, secondDist);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestMatch = p;
    }
  }

  if (bestMatch) return bestMatch;

  // Last resort — fuzzy match across all players if team not found
  if (teamId) return findPlayer(playerName, "", allPlayers, teams);

  return null;
}
  // Find team ID from club name
  const team = teams.find(t => normalise(t.name).includes(normClub) || normClub.includes(normalise(t.name)));
  const teamId = team?.id;

  // Try exact web_name match first within the team
  if (teamId) {
    const exact = allPlayers.find(p => p.team === teamId && normalise(p.web_name) === normName);
    if (exact) return exact;

    // Try second name match within team
    const secondName = allPlayers.find(p => p.team === teamId && normalise(p.second_name) === normName);
    if (secondName) return secondName;

    // Try partial match within team
    const partial = allPlayers.find(p => p.team === teamId && (
      normalise(p.web_name).includes(normName) || normName.includes(normalise(p.web_name)) ||
      normalise(p.second_name).includes(normName) || normName.includes(normalise(p.second_name))
    ));
    if (partial) return partial;
  }

  // Fallback: search all players
  const fallback = allPlayers.find(p =>
    normalise(p.web_name) === normName ||
    normalise(p.second_name) === normName ||
    normalise(p.web_name).includes(normName) ||
    normName.includes(normalise(p.web_name))
  );
  return fallback || null;
}

function buildTeamConcededMap(fixtures) {
  const map = {};
  fixtures.forEach(f => {
    if (f.team_h_score !== null && f.team_a_score !== null) {
      map[f.team_h] = f.team_a_score;
      map[f.team_a] = f.team_h_score;
    }
  });
  return map;
}

function scorePlayer(stats, position, isCaptain, teamId, teamConcededMap) {
  if (!stats || !stats.played) {
    return { points: 0, breakdown: ["Did not play — scored 0"], notPlayed: true };
  }
  const rules = SCORING_RULES[position];
  let points = 0;
  const breakdown = [];
  const { goals_scored: goals = 0, assists = 0, own_goals: ownGoals = 0,
          red_cards: redCards = 0, minutes = 0 } = stats;

  const isDefensive = position === "GK" || position === "DEF";
  const goalsConceded = isDefensive ? (teamConcededMap[teamId] ?? 0) : 0;
  const cleanSheet = isDefensive && goalsConceded === 0 ? 1 : 0;

  if (goals > 0) {
    const p = goals * rules.goal;
    points += p;
    breakdown.push(`${goals} goal${goals > 1 ? "s" : ""} × ${rules.goal} = +${p}pts`);
  }
  if (goals >= 3) {
    points += rules.hatTrick;
    breakdown.push(`Hat-trick bonus = +${rules.hatTrick}pts`);
  }
  if (assists > 0) {
    const p = assists * rules.assist;
    points += p;
    breakdown.push(`${assists} assist${assists > 1 ? "s" : ""} × ${rules.assist} = +${p}pts`);
  }
  if (cleanSheet && rules.cleanSheet > 0) {
    points += rules.cleanSheet;
    breakdown.push(`Clean sheet = +${rules.cleanSheet}pts`);
  }
  if (goalsConceded > 0 && rules.concede !== 0) {
    const p = goalsConceded * rules.concede;
    points += p;
    breakdown.push(`${goalsConceded} goal${goalsConceded > 1 ? "s" : ""} conceded = ${p}pts`);
  }
  if (ownGoals > 0) {
    const p = ownGoals * rules.ownGoal;
    points += p;
    breakdown.push(`${ownGoals} own goal${ownGoals > 1 ? "s" : ""} = ${p}pts`);
  }
  if (redCards > 0) {
    const p = redCards * rules.redCard;
    points += p;
    breakdown.push(`Red card = ${p}pts`);
  }
  if (breakdown.length === 0) breakdown.push(`Played ${minutes}' — no scoring actions`);

  const base = points;
  if (isCaptain) {
    points = points * 2;
    breakdown.push(`⭐ Captain ×2 (base ${base}pts → ${points}pts)`);
  }
  return { points, breakdown, notPlayed: false };
}

export default function Scoring({ theme }) {
  const [rawInput, setRawInput] = useState("");
  const [gameweek, setGameweek] = useState(1);
  const [parsed, setParsed] = useState(null);
  const [parseError, setParseError] = useState("");
  const [scored, setScored] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [expanded, setExpanded] = useState({});
  const [gwResults, setGwResults] = useState({});
  const [seasonData, setSeasonData] = useState({});
  const [activeView, setActiveView] = useState("submit");
  const [fplData, setFplData] = useState(null);
  const [registry, setRegistry] = useState({});

  useEffect(() => {
    loadInitialData();
    loadSeasonData();
  }, []);

  async function loadInitialData() {
    try {
      const [bootstrapRes, registryRes] = await Promise.all([
        fetch("/api/fpl?endpoint=bootstrap-static"),
        fetch("/api/registry"),
      ]);
      const bootstrap = await bootstrapRes.json();
      const reg = await registryRes.json();
      setFplData(bootstrap);
      setRegistry(reg || {});
    } catch (err) {
      setStatus("Error loading FPL data: " + err.message);
    }
  }

  async function loadSeasonData() {
    try {
      const res = await fetch("/api/season");
      if (res.ok) {
        const data = await res.json();
        setSeasonData(data || {});
        // Set gwResults for current view
        setGwResults(data || {});
      }
    } catch (err) {
      // Season data may not exist yet
    }
  }

  function handleParse() {
    setParseError("");
    setScored(null);
    const result = parseTeam(rawInput);
    if (!result || result.players.length === 0) {
      setParseError("Could not parse team — check the format and try again.");
      return;
    }
    // Override gameweek from parsed if found
    if (result.gameweek) setGameweek(result.gameweek);
    setParsed(result);
  }

  async function handleScore() {
    if (!parsed || !fplData) return;
    setLoading(true);
    setStatus("Fetching GW data from FPL...");

    try {
      const gw = parsed.gameweek || gameweek;
      const [liveRes, fixtureRes] = await Promise.all([
        fetch(`/api/fpl?endpoint=event/${gw}/live`),
        fetch(`/api/fpl?endpoint=fixtures/?event=${gw}`),
      ]);
      const liveData = await liveRes.json();
      const fixtureData = await fixtureRes.json();

      const statsById = {};
      liveData.elements.forEach(el => { statsById[el.id] = el.stats; });
      const teamConcededMap = buildTeamConcededMap(fixtureData);

      // Score each player
      const scoredPlayers = parsed.players.map(p => {
        const fplPlayer = findPlayer(p.name, p.club, fplData.elements, fplData.teams);
        const fplTeam = fplPlayer ? fplData.teams.find(t => t.id === fplPlayer.team) : null;
        const position = fplPlayer ? FPL_POSITIONS[fplPlayer.element_type] : "MID";
        const stats = fplPlayer ? statsById[fplPlayer.id] : null;

        // Check ownership
        const owned = fplPlayer
          ? Object.entries(registry).some(([id, entry]) =>
              parseInt(id) === fplPlayer.id && entry?.manager === parsed.managerName &&
              (entry?.status === "sold" || entry?.manager))
          : false;

        const { points, breakdown, notPlayed } = scorePlayer(
          stats, position, p.isCaptain, fplPlayer?.team, teamConcededMap
        );

        return {
          ...p,
          fplId: fplPlayer?.id || null,
          fplName: fplPlayer ? `${fplPlayer.first_name} ${fplPlayer.second_name}` : null,
          fplTeam: fplTeam?.name || p.club,
          position,
          stats,
          points,
          breakdown,
          notPlayed,
          notFound: !fplPlayer,
          notOwned: fplPlayer && !owned,
        };
      });

      const total = scoredPlayers.reduce((sum, p) => sum + p.points, 0);
      const result = {
        managerName: parsed.managerName,
        teamName: parsed.teamName,
        formation: parsed.formation,
        gameweek: parsed.gameweek || gameweek,
        players: scoredPlayers,
        total,
        raw: parsed.raw,
        savedAt: Date.now(),
      };

      setScored(result);
      setStatus("");
    } catch (err) {
      setStatus("Error scoring team: " + err.message);
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!scored) return;
    const gw = scored.gameweek;
    const newSeasonData = {
      ...seasonData,
      [gw]: {
        ...(seasonData[gw] || {}),
        [scored.managerName]: scored,
      }
    };
    setSeasonData(newSeasonData);

    try {
      await fetch("/api/season", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSeasonData),
      });
      setStatus("Saved ✓");
      setTimeout(() => setStatus(""), 2000);
      setRawInput("");
      setParsed(null);
      setScored(null);
      setActiveView("table");
    } catch (err) {
      setStatus("Save failed: " + err.message);
    }
  }

  const toggle = (i) => setExpanded(prev => ({ ...prev, [i]: !prev[i] }));

  // Build league table from season data
  const allManagers = [...new Set(
    Object.values(seasonData).flatMap(gw => Object.keys(gw))
  )].sort();

  const allGameweeks = Object.keys(seasonData).map(Number).sort((a, b) => a - b);

  const managerTotals = {};
  allManagers.forEach(m => {
    managerTotals[m] = { total: 0, weeks: {} };
    allGameweeks.forEach(gw => {
      const score = seasonData[gw]?.[m]?.total || null;
      managerTotals[m].weeks[gw] = score;
      if (score !== null) managerTotals[m].total += score;
    });
  });

  const sortedManagers = [...allManagers].sort((a, b) => (managerTotals[b]?.total || 0) - (managerTotals[a]?.total || 0));

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text, fontFamily: "'Georgia', serif" }}>

      {/* Header */}
      <div style={{ background: theme.bgHeader, borderBottom: `2px solid ${theme.border}`, padding: "16px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "11px", letterSpacing: "4px", color: "#a5d6a7", marginBottom: "4px", textTransform: "uppercase" }}>Fantasy League · Scoring</div>
        <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "normal", color: "#ffffff" }}>2025/26 Season</h1>
        {status && <div style={{ marginTop: "6px", fontSize: "12px", color: "#a5d6a7" }}>{status}</div>}
      </div>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "16px" }}>

        {/* Sub nav */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
          {[
            { key: "submit", label: "Submit Team" },
            { key: "table", label: `League Table` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveView(tab.key)} style={{
              padding: "6px 16px",
              background: activeView === tab.key ? theme.buttonBg : "transparent",
              border: `1px solid ${activeView === tab.key ? theme.borderActive : theme.borderSubtle}`,
              borderRadius: "4px", color: activeView === tab.key ? "#ffffff" : theme.textMuted,
              fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase", cursor: "pointer"
            }}>{tab.label}</button>
          ))}
        </div>

        {/* Submit Team view */}
        {activeView === "submit" && (
          <div>
            {/* Gameweek selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", color: theme.textMuted, textTransform: "uppercase", letterSpacing: "2px" }}>Gameweek</div>
              <select value={gameweek} onChange={e => setGameweek(parseInt(e.target.value))}
                style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: "4px", padding: "6px 12px", color: theme.text, fontSize: "14px" }}>
                {Array.from({ length: 38 }, (_, i) => i + 1).map(gw => (
                  <option key={gw} value={gw}>GW{gw}</option>
                ))}
              </select>
            </div>

            {/* Paste box */}
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", color: theme.textMuted, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>Paste Team Submission</div>
              <textarea
                value={rawInput}
                onChange={e => { setRawInput(e.target.value); setParsed(null); setScored(null); }}
                placeholder={"Phil Game week 38\nMcAtee it high, watch it fly!\nFormation: 3-5-2\nBecker - Liverpool\n..."}
                style={{
                  width: "100%", height: "200px", background: theme.bgCard,
                  border: `1px solid ${theme.border}`, borderRadius: "6px",
                  padding: "12px", color: theme.text, fontSize: "13px",
                  fontFamily: "monospace", outline: "none", resize: "vertical",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <button onClick={handleParse} disabled={!rawInput.trim()} style={{
              padding: "10px 24px", background: rawInput.trim() ? theme.buttonBg : theme.buttonDisabled,
              border: `1px solid ${rawInput.trim() ? theme.borderActive : theme.borderSubtle}`,
              borderRadius: "6px", color: rawInput.trim() ? "#ffffff" : theme.textDim,
              fontSize: "13px", letterSpacing: "2px", textTransform: "uppercase",
              cursor: rawInput.trim() ? "pointer" : "not-allowed", marginBottom: "16px"
            }}>Parse Team</button>

            {parseError && (
              <div style={{ background: theme.bgCard, border: `1px solid ${theme.danger}`, borderRadius: "6px", padding: "12px", marginBottom: "16px", color: theme.danger, fontSize: "13px" }}>
                ⚠ {parseError}
              </div>
            )}

            {/* Parsed preview */}
            {parsed && !scored && (
              <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
                <div style={{ fontSize: "11px", color: theme.textMuted, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px" }}>Parsed Team — Check Before Scoring</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <div style={{ fontSize: "10px", color: theme.textMuted, textTransform: "uppercase" }}>Manager</div>
                    <div style={{ color: theme.text, fontSize: "15px" }}>{parsed.managerName}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", color: theme.textMuted, textTransform: "uppercase" }}>Gameweek</div>
                    <div style={{ color: theme.text, fontSize: "15px" }}>GW{parsed.gameweek || gameweek}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", color: theme.textMuted, textTransform: "uppercase" }}>Formation</div>
                    <div style={{ color: theme.text, fontSize: "15px" }}>{parsed.formation || "Not detected"}</div>
                  </div>
                </div>
                <div style={{ fontSize: "12px", color: theme.textMuted, fontStyle: "italic", marginBottom: "12px" }}>"{parsed.teamName}"</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "16px" }}>
                  {parsed.players.map((p, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", background: theme.bgInput, borderRadius: "4px" }}>
                      <span style={{ color: theme.text, fontSize: "13px", flex: 1 }}>{p.name}</span>
                      <span style={{ color: theme.textMuted, fontSize: "11px" }}>{p.club}</span>
                      {p.isCaptain && <span style={{ background: "#f59e0b22", border: "1px solid #f59e0b44", color: "#f59e0b", fontSize: "9px", padding: "1px 5px", borderRadius: "3px" }}>C</span>}
                    </div>
                  ))}
                </div>
                <button onClick={handleScore} disabled={loading} style={{
                  padding: "10px 24px", background: loading ? theme.buttonDisabled : theme.buttonBg,
                  border: `1px solid ${theme.borderActive}`, borderRadius: "6px",
                  color: "#ffffff", fontSize: "13px", letterSpacing: "2px", textTransform: "uppercase",
                  cursor: loading ? "not-allowed" : "pointer"
                }}>
                  {loading ? "⏳ Scoring..." : "▶ Score Team"}
                </button>
              </div>
            )}

            {/* Scored result */}
            {scored && (
              <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
                <div style={{ fontSize: "11px", color: theme.textMuted, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px" }}>Score Result</div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div>
                    <div style={{ fontSize: "20px", color: theme.text }}>{scored.managerName}</div>
                    <div style={{ fontSize: "12px", color: theme.textMuted, fontStyle: "italic" }}>"{scored.teamName}"</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "48px", color: theme.textBright, lineHeight: 1 }}>{scored.total}</div>
                    <div style={{ fontSize: "11px", color: theme.textMuted }}>points · GW{scored.gameweek}</div>
                  </div>
                </div>

                {/* Ownership warnings */}
                {scored.players.some(p => p.notOwned || p.notFound) && (
                  <div style={{ background: theme.bgInput, border: `1px solid ${theme.warning}`, borderRadius: "6px", padding: "10px", marginBottom: "12px" }}>
                    <div style={{ fontSize: "11px", color: theme.warning, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>⚠ Flags for Admin Review</div>
                    {scored.players.filter(p => p.notFound).map((p, i) => (
                      <div key={i} style={{ fontSize: "12px", color: theme.danger }}>· {p.name} — not found in FPL data</div>
                    ))}
                    {scored.players.filter(p => p.notOwned).map((p, i) => (
                      <div key={i} style={{ fontSize: "12px", color: theme.warning }}>· {p.name} — not in {scored.managerName}'s registered squad (possible -5pts)</div>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "16px" }}>
                  {scored.players.map((p, i) => (
                    <div key={i} style={{ background: theme.bgInput, border: `1px solid ${p.notOwned ? theme.warning : p.notFound ? theme.danger : theme.borderSubtle}`, borderRadius: "6px", overflow: "hidden" }}>
                      <div onClick={() => toggle(i)} style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                        <div style={{
                          width: "28px", height: "28px", borderRadius: "4px", flexShrink: 0,
                          background: posColor[p.position] + "22", border: `1px solid ${posColor[p.position]}44`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "9px", fontWeight: "bold", color: posColor[p.position],
                        }}>{p.position}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ color: theme.text, fontSize: "13px" }}>{p.name}</span>
                            {p.isCaptain && <span style={{ background: "#f59e0b22", border: "1px solid #f59e0b44", color: "#f59e0b", fontSize: "9px", padding: "1px 5px", borderRadius: "3px" }}>C</span>}
                            {p.notFound && <span style={{ background: theme.danger + "22", border: `1px solid ${theme.danger}44`, color: theme.danger, fontSize: "9px", padding: "1px 5px", borderRadius: "3px" }}>NOT FOUND</span>}
                            {p.notOwned && <span style={{ background: theme.warning + "22", border: `1px solid ${theme.warning}44`, color: theme.warning, fontSize: "9px", padding: "1px 5px", borderRadius: "3px" }}>NOT OWNED</span>}
                            {p.notPlayed && <span style={{ background: theme.textMuted + "22", border: `1px solid ${theme.textMuted}44`, color: theme.textMuted, fontSize: "9px", padding: "1px 5px", borderRadius: "3px" }}>DNP</span>}
                          </div>
                          <div style={{ color: theme.textMuted, fontSize: "10px" }}>{p.fplTeam || p.club}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "16px", color: p.points > 0 ? theme.textBright : p.points < 0 ? theme.danger : theme.textDim }}>
                            {p.points > 0 ? "+" : ""}{p.points}
                          </div>
                          <div style={{ fontSize: "9px", color: theme.textDim }}>{expanded[i] ? "▲" : "▼"}</div>
                        </div>
                      </div>
                      {expanded[i] && (
                        <div style={{ borderTop: `1px solid ${theme.borderSubtle}`, padding: "8px 12px", background: theme.bg }}>
                          {p.fplName && <div style={{ fontSize: "10px", color: theme.textMuted, marginBottom: "6px" }}>{p.fplName} · {p.stats?.minutes || 0}'</div>}
                          {p.breakdown.map((line, j) => (
                            <div key={j} style={{ fontSize: "11px", color: theme.textBright, padding: "2px 0", borderBottom: j < p.breakdown.length - 1 ? `1px solid ${theme.borderSubtle}` : "none" }}>
                              · {line}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={handleSave} style={{
                    flex: 1, padding: "10px", background: theme.buttonBg,
                    border: `1px solid ${theme.borderActive}`, borderRadius: "6px",
                    color: "#ffffff", fontSize: "13px", letterSpacing: "2px",
                    textTransform: "uppercase", cursor: "pointer"
                  }}>💾 Save Result</button>
                  <button onClick={() => { setScored(null); setParsed(null); setRawInput(""); }} style={{
                    padding: "10px 16px", background: "transparent",
                    border: `1px solid ${theme.borderSubtle}`, borderRadius: "6px",
                    color: theme.textMuted, fontSize: "12px", cursor: "pointer"
                  }}>Discard</button>
                </div>
              </div>
            )}

            {/* GW results so far */}
            {seasonData[gameweek] && Object.keys(seasonData[gameweek]).length > 0 && (
              <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: "8px", padding: "16px" }}>
                <div style={{ fontSize: "11px", color: theme.textMuted, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px" }}>GW{gameweek} Results So Far</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {Object.entries(seasonData[gameweek])
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([manager, result]) => (
                      <div key={manager} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", background: theme.bgInput, borderRadius: "4px" }}>
                        <span style={{ flex: 1, color: theme.text, fontSize: "13px" }}>{manager}</span>
                        <span style={{ fontSize: "12px", color: theme.textMuted, fontStyle: "italic" }}>{result.formation}</span>
                        <span style={{ fontSize: "18px", color: theme.textBright, fontWeight: "bold" }}>{result.total}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* League Table view */}
        {activeView === "table" && (
          <div>
            {allGameweeks.length === 0 ? (
              <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: "8px", padding: "32px", textAlign: "center", color: theme.textMuted }}>
                No results yet — submit some teams to get started!
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "8px 10px", color: theme.textMuted, fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", borderBottom: `1px solid ${theme.border}` }}>Manager</th>
                      {allGameweeks.map(gw => (
                        <th key={gw} style={{ padding: "8px 8px", color: theme.textMuted, fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", borderBottom: `1px solid ${theme.border}`, textAlign: "center" }}>GW{gw}</th>
                      ))}
                      <th style={{ padding: "8px 10px", color: theme.textBright, fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", borderBottom: `1px solid ${theme.border}`, textAlign: "center" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedManagers.map((manager, idx) => (
                      <tr key={manager} style={{ background: idx % 2 === 0 ? theme.bgCard : theme.bgInput }}>
                        <td style={{ padding: "8px 10px", color: theme.text, borderBottom: `1px solid ${theme.borderSubtle}` }}>
                          <span style={{ color: theme.textMuted, fontSize: "11px", marginRight: "8px" }}>{idx + 1}</span>
                          {manager}
                        </td>
                        {allGameweeks.map(gw => (
                          <td key={gw} style={{ padding: "8px", textAlign: "center", color: managerTotals[manager]?.weeks[gw] !== null ? theme.text : theme.textDim, borderBottom: `1px solid ${theme.borderSubtle}` }}>
                            {managerTotals[manager]?.weeks[gw] ?? "—"}
                          </td>
                        ))}
                        <td style={{ padding: "8px 10px", textAlign: "center", color: theme.textBright, fontWeight: "bold", fontSize: "15px", borderBottom: `1px solid ${theme.borderSubtle}` }}>
                          {managerTotals[manager]?.total || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
