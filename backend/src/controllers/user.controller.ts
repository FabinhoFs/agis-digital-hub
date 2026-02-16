import { Request, Response } from 'express';
import { UserService } from '../services/user.service';

export class UserController {
  constructor(private readonly userService = new UserService()) {}

  create = async (req: Request, res: Response) => {
    const user = await this.userService.create(req.body);
    res.status(201).json(user);
  };

  findById = async (req: Request, res: Response) => {
    const user = await this.userService.findById(req.params.id);
    res.json(user);
  };

  findMany = async (req: Request, res: Response) => {
    const result = await this.userService.findMany(req.query as any);
    res.json(result);
  };

  update = async (req: Request, res: Response) => {
    const user = await this.userService.update(req.params.id, req.body);
    res.json(user);
  };

  deactivate = async (req: Request, res: Response) => {
    const user = await this.userService.deactivate(req.params.id);
    res.json(user);
  };
}
