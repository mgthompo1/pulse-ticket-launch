# Git Hooks Setup

This project uses [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/okonet/lint-staged) to automatically run quality checks before commits.

## What Happens on Commit

When you run `git commit`, the following checks are automatically executed **only on staged files**:

1. **ESLint** - Lints your TypeScript/TSX files and auto-fixes issues
2. **Vitest** - Runs tests related to changed files

If either check fails, the commit will be blocked until you fix the issues.

## Configuration

### Husky

Husky is configured in:
- `.husky/pre-commit` - The pre-commit hook script
- `package.json` - Contains the `prepare` script to install hooks

### Lint-staged

Configuration in `package.json`:

```json
"lint-staged": {
  "*.{ts,tsx}": [
    "eslint --fix",
    "vitest related --run"
  ]
}
```

This means:
- For any staged `.ts` or `.tsx` files:
  - Run ESLint and auto-fix issues
  - Run tests related to those files

## Testing the Setup

To verify git hooks are working:

```bash
# 1. Make a small change to a TypeScript file
echo "// test" >> src/components/GroupInvoices.tsx

# 2. Stage the file
git add src/components/GroupInvoices.tsx

# 3. Try to commit
git commit -m "test: verify git hooks"

# You should see:
# - lint-staged running
# - ESLint checking the file
# - Vitest running related tests
```

## Bypassing Hooks (Not Recommended)

In emergencies, you can bypass pre-commit hooks:

```bash
git commit --no-verify -m "emergency fix"
```

**⚠️ Warning:** Only use this in true emergencies. Bypassing hooks can introduce bugs and linting issues into the codebase.

## Troubleshooting

### Hooks not running?

1. Make sure you've run `npm install` to install husky hooks:
   ```bash
   npm install
   ```

2. Check if the pre-commit hook is executable:
   ```bash
   ls -l .husky/pre-commit
   # Should show: -rwxr-xr-x
   ```

3. If not executable, make it executable:
   ```bash
   chmod +x .husky/pre-commit
   ```

### Tests failing on commit?

The pre-commit hook runs tests related to your changes. If tests fail:

1. Run tests manually to see the full output:
   ```bash
   npm run test:run
   ```

2. Fix the failing tests

3. Stage the fixes and commit again

### Linting errors on commit?

ESLint will try to auto-fix issues. If it can't auto-fix:

1. Run linting manually:
   ```bash
   npm run lint
   ```

2. Fix the reported issues

3. Stage the fixes and commit again

## Customizing

To modify what runs on commit, edit the `lint-staged` configuration in `package.json`.

Examples:

```json
"lint-staged": {
  // Only lint, don't run tests
  "*.{ts,tsx}": "eslint --fix",

  // Run all tests (slower)
  "*.{ts,tsx}": [
    "eslint --fix",
    "npm run test:run"
  ],

  // Also format with prettier
  "*.{ts,tsx}": [
    "prettier --write",
    "eslint --fix",
    "vitest related --run"
  ]
}
```

## Benefits

✅ **Catch bugs early** - Tests run before code is committed
✅ **Maintain code quality** - Linting enforces standards
✅ **Auto-fix issues** - ESLint fixes many issues automatically
✅ **Faster CI/CD** - Fewer failures in CI since checks run locally
✅ **Better commits** - Only working, tested code gets committed

## Performance

The hooks are optimized to only check staged files, not the entire codebase:

- **Fast**: Only lints/tests files you changed
- **Parallel**: ESLint and tests run in parallel when possible
- **Smart**: Vitest only runs tests related to changed files

Typical commit time: 2-10 seconds depending on how many files you changed.

---

**Last Updated:** 2025-10-24
**Status:** Active and configured
