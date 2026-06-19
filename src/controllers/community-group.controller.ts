import type { Request, Response } from 'express';
import {
    createCommunityGroupSchema,
    reviewJoinRequestSchema,
} from '../dtos/community-group.dto.ts';
import { unprocessable } from '../lib/api-error.ts';
import type { CommunityGroupService } from '../services/community-group.service.ts';

function getRouteParam(req: Request, name: string): string {
    const value = req.params[name];

    if (typeof value !== 'string' || !value) {
        throw unprocessable(`Missing route parameter: ${name}`);
    }

    return value;
}

export class CommunityGroupController {
    constructor(
        private readonly communityGroupService: CommunityGroupService,
    ) {}

    async createGroup(req: Request, res: Response): Promise<void> {
        const input = createCommunityGroupSchema.parse(req.body);
        const result = await this.communityGroupService.createGroup(
            req.authUser!.id,
            input,
        );

        res.status(201).json({ success: true, data: result });
    }

    async requestJoin(req: Request, res: Response): Promise<void> {
        const membership = await this.communityGroupService.requestJoin(
            req.authUser!.id,
            getRouteParam(req, 'groupId'),
        );

        res.status(201).json({ success: true, data: { membership } });
    }

    async reviewJoinRequest(req: Request, res: Response): Promise<void> {
        const input = reviewJoinRequestSchema.parse(req.body);
        const membership = await this.communityGroupService.reviewJoinRequest(
            req.authUser!.id,
            getRouteParam(req, 'groupId'),
            getRouteParam(req, 'userId'),
            input,
        );

        res.json({ success: true, data: { membership } });
    }
}
