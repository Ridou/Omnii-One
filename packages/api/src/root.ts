import { authRouter } from "./router/auth";
import { helloRouter } from "./router/hello";
import { postRouter } from "./router/post";
import { tasksRouter } from "./router/tasks";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  post: postRouter,
  hello: helloRouter,
  tasks: tasksRouter,
  test2: helloRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
