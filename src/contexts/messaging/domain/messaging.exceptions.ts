import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

export class ConversationNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Conversation '${id}' not found.`);
  }
}

export class NotAParticipantException extends ForbiddenException {
  constructor() {
    super('You are not a participant in this conversation.');
  }
}

export class ConversationReadOnlyException extends ConflictException {
  constructor() {
    super('This conversation is read-only and no longer accepts new messages.');
  }
}

export class InvalidSubjectException extends BadRequestException {
  constructor(message = 'Invalid conversation subject.') {
    super(message);
  }
}

export class EmptyMessageBodyException extends BadRequestException {
  constructor() {
    super('Message body cannot be empty.');
  }
}
