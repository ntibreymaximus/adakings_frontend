#!/usr/bin/env node
/**
 * Smart Deployment Script for Adakings Frontend React App - Enhanced Branch-Specific Versioning
 * Manages deployments with independent version tracking for feature, dev, and production branches
 * 
 * Features:
 * - Branch-Specific Versioning: Independent version sequences for each branch type
 * - Multi-Version Tracking: VERSION file maintains separate versions for feature/dev/production
 * - Smart Git Workflow: Enhanced workflows with continuous integration branches
 * - Dev Workflow: dev/x.x.x + devtest branch (similar to backend)
 * - Production Workflow: prod/x.x.x + live branch (similar to backend)
 * - React Build Integration: Automatic npm run build for production/dev deployments
 * - Atomic Commit Handling: Includes uncommitted changes in deployment commit
 * - Comprehensive Logging: Detailed deployment history and changelogs
 * - Clean Git Workflow: Creates new branches and commits all changes together
 * - Branch Management: Creates, merges, and manages git branches with user confirmation
 * 
 * Usage:
 *     node smart-deploy.js production [major|minor|patch] ["commit message"]
 *     node smart-deploy.js dev [major|minor|patch] ["commit message"]
 *     node smart-deploy.js feature/name [major|minor|patch] ["commit message"]
 *     node smart-deploy.js status
 *     
 * Examples:
 *     # Feature deployment - continuous versioning across all features
 *     node smart-deploy.js feature/auth patch "Add authentication components"
 *     # Result: feature/auth-x.x.x + merges with main
 *     
 *     # Dev deployment - independent dev versioning with devtest branch
 *     node smart-deploy.js dev minor "New UI components"
 *     # Result: dev/x.x.x + updates devtest branch
 *     
 *     # Production deployment - independent production versioning with live branch
 *     node smart-deploy.js production major "Production release"
 *     # Result: prod/x.x.x + updates live branch
 * 
 * Git Workflow:
 * - Feature deployments: Push to feature/name-x.x.x, then merge with main
 * - Dev deployments: Push to dev/x.x.x and create/update devtest branch (no merge with main)
 * - Production deployments: Push to prod/x.x.x and create/update live branch (no merge with main)
 * 
 * Branch Versioning Strategy:
 * Each environment maintains its own versioned branches:
 * - Feature: feature/name-x.x.x (merged with main)
 * - Dev: dev/x.x.x (updates devtest branch)
 * - Production: prod/x.x.x (updates live branch)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

class ReactSmartDeployer {
    constructor() {
        this.baseDir = process.cwd();
        this.backupDir = path.join(this.baseDir, '.deploy_backup');
        this.versionFile = path.join(this.baseDir, 'VERSION');
        this.packageJsonFile = path.join(this.baseDir, 'package.json');
        this.buildDir = path.join(this.baseDir, 'build');
        
        // React-specific version tracking with enhanced workflow
        this.versionConfig = {
            'production': { file: 'VERSION', initial: '1.0.0', build: true, optimize: true },
            'dev': { file: 'VERSION', initial: '1.0.0', build: true, optimize: false },
            'feature': { file: 'VERSION', initial: '1.0.0', build: false, optimize: false }
        };
        
        // Enhanced Git workflow configuration for React frontend
        this.gitConfig = {
            'production': {
                targetBranch: 'prod',
                mergeWith: null, // Production pushes to prod branch and updates live
                description: 'Production release with live branch update'
            },
            'dev': {
                targetBranch: 'dev',
                mergeWith: null, // Dev pushes to dev branch and updates devtest
                description: 'Development release with devtest branch update'
            },
            'feature': {
                targetBranch: null, // Will be set dynamically
                mergeWith: 'main', // Feature branches merge with main after push
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

    backupCurrentState() {
        this.logInfo('Creating backup of current state...');
        
        const backupTime = new Date().toISOString().replace(/[:.]/g, '_').slice(0, 19);
        const currentBackup = path.join(this.backupDir, `backup_${backupTime}`);
        
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
        
        fs.mkdirSync(currentBackup, { recursive: true });
        
        // Backup key files
        const keyFiles = ['.env', 'VERSION', 'CHANGELOG.md', 'package.json'];
        for (const file of keyFiles) {
            const filePath = path.join(this.baseDir, file);
            if (fs.existsSync(filePath)) {
                fs.copyFileSync(filePath, path.join(currentBackup, file));
            }
        }
        
        this.logSuccess(`Backup created at: ${currentBackup}`);
        return currentBackup;
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

    cleanupDeletedRemoteBranches() {
        try {
            this.logInfo('Cleaning up deleted remote branches...');
            
            // Get current branch to avoid deleting it
            const currentBranch = this.getCurrentBranch();
            
            // Get all local branches
            const localResult = this.runCommand('git branch', { silent: true });
            const localBranches = [];
            for (const line of localResult.split('\n')) {
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
            for (const line of remoteResult.split('\n')) {
                if (line.trim() && !line.includes('->')) {
                    // Extract branch name from origin/branch-name
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
                        // Force delete the branch
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

    getVersionFromFile(branchType) {
        if (!fs.existsSync(this.versionFile)) {
            return '1.0.0';
        }
        
        try {
            const content = fs.readFileSync(this.versionFile, 'utf8').trim();
            
            // Handle legacy single version format
            if (!content.includes('\n') && !content.includes('feature=') && !content.includes('dev=') && !content.includes('production=')) {
                // Legacy format - return the single version for any branch type
                return content;
            }
            
            // Parse new multi-branch format
            const versions = {
                'feature': '1.0.0',
                'dev': '1.0.0', 
                'production': '1.0.0'
            };
            
            for (const line of content.split('\n')) {
                if (line.includes('=')) {
                    const [key, value] = line.split('=', 2);
                    const cleanKey = key.trim();
                    const cleanValue = value.trim();
                    if (cleanKey in versions) {
                        versions[cleanKey] = cleanValue;
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
        const versionContent = `feature=${currentVersions['feature']}
dev=${currentVersions['dev']}
production=${currentVersions['production']}`;
        
        fs.writeFileSync(this.versionFile, versionContent, 'utf8');
        this.logSuccess(`Updated VERSION file - ${branchType}: ${newVersion}`);
        
        // Also log the complete state
        this.logInfo('VERSION file now contains:');
        this.logInfo(`  feature=${currentVersions['feature']}`);
        this.logInfo(`  dev=${currentVersions['dev']}`);
        this.logInfo(`  production=${currentVersions['production']}`);
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

    getHighestBranchVersion(targetEnv) {
        try {
            // Get all remote branches
            const remoteBranches = this.runCommand('git branch -r', { silent: true });
            const branches = remoteBranches.split('\n')
                .map(branch => branch.trim())
                .filter(branch => branch && !branch.includes('->'));
            
            const versions = [];
            
            if (targetEnv.startsWith('feature/')) {
                // For feature branches, look for ALL feature branch versions (continuous across all features)
                const pattern = 'origin/feature/';
                this.logInfo('Scanning for all feature branch versions...');
                
                for (const branch of branches) {
                    if (branch.startsWith(pattern) && branch.includes('-')) {
                        // Extract version from feature/name-x.x.x pattern
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
        let size = 0;
        try {
            const files = fs.readdirSync(dirPath);
            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stats = fs.statSync(filePath);
                if (stats.isDirectory()) {
                    size += this.getDirSize(filePath);
                } else {
                    size += stats.size;
                }
            }
        } catch (error) {
            // Ignore errors
        }
        return size;
    }

    getFilesWithExtension(dirPath, extension) {
        const files = [];
        try {
            if (fs.existsSync(dirPath)) {
                const dirFiles = fs.readdirSync(dirPath);
                for (const file of dirFiles) {
                    if (file.endsWith(extension)) {
                        files.push(file);
                    }
                }
            }
        } catch (error) {
            // Ignore errors
        }
        return files;
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

    // NEW: Create or update devtest branch (similar to backend)
    async createOrUpdateDevtestBranch(newVersion, commitMessage) {
        this.logInfo(`🧪 Managing devtest branch for dev version ${newVersion}...`);
        
        // The current branch should be the versioned dev branch: dev/{new_version}
        const currentDevBranch = `dev/${newVersion}`;
        const currentBranch = this.getCurrentBranch();
        
        // Verify we're on the correct dev branch
        if (currentBranch !== currentDevBranch) {
            this.logWarning(`Expected to be on ${currentDevBranch}, but currently on ${currentBranch}`);
            // Checkout the correct dev branch
            this.runCommand(`git checkout ${currentDevBranch}`);
        }
        
        this.logInfo(`Working from versioned dev branch: ${currentBranch}`);
        
        // Check if devtest branch exists locally
        const localBranches = this.runCommand('git branch', { silent: true });
        const cleanLocalBranches = localBranches.split('\n')
            .map(branch => branch.replace('*', '').trim())
            .filter(branch => branch);
        const localDevtestExists = cleanLocalBranches.includes('devtest');
        
        // Check if devtest branch exists remotely
        const remoteBranches = this.runCommand('git branch -r', { silent: true });
        const cleanRemoteBranches = remoteBranches.split('\n')
            .map(branch => branch.trim())
            .filter(branch => branch && !branch.includes('->'));
        const remoteDevtestExists = cleanRemoteBranches.includes('origin/devtest');
        
        this.logInfo(`Local devtest exists: ${localDevtestExists}`);
        this.logInfo(`Remote devtest exists: ${remoteDevtestExists}`);
        
        if (localDevtestExists) {
            // Local devtest exists, checkout and update
            this.runCommand('git checkout devtest');
            if (remoteDevtestExists) {
                // Pull latest changes from remote
                try {
                    this.runCommand('git pull origin devtest');
                    this.logInfo('Updated local devtest with remote changes');
                } catch (error) {
                    this.logWarning('Could not pull from origin/devtest - continuing...');
                }
            }
        } else if (remoteDevtestExists) {
            // Remote devtest exists but not locally - create local tracking branch
            this.runCommand('git checkout -b devtest origin/devtest');
            this.logInfo('Created local devtest branch tracking origin/devtest');
        } else {
            // No devtest branch exists - create new one from the versioned dev branch
            this.runCommand(`git checkout -b devtest ${currentDevBranch}`);
            this.logInfo(`Created new devtest branch from ${currentDevBranch}`);
        }
        
        // Merge the versioned dev branch changes into devtest
        try {
            this.runCommand(`git merge ${currentDevBranch}`);
            this.logInfo(`Merged ${currentDevBranch} into devtest`);
        } catch (error) {
            // If there are conflicts, resolve them by taking the dev branch version
            this.logWarning('Merge conflicts detected. Resolving by taking dev branch changes...');
            this.runCommand(`git merge -X theirs ${currentDevBranch}`);
            this.logInfo(`Resolved conflicts by taking ${currentDevBranch} changes`);
        }
        
        // Check if there are any changes to commit
        const statusResult = this.runCommand('git status --porcelain', { silent: true });
        
        if (statusResult.trim()) {
            // Add and commit any remaining changes
            this.runCommand('git add .');
            const devtestCommitMsg = `test(devtest): Update devtest with dev/${newVersion} changes - ${commitMessage || 'Dev deployment'}`;
            this.runCommand(`git commit -m "${devtestCommitMsg}"`);
            this.logInfo('Committed additional changes to devtest');
        }
        
        // Push devtest branch
        this.runCommand('git push origin devtest');
        this.logSuccess(`✅ Devtest branch updated and pushed with dev/${newVersion} changes`);
        
        // Return to the versioned dev branch
        this.runCommand(`git checkout ${currentDevBranch}`);
        this.logInfo(`Returned to ${currentDevBranch}`);
    }

    // NEW: Create or update live branch (similar to backend)
    async createOrUpdateLiveBranch(newVersion, commitMessage) {
        this.logInfo(`🔴 Managing live branch for production version ${newVersion}...`);
        
        // The current branch should be the versioned prod branch: prod/{new_version}
        const currentProdBranch = `prod/${newVersion}`;
        const currentBranch = this.getCurrentBranch();
        
        // Verify we're on the correct prod branch
        if (currentBranch !== currentProdBranch) {
            this.logWarning(`Expected to be on ${currentProdBranch}, but currently on ${currentBranch}`);
            // Checkout the correct prod branch
            this.runCommand(`git checkout ${currentProdBranch}`);
        }
        
        this.logInfo(`Working from versioned prod branch: ${currentBranch}`);
        
        // Check if live branch exists locally
        const localBranches = this.runCommand('git branch', { silent: true });
        const cleanLocalBranches = localBranches.split('\n')
            .map(branch => branch.replace('*', '').trim())
            .filter(branch => branch);
        const localLiveExists = cleanLocalBranches.includes('live');
        
        // Check if live branch exists remotely
        const remoteBranches = this.runCommand('git branch -r', { silent: true });
        const cleanRemoteBranches = remoteBranches.split('\n')
            .map(branch => branch.trim())
            .filter(branch => branch && !branch.includes('->'));
        const remoteLiveExists = cleanRemoteBranches.includes('origin/live');
        
        this.logInfo(`Local live exists: ${localLiveExists}`);
        this.logInfo(`Remote live exists: ${remoteLiveExists}`);
        
        if (localLiveExists) {
            // Local live exists, checkout and update
            this.runCommand('git checkout live');
            if (remoteLiveExists) {
                // Pull latest changes from remote
                try {
                    this.runCommand('git pull origin live');
                    this.logInfo('Updated local live with remote changes');
                } catch (error) {
                    this.logWarning('Could not pull from origin/live - continuing...');
                }
            }
        } else if (remoteLiveExists) {
            // Remote live exists but not locally - create local tracking branch
            this.runCommand('git checkout -b live origin/live');
            this.logInfo('Created local live branch tracking origin/live');
        } else {
            // No live branch exists - create new one from the versioned prod branch
            this.runCommand(`git checkout -b live ${currentProdBranch}`);
            this.logInfo(`Created new live branch from ${currentProdBranch}`);
        }
        
        // Merge the versioned prod branch changes into live
        try {
            this.runCommand(`git merge ${currentProdBranch}`);
            this.logInfo(`Merged ${currentProdBranch} into live`);
        } catch (error) {
            // If there are conflicts, resolve them by taking the prod branch version
            this.logWarning('Merge conflicts detected. Resolving by taking prod branch changes...');
            this.runCommand(`git merge -X theirs ${currentProdBranch}`);
            this.logInfo(`Resolved conflicts by taking ${currentProdBranch} changes`);
        }
        
        // Check if there are any changes to commit
        const statusResult = this.runCommand('git status --porcelain', { silent: true });
        
        if (statusResult.trim()) {
            // Add and commit any remaining changes
            this.runCommand('git add .');
            const liveCommitMsg = `deploy(live): Update live with prod/${newVersion} changes - ${commitMessage || 'Production deployment'}`;
            this.runCommand(`git commit -m "${liveCommitMsg}"`);
            this.logInfo('Committed additional changes to live');
        }
        
        // Push live branch
        this.runCommand('git push origin live');
        this.logSuccess(`✅ Live branch updated and pushed with prod/${newVersion} changes`);
        
        // Return to the versioned prod branch
        this.runCommand(`git checkout ${currentProdBranch}`);
        this.logInfo(`Returned to ${currentProdBranch}`);
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
            releaseDescription = `Feature branch for '${featureName}' development`;
            branchInfo = `feature/${featureName}-${newVersion}`;
            buildInfo = 'No build process';
        } else if (targetEnv === 'dev') {
            releaseType = '🚀 Development Release';
            releaseDescription = 'Development environment deployment with latest React components';
            branchInfo = `dev/${newVersion}`;
            buildInfo = config.build ? 'Development build with source maps' : 'No build process';
        } else if (targetEnv === 'production') {
            releaseType = '🎯 Production Release';
            releaseDescription = 'Production deployment - optimized React build';
            branchInfo = `prod/${newVersion}`;
            buildInfo = config.optimize ? 'Optimized production build' : 'Standard build';
        }
        
        // Build comprehensive changelog entry
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

**🔄 Deployment Details:**
- **Source Branch**: \`${currentBranch}\`
- **Target Branch**: \`${branchInfo}\`
- **Build Process**: ${buildInfo}
- **React Version**: Latest

**🎯 Environment Specific Notes:**
${this.getEnvironmentNotes(targetEnv)}

---

${currentContent.replace('# Changelog', '').replace('All notable changes to this project will be documented in this file.', '').trim()}`;
        
        // Write updated changelog
        fs.writeFileSync(changelogFile, newEntry, 'utf8');
    }

    getEnvironmentNotes(targetEnv) {
        if (targetEnv.startsWith('feature/')) {
            return '- This is a feature branch deployment for development and testing\n- Changes are isolated and will be merged after review\n- Not suitable for production use';
        } else if (targetEnv === 'dev') {
            return '- Development environment deployment\n- Contains latest React components and changes\n- Used for integration testing before production\n- Devtest branch updated for continuous testing';
        } else if (targetEnv === 'production') {
            return '- Production environment deployment\n- Optimized React build for performance\n- Ready for end users\n- Live branch updated for continuous deployment';
        } else {
            return `- Deployment to ${targetEnv} environment\n- See deployment documentation for environment details`;
        }
    }

    generateComprehensiveCommitMessage(targetEnv, version, commitMessage = '') {
        try {
            // Get changed files with their status
            const result = this.runCommand('git status --porcelain', { silent: true });
            const changes = result.trim() ? result.trim().split('\n') : [];
            
            // Categorize changes by type and file extension
            const fileCategories = {
                'components': [],
                'styles': [],
                'config': [],
                'docs': [],
                'tests': [],
                'build': [],
                'other': []
            };
            
            const actionCounts = { modified: 0, added: 0, deleted: 0, renamed: 0 };
            
            for (const change of changes) {
                if (!change.trim()) continue;
                
                const status = change.slice(0, 2);
                const filename = change.slice(3).trim();
                
                // Count actions
                if (status.includes('M')) actionCounts.modified++;
                else if (status.includes('A')) actionCounts.added++;
                else if (status.includes('D')) actionCounts.deleted++;
                else if (status.includes('R')) actionCounts.renamed++;
                
                // Categorize by file type
                if (filename.match(/\.(js|jsx|ts|tsx)$/)) {
                    fileCategories.components.push(filename);
                } else if (filename.match(/\.(css|scss|less|sass)$/)) {
                    fileCategories.styles.push(filename);
                } else if (filename.match(/\.(json|env|config)$/) || filename.includes('package')) {
                    fileCategories.config.push(filename);
                } else if (filename.match(/\.(md|txt|pdf)$/)) {
                    fileCategories.docs.push(filename);
                } else if (filename.includes('test') || filename.includes('spec')) {
                    fileCategories.tests.push(filename);
                } else if (filename.includes('build') || filename === 'public' || filename.includes('dist')) {
                    fileCategories.build.push(filename);
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
            const totalFiles = Object.values(actionCounts).reduce((a, b) => a + b, 0);
            if (totalFiles > 0) {
                const changeSummary = [];
                if (actionCounts.modified > 0) changeSummary.push(`${actionCounts.modified} modified`);
                if (actionCounts.added > 0) changeSummary.push(`${actionCounts.added} added`);
                if (actionCounts.deleted > 0) changeSummary.push(`${actionCounts.deleted} deleted`);
                if (actionCounts.renamed > 0) changeSummary.push(`${actionCounts.renamed} renamed`);
                
                bodyParts.push(`📊 Summary: ${changeSummary.join(', ')} files (${totalFiles} total)`);
            }
            
            // File categories
            for (const [category, files] of Object.entries(fileCategories)) {
                if (files.length > 0) {
                    const icons = {
                        'components': '⚛️',
                        'styles': '🎨',
                        'config': '⚙️',
                        'docs': '📚',
                        'tests': '🧪',
                        'build': '📦',
                        'other': '📁'
                    };
                    const icon = icons[category];
                    
                    if (files.length <= 3) {
                        bodyParts.push(`${icon} ${category.charAt(0).toUpperCase() + category.slice(1)}: ${files.join(', ')}`);
                    } else {
                        bodyParts.push(`${icon} ${category.charAt(0).toUpperCase() + category.slice(1)}: ${files.slice(0, 3).join(', ')} and ${files.length - 3} more`);
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
                const buildType = config.optimize ? 'Production' : 'Development';
                bodyParts.push(`⚛️  Build: ${buildType} React build`);
            }
            
            // Combine header and body
            let fullMessage = header;
            if (bodyParts.length > 0) {
                fullMessage += '\n\n' + bodyParts.join('\n');
            }
            
            return fullMessage;
            
        } catch (error) {
            // Fallback to basic message
            return `${targetEnv.startsWith('feature/') ? 'feat' : 'deploy'}(${targetEnv}): Deploy React v${version} - ${commitMessage || 'Automated deployment'}`;
        }
    }

    validateProductionVersion(newVersion) {
        const currentProdVersion = this.getHighestBranchVersion('production');
        
        // Special case: If no production branches exist, allow 1.0.0 as first version
        try {
            const remoteBranches = this.runCommand('git branch -r', { silent: true });
            const prodBranchesExist = remoteBranches.split('\n').some(branch => 
                branch.trim().includes('origin/prod/'));
            
            if (!prodBranchesExist && newVersion === '1.0.0') {
                this.logInfo('First production deployment - allowing version 1.0.0');
                return true;
            }
        } catch (error) {
            // Continue with normal validation
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
            this.logError('   ');
            this.logError('   📋 To fix this issue:');
            this.logError('   1. Use \'major\', \'minor\', or \'patch\' bump type');
            this.logError(`   2. Ensure the new version is higher than ${currentProdVersion}`);
            this.logError('   ');
            this.logError('   Examples:');
            this.logError('   node smart-deploy.js production patch "Bug fixes"');
            this.logError('   node smart-deploy.js production minor "New features"');
            this.logError('   node smart-deploy.js production major "Breaking changes"');
            return false;
        }
        
        this.logSuccess(`✅ Production version validation passed: ${currentProdVersion} → ${newVersion}`);
        return true;
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

    async deploy(targetEnv, bumpType, commitMessage = '') {
        this.logInfo(`🚀 Starting React deployment to ${targetEnv} environment`);
        
        // Pre-deployment checks
        const gitStatus = this.runCommand('git status --porcelain', { silent: true });
        if (gitStatus.trim()) {
            this.logInfo('Working directory has uncommitted changes that will be included in deployment:');
            console.log(gitStatus);
        }

        // Backup current state
        const backupPath = this.backupCurrentState();

        try {
            // Check Node dependencies
            this.checkNodeDependencies();
            
            // Sync with remote first to get latest remote branches
            this.syncWithRemote();
            
            // ALWAYS get current version by scanning remote branches for ALL environment types
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
                            branch.trim().includes('origin/prod/'));
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
                    this.logInfo('Could not check existing branches - starting from version 1.0.0');
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
                branchName = `prod/${newVersion}`; // NEW: Versioned prod branch
            } else {
                this.logError(`Invalid target environment: ${targetEnv}`);
                return false;
            }
            
            this.logInfo(`Target branch: ${branchName}`);
            this.logInfo(`Version: ${currentVersion} → ${newVersion}`);

            // Production deployment - simplified single-step process with versioned branches
            if (targetEnv === 'production') {
                console.log('\n🎯 PRODUCTION DEPLOYMENT:');
                console.log(`   📦 Production Version: ${currentVersion} → ${newVersion}`);
                console.log(`   🌿 Branch: ${branchName}`);
                console.log(`   🔴 Live Branch: Will be updated with production changes`);
                console.log(`   📝 Message: ${commitMessage || 'Automated React production deployment'}`);
                console.log('');
                
                const confirmed = await this.confirmAction(`Create production branch ${branchName} and update live branch?`);
                if (!confirmed) {
                    this.logWarning('Production deployment cancelled by user');
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
            this.updatePackageJsonVersion(newVersion);
            
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
            const statusResult = this.runCommand('git status --porcelain', { silent: true });
            if (statusResult.trim()) {
                this.runCommand('git add .');
                this.runCommand(`git commit -m "${comprehensiveCommitMsg}"`);
                this.runCommand(`git push origin ${branchName}`);
                this.logSuccess(`Pushed React changes to ${branchName}`);
            }
            
            // Handle special dev workflow - create/update devtest branch
            if (targetEnv === 'dev') {
                this.logInfo('\n🧪 DEV DEPLOYMENT - DEVTEST BRANCH MANAGEMENT');
                this.logInfo(`   Creating/updating devtest branch with dev/${newVersion} changes`);
                await this.createOrUpdateDevtestBranch(newVersion, commitMessage);
            }

            // Handle special production workflow - create/update live branch
            if (targetEnv === 'production') {
                this.logInfo('\n🔴 PRODUCTION DEPLOYMENT - LIVE BRANCH MANAGEMENT');
                this.logInfo(`   Creating/updating live branch with prod/${newVersion} changes`);
                await this.createOrUpdateLiveBranch(newVersion, commitMessage);
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
            
            if (targetEnv === 'dev') {
                this.logSuccess('');
                this.logSuccess('🧪 DEV DEPLOYMENT COMPLETED:');
                this.logSuccess(`   ✅ Dev branch created: dev/${newVersion}`);
                this.logSuccess('   ✅ Devtest branch updated with latest changes');
                this.logSuccess('🚀 Both dev and devtest branches successfully deployed!');
            } else if (targetEnv === 'production') {
                this.logSuccess('');
                this.logSuccess('🎆 PRODUCTION DEPLOYMENT COMPLETED:');
                this.logSuccess(`   ✅ Production branch created: prod/${newVersion}`);
                this.logSuccess('   ✅ Live branch updated with latest changes');
                this.logSuccess('🚀 Both prod and live branches successfully deployed!');
            }

            return true;

        } catch (error) {
            this.logError(`React deployment failed: ${error.message}`);
            this.logWarning('You may need to manually resolve issues and restore from backup');
            this.logInfo(`Backup location: ${backupPath}`);
            return false;
        }
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
    const deployer = new ReactSmartDeployer();
    
    if (process.argv.length < 3) {
        console.log('Usage: node smart-deploy.js <environment> [bump_type] ["commit message"]');
        console.log('Environments: production, dev, feature/name');
        console.log('Bump types: major, minor, patch');
        console.log('');
        console.log('Examples:');
        console.log('  node smart-deploy.js production major "Breaking changes"');
        console.log('  node smart-deploy.js dev minor "New features"');
        console.log('  node smart-deploy.js feature/auth patch "Auth improvements"');
        console.log('  node smart-deploy.js status');
        process.exit(1);
    }

    // Check for special commands
    if (['status', 'version', '--status', '--version'].includes(process.argv[2])) {
        deployer.showVersionStatus();
        process.exit(0);
    }

    const targetEnv = process.argv[2];
    const bumpType = process.argv[3] || 'patch';
    const commitMessage = process.argv.slice(4).join(' ') || '';

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
    const success = await deployer.deploy(targetEnv, bumpType, commitMessage);
    
    if (!success) {
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Deployment script failed:', error.message);
        process.exit(1);
    });
}

module.exports = ReactSmartDeployer;
