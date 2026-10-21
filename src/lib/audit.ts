import { getRepositories } from "@/data/repositories";
import { useSettingsStore } from "@/store/settings-store";

export async function recordAudit(
  input: Omit<
    Parameters<ReturnType<typeof getRepositories>["audit"]["log"]>[0],
    "userId"
  > & { userId?: string }
): Promise<void> {
  try {
    const { audit } = getRepositories();
    await audit.log({
      ...input,
      userId: input.userId ?? useSettingsStore.getState().analystName,
    });
  } catch {
    // Audit failures should never block the primary user action.
  }
}
