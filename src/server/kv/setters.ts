import { kv } from "@vercel/kv";

const actions = {
  set: "set",
  increment: "increment",
  append: "append",
};
type Actions = keyof typeof actions;

export const setKvEntry = async (
  key: string,
  value: string,
  action: Actions,
) => {
  switch (action) {
    case actions.set:
      await kv.set(key, value);
      return value;
    case actions.increment:
      return await incrementLogic(key);
    case actions.append:
      return await appendLogic(key, value);
    default:
      throw new Error("Invalid action");
  }
};

async function incrementLogic(key: string) {
  const values = await kv.get(key);

  if (values === null) {
    await kv.set(key, 1);
    return 1;
  } else {
    const int = parseInt(values as string);
    const newInt = int + 1;
    await kv.set(key, newInt);
    return newInt;
  }
}

async function appendLogic(key: string, value: string) {
  const visits = await kv.get(key);

  if (visits === null) {
    const values = JSON.stringify([value]);
    await kv.set(key, values);
    return values;
  } else {
    const visitsArray = JSON.parse(visits as string) as Array<string>;

    const newVisits = JSON.stringify([...visitsArray, value]);

    await kv.set(key, newVisits);
    return newVisits;
  }
}
