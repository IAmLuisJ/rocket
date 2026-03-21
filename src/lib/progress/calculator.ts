import type { Task } from '../tasks/schema.js'

export interface CategoryStats {
  complete: number
  total: number
  percent: number
}

export interface ProgressStats {
  overall: { complete: number; total: number; percent: number }
  byCategory: Record<string, CategoryStats>
}

export function calculateProgress(tasks: Task[]): ProgressStats {
  const total = tasks.length
  const complete = tasks.filter((t) => t.passes).length
  const percent = total === 0 ? 0 : Math.round((complete / total) * 100)

  const categoryMap: Record<string, { complete: number; total: number }> = {}

  for (const task of tasks) {
    const cat = task.category
    if (!categoryMap[cat]) categoryMap[cat] = { complete: 0, total: 0 }
    categoryMap[cat].total++
    if (task.passes) categoryMap[cat].complete++
  }

  const byCategory: Record<string, CategoryStats> = {}
  for (const [cat, stats] of Object.entries(categoryMap)) {
    byCategory[cat] = {
      ...stats,
      percent: stats.total === 0 ? 0 : Math.round((stats.complete / stats.total) * 100),
    }
  }

  return { overall: { complete, total, percent }, byCategory }
}
