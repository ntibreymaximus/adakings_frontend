import React from 'react';
import { useEnvironment } from '../contexts/EnvironmentContext';
import '../styles/environment-tag.css';

const EnvironmentTag = () => {
  const { envInfo, loading } = useEnvironment();

  const getTagClassName = (tag) => {
    const baseClass = 'environment-tag';
    
    switch (tag?.toLowerCase()) {
      case 'local':
        return `${baseClass} local`;
      case 'dev':
        return `${baseClass} dev`;
      case 'prod':
        return `${baseClass} prod`;
      default:
        return `${baseClass} default`;
    }
  };

  // Don't render anything if loading, no environment info, or shouldn't show tag
  if (loading || !envInfo || !envInfo.show_tag || !envInfo.ui_tag) {
    return null;
  }

  return (
    <div
      className={getTagClassName(envInfo.ui_tag)}
      title={`Environment: ${envInfo.environment} | Platform: ${envInfo.platform} | Version: ${envInfo.version}`}
    >
      {envInfo.ui_tag}
    </div>
  );
};

export default EnvironmentTag;
