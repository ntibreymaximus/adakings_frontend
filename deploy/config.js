// Smart Deploy Configuration
export const DEPLOY_CONFIG = {
  // Environment configurations
  environments: {
    development: {
      name: 'Development',
      url: 'http://localhost:3000',
      apiUrl: 'http://localhost:8000',
      branch: 'develop',
      autoTests: true,
      requireApproval: false,
      notifications: ['console']
    },
    staging: {
      name: 'Staging',
      url: 'https://staging.adakings.com',
      apiUrl: 'https://api-staging.adakings.com',
      branch: 'staging',
      autoTests: true,
      requireApproval: true,
      notifications: ['console', 'slack', 'email']
    },
    production: {
      name: 'Production',
      url: 'https://adakings.com',
      apiUrl: 'https://api.adakings.com',
      branch: 'main',
      autoTests: true,
      requireApproval: true,
      requireHealthCheck: true,
      notifications: ['console', 'slack', 'email', 'sms']
    }
  },

  // Deployment checks
  checks: {
    preDeployment: [
      'gitStatus',
      'branchCheck',
      'testsPass',
      'buildSuccess',
      'dependencyAudit',
      'codeQuality'
    ],
    postDeployment: [
      'healthCheck',
      'smokeTests',
      'performanceCheck',
      'securityScan'
    ]
  },

  // Rollback configuration
  rollback: {
    maxVersionsToKeep: 5,
    autoRollbackOnFailure: true,
    healthCheckTimeout: 30000, // 30 seconds
    rollbackTimeout: 120000 // 2 minutes
  },

  // Notification settings
  notifications: {
    slack: {
      webhook: process.env.SLACK_WEBHOOK_URL,
      channel: '#deployments'
    },
    email: {
      smtp: process.env.SMTP_SERVER,
      from: 'deployments@adakings.com',
      to: ['admin@adakings.com']
    }
  },

  // Version management
  versioning: {
    scheme: 'semantic', // semantic, timestamp, build
    autoIncrement: true,
    includeCommitHash: true,
    includeBuildNumber: true
  }
};

// Feature flags for deployment
export const DEPLOYMENT_FEATURES = {
  blueGreenDeployment: true,
  canaryDeployment: true,
  rollbackOnError: true,
  healthChecks: true,
  performanceMonitoring: true,
  securityScanning: true,
  automaticBackup: true,
  slackNotifications: true
};
