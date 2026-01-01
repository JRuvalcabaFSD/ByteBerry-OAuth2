/* eslint-disable @typescript-eslint/no-explicit-any */
import { IContainer, Lifecycle, Token } from '@interfaces';
import { ServiceMap } from '@ServiceMap';
import { InjectableError } from '@shared';

/**
 * Represents a type that can be instantiated with the `new` keyword.
 *
 * @template T - The type of the instance created by the constructor.
 */

type Constructor<T = unknown> = new (...args: any[]) => T;

/**
 * A registry that maps service tokens to their corresponding constructor, lifecycle, and dependencies.
 *
 * - The key is a token from the `ServiceMap` representing a service.
 * - The value is an object containing:
 *   - `ctor`: The constructor function for the service.
 *   - `lifecycle`: Specifies whether the service is a 'singleton' or 'transient'.
 *   - `dependencyTokens`: An array of tokens representing the dependencies required by the service.
 *
 * This registry is used to manage service instantiation and dependency injection.
 */

export const injectableRegistry = new Map<
	keyof ServiceMap,
	{
		ctor: Constructor;
		lifecycle: 'singleton' | 'transient';
		dependencyTokens: (keyof ServiceMap)[];
	}
>();

interface InjectableProps {
	name: Token;
	lifecycle?: Lifecycle;
	depends?: Token[];
}

/**
 * Marks a class as injectable and registers it in the dependency injection registry.
 *
 * @param props - Configuration options for the injectable, including:
 *   - `name`: The unique token or identifier for the injectable.
 *   - `lifecycle`: The lifecycle management strategy (e.g., singleton, transient).
 *   - `depends`: An array of dependency tokens required by the injectable.
 *
 * @returns A class decorator function that registers the target class with the provided configuration.
 */

export function Injectable(props: InjectableProps) {
	const { name, lifecycle, depends } = props;

	return function (target: Constructor) {
		injectableRegistry.set(name, { ctor: target, lifecycle: lifecycle ?? 'singleton', dependencyTokens: depends ?? [] });
	};
}

/**
 * Registers a service in the provided container using the specified token and metadata.
 * The service can be registered as either a singleton or a transient instance based on the lifecycle defined in the metadata.
 *
 * @template K - The key type representing the service token in the ServiceMap.
 * @param container - The dependency injection container where the service will be registered.
 * @param token - The unique token used to identify the service within the container.
 * @param metadata - Metadata describing the service, including its constructor, dependencies, and lifecycle.
 *
 * @remarks
 * - If the lifecycle is 'singleton', the service is registered as a singleton.
 * - Otherwise, the service is registered as a transient instance.
 * - Dependencies are resolved from the container and injected into the service constructor.
 */

function registerService<K extends keyof ServiceMap>(
	container: IContainer,
	token: K,
	metadata: typeof injectableRegistry extends Map<any, infer R> ? R : any
) {
	const factory = (c: IContainer): ServiceMap[K] => {
		const instances = metadata.dependencyTokens.map((depToken) => c.resolve(depToken as keyof ServiceMap));
		return new metadata.ctor(...instances) as ServiceMap[K];
	};

	if (metadata.lifecycle === 'singleton') {
		container.registerSingleton(token, factory);
	} else {
		container.register(token, factory);
	}
}

/**
 * Automatically registers all injectable services from the `injectableRegistry` into the provided container.
 *
 * For each service token and its associated metadata, this function checks that all declared dependencies
 * are either present in the registry or already registered in the container. If a dependency is missing,
 * it throws an `InjectableError`. Otherwise, it registers the service with the container.
 *
 * @param container - The dependency injection container where services will be registered.
 * @throws {InjectableError} If a service dependency is not found in the registry or container.
 */

export function autoRegister(container: IContainer) {
	for (const [token, metadata] of injectableRegistry) {
		for (const dep of metadata.dependencyTokens) {
			if (!injectableRegistry.has(dep) && !container.isRegistered(dep)) throw new InjectableError(token, dep);
		}
		registerService(container, token as keyof ServiceMap, metadata);
	}
}
