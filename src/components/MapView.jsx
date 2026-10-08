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
import { isGtfsDatasetStale, parseGtfsStops } from '../services/gtfsParser';
import StopSearch from './StopSearch';

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

function FocusSelectedStop({ stop }) {
  const map = useMap();
  useEffect(() => {
    if (stop) map.flyTo([stop.lat, stop.lon], Math.max(map.getZoom(), 15), { animate: false });
  }, [map, stop]);
  return null;
}

function MarkerWithPopup({ feature, icon, selected = false, onSelect }) {
  const markerRef = useRef(null);
  useEffect(() => {
    if (selected) markerRef.current?.openPopup();
  }, [selected]);
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
      ref={markerRef}
      title={`${title}. ${isGtfs ? `Accessibilità indicata nel feed GTFS: ${wheelchairLabel}` : 'Elemento OpenStreetMap'}`}
      eventHandlers={isGtfs && onSelect ? { click: () => onSelect(feature) } : undefined}
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
          const isStale = isGtfsDatasetStale(stops.metadata);
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
      const [rawMinLon, rawMinLat, rawMaxLon, rawMaxLat] = bbox.split(',').map(Number);
      const lonInset = (rawMaxLon - rawMinLon) * 0.04;
      const latInset = (rawMaxLat - rawMinLat) * 0.04;
      const minLon = rawMinLon + lonInset;
      const maxLon = rawMaxLon - lonInset;
      const minLat = rawMinLat + latInset;
      const maxLat = rawMaxLat - latInset;
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
                selected={feature.id === selectedStop?.id}
                onSelect={setSelectedStop}
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
      selectedStop?.id,
    ]);

  return (
    <div className="map-container">
      <StopSearch
        stops={gtfsStops}
        metadata={datasetMetadata}
        loading={gtfsLoading}
        error={gtfsError}
        selectedStop={selectedStop}
        onSelectStop={setSelectedStop}
      />
      <div className="map-toolbar">
        <div className="map-toolbar__stats"><strong>{gtfsStops.length.toLocaleString('it-IT')}</strong><span>fermate GTT</span></div>
        <button type="button" className="osm-button" onClick={loadOsmData} disabled={osmLoading || cooldownRemaining > 0}>
          {osmLoading ? 'Caricamento…' : cooldownRemaining > 0 ? `Riprova tra ${cooldownRemaining}s` : osmFeatures.length > 0 ? 'Aggiorna dati OSM' : 'Carica dati OpenStreetMap'}
        </button>
      </div>
      <div className="map-shell">
        <div className="map-region" role="region" aria-label="Mappa interattiva delle fermate GTT e degli elementi OpenStreetMap">
        <MapContainer
          center={TORINO_CENTER}
          zoom={12}
          minZoom={7}
          maxZoom={18}
          maxBounds={TORINO_BOUNDS}
          maxBoundsViscosity={0.8}
          scrollWheelZoom
          attributionControl={false}
        >
          <TileLayer
            attribution=""
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapControls
            onBboxChange={
              setBbox
            }
          />

          <FocusSelectedStop stop={selectedStop} />

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
        </div>

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

      </div>

      {(gtfsError || osmError) && (
        <aside className="map-warning" role="status" aria-live="polite">
          <strong>Alcuni dati non sono disponibili</strong>
          {gtfsError && <p>Fermate GTT: {gtfsError}</p>}
          {osmError && <p>{osmError}</p>}
        </aside>
      )}

      <div className="map-legend">
        <strong>Legenda</strong>
        <div className="legend-item"><span className="legend-dot legend-dot--yes" aria-hidden="true" />GTFS: valore “sì”</div>
        <div className="legend-item"><span className="legend-dot legend-dot--no" aria-hidden="true" />GTFS: valore “no”</div>
        <div className="legend-item"><span className="legend-dot legend-dot--unknown" aria-hidden="true" />Informazione non disponibile</div>
        <div className="legend-item"><span className="legend-dot legend-dot--osm" aria-hidden="true" />Elemento OpenStreetMap</div>
        <span className="map-attribution">Mappa: <a href="https://leafletjs.com" target="_blank" rel="noreferrer">Leaflet</a>. Dati mappa © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>.</span>
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
    </div>
  );
}
