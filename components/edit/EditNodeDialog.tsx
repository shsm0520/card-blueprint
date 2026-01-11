"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface EditNodeDialogProps {
  nodeId: string;
  treeId: string;
  editToken: string;
  currentNote: string;
  currentPlannedDate?: string | null;
  currentMonthsAfterPrevious?: number | null;
  currentParentNodeId?: string | null;
  cardName: string;
  existingNodes: Array<{
    nodeId: string;
    card: {
      id: string;
      name: string;
    };
  }>;
  onClose: () => void;
  onUpdate: () => void;
}

export default function EditNodeDialog({
  nodeId,
  treeId,
  editToken,
  currentNote,
  currentPlannedDate,
  currentMonthsAfterPrevious,
  currentParentNodeId,
  cardName,
  existingNodes,
  onClose,
  onUpdate,
}: EditNodeDialogProps) {
  const [note, setNote] = useState(currentNote);
  const [plannedDate, setPlannedDate] = useState(
    currentPlannedDate ? currentPlannedDate.split("T")[0] : ""
  );
  const [monthsAfterPrevious, setMonthsAfterPrevious] = useState(
    currentMonthsAfterPrevious?.toString() || ""
  );
  const [parentNodeId, setParentNodeId] = useState<string>(
    currentParentNodeId || "none"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("Saving node:", {
        treeId,
        nodeId,
        note,
        plannedDate: plannedDate || null,
        monthsAfterPrevious: monthsAfterPrevious
          ? parseInt(monthsAfterPrevious)
          : null,
        parentNodeId: parentNodeId === "none" ? null : parentNodeId,
      });

      const res = await fetch(`/card/api/trees/${treeId}/nodes/${nodeId}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Edit-Token": editToken,
        },
        body: JSON.stringify({
          note,
          plannedDate: plannedDate || null,
          monthsAfterPrevious: monthsAfterPrevious
            ? parseInt(monthsAfterPrevious)
            : null,
          parentNodeId: parentNodeId === "none" ? null : parentNodeId,
        }),
      });

      console.log("Response status:", res.status);
      const data = await res.json();
      console.log("Response data:", data);

      if (!data.success) {
        throw new Error(data.error || "Failed to update node");
      }

      onUpdate();
    } catch (err) {
      console.error("Save error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Card Note</DialogTitle>
          <DialogDescription>
            Update the note for <strong>{cardName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Parent Node */}
          <div className="space-y-2">
            <Label htmlFor="parentNode">Parent Card (Optional)</Label>
            <Select value={parentNodeId} onValueChange={setParentNodeId}>
              <SelectTrigger id="parentNode">
                <SelectValue placeholder="None (root level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (root level)</SelectItem>
                {existingNodes
                  .filter((node) => node.nodeId !== nodeId) // Exclude current node
                  .map((node) => (
                    <SelectItem key={node.nodeId} value={node.nodeId}>
                      {node.card.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              This card will appear as a child of the selected parent
            </p>
          </div>

          {/* Planned Date */}
          <div className="space-y-2">
            <Label htmlFor="plannedDate">
              Planned Application Date (Optional)
            </Label>
            <Input
              id="plannedDate"
              type="date"
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              When do you plan to apply for this card?
            </p>
          </div>

          {/* Months After Previous */}
          <div className="space-y-2">
            <Label htmlFor="monthsAfterPrevious">
              Months to Wait After Previous Card (Optional)
            </Label>
            <Input
              id="monthsAfterPrevious"
              type="number"
              min="0"
              max="60"
              value={monthsAfterPrevious}
              onChange={(e) => setMonthsAfterPrevious(e.target.value)}
              placeholder="e.g., 3"
            />
            <p className="text-xs text-gray-500">
              Recommended wait time after previous card (helps with 5/24
              tracking)
            </p>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">Note (Optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="e.g., Get this card after 6 months..."
            />
            <p className="text-xs text-gray-500">{note.length}/500</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
