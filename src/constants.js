export const HOST_PREFIX = process.env.NODE_ENV === 'development' ? 'http://localhost:3000/' : '/';
export const QPARAM_noarrows = 'noarrows';
export const QPARAM_autoload = 'autoload';
export const QPARAM_showchords = 'showchords';
export const QUERY_KEEP_PARAMS = new Set([QPARAM_autoload, QPARAM_noarrows, QPARAM_showchords]);

