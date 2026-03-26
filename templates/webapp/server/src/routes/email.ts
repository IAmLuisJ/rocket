import { Router } from 'express'
import type { Request, Response } from 'express'

const router = Router()

router.post('/send', (_req: Request, res: Response) => {
  // TODO: Implement email sending logic
  res.json({ message: 'Email send endpoint' })
})

export default router
