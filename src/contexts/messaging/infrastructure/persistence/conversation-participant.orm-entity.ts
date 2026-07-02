import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserOrmEntity } from '../../../auth/infrastructure/persistence/user.orm-entity';
import { ParticipantRole } from '../../domain/conversation.types';
import { ConversationOrmEntity } from './conversation.orm-entity';

@Entity('conversation_participants')
@Index('UQ_conversation_participant', ['conversationId', 'userId'], {
  unique: true,
})
export class ConversationParticipantOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  conversationId: number;

  @ManyToOne(() => ConversationOrmEntity, (c) => c.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversationId' })
  conversation: ConversationOrmEntity;

  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserOrmEntity;

  @Column({ type: 'enum', enum: ParticipantRole })
  role: ParticipantRole;

  @Column({ type: 'int', nullable: true })
  lastReadMessageId: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  joinedAt: Date;
}
