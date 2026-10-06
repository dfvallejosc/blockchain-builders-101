import { AppController } from './app.controller.js';

describe('AppController', () => {
  it('greets from the API root', () => {
    expect(new AppController().getHello()).toEqual({
      name: 'HabilitApp API',
      message: 'Hola desde HabilitApp',
    });
  });
});
