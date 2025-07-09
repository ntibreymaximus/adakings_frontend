const { override } = require('customize-cra');

module.exports = override(
  (config, env) => {
    console.log('🔧 Webpack Override - Node Environment:', process.env.NODE_ENV);
    console.log('🔧 Webpack Override - Build Environment:', env);
    
    // For production builds, always remove webpack dev server client
    // This prevents the WebSocket security error on HTTPS deployments
    if (env === 'production' || process.env.NODE_ENV === 'production') {
      console.log('🔧 Production build detected - removing webpack dev server client');
      
      // Remove webpack dev server client entry
      if (config.entry && Array.isArray(config.entry)) {
        const originalEntries = config.entry.length;
        config.entry = config.entry.filter(entry => {
          const shouldRemove = typeof entry === 'string' && (
            entry.includes('webpack-dev-server/client') ||
            entry.includes('webpack/hot/dev-server') ||
            entry.includes('react-dev-utils/webpackHotDevClient') ||
            entry.includes('webpack-dev-server') ||
            entry.includes('sockjs-client')
          );
          if (shouldRemove) {
            console.log('🔧 Removing entry:', entry);
          }
          return !shouldRemove;
        });
        console.log(`🔧 Entries: ${originalEntries} → ${config.entry.length}`);
      }
      
      // Disable hot module replacement
      if (config.plugins) {
        const originalPlugins = config.plugins.length;
        config.plugins = config.plugins.filter(plugin => {
          const shouldRemove = plugin.constructor.name === 'HotModuleReplacementPlugin';
          if (shouldRemove) {
            console.log('🔧 Removing plugin:', plugin.constructor.name);
          }
          return !shouldRemove;
        });
        console.log(`🔧 Plugins: ${originalPlugins} → ${config.plugins.length}`);
      }
      
      // Disable dev server
      if (config.devServer) {
        console.log('🔧 Disabling dev server');
        config.devServer = false;
      }
    }
    
    return config;
  }
);
