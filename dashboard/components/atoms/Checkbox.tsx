"use client";

interface CheckboxProps {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
}

export function Checkbox({
  checked,
  disabled = false,
  onChange,
  ariaLabel,
}: CheckboxProps) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.checked)}
      onClick={(event) => event.stopPropagation()}
      className="size-4 rounded border-zinc-300 text-violet-600 focus:ring-violet-500 disabled:opacity-40"
    />
  );
}
