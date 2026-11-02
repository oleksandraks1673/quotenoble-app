/** Pure cloud retry policy. No network or storage access. */
export function retryDelayMs(failures) {
  if (!Number.isSafeInteger(failures) || failures < 1) throw new RangeError('Invalid retry count');
  return Math.min(60000, 5000 * (2 ** Math.min(failures - 1, 5)));
}
export function shouldRetryCloudWrite({online, ready, running, generation, currentGeneration}) {
  return Boolean(online && ready && !running && generation === currentGeneration);
}
