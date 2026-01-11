"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, AlertCircle } from "lucide-react";
import ReferralManager from "./ReferralManager";
import CardSyncPanel from "./CardSyncPanel";

export default function AdminPanel() {
  const [adminKey, setAdminKey] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Try to load saved admin key from sessionStorage
  useEffect(() => {
    const savedKey = sessionStorage.getItem("admin_key");
    if (savedKey) {
      setAdminKey(savedKey);
      verifyKey(savedKey);
    }
  }, []);

  const verifyKey = async (key: string) => {
    setIsVerifying(true);
    setError(null);

    try {
      // Try to fetch referrals with the key
      const res = await fetch("/card/api/dashboard/referrals/", {
        headers: {
          "X-Admin-Key": key,
        },
      });

      if (res.status === 401) {
        setError("Invalid admin key");
        setIsAuthenticated(false);
        sessionStorage.removeItem("admin_key");
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to verify admin key");
      }

      // Key is valid
      setIsAuthenticated(true);
      sessionStorage.setItem("admin_key", key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsAuthenticated(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    verifyKey(adminKey);
  };

  const handleLogout = () => {
    setAdminKey("");
    setIsAuthenticated(false);
    sessionStorage.removeItem("admin_key");
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-16">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-red-100 rounded-lg">
              <Lock className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Admin Authentication
              </h2>
              <p className="text-sm text-gray-600">
                Enter your admin API key to continue
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminKey">Admin API Key</Label>
              <Input
                id="adminKey"
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="your-secure-admin-key-here"
                required
              />
              <p className="text-xs text-gray-500">
                This key is set in your .env file (ADMIN_API_KEY)
              </p>
            </div>

            {error && (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isVerifying || !adminKey}
            >
              {isVerifying ? "Verifying..." : "Access Admin Panel"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Logout Button */}
      <div className="flex justify-end mb-6">
        <Button variant="outline" onClick={handleLogout}>
          Logout
        </Button>
      </div>

      <div className="space-y-8">
        <CardSyncPanel adminKey={adminKey} />
        <ReferralManager adminKey={adminKey} />
      </div>
    </div>
  );
}
