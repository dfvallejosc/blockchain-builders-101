import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateWorkerDto } from './create-worker.dto.js';
import { ListWorkersQueryDto } from './list-workers-query.dto.js';

const validationPipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });

const transformBody = (body: unknown): Promise<CreateWorkerDto> =>
  validationPipe.transform(body, { type: 'body', metatype: CreateWorkerDto });

const transformQuery = (query: unknown): Promise<ListWorkersQueryDto> =>
  validationPipe.transform(query, { type: 'query', metatype: ListWorkersQueryDto });

describe('worker input DTOs', () => {
  describe('CreateWorkerDto', () => {
    it('accepts a valid body and normalizes it', async () => {
      const result = await transformBody({
        fullName: '  Ana  María Pérez ',
        documentType: 'cc',
        documentNumber: ' ab12345 ',
        dataConsent: true,
      });

      expect(result).toMatchObject({
        fullName: 'Ana  María Pérez',
        documentType: 'cc',
        documentNumber: 'AB12345',
        dataConsent: true,
      });
    });

    it.each([
      ['a one-word name', { fullName: 'Ana' }],
      ['a blank name', { fullName: '   ' }],
      ['a name longer than 120 characters', { fullName: `Ana ${'a'.repeat(117)}` }],
      ['a document number containing spaces', { documentNumber: 'AB 12345' }],
      ['a document number containing periods', { documentNumber: '1.234.567' }],
      ['a document number shorter than five characters', { documentNumber: 'AB12' }],
      ['a document number longer than twenty characters', { documentNumber: 'A'.repeat(21) }],
      ['an unsupported document type', { documentType: 'nit' }],
      ['a missing data consent', { dataConsent: false }],
      ['a string data consent', { dataConsent: 'true' }],
      ['a missing field', { dataConsent: undefined }],
      ['an issuerId field', { issuerId: 'private-issuer-value' }],
      ['a consentedAt field', { consentedAt: 'private-consent-value' }],
      ['an id field', { id: 'private-worker-value' }],
    ])('rejects %s with a safe validation error', async (_caseName, field) => {
      const body = {
        fullName: 'Ana María Pérez',
        documentType: 'cc',
        documentNumber: 'AB12345',
        dataConsent: true,
        ...field,
      };

      let error: unknown;
      try {
        await transformBody(body);
      } catch (caughtError) {
        error = caughtError;
      }

      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse();
      expect(JSON.stringify(response)).not.toContain('private-');
    });
  });

  describe('ListWorkersQueryDto', () => {
    it('accepts an empty query', async () => {
      await expect(transformQuery({})).resolves.toMatchObject({});
    });

    it('normalizes the document number to uppercase', async () => {
      await expect(transformQuery({ documentNumber: 'ab1' })).resolves.toMatchObject({ documentNumber: 'AB1' });
    });

    it.each([
      ['an empty document number', ''],
      ['a document number containing spaces', 'a b'],
      ['a document number containing periods', 'a.b'],
      ['a document number longer than twenty characters', 'a'.repeat(21)],
      ['an array of document numbers', ['a', 'b']],
    ])('rejects %s', async (_caseName, documentNumber) => {
      await expect(transformQuery({ documentNumber })).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
