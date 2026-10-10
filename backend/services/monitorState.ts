export type MonitorState = {
  failureCount: number;
  incidentNumber: number;
  isDown: boolean;
};

export type MonitorTransition = MonitorState & {
  alertEvent: "DOWN" | "RECOVERED" | null;
};

export function transitionMonitorState(
  current: MonitorState,
  checkSucceeded: boolean,
  failureThreshold = 3,
): MonitorTransition {
  const failureCount = checkSucceeded ? 0 : current.failureCount + 1;
  const openedIncident = !checkSucceeded && !current.isDown && failureCount >= failureThreshold;
  const recoveredIncident = checkSucceeded && current.isDown;

  return {
    failureCount,
    incidentNumber: current.incidentNumber + (openedIncident ? 1 : 0),
    isDown: openedIncident ? true : recoveredIncident ? false : current.isDown,
    alertEvent: openedIncident ? "DOWN" : recoveredIncident ? "RECOVERED" : null,
  };
}
