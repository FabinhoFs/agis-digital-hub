import { Response } from 'express';
import { UserService } from '../services/user.service';
import { AuthRequest } from '../middlewares/auth.middleware';

export class UserController {
  constructor(private readonly userService = new UserService()) {}

  create = async (req: AuthRequest, res: Response) => {
    const user = await this.userService.create(req.body, req.user!);
    res.status(201).json(user);
  };

  findById = async (req: AuthRequest, res: Response) => {
    const user = await this.userService.findById(req.params.id);
    res.json(user);
  };

  findMany = async (req: AuthRequest, res: Response) => {
    const result = await this.userService.findMany(req.query as any);
    res.json(result);
  };

  update = async (req: AuthRequest, res: Response) => {
    const user = await this.userService.update(req.params.id, req.body, req.user!);
    res.json(user);
  };

  deactivate = async (req: AuthRequest, res: Response) => {
    const user = await this.userService.deactivate(req.params.id, req.user!);
    res.json(user);
  };
}
