const createConfigAsync = require('@expo/webpack-config');
const path = require('path');

// Ensure NODE_ENV is set for tools like @expo/env
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

module.exports = async (env, argv) => {
  const config = await createConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: ['rn-pdf-king'],
      },
    },
    argv
  );
  config.resolve.modules = [
    path.resolve(__dirname, './node_modules'),
    path.resolve(__dirname, '../node_modules'),
  ];

  return config;
};
