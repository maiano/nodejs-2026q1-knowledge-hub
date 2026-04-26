import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';

export const validateDto = async <T extends object>(
  cls: new () => T,
  payload: object,
): Promise<ValidationError[]> => {
  const dto = plainToInstance(cls, payload);

  return validate(dto);
};
