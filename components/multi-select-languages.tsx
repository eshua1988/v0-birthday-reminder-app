import React, { useState } from "react";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
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
    <div className="border rounded p-2 bg-background">
      <Input
        placeholder="Поиск языка..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="mb-2"
      />
      <div className="max-h-40 overflow-y-auto space-y-1">
        {filtered.map(lang => (
          <label key={lang.value} className={cn("flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-accent", selected.includes(lang.value) && "bg-accent") }>
            <Checkbox checked={selected.includes(lang.value)} onCheckedChange={() => toggle(lang.value)} />
            <span className="text-lg">{lang.flag}</span>
            <span>{lang.label}</span>
          </label>
        ))}
        {filtered.length === 0 && <div className="text-muted-foreground px-2 py-1">Язык не найден</div>}
      </div>
      {selected.length > 0 && (
        <div className="mt-2 text-sm text-muted-foreground">
          Выбрано: {selected.map(val => languages.find(l => l.value === val)?.label).filter(Boolean).join(", ")}
        </div>
      )}
    </div>
  );
};