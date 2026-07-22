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

## Failure modes

- Two customers race for the last place in a slot: the save that lands second is refused, and
  that customer sees the friendly "slot just filled" message and picks a new slot with their
  cart intact - a normal outcome, not an error page. Nothing is logged beyond the order itself.
- No slot is offerable (everything left today is full or under 45 minutes away, and tomorrow
  is booked out): checkout says all pickup slots are taken and to try again tomorrow, instead
  of showing an empty picker.
- The order email fails after the order is saved: the order stands; the customer has already
  seen the slot on the confirmation page and staff see it on the order list. The failed send
  is logged.

## Settled decisions

- Slots are 15 minutes with at most 4 orders each: the owner's numbers from how the counter
  already works (see the sign-off).
- A slot is claimed only when the order is confirmed, never reserved while browsing: holding
  places in a 4-order slot is more machinery than the counter needs, and the "slot just
  filled" message covers the rare race.
- The 45-minute minimum lead: the time the counter needs to have an order packed and ready.
- Only today and tomorrow are bookable: the shop plans no further ahead than tomorrow's bake.

## Testing seams

- The slot service's public function: give it a clock time and existing orders, it returns
  the offerable slots. All capacity and cutoff rules are tested here, not through the UI.
- The checkout page: one end-to-end test books the last place in a slot and sees the slot
  disappear for the next customer.

## Not in this change

- Delivery, payment changes, or editing a slot after ordering (staff do that by phone).
- Configurable slot length or capacity; 15 minutes and 4 orders are the counter's reality.

## Risks & open questions

- None open at sign-off: the slot race raised in the interview was settled into the failure
  modes above and criterion 2's tests before building started.
