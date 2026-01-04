// Minimal Jest globals/types for TypeScript compilation in this package.
// This is intentionally lightweight: it only covers the APIs used in our tests.

declare namespace jest {
    interface Mock<TArgs extends any[] = any[], TResult = any> {
        (...args: TArgs): TResult;
        mockReturnValue(value: TResult): this;
        mockReturnValueOnce(value: TResult): this;
        mockResolvedValue(value: any): this;
        mockResolvedValueOnce(value: any): this;
        mockRejectedValue(error: any): this;
        mockRejectedValueOnce(error: any): this;
        mockImplementation(impl: (...args: TArgs) => TResult): this;
        mockImplementationOnce(impl: (...args: TArgs) => TResult): this;
        mockClear(): this;
        mockReset(): this;
    }

    type Mocked<T> = T & {
        [K in keyof T]: T[K] extends (...args: infer A) => infer R ? Mock<A, R> : T[K];
    };

    function fn<TArgs extends any[] = any[], TResult = any>(
        implementation?: (...args: TArgs) => TResult
    ): Mock<TArgs, TResult>;

    function spyOn<T extends object, K extends keyof T>(obj: T, method: K): any;
}

declare const jest: {
    fn: typeof jest.fn;
    spyOn: typeof jest.spyOn;
};

// Jest lifecycle globals (added because this TS project also sees Mocha types).
declare const beforeAll: (fn: () => any, timeout?: number) => void;
declare const afterAll: (fn: () => any, timeout?: number) => void;

// Jest supports per-test timeout as 3rd arg.
declare function it(name: string, fn?: (...args: any[]) => any, timeout?: number): any;
