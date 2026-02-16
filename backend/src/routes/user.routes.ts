import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { validate } from '../middlewares/validation.middleware';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import {
  createUserSchema,
  updateUserSchema,
  listUsersQuerySchema,
  uuidParamSchema,
} from '../validators/user.validators';

const router = Router();
const controller = new UserController();

// Todas as rotas exigem autenticação + role mínima
router.post('/', requireAuth, requireRole('GERENTE'), validate(createUserSchema), controller.create);
router.get('/', requireAuth, requireRole('SUPERVISOR'), validate(listUsersQuerySchema, 'query'), controller.findMany);
router.get('/:id', requireAuth, requireRole('SUPERVISOR'), validate(uuidParamSchema, 'params'), controller.findById);
router.put('/:id', requireAuth, requireRole('GERENTE'), validate(uuidParamSchema, 'params'), validate(updateUserSchema), controller.update);
router.patch('/:id/deactivate', requireAuth, requireRole('GERENTE'), validate(uuidParamSchema, 'params'), controller.deactivate);

export default router;
