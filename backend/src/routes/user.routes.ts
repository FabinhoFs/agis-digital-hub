import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { validate } from '../middlewares/validation.middleware';
import {
  createUserSchema,
  updateUserSchema,
  listUsersQuerySchema,
  uuidParamSchema,
} from '../validators/user.validators';

const router = Router();
const controller = new UserController();

router.post('/', validate(createUserSchema), controller.create);
router.get('/', validate(listUsersQuerySchema, 'query'), controller.findMany);
router.get('/:id', validate(uuidParamSchema, 'params'), controller.findById);
router.put('/:id', validate(uuidParamSchema, 'params'), validate(updateUserSchema), controller.update);
router.patch('/:id/deactivate', validate(uuidParamSchema, 'params'), controller.deactivate);

export default router;
