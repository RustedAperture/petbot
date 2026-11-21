/** Built-ins first in their given order, then custom names alphabetically. */
export function orderActionKeys(keys: string[], builtIns: string[]): string[] {
  const present = new Set(keys);
  return [
    ...builtIns.filter((key) => present.has(key)),
    ...keys.filter((key) => !builtIns.includes(key)).sort(),
  ];
}
