import { ClientEntity } from '@domain';
import { OAuthClient } from '@prisma/client';

/**
 * Mapper class for converting between OAuth client domain entities and Prisma database records.
 * Provides static methods to transform data structures for seamless integration between
 * the domain layer and the persistence layer.
 */

export class clientMapper {
	/**
	 * Converts a Prisma OAuthClient record to a ClientEntity domain object.
	 * Handles optional fields like systemRole by defaulting to undefined if null.
	 * @param record - The OAuthClient record from the database.
	 * @returns A new ClientEntity instance populated with the record's data.
	 */

	public static toDomain(record: OAuthClient): ClientEntity {
		return ClientEntity.create({ ...record, systemRole: record.systemRole ?? undefined });
	}

	/**
	 * Converts a ClientEntity domain object to a Prisma-compatible OAuthClient record.
	 * Excludes sensitive or deprecated fields like 'clientSecretOld' and 'secretExpiresAt'.
	 * @param entity - The ClientEntity to convert.
	 * @returns An object representing the OAuthClient record, omitting excluded fields.
	 */

	public static toPrisma(entity: ClientEntity): Omit<OAuthClient, 'clientSecretOld' | 'secretExpiresAt'> {
		return {
			id: entity.id,
			clientId: entity.clientId,
			clientSecret: entity.clientSecret,
			clientName: entity.clientName,
			redirectUris: entity.redirectUris,
			grantTypes: entity.grantTypes,
			isPublic: entity.isPublic,
			isActive: entity.isActive,
			isSystemClient: entity.isSystemClient,
			systemRole: entity.systemRole ?? null,
			userId: entity.userId,
			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
		};
	}
}
