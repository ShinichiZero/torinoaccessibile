import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';

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

export function validateGtfsArchive(buffer) {
  let archive;
  try {
    archive = new AdmZip(buffer);
  } catch {
    throw new Error('L’archivio GTFS scaricato non è un ZIP valido.');
  }
  if (!archive.getEntry('stops.txt')) {
    throw new Error('L’archivio scaricato non contiene stops.txt.');
  }
  return true;
}

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
  validateGtfsArchive(buffer);

  fs.mkdirSync(
    OUTPUT_DIR,
    {
      recursive: true,
    }
  );

  const temporaryPath = `${OUTPUT_FILE}.${process.pid}.tmp`;
  const metadataTemporaryPath = `${METADATA_FILE}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporaryPath, buffer, { flag: 'wx' });
    validateGtfsArchive(fs.readFileSync(temporaryPath));
    fs.writeFileSync(metadataTemporaryPath, JSON.stringify({
      resourceName: resource.name ?? null,
      sourceUpdatedAt: resource.last_modified ?? resource.metadata_modified ?? null,
      sourceUrl: resource.url,
      downloadedAt: new Date().toISOString(),
    }, null, 2), { flag: 'wx' });
    fs.renameSync(temporaryPath, OUTPUT_FILE);
    fs.renameSync(metadataTemporaryPath, METADATA_FILE);
  } finally {
    for (const file of [temporaryPath, metadataTemporaryPath]) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  }

  console.log('');
  console.log(
    `GTFS salvato in: ${OUTPUT_FILE}`
  );

  console.log(
    `Dimensione: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  downloadGtfs().catch((error) => {
    console.error('');
    console.error('ERRORE:', error.message);
    process.exit(1);
  });
}
