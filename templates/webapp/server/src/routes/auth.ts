import { Router } from 'express'
import type { Request, Response } from 'express'

const router = Router()

router.post('/login', (_req: Request, res: Response) => {
  // TODO: Implement login logic
  res.json({ message: 'Login endpoint' })
})

router.post('/register', (_req: Request, res: Response) => {
  // TODO: Implement registration logic
  res.json({ message: 'Register endpoint' })
})

export default router
