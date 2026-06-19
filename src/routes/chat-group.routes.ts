import { Router } from 'express';
import { ChatGroupController } from '../controllers/chat-group.controller.ts';
import { ChatMessageController } from '../controllers/chat-message.controller.ts';
import { asyncHandler } from '../lib/async-handler.ts';
import { requireAuth } from '../middleware/auth.middleware.ts';
import { ChatGroupRepository } from '../repositories/chat-group.repository.ts';
import { ChatMessageRepository } from '../repositories/chat-message.repository.ts';
import { NotificationRepository } from '../repositories/notification.repository.ts';
import { realtimeHub } from '../realtime/realtime-hub-singleton.ts';
import { ChatGroupService } from '../services/chat-group.service.ts';
import { ChatMessageService } from '../services/chat-message.service.ts';

const chatGroupRouter = Router();

const chatGroupRepo = new ChatGroupRepository();
const chatGroupService = new ChatGroupService(chatGroupRepo);
const chatGroupController = new ChatGroupController(chatGroupService);
const chatMessageRepo = new ChatMessageRepository();
const notificationRepo = new NotificationRepository();
const chatMessageService = new ChatMessageService(
    chatGroupRepo,
    chatMessageRepo,
    notificationRepo,
    realtimeHub,
);
const chatMessageController = new ChatMessageController(chatMessageService);

chatGroupRouter.post(
    '/',
    requireAuth,
    asyncHandler((req, res) => chatGroupController.createChatGroup(req, res)),
);
chatGroupRouter.post(
    '/:chatGroupId/invites',
    requireAuth,
    asyncHandler((req, res) => chatGroupController.inviteMember(req, res)),
);
chatGroupRouter.post(
    '/:chatGroupId/invite-links',
    requireAuth,
    asyncHandler((req, res) => chatGroupController.createInviteLink(req, res)),
);
chatGroupRouter.post(
    '/:chatGroupId/join-by-invite',
    requireAuth,
    asyncHandler((req, res) => chatGroupController.joinByInvite(req, res)),
);
chatGroupRouter.post(
    '/:chatGroupId/messages',
    requireAuth,
    asyncHandler((req, res) => chatMessageController.sendMessage(req, res)),
);
chatGroupRouter.get(
    '/:chatGroupId/messages',
    requireAuth,
    asyncHandler((req, res) => chatMessageController.findMessages(req, res)),
);

export default chatGroupRouter;
