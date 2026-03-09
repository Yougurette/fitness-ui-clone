export function SuccessAnimation({ task, nameInitial }) {
  return (
    <div className="success-screen">
      <div className="initial-badge">{nameInitial}</div>
      <div className="confetti" />
      <div className="success-content">
        <div className="success-icon">{task.icon}</div>
        <h2>{task.name}</h2>
        <p>+{task.points}</p>
      </div>
    </div>
  );
}
