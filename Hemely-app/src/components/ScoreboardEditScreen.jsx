import { useState } from 'react';
import { BottomNav } from './BottomNav';

export function ScoreboardEditScreen({ members, onSave, onNavigate }) {
  const [email, setEmail] = useState('');
  const [selected, setSelected] = useState([]);

  const toggle = (id) => {
    setSelected((curr) => curr.includes(id) ? curr.filter((v) => v !== id) : [...curr, id]);
  };

  return (
    <div className="main-screen">
      <h2>Rangliste</h2>
      <div className="rank-head"><span>Name</span><span>Mitglied</span></div>
      <ol className="rank-list edit">
        {members.map((m) => (
          <li key={m.id}>
            <span>{m.name}</span>
            <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggle(m.id)} />
          </li>
        ))}
      </ol>
      <h3>Mitglied hinzufügen</h3>
      <label>E-Mail</label>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <button className="dark-btn" onClick={() => onSave({ email, selected })}>Mitglieder speichern</button>
      <BottomNav active="scoreboard" onNavigate={onNavigate} />
    </div>
  );
}
