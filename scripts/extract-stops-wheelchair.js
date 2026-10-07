// Usage: node scripts/extract-stops-wheelchair.js gtfs.zip stops_wheelchair.json

import { readFileSync, writeFileSync } from 'node:fs';
import AdmZip from 'adm-zip';

const [, , zipPath, outPath] = process.argv;

if (!zipPath || !outPath) {
  console.error('Usage: node scripts/extract-stops-wheelchair.js gtfs.zip stops_wheelchair.json');
  process.exit(1);
}

function parseCsvLine(line) {
  const values = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(value);
      value = '';
    } else {
      value += char;
    }
  }

  values.push(value);
  return values;
}

const zip = new AdmZip(readFileSync(zipPath));
const stopsEntry = zip.getEntry('stops.txt');

if (!stopsEntry) {
  throw new Error('stops.txt non presente nello ZIP GTFS.');
}

const lines = stopsEntry
  .getData()
  .toString('utf8')
  .replace(/^\uFEFF/, '')
  .split(/\r?\n/)
  .filter(Boolean);

const headers = parseCsvLine(lines[0]);
const stops = lines.slice(1).map((line) => {
  const values = parseCsvLine(line);
  return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
}).filter((stop) => {
  const lat = Number(stop.stop_lat);
  const lon = Number(stop.stop_lon);
  return Number.isFinite(lat) && Number.isFinite(lon);
}).map((stop) => ({
  stop_id: stop.stop_id,
  stop_name: stop.stop_name,
  stop_lat: Number(stop.stop_lat),
  stop_lon: Number(stop.stop_lon),
  wheelchair_boarding: stop.wheelchair_boarding || '0',
}));

writeFileSync(outPath, JSON.stringify(stops, null, 2));
console.log(`Scritte ${stops.length} fermate in ${outPath}`);
