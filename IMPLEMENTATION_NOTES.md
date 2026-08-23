# Implementation Notes

## 1. What I changed

- Fixed the diff bug: `computeDiff()` in `diff.util.ts` only checked `unitPrice` to decide if a line item changed, so a quantity-only change (CR-1's SKU-A, 10 → 11 units) was showing up as "unchanged". Added a `quantity` check too.
- Fixed the permission bug: `canApprove` in `cr-detail.component.ts` only checked the CR's status, not the user's permissions, so a read-only viewer still got an enabled Approve button. Now it also checks `canApprovePolicy(user)`.
- List filter: implemented `visibleRows` so the table narrows by the selected status (was a TODO).
- Detail page:
  - Timeline now actually sorts by date (oldest first). The fixtures store it newest-first, and it was just being rendered as-is before.
  - `canReject` now uses the same status + permission check as `canApprove`.
  - Reject reason is now required (`Validators.required` on the form control).
  - Wrote `approve()` and `reject()` — they call the mock API, disable the buttons while the call is in flight, update the CR on success, and show an error without breaking anything on failure.
- Bonus fix, not part of the listed tasks: clicking a different row in the list wasn't updating the detail pane. `CrDetailComponent` only loaded the CR in `ngOnInit`, so once the first CR was in, changing the `id` input did nothing. Added `ngOnChanges` to reload when `id` changes. Found this just clicking around the app, figured it was worth fixing since it's a pretty visible bug even though it wasn't called out in the brief.
- Another bonus fix: approving or rejecting a CR updated the detail pane but the list still showed the old status, since they're two separate components with their own state. Added a `changed` output on `CrDetailComponent`, emitted on a successful approve/reject, and wired it up in `app.component.html` to re-fetch both panes.

## 2. Component & state model

Both list and detail keep one `state: ViewState<T>` field (`idle/loading/loaded/empty/error` + the data). The template just switches on `state.status`. Everything else (filtered rows, the diff, the timeline, whether actions are allowed) is a plain getter computed from that state — nothing extra to keep in sync by hand.

Detail also has `submitting` and `actionError`, only used around the approve/reject calls.

Data comes from `CrApiService` (mock, returns Promises) and `SessionService.user`, both injected through the constructor.

## 3. Invariants I keep

| Invariant                                                                                             | Where                                                                     |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Table only shows rows matching the status filter                                                      | `visibleRows` getter                                                      |
| Timeline is always oldest → newest                                                                    | `timeline` getter sorts a copy of `audit`                                 |
| Approve/Reject only enabled when status is `PENDING_APPROVAL` **and** the user has approve permission | `canApprove` / `canReject`                                                |
| Can't double-submit or get stuck on a spinner                                                         | `submitting` flag, reset in a `finally`                                   |
| Reject needs a non-empty reason                                                                       | `Validators.required` + button disabled while invalid                     |
| A failed approve/reject never silently changes the CR's status                                        | `state.data` only gets replaced on success, errors just set `actionError` |

## 4. Testing strategy

Used the same `TestBed` + `detectChanges()` / flush / `detectChanges()` pattern already in the provided specs. Added tests for: the status filter, the list's error state, diff totals + a specific "changed" row, timeline order, Reject being hidden for a viewer, approve working, approve failing (and not leaving the UI stuck), reject being blocked without a reason, and reject working end to end.

Didn't write a test for clicking Approve twice really fast — the guard is in place and gets exercised indirectly by the other tests, but a dedicated double-click test felt like lower priority given the time I had.

## 5. Assumptions

- There's no separate "reject" permission in the policy convention (only `cr_a_*` for approve), so I made Reject require the same permission as Approve — figured whoever can approve a CR can also reject it.
- Reason validation is just "not empty", nothing fancier like a minimum length.

## 6. Where I used AI

I come from React/Next.js, no prior Angular experience, so I used Copilot mostly as a mentor rather than to generate code for me:

- Had it explain the Angular concepts I needed against what I already knew from React — standalone components, constructor-based DI vs hooks, the template syntax, getters as derived state, reactive forms, and why this repo doesn't need RxJS.
- The test files in Milestone 6 are where I leaned on it the most — it helped me figure out how to drive `failNext`/click events/form inputs in the TestBed setup, since I hadn't written Angular tests before.

## 7. What I'd improve with more time

- The UI is very plain right now — with more time I'd add some actual styling (spacing, colors, maybe a card layout for the CR detail) instead of the bare HTML it has now.
- A loading spinner on the Approve/Reject buttons instead of just disabling them, so it's clearer something is happening while the request is in flight.
- A toast/snackbar for success and error messages instead of the plain error text in the actions section — feels more like a real app.
- A real test for double-clicking Approve during a slow call, just didn't get to it.
- Probably some duplication between `approve()` and `reject()` I could clean up if I had more time to look at it.
