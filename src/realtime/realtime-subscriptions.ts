import type { RealtimeChannel } from './realtime.types.ts';

export type ParsedRealtimeChannel =
    | { kind: 'user'; id: string }
    | { kind: 'chat_group'; id: string }
    | { kind: 'post'; id: string }
    | { kind: 'community_group'; id: string };

export type CanSubscribeParams = {
    userId: string;
    channel: RealtimeChannel;
    chatGroupRepo: {
        findMember(params: {
            chatGroupId: string;
            userId: string;
        }): Promise<{ leftAt: Date | null } | null>;
    };
    postRepo: {
        findById(postId: string): Promise<{
            communityGroupId: string | null;
        } | null>;
    };
    groupRepo: {
        findById(
            groupId: string,
        ): Promise<{ visibility: 'PUBLIC' | 'PRIVATE' } | null>;
        findMember(params: {
            groupId: string;
            userId: string;
        }): Promise<{ status: string } | null>;
    };
};

export function parseChannel(channel: string): ParsedRealtimeChannel | null {
    const separatorIndex = channel.indexOf(':');
    if (separatorIndex === -1) return null;

    const kind = channel.slice(0, separatorIndex);
    const id = channel.slice(separatorIndex + 1);
    if (!id) return null;

    if (
        kind === 'user'
        || kind === 'chat_group'
        || kind === 'post'
        || kind === 'community_group'
    ) {
        return { kind, id } as ParsedRealtimeChannel;
    }

    return null;
}

export async function canSubscribe(
    params: CanSubscribeParams,
): Promise<boolean> {
    const parsed = parseChannel(params.channel);
    if (!parsed) return false;

    if (parsed.kind === 'user') {
        return parsed.id === params.userId;
    }

    if (parsed.kind === 'chat_group') {
        const member = await params.chatGroupRepo.findMember({
            chatGroupId: parsed.id,
            userId: params.userId,
        });
        return Boolean(member && member.leftAt === null);
    }

    if (parsed.kind === 'post') {
        const post = await params.postRepo.findById(parsed.id);
        if (!post) return false;
        if (!post.communityGroupId) return true;

        const group = await params.groupRepo.findById(post.communityGroupId);
        if (!group) return false;
        if (group.visibility === 'PUBLIC') return true;

        const member = await params.groupRepo.findMember({
            groupId: post.communityGroupId,
            userId: params.userId,
        });
        return member?.status === 'ACTIVE';
    }

    return false;
}
