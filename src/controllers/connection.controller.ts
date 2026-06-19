import type { Request, Response } from 'express';
import {
    requestConnectionSchema,
    reviewConnectionRequestSchema,
} from '../dtos/connection.dto.ts';
import { unprocessable } from '../lib/api-error.ts';
import type { ConnectionService } from '../services/connection.service.ts';

function getRouteParam(req: Request, name: string): string {
    const value = req.params[name];

    if (typeof value !== 'string' || !value) {
        throw unprocessable(`Missing route parameter: ${name}`);
    }

    return value;
}

export class ConnectionController {
    constructor(private readonly connectionService: ConnectionService) {}

    async requestConnection(req: Request, res: Response): Promise<void> {
        const input = requestConnectionSchema.parse(req.body);
        const connection = await this.connectionService.requestConnection(
            req.authUser!.id,
            input.addresseeId,
        );

        res.status(201).json({ success: true, data: { connection } });
    }

    async reviewConnectionRequest(req: Request, res: Response): Promise<void> {
        const input = reviewConnectionRequestSchema.parse(req.body);
        const connection = await this.connectionService.reviewConnectionRequest(
            req.authUser!.id,
            getRouteParam(req, 'connectionId'),
            input.decision,
        );

        res.json({ success: true, data: { connection } });
    }
}
