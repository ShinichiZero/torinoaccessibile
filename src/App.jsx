import { useState } from 'react';
import Header from './components/Header';
import MapView from './components/MapView';
import Footer from './components/Footer';
import './App.css';

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'long', timeZone: 'Europe/Rome' }).format(date);
}

function App() {
  const [dataset, setDataset] = useState({ status: 'loading', stops: [], metadata: {} });

  return (
    <div className="app">
      <a className="skip-link" href="#main-content">Vai al contenuto</a>
      <Header />

      <main className="main-content" id="main-content" tabIndex="-1">
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
              Esplora le fermate GTT e gli elementi di accessibilità a Torino e nell’area coperta dal feed.
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
                {dataset.status === 'ready' ? dataset.stops.length.toLocaleString('it-IT') : '—'}
              </span>

              <span className="stat-card__label">
                Fermate GTT
              </span>
            </div>

            <div className="stat-card stat-card--positive">
              <span className="stat-card__value">
                {dataset.status === 'ready' ? dataset.stops.filter((stop) => stop.properties.wheelchair === 'yes').length.toLocaleString('it-IT') : '—'}
              </span>

              <span className="stat-card__label">
                Valore GTFS: sì
              </span>
            </div>

            <div className="stat-card stat-card--negative">
              <span className="stat-card__value">
                {dataset.status === 'ready' ? dataset.stops.filter((stop) => stop.properties.wheelchair === 'no').length.toLocaleString('it-IT') : '—'}
              </span>

              <span className="stat-card__label">
                Valore GTFS: no
              </span>
            </div>

            <div className="stat-card stat-card--unknown">
              <span className="stat-card__value">
                {dataset.status === 'ready' ? dataset.stops.filter((stop) => stop.properties.wheelchair === 'unknown').length.toLocaleString('it-IT') : '—'}
              </span>

              <span className="stat-card__label">
                Informazione non disponibile
              </span>
            </div>
          </div>
          <p className="stats-note" aria-live="polite">
            {dataset.status === 'loading' && 'Caricamento dati GTT…'}
            {dataset.status === 'error' && 'Statistiche non disponibili: il dataset GTT non è stato caricato.'}
            {dataset.status === 'ready' && (formatDate(dataset.metadata.generatedAt)
              ? `Dati GTFS elaborati il ${formatDate(dataset.metadata.generatedAt)}.${dataset.isStale ? ' Feed oltre 30 giorni: i dati potrebbero essere obsoleti.' : ''}${dataset.metadata.feedVersionDate ? ` Versione dichiarata nel feed: ${formatDate(dataset.metadata.feedVersionDate)}.` : ''}${dataset.metadata.feedStartDate && dataset.metadata.feedEndDate ? ` Periodo del feed: ${formatDate(dataset.metadata.feedStartDate)} – ${formatDate(dataset.metadata.feedEndDate)}.` : ''}${formatDate(dataset.metadata.sourceUpdatedAt) ? ` Data di modifica registrata nel catalogo aperTO: ${formatDate(dataset.metadata.sourceUpdatedAt)}.` : ''}`
              : 'Data di elaborazione GTFS non disponibile.')}
          </p>
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
              Cerca una fermata nell’elenco oppure seleziona un punto sulla mappa per consultarne i dati disponibili.
            </p>
          </div>

          <MapView onDatasetChange={setDataset} />
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
                  <strong>Accessibilità indicata nel feed GTFS</strong> descrive il valore dichiarato nel campo wheelchair_boarding. Per una fermata senza piattaforme figlie, “sì” indica che alcuni veicoli possono essere accessibili; per una piattaforma indica la presenza di un percorso accessibile. Il significato dipende quindi dal tipo di fermata.
                </p>

                <p>
                  <strong>Non accessibile secondo il feed</strong> riporta il valore esplicito “no” della fonte, senza una verifica sul posto.
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
              <span className="information-card__icon" aria-hidden="true">⌕</span>
              <div>
                <h2>Limiti e privacy</h2>
                <p>Il dato GTFS non verifica il veicolo in arrivo né l’intero viaggio. Marciapiedi, rampe, ascensori e percorsi non sono verificati da questa mappa.</p>
                <p>Le mappe di base sono richieste a OpenStreetMap; i dati aggiuntivi vengono richiesti a Overpass solo quando premi il pulsante e includono l’area visibile della mappa. Questi servizi ricevono la normale richiesta di rete, incluso l’indirizzo IP.</p>
                <p>L’elenco cercabile delle fermate è un’alternativa alla navigazione della mappa. L’accessibilità dei controlli mappa può variare con browser e tecnologia assistiva.</p>
                <p><a href="https://github.com/ShinichiZero/torinoaccessibile/issues" target="_blank" rel="noreferrer">Segnala un errore o chiedi una correzione</a>. <a href="https://gtfs.org/documentation/schedule/reference/#stopstxt" target="_blank" rel="noreferrer">Metodologia del campo GTFS</a>.</p>
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
