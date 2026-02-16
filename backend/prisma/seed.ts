import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN', ativo: true },
  });

  if (existingAdmin) {
    console.log(`✅ ADMIN ativo já existe: ${existingAdmin.email} — seed ignorado.`);
    return;
  }

  const senha_hash = await argon2.hash('Admin@123', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const admin = await prisma.user.create({
    data: {
      nome: 'Administrador',
      email: 'admin@admin.com',
      senha_hash,
      role: 'ADMIN',
      ativo: true,
    },
  });

  console.log(`🚀 ADMIN criado com sucesso: ${admin.email} (id: ${admin.id})`);
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
