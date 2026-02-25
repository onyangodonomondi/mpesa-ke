# Contributing to mpesa-ke

Thank you for your interest in contributing to mpesa-ke! 🇰🇪

## Getting Started

1. **Fork & clone** the repository:
   ```bash
   git clone https://github.com/onyangodonomondi/mpesa-ke.git
   cd mpesa-ke
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run tests:**
   ```bash
   npm test
   ```

4. **Build:**
   ```bash
   npm run build
   ```

## Development Workflow

1. Create a branch: `git checkout -b feature/my-feature`
2. Make your changes in `src/`
3. Add tests in `tests/`
4. Run `npm test` to ensure all tests pass
5. Run `npm run typecheck` to verify TypeScript types
6. Submit a pull request

## Code Style

- Use TypeScript strict mode
- Prefer `const` over `let`
- Document public APIs with JSDoc comments
- Keep functions small and focused
- Use meaningful variable names

## Testing

We use [Vitest](https://vitest.dev/) for testing. Run the test suite:

```bash
# Run once
npm test

# Watch mode
npm run test:watch
```

## Reporting Issues

- Use the [GitHub Issues](https://github.com/onyangodonomondi/mpesa-ke/issues) page
- Include steps to reproduce
- Include your Node.js version and OS

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
