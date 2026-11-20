import type { ErrorCode } from '@eventhub/schemas';
import {
  SerializeOptions,
  type StandardSchemaSerializerContextOptions,
} from '@nestjs/common';
import {
  ApiExtension,
  ApiOperation,
  type HeadersObject,
} from '@nestjs/swagger';

const OPENAPI_METADATA_FACTORY = '_OPENAPI_METADATA_FACTORY';

export const ERROR_CODES_EXTENSION = 'x-error-codes';

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
    if (errors.length > 0) {
      ApiExtension(ERROR_CODES_EXTENSION, errors)(
        target,
        methodKey,
        descriptor,
      );
    }
    documentSuccessResponse(target.constructor, methodKey, {
      standardSchema: response,
      headers,
    });
  };
}
