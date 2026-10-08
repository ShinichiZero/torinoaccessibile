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
const sourceMetadataPath = path.resolve(__dirname, '../public/data/torino_gtfs.metadata.json');

function parseCsv(content) {
  const records = [];
  let record = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    if (quoted) {
      if (char === '"' && content[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === ',') {
      record.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && content[index + 1] === '\n') index += 1;
      record.push(field);
      if (record.some((value) => value.length > 0)) records.push(record);
      record = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (quoted) throw new Error('CSV stops.txt non valido: campo quotato non chiuso.');
  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  return records;
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
const [headers, ...records] = parseCsv(content);
const requiredHeaders = ['stop_id', 'stop_lat', 'stop_lon'];
if (!headers || requiredHeaders.some((header) => !headers.includes(header))) {
  throw new Error(`stops.txt deve contenere: ${requiredHeaders.join(', ')}`);
}

const rows = records.map((values) => {

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
  if (!String(row.stop_id ?? '').trim()) continue;
  if (!String(row.stop_lat ?? '').trim() || !String(row.stop_lon ?? '').trim()) continue;
  const lat = Number(row.stop_lat);
  const lon = Number(row.stop_lon);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 || lat > 90 || lon < -180 || lon > 180
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
      locationType: String(row.location_type ?? '').trim() || null,
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

if (features.length === 0) {
  throw new Error('Il feed non contiene fermate con ID e coordinate valide; dataset precedente preservato.');
}

let previousDataset = null;
if (fs.existsSync(outputPath)) {
  try {
    previousDataset = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  } catch {
    // A new valid dataset can repair an unreadable previous file.
  }
}
const featuresUnchanged =
  Array.isArray(previousDataset?.features) &&
  JSON.stringify(previousDataset.features) === JSON.stringify(features);

const output = {
  type: 'FeatureCollection',
  features,
  metadata: {
    generatedAt: featuresUnchanged && previousDataset.metadata?.generatedAt
      ? previousDataset.metadata.generatedAt
      : new Date().toISOString(),
    sourceUpdatedAt: fs.existsSync(sourceMetadataPath)
      ? JSON.parse(fs.readFileSync(sourceMetadataPath, 'utf8')).sourceUpdatedAt
      : null,
    source: 'GTT GTFS statico (aperTO)',
    totalStops: features.length,
  },
};

fs.mkdirSync(path.dirname(outputPath), {
  recursive: true,
});

const temporaryPath = `${outputPath}.tmp`;
fs.writeFileSync(temporaryPath, JSON.stringify(output, null, 2));
fs.renameSync(temporaryPath, outputPath);

console.log(`Generati ${features.length} stop in:`);
console.log(outputPath);
