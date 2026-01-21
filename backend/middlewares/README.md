# Middlewares (backend)

This folder contains Express middlewares used across the server. Middlewares are small functions that run between the request and the route handler to keep cross-cutting concerns centralized and to keep handlers small and focused.

Files
- `asyncHandler.js`: Wrapper for async route handlers. Use it to avoid repeating try/catch in every handler. Example:

```js
// before
app.get('/users', async (req, res) => {
  const users = await db.getUsers();
  res.json(users);
});

// with asyncHandler
app.get('/users', asyncHandler(async (req, res) => {
  const users = await db.getUsers();
  res.json(users);
}));
```

- `auth.js`: Authentication & authorization middleware. Typically verifies an access JWT, attaches `req.user`, and can check roles (RBAC: `admin`, `teacher`, `student`). Use this to protect routes and to centralize token logic.

Example usage:
```js
app.get('/admin-only', auth.requiresRole('admin'), (req, res) => {
  // req.user exists and has admin role
});
```

- `validate.js`: Request validation middleware (schema-based). Used to validate request `body`, `params`, or `query` (e.g., using Zod). Fail-fast: returns 400 with a clear message when payload is invalid.

Example:
```js
app.post('/reading-tests', validate.body(createReadingTestSchema), (req, res) => {
  // req.body is typed and validated
});
```

- `errorHandler.js`: Central error handler that formats errors consistently, logs them, and returns user-friendly messages. All thrown errors from controllers will bubble here (including validation/auth errors).

Why use middlewares?
1. Reuse: implement logic once and reuse across many routes.  
2. Separation of concerns: keep route handlers focused on business logic.  
3. Consistent behavior: unified error formatting, auth rules, and validation.  
4. Easier testing and debugging.

If you want, I can add short inline docs/comments to each middleware file and example tests (unit tests) for them.