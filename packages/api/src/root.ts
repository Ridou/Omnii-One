import { authRouter } from "./router/auth";
import { calendarRouter } from "./router/calendar";
import { contactsRouter } from "./router/contacts";
import { emailRouter } from "./router/email";
import { helloRouter } from "./router/hello";
import { postRouter } from "./router/post";
import { tasksRouter } from "./router/tasks";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  post: postRouter,
  hello: helloRouter,
  tasks: tasksRouter,
  calendar: calendarRouter,
  contacts: contactsRouter,
  email: emailRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
