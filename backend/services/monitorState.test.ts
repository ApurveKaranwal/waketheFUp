import { describe, expect, it } from "bun:test";
import { transitionMonitorState } from "./monitorState";

describe("transitionMonitorState", () => {
  it("opens an incident after three consecutive failures", () => {
    const first = transitionMonitorState({ failureCount: 0, incidentNumber: 0, isDown: false }, false);
    const second = transitionMonitorState(first, false);
    const third = transitionMonitorState(second, false);

    expect(first.alertEvent).toBeNull();
    expect(second.alertEvent).toBeNull();
    expect(third).toEqual({
      failureCount: 3,
      incidentNumber: 1,
      isDown: true,
      alertEvent: "DOWN",
    });
  });

  it("does not create repeated down alerts while the incident remains open", () => {
    const stillDown = transitionMonitorState(
      { failureCount: 3, incidentNumber: 1, isDown: true },
      false,
    );

    expect(stillDown.failureCount).toBe(4);
    expect(stillDown.incidentNumber).toBe(1);
    expect(stillDown.alertEvent).toBeNull();
  });

  it("resets the failure count and emits one recovery event", () => {
    const recovered = transitionMonitorState(
      { failureCount: 4, incidentNumber: 1, isDown: true },
      true,
    );

    expect(recovered).toEqual({
      failureCount: 0,
      incidentNumber: 1,
      isDown: false,
      alertEvent: "RECOVERED",
    });
    expect(transitionMonitorState(recovered, true).alertEvent).toBeNull();
  });

  it("assigns a new incident number after recovery", () => {
    const downAgain = transitionMonitorState(
      { failureCount: 2, incidentNumber: 1, isDown: false },
      false,
    );

    expect(downAgain.incidentNumber).toBe(2);
    expect(downAgain.alertEvent).toBe("DOWN");
  });
});
