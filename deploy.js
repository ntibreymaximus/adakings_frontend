#!/usr/bin/env node
/**
 * Deploy Helper Script for Adakings Frontend React App
 * Provides easier npm script usage for smart deployment
 * 
 * Usage:
 *   npm run deploy:feature auth patch "Add authentication"
 *   npm run deploy:dev minor "New components"
 *   npm run deploy:production major "Major release"
 */

const ReactSmartDeployer = require('./smart-deploy.js');

async function main() {
    const [, , deployType, ...rest] = process.argv;
    
    if (!deployType) {
        console.log('React Smart Deploy - npm Script Interface');
        console.log('');
        console.log('Usage:');
        console.log('  npm run deploy:feature <feature-name> [bump-type] ["commit message"]');
        console.log('  npm run deploy:dev [bump-type] ["commit message"]');
        console.log('  npm run deploy:production [bump-type] ["commit message"]');
        console.log('');
        console.log('Examples:');
        console.log('  npm run deploy:feature auth patch "Add authentication components"');
        console.log('  npm run deploy:dev minor "New UI components for testing"');
        console.log('  npm run deploy:production major "Production release v2.0"');
        console.log('');
        console.log('Bump types: major, minor, patch (default: patch)');
        process.exit(1);
    }

    let targetEnv, bumpType, commitMessage;

    if (deployType === 'feature') {
        const [featureName, bump = 'patch', ...msgParts] = rest;
        if (!featureName) {
            console.log('❌ Feature name is required for feature deployments');
            console.log('Usage: npm run deploy:feature <feature-name> [bump-type] ["commit message"]');
            console.log('Example: npm run deploy:feature auth patch "Add authentication"');
            process.exit(1);
        }
        targetEnv = `feature/${featureName}`;
        bumpType = bump;
        commitMessage = msgParts.join(' ');
    } else if (deployType === 'dev' || deployType === 'production') {
        const [bump = 'patch', ...msgParts] = rest;
        targetEnv = deployType;
        bumpType = bump;
        commitMessage = msgParts.join(' ');
    } else {
        console.log(`❌ Invalid deployment type: ${deployType}`);
        console.log('Valid types: feature, dev, production');
        process.exit(1);
    }

    // Validate bump type
    const validBumpTypes = ['major', 'minor', 'patch'];
    if (!validBumpTypes.includes(bumpType)) {
        console.log(`❌ Invalid bump type: ${bumpType}`);
        console.log(`Valid types: ${validBumpTypes.join(', ')}`);
        process.exit(1);
    }

    // Run the deployment
    const deployer = new ReactSmartDeployer();
    const success = await deployer.deploy(targetEnv, bumpType, commitMessage);
    
    if (!success) {
        process.exit(1);
    }
}

main().catch(error => {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
});
