import { taskSections } from '../data/tasks';
import { BottomNav } from './BottomNav';

export function TasksScreen({ points, onTaskClick, onNavigate }) {
  return (
    <div className="main-screen">
      <header><h2>Tasks</h2><div className="points">Punkte<br />{points}</div></header>
      {taskSections.map((section) => (
        <section key={section.title}>
          <h3>{section.title}</h3>
          <div className="task-grid">
            {section.items.map((task) => (
              <button key={task.name} className="task-card" onClick={() => onTaskClick(task)}>
                <span>{task.icon}</span>
                <strong>{task.name}</strong>
                <small>{task.points}</small>
              </button>
            ))}
          </div>
        </section>
      ))}
      <BottomNav active="tasks" onNavigate={onNavigate} />
    </div>
  );
}
