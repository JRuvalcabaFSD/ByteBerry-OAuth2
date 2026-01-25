import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundRecordError, InvalidUserError } from '@shared';
import { UpgradeToDeveloperUseCase, UserResponseDTO } from '@application';
import { EntityError } from '@domain';

describe('UpgradeToDeveloperUseCase', () => {
	let repository: any;
	let logger: any;
	let useCase: UpgradeToDeveloperUseCase;
	let user: any;

	const userId = 'user-123';

	beforeEach(() => {
		user = {
			upgradeToDeveloper: vi.fn(),
		};
		repository = {
			findById: vi.fn(),
			update: vi.fn(),
		};
		logger = {
			info: vi.fn(),
			warn: vi.fn(),
		};
		useCase = new UpgradeToDeveloperUseCase(repository, logger);
	});

	it('should upgrade user to developer and return UserResponseDTO', async () => {
		repository.findById.mockResolvedValue(user);
		repository.update.mockResolvedValue(undefined);
		user.upgradeToDeveloper.mockImplementation(() => { });
		const dto = { id: userId, role: 'developer' };
		vi.spyOn(UserResponseDTO, 'fromEntity').mockReturnValue(dto as any);

		const result = await useCase.execute(userId);

		expect(logger.info).toHaveBeenCalledWith('Upgrading user to developer', { userId });
		expect(repository.findById).toHaveBeenCalledWith(userId);
		expect(user.upgradeToDeveloper).toHaveBeenCalled();
		expect(repository.update).toHaveBeenCalledWith(user);
		expect(result).toBe(dto);
	});

	it('should throw NotFoundRecordError if user does not exist', async () => {
		repository.findById.mockResolvedValue(null);

		await expect(useCase.execute(userId)).rejects.toThrow(NotFoundRecordError);
		expect(logger.warn).toHaveBeenCalledWith('User not found for developer upgrade', { userId });
	});

	it('should throw InvalidUserError if business rule is violated (EntityError)', async () => {
		repository.findById.mockResolvedValue(user);
		const entityError = new EntityError('Invalid upgrade');
		user.upgradeToDeveloper.mockImplementation(() => { throw entityError; });

		await expect(useCase.execute(userId)).rejects.toThrow(InvalidUserError);
		expect(logger.warn).toHaveBeenCalledWith(
			'Developer upgrade failed - business rule violation',
			{ userId, error: entityError.message }
		);
	});

	it('should rethrow unknown errors from upgradeToDeveloper', async () => {
		repository.findById.mockResolvedValue(user);
		const unknownError = new Error('Unexpected');
		user.upgradeToDeveloper.mockImplementation(() => { throw unknownError; });

		await expect(useCase.execute(userId)).rejects.toThrow(unknownError);
		expect(logger.warn).toHaveBeenCalledWith(
			'Developer upgrade failed - business rule violation',
			{ userId, error: unknownError.message }
		);
	});
});
