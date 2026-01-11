"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Copy, ExternalLink, AlertTriangle } from "lucide-react";

interface TokenDisplayProps {
  tree: {
    id: string;
    editToken: string;
    title: string;
  };
}

export default function TokenDisplay({ tree }: TokenDisplayProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [tokenSaved, setTokenSaved] = useState(false);

  // For router.push, don't include basePath (Next.js adds it automatically)
  const internalUrl = `/tree/${tree.id}/`;
  // For sharing, include full basePath
  const publicUrl = `/card/tree/${tree.id}/`;

  // Save token to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`tree_token_${tree.id}`, tree.editToken);
      setTokenSaved(true);
    } catch (error) {
      console.error("Failed to save token to localStorage:", error);
    }
  }, [tree.id, tree.editToken]);

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(tree.editToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy token:", error);
    }
  };

  const handleViewTree = () => {
    // Wait a bit to ensure token is saved to localStorage
    setTimeout(() => {
      // Navigate to tree in edit mode
      router.push(`${internalUrl}?mode=edit`);
    }, 100);
  };

  return (
    <div className="space-y-6">
      {/* Success Message */}
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle2 className="h-5 w-5 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>Success!</strong> Your card strategy tree has been created.
        </AlertDescription>
      </Alert>

      {/* Tree Info */}
      <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {tree.title}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Your tree is ready to view and share!
        </p>
        <div className="flex gap-2">
          <Button onClick={handleViewTree} className="flex-1">
            <ExternalLink className="mr-2 h-4 w-4" />
            View Your Tree
          </Button>
        </div>
      </div>

      {/* Edit Password - IMPORTANT */}
      <Alert className="bg-amber-50 border-amber-300">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
        <AlertDescription>
          <div className="space-y-3">
            <div>
              <strong className="text-amber-900">Remember Your Password</strong>
              <p className="text-sm text-amber-800 mt-1">
                Your password allows you to edit your tree. Make sure you
                remember it!
              </p>
            </div>

            {/* Auto-save Status */}
            {tokenSaved && (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                Password saved to this browser
              </div>
            )}

            <div className="text-xs text-amber-700 space-y-1">
              <p>✓ Your password is saved in your browser for this device</p>
              <p>
                ✓ To edit from another device, you'll need to enter your
                password
              </p>
              <p>
                ✓ There is no password recovery - make sure you remember it!
              </p>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Public Link */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">
          Public Share Link
        </h4>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={`${window.location.origin}${publicUrl}`}
            readOnly
            className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}${publicUrl}`
              );
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Share this link with anyone - they can view but not edit your tree
        </p>
      </div>

      {/* Next Steps */}
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          What's Next?
        </h4>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">1.</span>
            <span>Review your personalized card recommendations</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">2.</span>
            <span>
              Customize your tree by adding or removing cards (requires edit
              token)
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">3.</span>
            <span>
              Share your strategy with Reddit, Discord, or friends for feedback
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
