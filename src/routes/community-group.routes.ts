import { Router } from 'express';
import { CommunityGroupController } from '../controllers/community-group.controller.ts';
import { PostController } from '../controllers/post.controller.ts';
import { asyncHandler } from '../lib/async-handler.ts';
import { requireAuth } from '../middleware/auth.middleware.ts';
import { CommunityGroupPermissionRepository } from '../repositories/community-group-permission.repository.ts';
import { CommunityGroupRepository } from '../repositories/community-group.repository.ts';
import { ConnectionRepository } from '../repositories/connection.repository.ts';
import { PostRepository } from '../repositories/post.repository.ts';
import { CommunityGroupService } from '../services/community-group.service.ts';
import { ConnectionService } from '../services/connection.service.ts';
import { PermissionService } from '../services/permission.service.ts';
import { PostService } from '../services/post.service.ts';
import { realtimeHub } from '../realtime/realtime-hub-singleton.ts';

const communityGroupRouter = Router();

const groupRepo = new CommunityGroupRepository();
const permissionRepo = new CommunityGroupPermissionRepository();
const permissionService = new PermissionService(permissionRepo);
const communityGroupService = new CommunityGroupService(
    groupRepo,
    permissionRepo,
    permissionService,
);
const communityGroupController = new CommunityGroupController(
    communityGroupService,
);

const postRepo = new PostRepository();
const connectionRepo = new ConnectionRepository();
const connectionService = new ConnectionService(connectionRepo);
const postService = new PostService(
    postRepo,
    connectionService,
    groupRepo,
    permissionService,
    realtimeHub,
);
const postController = new PostController(postService);

communityGroupRouter.post(
    '/',
    requireAuth,
    asyncHandler((req, res) => communityGroupController.createGroup(req, res)),
);
communityGroupRouter.post(
    '/:groupId/join-requests',
    requireAuth,
    asyncHandler((req, res) => communityGroupController.requestJoin(req, res)),
);
communityGroupRouter.patch(
    '/:groupId/join-requests/:userId',
    requireAuth,
    asyncHandler((req, res) =>
        communityGroupController.reviewJoinRequest(req, res),
    ),
);

communityGroupRouter.post(
    '/:groupId/posts',
    requireAuth,
    asyncHandler((req, res) => postController.createGroupPost(req, res)),
);
communityGroupRouter.get(
    '/:groupId/posts',
    requireAuth,
    asyncHandler((req, res) => postController.findGroupPosts(req, res)),
);

export default communityGroupRouter;
