export const tryUntil = async (
  method: () => Promise<any>,
  { timeout = 1000, wait = 10 } = {}
) => {
  const startTime = Date.now()
  while (true) {
    try {
      await method()
      break
    } catch (error) {
      if (Date.now() - startTime > timeout) {
        throw error
      } else {
        // Wait and try again
        await new Promise((resolve) => setTimeout(resolve, wait))
      }
    }
  }
}
