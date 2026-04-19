interface BaseField<T> {
  label: string;
  help?: string;
  default: T;
}

export interface StringField extends BaseField<string> {
  type: "string";
  maxLength?: number;
  placeholder?: string;
}

export interface NumberField extends BaseField<number> {
  type: "number";
  min?: number;
  max?: number;
  step?: number;
}

export interface BooleanField extends BaseField<boolean> {
  type: "boolean";
}

export interface SelectOption {
  value: string;
  label?: string;
}

export interface SelectField<O extends string = string> extends BaseField<O> {
  type: "select";
  options: readonly SelectOption[];
}

export type SettingField = StringField | NumberField | BooleanField | SelectField;

export type SettingsSchema = Record<string, SettingField>;

export type SettingsValues<S extends SettingsSchema> = {
  [K in keyof S]: S[K] extends BooleanField
    ? boolean
    : S[K] extends NumberField
      ? number
      : S[K] extends SelectField<infer O>
        ? O
        : string;
};

export const defineSettings = <S extends SettingsSchema>(schema: S): S => schema;

const validateField = (field: SettingField, value: unknown): boolean => {
  switch (field.type) {
    case "string": {
      if (typeof value !== "string") {
        return false;
      }
      if (field.maxLength !== undefined && value.length > field.maxLength) {
        return false;
      }
      return true;
    }
    case "number": {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return false;
      }
      if (field.min !== undefined && value < field.min) {
        return false;
      }
      if (field.max !== undefined && value > field.max) {
        return false;
      }
      return true;
    }
    case "boolean": {
      return typeof value === "boolean";
    }
    case "select": {
      return typeof value === "string" && field.options.some((o) => o.value === value);
    }
    default: {
      return false;
    }
  }
};

export const getDefaults = <S extends SettingsSchema>(schema: S): SettingsValues<S> => {
  const result: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(schema)) {
    result[key] = field.default;
  }
  return result as SettingsValues<S>;
};

export const resolveSettings = <S extends SettingsSchema>(
  schema: S,
  stored: unknown,
): SettingsValues<S> => {
  const result = getDefaults(schema) as Record<string, unknown>;
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
    return result as SettingsValues<S>;
  }
  for (const [key, field] of Object.entries(schema)) {
    const value = (stored as Record<string, unknown>)[key];
    if (value !== undefined && validateField(field, value)) {
      result[key] = value;
    }
  }
  return result as SettingsValues<S>;
};

export type ValidateResult<S extends SettingsSchema> =
  | { ok: true; data: Partial<SettingsValues<S>> }
  | { ok: false; error: string };

export const validateSettings = <S extends SettingsSchema>(
  schema: S,
  input: unknown,
): ValidateResult<S> => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Settings must be an object", ok: false };
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const field = schema[key];
    if (!field) {
      return { error: `Unknown setting: ${key}`, ok: false };
    }
    if (!validateField(field, value)) {
      return { error: `Invalid value for ${key}`, ok: false };
    }
    out[key] = value;
  }
  return { data: out as Partial<SettingsValues<S>>, ok: true };
};
