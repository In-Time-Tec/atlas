"use server";

import { getUser } from "@/lib/auth-utils";
import {
  getCustomInstructionsByUserId,
  createCustomInstructions,
  updateCustomInstructions,
  deleteCustomInstructions,
} from "@/lib/db/queries";

export async function getCustomInstructions(providedUser?: any) {
  "use server";
  try {
    const user = providedUser || (await getUser());
    if (!user) return null;
    const instructions = await getCustomInstructionsByUserId({ userId: user.id });
    return instructions;
  } catch (error) {
    console.error("Error getting custom instructions:", error);
    return null;
  }
}

export async function saveCustomInstructions(content: string) {
  "use server";
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: "User not found" } as const;
    }
    if (!content.trim()) {
      return { success: false, error: "Content cannot be empty" } as const;
    }

    const existingInstructions = await getCustomInstructionsByUserId({ userId: user.id });
    const result = existingInstructions
      ? await updateCustomInstructions({ userId: user.id, content: content.trim() })
      : await createCustomInstructions({ userId: user.id, content: content.trim() });

    return { success: true, data: result } as const;
  } catch (error) {
    console.error("Error saving custom instructions:", error);
    return { success: false, error: "Failed to save custom instructions" } as const;
  }
}

export async function deleteCustomInstructionsAction() {
  "use server";
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: "User not found" } as const;
    }
    const result = await deleteCustomInstructions({ userId: user.id });
    return { success: true, data: result } as const;
  } catch (error) {
    console.error("Error deleting custom instructions:", error);
    return { success: false, error: "Failed to delete custom instructions" } as const;
  }
}


