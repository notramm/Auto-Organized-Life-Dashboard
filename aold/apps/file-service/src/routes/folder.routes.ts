// apps/file-service/src/routes/folder.routes.ts

import { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { createFolderSchema, updateFolderSchema } from '../schemas/file.schema';
import { createFolder, listFolders, getFolder, updateFolder, deleteFolder } from '../services/folder.service';
import { requireGatewayAuth } from '../middleware/auth.middleware';
import { success, errorResponse, generateRequestId, AppError } from '@aold/shared-utils';

function handleError(err: unknown, reply: any) {
  const rid = generateRequestId();
  if (err instanceof ZodError)  return reply.status(400).send(errorResponse('VALIDATION_ERROR', 'Invalid input', rid));
  if (err instanceof AppError)  return reply.status(err.statusCode).send(errorResponse(err.code, err.message, rid));
  return reply.status(500).send(errorResponse('INTERNAL_ERROR', 'Something went wrong', rid));
}

export async function folderRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireGatewayAuth);

  app.post('/',    async (req, reply) => { try { return reply.status(201).send(success(await createFolder(req.userId, createFolderSchema.parse(req.body)))); } catch (err) { return handleError(err, reply); } });
  app.get('/',     async (req, reply) => { try { const { parentId } = req.query as { parentId?: string }; return reply.send(success(await listFolders(req.userId, parentId))); } catch (err) { return handleError(err, reply); } });
  app.get('/:id',  async (req, reply) => { try { return reply.send(success(await getFolder(req.userId, (req.params as any).id))); } catch (err) { return handleError(err, reply); } });
  app.patch('/:id',async (req, reply) => { try { return reply.send(success(await updateFolder(req.userId, (req.params as any).id, updateFolderSchema.parse(req.body)))); } catch (err) { return handleError(err, reply); } });
  app.delete('/:id', async (req, reply) => {
    try {
      const { moveFiles = 'true' } = req.query as { moveFiles?: string };
      return reply.send(success(await deleteFolder(req.userId, (req.params as any).id, moveFiles === 'true')));
    } catch (err) { return handleError(err, reply); }
  });
}