const custom = { custom: true };

export default class ErrorTypes {

    static AUTH_INVALID = (customMessage?: string) => ({ code: 'auth-invalid', message: customMessage || 'Authentication Invalid', ...custom });

    static USER_NOT_FOUND = (customMessage?: string) => ({ code: 'user-not-found', message: customMessage || 'User does not exist', ...custom });

    static UNKNOWN = (customMessage?: string) => ({ code: 'unknown-error', message: customMessage || 'Unknown Error', ...custom });

    static UNAUTH_POST_DELETE = (customMessage?: string) => ({ code: 'unauthorised-post-delete', message: customMessage || 'User is not authorised to delete this post', ...custom });

    static UNAUTH_POST_UPDATE = (customMessage?: string) => ({ code: 'unauthorised-post-update', message: customMessage || 'User is not authorised to update this post', ...custom });

    static COMMENT_NOT_EXISTS = (customMessage?: string) => ({ code: 'comment-not-exists', message: customMessage || 'The comment does not exist', ...custom });

    static UNAUTH_COMMENT_DELETE = (customMessage?: string) => ({ code: 'unauthorised-comment-delete', message: customMessage || 'User is not authorised to delete this comment', ...custom });

    static POST_NOT_EXISTS = (customMessage?: string) => ({ code: 'post-not-exists', message: customMessage || 'The post you are attempting to access does not exist', ...custom });

    static ROGUE_COMMENT = (customMessage?: string) => ({ code: 'rogue-comment', message: customMessage || 'The comment does not belong to this post', ...custom });

}
