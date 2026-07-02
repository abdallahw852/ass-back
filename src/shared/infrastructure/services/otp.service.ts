import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OtpService {
  generate(length: number): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return String(randomInt(min, max)).padStart(length, '0');
  }

  async hash(code: string): Promise<string> {
    return bcrypt.hash(code, 10);
  }

  async compare(code: string, hash: string): Promise<boolean> {
    return bcrypt.compare(code, hash);
  }
}
