export default function Header({ consultorio }) {
  return (
    <header className="header">
      <h1 className="header__brand">Sonrisa al día</h1>
      {consultorio && <p className="header__clinic">{consultorio}</p>}
    </header>
  );
}
