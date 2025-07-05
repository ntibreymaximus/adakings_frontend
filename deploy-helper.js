#!/usr/bin/env node
/**
 * Smart Deploy Helper - Enhanced NPM Deployment Tool
 * Provides intelligent deployment features with automated checks
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class SmartDeployHelper {
    constructor() {
        this.packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        this.currentVersion = this.packageJson.version;
    }

    log(message, type = 'info') {
        const icons = {
            info: '🔍',
            success: '✅',
            warning: '⚠️',
            error: '❌',
            deploy: '🚀'
        };
        console.log(`${icons[type]} ${message}`);
    }

    runCommand(command) {
        try {
            return execSync(command, { encoding: 'utf8' }).trim();
        } catch (error) {
            this.log(`Command failed: ${command}`, 'error');
            throw error;
        }
    }

    showHelp() {
        console.log(`
🚀 Smart Deploy Helper - Available Commands:

📦 VERSION MANAGEMENT:
   npm run version:check           - Show current version
   npm run deploy:status          - Show deployment status

🔧 FEATURE DEPLOYMENTS:
   npm run deploy:feature:patch   - Deploy feature with patch bump
   npm run deploy:feature:minor   - Deploy feature with minor bump  
   npm run deploy:feature:major   - Deploy feature with major bump
   npm run deploy:quick           - Quick feature patch deployment

🏗️ DEVELOPMENT DEPLOYMENTS:
   npm run deploy:dev:patch       - Deploy to dev with patch bump
   npm run deploy:dev:minor       - Deploy to dev with minor bump
   npm run deploy:dev:major       - Deploy to dev with major bump

🎯 PRODUCTION DEPLOYMENTS:
   npm run deploy:prod:patch      - Deploy to production with patch bump
   npm run deploy:prod:minor      - Deploy to production with minor bump
   npm run deploy:prod:major      - Deploy to production with major bump

🔄 UTILITIES:
   npm run pre-deploy             - Run tests and build
   npm run smart-deploy           - Interactive deployment wizard

📋 EXAMPLES:
   npm run deploy:quick                    # Quick patch deployment
   npm run deploy:feature:minor            # Feature minor version bump
   npm run deploy:prod:major              # Major production release

🎯 Current Version: ${this.currentVersion}
🌿 Current Branch: ${this.getCurrentBranch()}
        `);
    }

    getCurrentBranch() {
        try {
            return this.runCommand('git branch --show-current');
        } catch {
            return 'unknown';
        }
    }

    getGitStatus() {
        try {
            const status = this.runCommand('git status --porcelain');
            return status ? status.split('\n').length : 0;
        } catch {
            return 0;
        }
    }

    showStatus() {
        this.log('Current Deployment Status:', 'info');
        console.log(`
📋 PROJECT STATUS:
   📦 Version: ${this.currentVersion}
   🌿 Branch: ${this.getCurrentBranch()}
   📁 Modified Files: ${this.getGitStatus()}
   
🔍 GIT STATUS:
${this.runCommand('git status --short') || '   Clean working directory'}

📊 AVAILABLE COMMANDS:
   npm run deploy:quick    # Quick feature deployment
   npm run deploy:help     # Show all commands
        `);
    }

    async interactiveWizard() {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

        console.log('\n🧙‍♂️ Smart Deploy Wizard\n');
        
        console.log('Available environments:');
        console.log('1. Feature (development branch)');
        console.log('2. Dev (testing environment)');
        console.log('3. Production (live environment)');
        
        const envChoice = await question('\nSelect environment (1-3): ');
        
        console.log('\nVersion bump types:');
        console.log('1. Patch (1.0.0 → 1.0.1) - Bug fixes');
        console.log('2. Minor (1.0.0 → 1.1.0) - New features');
        console.log('3. Major (1.0.0 → 2.0.0) - Breaking changes');
        
        const bumpChoice = await question('Select version bump (1-3): ');
        
        const message = await question('Deployment message (optional): ');
        
        rl.close();
        
        // Map choices to commands
        const envMap = { '1': 'feature', '2': 'dev', '3': 'production' };
        const bumpMap = { '1': 'patch', '2': 'minor', '3': 'major' };
        
        const env = envMap[envChoice] || 'feature';
        const bump = bumpMap[bumpChoice] || 'patch';
        
        this.log(`Deploying ${env} with ${bump} bump...`, 'deploy');
        
        const command = `node smart-deploy.js ${env === 'feature' ? 'feature/codebaserefactor' : env} ${bump} "${message}"`;
        
        try {
            execSync(command, { stdio: 'inherit' });
            this.log('Deployment completed successfully!', 'success');
        } catch (error) {
            this.log('Deployment failed!', 'error');
            process.exit(1);
        }
    }

    checkPrerequisites() {
        const checks = [
            {
                name: 'Git repository',
                test: () => fs.existsSync('.git'),
                fix: 'Initialize git: git init'
            },
            {
                name: 'Node modules',
                test: () => fs.existsSync('node_modules'),
                fix: 'Install dependencies: npm install'
            },
            {
                name: 'Smart deploy script',
                test: () => fs.existsSync('smart-deploy.js'),
                fix: 'Smart deploy script missing'
            }
        ];

        this.log('Checking prerequisites...', 'info');
        
        let allPassed = true;
        for (const check of checks) {
            if (check.test()) {
                this.log(`${check.name}: OK`, 'success');
            } else {
                this.log(`${check.name}: FAIL - ${check.fix}`, 'error');
                allPassed = false;
            }
        }
        
        return allPassed;
    }
}

// Main execution
async function main() {
    const helper = new SmartDeployHelper();
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
        case 'help':
        case '--help':
        case '-h':
            helper.showHelp();
            break;
            
        case 'status':
            helper.showStatus();
            break;
            
        case 'wizard':
        case 'interactive':
            if (!helper.checkPrerequisites()) {
                process.exit(1);
            }
            await helper.interactiveWizard();
            break;
            
        case 'check':
            helper.checkPrerequisites();
            break;
            
        default:
            helper.showHelp();
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('❌ Error:', error.message);
        process.exit(1);
    });
}

module.exports = SmartDeployHelper;
