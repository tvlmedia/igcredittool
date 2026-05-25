"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recordActivities } from "@/lib/activity";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type ProfileActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const profileSchema = z.object({
  fullName: z.string().optional(),
  company: z.string().optional(),
  email: z.string().optional(),
  homeBaseCity: z.string().optional(),
  homeBaseCountry: z.string().optional(),
  homeBaseLatitude: z.string().optional(),
  homeBaseLongitude: z.string().optional(),
  website: z.string().optional(),
  instagram: z.string().optional(),
  youtube: z.string().optional(),
  vimeo: z.string().optional(),
  facebook: z.string().optional(),
  linkedin: z.string().optional(),
  lensesJson: z.string().optional()
});

const lensSchema = z.object({
  brand: z.string().optional(),
  model: z.string().optional(),
  notes: z.string().optional()
});

export async function saveProfile(
  _previousState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  if (!hasSupabaseEnv()) {
    return {
      status: "error",
      message: "Supabase environment variables are missing."
    };
  }

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid profile." };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      message: "You need to be logged in."
    };
  }

  const lenses = parseLensDrafts(parsed.data.lensesJson);
  const { data: existingLensRows } = await supabase
    .from("owned_lenses")
    .select("brand,model,notes")
    .eq("user_id", user.id);
  const existingLenses = (existingLensRows ?? []) as Array<{
    brand: string;
    model: string;
    notes: string | null;
  }>;
  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: cleanString(parsed.data.email) || user.email || null,
      full_name: cleanString(parsed.data.fullName) || null,
      company: cleanString(parsed.data.company) || null,
      home_base_city: cleanString(parsed.data.homeBaseCity) || null,
      home_base_country: cleanString(parsed.data.homeBaseCountry) || null,
      home_base_latitude: nullableNumberValue(parsed.data.homeBaseLatitude),
      home_base_longitude: nullableNumberValue(parsed.data.homeBaseLongitude),
      website: cleanString(parsed.data.website) || null,
      instagram: cleanString(parsed.data.instagram) || null,
      youtube: cleanString(parsed.data.youtube) || null,
      vimeo: cleanString(parsed.data.vimeo) || null,
      facebook: cleanString(parsed.data.facebook) || null,
      linkedin: cleanString(parsed.data.linkedin) || null
    },
    { onConflict: "id" }
  );

  if (profileError) {
    return {
      status: "error",
      message: profileError.message
    };
  }

  const { error: deleteError } = await supabase
    .from("owned_lenses")
    .delete()
    .eq("user_id", user.id);

  if (deleteError) {
    return {
      status: "error",
      message: deleteError.message
    };
  }

  if (lenses.length > 0) {
    const { error: insertError } = await supabase.from("owned_lenses").insert(
      lenses.map((lens) => ({
        user_id: user.id,
        brand: lens.brand,
        model: lens.model,
        notes: lens.notes || null
      }))
    );

    if (insertError) {
      return {
        status: "error",
        message: insertError.message
      };
    }
  }

  const existingLensKeys = new Set(existingLenses.map((lens) => lensKey(lens)));
  const nextLensKeys = new Set(lenses.map((lens) => lensKey(lens)));
  await recordActivities([
    {
      userId: user.id,
      action: "profile_updated",
      entityType: "profile",
      entityId: user.id,
      label: cleanString(parsed.data.fullName) || user.email || "Profile"
    },
    ...lenses
      .filter((lens) => !existingLensKeys.has(lensKey(lens)))
      .map((lens) => ({
        userId: user.id,
        action: "owned_lens_added",
        entityType: "owned_lens",
        label: `${lens.brand} ${lens.model}`.trim(),
        metadata: { brand: lens.brand, model: lens.model }
      })),
    ...existingLenses
      .filter((lens) => !nextLensKeys.has(lensKey(lens)))
      .map((lens) => ({
        userId: user.id,
        action: "owned_lens_removed",
        entityType: "owned_lens",
        label: `${lens.brand} ${lens.model}`.trim(),
        metadata: { brand: lens.brand, model: lens.model }
      }))
  ]);

  revalidatePath("/profile");
  revalidatePath("/insights");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");

  return {
    status: "success",
    message: "Profile saved."
  };
}

function parseLensDrafts(value: string | undefined) {
  if (!value) {
    return [];
  }

  try {
    const result = z.array(lensSchema).safeParse(JSON.parse(value));

    if (!result.success) {
      return [];
    }

    return result.data
      .map((lens) => ({
        brand: cleanString(lens.brand),
        model: cleanString(lens.model),
        notes: cleanString(lens.notes)
      }))
      .filter((lens) => lens.brand && lens.model)
      .slice(0, 30);
  } catch {
    return [];
  }
}

function cleanString(value: string | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function lensKey(lens: { brand: string; model: string }) {
  return `${lens.brand.trim().toLowerCase()}::${lens.model.trim().toLowerCase()}`;
}

function nullableNumberValue(value: string | undefined) {
  const normalized = cleanString(value).replace(",", ".");
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
