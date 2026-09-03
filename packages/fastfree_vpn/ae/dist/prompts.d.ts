/**
 * Quasar App Extension prompts script
 * https://quasar.dev/app-extensions/development-guide/prompts-api
 */
interface PromptAnswers {
    endpoint: string;
    address: string;
    dns: string;
}
export default function (): Promise<PromptAnswers>;
export {};
