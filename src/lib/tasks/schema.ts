import { z } from 'zod'

export const TaskCategorySchema = z.enum([
  'functional',
  'ui-ux',
  'api-endpoint',
  'security',
  'testing',
  'config',
  'docs',
])

export const TaskSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  category: TaskCategorySchema,
  passes: z.boolean(),
  passCondition: z.string(),
  blockedReason: z.string().optional(),
})

export const TasksFileSchema = z.object({
  tasks: z.array(TaskSchema),
})

export type TaskCategory = z.infer<typeof TaskCategorySchema>
export type Task = z.infer<typeof TaskSchema>
export type TasksFile = z.infer<typeof TasksFileSchema>
