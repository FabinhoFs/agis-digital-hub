import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
  constructor(private readonly authService = new AuthService()) {}

  login = async (req: Request, res: Response) => {
    const { email, senha } = req.body;
    const tokens = await this.authService.login(email, senha);
    res.json(tokens);
  };

  refresh = async (req: Request, res: Response) => {
    const { refresh_token } = req.body;
    const tokens = await this.authService.refresh(refresh_token);
    res.json(tokens);
  };

  logout = async (req: Request, res: Response) => {
    const { refresh_token } = req.body;
    await this.authService.logout(refresh_token);
    res.json({ message: 'Logout realizado com sucesso' });
  };
}
