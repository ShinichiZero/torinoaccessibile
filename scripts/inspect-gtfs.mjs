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

function required(value, field) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`Campo obbligatorio mancante: ${field}`);
  }

  return value;
}

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

const requiredHeaders = [
  'stop_id',
  'stop_code',
  'stop_name',
  'stop_lat',
  'stop_lon',
  'wheelchair_boarding',
];

for (const header of requiredHeaders) {
  if (!headers.includes(header)) {
    throw new Error(`Colonna mancante: ${header}`);
  }
}

const rows = lines.slice(1).map((line) => {
  const values = parseCsvLine(line);

  return Object.fromEntries(
    headers.map((header, index) => [
      header,
      values[index] ?? '',
    ])
  );
});

const wheelchairCounts = {
  '0': 0,
  '1': 0,
  '2': 0,
  other: 0,
};

let invalidCoordinates = 0;
let missingNames = 0;

for (const row of rows) {
  const lat = Number(row.stop_lat);
  const lon = Number(row.stop_lon);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < 44 ||
    lat > 46 ||
    lon < 6 ||
    lon > 9
  ) {
    invalidCoordinates += 1;
  }

  if (!row.stop_name.trim()) {
    missingNames += 1;
  }

  const wheelchair = row.wheelchair_boarding.trim();

  if (wheelchairCounts[wheelchair] !== undefined) {
    wheelchairCounts[wheelchair] += 1;
  } else {
    wheelchairCounts.other += 1;
  }
}

console.log(`Fermate totali: ${rows.length}`);
console.log(`Colonne: ${headers.join(', ')}`);
console.log(`Coordinate non valide: ${invalidCoordinates}`);
console.log(`Nomi mancanti: ${missingNames}`);
console.log(
  `wheelchair_boarding=0: ${wheelchairCounts['0']}`
);
console.log(
  `wheelchair_boarding=1: ${wheelchairCounts['1']}`
);
console.log(
  `wheelchair_boarding=2: ${wheelchairCounts['2']}`
);
console.log(
  `wheelchair_boarding altri valori: ${wheelchairCounts.other}`
);

console.log('\nPrima fermata interpretata:');
console.log({
  id: required(rows[0].stop_id, 'stop_id'),
  code: rows[0].stop_code,
  name: rows[0].stop_name,
  latitude: Number(rows[0].stop_lat),
  longitude: Number(rows[0].stop_lon),
  wheelchairBoarding: rows[0].wheelchair_boarding,
});