import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { afterEach, describe, expect, it } from 'vitest';
import { buildStopsGeoJson, generateStopsJson, normalizeWheelchair, parseCsv, parseFeedInfo } from '../../scripts/generate-stops-json.mjs';

const HEADER = 'stop_id,stop_name,stop_lat,stop_lon,wheelchair_boarding,stop_desc,stop_code,stop_url,location_type';
const validRow = 'a1,"Fermata, Centrale",45.07,7.68,1,"Descrizione",001,https://example.org,0';
const tempDirs = [];

function makeTempDir() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'torino-gtfs-test-'));
  tempDirs.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of tempDirs.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe('CSV parser', () => {
  it('supports BOM, CRLF, quoted commas, escaped quotes and embedded newlines', () => {
    const rows = parseCsv(`\uFEFF${HEADER}\r\nA,"Fermata, Centrale",45,7,1,"Disse ""ciao""\r\nseconda riga",,,0\r\n`);
    expect(rows).toHaveLength(2);
    expect(rows[1][1]).toBe('Fermata, Centrale');
    expect(rows[1][5]).toBe('Disse "ciao"\r\nseconda riga');
  });

  it.each([
    ['unterminated quote', 'a,"unfinished'],
    ['quote inside unquoted field', 'a,un"quoted'],
    ['trailing text after closing quote', 'a,"quoted"tail'],
  ])('rejects %s', (_description, value) => {
    expect(() => parseCsv(value)).toThrow(/CSV stops.txt non valido/);
  });

  it('normalizes wheelchair values without treating unknown as no', () => {
    expect(['1', '2', '0', '', 'unexpected'].map(normalizeWheelchair)).toEqual(['yes', 'no', 'unknown', 'unknown', 'unknown']);
  });
});

describe('GTFS generator', () => {
  it('extracts feed version and coverage dates from feed_info.txt', () => {
    expect(parseFeedInfo('feed_version,feed_start_date,feed_end_date\n20261007,20261006,20270131')).toEqual({
      feedVersion: '20261007', feedVersionDate: '2026-10-07', feedStartDate: '2026-10-06', feedEndDate: '2027-01-31',
    });
    expect(parseFeedInfo('feed_version\nversion-abc')).toMatchObject({ feedVersion: 'version-abc', feedVersionDate: null });
    expect(parseFeedInfo('feed_version\n20260231')).toMatchObject({ feedVersionDate: null });
  });
  it('builds GeoJSON and preserves optional fields, location type, and feed semantics', () => {
    const dataset = buildStopsGeoJson(`${HEADER}\n${validRow}\nB,"",44.99,7.7,2,,,,4\nC,Unknown,44.98,7.7,0,,,,0`);
    expect(dataset.type).toBe('FeatureCollection');
    expect(dataset.metadata.totalStops).toBe(3);
    expect(dataset.features[0].geometry.coordinates).toEqual([7.68, 45.07]);
    expect(dataset.features[0].properties.name).toBe('Fermata, Centrale');
    expect(dataset.features[0].properties.wheelchair).toBe('yes');
    expect(dataset.features[1].properties.name).toBe('Fermata B');
    expect(dataset.features[1].properties.locationType).toBe('4');
    expect(dataset.features[2].properties.wheelchair).toBe('unknown');
  });

  it('requires unique headers, required columns, and consistent row widths', () => {
    expect(() => buildStopsGeoJson('stop_id,stop_id,stop_lat,stop_lon\na,b,45,7')).toThrow(/intestazioni duplicate/);
    expect(() => buildStopsGeoJson('stop_id,stop_lat\na,45')).toThrow(/deve contenere/);
    expect(() => buildStopsGeoJson(`${HEADER}\na,45,7`)).toThrow(/colonne/);
  });

  it('skips blank identifiers and missing/out-of-range/non-numeric coordinates', () => {
    const dataset = buildStopsGeoJson(`${HEADER}\n${validRow}\n,No id,45,7,1,,,,\nno-lat,No latitude,,7,1,,,,\nbad,NaN,45x,7,1,,,,\noutside,Outside,91,7,1,,,,`);
    expect(dataset.features.map((feature) => feature.properties.stopId)).toEqual(['a1']);
  });

  it('rejects duplicate stop IDs and empty feeds', () => {
    expect(() => buildStopsGeoJson(`${HEADER}\n${validRow}\n${validRow.replace('a1', 'a1')}`)).toThrow(/duplicato/);
    expect(() => buildStopsGeoJson(`${HEADER}\n,,,,,,,,`)).toThrow(/non contiene fermate/);
  });

  it('preserves the prior dataset after malformed input, an empty feed, or a corrupt archive', () => {
    const directory = makeTempDir();
    const archivePath = path.join(directory, 'feed.zip');
    const outputPath = path.join(directory, 'published.json');
    const metadataPath = path.join(directory, 'source.json');
    const lastGood = JSON.stringify({ type: 'FeatureCollection', features: [{ id: 'last-good' }] });
    fs.writeFileSync(outputPath, lastGood);
    const createZip = (content) => {
      const zip = new AdmZip();
      zip.addFile('stops.txt', Buffer.from(content));
      zip.writeZip(archivePath);
    };

    createZip(`${HEADER.replace('stop_name', 'stop_id')}\n${validRow}`);
    expect(() => generateStopsJson({ zipPath: archivePath, outputPath, sourceMetadataPath: metadataPath })).toThrow(/intestazioni duplicate/);
    expect(fs.readFileSync(outputPath, 'utf8')).toBe(lastGood);

    createZip(`${HEADER}\n,,,,,,,,`);
    expect(() => generateStopsJson({ zipPath: archivePath, outputPath, sourceMetadataPath: metadataPath })).toThrow(/non contiene fermate/);
    expect(fs.readFileSync(outputPath, 'utf8')).toBe(lastGood);

    fs.writeFileSync(archivePath, 'not a zip');
    expect(() => generateStopsJson({ zipPath: archivePath, outputPath, sourceMetadataPath: metadataPath })).toThrow(/ZIP non valido/);
    expect(fs.readFileSync(outputPath, 'utf8')).toBe(lastGood);
  });

  it('writes valid output atomically and retains generation date when features are unchanged', () => {
    const directory = makeTempDir();
    const archivePath = path.join(directory, 'feed.zip');
    const outputPath = path.join(directory, 'published.json');
    const sourceMetadataPath = path.join(directory, 'source.json');
    const zip = new AdmZip();
    zip.addFile('stops.txt', Buffer.from(`${HEADER}\n${validRow}`));
    zip.writeZip(archivePath);
    fs.writeFileSync(sourceMetadataPath, JSON.stringify({ sourceUpdatedAt: '2026-10-01T00:00:00Z' }));

    const first = generateStopsJson({ zipPath: archivePath, outputPath, sourceMetadataPath });
    const next = generateStopsJson({ zipPath: archivePath, outputPath, sourceMetadataPath });
    expect(first.features).toEqual(next.features);
    expect(first.metadata.generatedAt).toBe(next.metadata.generatedAt);
    expect(next.metadata.sourceUpdatedAt).toBe('2026-10-01T00:00:00Z');
    expect(JSON.parse(fs.readFileSync(outputPath, 'utf8')).metadata.totalStops).toBe(1);
    expect(fs.readdirSync(directory).some((name) => name.endsWith('.tmp'))).toBe(false);
  });
});
