type Decoded = { source: CanvasImageSource; width: number; height: number; done: () => void };

async function decode(file: File): Promise<Decoded> {
  try {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, done: () => bitmap.close() };
  } catch {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } catch {
      URL.revokeObjectURL(url);
      throw new Error("Não foi possível ler essa imagem. Tente JPG ou PNG.");
    }
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
  }
}

export async function fileToDataUrl(file: File, maxSide: number, quality = 0.84): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");
  const image = await decode(file);
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Seu navegador não conseguiu processar a imagem.");
  ctx.fillStyle = "#0b1730";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image.source, 0, 0, width, height);
  image.done();
  return canvas.toDataURL("image/jpeg", quality);
}

export async function uploadImage(file: File, maxSide = 1600): Promise<{ id: string; preview: string }> {
  const dataUrl = await fileToDataUrl(file, maxSide);
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl }),
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
  if (!res.ok || !data.id) throw new Error(data.error || "Não foi possível enviar a imagem.");
  return { id: data.id, preview: dataUrl };
}
