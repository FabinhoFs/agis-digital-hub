import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import argon2 from 'argon2';
import { config } from '../config';
import { UserRepository } from '../repositories/user.repository';
import { AuthRepository } from '../repositories/auth.repository';
import { AuditService } from './audit.service';
import { logger } from '../utils/logger';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iss: string;
  aud: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export class AuthService {
  constructor(
    private readonly userRepository = new UserRepository(),
    private readonly authRepository = new AuthRepository(),
    private readonly auditService = new AuditService(),
  ) {}

  private hashRefreshToken(token: string): string {
    return crypto
      .createHmac('sha256', config.refreshTokenSecret)
      .update(token)
      .digest('hex');
  }

  async login(email: string, senha: string): Promise<AuthTokens> {
    const user = await this.userRepository.findByEmail(email.toLowerCase().trim());

    const genericError = new Error('Credenciais inválidas');
    (genericError as any).status = 401;

    if (!user) throw genericError;
    if (!user.ativo) throw genericError;

    const validPassword = await argon2.verify(user.senha_hash, senha);
    if (!validPassword) throw genericError;

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    logger.info({ user_id: user.id, email: user.email }, 'LOGIN');
    await this.auditService.log({
      user_id: user.id,
      action: 'LOGIN',
      entity: 'auth',
      metadata: { email: user.email },
    });

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

    await this.authRepository.revokeRefreshToken(tokenHash);

    const user = await this.userRepository.findById(stored.user_id);
    if (!user || !user.ativo) {
      const error = new Error('Usuário inativo ou não encontrado');
      (error as any).status = 401;
      throw error;
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    logger.info({ user_id: user.id }, 'REFRESH');
    await this.auditService.log({
      user_id: user.id,
      action: 'REFRESH',
      entity: 'auth',
    });

    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const stored = await this.authRepository.findRefreshToken(tokenHash);
    if (stored && !stored.revoked) {
      await this.authRepository.revokeRefreshToken(tokenHash);
      logger.info({ user_id: stored.user_id }, 'LOGOUT');
      await this.auditService.log({
        user_id: stored.user_id,
        action: 'LOGOUT',
        entity: 'auth',
      });
    }
  }

  verifyAccessToken(token: string): JwtPayload {
    if (!config.jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }
    try {
      return jwt.verify(token, config.jwtSecret, {
        algorithms: ['HS256'],
        issuer: config.jwtIssuer,
        audience: config.jwtAudience,
      }) as JwtPayload;
    } catch {
      const error = new Error('Token inválido ou expirado');
      (error as any).status = 401;
      throw error;
    }
  }

  private async generateTokens(userId: string, email: string, role: string): Promise<AuthTokens> {
    if (!config.jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }

    const payload = { sub: userId, email, role };

    const signOptions: SignOptions = {
      expiresIn: config.jwtAccessExpiresIn as SignOptions['expiresIn'],
      algorithm: 'HS256',
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
    };

    const access_token = jwt.sign(payload, config.jwtSecret, signOptions);

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
      expires_in: 900,
    };
  }
}
