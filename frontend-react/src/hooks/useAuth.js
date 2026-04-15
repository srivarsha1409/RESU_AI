import { useEffect, useState } from "react";

export function useAuth(allowedRoles = []) {
  const [auth, setAuth] = useState({ loading: true, authorized: false, role: null });

  useEffect(() => {
    const verify = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) throw new Error("No token");

        const res = await fetch("http://localhost:8000/auth/verify_token", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error("Invalid token");

        const data = await res.json();
        const role = data.data?.role;

        if (allowedRoles.length === 0 || allowedRoles.includes(role)) {
          setAuth({ loading: false, authorized: true, role });
        } else {
          setAuth({ loading: false, authorized: false, role });
        }
      } catch {
        setAuth({ loading: false, authorized: false, role: null });
      }
    };
    verify();
  }, [allowedRoles]);

  return auth;
}
