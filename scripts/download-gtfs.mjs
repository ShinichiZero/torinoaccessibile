import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CKAN_API =
  'https://aperto.comune.torino.it/api/3/action/package_show?id=feed-gtfs-trasporti-gtt';

const OUTPUT_DIR = path.resolve(
  __dirname,
  '../public/data'
);

const OUTPUT_FILE = path.join(
  OUTPUT_DIR,
  'torino_gtfs.zip'
);
const METADATA_FILE = path.join(OUTPUT_DIR, 'torino_gtfs.metadata.json');

async function getGtfsResourceUrl() {
  console.log('Recupero metadata GTFS da aperTO...');

  const response = await fetch(CKAN_API, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(
      `CKAN HTTP ${response.status}`
    );
  }

  const data = await response.json();

  if (!data.success || !data.result) {
    throw new Error(
      'Risposta CKAN non valida.'
    );
  }

  const resources = data.result.resources ?? [];

  const resource =
    resources.find((item) => {
      const format =
        String(item.format ?? '').toLowerCase();

      const name =
        String(item.name ?? '').toLowerCase();

      return (
        format === 'zip' ||
        name.includes('statico') ||
        name.includes('gtfs')
      );
    });

  if (!resource?.url) {
    console.error(
      'Risorse disponibili:'
    );

    for (const item of resources) {
      console.error(
        `- ${item.name ?? 'senza nome'} | ${item.format ?? 'formato sconosciuto'} | ${item.url ?? 'nessun URL'}`
      );
    }

    throw new Error(
      'Non è stata trovata una risorsa ZIP GTFS.'
    );
  }

  console.log(
    `Risorsa GTFS trovata: ${resource.name ?? resource.url}`
  );

  console.log(
    `URL: ${resource.url}`
  );

  return resource;
}

async function downloadGtfs() {
  const resource =
    await getGtfsResourceUrl();

  console.log('');
  console.log(
    'Scaricamento GTFS Torino...'
  );

  const response = await fetch(
    resource.url,
    {
      redirect: 'follow',
      headers: {
        Accept:
          'application/zip, application/octet-stream, */*',
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Download GTFS fallito: HTTP ${response.status}`
    );
  }

  const buffer =
    Buffer.from(
      await response.arrayBuffer()
    );

  if (buffer.length < 1000) {
    throw new Error(
      'Il file scaricato è troppo piccolo per essere un GTFS valido.'
    );
  }

  fs.mkdirSync(
    OUTPUT_DIR,
    {
      recursive: true,
    }
  );

  fs.writeFileSync(
    OUTPUT_FILE,
    buffer
  );
  fs.writeFileSync(METADATA_FILE, JSON.stringify({
    resourceName: resource.name ?? null,
    sourceUpdatedAt: resource.last_modified ?? resource.metadata_modified ?? null,
    sourceUrl: resource.url,
    downloadedAt: new Date().toISOString(),
  }, null, 2));

  console.log('');
  console.log(
    `GTFS salvato in: ${OUTPUT_FILE}`
  );

  console.log(
    `Dimensione: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`
  );
}

downloadGtfs().catch(
  (error) => {
    console.error('');
    console.error(
      'ERRORE:',
      error.message
    );

    process.exit(1);
  }
);
