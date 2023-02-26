export const template = (string: string, data: Record<string, string>) => {
  for (const [key, value] of Object.entries(data)) {
    // Replace instances of `{{ key }}` with value
    string = string.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), value)
  }
  return string
}
