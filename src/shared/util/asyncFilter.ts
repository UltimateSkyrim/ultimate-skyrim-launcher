// An async version of array filter
export async function asyncFilter<T>(arr: T[], predicate: (value: T) => Promise<boolean>): Promise<T[]> {
  const filtered = await Promise.all(arr.map(predicate));
  return arr.filter((_, index) => filtered[index]);
}
