"use client";
import { NextResponse } from "next/server";
import { firestoreAdmin } from "@/_utils/firebaseAdmin";

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
    } = body;

    // Basic validation
    if (!date || !time || !locationValue) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const docRef = await firestoreAdmin.collection("incidents").add({
      date,
      time,
      locationId:    locationValue,
      description:   description.trim(),
      transcript:    transcriptText || null,
      createdBy:     userId || null,
      createdAt:     admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (err) {
    console.error("Error writing incident:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
