# Project Structure Migration Plan

## Goal

Move the project away from a mixed structure based on skill, role, and legacy pages toward a domain-first layout where each exam flow is easier to find and change.

The first foundation added for this migration is the shared exam registry at `frontend/src/shared/config/examRegistry.js`. It centralizes:

- IX and Orange hub metadata
- Orange level-to-skill rules
- Select Test deep-link generation
- Cambridge create-route mapping
- Test-config lookup rules for base reading types such as `movers`, `flyers`, and `starters`

## Target Frontend Shape

```text
frontend/src
  app/
    routes/
    layouts/
    providers/
  domains/
    ix/
      reading/
        teacher/
        student/
        shared/
      listening/
        teacher/
        student/
        shared/
      writing/
        teacher/
        student/
        shared/
    cambridge/
      ket/
        reading/
        listening/
      pet/
        reading/
        listening/
        writing/
      movers/
        reading/
        listening/
      flyers/
        reading/
      starters/
        reading/
    shared/
      test-shell/
      question-types/
      scoring/
  shared/
    ui/
    auth/
    permissions/
    hooks/
```

## Target Backend Shape

```text
backend/
  modules/
    ix/
      reading/
      listening/
      writing/
    cambridge/
      ket/
        reading/
        listening/
      pet/
        reading/
        listening/
        writing/
      movers/
        reading/
        listening/
      flyers/
        reading/
      starters/
        reading/
    auth/
    uploads/
    users/
  shared/
    db/
    middleware/
    utils/
```

## Slice Rules

Each exam slice should keep these concerns together:

- `teacher/`: create, edit, review, admin-only helpers
- `student/`: runtime player, results, feedback entry points
- `shared/`: config, serializers, validators, adapters, question mapping
- `api/`: feature-scoped HTTP calls if frontend needs them

When a developer wants to change `Movers Reading`, they should not have to jump across unrelated feature folders.

## Recommended Migration Order

1. Keep adding metadata and route rules to the shared exam registry instead of hard-coding them in pages.
2. Extract route tables from `App.jsx` into domain route modules.
3. Split `CambridgeTestBuilder.jsx` into shell, part editors, and test-type adapters.
4. Move Cambridge backend logic out of the large route file into module controllers and services.
5. Add a short README inside each domain slice describing frontend routes, backend routes, models, and scorer files.

## Practical Next Step

The best first vertical slice is `cambridge/movers/reading`. It already has enough complexity to validate the new structure without forcing a full-project rewrite.