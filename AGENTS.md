<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Mandatory pre-push test gate

Before any push operation, the agent must run the full local test suite and fix failing tests first.

Required command:

```bash
npx playwright test tests/api tests/db tests/e2e
```

Rules:
- Never push when the command above has any failures.
- Use `.env` / `.env.test` variables for DB connectivity.
- If failures happen, fix code or test setup, rerun tests, then push only after green.
