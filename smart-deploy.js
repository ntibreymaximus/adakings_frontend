#!/usr/bin/env node
/**
 * Smart Deployment Script for Adakings Frontend React App - Branch-Specific Versioning
 * Manages deployments with independent version tracking for feature, dev, and production branches
 * 
 * Features:
 * - Branch-Specific Versioning: Independent version sequences for each branch type
 * - Multi-Version Tracking: VERSION file maintains separate versions for feature/dev/production
 * - Smart Git Workflow: Feature→main merge, dev→dev only, production→dev+prod with tags
 * - Production Tagging: Tags production versions on dev branch for tracking
 * - Remote Version Detection: Scans branch-specific remote versions for highest version
 * - Intelligent Version Bumping: Automatic major.minor.patch increments per branch type
 * - React Build Integration: Automatic npm run build for production deployments
 * - Atomic Commit Handling: Includes uncommitted changes in deployment commit
 * - Comprehensive Logging: Detailed deployment history and changelogs
 * - Clean Git Workflow: Creates new branches and commits all changes together
 * - Branch Management: Creates, merges, and manages git branches with user confirmation
 * 
 * Usage:
 *     node smart-deploy.js production [major|minor|patch] ["commit message"]
 *     node smart-deploy.js dev [major|minor|patch] ["commit message"]
 *     node smart-deploy.js feature/name [major|minor|patch] ["commit message"]
 *     
 * Examples:
 *     # Feature deployment - continuous versioning across all features
 *     node smart-deploy.js feature/auth patch "Add authentication components"
 *     # Result: feature/auth-1.0.0 (first feature)
 *     
 *     # Dev deployment - independent dev versioning with build
 *     node smart-deploy.js dev minor "New UI components"
 *     # Result: dev/1.1.0 (builds app for testing)
 *     
 *     # Production deployment - independent production versioning with optimized build
 *     node smart-deploy.js production major "Production release"
 *     # Result: pushes to dev with prod-x.x.x tag, then pushes to prod branch
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const readline = require('readline');

class ReactSmartDeployer {
    constructor() {
        this.baseDir = process.cwd();
        this.backupDir = path.join(this.baseDir, '.deploy_backup');
        this.versionFile = path.join(this.baseDir, 'VERSION');
        this.packageJsonFile = path.join(this.baseDir, 'package.json');
        this.buildDir = path.join(this.baseDir, 'build');
        
        // React-specific version tracking
        this.versionConfig = {
            'production': { file: 'VERSION', initial: '1.0.0', build: true, optimize: true },
            'dev': { file: 'VERSION', initial: '0.9.0', build: true, optimize: false },
            'feature': { file: 'VERSION', initial: '0.8.0', build: false, optimize: false }
        };
        
        // Git workflow configuration for React frontend
        this.gitConfig = {
            'production': {
                targetBranch: 'prod',
                mergeWith: null, // Production pushes to dev with tag, then to prod
                pushToDev: true, // Special case: also push to dev with production tag
                description: 'Production release with optimized build',
                useVersionedBranch: false // Push directly to prod
            },
            'dev': {
                targetBranch: 'dev',
                mergeWith: null, // Dev only pushes to dev branch
                description: 'Development release with test build',
                useVersionedBranch: true // Keep versioned branches for dev
            },
            'feature': {
                targetBranch: null, // Will be set dynamically
                mergeWith: 'main', // Feature branches merge with main after push
                description: 'Feature branch development',
                useVersionedBranch: true // Keep versioned branches for features
            }
        };
    }

    logInfo(message) {
        console.log(`📍 ${message}`);
    }

    logSuccess(message) {
        console.log(`✅ ${message}`);
    }

    logWarning(message) {
        console.log(`⚠️  ${message}`);
    }

    logError(message) {
        console.log(`❌ ${message}`);
    }

    runCommand(command, options = {}) {
        try {
            this.logInfo(`Running: ${command}`);
            const result = execSync(command, { 
                encoding: 'utf8', 
                stdio: options.silent ? 'pipe' : 'inherit',
                ...options 
            });
            return result;
        } catch (error) {
            this.logError(`Command failed: ${command}`);
            this.logError(`Error: ${error.message}`);
            throw error;
        }
    }

    getCurrentBranch() {
        try {
            return this.runCommand('git branch --show-current', { silent: true }).trim();
        } catch (error) {
            this.logError('Failed to get current branch');
            throw error;
        }
    }

    checkNodeDependencies() {
        const nodeModules = path.join(this.baseDir, 'node_modules');
        if (!fs.existsSync(nodeModules)) {
            this.logWarning('node_modules not found. Installing dependencies...');
            this.runCommand('npm install');
            this.logSuccess('Dependencies installed');
        } else {
            this.logInfo('Node dependencies found');
        }
    }

    updatePackageJsonVersion(newVersion) {
        try {
            const packageJson = JSON.parse(fs.readFileSync(this.packageJsonFile, 'utf8'));
            const oldVersion = packageJson.version;
            packageJson.version = newVersion;
            
            fs.writeFileSync(this.packageJsonFile, JSON.stringify(packageJson, null, 2) + '\n');
            this.logSuccess(`Updated package.json version: ${oldVersion} → ${newVersion}`);
        } catch (error) {
            this.logWarning(`Could not update package.json version: ${error.message}`);
        }
    }

    runReactBuild(targetEnv, optimize = false) {
        const config = this.versionConfig[targetEnv] || {};
        const shouldBuild = config.build;
        
        if (!shouldBuild) {
            this.logInfo(`Skipping build for ${targetEnv} environment`);
            return true;
        }

        this.logInfo(`Building React app for ${targetEnv} environment...`);
        
        // Set environment variables for build
        const env = { ...process.env };
        if (optimize) {
            env.NODE_ENV = 'production';
            env.GENERATE_SOURCEMAP = 'false';
            this.logInfo('Building with production optimizations');
        } else {
            env.NODE_ENV = 'development';
            env.GENERATE_SOURCEMAP = 'true';
            this.logInfo('Building with development settings');
        }

        try {
            // Clean previous build
            if (fs.existsSync(this.buildDir)) {
                fs.rmSync(this.buildDir, { recursive: true, force: true });
                this.logInfo('Cleaned previous build directory');
            }

            // Run the build
            this.runCommand('npm run build', { env });
            
            // Check if build was successful
            if (fs.existsSync(this.buildDir)) {
                // Get build size info
                const buildSize = this.getDirSize(this.buildDir);
                const buildSizeMB = (buildSize / (1024 * 1024)).toFixed(2);
                this.logSuccess(`Build completed successfully (${buildSizeMB} MB)`);
                
                // List key build artifacts
                const jsFiles = this.getFilesWithExtension(path.join(this.buildDir, 'static', 'js'), '.js');
                const cssFiles = this.getFilesWithExtension(path.join(this.buildDir, 'static', 'css'), '.css');
                this.logInfo(`Generated ${jsFiles.length} JavaScript files and ${cssFiles.length} CSS files`);
                
                return true;
            } else {
                this.logError('Build directory not created - build may have failed');
                return false;
            }
        } catch (error) {
            this.logError(`React build failed: ${error.message}`);
            return false;
        }
    }

    getDirSize(dirPath) {
        if (!fs.existsSync(dirPath)) return 0;
        
        let size = 0;
        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const stats = fs.statSync(itemPath);
            
            if (stats.isDirectory()) {
                size += this.getDirSize(itemPath);
            } else {
                size += stats.size;
            }
        }
        
        return size;
    }

    getFilesWithExtension(dirPath, extension) {
        if (!fs.existsSync(dirPath)) return [];
        
        return fs.readdirSync(dirPath)
            .filter(file => file.endsWith(extension))
            .map(file => path.join(dirPath, file));
    }

    backupCurrentState() {
        this.logInfo('Creating backup of current state...');
        
        const backupTime = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const currentBackup = path.join(this.backupDir, `backup_${backupTime}`);
        
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
        fs.mkdirSync(currentBackup, { recursive: true });
        
        // Backup key files including React-specific ones
        const keyFiles = [
            '.env', 'VERSION', 'CHANGELOG.md', 'package.json', 
            'package-lock.json', 'src', 'public', 'README.md'
        ];
        
        for (const file of keyFiles) {
            const sourcePath = path.join(this.baseDir, file);
            const targetPath = path.join(currentBackup, file);
            
            if (fs.existsSync(sourcePath)) {
                const stats = fs.statSync(sourcePath);
                if (stats.isDirectory()) {
                    this.copyDir(sourcePath, targetPath);
                } else {
                    fs.copyFileSync(sourcePath, targetPath);
                }
            }
        }
        
        // Backup build directory if it exists
        if (fs.existsSync(this.buildDir)) {
            this.copyDir(this.buildDir, path.join(currentBackup, 'build'));
        }
        
        this.logSuccess(`Backup created at: ${currentBackup}`);
        return currentBackup;
    }

    copyDir(src, dest) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        
        const items = fs.readdirSync(src);
        for (const item of items) {
            const srcPath = path.join(src, item);
            const destPath = path.join(dest, item);
            
            const stats = fs.statSync(srcPath);
            if (stats.isDirectory()) {
                this.copyDir(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }

    getVersionFromFile(branchType) {
        if (!fs.existsSync(this.versionFile)) {
            return '1.0.0';
        }
        
        try {
            const content = fs.readFileSync(this.versionFile, 'utf8').trim();
            
            // Handle legacy single version format
            if (!content.includes('\n') && !content.includes('feature=') && 
                !content.includes('dev=') && !content.includes('production=')) {
                return content;
            }
            
            // Parse new multi-branch format
            const versions = {
                'feature': '1.0.0',
                'dev': '1.0.0',
                'production': '1.0.0'
            };
            
            const lines = content.split('\n');
            for (const line of lines) {
                if (line.includes('=')) {
                    const [key, value] = line.split('=', 2);
                    const trimmedKey = key.trim();
                    const trimmedValue = value.trim();
                    if (versions.hasOwnProperty(trimmedKey)) {
                        versions[trimmedKey] = trimmedValue;
                    }
                }
            }
            
            return versions[branchType] || '1.0.0';
        } catch (error) {
            this.logWarning(`Error reading version file: ${error.message}`);
            return '1.0.0';
        }
    }

    updateVersionInFile(branchType, newVersion) {
        // Get current versions for all branch types
        const currentVersions = {
            'feature': this.getVersionFromFile('feature'),
            'dev': this.getVersionFromFile('dev'),
            'production': this.getVersionFromFile('production')
        };
        
        // Update the specific branch type
        currentVersions[branchType] = newVersion;
        
        // Write the updated VERSION file
        const versionContent = `feature=${currentVersions.feature}\ndev=${currentVersions.dev}\nproduction=${currentVersions.production}`;
        
        fs.writeFileSync(this.versionFile, versionContent, 'utf8');
        this.logSuccess(`Updated VERSION file - ${branchType}: ${newVersion}`);
        
        // Also update package.json version
        this.updatePackageJsonVersion(newVersion);
        
        // Log the complete state
        this.logInfo('VERSION file now contains:');
        this.logInfo(`  feature=${currentVersions.feature}`);
        this.logInfo(`  dev=${currentVersions.dev}`);
        this.logInfo(`  production=${currentVersions.production}`);
    }

    getHighestBranchVersion(targetEnv) {
        try {
            // Get all remote branches
            const remoteBranches = this.runCommand('git branch -r', { silent: true });
            const branches = remoteBranches.split('\n')
                .map(branch => branch.trim())
                .filter(branch => branch && !branch.includes('->'));
            
            const versions = [];
            
            if (targetEnv.startsWith('feature/')) {
                // For feature branches, look for ALL feature branch versions
                const pattern = 'origin/feature/';
                this.logInfo('Scanning for all feature branch versions...');
                
                for (const branch of branches) {
                    if (branch.startsWith(pattern) && branch.includes('-')) {
                        const versionPart = branch.split('-').pop();
                        if (this.isValidVersion(versionPart)) {
                            versions.push(versionPart);
                            this.logInfo(`  Found version ${versionPart} in ${branch}`);
                        }
                    }
                }
            } else if (targetEnv === 'dev') {
                // For dev branches, look for dev/x.x.x pattern
                const pattern = 'origin/dev/';
                this.logInfo('Scanning for dev branch versions...');
                
                for (const branch of branches) {
                    if (branch.startsWith(pattern) && (branch.match(/\//g) || []).length === 2) {
                        const versionPart = branch.replace(pattern, '');
                        if (this.isValidVersion(versionPart)) {
                            versions.push(versionPart);
                            this.logInfo(`  Found version ${versionPart} in ${branch}`);
                        }
                    }
                }
            } else if (targetEnv === 'production') {
                // For production branches, look for prod/x.x.x pattern
                const pattern = 'origin/prod/';
                this.logInfo('Scanning for production branch versions...');
                
                for (const branch of branches) {
                    if (branch.startsWith(pattern) && (branch.match(/\//g) || []).length === 2) {
                        const versionPart = branch.replace(pattern, '');
                        if (this.isValidVersion(versionPart)) {
                            versions.push(versionPart);
                            this.logInfo(`  Found version ${versionPart} in ${branch}`);
                        }
                    }
                }
            }
            
            if (versions.length === 0) {
                this.logInfo(`No versioned branches found for ${targetEnv} - starting from 1.0.0`);
                return '1.0.0';
            }
            
            // Sort versions and return the highest
            versions.sort((a, b) => {
                const aParts = a.split('.').map(Number);
                const bParts = b.split('.').map(Number);
                for (let i = 0; i < 3; i++) {
                    if (aParts[i] !== bParts[i]) {
                        return aParts[i] - bParts[i];
                    }
                }
                return 0;
            });
            
            const highestVersion = versions[versions.length - 1];
            this.logInfo(`Highest version found for ${targetEnv}: ${highestVersion}`);
            return highestVersion;
        } catch (error) {
            this.logWarning(`Error scanning versions for ${targetEnv}: ${error.message}`);
            return '1.0.0';
        }
    }

    isValidVersion(versionStr) {
        const parts = versionStr.split('.');
        if (parts.length !== 3) return false;
        
        for (const part of parts) {
            if (isNaN(parseInt(part))) return false;
        }
        return true;
    }

    bumpVersion(bumpType, currentVersion) {
        const parts = currentVersion.split('.').map(Number);
        let [major, minor, patch] = parts;
        
        switch (bumpType) {
            case 'major':
                major += 1;
                minor = 0;
                patch = 0;
                break;
            case 'minor':
                minor += 1;
                patch = 0;
                break;
            case 'patch':
                patch += 1;
                break;
            default:
                throw new Error(`Invalid bump type: ${bumpType}`);
        }
        
        return `${major}.${minor}.${patch}`;
    }

    async confirmAction(message) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            rl.question(`\n❓ ${message} (y/N): `, (answer) => {
                rl.close();
                resolve(['y', 'yes'].includes(answer.toLowerCase().trim()));
            });
        });
    }

    async createOrCheckoutBranch(branchName, targetEnv, newVersion) {
        const currentBranch = this.getCurrentBranch();
        this.logInfo(`Currently on branch: ${currentBranch}`);
        
        // Check if local branch exists
        let localBranchExists = false;
        try {
            const localBranches = this.runCommand('git branch', { silent: true });
            const cleanLocalBranches = localBranches.split('\n')
                .map(branch => branch.replace('*', '').trim())
                .filter(branch => branch);
            localBranchExists = cleanLocalBranches.includes(branchName);
        } catch (error) {
            this.logWarning('Could not check local branches');
        }
        
        // Check remote branches
        let remoteBranchExists = false;
        try {
            const remoteBranches = this.runCommand('git branch -r', { silent: true });
            const cleanRemoteBranches = remoteBranches.split('\n')
                .map(branch => branch.trim())
                .filter(branch => branch && !branch.includes('->'));
            remoteBranchExists = cleanRemoteBranches.includes(`origin/${branchName}`);
        } catch (error) {
            this.logWarning('Could not check remote branches');
        }
        
        this.logInfo(`Local branch exists: ${localBranchExists}`);
        this.logInfo(`Remote branch exists: ${remoteBranchExists}`);
        
        if (localBranchExists) {
            // Local branch exists, just checkout
            this.runCommand(`git checkout ${branchName}`);
            if (remoteBranchExists) {
                try {
                    this.runCommand(`git pull origin ${branchName}`);
                } catch (error) {
                    this.logWarning(`Could not pull from origin/${branchName}`);
                }
            }
            this.logInfo(`Checked out existing local branch: ${branchName}`);
        } else if (remoteBranchExists) {
            // Remote branch exists but not locally
            this.runCommand(`git checkout -b ${branchName} origin/${branchName}`);
            this.logInfo(`Created local branch tracking origin/${branchName}`);
        } else {
            // Neither local nor remote branch exists
            const config = this.versionConfig[targetEnv] || {};
            const buildInfo = config.optimize ? 'With optimized build' : 
                            config.build ? 'With development build' : 'No build process';
            
            console.log('\n📋 React Deployment Summary:');
            console.log(`   🎯 Target Environment: ${targetEnv}`);
            console.log(`   🌿 New Branch: ${branchName}`);
            console.log(`   📦 Version: ${newVersion}`);
            console.log(`   📍 Source Branch: ${currentBranch}`);
            console.log(`   ⚛️  Build Process: ${buildInfo}`);
            
            const confirmed = await this.confirmAction(`Create new React branch '${branchName}' and deploy version ${newVersion}?`);
            if (!confirmed) {
                this.logWarning('Deployment cancelled by user');
                return false;
            }
            
            // Create new branch
            this.runCommand(`git checkout -b ${branchName}`);
            this.logSuccess(`Created new React branch: ${branchName} from ${currentBranch}`);
        }
        
        return true;
    }

    generateReactChangelog(newVersion, targetEnv, commitMessage = '') {
        const changelogFile = path.join(this.baseDir, 'CHANGELOG.md');
        
        // Read existing content
        let currentContent = '';
        if (fs.existsSync(changelogFile)) {
            currentContent = fs.readFileSync(changelogFile, 'utf8');
        } else {
            currentContent = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
        }
        
        const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
        const dateOnly = new Date().toISOString().slice(0, 10);
        const currentBranch = this.getCurrentBranch();
        
        // Get file changes
        let changedFiles = [];
        try {
            const gitStatus = this.runCommand('git status --porcelain', { silent: true });
            if (gitStatus.trim()) {
                changedFiles = gitStatus.trim().split('\n').map(line => {
                    if (line.trim()) {
                        const status = line.slice(0, 2);
                        const filename = line.slice(3).trim();
                        const action = status.includes('M') ? 'Modified' : 
                                     status.includes('A') ? 'Added' : 
                                     status.includes('D') ? 'Deleted' : 'Changed';
                        return `  - ${action}: \`${filename}\``;
                    }
                    return '';
                }).filter(item => item);
            }
        } catch (error) {
            changedFiles = ['  - Various React components updated'];
        }
        
        // Determine release type and description
        const config = this.versionConfig[targetEnv] || {};
        let releaseType, releaseDescription, branchInfo, buildInfo;
        
        if (targetEnv.startsWith('feature/')) {
            releaseType = '🔧 Feature Development';
            const featureName = targetEnv.replace('feature/', '');
            releaseDescription = `React feature branch for '${featureName}' development (no build)`;
            branchInfo = `feature/${featureName}-${newVersion}`;
            buildInfo = 'No build process (development only)';
        } else if (targetEnv === 'dev') {
            releaseType = '🚀 Development Release';
            releaseDescription = 'React development environment with test build';
            branchInfo = `dev/${newVersion}`;
            buildInfo = 'Development build with source maps enabled';
        } else if (targetEnv === 'production') {
            releaseType = '🎯 Production Release';
            releaseDescription = 'React production deployment with optimized build';
            branchInfo = 'prod';
            buildInfo = 'Optimized production build (minified, no source maps)';
        }
        
        // Get build size info if build directory exists
        let buildInfoDetail = buildInfo;
        if (fs.existsSync(this.buildDir)) {
            try {
                const buildSize = this.getDirSize(this.buildDir);
                const buildSizeMB = (buildSize / (1024 * 1024)).toFixed(2);
                const jsFiles = this.getFilesWithExtension(path.join(this.buildDir, 'static', 'js'), '.js');
                const cssFiles = this.getFilesWithExtension(path.join(this.buildDir, 'static', 'css'), '.css');
                buildInfoDetail += ` (${buildSizeMB} MB, ${jsFiles.length} JS files, ${cssFiles.length} CSS files)`;
            } catch (error) {
                // Ignore errors in build size calculation
            }
        }
        
        const newEntry = `# Changelog

All notable changes to this project will be documented in this file.

## [${newVersion}] - ${dateOnly}

### ${releaseType}

**📋 Release Information:**
- **Environment**: ${targetEnv}
- **Branch**: \`${branchInfo}\`
- **Version**: \`${newVersion}\`
- **Deployment Time**: ${timestamp}
- **Description**: ${releaseDescription}

**📝 Changes Made:**
${commitMessage || `Automated React deployment to ${targetEnv} environment`}

**📁 Files Modified:**
${changedFiles.length > 0 ? changedFiles.join('\n') : '- No file changes detected'}

**🔄 React Build Details:**
- **Build Process**: ${buildInfoDetail}
- **Environment**: ${targetEnv}
- **Optimization**: ${config.optimize ? 'Enabled' : 'Disabled'}
- **Source Maps**: ${config.optimize ? 'Disabled' : 'Enabled'}

**🔄 Deployment Details:**
- **Source Branch**: \`${currentBranch}\`
- **Target Branch**: \`${branchInfo}\`
- **Merge Strategy**: Automatic merge with main branch

**🎯 React Environment Notes:**
${this.getReactEnvironmentNotes(targetEnv)}

---

${currentContent.replace('# Changelog', '').replace('All notable changes to this project will be documented in this file.', '').trim()}
`;
        
        fs.writeFileSync(changelogFile, newEntry, 'utf8');
    }

    getReactEnvironmentNotes(targetEnv) {
        if (targetEnv.startsWith('feature/')) {
            return '- React feature branch for component development and testing\n- No build process (fastest deployment for development)\n- Changes are isolated and will be merged after review\n- Use `npm start` for local development server';
        } else if (targetEnv === 'dev') {
            return '- React development environment with test build\n- Development build includes source maps for debugging\n- Used for integration testing of React components\n- Build artifacts generated for testing purposes';
        } else if (targetEnv === 'production') {
            return '- React production environment with optimized build\n- Minified and optimized build for best performance\n- Source maps disabled for security and performance\n- Ready for end users with optimized bundle size';
        } else {
            return `- React deployment to ${targetEnv} environment\n- See React documentation for environment details`;
        }
    }

    validateProductionVersion(newVersion) {
        const currentProdVersion = this.getHighestBranchVersion('production');
        
        // Special case: If no production branches exist, allow 1.0.0 as first version
        try {
            const remoteBranches = this.runCommand('git branch -r', { silent: true });
            const prodBranchesExist = remoteBranches.split('\n').some(branch => 
                branch.trim().includes('origin/prod'));
            
            if (!prodBranchesExist && newVersion === '1.0.0') {
                this.logInfo('First production deployment - allowing version 1.0.0');
                return true;
            }
        } catch (error) {
            // Ignore error and continue with version comparison
        }
        
        // Compare versions to ensure new version is actually higher
        try {
            const currentParts = currentProdVersion.split('.').map(Number);
            const newParts = newVersion.split('.').map(Number);
            
            // Check if new version is greater than current
            for (let i = 0; i < 3; i++) {
                if (newParts[i] > currentParts[i]) {
                    return true;
                } else if (newParts[i] < currentParts[i]) {
                    return false;
                }
            }
            
            // Versions are equal - not allowed for production (except first deployment)
            return false;
        } catch (error) {
            this.logWarning(`Error comparing versions: ${error.message}`);
            return false;
        }
    }

    enforceProductionVersionIncrement(targetEnv, newVersion) {
        if (targetEnv !== 'production') {
            return true; // Only enforce for production
        }
        
        const currentProdVersion = this.getHighestBranchVersion('production');
        
        this.logInfo('🔍 Production Version Check:');
        this.logInfo(`   Current: ${currentProdVersion}`);
        this.logInfo(`   Proposed: ${newVersion}`);
        
        if (!this.validateProductionVersion(newVersion)) {
            this.logError('❌ PRODUCTION VERSION ERROR!');
            this.logError('   Production version must be incremented for deployment.');
            this.logError(`   Current production version: ${currentProdVersion}`);
            this.logError(`   Proposed version: ${newVersion}`);
            this.logError('');
            this.logError('   📋 To fix this issue:');
            this.logError('   1. Use \'major\', \'minor\', or \'patch\' bump type');
            this.logError(`   2. Ensure the new version is higher than ${currentProdVersion}`);
            this.logError('');
            this.logError('   Examples:');
            this.logError('   node smart-deploy.js production patch "Bug fixes"');
            this.logError('   node smart-deploy.js production minor "New features"');
            this.logError('   node smart-deploy.js production major "Breaking changes"');
            return false;
        }
        
        this.logSuccess(`✅ Production version validation passed: ${currentProdVersion} → ${newVersion}`);
        return true;
    }

    generateComprehensiveCommitMessage(targetEnv, version, commitMessage = '') {
        try {
            // Get changed files with their status
            const gitStatus = this.runCommand('git status --porcelain', { silent: true });
            const changes = gitStatus.trim() ? gitStatus.trim().split('\n') : [];
            
            // Categorize changes by type and file extension
            const fileCategories = {
                react: [],
                frontend: [],
                config: [],
                docs: [],
                tests: [],
                deployment: [],
                other: []
            };
            
            const actionCounts = { modified: 0, added: 0, deleted: 0, renamed: 0 };
            
            for (const change of changes) {
                if (!change.trim()) continue;
                
                const status = change.slice(0, 2);
                const filename = change.slice(3).trim();
                
                // Count actions
                if (status.includes('M')) {
                    actionCounts.modified += 1;
                } else if (status.includes('A')) {
                    actionCounts.added += 1;
                } else if (status.includes('D')) {
                    actionCounts.deleted += 1;
                } else if (status.includes('R')) {
                    actionCounts.renamed += 1;
                }
                
                // Categorize by file type
                if (filename.endsWith('.jsx') || filename.endsWith('.tsx') || 
                    filename.includes('/components/') || filename.includes('/pages/')) {
                    fileCategories.react.push(filename);
                } else if (filename.endsWith('.js') || filename.endsWith('.ts') || 
                         filename.endsWith('.css') || filename.endsWith('.scss') || 
                         filename.endsWith('.html')) {
                    fileCategories.frontend.push(filename);
                } else if (filename.endsWith('.env') || filename.endsWith('.json') || 
                         filename.endsWith('.yml') || filename.endsWith('.yaml') || 
                         filename.endsWith('.config.js')) {
                    fileCategories.config.push(filename);
                } else if (filename.endsWith('.md') || filename.endsWith('.txt')) {
                    fileCategories.docs.push(filename);
                } else if (filename.includes('test') || filename.includes('spec') || 
                         filename.endsWith('.test.js') || filename.endsWith('.spec.js')) {
                    fileCategories.tests.push(filename);
                } else if (['package.json', 'package-lock.json', 'smart-deploy.js', 'Dockerfile'].includes(filename)) {
                    fileCategories.deployment.push(filename);
                } else {
                    fileCategories.other.push(filename);
                }
            }
            
            // Build comprehensive commit message
            const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
            
            // Header with conventional commit format
            const commitType = targetEnv.startsWith('feature/') ? 'feat' : 
                              targetEnv === 'production' ? 'release' : 'deploy';
            let header = `${commitType}(${targetEnv}): Deploy React v${version}`;
            
            if (commitMessage) {
                header += ` - ${commitMessage}`;
            }
            
            // Build detailed body
            const bodyParts = [];
            
            // Summary of changes
            const totalFiles = Object.values(actionCounts).reduce((sum, count) => sum + count, 0);
            if (totalFiles > 0) {
                const changeSummary = [];
                if (actionCounts.modified > 0) changeSummary.push(`${actionCounts.modified} modified`);
                if (actionCounts.added > 0) changeSummary.push(`${actionCounts.added} added`);
                if (actionCounts.deleted > 0) changeSummary.push(`${actionCounts.deleted} deleted`);
                if (actionCounts.renamed > 0) changeSummary.push(`${actionCounts.renamed} renamed`);
                
                bodyParts.push(`📊 Summary: ${changeSummary.join(', ')} files (${totalFiles} total)`);
            }
            
            // File categories
            const iconMap = {
                react: '⚛️',
                frontend: '🎨',
                config: '⚙️',
                docs: '📚',
                tests: '🧪',
                deployment: '🚀',
                other: '📁'
            };
            
            for (const [category, files] of Object.entries(fileCategories)) {
                if (files.length > 0) {
                    const icon = iconMap[category];
                    if (files.length <= 3) {
                        bodyParts.push(`${icon} ${category}: ${files.join(', ')}`);
                    } else {
                        bodyParts.push(`${icon} ${category}: ${files.slice(0, 3).join(', ')} and ${files.length - 3} more`);
                    }
                }
            }
            
            // Deployment details
            bodyParts.push(`🎯 Target: ${targetEnv} environment`);
            bodyParts.push(`📦 Version: ${version}`);
            bodyParts.push(`⏰ Deployed: ${timestamp}`);
            
            // React-specific info
            const config = this.versionConfig[targetEnv] || {};
            if (config.build) {
                const buildType = config.optimize ? 'Optimized production build' : 'Development build';
                bodyParts.push(`⚛️ Build: ${buildType}`);
            } else {
                bodyParts.push('⚛️ Build: No build process (development only)');
            }
            
            // Combine header and body
            let fullMessage = header;
            if (bodyParts.length > 0) {
                fullMessage += '\n\n' + bodyParts.join('\n');
            }
            
            return fullMessage;
        } catch (error) {
            // Fallback to basic message
            return `deploy(${targetEnv}): Deploy React v${version} - ${commitMessage || 'Automated deployment'}`;
        }
    }

    showVersionSummary(targetEnv, currentVersion, newVersion) {
        this.logInfo('');
        this.logInfo(`📊 Version Summary for ${targetEnv.toUpperCase()} deployment:`);
        this.logInfo('   ╭─────────────────────────────────────╮');
        this.logInfo(`   │  Current: ${currentVersion.padEnd(20)} │`);
        this.logInfo(`   │  New:     ${newVersion.padEnd(20)} │`);
        this.logInfo('   ╰─────────────────────────────────────╯');
        
        // Show all current versions for context
        const featureVersion = this.getVersionFromFile('feature');
        const devVersion = this.getVersionFromFile('dev');
        const productionVersion = this.getVersionFromFile('production');
        
        this.logInfo('');
        this.logInfo('📋 All Environment Versions:');
        this.logInfo(`   Feature:    ${featureVersion}`);
        this.logInfo(`   Dev:        ${devVersion}`);
        this.logInfo(`   Production: ${productionVersion}${targetEnv === 'production' ? ' → ' + newVersion : ''}`);
        this.logInfo('');
    }

    checkWorkingDirectory() {
        // Check if git working directory has uncommitted changes without committing them
        try {
            const result = this.runCommand('git status --porcelain', { silent: true });
            if (result.trim()) {
                this.logInfo('Working directory has uncommitted changes that will be included in deployment:');
                console.log(result);
                return true; // Has changes
            }
            return false; // No changes
        } catch (error) {
            this.logWarning('Could not check working directory status');
            return false;
        }
    }

    pushProductionToDev(version) {
        this.logInfo(`Pushing production version ${version} to dev branch with tag...`);
        
        // Get the highest dev version and ALWAYS do a MAJOR version bump for production deployments
        const currentDevVersion = this.getHighestBranchVersion('dev');
        
        // Check if this is the first dev deployment (no versioned dev branches exist)
        let newDevVersion;
        if (currentDevVersion === '1.0.0') {
            // Check if there are actually any dev branches in remote
            try {
                const remoteBranches = this.runCommand('git branch -r', { silent: true });
                const devBranchesExist = remoteBranches.split('\n').some(branch => 
                    branch.trim().includes('origin/dev/'));
                
                if (!devBranchesExist) {
                    // No dev branches exist - start from 1.0.0
                    newDevVersion = '1.0.0';
                    this.logInfo(`No existing dev branches found - starting dev versioning from ${newDevVersion}`);
                } else {
                    // Dev branches exist but we got 1.0.0 as highest - do major bump
                    newDevVersion = this.bumpVersion('major', currentDevVersion);
                    this.logInfo(`Production deployment: MAJOR dev version bump ${currentDevVersion} → ${newDevVersion}`);
                }
            } catch (error) {
                // Error checking branches - start from 1.0.0
                newDevVersion = '1.0.0';
                this.logInfo(`Could not check existing dev branches - starting from ${newDevVersion}`);
            }
        } else {
            // Always do MAJOR version bump for production deployments to dev
            newDevVersion = this.bumpVersion('major', currentDevVersion);
            this.logInfo(`Production deployment: MAJOR dev version bump ${currentDevVersion} → ${newDevVersion}`);
        }
        
        const devBranchName = `dev/${newDevVersion}`;
        
        this.logSuccess(`🎯 Production → Dev: Always performing MAJOR version upgrade`);
        this.logInfo(`Creating new dev branch: ${devBranchName}`);
        
        // Check if the versioned dev branch exists
        const localBranches = this.runCommand('git branch', { silent: true });
        const cleanLocalBranches = localBranches.split('\n')
            .map(branch => branch.replace('*', '').trim())
            .filter(branch => branch);
        const localDevExists = cleanLocalBranches.includes(devBranchName);
        
        // Check remote branches
        const remoteBranches = this.runCommand('git branch -r', { silent: true });
        const cleanRemoteBranches = remoteBranches.split('\n')
            .map(branch => branch.trim())
            .filter(branch => branch && !branch.includes('->'));
        const remoteDevExists = cleanRemoteBranches.includes(`origin/${devBranchName}`);
        
        if (localDevExists) {
            // Local versioned dev branch exists, just checkout
            this.runCommand(`git checkout ${devBranchName}`);
        } else if (remoteDevExists) {
            // Remote versioned dev branch exists but not locally - create local tracking branch
            this.runCommand(`git checkout -b ${devBranchName} origin/${devBranchName}`);
            this.logInfo(`Created local dev branch tracking origin/${devBranchName}`);
        } else {
            // No versioned dev branch exists - create new dev branch from current branch
            const currentBranch = this.getCurrentBranch();
            this.runCommand(`git checkout -b ${devBranchName}`);
            this.logInfo(`Created new versioned dev branch ${devBranchName} from ${currentBranch}`);
        }
        
        // Pull latest dev to avoid conflicts (only if remote branch exists)
        try {
            const remoteBranches = this.runCommand('git branch -r', { silent: true });
            if (remoteBranches.includes(`origin/${devBranchName}`)) {
                this.runCommand(`git pull origin ${devBranchName}`);
            } else {
                this.logInfo(`Remote branch origin/${devBranchName} doesn't exist yet - skipping pull`);
            }
        } catch (error) {
            this.logWarning(`Could not pull from origin/${devBranchName} - continuing...`);
        }
        
        // Check if prod branch exists before trying to merge
        try {
            const remoteBranches = this.runCommand('git branch -r', { silent: true });
            const prodBranchExists = remoteBranches.split('\n').some(branch => 
                branch.trim().includes('origin/prod') && !branch.trim().includes('origin/prod/'));
            
            if (prodBranchExists) {
                // Merge existing prod branch into dev
                try {
                    this.runCommand('git merge prod');
                } catch (error) {
                    // If there are conflicts, resolve them by taking the prod version
                    this.logWarning('Merge conflicts detected. Resolving by taking prod changes...');
                    this.runCommand('git merge -X theirs prod');
                }
            } else {
                // No prod branch exists yet - this is the first production deployment
                this.logInfo('No existing prod branch found - first production deployment, skipping merge');
            }
        } catch (error) {
            this.logWarning(`Error checking for prod branch: ${error.message} - continuing without merge`);
        }
        
        // Create production tag on dev to mark this as a production version
        const productionTag = `prod-${version}`;
        try {
            // Delete tag if it already exists (suppress error output)
            this.runCommand(`git tag -d ${productionTag}`, { silent: true, stdio: 'ignore' });
            this.runCommand(`git push origin --delete ${productionTag}`, { silent: true, stdio: 'ignore' });
        } catch (error) {
            // Tag might not exist, that's fine
        }
        
        // Create new production tag
        this.runCommand(`git tag -a ${productionTag} -m "Production version ${version} deployed to dev"`);
        
        // Update VERSION file with the new dev version
        this.updateVersionInFile('dev', newDevVersion);
        
        // Commit the version update
        this.runCommand('git add .');
        this.runCommand(`git commit -m "update(dev): Bump dev version to ${newDevVersion} for production ${version}"`);
        
        // Push dev branch and tag
        this.runCommand(`git push origin ${devBranchName}`);
        this.runCommand(`git push origin ${productionTag}`);
        
        this.logSuccess(`Pushed production version ${version} to ${devBranchName} branch with tag ${productionTag}`);
    }

    cleanupDeletedRemoteBranches() {
        try {
            this.logInfo('Cleaning up deleted remote branches...');
            
            const currentBranch = this.getCurrentBranch();
            
            // Get all local branches
            const localResult = this.runCommand('git branch', { silent: true });
            const localBranches = [];
            const localLines = localResult.split('\n');
            for (const line of localLines) {
                if (line.trim()) {
                    const branch = line.trim().replace('*', '').trim();
                    if (branch && !['main', 'master'].includes(branch)) {
                        localBranches.push(branch);
                    }
                }
            }
            
            // Get all remote branches
            const remoteResult = this.runCommand('git branch -r', { silent: true });
            const remoteBranches = [];
            const remoteLines = remoteResult.split('\n');
            for (const line of remoteLines) {
                if (line.trim() && !line.includes('->')) {
                    const branch = line.trim().replace('origin/', '');
                    if (branch) {
                        remoteBranches.push(branch);
                    }
                }
            }
            
            // Find local branches that don't exist remotely
            const branchesToDelete = [];
            for (const localBranch of localBranches) {
                if (!remoteBranches.includes(localBranch) && localBranch !== currentBranch) {
                    branchesToDelete.push(localBranch);
                }
            }
            
            // Delete branches that no longer exist remotely
            if (branchesToDelete.length > 0) {
                this.logInfo(`Found ${branchesToDelete.length} local branches to clean up:`);
                for (const branch of branchesToDelete) {
                    this.logInfo(`  - ${branch}`);
                }
                
                for (const branch of branchesToDelete) {
                    try {
                        this.runCommand(`git branch -D ${branch}`, { silent: true });
                        this.logSuccess(`Deleted local branch: ${branch}`);
                    } catch (error) {
                        this.logWarning(`Could not delete branch: ${branch}`);
                    }
                }
            } else {
                this.logInfo('No stale local branches found to clean up');
            }
        } catch (error) {
            this.logWarning(`Branch cleanup failed: ${error.message}`);
        }
    }

    syncWithRemote() {
        this.logInfo('Syncing with remote repository...');
        
        // Fetch all remote branches and tags
        this.runCommand('git fetch --all');
        
        // Prune remote tracking branches that no longer exist
        this.runCommand('git remote prune origin');
        
        // Clean up local branches that no longer exist on remote
        this.cleanupDeletedRemoteBranches();
        
        // Update current branch only if it exists remotely
        const currentBranch = this.getCurrentBranch();
        
        // Check if current branch exists remotely
        const remoteBranches = this.runCommand('git branch -r', { silent: true });
        if (remoteBranches.includes(`origin/${currentBranch}`)) {
            try {
                this.runCommand(`git pull origin ${currentBranch}`);
                this.logInfo(`Updated ${currentBranch} from remote`);
            } catch (error) {
                this.logWarning(`Could not pull from origin/${currentBranch}`);
            }
        } else {
            this.logInfo(`Branch ${currentBranch} doesn't exist remotely - skipping pull`);
        }
    }

    async deploy(targetEnv, bumpType = 'patch', commitMessage = '') {
        this.logInfo(`🚀 Starting React deployment to ${targetEnv} environment`);
        
        // Pre-deployment checks - just check for changes, don't commit them yet
        const hasUncommittedChanges = this.checkWorkingDirectory();
        
        // Check Node dependencies
        this.checkNodeDependencies();

        // Backup current state
        const backupPath = this.backupCurrentState();

        try {
            // Sync with remote first to get latest remote branches
            this.syncWithRemote();
            
            // ALWAYS get current version by scanning remote branches for ALL environment types
            // This ensures we have the true current state, not what's in VERSION file
            let currentVersion;
            if (targetEnv === 'production') {
                currentVersion = this.getHighestBranchVersion('production');
                this.logInfo(`Production version from remote branches: ${currentVersion}`);
            } else if (targetEnv === 'dev') {
                currentVersion = this.getHighestBranchVersion('dev');
                this.logInfo(`Dev version from remote branches: ${currentVersion}`);
            } else {
                // For feature branches
                currentVersion = this.getHighestBranchVersion(targetEnv);
                this.logInfo(`Feature version from remote branches: ${currentVersion}`);
            }
            
            // For first deployment of any branch type, use 1.0.0 as starting point
            // For subsequent deployments, bump the version
            let newVersion;
            if (currentVersion === '1.0.0') {
                // Check if any branches actually exist for this environment type
                try {
                    const remoteBranches = this.runCommand('git branch -r', { silent: true });
                    let branchesExist = false;
                    
                    if (targetEnv.startsWith('feature/')) {
                        branchesExist = remoteBranches.split('\n').some(branch => 
                            branch.trim().includes('origin/feature/'));
                    } else if (targetEnv === 'dev') {
                        branchesExist = remoteBranches.split('\n').some(branch => 
                            branch.trim().includes('origin/dev/'));
                    } else if (targetEnv === 'production') {
                        branchesExist = remoteBranches.split('\n').some(branch => 
                            branch.trim().includes('origin/prod'));
                    }
                    
                    if (!branchesExist) {
                        // No branches exist for this environment type - start from 1.0.0
                        this.logInfo(`No ${targetEnv} branches found remotely - starting from version 1.0.0`);
                        newVersion = '1.0.0';
                    } else {
                        // Branches exist but highest version is 1.0.0 - bump it
                        newVersion = this.bumpVersion(bumpType, currentVersion);
                        this.logInfo(`Found ${targetEnv} branches, bumping from base version: ${currentVersion} → ${newVersion}`);
                    }
                } catch (error) {
                    // Error checking branches - start from 1.0.0
                    this.logInfo(`Could not check existing branches - starting from version 1.0.0`);
                    newVersion = '1.0.0';
                }
            } else {
                // Branch type has existing versions, bump from the highest
                newVersion = this.bumpVersion(bumpType, currentVersion);
                this.logInfo(`Using highest remote version for ${targetEnv} as base: ${currentVersion} → ${newVersion}`);
            }
            
            // PRODUCTION VERSION VALIDATION - Critical safeguard
            if (!this.enforceProductionVersionIncrement(targetEnv, newVersion)) {
                this.logError('🚫 Production deployment blocked due to version validation failure!');
                return false;
            }
            
            // Show comprehensive version summary
            this.showVersionSummary(targetEnv, currentVersion, newVersion);
            
            // Parse target environment and create versioned branch names
            let envType, branchName;
            if (targetEnv.startsWith('feature/')) {
                envType = 'feature';
                const featureName = targetEnv.replace('feature/', '');
                branchName = `feature/${featureName}-${newVersion}`;
            } else if (targetEnv === 'dev') {
                envType = 'dev';
                branchName = `dev/${newVersion}`;
            } else if (targetEnv === 'production') {
                envType = 'production';
                branchName = 'prod'; // Direct push to prod branch (not versioned)
            } else {
                this.logError(`Invalid target environment: ${targetEnv}`);
                return false;
            }
            
            this.logInfo(`Target branch: ${branchName}`);
            this.logInfo(`Version: ${currentVersion} → ${newVersion}`);
            
            // Special handling for production deployments - two-step process
            if (targetEnv === 'production') {
                // Calculate what the dev version will be
                const currentDevVersion = this.getHighestBranchVersion('dev');
                let nextDevVersion;
                try {
                    const remoteBranches = this.runCommand('git branch -r', { silent: true });
                    const devBranchesExist = remoteBranches.split('\n').some(branch => 
                        branch.trim().includes('origin/dev/'));
                    
                    if (currentDevVersion === '1.0.0' && !devBranchesExist) {
                        nextDevVersion = '1.0.0';
                    } else {
                        nextDevVersion = this.bumpVersion('major', currentDevVersion);
                    }
                } catch (error) {
                    nextDevVersion = '1.0.0';
                }
                
                console.log('\n🎯 PRODUCTION DEPLOYMENT - TWO-STEP PROCESS:');
                console.log(`   📦 Production Version: ${currentVersion} → ${newVersion}`);
                console.log(`   🚀 Dev Version: ${currentDevVersion} → ${nextDevVersion} (MAJOR BUMP)`);
                console.log(`   📝 Message: ${commitMessage || 'Automated React production deployment'}`);
                console.log('');
                console.log('   🔄 Process:');
                console.log(`   1️⃣  Create dev/${nextDevVersion} branch first`);
                console.log('   2️⃣  Then create prod branch');
                console.log('');
                
                // STEP 1: Create dev branch first
                console.log('\n🚀 STEP 1: DEV BRANCH CREATION');
                console.log(`   Creating dev/${nextDevVersion} with production tag prod-${newVersion}`);
                
                const confirmed1 = await this.confirmAction(`Create dev/${nextDevVersion} branch first?`);
                if (!confirmed1) {
                    this.logWarning('Production deployment cancelled by user');
                    return false;
                }
                
                // Execute dev branch creation
                this.pushProductionToDev(newVersion);
                this.logSuccess(`✅ Step 1 completed: dev/${nextDevVersion} created with tag prod-${newVersion}`);
                
                // STEP 2: Confirm production branch creation
                console.log('\n🎯 STEP 2: PRODUCTION BRANCH CREATION');
                console.log(`   Now creating production branch: ${branchName}`);
                console.log('   ⚠️  This is the FINAL step for PRODUCTION deployment!');
                
                const confirmed2 = await this.confirmAction('Proceed with PRODUCTION branch creation?');
                if (!confirmed2) {
                    this.logWarning('Production branch creation cancelled by user');
                    this.logInfo('Note: Dev branch was already created and pushed');
                    return false;
                }
            }
            
            // Create/checkout target branch (with user confirmation for new branches)
            const branchCreated = await this.createOrCheckoutBranch(branchName, targetEnv, newVersion);
            if (!branchCreated) {
                return false;
            }
            
            // Update version file for specific branch type and changelog
            const finalCommitMessage = commitMessage || `React v${newVersion}: Deploy to ${targetEnv} environment`;
            this.updateVersionInFile(envType, newVersion);
            
            // Run React build if required for this environment
            const config = this.versionConfig[envType] || {};
            if (config.build) {
                const buildSuccess = this.runReactBuild(envType, config.optimize);
                if (!buildSuccess) {
                    this.logError('React build failed - aborting deployment');
                    return false;
                }
            }
            
            // Generate changelog
            this.generateReactChangelog(newVersion, targetEnv, finalCommitMessage);
            
            // Generate comprehensive commit message
            const comprehensiveCommitMsg = this.generateComprehensiveCommitMessage(targetEnv, newVersion, commitMessage);
            
            // Commit and push changes
            const gitStatus = this.runCommand('git status --porcelain', { silent: true });
            if (gitStatus.trim()) {
                this.runCommand('git add .');
                this.runCommand(`git commit -m "${comprehensiveCommitMsg}"`);
                this.runCommand(`git push origin ${branchName}`);
                this.logSuccess(`Pushed React changes to ${branchName}`);
            }
            
            // Handle special production workflow
            if (targetEnv === 'production') {
                // Dev branch was already created in the two-step confirmation process above
                this.logSuccess(`🏷️  Production version ${newVersion} tagged on dev branch (completed in step 1)`);
            }
            
            // Merge with main if configured (only for features now)
            const mergeTarget = this.gitConfig[envType].mergeWith;
            if (mergeTarget) {
                this.mergeWithMain(branchName);
            }
            
            this.logSuccess(`🎉 Successfully deployed React app to ${targetEnv}!`);
            this.logSuccess(`📦 Version: ${newVersion}`);
            this.logSuccess(`🌿 Branch: ${branchName}`);
            
            if (config.build) {
                const buildType = config.optimize ? 'Optimized' : 'Development';
                this.logSuccess(`⚛️  Build: ${buildType} React build completed`);
            }
            
            if (mergeTarget) {
                this.logSuccess(`🔀 Merged with ${mergeTarget}`);
            }
            
            if (targetEnv === 'production') {
                // Get the actual dev version that was created
                const currentDevVersion = this.getVersionFromFile('dev');
                this.logSuccess('');
                this.logSuccess('🎆 PRODUCTION DEPLOYMENT COMPLETED - TWO-STEP PROCESS:');
                this.logSuccess(`   ✅ Step 1: Dev branch created with MAJOR version bump (${currentDevVersion})`);
                this.logSuccess(`   ✅ Step 2: Production branch created (${newVersion})`);
                this.logSuccess(`   🏷️  Tagged: prod-${newVersion} on dev branch`);
                this.logSuccess('🚀 Both dev and prod branches successfully deployed!');
            }

            return true;

        } catch (error) {
            this.logError(`React deployment failed: ${error.message}`);
            this.logWarning('You may need to manually resolve issues and restore from backup');
            this.logInfo(`Backup location: ${backupPath}`);
            return false;
        }
    }

    mergeWithMain(sourceBranch) {
        this.logInfo(`Merging ${sourceBranch} with main...`);
        
        // Checkout main
        this.runCommand('git checkout main');
        
        // Pull latest main
        this.runCommand('git pull origin main');
        
        // Merge source branch with strategy to favor incoming changes (theirs)
        try {
            this.runCommand(`git merge ${sourceBranch}`);
        } catch (error) {
            // If there are conflicts, resolve them by taking the source branch version
            this.logWarning('Merge conflicts detected. Resolving by taking source branch changes...');
            this.runCommand(`git merge -X theirs ${sourceBranch}`);
        }
        
        // Push updated main
        this.runCommand('git push origin main');
        
        this.logSuccess(`Successfully merged ${sourceBranch} with main`);
    }

    showVersionStatus() {
        // Always check remote branches for accurate version status
        this.logInfo('Checking remote branches for current versions...');
        const featureVersion = this.getHighestBranchVersion('feature/dummy'); // Use dummy feature name to scan all features
        const devVersion = this.getHighestBranchVersion('dev');
        const productionVersion = this.getHighestBranchVersion('production');
        
        console.log('');
        console.log('📊 CURRENT VERSION STATUS');
        console.log('╭─────────────────────────────────────╮');
        console.log('│                                     │');
        console.log(`│  🔧 Feature:    ${featureVersion.padEnd(16)}     │`);
        console.log(`│  🚀 Dev:        ${devVersion.padEnd(16)}     │`);
        console.log(`│  🎯 Production: ${productionVersion.padEnd(16)}     │`);
        console.log('│                                     │');
        console.log('╰─────────────────────────────────────╯');
        console.log('');
        
        // Show what the next versions would be for each bump type
        console.log('🔮 NEXT PRODUCTION VERSIONS:');
        try {
            const nextPatch = this.bumpVersion('patch', productionVersion);
            const nextMinor = this.bumpVersion('minor', productionVersion);
            const nextMajor = this.bumpVersion('major', productionVersion);
            
            console.log(`   📌 Patch:  ${productionVersion} → ${nextPatch}`);
            console.log(`   🆕 Minor:  ${productionVersion} → ${nextMinor}`);
            console.log(`   💥 Major:  ${productionVersion} → ${nextMajor}`);
        } catch (error) {
            console.log(`   ❌ Error calculating next versions: ${error.message}`);
        }
        
        console.log('');
        console.log('💡 PRODUCTION DEPLOYMENT EXAMPLES:');
        console.log('   node smart-deploy.js production patch "Bug fixes"');
        console.log('   node smart-deploy.js production minor "New features"');
        console.log('   node smart-deploy.js production major "Breaking changes"');
        console.log('');
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.log('Usage: node smart-deploy.js <environment> [bump-type] [commit-message]');
        console.log('Examples:');
        console.log('  node smart-deploy.js feature/auth patch "Add authentication"');
        console.log('  node smart-deploy.js dev minor "New components"');
        console.log('  node smart-deploy.js production major "Major release"');
        console.log('  node smart-deploy.js status  # Show version status');
        process.exit(1);
    }

    // Check for special commands
    if (['status', 'version', '--status', '--version'].includes(args[0])) {
        const deployer = new ReactSmartDeployer();
        deployer.showVersionStatus();
        process.exit(0);
    }

    const targetEnv = args[0];
    const bumpType = args[1] || 'patch';
    const commitMessage = args.slice(2).join(' ');

    // Validate bump type
    const validBumpTypes = ['major', 'minor', 'patch'];
    if (!validBumpTypes.includes(bumpType)) {
        console.log(`❌ Invalid bump type: ${bumpType}`);
        console.log(`Valid types: ${validBumpTypes.join(', ')}`);
        process.exit(1);
    }

    // Validate target environment
    const validEnvs = ['production', 'dev'];
    if (!validEnvs.includes(targetEnv) && !targetEnv.startsWith('feature/')) {
        console.log(`❌ Invalid target environment: ${targetEnv}`);
        console.log(`Valid environments: ${validEnvs.join(', ')}, feature/name`);
        process.exit(1);
    }

    // Initialize deployer and run deployment
    const deployer = new ReactSmartDeployer();
    const success = await deployer.deploy(targetEnv, bumpType, commitMessage);
    
    if (!success) {
        process.exit(1);
    }
}

// Only run main if this script is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Deployment failed:', error.message);
        process.exit(1);
    });
}

module.exports = ReactSmartDeployer;
