import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import argon2 from 'argon2';
import { config } from '../config';
import { UserRepository } from '../repositories/user.repository';
import { AuthRepository } from '../repositories/auth.repository';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
}

export class AuthService {
  constructor(
    private readonly userRepository = new UserRepository(),
    private readonly authRepository = new AuthRepository(),
  ) {}

  /**
   * Gera HMAC-SHA256 do refresh token usando REFRESH_TOKEN_SECRET.
   * Apenas o hash HMAC é armazenado no banco.
   */
  private hashRefreshToken(token: string): string {
    return crypto
      .createHmac('sha256', config.refreshTokenSecret)
      .update(token)
      .digest('hex');
  }

  async login(email: string, senha: string): Promise<AuthTokens> {
    const user = await this.userRepository.findByEmail(email.toLowerCase().trim());

    // Mensagem genérica para não revelar se email ou senha estão errados
    const genericError = new Error('Credenciais inválidas');
    (genericError as any).status = 401;

    if (!user) throw genericError;
    if (!user.ativo) throw genericError;

    const validPassword = await argon2.verify(user.senha_hash, senha);
    if (!validPassword) throw genericError;

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    console.log(`[AUDIT] LOGIN user_id=${user.id} email=${user.email} at=${new Date().toISOString()}`);

    return tokens;
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const stored = await this.authRepository.findRefreshToken(tokenHash);

    if (!stored || stored.revoked || stored.expires_at < new Date()) {
      const error = new Error('Refresh token inválido ou expirado');
      (error as any).status = 401;
      throw error;
    }

    // Revoke old token (rotation)
    await this.authRepository.revokeRefreshToken(tokenHash);

    const user = await this.userRepository.findById(stored.user_id);
    if (!user || !user.ativo) {
      const error = new Error('Usuário inativo ou não encontrado');
      (error as any).status = 401;
      throw error;
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    console.log(`[AUDIT] REFRESH user_id=${user.id} at=${new Date().toISOString()}`);

    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const stored = await this.authRepository.findRefreshToken(tokenHash);
    if (stored && !stored.revoked) {
      await this.authRepository.revokeRefreshToken(tokenHash);
      console.log(`[AUDIT] LOGOUT user_id=${stored.user_id} at=${new Date().toISOString()}`);
    }
  }

  verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, config.jwtSecret) as JwtPayload;
    } catch {
      const error = new Error('Token inválido ou expirado');
      (error as any).status = 401;
      throw error;
    }
  }

  private async generateTokens(userId: string, email: string, role: string): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email, role };

    const access_token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtAccessExpiresIn,
      algorithm: 'HS256',
    });

    // Gera token raw (retornado ao cliente) e armazena apenas o HMAC
    const refresh_token = crypto.randomBytes(64).toString('hex');
    const tokenHash = this.hashRefreshToken(refresh_token);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.authRepository.createRefreshToken({
      user_id: userId,
      token: tokenHash,
      expires_at: expiresAt,
    });

    return {
      access_token,
      refresh_token,
      expires_in: 900, // 15 minutes in seconds
    };
  }
}
