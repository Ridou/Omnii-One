

import { protectedProcedure, publicProcedure } from "../trpc";

export const helloRouter = {
  test: publicProcedure.query(({ ctx }) => {
    return "hello wrold"
  }),
  create: protectedProcedure.query(({ctx}) => {
    return "secret hello"
  } )
}
