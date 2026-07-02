import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { IPasswordPort } from '../application/ports/password.port';

const BCRYPT_COST = 12;

@Injectable()
export class BcryptPasswordAdapter implements IPasswordPort {
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_COST);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  async dummyHash(plain: string): Promise<void> {
    await bcrypt.hash(plain, BCRYPT_COST);
  }
}
