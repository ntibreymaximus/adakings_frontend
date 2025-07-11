import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentEnvironment, isLocal, isDevelopment, isProduction } from '../utils/envConfig';

const EnvironmentContext = createContext();

export const useEnvironment = () => {
  const context = useContext(EnvironmentContext);
  if (!context) {
    throw new Error('useEnvironment must be used within an EnvironmentProvider');
  }
  return context;
};

export const EnvironmentProvider = ({ children }) => {
  const [envInfo, setEnvInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEnvironmentInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to fetch from backend API first
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_BACKEND_BASE_URL;
      if (apiBaseUrl) {
        try {
          const response = await fetch(`${apiBaseUrl}/environment/`);
          if (response.ok) {
            const data = await response.json();
            setEnvInfo({
              ...data,
              source: 'backend',
            });
            setLoading(false);
            return;
          }
        } catch (backendError) {
          console.warn('Failed to fetch environment info from backend:', backendError);
        }
      }

      // Fallback to frontend environment detection
      const environment = getCurrentEnvironment();
      
      let ui_tag = null;
      let show_tag = false;

      if (environment === 'local') {
        ui_tag = 'LOCAL';
        show_tag = true;
      } else if (environment === 'dev') {
        ui_tag = 'DEV';
        show_tag = true;
      } else if (environment === 'prod') {
        // Don't show tag in production
        ui_tag = null;
        show_tag = false;
      } else {
        // Fallback for any other environment
        ui_tag = environment.toUpperCase();
        show_tag = true;
      }

      setEnvInfo({
        environment,
        ui_tag,
        show_tag,
        platform: 'Frontend',
        version: process.env.REACT_APP_VERSION || '1.0.0',
        debug: process.env.NODE_ENV === 'development',
        source: 'frontend',
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching environment info:', error);
      setError(error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnvironmentInfo();
  }, []);

  const value = {
    envInfo,
    loading,
    error,
    refetch: fetchEnvironmentInfo,
    // Helper functions
    isLocal: () => envInfo?.environment === 'local' || isLocal(),
    isDevelopment: () => envInfo?.environment === 'dev' || isDevelopment(),
    isProduction: () => envInfo?.environment === 'prod' || isProduction(),
    shouldShowTag: () => envInfo?.show_tag || false,
    getEnvironmentName: () => envInfo?.environment || getCurrentEnvironment(),
    getUITag: () => envInfo?.ui_tag || null,
  };

  return (
    <EnvironmentContext.Provider value={value}>
      {children}
    </EnvironmentContext.Provider>
  );
};

export default EnvironmentContext;
