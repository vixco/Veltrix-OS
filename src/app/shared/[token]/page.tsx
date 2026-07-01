"use client";

import { useEffect, useState, use } from "react";
import { pb, POCKETBASE_URL } from "@/lib/pocketbase";
import { ClaudeLogo } from "@/components/claude-logo";
import { ArtifactDocument } from "@/components/artifacts/artifact-document";
import { ArtifactComparison } from "@/components/artifacts/artifact-comparison";
import { ArtifactCode } from "@/components/artifacts/artifact-code";
import { ArtifactPlanner } from "@/components/artifacts/artifact-planner";
import { ArtifactDesign } from "@/components/artifacts/artifact-design";
import type { Artifact } from "@/lib/artifacts";
import { decodeArtifactFromHash } from "@/lib/utils";

export default function SharedArtifactPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      // Backendless share: the artifact is embedded in the URL hash.
      if (token === "local") {
        const decoded = decodeArtifactFromHash(window.location.hash);
        if (decoded) {
          setArtifact(decoded);
        } else {
          setError("This share link is incomplete or corrupted.");
        }
        setLoading(false);
        return;
      }
      try {
        // Parameterized filter (no string interpolation of the URL segment) and
        // visibility enforcement: an anonymous visitor may only resolve PUBLIC
        // shares; a signed-in owner may also resolve their own private shares.
        // NOTE: this client filter is defense-in-depth only — the PocketBase
        // collection's List/View API rules MUST also enforce this server-side
        // (see README "Sharing security").
        const client = pb();
        const ownerId = client.authStore.isValid ? client.authStore.record?.id : null;
        const filter = ownerId
          ? client.filter("shareToken = {:t} && (isPublic = true || owner = {:owner})", { t: token, owner: ownerId })
          : client.filter("shareToken = {:t} && isPublic = true", { t: token });
        const records = await client.collection("shared_artifacts").getList(1, 1, { filter });
        if (records.items.length === 0) {
          setError("Artifact not found or link has expired.");
          return;
        }
        const record = records.items[0];
        const parsed = JSON.parse(record.content);
        setArtifact(parsed);
      } catch (err) {
        setError("Failed to load shared artifact.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <ClaudeLogo className="h-10 w-10 text-accent animate-pulse" />
      </div>
    );
  }

  if (error || !artifact) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center max-w-sm">
          <ClaudeLogo className="h-10 w-10 text-accent mx-auto mb-4" />
          <p className="text-[15px] text-muted-fg">{error || "Artifact not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border px-6 py-3 flex items-center gap-2">
        <ClaudeLogo className="h-5 w-5 text-accent" />
        <span className="text-sm font-medium text-foreground">{artifact.title}</span>
        <span className="text-[11px] text-muted-fg ml-2 px-2 py-0.5 rounded bg-surface-2">Shared</span>
      </div>
      <div className="mx-auto max-w-4xl p-6" style={{ height: "calc(100vh - 56px)" }}>
        {artifact.type === "document" && <ArtifactDocument artifact={artifact} />}
        {artifact.type === "comparison" && <ArtifactComparison artifact={artifact} />}
        {artifact.type === "code" && <ArtifactCode artifact={artifact} />}
        {artifact.type === "planner" && <ArtifactPlanner artifact={artifact} />}
        {artifact.type === "design" && <ArtifactDesign artifact={artifact} />}
      </div>
    </div>
  );
}
