/**
 * Utility script to generate RSA key pairs for JWT signing.
 *
 * Usage:
 *   pnpm generate:keys   (o node scripts/generate-keys.js)
 *
 * Output:
 *   - Muestra claves listas para .env
 *   - Crea carpeta ./keys/ en la raíz del proyecto
 *   - Guarda private.pem y public.pem con permisos seguros
 */

import { generateKeyPairSync } from "crypto";
import { promises as fs } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

// Directorio raíz del proyecto (donde se ejecuta el comando)
const rootDir = process.cwd();
const keysDir = join(rootDir, "keys");

console.log("Generating RSA 2048-bit key pair for JWT signing...\n");

try {
	// Generar par de claves
	const { privateKey, publicKey } = generateKeyPairSync("rsa", {
		modulusLength: 2048,
		publicKeyEncoding: { type: "spki", format: "pem" },
		privateKeyEncoding: { type: "pkcs8", format: "pem" },
	});

	// Escapar saltos de línea para .env
	const privateKeyEscaped = privateKey.replace(/\n/g, "\\n");
	const publicKeyEscaped = publicKey.replace(/\n/g, "\\n");

	// Crear carpeta keys/
	await fs.mkdir(keysDir, { recursive: true });

	// Rutas de los archivos
	const privatePath = join(keysDir, "private.pem");
	const publicPath = join(keysDir, "public.pem");

	// Guardar archivos (private con permisos restringidos)
	await fs.writeFile(privatePath, privateKey, { mode: 0o600 });
	await fs.writeFile(publicPath, publicKey);

	// Mostrar resultado en consola
	console.log("Keys generated successfully!\n");

	console.log("Security reminders:");
	console.log("   • Never commit private keys or the keys/ folder");
	console.log("   • Add .env and keys/ to .gitignore");
	console.log("   • Use different keys in production");
	console.log("   • Rotate keys every 30-90 days\n");

	console.log("Keys saved to:");
	console.log(`   - ${privatePath} (KEEP THIS SECRET!)`);
	console.log(`   - ${publicPath} (can be shared)\n"`);

	const gitignorePath = join(rootDir, ".gitignore");
	try {
		const gitignoreContent = await fs.readFile(gitignorePath, "utf8");
		if (!gitignoreContent.includes("keys/")) {
			await fs.appendFile(gitignorePath, "\n# JWT Keys\nkeys/\n");
			console.log("Added 'keys/' to .gitignore");
		}
	} catch (err) {
		if (err.code !== "ENOENT") {
			console.warn("Could not update .gitignore:", err.message);
		}
	}
} catch (error) {
	console.error("Error generating keys:", error.message || error);
	process.exit(1);
}
