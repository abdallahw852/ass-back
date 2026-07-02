import { Injectable } from '@nestjs/common';

@Injectable()
export class ConversationPresenceService {
  private readonly rooms = new Map<string, Set<number>>();

  join(conversationPublicId: string, userId: number): void {
    if (!this.rooms.has(conversationPublicId)) {
      this.rooms.set(conversationPublicId, new Set());
    }
    this.rooms.get(conversationPublicId)!.add(userId);
  }

  leave(conversationPublicId: string, userId: number): void {
    this.rooms.get(conversationPublicId)?.delete(userId);
  }

  getActiveUserIds(conversationPublicId: string): number[] {
    return [...(this.rooms.get(conversationPublicId) ?? [])];
  }
}
