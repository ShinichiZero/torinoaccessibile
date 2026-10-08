import { describe, expect, it, vi } from 'vitest';
import { fetchOverpassAccessibility, validateOverpassBbox } from '../../src/services/overpassApi';

const bbox = '7.60,45.00,7.80,45.20';
const okResponse = (elements = []) => ({ ok: true, json: async () => ({ elements }) });

describe('Overpass request lifecycle', () => {
  it('validates ordering, coordinate ranges, and request area', () => {
    expect(validateOverpassBbox(bbox)).toEqual([7.6, 45, 7.8, 45.2]);
    for (const invalid of ['x,45,7.8,45.2', '8,45,7,45.2', '7,-91,7.5,45', '7,45,181,45.2', '7,44,8,45']) {
      expect(() => validateOverpassBbox(invalid)).toThrow();
    }
  });

  it('returns normalized OSM records with source links', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse([{ type: 'node', id: 55, lat: 45.07, lon: 7.68, tags: { name: 'Mock ramp', wheelchair: 'yes' } }]));
    const result = await fetchOverpassAccessibility(bbox, { fetchImpl, endpoints: ['https://test-overpass.invalid'] });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result[0]).toMatchObject({ id: 'osm-node-55', properties: { name: 'Mock ramp', wheelchair: 'yes', sourceUrl: 'https://www.openstreetmap.org/node/55' } });
  });

  it('retries transient gateway responses and does not retry HTTP 429', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce({ ok: false, status: 503 }).mockResolvedValueOnce(okResponse());
    await expect(fetchOverpassAccessibility(bbox, { fetchImpl, endpoints: ['first', 'second'] })).resolves.toEqual([]);
    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual(['first', 'second']);

    const throttled = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    await expect(fetchOverpassAccessibility(bbox, { fetchImpl: throttled, endpoints: ['first', 'second'] })).rejects.toThrow(/429/);
    expect(throttled).toHaveBeenCalledTimes(1);
  });

  it('distinguishes timeout from caller abort and stops fallback on caller abort', async () => {
    const timeoutFetch = vi.fn((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
    }));
    await expect(fetchOverpassAccessibility(bbox, { fetchImpl: timeoutFetch, timeoutMs: 15, endpoints: ['first', 'second'] })).rejects.toThrow(/scaduta/);
    expect(timeoutFetch).toHaveBeenCalledTimes(2);

    const controller = new AbortController();
    const abortFetch = vi.fn((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
    }));
    const request = fetchOverpassAccessibility(bbox, { fetchImpl: abortFetch, timeoutMs: 1000, endpoints: ['first', 'second'], signal: controller.signal });
    controller.abort();
    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
    expect(abortFetch).toHaveBeenCalledTimes(1);
  });
});
