/**
 * Quasar App Extension prompts script
 * https://quasar.dev/app-extensions/development-guide/prompts-api
 *
 * Real prompts for `fastfree_update`:
 *
 * - `dismissCooldownDays` (number, default 3, must be > 0):
 *   how many days the update dialog stays snoozed after the user taps
 *   "Later". Asked as free-form text (instead of a fixed select) so each
 *   host app can tune nag-frequency; the runtime clamps invalid values back
 *   to the default.
 * - `enableWebUpdate` (confirm, default true):
 *   whether the web/PWA path (service-worker update check) is active.
 *   Asked as a confirm (instead of a select) because it maps 1:1 onto the
 *   boolean `UpdateConfig.enableWebUpdate` consumed by `useAppUpdate`.
 */

import { definePromptsScript } from '#q-app';
import { cancel, confirm, group, intro, outro, text } from '@clack/prompts';

const DEFAULT_DISMISS_COOLDOWN_DAYS = 3;

export default definePromptsScript(async () => {
  intro('fastfree_update — update check configuration');

  const answers = await group(
    {
      dismissCooldownDays: () =>
        text({
          message: 'Snooze (days) after the user taps "Later"?',
          placeholder: String(DEFAULT_DISMISS_COOLDOWN_DAYS),
          initialValue: String(DEFAULT_DISMISS_COOLDOWN_DAYS),
          validate: (value: string | undefined) => {
            const days = Number(value);
            if (value === undefined || !Number.isFinite(days) || days <= 0) {
              return 'Please enter a number greater than 0.';
            }
          },
        }),
      enableWebUpdate: () =>
        confirm({
          message: 'Enable web (PWA service-worker) update checks?',
          initialValue: true,
        }),
    },
    {
      // On Cancel callback that wraps the group
      // So if the user cancels one of the prompts in the group this function will be called
      onCancel: () => {
        cancel('Operation cancelled.');
        process.exit(0);
      },
    },
  );

  outro('Update configuration saved!');

  const rawDays = answers.dismissCooldownDays;
  const parsedDays =
    typeof rawDays === 'string' || typeof rawDays === 'number'
      ? Number(rawDays)
      : NaN;
  const dismissCooldownDays =
    Number.isFinite(parsedDays) && parsedDays > 0
      ? parsedDays
      : DEFAULT_DISMISS_COOLDOWN_DAYS;

  return {
    dismissCooldownDays,
    enableWebUpdate: answers.enableWebUpdate === true,
  };
});
