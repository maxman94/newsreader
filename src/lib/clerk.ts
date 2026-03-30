export const clerkConfig = {
  publishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim() ?? "",
};

export const hasClerkConfig = clerkConfig.publishableKey.length > 0;
