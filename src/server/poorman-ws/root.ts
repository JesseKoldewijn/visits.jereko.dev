import { type NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

import HTTP_STATUS from "http-status-codes";

import * as v from "valibot";
import { isNativeError } from "util/types";

const actions = {
  page_visit: async (_args: unknown) => {
    const visits = await kv.get("visits");

    if (visits === null) {
      await kv.set("visits", 1);
    } else {
      const int = parseInt(visits as string);
      await kv.set("visits", int + 1);
    }
  },
  ping_pong: async (_args: unknown) => {
    return "pong";
  },
};

type Actions = Array<keyof typeof actions>;
const actionsKeys = Object.keys(actions) as Actions;

const getActionsVType = () => {
  const types = [];
  for (const key of actionsKeys) {
    types.push(v.literal(key));
  }
  return v.union(types);
};

const MessageContext = v.object({
  messageContext: v.object({
    action: v.optional(v.pipe(v.string(), getActionsVType())),
    message: v.optional(v.string()),
  }),
});
type MessageContext = v.InferOutput<typeof MessageContext>;

export const poormansWsHandler = async (req: NextRequest) => {
  const { messageContext } = (await req.json()) as MessageContext;

  const contextValidity = v.safeParse(MessageContext, messageContext);

  if (!contextValidity.success) {
    const flattened = v.flatten(contextValidity.issues);
    return NextResponse.json(
      {
        error: flattened,
      },
      {
        status: HTTP_STATUS.BAD_REQUEST,
      },
    );
  }

  const { action, message } = messageContext;
  const actionHandler = action
    ? actions[action]
    : new Error("No action handler found");

  if (isNativeError(actionHandler)) {
    return NextResponse.json(
      {
        error: "No action handler found",
      },
      {
        status: HTTP_STATUS.BAD_REQUEST,
      },
    );
  }

  const result = await actionHandler(message);
  const isNothingOrVoid = result === undefined || result === null;
  const returnResult = isNothingOrVoid ? "ok" : result;

  return NextResponse.json(
    {
      result: returnResult,
    },
    {
      status: returnResult === "pong" ? HTTP_STATUS.OK : HTTP_STATUS.ACCEPTED,
    },
  );
};
