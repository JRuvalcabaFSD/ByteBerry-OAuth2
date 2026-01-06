import { CodeChallengeVO } from '@domain';
import { Injectable, LogContextClass, LogContextMethod } from '@shared';
import type { IHashService, ILogger, IPkceVerifierUseCase } from '@interfaces';

/**
 * Use case for verifying PKCE (Proof Key for Code Exchange) code challenges.
 *
 * This use case handles the verification of code verifiers against their corresponding
 * code challenges, supporting both plain and SHA256 challenge methods as defined in
 * RFC 7636.
 *
 * @remarks
 * The verification process supports two methods:
 * - Plain: Direct string comparison between verifier and challenge
 * - SHA256: Hashed comparison where the verifier is hashed and compared to the challenge
 *
 * @example
 * ```typescript
 * const pkceVerifier = new PkceVerifierUseCase(hashService, logger);
 * const isValid = pkceVerifier.verify(codeChallenge, codeVerifier);
 * ```
 */

@LogContextClass()
@Injectable({ name: 'PkceVerifierUseCase', depends: ['HashService', 'Logger'] })
export class PkceVerifierUseCase implements IPkceVerifierUseCase {
	constructor(
		private readonly hashService: IHashService,
		private readonly logger: ILogger
	) {}

	/**
	 * Verifies a PKCE (Proof Key for Code Exchange) code verifier against a code challenge.
	 *
	 * This method supports two verification methods:
	 * - Plain: Direct string comparison between the verifier and challenge
	 * - S256: SHA-256 hash verification of the verifier against the challenge
	 *
	 * @param challenge - The code challenge value object containing the challenge string and method
	 * @param verifier - The code verifier string to be validated against the challenge
	 * @returns `true` if the verifier matches the challenge using the specified method, `false` otherwise
	 *
	 * @remarks
	 * The method logs debug information at the start of verification and warns when verification fails.
	 * The verification method is determined by the challenge object's method property.
	 */

	@LogContextMethod()
	public verify(challenge: CodeChallengeVO, verifier: string): boolean {
		this.logger.debug('PKCE verification start', {
			methods: challenge.getMethod(),
			challengeValue: challenge.getChallenge(),
			verifierLength: verifier.length,
		});

		// Verificación plana
		if (challenge.isPlainMethod()) return challenge.verifyPlain(verifier);

		// Verificación Sha256
		const result = this.hashService.verifySha256(verifier, challenge.getChallenge());

		if (!result) {
			this.logger.warn('PKCE verification failed - Hash mismatch');
		}

		return result;
	}
}
