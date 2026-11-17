export function countPrimes(limit: number) {
  const composite = new Uint8Array(limit + 1);
  let count = 0;
  for (let n = 2; n <= limit; n++) {
    if (composite[n]) continue;
    count++;
    for (let multiple = n * n; multiple <= limit; multiple += n) {
      composite[multiple] = 1;
    }
  }
  return count;
}
