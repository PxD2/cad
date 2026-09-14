import { cn } from "@/lib/utils";
import { UNIT_LABEL, UNITS, type Unit } from "@/lib/cad/units";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function Btn({
  kind = "ghost",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { kind?: "primary" | "ghost" | "quiet" }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors duration-150 disabled:opacity-40",
        kind === "primary" && "bg-steel text-steel-fg hover:bg-fg",
        kind === "ghost" && "border border-border bg-raised text-fg hover:bg-surface",
        kind === "quiet" && "text-muted hover:bg-raised hover:text-fg",
        className,
      )}
      {...props}
    />
  );
}

export function Field({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-11 w-full rounded-sm border border-border bg-raised px-3 text-sm text-fg outline-none placeholder:text-faint focus:border-steel",
        className,
      )}
      {...props}
    />
  );
}

export function Area({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full resize-y rounded-sm border border-border bg-raised px-3 py-2 font-mono text-xs leading-relaxed text-fg outline-none placeholder:text-faint focus:border-steel",
        className,
      )}
      {...props}
    />
  );
}

export function Chip({
  active,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-medium transition-colors duration-150",
        active ? "border-steel bg-steel text-steel-fg" : "border-border bg-raised text-muted hover:text-fg",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="text-xs font-medium uppercase tracking-wide text-faint">{children}</div>;
}

export function UnitSwitch({
  value,
  onChange,
  className,
}: {
  value: Unit;
  onChange: (u: Unit) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex shrink-0 gap-1", className)} role="radiogroup" aria-label="Units">
      {UNITS.map((u) => (
        <Chip
          key={u}
          active={value === u}
          role="radio"
          aria-checked={value === u}
          onClick={() => onChange(u)}
          className="min-w-11 justify-center px-2.5"
        >
          {UNIT_LABEL[u]}
        </Chip>
      ))}
    </div>
  );
}
