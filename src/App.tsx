import React, { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { db } from './db';
import { Images } from "./components/Images";
import { processImages, initializeModel } from "../lib/process";

interface AppError {
  message: string;
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [isWebGPU, setIsWebGPU] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Initialize the appropriate model based on WebGPU support
        const initialized = await initializeModel();
        if (!initialized) {
          throw new Error("Failed to initialize background removal model");
        }
        // Check if WebGPU is supported for UI indication
        setIsWebGPU(Boolean((navigator as any).gpu));
      } catch (err) {
        setError({
          message: err instanceof Error ? err.message : "An unknown error occurred"
        });
      }
      setIsLoading(false);
    })();
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      const id = await db.images.add({ 
        file,
        processedFile: undefined // Use undefined instead of null for optional File
      });
      console.log(`Added image with id ${id}`);
    }
    // Trigger image processing
    await processImages();
  }, []);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".mp4"],
    },
  });

  const downloadAsZip = async () => {
    const zip = new JSZip();
    const images = await db.images.toArray();
    for(const image of images) {
      if (image.processedFile) {
        zip.file(image.processedFile.name, image.processedFile);
      }
    }
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `background-blasted.zip`);
  };

  const clearAll = () => {
    db.images.where("id").above(0).delete();
  };

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-4xl mb-2">ERROR</h2>
          <p className="text-xl max-w-[500px]">{error.message}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white mb-4"></div>
          <p className="text-lg">Loading background removal model...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-center">
          Remove Background {isWebGPU ? '(WebGPU)' : '(Cross-Browser)'}
        </h1>

        <h2 className="text-lg font-semibold mb-2 text-center">
          In-browser background removal, powered by{" "}
          <a
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
            href="https://github.com/xenova/transformers.js"
          >
            🤗 Transformers.js
          </a>
        </h2>
        <div className="flex justify-center mb-8 gap-8">
          <a
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
            href="https://github.com/huggingface/transformers.js-examples/blob/main/LICENSE"
          >
            License (Apache 2.0)
          </a>
          <a
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
            href={isWebGPU ? 
              "https://huggingface.co/Xenova/modnet" : 
              "https://huggingface.co/briaai/RMBG-1.4"
            }
          >
            Model ({isWebGPU ? 'MODNet' : 'RMBG-1.4'})
          </a>
          <a
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
            href="https://github.com/huggingface/transformers.js-examples"
          >
            Code (GitHub)
          </a>
        </div>
        <div
          {...getRootProps()}
          className={`p-8 mb-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors duration-300 ease-in-out
            ${isDragAccept ? "border-green-500 bg-green-900/20" : ""}
            ${isDragReject ? "border-red-500 bg-red-900/20" : ""}
            ${isDragActive ? "border-blue-500 bg-blue-900/20" : "border-gray-700 hover:border-blue-500 hover:bg-blue-900/10"}
          `}
        >
          <input {...getInputProps()} className="hidden" />
          <p className="text-lg mb-2">
            {isDragActive
              ? "Drop the images here..."
              : "Drag and drop some images here"}
          </p>
          <p className="text-sm text-gray-400">or click to select files</p>
        </div>
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="flex gap-4">
            <button
              onClick={downloadAsZip}
              className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-black disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors duration-200 text-sm"
            >
              Download as ZIP
            </button>
            <button
              onClick={clearAll}
              className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black transition-colors duration-200 text-sm"
            >
              Clear All
            </button>
          </div>
        </div>

        <Images/>
      </div>
    </div>
  );
}
