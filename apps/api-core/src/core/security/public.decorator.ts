import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'security:isPublic';

/** Exempts a route, or every route of a controller, from the access token check. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
