import { CodeEntity } from '@domain';
import { ICodeRepository } from '@interfaces';
import { Injectable } from '@shared';

@Injectable({ name: 'CodeRepository' })
export class InMemoryAuthCodeRepository implements ICodeRepository {
	private readonly store = new Map<string, CodeEntity>();

	public async save(code: CodeEntity): Promise<void> {
		// code.markAsUsed();
		this.store.set(code.code, code);
	}
	public async findByCode(code: string): Promise<CodeEntity | null> {
		return this.store.get(code) ?? null;
	}
	public async cleanup(): Promise<void> {
		for (const [code, _authCode] of this.store.entries()) {
			this.store.delete(code);
		}
	}
}
