import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';

import { fetchOverpassAccessibility } from '../services/overpassApi';
import { parseGtfsStops } from '../services/gtfsParser';

const TORINO_BOUNDS = [
  [44.30, 7.05],
  [45.65, 8.55],
];

const TORINO_CENTER = [45.0703, 7.6869];

const DEFAULT_BBOX = '7.05,44.30,8.55,45.65';

const OSM_COOLDOWN_MS = 60_000;

function MapControls({ onBboxChange }) {
  const map = useMap();

  useEffect(() => {
    const updateBbox = () => {
      const bounds = map.getBounds();
      const southWest = bounds.getSouthWest();
      const northEast = bounds.getNorthEast();

      onBboxChange(
        `${southWest.lng},${southWest.lat},${northEast.lng},${northEast.lat}`
      );
    };

    updateBbox();

    map.on('moveend', updateBbox);

    return () => {
      map.off('moveend', updateBbox);
    };
  }, [map, onBboxChange]);

  return null;
}

function MarkerWithPopup({ feature, icon }) {
  const { lat, lon, properties = {} } = feature;

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon)
  ) {
    return null;
  }

  const isGtfs =
    properties.type === 'gtfs_stop';

  const title =
    properties.name ||
    properties.desc ||
    'Punto di accessibilità';

  const wheelchairLabel =
    properties.wheelchair === 'yes'
      ? 'sì'
      : properties.wheelchair === 'no'
        ? 'no'
        : 'informazione non disponibile';

  return (
    <Marker
      position={[lat, lon]}
      icon={icon}
      title={`${title}. ${isGtfs ? `Accessibilità indicata nel feed GTFS: ${wheelchairLabel}` : 'Elemento OpenStreetMap'}`}
    >
      <Popup>
        <div className="map-popup">
          <h3 className="map-popup__title">
            {title}
          </h3>

          {isGtfs ? (
            <>
              <div className="popup-status">
                <span
                  className={`popup-status__dot popup-status__dot--${properties.wheelchair}`}
                  aria-hidden="true"
                />

                <strong>
                  Valore GTFS: {wheelchairLabel}
                </strong>
              </div>

              <p>Valore del campo GTFS wheelchair_boarding. Il significato dipende dal tipo di fermata e non verifica il veicolo o l’intero percorso.</p>

              {properties.stopCode && (
                <p>
                  <strong>
                    Codice fermata:
                  </strong>{' '}
                  {properties.stopCode}
                </p>
              )}

              {properties.description && (
                <p>
                  {properties.description}
                </p>
              )}

              {properties.url && (
                <p>
                  <a
                    href={properties.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Informazioni GTT sulla fermata
                  </a>
                </p>
              )}
            </>
          ) : (
            <>
              {properties.note && (
                <p>
                  {properties.note}
                </p>
              )}

              {properties.wheelchair && (
                <p>
                  <strong>
                    Wheelchair:
                  </strong>{' '}
                  {properties.wheelchair}
                </p>
              )}

              {properties.tactilePaving && (
                <p>
                  <strong>
                    Pavimentazione tattile:
                  </strong>{' '}
                  {properties.tactilePaving}
                </p>
              )}

              {properties.kerb && (
                <p>
                  <strong>
                    Cordolo:
                  </strong>{' '}
                  {properties.kerb}
                </p>
              )}

              {properties.crossing && (
                <p>
                  <strong>
                    Attraversamento:
                  </strong>{' '}
                  {properties.crossing}
                </p>
              )}
            </>
          )}

          <p className="map-popup__source">
            Fonte:{' '}
            <a href={properties.sourceUrl || 'https://www.openstreetmap.org/copyright'} target="_blank" rel="noreferrer">
              {properties.source || 'OpenStreetMap'}
            </a>
          </p>
        </div>
      </Popup>
    </Marker>
  );
}

export default function MapView({ onDatasetChange }) {
  const [gtfsStops, setGtfsStops] = useState([]);
  const [osmFeatures, setOsmFeatures] = useState([]);

  const [gtfsLoading, setGtfsLoading] =
    useState(true);

  const [osmLoading, setOsmLoading] =
    useState(false);

  const [gtfsError, setGtfsError] =
    useState(null);

  const [osmError, setOsmError] =
    useState(null);

  const [bbox, setBbox] =
    useState(DEFAULT_BBOX);

  const [osmCooldownUntil, setOsmCooldownUntil] =
    useState(0);

  const [cooldownNow, setCooldownNow] =
    useState(0);
  const [datasetMetadata, setDatasetMetadata] = useState({});
  const [osmLoadedBbox, setOsmLoadedBbox] = useState(null);
  const [osmLoadedAt, setOsmLoadedAt] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedStop, setSelectedStop] = useState(null);
  const activeOsmController = useRef(null);
  const osmRequestId = useRef(0);

  /*
   * GTFS principale.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadGtfs() {
      setGtfsLoading(true);
      setGtfsError(null);

      try {
        const stops =
          await parseGtfsStops();

        if (!cancelled) {
          setGtfsStops(stops.stops);
          setDatasetMetadata(stops.metadata);
          const generatedAtMs = Date.parse(stops.metadata.generatedAt ?? '');
          const isStale = !Number.isFinite(generatedAtMs) || Date.now() - generatedAtMs > 30 * 86400000;
          onDatasetChange?.({ status: 'ready', stops: stops.stops, metadata: stops.metadata, isStale });
        }
      } catch (error) {
        console.error(
          '[Torino Accessibile] Errore caricamento GTFS:',
          error
        );

        if (!cancelled) {
          setGtfsError(
            error?.message ||
              'Impossibile caricare le fermate GTT.'
          );
          onDatasetChange?.({ status: 'error', stops: [], metadata: {} });
        }
      } finally {
        if (!cancelled) {
          setGtfsLoading(false);
        }
      }
    }

    loadGtfs();

    return () => {
      cancelled = true;
    };
  }, [onDatasetChange]);

  useEffect(() => {
    if (activeOsmController.current) {
      activeOsmController.current.abort();
      setOsmLoading(false);
    }
    return () => {
      osmRequestId.current += 1;
      activeOsmController.current?.abort();
    };
  }, [bbox]);

  /*
   * Timer cooldown OSM.
   */
  useEffect(() => {
    if (
      osmCooldownUntil <= Date.now()
    ) {
      return undefined;
    }

    const interval =
      window.setInterval(() => {
        const now = Date.now();
        setCooldownNow(now);
        if (now >= osmCooldownUntil) window.clearInterval(interval);
      }, 1000);

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [osmCooldownUntil]);

  /*
   * Overpass viene eseguito SOLO
   * quando l'utente preme il pulsante.
   */
  const loadOsmData = useCallback(
    async () => {
      const now = Date.now();

      if (
        osmLoading ||
        osmCooldownUntil > now
      ) {
        return;
      }

      setOsmLoading(true);
      setOsmError(null);
      const requestedBbox = bbox;
      const requestId = ++osmRequestId.current;
      const controller = new AbortController();
      activeOsmController.current = controller;

      try {
        console.info(
          '[Torino Accessibile] Richiesta OSM:',
          requestedBbox
        );

        const features =
          await fetchOverpassAccessibility(requestedBbox, { signal: controller.signal });

        if (requestId !== osmRequestId.current) return;

        setOsmFeatures(
          Array.isArray(features)
            ? features
            : []
        );
        setOsmLoadedBbox(requestedBbox);
        setOsmLoadedAt(new Date().toISOString());

        console.info(
          '[Torino Accessibile] Elementi OSM:',
          features?.length ?? 0
        );
      } catch (error) {
        if (error?.name === 'AbortError' || requestId !== osmRequestId.current) return;
        console.error(
          '[Torino Accessibile] Overpass:',
          error
        );

        const message =
          error?.message ||
          'Errore durante il caricamento dei dati OSM.';

        if (
          message.includes('429') ||
          message
            .toLowerCase()
            .includes(
              'too many requests'
            )
        ) {
          setOsmError(
            'OpenStreetMap sta limitando temporaneamente le richieste. Riprova tra circa un minuto.'
          );

          setOsmCooldownUntil(
            Date.now() +
              OSM_COOLDOWN_MS
          );
          setCooldownNow(Date.now());
        } else {
          setOsmError(
            message.toLowerCase().includes('scaduta')
              ? 'OpenStreetMap non ha risposto in tempo. Ingrandisci la zona che ti interessa e riprova.'
              : `Dati OpenStreetMap non disponibili: ${message}`
          );

          setOsmCooldownUntil(
            Date.now() + 15_000
          );
          setCooldownNow(Date.now());
        }
      } finally {
        if (requestId === osmRequestId.current) setOsmLoading(false);
      }
    },
    [
      bbox,
      osmCooldownUntil,
      osmLoading,
    ]
  );

  const cooldownRemaining =
    Math.max(
      0,
      Math.ceil(
        (osmCooldownUntil -
          cooldownNow) /
          1000
      )
    );

  const icons = useMemo(() => {
    const createIcon = (
      background,
      size = 13
    ) =>
      L.divIcon({
        className:
          'accessibility-marker',

        html: `
          <span
            aria-hidden="true"
            style="
              display:block;
              width:${size}px;
              height:${size}px;
              background:${background};
              border:2px solid #fff;
              border-radius:50%;
              box-shadow:0 0 0 1px rgba(0,0,0,.45);
            "
          ></span>
        `,

        iconSize: [
          size + 4,
          size + 4,
        ],

        iconAnchor: [
          (size + 4) / 2,
          (size + 4) / 2,
        ],

        popupAnchor: [
          0,
          -(size + 4) / 2,
        ],
      });

    return {
      yes: createIcon(
        '#087f23',
        14
      ),

      no: createIcon(
        '#b00020',
        14
      ),

      unknown: createIcon(
        '#666666',
        14
      ),

      osm: createIcon(
        '#005fcc',
        14
      ),
    };
  }, []);

  const getGtfsIcon =
    useCallback(
      (feature) => {
        const value =
          feature?.properties
            ?.wheelchair;

        if (value === 'yes') {
          return icons.yes;
        }

        if (value === 'no') {
          return icons.no;
        }

        return icons.unknown;
      },
      [icons]
    );

  const getOsmIcon =
    useCallback(
      () => icons.osm,
      [icons]
    );

  const gtfsYesCount =
    useMemo(
      () =>
        gtfsStops.filter(
          (feature) =>
            feature.properties
              ?.wheelchair === 'yes'
        ).length,
      [gtfsStops]
    );

  const gtfsNoCount =
    useMemo(
      () =>
        gtfsStops.filter(
          (feature) =>
            feature.properties
              ?.wheelchair === 'no'
        ).length,
      [gtfsStops]
    );

  const gtfsUnknownCount =
    useMemo(
      () =>
        gtfsStops.filter(
          (feature) =>
            feature.properties
              ?.wheelchair === 'unknown'
        ).length,
      [gtfsStops]
    );

  const totalMarkers =
    gtfsStops.length +
    osmFeatures.length;

  const needsClustering =
    totalMarkers > 500;

  const mapMarkers =
    useMemo(() => {
      const [minLon, minLat, maxLon, maxLat] = bbox.split(',').map(Number);
      const gtfs =
        gtfsStops.filter(({ lat, lon }) => lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon).map(
          (feature, index) => (
            <MarkerWithPopup
              key={
                feature.id ||
                `gtfs-${index}`
              }
              feature={feature}
              icon={getGtfsIcon(
                feature
              )}
            />
          )
        );

      const osm =
        osmFeatures.filter(({ lat, lon }) => lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon).map(
          (feature, index) => (
            <MarkerWithPopup
              key={
                feature.id ||
                `osm-${index}`
              }
              feature={feature}
              icon={getOsmIcon(
                feature
              )}
            />
          )
        );

      return [
        ...gtfs,
        ...osm,
      ];
    }, [
      gtfsStops,
      osmFeatures,
      bbox,
      getGtfsIcon,
      getOsmIcon,
    ]);

  return (
    <div className="map-container">
      <div className="map-shell">
        <MapContainer
          center={TORINO_CENTER}
          zoom={10}
          minZoom={7}
          maxZoom={18}
          maxBounds={TORINO_BOUNDS}
          maxBoundsViscosity={0.8}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapControls
            onBboxChange={
              setBbox
            }
          />

          {needsClustering ? (
            <MarkerClusterGroup
              chunkedLoading
              maxClusterRadius={50}
            >
              {mapMarkers}
            </MarkerClusterGroup>
          ) : (
            mapMarkers
          )}
        </MapContainer>

        {gtfsLoading && (
          <div
            className="map-overlay"
            role="status"
            aria-live="polite"
          >
            <div className="loading-card">
              <span
                className="loading-spinner"
                aria-hidden="true"
              />

              <span>
                Caricamento fermate GTT…
              </span>
            </div>
          </div>
        )}

        <div className="map-toolbar">
          <div className="map-toolbar__stats">
            <strong>
              {gtfsStops.length.toLocaleString(
                'it-IT'
              )}
            </strong>

            <span>
              fermate GTT
            </span>
          </div>

          <button
            type="button"
            className="osm-button"
            onClick={
              loadOsmData
            }
            disabled={
              osmLoading ||
              cooldownRemaining > 0
            }
          >
            {osmLoading
              ? 'Caricamento…'
              : cooldownRemaining > 0
                ? `Riprova tra ${cooldownRemaining}s`
                : osmFeatures.length > 0
                  ? 'Aggiorna dati OSM'
                  : 'Carica dati OpenStreetMap'}
          </button>
        </div>

        {(gtfsError ||
          osmError) && (
          <aside
            className="map-warning"
            role="status"
            aria-live="polite"
          >
            <strong>
              Alcuni dati non sono disponibili
            </strong>

            {gtfsError && (
              <p>
                Fermate GTT:{' '}
                {gtfsError}
              </p>
            )}

            {osmError && (
              <p>
                {osmError}
              </p>
            )}
          </aside>
        )}

        <div className="map-legend">
          <strong>
            Legenda
          </strong>

          <div className="legend-item">
            <span className="legend-dot legend-dot--yes" />
            GTFS: valore “sì”
          </div>

          <div className="legend-item">
            <span className="legend-dot legend-dot--no" />
            GTFS: valore “no”
          </div>

          <div className="legend-item">
            <span className="legend-dot legend-dot--unknown" />
            Informazione non disponibile
          </div>

          <div className="legend-item">
            <span className="legend-dot legend-dot--osm" />
            Elemento OpenStreetMap
          </div>
        </div>
      </div>

      {osmLoadedBbox && (
        <p className="osm-region-note" role="status">
          OSM caricati {osmLoadedAt && new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' }).format(new Date(osmLoadedAt))} per l’area visibile al momento della richiesta (lon/lat: {osmLoadedBbox}). Sposta la mappa e aggiorna per un’altra zona.
        </p>
      )}

      <div className="map-data-bar">
        <div>
          <strong>
            {gtfsYesCount.toLocaleString(
              'it-IT'
            )}
          </strong>

          <span>
            con “sì” nel campo GTFS
          </span>
        </div>

        <div>
          <strong>
            {gtfsNoCount.toLocaleString(
              'it-IT'
            )}
          </strong>

          <span>
            con “no” nel campo GTFS
          </span>
        </div>

        <div>
          <strong>
            {gtfsUnknownCount.toLocaleString(
              'it-IT'
            )}
          </strong>

          <span>
            senza informazione
          </span>
        </div>

        <div>
          <strong>
            {osmFeatures.length.toLocaleString(
              'it-IT'
            )}
          </strong>

          <span>
            elementi OSM
          </span>
        </div>
      </div>
      <section className="stop-search" aria-labelledby="stop-search-title">
        <div className="stop-search__heading">
          <div><h3 id="stop-search-title">Trova una fermata</h3><p>Cerca per nome o codice, anche senza usare la mappa.</p></div>
          {datasetMetadata.generatedAt && <span>Dati elaborati: {new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium' }).format(new Date(datasetMetadata.generatedAt))}</span>}
        </div>
        <div className="stop-search__controls">
          <label htmlFor="stop-search-input">Nome o codice fermata</label>
          <input id="stop-search-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Es. Porta Nuova" disabled={gtfsLoading || Boolean(gtfsError)} />
          <label htmlFor="stop-status-filter">Accessibilità indicata nel feed</label>
          <select id="stop-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} disabled={gtfsLoading || Boolean(gtfsError)}><option value="all">Tutti i valori</option><option value="yes">Sì</option><option value="no">No</option><option value="unknown">Non disponibile</option></select>
        </div>
        {selectedStop && <div className="selected-stop" aria-live="polite"><strong>{selectedStop.properties.name}</strong><span>Accessibilità indicata nel feed GTFS: {selectedStop.properties.wheelchair === 'yes' ? 'sì' : selectedStop.properties.wheelchair === 'no' ? 'no' : 'non disponibile'}.</span>{selectedStop.properties.stopCode && <span>Codice: {selectedStop.properties.stopCode}</span>}<button type="button" onClick={() => setSelectedStop(null)}>Chiudi dettagli</button></div>}
        {(() => {
          const query = search.trim().toLocaleLowerCase('it');
          const matches = gtfsStops.filter((stop) => {
            const name = stop.properties.name.toLocaleLowerCase('it');
            const code = String(stop.properties.stopCode ?? '').toLocaleLowerCase('it');
            return (!query || name.includes(query) || code.includes(query)) && (statusFilter === 'all' || stop.properties.wheelchair === statusFilter);
          });
          return <><p className="stop-search__count" aria-live="polite">{gtfsLoading ? 'Caricamento fermate…' : gtfsError ? 'Elenco non disponibile.' : `${matches.length.toLocaleString('it-IT')} risultati${matches.length > 60 ? ' (primi 60 mostrati)' : ''}`}</p><ul className="stop-results" aria-label="Risultati fermate">{matches.slice(0, 60).map((stop) => <li key={stop.id}><button type="button" onClick={() => setSelectedStop(stop)}><strong>{stop.properties.name}</strong><span>{stop.properties.stopCode ? `Codice ${stop.properties.stopCode} · ` : ''}{stop.properties.wheelchair === 'yes' ? 'GTFS: sì' : stop.properties.wheelchair === 'no' ? 'GTFS: no' : 'GTFS: non disponibile'}</span></button></li>)}</ul></>;
        })()}
      </section>
    </div>
  );
}
