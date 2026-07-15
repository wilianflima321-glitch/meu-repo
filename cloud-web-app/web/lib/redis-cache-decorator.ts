import type { AsyncCacheable, CacheOptions } from './redis-cache.types'

export function createCachedDecorator(cache: {
  get<T = unknown>(key: string): Promise<T | null>
  set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean>
}) {
  return function cached<T extends AsyncCacheable>(
    keyGenerator: (...args: Parameters<T>) => string,
    options?: CacheOptions,
  ) {
    return function (_target: object, _propertyKey: string, descriptor: TypedPropertyDescriptor<T>) {
      const originalMethod = descriptor.value
      if (!originalMethod) return descriptor

      descriptor.value = async function (this: unknown, ...args: Parameters<T>) {
        const key = keyGenerator(...args)
        const cached = await cache.get(key)
        if (cached !== null) return cached

        const result = await originalMethod.apply(this, args)
        await cache.set(key, result, options)

        return result as Awaited<ReturnType<T>>
      } as T

      return descriptor
    }
  }
}
