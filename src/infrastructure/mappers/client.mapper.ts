import { ClientEntity, ClientIdVO, ClientTypeVO, UserIdVO } from '@domain';
import { ClientType, OAuthClient, PrismaClient } from '@prisma/client';

/**
 * Mapper for converting OAuthClient objects to ClientEntity domain objects.
 * Provides data transformation between the infrastructure and domain layers.
 *
 * @method toDomain - Converts an OAuthClient to a ClientEntity.
 * @param {OAuthClient} register - The OAuthClient object to be converted.
 * @returns {ClientEntity} - The resulting ClientEntity object.
 *
 * @example
 * const oauthClient: OAuthClient = await prisma.oAuthClient.findUnique({ where: { clientId } });
 * const clientEntity: ClientEntity = clientMapper.toDomain(oauthClient);
 *
 */
export class clientMapper {
	public static toDomain(record: OAuthClient): ClientEntity {
		const clientType = record.client_type === 'SYSTEM' ? ClientTypeVO.system() : ClientTypeVO.thirdParty();

		return ClientEntity.fromPersistence({
			id: record.id,
			name: record.name,
			scopes: record.scopes,
			clientId: ClientIdVO.create(record.client_id),
			clientSecretHash: record.client_secret_hash,
			clientType,
			ownerUserId: record.owner_user_id ? UserIdVO.create(record.owner_user_id) : null,
			isDeletable: record.is_deletable,
			redirectUris: record.redirect_uris,
			grantTypes: record.grant_types,
			createdAt: record.created_at,
			updatedAt: record.updated_at,
		});
	}

	public static toEntity(client: ClientEntity): OAuthClient {
		const clientType = client.clientType.isSystem() ? ClientType.SYSTEM : ClientType.THIRD_PARTY;

		const now = new Date();

		return {
			id: client.id ?? '',
			client_id: client.clientId.getValue(),
			client_secret_hash: client.clientSecretHash,
			client_type: clientType,
			owner_user_id: client.ownerUserId ? client.ownerUserId.getValue() : null,
			is_deletable: client.isDeletable,
			name: client.name,
			redirect_uris: client.redirectUris,
			grant_types: client.grantTypes, // Corrige aquí
			scopes: client.scopes,
			created_at: client.isPersisted() ? client.createdAt : now,
			updated_at: now,
			deleted_at: client.deletedAt ?? null,
		};
	}
}
