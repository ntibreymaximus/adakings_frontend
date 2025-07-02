#!/usr/bin/env node
/**
 * Smart Deployment Script for Adakings Frontend React App - Branch-Specific Versioning
 * Manages deployments with independent version tracking for feature, dev, and production branches
 * 
 * Features:
 * - Branch-Specific Versioning: Independent version sequences for each branch type
 * - Multi-Version Tracking: VERSION file maintains separate versions for feature/dev/production
 * - Smart First Deployment: Automatically uses 1.0.0 for first deployment of each branch type
 * - Remote Version Detection: Scans branch-specific remote versions for highest version
 * - Intelligent Version Bumping: Automatic major.minor.patch increments per branch type
 * - React Build Integration: Automatic npm run build for production deployments
 * - Atomic Commit Handling: Includes uncommitted changes in deployment commit
 * - Comprehensive Logging: Detailed deployment history and changelogs
 * - Clean Git Workflow: Creates new branches and commits all changes together
 * - Branch Management: Creates, merges, and manages git branches with user confirmation
 * 
 * Usage:
 *     npm run deploy:production [major|minor|patch] ["commit message"]
 *     npm run deploy:dev [major|minor|patch] ["commit message"]
 *     npm run deploy:feature feature-name [major|minor|patch] ["commit message"]
 *     
 * Examples:
 *     # Feature deployment - continuous versioning across all features
 *     npm run deploy:feature auth patch "Add authentication components"
 *     # Result: feature/auth-1.0.0 (first feature)
 *     
 *     # Dev deployment - independent dev versioning with build
 *     npm run deploy:dev minor "New UI components"
 *     # Result: dev/1.1.0 (builds app for testing)
 *     
 *     # Production deployment - independent production versioning with optimized build
 *     npm run deploy:production major "Production release"
 *     # Result: prod/2.0.0 (optimized production build)
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
                mergeWith: 'main',
                description: 'Production release with optimized build'
            },
            'dev': {
                targetBranch: 'dev',
                mergeWith: 'main',
                description: 'Development release with test build'
            },
            'feature': {
                targetBranch: null, // Will be set dynamically
                mergeWith: 'main',
                description: 'Feature branch development'
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

    async deploy(targetEnv, bumpType = 'patch', commitMessage = '') {
        this.logInfo(`🚀 Starting React deployment to ${targetEnv} environment`);
        
        // Check Node dependencies
        this.checkNodeDependencies();

        // Backup current state
        const backupPath = this.backupCurrentState();

        try {
            // Sync with remote first
            this.runCommand('git fetch --all');
            
            // Get the highest version for the specific branch type
            const currentVersion = this.getHighestBranchVersion(targetEnv);
            
            // For first deployment, use 1.0.0, otherwise bump
            let newVersion;
            if (currentVersion === '1.0.0') {
                this.logInfo(`First React deployment for ${targetEnv} - using version 1.0.0`);
                newVersion = '1.0.0';
            } else {
                this.logInfo(`Using highest version for ${targetEnv} as base: ${currentVersion}`);
                newVersion = this.bumpVersion(bumpType, currentVersion);
            }
            
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
                branchName = `prod/${newVersion}`;
            } else {
                this.logError(`Invalid target environment: ${targetEnv}`);
                return false;
            }
            
            this.logInfo(`Target branch: ${branchName}`);
            this.logInfo(`Version: ${currentVersion} → ${newVersion}`);

            // Create/checkout target branch
            const branchCreated = await this.createOrCheckoutBranch(branchName, targetEnv, newVersion);
            if (!branchCreated) {
                return false;
            }

            // Update version files
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
            
            // Commit and push changes
            const gitStatus = this.runCommand('git status --porcelain', { silent: true });
            if (gitStatus.trim()) {
                this.runCommand('git add .');
                
                const commitMsg = `feat(${targetEnv}): Deploy React v${newVersion} - ${commitMessage || 'Automated deployment'}`;
                this.runCommand(`git commit -m "${commitMsg}"`);
                this.runCommand(`git push origin ${branchName}`);
                this.logSuccess(`Pushed React changes to ${branchName}`);
            }

            // Merge with main
            const mergeTarget = this.gitConfig[envType].mergeWith;
            if (mergeTarget) {
                this.runCommand(`git checkout ${mergeTarget}`);
                this.runCommand(`git pull origin ${mergeTarget}`);
                this.runCommand(`git merge ${branchName}`);
                this.runCommand(`git push origin ${mergeTarget}`);
                this.logSuccess(`Successfully merged ${branchName} with ${mergeTarget}`);
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

            return true;

        } catch (error) {
            this.logError(`React deployment failed: ${error.message}`);
            this.logWarning('You may need to manually resolve issues and restore from backup');
            this.logInfo(`Backup location: ${backupPath}`);
            return false;
        }
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
        process.exit(1);
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
