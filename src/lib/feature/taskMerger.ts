import { readFile, writeFile } from 'fs/promises'
import { getMaxTaskId } from '../tasks/reader.js'
import { TaskSchema, TasksFileSchema, type Task } from '../tasks/schema.js'

export interface MergeResult {
  added: number
  newMaxId: number
}

export type NewTask = Omit<Task, 'id'>

export async function mergeTasks(newTasks: NewTask[], tasksPath: string): Promise<MergeResult> {
  const raw = JSON.parse(await readFile(tasksPath, 'utf-8')) as unknown
  const tasksFile = TasksFileSchema.parse(raw)
  const maxId = getMaxTaskId(tasksFile.tasks)

  if (newTasks.length === 0) {
    return { added: 0, newMaxId: maxId }
  }

  const tasksToAdd = newTasks.map((task, index) =>
    TaskSchema.parse({
      ...task,
      id: maxId + index + 1,
    }),
  )

  await writeFile(
    tasksPath,
    JSON.stringify({ tasks: [...tasksFile.tasks, ...tasksToAdd] }, null, 2),
    'utf-8',
  )

  return {
    added: tasksToAdd.length,
    newMaxId: maxId + tasksToAdd.length,
  }
}
