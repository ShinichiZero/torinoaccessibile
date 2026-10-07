export default function Header() {
  return (
    <header className="app-header">
      <div className="app-header__inner">
        <a
          className="brand"
          href="/"
          aria-label="Torino Accessibile - pagina principale"
        >
          <span
            className="brand__icon"
            aria-hidden="true"
          >
            ♿
          </span>

          <span className="brand__text">
            <span className="brand__name">
              Torino Accessibile
            </span>

            <span className="brand__tagline">
              Mobilità e accessibilità urbana
            </span>
          </span>
        </a>

        <div className="app-header__status">
          <span
            className="status-dot"
            aria-hidden="true"
          />

          <span>
            Fonti pubbliche: GTT e OSM
          </span>
        </div>
      </div>
    </header>
  );
}
