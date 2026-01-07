import { ClientEntity } from '@domain';
import { IClientRepository } from '@interfaces';
import { Injectable } from '@shared';

const MOCK_CLIENTS = [
	ClientEntity.create({
		id: '6c81a0e4-c1c0-4fe5-8704-8dcd8e43e608',
		clientId: 'postman-123',
		clientSecret: 'super-secret',
		clientName: 'My Awesome App',
		redirectUris: ['http://localhost:5173/callback', 'https://myapp.com/callback'],
		grantTypes: ['authorization_code', 'refresh_token'],
		isPublic: false,
		isActive: false,
		userId: 'user_mock_demo_003',
	}),
	ClientEntity.create({
		id: '88c49124-8e8a-4391-8489-ae5576ac8722',
		clientId: 'postman-1234',
		clientSecret: 'dddd',
		clientName: 'PKCE Mobile App',
		redirectUris: ['myapp://callback'],
		grantTypes: ['authorization_code'],
		isPublic: true,
		isActive: false,
		userId: 'user_mock_demo_003',
	}),
];

@Injectable({ name: 'ClientRepository' })
export class InMemoryClientRepository implements IClientRepository {
	public async findByClientId(clientId: string): Promise<ClientEntity | null> {
		return MOCK_CLIENTS.find((c) => c.clientId === clientId) ?? null;
	}
	public async findById(_Id: string): Promise<ClientEntity | null> {
		throw new Error('Method not implemented.');
	}
	public async findByUserId(_userId: string): Promise<ClientEntity[]> {
		throw new Error('Method not implemented.');
	}
	public async findAllByUserId(_userId: string): Promise<ClientEntity[]> {
		throw new Error('Method not implemented.');
	}
	public async save(_client: ClientEntity): Promise<void> {
		throw new Error('Method not implemented.');
	}
	public async update(_client: ClientEntity): Promise<void> {
		throw new Error('Method not implemented.');
	}
	public async softDelete(_id: string): Promise<void> {
		throw new Error('Method not implemented.');
	}
	public async existByClientId(_clientId: string): Promise<boolean> {
		throw new Error('Method not implemented.');
	}
}
