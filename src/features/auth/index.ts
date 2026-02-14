export {
  getAuthClientAction,
  isAuthConfiguredAction,
  signInWithPasswordAction,
  signOutAction,
  signUpWithPasswordAction,
  type BrowserAuthClient,
} from "@/features/auth/model";
export { toSafeNextPath } from "@/features/auth/model";
export { useAuthSession } from "@/features/auth/hooks";
