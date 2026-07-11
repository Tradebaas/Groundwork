<!-- WORKED EXAMPLE, fictional; ships with Groundwork to show the ticket format. -->

# 02: Capacity guard on slots

- **Blocked by:** 01-slot-picker-at-checkout
- **Status:** done

**What to build:** A slot never takes more than 4 orders, even when two customers race for
the last place. Full slots disappear from the picker; a customer whose chosen slot fills
during checkout gets a friendly "slot just filled" message and picks again, keeping their
cart intact.

**Acceptance:**

- [x] A slot with 4 confirmed orders is not offered
- [x] Losing the race for the last place shows the pick-again message; the cart survives
- [x] The slot service's tests cover the race at the service seam, not through the UI
