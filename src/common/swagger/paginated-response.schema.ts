import { Type } from '@nestjs/common';
import { getSchemaPath } from '@nestjs/swagger';

export function getPaginatedResponseSchema(model: Type<unknown>) {
  return {
    type: 'object',
    properties: {
      data: {
        type: 'array',
        items: {
          $ref: getSchemaPath(model),
        },
      },
      total: {
        type: 'number',
        example: 1,
      },
      page: {
        type: 'number',
        example: 1,
      },
      limit: {
        type: 'number',
        example: 10,
      },
    },
    required: ['data', 'total', 'page', 'limit'],
  };
}
