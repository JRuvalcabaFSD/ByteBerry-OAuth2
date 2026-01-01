/* eslint-disable no-console */
import dotenv from 'dotenv';
import { getErrMessage } from '@shared';
import { bootstrapContainer } from './container/bootstrap.container.js';

(() => {
	main().catch((error) => {
		console.error(getErrMessage(error));
		process.exit(1);
	});
})();

async function main() {
	dotenv.config({ override: false });
	const container = bootstrapContainer();

	const config = container.resolve('Config');

	console.log({ config });
}
