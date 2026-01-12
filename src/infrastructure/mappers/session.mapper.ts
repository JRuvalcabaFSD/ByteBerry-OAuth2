import { Session } from '@prisma/client';

import { SessionEntity } from '@domain';

/**
 * Maps session data from the persistence model to the domain entity.
 *
 * @remarks
 * The `SessionMapper` class provides static methods to convert between
 * the persistence model (`Session`) and the domain model (`SessionEntity`).
 *
 * @example
 * ```typescript
 * const sessionEntity = SessionMapper.toDomain(session);
 * ```
 */

export class SessionMapper {
	public static toDomain(register: Session): SessionEntity {
		return SessionEntity.create({
			...register,
			metadata: (register.metadata as Record<string, unknown>) ?? {},
		});
	}
}
