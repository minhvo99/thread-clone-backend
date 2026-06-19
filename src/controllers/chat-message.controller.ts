import type { Request, Response } from 'express';
import {
    findChatMessagesSchema,
    sendChatMessageSchema,
} from '../dtos/chat-message.dto.ts';
import { unprocessable } from '../lib/api-error.ts';
import type { ChatMessageService } from '../services/chat-message.service.ts';

function getRouteParam(req: Request, name: string): string {
    const value = req.params[name];

    if (typeof value !== 'string' || !value) {
        throw unprocessable(`Missing route parameter: ${name}`);
    }

    return value;
}

export class ChatMessageController {
    constructor(private readonly chatMessageService: ChatMessageService) {}

    async sendMessage(req: Request, res: Response): Promise<void> {
        const input = sendChatMessageSchema.parse(req.body);
        const message = await this.chatMessageService.sendMessage(
            req.authUser!.id,
            getRouteParam(req, 'chatGroupId'),
            input,
        );

        res.status(201).json({ success: true, data: { message } });
    }

    async findMessages(req: Request, res: Response): Promise<void> {
        const input = findChatMessagesSchema.parse(req.query);
        const feed = await this.chatMessageService.findMessages(
            req.authUser!.id,
            getRouteParam(req, 'chatGroupId'),
            input,
        );

        res.json({ success: true, data: feed });
    }
}
