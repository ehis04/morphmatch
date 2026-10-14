import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { parseSavedComparisons } from "../lib/comparisons";

async function main() {
  // Uses disposable users on the project's existing local stack. Never resets data.
  const config = JSON.parse(
    execFileSync("supabase", ["status", "-o", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })
  ) as Record<string, string>;
  const url = new URL(config.API_URL);
  assert.ok(
    ["127.0.0.1", "localhost"].includes(url.hostname),
    "This check runs only against local Supabase."
  );
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const owner = createClient(url.toString(), config.ANON_KEY, options);
  const stranger = createClient(url.toString(), config.ANON_KEY, options);
  const admin = createClient(url.toString(), config.SERVICE_ROLE_KEY, options);
  const userIds: string[] = [];
  const password = `Regression-${randomUUID()}`;

  try {
    for (const client of [owner, stranger]) {
      const { data, error } = await client.auth.signUp({
        email: `morphmatch-test-${randomUUID()}@example.com`,
        password,
      });
      assert.ifError(error);
      assert.ok(data.user);
      userIds.push(data.user.id);
      assert.ok(
        data.session,
        "Local email confirmations must be disabled for this integration check."
      );
    }
    assert.ifError((await owner.auth.signOut()).error);
    const { data: ownerData } = await admin.auth.admin.getUserById(userIds[0]);
    assert.ok(ownerData.user?.email);
    assert.ifError(
      (await owner.auth.signInWithPassword({ email: ownerData.user.email, password })).error
    );

    const input = {
      title: "Disposable regression comparison",
      subject: {
        kind: "custom",
        label: "Me",
        stats: { heightCm: 183, weightKg: 85, wingspanCm: 183, gender: "m" },
        wingspanEstimated: true,
      },
      target_athlete_id: "marcus-rashford",
      mode: "table",
    };
    const { data: inserted, error: saveError } = await owner
      .from("saved_comps")
      .insert(input)
      .select("id,title,subject,target_athlete_id,mode,created_at")
      .single();
    assert.ifError(saveError);
    assert.ok(inserted);
    assert.equal(parseSavedComparisons([inserted]).comps.length, 1);
    const id = inserted.id as string;

    const anonymous = createClient(url.toString(), config.ANON_KEY, options);
    assert.ok((await anonymous.from("saved_comps").select("id")).error);
    assert.equal((await stranger.from("saved_comps").select("id").eq("id", id)).data?.length, 0);
    assert.equal(
      (await stranger.from("saved_comps").delete().eq("id", id).select("id")).data?.length,
      0
    );
    assert.ok((await stranger.from("saved_comps").insert({ ...input, user_id: userIds[0] })).error);

    const invalidInputs: Record<string, unknown>[] = [
      { ...input, subject: null },
      { ...input, subject: {} },
      { ...input, subject: { kind: "athlete" } },
      {
        ...input,
        subject: { ...input.subject, stats: { ...input.subject.stats, heightCm: "183" } },
      },
      { ...input, subject: { ...input.subject, stats: { ...input.subject.stats, weightKg: -1 } } },
      { ...input, mode: "invalid" },
      { ...input, title: "   " },
      { ...input, target_athlete_id: "" },
    ];
    for (const invalid of invalidInputs) {
      assert.ok(
        (await owner.from("saved_comps").insert(invalid)).error,
        "Malformed new comparison should be rejected by the database."
      );
    }

    const privileges = execFileSync(
      "docker",
      [
        "exec",
        "supabase_db_morphmatch",
        "psql",
        "-U",
        "postgres",
        "-Atc",
        "select privilege_type from information_schema.role_table_grants where table_schema='public' and table_name='saved_comps' and grantee='authenticated' order by privilege_type",
      ],
      { encoding: "utf8" }
    )
      .trim()
      .split("\n");
    assert.deepEqual(privileges, ["DELETE", "INSERT", "SELECT"]);
    const { data: deleted, error: deleteError } = await owner
      .from("saved_comps")
      .delete()
      .eq("id", id)
      .select("id");
    assert.ifError(deleteError);
    assert.equal(deleted?.length, 1);
    assert.equal((await owner.from("saved_comps").select("id").eq("id", id)).data?.length, 0);
    console.log(
      "Local signup/sign-in/save/delete, two-user ownership, payload constraints and database privilege checks passed."
    );
  } finally {
    for (const id of userIds) {
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) console.error("Could not remove disposable local test user:", error.message);
    }
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Account integration checks failed.");
  process.exitCode = 1;
});
