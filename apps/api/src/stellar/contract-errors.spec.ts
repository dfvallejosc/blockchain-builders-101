import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ContractError,
  NetworkUnavailableError,
  toHttpException,
} from './contract-errors.js';

describe('toHttpException', () => {
  it.each([
    [1, ForbiddenException],
    [5, ForbiddenException],
    [2, ConflictException],
    [4, ConflictException],
    [3, NotFoundException],
    [7, NotFoundException],
    [6, BadRequestException],
    [99, ServiceUnavailableException],
  ])('maps contract code %s to %s', (code, exceptionType) => {
    expect(toHttpException(new ContractError(code))).toBeInstanceOf(
      exceptionType,
    );
  });

  it('maps network failures to the generic unavailable exception', () => {
    expect(toHttpException(new NetworkUnavailableError())).toEqual(
      new ServiceUnavailableException('El servicio no está disponible.'),
    );
  });

  it('maps unknown failures to the generic unavailable exception', () => {
    expect(toHttpException(new Error('internal details'))).toEqual(
      new ServiceUnavailableException('El servicio no está disponible.'),
    );
  });

  it('returns Nest HTTP exceptions unchanged', () => {
    const exception = new HttpException('already mapped', 418);
    expect(toHttpException(exception)).toBe(exception);
  });
});
