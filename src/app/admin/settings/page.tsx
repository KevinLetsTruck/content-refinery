"use client";

import { useState, useEffect } from "react";

interface CCStatus {
  connected: boolean;
  listsCount?: number;
  lists?: Array<{
    id: string;
    name: string;
    memberCount: number;
  }>;
  error?: string;
  authUrl?: string;
}

interface MetaStatus {
  configured: boolean;
  facebook?: {
    connected: boolean;
    pageId?: string;
    pageName?: string;
    followers?: number;
    error?: string;
  };
  instagram?: {
    connected: boolean;
    accountId?: string;
    username?: string;
    followers?: number;
    error?: string;
  };
  tokenInfo?: {
    isValid: boolean;
    type?: string;
    expiresAt?: string | null;
    scopes?: string[];
  };
  error?: string;
  connectUrl?: string;
}

export default function SettingsPage() {
  const [ccStatus, setCCStatus] = useState<CCStatus | null>(null);
  const [metaStatus, setMetaStatus] = useState<MetaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [metaLoading, setMetaLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [message, setMessage] = useState("");

  // Check for OAuth callback results
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("cc_success")) {
      setMessage("Successfully connected to Constant Contact!");
      window.history.replaceState({}, "", "/admin/settings");
    }
    if (params.get("cc_error")) {
      setMessage(`Error: ${params.get("cc_error")}`);
      window.history.replaceState({}, "", "/admin/settings");
    }
    if (params.get("meta_success")) {
      setMessage("Successfully connected to Meta (Facebook/Instagram)!");
      window.history.replaceState({}, "", "/admin/settings");
    }
  }, []);

  // Fetch CC status
  useEffect(() => {
    fetchStatus();
  }, []);

  // Fetch Meta status
  useEffect(() => {
    fetchMetaStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/constantcontact");
      const data = await response.json();
      setCCStatus(data);
    } catch {
      setCCStatus({ connected: false, error: "Failed to fetch status" });
    } finally {
      setLoading(false);
    }
  };

  const fetchMetaStatus = async () => {
    setMetaLoading(true);
    try {
      const response = await fetch("/api/meta/status");
      const data = await response.json();
      setMetaStatus(data);
    } catch {
      setMetaStatus({ configured: false, error: "Failed to fetch status" });
    } finally {
      setMetaLoading(false);
    }
  };

  const createList = async () => {
    if (!newListName.trim()) return;
    
    setCreating(true);
    try {
      const response = await fetch("/api/constantcontact/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newListName }),
      });
      
      if (response.ok) {
        setMessage(`✅ List "${newListName}" created!`);
        setNewListName("");
        fetchStatus(); // Refresh list
      } else {
        const error = await response.json();
        setMessage(`❌ Failed to create list: ${error.error}`);
      }
    } catch (error) {
      setMessage("❌ Failed to create list");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.startsWith("✅") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}>
            {message}
          </div>
        )}

        {/* Constant Contact Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
            Constant Contact
          </h2>

          {loading ? (
            <div className="text-gray-500">Loading...</div>
          ) : ccStatus?.connected ? (
            <div>
              <div className="flex items-center gap-2 text-green-600 mb-4">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Connected ({ccStatus.listsCount} lists)
              </div>

              {/* Lists */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-2">Your Lists</h3>
                <div className="space-y-2">
                  {ccStatus.lists?.map(list => (
                    <div key={list.id} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                      <div>
                        <span className="font-medium">{list.name}</span>
                        <span className="text-gray-500 text-sm ml-2">({list.memberCount} contacts)</span>
                      </div>
                      <code className="text-xs text-gray-400">{list.id}</code>
                    </div>
                  ))}
                </div>
              </div>

              {/* Create List */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-700 mb-2">Create New List</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="List name (e.g., Blood Sugar Guide Leads)"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={createList}
                    disabled={creating || !newListName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {creating ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-4">
                Connect to Constant Contact to automatically add landing page subscribers to your email lists.
              </p>
              <a
                href="/api/auth/constantcontact"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Connect Constant Contact
              </a>
              {ccStatus?.error && (
                <p className="text-red-500 text-sm mt-2">{ccStatus.error}</p>
              )}
            </div>
          )}
        </div>

        {/* Meta (Facebook & Instagram) Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
            </svg>
            Meta (Facebook & Instagram)
          </h2>

          {metaLoading ? (
            <div className="text-gray-500">Loading...</div>
          ) : metaStatus?.configured && (metaStatus.facebook?.connected || metaStatus.instagram?.connected) ? (
            <div>
              {/* Facebook Status */}
              <div className="mb-4">
                <h3 className="font-semibold text-gray-700 mb-2">Facebook Page</h3>
                {metaStatus.facebook?.connected ? (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">{metaStatus.facebook.pageName}</span>
                    {metaStatus.facebook.followers && (
                      <span className="text-gray-500">({metaStatus.facebook.followers.toLocaleString()} followers)</span>
                    )}
                  </div>
                ) : (
                  <div className="text-yellow-600 bg-yellow-50 p-3 rounded-lg">
                    Not connected - {metaStatus.facebook?.error || "FACEBOOK_PAGE_ID not set"}
                  </div>
                )}
              </div>

              {/* Instagram Status */}
              <div className="mb-4">
                <h3 className="font-semibold text-gray-700 mb-2">Instagram Business</h3>
                {metaStatus.instagram?.connected ? (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">@{metaStatus.instagram.username}</span>
                    {metaStatus.instagram.followers && (
                      <span className="text-gray-500">({metaStatus.instagram.followers.toLocaleString()} followers)</span>
                    )}
                  </div>
                ) : (
                  <div className="text-yellow-600 bg-yellow-50 p-3 rounded-lg">
                    Not connected - {metaStatus.instagram?.error || "INSTAGRAM_BUSINESS_ACCOUNT_ID not set"}
                  </div>
                )}
              </div>

              {/* Token Info */}
              {metaStatus.tokenInfo && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold text-gray-700 mb-2">Token Status</h3>
                  <div className={`p-3 rounded-lg ${metaStatus.tokenInfo.isValid ? "bg-green-50" : "bg-red-50"}`}>
                    <div className="flex items-center gap-2">
                      <span className={metaStatus.tokenInfo.isValid ? "text-green-600" : "text-red-600"}>
                        {metaStatus.tokenInfo.isValid ? "Valid" : "Invalid"}
                      </span>
                      <span className="text-gray-500">|</span>
                      <span className="text-gray-600">Type: {metaStatus.tokenInfo.type || "Unknown"}</span>
                      {metaStatus.tokenInfo.expiresAt && (
                        <>
                          <span className="text-gray-500">|</span>
                          <span className="text-gray-600">
                            Expires: {new Date(metaStatus.tokenInfo.expiresAt).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                    {metaStatus.tokenInfo.scopes && (
                      <div className="mt-2 text-xs text-gray-500">
                        Scopes: {metaStatus.tokenInfo.scopes.join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Reconnect Option */}
              <div className="border-t pt-4 mt-4">
                <a
                  href="/api/auth/meta"
                  className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm"
                >
                  Reconnect / Change Page
                </a>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-4">
                Connect your Facebook Page and Instagram Business account to publish content directly from Content Refinery.
              </p>
              <a
                href="/api/auth/meta"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Connect Meta (Facebook & Instagram)
              </a>
              {metaStatus?.error && (
                <p className="text-red-500 text-sm mt-2">{metaStatus.error}</p>
              )}
            </div>
          )}
        </div>

        {/* Landing Pages Quick Reference */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Landing Page List IDs</h2>
          <p className="text-gray-600 mb-4">
            Copy a list ID above and add it to your landing page configuration to enable auto-subscription.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <code className="text-sm text-gray-700">
              constantContactListId: &quot;paste-list-id-here&quot;
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
