export async function uploadDirect(
  file: File,
  ticketEndpoint: string
): Promise<string> {
  const ticketResponse = await fetch(ticketEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ size: file.size, type: file.type }),
  });
  const ticket = await ticketResponse.json();
  if (!ticketResponse.ok) {
    throw new Error(ticket.error || "Failed to prepare upload.");
  }

  let uploadResponse: Response;
  try {
    uploadResponse = await fetch(ticket.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
  } catch {
    throw new Error("Storage upload failed. Check the R2 CORS configuration.");
  }
  if (!uploadResponse.ok) {
    throw new Error("Storage upload failed. Check the R2 CORS configuration.");
  }
  return ticket.key as string;
}
