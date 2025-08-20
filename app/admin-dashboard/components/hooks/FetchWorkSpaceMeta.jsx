import { useEffect, useRef } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "@/_utils/firebase";
import { doc, getDoc } from "firebase/firestore";

// state somewhere above:
// const [companyName, setCompanyName] = useState("...");
// const [workspaceId, setWorkspaceId] = useState(null);

async function fetchWorkspaceMeta(uid) {
  // 1) user doc -> workspaceId
  const userSnap = await getDoc(doc(db, "users", uid));
  if (!userSnap.exists()) return { workspaceId: null, workspaceName: "", user: null };

  const userData = userSnap.data();
  const wsId = userData?.workspaceId || null;
  if (!wsId) return { workspaceId: null, workspaceName: "", user: userData };

  // 2) workspace doc -> name
  const wsSnap = await getDoc(doc(db, "workspaces", wsId));
  if (!wsSnap.exists()) return { workspaceId: wsId, workspaceName: "", user: userData };

  const ws = wsSnap.data();
  // Prefer companyName (as in your screenshot). Fallbacks keep it future‑proof.
  const wsName =
    ws?.companyName ??
    ws?.name ??
    ws?.company?.name ??
    "";

  return { workspaceId: wsId, workspaceName: wsName, user: userData, workspace: ws };
}

export function useCurrentWorkspace(setCompanyName, setWorkspaceId) {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // avoid double run in strict mode
    ran.current = true;

    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setCompanyName("");
        setWorkspaceId(null);
        return;
      }
      try {
        const { workspaceId, workspaceName } = await fetchWorkspaceMeta(u.uid);
        setCompanyName(workspaceName || "");   // "" if not found
        setWorkspaceId(workspaceId || null);
      } catch (e) {
        console.error("Workspace meta load failed:", e);
        setCompanyName("");
        setWorkspaceId(null);
      }
    });

    return () => unsub();
  }, [setCompanyName, setWorkspaceId]);
}
