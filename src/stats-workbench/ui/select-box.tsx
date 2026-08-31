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
            {/*
              빈 문자열 value 를 가진 항목은 그리지 않는다.

              Radix 는 빈 문자열을 "선택 해제" 신호로 예약해 두고 항목 value 로 쓰면
              예외를 던진다. 그 예외는 렌더 중에 터지므로 이 컴포넌트만 죽는 게 아니라
              **임베더 화면 전체가 날아간다.** 데이터에서 흘러든 값 하나가 호스트 앱을
              무너뜨리는 것은 라이브러리 쪽에서 막아야 한다.
            */}
            {items.filter((item) => item.value !== "").map((item) => (
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
