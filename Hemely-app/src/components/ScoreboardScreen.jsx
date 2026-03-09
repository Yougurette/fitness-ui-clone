import { BottomNav } from './BottomNav';

export function ScoreboardScreen({ entries, onEdit, onNavigate, success }) {
  return (
    <div className="main-screen">
      <h2>Rangliste</h2>
      {success && <div className="success-banner">Mitglieder erfolgreich angepasst.</div>}
      <div className="rank-head"><span>Name</span><span>Punkte</span></div>
      <ol className="rank-list">
        {entries.map((m) => <li key={m.id}><span>{m.name}</span><span>{m.points}</span></li>)}
      </ol>
      <button className="dark-btn" onClick={onEdit}>Mitglieder bearbeiten</button>
      <BottomNav active="scoreboard" onNavigate={onNavigate} />
    </div>
  );
}
