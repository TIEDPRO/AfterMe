# Mailchimp — align welcome emails with “timing / delivery layer” framing

**Phase 0.2** (from `core_additions_implementation_plan.md`) is configured in the **Mailchimp** UI, not in this repository.

After you publish the updated homepage (`web/index.html`), update your Mailchimp automations so that:

1. **Subject lines** echo the same promise: delivery when the moment comes — not “another password app.”
2. **Body copy** states clearly:
   - After Me is **not** a legal will and not a substitute for a solicitor.
   - Documents stay **on the user’s device**; the Family Kit is how chosen people receive access.
   - **Four tools** framing (will / password manager / emergency contacts / After Me) may be reused in short form.
3. **CTA** points to `https://myafterme.co.uk/` and optionally `#planning-layers` for the four-tools section.

The waitlist form posts to the URL in `web/index.html` (`MAILCHIMP_URL`). Test with Mailchimp’s preview and a real inbox before going live.
