/**
 * Quasar App Extension prompts script
 * https://quasar.dev/app-extensions/development-guide/prompts-api
 */

import { intro, outro, text, group, cancel } from '@clack/prompts';

interface PromptAnswers {
  endpoint: string;
  address: string;
  dns: string;
}

export default async function (): Promise<PromptAnswers> {
  intro('FastFree VPN Setup');

  const answers = await group(
    {
      endpoint: () =>
        text({
          message: 'VPN Server Endpoint (e.g., fastfree.cloud:51820):',
          defaultValue: 'fastfree.cloud:51820'
        }),
      address: () =>
        text({
          message: 'VPN IP Address (e.g., 10.100.0.2/32):',
          defaultValue: '10.100.0.2/32'
        }),
      dns: () =>
        text({
          message: 'DNS Server:',
          defaultValue: '1.1.1.1'
        })
    },
    {
      onCancel: () => {
        cancel('Operation cancelled.');
        process.exit(0);
      }
    }
  );

  outro('VPN configuration saved!');

  return answers;
}
