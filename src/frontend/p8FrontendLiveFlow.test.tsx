import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Application } from "express";
import { createRequest, createResponse } from "node-mocks-http";
import { newDb } from "pg-mem";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const motionOnlyProps = new Set([
    "initial",
    "animate",
    "exit",
    "variants",
    "transition",
    "whileHover",
    "whileTap",
    "layout",
    "layoutId",
  ]);

  function stripMotionProps(props: Record<string, unknown>) {
    const stripped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (!motionOnlyProps.has(key)) {
        stripped[key] = value;
      }
    }
    return stripped;
  }

  return {
    motion: new Proxy(
      {},
      {
        get: (_target, tag: string | symbol) => {
          if (typeof tag !== "string") {
            return undefined;
          }

          return React.forwardRef((props: Record<string, unknown>, ref) => {
            const sanitizedProps = stripMotionProps(props) as Record<string, unknown> & {
              children?: ReactNode;
            };
            const { children, ...domProps } = sanitizedProps;
            return React.createElement(tag, { ...domProps, ref }, children);
          });
        },
      },
    ),
    AnimatePresence: ({ children }: { children: ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

import { createBackendApp } from "../backend/api/createApp";
import IntakePage from "../pages/IntakePage";
import ProviderCases from "../pages/ProviderCases";
import ProviderCaseDetail from "../pages/ProviderCaseDetail";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationSql = readFileSync(
  path.resolve(__dirname, "../../db/migrations/001_phase2_core_schema.sql"),
  "utf8",
);

function createAppWithDatabase() {
  const db = newDb({ autoCreateForeignKeyIndices: true });
  db.public.none(migrationSql);
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  return {
    app: createBackendApp(pool),
    pool,
  };
}

interface InvokeOptions {
  method: "GET" | "POST" | "PATCH";
  url: string;
  role: string;
  userId?: string;
  body?: unknown;
}

async function invoke(app: Application, options: InvokeOptions) {
  const req = createRequest({
    method: options.method,
    url: options.url,
    headers: {
      "x-role": options.role,
      "x-user-id": options.userId ?? "",
    },
    body: options.body,
  });
  const res = createResponse({ eventEmitter: EventEmitter });

  await new Promise<void>((resolve, reject) => {
    res.on("end", () => resolve());
    app.handle(req, res, (error?: unknown) => {
      if (error) {
        reject(error);
      }
    });
  });

  const rawData = res._getData();
  let parsedBody: unknown = rawData;
  if (typeof rawData === "string" && rawData.length > 0) {
    try {
      parsedBody = JSON.parse(rawData);
    } catch {
      parsedBody = rawData;
    }
  }

  return {
    statusCode: res.statusCode,
    body: parsedBody as Record<string, unknown>,
  };
}

function renderWithProviders(ui: ReactNode, route: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("P8-Frontend-Live-Flow", () => {
  let app: Application;
  let pool: { end: () => Promise<void> };

  beforeEach(async () => {
    const instance = createAppWithDatabase();
    app = instance.app;
    pool = instance.pool;

    await pool.query(`
      INSERT INTO organizations (id, name, type)
      VALUES ('org-001', 'Cura Hospital', 'hospital');
    `);
    await pool.query(`
      INSERT INTO users (id, name, email, role, organization_id)
      VALUES ('user-clin-001', 'Dr. Sarah Chen', 'sarah.chen@cura.org', 'clinician', 'org-001');
    `);

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        const parsedUrl = new URL(url, "http://localhost");
        const headers = new Headers(init?.headers);
        const bodyText =
          typeof init?.body === "string" ? init.body : init?.body ? String(init.body) : "";
        const body = bodyText ? JSON.parse(bodyText) : undefined;

        const result = await invoke(app, {
          method: ((init?.method ?? "GET").toUpperCase() as "GET" | "POST" | "PATCH"),
          url: `${parsedUrl.pathname}${parsedUrl.search}`,
          role: headers.get("x-role") ?? "caregiver",
          userId: headers.get("x-user-id") ?? undefined,
          body,
        });

        return new Response(JSON.stringify(result.body), {
          status: result.statusCode,
          headers: {
            "content-type": "application/json",
          },
        });
      }),
    );
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await pool.end();
  });

  it("completes intake UI flow, shows case in provider list, and opens matching case detail", async () => {
    const intakeRender = renderWithProviders(<IntakePage />, "/intake");

    fireEvent.click(screen.getByRole("button", { name: /Begin Intake/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /I am a parent or caregiver/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /I am a parent or caregiver/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Continue$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Continue$/i }));

    fireEvent.change(screen.getByPlaceholderText("e.g. Ava"), {
      target: { value: "Ava" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. Chen"), {
      target: { value: "Stone" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. 14"), {
      target: { value: "12" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Continue$/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /What symptoms are you experiencing/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Anxiety \/ Panic/i }));
    for (const button of screen.getAllByRole("button", { name: /^Sometimes$/i })) {
      fireEvent.click(button);
    }
    fireEvent.click(screen.getByRole("button", { name: /^Continue$/i }));
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /How much is this affecting daily life/i }),
      ).toBeInTheDocument();
    });
    for (const button of screen.getAllByRole("button", { name: /^Sometimes$/i })) {
      fireEvent.click(button);
    }
    fireEvent.click(screen.getByRole("button", { name: /Continue to Summary/i }));

    await waitFor(() => {
      expect(screen.getByText(/Live Triage Recommendation/i)).toBeInTheDocument();
    });

    const reviewQueue = await invoke(app, {
      method: "GET",
      url: "/api/v1/provider/review-queue?status=all",
      role: "clinician",
      userId: "user-clin-001",
    });
    expect(reviewQueue.statusCode).toBe(200);
    expect(reviewQueue.body.count).toBeGreaterThanOrEqual(1);

    const caseId = String(reviewQueue.body.cases[0].sessionId);

    intakeRender.unmount();

    const casesRender = renderWithProviders(
      <Routes>
        <Route path="/provider/cases" element={<ProviderCases />} />
      </Routes>,
      "/provider/cases",
    );

    await waitFor(() => {
      expect(screen.getByText("Ava Stone")).toBeInTheDocument();
    });

    casesRender.unmount();

    renderWithProviders(
      <Routes>
        <Route path="/provider/cases/:id" element={<ProviderCaseDetail />} />
      </Routes>,
      `/provider/cases/${caseId}`,
    );

    await waitFor(() => {
      expect(screen.getByText("Ava Stone")).toBeInTheDocument();
      expect(
        screen.getByText(/Targeted screening with clinician review is recommended before final routing/i),
      ).toBeInTheDocument();
    });
  });
});
