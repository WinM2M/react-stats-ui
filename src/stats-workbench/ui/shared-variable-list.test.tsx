import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, jest } from "@jest/globals";
import * as React from "react";
import { SharedVariableList } from "./shared-variable-list";
import type { VariableMeta } from "../types";

const vars = (names: string[], type: VariableMeta["type"] = "continuous"): VariableMeta[] =>
  names.map((name) => ({ name, type }) as VariableMeta);

const cardOf = (name: string) => screen.getByText(name).closest("div") as HTMLElement;

describe("SharedVariableList", () => {
  it("끌던 변수가 목록에서 빠졌다 돌아와도 흐린 채로 남지 않는다", () => {
    const { rerender } = render(<SharedVariableList variables={vars(["a", "b"])} />);
    fireEvent.dragStart(screen.getByText("a").closest("li") as HTMLElement);
    expect(cardOf("a").className).toContain("opacity-50");

    // 역할 칸에 놓이면 목록에서 빠진다 -- 그 줄의 dragend 는 오지 않는다.
    rerender(<SharedVariableList variables={vars(["b"])} />);
    rerender(<SharedVariableList variables={vars(["a", "b"])} />);
    expect(cardOf("a").className).not.toContain("opacity-50");
  });

  it("어디서든 끌기가 끝나면 흐림을 푼다", () => {
    render(<SharedVariableList variables={vars(["a"])} />);
    fireEvent.dragStart(screen.getByText("a").closest("li") as HTMLElement);
    act(() => {
      document.dispatchEvent(new Event("drop", { bubbles: true }));
    });
    expect(cardOf("a").className).not.toContain("opacity-50");
  });

  it("표식을 누르면 명목 ↔ 척도를 바꾸라고 알린다", () => {
    const onTypeChange = jest.fn();
    render(
      <SharedVariableList
        variables={vars(["w1"], "nominal")}
        onTypeChange={onTypeChange}
        typeHintByName={() => "명목(N)으로 판정됨 — 눌러 척도로"}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "명목(N)으로 판정됨 — 눌러 척도로" }));
    expect(onTypeChange).toHaveBeenCalledWith("w1", "continuous");
  });
});
