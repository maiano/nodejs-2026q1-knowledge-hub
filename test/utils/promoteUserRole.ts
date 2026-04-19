import prisma from '../lib/prisma';
import { UserRole as PrismaUserRole } from '@prisma/client';

type Role = 'viewer' | 'editor' | 'admin';

const ROLE_MAP: Record<Role, PrismaUserRole> = {
  viewer: PrismaUserRole.VIEWER,
  editor: PrismaUserRole.EDITOR,
  admin: PrismaUserRole.ADMIN,
};

const promoteUserRole = async (userId: string, role: Role): Promise<void> => {
  await prisma.user.update({
    where: { id: userId },
    data: { role: ROLE_MAP[role] },
  });
};

export default promoteUserRole;
