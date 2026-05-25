"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Panel, SectionHeader } from "@/components/ui/panel";
import { saveProfile, type ProfileActionState } from "@/lib/actions/profile";
import type { OwnedLens, Profile } from "@/lib/types/domain";

type LensDraft = {
  id: string;
  brand: string;
  model: string;
  notes: string;
};

const initialState: ProfileActionState = {
  status: "idle",
  message: ""
};

export function ProfileForm({
  profile,
  lenses,
  fallbackEmail
}: {
  profile: Profile | null;
  lenses: OwnedLens[];
  fallbackEmail: string | null;
}) {
  const [state, formAction, pending] = useActionState(saveProfile, initialState);
  const [lensDrafts, setLensDrafts] = useState<LensDraft[]>(() =>
    lenses.length > 0 ? lenses.map(toLensDraft) : [createLensDraft()]
  );
  const lensesJson = useMemo(
    () =>
      JSON.stringify(
        lensDrafts.map((lens) => ({
          brand: lens.brand,
          model: lens.model,
          notes: lens.notes
        }))
      ),
    [lensDrafts]
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
    }

    if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state]);

  function updateLens(id: string, field: keyof Omit<LensDraft, "id">, value: string) {
    setLensDrafts((current) =>
      current.map((lens) => (lens.id === id ? { ...lens, [field]: value } : lens))
    );
  }

  function removeLens(id: string) {
    setLensDrafts((current) => current.filter((lens) => lens.id !== id));
  }

  return (
    <form action={formAction} className="grid gap-5">
      <input type="hidden" name="lensesJson" value={lensesJson} />

      <Panel>
        <SectionHeader eyebrow="Identity" title="Profile details" />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Full name">
            <Input name="fullName" defaultValue={profile?.full_name ?? ""} />
          </Field>
          <Field label="Company name">
            <Input name="company" defaultValue={profile?.company ?? ""} />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" defaultValue={profile?.email ?? fallbackEmail ?? ""} />
          </Field>
          <Field label="Website">
            <Input name="website" defaultValue={profile?.website ?? ""} placeholder="https://" />
          </Field>
        </div>
      </Panel>

      <Panel>
        <SectionHeader eyebrow="Home base" title="Travel map origin" />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Home base city">
            <Input name="homeBaseCity" defaultValue={profile?.home_base_city ?? ""} />
          </Field>
          <Field label="Home base country">
            <Input name="homeBaseCountry" defaultValue={profile?.home_base_country ?? ""} />
          </Field>
          <Field label="Home base latitude">
            <Input
              name="homeBaseLatitude"
              type="number"
              step="0.000001"
              defaultValue={stringValue(profile?.home_base_latitude)}
              placeholder="51.535000"
            />
          </Field>
          <Field label="Home base longitude">
            <Input
              name="homeBaseLongitude"
              type="number"
              step="0.000001"
              defaultValue={stringValue(profile?.home_base_longitude)}
              placeholder="5.630000"
            />
          </Field>
        </div>
      </Panel>

      <Panel>
        <SectionHeader eyebrow="Social" title="Online presence" />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Instagram">
            <Input name="instagram" defaultValue={profile?.instagram ?? ""} />
          </Field>
          <Field label="YouTube">
            <Input name="youtube" defaultValue={profile?.youtube ?? ""} />
          </Field>
          <Field label="Vimeo">
            <Input name="vimeo" defaultValue={profile?.vimeo ?? ""} />
          </Field>
          <Field label="Facebook">
            <Input name="facebook" defaultValue={profile?.facebook ?? ""} />
          </Field>
          <Field label="LinkedIn">
            <Input name="linkedin" defaultValue={profile?.linkedin ?? ""} />
          </Field>
        </div>
      </Panel>

      <Panel>
        <SectionHeader
          eyebrow="Owned lenses"
          title="Lens sets"
          action={
            <Button
              type="button"
              variant="secondary"
              icon={<Plus size={16} />}
              onClick={() => setLensDrafts((current) => [...current, createLensDraft()])}
            >
              Add lens
            </Button>
          }
        />
        <div className="grid gap-3">
          {lensDrafts.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5 text-sm text-white/48">
              No owned lenses yet.
            </div>
          ) : null}

          {lensDrafts.map((lens) => (
            <div
              key={lens.id}
              className="grid gap-4 rounded-lg border border-white/10 bg-white/[0.035] p-4 md:grid-cols-[1fr_1fr_auto]"
            >
              <Field label="Brand">
                <Input
                  value={lens.brand}
                  onChange={(event) => updateLens(lens.id, "brand", event.target.value)}
                  placeholder="IronGlass"
                />
              </Field>
              <Field label="Model">
                <Input
                  value={lens.model}
                  onChange={(event) => updateLens(lens.id, "model", event.target.value)}
                  placeholder="MKII Soviet"
                />
              </Field>
              <div className="flex items-end justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  icon={<Trash2 size={15} />}
                  onClick={() => removeLens(lens.id)}
                >
                  Remove
                </Button>
              </div>
              <div className="md:col-span-3">
                <Field label="Notes">
                  <Textarea
                    value={lens.notes}
                    onChange={(event) => updateLens(lens.id, "notes", event.target.value)}
                    placeholder="Coverage, focal range, condition"
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="flex justify-end">
        <Button type="submit" icon={<Save size={16} />} disabled={pending}>
          {pending ? "Saving..." : "Save profile"}
        </Button>
      </div>
    </form>
  );
}

function toLensDraft(lens: OwnedLens): LensDraft {
  return {
    id: lens.id,
    brand: lens.brand,
    model: lens.model,
    notes: lens.notes ?? ""
  };
}

function createLensDraft(): LensDraft {
  return {
    id: `lens-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    brand: "",
    model: "",
    notes: ""
  };
}

function stringValue(value: number | string | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}
