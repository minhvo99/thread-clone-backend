import { Router } from 'express';
import { PostController } from '../controllers/post.controller.ts';
import { asyncHandler } from '../lib/async-handler.ts';
import { requireAuth } from '../middleware/auth.middleware.ts';
import { CommunityGroupPermissionRepository } from '../repositories/community-group-permission.repository.ts';
import { CommunityGroupRepository } from '../repositories/community-group.repository.ts';
import { ConnectionRepository } from '../repositories/connection.repository.ts';
import { PostRepository } from '../repositories/post.repository.ts';
import { realtimeHub } from '../realtime/realtime-hub-singleton.ts';
import { ConnectionService } from '../services/connection.service.ts';
import { PermissionService } from '../services/permission.service.ts';
import { PostService } from '../services/post.service.ts';

const postRouter = Router();

const postRepo = new PostRepository();
const connectionRepo = new ConnectionRepository();
const connectionService = new ConnectionService(connectionRepo);
const groupRepo = new CommunityGroupRepository();
const permissionRepo = new CommunityGroupPermissionRepository();
const permissionService = new PermissionService(permissionRepo);
const postService = new PostService(
    postRepo,
    connectionService,
    groupRepo,
    permissionService,
    realtimeHub,
);
const postController = new PostController(postService);

postRouter.post(
    '/',
    requireAuth,
    asyncHandler((req, res) => postController.createGlobalPost(req, res)),
);
postRouter.get(
    '/feed',
    requireAuth,
    asyncHandler((req, res) => postController.findGlobalFeed(req, res)),
);
postRouter.post(
    '/:postId/comments',
    requireAuth,
    asyncHandler((req, res) => postController.createComment(req, res)),
);
postRouter.post(
    '/:postId/reactions',
    requireAuth,
    asyncHandler((req, res) => postController.upsertReaction(req, res)),
);

export default postRouter;
