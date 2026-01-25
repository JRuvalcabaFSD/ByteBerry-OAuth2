import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundRecordError, InvalidUserError } from '@shared';
import { EnableExpensesUseCase, UserResponseDTO } from '@application';
import { EntityError } from '@domain';

describe('EnableExpensesUseCase', () => {
	let repository: any;
	let logger: any;
	let useCase: EnableExpensesUseCase;
	let user: any;

	beforeEach(() => {
		user = {
			id: 'user-1',
			email: 'test@example.com',
			accountType: 'basic',
			expensesEnabledAt: null,
			enableExpenses: vi.fn(),
		};

		repository = {
			findById: vi.fn(),
			update: vi.fn(),
		};

		logger = {
			info: vi.fn(),
			debug: vi.fn(),
			warn: vi.fn(),
		};

		useCase = new EnableExpensesUseCase(repository, logger);
	});

	it('enables expenses for an existing user', async () => {
		repository.findById.mockResolvedValue(user);
		repository.update.mockResolvedValue(undefined);
		user.enableExpenses.mockImplementation(() => {
			user.expensesEnabledAt = new Date();
		});
		vi.spyOn(UserResponseDTO, 'fromEntity').mockReturnValue({ id: user.id } as any);

		const result = await useCase.execute('user-1');

		expect(repository.findById).toHaveBeenCalledWith('user-1');
		expect(user.enableExpenses).toHaveBeenCalled();
		expect(repository.update).toHaveBeenCalledWith(user);
		expect(logger.info).toHaveBeenCalledWith('[EnableExpensesUseCase.execute] Enabling expenses for user', { userId: 'user-1' });
		expect(logger.info).toHaveBeenCalledWith('[EnableExpensesUseCase.execute] Expenses enabled for user successfully', expect.objectContaining({ userId: user.id }));
		expect(result).toEqual({ id: user.id });
	});

	it('throws NotFoundRecordError if user does not exist', async () => {
		repository.findById.mockResolvedValue(null);

		await expect(useCase.execute('missing-user')).rejects.toThrow(NotFoundRecordError);
		expect(logger.debug).toHaveBeenCalledWith('[EnableExpensesUseCase.execute] User not found for expenses enablement', { userId: 'missing-user' });
	});

	it('throws InvalidUserError if enableExpenses throws EntityError', async () => {
		repository.findById.mockResolvedValue(user);
		const entityError = new EntityError('Business rule violated');
		user.enableExpenses.mockImplementation(() => { throw entityError; });

		await expect(useCase.execute('user-1')).rejects.toThrow(InvalidUserError);
		expect(logger.warn).toHaveBeenCalledWith(
			'[EnableExpensesUseCase.execute] Expenses enablement failed - business rule violation',
			expect.objectContaining({ userId: 'user-1', error: entityError.message })
		);
	});

	it('rethrows unexpected errors from enableExpenses', async () => {
		repository.findById.mockResolvedValue(user);
		const genericError = new Error('Unexpected');
		user.enableExpenses.mockImplementation(() => { throw genericError; });

		await expect(useCase.execute('user-1')).rejects.toThrow(genericError);
		expect(logger.warn).toHaveBeenCalledWith(
			'[EnableExpensesUseCase.execute] Expenses enablement failed - business rule violation',
			expect.objectContaining({ userId: 'user-1', error: genericError.message })
		);
	});
});
