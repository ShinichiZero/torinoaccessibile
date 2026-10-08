import AdmZip from 'adm-zip';
import { describe, expect, it } from 'vitest';
import { validateGtfsArchive } from '../../scripts/download-gtfs.mjs';

describe('GTFS ZIP validation', () => {
  it('accepts an archive containing stops.txt', () => {
    const zip = new AdmZip();
    zip.addFile('stops.txt', Buffer.from('stop_id,stop_name,stop_lat,stop_lon\n1,Duomo,45.07,7.68\n'));
    expect(validateGtfsArchive(zip.toBuffer())).toBe(true);
  });

  it('rejects corrupt ZIP files and archives missing stops.txt', () => {
    expect(() => validateGtfsArchive(Buffer.from('not a zip'))).toThrow(/ZIP valido/);
    const zip = new AdmZip();
    zip.addFile('routes.txt', Buffer.from('route_id\nr1\n'));
    expect(() => validateGtfsArchive(zip.toBuffer())).toThrow(/non contiene stops.txt/);
  });
});
