import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateIssuerDto } from './create-issuer.dto.js';

const validationPipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });

const transformBody = (body: unknown): Promise<CreateIssuerDto> =>
  validationPipe.transform(body, { type: 'body', metatype: CreateIssuerDto });

const validBody = {
  name: 'Salud Ocupacional del Valle',
  type: 'clinic',
  city: 'Medellín',
  certificateTypes: ['occupational-medical'],
  nit: '901.482.317-5',
  ministryRegistration: 'REG-2024-118',
  contactName: 'Marcela Ríos',
  email: 'marcela@saludvalle.co',
  phone: '310 555 0142',
};

describe('CreateIssuerDto', () => {
  it('accepts the front NewEntityInput as it is', async () => {
    await expect(transformBody(validBody)).resolves.toMatchObject(validBody);
  });

  it('normalizes spaces, the NIT format, the phone format and the email case', async () => {
    const result = await transformBody({
      ...validBody,
      name: '  Salud   Ocupacional  del Valle ',
      nit: '901482317-5',
      phone: '3105550142',
      email: '  Marcela@SaludValle.CO ',
      contactName: ' Marcela   Ríos ',
      ministryRegistration: '  REG-2024-118 ',
    });

    expect(result).toMatchObject({
      name: 'Salud Ocupacional del Valle',
      nit: '901.482.317-5',
      phone: '310 555 0142',
      email: 'marcela@saludvalle.co',
      contactName: 'Marcela Ríos',
      ministryRegistration: 'REG-2024-118',
    });
  });

  it('accepts an empty ministry registration, like the form does', async () => {
    await expect(transformBody({ ...validBody, ministryRegistration: '' })).resolves.toMatchObject({
      ministryRegistration: '',
    });
  });

  it.each([
    ['a name shorter than three characters', { name: 'Sa' }],
    ['an unsupported entity type', { type: 'hospital' }],
    ['a blank city', { city: '   ' }],
    ['a city longer than 80 characters', { city: 'a'.repeat(81) }],
    ['no certificate types', { certificateTypes: [] }],
    ['an unknown certificate type', { certificateTypes: ['diving'] }],
    ['a repeated certificate type', { certificateTypes: ['height-work', 'height-work'] }],
    ['certificate types that are not an array', { certificateTypes: 'height-work' }],
    ['a NIT with nine digits', { nit: '902.111.222' }],
    ['a NIT with letters', { nit: '902.111.22A-5' }],
    ['a phone with nine digits', { phone: '311 222 333' }],
    ['a phone with letters', { phone: '311 222 33AB' }],
    ['an invalid email', { email: 'marcela@' }],
    ['a contact name shorter than three characters', { contactName: 'Ma' }],
    ['a missing field', { email: undefined }],
    ['an id field', { id: 'private-issuer-value' }],
    ['a revokedAt field', { revokedAt: '2026-10-17T00:00:00.000Z' }],
  ])('rejects %s with a safe validation error', async (_caseName, field) => {
    const error = await transformBody({ ...validBody, ...field }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(BadRequestException);
    const message = JSON.stringify((error as BadRequestException).getResponse());
    for (const submitted of Object.values(field)) {
      if (typeof submitted === 'string' && submitted.trim() !== '') expect(message).not.toContain(submitted);
    }
  });
});
