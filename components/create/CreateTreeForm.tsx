"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Eye } from "lucide-react";
import TokenDisplay from "./TokenDisplay";

interface TemplatePreview {
  card: {
    id: string;
    slug: string;
    name: string;
    issuer: string;
    annualFee: number;
    tags: string[];
  };
  note?: string;
  monthsAfterPrevious?: number;
  position: number;
  parentCardSlug?: string;
}

export default function CreateTreeForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTree, setCreatedTree] = useState<{
    id: string;
    editToken: string;
    title: string;
  } | null>(null);

  // Form state
  const [title, setTitle] = useState("My Card Strategy");
  const [ssnStatus, setSsnStatus] = useState<string>("");
  const [goal, setGoal] = useState<string>("");
  const [chase524Status, setChase524Status] = useState<string>("");
  const [creditProfile, setCreditProfile] = useState<string>("");
  const [note, setNote] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Template preview state
  const [templatePreview, setTemplatePreview] = useState<TemplatePreview[]>([]);
  const [selectedCardSlug, setSelectedCardSlug] = useState<string>("");
  const [previewDescription, setPreviewDescription] = useState("");
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Fetch template preview when profile changes
  useEffect(() => {
    if (goal && chase524Status && creditProfile) {
      fetchTemplatePreview();
      setSelectedCardSlug(""); // Reset selection when profile changes
    } else {
      setTemplatePreview([]);
      setPreviewDescription("");
      setSelectedCardSlug("");
    }
  }, [goal, chase524Status, creditProfile]);

  const fetchTemplatePreview = async () => {
    setIsLoadingPreview(true);
    try {
      const res = await fetch("/card/api/templates/preview/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          goal,
          chase524Status,
          creditProfile,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTemplatePreview(data.data.preview);
        setPreviewDescription(data.data.description);
      }
    } catch (error) {
      console.error("Failed to fetch template preview:", error);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate password
    if (password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }
    if (password.length > 50) {
      setError("Password must be less than 50 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/card/api/trees/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          ssnStatus,
          useTemplate: !!selectedCardSlug,
          goal,
          chase524Status,
          creditProfile,
          selectedCardSlug,
          note,
          password,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to create tree");
      }

      // Save password to localStorage for this tree
      localStorage.setItem(`tree_token_${data.data.id}`, password);

      // Show success screen
      setCreatedTree({
        id: data.data.id,
        editToken: password, // Pass password as editToken for compatibility
        title: data.data.title,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  // If tree was created, show token display
  if (createdTree) {
    return <TokenDisplay tree={createdTree} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* SSN/ITIN Status */}
      <div className="space-y-2">
        <Label htmlFor="ssnStatus">SSN/ITIN Status *</Label>
        <Select value={ssnStatus} onValueChange={setSsnStatus} required>
          <SelectTrigger id="ssnStatus">
            <SelectValue placeholder="Select your status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ssn">
              I have a Social Security Number (SSN)
            </SelectItem>
            <SelectItem value="itin">
              I have an Individual Taxpayer Identification Number (ITIN)
            </SelectItem>
            <SelectItem value="none">I don't have SSN or ITIN</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          Some cards require SSN for approval
        </p>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Tree Title</Label>
        <Input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., My 2026 Card Strategy"
          maxLength={100}
          required
        />
        <p className="text-xs text-gray-500">
          Give your strategy a memorable name
        </p>
      </div>

      {/* Goal */}
      <div className="space-y-2">
        <Label htmlFor="goal">Primary Goal *</Label>
        <Select value={goal} onValueChange={setGoal} required>
          <SelectTrigger id="goal">
            <SelectValue placeholder="Select your goal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cashback">Cashback</SelectItem>
            <SelectItem value="airline">Airline Miles</SelectItem>
            <SelectItem value="hotel">Hotel Points</SelectItem>
            <SelectItem value="status">Hotel Lifetime Status</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          What do you want to optimize for?
        </p>
      </div>

      {/* Chase 5/24 Status */}
      <div className="space-y-2">
        <Label htmlFor="chase524">Chase 5/24 Status *</Label>
        <Select
          value={chase524Status}
          onValueChange={setChase524Status}
          required
        >
          <SelectTrigger id="chase524">
            <SelectValue placeholder="Select your 5/24 status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="under">Under 5/24</SelectItem>
            <SelectItem value="over">Over/At 5/24</SelectItem>
            <SelectItem value="unknown">Unknown/Not Sure</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          Number of new credit cards in the last 24 months
        </p>
      </div>

      {/* Credit Profile */}
      <div className="space-y-2">
        <Label htmlFor="creditProfile">Credit History *</Label>
        <Select value={creditProfile} onValueChange={setCreditProfile} required>
          <SelectTrigger id="creditProfile">
            <SelectValue placeholder="Select your credit history" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="thin">No/Thin File (0-12 months)</SelectItem>
            <SelectItem value="1to3">1-3 Years</SelectItem>
            <SelectItem value="3plus">3+ Years</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          How long have you had credit accounts?
        </p>
      </div>

      {/* Template Preview Loading */}
      {isLoadingPreview && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600 mr-2" />
          <span className="text-sm text-blue-700">
            Loading template preview...
          </span>
        </div>
      )}

      {/* Template Preview */}
      {templatePreview.length > 0 && (
        <div className="space-y-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Eye className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">
                Recommended Cards
              </h3>
              <p className="text-xs text-gray-600 mt-1">{previewDescription}</p>
              <p className="text-xs text-blue-600 font-medium mt-1">
                👉 Select 1 card to start your tree
              </p>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {templatePreview.slice(0, 3).map((item, idx) => (
              <button
                key={item.card.slug}
                type="button"
                onClick={() => setSelectedCardSlug(item.card.slug)}
                className={`w-full text-left p-2 sm:p-3 rounded-md border-2 transition-all ${
                  selectedCardSlug === item.card.slug
                    ? "border-blue-500 bg-blue-50 shadow-md"
                    : "border-gray-200 bg-white hover:border-blue-300"
                }`}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <div
                    className={`p-1.5 sm:p-2 rounded flex-shrink-0 ${
                      selectedCardSlug === item.card.slug
                        ? "bg-blue-500"
                        : "bg-blue-100"
                    }`}
                  >
                    <CreditCard
                      className={`h-3 w-3 sm:h-4 sm:w-4 ${
                        selectedCardSlug === item.card.slug
                          ? "text-white"
                          : "text-blue-600"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-xs sm:text-sm text-gray-900 leading-tight">
                          {idx + 1}. {item.card.name}
                          {selectedCardSlug === item.card.slug && (
                            <span className="ml-2 text-blue-600">✓</span>
                          )}
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.card.issuer}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 sm:text-right sm:flex-col sm:items-end">
                        <span className="text-xs text-gray-600 whitespace-nowrap">
                          {item.card.annualFee === 0
                            ? "No Fee"
                            : `$${item.card.annualFee}`}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {item.card.tags?.slice(0, 2).map((tag, i) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {item.card.tags && item.card.tags.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{item.card.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {item.note && (
                      <p className="text-xs text-gray-600 mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                        {item.note}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-500 italic">
            💡 You can add more cards after creating your tree
          </p>
        </div>
      )}

      {/* Note (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="note">Notes (Optional)</Label>
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add any additional context or goals for your strategy..."
          maxLength={1000}
          rows={4}
        />
        <p className="text-xs text-gray-500">{note.length}/1000 characters</p>
      </div>

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="password">Edit Password *</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a password to edit your tree"
          minLength={4}
          maxLength={50}
          required
        />
        <p className="text-xs text-gray-500">
          4-50 characters. You'll need this to edit your tree later.
        </p>
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password *</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter your password"
          minLength={4}
          maxLength={50}
          required
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={
          isLoading ||
          !goal ||
          !chase524Status ||
          !creditProfile ||
          !selectedCardSlug ||
          !ssnStatus ||
          !password ||
          !confirmPassword
        }
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Your Tree...
          </>
        ) : (
          "Create Strategy Tree"
        )}
      </Button>

      <p className="text-xs text-center text-gray-500">
        Your tree will be created instantly. You'll receive a unique link to
        view and edit it.
      </p>
    </form>
  );
}
