import { type NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

import HTTP_STATUS from "http-status-codes";

import * as v from "valibot";
import { isNativeError } from "util/types";
import { setKvEntry } from "../kv/setters";

const actions = {
  page_visit: async ({
    headers,
  }: {
    message?: string;
    headers: NextRequest["headers"];
  }) => {
    const ip = headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";

    if (ip === "unknown") {
      return "ip unknown";
    }

    const visitIps = (await kv.get("visit_ips")) as string | undefined;
    const visitIpsArray = visitIps
      ? `${visitIps}`.split(",")
      : ([] as Array<string>);
    const hasVisited = Array.isArray(visitIps) ? visitIps.includes(ip) : false;

    if (!hasVisited) {
      visitIpsArray.push(ip);
      await setKvEntry("visit_ips", ip, "append");
    } else {
      return "already visited";
    }

    const visits = await kv.get("visits");
    const visitCount = isNaN(Number(visits)) ? 1 : Number(visits);

    return await setKvEntry("visits", `${visitCount}`, "increment");
  },
  ping_pong: async (_args: {
    message?: string;
    headers: NextRequest["headers"];
  }) => {
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
  action: v.optional(v.pipe(v.string(), getActionsVType())),
  message: v.optional(v.string()),
});
type MessageContext = v.InferOutput<typeof MessageContext>;

export const poormansWsHandler = async (req: NextRequest) => {
  const { messageContext } = (await req.json()) as {
    messageContext: MessageContext;
  };

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

  const result = await actionHandler({
    message,
    headers: req.headers,
  });
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
