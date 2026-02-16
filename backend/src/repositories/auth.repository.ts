import { prisma } from '../config/prisma';
import { RefreshToken } from '@prisma/client';

export class AuthRepository {
  async createRefreshToken(data: {
    user_id: string;
    token: string;
    expires_at: Date;
  }): Promise<RefreshToken> {
    return prisma.refreshToken.create({ data });
  }

  async findRefreshToken(token: string): Promise<RefreshToken | null> {
    return prisma.refreshToken.findUnique({ where: { token } });
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await prisma.refreshToken.update({
      where: { token },
      data: { revoked: true },
    });
  }

  async revokeAllUserTokens(user_id: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { user_id, revoked: false },
      data: { revoked: true },
    });
  }

  async deleteExpiredTokens(): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { expires_at: { lt: new Date() } },
    });
  }
}
