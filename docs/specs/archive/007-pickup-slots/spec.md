<!-- WORKED EXAMPLE. This spec is fictional (a neighborhood bakery's web shop) and ships with
     Groundwork only to show the format in its filled-in state: a tier M multi-session spec with
     tickets. It was never built; the folder is ARCHIVE tier per `docs/README.md`. -->

# 007: Customers book a pickup slot at checkout

- **Status:** done
- **Traces to:** BRIEF SC-3: "customers order online and pick up in the shop"
- **Owner sign-off:** approved 2026-05-14 ("Yes, slots of 15 minutes, max 4 orders each, that
  is exactly how the counter works")

## Why

Orders currently arrive with no pickup time, so mornings jam up: six customers at 08:30, nobody
at 10:00. The owner wants checkout to end with a chosen pickup slot so the counter staff can
spread the work and customers stop queueing.

## What: acceptance criteria

1. WHEN a customer reaches checkout THE SYSTEM SHALL offer only slots that are today or
   tomorrow, within opening hours, at least 45 minutes ahead, and not full.
2. WHEN a slot has 4 confirmed orders THE SYSTEM SHALL stop offering it.
3. WHEN the customer confirms the order THE SYSTEM SHALL show the slot in the confirmation
   and include it in the order email.
4. Staff see each order's slot on the order list, sorted by slot.

## Testing seams

- The slot service's public function: give it a clock time and existing orders, it returns
  the offerable slots. All capacity and cutoff rules are tested here, not through the UI.
- The checkout page: one end-to-end test books the last place in a slot and sees the slot
  disappear for the next customer.

## Not in this change

- Delivery, payment changes, or editing a slot after ordering (staff do that by phone).
- Configurable slot length or capacity; 15 minutes and 4 orders are the counter's reality.

## Risks & open questions

- Two customers can race for the last place in a slot; the order that saves second must get a
  friendly "slot just filled" message, not an error page. Covered by criterion 2's tests.
