import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { LogoutCommand } from '../logout.command';

type SessionLike = {
  destroy?: (callback: (error?: Error) => void) => void;
};

@CommandHandler(LogoutCommand)
export class LogoutHandler implements ICommandHandler<LogoutCommand, void> {
  async execute(command: LogoutCommand): Promise<void> {
    const session = command.session as SessionLike;
    if (typeof session.destroy === 'function') {
      await new Promise<void>((resolve, reject) => {
        session.destroy?.((error?: Error) =>
          error ? reject(error) : resolve(),
        );
      });
    }
  }
}
