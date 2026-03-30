import { createClerkClient } from "@clerk/backend";
import type { AuthSession } from "../../../src/types/app";

function getClerkConfig() {
  const publishableKey =
    process.env.CLERK_PUBLISHABLE_KEY?.trim() ??
    process.env.VITE_CLERK_PUBLISHABLE_KEY?.trim() ??
    "";
  const secretKey = process.env.CLERK_SECRET_KEY?.trim() ?? "";

  if (!publishableKey || !secretKey) {
    throw new Error("CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY are required.");
  }

  return {
    publishableKey,
    secretKey,
  };
}

let clerkClientCache: ReturnType<typeof createClerkClient> | null = null;

function getClerkClient() {
  if (!clerkClientCache) {
    const { publishableKey, secretKey } = getClerkConfig();

    clerkClientCache = createClerkClient({
      publishableKey,
      secretKey,
    });
  }

  return clerkClientCache;
}

function nameFromUser(user: Awaited<ReturnType<ReturnType<typeof createClerkClient>["users"]["getUser"]>>) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  const primaryEmail =
    user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? "";

  return {
    email: primaryEmail,
    name: fullName || user.username || primaryEmail || "Reader",
  };
}

export async function getSession(request: Request) {
  const clerkClient = getClerkClient();
  const requestState = await clerkClient.authenticateRequest(request, {
    acceptsToken: "session_token",
  });

  if (!requestState.isAuthenticated) {
    return null;
  }

  const auth = requestState.toAuth();

  if (!auth.userId) {
    return null;
  }

  const user = await clerkClient.users.getUser(auth.userId);
  const profile = nameFromUser(user);

  return {
    authenticated: true,
    user: {
      id: user.id,
      email: profile.email,
      name: profile.name,
      avatarUrl: user.imageUrl,
    },
  } satisfies AuthSession;
}

export async function requireIdentityUser(request: Request) {
  const session = await getSession(request);

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session.user;
}
