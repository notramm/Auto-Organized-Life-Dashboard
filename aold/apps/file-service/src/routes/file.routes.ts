// apps/file-service/src/routes/file.routes.ts

import { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { presignSchema, confirmUploadSchema, listFilesSchema, updateFileSchema } from '../schemas/file.schema';
import { presignUpload, confirmUpload, listFiles, getFile, updateFile, deleteFile, restoreFile, listVersions } from '../services/file.service';
import { requireGatewayAuth } from '../middleware/auth.middleware';
import { success, errorResponse, generateRequestId, AppError } from '@aold/shared-utils';

function handleError(err: unknown, reply: any) {
  const rid = generateRequestId();
  if (err instanceof ZodError)  return reply.status(400).send(errorResponse('VALIDATION_ERROR', 'Invalid input', rid, err.flatten().fieldErrors));
  if (err instanceof AppError)  return reply.status(err.statusCode).send(errorResponse(err.code, err.message, rid));
  console.error('[FileRoutes]', err);
  return reply.status(500).send(errorResponse('INTERNAL_ERROR', 'Something went wrong', rid));
}

export async function fileRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireGatewayAuth);

  // POST /files/presign
  app.post('/presign', async (req, reply) => {
    try {
      const input  = presignSchema.parse(req.body);
      const result = await presignUpload(req.userId, input);
      return reply.status(201).send(success(result));
    } catch (err) { return handleError(err, reply); }
  });

  // POST /files/:id/confirm
  app.post('/:id/confirm', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const result = await confirmUpload(req.userId, id);
      return reply.send(success(result));
    } catch (err) { return handleError(err, reply); }
  });

  // GET /files
  app.get('/', async (req, reply) => {
    try {
      const input  = listFilesSchema.parse(req.query);
      const result = await listFiles(req.userId, input);
      return reply.send(success(result, { page: result.page, limit: result.limit, total: result.total }));
    } catch (err) { return handleError(err, reply); }
  });

  // GET /files/:id
  app.get('/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      return reply.send(success(await getFile(req.userId, id)));
    } catch (err) { return handleError(err, reply); }
  });

  // PATCH /files/:id
  app.patch('/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const input  = updateFileSchema.parse(req.body);
      return reply.send(success(await updateFile(req.userId, id, input)));
    } catch (err) { return handleError(err, reply); }
  });

  // DELETE /files/:id
  app.delete('/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      return reply.send(success(await deleteFile(req.userId, id)));
    } catch (err) { return handleError(err, reply); }
  });

  // POST /files/:id/restore
  app.post('/:id/restore', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      return reply.send(success(await restoreFile(req.userId, id)));
    } catch (err) { return handleError(err, reply); }
  });

  // GET /files/:id/versions
  app.get('/:id/versions', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      return reply.send(success(await listVersions(req.userId, id)));
    } catch (err) { return handleError(err, reply); }
  });

  // GET /files/health
  app.get('/health', async (_req, reply) =>
    reply.send({ status: 'ok', service: 'file-service' }),
  );
}