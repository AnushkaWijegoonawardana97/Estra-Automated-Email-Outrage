"use client";

import { slugify, type SearchTerm } from "@/lib/targetMarkets";

interface SearchTermsEditorProps {
  terms?: SearchTerm[];
  onChange: (terms: SearchTerm[]) => void;
}

export function SearchTermsEditor({ terms = [], onChange }: SearchTermsEditorProps) {
  function toggleTerm(id: string, enabled: boolean) {
    onChange(terms.map((term) => (term.id === id ? { ...term, enabled } : term)));
  }

  function removeTerm(id: string) {
    onChange(terms.filter((term) => term.id !== id));
  }

  function addTerm(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (terms.some((term) => term.term.toLowerCase() === trimmed.toLowerCase())) return;

    onChange([
      ...terms,
      { id: slugify(trimmed), term: trimmed, enabled: true },
    ]);
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-zinc-900">Search terms</h3>
      <p className="text-xs text-zinc-500">
        Global terms combined with each enabled city, e.g. salons + Colombo + Sri Lanka.
      </p>

      <ul className="space-y-2">
        {terms.map((term) => (
          <li
            key={term.id}
            className="flex items-center justify-between gap-3 rounded-md border border-zinc-100 px-3 py-2"
          >
            <label className="flex flex-1 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={term.enabled}
                onChange={(event) => toggleTerm(term.id, event.target.checked)}
              />
              {term.term}
            </label>
            <button
              type="button"
              onClick={() => removeTerm(term.id)}
              className="text-xs text-red-600 hover:underline"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const input = form.elements.namedItem("newTerm") as HTMLInputElement;
          addTerm(input.value);
          input.value = "";
        }}
      >
        <input
          name="newTerm"
          placeholder="Add search term"
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
        >
          Add
        </button>
      </form>
    </div>
  );
}
