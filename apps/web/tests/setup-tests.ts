// Set a test-only internal API secret so session cookie creation works
// without a hardcoded dev fallback (removed for security compliance).
process.env.INTERNAL_API_SECRET = "test-internal-api-secret";

// Enable React 18+ act() support in test environments that are not fully built into React.
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Add useful DOM matchers from testing-library.
import "@testing-library/jest-dom/vitest";

// happy-dom 21 implements the Web Animations API, whose cancelled animations
// reject `finished`. framer-motion leaves those rejections unhandled, so hide
// `animate` and let motion use its JS animation fallback in tests.
if (typeof Element !== "undefined") {
  for (const proto of [Element.prototype, HTMLElement.prototype]) {
    if (Object.prototype.hasOwnProperty.call(proto, "animate")) {
      delete (proto as Partial<Element>).animate;
    }
  }
}
