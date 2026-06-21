"use client";

import { useState, useEffect } from "react";
import { X, Share2, Link2, Copy, Check, Users, Globe, Lock, ExternalLink } from "lucide-react";
import { useArtifactStore } from "@/lib/store";
import { useAuthStore } from "@/lib/auth-store";
import { pb } from "@/lib/pocketbase";
import type { Artifact } from "@/lib/artifacts";
import { cn, encodeArtifactToHash } from "@/lib/utils";
import { ClaudeLogo } from "./claude-logo";

interface CoworkPanelProps {
  open: boolean;
  onClose: () => void;
  artifact: Artifact | null;
}

export function CoworkPanel({ open, onClose, artifact }: CoworkPanelProps) {
  const { user, mode } = useAuthStore();
  const [shareUrl, setShareUrl] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [sharedId, setSharedId] = useState<string | null>(null);

  useEffect(() => {
    if (open && artifact) {
      setShareUrl("");
      setCopied(false);
      setIsPublic(false);
      setSharedId(null);
    }
  }, [open, artifact?.id]);

  if (!open || !artifact) return null;

  const handleShare = async () => {
    if (!user || !artifact) return;
    setSharing(true);
    try {
      if (mode === "cloud" && user) {
        const token = generateShareToken();
        const record = await pb().collection("shared_artifacts").create({
          owner: user.id,
          title: artifact.title,
          type: artifact.type,
          content: JSON.stringify(artifact),
          language: artifact.language || "",
          shareToken: token,
          isPublic: isPublic,
        });
        setSharedId(record.id);
        setShareUrl(`${window.location.origin}/shared/${token}`);
      } else {
        // Backendless sharing: embed the artifact in the URL hash so guests can
        // share without a PocketBase instance.
        const hash = encodeArtifactToHash(artifact);
        setSharedId("local");
        setShareUrl(`${window.location.origin}/shared/local#${hash}`);
      }
    } catch (err) {
      console.error("Share failed:", err);
    } finally {
      setSharing(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[440px] bg-surface border-l border-border z-50 flex flex-col animate-slide-right">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" />
            <span className="text-[13px] font-medium text-foreground">Share & Collaborate</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-2 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Artifact preview */}
          <div className="rounded-xl border border-border bg-surface-2 p-4">
            <div className="flex items-center gap-2.5 mb-2">
              <ClaudeLogo className="h-5 w-5 text-accent" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">{artifact.title}</p>
                <p className="text-[11px] text-muted-fg capitalize">{artifact.type}</p>
              </div>
            </div>
          </div>

          {/* Visibility toggle */}
          <div>
            <label className="text-[13px] font-medium text-muted-fg block mb-2">Visibility</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPublic(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border text-[13px] transition-colors",
                  !isPublic ? "border-accent text-accent bg-accent/10" : "border-border text-muted-fg hover:text-foreground"
                )}
              >
                <Lock className="h-3.5 w-3.5" />
                Private
              </button>
              <button
                onClick={() => setIsPublic(true)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border text-[13px] transition-colors",
                  isPublic ? "border-accent text-accent bg-accent/10" : "border-border text-muted-fg hover:text-foreground"
                )}
              >
                <Globe className="h-3.5 w-3.5" />
                Public
              </button>
            </div>
            <p className="text-[11px] text-muted-fg/60 mt-1.5">
              {isPublic ? "Anyone with the link can view this artifact" : "Only people with the link can view"}
            </p>
          </div>

          {/* Share button */}
          {!shareUrl ? (
            <button
              onClick={handleShare}
              disabled={sharing}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-50 transition-colors text-sm font-medium"
            >
              <Share2 className="h-4 w-4" />
              {sharing ? "Creating link..." : "Create share link"}
            </button>
          ) : (
            <div className="space-y-3">
              {/* Share link */}
              <div>
                <label className="text-[13px] font-medium text-muted-fg block mb-1.5">Share link</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-2 border border-border">
                    <Link2 className="h-3.5 w-3.5 text-muted-fg shrink-0" />
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 bg-transparent text-[12px] text-foreground/80 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-surface-2 border border-border text-[13px] text-foreground hover:bg-surface-3 transition-colors shrink-0"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Open link */}
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 h-9 rounded-lg border border-border text-[13px] text-muted-fg hover:text-foreground hover:bg-surface-2 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open shared view
              </a>

              {/* Success message */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
                <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <p className="text-[12px] text-foreground/80">
                  Artifact is now shared. Send the link to your team to collaborate.
                </p>
              </div>
            </div>
          )}

          {/* Collaborators info */}
          <div className="pt-3 border-t border-border">
            <p className="text-[13px] font-medium text-muted-fg mb-2">Collaboration</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-fg text-[11px] font-semibold uppercase">
                  {user?.name?.charAt(0) || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-foreground truncate">{user?.name}</p>
                  <p className="text-[11px] text-muted-fg">Owner</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function generateShareToken(): string {
  return Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}
