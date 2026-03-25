// Minimal Next.js navigation stub for use in Vitest tests (via test.alias in vite.config.ts)
export const usePathname = () => "/";
export const useRouter = () => ({
  push: () => {},
  replace: () => {},
  back: () => {},
});
export const useSearchParams = () => new URLSearchParams();
export const useParams = () => ({});
