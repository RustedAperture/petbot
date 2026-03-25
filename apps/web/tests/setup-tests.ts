// Enable React 18+ act() support in test environments that are not fully built into React.
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Add useful DOM matchers from testing-library.
import "@testing-library/jest-dom";
