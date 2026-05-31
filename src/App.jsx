import { useState } from "react";

const PROXY_URL = "/api/fpl";

const SCORING_RULES = {
  GK:  { goal: 20, hatTrick: 100, cleanSheet: 4, concede: -1, assist: 2, ownGoal: -5, redCard: -5 },
  DEF: { goal: 5,  hatTrick: 20,  cleanSheet: 4, concede: -1, assist: 2, ownGoal: -5, redCard: -5 },
  MID: { goal: 4,  hatTrick: 15,  cleanSheet: 0, concede: 0,  assist: 2, ownGoal: -5, redCard: -5 },
  FWD: { goal: 3,  hatTrick: 10,  cleanSheet: 0, concede: 0,  assist: 2, ownGoal: -5, redCard: -5 },
};

const DOM_GW38 = {
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
};

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

export default function App() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("");
  const [expanded, setExpanded] = useState({});

  async function runScoring() {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      setStatus("Fetching GW38 stats from FPL...");
      const res = await fetch(`${PROXY_URL}?endpoint=event/38/live`);
      if (!res.ok) throw new Error(`Proxy error: ${res.status}`);
      const data = await res.json();

      const statsById = {};
      data.elements.forEach(el => { statsById[el.id] = el.stats; });

      setStatus("Calculating scores...");

      const scored = DOM_GW38.players.map(p => {
        const stats = statsById[p.fplId] || null;
        const { points, breakdown, notPlayed } = scorePlayer(stats, p.position, p.isCaptain);
        return { ...p, stats, points, breakdown, notPlayed };
      });

      const total = scored.reduce((sum, p) => sum + p.points, 0);
      setResults({ players: scored, total });
      setStatus("");
    } catch (err) {
