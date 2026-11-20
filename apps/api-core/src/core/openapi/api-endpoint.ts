import { errorCatalog, type ErrorCode } from '@eventhub/schemas';
import {
  SerializeOptions,
  type StandardSchemaSerializerContextOptions,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, type HeadersObject } from '@nestjs/swagger';

const OPENAPI_METADATA_FACTORY = '_OPENAPI_METADATA_FACTORY';

export const ERROR_RESPONSE_COMPONENT = 'ErrorResponse';

export const errorResponseRef = {
  $ref: `#/components/schemas/${ERROR_RESPONSE_COMPONENT}`,
};

type MetadataFactory = () => Record<string, object>;

export interface ApiEndpointOptions {
  description?: string;
  response?: StandardSchemaSerializerContextOptions['schema'];
  headers?: HeadersObject;
  errors?: ErrorCode[];
}

export const describeErrors = (codes: ErrorCode[]): string =>
  codes
    .map((code) => `\`${code}\` : ${errorCatalog[code].message}`)
    .join('\n\n');

const errorsByStatus = (codes: ErrorCode[]): Map<number, ErrorCode[]> => {
  const groups = new Map<number, ErrorCode[]>();
  for (const code of codes) {
    const { status } = errorCatalog[code];
    groups.set(status, [...(groups.get(status) ?? []), code]);
  }
  return groups;
};

const documentSuccessResponse = (
  controller: object,
  methodKey: string | symbol,
  response: object,
): void => {
  const holder = controller as Record<string, unknown>;
  const previous = Object.hasOwn(holder, OPENAPI_METADATA_FACTORY)
    ? (holder[OPENAPI_METADATA_FACTORY] as MetadataFactory)
    : () => ({});
  holder[OPENAPI_METADATA_FACTORY] = () => ({
    ...previous(),
    [methodKey]: response,
  });
};

export const ApiEndpoint =
  (
    summary: string,
    { description, response, headers, errors = [] }: ApiEndpointOptions = {},
  ): MethodDecorator =>
  (target, methodKey, descriptor) => {
    ApiOperation({ summary, description })(target, methodKey, descriptor);
    if (response) {
      SerializeOptions({ schema: response })(target, methodKey, descriptor);
    }
    for (const [status, codes] of errorsByStatus(errors)) {
      ApiResponse({
        status,
        description: describeErrors(codes),
        schema: errorResponseRef,
      })(target, methodKey, descriptor);
    }
    documentSuccessResponse(target.constructor, methodKey, {
      standardSchema: response,
      headers,
    });
  };
