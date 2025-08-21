// hooks/useIncident.js
import { useEffect, useState } from "react";
import { getReport } from "@/app/api/reportsApi/route";

export function useIncident(id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const r = await getReport(id);
        if (alive) setData(r);
      } catch (e) {
        if (alive) setErr(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  return { data, loading, err, setData };
}
