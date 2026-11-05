export type SearchParams = Record<string, string | string[] | undefined>;

export function toQueryString(params: SearchParams) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined) search.append(key, item);
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
