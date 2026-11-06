import { defineSandbox } from "eve/sandbox";
import { JustBashSandbox } from "eve/sandbox/just-bash";

// The Master has no shell or file tools, so it needs no real sandbox. Without
// this file a production build outside Vercel finds no provider and logs errors.
export const environment = JustBashSandbox.environment();
export default defineSandbox(() => environment.open());
