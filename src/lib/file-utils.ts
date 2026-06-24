/** Generate a unique sequential id prefixed with "f". */
let idCounter = 1;
export const newId = () => `f${idCounter++}`;

export const getIdCounter = () => idCounter;

export const resetIdCounter = (maxId: number) => {
  idCounter = maxId + 1;
};

export const stripFileExtension = (name: string) =>
  name.replace(/\.(psc|pseint|txt)$/i, "");

export const downloadFile = (content: string, name: string, format: "psc" | "txt" = "psc") => {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const baseName = stripFileExtension(name).trim() || "archivo";
  a.download = `${baseName}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
};

export const readFileAsText = (file: File): Promise<{ name: string; content: string }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({ name: file.name, content: String(reader.result ?? "") });
    };
    reader.readAsText(file);
  });
};
