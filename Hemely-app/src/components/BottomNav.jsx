export function BottomNav({ active, onNavigate }) {
  return (
    <nav className="bottom-nav">
      <button className={active === 'profile' ? 'active' : ''} onClick={() => onNavigate('profile')}>Profil</button>
      <button className="plus" onClick={() => onNavigate('tasks')}>+</button>
      <button className={active === 'scoreboard' ? 'active' : ''} onClick={() => onNavigate('scoreboard')}>Liste</button>
    </nav>
  );
}
