import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

export function SelectBox({
  value,
  onChange,
  items
}: {
  value: string;
  onChange: (value: string) => void;
  items: Array<{ value: string; label: string }>;
}) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className="inline-flex h-9 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none ring-offset-2 transition focus-visible:ring-2 focus-visible:ring-sky-500">
        <Select.Value />
        <Select.Icon>
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="z-50 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
          <Select.Viewport className="p-1">
            {items.map((item) => (
              <Select.Item
                key={item.value}
                value={item.value}
                className="relative flex cursor-pointer select-none items-center rounded px-8 py-2 text-sm text-slate-700 outline-none data-[highlighted]:bg-sky-50"
              >
                <Select.ItemText>{item.label}</Select.ItemText>
                <Select.ItemIndicator className="absolute left-2 inline-flex items-center">
                  <Check className="h-4 w-4" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
