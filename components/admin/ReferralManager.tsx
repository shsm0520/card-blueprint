"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Referral {
  id: string;
  cardId: string;
  url: string;
  label: string;
  isActive: boolean;
  card: {
    id: string;
    name: string;
    issuer: string;
  };
}

interface Card {
  id: string;
  name: string;
  issuer: string;
}

interface ReferralManagerProps {
  adminKey: string;
}

export default function ReferralManager({ adminKey }: ReferralManagerProps) {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingReferral, setEditingReferral] = useState<Referral | null>(null);

  // Form state
  const [cardId, setCardId] = useState("");
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("Apply Now");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [referralsRes, cardsRes] = await Promise.all([
        fetch("/card/api/dashboard/referrals/", {
          headers: { "X-Admin-Key": adminKey },
        }),
        fetch("/card/api/cards/"),
      ]);

      const referralsData = await referralsRes.json();
      const cardsData = await cardsRes.json();

      if (referralsData.success) {
        setReferrals(referralsData.data);
      }
      if (cardsData.success) {
        setCards(cardsData.data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingReferral(null);
    setCardId("");
    setUrl("");
    setLabel("Apply Now");
    setIsActive(true);
    setShowDialog(true);
  };

  const handleEdit = (referral: Referral) => {
    setEditingReferral(referral);
    setCardId(referral.cardId);
    setUrl(referral.url);
    setLabel(referral.label);
    setIsActive(referral.isActive);
    setShowDialog(true);
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const body = { cardId, url, label, isActive };
      const res = editingReferral
        ? await fetch(`/card/api/dashboard/referrals/${editingReferral.id}/`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-Admin-Key": adminKey,
            },
            body: JSON.stringify(body),
          })
        : await fetch("/card/api/dashboard/referrals/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Admin-Key": adminKey,
            },
            body: JSON.stringify(body),
          });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to save referral");
      }

      await fetchData();
      setShowDialog(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this referral?")) {
      return;
    }

    try {
      const res = await fetch(`/card/api/dashboard/referrals/${id}/`, {
        method: "DELETE",
        headers: { "X-Admin-Key": adminKey },
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to delete");
      }

      await fetchData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Referral Links
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage referral links for credit cards
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Referral
        </Button>
      </div>

      {/* Referral List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {referrals.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No referrals found. Add your first referral link.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Card
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Label
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {referrals.map((referral) => (
                <tr key={referral.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {referral.card.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {referral.card.issuer}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {referral.label}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <a
                      href={referral.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-blue-600"
                    >
                      <span className="truncate max-w-xs">{referral.url}</span>
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge
                      variant={referral.isActive ? "default" : "secondary"}
                    >
                      {referral.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(referral)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(referral.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingReferral ? "Edit Referral" : "Add Referral"}
            </DialogTitle>
            <DialogDescription>
              {editingReferral
                ? "Update the referral link details"
                : "Create a new referral link for a card"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Card *</Label>
              <Select value={cardId} onValueChange={setCardId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a card" />
                </SelectTrigger>
                <SelectContent>
                  {cards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.name} ({card.issuer})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>URL *</Label>
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/referral"
              />
            </div>

            <div className="space-y-2">
              <Label>Button Label</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Apply Now"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={isActive.toString()}
                onValueChange={(v) => setIsActive(v === "true")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !cardId || !url}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
