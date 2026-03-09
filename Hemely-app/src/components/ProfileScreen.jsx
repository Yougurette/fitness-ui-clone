import { BottomNav } from './BottomNav';

const formatDate = (stamp) => {
  const d = new Date(stamp);
  return `${d.toLocaleDateString('de-DE')} ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
};

export function ProfileScreen({ user, onNameChange, onLogout, onNavigate }) {
  const activities = [...user.activities].reverse().slice(0, 10);
  return (
    <div className="main-screen">
      <header><h2>Profil</h2><div className="points">Punkte<br />{user.points}</div></header>
      <h3>Persönliche Angaben</h3>
      <label>Name</label>
      <input value={user.name} onChange={(e) => onNameChange(e.target.value)} />
      <h3>Letzte 10 Aktivitäten</h3>
      <div className="activity-head"><span>Wann</span><span>Task</span><span>Punkte</span></div>
      <div className="activity-list">
        {activities.map((a) => <div className="activity-row" key={a.id}><span>{formatDate(a.timestamp)}</span><span>{a.icon} {a.taskName}</span><span className="gain">+{a.points}</span></div>)}
      </div>
      <button className="dark-btn" onClick={onLogout}>Logout</button>
      <BottomNav active="profile" onNavigate={onNavigate} />
    </div>
  );
}
