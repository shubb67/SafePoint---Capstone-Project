
import { NextResponse } from "next/server";
import { getFirestoreAdmin, admin } from "@/_utils/firebaseAdmin";
export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      date,
      time,
      locationValue,
      description,
      transcriptText,
      userId,          // pass from client if needed
      organizationId,
    } = body;

    // Basic validation
    if (!date || !time || !locationValue) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
 const firestoreAdmin = getFirestoreAdmin();
    if (!firestoreAdmin) {
      throw new Error("Firebase admin not initialized");
    }
    const docRef = await firestoreAdmin.collection("incidents").add({
      date,
      time,
      locationId:    locationValue,
      description:   description.trim(),
      transcript:    transcriptText || null,
      createdBy:     userId || null,
      organizationId: organizationId || null,
      createdAt:     admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (err) {
    console.error("Error writing incident:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
