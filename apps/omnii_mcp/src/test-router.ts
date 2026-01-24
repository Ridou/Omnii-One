import { initTRPC } from "@trpc/server";

const t = initTRPC.context<{}>().create();

// Create individual routers
const tasksRouter = t.router({
  getCompleteOverview: t.procedure.query(() => {
    return {
      success: true,
      data: {
        taskLists: [],
        totalLists: 0,
        totalTasks: 0,
        totalCompleted: 0,
        totalPending: 0,
        totalOverdue: 0,
        lastSyncTime: new Date().toISOString(),
        syncSuccess: true,
      },
      message: "Test response - tRPC is working!",
    };
  }),
});

const helloRouter = t.router({
  test: t.procedure.query(() => {
    return "hello from test router";
  }),
});

// Main app router
export const testRouter = t.router({
  hello: helloRouter,
  tasks: tasksRouter,
});

export type TestRouter = typeof testRouter; 