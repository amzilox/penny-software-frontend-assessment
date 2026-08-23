# Implementation Notes

## 1. What I changed

- **Task 1 (starting bugs):**
  - `diff.util.ts` — `computeDiff()` only compared `unitPrice`, so a quantity-only change (e.g. CR-1's SKU-A 10→11 units) was misreported as `unchanged`. Now also compares `quantity`.
  - `cr-detail.component.ts` — `canApprove` only checked CR status, so a read-only viewer (`cr_r_o`) saw an enabled Approve button. Now AND's the status check with `canApprovePolicy(user)` from `common/permissions.ts`.
- **Task 2 (list):** implemented `visibleRows` to filter `state.data` by `statusFilter` (`'ALL'` passes everything through).
- **Task 3 (detail):**
  - `timeline` getter now sorts a **copy** of `audit` ascending by `at` (fixtures store it newest-first).
  - `canReject` gated the same way as `canApprove` (status + policy) — see Assumptions.
  - Added `Validators.required` to `rejectControl`.
  - Implemented `approve()`/`reject()`: guard on `can*`/`submitting`/form validity, call the mock API with `new Date().toISOString()`, replace `state.data` with the server's response on success, set `actionError` on failure, always reset `submitting` in `finally`.

## 2. Component & state model

- **List (`CrListComponent`):** single `state: ViewState<CrSummary[]>` drives loading/loaded/empty/error rendering directly in the template via `*ngIf` on `state.status`. `statusFilter` is a separate field; `visibleRows` is a derived getter over `state.data`, recomputed each change-detection pass (no memoization needed at this scale).
- **Detail (`CrDetailComponent`):** same `ViewState<CrDetail>` pattern for load state. `diff`, `timeline`, `canApprove`, `canReject` are all getters derived from `state.data` — no duplicated/cached fields to keep in sync. `submitting` + `actionError` are the only two extra fields, scoped to the approve/reject flow.
- Data flow: `SessionService.user` (constructor-injected) + `CrApiService` (Promise-based mock) feed both components' `load()`; actions call the same service and re-assign `state` wholesale on success/failure, never mutate in place.

## 3. Invariants I keep

| Invariant | How / where |
|---|---|
| Rendered rows always match `statusFilter` | `visibleRows` getter filters `state.data`, template only reads `visibleRows` |
| Timeline always oldest→newest | `timeline` getter sorts a copy of `audit` by `at`, never mutates the source array |
| Approve/Reject only enabled for `PENDING_APPROVAL` + permitted user | `canApprove`/`canReject` AND status with `canApprovePolicy(user)` |
| No double-submit / no stuck "submitting" UI | `submitting` flag set before the API call, reset in `finally`; both action methods also short-circuit if already `submitting` |
| Reject requires a non-empty reason | `Validators.required` on `rejectControl`, button `[disabled]` includes `rejectControl.invalid`, `reject()` also re-checks `.invalid` defensively |
| Failed actions never corrupt state | `state.data` is only reassigned on a **successful** API response; failures only set `actionError` |

## 4. Testing strategy

- Component/DOM tests via `TestBed` + `fixture.detectChanges()` (mount → flush the mock API's timer → re-render), matching the pattern in the provided specs.
- Added coverage for: status filter narrowing, list error state (driving `CrApiService.failNext` directly), diff totals/delta + rendered diff kind, chronological timeline order, Reject hidden for a read-only viewer, Approve happy path, Approve failure path (asserts no stale status/no stuck button), Reject validation (disabled until a reason is typed), Reject happy path.
- Deliberately skipped: a dedicated slow-network/double-click test beyond the failure-path test — the `submitting` guard is exercised implicitly (button stays disabled for the duration of every `await` in the flows above), but a test that clicks twice mid-flight would add coverage with diminishing return given the time budget.

## 5. Assumptions

- The brief only defines `cr_a_*` (approve) policies, no separate "reject" scope. I gated `canReject` on the same `canApprovePolicy(user)` as `canApprove`, treating reject as the other half of the same approval decision (an approver can do either; a viewer can do neither).
- Rejection reason validation is `Validators.required` only (non-empty) — no minimum length, since the brief just says "a reason is required."

## 6. Where I used AI

Used GitHub Copilot (Claude) throughout, primarily as a **pairing/mentor tool rather than an autocomplete**, given I come from a React/Next.js background with no prior Angular experience:
- Explained Angular-specific concepts against my React knowledge before I wrote anything myself — standalone components vs. NgModules, constructor-based dependency injection vs. hooks/context, template syntax (`*ngIf`/`*ngFor`/property & event bindings) vs. JSX, getters as derived state (no memoization) vs. `useMemo`, Reactive Forms (`FormControl`/`Validators`) vs. controlled inputs, and why this repo uses plain Promises instead of RxJS.
- For each bug/task, it identified the root cause and proposed the exact fix conceptually; I typed every line myself so I could reason about and explain it live.
- Helped me design and write the Jest/TestBed test scripts for Milestone 6 (list filter/error state, diff totals, timeline order, permission gating, approve/reject happy and failure paths, reject validation) — I understand and can walk through each assertion, but the test-authoring itself leaned on AI more than the component code did.

## 7. What I'd improve with more time

- A dedicated test for the double-click/slow-network scenario (click Approve twice in a row while a request is in flight, assert only one API call fires).
- Extract the repeated `submitting`/`actionError`/try-catch-finally shape in `approve()`/`reject()` into a small shared helper if a third action were ever added.
- Add an explicit loading indicator on the action buttons themselves (currently just `disabled`, no spinner/text change) for clearer UX during slow calls.

