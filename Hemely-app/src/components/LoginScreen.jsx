export function LoginScreen({ email, password, error, onEmailChange, onPasswordChange, onSubmit }) {
  return (
    <div className="auth-screen">
      <div className="auth-overlay">
        <h1>Homely</h1>
        <p className="subtitle">Willkommen zurück</p>
        {error && <div className="error-box">E-Mail und Passwort stimmen nicht überein.</div>}
        <label>E-Mail</label>
        <input value={email} onChange={(e) => onEmailChange(e.target.value)} />
        <label>Passwort</label>
        <input type="password" value={password} onChange={(e) => onPasswordChange(e.target.value)} />
        <button className="cta" onClick={onSubmit}>Anmelden oder registrieren</button>
      </div>
    </div>
  );
}
