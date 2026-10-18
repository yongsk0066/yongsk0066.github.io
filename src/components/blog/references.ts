export interface ReferenceInput {
  title: string;
  authors?: string;
  year?: number | string;
  publication?: string;
  url?: string;
  /** Keep an existing anchor when migrating an article. Defaults to the source key. */
  id?: string;
}

export interface Reference extends ReferenceInput {
  number: number;
  referenceId: string;
  citationId: string;
}

export type ReferenceCollection = Record<string, Reference>;

/** Declare sources in citation order; cite by key so renumbering stays automatic. */
export function defineReferences<
  const T extends Record<string, ReferenceInput>,
>(sources: T): { [K in keyof T]: Reference } {
  const ids = new Set<string>();
  const entries = Object.entries(sources).map(([key, source], index) => {
    const id = source.id ?? key;
    if (!/^[a-zA-Z0-9_-]+$/.test(id) || ids.has(id)) {
      throw new Error(`Reference id must be unique and URL-safe: ${id}`);
    }
    if (!source.title.trim()) {
      throw new Error(`Reference title is required: ${key}`);
    }
    if (source.url && !/^https?:\/\//.test(source.url)) {
      throw new Error(
        `Reference URL must start with https:// or http://: ${key}`
      );
    }
    ids.add(id);
    return [
      key,
      {
        ...source,
        number: index + 1,
        referenceId: `ref-${id}`,
        citationId: `cite-${id}`,
      },
    ];
  });
  return Object.fromEntries(entries) as { [K in keyof T]: Reference };
}
