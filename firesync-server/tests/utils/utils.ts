export const nTimes = async (
  n: number,
  callback: (i: number) => Promise<void> | void
) => {
  for (let i = 0; i < n; i++) {
    await callback(i)
  }
}
