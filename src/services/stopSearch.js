export function normalizeStopSearchValue(value) {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('it-IT');
}

export function filterStops(stops, query, status = 'all') {
  const normalizedQuery = normalizeStopSearchValue(query);
  return stops.filter((stop) => {
    if (status !== 'all' && stop.properties.wheelchair !== status) return false;
    if (!normalizedQuery) return true;
    return [stop.properties.name, stop.properties.stopCode]
      .some((value) => normalizeStopSearchValue(value).includes(normalizedQuery));
  });
}
