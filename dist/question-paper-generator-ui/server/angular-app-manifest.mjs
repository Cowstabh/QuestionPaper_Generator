
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "redirectTo": "/login",
    "route": "/"
  },
  {
    "renderMode": 2,
    "route": "/login"
  },
  {
    "renderMode": 2,
    "route": "/register"
  },
  {
    "renderMode": 2,
    "route": "/verify"
  },
  {
    "renderMode": 2,
    "route": "/dashboard"
  },
  {
    "renderMode": 2,
    "redirectTo": "/login",
    "route": "/**"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 449, hash: 'a815c58af2335e0ff7cdb9dc788da62370e608b6d97ebd445d84cfb6a6238648', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 962, hash: '3904406cd284030a6677d8583513c52c66b67d2d548fd27c997b162cd3c9f290', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'verify/index.html': {size: 3492, hash: '5d414f0e21812dee2904b0e923c2ed2f02495774bdf1b5e6033675aa7ce4d1cb', text: () => import('./assets-chunks/verify_index_html.mjs').then(m => m.default)},
    'login/index.html': {size: 3589, hash: 'a899af1ef5b33bc3425b7ab9c64ad9dbc32de5a84a2b2ab4358260d152150c1b', text: () => import('./assets-chunks/login_index_html.mjs').then(m => m.default)},
    'register/index.html': {size: 3935, hash: '4174c8cddd43b9ab6fb36cc78587216fc5c272145f015bb0109fe6cf55832865', text: () => import('./assets-chunks/register_index_html.mjs').then(m => m.default)},
    'dashboard/index.html': {size: 12894, hash: '4322c835f70df63fd4409368a849c95c1d8434c72b466e463e3a5213927e2964', text: () => import('./assets-chunks/dashboard_index_html.mjs').then(m => m.default)},
    'styles-5INURTSO.css': {size: 0, hash: 'menYUTfbRu8', text: () => import('./assets-chunks/styles-5INURTSO_css.mjs').then(m => m.default)}
  },
};
