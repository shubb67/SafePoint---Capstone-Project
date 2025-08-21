import { collection, getDocs } from "firebase/firestore";
import { db } from "@/_utils/firebase";
import { useState, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PasscodeJoin({ 
  onBack = () => window.history.back(), 
  onNext = (result) => console.log("Next with:", result) 
}) {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
const navigate = useNavigate();
  // Format as XXX XXX
  const value = useMemo(() => {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    return digits.replace(/(\d{3})(\d{0,3})/, (_, a, b) => (b ? `${a} ${b}` : a));
  }, [raw]);

  const cleaned = value.replace(/\s/g, "");
  const isValid = cleaned.length === 6;

  async function handleNext() {
    if (!isValid || loading) return;

    setError("");
    setLoading(true);

    try {
        // Fetch all workspaces
        const snap = await getDocs(collection(db, "workspaces"));
        
        
        let found = null;
        
        
        snap.forEach((doc) => {
        const data = doc.data();
        const passCodes = data?.passCodes || [];
        const match = passCodes.find(
        (p) => p.code === cleaned && p.isActive
        );
        if (match) {
        found = {
        workspaceId: doc.id,
        workspaceName: data?.name || "",
        passcode: cleaned,
        passType: match.type,
        permissions: match.permissions || [],
        };
        }
        });
        
        
        if (!found) {
        setError("Invalid or inactive pass code. Please try again.");
        return;
        }
        
        
        // Navigate to passcode check page
        navigate("/admin-passcode-check", { state: found });
        } catch (e) {
        console.error("Passcode check failed:", e);
        setError("Something went wrong while verifying the pass code.");
        } finally {
        setLoading(false);
        }
        }

  return (
    <div className="min-h-screen w-full grid grid-cols-12">
      <div className="col-span-12 lg:col-span-7 bg-[#16244c] flex items-center justify-center px-8 lg:px-16">
        <div className="w-full max-w-[600px] bg-white rounded-2xl shadow-xl px-10 sm:px-14 py-8">
          <button
            onClick={onBack}
            className="mb-6 inline-flex h-9 w-9 items-center justify-center rounded-full text-[#1a2b5c] hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <h1 className="text-center text-[22px] font-semibold text-[#1a2b5c] mb-2">
            Enter Admin Pass Code to Join Company
          </h1>
          <p className="text-center text-xs text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
          Enter the 6-digit admin pass code you received from your company’s SafePoint administrator. This will give you access to manage incidents, locations, and team members.
          </p>

          <div className="space-y-2">
            <label className="block text-[11px] text-gray-500">
              Pass Code <span className="italic">(required)</span>
            </label>
            <input
              value={value}
              onChange={(e) => {
                setRaw(e.target.value);
                if (error) setError("");
              }}
              inputMode="numeric"
              placeholder="XXX XXX"
              className={`w-full px-4 py-3 border rounded-lg text-sm font-mono text-black placeholder:text-gray-400 tracking-wider ${
                error ? "border-red-500" : "border-gray-300"
              }`}
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>

          <button
            onClick={handleNext}
            disabled={!isValid || loading}
            className={`mt-10 w-full h-10 rounded-lg py-3 text-sm font-medium ${
              !isValid || loading
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-[#1a2b5c] text-white hover:opacity-95"
            }`}
          >
            {loading ? "Verifying…" : "Next"}
          </button>
        </div>
      </div>

      {/* Right side banner */}
      <div className="hidden lg:block col-span-5 relative">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url('/assets/images/hero.png')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/40" />
        <div className="absolute bottom-10 right-10">
          <p className="text-white text-4xl font-semibold leading-tight drop-shadow">
            Incident Reporting, <br /> Simplified.
          </p>
        </div>
      </div>
    </div>
  );
}
