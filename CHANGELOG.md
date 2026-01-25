# [1.4.0](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/compare/v1.3.0...v1.4.0) (2026-01-25)


### Features

* add account type handling in user registration process ([15a42f5](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/15a42f55cf20a8afc398f0963832ff2c0f9f17b5)), closes [#54](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/54)
* add AccountType enum and enhance UserEntity with developer and expenses features ([10362b9](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/10362b9103d30d25a92f6e6e80be64b9d0270a78)), closes [#52](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/52)
* add developer credentials to login view and implement account type flows ([1beb960](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/1beb9606e5605067d74066917d9e4739bd475f30)), closes [#63](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/63) [#64](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/64) [#65](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/65)
* add developer middleware to restrict access to developer routes ([d8bdcbf](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/d8bdcbff1df4926c21bf0fa211667f178cef9274)), closes [#58](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/58)
* add enable expenses use case and update related interfaces and schemas ([20b3f8e](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/20b3f8e422fe7627144c80c8d30cce7adbf76467)), closes [#57](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/57)
* add routes for upgrading to developer and enabling expenses in UserController ([694ff9f](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/694ff9f008fd9aeca72751cd4f4d227b5e0c5f90)), closes [#60](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/60)
* add upgrade to developer and enable expenses methods in UserController ([1098c72](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/1098c72f52f5c11d11d75d1959e43d0241b1ed06))
* add upgrade to developer use case and refactor error handling for invalid user ([a754c78](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/a754c78cc66beab29f5a9ea96f15633ef0067f19)), closes [#56](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/56)
* **prisma:** add account type enum and extend user model with new fields ([14a78a9](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/14a78a9f102a8705039815c6611622dc951f6b22)), closes [#50](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/50)
* **prisma:** remove accountType from User model and add indexes for isDeveloper and canUseExpenses ([a12b0d8](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/a12b0d8930e15df3f2003fd023f7bca049b8a7ce))
* refactor save and update methods to explicitly define user fields in Prisma operations ([ff66677](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/ff66677daa5412d6551fee8e2eea4449936060c1)), closes [#55](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/55)
* rename middleware function and integrate it into AppRouter for developer access ([7305a15](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/7305a1563760a5fdbf8f17547cac8b7f7996e60e)), closes [#61](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/61) [#62](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/62)
* update lodash and lodash-es to version 4.17.23 in pnpm-lock.yaml ([58e57f8](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/58e57f8bd28727b23e0034dabdf98b045492ae0b))
* update User interface and UserEntity to include account type and related properties ([65eadb2](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/65eadb214b476a51fb9bc08a5cbc853715356755)), closes [#53](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/53)

# [1.3.0](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/compare/v1.2.0...v1.3.0) (2026-01-19)


### Features

* add BFF_CLIENT_SECRET environment variable to CI workflows ([c563a32](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/c563a3285d7933508e44cf5cfa5574b2fbc010de))
* add support for system clients and roles in the OAuthClient model ([d641b27](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/d641b2732cf7f41a9355719ca3dcab6f6f39c257))
* agregar carpeta /docs al .gitignore y actualizar el título en README.md ([dccb869](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/dccb869b6012afa986cd60b2ee8b966b711decee))
* agregar soporte para keyId en el servicio JWT y actualizar configuración de Docker ([bca7f03](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/bca7f03e5586c30e51dea2c53d014c509a332543))
* make userId optional for system clients and add configuration for the BFF client ([1f2ecbc](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/1f2ecbc91d74791d0a7044a5f227ebf1cc537333))
* **test:** add code authorization flow for system clients and integration testing ([8ed0483](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/8ed048319103134ed34e327513aae7f9998cdd20))
* update dependency versions in pnpm-lock and pnpm-workspace ([0af62db](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/0af62db6d3a0a7bebf6115bc548db3c5efb7362d))
* update Docker image tag to latest and improve shutdown configuration with DBConfig ([a214951](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/a2149513e9673e5f00a42dc5f7d9cdfee16b8250))
* update documentation and logic in the consent and authorization flow ([d45da16](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/d45da16ff1575af152940adc2ca2f018d62d7e86))

# [1.2.0](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/compare/v1.1.0...v1.2.0) (2026-01-12)


### Features

* **ci:** update test commands to run all tests with coverage in CI workflows ([98b55bf](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/98b55bf5269230ebb305cd53b438820094f99b8a))
* **client:** Implement delete client functionality with use case, controller method, and routes ([b75ff1b](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/b75ff1b32842b901bbe90fc0138a679e6977474d)), closes [#35](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/35)
* **client:** Implement get client by ID functionality with use case and controller method ([9304449](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/9304449b5f11eeab8a7408c3583bac5b36e27574)), closes [#33](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/33)
* **client:** Implement list clients functionality with DTO and use case ([6b023c7](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/6b023c7d944d901bd4584bb480e4b45425ff124c)), closes [#32](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/32)
* **client:** Implement OAuth2 client management with creation and validation ([05991e5](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/05991e5843db5f384eaa8a4876d815639ca76783)), closes [#31](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/31)
* **client:** Implement rotate client secret functionality with use case, controller method, and routes ([c76b30e](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/c76b30e0cc44777527029ee5e14d62cf278b52be)), closes [#36](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/36)
* **client:** Implement update client functionality with DTO, use case, and controller method ([6d53aa3](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/6d53aa38cee486b3b226547316bb47e0fc8f4905)), closes [#34](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/34)
* **consent:** Implement consent decision processing and related DTOs, update routes and middleware ([60ffddc](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/60ffddc17c3718ce9fe964a814a8c4e34534ca93)), closes [#39](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/39)
* **consent:** Implement consent management with repository, entity, and use case for user consent validation ([bdff66c](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/bdff66cf7d362bcd80776da16038c74bca4fd18c)), closes [#37](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/37)
* **consent:** Implement consent screen with display logic, use case, and view template ([6c10f84](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/6c10f848696cef745557a9ee82a4e7e50c810efd)), closes [#38](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/38)
* **consent:** Implement delete consent use case, repository method, and controller integration ([890ce88](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/890ce883680c2e73dfbad0c199307d2638858c13)), closes [#41](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/41)
* **consent:** Implement list consents use case, DTOs, and controller integration ([a63aa0b](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/a63aa0bd0eca78f4b4f6053f0b179bb2dbc87b11)), closes [#40](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/40)
* **database:** add PostgreSQL configuration and DBConfig class for database management ([85d7309](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/85d7309ef6669ac8208e6b0742a15270beacbc04))
* **database:** add PostgreSQL configuration and initial migration for user management ([772bd64](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/772bd64efe3d45dbbd0d94a827f654ab5757829d)), closes [#21](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/21)
* **health:** implement database health checker service and integrate into health service ([f05eb26](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/f05eb26d3ab2469e084dcbb0106177b9f6a951b4)), closes [#46](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/46) [#47](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/47)
* **seed:** add seed script for users, OAuth client, and scope definitions ([a1049a9](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/a1049a94b03526abfb6f08e68ead94fb10173ecc)), closes [#24](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/24)
* **test:** add integration tests for SessionRepository and UserRepository ([b8ebfce](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/b8ebfcebee34d3d5c6c320fa431db1b1323423a5)), closes [#45](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/45)
* **test:** add unit tests for use cases: ListClient, ListConsent, ProcessConsent, RegisterUser, RotateSecret, ShowConsent, UpdateClient, UpdatePassword, and UpdateUser ([15022ce](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/15022ce4fb436d2c056c61293b47173edcc0348e))
* **tests:** add integration tests for consent management, OAuth2 flow, and password change flow ([9365b8a](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/9365b8abebc70c888d7a48659606d089dea1d978))
* **tests:** add unit tests for DatabaseHealthService and improve health checks in HealthService ([e1be8d5](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/e1be8d5457584b22f4bd35d39a372ea6fea0f93e))
* **tests:** enhance integration testing setup and add ConsentRepository tests ([12f566f](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/12f566fb37a0cbff5dc4b40eccf4eca55571ce6d))
* **tests:** remove dotenv configuration from integration tests and disable file parallelism in unit tests ([119b51e](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/119b51e4385bfe7537cef78d970979cdd250bb5d))
* **user:** - Added UpdatePassword use case to handle password updates with session revocation option. ([1510504](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/151050455f2e625203c434c6503b59e9f4791bf2)), closes [#30](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/30)
* **user:** add get user use case and controller method for retrieving user information ([c8e0e8e](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/c8e0e8e790ce4ccda0426e2bfd1a34acf8a86917)), closes [#28](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/28)
* **user:** implement update user functionality with DTOs, use cases, and routes ([77409c5](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/77409c5d2238d266a857c34b6281aba4362c1b48)), closes [#29](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/29)
* **user:** implement user registration functionality with DTOs, use cases, and routes ([0d5b970](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/0d5b970019e30bacbe81ba27132d85ca2d1345d1)), closes [#26](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/26)

# [1.1.0](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/compare/v1.0.0...v1.1.0) (2026-01-07)


### Features

* **auth:** implement login use case with DTOs, validation schemas, and controller integration ([d09774e](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/d09774e2b44de90d886ea66cc758c2468b1af666)), closes [#10](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/10)
* **ci:** add JWT key generation step to CI workflows and improve health service checks ([b35d6d1](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/b35d6d182794155f76766b0f468a40f86b016979)), closes [#17](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/17) [#18](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/18)
* **client:** implement client validation use case, DTOs, and in-memory repository ([8198e6a](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/8198e6a6a838fa56daed61a3a48b38293119d583))
* **docker:** update Dockerfile to include public and views directories, and enhance entrypoint script ([2bbbcf4](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/2bbbcf4ab48b7c951b78cf34100aa1526269aca0))
* **health:** integrate JWKS service into health checks and enhance logging ([7fb5862](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/7fb58625e04cd726c9027c4f1202f2fa317f82dc)), closes [#16](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/16)
* Implement OAuth2 authorization code flow with PKCE support ([3dfe995](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/3dfe995ea3f7cb727ad4dc7f12fe6a9b5a64cf18)), closes [#11](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/11)
* implement OAuth2 authorization code management with value objects and in-memory repository ([eb83eed](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/eb83eed989b5e7ff75b4c1ab35fc15f38123e398)), closes [#9](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/9)
* implement user entity and repository with in-memory mock data ([79b7ea3](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/79b7ea34d836ae68e24b3b2419b19a9d1d304a16))
* **jwks:** Implement JWKS service, use case, and controller for JWT verification ([249ab94](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/249ab9425e8fc97abe61f3ed3400944736907367)), closes [#13](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/13)
* **login:** implement login functionality with controller and routes, add login view and styles ([0c7f001](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/0c7f001447cf9288af4769139bcf2b35737983e4))
* **oauth:** Implement OAuth2 Token Exchange and PKCE Verification ([cd43b07](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/cd43b07a0adf6e83747dd25f02327f59bc37629f)), closes [#12](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/12)
* **session:** add session management with in-memory repository and configuration updates ([03c659b](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/03c659bd636a712d5240cdc8ff1427c3d7007909))
* **tests:** add unit tests for JWKS and JWT services, use cases, and PKCE verifier ([bb226fb](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/bb226fb1f6adcb15111a431dedc419aae9c9f024))

# 1.0.0 (2026-01-02)


### Bug Fixes

* **deps:** update tmp package version to ensure compatibility ([e261b6c](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/e261b6cc404c00a15ebc4429f413b15dfecc00c8))


### Features

* **bootstrap:** implement bootstrap process with graceful shutdown and error handling ([f55bc12](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/f55bc121fc7e79754aab4420fccdc5cf4358f4d8))
* **ci-cd:** add pull request template and CI workflow configuration ([6db241e](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/6db241e5ac9bc09363522f75581be0dfdec25d76)), closes [#6](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/6)
* **ci:** add release and sync workflows for automated versioning and branch synchronization ([873413d](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/873413d6fe338e1ce93b745775df77c292c0436a)), closes [#7](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/7) [#8](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/8)
* **config:** implement configuration management and error handling; add environment variables setup ([2eec5b5](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/2eec5b5272f74b6941e503580180c8ba29c30409)), closes [#1](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/1)
* **container:** implement dependency injection container with service registration and resolution ([22aeecc](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/22aeecce7e22f4cc48295c58f964cb9b0973593a)), closes [#2](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/2)
* **docker:** add multi-stage Dockerfile and build scripts for multi-arch support ([1397a7c](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/1397a7ca9b17e15db841b42149d0a6becc39b416)), closes [#4](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/4)
* **errors:** implement centralized error handling with detailed logging ([de59813](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/de59813ec9fdd95b626e573fa97d484c0e86c8cb))
* Implement HTTP server with Express and middleware for logging, error handling, and security ([b0369d3](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/b0369d3635a0cfc467edb0a2578fc2c5eba6fc67)), closes [#3](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/issues/3)
* Implement UUID service with generation and validation methods ([9a77bdf](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/9a77bdf09440a5e5612cb6cecc668c0e1c1af878))
* initialize project with TypeScript configuration and Vitest setup ([88514e6](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/88514e6478257752882eab41c217fbea6ba45a82))
* **logging:** implement Winston logger service with structured logging and rotation ([6c52ed8](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/6c52ed802b744b98350fc96acb88ed6b06ea5833))
* **tests:** add global setup for integration tests and Vitest globals import ([03953ff](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/commit/03953ff8043bbefaa9aa844ee7b8635f957b3b1b))
