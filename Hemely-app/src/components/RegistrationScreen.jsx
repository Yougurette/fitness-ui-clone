export function RegistrationScreen({ name, onNameChange, onFinish }) {
  return (
    <div className="auth-screen">
      <div className="auth-overlay">
        <h1>Homely</h1>
        <p className="subtitle strong">Registration</p>
        <p className="step">Schritt 2 von 2</p>
        <label>Name</label>
        <input value={name} onChange={(e) => onNameChange(e.target.value)} />
        <button className="cta" onClick={onFinish}>Registration abschließen</button>
      </div>
    </div>
  );
}
