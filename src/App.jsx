import { useEffect, useMemo, useState } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { RegistrationScreen } from './components/RegistrationScreen';
import { TasksScreen } from './components/TasksScreen';
import { SuccessAnimation } from './components/SuccessAnimation';
import { ProfileScreen } from './components/ProfileScreen';
import { ScoreboardScreen } from './components/ScoreboardScreen';
import { ScoreboardEditScreen } from './components/ScoreboardEditScreen';
import { demoMembers } from './data/tasks';

const STORAGE_KEY = 'homely-app-data-v1';

const initialState = {
  view: 'login',
  loginDraft: { email: '', password: '' },
  registrationName: '',
  currentUser: null,
  members: demoMembers,
  successMessage: false,
  successTask: null
};

const loadState = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return initialState;
  try {
    return { ...initialState, ...JSON.parse(saved), view: 'login', successMessage: false, successTask: null };
  } catch {
    return initialState;
  }
};

export function App() {
  const [state, setState] = useState(() => loadState());
  const [loginError, setLoginError] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      currentUser: state.currentUser,
      members: state.members,
      registrationName: state.registrationName
    }));
  }, [state.currentUser, state.members, state.registrationName]);

  useEffect(() => {
    if (!state.successTask) return;
    const t = setTimeout(() => setState((s) => ({ ...s, view: 'tasks', successTask: null })), 1450);
    return () => clearTimeout(t);
  }, [state.successTask]);

  const leaderboard = useMemo(() => {
    const userEntry = state.currentUser ? [{ id: 'me', name: state.currentUser.name || 'Stefan', points: state.currentUser.points }] : [];
    return [...userEntry, ...state.members].sort((a, b) => b.points - a.points);
  }, [state.currentUser, state.members]);

  const navigateMain = (view) => setState((s) => ({ ...s, view, successMessage: false }));

  const onLogin = () => {
    const { email, password } = state.loginDraft;
    if (!email || !password) {
      setLoginError(true);
      return;
    }
    const user = state.currentUser;
    if (!user) {
      setLoginError(false);
      setState((s) => ({ ...s, view: 'registration' }));
      return;
    }
    if (user.email === email && user.password === password) {
      setLoginError(false);
      setState((s) => ({ ...s, view: 'tasks' }));
    } else {
      setLoginError(true);
    }
  };

  const finishRegistration = () => {
    if (!state.registrationName.trim()) return;
    setState((s) => ({
      ...s,
      currentUser: {
        name: s.registrationName.trim(),
        email: s.loginDraft.email,
        password: s.loginDraft.password,
        points: 56000,
        activities: []
      },
      view: 'tasks'
    }));
  };

  const completeTask = (task) => {
    const activity = { id: crypto.randomUUID(), taskName: task.name, points: task.points, timestamp: Date.now(), icon: task.icon };
    setState((s) => ({
      ...s,
      currentUser: { ...s.currentUser, points: s.currentUser.points + task.points, activities: [...s.currentUser.activities, activity] },
      view: 'success',
      successTask: task
    }));
  };

  const saveMembers = ({ email, selected }) => {
    let members = state.members.filter((m) => !selected.includes(m.id));
    if (email.trim()) {
      const base = email.split('@')[0] || 'Mitglied';
      members = [...members, { id: crypto.randomUUID(), name: base.charAt(0).toUpperCase() + base.slice(1), points: 12000 + Math.floor(Math.random() * 40000) }];
    }
    setState((s) => ({ ...s, members, view: 'scoreboard', successMessage: true }));
  };

  if (state.view === 'login') {
    return <LoginScreen email={state.loginDraft.email} password={state.loginDraft.password} error={loginError}
      onEmailChange={(v) => setState((s) => ({ ...s, loginDraft: { ...s.loginDraft, email: v } }))}
      onPasswordChange={(v) => setState((s) => ({ ...s, loginDraft: { ...s.loginDraft, password: v } }))}
      onSubmit={onLogin} />;
  }

  if (state.view === 'registration') {
    return <RegistrationScreen name={state.registrationName} onNameChange={(v) => setState((s) => ({ ...s, registrationName: v }))} onFinish={finishRegistration} />;
  }

  if (state.view === 'success' && state.successTask) {
    return <SuccessAnimation task={state.successTask} nameInitial={(state.currentUser?.name || 'N').charAt(0)} />;
  }

  if (state.view === 'profile') {
    return <ProfileScreen user={state.currentUser} onNameChange={(name) => setState((s) => ({ ...s, currentUser: { ...s.currentUser, name } }))}
      onLogout={() => setState((s) => ({ ...s, view: 'login', loginDraft: { email: '', password: '' } }))}
      onNavigate={navigateMain} />;
  }

  if (state.view === 'scoreboardEdit') {
    return <ScoreboardEditScreen members={leaderboard} onSave={saveMembers} onNavigate={navigateMain} />;
  }

  if (state.view === 'scoreboard') {
    return <ScoreboardScreen entries={leaderboard} onEdit={() => setState((s) => ({ ...s, view: 'scoreboardEdit' }))} onNavigate={navigateMain} success={state.successMessage} />;
  }

  return <TasksScreen points={state.currentUser?.points ?? 0} onTaskClick={completeTask} onNavigate={navigateMain} />;
}
