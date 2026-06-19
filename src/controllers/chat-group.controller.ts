import type { Request, Response } from 'express';
import {
    createChatGroupSchema,
    inviteChatMemberSchema,
    joinByInviteSchema,
} from '../dtos/chat-group.dto.ts';
import { unprocessable } from '../lib/api-error.ts';
import type { ChatGroupService } from '../services/chat-group.service.ts';

function getRouteParam(req: Request, name: string): string {
    const value = req.params[name];

    if (typeof value !== 'string' || !value) {
        throw unprocessable(`Missing route parameter: ${name}`);
    }

    return value;
}

export class ChatGroupController {
    constructor(private readonly chatGroupService: ChatGroupService) {}

    async createChatGroup(req: Request, res: Response): Promise<void> {
        const input = createChatGroupSchema.parse(req.body);
        const result = await this.chatGroupService.createChatGroup(
            req.authUser!.id,
            input,
        );

        res.status(201).json({ success: true, data: result });
    }

    async inviteMember(req: Request, res: Response): Promise<void> {
        const input = inviteChatMemberSchema.parse(req.body);
        const invite = await this.chatGroupService.inviteMember(
            req.authUser!.id,
            getRouteParam(req, 'chatGroupId'),
            input,
        );

        res.status(201).json({ success: true, data: { invite } });
    }

    async createInviteLink(req: Request, res: Response): Promise<void> {
        const result = await this.chatGroupService.createInviteLink(
            req.authUser!.id,
            getRouteParam(req, 'chatGroupId'),
        );

        res.status(201).json({ success: true, data: result });
    }

    async joinByInvite(req: Request, res: Response): Promise<void> {
        const input = joinByInviteSchema.parse(req.body);
        const membership = await this.chatGroupService.joinByInvite(
            req.authUser!.id,
            getRouteParam(req, 'chatGroupId'),
            input,
        );

        res.status(201).json({ success: true, data: { membership } });
    }
}
