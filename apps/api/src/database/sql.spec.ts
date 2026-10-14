import { toSqlList } from './sql.js';

describe('toSqlList', () => {
  it('quotes each value and joins them with a comma', () => {
    expect(toSqlList(['clinic', 'training-center'])).toBe("'clinic', 'training-center'");
  });

  it('escapes single quotes', () => {
    expect(toSqlList(["o'k"])).toBe("'o''k'");
  });
});
