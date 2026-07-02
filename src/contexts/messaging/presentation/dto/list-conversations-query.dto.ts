import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { ConversationSubjectType } from '../../domain/conversation.types';

export class ListConversationsQueryDto {
  @IsOptional()
  @IsEnum(ConversationSubjectType)
  subjectType?: ConversationSubjectType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
