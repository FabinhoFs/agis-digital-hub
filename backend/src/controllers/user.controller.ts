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
    const id = String(req.params.id);
    const user = await this.userService.findById(id);
    res.json(user);
  };

  findMany = async (req: AuthRequest, res: Response) => {
    const query = {
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      search: req.query.search ? String(req.query.search) : undefined,
    };
    const result = await this.userService.findMany(query);
    res.json(result);
  };

  update = async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    const user = await this.userService.update(id, req.body, req.user!);
    res.json(user);
  };

  deactivate = async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    const user = await this.userService.deactivate(id, req.user!);
    res.json(user);
  };
}
