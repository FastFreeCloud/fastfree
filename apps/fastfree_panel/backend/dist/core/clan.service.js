/**
 * Clan Domain Service Layer.
 *
 * Encapsulates all Clan CLI interactions through the strict allowlist and execution
 * primitives. Provides strongly-typed domain methods with zero `any`.
 */
import { argvFor } from '../clan/allowlist.js';
import { runClan, validateMachineName, mapClanFailure } from '../clan/exec.js';
import { parseMachines, toCleanLines } from '../clan/parse.js';
import { ApiError } from '../http/errors.js';
function tryExtractJson(text) {
    const jsonStart = text.indexOf('{');
    if (jsonStart < 0) {
        return null;
    }
    try {
        return JSON.parse(text.slice(jsonStart));
    }
    catch {
        return null;
    }
}
export class ClanService {
    /**
     * List all machines managed by Clan, enriched with roles/tags where available.
     */
    async listMachines() {
        try {
            // 1. Prefer 'select machines' which returns rich JSON metadata and tags
            try {
                const selectResult = await runClan(argvFor('select.machines'));
                const parsed = tryExtractJson(selectResult.stdout);
                if (parsed && typeof parsed === 'object') {
                    const dict = parsed;
                    const machines = [];
                    for (const [key, val] of Object.entries(dict)) {
                        if (val && typeof val === 'object') {
                            machines.push({
                                name: val.name ?? key,
                                hostname: val.deploy?.targetHost ?? null,
                                isOnline: null,
                                roles: Array.isArray(val.tags) ? [...val.tags] : [],
                                description: val.description ?? null,
                                targetHost: val.deploy?.targetHost ?? null,
                                buildHost: val.deploy?.buildHost ?? null,
                                machineClass: val.machineClass ?? null,
                                installedAt: val.installedAt ?? null,
                            });
                        }
                    }
                    if (machines.length > 0) {
                        return machines;
                    }
                }
            }
            catch {
                // Fallback to bare machines list if 'select' is not supported
            }
            // 2. Fallback to 'clan machines list'
            const listResult = await runClan(argvFor('machines.list'));
            const bareMachines = parseMachines(listResult.stdout);
            return bareMachines.map((m) => ({
                name: m.name,
                hostname: m.hostname,
                isOnline: m.isOnline,
                roles: [],
            }));
        }
        catch (error) {
            throw mapClanFailure(error);
        }
    }
    /**
     * Get detailed metadata for a single Clan machine.
     *
     * @throws ApiError NOT_FOUND if the machine is not present in Clan inventory.
     */
    async getMachineDetails(name) {
        const validName = validateMachineName(name);
        const machines = await this.listMachines();
        const machine = machines.find((m) => m.name.toLowerCase() === validName.toLowerCase());
        if (!machine) {
            throw ApiError.notFound(`Machine "${validName}" was not found in Clan inventory.`);
        }
        return machine;
    }
    /**
     * Retrieve the list of Clan variables and their secret/public status.
     */
    async getClanVars() {
        try {
            const result = await runClan(argvFor('vars.list'));
            const lines = toCleanLines(result.stdout);
            const entries = [];
            for (const line of lines) {
                // Ignore Git or Flox warning output lines
                if (line.startsWith('warning:') || line.startsWith('error:')) {
                    continue;
                }
                const separatorIndex = line.indexOf(':');
                if (separatorIndex <= 0) {
                    continue;
                }
                const varName = line.slice(0, separatorIndex).trim();
                const valuePart = line.slice(separatorIndex + 1).trim();
                if (varName.length === 0) {
                    continue;
                }
                const isSecret = valuePart.includes('********');
                entries.push({
                    name: varName,
                    isSecret,
                    valueSummary: isSecret ? '********' : valuePart,
                });
            }
            return entries;
        }
        catch (error) {
            throw mapClanFailure(error);
        }
    }
    /**
     * Trigger an update on a specific machine.
     */
    async updateMachine(name, hostKeyCheck = 'tofu') {
        const validName = validateMachineName(name);
        const startTime = Date.now();
        try {
            const argv = ['machines', 'update', validName, '--host-key-check', hostKeyCheck];
            // Allow up to 5 minutes for machine updates (building closures, network push)
            const result = await runClan(argv, { timeoutMs: 300_000 });
            const durationMs = Date.now() - startTime;
            return {
                machine: validName,
                success: result.ok,
                message: `Machine "${validName}" updated successfully.`,
                durationMs,
                stdout: result.stdout,
            };
        }
        catch (error) {
            throw mapClanFailure(error);
        }
    }
}
export const clanService = new ClanService();
//# sourceMappingURL=clan.service.js.map