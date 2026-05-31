import { useState } from "react";
import Registry from "./Registry";

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
      { name: "Donnarumma", club: "Man City",     position: "GK",  isCaptain: false, fplId: 736, teamId: 13 },
      { name: "Hincapie",   club: "Arsenal",      position: "DEF", isCaptain: false, fplId: 725, teamId: 1  },
      { name: "Mukiele",    club: "Sunderland",   position: "DEF", isCaptain: false, fplId: 694, teamId: 17 },
      { name: "Akinmboni",  club: "Bournemouth",  position: "DEF", isCaptain: false, fplId: 75,  teamId: 4  },
      { name: "Summerville",club: "West Ham",     position: "MID", isCaptain: false, fplId: 615, teamId: 19 },
      { name: "Buendia",    club: "Aston Villa",  position: "MID", isCaptain: false, fplId: 50,  teamId: 2  },
      { name: "Anderson",   club: "Notts Forest", position: "MID", isCaptain: false, fplId: 517, teamId: 16 },
      { name: "Anthony",    club: "Burnley",      position: "MID", isCaptain: false, fplId: 200, teamId: 3  },
      { name: "Fleming",    club: "Burnley",      position: "FWD", isCaptain: false, fplId: 215, teamId: 3  },
      { name: "Woltemade",  club: "Newcastle",    position: "FWD", isCaptain: false, fplId: 714, teamId: 15 },
      { name: "Kroupi",     club: "Bournemouth",  position: "FWD", isCaptain: true,  fplId: 100, teamId: 4  },
    ],
  },
  {
    managerName: "Phil",
    teamName: "McAtee it high, watch it fly!",
    gameweek: 38,
    formation: "3-5-2",
    players: [
      { name: "Becker",      club: "Liverpool",      position: "GK",  isCaptain: false, fplId: 366, teamId: 12 },
      { name: "Aké",         club: "Man City",       position: "DEF", isCaptain: false, fplId: 405, teamId: 13 },
      { name: "Aït-Nouri",   club: "Man City",       position: "DEF", isCaptain: false, fplId: 402, teamId: 13 },
      { name: "Nunes",       club: "Man City",       position: "DEF", isCaptain: false, fplId: 407, teamId: 13 },
      { name: "Mainoo",      club: "Man Utd",        position: "MID", isCaptain: false, fplId: 458, teamId: 14 },
      { name: "Sarr",        club: "Crystal Palace", position: "MID", isCaptain: false, fplId: 267, teamId: 8  },
      { name: "Fernandez",   club: "Chelsea",        position: "MID", isCaptain: false, fplId: 237, teamId: 7  },
      { name: "Silva",       club: "Man City",       position: "MID", isCaptain: false, fplId: 416, teamId: 13 },
      { name: "Gravenberch", club: "Liverpool",      position: "MID", isCaptain: false, fplId: 390, teamId: 12 },
      { name: "Thiago",      club: "Brentford",      position: "FWD", isCaptain: false, fplId: 136, teamId: 5  },
      { name: "Bowen",       club: "West Ham",       position: "FWD", isCaptain: true,  fplId: 624, teamId: 19 },
    ],
  },
];

function buildTeamConcededMap(fixtures) {
  const map = {};
  fixtures.forEach(f => {
    map[f.team_h] = f.team_a_score;
    map[f.team_a] = f.team_h_score;
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

  // For GK/DEF use full match goals conceded from fixture result
  const isDefensive = position === "GK" || position === "DEF";
  const goalsConceded = isDefensive
    ? (teamConcededMap[teamId] ?? stats.goals_conceded ?? 0)
    : 0;
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
  if (cleanSheet > 0 && rules.cleanSheet > 0) {
    points += rules.cleanSheet;
    breakdown.push(`Clean sheet = +${rules.cleanSheet}pts`);
  }
  if (goalsConceded > 0 && rules.concede !== 0) {
    const p = goalsConceded * rules.concede;
    points += p;
    breakdown.push(`${goalsConceded} goal${goalsConceded > 1 ? "s" : ""} conceded × ${rules.concede} = ${p}pts (full match)`);
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

function TeamScorer({ team, gwStats, teamConcededMap }) {
  const [expanded, setExpanded] = useState({});
  const toggle = (i) => setExpanded(prev => ({ ...prev, [i]: !prev[i] }));

  const scored = team.players.map(p => {
    const stats = gwStats[p.fplId] || null;
    const { points, breakdown, notPlayed } = scorePlayer(stats, p.position, p.isCaptain, p.teamId, teamConcededMap);
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
                  {p.stats.minutes}' · {p.stats.goals_scored}G · {p.stats.assists}A
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
  const [page, setPage] = useState("scoring");
  const [gwStats, setGwStats] = useState(null);
  const [teamConcededMap, setTeamConcededMap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("");

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      setStatus("Fetching GW38 stats from FPL...");
      const [liveRes, fixtureRes] = await Promise.all([
        fetch(`${PROXY_URL}?endpoint=event/38/live`),
        fetch(`${PROXY_URL}?endpoint=fixtures/?event=38`),
      ]);
      if (!liveRes.ok) throw new Error(`Live data error: ${liveRes.status}`);
      if (!fixtureRes.ok) throw new Error(`Fixture data error: ${fixtureRes.status}`);

      const liveData = await liveRes.json();
      const fixtureData = await fixtureRes.json();

      const statsById = {};
      liveData.elements.forEach(el => { statsById[el.id] = el.stats; });

      const concededMap = buildTeamConcededMap(fixtureData);

      setGwStats(statsById);
      setTeamConcededMap(concededMap);
      setStatus("");
    } catch (err) {
      setError(err.message);
      setStatus("");
    }
    setLoading(false);
  }

  const nav = (
    <div style={{ display: "flex", justifyContent: "center", gap: "8px", padding: "12px 16px", background: "#0d150d", borderBottom: "1px solid #1a3a1a" }}>
      {["scoring", "registry"].map(p => (
        <button key={p} onClick={() => setPage(p)} style={{
          padding: "6px 20px",
          background: page === p ? "linear-gradient(135deg, #2d5a2d, #1a4a1a)" : "transparent",
          border: `1px solid ${page === p ? "#4a8a4a" : "#2d3a2d"}`,
          borderRadius: "4px", color: page === p ? "#c8e6c9" : "#4a8a4a",
          fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", cursor: "pointer"
        }}>{p}</button>
      ))}
    </div>
  );

  if (page === "registry") return <><div>{nav}</div><Registry /></>;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f0a", color: "#e8f5e9", fontFamily: "'Georgia', serif" }}>
      <div style={{ background: "linear-gradient(135deg, #1a3a1a, #0a1f0a)", borderBottom: "2px solid #2d5a2d", padding: "28px 24px 20px", textAlign: "center" }}>
        <div style={{ fontSize: "11px", letterSpacing: "4px", color: "#4a8a4a", marginBottom: "6px", textTransform: "uppercase" }}>Fantasy League · GW38 Scoring</div>
        <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "normal", color: "#c8e6c9" }}>2025/26 Season</h1>
      </div>
      {nav}
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
        {gwStats && teamConcededMap && (
          <>
            {TEAMS.map((team, i) => (
              <TeamScorer key={i} team={team} gwStats={gwStats} teamConcededMap={teamConcededMap} />
            ))}
            <button onClick={() => { setGwStats(null); setTeamConcededMap(null); }} style={{
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
