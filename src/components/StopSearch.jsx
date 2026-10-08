import { useEffect, useMemo, useRef, useState } from 'react';
import { filterStops } from '../services/stopSearch';

export default function StopSearch({ stops, metadata, loading, error, selectedStop, onSelectStop }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const detailsHeading = useRef(null);
  const triggerButton = useRef(null);
  const matches = useMemo(() => filterStops(stops, search, status), [stops, search, status]);

  useEffect(() => {
    if (selectedStop) detailsHeading.current?.focus();
  }, [selectedStop]);

  const selectStop = (stop, event) => {
    triggerButton.current = event.currentTarget;
    onSelectStop(stop);
  };

  const closeDetails = () => {
    onSelectStop(null);
    requestAnimationFrame(() => triggerButton.current?.focus());
  };

  return (
    <section className="stop-search" aria-labelledby="stop-search-title">
      <div className="stop-search__heading">
        <div>
          <h3 id="stop-search-title">Trova una fermata</h3>
          <p>Cerca per nome o codice, anche senza usare la mappa.</p>
        </div>
        {metadata.generatedAt && (
          <span>Dati elaborati: {new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium' }).format(new Date(metadata.generatedAt))}</span>
        )}
      </div>

      <div className="stop-search__controls">
        <label htmlFor="stop-search-input">Nome o codice fermata</label>
        <input
          id="stop-search-input"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Es. Porta Nuova"
          disabled={loading || Boolean(error)}
        />
        <label htmlFor="stop-status-filter">Accessibilità indicata nel feed</label>
        <select id="stop-status-filter" value={status} onChange={(event) => setStatus(event.target.value)} disabled={loading || Boolean(error)}>
          <option value="all">Tutti i valori</option>
          <option value="yes">Sì</option>
          <option value="no">No</option>
          <option value="unknown">Non disponibile</option>
        </select>
      </div>

      {selectedStop && (
        <section className="selected-stop" aria-labelledby="selected-stop-title">
          <h4 id="selected-stop-title" ref={detailsHeading} tabIndex={-1}>Dettagli fermata</h4>
          <strong>{selectedStop.properties.name}</strong>
          <span>Valore GTFS wheelchair_boarding: {selectedStop.properties.wheelchair === 'yes' ? 'sì' : selectedStop.properties.wheelchair === 'no' ? 'no' : 'informazione non disponibile'}.</span>
          {selectedStop.properties.stopCode && <span>Codice: {selectedStop.properties.stopCode}</span>}
          <span>Coordinate: {selectedStop.lat.toFixed(5)}, {selectedStop.lon.toFixed(5)}</span>
          {selectedStop.properties.sourceUrl && <a href={selectedStop.properties.sourceUrl} target="_blank" rel="noreferrer">Fonte: {selectedStop.properties.source || 'GTT/5T'}</a>}
          <button type="button" onClick={closeDetails}>Chiudi dettagli</button>
        </section>
      )}

      <p className="stop-search__count" aria-live="polite">
        {loading ? 'Caricamento fermate…' : error ? 'Elenco non disponibile.' : `${matches.length.toLocaleString('it-IT')} risultati${matches.length > 60 ? ' (primi 60 mostrati)' : ''}`}
      </p>
      {!loading && !error && matches.length === 0 && (
        <p className="stop-search__empty">Nessuna fermata corrisponde ai criteri. Modifica il testo o il filtro e riprova.</p>
      )}
      <ul className="stop-results" aria-label="Risultati fermate">
        {matches.slice(0, 60).map((stop) => (
          <li key={stop.id}>
            <button type="button" aria-label={`Mostra dettagli di ${stop.properties.name}`} onClick={(event) => selectStop(stop, event)}>
              <strong>{stop.properties.name}</strong>
              <span>{stop.properties.stopCode ? `Codice ${stop.properties.stopCode} · ` : ''}{stop.properties.wheelchair === 'yes' ? 'GTFS: sì' : stop.properties.wheelchair === 'no' ? 'GTFS: no' : 'GTFS: non disponibile'}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
