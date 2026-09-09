"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";

interface ImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  dict: {
    addPhotos: string;
    maxPhotos: string;
    photoUploading: string;
    dragOrClick: string;
  };
}

export function ImageUpload({
  images,
  onImagesChange,
  maxImages = 3,
  dict,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList) => {
      const remaining = maxImages - images.length;
      if (remaining <= 0) return;

      const filesToUpload = Array.from(files).slice(0, remaining);
      setUploading(true);

      try {
        const uploadPromises = filesToUpload.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/upload", { method: "POST", body: formData });
          if (!res.ok) throw new Error("Upload failed");
          const data = await res.json();
          return data.url as string;
        });

        const urls = await Promise.all(uploadPromises);
        onImagesChange([...images, ...urls]);
      } catch {
        // TODO[MVP]: Show upload error toast
      } finally {
        setUploading(false);
      }
    },
    [images, maxImages, onImagesChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  const removeImage = useCallback(
    (index: number) => {
      onImagesChange(images.filter((_, i) => i !== index));
    },
    [images, onImagesChange],
  );

  return (
    <div>
      <label className="text-sm font-medium text-[#1B3A4B]">
        {dict.addPhotos}{" "}
        <span className="text-xs text-zinc-400">({dict.maxPhotos})</span>
      </label>

      {/* Preview grid */}
      {images.length > 0 && (
        <div className="mt-2 flex gap-2">
          {images.map((url, i) => (
            <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg bg-zinc-100">
              <Image src={url} alt="" fill className="object-cover" sizes="80px" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-xs text-white"
                aria-label="Remove"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      {images.length < maxImages && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="mt-2 flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed
                     border-zinc-300 px-4 py-6 text-sm text-zinc-400 transition-colors
                     hover:border-[#0077B6] hover:text-[#0077B6]"
        >
          {uploading ? dict.photoUploading : dict.dragOrClick}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="hidden"
      />
    </div>
  );
}
