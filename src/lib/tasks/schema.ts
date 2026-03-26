import { z } from 'zod'

export const TaskCategorySchema = z.enum([
  'config',
  'functional',
  'ui-ux',
  'data-model',
  'api-endpoint',
  'integration',
  'security',
  'testing',
  'docs',
])

export const TaskSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
  category: TaskCategorySchema,
  passes: z.boolean(),
  passCondition: z.string().min(1),
  blockedReason: z.string().optional(),
  specFilePath: z.string().optional(),
})

export const TasksFileSchema = z.object({
  tasks: z.array(TaskSchema),
})

export type TaskCategory = z.infer<typeof TaskCategorySchema>
export type Task = z.infer<typeof TaskSchema>
export type TasksFile = z.infer<typeof TasksFileSchema>
