const STORAGE_KEY = 'cinecanvas-lessons-done'

export function getCompletedLessonIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function markLessonComplete(id: string): void {
  const set = new Set(getCompletedLessonIds())
  set.add(id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
}

export function isLessonComplete(id: string): boolean {
  return getCompletedLessonIds().includes(id)
}
