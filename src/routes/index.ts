import { Router } from 'express';
import chatGroupRouter from './chat-group.routes.ts';
import communityGroupRouter from './community-group.routes.ts';
import connectionRouter from './connection.routes.ts';
import notificationRouter from './notification.routes.ts';
import postRouter from './post.routes.ts';

const appRouter = Router();

appRouter.get('/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok' } });
});
appRouter.use('/chat-groups', chatGroupRouter);
appRouter.use('/community-groups', communityGroupRouter);
appRouter.use('/connections', connectionRouter);
appRouter.use('/notifications', notificationRouter);
appRouter.use('/posts', postRouter);

export default appRouter;
