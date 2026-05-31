import { useState } from "react";

const PROXY_URL = "/api/fpl";

const SCORING_RULES = {
  GK:  { goal: 20, hatTrick: 100, cleanSheet: 4, concede: -1, assist: 2, ownGoal: -5, redCard: -5 },
  DEF: { goal: 5,  hatTrick: 20,  cleanSheet: 4, concede: -1, assist: 2, ownGoal: -5, redCard: -5 },
  MID: { goal: 4,  hatTrick: 15,  cleanSheet: 0, concede: 0,  assist: 2, ownGoal: -5, redCard: -5 },
  FWD: { goal: 3,  hatTrick: 10,  cleanSheet: 0, concede: 0,  assist: 2, ownGoal: -5, redCard: -5 },
};

const TEAMS = [
  {
    managerName: "Dom",
    teamName: "Lewis-Potter and the Goblet of Shite",
    gameweek: 38,
    formation: "3-4-3",
    players: [
      { name: "Donnarumma", club: "Man City",     position: "GK",  isCaptain: false, fplId: 736 },
      { name: "Hincapie",   club: "Arsenal",      position: "DEF", isCaptain: false, fplId: 725 },
      { name: "Mukiele",    club: "Sunderland",   position: "DEF", isCaptain: false, fplId: 694 },
      { name: "Akinmboni",  club: "Bournemouth",  position: "DEF", isCaptain: false, fplId: 75  },
      { name: "Summerville",club: "West Ham",     position: "MID", isCaptain: false, fplId: 615 },
      { name: "Buendia",    club: "Aston Villa",  position: "MID", isCaptain: false, fplId: 50  },
      { name: "Anderson",   club: "Notts Forest", position: "MID", isCaptain: false, fplId: 517 },
      { name: "Anthony",    club: "Burnley",      position: "MID", isCaptain: false, fplId: 200 },
      { name: "Fleming",    club: "Burnley",      position: "FWD", isCaptain: false, fplId: 215 },
      { name: "Woltemade",  club: "Newcastle",    position: "FWD", isCaptain: false, fplId: 714 },
      { name: "Kroupi",     club: "Bournemouth",  position: "FWD", isCaptain: true,  fplId: 100 },
    ],
  },
  {
    managerName: "Phil",
    teamName: "McAtee it high, watch it fly!",
    gameweek: 38,
    formation: "3-5-2",
    players: [
      { name: "Becker",       club: "Liverpool",       position: "GK",  isCaptain: false, fplId: 366 },
      { name: "Aké",          club: "Man City",        position: "DEF", isCaptain: false, fplId: 405 },
      { name: "Aït-Nouri",    club: "Man City",        position: "DEF", isCaptain: false, fplId: 402 },
      { name: "Nunes",        club: "Man City",        position: "DEF", isCaptain: false, fplId: 407 },
      { name: "Mainoo",       club: "Man Utd",         position: "MID", isCaptain: false, fplId: 458 },
      { name: "Sarr",         club: "Crystal Palace",  position: "MID", isCaptain: false, fplId: 267 },
      { name: "Fernandez",    club: "Chelsea",         position: "MID", isCaptain: false, fplId: 237 },
      { name: "Silva",        club: "Man City",        position: "MID", isCaptain: false, fplId: 416 },
      { name: "Gravenberch",  club: "Liverpool",       position: "MID", isCaptain: false, fplId: 390 },
      { name: "Thiago",       club: "Brentford",       position: "FWD", isCaptain: false, fplId: 136 },
      { name: "Bowen",        club: "West Ham",        position: "FWD", isCaptain: true,  fplId: 624 },
    ],
  },
];

function scorePlayer(stats, position, isCaptain) {
  if (!stats || !stats.played) {
    return { points: 0, breakdown: ["Did not play — scored 0"], notPlayed: true };
  }
  const rules = SCORING_RULES[position];
  let points = 0;
  const breakdown = [];
  const { goals_scored: goals = 0, assists = 0, clean_sheets: cleanSheet = 0,
          goals_conceded: conceded = 0, own_goals: ownGoals = 0, red_cards: redCards = 0, minutes = 0 } = stats;

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
  if (cleanSheet > 0 && rules.cleanSheet > 0) {
    points += rules.cleanSheet;
    breakdown.push(`Clean sheet = +${rules.cleanSheet}pts`);
  }
  if (conceded > 0 && rules.concede !== 0) {
    const p = conceded * rules.concede;
    points += p;
    breakdown.push(`${conceded} goal${conceded > 1 ? "s" : ""} conceded × ${rules.concede} = ${p}pts`);
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

const posColor = { GK: "#f59e0b", DEF: "#3b82f6", MID: "#10b981", FWD: "#ef4444" };

function TeamScorer({ team, gwStats }) {
  const [expanded, setExpanded] = useState({});
  const toggle = (i) => setExpanded(prev => ({ ...prev, [i]: !prev[i] }));

  const scored = team.players.map(p => {
    const stats = gwStats[p.fplId] || null;
    const { points, breakdown, notPlayed } = scorePlayer(stats, p.position, p.isCaptain);
    return { ...p, stats, points, breakdown, notPlayed };
  });
  const total = scored.reduce((sum, p) => sum + p.points, 0);

  return (
    <div style={{ marginBottom: "32px" }}>
      <div style={{ background: "#111a11", border: "1px solid #2d5a2d", borderRadius: "8px", padding: "20px", marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
          <div>
            <div style={{ fontSize: "11px", letterSpacing: "3px", color: "#4a8a4a", textTransform: "uppercase", marginBottom: "4px" }}>Manager</div>
            <div style={{ fontSize: "20px", color: "#c8e6c9" }}>{team.managerName}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", letterSpacing: "3px", color: "#4a8a4a", textTransform: "uppercase", marginBottom: "4px" }}>Formation</div>
            <div style={{ fontSize: "20px", color: "#c8e6c9" }}>{team.formation}</div>
          </div>
        </div>
        <div style={{ background: "#0d150d", borderRadius: "4px", padding: "10px 14px", fontSize: "13px", color: "#81c784", fontStyle: "italic", borderLeft: "3px solid #2d5a2d" }}>
          "{team.teamName}"
        </div>
      </div>

      <div style={{
        background: "linear-gradient(135deg, #1a3a1a, #0d2b0d)", border: "2px solid #4a8a4a",
        borderRadius: "8px", padding: "16px", textAlign: "center", marginBottom: "12px",
        display: "flex", alignItems: "center", justifyContent: "center", gap: "16px"
      }}>
        <div style={{ fontSize: "11px", letterSpacing: "4px", color: "#4a8a4a", textTransform: "uppercase" }}>Total Score</div>
        <div style={{ fontSize: "48px", color: "#c8e6c9", lineHeight: 1 }}>{total}</div>
        <div style={{ fontSize: "12px", color: "#66bb6a" }}>pts</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {scored.map((p, i) => (
          <div key={i} style={{
            background: "#111a11",
            border: `1px solid ${p.notPlayed ? "#3a2a0a" : "#1e3a1e"}`,
            borderRadius: "6px", overflow: "hidden"
          }}>
            <div onClick={() => toggle(i)} style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
              <div style={{
                width: "32px", height: "32px", borderRadius: "4px", flexShrink: 0,
                background: posColor[p.position] + "22", border: `1px solid ${posColor[p.position]}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "9px", fontWeight: "bold", color: posColor[p.position],
              }}>{p.position}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ color: "#c8e6c9", fontSize: "13px" }}>{p.name}</span>
                  {p.isCaptain && <span style={{ background: "#f59e0b22", border: "1px solid #f59e0b44", color: "#f59e0b", fontSize: "9px", padding: "1px 5px", borderRadius: "3px" }}>C</span>}
                  {p.notPlayed && <span style={{ background: "#78350f22", border: "1px solid #78350f44", color: "#fbbf24", fontSize: "9px", padding: "1px 5px", borderRadius: "3px" }}>DNP</span>}
                </div>
                <div style={{ fontSize: "10px", color: "#4a8a4a", marginTop: "1px" }}>{p.club}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: "16px", color: p.points > 0 ? "#81c784" : p.points < 0 ? "#ef9a9a" : "#666" }}>
                  {p.points > 0 ? "+" : ""}{p.points}
                </div>
                <div style={{ fontSize: "9px", color: "#3a6a3a" }}>{expanded[i] ? "▲" : "▼"}</div>
              </div>
            </div>
            {expanded[i] && (
              <div style={{ borderTop: "1px solid #1e3a1e", padding: "10px 14px", background: "#0d150d" }}>
                {p.stats && <div style={{ fontSize: "10px", color: "#4a8a4a", marginBottom: "6px" }}>
                  {p.stats.minutes}' · {p.stats.goals_scored}G · {p.stats.assists}A · {p.stats.clean_sheets}CS · {p.stats.goals_conceded} conceded
                </div>}
                {p.breakdown.map((line, j) => (
                  <div key={j} style={{ fontSize: "11px", color: "#81c784", padding: "2px 0", borderBottom: j < p.breakdown.length - 1 ? "1px solid #1a2a1a" : "none" }}>
                    · {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [gwStats, setGwStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("");

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      setStatus("Fetching GW38 stats from FPL...");
      const res = await fetch(`${PROXY_URL}?endpoint=event/38/live`);
      if (!res.ok) throw new Error(`Proxy error: ${res.status}`);
      const data = await res.json();
      const statsById = {};
      data.elements.forEach(el => { statsById[el.id] = el.stats; });
      setGwStats(statsById);
      setStatus("");
    } catch (err) {
      setError(err.message);
      setStatus("");
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f0a", color: "#e8f5e9", fontFamily: "'Georgia', serif" }}>
      <div style={{
        background: "linear-gradient(135deg, #1a3a1a, #0a1f0a)",
        borderBottom: "2px solid #2d5a2d", padding: "28px 24px 20px", textAlign: "center",
      }}>
        <div style={{ fontSize: "11px", letterSpacing: "4px", color: "#4a8a4a", marginBottom: "6px", textTransform: "uppercase" }}>
          Fantasy League · GW38 Scoring
        </div>
        <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "normal", color: "#c8e6c9" }}>2025/26 Season</h1>
      </div>

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "24px 16px" }}>
        {!gwStats && (
          <button onClick={loadData} disabled={loading} style={{
            width: "100%", padding: "16px",
            background: loading ? "#1a3a1a" : "linear-gradient(135deg, #2d5a2d, #1a4a1a)",
            border: "1px solid #4a8a4a", borderRadius: "8px",
            color: loading ? "#4a8a4a" : "#c8e6c9",
            fontSize: "14px", letterSpacing: "2px", textTransform: "uppercase",
            cursor: loading ? "not-allowed" : "pointer", marginBottom: "20px",
          }}>
            {loading ? `⏳ ${status}` : "▶  Load GW38 Scores"}
          </button>
        )}

        {error && (
          <div style={{ background: "#1a0a0a", border: "1px solid #5a2d2d", borderRadius: "8px", padding: "16px", marginBottom: "20px", color: "#ef9a9a", fontSize: "13px" }}>
            ⚠ {error}
          </div>
        )}

        {gwStats && (
          <>
            {TEAMS.map((team, i) => (
              <TeamScorer key={i} team={team} gwStats={gwStats} />
            ))}
            <button onClick={() => setGwStats(null)} style={{
              width: "100%", padding: "12px", background: "transparent",
              border: "1px solid #2d5a2d", borderRadius: "6px", color: "#4a8a4a",
              fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase", cursor: "pointer",
            }}>↺  Reset</button>
          </>
        )}
      </div>
    </div>
  );
}
