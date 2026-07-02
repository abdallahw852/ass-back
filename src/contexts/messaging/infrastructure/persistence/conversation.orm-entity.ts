import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ConversationSubjectType } from '../../domain/conversation.types';
import { ConversationParticipantOrmEntity } from './conversation-participant.orm-entity';
import { MessageOrmEntity } from './message.orm-entity';

@Entity('conversations')
@Index(
  'UQ_conversation_subject_scope',
  ['subjectType', 'subjectId', 'scopeKey'],
  {
    unique: true,
  },
)
export class ConversationOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  _id: string;

  @Column({ type: 'enum', enum: ConversationSubjectType })
  subjectType: ConversationSubjectType;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'uuid', nullable: true })
  scopeKey: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastMessageAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(
    () => ConversationParticipantOrmEntity,
    (participant) => participant.conversation,
    { cascade: true },
  )
  participants: ConversationParticipantOrmEntity[];

  @OneToMany(() => MessageOrmEntity, (message) => message.conversation, {
    cascade: false,
  })
  messages: MessageOrmEntity[];

  @BeforeInsert()
  setDefaults(): void {
    this._id = this._id || randomUUID();
  }
}
