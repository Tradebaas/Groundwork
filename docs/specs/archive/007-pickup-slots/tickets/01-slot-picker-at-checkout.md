<!-- WORKED EXAMPLE, fictional; ships with Groundwork to show the ticket format. -->

# 01: Slot picker at checkout

- **Blocked by:** none
- **Status:** done

**What to build:** A customer finishing checkout picks a pickup slot and sees it confirmed.
The checkout page shows the offerable slots (today or tomorrow, within opening hours, at
least 45 minutes ahead), the customer picks one, and the confirmation page and order email
both name it. Staff see the slot on the order list, sorted by slot.

**Acceptance:**

- [x] Checkout offers no slot in the past, outside opening hours, or under 45 minutes ahead
- [x] Confirmation page and order email show the chosen slot
- [x] Order list sorts by slot and shows each order's slot
