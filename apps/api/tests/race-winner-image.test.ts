import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRaceWinnerImagePrompt,
  generateRaceWinnerImage,
  validateRaceWinnerImageInput,
} from "../src/domain/race-winner-image.ts";

test("validates and creates an ordered, bounded winner prompt", () => {
  const input = validateRaceWinnerImageInput({
    splitName: "Split 3",
    raceName: "Hungary",
    winners: [{ name: "Pilot One", position: 1 }, { name: "Pilot Two", position: 2 }],
    creativeDirection: "Night celebration",
  });
  assert.ok(input);
  const prompt = buildRaceWinnerImagePrompt(input);
  assert.ok(prompt.indexOf("1st: Pilot One") < prompt.indexOf("2nd: Pilot Two"));
  assert.match(prompt, /Night celebration/);
  assert.equal(validateRaceWinnerImageInput({ splitName: "x", raceName: "y", winners: [{ name: "a", position: 4 }] }), null);
  assert.equal(validateRaceWinnerImageInput({ splitName: "x", raceName: "y", winners: [{ name: "a", position: 1 }, { name: "b", position: 1 }] }), null);
});

test("sends the server key to Gemini and returns image data only", async () => {
  let requestHeaders: Record<string, string> | undefined;
  let requestBody = "";
  const fetcher: typeof fetch = async (_input, init) => {
    requestHeaders = init?.headers as Record<string, string> | undefined;
    requestBody = String(init?.body);
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [
      { text: "created" }, { inlineData: { mimeType: "image/png", data: "aGVsbG8=" } },
    ] } }] }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const result = await generateRaceWinnerImage("server-only-secret", "model-test", {
    splitName: "Split", raceName: "Race", winners: [{ name: "Winner", position: 1 }],
  }, fetcher);
  assert.equal(result.mimeType, "image/png");
  assert.equal(result.data, "aGVsbG8=");
  assert.equal(requestHeaders?.["x-goog-api-key"], "server-only-secret");
  assert.match(requestBody, /Winner/);
  assert.match(requestBody, /"aspectRatio":"16:9"/);
});
