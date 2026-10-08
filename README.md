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

Oppure usa `npm run refresh:gtfs`. Il generatore legge CSV con campi multilinea, scarta coordinate mancanti o ID vuoti e sostituisce il dataset solo dopo aver prodotto almeno una fermata valida. Il file `public/data/gtt-stops.json` include la data di elaborazione e, quando aperTO la fornisce, la data di aggiornamento della risorsa. L'interfaccia avvisa quando l'elaborazione supera 30 giorni. Un workflow GitHub Actions esegue il refresh ogni lunedì e apre o aggiorna una pull request quando il dataset cambia; le modifiche arrivano alla produzione solo dopo revisione e merge. È disponibile anche l'avvio manuale dalla scheda Actions.

L'archivio ZIP GTFS è un file di lavoro locale e non viene versionato. I dati sono pubblicati dal Comune di Torino tramite aperTO; la mappa mostra l'attribuzione OpenStreetMap quando usa i relativi dati.

## Fonti e limiti

- Fermate: [feed GTFS GTT su aperTO](https://aperto.comune.torino.it/dataset/feed-gtfs-trasporti-gtt)
- Dati territoriali: [OpenStreetMap](https://www.openstreetmap.org/copyright)

Le informazioni sono a scopo informativo e possono essere incomplete o non aggiornate. L'app dipende dalla disponibilità dei servizi pubblici da cui carica i dati.

## Interpretazione e privacy

Il campo GTFS `wheelchair_boarding` descrive l'informazione fornita dal feed: per una fermata senza fermate figlie, `1` significa che alcuni veicoli possono essere accessibili; per una piattaforma/fermata figlia, `1` indica un percorso accessibile fino a quella fermata. Non certifica un veicolo specifico o un viaggio completo. L'app non verifica marciapiedi, rampe, ascensori o lo stato sul posto.

Le mappe di base sono caricate da OpenStreetMap. Quando si richiedono i dati aggiuntivi, l'area visibile viene inviata a un'istanza pubblica di Overpass. I relativi operatori ricevono i normali dati di connessione, incluso l'indirizzo IP. Segnalazioni e richieste di correzione: [GitHub Issues](https://github.com/ShinichiZero/torinoaccessibile/issues).
