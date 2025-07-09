const { override, disableChunk } = require('customize-cra');

module.exports = override(
  (config, env) => {
    // Disable webpack dev server client in production-like deployments
    if (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production') {
      // Remove webpack dev server client entry
      if (config.entry && Array.isArray(config.entry)) {
        config.entry = config.entry.filter(entry => 
          !entry.includes('webpack-dev-server/client') && 
          !entry.includes('webpack/hot/dev-server')
        );
      }
      
      // Disable hot module replacement
      if (config.plugins) {
        config.plugins = config.plugins.filter(plugin => 
          plugin.constructor.name !== 'HotModuleReplacementPlugin'
        );
      }
    }
    
    return config;
  }
);
