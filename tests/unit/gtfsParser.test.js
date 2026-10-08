import fs from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { isGtfsDatasetStale, normalizeExternalUrl, normalizeGtfsGeoJson, normalizeWheelchair, parseGtfsStops } from '../../src/services/gtfsParser';

const metadata = { generatedAt: '2026-10-01T10:00:00Z', sourceUpdatedAt: '2026-09-30T10:00:00Z', source: 'test feed', totalStops: 1 };
const feature = { type: 'Feature', id: 'gtfs-1', geometry: { type: 'Point', coordinates: [7.68, 45.07] }, properties: { stopId: '1', name: 'Duomo', wheelchair: 'yes' } };

describe('GTFS parser', () => {
  it('upgrades known GTT HTTP links and rejects unsafe external URLs', () => {
    expect(normalizeExternalUrl('http://www.gtt.to.it/cms/palina')).toBe('https://www.gtt.to.it/cms/palina');
    expect(normalizeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeExternalUrl('http://example.com')).toBeNull();
    expect(normalizeExternalUrl('https://aperto.comune.torino.it/dataset')).toBe('https://aperto.comune.torino.it/dataset');
  });

  it('uses the source update timestamp for freshness when available', () => {
    const now = Date.parse('2026-10-08T00:00:00Z');
    expect(isGtfsDatasetStale({ generatedAt: '2026-10-08T00:00:00Z', sourceUpdatedAt: '2020-01-07T12:58:13.954411' }, now)).toBe(true);
    expect(isGtfsDatasetStale({ generatedAt: '2026-10-08T00:00:00Z', sourceUpdatedAt: '2020-01-07T12:58:13.954411', feedVersionDate: '2026-10-07' }, now)).toBe(false);
    expect(isGtfsDatasetStale({ generatedAt: '2026-10-08T00:00:00Z' }, now)).toBe(false);
  });
  it('normalizes only yes/no declarations and keeps other values unknown', () => {
    expect(['yes', 'no', '0', null].map(normalizeWheelchair)).toEqual(['yes', 'no', 'unknown', 'unknown']);
  });

  it('normalizes GeoJSON and returns validated metadata', () => {
    const result = normalizeGtfsGeoJson({ type: 'FeatureCollection', features: [feature], metadata });
    expect(result.stops[0]).toMatchObject({ id: 'gtfs-1', lat: 45.07, lon: 7.68, properties: { wheelchair: 'yes', source: 'GTT/5T' } });
    expect(result.metadata).toEqual(metadata);
    expect(result.invalidFeatures).toBe(0);
  });

  it('rejects invalid GeoJSON, date/count metadata, and duplicate identifiers', () => {
    expect(() => normalizeGtfsGeoJson({ features: [], metadata })).toThrow(/FeatureCollection/);
    expect(() => normalizeGtfsGeoJson({ type: 'FeatureCollection', features: [feature], metadata: { ...metadata, generatedAt: 'yesterday-ish' } })).toThrow(/data di elaborazione/);
    expect(() => normalizeGtfsGeoJson({ type: 'FeatureCollection', features: [feature], metadata: { ...metadata, totalStops: 2 } })).toThrow(/totalStops/);
    expect(() => normalizeGtfsGeoJson({ type: 'FeatureCollection', features: [feature, feature], metadata: { ...metadata, totalStops: 2 } })).toThrow(/duplicato/);
  });

  it('skips invalid features and fails when none remain', () => {
    const invalid = { ...feature, id: 'bad', geometry: { type: 'Point', coordinates: [999, 45] } };
    const result = normalizeGtfsGeoJson({ type: 'FeatureCollection', features: [feature, invalid], metadata: { ...metadata, totalStops: 2 } });
    expect(result.stops).toHaveLength(1);
    expect(result.invalidFeatures).toBe(1);
    expect(() => normalizeGtfsGeoJson({ type: 'FeatureCollection', features: [invalid], metadata: { ...metadata, totalStops: 1 } })).toThrow(/non contiene fermate/);
  });

  it('handles HTTP errors and invalid JSON from the loader', async () => {
    await expect(parseGtfsStops({ fetchImpl: vi.fn().mockResolvedValue({ ok: false, status: 503, statusText: 'Unavailable' }) })).rejects.toThrow(/HTTP 503/);
    await expect(parseGtfsStops({ fetchImpl: vi.fn().mockResolvedValue({ ok: true, json: async () => { throw new Error('bad json'); } }) })).rejects.toThrow(/JSON valido/);
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ type: 'FeatureCollection', features: [feature], metadata }) });
    await expect(parseGtfsStops({ fetchImpl })).resolves.toMatchObject({ stops: [{ id: 'gtfs-1' }], metadata });
    expect(fetchImpl).toHaveBeenCalledWith('/data/gtt-stops.json', expect.objectContaining({ cache: 'no-store' }));
  });

  it('matches checked-in dataset counts, unique IDs, status totals, and map coverage', () => {
    const geojson = JSON.parse(fs.readFileSync(new URL('../../public/data/gtt-stops.json', import.meta.url), 'utf8'));
    const { stops, metadata: dataMetadata } = normalizeGtfsGeoJson(geojson);
    const ids = new Set(stops.map((stop) => stop.id));
    const locationTypes = stops.filter((stop) => stop.properties.locationType != null);
    const counts = stops.reduce((result, stop) => {
      result[stop.properties.wheelchair] += 1;
      return result;
    }, { yes: 0, no: 0, unknown: 0 });
    expect(stops).toHaveLength(7054);
    expect(locationTypes).toHaveLength(2);
    expect(dataMetadata.sourceUpdatedAt).toMatch(/^2020-01-07/);
    expect(dataMetadata.feedVersion).toBe('20261007');
    expect(dataMetadata.feedVersionDate).toBe('2026-10-07');
    expect(ids.size).toBe(stops.length);
    expect(dataMetadata.totalStops).toBe(stops.length);
    expect(counts).toEqual({ yes: 3797, no: 5, unknown: 3252 });
    expect(counts.yes + counts.no + counts.unknown).toBe(stops.length);
    for (const stop of stops) {
      expect(stop.lat).toBeGreaterThanOrEqual(44.30);
      expect(stop.lat).toBeLessThanOrEqual(45.65);
      expect(stop.lon).toBeGreaterThanOrEqual(7.05);
      expect(stop.lon).toBeLessThanOrEqual(8.55);
      expect(stop.properties.sourceUrl).toMatch(/^https:\/\/aperto\.comune\.torino\.it\//);
    }
  });
});
