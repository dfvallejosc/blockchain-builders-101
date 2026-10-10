const pad = (value: number): string => String(value).padStart(2, '0')

export const today = (): string => {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
