import { errorResponseSchema } from '@eventhub/schemas';
import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

export interface ApiErrorResponse {
  status: number;
  code: string;
  description: string;
}

export const ApiErrorResponses = (
  ...errors: ApiErrorResponse[]
): MethodDecorator & ClassDecorator =>
  applyDecorators(
    ...errors.map(({ status, code, description }) =>
      ApiResponse({
        status,
        description: `${code} : ${description}`,
        standardSchema: errorResponseSchema,
      }),
    ),
  );
