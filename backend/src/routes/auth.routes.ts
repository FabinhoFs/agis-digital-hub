import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validation.middleware';
import { loginRateLimit } from '../middlewares/rateLimit.middleware';
import { loginSchema, refreshSchema, logoutSchema } from '../validators/auth.validators';

const router = Router();
const controller = new AuthController();

router.post('/login', loginRateLimit, validate(loginSchema), controller.login);
router.post('/refresh', validate(refreshSchema), controller.refresh);
router.post('/logout', validate(logoutSchema), controller.logout);

export default router;
