import type { Request, Response } from 'express';
import {
    createCommentSchema,
    createGlobalPostSchema,
    createGroupPostSchema,
    findGlobalFeedSchema,
    findGroupPostsSchema,
    upsertReactionSchema,
} from '../dtos/post.dto.ts';
import { unprocessable } from '../lib/api-error.ts';
import type { PostService } from '../services/post.service.ts';

function getRouteParam(req: Request, name: string): string {
    const value = req.params[name];

    if (typeof value !== 'string' || !value) {
        throw unprocessable(`Missing route parameter: ${name}`);
    }

    return value;
}

export class PostController {
    constructor(private readonly postService: PostService) {}

    async createComment(req: Request, res: Response): Promise<void> {
        const input = createCommentSchema.parse(req.body);
        const comment = await this.postService.createComment(
            req.authUser!.id,
            getRouteParam(req, 'postId'),
            input,
        );

        res.status(201).json({ success: true, data: { comment } });
    }

    async upsertReaction(req: Request, res: Response): Promise<void> {
        const input = upsertReactionSchema.parse(req.body);
        const reaction = await this.postService.upsertReaction(
            req.authUser!.id,
            getRouteParam(req, 'postId'),
            input,
        );

        res.json({ success: true, data: { reaction } });
    }

    async createGroupPost(req: Request, res: Response): Promise<void> {
        const input = createGroupPostSchema.parse(req.body);
        const post = await this.postService.createGroupPost(
            req.authUser!.id,
            getRouteParam(req, 'groupId'),
            input,
        );

        res.status(201).json({ success: true, data: { post } });
    }

    async findGroupPosts(req: Request, res: Response): Promise<void> {
        const input = findGroupPostsSchema.parse(req.query);
        const feed = await this.postService.findGroupPosts(
            req.authUser!.id,
            getRouteParam(req, 'groupId'),
            input,
        );

        res.json({ success: true, data: feed });
    }

    async createGlobalPost(req: Request, res: Response): Promise<void> {
        const input = createGlobalPostSchema.parse(req.body);
        const post = await this.postService.createGlobalPost(
            req.authUser!.id,
            input,
        );

        res.status(201).json({ success: true, data: { post } });
    }

    async findGlobalFeed(req: Request, res: Response): Promise<void> {
        const input = findGlobalFeedSchema.parse(req.query);
        const feed = await this.postService.findGlobalFeed(
            req.authUser!.id,
            input,
        );

        res.json({ success: true, data: feed });
    }
}
