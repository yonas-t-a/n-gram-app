import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { setModel, suggest } from "@/lib/model";

let loading: Promise<void> | undefined;
export async function POST(request: Request) {
  const { text, order, method } = await request.json();
  if (
    typeof text !== "string" ||
    text.length > 20000 ||
    ![1, 2, 3, 4].includes(order) ||
    !["mle", "laplace", "addk", "absdisc", "interp", "backoff"].includes(method)
  ) {
    return Response.json(
      { error: "Invalid prediction request." },
      { status: 400 },
    );
  }
  loading ??= readFile(process.cwd() + "/src/model/app_model.json.gz")
    .then((buffer) => {
      setModel(JSON.parse(gunzipSync(buffer).toString()));
    })
    .catch((error) => {
      loading = undefined;
      throw error;
    });
  await loading;
  const result = suggest(text, 5, order, method);
  return Response.json(result);
}
