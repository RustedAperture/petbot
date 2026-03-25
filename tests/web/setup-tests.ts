// Enable React 18+ act() support in test environments that are not fully built into React.
// See: https://reactjs.org/docs/testing.html#act
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
