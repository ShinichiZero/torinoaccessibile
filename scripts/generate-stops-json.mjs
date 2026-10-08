import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ZIP_PATH = path.resolve(__dirname, '../public/data/torino_gtfs.zip');
const DEFAULT_OUTPUT_PATH = path.resolve(__dirname, '../public/data/gtt-stops.json');
const DEFAULT_METADATA_PATH = path.resolve(__dirname, '../public/data/torino_gtfs.metadata.json');
const REQUIRED_HEADERS = ['stop_id', 'stop_lat', 'stop_lon'];
const SOURCE_URL = 'https://aperto.comune.torino.it/dataset/feed-gtfs-trasporti-gtt';

export function parseCsv(input) {
  const content = String(input).replace(/^\uFEFF/, '');
  const records = [];
  let record = [];
  let field = '';
  let quoted = false;
  let closedQuote = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    if (quoted) {
      if (char === '"' && content[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
        closedQuote = true;
      } else {
        field += char;
      }
      continue;
    }

    if (closedQuote && char !== ',' && char !== '\r' && char !== '\n') {
      throw new Error(`CSV stops.txt non valido: carattere inatteso dopo un campo quotato alla posizione ${index}.`);
    }
    if (char === '"') {
      if (field.length !== 0 || closedQuote) {
        throw new Error(`CSV stops.txt non valido: virgolette fuori posizione alla posizione ${index}.`);
      }
      quoted = true;
    } else if (char === ',') {
      record.push(field);
      field = '';
      closedQuote = false;
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && content[index + 1] === '\n') index += 1;
      record.push(field);
      if (record.some((value) => value.length > 0)) records.push(record);
      record = [];
      field = '';
      closedQuote = false;
    } else {
      field += char;
    }
  }

  if (quoted) throw new Error('CSV stops.txt non valido: campo quotato non chiuso.');
  if (field.length > 0 || record.length > 0 || closedQuote) {
    record.push(field);
    records.push(record);
  }
  return records;
}

export function normalizeWheelchair(value) {
  if (String(value ?? '').trim() === '1') return 'yes';
  if (String(value ?? '').trim() === '2') return 'no';
  return 'unknown';
}

function parseRows(content) {
  const [headers, ...records] = parseCsv(content);
  if (!headers) throw new Error('stops.txt è vuoto.');
  if (new Set(headers).size !== headers.length) throw new Error('stops.txt contiene intestazioni duplicate.');
  if (REQUIRED_HEADERS.some((header) => !headers.includes(header))) {
    throw new Error(`stops.txt deve contenere: ${REQUIRED_HEADERS.join(', ')}`);
  }
  return records.map((values, index) => {
    if (values.length !== headers.length) {
      throw new Error(`Record CSV ${index + 2} non valido: attese ${headers.length} colonne, ricevute ${values.length}.`);
    }
    return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
  });
}

function parseGtfsDate(value) {
  const match = /^(\d{4})(\d{2})(\d{2})$/.exec(String(value ?? '').trim());
  if (!match) return null;
  const date = `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : null;
}

export function parseFeedInfo(content) {
  const [headers, ...records] = parseCsv(content);
  if (!headers || new Set(headers).size !== headers.length) throw new Error('feed_info.txt non valido: intestazioni assenti o duplicate.');
  const row = records[0];
  if (!row || row.length !== headers.length) throw new Error('feed_info.txt non contiene un record valido.');
  const info = Object.fromEntries(headers.map((header, index) => [header, row[index]]));
  const feedVersion = String(info.feed_version ?? '').trim() || null;
  const feedStartDate = String(info.feed_start_date ?? '').trim() || null;
  const feedEndDate = String(info.feed_end_date ?? '').trim() || null;
  return {
    feedVersion,
    feedVersionDate: parseGtfsDate(feedVersion),
    feedStartDate: parseGtfsDate(feedStartDate),
    feedEndDate: parseGtfsDate(feedEndDate),
  };
}

export function buildStopsGeoJson(content, { sourceUpdatedAt = null, feedInfo = {} } = {}) {
  const rows = parseRows(content);
  const features = [];
  const stopIds = new Set();

  for (const row of rows) {
    const id = String(row.stop_id ?? '').trim();
    const latText = String(row.stop_lat ?? '').trim();
    const lonText = String(row.stop_lon ?? '').trim();
    if (!id || !latText || !lonText) continue;

    if (stopIds.has(id)) throw new Error(`stop_id duplicato: ${id}`);
    const lat = Number(latText);
    const lon = Number(lonText);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;
    stopIds.add(id);

    const name = String(row.stop_name ?? '').trim();
    const wheelchairBoarding = String(row.wheelchair_boarding ?? '').trim();
    features.push({
      id: `gtfs-${id}`,
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lon, lat] },
      properties: {
        stopId: id,
        stopCode: String(row.stop_code ?? '').trim() || null,
        locationType: String(row.location_type ?? '').trim() || null,
        name: name || `Fermata ${id}`,
        description: String(row.stop_desc ?? '').trim() || null,
        url: String(row.stop_url ?? '').trim() || null,
        wheelchair: normalizeWheelchair(wheelchairBoarding),
        wheelchairBoardingRaw: wheelchairBoarding || null,
        source: 'GTT/5T',
        sourceUrl: SOURCE_URL,
      },
    });
  }

  if (features.length === 0) {
    throw new Error('Il feed non contiene fermate con ID e coordinate valide; dataset precedente preservato.');
  }

  return { type: 'FeatureCollection', features, metadata: { sourceUpdatedAt, ...feedInfo, source: 'GTT GTFS statico (aperTO)', totalStops: features.length } };
}

function validateOutput(dataset) {
  if (dataset?.type !== 'FeatureCollection' || !Array.isArray(dataset.features) || dataset.features.length === 0) {
    throw new Error('Il dataset generato non è una FeatureCollection valida e non vuota.');
  }
  if (dataset.metadata?.totalStops !== dataset.features.length) throw new Error('Conteggio metadata.totalStops incoerente.');
  const ids = new Set();
  for (const feature of dataset.features) {
    const [lon, lat] = feature?.geometry?.coordinates ?? [];
    if (feature?.geometry?.type !== 'Point' || !feature.id || ids.has(feature.id)) throw new Error('Feature GeoJSON non valida o duplicata.');
    if (!Number.isFinite(lon) || lon < -180 || lon > 180 || !Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error(`Coordinate non valide per ${feature.id}.`);
    if (!['yes', 'no', 'unknown'].includes(feature.properties?.wheelchair)) throw new Error(`Valore wheelchair non valido per ${feature.id}.`);
    ids.add(feature.id);
  }
}

export function generateStopsJson({ zipPath = DEFAULT_ZIP_PATH, outputPath = DEFAULT_OUTPUT_PATH, sourceMetadataPath = DEFAULT_METADATA_PATH } = {}) {
  if (!fs.existsSync(zipPath)) throw new Error(`File non trovato: ${zipPath}`);
  let zip;
  try {
    zip = new AdmZip(zipPath);
  } catch (error) {
    throw new Error(`Archivio GTFS ZIP non valido: ${error.message}`);
  }
  const entry = zip.getEntry('stops.txt');
  if (!entry) throw new Error('stops.txt non presente nello ZIP');
  const feedInfoEntry = zip.getEntry('feed_info.txt');

  const sourceMetadata = fs.existsSync(sourceMetadataPath)
    ? JSON.parse(fs.readFileSync(sourceMetadataPath, 'utf8'))
    : {};
  const feedInfo = feedInfoEntry ? parseFeedInfo(feedInfoEntry.getData().toString('utf8')) : {};
  const dataset = buildStopsGeoJson(entry.getData().toString('utf8'), { sourceUpdatedAt: sourceMetadata.sourceUpdatedAt ?? null, feedInfo });

  let previousDataset = null;
  if (fs.existsSync(outputPath)) {
    try { previousDataset = JSON.parse(fs.readFileSync(outputPath, 'utf8')); } catch { /* A valid feed may repair a damaged prior file. */ }
  }
  const featuresUnchanged = JSON.stringify(previousDataset?.features) === JSON.stringify(dataset.features);
  const previousMetadata = { ...previousDataset?.metadata };
  delete previousMetadata.generatedAt;
  const metadataUnchanged = JSON.stringify(previousMetadata) === JSON.stringify(dataset.metadata);
  dataset.metadata.generatedAt = featuresUnchanged && metadataUnchanged && previousDataset.metadata?.generatedAt
    ? previousDataset.metadata.generatedAt
    : new Date().toISOString();
  validateOutput(dataset);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporaryPath, JSON.stringify(dataset, null, 2), { flag: 'wx' });
    const written = JSON.parse(fs.readFileSync(temporaryPath, 'utf8'));
    validateOutput(written);
    fs.renameSync(temporaryPath, outputPath);
  } finally {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
  }
  return dataset;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const dataset = generateStopsJson();
  console.log(`Generati ${dataset.features.length} stop in:`);
  console.log(DEFAULT_OUTPUT_PATH);
}
