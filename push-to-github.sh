#!/bin/bash
# One-time push to GitHub
# Run this from the Shell tab: bash push-to-github.sh

set -e

REPO_URL="https://lusa8o8:${GITHUB_PAT}@github.com/lusa8o8/d8Advisr_.git"

echo "Setting up GitHub remote..."
git remote add github "$REPO_URL" 2>/dev/null || git remote set-url github "$REPO_URL"

echo "Pushing to GitHub (main branch)..."
git push github master:main --force

echo ""
echo "Done! Your code is live at: https://github.com/lusa8o8/d8Advisr_"
