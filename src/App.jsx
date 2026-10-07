import Header from './components/Header';
import MapView from './components/MapView';
import Footer from './components/Footer';
import './App.css';

function App() {
  return (
    <div className="app">
      <Header />

      <main className="main-content">
        <section
          className="hero"
          aria-labelledby="page-title"
        >
          <div className="hero__content">
            <div className="hero__eyebrow">
              MAPPA DELL'ACCESSIBILITÀ URBANA
            </div>

            <h1 id="page-title">
              Torino più accessibile,
              <br />
              un dato alla volta.
            </h1>

            <p className="hero__description">
              Esplora le fermate GTT e gli elementi
              di accessibilità mappati sul territorio
              di Torino.
            </p>

            <div className="hero__sources">
              <span>
                <strong>GTT/5T</strong>
                {' '}trasporto pubblico
              </span>

              <span>
                <strong>OpenStreetMap</strong>
                {' '}dati territoriali
              </span>
            </div>
          </div>
        </section>

        <section
          className="stats-section"
          aria-label="Statistiche dei dati disponibili"
        >
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-card__value">
                7.123
              </span>

              <span className="stat-card__label">
                Fermate GTT
              </span>
            </div>

            <div className="stat-card stat-card--positive">
              <span className="stat-card__value">
                2.764
              </span>

              <span className="stat-card__label">
                Accessibilità dichiarata
              </span>
            </div>

            <div className="stat-card stat-card--negative">
              <span className="stat-card__value">
                1.083
              </span>

              <span className="stat-card__label">
                Non accessibili dichiarate
              </span>
            </div>

            <div className="stat-card stat-card--unknown">
              <span className="stat-card__value">
                3.276
              </span>

              <span className="stat-card__label">
                Informazione non disponibile
              </span>
            </div>
          </div>
        </section>

        <section
          className="map-section"
          aria-labelledby="map-title"
        >
          <div className="section-heading">
            <div>
              <span className="section-heading__eyebrow">
                ESPLORA
              </span>

              <h2 id="map-title">
                Mappa dell'accessibilità
              </h2>
            </div>

            <p>
              Seleziona un punto sulla mappa
              per visualizzare le informazioni
              disponibili.
            </p>
          </div>

          <MapView />
        </section>

        <section
          className="information-section"
          aria-labelledby="information-title"
        >
          <div className="information-grid">
            <article className="information-card">
              <span
                className="information-card__icon"
                aria-hidden="true"
              >
                ♿
              </span>

              <div>
                <h2 id="information-title">
                  Come leggere i dati
                </h2>

                <p>
                  <strong>Accessibile</strong> significa
                  che la fonte dichiara la fermata
                  accessibile.
                </p>

                <p>
                  <strong>Non accessibile</strong> significa
                  che la fonte dichiara esplicitamente
                  la non accessibilità.
                </p>

                <p>
                  <strong>Dato non disponibile</strong>
                  significa che la fonte non fornisce
                  un'informazione sufficiente per
                  classificare la fermata.
                </p>
              </div>
            </article>

            <article className="information-card">
              <span
                className="information-card__icon"
                aria-hidden="true"
              >
                ℹ
              </span>

              <div>
                <h2>
                  Una mappa informativa
                </h2>

                <p>
                  I dati provengono da fonti pubbliche
                  e possono non riflettere le condizioni
                  effettivamente presenti sul territorio.
                </p>

                <p>
                  La presenza di un elemento sulla mappa
                  non costituisce una garanzia della sua
                  accessibilità o del suo funzionamento.
                </p>
              </div>
            </article>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default App;