import { describe, expect, it } from "vitest";
import { assertRowsChanged, NO_ROWS_CHANGED_MESSAGE } from "./dbWrite";

describe("assertRowsChanged", () => {
  it("passes when the expected rows came back", () => {
    expect(assertRowsChanged([{ id: "a" }])).toHaveLength(1);
    expect(assertRowsChanged([{ id: "a" }, { id: "b" }], 2)).toHaveLength(2);
  });

  it("throws the Finnish message for zero or missing rows", () => {
    expect(() => assertRowsChanged([])).toThrow(NO_ROWS_CHANGED_MESSAGE);
    expect(() => assertRowsChanged(null)).toThrow(NO_ROWS_CHANGED_MESSAGE);
    expect(() => assertRowsChanged([{ id: "a" }], 2)).toThrow(NO_ROWS_CHANGED_MESSAGE);
  });
});
