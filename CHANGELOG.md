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
