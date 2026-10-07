import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const zipPath = path.resolve(
  __dirname,
  '../public/data/torino_gtfs.zip'
);

const outputPath = path.resolve(
  __dirname,
  '../public/data/gtt-stops.json'
);

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === ',' && !quoted) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);

  return values;
}

if (!fs.existsSync(zipPath)) {
  throw new Error(`File non trovato: ${zipPath}`);
}

const zip = new AdmZip(zipPath);
const entry = zip.getEntry('stops.txt');

if (!entry) {
  throw new Error('stops.txt non presente nello ZIP');
}

const content = entry.getData().toString('utf8').replace(/^\uFEFF/, '');
const lines = content.split(/\r?\n/).filter(Boolean);

const headers = parseCsvLine(lines[0]);

const rows = lines.slice(1).map((line) => {
  const values = parseCsvLine(line);

  return Object.fromEntries(
    headers.map((header, index) => [
      header,
      values[index] ?? '',
    ])
  );
});

function mapWheelchair(value) {
  switch (String(value).trim()) {
    case '1':
      return 'yes';
    case '2':
      return 'no';
    default:
      return 'unknown';
  }
}

const features = [];

for (const row of rows) {
  const lat = Number(row.stop_lat);
  const lon = Number(row.stop_lon);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon)
  ) {
    continue;
  }

  const id = String(row.stop_id).trim();
  const code = String(row.stop_code ?? '').trim();
  const name = String(row.stop_name ?? '').trim();
  const desc = String(row.stop_desc ?? '').trim();
  const url = String(row.stop_url ?? '').trim();
  const wheelchairBoarding = String(
    row.wheelchair_boarding ?? ''
  ).trim();

  features.push({
    id: `gtfs-${id}`,
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [lon, lat],
    },
    properties: {
      stopId: id,
      stopCode: code || null,
      name: name || `Fermata ${id}`,
      description: desc || null,
      url: url || null,
      wheelchair: mapWheelchair(wheelchairBoarding),
      wheelchairBoardingRaw: wheelchairBoarding || null,
      source: 'GTT/5T',
      sourceUrl:
        'https://aperto.comune.torino.it/dataset/feed-gtfs-trasporti-gtt',
    },
  });
}

const output = {
  type: 'FeatureCollection',
  features,
  metadata: {
    generatedAt: new Date().toISOString(),
    source: 'GTT GTFS statico (aperTO)',
    totalStops: features.length,
  },
};

fs.mkdirSync(path.dirname(outputPath), {
  recursive: true,
});

fs.writeFileSync(
  outputPath,
  JSON.stringify(output, null, 2)
);

console.log(`Generati ${features.length} stop in:`);
console.log(outputPath);