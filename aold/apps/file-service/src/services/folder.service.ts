// apps/file-service/src/services/folder.service.ts

import { PrismaClient } from '@prisma/client';
import { generateId, NotFoundError, ForbiddenError, ConflictError } from '@aold/shared-utils';
import type { CreateFolderInput, UpdateFolderInput } from '../schemas/file.schema';

const prisma = new PrismaClient();

export async function createFolder(userId: string, input: CreateFolderInput) {
  let parentPath = '';
  if (input.parentId) {
    const parent = await prisma.folder.findUnique({
      where: { id: input.parentId }, select: { userId: true, path: true },
    });
    if (!parent || parent.userId !== userId) throw new NotFoundError('Parent folder');
    parentPath = parent.path;
  }

  const existing = await prisma.folder.findFirst({
    where: { userId, parentId: input.parentId ?? null, name: input.name },
  });
  if (existing) throw new ConflictError(`Folder "${input.name}" already exists here`);

  const id   = generateId();
  const slug = input.name.toLowerCase().replace(/\s+/g, '-');
  const path = parentPath ? `${parentPath}/${slug}` : slug;

  return prisma.folder.create({
    data: { id, userId, parentId: input.parentId ?? null, name: input.name, path },
  });
}

export async function listFolders(userId: string, parentId?: string) {
  const folders = await prisma.folder.findMany({
    where:   { userId, parentId: parentId ?? null },
    orderBy: { name: 'asc' },
    include: { _count: { select: { files: { where: { isDeleted: false, isLatest: true } } } } },
  });
  return folders.map((f) => ({ ...f, fileCount: f._count.files }));
}

export async function getFolder(userId: string, folderId: string) {
  const folder = await prisma.folder.findUnique({
    where:   { id: folderId },
    include: { children: true, _count: { select: { files: { where: { isDeleted: false, isLatest: true } } } } },
  });
  if (!folder)                  throw new NotFoundError('Folder', folderId);
  if (folder.userId !== userId) throw new ForbiddenError('Access denied');
  return { ...folder, fileCount: folder._count.files };
}

export async function updateFolder(userId: string, folderId: string, input: UpdateFolderInput) {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId }, select: { id: true, userId: true, path: true },
  });
  if (!folder)                  throw new NotFoundError('Folder', folderId);
  if (folder.userId !== userId) throw new ForbiddenError('Access denied');

  let newPath = folder.path;
  if (input.name) {
    const slug  = input.name.toLowerCase().replace(/\s+/g, '-');
    const parts = folder.path.split('/');
    parts[parts.length - 1] = slug;
    newPath = parts.join('/');
  }

  return prisma.folder.update({
    where: { id: folderId },
    data:  {
      ...(input.name     !== undefined && { name: input.name, path: newPath }),
      ...(input.parentId !== undefined && { parentId: input.parentId }),
    },
  });
}

export async function deleteFolder(userId: string, folderId: string, moveFilesToRoot = true) {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId }, select: { id: true, userId: true },
  });
  if (!folder)                  throw new NotFoundError('Folder', folderId);
  if (folder.userId !== userId) throw new ForbiddenError('Access denied');

  if (moveFilesToRoot) {
    await prisma.file.updateMany({ where: { folderId, userId }, data: { folderId: null } });
  }

  await prisma.folder.delete({ where: { id: folderId } });
  return { folderId, deleted: true };
}