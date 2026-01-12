import { ClientEntity } from '@domain';
import { OAuthClient } from '@prisma/client';

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
	public static toDomain(register: OAuthClient): ClientEntity {
		return ClientEntity.create({ ...register });
	}
}
