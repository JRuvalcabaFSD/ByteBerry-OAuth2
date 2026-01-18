import * as DomainErrors from '@domain';
import { ClientIdVO, ClientTypeVO, UserIdVO } from '@domain';

/**
 * Represents the data structure for an OAuth2 client entity.
 *
 * @property {string | null} id - The unique identifier of the client entity, or null if not set.
 * @property {ClientIdVO} clientId - The value object representing the client ID.
 * @property {string} clientSecretHash - The hashed secret associated with the client.
 * @property {ClientTypeVO} clientType - The value object representing the type of the client.
 * @property {UserIdVO | null} ownerUserId - The value object representing the owner's user ID, or null if not assigned.
 * @property {boolean} isDeletable - Indicates whether the client can be deleted.
 * @property {string} name - The display name of the client.
 * @property {string[]} redirectUris - The list of allowed redirect URIs for the client.
 * @property {string[]} grantTypes - The list of OAuth2 grant types supported by the client.
 * @property {string[]} scopes - The list of scopes assigned to the client.
 * @property {Date} createdAt - The date and time when the client was created.
 * @property {Date} updatedAt - The date and time when the client was last updated.
 * @property {Date | null} [deletedAt] - The date and time when the client was deleted, or null if not deleted.
 */

interface ClientIdData {
	id: string | null;
	clientId: ClientIdVO;
	clientSecretHash: string;
	clientType: ClientTypeVO;
	ownerUserId: UserIdVO | null;
	isDeletable: boolean;
	name: string;
	redirectUris: string[];
	grantTypes: string[];
	scopes: string[];
	createdAt: Date;
	updatedAt: Date;
	deletedAt?: Date | null;
}

/**
 * Represents the persistence model for a client entity.
 *
 * This interface extends all properties from `ClientIdData` except for the `id` property,
 * and then redefines the `id` property as a string. This is typically used for database
 * storage or retrieval where the `id` is required to be a string type.
 *
 * @see ClientIdData
 */

interface ClientPersistence extends Omit<ClientIdData, 'id'> {
	id: string;
}

/**
 * Represents the data required to update an OAuth2 client entity.
 * All properties are optional, allowing for partial updates.
 *
 * @property name - The new name of the client.
 * @property redirectUris - The updated list of allowed redirect URIs.
 * @property grantTypes - The updated list of OAuth2 grant types supported by the client.
 * @property scopes - The updated list of scopes assigned to the client.
 */

interface ClientUpdateData {
	name?: string;
	redirectUris?: string[];
	grantTypes?: string[];
	scopes?: string[];
}

/**
 * Represents the parameters required to create or update a Client entity,
 * excluding the fields: 'id', 'clientType', 'isDeletable', 'createdAt', 'updatedAt', and 'deletedAt'.
 * Derived from the ClientIdData type.
 */

type ClientParams = Omit<ClientIdData, 'id' | 'clientType' | 'isDeletable' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

/**
 * Represents an OAuth2 client entity within the domain.
 *
 * The `ClientEntity` encapsulates all properties and behaviors of a client, including its identity, type,
 * ownership, security credentials, and lifecycle management (creation, update, deletion).
 *
 * Clients can be of type 'System' or 'ThirdParty', each with different rules for ownership and mutability.
 *
 * ### Properties
 * - `id`: Unique identifier for the client (nullable until persisted).
 * - `clientId`: Value object representing the client identifier.
 * - `clientSecretHash`: Hashed secret for client authentication.
 * - `clientType`: Value object indicating the client type (System or ThirdParty).
 * - `ownerUserId`: Value object for the owner's user ID (nullable for system clients).
 * - `isDeletable`: Indicates if the client can be deleted.
 * - `name`: Human-readable name of the client.
 * - `redirectUris`: List of allowed redirect URIs.
 * - `grantTypes`: List of supported OAuth2 grant types.
 * - `scopes`: List of allowed scopes.
 * - `createdAt`: Timestamp of creation.
 * - `updatedAt`: Timestamp of last update.
 * - `deletedAt`: Timestamp of deletion (nullable).
 *
 * ### Methods
 * - `create`: Factory method to create a new client entity.
 * - `fromPersistence`: Factory method to instantiate from persistence layer data.
 * - `getId`, `getIdOrNull`, `isPersisted`, `assignId`: ID management utilities.
 * - `isSystemClient`, `isThirdPartyClient`: Type checks.
 * - `canBeDeleted`, `canBeModified`: Permission checks.
 * - `isOwnedBy`: Checks if the client is owned by a specific user.
 * - `update`: Updates mutable client properties.
 * - `markAsDeleted`: Marks the client as deleted.
 * - `idDeleted`: Checks if the client is marked as deleted.
 *
 * ### Validation
 * Enforces invariants such as:
 * - System clients cannot have owners and are not deletable.
 * - Third-party clients must have owners and are deletable.
 * - Clients must have at least one redirect URI, grant type, and scope.
 *
 * @remarks
 * Throws domain-specific errors for invalid state transitions or property assignments.
 */

export class ClientEntity {
	public id!: string | null;
	public readonly clientId!: ClientIdVO;
	public readonly clientSecretHash!: string;
	public readonly clientType!: ClientTypeVO;
	public readonly ownerUserId!: UserIdVO | null;
	public readonly isDeletable!: boolean;
	public name!: string;
	public redirectUris!: string[];
	public grantTypes!: string[];
	public scopes!: string[];
	public readonly createdAt!: Date;
	public updatedAt!: Date;
	public deletedAt?: Date | null = null;

	private constructor(data: ClientIdData) {
		Object.assign(this, data);
		this.validate();
	}

	public static create(props: ClientParams, type: 'System' | 'ThirdParty'): ClientEntity {
		if (!props.ownerUserId) throw new DomainErrors.InvalidThirdPartyClientOwnershipError();

		if (type === 'System')
			return new ClientEntity({
				...props,
				id: null,
				clientType: ClientTypeVO.system(),
				ownerUserId: null,
				isDeletable: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

		if (type === 'ThirdParty')
			return new ClientEntity({
				...props,
				id: null,
				clientType: ClientTypeVO.thirdParty(),
				isDeletable: true,
				name: props.name,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

		throw new DomainErrors.ClientEntityCreateError(
			"Error creating the client, only clients of type: 'System' or 'ThirdParty' can be created"
		);
	}

	public static fromPersistence(props: ClientPersistence): ClientEntity {
		return new ClientEntity({ ...props });
	}

	public getId(): string {
		if (this.id === null)
			throw new DomainErrors.ClientPersistenceError(
				'Client has not been persisted yet.',
				'Save the client to the repository first to get an ID.'
			);
		return this.id;
	}

	public getIdOrNull(): string | null {
		return this.id;
	}

	public isPersisted(): boolean {
		return this.id !== null;
	}

	public assignId(id: string): void {
		if (this.id !== null) throw new DomainErrors.ClientPersistenceError(`Cannot reassign ID. Entity already persisted with ID: ${this.id}`);

		if (!id || id.trim().length === 0) throw new DomainErrors.ClientEntityCreateError('Id cannot be empty');
		this.id = id;
	}

	public isSystemClient(): boolean {
		return this.clientType.isSystem();
	}

	public isThirdPartyClient(): boolean {
		return this.clientType.isThirdParty();
	}

	public canBeDeleted(): boolean {
		return this.isDeletable;
	}

	public canBeModified(): boolean {
		return this.isThirdPartyClient();
	}

	public isOwnedBy(userId: UserIdVO): boolean {
		if (!this.ownerUserId) return false;
		return this.ownerUserId.equals(userId);
	}

	public update(props: ClientUpdateData): void {
		if (!this.canBeModified()) throw new DomainErrors.SystemClientCannotBeModifiedError(this.clientId.getValue());

		if (props.name !== undefined) this.name = props.name;
		if (props.redirectUris !== undefined) this.redirectUris = props.redirectUris;
		if (props.grantTypes !== undefined) this.grantTypes = props.grantTypes;
		if (props.scopes !== undefined) this.scopes = props.scopes;

		this.updatedAt = new Date();
	}

	public markAsDeleted(): void {
		if (!this.canBeDeleted()) throw new DomainErrors.ClientNotDeletableError(this.clientId.getValue());

		this.deletedAt = new Date();
	}

	public idDeleted(): boolean {
		return this.deletedAt !== null;
	}

	private validate(): void {
		if (this.clientType.isSystem() && this.ownerUserId !== null) throw new DomainErrors.InvalidSystemClientOwnershipError();
		if (this.clientType.isThirdParty() && this.ownerUserId === null) throw new DomainErrors.InvalidThirdPartyClientOwnershipError();
		if (this.clientType.isSystem() && this.isDeletable)
			throw new DomainErrors.ClientEntityCreateError('System clients must have isDeletable=false');
		if (this.clientType.isThirdParty() && !this.isDeletable)
			throw new DomainErrors.ClientEntityCreateError(
				'System clients must have isDeletable=falseThird-party clients must have isDeletable=true'
			);
		if (!this.redirectUris || this.redirectUris.length === 0)
			throw new DomainErrors.ClientEntityCreateError('Client must have at least one redirect URI');
		if (!this.grantTypes || this.grantTypes.length === 0)
			throw new DomainErrors.ClientEntityCreateError('Client must have at least one grant type');
		if (!this.scopes || this.scopes.length === 0) throw new DomainErrors.ClientEntityCreateError('Client must have at least one scope');
	}
}
