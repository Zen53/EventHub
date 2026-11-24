export const strictBodyError = (issue: { code: string }) =>
  issue.code === 'invalid_type'
    ? 'Le corps de la requête doit être un objet JSON.'
    : undefined;
