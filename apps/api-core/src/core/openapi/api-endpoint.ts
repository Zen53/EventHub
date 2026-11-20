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

export type ResponseSchema = NonNullable<
  StandardSchemaSerializerContextOptions['schema']
>;

export type ResponseOf<S extends ResponseSchema> = NonNullable<
  S['~standard']['types']
>['output'];

export type EndpointHandler<R> = (...args: never[]) => R | Promise<R>;

export interface ApiEndpointOptions<S extends ResponseSchema | undefined> {
  description?: string;
  response?: S;
  headers?: HeadersObject;
  errors?: ErrorCode[];
}

export type TypedMethodDecorator<R> = <T extends EndpointHandler<R>>(
  target: object,
  methodKey: string | symbol,
  descriptor: TypedPropertyDescriptor<T>,
) => void;

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

export function ApiEndpoint<S extends ResponseSchema>(
  summary: string,
  options: ApiEndpointOptions<S> & { response: S },
): TypedMethodDecorator<ResponseOf<S>>;
export function ApiEndpoint(
  summary: string,
  options?: ApiEndpointOptions<undefined>,
): MethodDecorator;
export function ApiEndpoint(
  summary: string,
  {
    description,
    response,
    headers,
    errors = [],
  }: ApiEndpointOptions<ResponseSchema | undefined> = {},
): MethodDecorator {
  return (target, methodKey, descriptor) => {
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
}
