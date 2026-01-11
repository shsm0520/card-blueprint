"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Database, Trash2 } from "lucide-react";

interface Card {
  id: string;
  slug: string;
  name: string;
  issuer: string;
  cardType: string;
  annualFee: number;
  rewardType: string;
  tags: string[];
}

interface SyncSummary {
  fetched: number;
  upserts: number;
  failed: number;
  byIssuer?: {
    chase: number;
    amex: number;
  };
}

interface CardSyncPanelProps {
  adminKey: string;
}

export default function CardSyncPanel({ adminKey }: CardSyncPanelProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SyncSummary | null>(null);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/card/api/cards/");
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to load cards");
      setCards(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cards");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async (issuer?: "chase" | "amex") => {
    setIsSyncing(true);
    setError(null);
    try {
      const url = issuer
        ? `/card/api/dashboard/cards/sync/?issuer=${issuer}`
        : "/card/api/dashboard/cards/sync/";
      const res = await fetch(url, {
        method: "POST",
        headers: { "X-Admin-Key": adminKey },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to sync cards");
      }
      setSummary(data.summary);
      await loadCards();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteCard = async (cardId: string, cardName: string) => {
    if (!confirm(`삭제하시겠습니까? "${cardName}"`)) {
      return;
    }

    setDeletingId(cardId);
    setError(null);
    try {
      const res = await fetch(`/card/api/dashboard/cards/${cardId}/`, {
        method: "DELETE",
        headers: { "X-Admin-Key": adminKey },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete card");
      }
      await loadCards();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4 bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg">
            <Database className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Card Sync</h2>
            <p className="text-sm text-gray-600">Chase & Amex → DB</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => handleSync("chase")}
            disabled={isSyncing}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
            />
            Chase
          </Button>
          <Button
            onClick={() => handleSync("amex")}
            disabled={isSyncing}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
            />
            Amex
          </Button>
          <Button
            onClick={() => handleSync()}
            disabled={isSyncing}
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
            />
            {isSyncing ? "Syncing..." : "Sync All"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
          {error}
        </div>
      )}

      {summary && (
        <div className="text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-md p-3 flex flex-wrap gap-3">
          <span>Fetched: {summary.fetched}</span>
          <span>Upserts: {summary.upserts}</span>
          <span>Failed: {summary.failed}</span>
          {summary.byIssuer && (
            <>
              <span className="text-gray-400">|</span>
              <span>Chase: {summary.byIssuer.chase}</span>
              <span>Amex: {summary.byIssuer.amex}</span>
            </>
          )}
        </div>
      )}

      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">
            Cards ({cards.length})
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={loadCards}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="text-sm text-gray-500">Loading cards...</div>
        ) : cards.length === 0 ? (
          <div className="text-sm text-gray-500">No cards found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Issuer</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Annual Fee</th>
                  <th className="py-2 pr-3">Rewards</th>
                  <th className="py-2 pr-3">Tags</th>
                  <th className="py-2 pr-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {cards.map((card) => (
                  <tr key={card.id} className="align-top">
                    <td className="py-2 pr-3 font-medium text-gray-900">
                      {card.name}
                    </td>
                    <td className="py-2 pr-3 text-gray-700">{card.issuer}</td>
                    <td className="py-2 pr-3 text-gray-700">{card.cardType}</td>
                    <td className="py-2 pr-3 text-gray-700">
                      ${card.annualFee}
                    </td>
                    <td className="py-2 pr-3 text-gray-700">
                      {card.rewardType}
                    </td>
                    <td className="py-2 pr-3 flex flex-wrap gap-1">
                      {card.tags?.length ? (
                        card.tags.map((tag: string) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCard(card.id, card.name)}
                        disabled={deletingId === card.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
