export function calculateTimeTaken(ms) {
  const seconds = Math.floor(ms / 1000);
  const remainingMilliseconds = ms % 1000;
  return `${seconds}sec ${remainingMilliseconds}ms`;
}
