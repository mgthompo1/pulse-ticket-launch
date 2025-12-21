# Development Workflow Setup Guide

Quick setup guide for implementing the recommended development tools and processes.

## 🚀 Quick Start

### 1. Commit Message Standards

Install and configure commitlint:

```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

Create `commitlint.config.js`:
```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'docs', 'style', 'refactor',
      'test', 'chore', 'security', 'perf'
    ]],
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']]
  }
};
```

Update `package.json`:
```json
{
  "scripts": {
    "commit": "cz"
  }
}
```

Install commitizen:
```bash
npm install --save-dev commitizen cz-conventional-changelog
```

Add to `package.json`:
```json
{
  "config": {
    "commitizen": {
      "path": "cz-conventional-changelog"
    }
  }
}
```

Update husky hooks in `package.json`:
```json
{
  "husky": {
    "hooks": {
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS",
      "pre-commit": "lint-staged",
      "pre-push": "npm run test:run"
    }
  }
}
```

---

### 2. Enhanced lint-staged Configuration

Update `package.json`:
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "vitest related --run"
    ],
    "*.{sql}": [
      "prettier --write"
    ],
    "*.{md,json,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

Install prettier:
```bash
npm install --save-dev prettier
```

Create `.prettierrc`:
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

---

### 3. Security Scanning

Install Snyk:
```bash
npm install -g snyk
snyk auth
```

Add to CI/CD:
```yaml
# .github/workflows/security.yml
name: Security Scan
on: [push, pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

Install git-secrets (prevent committing secrets):
```bash
# macOS
brew install git-secrets

# Linux
git clone https://github.com/awslabs/git-secrets.git
cd git-secrets && sudo make install

# Configure
git secrets --install
git secrets --register-aws
```

---

### 4. Dependency Management

Add dependency update automation:

```bash
npm install -g npm-check-updates
```

Update dependencies:
```bash
ncu -u  # Check for updates
npm update  # Update within semver
```

Add to `package.json` scripts:
```json
{
  "scripts": {
    "deps:check": "ncu",
    "deps:update": "ncu -u && npm install",
    "deps:audit": "npm audit",
    "deps:fix": "npm audit fix"
  }
}
```

---

### 5. Code Coverage

Update `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.test.tsx',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
```

---

### 6. Git Tools

#### Git Quick Stats
```bash
npm install -g git-quick-stats
git-quick-stats
```

#### Git Fame
```bash
npm install -g git-fame
git-fame --sort=commits
```

#### LazyGit (CLI)
```bash
# macOS
brew install lazygit

# Linux
sudo add-apt-repository ppa:lazygit-team/release
sudo apt-get update
sudo apt-get install lazygit
```

---

### 7. PR Template

Create `.github/pull_request_template.md`:
```markdown
## Description
<!-- Brief description of changes -->

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Security fix
- [ ] Performance improvement

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] Edge cases tested

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Migration tested (if applicable)
- [ ] No hardcoded secrets
- [ ] Error handling implemented
- [ ] Type safety maintained

## Related Issues
Closes #<!-- issue number -->

## Screenshots (if applicable)
<!-- Add screenshots for UI changes -->
```

---

### 8. Issue Templates

Create `.github/ISSUE_TEMPLATE/bug_report.md`:
```markdown
---
name: Bug Report
about: Create a report to help us improve
title: '[BUG] '
labels: bug
assignees: ''
---

## Description
<!-- Clear description of the bug -->

## Steps to Reproduce
1. 
2. 
3. 

## Expected Behavior
<!-- What you expected to happen -->

## Actual Behavior
<!-- What actually happened -->

## Environment
- OS: 
- Browser: 
- Version: 

## Additional Context
<!-- Screenshots, logs, etc. -->
```

Create `.github/ISSUE_TEMPLATE/feature_request.md`:
```markdown
---
name: Feature Request
about: Suggest an idea for this project
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

## Description
<!-- Clear description of the feature -->

## Use Case
<!-- Why is this feature needed? -->

## Proposed Solution
<!-- How should this work? -->

## Alternatives Considered
<!-- Other solutions you've considered -->

## Additional Context
<!-- Screenshots, mockups, etc. -->
```

---

### 9. Branch Protection Rules

Configure in GitHub Settings > Branches:

**Rules for `main` branch**:
- ✅ Require pull request reviews (1 approval)
- ✅ Require status checks to pass
  - `lint`
  - `test`
  - `build`
  - `security-scan`
- ✅ Require branches to be up to date
- ✅ Include administrators
- ✅ Restrict pushes to matching branches

---

### 10. CI/CD Workflow

Create `.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:run
      - run: npm run test:coverage

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      - run: npm audit
```

---

### 11. Documentation Generation

Install TypeDoc:
```bash
npm install --save-dev typedoc
```

Add to `package.json`:
```json
{
  "scripts": {
    "docs": "typedoc --out docs/api src",
    "docs:serve": "typedoc --out docs/api --watch src"
  }
}
```

Create `typedoc.json`:
```json
{
  "entryPoints": ["src/index.ts"],
  "out": "docs/api",
  "theme": "default",
  "exclude": ["**/*.test.ts", "**/*.test.tsx"],
  "excludePrivate": true,
  "excludeProtected": true
}
```

---

### 12. Migration Management

Create migration template:
```bash
# scripts/new-migration.sh
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d%H%M%S)
DESCRIPTION=$1
FILENAME="supabase/migrations/${TIMESTAMP}_${DESCRIPTION}.sql"

cat > "$FILENAME" << EOF
-- Migration: $DESCRIPTION
-- Created: $(date)
-- Description: 

BEGIN;

-- Your migration SQL here

COMMIT;
EOF

echo "Created migration: $FILENAME"
```

Make executable:
```bash
chmod +x scripts/new-migration.sh
```

Usage:
```bash
./scripts/new-migration.sh add_user_preferences
```

---

## 📋 Verification Checklist

After setup, verify:

- [ ] `npm run commit` opens interactive commit prompt
- [ ] Invalid commit messages are rejected
- [ ] Pre-commit hooks run linting and tests
- [ ] Pre-push hooks run full test suite
- [ ] Security scanning runs in CI/CD
- [ ] PR template appears when creating PRs
- [ ] Issue templates available
- [ ] Branch protection rules active
- [ ] CI/CD pipeline runs on push/PR
- [ ] Documentation generates successfully

---

## 🎯 Next Steps

1. **Week 1**: Set up commit standards and hooks
2. **Week 2**: Configure CI/CD and security scanning
3. **Week 3**: Add PR/issue templates
4. **Week 4**: Set up documentation generation
5. **Ongoing**: Monitor and refine processes

---

## 📚 Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Husky Documentation](https://typicode.github.io/husky/)
- [Commitlint Rules](https://commitlint.js.org/#/reference-rules)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Snyk Documentation](https://docs.snyk.io/)

