# Torino Accessibile

Mappa informativa per esplorare le fermate GTT e i dati di accessibilità urbana di Torino. Le fermate sono incluse nel progetto; gli elementi OpenStreetMap vengono caricati su richiesta per l'area visibile della mappa.

## Avvio

Richiede una versione di Node.js compatibile con Vite 8.

```sh
npm ci
npm run dev
```

Per controllare il codice e creare la build di produzione:

```sh
npm run lint
npm run build
```

## Dati GTT

Il file `public/data/gtt-stops.json` contiene le fermate usate dall'app. Per rigenerarlo, scarica l'archivio GTFS pubblico e lancia gli script:

```sh
node scripts/download-gtfs.mjs
node scripts/generate-stops-json.mjs
```

L'archivio ZIP GTFS è un file di lavoro locale e non viene versionato. I dati sono pubblicati dal Comune di Torino tramite aperTO; la mappa mostra l'attribuzione OpenStreetMap quando usa i relativi dati.

## Fonti e limiti

- Fermate: [feed GTFS GTT su aperTO](https://aperto.comune.torino.it/dataset/feed-gtfs-trasporti-gtt)
- Dati territoriali: [OpenStreetMap](https://www.openstreetmap.org/copyright)

Le informazioni sono a scopo informativo e possono essere incomplete o non aggiornate. L'app dipende dalla disponibilità dei servizi pubblici da cui carica i dati.
