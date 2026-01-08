import React, { useState } from "react";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { cn } from "@/lib/utils";

interface Language {
  value: string;
  label: string;
  flag: string;
}

interface Props {
  languages: Language[];
}

export const MultiSelectLanguages: React.FC<Props> = ({ languages }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = languages.filter(l =>
    l.label.toLowerCase().includes(search.toLowerCase()) ||
    l.value.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (val: string) => {
    setSelected(sel =>
      sel.includes(val) ? sel.filter(v => v !== val) : [...sel, val]
    );
  };

  return (
    <div className="relative w-full max-w-md">
      <Label className="mb-1 block">Языки интерфейса</Label>
      <button
        type="button"
        className="w-full border rounded px-3 py-2 text-left bg-background hover:bg-accent focus:outline-none"
        onClick={() => setOpen(o => !o)}
      >
        {selected.length > 0
          ? selected.map(val => languages.find(l => l.value === val)?.label).filter(Boolean).join(", ")
          : "Выберите языки..."}
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full border rounded bg-background shadow-lg p-2">
          <Input
            placeholder="Поиск языка..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="mb-2"
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filtered.map(lang => (
              <label key={lang.value} className={cn("flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-accent", selected.includes(lang.value) && "bg-accent") }>
                <Checkbox checked={selected.includes(lang.value)} onCheckedChange={() => toggle(lang.value)} />
                <span className="text-lg">{lang.flag}</span>
                <span>{lang.label}</span>
              </label>
            ))}
            {filtered.length === 0 && <div className="text-muted-foreground px-2 py-1">Язык не найден</div>}
          </div>
          <div className="flex justify-end mt-2">
            <button className="text-sm text-primary px-2 py-1 hover:underline" onClick={() => setOpen(false)}>Готово</button>
          </div>
        </div>
      )}
    </div>
  );
};