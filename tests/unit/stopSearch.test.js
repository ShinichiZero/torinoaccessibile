import { describe, expect, it } from 'vitest';
import { filterStops, normalizeStopSearchValue } from '../../src/services/stopSearch';

const stops = [
  { id: '1', properties: { name: 'Città della Salute', stopCode: 'A-1', wheelchair: 'yes' } },
  { id: '2', properties: { name: 'Piazza Duomo', stopCode: 'B-2', wheelchair: 'no' } },
  { id: '3', properties: { name: 'Porta Nuova', stopCode: 'C-3', wheelchair: 'unknown' } },
];

describe('stop search', () => {
  it('normalizes case, surrounding whitespace, and accented characters', () => {
    expect(normalizeStopSearchValue('  CITTÀ  ')).toBe('citta');
    expect(filterStops(stops, '   città ').map((stop) => stop.id)).toEqual(['1']);
    expect(filterStops(stops, 'porta nuova').map((stop) => stop.id)).toEqual(['3']);
  });

  it('searches stop codes and combines status filters', () => {
    expect(filterStops(stops, ' b-2 ', 'no').map((stop) => stop.id)).toEqual(['2']);
    expect(filterStops(stops, '', 'unknown').map((stop) => stop.id)).toEqual(['3']);
    expect(filterStops(stops, 'duomo', 'yes')).toEqual([]);
  });

  it('preserves input order and returns an empty array for no matches', () => {
    expect(filterStops(stops, '').map((stop) => stop.id)).toEqual(['1', '2', '3']);
    expect(filterStops(stops, 'nessuna')).toEqual([]);
  });
});
