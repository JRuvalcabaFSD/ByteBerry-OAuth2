import { ConsentEntity } from "@domain";

describe('ConsentEntity', () => {
	const mockConsentData = {
		id: '123',
		userId: 'user-456',
		clientId: 'client-789',
		scopes: ['read:profile', 'write:data'],
		grantedAt: new Date('2024-01-01'),
		expiresAt: new Date(Date.now() + 3600000),
		revokedAt: null,
	};

	describe('create', () => {
		it('should create a ConsentEntity instance', () => {
			const consent = ConsentEntity.create(mockConsentData);
			expect(consent).toBeInstanceOf(ConsentEntity);
		});

		it('should assign all properties from data', () => {
			const consent = ConsentEntity.create(mockConsentData);
			expect(consent.id).toBe(mockConsentData.id);
			expect(consent.userId).toBe(mockConsentData.userId);
			expect(consent.clientId).toBe(mockConsentData.clientId);
			expect(consent.scopes).toEqual(mockConsentData.scopes);
		});
	});

	describe('isRevoked', () => {
		it('should return false when revokedAt is null', () => {
			const consent = ConsentEntity.create(mockConsentData);
			expect(consent.isRevoked()).toBe(false);
		});

		it('should return true when revokedAt is set', () => {
			const consent = ConsentEntity.create({
				...mockConsentData,
				revokedAt: new Date(),
			});
			expect(consent.isRevoked()).toBe(true);
		});
	});

	describe('isExpired', () => {
		it('should return false when expiresAt is null', () => {
			const consent = ConsentEntity.create({
				...mockConsentData,
				expiresAt: null,
			});
			expect(consent.isExpired()).toBe(false);
		});

		it('should return false when current date is before expiration', () => {
			const consent = ConsentEntity.create(mockConsentData);
			expect(consent.isExpired()).toBe(false);
		});

		it('should return true when current date is after expiration', () => {
			const consent = ConsentEntity.create({
				...mockConsentData,
				expiresAt: new Date(Date.now() - 1000),
			});
			expect(consent.isExpired()).toBe(true);
		});
	});

	describe('isActive', () => {
		it('should return true when not revoked and not expired', () => {
			const consent = ConsentEntity.create(mockConsentData);
			expect(consent.isActive()).toBe(true);
		});

		it('should return false when revoked', () => {
			const consent = ConsentEntity.create({
				...mockConsentData,
				revokedAt: new Date(),
			});
			expect(consent.isActive()).toBe(false);
		});

		it('should return false when expired', () => {
			const consent = ConsentEntity.create({
				...mockConsentData,
				expiresAt: new Date(Date.now() - 1000),
			});
			expect(consent.isActive()).toBe(false);
		});
	});

	describe('hasScope', () => {
		it('should return true when scope exists', () => {
			const consent = ConsentEntity.create(mockConsentData);
			expect(consent.hasScope('read:profile')).toBe(true);
		});

		it('should return false when scope does not exist', () => {
			const consent = ConsentEntity.create(mockConsentData);
			expect(consent.hasScope('admin:all')).toBe(false);
		});
	});

	describe('hasAllScopes', () => {
		it('should return true when all requested scopes exist', () => {
			const consent = ConsentEntity.create(mockConsentData);
			expect(consent.hasAllScopes(['read:profile', 'write:data'])).toBe(true);
		});

		it('should return true when requesting empty array', () => {
			const consent = ConsentEntity.create(mockConsentData);
			expect(consent.hasAllScopes([])).toBe(true);
		});

		it('should return false when some requested scopes do not exist', () => {
			const consent = ConsentEntity.create(mockConsentData);
			expect(consent.hasAllScopes(['read:profile', 'admin:all'])).toBe(false);
		});
	});

	describe('toObject', () => {
		it('should return object with all required fields', () => {
			const consent = ConsentEntity.create(mockConsentData);
			const obj = consent.toObject();
			expect(obj.id).toBe(mockConsentData.id);
			expect(obj.userId).toBe(mockConsentData.userId);
			expect(obj.clientId).toBe(mockConsentData.clientId);
			expect(obj.scopes).toEqual(mockConsentData.scopes);
			expect(obj.grantedAt).toBe(mockConsentData.grantedAt);
		});

		it('should include expiresAt when set', () => {
			const consent = ConsentEntity.create(mockConsentData);
			const obj = consent.toObject();
			expect(obj.expiresAt).toBe(mockConsentData.expiresAt);
		});

		it('should not include expiresAt when null', () => {
			const consent = ConsentEntity.create({
				...mockConsentData,
				expiresAt: null,
			});
			const obj = consent.toObject();
			expect(obj.expiresAt).toBeUndefined();
		});

		it('should include revokedAt when set', () => {
			const revokedDate = new Date();
			const consent = ConsentEntity.create({
				...mockConsentData,
				revokedAt: revokedDate,
			});
			const obj = consent.toObject();
			expect(obj.revokedAt).toBe(revokedDate);
		});

		it('should not include revokedAt when null', () => {
			const consent = ConsentEntity.create(mockConsentData);
			const obj = consent.toObject();
			expect(obj.revokedAt).toBeUndefined();
		});
	});
});
