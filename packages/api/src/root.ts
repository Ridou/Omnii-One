import { authRouter } from "./router/auth";
import { helloRouter } from "./router/hello";
import { postRouter } from "./router/post";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  post: postRouter,
  hello: helloRouter
});

// export type definition of API
export type AppRouter = typeof appRouter;
