"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, ImageIcon } from "lucide-react";

interface FileUploaderProps {
  onUpload: (files: File[]) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/heic": [".heic"],
};

function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(jpg|jpeg|png|heic)$/i.test(file.name);
}

export function FileUploader({ onUpload, disabled }: FileUploaderProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onUpload(acceptedFiles);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } =
    useDropzone({
      onDrop,
      accept: ACCEPTED_TYPES,
      disabled,
      multiple: true,
    });

  return (
    <div className="flex flex-col gap-3">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
          transition-all duration-200
          ${isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 bg-white hover:border-blue-400 hover:bg-gray-50"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          {isDragActive ? (
            <>
              <Upload className="h-12 w-12 text-blue-500" />
              <p className="text-blue-600 text-lg font-medium">
                Drop your files here...
              </p>
            </>
          ) : (
            <>
              <FileText className="h-12 w-12 text-gray-400" />
              <p className="text-gray-700 text-lg font-medium">
                Drag & drop bank statements here
              </p>
              <p className="text-gray-500 text-sm">
                PDF or images (JPEG, PNG, HEIC) &middot; Max 10MB each
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Text-based PDFs give the best results. Scanned PDFs and images are supported but may need more human review.
              </p>
              <p className="text-gray-400 text-xs mt-1 sm:hidden">
                On iPhone, uploading via &quot;Choose Files&quot; gives better quality than Camera or Photo Library.
              </p>
            </>
          )}
          {acceptedFiles.length > 0 && !disabled && (
            <div className="mt-3 text-sm text-gray-500">
              {acceptedFiles.map((file) => (
                <div key={file.name} className="flex items-center gap-2">
                  {isImageFile(file) ? (
                    <ImageIcon className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
