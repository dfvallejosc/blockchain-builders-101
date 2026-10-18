import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

const UNAVAILABLE_MESSAGE = 'El servicio no está disponible.';

export class ContractError extends Error {
  constructor(readonly code: number) {
    super('La operación fue rechazada por el contrato.');
    this.name = ContractError.name;
  }
}

export class NetworkUnavailableError extends Error {
  constructor() {
    super(UNAVAILABLE_MESSAGE);
    this.name = NetworkUnavailableError.name;
  }
}

export const toHttpException = (error: unknown): Error => {
  if (error instanceof HttpException) return error;

  if (!(error instanceof ContractError))
    return new ServiceUnavailableException(UNAVAILABLE_MESSAGE);

  switch (error.code) {
    case 1:
    case 5:
      return new ForbiddenException('El emisor no está autorizado.');
    case 2:
    case 4:
      return new ConflictException('El certificado ya existe o está anulado.');
    case 3:
    case 7:
      return new NotFoundException('No se encontró el recurso solicitado.');
    case 6:
      return new BadRequestException(
        'La vigencia del certificado no es válida.',
      );
    default:
      return new ServiceUnavailableException(UNAVAILABLE_MESSAGE);
  }
};
