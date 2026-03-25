import { createElement } from "react";
// Minimal Next.js Link stub: renders a plain <a> element
const Link = ({ href, children, ...props }: any) =>
  createElement("a", { href, ...props }, children);
export default Link;
