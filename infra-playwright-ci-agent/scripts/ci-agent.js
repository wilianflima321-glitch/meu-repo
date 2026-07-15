#!/usr/bin/env node
"use strict";

// Minimal CI agent: collects environment variables, optionally posts results to a PR using GITHUB_TOKEN
const { Octokit } = require('@octokit/rest');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY; // owner/repo
  const pr = process.env.PR_NUMBER;

  console.log('CI Agent starting...');
  if (!repo) console.warn('GITHUB_REPOSITORY not set. Continuing in local mode.');

  // Collect Playwright artifacts directory if present
  const artifactsDir = process.env.PLAYWRIGHT_ARTIFACTS || path.join(process.cwd(), 'playwright-report');
  console.log('Artifacts dir:', artifactsDir);

  // Simple artifact zipping could be added; for now, list files
  if (fs.existsSync(artifactsDir)) {
    const files = fs.readdirSync(artifactsDir);
    console.log('Found artifacts:', files.slice(0, 20));
  } else {
    console.log('No artifacts directory found.');
  }

  if (token && repo && pr) {
    const [owner, repoName] = repo.split('/');
    const octokit = new Octokit({ auth: token });
    const body = 'Playwright CI run completed. Artifacts collected if available.';
    try {
      await octokit.issues.createComment({ owner, repo: repoName, issue_number: Number(pr), body });
      console.log('Posted comment to PR #' + pr);
    } catch (err) {
      console.error('Failed to post PR comment:', err.message || err);
    }
  } else {
    console.log('GITHUB_TOKEN or PR context not provided — skipping PR update.');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
