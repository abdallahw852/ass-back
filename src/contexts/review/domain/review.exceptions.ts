import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

export class ReviewNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Review '${id}' not found.`);
  }
}

export class DuplicateReviewException extends ConflictException {
  constructor() {
    super('You have already reviewed this product.');
  }
}

export class InvalidRatingException extends BadRequestException {
  constructor() {
    super('Rating must be between 1 and 5.');
  }
}
