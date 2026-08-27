"use client";

import { useState, useEffect } from "react";
import { useEditToken } from "@/lib/hooks/useEditToken";
import TreeViewer from "./TreeViewer";
import TreeEditor from "../edit/TreeEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Edit, Eye, Lock, Copy } from "lucide-react";

interface TreePageClientProps {
  tree: {
    id: string;
    title: string;
    goal: string;
    chase524Status: string;
    creditProfile: string;
    note: string;
    viewCount: number;
    createdAt: string;
    updatedAt: string;
    nodes: Array<{
      nodeId: string;
      cardId: string;
      parentNodeId: string | null;
      position: number;
      note: string;
      card: {
        id: string;
        slug: string;
        name: string;
        issuer: string;
        cardType: string;
        annualFee: number;
        rewardType: string;
        tags: string[];
      };
    }>;
  };
  startInEdit?: boolean;
}

export default function TreePageClient({
  tree: initialTree,
  startInEdit,
}: TreePageClientProps) {
  const {
    hasEditPassword,
    editPassword: editToken,
    isLoading,
    savePassword,
  } = useEditToken(initialTree.id);
  const [isEditMode, setIsEditMode] = useState(false);
  const [tree, setTree] = useState(initialTree);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // If asked to start in edit and password exists, enable edit mode automatically
  useEffect(() => {
    if (startInEdit && hasEditPassword && !isEditMode) {
      setIsEditMode(true);
    }
  }, [startInEdit, hasEditPassword, isEditMode]);

  const handleTreeUpdate = async () => {
    // Refetch tree data
    try {
      const res = await fetch(`/card/api/trees/${initialTree.id}/`);
      const data = await res.json();
      if (data.success) {
        setTree(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch tree:", error);
    }
  };

  const handleEditClick = () => {
    if (hasEditPassword) {
      setIsEditMode(true);
    } else {
      setShowPasswordDialog(true);
    }
  };

  const handlePasswordSubmit = async () => {
    setPasswordError("");
    setIsVerifying(true);

    try {
      // Verify password by trying to update tree metadata
      const res = await fetch(`/card/api/trees/${initialTree.id}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Edit-Token": password,
        },
        body: JSON.stringify({
          title: tree.title, // No change, just verify
        }),
      });

      const data = await res.json();

      if (res.status === 403 || !data.success) {
        setPasswordError("Incorrect password");
        setIsVerifying(false);
        return;
      }

      // Password is correct - save it
      savePassword(password);
      setShowPasswordDialog(false);
      setPassword("");
      setIsEditMode(true);
    } catch (error) {
      setPasswordError("Failed to verify password");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div>
      {/* Edit/View Toggle Button */}
      {!isLoading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-end gap-2">
            {isEditMode && hasEditPassword ? (
              <Button
                onClick={() => setIsEditMode(false)}
                variant="default"
                className="w-full sm:w-auto"
              >
                <Eye className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">View Mode</span>
                <span className="sm:hidden">View</span>
              </Button>
            ) : (
              <Button
                onClick={handleEditClick}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Edit className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Edit Mode</span>
                <span className="sm:hidden">Edit</span>
              </Button>
            )}
            {/* Share Link button */}
            <Button
              variant="outline"
              onClick={() => {
                const publicUrl = `${window.location.origin}/card/tree/${initialTree.id}/`;
                navigator.clipboard.writeText(publicUrl);
                setShareCopied(true);
                setTimeout(() => setShareCopied(false), 2000);
              }}
              title={shareCopied ? "Copied!" : "Copy shareable link"}
              className="w-full sm:w-auto"
            >
              <Copy className="mr-2 h-4 w-4" />
              {shareCopied ? "Link Copied" : "Share Link"}
            </Button>
          </div>
        </div>
      )}

      {/* Tree Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {isEditMode && editToken ? (
            <TreeEditor
              tree={tree}
              editToken={editToken}
              onUpdate={handleTreeUpdate}
            />
          ) : (
            <TreeViewer tree={tree} />
          )}
        </div>
      </main>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Enter Password
            </DialogTitle>
            <DialogDescription>
              Enter your password to edit this tree
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError("");
                }}
                placeholder="Enter your password"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && password) {
                    handlePasswordSubmit();
                  }
                }}
              />
              {passwordError && (
                <p className="text-sm text-red-600">{passwordError}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false);
                setPassword("");
                setPasswordError("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasswordSubmit}
              disabled={!password || isVerifying}
            >
              {isVerifying ? "Verifying..." : "Enter Edit Mode"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
