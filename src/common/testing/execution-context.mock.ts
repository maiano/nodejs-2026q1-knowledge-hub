import { ExecutionContext } from '@nestjs/common';

type ExecutionContextMockOptions = {
  handler?: (...args: unknown[]) => unknown;
  classRef?: new (...args: never[]) => unknown;
  request?: Record<string, unknown>;
};

export const createExecutionContextMock = (
  options: ExecutionContextMockOptions = {},
): ExecutionContext => {
  const handler = options.handler ?? (() => undefined);
  const classRef = options.classRef ?? class TestClass {};
  const request = options.request ?? {};

  return {
    getHandler: () => handler,
    getClass: () => classRef,
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => undefined,
      getNext: () => undefined,
    }),
    switchToRpc: () => ({
      getContext: () => undefined,
      getData: () => undefined,
    }),
    switchToWs: () => ({
      getClient: () => undefined,
      getData: () => undefined,
      getPattern: () => undefined,
    }),
    getArgByIndex: () => undefined,
    getArgs: () => [],
    getType: () => 'http',
  } as ExecutionContext;
};
