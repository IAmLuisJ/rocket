import { readTasks, writeTasks, getMaxTaskId } from '../tasks/reader.js'
import { TaskSchema } from '../tasks/schema.js'

export interface MergeResult {
  tasksAdded: number
  newMaxId: number
}

export function mergeTasks(
  projectRoot: string,
  newTasks: Array<{
    title: string
    description: string
    category: string
    passes: boolean
    passCondition: string
  }>,
): MergeResult {
  const tasksFile = readTasks(projectRoot)
  let nextId = getMaxTaskId(tasksFile.tasks) + 1

  for (const raw of newTasks) {
    const task = TaskSchema.parse({
      id: nextId,
      title: raw.title,
      description: raw.description,
      category: raw.category,
      passes: raw.passes,
      passCondition: raw.passCondition,
    })
    tasksFile.tasks.push(task)
    nextId++
  }

  writeTasks(projectRoot, tasksFile)

  return {
    tasksAdded: newTasks.length,
    newMaxId: nextId - 1,
  }
}
