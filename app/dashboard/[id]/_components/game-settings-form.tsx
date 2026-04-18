"use client";
import { Panel, PanelCard } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { SettingField, SettingsSchema } from "@/games";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type FieldValue = string | number | boolean;

interface InputProps {
  id: string;
  field: SettingField;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
}

const SettingInput = ({ id, field, value, onChange }: InputProps) => {
  switch (field.type) {
    case "boolean": {
      return (
        <Switch id={id} checked={Boolean(value)} onCheckedChange={(checked) => onChange(checked)} />
      );
    }
    case "number": {
      return (
        <Input
          id={id}
          type="number"
          className="w-32"
          value={typeof value === "number" ? value : ""}
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          onChange={(event) => {
            const next = event.target.valueAsNumber;
            if (Number.isFinite(next)) {
              onChange(next);
            }
          }}
        />
      );
    }
    case "select": {
      return (
        <Select value={String(value)} onValueChange={(next) => onChange(next)}>
          <SelectTrigger id={id} className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label ?? option.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    case "string": {
      return (
        <Input
          id={id}
          type="text"
          className="w-64"
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    }
    default: {
      return null;
    }
  }
};

interface RowProps {
  fieldKey: string;
  field: SettingField;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
}

const SettingRow = ({ fieldKey, field, value, onChange }: RowProps) => {
  const inputId = `setting-${fieldKey}`;
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg px-3 py-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <Label htmlFor={inputId} className="text-sm font-medium">
          {field.label}
        </Label>
        {field.help && <span className="text-muted-foreground text-xs">{field.help}</span>}
      </div>
      <div className="shrink-0">
        <SettingInput id={inputId} field={field} value={value} onChange={onChange} />
      </div>
    </div>
  );
};

interface Props {
  serverId: string;
  schema: SettingsSchema;
  initialValues: Record<string, unknown>;
}

const valuesEqual = (a: Record<string, unknown>, b: Record<string, unknown>): boolean => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (a[key] !== b[key]) {
      return false;
    }
  }
  return true;
};

export const GameSettingsForm = ({ serverId, schema, initialValues }: Props) => {
  const entries = useMemo(() => Object.entries(schema), [schema]);
  const [values, setValues] = useState<Record<string, FieldValue>>(
    () => initialValues as Record<string, FieldValue>,
  );
  const [baseline, setBaseline] = useState<Record<string, FieldValue>>(
    () => initialValues as Record<string, FieldValue>,
  );
  const [saving, setSaving] = useState(false);

  const dirty = !valuesEqual(values, baseline);

  const setField = (key: string, value: FieldValue) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const reset = () => setValues(baseline);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/servers/${serverId}/settings`, {
        body: JSON.stringify(values),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save settings");
      }
      const json = (await res.json()) as { settings: Record<string, FieldValue> };
      setBaseline(json.settings);
      setValues(json.settings);
      toast.success("Settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel title="Game Settings">
      <PanelCard className="flex flex-col gap-1">
        {entries.map(([key, field]) => (
          <SettingRow
            key={key}
            fieldKey={key}
            field={field}
            value={values[key]}
            onChange={(value) => setField(key, value)}
          />
        ))}
        <div className="flex items-center justify-end gap-2 px-3 py-2">
          {dirty && (
            <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={saving}>
              Reset
            </Button>
          )}
          <Button type="button" size="sm" onClick={save} disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </PanelCard>
    </Panel>
  );
};
