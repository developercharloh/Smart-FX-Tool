import { useState, useEffect } from "react";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [keyInfo, setKeyInfo] = useState<{ plan?: string; expiresAt?: string; label?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const key = localStorage.getItem("sfx_key");
    if (!key) {
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    // Verify key
    fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setIsAuthenticated(true);
          setKeyInfo(data);
        } else {
          setIsAuthenticated(false);
          localStorage.removeItem("sfx_key");
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = async (key: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (data.valid) {
        localStorage.setItem("sfx_key", key);
        setIsAuthenticated(true);
        setKeyInfo(data);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("sfx_key");
    setIsAuthenticated(false);
    setKeyInfo(null);
  };

  return { isAuthenticated, isLoading, keyInfo, login, logout };
}
