import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthSessionProvider, useAuthSession } from "@/features/auth/AuthSessionProvider";

const harness = vi.hoisted(() => ({
  onAuthChange: null as ((event: string, session: unknown) => void) | null,
  pending: [] as Array<{
    userId: string;
    resolve: (result: { data: unknown; error: null }) => void;
  }>,
}));

vi.mock("@/integrations/supabase/client", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
      onAuthStateChange: vi.fn((callback: (event: string, session: unknown) => void) => {
        harness.onAuthChange = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      signOut: vi.fn(async () => ({ error: null })),
    },
    from: vi.fn(() => ({
      select: () => ({
        eq: (_column: string, userId: string) => ({
          maybeSingle: () => new Promise<{ data: unknown; error: null }>((resolve) => {
            harness.pending.push({ userId, resolve });
          }),
        }),
      }),
    })),
  },
}));

const sessionFor = (id: string) => ({
  user: { id, email: `${id}@example.test`, user_metadata: {} },
}) as unknown as Session;

const rowFor = (id: string) => ({
  id,
  role: "customer",
  status: "active",
  created_at: "2026-10-13T00:00:00.000Z",
});

const Viewer = () => {
  const { user, profile, signOut, loading } = useAuthSession();
  return (
    <div>
      <span data-testid="current-user">{user?.id || "none"}</span>
      <span data-testid="current-profile">{profile?.id || "none"}</span>
      <span data-testid="loading">{String(loading)}</span>
      <button type="button" onClick={() => void signOut()}>Sign out</button>
    </div>
  );
};

const emitSession = (session: Session | null) => {
  if (!harness.onAuthChange) throw new Error("Auth callback was not installed");
  harness.onAuthChange("SIGNED_IN", session);
};

beforeEach(() => {
  harness.pending.length = 0;
  harness.onAuthChange = null;
});

describe("R2 auth session race protection", () => {
  it("does not let an older profile result replace a newer account", async () => {
    render(<AuthSessionProvider><Viewer /></AuthSessionProvider>);
    await waitFor(() => expect(harness.onAuthChange).not.toBeNull());

    act(() => emitSession(sessionFor("user-a")));
    await waitFor(() => expect(harness.pending).toHaveLength(1));
    act(() => emitSession(sessionFor("user-b")));
    await waitFor(() => expect(harness.pending).toHaveLength(2));

    await act(async () => {
      harness.pending[1].resolve({ data: rowFor("user-b"), error: null });
    });
    await waitFor(() => expect(screen.getByTestId("current-profile").textContent).toBe("user-b"));

    await act(async () => {
      harness.pending[0].resolve({ data: rowFor("user-a"), error: null });
    });
    expect(screen.getByTestId("current-user").textContent).toBe("user-b");
    expect(screen.getByTestId("current-profile").textContent).toBe("user-b");
  });

  it("invalidates pending profile requests immediately upon sign-out", async () => {
    render(<AuthSessionProvider><Viewer /></AuthSessionProvider>);
    await waitFor(() => expect(harness.onAuthChange).not.toBeNull());
    act(() => emitSession(sessionFor("user-a")));
    await waitFor(() => expect(harness.pending).toHaveLength(1));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    });
    await act(async () => {
      harness.pending[0].resolve({ data: rowFor("user-a"), error: null });
    });
    expect(screen.getByTestId("current-user").textContent).toBe("none");
    expect(screen.getByTestId("current-profile").textContent).toBe("none");
    expect(screen.getByTestId("loading").textContent).toBe("false");
  });
});
